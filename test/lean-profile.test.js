import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { installIntegration } from "../src/integrations.js";
import { initProject } from "../src/project.js";
import { builtinWorkflow } from "../src/workflow.js";

const CLI = path.resolve("bin/matspec.js");

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "matspec-lean-"));
}

function run(root, args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [CLI, "--path", root, ...args, "--json", "--no-update-check"], {
    encoding: "utf8",
    env: { ...process.env, MATSPEC_NO_REPORT: "1" }
  });
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return JSON.parse(result.stdout || result.stderr);
}

function validSpec() {
  return `# REQ-LEAN-SLUG Delta Spec

## Goal and Scope

Normalize a user supplied label without changing non-string compatibility.

## ADDED Requirements

- REQ-LEAN-SLUG-001: Consecutive internal spaces become one hyphen.
  - Acceptance: \`"Hello   World"\` becomes \`"hello-world"\`.

## MODIFIED Requirements

- REQ-LEAN-SLUG-002: Leading and trailing spaces are ignored before lowercasing.
  - Acceptance: \`"  Alpha "\` becomes \`"alpha"\`.

## REMOVED Requirements

None.

## Preserved Behavior

Existing lowercase conversion and non-string handling remain unchanged.

## Inputs, Defaults, Ordering, and Precedence

Trim first, collapse spaces second, and lowercase last. Empty strings remain empty.

## Failures and Fallback

Non-string input keeps the existing fallback behavior and does not throw a new error.

## End-to-End Propagation

Public function input -> normalization boundary -> returned slug.

## Public Contract

The exported function signature and return type remain unchanged.

## Acceptance Examples

| Scenario | Given | When | Then | Requirement |
|---|---|---|---|---|
| spaces | Hello   World | normalize | hello-world | REQ-LEAN-SLUG-001 |
| trim | two outer spaces | normalize | alpha | REQ-LEAN-SLUG-002 |

## Non-goals

No punctuation transliteration, Unicode folding, or API signature changes.

## Decision Closure

All product decisions are confirmed; no open questions remain.
`;
}

test("lean is a frozen two-stage spec-driven workflow", () => {
  const workflow = builtinWorkflow("lean");

  assert.equal(workflow.profile, "lean");
  assert.deepEqual(workflow.stages.map((stage) => stage.key), ["delta-spec", "implementation"]);
  assert.deepEqual(workflow.stages.map((stage) => stage.command), ["matspec.lean-spec", "matspec.lean-implement"]);
  assert.deepEqual(workflow.stages[0].inputs, []);
  assert.deepEqual(workflow.stages[1].inputs, ["delta-spec.md"]);
  assert.equal(workflow.stages[1].delegate, undefined);
  assert.equal(workflow.stages[1].manualAccept, true);
  assert.equal(workflow.optimization.implementationMode, "spec-driven");
  assert.equal(workflow.optimization.contextHandoff, "confirmed-delta-spec-only");
  assert.equal(workflow.optimization.questionPacket.maxQuestions, 12);
  assert.equal(workflow.optimization.reviewMode, "none");
  assert.deepEqual(workflow.finalization, { require_updated: [], coverage: [] });
  assert.ok(workflow.stages[0].checks.every((check) => check.enforceOnAccept === true));
});

test("lean blocks a low-density spec and hands the confirmed spec directly to implementation", () => {
  const root = tempProject();
  run(root, ["init", "--integration", "none", "--no-template-update"]);
  const started = run(root, ["start", "REQ-lean-smoke", "--profile", "lean"]);
  const changeDir = path.join(root, `matspec/changes/${started.change}`);

  assert.equal(started.profile, "lean");
  const startedState = JSON.parse(fs.readFileSync(path.join(changeDir, ".matspec-state.json"), "utf8"));
  assert.deepEqual(startedState.workflow.stages.map((stage) => stage.key), ["delta-spec", "implementation"]);
  fs.writeFileSync(path.join(changeDir, "delta-spec.md"), "# Delta\n\nREQ-LEAN-001: change it.\n", "utf8");

  const blocked = run(root, ["accept", started.change], 1);
  assert.equal(blocked.code, "STAGE_CHECKS_FAILED");
  assert.ok(blocked.findings.some((finding) => finding.code === "LEAN002"));

  fs.writeFileSync(path.join(changeDir, "delta-spec.md"), validSpec(), "utf8");
  const accepted = run(root, ["accept", started.change]);
  assert.equal(accepted.acceptedStage, "delta-spec");
  assert.equal(accepted.continuation.nextAction, "implement-from-spec");
  assert.equal(accepted.continuation.stage.key, "implementation");
  assert.deepEqual(accepted.continuation.stage.inputs.map((input) => input.path), [
    `matspec/changes/${started.change}/delta-spec.md`
  ]);
  assert.match(accepted.next[0], /do not call matspec implement/i);

  const state = JSON.parse(fs.readFileSync(path.join(changeDir, ".matspec-state.json"), "utf8"));
  assert.deepEqual(state.implementationBaseline.documents, {});

  const implementation = run(root, ["go", started.change]);
  assert.equal(implementation.stage.key, "implementation");
  assert.equal(implementation.nextAction, "execute-stage");
  assert.equal(implementation.delegate, undefined);
  assert.match(implementation.next[0], /stage\.inputs/i);
  assert.doesNotMatch(implementation.next[0], /matspec implement --run/i);
});

