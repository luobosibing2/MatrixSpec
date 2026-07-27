import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "./args.js";
import { VERSION } from "./constants.js";
import { detectExternalAgents, initProject, projectPaths } from "./project.js";
import { acceptStage, archiveChange, backStage, currentStagePayload, enterReview, getStatus, listChanges, loadState, resolveChange, stagesOf, startChange } from "./state.js";
import { doctor, validateProject } from "./validation.js";
import { hasError } from "./util.js";
import { installIntegration, listIntegrations, removeIntegration } from "./integrations.js";
import { applyLatestRun, generateDocs, generateModule, showLatestRun } from "./runs.js";
import { printProgress, printProgressTitle, printResult, style } from "./output.js";
import { isZh, tr } from "./i18n.js";
import { implementCommand } from "./implement.js";
import { refreshWorkflowSnapshot } from "./workflow.js";
import { extensionCommand, stagesCommand, templateCommand } from "./customization.js";
import { reportUsage } from "./reporter.js";
import { checkForUpdates } from "./version-check.js";
import { generateBatch } from "./batch-generation.js";
import { metricsCommand, recordLocalUsage } from "./metrics.js";

export async function main(argv = []) {
  const startedAt = Date.now();
  const parsed = parseArgs(argv);
  const { command, args, options } = parsed;
  if (options.no_color) process.env.NO_COLOR = "1";
  if (options.help || command === "help") {
    const text = help(options);
    return printResult(options.json ? { ok: true, help: text } : text, options);
  }
  const update = await checkForUpdates(options);
  if (update && !options.json) console.error(`MatSpec ${update.latest} 可用（当前 ${update.current}）。`);

  let result;
  switch (command) {
    case "version":
      result = { ok: true, version: VERSION, message: VERSION };
      break;
    case "init":
      result = await initCommand(args[0], options);
      break;
    case "start":
    case "new":
      result = startChange(args[0], options);
      break;
    case "list":
      result = listCommand(options);
      break;
    case "status":
      result = statusCommand(options, args[0]);
      break;
    case "go":
    case "next":
      result = goCommand(options, args[0]);
      break;
    case "accept":
      result = acceptStage(options, args[0]);
      break;
    case "confirm":
      result = acceptStage(options, args[1], args[0]);
      break;
    case "validate":
      result = findingsCommand(validateProject(options, args[0]), options);
      break;
    case "doctor":
      result = findingsCommand(doctor(options), options);
      break;
    case "done":
      result = doneCommand(options, args[0]);
      break;
    case "implement":
      result = implementCommand(options, args[0]);
      break;
    case "review":
      result = enterReview(options, args[0]);
      break;
    case "back":
      result = backStage(options, args[0]);
      break;
    case "archive":
      result = archiveChange(options, args[0]);
      break;
    case "integration":
      result = integrationCommand(options, args);
      break;
    case "workflow":
      result = workflowCommand(options, args);
      break;
    case "metrics":
      result = metricsCommand(options, args);
      break;
    case "stages":
      result = stagesCommand(options, args);
      break;
    case "template":
      result = templateCommand(options, args);
      break;
    case "extension":
      result = extensionCommand(options, args);
      break;
    case "generate":
      result = await generateCommand(options, args);
      break;
    case "show":
      result = showLatestRun(options);
      break;
    case "apply":
      result = applyLatestRun(options);
      break;
    case "generation":
      result = {
        ok: false,
        code: "DEPRECATED_COMMAND",
        message: "generation 已废弃，请使用 matspec generate --design-template/--spec-template。",
        next: ["matspec generate"]
      };
      break;
    default:
      throw new Error(tr(options, `Unknown command: ${command}`, `未知命令：${command}`));
  }

  printResult(result, options);
  if (result.findings && hasError(result.findings)) process.exitCode = 1;
  if (result.ok === false && result.code !== "NO_ACTIVE_CHANGE") process.exitCode = 1;
  const usageOptions = command === "init" && args[0] ? { ...options, path: args[0] } : options;
  recordLocalUsage(command, usageOptions, result, Date.now() - startedAt);
  void reportUsage(command, options, result, Date.now() - startedAt);
}

async function initCommand(targetPath, options) {
  if (!options.integration) options.integration = shouldPrompt(options) ? await promptIntegration() : "codex";
  return initProject(targetPath, options);
}

function shouldPrompt(options) {
  return !options.json && process.stdin.isTTY && process.stdout.isTTY;
}

