import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import iconv from "iconv-lite";
import { ensureDir, rel, slugify, writeJson } from "../util.js";
import { commonOutputRules, readFullTemplates, repositoryEvidence, specBlackBoxRules } from "./templates.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function runExternalGeneration({ paths, run, scan, plan, strategy, options = {} }) {
  const executable = strategy.executable || findExecutable(strategy.runner);
  if (!executable) {
    return failure("RUNNER_NOT_FOUND", `External runner not found: ${strategy.runner}`, { runner: strategy.runner });
  }

  const guard = createWorkspaceGuard(paths, run);
  const promptsDir = path.join(run.dir, "logs/prompts");
  ensureDir(promptsDir);

  const designPrompt = buildDesignPrompt(scan, plan, strategy.runner, options);
  const designPromptFile = path.join(promptsDir, "design.md");
  fs.writeFileSync(designPromptFile, designPrompt, "utf8");
  const designResult = runRunnerTask({
    paths,
    run,
    executable,
    strategy,
    task: "design",
    prompt: designPrompt
  });
  if (!designResult.ok) return designResult;

  const effectiveStrategy = designResult.model && designResult.model !== strategy.model ? { ...strategy, model: designResult.model, fallbackModel: null } : strategy;
  const specPrompt = buildSpecPrompt(designResult.content, strategy.runner, options);
  const specPromptFile = path.join(promptsDir, "spec.md");
  fs.writeFileSync(specPromptFile, specPrompt, "utf8");
  const specResult = runRunnerTask({
    paths,
    run,
    executable,
    strategy: effectiveStrategy,
    task: "spec",
    prompt: specPrompt
  });
  if (!specResult.ok) return specResult;

  const workspaceError = guard.changed();
  if (workspaceError) return workspaceError;

  const tokens = {
    input: estimateTokens(designPrompt) + estimateTokens(specPrompt),
    output: estimateTokens(designResult.content) + estimateTokens(specResult.content)
  };
  const externalLog = {
    runner: strategy.runner,
    model: specResult.model || designResult.model || strategy.model,
    executable: executable.replaceAll(path.sep, "/"),
    calls: [designResult.log, specResult.log],
    prompts: {
      design: rel(run.dir, designPromptFile),
      spec: rel(run.dir, specPromptFile)
    },
    tokens
  };
  const externalLogFile = path.join(run.dir, "logs/external.json");
  writeJson(externalLogFile, externalLog);

  return {
    ok: true,
    design: designResult.content,
    spec: specResult.content,
    logs: {
      external: rel(run.dir, externalLogFile),
      prompts: externalLog.prompts
    },
    tokens,
    provider: strategy.runner,
    model: specResult.model || designResult.model || strategy.model
  };
}

