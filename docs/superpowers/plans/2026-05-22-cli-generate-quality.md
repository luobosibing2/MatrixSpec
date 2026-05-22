# CLI Generate Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `matspec generate` document quality while keeping generation limited to local Codex, Claude Code, and opencode CLI runners.

**Architecture:** Add local filesystem context engineering before runner invocation: scanner statistics, planner validation, source excerpts with line numbers, README/docs synthesis context, and large-file hints. The runner interface stays unchanged and no HTTP LLM API client is introduced.

**Tech Stack:** Node.js ESM, `node --test`, existing MatSpec CLI modules.

---

### Task 1: Scanner Evidence

**Files:**
- Modify: `src/scanner.js`
- Test: `test/cli.test.js`

- [ ] Add failing tests that assert `scanRepository` returns directory source stats, source file stats, core directory stats, and line-numbered source excerpts.
- [ ] Implement source-only extension detection, line counting, directory stats, core directory stats, and bounded line-numbered excerpts.
- [ ] Run targeted tests and verify they pass.

### Task 2: Planner Validation

**Files:**
- Modify: `src/planner.js`
- Test: `test/cli.test.js`

- [ ] Add failing tests for planner behavior: avoid test/demo-only modules, auto-cover core source directories, and mark large-file modules.
- [ ] Implement `validateAndFixModules` around deterministic module discovery.
- [ ] Run targeted tests and verify they pass.

### Task 3: Prompt Context

**Files:**
- Modify: `src/generator/direct.js`
- Modify: `src/generator/external.js`
- Modify: `src/generator/react.js`
- Test: `test/cli.test.js`

- [ ] Add failing tests that generated prompts contain directory source stats, core coverage, README/docs content, line-numbered source excerpts, and large-file instructions.
- [ ] Update direct, external, and react prompts to pass the new context to CLI runners.
- [ ] Verify prompts still use CLI runners only.

### Task 4: Verification

**Files:**
- Modify: `test/cli.test.js`

- [ ] Run `npm test`.
- [ ] Inspect `git diff --stat`.
- [ ] Commit the implementation.