async function promptIntegration() {
  const choices = ["opencode", "codex", "chrys", "claude-code", "nga", "codeagent", "codegenie", "none"];
  console.log(style("matspec init", "title"));
  console.log("Choose the Coding Agent integration.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`\nIntegration [${choices.join("/")}] (codex): `)).trim().toLowerCase();
    return choices.includes(answer) ? answer : "codex";
  } finally {
    rl.close();
  }
}

function attachGenerateProgress(options) {
  if (options.json) return options;
  return {
    ...options,
    progress(message) {
      printProgress(message);
    }
  };
}

function listCommand(options) {
  const changes = listChanges(options);
  return {
    ok: true,
    changes,
    message: tr(options, changes.length ? "Active changes" : "No active changes", changes.length ? "活动变更" : "没有活动变更"),
    items: changes
  };
}

function statusCommand(options, explicit) {
  const result = getStatus(options, explicit);
  if (!result.ok) return result;
  return {
    ...result,
    message: tr(options, `Change status: ${result.change}`, `变更状态：${result.change}`),
    items: result.stages.map((stage) => `${stage.status.padEnd(16)} ${stage.key} ${stage.filePath || "(no file)"}`)
  };
}

function goCommand(options, explicit) {
  const paths = projectPaths(options);
  const change = resolveChange(options, explicit);
  if (!change) {
    return {
      ok: false,
      code: "NO_ACTIVE_CHANGE",
      message: tr(options, "No active MatSpec change found.", "未发现活动的 matspec 变更。"),
      next: ["matspec start REQ202604270001-feature-name"]
    };
  }
  const state = loadState(paths.root, change);
  if (!state) return { ok: false, code: "CHANGE_STATE_MISSING", change, message: "活动变更缺少状态文件。" };
  const status = getStatus(options, change);
  if (status.drift?.length) {
    return { ok: false, code: "WORKFLOW_PACK_DRIFT", change, findings: status.drift, message: "冻结工作流引用已漂移。" };
  }
  const current = stagesOf(state).find((stage) => stage.key === state.currentStage);
  if (!current || state.currentStage === "completed") {
    return {
      ok: true,
      change,
      nextAction: "done",
      message: tr(options, "All workflow stages are confirmed. Complete finalization, then run matspec done.", "所有工作流阶段均已确认。完成全量文档最终化后执行 matspec done。"),
      next: ["matspec done"]
    };
  }
  if (
    current.key === "review" &&
    state.stages?.implementation?.confirmed &&
    !state.history?.some((event) => event.action === "enter-review-stage")
  ) {
    return {
      ok: true,
      change,
      flowId: state.flowId,
      reviewReady: true,
      nextAction: "review",
      message: tr(options, "Implementation is confirmed. Enter the review stage.", "实现已确认，可以进入审查阶段。"),
      next: ["matspec review"]
    };
  }
  const stage = currentStagePayload(paths.root, change, state, current, options);
  let nextAction;
  if (current.delegate) nextAction = "delegate-subagent";
  else nextAction = stage.status === "draft" ? "await_user_accept" : stage.status === "blocked" ? "complete_previous_stage" : "open_agent_stage";
  return {
    ok: true,
    change,
    flowId: state.flowId,
    profile: state.profile || state.workflow?.profile || "custom",
    stage,
    ...(current.delegate ? { delegate: current.delegate, delegateInputs: stage.inputs } : {}),
    nextAction,
    message: tr(options, `MatSpec ${change}: ${stage.index}/${stage.total} ${stage.key} (${stage.status})`, `MatSpec ${change}：${stage.index}/${stage.total} ${stage.key}（${stage.status}）`),
    items: [
      `matspec [${stage.index}/${stage.total} ${stage.key} · ${stage.status}]`,
      ...(stage.allowedWritePath ? [`artifact: ${stage.allowedWritePath}`] : []),
      `action: ${nextAction}`
    ],
    next: nextAction === "await_user_accept"
      ? [tr(options, "Run matspec accept after user confirmation", "确认后执行 matspec accept")]
      : nextAction === "delegate-subagent"
        ? [current.key === "implementation" ? "matspec implement --run --json" : `委托 ${current.delegate}`]
        : [tr(options, "Run /matspec in your coding agent", "在 Coding Agent 中执行 /matspec")]
  };
}

function stageInputs(stage, change, root) {
  return (stage.inputs || []).map((input) => {
    const filePath = input.endsWith(".md") && !input.startsWith("matspec/")
      ? `matspec/changes/${change}/${input}`
      : input;
    return {
      path: filePath,
      required: isRequiredStageInput(stage, filePath),
      exists: pathExists(root, filePath)
    };
  });
}

