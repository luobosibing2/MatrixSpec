import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CLI = path.resolve("bin/matspec.js");
const EMPTY_PATH = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-empty-path-"));

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "matspec-test-"));
}

function run(args, options = {}) {
  const { env, ...spawnOptions } = options;
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      MATSPEC_LLM_PROVIDER: "",
      LLM_PROVIDER: "",
      MATSPEC_LLM_API_KEY: "",
      LLM_API_KEY: "",
      MATSPEC_LLM_MODEL: "",
      LLM_MODEL: "",
      MATSPEC_GENERATION_MODE: "",
      PATH: EMPTY_PATH,
      Path: EMPTY_PATH,
      ...env
    },
    ...spawnOptions
  });
  return result;
}

function json(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function makeMockCommand(dir, name, output) {
  const extension = process.platform === "win32" ? ".cmd" : "";
  const file = path.join(dir, `${name}${extension}`);
  const body = process.platform === "win32" ? `@echo off\r\necho ${output}\r\n` : `#!/usr/bin/env sh\necho "${output}"\n`;
  fs.writeFileSync(file, body, "utf8");
  if (process.platform !== "win32") fs.chmodSync(file, 0o755);
  return file;
}

function makeMockRunner(dir, name, script) {
  const scriptFile = path.join(dir, `${name}-mock.cjs`);
  fs.writeFileSync(scriptFile, script, "utf8");
  const extension = process.platform === "win32" ? ".cmd" : "";
  const file = path.join(dir, `${name}${extension}`);
  const body =
    process.platform === "win32"
      ? `@echo off\r\n"${process.execPath}" "${scriptFile}" %*\r\n`
      : `#!/usr/bin/env sh\n"${process.execPath}" "${scriptFile}" "$@"\n`;
  fs.writeFileSync(file, body, "utf8");
  if (process.platform !== "win32") fs.chmodSync(file, 0o755);
  return file;
}

function mockRunnerEnv(binDir, extra = {}) {
  const pathValue = binDir;
  return { PATH: pathValue, Path: pathValue, ...extra };
}

function codexMockScript() {
  return `
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const previousCalls = process.env.MOCK_CALLS_FILE && fs.existsSync(process.env.MOCK_CALLS_FILE)
  ? fs.readFileSync(process.env.MOCK_CALLS_FILE, "utf8").split("\\n").filter(Boolean).length
  : 0;
if (process.env.MOCK_CALLS_FILE) fs.appendFileSync(process.env.MOCK_CALLS_FILE, args.join("\\u0000") + "\\n", "utf8");
if (process.env.MOCK_MODIFY_SPECS === "1") {
  fs.mkdirSync(path.join(process.cwd(), "matspec/specs"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "matspec/specs/spec.md"), "modified by external runner\\n", "utf8");
}
if (process.env.MOCK_MODIFY_SOURCE === "1") {
  fs.writeFileSync(path.join(process.cwd(), "src/auth/login.js"), "modified by external runner\\n", "utf8");
}
if (process.env.MOCK_MODIFY_MATSPEC_CONFIG === "1") {
  fs.mkdirSync(path.join(process.cwd(), ".matspec-cli"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), ".matspec-cli/config.yaml"), "modified by external runner\\n", "utf8");
}
if (process.env.MOCK_FAIL_SPARK === "1" && args.includes("gpt-5.3-codex-spark")) process.exit(9);
if (process.env.MOCK_FAIL === "1") process.exit(7);
const outputIndex = args.indexOf("--output-last-message");
if (process.env.MOCK_EMPTY === "1") {
  if (outputIndex >= 0) fs.writeFileSync(args[outputIndex + 1], "", "utf8");
  process.exit(0);
}
if (process.env.MOCK_LOG_ONLY === "1") {
  if (outputIndex >= 0) fs.writeFileSync(args[outputIndex + 1], "ordinary log line without markdown\\n", "utf8");
  else process.stdout.write("ordinary log line without markdown\\n");
  process.exit(0);
}
const prompt = args[args.length - 1] || "";
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] || "" : "";
const isSpec = outputPath.includes("-spec-") || (!outputPath && (previousCalls > 0 || prompt.includes("Generated design.md") || prompt.includes("spec.md")));
const isModule = outputPath.includes("-module-");
const content = isSpec
  ? "# Mock Codex SPEC\\n\\nDerived from design by mock codex.\\n\\n## 1. 组件定位\\nMock spec.\\n\\n## 2. 领域术语\\nMock terms.\\n\\n## 3. 角色与边界\\nMock boundaries.\\n\\n## 4. DFX 约束\\nMock DFX.\\n\\n## 5. 核心能力\\nMock capabilities.\\n\\n## 6. 数据约束\\nMock data constraints.\\n"
  : isModule
    ? "# Mock Codex Module\\n\\n## 1. 模块定位\\nModule path: src/auth\\n\\n## 2. 核心流程\\nMock module flow.\\n"
    : "# Mock Codex Design\\n\\nModule path: src/auth\\n\\n## 1. 设计概述\\nMock design.\\n\\n## 2. 系统架构\\nMock architecture.\\n\\n## 3. 数据模型\\nMock data.\\n\\n## 4. 接口设计\\nMock interfaces.\\n\\n## 5. 核心流程设计\\nMock flow.\\n\\n## 6. 算法设计\\nMock algorithms.\\n\\n## 7. 缓存设计\\nMock cache.\\n\\n## 8. 异常处理设计\\nMock errors.\\n\\n## 9. 监控与日志\\nMock observability.\\n\\n## 10. 安全设计\\nMock security.\\n";
if (outputIndex >= 0) fs.writeFileSync(args[outputIndex + 1], content, "utf8");
else process.stdout.write(content);
`;
}

function claudeMockScript() {
  return `
const fs = require("node:fs");
const args = process.argv.slice(2);
const previousCalls = process.env.MOCK_CALLS_FILE && fs.existsSync(process.env.MOCK_CALLS_FILE)
  ? fs.readFileSync(process.env.MOCK_CALLS_FILE, "utf8").split("\\n").filter(Boolean).length
  : 0;
if (process.env.MOCK_CALLS_FILE) fs.appendFileSync(process.env.MOCK_CALLS_FILE, args.join("\\u0000") + "\\n", "utf8");
if (process.env.MOCK_FAIL === "1") process.exit(7);
if (process.env.MOCK_EMPTY === "1") process.exit(0);
const prompt = args[args.indexOf("-p") + 1] || "";
const isSpec = previousCalls > 0 || prompt.includes("Generated design.md") || prompt.includes("spec.md");
const result = isSpec
  ? "# Mock Claude SPEC\\n\\nDerived from design by mock claude.\\n\\n## 1. 组件定位\\nMock spec.\\n\\n## 2. 领域术语\\nMock terms.\\n\\n## 3. 角色与边界\\nMock boundaries.\\n\\n## 4. DFX 约束\\nMock DFX.\\n\\n## 5. 核心能力\\nMock capabilities.\\n\\n## 6. 数据约束\\nMock data constraints.\\n"
  : "# Mock Claude Design\\n\\nModule path: src/auth\\n\\n## 1. 设计概述\\nMock design.\\n\\n## 2. 系统架构\\nMock architecture.\\n\\n## 3. 数据模型\\nMock data.\\n\\n## 4. 接口设计\\nMock interfaces.\\n\\n## 5. 核心流程设计\\nMock flow.\\n\\n## 6. 算法设计\\nMock algorithms.\\n\\n## 7. 缓存设计\\nMock cache.\\n\\n## 8. 异常处理设计\\nMock errors.\\n\\n## 9. 监控与日志\\nMock observability.\\n\\n## 10. 安全设计\\nMock security.\\n";
process.stdout.write(JSON.stringify({ result }));
`;
}

function writeProjectFile(root, file, content = "") {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

test("init is idempotent and does not copy business templates", () => {
  const root = tempProject();
  const first = json(run(["init", root, "--integration", "none", "--json"]));
  assert.equal(first.ok, true);
  assert.ok(fs.existsSync(path.join(root, "matspec/specs")));
  assert.ok(fs.existsSync(path.join(root, ".matspec-cli/config.yaml")));
  assert.equal(fs.existsSync(path.join(root, "matspec/specs/spec.md")), false);
  assert.equal(fs.existsSync(path.join(root, "matspec/specs/design.md")), false);

  const second = json(run(["init", root, "--integration", "none", "--json"]));
  assert.equal(second.ok, true);
  assert.ok(second.skipped.includes(".matspec-cli/config.yaml"));
});

test("init records local coding agent detection in result and config", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-bin-"));
  makeMockCommand(binDir, "codex", "codex mock 1.0.0");

  const env = { ...process.env, PATH: binDir, Path: binDir };
  const result = json(run(["init", root, "--integration", "none", "--probe-models", "--json"], { env }));
  assert.equal(result.generation.probeModels.requested, true);
  assert.equal(result.generation.probeModels.status, "not_implemented");
  assert.equal(result.generation.externalAgents.codex.available, true);
  assert.equal(result.generation.externalAgents.codex.version, "codex mock 1.0.0");
  assert.equal(result.generation.externalAgents.codex.recommendedModel, "gpt-5.3-codex-spark");
  assert.equal(result.generation.externalAgents.codex.fallbackModel, "gpt-5.5");
  assert.equal(result.generation.externalAgents.claude.available, false);
  assert.equal(result.generation.externalAgents.claude.recommendedModel, "claude-sonnet-4-6");

  const config = fs.readFileSync(path.join(root, ".matspec-cli/config.yaml"), "utf8");
  assert.match(config, /generation:/);
  assert.match(config, /requested: true/);
  assert.match(config, /status: not_implemented/);
  assert.match(config, /externalAgents:/);
  assert.match(config, /codex:\n      available: true/);
  assert.match(config, /claude:\n      available: false/);
});

test("init can set default generation runner and generate honors it", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());

  const init = json(
    run(["init", root, "--integration", "none", "--default-runner", "codex", "--json"], {
      env: mockRunnerEnv(binDir)
    })
  );
  assert.equal(init.generation.defaultRunner, "codex");
  const config = fs.readFileSync(path.join(root, ".matspec-cli/config.yaml"), "utf8");
  assert.match(config, /defaultRunner: codex/);

  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  const generated = json(run(["--path", root, "generate", "--json"], { env: mockRunnerEnv(binDir) }));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "manifest.json"), "utf8"));
  assert.equal(manifest.runner, "codex");
  assert.equal(manifest.provider, "codex");
});