export function runRunnerTask({ paths, run, executable, strategy, task, prompt }) {
  const resolvedExecutable = executable || strategy.executable || findExecutable(strategy.runner);
  if (!resolvedExecutable) {
    return failure("RUNNER_NOT_FOUND", `External runner not found: ${strategy.runner}`, { runner: strategy.runner });
  }

  const attempts = [strategy.model || null, strategy.fallbackModel].filter((model, index) => index === 0 || Boolean(model));
  const taskSlug = slugify(task) || "task";
  const attemptLogs = [];
  let lastFailure = null;

  for (const [index, model] of attempts.entries()) {
    const attemptName = index === 0 ? taskSlug : `${taskSlug}-fallback`;
    const attemptStrategy = { ...strategy, model };
    const stdoutFile = path.join(run.dir, `logs/${strategy.runner}-${attemptName}.stdout.log`);
    const stderrFile = path.join(run.dir, `logs/${strategy.runner}-${attemptName}.stderr.log`);
    const outputFile = path.join(run.dir, `logs/${strategy.runner}-${attemptName}-last-message.md`);
    const args = buildArgs({ paths, strategy: attemptStrategy, outputFile });
    const result = spawnRunner(resolvedExecutable, args, paths.root, prompt, strategy.runner);
    fs.writeFileSync(stdoutFile, result.stdout || "", "utf8");
    fs.writeFileSync(stderrFile, result.stderr || "", "utf8");

    const commandLog = {
      task,
      model,
      status: result.status,
      command: `${strategy.runner} ${args.map(shellToken).join(" ")}`,
      stdoutLog: rel(run.dir, stdoutFile),
      stderrLog: rel(run.dir, stderrFile)
    };
    attemptLogs.push(commandLog);

    if (result.error || result.status !== 0) {
      const runnerError = parseRunnerError(result.stdout || "", result.stderr || "");
      lastFailure = failure(runnerError.code, runnerError.message || `External runner failed: ${strategy.runner} ${task}`, {
        runner: strategy.runner,
        task,
        status: result.status,
        log: commandLog,
        attempts: attemptLogs,
        stderr: result.stderr,
        diagnostics: result.error?.message
      });
      continue;
    }

    const parsed = parseOutput({ strategy: attemptStrategy, task, stdout: result.stdout || "", outputFile });
    if (!parsed.ok) {
      lastFailure = failure(parsed.code, parsed.message, {
        runner: strategy.runner,
        task,
        log: commandLog,
        attempts: attemptLogs
      });
      continue;
    }

    return {
      ok: true,
      content: parsed.content,
      model,
      log: {
        ...commandLog,
        attempts: attemptLogs,
        outputSource: parsed.source
      }
    };
  }

  return lastFailure || failure("EXTERNAL_RUNNER_FAILED", `External runner failed: ${strategy.runner} ${task}`, { runner: strategy.runner, task });
}

function buildArgs({ paths, strategy, outputFile }) {
  if (strategy.runner === "codex") {
    return ["exec", "-C", paths.root, "--model", strategy.model, "--sandbox", "read-only", "--output-last-message", outputFile, "-"];
  }
  if (strategy.runner === "opencode-serve") {
    return [
      path.join(packageRoot, "scripts/runner-bridge.js"),
      "--runner", strategy.runner,
      "--url", strategy.serveUrl || defaultServeUrl(),
      ...(strategy.model ? ["--model", strategy.model] : [])
    ];
  }
  if (strategy.runner === "opencode" || strategy.runner === "codegenie") {
    return [
      "run",
      "--format",
      "json",
      "--dir",
      paths.root,
      ...(strategy.model ? ["--model", strategy.model] : [])
    ];
  }
  if (strategy.runner === "nga") {
    return ["run", "generate", "-f", "-", ...(strategy.model ? ["--model", strategy.model] : []), "--agent", "plan"];
  }
  if (strategy.runner === "chrys") {
    return ["run", "-t", "__MATSPEC_PROMPT__", "-a", strategy.agent || "plan", "-C", paths.root, "--json"];
  }
  if (strategy.runner === "codeagent") {
    return ["-p", "--output-format", "json", "--add-dir", paths.root, ...(strategy.model ? ["--model", strategy.model] : [])];
  }
  if (strategy.runner === "claude") {
    return [
      "--model", strategy.model, "-p", "--output-format", "json", "--max-turns", "1",
      "--permission-mode", "plan", "--disallowedTools", "Read,Grep,Glob,Bash,Edit,Write,Task,WebSearch,WebFetch,NotebookEdit"
    ];
  }
  return [
    "--model",
    strategy.model,
    "-p",
    "--output-format",
    "json",
    "--max-turns",
    "1",
    "--permission-mode",
    "plan",
    "--disallowedTools",
    "Read,Grep,Glob,Bash,Edit,Write,Task,WebSearch,WebFetch,NotebookEdit"
  ];
}

