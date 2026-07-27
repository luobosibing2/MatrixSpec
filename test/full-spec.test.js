import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { builtinWorkflow, validateWorkflow } from "../src/workflow.js";
import { validateFullDocumentUpdatesForDone } from "../src/state.js";
import { parseArgs } from "../src/args.js";
import { parseTasks } from "../src/implement.js";
import { redact } from "../src/reporter.js";

const CLI = path.resolve("bin/matspec.js");

function project() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "matspec-full-spec-"));
}

function run(root, args, env = {}) {
  return spawnSync(process.execPath, [CLI, "--path", root, ...args, "--json", "--no-update-check"], {
    encoding: "utf8",
    env: { ...process.env, MATSPEC_NO_REPORT: "1", ...env }
  });
}

function json(result, expectedStatus = 0) {
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return JSON.parse(result.stdout || result.stderr);
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

test("built-in MatSpec pack defaults to light and exposes explicit standard and full resources", () => {
  const light = builtinWorkflow();
  assert.equal(light.profile, "light");
  assert.deepEqual(light.stages.map((stage) => stage.key), [
    "proposal", "delta-spec", "tasks", "implementation", "review"
  ]);
  for (const key of ["delta-spec", "tasks", "review"]) {
    const stage = light.stages.find((item) => item.key === key);
    assert.equal(stage.requiresFullSpec, false);
    assert.equal(stage.requiresFullDesign, false);
  }
  assert.deepEqual(light.stages.find((stage) => stage.key === "implementation").inputs, ["tasks.md"]);
  assert.deepEqual(light.finalization.require_updated, [
    "matspec/specs/spec.md", "matspec/specs/design.md"
  ]);
  const standard = builtinWorkflow("standard");
  assert.equal(standard.profile, "standard");
  assert.deepEqual(standard.stages.map((stage) => stage.key), [
    "proposal", "delta-spec", "tasks", "validation", "implementation", "review"
  ]);
  const workflow = builtinWorkflow("full");
  assert.equal(workflow.profile, "full");
  assert.deepEqual(workflow.stages.map((stage) => stage.key), [
    "proposal", "delta-spec", "delta-design", "tasks", "validation", "implementation", "review"
  ]);
  assert.deepEqual(workflow.stages.map((stage) => stage.command), [
    "matspec.proposal", "matspec.delta-spec", "matspec.delta-design", "matspec.tasks",
    "matspec.validation", "matspec.implement", "matspec.review"
  ]);
  assert.equal(workflow.stages[5].noFile, true);
  assert.equal(workflow.stages[5].delegate, "task-executor");
  for (const stage of workflow.stages) {
    assert.match(stage.commandRef.sha256, /^[a-f0-9]{64}$/);
    if (!stage.noFile) assert.match(stage.templateRef.sha256, /^[a-f0-9]{64}$/);
  }
  assert.throws(() => builtinWorkflow("unknown"), { code: "WORKFLOW_PROFILE_INVALID" });
});

test("workflow validation rejects unsafe finalization paths", () => {
  const workflow = structuredClone(builtinWorkflow());
  workflow.finalization.require_updated = ["../outside.md"];
  assert.throws(() => validateWorkflow(workflow, project()), { code: "INVALID_WORKFLOW" });
});

test("light no-baseline finalization requires both full documents to be created", () => {
  const root = project();
  const change = "REQ20260727-light-no-baseline";
  json(run(root, ["init", "--integration", "none", "--no-template-update"]));
  json(run(root, ["start", change]));
  const changeDir = path.join(root, "matspec/changes", change);
  const stateFile = path.join(changeDir, ".matspec-state.json");
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  state.implementationBaseline = {
    capturedAt: new Date().toISOString(),
    documents: {
      "matspec/specs/spec.md": { exists: false, sha256: null, path: "matspec/specs/spec.md" },
      "matspec/specs/design.md": { exists: false, sha256: null, path: "matspec/specs/design.md" }
    }
  };
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  write(root, `matspec/changes/${change}/delta-spec.md`, "# Delta Spec\n\n## ADDED Requirements\n- REQ-LIGHT-001 Works without a pre-existing baseline.\n\n## MODIFIED Requirements\nNone\n\n## REMOVED Requirements\nNone\n");

  const missing = validateFullDocumentUpdatesForDone({ path: root }, change);
  assert.equal(missing.code, "FULL_DOCS_NOT_UPDATED");
  assert.deepEqual(missing.notUpdated, [
    { path: "matspec/specs/spec.md", reason: "not-created-since-baseline" },
    { path: "matspec/specs/design.md", reason: "not-created-since-baseline" }
  ]);

  write(root, "matspec/specs/spec.md", "# Spec\n\nREQ-LIGHT-001\n");
  write(root, "matspec/specs/design.md", "# Design\n\nImplemented from repository facts and confirmed tasks.\n");
  assert.equal(validateFullDocumentUpdatesForDone({ path: root }, change).ok, true);
});

test("argument parser preserves documented repeatable and strict-unknown behavior", () => {
  const parsed = parseArgs(["generate", "--module-path", "src/a", "--module-path", "src/b", "--task", "1", "--task", "2"]);
  assert.deepEqual(parsed.options.module_path, ["src/a", "src/b"]);
  assert.deepEqual(parsed.options.task, ["1", "2"]);
  assert.equal(parseArgs(["--unknown", "value"]).command, "--unknown");
  assert.throws(() => parseArgs(["generate", "--concurrency", "11"]), { code: "INVALID_CONCURRENCY" });
});

test("CLI exposes offline generation without remote sync or authentication", () => {
  const root = project();
  const initialized = json(run(root, ["init", "--integration", "none", "--no-template-update"]));
  assert.deepEqual(initialized.next, ["matspec start AR-feature-name"]);
  const config = fs.readFileSync(path.join(root, ".matspec-cli/config.yaml"), "utf8");
  assert.doesNotMatch(config, /codewiki|auth:|provider:\s*none/i);

  const help = json(run(root, ["help"])).help;
  assert.doesNotMatch(help, /matspec (?:sync|codewiki|auth)\b/i);
  for (const command of ["sync", "codewiki", "auth"]) {
    const result = json(run(root, [command]), 1);
    assert.equal(result.code, "CLI_ERROR");
    assert.match(result.message, new RegExp(command));
  }
});

test("custom stage commands are installed and frozen drift blocks navigation", () => {
  const root = project();
  json(run(root, ["init", "--integration", "none", "--no-template-update"]));
  json(run(root, ["stages", "init"]));
  json(run(root, ["stages", "add", "security", "--after", "tasks", "--delegate", "stage-generator"]));
  json(run(root, ["integration", "install", "opencode"]));
  assert.ok(fs.existsSync(path.join(root, ".opencode/command/project.security.md")));

  const started = json(run(root, ["start", "REQ20260720-security"]));
  const stateFile = path.join(root, "matspec/changes", started.change, ".matspec-state.json");
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  assert.equal(state.workflow.stages.find((stage) => stage.key === "security").delegate, "stage-generator");
  fs.appendFileSync(path.join(root, "matspec/templates/security.md"), "\nchanged\n", "utf8");
  const blocked = json(run(root, ["go", started.change]), 1);
  assert.equal(blocked.code, "WORKFLOW_PACK_DRIFT");
});

test("implementation task lifecycle and explicit review entry follow the seven-stage workflow", () => {
  const root = project();
  json(run(root, ["init", "--integration", "none", "--no-template-update"]));
  const started = json(run(root, ["start", "REQ20260720-implementation", "--profile", "full"]));
  const changeDir = path.join(root, "matspec/changes", started.change);
  const stateFile = path.join(changeDir, ".matspec-state.json");
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  state.stages.validation.confirmed = true;
  state.currentStage = "implementation";
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  write(root, `matspec/changes/${started.change}/tasks.md`, `# Tasks

## Context

输入物：validation.md
输出物：实现

### Task 1: Implement

**Files:**
- Modify: \`src/index.js\`

**Context:**
输入物：validation.md
输出物：src/index.js

**Do:**
Implement it.

**Verify:**
- [ ] 规格合规：pass
- [ ] 串连验证：pass

- [ ]

报告状态：DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
`);
  const task = json(run(root, ["implement", started.change, "--task", "1"]));
  assert.equal(task.task.title, "Implement");
  assert.match(task.subagentPrompt, /DONE_WITH_CONCERNS/);
  json(run(root, ["implement", started.change, "--complete", "1"]));
  assert.equal(parseTasks(fs.readFileSync(path.join(changeDir, "tasks.md"), "utf8"))[0].status, "done");

  const pending = json(run(root, ["review", started.change]), 1);
  assert.equal(pending.code, "IMPLEMENTATION_PENDING_CONFIRM");
  const nextState = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  nextState.stages.implementation.confirmed = true;
  nextState.currentStage = "review";
  fs.writeFileSync(stateFile, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  const ready = json(run(root, ["go", started.change]));
  assert.equal(ready.nextAction, "review");
  const entered = json(run(root, ["review", started.change]));
  assert.equal(entered.nextAction, undefined);
  assert.equal(json(run(root, ["go", started.change])).nextAction, "delegate-subagent");
});

test("light implementation and review do not require an absent validation stage", () => {
  const root = project();
  const change = "REQ20260726-light-implementation";
  json(run(root, ["init", "--integration", "none", "--no-template-update"]));
  json(run(root, ["start", change, "--profile", "light"]));
  const changeDir = path.join(root, "matspec/changes", change);
  const stateFile = path.join(changeDir, ".matspec-state.json");
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  for (const key of ["proposal", "delta-spec", "tasks"]) {
    state.stages[key].confirmed = true;
    state.stages[key].status = "confirmed";
  }
  state.currentStage = "implementation";
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  write(root, `matspec/changes/${change}/tasks.md`, `# Tasks

## Context

输入物：delta-spec.md
输出物：实现

### Task 1: Implement

**Files:**
- Modify: \`src/index.js\`

**Context:**
输入物：delta-spec.md
输出物：src/index.js

**Do:**
Implement it.

**Verify:**
- [ ] 规格合规：pass
- [ ] 串连验证：pass

- [ ]

报告状态：DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
`);

  const started = json(run(root, ["implement", change, "--run"]));
  assert.equal(started.nextAction, "delegate-subagent");
  json(run(root, ["implement", change, "--complete", "1"]));
  const pending = json(run(root, ["review", change]), 1);
  assert.equal(pending.code, "IMPLEMENTATION_PENDING_CONFIRM");
});

test("extensions, batch generation and redaction use MatSpec-only contracts", () => {
  const root = project();
  json(run(root, ["init", "--integration", "none", "--no-template-update"]));
  const installed = json(run(root, ["extension", "install", "harmonyos"]));
  assert.equal(installed.extension, "harmonyos");
  assert.ok(fs.existsSync(path.join(root, "matspec/extensions/harmonyos/full-design.md")));
  write(root, "src/a/index.js", "export const a = 1;\n");
  write(root, "src/b/index.js", "export const b = 2;\n");
  write(root, "modules.json", JSON.stringify({ modules: [{ name: "Both", paths: ["src/a", "src/b"] }] }));
  const batch = json(run(root, ["generate", "--batch", "modules.json", "--concurrency", "2"], { MATSPEC_LLM_PROVIDER: "fake" }));
  assert.equal(batch.status, "generated");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/runs", batch.runId, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.modules[0].paths, ["src/a", "src/b"]);

  assert.deepEqual(redact({ token: "x", nested: { apiKey: "y", safe: "z" } }), {
    token: "***REDACTED***",
    nested: { apiKey: "***REDACTED***", safe: "z" }
  });
});

test("static website serves GET and HEAD and rejects unsupported methods", async (t) => {
  const port = 43000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["scripts/serve-web.js", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    stdio: "ignore"
  });
  t.after(() => child.kill());
  const url = `http://127.0.0.1:${port}`;
  let response;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      response = await fetch(url);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  assert.equal(response?.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.equal((await fetch(url, { method: "HEAD" })).status, 200);
  assert.equal((await fetch(url, { method: "POST" })).status, 405);
  assert.equal((await fetch(`${url}/missing`)).status, 404);
});
