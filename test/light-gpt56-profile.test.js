import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { implementCommand } from "../src/implement.js";
import { installIntegration } from "../src/integrations.js";
import { initProject } from "../src/project.js";
import { acceptStage, currentStagePayload, loadState, saveState, startChange } from "../src/state.js";
import { builtinWorkflow } from "../src/workflow.js";

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "matspec-gpt56-"));
}

test("light-gpt56 preserves Light quality gates and declares its model-specific policy", () => {
  const light = builtinWorkflow("light");
  const optimized = builtinWorkflow("light-gpt56");

  assert.deepEqual(optimized.stages.map((stage) => stage.key), light.stages.map((stage) => stage.key));
  for (const stage of optimized.stages) {
    const baseline = light.stages.find((item) => item.key === stage.key);
    assert.deepEqual(stage.checks.slice(0, baseline.checks.length), baseline.checks);
  }
  assert.deepEqual(optimized.finalization, light.finalization);
  assert.equal(optimized.optimization.targetModel, "gpt-5.6-terra");
  assert.equal(optimized.optimization.targetReasoningEffort, "high");
  assert.equal(optimized.optimization.interactionMode, "decisive");
  assert.equal(optimized.optimization.reviewMode, "risk-surface-verification-ladder");
  assert.equal(optimized.optimization.skillLoadMode, "main-only-after-go");
  assert.equal(optimized.optimization.enforceStageChecksOnAccept, true);
  assert.equal(optimized.optimization.continueAfterAccept, true);
  assert.deepEqual(optimized.optimization.questionPacket.fields, ["decision", "why it matters", "recommended default", "alternatives"]);
  const taskChecks = optimized.stages.find((stage) => stage.key === "tasks").checks;
  assert.ok(taskChecks.some((check) => check.code === "G56301" && check.enforceOnAccept === true));
  assert.ok(taskChecks.some((check) => check.code === "CS302" && check.enforceOnAccept !== true));
  assert.deepEqual(optimized.optimization.verificationLadder, [
    "prove-tool-provenance",
    "static-contract-and-diff",
    "cheapest-external-consumer",
    "focused-risk-tests",
    "impacted-suite-once"
  ]);
});

test("light-gpt56 blocks incomplete artifacts and continues without another go", () => {
  const root = tempProject();
  initProject(root, { integration: "none", no_template_update: true });
  const started = startChange("REQ-enforced-continuation", { path: root, profile: "light-gpt56" });
  const changeRoot = path.join(root, `matspec/changes/${started.change}`);
  fs.writeFileSync(path.join(changeRoot, "proposal.md"), `# Proposal

## Requested Change vs Real Need
Observable need.
## Scope Boundary
In scope.
## Non-goals
None.
## Confirmed Decisions
Confirmed.
## Assumptions and Open Questions
None.
## Decision Ledger
Recorded.
`, "utf8");

  const proposal = acceptStage({ path: root }, started.change, "proposal");
  assert.equal(proposal.ok, true);
  assert.equal(proposal.continuation.nextAction, "draft-next-stage");
  assert.equal(proposal.continuation.stage.key, "delta-spec");
  assert.equal(proposal.next[0], "Continue with continuation.stage without another matspec go");

  fs.writeFileSync(path.join(changeRoot, "delta-spec.md"), `# Delta

## ADDED Requirements
REQ-E2E-001: observable behavior with an acceptance oracle.
## MODIFIED Requirements
None.
## REMOVED Requirements
None.
`, "utf8");
  const blocked = acceptStage({ path: root }, started.change, "delta-spec");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "STAGE_CHECKS_FAILED");
  assert.ok(blocked.findings.some((finding) => finding.code === "G56201"));

  fs.appendFileSync(path.join(changeRoot, "delta-spec.md"), `
## Risk Surface Coverage

| Surface | Oracle |
|---|---|
| entry point | focused behavior check |
`, "utf8");
  const accepted = acceptStage({ path: root }, started.change, "delta-spec");
  assert.equal(accepted.ok, true);
  assert.equal(accepted.continuation.stage.key, "tasks");
  assert.equal(accepted.continuation.stage.stageContract.requiredHeading, "## Risk-to-Verification Map");

  fs.writeFileSync(path.join(changeRoot, "tasks.md"), `# Compact Tasks

## Risk-to-Verification Map

| Requirement | Risk | Proof |
|---|---|---|
| REQ-E2E-001 | behavior regresses | focused test |

Implement REQ-E2E-001 and run the focused test.
`, "utf8");
  const compactTasks = acceptStage({ path: root }, started.change, "tasks");
  assert.equal(compactTasks.ok, true, "legacy template-shape diagnostics must not reject a semantically complete compact task plan");
});

test("light-gpt56 removes only the pre-draft generation handshake", () => {
  const root = tempProject();
  initProject(root, { integration: "none", no_template_update: true });
  const started = startChange("REQ-optimized-flow", { path: root, profile: "light-gpt56" });
  const state = loadState(root, started.change);
  const proposal = state.workflow.stages.find((stage) => stage.key === "proposal");
  const payload = currentStagePayload(root, started.change, state, proposal);

  assert.equal(started.profile, "light-gpt56");
  assert.equal(payload.requiresUserGenerationApproval, false);
  assert.equal(payload.allowedWritePath, `matspec/changes/${started.change}/proposal.md`);
  assert.equal(payload.optimization.clarificationMode, "single-batch-product-decisions-only");
  assert.deepEqual(payload.stageContract.coverage, ["actor", "trigger", "current behavior", "expected behavior", "boundaries", "failures", "non-goals"]);
  assert.equal(payload.optimization.stageContracts, undefined);
  assert.equal(payload.artifact.exists, false);
  assert.equal(state.stages.proposal.confirmed, false);

  const frozenWorkflow = fs.readFileSync(path.join(root, `matspec/changes/${started.change}/workflow.yaml`), "utf8");
  assert.match(frozenWorkflow, /targetModel: gpt-5\.6-terra/);
  assert.match(frozenWorkflow, /draftWithoutGenerationApproval: true/);
});