function spawnRunner(executable, args, cwd, prompt, runner) {
  const resolvedArgs = args.map((arg) => arg === "__MATSPEC_PROMPT__" ? prompt : arg);
  const codeagent = runner === "codeagent";
  const result = spawnSync(executable, resolvedArgs, {
    cwd,
    encoding: codeagent ? null : "utf8",
    input: prompt,
    shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(executable)
      ? process.env.ComSpec || path.join(process.env.SystemRoot || "C:\\Windows", "System32", "cmd.exe")
      : false,
    windowsHide: true,
    timeout: runner === "opencode-serve" ? 30 * 60 * 1000 : 60 * 60 * 1000
  });
  if (!codeagent) return result;
  return {
    ...result,
    stdout: Buffer.isBuffer(result.stdout) ? result.stdout.toString("utf8") : result.stdout,
    stderr: Buffer.isBuffer(result.stderr) ? iconv.decode(result.stderr, "gbk") : result.stderr
  };
}

function defaultServeUrl() {
  return "http://127.0.0.1:4096";
}

function parseOutput({ strategy, task, stdout, outputFile }) {
  if (strategy.runner === "codex" && fs.existsSync(outputFile)) {
    const rawContent = fs.readFileSync(outputFile, "utf8").trim();
    const content = extractMarkdown(rawContent);
    if (content) return { ok: true, content, source: rel(path.dirname(outputFile), outputFile) };
    if (rawContent) {
      return {
        ok: false,
        code: "EXTERNAL_RUNNER_UNPARSEABLE_OUTPUT",
        message: `External runner did not output parseable Markdown: ${strategy.runner} ${task}`
      };
    }
  }

  const trimmed = stdout.trim();
  if (!trimmed) {
    return { ok: false, code: "EXTERNAL_RUNNER_EMPTY_OUTPUT", message: `External runner output is empty: ${strategy.runner} ${task}` };
  }

  try {
    const json = JSON.parse(trimmed);
    const content = extractMarkdown(json.content || json.markdown || json.final || json.result);
    if (content) return { ok: true, content, source: "stdout-json" };
  } catch {
    // Fall through to markdown parsing.
  }

  const jsonlResult = parseJsonl(trimmed);
  if (jsonlResult.error) {
    return {
      ok: false,
      code: "EXTERNAL_RUNNER_FAILED",
      message: `External runner returned an error: ${jsonlResult.error}`
    };
  }
  const jsonl = extractMarkdown(jsonlResult.content);
  if (jsonl) return { ok: true, content: jsonl, source: "stdout-jsonl" };

  const markdown = extractMarkdown(trimmed);
  if (markdown) return { ok: true, content: markdown, source: "stdout-markdown" };
  return {
    ok: false,
    code: "EXTERNAL_RUNNER_UNPARSEABLE_OUTPUT",
    message: `External runner did not output parseable Markdown: ${strategy.runner} ${task}`
  };
}

const RATE_LIMIT_PHRASE = /\b(rate[\s-]?limit(ed)?|hit (your )?limit|quota|too many requests)\b/i;

function parseRunnerError(stdout, stderr = "") {
  const fallback = { code: "EXTERNAL_RUNNER_FAILED", message: "" };
  const event = extractRunnerErrorEvent(String(stdout || "").trim()) || extractRunnerErrorEvent(String(stderr || "").trim());
  if (!event) return fallback;
  const message = String(event.result || event.error?.message || event.message || "").trim();
  const status = event.api_error_status || event.status;
  if (status === 429 || (status !== 200 && RATE_LIMIT_PHRASE.test(message))) {
    return {
      code: "EXTERNAL_RUNNER_RATE_LIMITED",
      message: message ? `External runner rate limited: ${message}` : "External runner rate limited."
    };
  }
  if (message) return { code: "EXTERNAL_RUNNER_FAILED", message: `External runner returned an error: ${message}` };
  return fallback;
}

