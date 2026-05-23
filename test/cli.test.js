import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { scanRepository } from "../src/scanner.js";
import { planModules } from "../src/planner.js";

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
if (process.env.MOCK_FAIL_GPT55 === "1" && args.includes("gpt-5.5")) process.exit(9);
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
if (process.env.MOCK_FAIL_FIRST_MODULE_ATTEMPT === "1" && isModule && previousCalls === 0) process.exit(7);
if (process.env.MOCK_FAIL_SRC_AUTH_MODULE === "1" && outputPath.includes("module-src-auth")) process.exit(7);
const content = isSpec
  ? "# Mock Codex SPEC\\n\\nDerived from design by mock codex.\\n\\n## 1. Component Purpose\\nMock spec.\\n\\n## 2. Domain Terminology\\nMock terms.\\n\\n## 3. Actors and Boundaries\\nMock boundaries.\\n\\n## 4. DFX Constraints\\nMock DFX.\\n\\n## 5. Core Capabilities\\nMock capabilities.\\n\\n## 6. Data Constraints\\nMock data constraints.\\n"
  : isModule
    ? "# Mock Codex Module\\n\\n## 1. Module Purpose\\nModule path: src/auth\\n\\n## 2. Core Flow\\nMock module flow.\\n"
    : "# Mock Codex Design\\n\\nModule path: src/auth\\n\\n## 1. Design Overview\\nMock design.\\n\\n## 2. System Architecture\\nMock architecture.\\n\\n## 3. Data Model\\nMock data.\\n\\n## 4. Interface Design\\nMock interfaces.\\n\\n## 5. Core Flow Design\\nMock flow.\\n\\n## 6. Algorithm Design\\nMock algorithms.\\n\\n## 7. Caching Design\\nMock cache.\\n\\n## 8. Error Handling Design\\nMock errors.\\n\\n## 9. Observability\\nMock observability.\\n\\n## 10. Security Design\\nMock security.\\n";
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
  ? "# Mock Claude SPEC\\n\\nDerived from design by mock claude.\\n\\n## 1. Component Purpose\\nMock spec.\\n\\n## 2. Domain Terminology\\nMock terms.\\n\\n## 3. Actors and Boundaries\\nMock boundaries.\\n\\n## 4. DFX Constraints\\nMock DFX.\\n\\n## 5. Core Capabilities\\nMock capabilities.\\n\\n## 6. Data Constraints\\nMock data constraints.\\n"
  : "# Mock Claude Design\\n\\nModule path: src/auth\\n\\n## 1. Design Overview\\nMock design.\\n\\n## 2. System Architecture\\nMock architecture.\\n\\n## 3. Data Model\\nMock data.\\n\\n## 4. Interface Design\\nMock interfaces.\\n\\n## 5. Core Flow Design\\nMock flow.\\n\\n## 6. Algorithm Design\\nMock algorithms.\\n\\n## 7. Caching Design\\nMock cache.\\n\\n## 8. Error Handling Design\\nMock errors.\\n\\n## 9. Observability\\nMock observability.\\n\\n## 10. Security Design\\nMock security.\\n";
process.stdout.write(JSON.stringify({ result }));
`;
}

function opencodeMockScript() {
  return `
const fs = require("node:fs");
const args = process.argv.slice(2);
if (process.env.MOCK_CALLS_FILE) fs.appendFileSync(process.env.MOCK_CALLS_FILE, args.join("\\u0000") + "\\n", "utf8");
if (process.env.MOCK_FAIL === "1") process.exit(7);
if (process.env.MOCK_EMPTY === "1") process.exit(0);
const previousCalls = process.env.MOCK_CALLS_FILE && fs.existsSync(process.env.MOCK_CALLS_FILE)
  ? fs.readFileSync(process.env.MOCK_CALLS_FILE, "utf8").split("\\n").filter(Boolean).length
  : 0;
const prompt = fs.readFileSync(0, "utf8");
const isSpec = previousCalls > 1 || prompt.includes("Generated design.md") || prompt.includes("spec.md");
const text = isSpec
  ? "# Mock opencode SPEC\\n\\nDerived from design by mock opencode.\\n\\n## 1. Component Purpose\\nMock spec.\\n\\n## 2. Domain Terminology\\nMock terms.\\n\\n## 3. Actors and Boundaries\\nMock boundaries.\\n\\n## 4. DFX Constraints\\nMock DFX.\\n\\n## 5. Core Capabilities\\nMock capabilities.\\n\\n## 6. Data Constraints\\nMock data constraints.\\n"
  : "# Mock opencode Design\\n\\nModule path: src/auth\\n\\n## 1. Design Overview\\nMock design.\\n\\n## 2. System Architecture\\nMock architecture.\\n\\n## 3. Data Model\\nMock data.\\n\\n## 4. Interface Design\\nMock interfaces.\\n\\n## 5. Core Flow Design\\nMock flow.\\n\\n## 6. Algorithm Design\\nMock algorithms.\\n\\n## 7. Caching Design\\nMock cache.\\n\\n## 8. Error Handling Design\\nMock errors.\\n\\n## 9. Observability\\nMock observability.\\n\\n## 10. Security Design\\nMock security.\\n";
