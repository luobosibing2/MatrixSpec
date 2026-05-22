# Generate Quality Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `matspec generate` output by adding component-aware planning, operational evidence scanning, and stronger developer-runbook prompt requirements.

**Architecture:** Keep generation on local Codex/Claude/opencode CLI runners. Add deterministic context improvements in `scanner`, `planner`, and prompt templates so external runners receive better modules and operational evidence without any API provider.

**Tech Stack:** Node.js ESM, built-in `node:test`, existing MatrixSpec CLI generation pipeline.

---

### Task 1: Planner Component Modules

**Files:**
- Modify: `test/cli.test.js`
- Modify: `src/planner.js`

- [ ] **Step 1: Add failing planner tests**

Add tests that create synthetic `component/*` source stats and assert the planner returns component child modules instead of `Project Root`, ordered by source size and bounded to a small number.

- [ ] **Step 2: Run red test**

Run: `node --test test/cli.test.js`

Expected: planner tests fail because component roots are not discovered.

- [ ] **Step 3: Implement component root discovery**

Update `src/planner.js` to discover source-heavy direct children under `component`, `components`, `services`, `plugins`, `modules`, `tools`, and `cmd`. Rank by file count then lines, skip test/demo/example children, and cap discovered component modules.

- [ ] **Step 4: Run green test**

Run: `node --test test/cli.test.js`

Expected: tests pass.

### Task 2: Scanner Operational Evidence

**Files:**
- Modify: `test/cli.test.js`
- Modify: `src/scanner.js`

- [ ] **Step 1: Add failing scanner test**

Add a test repository with `build/build_all.sh`, `build/build_each.sh`, `deploy/app.yaml`, `service_config.ini`, and troubleshooting docs. Assert `scanRepository` returns a bounded `operationalEvidence` object with build, config/deploy, and troubleshooting entries.

- [ ] **Step 2: Run red test**

Run: `node --test test/cli.test.js`

Expected: scanner test fails because `operationalEvidence` does not exist.

- [ ] **Step 3: Implement operational evidence collection**

Add bounded file metadata and short snippets for operationally relevant files. Keep output deterministic and small.

- [ ] **Step 4: Run green test**

Run: `node --test test/cli.test.js`

Expected: tests pass.

### Task 3: Prompt Requirements

**Files:**
- Modify: `test/cli.test.js`
- Modify: `src/generator/templates.js`
- Modify: `src/generator/direct.js`
- Modify: `src/generator/react.js`
- Modify: `src/generator/external.js`

- [ ] **Step 1: Add failing prompt tests**

Assert generated prompts include operational evidence and instructions for source anchors, runbook/debug guidance, and certainty boundaries.

- [ ] **Step 2: Run red test**

Run: `node --test test/cli.test.js`

Expected: prompt tests fail because these phrases are missing.

- [ ] **Step 3: Implement prompt evidence helpers**

Add `operationalEvidence(scan)` and strengthen shared prompt instructions so direct and module-first generation receive the same requirements.

- [ ] **Step 4: Run green test**

Run: `node --test test/cli.test.js`

Expected: tests pass.

### Task 4: Verification and Commit

**Files:**
- Modify: all changed files

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: 59+ tests pass.

- [ ] **Step 2: Inspect diff**

Run: `git diff --stat` and review changed files.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add src test docs/superpowers/plans/2026-05-22-generate-quality-round2.md
git commit -m "feat: improve generate document quality"
```

Expected: commit succeeds.

## Self-Review

- Covers all three requested optimization areas.
- Keeps generation on local CLI runners only.
- Uses TDD for behavior changes.
