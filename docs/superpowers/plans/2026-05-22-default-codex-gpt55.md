# Default Codex GPT-5.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Codex CLI generation default to `gpt-5.5` for every stage unless the user explicitly passes `--model`.

**Architecture:** Keep the existing single-model strategy shape. Change the Codex default model from `gpt-5.3-codex-spark` to `gpt-5.5` and remove the implicit fallback retry for Codex when no model is specified.

**Tech Stack:** Node.js ESM, built-in `node --test`, existing MatSpec CLI runner strategy.

---

### Task 1: Update Codex Default Model

**Files:**
- Modify: `src/llm.js`
- Modify: `test/cli.test.js`

- [ ] **Step 1: Write the failing tests**

Add or update tests in `test/cli.test.js` so Codex auto/default generation expects `gpt-5.5` and no implicit fallback retry when the default model fails.

Expected assertions:

```js
assert.equal(result.generation.externalAgents.codex.recommendedModel, "gpt-5.5");
assert.match(stderr, /--model gpt-5\.5/);
assert.doesNotMatch(stderr, /gpt-5\.3-codex-spark/);
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```powershell
node --test --test-name-pattern "codex|default generation runner|retries fallback"
```

Expected: at least one failure showing the current default is `gpt-5.3-codex-spark` or fallback behavior still exists.

- [ ] **Step 3: Update default strategy**

In `src/llm.js`:

```js
function defaultExternalModel(runner) {
  if (runner === "codex") return "gpt-5.5";
  if (runner === "claude") return "claude-sonnet-4-6";
  if (runner === "opencode") return null;
  return null;
}

function fallbackExternalModel(runner) {
  return null;
}
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node --test --test-name-pattern "codex|default generation runner|retries fallback"
```

Expected: focused tests pass.

- [ ] **Step 5: Run full test suite**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit implementation**

Run:

```powershell
git add src/llm.js test/cli.test.js
git commit -m "fix: default codex generation to gpt-5.5"
```