process.stdout.write(JSON.stringify({ type: "step_start", part: { type: "step-start" } }) + "\\n");
process.stdout.write(JSON.stringify({ type: "text", part: { type: "text", text, metadata: { openai: { phase: "final_answer" } } } }) + "\\n");
process.stdout.write(JSON.stringify({ type: "step_finish", part: { type: "step-finish" } }) + "\\n");
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
  assert.equal(result.generation.externalAgents.codex.recommendedModel, "gpt-5.5");
  assert.equal(result.generation.externalAgents.codex.fallbackModel, undefined);
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
      assert.match(acceptedStage.message, /可进入实现/);
      assert.ok(acceptedStage.next.some((item) => item.includes("执行实现")));
    }
  }

  go = json(run(["--path", root, "go", "--json"]));
  assert.equal(go.nextAction, "implementation");
  assert.match(go.message, /可进入实现/);
  assert.ok(go.next.some((item) => item.includes("tasks.md")));

  const blockedArchive = run(["--path", root, "archive", "--json"]);
  assert.equal(blockedArchive.status, 1);
  assert.equal(JSON.parse(blockedArchive.stdout).code, "FULL_DOCS_NOT_UPDATED");

  const archived = json(run(["--path", root, "archive", "--force", "--json"]));
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
  assert.match(mainCommand, /done finalization/);
  const proposalCommand = fs.readFileSync(path.join(root, ".claude/commands/matspec-proposal.md"), "utf8");
  assert.match(proposalCommand, /generate/);
  assert.match(proposalCommand, /stage.allowedWritePath/);
  assert.match(proposalCommand, /Clarification question card/);
  assert.match(proposalCommand, /decision ledger/);
  assert.match(proposalCommand, /agent inference|agent-inferred/);
  assert.match(proposalCommand, /Requested Change vs Real Need/);
  assert.match(proposalCommand, /search, filter, sort, form input/);
  assert.ok(fs.existsSync(path.join(root, ".claude/skills/matspec/SKILL.md")));

  const codex = json(run(["--path", root, "integration", "install", "codex", "--json"]));
  assert.equal(codex.integration, "codex");
  assert.ok(fs.existsSync(path.join(root, ".agents/skills/matspec/SKILL.md")));
  const proposalSkill = fs.readFileSync(path.join(root, ".agents/skills/matspec-proposal/SKILL.md"), "utf8");
  assert.match(proposalSkill, /real-need discovery/);
  assert.match(proposalSkill, /exact vs partial matching/);
  const designSkill = fs.readFileSync(path.join(root, ".agents/skills/matspec-delta-design/SKILL.md"), "utf8");
  assert.match(designSkill, /generate/);
  assert.match(designSkill, /full design\.md is missing/);
  assert.match(designSkill, /Do not invent|do not invent/);
  assert.match(designSkill, /data model\/schema, migration/);
  const tasksSkill = fs.readFileSync(path.join(root, ".agents/skills/matspec-tasks/SKILL.md"), "utf8");
  assert.match(tasksSkill, /Ask at most 3 clarification questions per turn/);
  assert.match(tasksSkill, /task boundaries, file scope/);
  assert.match(tasksSkill, /Do not use matspec generate\/apply for accepted-change evolution/);
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

test("validate reports lightweight proposal quality warnings", () => {
  const root = tempProject();
  const change = "REQ20260428-owner-phone-search";
  json(run(["init", root, "--integration", "none", "--json"]));
  json(run(["--path", root, "start", change, "--json"]));

  const proposalFile = path.join(root, "matspec/changes", change, "proposal.md");
  fs.writeFileSync(proposalFile, "# Proposal\n\nAdd phone search.\n", "utf8");

  let payload = json(run(["--path", root, "validate", change, "--json"]));
  const warningCodes = payload.findings.map((finding) => finding.code);
  for (const code of ["CS111", "CS112", "CS113", "CS114", "CS115", "CS116"]) {
    assert.ok(warningCodes.includes(code), `${code} should be reported`);
  }

  fs.writeFileSync(
    proposalFile,
    [
      "# Proposal",
      "",
      "## 0. User Clarification Log",
      "### 0.1 Confirmed Decisions",
      "- Exact telephone matching is confirmed.",
      "### 0.2 Open Questions",
      "- None",
      "### 0.3 Decision Ledger",
      "| Decision | Source | Status | Impact |",
      "|----------|--------|--------|--------|",
      "| Exact telephone matching | user | confirmed | acceptance |",
      "",
      "## 1. Requested Change vs Real Need",
      "The requested change is phone search. The real need is faster owner lookup when last names are uncertain.",
      "",
      "## 5. Scope Boundary",
      "- In scope: Find Owners phone lookup.",
      "",
      "## 6. Non-Goals",
      "- No fuzzy search.",
      "",
      "## 8. Assumptions and Open Questions",
      "- None"
    ].join("\n"),
    "utf8"
  );

  payload = json(run(["--path", root, "validate", change, "--json"]));
  const proposalCodes = payload.findings.map((finding) => finding.code).filter((code) => /^CS11/.test(code));
  assert.deepEqual(proposalCodes, []);
});