test("light-gpt56 go payload fingerprints inputs for evidence reuse", () => {
  const root = tempProject();
  initProject(root, { integration: "none", no_template_update: true });
  const started = startChange("REQ-fingerprinted-inputs", { path: root, profile: "light-gpt56" });
  const state = loadState(root, started.change);
  const proposalPath = path.join(root, `matspec/changes/${started.change}/proposal.md`);
  fs.writeFileSync(proposalPath, "# Confirmed proposal\n", "utf8");
  Object.assign(state.stages.proposal, {
    status: "confirmed",
    clarified: true,
    confirmed: true,
    confirmedAt: "2026-08-01T00:00:00.000Z"
  });
  const delta = state.workflow.stages.find((stage) => stage.key === "delta-spec");
  const payload = currentStagePayload(root, started.change, state, delta);
  const proposal = payload.inputs.find((input) => input.path.endsWith("proposal.md"));

  assert.equal(proposal.exists, true);
  assert.equal(proposal.bytes, Buffer.byteLength("# Confirmed proposal\n"));
  assert.match(proposal.sha256, /^[a-f0-9]{64}$/);
  assert.equal(proposal.confirmed, true);
  assert.equal(proposal.confirmedAt, "2026-08-01T00:00:00.000Z");
  assert.match(payload.stageContract.oracleRule, /observable oracle/);
});

test("project guidance treats configured light-gpt56 as a no-baseline profile", () => {
  const root = tempProject();
  initProject(root, { integration: "none", no_template_update: true });
  const configFile = path.join(root, ".matspec-cli/config.yaml");
  const config = fs.readFileSync(configFile, "utf8").replace("workflowProfile: light", "workflowProfile: light-gpt56");
  fs.writeFileSync(configFile, config, "utf8");

  const result = initProject(root, { integration: "none", no_template_update: true });
  assert.deepEqual(result.next, ["matspec start REQ-feature-name"]);
});

test("light-gpt56 returns all remaining implementation tasks in one batch", () => {
  const root = tempProject();
  initProject(root, { integration: "none", no_template_update: true });
  const started = startChange("REQ-batched-implementation", { path: root, profile: "light-gpt56" });
  const state = loadState(root, started.change);
  for (const key of ["proposal", "delta-spec", "tasks"]) {
    Object.assign(state.stages[key], { status: "confirmed", clarified: true, confirmed: true });
  }
  state.currentStage = "implementation";
  saveState(root, started.change, state);

  const tasksFile = path.join(root, `matspec/changes/${started.change}/tasks.md`);
  fs.writeFileSync(tasksFile, `# Tasks

### Task 1: Implement behavior

**Files:**
- Modify: \`src/example.js\`

**Context:**
Confirmed delta.

**Do:**
Implement it.

**Verify:**
- [ ] focused test

- [ ]

### Task 2: Verify integration

**Files:**
- Test: \`test/example.test.js\`

**Context:**
Implemented behavior.

**Do:**
Add integration coverage.

**Verify:**
- [ ] integration test

- [ ]
`, "utf8");

  const result = implementCommand({ path: root, run: true }, started.change);
  assert.equal(result.ok, true);
  assert.equal(result.executionMode, "single-session-batch");
  assert.equal(result.nextAction, "execute-task-batch");
  assert.deepEqual(result.taskBatch.map((task) => task.id), [1, 2]);
  assert.deepEqual(result.verificationLadder, [
    "prove-tool-provenance",
    "static-contract-and-diff",
    "cheapest-external-consumer",
    "focused-risk-tests",
    "impacted-suite-once"
  ]);
  assert.match(result.verificationRules.join("\n"), /worktree/);
  assert.match(result.verificationRules.join("\n"), /Rerun a command only/);
  assert.match(result.completionCommand, /--complete N/);
});

test("Codex integration explains the light-gpt56 fast path without weakening review", () => {
  const root = tempProject();
  initProject(root, { integration: "none", no_template_update: true });
  installIntegration(root, "codex");

  const main = fs.readFileSync(path.join(root, ".agents/skills/matspec/SKILL.md"), "utf8");
  const review = fs.readFileSync(path.join(root, ".agents/skills/matspec-review/SKILL.md"), "utf8");
  assert.match(main, /profile=light-gpt56/);
  assert.match(main, /draft if approval=false/);
  assert.match(main, /continuation\.stage without go/);
  assert.match(main, /preserve confirmation, review, repair, verification, and done guards/i);
  assert.match(main, /taskBatch/);
  assert.match(main, /load no other stage skill/i);
  assert.match(main, /reuse input hashes/);
  assert.match(main, /map risks to oracles/);
  assert.match(review, /stage\.stageContract\.riskSurfaces/);
  assert.match(review, /optimization\.verificationLadder/);
  assert.match(review, /diff and verification evidence/);
  assert.match(review, /changes-required/);
});
