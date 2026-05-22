# Document Quality Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compare MatrixSpec generated documentation against existing CodeWiki community and DeepWiki documentation with Codex CLI as the independent judge.

**Architecture:** Keep the experiment file-based and reproducible. MatrixSpec generates candidate docs with local Codex CLI; existing CodeWiki and DeepWiki outputs are imported from `../codewiki-community`; a separate Codex CLI judge run reads the docs plus source repository and writes structured JSON scores and a Markdown report.

**Tech Stack:** Node.js CLI, PowerShell orchestration, local Codex CLI, Markdown/JSON benchmark artifacts.

---

### Task 1: Fix Experiment Scope

**Files:**
- Create: `benchmark/doc-quality/README.md`

- [ ] **Step 1: Create benchmark directory**

Run: `New-Item -ItemType Directory -Force benchmark/doc-quality`

Expected: directory exists.

- [ ] **Step 2: Write scope README**

Create `benchmark/doc-quality/README.md` with:

```markdown
# Document Quality Comparison

This benchmark compares documentation quality across MatrixSpec, CodeWiki community, and DeepWiki.

The first run uses `mind-cluster` because `../codewiki-community/benchmark/gitcode` already contains source, CodeWiki docs, DeepWiki answers, and prior judge output for that repository.

Rules:
- MatrixSpec documents are generated with local `codex` CLI through `matspec generate`.
- The judge is a separate `codex exec` run.
- No LLM API provider is used.
- The judge must inspect source files before scoring.
- Results are stored as JSON plus Markdown.
```

- [ ] **Step 3: Commit scope doc**

Run:

```bash
git add benchmark/doc-quality/README.md docs/superpowers/plans/2026-05-22-doc-quality-compare.md
git commit -m "docs: define document quality comparison"
```

Expected: commit succeeds.

### Task 2: Generate MatrixSpec Documents

**Files:**
- Read: `../codewiki-community/benchmark/gitcode/repos/mind-cluster`
- Output: `../codewiki-community/benchmark/gitcode/repos/mind-cluster/.matspec-cli/runs/<run-id>/`
- Copy: `benchmark/doc-quality/mind-cluster/matspec/`

- [ ] **Step 1: Run MatrixSpec generation**

Run:

```bash
node bin/matspec.js --path ../codewiki-community/benchmark/gitcode/repos/mind-cluster --lang zh generate --runner codex --mode react --json
```

Expected: JSON output with `"ok": true`, `"status": "generated"`, and a `runId`.

- [ ] **Step 2: Copy candidate docs into benchmark folder**

Copy `design.md`, `spec.md`, `plan.json`, and `modules/*.md` from the generated run into `benchmark/doc-quality/mind-cluster/matspec/`.

Expected: MatrixSpec docs are available under the MatrixSpec repository for later review.

### Task 3: Collect Existing Baselines

**Files:**
- Read: `../codewiki-community/benchmark/gitcode/codewiki-docs/Ascend_mind-cluster_glm-5_benchmark_docs`
- Read: `../codewiki-community/benchmark/gitcode/deepwiki-answers/answers.md`
- Create: `benchmark/doc-quality/mind-cluster/codewiki/`
- Create: `benchmark/doc-quality/mind-cluster/deepwiki/`

- [ ] **Step 1: Copy CodeWiki community docs**

Copy the `core.md`, `qa-guide.md`, `module-*.md`, `doc-index.json`, and `meta.json` files.

Expected: CodeWiki docs are available under `benchmark/doc-quality/mind-cluster/codewiki/`.

- [ ] **Step 2: Extract DeepWiki mind-cluster answers**

Copy the existing DeepWiki answer material and keep only the `mindcluster-*` sections when practical.

Expected: DeepWiki baseline material is available under `benchmark/doc-quality/mind-cluster/deepwiki/`.

### Task 4: Run Codex CLI Judge

**Files:**
- Create: `benchmark/doc-quality/mind-cluster/judge/prompt.md`
- Create: `benchmark/doc-quality/mind-cluster/judge/result.json`
- Create: `benchmark/doc-quality/mind-cluster/judge/result.md`

- [ ] **Step 1: Build judge prompt**

The prompt must ask Codex CLI to score MatrixSpec, CodeWiki, and DeepWiki on:

```text
coverage, source_grounding, module_validity, architecture_clarity,
developer_usability, hallucination_control, operational_completeness
```

Each dimension is scored 0-100. The judge must provide total score, winner, rationale, and weaknesses for each tool.

- [ ] **Step 2: Run independent judge**

Run:

```bash
codex exec -C ../codewiki-community/benchmark/gitcode/repos/mind-cluster --sandbox read-only --output-last-message benchmark/doc-quality/mind-cluster/judge/result.md - < benchmark/doc-quality/mind-cluster/judge/prompt.md
```

Expected: Codex CLI writes a Markdown result with a JSON block.

- [ ] **Step 3: Save structured JSON**

Extract the JSON block into `benchmark/doc-quality/mind-cluster/judge/result.json`.

Expected: JSON parses cleanly.

### Task 5: Report and Verify

**Files:**
- Create: `benchmark/doc-quality/REPORT.md`

- [ ] **Step 1: Write report**

Summarize:

```markdown
# MatrixSpec vs CodeWiki community vs DeepWiki Document Quality

## Scope

## Inputs

## Scores

## Findings

## MatrixSpec Improvement Backlog
```

- [ ] **Step 2: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Commit benchmark results**

Run:

```bash
git add benchmark/doc-quality
git commit -m "docs: add document quality comparison results"
```

Expected: benchmark artifacts are committed.

### Self-Review

- The plan keeps generation and judging on local CLI paths.
- The plan does not introduce any LLM API provider.
- The first run is deliberately limited to `mind-cluster`; `RecSDK` can be added after the workflow is proven.