function isRequiredStageInput(stage, filePath) {
  if (filePath === "matspec/specs/spec.md") return Boolean(stage.requiresFullSpec);
  if (filePath === "matspec/specs/design.md") return Boolean(stage.requiresFullDesign);
  if (filePath === "matspec/service-context.md") return false;
  return true;
}

function pathExists(root, filePath) {
  return fs.existsSync(path.join(root, filePath));
}

function findingsCommand(findings, options = {}) {
  return { ok: !hasError(findings), findings, message: findings.length ? tr(options, "Findings:", "发现以下问题：") : tr(options, "No findings.", "未发现问题。") };
}

function doneCommand(options, explicit) {
  if (options.force) {
    return {
      ok: false,
      code: "DONE_FORCE_NOT_SUPPORTED",
      message: tr(options, "matspec done does not support --force. Use matspec archive --force only for explicit manual recovery.", "matspec done 不支持 --force。仅在明确手工恢复时使用 matspec archive --force。"),
      next: ["matspec archive --force"]
    };
  }
  const findings = validateProject(options, explicit);
  if (hasError(findings)) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: tr(options, "The change failed validation and cannot be completed.", "变更未通过校验，不能完成。"),
      findings
    };
  }
  return archiveChange(options, explicit);
}

function integrationCommand(options, args) {
  const action = args[0] || "list";
  const name = args[1] || "codex";
  const root = projectPaths(options).root;
  if (action === "list") {
    const integrations = listIntegrations();
    return { ok: true, integrations, message: tr(options, "Supported agent integrations", "支持的 Agent 集成"), items: integrations.map((item) => `${item.name} -> ${item.path}`) };
  }
  if (action === "install") {
    const result = installIntegration(root, name, options);
    return { ...result, message: result.message || tr(options, `Installed ${name} integration.`, `已安装 ${name} 集成。`), items: result.files.map((file) => file.path) };
  }
  if (action === "remove" || action === "uninstall") return removeIntegration(root, name, options);
  throw new Error(tr(options, `Unknown integration command: ${action}`, `未知 integration 命令：${action}`));
}

function workflowCommand(options, args) {
  const action = args[0];
  if (action !== "refresh-snapshot") {
    return { ok: false, code: "WORKFLOW_COMMAND_USAGE", message: "用法：matspec workflow refresh-snapshot <change> --confirm-compatible <说明>" };
  }
  const root = projectPaths(options).root;
  const change = args[1] || resolveChange(options);
  return refreshWorkflowSnapshot(root, change, options.confirm_compatible);
}

async function generateCommand(options, args) {
  const action = args[0];
  const generateOptions = attachGenerateProgress(options);
  if (options.batch) return generateBatch(options.batch, generateOptions);
  if (!options.json) {
    if (!action) printProgressTitle("matspec generate");
    if (action === "module") printProgressTitle("matspec generate module");
  }
  if (!action) return generateDocs(generateOptions);
  if (action === "module") return generateModule(args[1], generateOptions);
  throw new Error(tr(options, `Unknown generate command: ${action}`, `未知 generate 命令：${action}`));
}

function help(options = {}) {
  if (isZh(options)) return helpZh();
  return helpText("Commands", "Options");
}

function helpZh() {
  return helpText("命令", "选项");
}

function helpText(commandLabel, optionLabel) {
  return `╭─ MatSpec CLI 0.4.1-beta.3 ───────────────────────────╮
│ Markdown-first specification-driven development        │
╰─────────────────────────────────────────────────────────╯

${commandLabel}:
  matspec init [path]
  matspec start|new <change> [--profile light|standard|full]
  matspec list|status|go|next|accept|confirm
  matspec implement [--run|--task N|--complete N|--block N]
  matspec review [change]
  matspec back [change] --to stage --reason text
  matspec validate [change]
  matspec doctor
  matspec done|archive [change]
  matspec generate [module <path>] [--batch modules.json]
  matspec show|apply
  matspec integration list|install|remove
  matspec workflow refresh-snapshot
  matspec metrics show|record
  matspec stages init|list|add|remove|validate|cleanup
  matspec template list|show|copy|sync
  matspec extension list|install|remove
  matspec version

${optionLabel}:
  --runner opencode|opencode-serve|relay-serve|relay-pool|nga|codegenie|codeagent|chrys
  --concurrency 1..10
  --retries N
  --design-template path
  --spec-template path
  --knowledge path
  --profile light|standard|full (start only; default light)
  --with-template (include the active template in go JSON)
  --json
  --force
  --path path
  --no-color
  --no-update-check
`;
}