test("done requires full spec and design to be refreshed after validation", () => {
  const root = tempProject();
  const change = "REQ20260428-owner-phone-search";
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "matspec/specs/spec.md", "# Existing SPEC\n\n## 1. Component Purpose\nExisting.\n");
  writeProjectFile(root, "matspec/specs/design.md", "# Existing DESIGN\n\n## 1. Design Overview\nExisting.\n");
  json(run(["--path", root, "start", change, "--json"]));

  const changeDir = path.join(root, "matspec/changes", change);
  const files = [
    [
      "proposal.md",
      [
        "# Proposal",
        "## 0. User Clarification Log",
        "### 0.1 Confirmed Decisions",
        "- Exact phone lookup.",
        "### 0.2 Open Questions",
        "- None",
        "### 0.3 Decision Ledger",
        "| Decision | Source | Status | Impact |",
        "|---|---|---|---|",
        "| Phone lookup | user | confirmed | scope |",
        "## 1. Requested Change vs Real Need",
        "Real need: find owners when last names are uncertain.",
        "## 5. Scope Boundary",
        "- Find Owners only.",
        "## 6. Non-Goals",
        "- No fuzzy search.",
        "## 8. Assumptions and Open Questions",
        "- None"
      ].join("\n")
    ],
    ["delta-spec.md", "# Delta Spec\n\n## ADDED Requirements\n- Phone lookup.\n## MODIFIED Requirements\nNone\n## REMOVED Requirements\nNone\n"],
    ["delta-design.md", "# Delta Design\n\nUse existing owner repository pattern.\n"],
    [
      "tasks.md",
      [
        "# Tasks",
        "- Implement phone lookup.",
        "- Add tests and validation.",
        "- Done finalization refreshes matspec/specs/spec.md from delta-spec.md.",
        "- Done finalization refreshes matspec/specs/design.md from delta-design.md."
      ].join("\n")
    ],
    ["validation.md", "# Validation\n\nImplementation may start.\n"]
  ];

  for (const [file, body] of files) {
    fs.writeFileSync(path.join(changeDir, file), body, "utf8");
    json(run(["--path", root, "accept", "--json"]));
  }

  let result = run(["--path", root, "done", change, "--json"]);
  assert.equal(result.status, 1);
  let payload = JSON.parse(result.stdout);
  assert.equal(payload.code, "FULL_DOCS_NOT_UPDATED");
  assert.deepEqual(
    payload.notUpdated.map((item) => item.path),
    ["matspec/specs/spec.md", "matspec/specs/design.md"]
  );
  assert.deepEqual(payload.notMerged, payload.notUpdated);

  result = run(["--path", root, "done", change, "--force", "--json"]);
  assert.equal(result.status, 1);
  payload = JSON.parse(result.stdout);
  assert.equal(payload.code, "DONE_FORCE_NOT_SUPPORTED");
  assert.ok(fs.existsSync(changeDir));

  fs.appendFileSync(path.join(root, "matspec/specs/spec.md"), "\n## Phone Lookup\nMerged from delta-spec.\n", "utf8");
  fs.appendFileSync(path.join(root, "matspec/specs/design.md"), "\n## Phone Lookup Design\nMerged from delta-design.\n", "utf8");

  result = run(["--path", root, "done", change, "--json"]);
  assert.equal(result.status, 0, result.stderr);
  payload = JSON.parse(result.stdout);
  assert.ok(payload.ok);
  assert.match(payload.archive, /matspec\/changes\/archives\/\d{4}-\d{2}-\d{2}-REQ20260428-owner-phone-search/);
});