function extractRunnerErrorEvent(trimmed) {
  if (!trimmed) return null;
  try {
    const json = JSON.parse(trimmed);
    if (isErrorEvent(json)) return json;
  } catch {
    // Fall through to JSONL scan.
  }
  const lines = trimmed.split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const event = JSON.parse(lines[index]);
      if (isErrorEvent(event)) return event;
    } catch {
      // Ignore non-JSON log lines.
    }
  }
  return null;
}

function isErrorEvent(event) {
  return Boolean(
    event &&
      typeof event === "object" &&
      (event.is_error === true || event.api_error_status || event.status === 429 || event.error)
  );
}

function buildDesignPrompt(scan, plan, runner, options = {}) {
  const templates = readFullTemplates(options);
  return `${commonOutputRules(options)}

You are the MatSpec documentation generation runner (${runner}).
Use only the repository scan context in this prompt.
Do not modify any files.
Do not call git apply.
Do not write to matspec/specs.
The MatSpec CLI will save files.
Output only the final Markdown for design.md.

Template requirements:
1. Strictly use the main section structure and headings from the DESIGN template below.
2. Preserve the section meaning, but replace placeholders with real project content.
3. Do not delete non-applicable sections; write "No explicit design" or "To be confirmed" and explain the basis.

DESIGN template:
${templates.design}

Project: ${plan.projectName}
Modules:
${plan.modules.map((module) => `- ${module.name}: ${module.path}`).join("\n")}

Repository evidence:
${repositoryEvidence(scan)}

File tree:
${scan.fileTree}
`;
}

function buildSpecPrompt(design, runner, options = {}) {
  const templates = readFullTemplates(options);
  return `${commonOutputRules(options)}

You are the MatSpec documentation generation runner (${runner}).
Do not modify any files.
Do not call git apply.
Do not write to matspec/specs.
The MatSpec CLI will save files.
Output only the final Markdown for spec.md.
Derive spec.md only from the generated design.md below. Do not use source context directly.

${specBlackBoxRules(options)}

Template requirements:
1. Strictly use the main section structure and headings from the SPEC template below.
2. Preserve these sections: Component Purpose, Domain Terminology, Actors and Boundaries, DFX Constraints, Core Capabilities, Data Constraints.
3. Replace placeholders with business language; do not keep placeholder text such as "[Component Name]" or "[Capability Name]".
4. Do not output guidance from SPEC-annotated; output only the final SPEC body.

SPEC template:
${templates.spec}

SPEC methodology reference:
${templates.specAnnotated}

Generated design.md:
${design}
`;
}

export function createWorkspaceGuard(paths, run = null) {
  const allowedRunDir = run?.dir ? rel(paths.root, run.dir) : null;
  const before = snapshotWorkspace(paths.root, allowedRunDir);
  return {
    changed() {
      const after = snapshotWorkspace(paths.root, allowedRunDir);
      const changed = [];
      for (const [file, content] of after.entries()) {
        if (!before.has(file) || before.get(file) !== content) changed.push(file);
      }
      for (const file of before.keys()) {
        if (!after.has(file)) changed.push(file);
      }
      return workspaceFailure([...new Set(changed)].filter((file) => !isAllowedRunPath(file, allowedRunDir)));
    }
  };
}

function workspaceFailure(changedFiles) {
  if (!changedFiles.length) return null;
  const modifiedSpecs = changedFiles.filter((file) => file === "matspec/specs/spec.md" || file === "matspec/specs/design.md");
  if (modifiedSpecs.length === changedFiles.length) {
    return failure("EXTERNAL_RUNNER_MODIFIED_SPECS", "External runner modified matspec/specs; generation was aborted. Check git diff.", {
      modifiedSpecs
    });
  }
  return failure("EXTERNAL_RUNNER_MODIFIED_WORKTREE", "External runner modified files outside the run directory; generation was aborted. Check git diff.", {
    modifiedFiles: changedFiles
  });
}

