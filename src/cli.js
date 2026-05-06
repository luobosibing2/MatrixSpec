import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "./args.js";
import { STAGES } from "./constants.js";
import { detectExternalAgents, initProject, projectPaths } from "./project.js";
import { acceptStage, archiveChange, getStatus, listChanges, resolveChange, startChange } from "./state.js";
import { doctor, validateProject } from "./validation.js";
import { hasError } from "./util.js";
import { installIntegration, listIntegrations, removeIntegration } from "./integrations.js";
import { applyLatestRun, generateDocs, generateModule, showLatestRun } from "./runs.js";
import { printProgress, printProgressTitle, printResult, style } from "./output.js";
import { isZh, tr } from "./i18n.js";

export async function main(argv = []) {
  const parsed = parseArgs(argv);
  const { command, args, options } = parsed;
  if (options.help || command === "help") return printResult(help(options), options);

  let result;
  switch (command) {
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
    case "archive":
      result = archiveChange(options, args[0]);
      break;
    case "integration":
      result = integrationCommand(options, args);
      break;
    case "generate":
      result = generateCommand(options, args);
      break;
    case "show":
      result = showLatestRun(options);
      break;
    case "apply":
      result = applyLatestRun(options);
      break;
    default:
      throw new Error(tr(options, `Unknown command: ${command}`, `未知命令：${command}`));
  }

  printResult(result, options);
  if (result.findings && hasError(result.findings)) process.exitCode = 1;
  if (result.ok === false && result.code !== "NO_ACTIVE_CHANGE") process.exitCode = 1;
}

async function initCommand(targetPath, options) {
  const externalAgents = detectExternalAgents();
  if (!options.default_runner && shouldPrompt(options)) {
    options.default_runner = await promptDefaultRunner(externalAgents);
  }
  const validation = validateDefaultRunner(options.default_runner, externalAgents, options);
  if (validation) return validation;
  return initProject(targetPath, options);
}

function shouldPrompt(options) {
  return !options.json && process.stdin.isTTY && process.stdout.isTTY;
}

async function promptDefaultRunner(externalAgents) {
  const choices = ["auto"];
  if (externalAgents.codex.available) choices.push("codex");
  if (externalAgents.claude.available) choices.push("claude");

  console.log(style("matspec init", "title"));
  console.log("Choose the default documentation generation tool. matspec generate will use this choice later.");
  console.log("");
  console.log("  auto   Recommended: codex -> claude -> deterministic stub");
  if (choices.includes("codex")) console.log("  codex  Use the locally authenticated Codex CLI");
  if (choices.includes("claude")) console.log("  claude Use the locally authenticated Claude Code CLI");
  if (externalAgents.opencode.available) console.log("  opencode detected, but the generate runner is not implemented yet");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`\nDefault tool [${choices.join("/")}] (auto): `)).trim().toLowerCase();
    return choices.includes(answer) ? answer : "auto";
  } finally {
    rl.close();
  }
}