test("init preserves user-owned generation config while refreshing agent detection", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  const configFile = path.join(root, ".matspec-cli/config.yaml");
  const original = fs.readFileSync(configFile, "utf8");
  fs.writeFileSync(configFile, original.replace("generation:\n", "generation:\n  customKey: keep-me\n"), "utf8");

  json(run(["init", root, "--integration", "none", "--json"]));
  const config = fs.readFileSync(configFile, "utf8");
  assert.match(config, /customKey: keep-me/);
  assert.match(config, /externalAgents:/);
  assert.equal((config.match(/generation:/g) || []).length, 1);
});

test("start creates only change directory and state", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  const result = json(run(["--path", root, "start", "REQ20260428-user-login", "--json"]));
  assert.equal(result.change, "REQ20260428-user-login");
  assert.ok(fs.existsSync(path.join(root, "matspec/changes/REQ20260428-user-login/.matspec-state.json")));
  assert.equal(fs.existsSync(path.join(root, "matspec/changes/REQ20260428-user-login/proposal.md")), false);
});

test("status, go, accept, and archive follow the stage model", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  json(run(["--path", root, "start", "REQ20260428-user-login", "--json"]));
  let status = json(run(["--path", root, "status", "--json"]));
  assert.equal(status.stages[0].status, "clarifying");
  assert.equal(status.stages[1].status, "blocked");

  const changeDir = path.join(root, "matspec/changes/REQ20260428-user-login");
  fs.writeFileSync(path.join(changeDir, "proposal.md"), "# 登录需求澄清\n\n范围已明确，包含验收标准。\n", "utf8");
  let go = json(run(["--path", root, "go", "--json"]));
  assert.equal(go.nextAction, "await_user_accept");
  assert.equal(go.stage.allowedWritePath, "matspec/changes/REQ20260428-user-login/proposal.md");
  assert.equal(go.stage.requiresUserGenerationApproval, true);
  assert.equal(go.stage.requiresFullSpec, false);
  assert.ok(go.stage.inputs.some((input) => input.path === "matspec/specs/spec.md" && input.required === false));

  const accepted = json(run(["--path", root, "accept", "--json"]));
  assert.equal(accepted.acceptedStage, "proposal");
  status = json(run(["--path", root, "status", "--json"]));
  assert.equal(status.stages[0].status, "confirmed");
  assert.equal(status.stages[1].status, "clarifying");
  go = json(run(["--path", root, "go", "--json"]));
  assert.equal(go.stage.key, "delta-spec");
  assert.equal(go.stage.requiresFullSpec, true);
  assert.equal(go.stage.requiresFullDesign, false);
  assert.ok(go.stage.inputs.some((input) => input.path === "matspec/changes/REQ20260428-user-login/proposal.md" && input.required === true));

  for (const [file, body] of [
    ["delta-spec.md", "# 增量规格\n\n## ADDED Requirements\n无\n## MODIFIED Requirements\n无\n## REMOVED Requirements\n无\n"],
    ["delta-design.md", "# 增量设计\n\n设计覆盖规格。\n"],
    ["tasks.md", "# 任务\n\n- 实现登录\n- 增加测试验证\n"],
    ["validation.md", "# 验证\n\n结论：允许进入实现。\n"]
  ]) {
    fs.writeFileSync(path.join(changeDir, file), body, "utf8");
    const acceptedStage = json(run(["--path", root, "accept", "--json"]));
    if (file === "validation.md") {
      assert.equal(acceptedStage.readyForImplementation, true);
      assert.match(acceptedStage.message, /implementation may start/);
      assert.ok(acceptedStage.next.some((item) => item.includes("Implement")));
    }
  }

  go = json(run(["--path", root, "go", "--json"]));
  assert.equal(go.nextAction, "implementation");
  assert.match(go.message, /implementation may start/);
  assert.ok(go.next.some((item) => item.includes("tasks.md")));

  const archived = json(run(["--path", root, "archive", "--json"]));
  assert.match(archived.archive, /matspec\/changes\/archives\/\d{4}-\d{2}-\d{2}-REQ20260428-user-login/);
});

