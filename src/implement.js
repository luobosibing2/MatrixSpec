import fs from "node:fs";
import path from "node:path";
import { projectPaths } from "./project.js";
import { ensureStageRecord, loadState, resolveChange, saveState, stagesOf } from "./state.js";

const MARKERS = { " ": "pending", "→": "in_progress", "✓": "done", "⚠": "blocked", x: "done", X: "done" };

export function implementCommand(options = {}, explicitChange) {
  const paths = projectPaths(options);
  const change = resolveChange(options, explicitChange);
  if (!change) return fail("NO_ACTIVE_CHANGE", "未发现活动变更。");
  const state = loadState(paths.root, change);
  if (!state) return fail("CHANGE_STATE_MISSING", "缺少 change 状态文件。");
  const prerequisite = unconfirmedImplementationPrerequisite(state);
  if (prerequisite) {
    const code = `${prerequisite.key.replace(/-/g, "_").toUpperCase()}_NOT_CONFIRMED`;
    return fail(code, `${prerequisite.key} 尚未确认。`);
  }
  const tasksFile = path.join(paths.changes, change, "tasks.md");
  if (!fs.existsSync(tasksFile)) return fail("TASKS_FILE_MISSING", "缺少 tasks.md。");
  const content = fs.readFileSync(tasksFile, "utf8");
  const tasks = parseTasks(content);
  if (!tasks.length) return fail("UNSUPPORTED_FORMAT", "tasks.md 不包含受支持的 plan 或 legacy 任务。");

  const taskId = options.task;
  if (taskId !== undefined) {
    const task = tasks.find((item) => String(item.id) === String(taskId));
    if (!task) return fail("TASK_NOT_FOUND", `未找到 Task ${taskId}。`);
    return {
      ok: true,
      change,
      task,
      documents: changeDocuments(change),
      subagentPrompt: taskPrompt(change, task)
    };
  }

  if (options.complete !== undefined || options.block !== undefined) {
    const id = options.complete ?? options.block;
    const task = tasks.find((item) => String(item.id) === String(id));
    if (!task) return fail("TASK_NOT_FOUND", `未找到 Task ${id}。`);
    const marker = options.complete !== undefined ? "✓" : "⚠";
    updateTaskMarker(tasksFile, content, task, marker);
    return { ok: true, change, task: task.id, status: MARKERS[marker], ...(options.block_reason ? { reason: options.block_reason } : {}) };
  }

  if (options.run) {
    const violation = placeholderViolation(content);
    if (violation && tasks.some((task) => task.format === "plan")) {
      return { ok: false, code: "NO_PLACEHOLDER_VIOLATION", message: "tasks.md 仍包含占位符。", ...violation };
    }
    const implementation = stagesOf(state).find((stage) => stage.key === "implementation");
    if (!implementation) return fail("IMPLEMENTATION_STAGE_NOT_FOUND", "workflow 没有 implementation 阶段。");
    state.currentStage = "implementation";
    const record = ensureStageRecord(state, implementation);
    record.status = "in_progress";
    state.history.push({ action: "enter-implementation", stage: "implementation", timestamp: new Date().toISOString() });
    saveState(paths.root, change, state);
    const batchMode = state.workflow?.optimization?.implementationMode === "batch";
    const verificationLadder = state.workflow?.optimization?.verificationLadder || [];
    return {
      ok: true,
      change,
      nextAction: batchMode ? "execute-task-batch" : "delegate-subagent",
      delegate: implementation.delegate || "task-executor",
      tasks: summarize(tasks),
      ...(batchMode ? {
        executionMode: "single-session-batch",
        taskBatch: tasks.filter((task) => task.status !== "done").map(compactTask),
        verificationLadder,
        verificationRules: [
          "Prove the executable, module, or tool comes from this worktree before trusting test output.",
          "Run the cheapest externally observable check before broad suites.",
          "Rerun a command only after a relevant code, test, configuration, or environment change.",
          "Run the impacted suite once after the batch; expand further only for a concrete risk or failure."
        ],
        completionCommand: "matspec implement --complete N --json",
        blockingCommand: "matspec implement --block N \"reason\" --json"
      } : {}),
      next: batchMode
        ? ["Execute taskBatch in dependency order in this session", "Record each task with matspec implement --complete N --json"]
        : ["matspec implement --task N --json"]
    };
  }

  return {
    ok: true,
    change,
    format: tasks[0].format,
    taskCount: tasks.length,
    tasks,
    summary: summarize(tasks),
    documents: changeDocuments(change),
    resume: Boolean(options.resume),
    next: ["matspec implement --run", "matspec implement --task N --json"]
  };
}

export function parseTasks(content) {
  return /(^|\n)### Task \d+[：:]/.test(content) ? parsePlanTasks(content) : parseLegacyTasks(content);
}

export function tasksTerminal(content) {
  const tasks = parseTasks(content);
  return tasks.length > 0 && tasks.every((task) => task.status === "done" || task.status === "blocked");
}

