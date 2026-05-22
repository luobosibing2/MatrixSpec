# Planner Focus Generalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve MatrixSpec module planning so large OpenHarmony and SDK repositories do not collapse into misleading `Project Root` fallback plans.

**Architecture:** Keep planning deterministic in `src/planner.js`. Add focused repository-shape discovery before existing generic core directory discovery, and add a size-aware fallback description so large repositories are not labeled as small projects. Cover the behavior with direct `planModules` tests in `test/cli.test.js`.

**Tech Stack:** Node.js ESM, `node:test`, existing MatSpec CLI planner.

---

## File Structure

- Modify `src/planner.js`: add OpenHarmony and SDK module discovery plus large-repository fallback wording.
- Modify `test/cli.test.js`: add focused planner tests for OpenHarmony, SDK, large fallback, and small fallback.

### Task 1: Add Failing Planner Tests

**Files:**
- Modify: `test/cli.test.js`

- [ ] **Step 1: Add OpenHarmony and SDK planner tests**

Append tests near the existing planner tests:

```js
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
```

- [ ] **Step 2: Add fallback wording tests**

Append:

```js
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
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```powershell
npm test -- --test-name-pattern "OpenHarmony|SDK|large fallback|small project"
```

Expected: new tests fail before implementation because planner does not discover those module shapes and large fallback still says small project.

### Task 2: Implement Planner Discovery

**Files:**
- Modify: `src/planner.js`

- [ ] **Step 1: Add discovery root constants**

Add after `COMPONENT_ROOTS`:

```js
const OPENHARMONY_MODULE_PATTERNS = [
  { prefix: ["frameworks", "core", "components_v2"], depth: 4, description: "OpenHarmony component module discovered under frameworks/core/components_v2." },
  { prefix: ["frameworks", "core", "components_ng", "pattern"], depth: 5, description: "OpenHarmony NG pattern module discovered under frameworks/core/components_ng/pattern." },
  { prefix: ["frameworks", "core", "interfaces", "native"], depth: 5, description: "OpenHarmony native interface module discovered under frameworks/core/interfaces/native." },
  { prefix: ["frameworks", "bridge"], depth: 3, description: "OpenHarmony bridge subsystem discovered under frameworks/bridge." },
  { prefix: ["adapter"], depth: 2, description: "OpenHarmony adapter subsystem discovered under adapter." },
  { prefix: ["interfaces"], depth: 2, description: "OpenHarmony interface surface discovered under interfaces." }
];

const SDK_MODULE_PATTERNS = [
  { prefix: ["training"], depth: 2, description: "SDK training module discovered under training." },
  { prefix: ["cust_op"], depth: 2, description: "SDK custom operator module discovered under cust_op." }
];
```

- [ ] **Step 2: Add generic pattern discovery helper**

Add before `discoverComponentModules`:

```js
function discoverPatternModules(sourceFiles, patterns) {
  const candidates = new Map();
  for (const file of sourceFiles) {
    const parts = file.path.split("/");
    for (const pattern of patterns) {
      if (parts.length <= pattern.depth - 1) continue;
      if (!matchesPrefix(parts, pattern.prefix)) continue;
      const segment = parts[pattern.depth - 1];
      if (!segment || SKIP_MODULE_DIRS.has(segment.toLowerCase())) continue;
      const modulePath = parts.slice(0, pattern.depth).join("/");
      const current = candidates.get(modulePath) || { path: modulePath, files: 0, lines: 0, description: pattern.description };
      current.files += 1;
      current.lines += file.lines || 0;
      candidates.set(modulePath, current);
    }
  }
  return rankedModuleCandidates(candidates).map((candidate) => ({
    path: candidate.path,
    name: moduleName(candidate.path),
    description: candidate.description
  }));
}

function matchesPrefix(parts, prefix) {
  return prefix.every((part, index) => parts[index] === part);
}

function rankedModuleCandidates(candidates) {
  return [...candidates.values()]
    .sort((a, b) => b.files - a.files || b.lines - a.lines || a.path.localeCompare(b.path))
    .slice(0, MAX_COMPONENT_MODULES);
}
```

- [ ] **Step 3: Reuse ranking helper in component discovery**

Change `discoverComponentModules` return block to use `rankedModuleCandidates(candidates)`:

```js
  return rankedModuleCandidates(candidates).map((candidate) => ({
    path: candidate.path,
    name: moduleName(candidate.path),
    description: `Component source module discovered under ${candidate.path.split("/")[0]}/.`
  }));
```

- [ ] **Step 4: Call new discovery before generic core dirs**

In `discoverModules`, after the Java module block and before `discoverComponentModules`, add:

```js
  const sourceFiles = sourceFileStats || files.map((file) => ({ path: file, lines: 0 }));
  for (const module of discoverPatternModules(sourceFiles, OPENHARMONY_MODULE_PATTERNS)) {
    addModule(modules, seen, module.path, module.name, module.description);
  }
  if (modules.length) return modules;

  for (const module of discoverPatternModules(sourceFiles, SDK_MODULE_PATTERNS)) {
    addModule(modules, seen, module.path, module.name, module.description);
  }
  if (modules.length) return modules;
```

Then update the existing component call to use `sourceFiles`:

```js
  for (const module of discoverComponentModules(sourceFiles)) {
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm test -- --test-name-pattern "OpenHarmony|SDK"
```

Expected: OpenHarmony and SDK tests pass.

### Task 3: Implement Size-Aware Fallback

**Files:**
- Modify: `src/planner.js`

- [ ] **Step 1: Add helper functions**

Add before `fallbackSourceStats`:

```js
function fallbackModule(scan) {
  const large = isLargeRepository(scan);
  return {
    name: "Project Root",
    path: ".",
    description: large
      ? "Fallback module because no safe module boundaries were detected for this large repository."
      : "Fallback module for a small project without obvious source module directories."
  };
}

function isLargeRepository(scan) {
  return (scan.includedFiles || []).length >= 1000 || (scan.sourceFileStats || []).length >= 1000;
}
```

- [ ] **Step 2: Use helper in `planModules`**

Replace the inline fallback array in `planModules` with:

```js
    modules: modules.length ? modules : [fallbackModule(scan)]
```

- [ ] **Step 3: Run fallback tests**

Run:

```powershell
npm test -- --test-name-pattern "fallback"
```

Expected: fallback tests pass, including existing fallback behavior.

### Task 4: Verify Full Suite and Commit

**Files:**
- Modify: `src/planner.js`
- Modify: `test/cli.test.js`

- [ ] **Step 1: Run full test suite**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Inspect git diff**

Run:

```powershell
git diff -- src/planner.js test/cli.test.js
git status --short
```

Expected: only intended planner/test/plan files are modified or added.

- [ ] **Step 3: Commit implementation**

Run:

```powershell
git add src/planner.js test/cli.test.js docs/superpowers/plans/2026-05-22-planner-focus-generalization.md
git commit -m "feat: improve large repository module planning"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: covers OpenHarmony discovery, SDK discovery, large fallback wording, small fallback preservation, existing runner constraint, and test verification.
- Placeholder scan: no placeholders or open-ended implementation steps remain.
- Type consistency: tests use existing `planModules(root, scan)` API and existing Node `assert` style.