test("integration install/remove preserves modified files", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  const installed = json(run(["--path", root, "integration", "install", "opencode", "--json"]));
  assert.equal(installed.integration, "opencode");
  const commandFile = path.join(root, ".opencode/command/matspec.md");
  fs.appendFileSync(commandFile, "\n用户修改\n", "utf8");
  const removed = json(run(["--path", root, "integration", "remove", "opencode", "--json"]));
  assert.ok(removed.kept.includes(".opencode/command/matspec.md"));
  assert.ok(fs.existsSync(commandFile));
});

test("integration install supports Claude Code and Codex repository commands", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));

  const claude = json(run(["--path", root, "integration", "install", "claude-code", "--json"]));
  assert.equal(claude.integration, "claude-code");
  const mainCommand = fs.readFileSync(path.join(root, ".claude/commands/matspec.md"), "utf8");
  assert.match(mainCommand, /MatSpec SDD/);
  assert.match(mainCommand, /Stage switch card/);
  assert.match(mainCommand, /matspec accept --json/);
  assert.match(mainCommand, /nextAction is `implementation`|nextAction`? is `implementation`|If nextAction is `implementation`/);
  assert.match(mainCommand, /do not rush to `matspec done --json`/);
  assert.match(mainCommand, /matspec generate && matspec apply/);
  assert.match(mainCommand, /Clarification guardrails/);
  assert.match(mainCommand, /vague language/);
  const proposalCommand = fs.readFileSync(path.join(root, ".claude/commands/matspec-proposal.md"), "utf8");
  assert.match(proposalCommand, /generate/);
  assert.match(proposalCommand, /stage.allowedWritePath/);
  assert.match(proposalCommand, /Clarification question card/);
  assert.match(proposalCommand, /decision ledger/);
  assert.match(proposalCommand, /agent inference|agent-inferred/);
  assert.ok(fs.existsSync(path.join(root, ".claude/skills/matspec/SKILL.md")));

  const codex = json(run(["--path", root, "integration", "install", "codex", "--json"]));
  assert.equal(codex.integration, "codex");
  assert.ok(fs.existsSync(path.join(root, ".agents/skills/matspec/SKILL.md")));
  const designSkill = fs.readFileSync(path.join(root, ".agents/skills/matspec-delta-design/SKILL.md"), "utf8");
  assert.match(designSkill, /generate/);
  assert.match(designSkill, /full design\.md is missing/);
  assert.match(designSkill, /Do not invent|do not invent/);
  assert.match(designSkill, /data model\/schema, migration/);
  const tasksSkill = fs.readFileSync(path.join(root, ".agents/skills/matspec-tasks/SKILL.md"), "utf8");
  assert.match(tasksSkill, /Ask at most 3 clarification questions per turn/);
  assert.match(tasksSkill, /task boundaries, file scope/);
  const validationSkill = fs.readFileSync(path.join(root, ".agents/skills/matspec-validation/SKILL.md"), "utf8");
  assert.match(validationSkill, /whether implementation may start/);
  assert.match(validationSkill, /Generation approval|generation approval/);
  assert.match(validationSkill, /Validation-specific rules/);
  assert.match(validationSkill, /needs revision before implementation/);
  assert.ok(fs.existsSync(path.join(root, ".agents/skills/matspec-validation/SKILL.md")));

  const list = json(run(["--path", root, "integration", "list", "--json"]));
  assert.deepEqual(
    list.integrations.map((integration) => integration.name),
    ["opencode", "claude-code", "codex"]
  );
});

test("init installs all supported integrations by default", () => {
  const root = tempProject();
  const result = json(run(["init", root, "--json"]));
  assert.equal(result.integration.integration, "all");
  assert.ok(fs.existsSync(path.join(root, ".opencode/command/matspec.md")));
  assert.ok(fs.existsSync(path.join(root, ".claude/commands/matspec.md")));
  assert.ok(fs.existsSync(path.join(root, ".agents/skills/matspec/SKILL.md")));
});

test("validate reports required structure errors", () => {
  const root = tempProject();
  const result = run(["--path", root, "validate", "--json"]);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.findings.some((finding) => finding.code === "CS001"));
});

test("show reports a clear message when no generated run exists", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  const result = run(["--path", root, "show", "--json"]);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "NO_GENERATED_RUN");
  assert.match(payload.message, /matspec generate/);
});

test("generate creates a run with manifest, spec, and design stub artifacts", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));

  const generated = json(run(["--path", root, "generate", "--json"]));
  assert.equal(generated.ok, true);
  assert.equal(generated.status, "generated");

  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.runId, generated.runId);
  assert.equal(manifest.runner, "auto");
  assert.equal(manifest.generationMode, "stub");
  assert.equal(manifest.artifacts.spec, "spec.md");
  assert.equal(manifest.artifacts.design, "design.md");
  assert.match(fs.readFileSync(path.join(runDir, "spec.md"), "utf8"), /generated by matspec stub/);
  assert.match(fs.readFileSync(path.join(runDir, "design.md"), "utf8"), /generated by matspec stub/);
});

test("generate scans repository and plans src modules", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "README.md", "# Demo\n");
  writeProjectFile(root, "docs/api.md", "# API\n");
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  writeProjectFile(root, "src/build/index.js", "export function buildFeature() {}\n");
  writeProjectFile(root, "src/payment/pay.js", "export function pay() {}\n");
  writeProjectFile(root, "node_modules/ignored/index.js", "ignored\n");
  writeProjectFile(root, ".git/config", "ignored\n");
  writeProjectFile(root, "dist/bundle.js", "ignored\n");
  writeProjectFile(root, "coverage/report.txt", "ignored\n");
  writeProjectFile(root, ".matspec-cli/ignored.txt", "ignored\n");

  const generated = json(run(["--path", root, "generate", "--json"]));
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const scanFile = path.join(runDir, "logs/scan.json");
  const planFile = path.join(runDir, "plan.json");
  assert.ok(fs.existsSync(scanFile));
  assert.ok(fs.existsSync(planFile));

  const scan = JSON.parse(fs.readFileSync(scanFile, "utf8"));
  assert.ok(scan.includedFiles.includes("src/auth/login.js"));
  assert.ok(scan.includedFiles.includes("src/build/index.js"));
  assert.ok(scan.includedFiles.includes("src/payment/pay.js"));
  assert.ok(scan.includedFiles.includes("README.md"));
  assert.ok(scan.includedFiles.includes("docs/api.md"));
  assert.equal(scan.includedFiles.includes("node_modules/ignored/index.js"), false);
  assert.equal(scan.includedFiles.includes("dist/bundle.js"), false);
  assert.equal(scan.includedFiles.includes("coverage/report.txt"), false);
  assert.equal(scan.includedFiles.includes(".matspec-cli/ignored.txt"), false);
  assert.match(scan.fileTree, /^docs\/$/m);
  assert.match(scan.fileTree, /^  api\.md$/m);
  assert.match(scan.fileTree, /^src\/$/m);
  assert.match(scan.fileTree, /^  auth\/$/m);
  assert.match(scan.fileTree, /^    login\.js$/m);
  assert.match(scan.fileTree, /^  build\/$/m);
  assert.match(scan.fileTree, /^    index\.js$/m);
  assert.deepEqual(
    scan.readmeFiles.map((file) => file.path),
    ["README.md"]
  );
  assert.deepEqual(
    scan.docsFiles.map((file) => file.path),
    ["docs/api.md"]
  );

  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  assert.deepEqual(
    plan.modules.map((module) => module.path),
    ["src/auth", "src/build", "src/payment"]
  );
  assert.equal(plan.primaryExtension, ".js");

  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.artifacts.plan, "plan.json");
  assert.equal(manifest.logs.scan, "logs/scan.json");
  assert.equal(manifest.planSummary.modules, 3);
  assert.equal(manifest.scanSummary.includedFiles, scan.includedFiles.length);
});

test("generate planning falls back to Project Root when no obvious module exists", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "index.js", "console.log('small project');\n");

  const generated = json(run(["--path", root, "generate", "--json"]));
  const plan = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "plan.json"), "utf8"));
  assert.deepEqual(plan.modules, [
    {
      name: "Project Root",
      path: ".",
      description: "Fallback module for a small project without obvious source module directories."
    }
  ]);
});

test("generate plans Java Spring packages as domain modules", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/main/java/org/example/petclinic/PetClinicApplication.java", "class PetClinicApplication {}\n");
  writeProjectFile(root, "src/main/java/org/example/petclinic/owner/OwnerController.java", "class OwnerController {}\n");
  writeProjectFile(root, "src/main/java/org/example/petclinic/vet/VetController.java", "class VetController {}\n");
  writeProjectFile(root, "src/main/java/org/example/petclinic/system/CrashController.java", "class CrashController {}\n");
  writeProjectFile(root, "src/main/resources/templates/owners.html", "<html></html>\n");

  const generated = json(run(["--path", root, "generate", "--json"]));
  const plan = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "plan.json"), "utf8"));
  assert.deepEqual(
    plan.modules.map((module) => module.path),
    [
      "src/main/java/org/example/petclinic",
      "src/main/java/org/example/petclinic/owner",
      "src/main/java/org/example/petclinic/system",
      "src/main/java/org/example/petclinic/vet",
      "src/main/resources"
    ]
  );
  assert.equal(plan.primaryExtension, ".java");
});

test("scan ignores monorepo package artifacts without hiding source build modules", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "packages/api/src/index.ts", "export const api = true;\n");
  writeProjectFile(root, "packages/api/src/build/task.ts", "export const task = true;\n");
  writeProjectFile(root, "packages/api/dist/index.js", "compiled\n");
  writeProjectFile(root, "packages/@acme/api/src/index.ts", "export const scoped = true;\n");
  writeProjectFile(root, "packages/@acme/api/src/build/task.ts", "export const scopedTask = true;\n");
  writeProjectFile(root, "packages/@acme/api/dist/index.js", "compiled\n");
  writeProjectFile(root, "packages/@acme/api/build/app.js", "compiled\n");
  writeProjectFile(root, "packages/web/build/app.js", "compiled\n");
  writeProjectFile(root, "apps/web/.next/server.js", "compiled\n");
  writeProjectFile(root, "apps/web/coverage/report.js", "compiled\n");
  writeProjectFile(root, "apps/admin/web/src/index.ts", "export const admin = true;\n");
  writeProjectFile(root, "apps/admin/web/src/build/task.ts", "export const adminTask = true;\n");
  writeProjectFile(root, "apps/admin/web/dist/index.js", "compiled\n");
  writeProjectFile(root, "apps/admin/web/build/app.js", "compiled\n");
  writeProjectFile(root, "src/build/index.js", "export const build = true;\n");

  const generated = json(run(["--path", root, "generate", "--json"]));
  const scan = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "logs/scan.json"), "utf8"));
  assert.ok(scan.includedFiles.includes("packages/api/src/index.ts"));
  assert.ok(scan.includedFiles.includes("packages/api/src/build/task.ts"));
  assert.ok(scan.includedFiles.includes("packages/@acme/api/src/index.ts"));
  assert.ok(scan.includedFiles.includes("packages/@acme/api/src/build/task.ts"));
  assert.ok(scan.includedFiles.includes("apps/admin/web/src/index.ts"));
  assert.ok(scan.includedFiles.includes("apps/admin/web/src/build/task.ts"));
  assert.ok(scan.includedFiles.includes("src/build/index.js"));
  assert.equal(scan.includedFiles.includes("packages/api/dist/index.js"), false);
  assert.equal(scan.includedFiles.includes("packages/@acme/api/dist/index.js"), false);
  assert.equal(scan.includedFiles.includes("packages/@acme/api/build/app.js"), false);
  assert.equal(scan.includedFiles.includes("packages/web/build/app.js"), false);
  assert.equal(scan.includedFiles.includes("apps/web/.next/server.js"), false);
  assert.equal(scan.includedFiles.includes("apps/web/coverage/report.js"), false);
  assert.equal(scan.includedFiles.includes("apps/admin/web/dist/index.js"), false);
  assert.equal(scan.includedFiles.includes("apps/admin/web/build/app.js"), false);
  assert.equal(scan.primaryExtension, ".ts");
});

test("generate rejects unimplemented opencode runner without creating a run", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));

  const result = run(["--path", root, "generate", "--runner", "opencode", "--json"]);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "RUNNER_NOT_IMPLEMENTED");
  assert.equal(payload.runner, "opencode");
  assert.ok(payload.next.includes("matspec generate --runner auto"));
  assert.equal(fs.readdirSync(path.join(root, ".matspec-cli/runs")).filter((entry) => entry !== "latest.json").length, 0);
});

test("generate returns JSON on stdout when project is not initialized", () => {
  const root = tempProject();
  const result = run(["--path", root, "generate", "--json"]);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "MATSPEC_NOT_INITIALIZED");
});

test("help advertises the minimal generate runner options", () => {
  const result = run(["help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /matspec generate \[--runner auto\|codex\|claude\|opencode\]/);
});

test("show --json returns the latest run manifest", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  const generated = json(run(["--path", root, "generate", "--json"]));

  const shown = json(run(["--path", root, "show", "--json"]));
  assert.equal(shown.runId, generated.runId);
  assert.equal(shown.status, "generated");
  assert.equal(shown.artifacts.spec, "spec.md");
});

test("show displays scan and planning summary", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  writeProjectFile(root, "src/payment/pay.js", "export function pay() {}\n");
  json(run(["--path", root, "generate", "--json"]));

  const shown = run(["--path", root, "show"]);
  assert.equal(shown.status, 0, shown.stderr);
  assert.match(shown.stdout, /included files: \d+/);
  assert.match(shown.stdout, /planned modules: 2/);
});

test("runner auto selects mock codex when available", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  makeMockRunner(binDir, "claude", claudeMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const generated = json(run(["--path", root, "generate", "--json"], { env: mockRunnerEnv(binDir) }));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "manifest.json"), "utf8"));
  assert.equal(manifest.runner, "codex");
  assert.equal(manifest.provider, "codex");
  assert.equal(manifest.generationMode, "react");
  assert.equal(manifest.generationReason, "module_first_pipeline");
  assert.ok(manifest.artifacts.modules.length > 0);
});

test("runner auto selects mock claude when codex is unavailable", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "claude", claudeMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const generated = json(run(["--path", root, "generate", "--json"], { env: mockRunnerEnv(binDir) }));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "manifest.json"), "utf8"));
  assert.equal(manifest.runner, "claude");
  assert.equal(manifest.provider, "claude");
  assert.equal(manifest.generationMode, "react");
  assert.equal(manifest.generationReason, "module_first_pipeline");
  assert.ok(manifest.artifacts.modules.length > 0);
});

test("fake direct generate writes prompts, llm log, and design-derived spec", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  writeProjectFile(root, "src/payment/pay.js", "export function pay() {}\n");

  const generated = json(run(["--path", root, "generate", "--mode", "direct", "--json"], { env: { MATSPEC_LLM_PROVIDER: "fake" } }));
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  for (const file of ["design.md", "spec.md", "logs/prompts/design.md", "logs/prompts/spec.md", "logs/llm.json"]) {
    assert.ok(fs.existsSync(path.join(runDir, file)), file);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.generationMode, "direct");
  assert.equal(manifest.provider, "fake");
  assert.equal(manifest.model, "fake-matspec-model");
  assert.equal(manifest.logs.llm, "logs/llm.json");
  assert.equal(manifest.logs.prompts.design, "logs/prompts/design.md");
  assert.equal(manifest.logs.prompts.spec, "logs/prompts/spec.md");
  assert.equal(typeof manifest.tokens.input, "number");
  assert.equal(typeof manifest.tokens.output, "number");

  const design = fs.readFileSync(path.join(runDir, "design.md"), "utf8");
  assert.match(design, /src\/auth/);
  assert.match(design, /src\/payment/);

  const spec = fs.readFileSync(path.join(runDir, "spec.md"), "utf8");
  assert.match(spec, /Derived from design/);
  const designPrompt = fs.readFileSync(path.join(runDir, "logs/prompts/design.md"), "utf8");
  assert.match(designPrompt, /DESIGN template/);
  assert.match(designPrompt, /# \[Component Name\] Implementation Design/);
  const specPrompt = fs.readFileSync(path.join(runDir, "logs/prompts/spec.md"), "utf8");
  assert.match(specPrompt, /Generated design\.md:/);
  assert.match(specPrompt, /src\/auth/);
  assert.match(specPrompt, /SPEC template/);
  assert.match(specPrompt, /# \[Component Name\] Specification/);
  assert.match(specPrompt, /Spec vs Design/);
});

test("fake react generate writes module documents and react log", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  writeProjectFile(root, "src/payment/pay.js", "export function pay() {}\n");

  const generated = json(
    run(["--path", root, "generate", "--json"], {
      env: { MATSPEC_LLM_PROVIDER: "fake", MATSPEC_GENERATION_MODE: "react" }
    })
  );
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.generationMode, "react");
  assert.equal(manifest.provider, "fake");
  assert.equal(manifest.logs.react, "logs/react.json");
  assert.ok(manifest.artifacts.modules.length > 0);
  assert.ok(fs.existsSync(path.join(runDir, "logs/react.json")));
  assert.ok(fs.existsSync(path.join(runDir, "modules/src-auth.md")));
  assert.ok(fs.existsSync(path.join(runDir, "logs/prompts/modules/src-auth.md")));
  assert.match(fs.readFileSync(path.join(runDir, "spec.md"), "utf8"), /Derived from design/);
});

test("fake provider auto mode uses module-first generation", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  for (let index = 0; index < 24; index += 1) {
    writeProjectFile(root, `src/feature-${index}/file-${index}.js`, `export const value${index} = ${index};\n`);
  }

  const generated = json(run(["--path", root, "generate", "--json"], { env: { MATSPEC_LLM_PROVIDER: "fake" } }));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "manifest.json"), "utf8"));
  assert.equal(manifest.generationMode, "react");
  assert.equal(manifest.generationReason, "module_first_pipeline");
  assert.ok(manifest.artifacts.modules.length > 0);
});

test("--mode react with mock codex writes module artifacts and react log", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  writeProjectFile(root, "src/payment/pay.js", "export function pay() {}\n");

  const generated = json(run(["--path", root, "generate", "--mode", "react", "--json"], { env: mockRunnerEnv(binDir) }));
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.runner, "codex");
  assert.equal(manifest.generationMode, "react");
  assert.equal(manifest.logs.react, "logs/react.json");
  assert.ok(manifest.artifacts.modules.length > 0);
  assert.ok(fs.existsSync(path.join(runDir, "modules/src-auth.md")));
  assert.ok(fs.existsSync(path.join(runDir, "logs/react.json")));
  assert.match(fs.readFileSync(path.join(runDir, "spec.md"), "utf8"), /Derived from design/);
});

test("react non-json output shows per-module progress", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  writeProjectFile(root, "src/payment/pay.js", "export function pay() {}\n");

  const result = run(["--path", root, "generate", "--mode", "react"], { env: { MATSPEC_LLM_PROVIDER: "fake" } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Module 1\/2: Auth \(src\/auth\)/);
  assert.match(result.stderr, /Composing design\.md/);
  assert.match(result.stderr, /Deriving spec\.md from design\.md/);
  assert.match(result.stdout, /Done Generated candidate documents/);
});

test("generate --json keeps progress out of stderr", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const result = run(["--path", root, "generate", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.doesNotMatch(result.stdout, /Checking MatSpec project structure/);
});

test("generate module --mode react uses fake react module generation", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const module = json(
    run(["--path", root, "generate", "module", "src/auth", "--mode", "react", "--json"], {
      env: { MATSPEC_LLM_PROVIDER: "fake" }
    })
  );
  const runDir = path.join(root, ".matspec-cli/runs", module.runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.generationMode, "react");
  assert.equal(manifest.provider, "fake");
  assert.equal(manifest.logs.react, "logs/react.json");
  assert.ok(fs.existsSync(path.join(runDir, "logs/prompts/modules/src-auth.md")));
  assert.match(fs.readFileSync(path.join(runDir, "modules/src-auth.md"), "utf8"), /generated by matspec fake react/);
});

test("generate module --mode direct uses module log instead of react log", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const module = json(
    run(["--path", root, "generate", "module", "src/auth", "--mode", "direct", "--json"], {
      env: { MATSPEC_LLM_PROVIDER: "fake" }
    })
  );
  const runDir = path.join(root, ".matspec-cli/runs", module.runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.generationMode, "direct");
  assert.equal(manifest.logs.module, "logs/module.json");
  assert.equal("react" in manifest.logs, false);
  assert.ok(fs.existsSync(path.join(runDir, "logs/module.json")));
  assert.equal(fs.existsSync(path.join(runDir, "logs/react.json")), false);
});

test("external runner auto mode uses module-first generation for large context", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  for (let index = 0; index < 24; index += 1) {
    writeProjectFile(root, `src/feature-${index}/file-${index}.js`, `export const value${index} = ${index};\n`);
  }

  const generated = json(run(["--path", root, "generate", "--json"], { env: mockRunnerEnv(binDir) }));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "manifest.json"), "utf8"));
  assert.equal(manifest.runner, "codex");
  assert.equal(manifest.generationMode, "react");
  assert.equal(manifest.generationReason, "module_first_pipeline");
  assert.ok(manifest.artifacts.modules.length > 0);
});

test("show displays fake direct generation metadata", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  json(run(["--path", root, "generate", "--mode", "direct", "--json"], { env: { MATSPEC_LLM_PROVIDER: "fake" } }));

  const shown = run(["--path", root, "show"]);
  assert.equal(shown.status, 0, shown.stderr);
  assert.match(shown.stdout, /generation mode: whole-project-direct/);
  assert.match(shown.stdout, /runner: auto/);
  assert.match(shown.stdout, /provider: fake/);
  assert.match(shown.stdout, /model: fake-matspec-model/);
});

test("explicit real provider without API key fails before creating a run", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));

  const result = run(["--path", root, "generate", "--json"], { env: { MATSPEC_LLM_PROVIDER: "openai" } });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "LLM_NOT_CONFIGURED");
  assert.equal(payload.provider, "openai");
  assert.equal(fs.readdirSync(path.join(root, ".matspec-cli/runs")).filter((entry) => entry !== "latest.json").length, 0);
});

test("external codex runner writes staged design and spec artifacts", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  const callsFile = path.join(binDir, "calls.txt");
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const generated = json(
    run(["--path", root, "generate", "--runner", "codex", "--mode", "direct", "--model", "custom-model", "--json"], {
      env: mockRunnerEnv(binDir, { MOCK_CALLS_FILE: callsFile })
    })
  );
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.generationMode, "direct");
  assert.equal(manifest.runner, "codex");
  assert.equal(manifest.provider, "codex");
  assert.equal(manifest.model, "custom-model");
  assert.equal(manifest.logs.external, "logs/external.json");
  assert.match(fs.readFileSync(path.join(runDir, "design.md"), "utf8"), /Mock Codex Design/);
  assert.match(fs.readFileSync(path.join(runDir, "spec.md"), "utf8"), /Derived from design by mock codex/);
  const calls = fs.readFileSync(callsFile, "utf8");
  assert.match(calls, /custom-model/);
  assert.match(calls, /--sandbox/);
  assert.ok(fs.existsSync(path.join(runDir, "logs/prompts/design.md")));
  assert.ok(fs.existsSync(path.join(runDir, "logs/prompts/spec.md")));
});

test("codex runner retries fallback model when default model fails", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  const callsFile = path.join(binDir, "calls.txt");
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const generated = json(
    run(["--path", root, "generate", "--runner", "codex", "--mode", "direct", "--json"], {
      env: mockRunnerEnv(binDir, { MOCK_CALLS_FILE: callsFile, MOCK_FAIL_SPARK: "1" })
    })
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "manifest.json"), "utf8"));
  assert.equal(manifest.model, "gpt-5.5");
  const calls = fs.readFileSync(callsFile, "utf8");
  assert.match(calls, /gpt-5\.3-codex-spark/);
  assert.match(calls, /gpt-5\.5/);
});

test("external claude runner parses JSON result output", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  const callsFile = path.join(binDir, "calls.txt");
  makeMockRunner(binDir, "claude", claudeMockScript());
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const generated = json(
    run(["--path", root, "generate", "--runner", "claude", "--mode", "direct", "--json"], {
      env: mockRunnerEnv(binDir, { MOCK_CALLS_FILE: callsFile })
    })
  );
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.generationMode, "direct");
  assert.equal(manifest.runner, "claude");
  assert.equal(manifest.model, "claude-sonnet-4-6");
  assert.match(fs.readFileSync(path.join(runDir, "design.md"), "utf8"), /Mock Claude Design/);
  assert.match(fs.readFileSync(path.join(runDir, "spec.md"), "utf8"), /Derived from design by mock claude/);
  assert.match(fs.readFileSync(callsFile, "utf8"), /claude-sonnet-4-6/);
});

test("external runner failures are structured and do not update latest", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const result = run(["--path", root, "generate", "--runner", "codex", "--json"], {
    env: mockRunnerEnv(binDir, { MOCK_FAIL: "1" })
  });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "EXTERNAL_RUNNER_FAILED");
  assert.ok(payload.next.some((item) => item.includes("logs/*stdout.log")));
  assert.equal(fs.existsSync(path.join(root, ".matspec-cli/runs/latest.json")), false);
});

test("external runner empty output fails", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const result = run(["--path", root, "generate", "--runner", "codex", "--json"], {
    env: mockRunnerEnv(binDir, { MOCK_EMPTY: "1" })
  });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "EXTERNAL_RUNNER_EMPTY_OUTPUT");
});

test("external runner non-markdown output fails", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const result = run(["--path", root, "generate", "--runner", "codex", "--json"], {
    env: mockRunnerEnv(binDir, { MOCK_LOG_ONLY: "1" })
  });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "EXTERNAL_RUNNER_UNPARSEABLE_OUTPUT");
  assert.ok(payload.next.some((item) => item.includes("Markdown")));
});

test("external runner fails if it modifies authoritative specs", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  writeProjectFile(root, "matspec/specs/spec.md", "# Existing SPEC\n");

  const result = run(["--path", root, "generate", "--runner", "codex", "--json"], {
    env: mockRunnerEnv(binDir, { MOCK_MODIFY_SPECS: "1" })
  });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "EXTERNAL_RUNNER_MODIFIED_SPECS");
  assert.deepEqual(payload.modifiedSpecs, ["matspec/specs/spec.md"]);
});

test("external runner fails if it modifies source files", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const result = run(["--path", root, "generate", "--runner", "codex", "--json"], {
    env: mockRunnerEnv(binDir, { MOCK_MODIFY_SOURCE: "1" })
  });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "EXTERNAL_RUNNER_MODIFIED_WORKTREE");
  assert.ok(payload.modifiedFiles.includes("src/auth/login.js"));
  assert.ok(payload.next.includes("git diff"));
});

test("external runner detects changes to a path that was dirty before invocation", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "dirty before runner\n");

  const result = run(["--path", root, "generate", "--runner", "codex", "--json"], {
    env: mockRunnerEnv(binDir, { MOCK_MODIFY_SOURCE: "1" })
  });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "EXTERNAL_RUNNER_MODIFIED_WORKTREE");
  assert.ok(payload.modifiedFiles.includes("src/auth/login.js"));
});

test("external runner fails if it modifies matspec runtime config outside current run", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const result = run(["--path", root, "generate", "--runner", "codex", "--json"], {
    env: mockRunnerEnv(binDir, { MOCK_MODIFY_MATSPEC_CONFIG: "1" })
  });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "EXTERNAL_RUNNER_MODIFIED_WORKTREE");
  assert.ok(payload.modifiedFiles.includes(".matspec-cli/config.yaml"));
});

test("apply writes latest spec and design, protects existing files, and supports force", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  const generated = json(run(["--path", root, "generate", "--json"]));

  const applied = json(run(["--path", root, "apply", "--json"]));
  assert.equal(applied.ok, true);
  assert.ok(fs.existsSync(path.join(root, "matspec/specs/spec.md")));
  assert.ok(fs.existsSync(path.join(root, "matspec/specs/design.md")));

  const blocked = run(["--path", root, "apply", "--json"]);
  assert.equal(blocked.status, 1);
  const blockedPayload = JSON.parse(blocked.stdout);
  assert.equal(blockedPayload.code, "APPLY_OVERWRITE_REQUIRED");
  assert.match(blockedPayload.message, /--force/);

  const runSpec = path.join(root, ".matspec-cli/runs", generated.runId, "spec.md");
  fs.writeFileSync(
    runSpec,
    "<!-- generated by matspec stub -->\n# Forced SPEC\n\n## 1. Component Purpose\nForced.\n\n## 2. Domain Terminology\nForced.\n\n## 3. Actors and Boundaries\nForced.\n\n## 4. DFX Constraints\nForced.\n\n## 5. Core Capabilities\nForced.\n\n## 6. Data Constraints\nForced.\n",
    "utf8"
  );
  const forced = json(run(["--path", root, "apply", "--force", "--json"]));
  assert.equal(forced.ok, true);
  assert.match(fs.readFileSync(path.join(root, "matspec/specs/spec.md"), "utf8"), /Forced SPEC/);
});

test("apply rejects generated artifacts that fail required section checks", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  const generated = json(run(["--path", root, "generate", "--json"]));
  fs.writeFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "spec.md"), "# Bad SPEC\n\nMissing required sections.\n", "utf8");

  const result = run(["--path", root, "apply", "--json"]);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.code, "APPLY_QUALITY_FAILED");
  assert.ok(payload.findings.some((finding) => finding.code === "SPEC_SECTION_MISSING"));
  assert.ok(payload.next.includes("matspec show"));
  assert.equal(fs.existsSync(path.join(root, "matspec/specs/spec.md")), false);
});

test("apply rejects runner environment chatter in generated artifacts", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  const generated = json(run(["--path", root, "generate", "--json"]));
  fs.appendFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "spec.md"), "\nI could not write files in this sandbox.\n", "utf8");

  const result = run(["--path", root, "apply", "--json"]);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.code, "APPLY_QUALITY_FAILED");
  assert.ok(payload.findings.some((finding) => finding.code === "RUNNER_ENVIRONMENT_TEXT"));
});

test("generate module writes a module stub into the current run", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  const generated = json(run(["--path", root, "generate", "--json"]));

  const module = json(run(["--path", root, "generate", "module", "src/auth", "--json"]));
  assert.equal(module.ok, true);
  assert.equal(module.runId, generated.runId);
  assert.equal(module.module, "src/auth");

  const moduleFile = path.join(root, ".matspec-cli/runs", generated.runId, "modules/src-auth.md");
  assert.match(fs.readFileSync(moduleFile, "utf8"), /generated by matspec stub/);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.artifacts.modules, ["modules/src-auth.md"]);
});

test("generate module creates a run when no current run exists", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));

  const module = json(run(["--path", root, "generate", "module", "lib/core", "--json"]));
  assert.equal(module.ok, true);
  assert.equal(module.module, "lib/core");
  assert.ok(fs.existsSync(path.join(root, ".matspec-cli/runs", module.runId, "manifest.json")));
  assert.ok(fs.existsSync(path.join(root, ".matspec-cli/runs", module.runId, "modules/lib-core.md")));
});

test("generate module records warning when module path is missing", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));

  const module = json(run(["--path", root, "generate", "module", "missing/module", "--json"]));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", module.runId, "manifest.json"), "utf8"));
  assert.ok(manifest.warnings.includes("module path not found: missing/module"));
});

test("show guides module-only runs back to generate instead of apply", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  json(run(["--path", root, "generate", "module", "src/auth", "--json"]));

  const shown = run(["--path", root, "show"]);
  assert.equal(shown.status, 0, shown.stderr);
  assert.match(shown.stdout, /module-only run/);
  assert.match(shown.stdout, /matspec generate/);
  assert.doesNotMatch(shown.stdout, /\n  matspec apply\n/);
});