function parsePlanTasks(content) {
  const lines = content.split(/\r?\n/);
  const headers = [];
  lines.forEach((line, index) => {
    const match = line.match(/^### Task (\d+)[：:]\s*(.+)\s*$/);
    if (match) headers.push({ index, id: match[1], title: match[2] });
  });
  return headers.map((header, position) => {
    const end = headers[position + 1]?.index ?? lines.length;
    const block = lines.slice(header.index + 1, end);
    const sections = sectionBodies(block);
    let statusIndex = -1;
    let marker = " ";
    for (let index = block.length - 1; index >= 0; index -= 1) {
      const match = block[index].match(/^- \[([ →✓⚠xX])]\s*$/);
      if (match) {
        statusIndex = header.index + 1 + index;
        marker = match[1];
        break;
      }
    }
    return {
      id: Number(header.id),
      title: header.title,
      description: block.slice(0, firstSectionIndex(block)).join("\n").trim(),
      files: parseFiles(sections.Files || ""),
      context: (sections.Context || "").trim(),
      do: (sections.Do || "").trim(),
      verify: (sections.Verify || "").trim(),
      status: MARKERS[marker] || "pending",
      marker,
      lineNumber: statusIndex >= 0 ? statusIndex + 1 : null,
      format: "plan"
    };
  });
}

function parseLegacyTasks(content) {
  const lines = content.split(/\r?\n/);
  let section = "0";
  let count = 0;
  const tasks = [];
  lines.forEach((line, index) => {
    const heading = line.match(/^##\s+(\d+(?:\.\d+)*)[.、]?\s*(.*)$/);
    if (heading) {
      section = heading[1];
      count = 0;
      return;
    }
    const item = line.match(/^- \[([ →✓⚠xX])]\s+(.+)$/);
    if (!item) return;
    count += 1;
    tasks.push({
      id: `${section}.${count}`,
      title: item[2],
      description: item[2],
      files: [],
      context: "",
      do: item[2],
      verify: "",
      status: MARKERS[item[1]] || "pending",
      marker: item[1],
      lineNumber: index + 1,
      format: "legacy"
    });
  });
  return tasks;
}

function sectionBodies(lines) {
  const result = {};
  let current = null;
  for (const line of lines) {
    const match = line.match(/^\*\*(Files|Context|Do|Verify):\*\*\s*(.*)$/);
    if (match) {
      current = match[1];
      result[current] = match[2] || "";
    } else if (current) {
      result[current] += `${result[current] ? "\n" : ""}${line}`;
    }
  }
  return result;
}

function firstSectionIndex(lines) {
  const index = lines.findIndex((line) => /^\*\*(Files|Context|Do|Verify):\*\*/.test(line));
  return index < 0 ? lines.length : index;
}

function parseFiles(text) {
  const files = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^-\s+(Create|Modify|Test):\s+`?([^`]+)`?\s*$/i);
    if (match) files.push({ action: match[1].toLowerCase(), path: match[2].trim() });
  }
  return files;
}

function updateTaskMarker(file, content, task, marker) {
  if (!task.lineNumber) throw Object.assign(new Error(`Task ${task.id} has no independent status line.`), { code: "TASK_STATUS_LINE_MISSING" });
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  lines[task.lineNumber - 1] = lines[task.lineNumber - 1].replace(/^- \[[^\]]*]/, `- [${marker}]`);
  fs.writeFileSync(file, lines.join(eol), "utf8");
}

function placeholderViolation(content) {
  const patterns = [/\[占位[^\]]*]/i, /\bTODO\s*:/i, /待做\s*:/, /待实现\s*:/, /\bfill in\b/i, /\bplaceholder\b/i, /\[\s*TODO\s*]/i, /类似 Task \d+/i];
  for (const pattern of patterns) {
    const match = pattern.exec(content);
    if (!match) continue;
    const line = content.slice(0, match.index).split(/\r?\n/).length;
    return { marker: match[0], line, excerpt: content.split(/\r?\n/)[line - 1] };
  }
  return null;
}

function summarize(tasks) {
  return Object.fromEntries(["pending", "in_progress", "done", "blocked"].map((status) => [status, tasks.filter((task) => task.status === status).length]));
}

function compactTask(task) {
  return {
    id: task.id,
    title: task.title,
    files: task.files,
    context: task.context || task.description,
    do: task.do,
    verify: task.verify,
    status: task.status
  };
}

function changeDocuments(change) {
  const base = `matspec/changes/${change}`;
  return ["proposal.md", "delta-spec.md", "delta-design.md", "tasks.md", "validation.md", "review.md"].map((file) => `${base}/${file}`);
}

function unconfirmedImplementationPrerequisite(state) {
  const stages = stagesOf(state);
  const implementationIndex = stages.findIndex((stage) => stage.key === "implementation");
  if (implementationIndex < 0) return null;
  const validation = stages.slice(0, implementationIndex).find((stage) => stage.key === "validation");
  if (validation) return state.stages?.validation?.confirmed ? null : validation;
  const previous = stages[implementationIndex - 1];
  return previous && !state.stages?.[previous.key]?.confirmed ? previous : null;
}

function taskPrompt(change, task) {
  return `You are the MatSpec task-executor for ${change}.

Execute only Task ${task.id}: ${task.title}

Files:
${task.files.map((file) => `- ${file.action}: ${file.path}`).join("\n") || "- Follow the task body"}

Context:
${task.context || task.description}

Do:
${task.do}

Verify:
${task.verify}

Do not guess missing context. Report exactly one status: DONE, DONE_WITH_CONCERNS, BLOCKED, or NEEDS_CONTEXT.`;
}

function fail(code, message) {
  return { ok: false, code, message };
}