test("archive enforces done finalization unless force is used", () => {
  const root = tempProject();
  const change = "REQ20260428-archive-gate";
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "matspec/specs/spec.md", "# Existing SPEC\n\n## 1. Component Purpose\nExisting.\n");
  writeProjectFile(root, "matspec/specs/design.md", "# Existing DESIGN\n\n## 1. Design Overview\nExisting.\n");
  json(run(["--path", root, "start", change, "--json"]));

  const changeDir = path.join(root, "matspec/changes", change);
  for (const [file, body] of [
    ["proposal.md", "# Proposal\n\n## 1. Requested Change vs Real Need\nReal need.\n## 5. Scope Boundary\nScope.\n## 6. Non-Goals\nNone.\n## 7. Confirmed Decisions\nConfirmed.\n## 8. Assumptions and Open Questions\nNone.\n## 0. User Clarification Log\n### 0.3 Decision Ledger\nLedger.\n"],
    ["delta-spec.md", "# Delta Spec\n\n## ADDED Requirements\n- Rule.\n## MODIFIED Requirements\nNone\n## REMOVED Requirements\nNone\n"],
    ["delta-design.md", "# Delta Design\n\nDesign.\n"],
    ["tasks.md", "# Tasks\n\n- Add validation tests.\n- Done finalization refreshes matspec/specs/spec.md from delta-spec.md.\n- Done finalization refreshes matspec/specs/design.md from delta-design.md.\n"],
    ["validation.md", "# Validation\n\nImplementation may start.\n"]
  ]) {
    fs.writeFileSync(path.join(changeDir, file), body, "utf8");
    json(run(["--path", root, "accept", "--json"]));
  }

  let result = run(["--path", root, "archive", change, "--json"]);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).code, "FULL_DOCS_NOT_UPDATED");

  result = run(["--path", root, "archive", change, "--force", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.ok);
  assert.match(payload.archive, /matspec\/changes\/archives\/\d{4}-\d{2}-\d{2}-REQ20260428-archive-gate/);
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
  const spec = fs.readFileSync(path.join(runDir, "spec.md"), "utf8");
  const design = fs.readFileSync(path.join(runDir, "design.md"), "utf8");
  assert.match(spec, /generated by matspec stub/);
  assert.match(spec, /## 1\. 组件定位/);
  assert.match(design, /generated by matspec stub/);
  assert.match(design, /## 1\. 设计概述/);
});

test("generate supports English output through the language option", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));

  const generated = json(run(["--path", root, "--lang", "en", "generate", "--mode", "direct", "--json"], { env: { MATSPEC_LLM_PROVIDER: "fake" } }));
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const spec = fs.readFileSync(path.join(runDir, "spec.md"), "utf8");
  const design = fs.readFileSync(path.join(runDir, "design.md"), "utf8");
  const designPrompt = fs.readFileSync(path.join(runDir, "logs/prompts/design.md"), "utf8");

  assert.match(spec, /## 1\. Component Purpose/);
  assert.match(design, /## 1\. Design Overview/);
  assert.match(designPrompt, /# \[Component Name\] Implementation Design/);
  assert.doesNotMatch(designPrompt, /# \[组件名称\] 实现设计/);
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

test("scanner returns source directory stats, core coverage, and line-numbered excerpts", () => {
  const root = tempProject();
  writeProjectFile(root, "README.md", "# Demo\n\nRun with npm test.\n");
  writeProjectFile(root, "docs/deploy.md", "# Deploy\n\nUse the release job.\n");
  writeProjectFile(root, "src/auth/login.js", "export function login() {\n  return true;\n}\n");
  writeProjectFile(root, "src/auth/session.js", "export function session() {\n  return null;\n}\n");
  writeProjectFile(root, "tests/auth.test.js", "test('auth', () => {});\n");

  const scan = scanRepository(root);

  assert.match(scan.dirStats, /src\/auth\/\s+\(2 files, 6 lines\)/);
  assert.equal(scan.sourceFileStats.find((file) => file.path === "src/auth/login.js").lines, 3);
  assert.deepEqual(scan.coreDirStats.find((dir) => dir.path === "src").files, 2);
  assert.match(scan.sourceExcerpts.find((item) => item.path === "src/auth/login.js").content, /1: export function login/);
  assert.match(scan.docsFiles.find((file) => file.path === "docs/deploy.md").content, /release job/);
});

test("scanner returns bounded operational evidence", () => {
  const root = tempProject();
  writeProjectFile(root, "README.md", "# Demo\n\n## Build\nRun build/build_all.sh.\n");
  writeProjectFile(root, "build/build_all.sh", "#!/usr/bin/env sh\nset -e\nmake all\n");
  writeProjectFile(root, "build/build_each.sh", "#!/usr/bin/env sh\nset -e\nmake \"$1\"\n");
  writeProjectFile(root, "deploy/app.yaml", "kind: Deployment\nmetadata:\n  name: demo\n");
  writeProjectFile(root, "build/service_config.ini", "[service]\nname=demo\n");
  writeProjectFile(root, "docs/troubleshooting.md", "# Troubleshooting\n\nCheck logs first.\n");
  writeProjectFile(root, "src/index.js", "export const app = true;\n");

  const scan = scanRepository(root);

  assert.ok(scan.operationalEvidence);
  assert.ok(scan.operationalEvidence.build.find((item) => item.path === "build/build_all.sh"));
  assert.ok(scan.operationalEvidence.build.find((item) => item.path === "build/build_each.sh"));
  assert.ok(scan.operationalEvidence.config.find((item) => item.path === "deploy/app.yaml"));
  assert.ok(scan.operationalEvidence.config.find((item) => item.path === "build/service_config.ini"));
  assert.ok(scan.operationalEvidence.troubleshooting.find((item) => item.path === "docs/troubleshooting.md"));
  assert.match(scan.operationalEvidence.build.find((item) => item.path === "build/build_all.sh").content, /1: #!/);
});

test("planner validates modules, avoids test-only coverage, and marks large-file modules", () => {
  const scan = {
    includedFiles: [
      "tests/auth/login.test.js",
      "examples/demo.js",
      "src/auth/login.js",
      "src/auth/session.js",
      "src/large/big.js"
    ],
    primaryExtension: ".js",
    sourceFileStats: [
      { path: "tests/auth/login.test.js", lines: 20, size: 200, extension: ".js" },
      { path: "examples/demo.js", lines: 30, size: 300, extension: ".js" },
      { path: "src/auth/login.js", lines: 10, size: 100, extension: ".js" },
      { path: "src/auth/session.js", lines: 10, size: 100, extension: ".js" },
      { path: "src/large/big.js", lines: 2200, size: 30000, extension: ".js" }
    ]
  };

  const plan = planModules("C:/repo/demo", scan);

  assert.ok(plan.modules.some((module) => module.path === "src/auth"));
  assert.ok(plan.modules.some((module) => module.path === "src/large" && module.largeFile));
  assert.equal(plan.modules.some((module) => module.path.startsWith("tests/")), false);
  assert.equal(plan.modules.some((module) => module.path.startsWith("examples/")), false);
});

test("planner discovers source-heavy component child modules", () => {
  const scan = {
    includedFiles: [
      "component/ascend-common/api/type.go",
      "component/ascend-common/devmanager/dcmi.go",
      "component/ascend-device-plugin/main.go",
      "component/ascend-device-plugin/pkg/server/server.go",
      "component/ascend-for-volcano/plugin/npu.go",
      "component/ascend-for-volcano/plugin/node.go",
      "component/example/demo.go",
      "README.md"
    ],
    primaryExtension: ".go",
    sourceFileStats: [
      { path: "component/ascend-common/api/type.go", lines: 120, size: 1200, extension: ".go" },
      { path: "component/ascend-common/devmanager/dcmi.go", lines: 180, size: 1800, extension: ".go" },
      { path: "component/ascend-device-plugin/main.go", lines: 70, size: 700, extension: ".go" },
      { path: "component/ascend-device-plugin/pkg/server/server.go", lines: 140, size: 1400, extension: ".go" },
      { path: "component/ascend-for-volcano/plugin/npu.go", lines: 160, size: 1600, extension: ".go" },
      { path: "component/ascend-for-volcano/plugin/node.go", lines: 120, size: 1200, extension: ".go" },
      { path: "component/example/demo.go", lines: 30, size: 300, extension: ".go" }
    ]
  };

  const plan = planModules("C:/repo/mind-cluster", scan);

  assert.deepEqual(
    plan.modules.map((module) => module.path),
    ["component/ascend-common", "component/ascend-for-volcano", "component/ascend-device-plugin"]
  );
  assert.equal(plan.modules[0].sourceFiles, 2);
  assert.equal(plan.modules[0].sourceLines, 300);
  assert.doesNotMatch(plan.modules[0].description, /Fallback/);
});

test("planner bounds component child modules by source size", () => {
  const sourceFileStats = Array.from({ length: 12 }, (_, index) => ({
    path: `component/service-${index}/main.go`,
    lines: 10 + index,
    size: 100 + index,
    extension: ".go"
  }));
  const scan = {
    includedFiles: sourceFileStats.map((file) => file.path),
    primaryExtension: ".go",
    sourceFileStats
  };

  const plan = planModules("C:/repo/services", scan);

  assert.equal(plan.modules.length, 8);
  assert.equal(plan.modules[0].path, "component/service-11");
  assert.equal(plan.modules.at(-1).path, "component/service-4");
});

test("planner discovers OpenHarmony components_v2 modules", () => {
  const scan = {
    primaryExtension: ".cpp",
    includedFiles: [
      "frameworks/core/components_v2/water_flow/water_flow_component.cpp",
      "frameworks/core/components_v2/water_flow/render_water_flow.cpp",
      "frameworks/core/components_v2/water_flow/water_flow_element.cpp",
      "frameworks/core/components_v2/list/list_component.cpp",
      "frameworks/core/components_v2/list/render_list.cpp"
    ],
    sourceFileStats: [
      { path: "frameworks/core/components_v2/water_flow/water_flow_component.cpp", lines: 120 },
      { path: "frameworks/core/components_v2/water_flow/render_water_flow.cpp", lines: 300 },
      { path: "frameworks/core/components_v2/water_flow/water_flow_element.cpp", lines: 150 },
      { path: "frameworks/core/components_v2/list/list_component.cpp", lines: 80 },
      { path: "frameworks/core/components_v2/list/render_list.cpp", lines: 90 }
    ]
  };

  const plan = planModules("C:/repo/arkui_ace_engine", scan);

  assert.ok(plan.modules.some((module) => module.path === "frameworks/core/components_v2/water_flow"));
  assert.ok(plan.modules.some((module) => module.path === "frameworks/core/components_v2/list"));
  assert.doesNotMatch(plan.modules[0].description, /Fallback/);
});

test("planner keeps OpenHarmony components_v2 modules ahead of broad infrastructure modules", () => {
  const includedFiles = [
    ...Array.from({ length: 120 }, (_, index) => `frameworks/bridge/declarative_frontend/file_${index}.cpp`),
    ...Array.from({ length: 110 }, (_, index) => `frameworks/core/interfaces/native/implementation/file_${index}.cpp`),
    ...Array.from({ length: 30 }, (_, index) => `frameworks/core/components_v2/inspector/file_${index}.cpp`),
    ...Array.from({ length: 20 }, (_, index) => `frameworks/core/components_v2/water_flow/file_${index}.cpp`),
    ...Array.from({ length: 12 }, (_, index) => `frameworks/core/components_v2/grid/file_${index}.cpp`)
  ];
  const scan = {
    primaryExtension: ".cpp",
    includedFiles,
    sourceFileStats: includedFiles.map((file) => ({ path: file, lines: 10 }))
  };

  const plan = planModules("C:/repo/arkui_ace_engine", scan);
  const paths = plan.modules.map((module) => module.path);

  assert.ok(paths.includes("frameworks/core/components_v2/water_flow"));
  assert.ok(paths.every((modulePath) => modulePath.startsWith("frameworks/core/components_v2/")));
});

test("planner discovers OpenHarmony components_ng pattern modules", () => {
  const scan = {
    primaryExtension: ".cpp",
    includedFiles: [
      "frameworks/core/components_ng/pattern/list/list_pattern.cpp",
      "frameworks/core/components_ng/pattern/list/list_layout_algorithm.cpp",
      "frameworks/core/components_ng/pattern/waterflow/water_flow_pattern.cpp",
      "frameworks/core/components_ng/pattern/waterflow/water_flow_layout_algorithm.cpp"
    ],
    sourceFileStats: [
      { path: "frameworks/core/components_ng/pattern/list/list_pattern.cpp", lines: 250 },
      { path: "frameworks/core/components_ng/pattern/list/list_layout_algorithm.cpp", lines: 220 },
      { path: "frameworks/core/components_ng/pattern/waterflow/water_flow_pattern.cpp", lines: 300 },
      { path: "frameworks/core/components_ng/pattern/waterflow/water_flow_layout_algorithm.cpp", lines: 260 }
    ]
  };

  const plan = planModules("C:/repo/arkui_ace_engine", scan);

  assert.ok(plan.modules.some((module) => module.path === "frameworks/core/components_ng/pattern/list"));
  assert.ok(plan.modules.some((module) => module.path === "frameworks/core/components_ng/pattern/waterflow"));
});

test("planner discovers SDK training and custom operator modules", () => {
  const scan = {
    primaryExtension: ".py",
    includedFiles: [
      "training/tf_rec_v1/python/core/emb/emb_factory.py",
      "training/tf_rec_v2/mxrec/core/train.py",
      "training/torch_rec_v1/hybrid_torchrec/pipeline.py",
      "training/torch_rec_v2/dynamic_emb/table.py",
      "cust_op/tf_cpu_op/src/kernel.cc"
    ],
    sourceFileStats: [
      { path: "training/tf_rec_v1/python/core/emb/emb_factory.py", lines: 100 },
      { path: "training/tf_rec_v2/mxrec/core/train.py", lines: 120 },
      { path: "training/torch_rec_v1/hybrid_torchrec/pipeline.py", lines: 140 },
      { path: "training/torch_rec_v2/dynamic_emb/table.py", lines: 160 },
      { path: "cust_op/tf_cpu_op/src/kernel.cc", lines: 180 }
    ]
  };

  const plan = planModules("C:/repo/RecSDK", scan);
  const paths = plan.modules.map((module) => module.path);

  assert.ok(paths.includes("training/tf_rec_v1"));
  assert.ok(paths.includes("training/tf_rec_v2"));
  assert.ok(paths.includes("training/torch_rec_v1"));
  assert.ok(paths.includes("training/torch_rec_v2"));
  assert.ok(paths.includes("cust_op/tf_cpu_op"));
});

test("planner does not label large fallback repositories as small projects", () => {
  const includedFiles = Array.from({ length: 1001 }, (_, index) => `flat/file-${index}.cpp`);
  const scan = {
    primaryExtension: ".cpp",
    includedFiles,
    sourceFileStats: includedFiles.map((file) => ({ path: file, lines: 1 }))
  };

  const plan = planModules("C:/repo/large-flat", scan);

  assert.equal(plan.modules.length, 1);
  assert.equal(plan.modules[0].path, ".");
  assert.doesNotMatch(plan.modules[0].description, /small project/i);
  assert.match(plan.modules[0].description, /no safe module boundaries/i);
});

test("planner keeps small project root fallback wording for tiny repositories", () => {
  const scan = {
    primaryExtension: ".cpp",
    includedFiles: ["main.cpp"],
    sourceFileStats: [{ path: "main.cpp", lines: 20 }]
  };

  const plan = planModules("C:/repo/tiny", scan);

  assert.deepEqual(plan.modules, [
    {
      name: "Project Root",
      path: ".",
      description: "Fallback module for a small project without obvious source module directories."
    }
  ]);
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

test("external opencode runner writes staged design and spec artifacts", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  const callsFile = path.join(binDir, "calls.txt");
  makeMockRunner(binDir, "opencode", opencodeMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const generated = json(
    run(["--path", root, "generate", "--runner", "opencode", "--mode", "direct", "--json"], {
      env: mockRunnerEnv(binDir, { MOCK_CALLS_FILE: callsFile })
    })
  );
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  assert.equal(manifest.generationMode, "direct");
  assert.equal(manifest.runner, "opencode");
  assert.equal(manifest.provider, "opencode");
  assert.equal(manifest.model, null);
  assert.equal(manifest.logs.external, "logs/external.json");
  assert.match(fs.readFileSync(path.join(runDir, "design.md"), "utf8"), /Mock opencode Design/);
  assert.match(fs.readFileSync(path.join(runDir, "spec.md"), "utf8"), /Derived from design by mock opencode/);
  const calls = fs.readFileSync(callsFile, "utf8");
  assert.match(calls, /run/);
  assert.match(calls, /--format/);
  assert.match(calls, /json/);
  assert.match(calls, /--dir/);
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

test("help defaults to Chinese and advertises the minimal generate runner options", () => {
  const result = run(["help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /matspec generate \[--runner auto\|codex\|claude\|opencode\]/);
  assert.match(result.stdout, /常用流程/);
  assert.match(result.stdout, /输出语言，默认 zh-CN/);
  assert.doesNotMatch(result.stdout, /Common workflow/);
});

test("help supports English output through the language option", () => {
  const result = run(["--lang", "en", "help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Common workflow/);
  assert.match(result.stdout, /output language, default zh-CN/);
  assert.doesNotMatch(result.stdout, /常用流程/);
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

test("runner auto selects mock opencode when codex and claude are unavailable", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "opencode", opencodeMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const generated = json(run(["--path", root, "generate", "--json"], { env: mockRunnerEnv(binDir) }));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "manifest.json"), "utf8"));
  assert.equal(manifest.runner, "opencode");
  assert.equal(manifest.provider, "opencode");
  assert.equal(manifest.generationMode, "react");
  assert.equal(manifest.generationReason, "module_first_pipeline");
  assert.ok(manifest.artifacts.modules.length > 0);
});

test("fake direct generate writes prompts, llm log, and design-derived spec", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  writeProjectFile(root, "src/payment/pay.js", "export function pay() {}\n");
  writeProjectFile(root, "README.md", "# Demo App\n\n## Quick Start\nRun npm test.\n");
  writeProjectFile(root, "docs/security.md", "# Security\n\nUse least privilege.\n");

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
  assert.match(designPrompt, /# \[组件名称\] 实现设计/);
  assert.match(designPrompt, /Directory Source File Stats/);
  assert.match(designPrompt, /src\/auth\/\s+\(1 files, 1 lines\)/);
  assert.match(designPrompt, /Source excerpts with line numbers/);
  assert.match(designPrompt, /Operational evidence/);
  assert.match(designPrompt, /source anchors/);
  assert.match(designPrompt, /runbook/);
  assert.match(designPrompt, /debugging guidance/);
  assert.match(designPrompt, /certainty boundaries/);
  assert.match(designPrompt, /1: export function login/);
  assert.match(designPrompt, /Quick Start/);
  assert.match(designPrompt, /least privilege/);
  const specPrompt = fs.readFileSync(path.join(runDir, "logs/prompts/spec.md"), "utf8");
  assert.match(specPrompt, /Generated design\.md:/);
  assert.match(specPrompt, /src\/auth/);
  assert.match(specPrompt, /SPEC template/);
  assert.match(specPrompt, /# \[组件名称\] 规格说明/);
  assert.match(specPrompt, /SPEC 写作参考/);
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
  assert.ok(fs.existsSync(path.join(runDir, "logs/prompts/modules/src-auth.standard.md")));
  const modulePrompt = fs.readFileSync(path.join(runDir, "logs/prompts/modules/src-auth.standard.md"), "utf8");
  assert.match(modulePrompt, /Directory Source File Stats/);
  assert.match(modulePrompt, /Source excerpts with line numbers/);
  assert.match(modulePrompt, /Operational evidence/);
  assert.match(modulePrompt, /source anchors/);
  assert.match(modulePrompt, /runbook/);
  assert.match(modulePrompt, /debugging guidance/);
  assert.match(modulePrompt, /certainty boundaries/);
  assert.match(modulePrompt, /1: export function login/);
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

test("react generation retries module generation with compressed fallback", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  const callsFile = path.join(binDir, "calls.txt");
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const generated = json(
    run(["--path", root, "generate", "--runner", "codex", "--mode", "react", "--json"], {
      env: mockRunnerEnv(binDir, { MOCK_FAIL_FIRST_MODULE_ATTEMPT: "1", MOCK_CALLS_FILE: callsFile })
    })
  );
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const reactLog = JSON.parse(fs.readFileSync(path.join(runDir, "logs/react.json"), "utf8"));

  assert.equal(reactLog.modules[0].attempts.length, 2);
  assert.equal(reactLog.modules[0].attempts[0].name, "standard");
  assert.equal(reactLog.modules[0].attempts[1].name, "compressed");
  assert.ok(fs.existsSync(path.join(runDir, "logs/prompts/modules/src-auth.standard.md")));
  assert.ok(fs.existsSync(path.join(runDir, "logs/prompts/modules/src-auth.compressed.md")));
  assert.ok(fs.existsSync(path.join(runDir, "modules/src-auth.md")));
});

test("react generation continues after a module fails all fallback attempts", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");
  writeProjectFile(root, "src/payment/pay.js", "export function pay() {}\n");

  const generated = json(
    run(["--path", root, "generate", "--runner", "codex", "--mode", "react", "--json"], {
      env: mockRunnerEnv(binDir, { MOCK_FAIL_SRC_AUTH_MODULE: "1" })
    })
  );
  const runDir = path.join(root, ".matspec-cli/runs", generated.runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  const reactLog = JSON.parse(fs.readFileSync(path.join(runDir, "logs/react.json"), "utf8"));

  assert.equal(manifest.status, "partial_success");
  assert.equal(manifest.moduleFailures.length, 1);
  assert.equal(manifest.moduleFailures[0].path, "src/auth");
  assert.equal(manifest.artifacts.modules.length, 1);
  assert.ok(manifest.artifacts.modules.includes("modules/src-payment.md"));
  assert.equal(reactLog.moduleFailures[0].attempts.length, 3);
  assert.ok(fs.existsSync(path.join(runDir, "design.md")));
  assert.ok(fs.existsSync(path.join(runDir, "spec.md")));
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
  assert.match(result.stdout, /完成 已生成候选文档/);
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

test("explicit LLM API provider is not supported", () => {
  const root = tempProject();
  json(run(["init", root, "--integration", "none", "--json"]));

  const result = run(["--path", root, "generate", "--json"], { env: { MATSPEC_LLM_PROVIDER: "openai" } });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "LLM_PROVIDER_NOT_IMPLEMENTED");
  assert.equal(payload.provider, "openai");
  assert.match(payload.message, /local Codex, Claude Code, or opencode CLI runners/);
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

test("codex runner uses gpt-5.5 by default without implicit fallback retry", () => {
  const root = tempProject();
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-runner-"));
  const callsFile = path.join(binDir, "calls.txt");
  makeMockRunner(binDir, "codex", codexMockScript());
  json(run(["init", root, "--integration", "none", "--json"], { env: mockRunnerEnv(binDir) }));
  writeProjectFile(root, "src/auth/login.js", "export function login() {}\n");

  const generated = json(
    run(["--path", root, "generate", "--runner", "codex", "--mode", "direct", "--json"], {
      env: mockRunnerEnv(binDir, { MOCK_CALLS_FILE: callsFile })
    })
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", generated.runId, "manifest.json"), "utf8"));
  assert.equal(manifest.model, "gpt-5.5");
  const calls = fs.readFileSync(callsFile, "utf8");
  assert.match(calls, /gpt-5\.5/);
  assert.doesNotMatch(calls, /gpt-5\.3-codex-spark/);
  assert.equal(calls.split("\n").filter(Boolean).length, 2);
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

  const result = run(["--path", root, "generate", "--runner", "codex", "--mode", "direct", "--json"], {
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

  const result = run(["--path", root, "generate", "--runner", "codex", "--mode", "direct", "--json"], {
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

  const result = run(["--path", root, "generate", "--runner", "codex", "--mode", "direct", "--json"], {
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