test("lean completes and archives without full-document finalization", () => {
  const root = tempProject();
  run(root, ["init", "--integration", "none", "--no-template-update"]);
  const started = run(root, ["start", "REQ-lean-done", "--profile", "lean"]);
  const changeDir = path.join(root, `matspec/changes/${started.change}`);
  fs.writeFileSync(path.join(changeDir, "delta-spec.md"), validSpec(), "utf8");

  run(root, ["accept", started.change]);
  const implementationAccepted = run(root, ["accept", started.change]);
  assert.equal(implementationAccepted.acceptedStage, "implementation");
  assert.equal(implementationAccepted.completed, true);
  assert.deepEqual(implementationAccepted.next, ["matspec done"]);
  assert.doesNotMatch(implementationAccepted.message, /full|全量/i);

  const ready = run(root, ["go", started.change]);
  assert.equal(ready.nextAction, "done");
  assert.doesNotMatch(ready.message, /finalization|全量/i);

  const done = run(root, ["done", started.change]);
  assert.equal(done.ok, true);
  assert.match(done.archive, new RegExp(`matspec/changes/archives/.*${started.change}`));
  assert.equal(fs.existsSync(path.join(root, "matspec/specs/spec.md")), false);
  assert.equal(fs.existsSync(path.join(root, "matspec/specs/design.md")), false);
});

test("agent integrations expose the Lean handoff without an extra Codex skill or subagent", () => {
  const codexRoot = tempProject();
  initProject(codexRoot, { integration: "none", no_template_update: true });
  installIntegration(codexRoot, "codex");

  const main = fs.readFileSync(path.join(codexRoot, ".agents/skills/matspec/SKILL.md"), "utf8");
  assert.match(main, /profile=lean/);
  assert.match(main, /confirmed delta-spec and current repository/i);
  assert.match(main, /do not call matspec implement/i);
  assert.match(main, /do not spawn another agent solely/i);
  assert.equal(fs.existsSync(path.join(codexRoot, ".agents/skills/matspec-lean-spec/SKILL.md")), false);
  assert.equal(fs.existsSync(path.join(codexRoot, ".agents/skills/matspec-lean-implement/SKILL.md")), false);

  const opencodeRoot = tempProject();
  initProject(opencodeRoot, { integration: "none", no_template_update: true });
  installIntegration(opencodeRoot, "opencode");
  const leanSpec = fs.readFileSync(path.join(opencodeRoot, ".opencode/command/matspec.lean-spec.md"), "utf8");
  const leanImplement = fs.readFileSync(path.join(opencodeRoot, ".opencode/command/matspec.lean-implement.md"), "utf8");
  assert.match(leanSpec, /one comprehensive batch/i);
  assert.match(leanImplement, /Read the one confirmed delta-spec input once/i);
  assert.equal(fs.existsSync(path.join(opencodeRoot, ".opencode/agents/spec-implementer.md")), false);
});

test("configured lean project can start without full baseline documents", () => {
  const root = tempProject();
  initProject(root, { integration: "none", no_template_update: true });
  const configFile = path.join(root, ".matspec-cli/config.yaml");
  fs.writeFileSync(configFile, fs.readFileSync(configFile, "utf8").replace("workflowProfile: light", "workflowProfile: lean"), "utf8");

  const result = initProject(root, { integration: "none", no_template_update: true });
  assert.deepEqual(result.next, ["matspec start REQ-feature-name"]);
});