function snapshotWorkspace(root, allowedRunDir) {
  const snapshot = new Map();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      const relative = rel(root, absolute);
      if (entry.isDirectory()) {
        if ([".git", "node_modules"].includes(entry.name)) continue;
        if (isAllowedRunPath(relative, allowedRunDir)) continue;
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (isAllowedRunPath(relative, allowedRunDir)) continue;
      snapshot.set(relative, fileHash(absolute));
    }
  }
  walk(root);
  return snapshot;
}

function fileHash(file) {
  const stats = fs.statSync(file);
  if (stats.size <= 256 * 1024) return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const fd = fs.openSync(file, "r");
  const hash = crypto.createHash("sha256");
  const buffer = Buffer.alloc(256 * 1024);
  try {
    let position = 0;
    while (position < stats.size) {
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, position);
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    return hash.digest("hex");
  } finally {
    fs.closeSync(fd);
  }
}

function isAllowedRunPath(file, allowedRunDir) {
  return Boolean(allowedRunDir && (file === allowedRunDir || file.startsWith(`${allowedRunDir}/`)));
}

function parseJsonl(text) {
  let content = "";
  let error = "";
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "error" || event.error) {
        error = extractEventError(event);
        continue;
      }
      const candidate = event.content || event.markdown || event.final || event.result || event.message?.content || event.part?.text;
      const role = event.role || event.type || event.event || event.message?.role;
      const phase = event.part?.metadata?.openai?.phase || "";
      if (typeof candidate === "string" && candidate.trim() && /assistant|final|message|result|text/i.test(String(role || "final")) && (!phase || /final/i.test(String(phase)))) {
        content = candidate.trim();
      }
    } catch {
      // Ignore non-JSON log lines.
    }
  }
  return { content, error };
}

function extractEventError(event) {
  const raw = event.error?.data?.message || event.error?.message || event.message || JSON.stringify(event.error || event);
  try {
    const parsed = JSON.parse(raw);
    return parsed.error?.message || parsed.message || raw;
  } catch {
    return String(raw || "unknown error");
  }
}

function extractMarkdown(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const markdownStart = text.indexOf("# ");
  if (markdownStart >= 0) return text.slice(markdownStart).trim();
  return "";
}

function findExecutable(command, env = process.env) {
  const extensions = process.platform === "win32" ? [".cmd", ".exe", ".bat", ".com", ".ps1", ""] : [""];
  for (const dir of (env.PATH || env.Path || env.path || "").split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(dir, `${command}${extension}`);
      if (isFile(candidate)) return candidate;
    }
  }
  return null;
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function failure(code, message, extra = {}) {
  return { ok: false, code, message, ...extra, next: extra.next || nextForError(code) };
}

function nextForError(code) {
  switch (code) {
    case "RUNNER_NOT_FOUND":
      return ["matspec generate --runner auto", "Confirm the matching CLI is installed and authenticated"];
    case "EXTERNAL_RUNNER_FAILED":
      return ["Inspect logs/*stdout.log and logs/*stderr.log under the run directory", "matspec generate --runner auto"];
    case "EXTERNAL_RUNNER_RATE_LIMITED":
      return ["Wait for the runner quota to reset", "matspec generate --runner auto"];
    case "EXTERNAL_RUNNER_EMPTY_OUTPUT":
    case "EXTERNAL_RUNNER_UNPARSEABLE_OUTPUT":
      return ["Inspect logs/*stdout.log and logs/*stderr.log under the run directory", "Confirm the runner's final output has a Markdown heading"];
    case "EXTERNAL_RUNNER_MODIFIED_WORKTREE":
    case "EXTERNAL_RUNNER_MODIFIED_SPECS":
      return ["git diff", "Review external runner modifications before regenerating"];
    default:
      return ["matspec show"];
  }
}

function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}

function shellToken(value) {
  return String(value).includes(" ") ? JSON.stringify(value) : String(value);
}