function validateDefaultRunner(defaultRunner, externalAgents = null, options = {}) {
  if (!defaultRunner) return null;
  if (["codex", "claude"].includes(defaultRunner) && externalAgents && !externalAgents[defaultRunner]?.available) {
    return {
      ok: false,
      code: "RUNNER_NOT_FOUND",
      runner: defaultRunner,
      message: tr(options, `Could not find ${defaultRunner}; it cannot be set as the default runner.`, `未找到 ${defaultRunner}，不能设为默认生成工具。`),
      next: isZh(options) ? ["matspec init --default-runner auto", `安装并登录 ${defaultRunner} 后重试`] : ["matspec init --default-runner auto", `Install and authenticate ${defaultRunner}, then retry`]
    };
  }
  if (["auto", "codex", "claude"].includes(defaultRunner)) return null;
  if (defaultRunner === "opencode") {
    return {
      ok: false,
      code: "RUNNER_NOT_IMPLEMENTED",
      runner: defaultRunner,
      message: tr(options, "The opencode generate runner is not implemented yet. Choose auto, codex, or claude.", "当前 generate runner 暂未实现 opencode，请选择 auto、codex 或 claude。"),
      next: ["matspec init --default-runner auto"]
    };
  }
  return {
    ok: false,
    code: "RUNNER_NOT_IMPLEMENTED",
    runner: defaultRunner,
    message: tr(options, `Unsupported default runner: ${defaultRunner}. Use auto, codex, or claude.`, `不支持的默认生成工具：${defaultRunner}。请使用 auto、codex 或 claude。`),
    next: ["matspec init --default-runner auto"]
  };
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
    items: result.stages.map((stage) => `${stage.status.padEnd(9)} ${stage.key} ${stage.filePath}`)
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
  const status = getStatus(options, change);
  const current = status.stages.find((stage) => stage.key === status.currentStage) ?? status.stages.find((stage) => stage.status !== "confirmed");
  if (!current) {
    return {
      ok: true,
      change,
      nextAction: "implementation",
      message: tr(options, "The document chain is validated; implementation may start. Archive only after implementation and verification pass.", "文档链已验证，可进入实现。实现完成并验证通过后再归档。"),
      next: isZh(options) ? ["按 tasks.md 执行实现", "运行必要测试和验证", "完成后执行 matspec done"] : ["Implement the tasks in tasks.md", "Run the required tests and verification", "Run matspec done after completion"]
    };
  }
  const nextAction = current.status === "draft" ? "await_user_accept" : current.status === "blocked" ? "complete_previous_stage" : "open_agent_stage";
  return {
    ok: true,
    change,
    stage: {
      index: current.index,
      total: STAGES.length,
      key: current.key,
      name: current.name,
      status: current.status,
      file: path.join(paths.root, current.filePath).replaceAll(path.sep, "/"),
      filePath: current.filePath,
      allowedWritePath: current.filePath,
      inputs: stageInputs(current, change, paths.root),
      requiresFullSpec: Boolean(current.requiresFullSpec),
      requiresFullDesign: Boolean(current.requiresFullDesign),
      requiresUserGenerationApproval: true,
      agentCommand: current.agentCommand,
      entryCommand: "/matspec",
      objective: current.objective
    },
    nextAction,
    next: nextAction === "await_user_accept"
      ? [tr(options, "Run matspec accept after user confirmation", "确认后执行 matspec accept")]
      : [tr(options, "Run /matspec in your coding agent", "在 opencode 中执行 /matspec")]
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
  const name = args[1] || "opencode";
  const root = projectPaths(options).root;
  if (action === "list") {
    const integrations = listIntegrations();
    return { ok: true, integrations, message: tr(options, "Supported agent integrations", "支持的 Agent 集成"), items: integrations.map((item) => `${item.name} -> ${item.path}`) };
  }
  if (action === "install") {
    const result = installIntegration(root, name, options);
    return { ...result, message: result.message || tr(options, `Installed ${name} integration.`, `已安装 ${name} 集成。`), items: result.files.map((file) => file.path) };
  }
  if (action === "remove") return removeIntegration(root, name, options);
  throw new Error(tr(options, `Unknown integration command: ${action}`, `未知 integration 命令：${action}`));
}

function generateCommand(options, args) {
  const action = args[0];
  const generateOptions = attachGenerateProgress(options);
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
  return `╭─ MatSpec CLI ─────────────────────────────────────────╮
│ Repo-aware specs from local coding agents               │
╰─────────────────────────────────────────────────────────╯

Common workflow:
  matspec init [path]
  matspec generate
  matspec show
  matspec apply

Document generation:
  matspec generate [--runner auto|codex|claude|opencode] [--mode auto|direct|react] [--model model]
  matspec generate module <path>

Project changes:
  matspec start <change>
  matspec list
  matspec status [change]
  matspec go [change] --json
  matspec accept [change]
  matspec confirm <stage> [change]
  matspec validate [change]
  matspec doctor
  matspec done [change]                         archive after implementation and verification
  matspec archive [change] [--force]

Integrations:
  matspec integration list
  matspec integration install|remove opencode|claude-code|codex|all

Options:
  --runner auto|codex|claude|opencode   generation tool, default auto
  --mode auto|direct|react              generation mode, default auto
  --model model                         override the runner default model
  --lang en|zh-CN                       output language, default en
  --json                                machine-readable JSON output

Notes:
  No API key is required by default. auto reuses authenticated local Codex/Claude CLIs first.
  If no local tool is available, MatSpec falls back to the deterministic stub.
  The opencode runner is not implemented yet.
`;
}

function helpZh() {
  return `╭─ MatSpec CLI ─────────────────────────────────────────╮
│ Repo-aware specs from local coding agents               │
╰─────────────────────────────────────────────────────────╯

常用流程：
  matspec init [path]
  matspec generate
  matspec show
  matspec apply

生成文档：
  matspec generate [--runner auto|codex|claude|opencode] [--mode auto|direct|react] [--model model]
  matspec generate module <path>

项目变更：
  matspec start <change>
  matspec list
  matspec status [change]
  matspec go [change] --json
  matspec accept [change]
  matspec confirm <stage> [change]
  matspec validate [change]
  matspec doctor
  matspec done [change]                         实现完成并验证通过后归档
  matspec archive [change] [--force]

集成：
  matspec integration list
  matspec integration install|remove opencode|claude-code|codex|all

选项：
  --runner auto|codex|claude|opencode   生成工具，默认 auto
  --mode auto|direct|react              生成模式，默认 auto
  --model model                         覆盖 runner 默认模型
  --lang en|zh-CN                       输出语言，默认 en
  --json                                输出机器可读 JSON

说明：
  默认不需要 API key。auto 会优先复用本机已登录的 Codex/Claude CLI；
  没有可用本地工具时会 fallback 到 deterministic stub。
  opencode runner 当前未实现。
`;
}
