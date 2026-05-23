# React Generation Fallbacks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make module-first generation resilient so one failed module does not block the whole run, with a final Codex autonomous analysis fallback before marking a module failed.

**Architecture:** Extend `runReactGeneration` with module-level attempts: standard prompt, compressed prompt, and an autonomous runner prompt. Successful fallback artifacts are saved like normal module docs and logged with attempt metadata. If all attempts fail for a module, record the failure, continue later modules, and synthesize from successful docs plus failure summaries.

**Tech Stack:** Node.js ESM, built-in `node --test`, existing MatSpec CLI runner abstractions.

---

### Task 1: Module Retry And Fallback Attempts

**Files:**
- Modify: `src/generator/react.js`
- Modify: `test/cli.test.js`

- [ ] **Step 1: Add failing test for compressed retry**

Add a mock runner mode that fails the first call and succeeds the second call. Assert the generated module artifact exists and `logs/react.json` records two attempts for the module.

Run:

```powershell
node --test --test-name-pattern "retries module generation"
```

Expected: fails before implementation because there is no attempt metadata.

- [ ] **Step 2: Implement attempt loop**

Add `runModuleWithFallbacks` in `src/generator/react.js` with attempts:

```js
[
  { name: "standard", prompt: buildModulePrompt(scan, module, options) },
  { name: "compressed", prompt: buildCompressedModulePrompt(scan, module, options) },
  { name: "autonomous", prompt: buildAutonomousModulePrompt(module, options) }
]
```

Persist each attempt prompt under `logs/prompts/modules/<module-slug>.<attempt>.md`.

- [ ] **Step 3: Run focused test**

Run:

```powershell
node --test --test-name-pattern "retries module generation"
```

Expected: pass.

### Task 2: Continue After Final Module Failure

**Files:**
- Modify: `src/generator/react.js`
- Modify: `src/runs.js`
- Modify: `test/cli.test.js`

- [ ] **Step 1: Add failing test for partial success**

Make the first module fail all attempts and the second module succeed. Assert:

```js
assert.equal(manifest.status, "partial_success");
assert.equal(manifest.moduleFailures.length, 1);
assert.equal(manifest.artifacts.modules.length, 1);
assert.ok(fs.existsSync(path.join(runDir, "design.md")));
assert.ok(fs.existsSync(path.join(runDir, "spec.md")));
```

Run:

```powershell
node --test --test-name-pattern "continues after module failure"
```

Expected: fail before implementation because current generation stops on the first failed module.

- [ ] **Step 2: Record failures and continue**

In `runReactGeneration`, when all attempts fail:

```js
moduleFailures.push({
  name: module.name,
  path: module.path,
  code: result.code,
  message: result.message,
  attempts: result.attempts
});
continue;
```

If no module succeeds, return failure. If at least one succeeds, continue to design/spec synthesis.

- [ ] **Step 3: Add failed module summaries to synthesis**

Append a `Failed modules:` section to `buildDesignPrompt` so the synthesizer knows which modules are missing and why.

- [ ] **Step 4: Manifest partial status**

In `src/runs.js`, use `partial_success` when `react.moduleFailures.length > 0`.

- [ ] **Step 5: Run focused test**

Run:

```powershell
node --test --test-name-pattern "continues after module failure"
```

Expected: pass.

### Task 3: Verification

**Files:**
- Modify: `test/cli.test.js`

- [ ] **Step 1: Run focused react fallback tests**

Run:

```powershell
node --test --test-name-pattern "module generation fallback|continues after module failure"
```

Expected: all matching tests pass.

- [ ] **Step 2: Run full test suite**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

Run:

```powershell
git add src/generator/react.js src/runs.js test/cli.test.js
git commit -m "feat: add resilient module generation fallbacks"
```
