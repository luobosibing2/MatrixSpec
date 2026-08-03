import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { installIntegration } from "../src/integrations.js";
import { builtinWorkflow } from "../src/workflow.js";

const packageRoot = path.resolve(".");

test("validation receives the delta chain and keeps full documents as baseline inputs", () => {
  const standardInputs = builtinWorkflow("standard").stages
    .find((stage) => stage.key === "validation").inputs;
  assert.deepEqual(standardInputs, [
    "matspec/specs/spec.md",
    "matspec/specs/design.md",
    "proposal.md",
    "delta-spec.md",
    "tasks.md"
  ]);

  const fullInputs = builtinWorkflow("full").stages
    .find((stage) => stage.key === "validation").inputs;
  assert.deepEqual(fullInputs, [
    "matspec/specs/spec.md",
    "matspec/specs/design.md",
    "proposal.md",
    "delta-spec.md",
    "delta-design.md",
    "tasks.md"
  ]);
});

test("validation contract treats delta as change truth and baseline as compatibility reference", () => {
  const command = fs.readFileSync(
    path.join(packageRoot, "workflow-packs/matspec/commands/matspec.validation.md"),
    "utf8"
  );
  assert.match(command, /delta artifacts as the source of truth/i);
  assert.match(command, /absent from the baseline is expected/i);
  assert.match(command, /done-stage baseline refresh is not an implementation blocker/i);
  assert.match(command, /real baseline conflict\/regression/i);
});

test("validation template makes pre-implementation baseline refresh non-blocking", () => {
  for (const relative of [
    "workflow-packs/matspec/templates/delta/validation.md",
    "templates/delta/validation.md"
  ]) {
    const template = fs.readFileSync(path.join(packageRoot, relative), "utf8");
    assert.match(template, /delta 文档是本次变更的真相源/);
    assert.match(template, /新需求尚未出现在变更前全量文档中是正常状态，不构成阻塞/);
    assert.match(template, /实现后基线刷新计划（非前置门禁）/);
    assert.match(template, /“baseline 尚未包含 delta”不是合法 blocker/);
  }

  const englishTemplate = fs.readFileSync(
    path.join(packageRoot, "templates/en/delta/validation.md"),
    "utf8"
  );
  assert.match(englishTemplate, /Delta documents are the source of truth for this change/);
  assert.match(englishTemplate, /expected and non-blocking/);
  assert.match(englishTemplate, /Post-Implementation Baseline Refresh Plan \(Non-Blocking\)/);
  assert.match(englishTemplate, /baseline does not yet contain the delta.*not a valid blocker/i);
});

test("generated validation skill preserves delta-first validation semantics", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "matspec-validation-contract-"));
  installIntegration(root, "codex");
  const skill = fs.readFileSync(
    path.join(root, ".agents/skills/matspec-validation/SKILL.md"),
    "utf8"
  );
  assert.match(skill, /delta artifacts as the source of truth/i);
  assert.match(skill, /MUST NOT be reported as a blocker/i);
  assert.match(skill, /Baseline refresh belongs to done finalization after implementation/i);
  assert.match(skill, /tasks Implementation Approach/i);
});
