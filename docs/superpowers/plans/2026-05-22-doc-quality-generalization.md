# Document Quality Generalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a five-sample document quality benchmark comparing MatrixSpec round two, CodeWiki community, and DeepWiki.

**Architecture:** Keep the experiment file-based and reproducible under `benchmark/doc-quality/generalization/`. MatrixSpec documents are generated with the local CLI runner, existing CodeWiki and DeepWiki baselines are copied from `../codewiki-community`, and each sample is judged by a separate read-only Codex CLI run with bounded source checkpoints.

**Tech Stack:** Node.js CLI, PowerShell, local Codex CLI, Markdown, JSON.

---

## File Structure

- Create `benchmark/doc-quality/generalization/README.md` to describe the five-sample benchmark and rules.
- Create `benchmark/doc-quality/generalization/<sample>/` for each sample.
- Create `benchmark/doc-quality/generalization/<sample>/matspec/` from MatrixSpec generated output.
- Create `benchmark/doc-quality/generalization/<sample>/codewiki/` from CodeWiki community baselines.
- Create `benchmark/doc-quality/generalization/<sample>/deepwiki/` from DeepWiki baselines.
- Create `benchmark/doc-quality/generalization/<sample>/judge/prompt.md`, `result.md`, and `result.json`.
- Create `benchmark/doc-quality/generalization/<sample>/REPORT.md`.
- Create `benchmark/doc-quality/generalization/REPORT.md` as the aggregate summary.

## Samples

| Sample | Source Root | CodeWiki Baseline | DeepWiki Baseline |
| --- | --- | --- | --- |
| `mind-cluster` | `../codewiki-community/benchmark/gitcode/repos/mind-cluster` | existing `benchmark/doc-quality/mind-cluster-round2/community-judge-summary.json` plus `benchmark/doc-quality/mind-cluster/codewiki` | `benchmark/doc-quality/mind-cluster/deepwiki` |
| `recsdk` | `../codewiki-community/benchmark/gitcode/repos/RecSDK` | `../codewiki-community/benchmark/gitcode/codewiki-docs/Ascend_RecSDK_glm-5_benchmark_docs` | `../codewiki-community/benchmark/gitcode/deepwiki-answers/answers.md` filtered to RecSDK sections when possible |
| `openharmony-arkui-water-flow` | `../codewiki-community/benchmark/gitcode/repos/openharmony/arkui_ace_engine` | `../codewiki-community/benchmark/gitcode/openharmony-doc-compare/codewiki-small/arkui_ace_engine_glm-5_v2_docs_20260520080045` | `../codewiki-community/benchmark/gitcode/openharmony-doc-compare/deepwiki-pages/arkui_ace_engine.html` |
| `openharmony-webview-ohos-nweb` | `../codewiki-community/benchmark/gitcode/repos/openharmony/web_webview` | `../codewiki-community/benchmark/gitcode/openharmony-doc-compare/codewiki-small/web_webview_glm-5_v2_docs_20260520080901` | `../codewiki-community/benchmark/gitcode/openharmony-doc-compare/deepwiki-pages/web_webview.html` |
| `openharmony-pasteboard-core` | `../codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard` | `../codewiki-community/benchmark/gitcode/openharmony-doc-compare/codewiki-small/distributeddatamgr_pasteboard_glm-5_v2_docs_20260520082539` | `../codewiki-community/benchmark/gitcode/openharmony-doc-compare/deepwiki-pages/distributeddatamgr_pasteboard.html` |

### Task 1: Create Benchmark Scaffold

**Files:**
- Create: `benchmark/doc-quality/generalization/README.md`
- Create directories under `benchmark/doc-quality/generalization/`

- [ ] **Step 1: Create directories**

Run:

```powershell
$root = "benchmark\doc-quality\generalization"
$samples = @(
  "mind-cluster",
  "recsdk",
  "openharmony-arkui-water-flow",
  "openharmony-webview-ohos-nweb",
  "openharmony-pasteboard-core"
)
New-Item -ItemType Directory -Force $root | Out-Null
foreach ($sample in $samples) {
  New-Item -ItemType Directory -Force "$root\$sample\matspec" | Out-Null
  New-Item -ItemType Directory -Force "$root\$sample\codewiki" | Out-Null
  New-Item -ItemType Directory -Force "$root\$sample\deepwiki" | Out-Null
  New-Item -ItemType Directory -Force "$root\$sample\judge" | Out-Null
}
```

Expected: all sample directories exist.

- [ ] **Step 2: Write README**

Create `benchmark/doc-quality/generalization/README.md` with:

```markdown
# Document Quality Generalization Benchmark

This benchmark compares MatrixSpec round two, CodeWiki community, and DeepWiki on five repository shapes.

Rules:

- MatrixSpec documents are generated with `node bin/matspec.js --lang zh generate --runner codex --mode react`.
- MatrixSpec must use CLI runners only.
- The judge is a separate read-only Codex CLI run.
- Each judge prompt must inspect bounded source checkpoints before scoring.
- Scores use the same dimensions as `benchmark/doc-quality/mind-cluster-round2`.
- Conclusions are scoped to this five-sample benchmark.
```

- [ ] **Step 3: Commit scaffold**

Run:

```powershell
git add benchmark/doc-quality/generalization/README.md docs/superpowers/plans/2026-05-22-doc-quality-generalization.md
git commit -m "docs: plan document quality generalization"
```

Expected: commit succeeds.

### Task 2: Collect Baselines

**Files:**
- Populate: `benchmark/doc-quality/generalization/*/codewiki/`
- Populate: `benchmark/doc-quality/generalization/*/deepwiki/`

- [ ] **Step 1: Copy `mind-cluster` baselines**

Run:

```powershell
Copy-Item -Recurse -Force benchmark\doc-quality\mind-cluster\codewiki\* benchmark\doc-quality\generalization\mind-cluster\codewiki\
Copy-Item -Recurse -Force benchmark\doc-quality\mind-cluster\deepwiki\* benchmark\doc-quality\generalization\mind-cluster\deepwiki\
Copy-Item -Force benchmark\doc-quality\mind-cluster-round2\community-judge-summary.json benchmark\doc-quality\generalization\mind-cluster\community-judge-summary.json
```

Expected: `mind-cluster` has CodeWiki and DeepWiki baseline files.

- [ ] **Step 2: Copy `RecSDK` baselines**

Run:

```powershell
Copy-Item -Recurse -Force ..\codewiki-community\benchmark\gitcode\codewiki-docs\Ascend_RecSDK_glm-5_benchmark_docs\* benchmark\doc-quality\generalization\recsdk\codewiki\
Copy-Item -Force ..\codewiki-community\benchmark\gitcode\deepwiki-answers\answers.md benchmark\doc-quality\generalization\recsdk\deepwiki\answers.md
Copy-Item -Force ..\codewiki-community\benchmark\gitcode\deepwiki-answers\answers.json benchmark\doc-quality\generalization\recsdk\deepwiki\answers.json
```

Expected: `recsdk` has CodeWiki docs and DeepWiki answer material.

- [ ] **Step 3: Copy OpenHarmony baselines**

Run:

```powershell
Copy-Item -Recurse -Force ..\codewiki-community\benchmark\gitcode\openharmony-doc-compare\codewiki-small\arkui_ace_engine_glm-5_v2_docs_20260520080045\* benchmark\doc-quality\generalization\openharmony-arkui-water-flow\codewiki\
Copy-Item -Force ..\codewiki-community\benchmark\gitcode\openharmony-doc-compare\deepwiki-pages\arkui_ace_engine.html benchmark\doc-quality\generalization\openharmony-arkui-water-flow\deepwiki\arkui_ace_engine.html

Copy-Item -Recurse -Force ..\codewiki-community\benchmark\gitcode\openharmony-doc-compare\codewiki-small\web_webview_glm-5_v2_docs_20260520080901\* benchmark\doc-quality\generalization\openharmony-webview-ohos-nweb\codewiki\
Copy-Item -Force ..\codewiki-community\benchmark\gitcode\openharmony-doc-compare\deepwiki-pages\web_webview.html benchmark\doc-quality\generalization\openharmony-webview-ohos-nweb\deepwiki\web_webview.html

Copy-Item -Recurse -Force ..\codewiki-community\benchmark\gitcode\openharmony-doc-compare\codewiki-small\distributeddatamgr_pasteboard_glm-5_v2_docs_20260520082539\* benchmark\doc-quality\generalization\openharmony-pasteboard-core\codewiki\
Copy-Item -Force ..\codewiki-community\benchmark\gitcode\openharmony-doc-compare\deepwiki-pages\distributeddatamgr_pasteboard.html benchmark\doc-quality\generalization\openharmony-pasteboard-core\deepwiki\distributeddatamgr_pasteboard.html
```

Expected: three OpenHarmony samples have CodeWiki and DeepWiki baselines.

- [ ] **Step 4: Commit baselines**

Run:

```powershell
git add benchmark/doc-quality/generalization
git commit -m "docs: add generalization baselines"
```

Expected: commit succeeds.

### Task 3: Generate MatrixSpec Outputs

**Files:**
- Populate: `benchmark/doc-quality/generalization/*/matspec/`

- [ ] **Step 1: Generate `mind-cluster` MatrixSpec docs**

Use existing round two output:

```powershell
Copy-Item -Recurse -Force benchmark\doc-quality\mind-cluster-round2\matspec\* benchmark\doc-quality\generalization\mind-cluster\matspec\
```

Expected: `mind-cluster/matspec` has `design.md`, `spec.md`, `plan.json`, `manifest.json`, and `modules/`.

- [ ] **Step 2: Generate `RecSDK` MatrixSpec docs**

Run:

```powershell
node bin/matspec.js --path ..\codewiki-community\benchmark\gitcode\repos\RecSDK --lang zh generate --runner codex --mode react --json
```

Expected: JSON includes `"ok": true` and a `runId`. Copy the run files from the printed output directory into `benchmark/doc-quality/generalization/recsdk/matspec/`.

- [ ] **Step 3: Generate `arkui_ace_engine` MatrixSpec docs**

Run:

```powershell
node bin/matspec.js --path ..\codewiki-community\benchmark\gitcode\repos\openharmony\arkui_ace_engine --lang zh generate --runner codex --mode react --json
```

Expected: JSON includes `"ok": true` and a `runId`. Copy the run files into `benchmark/doc-quality/generalization/openharmony-arkui-water-flow/matspec/`.

- [ ] **Step 4: Generate `web_webview` MatrixSpec docs**

Run:

```powershell
node bin/matspec.js --path ..\codewiki-community\benchmark\gitcode\repos\openharmony\web_webview --lang zh generate --runner codex --mode react --json
```

Expected: JSON includes `"ok": true` and a `runId`. Copy the run files into `benchmark/doc-quality/generalization/openharmony-webview-ohos-nweb/matspec/`.

- [ ] **Step 5: Generate `distributeddatamgr_pasteboard` MatrixSpec docs**

Run:

```powershell
node bin/matspec.js --path ..\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard --lang zh generate --runner codex --mode react --json
```

Expected: JSON includes `"ok": true` and a `runId`. Copy the run files into `benchmark/doc-quality/generalization/openharmony-pasteboard-core/matspec/`.

- [ ] **Step 6: Commit generated MatrixSpec outputs**

Run:

```powershell
git add benchmark/doc-quality/generalization
git commit -m "docs: add generalization matspec outputs"
```

Expected: commit succeeds.

### Task 4: Run Independent Judges

**Files:**
- Create: `benchmark/doc-quality/generalization/*/judge/prompt.md`
- Create: `benchmark/doc-quality/generalization/*/judge/result.md`
- Create: `benchmark/doc-quality/generalization/*/judge/result.json`

- [ ] **Step 1: Write one bounded judge prompt per sample**

Each prompt must include this scoring schema:

```json
{
  "winner": "MatrixSpec | CodeWiki community | DeepWiki | Tie",
  "ranking": ["..."],
  "scores": {
    "MatrixSpec": {
      "coverage": 0,
      "source_grounding": 0,
      "module_validity": 0,
      "architecture_clarity": 0,
      "developer_usability": 0,
      "hallucination_control": 0,
      "operational_completeness": 0,
      "total": 0
    }
  },
  "rationale": {},
  "weaknesses": {},
  "fairness_notes": ""
}
```

Expected: each prompt names its sample-specific source checkpoints and doc paths.

- [ ] **Step 2: Run `mind-cluster` judge**

Run:

```powershell
Get-Content -Raw benchmark\doc-quality\generalization\mind-cluster\judge\prompt.md |
  codex exec -C ..\codewiki-community\benchmark\gitcode\repos\mind-cluster --sandbox read-only --model gpt-5.5 --output-last-message benchmark\doc-quality\generalization\mind-cluster\judge\result.md -
```

Expected: result contains a JSON block.

- [ ] **Step 3: Run `recsdk` judge**

Run:

```powershell
Get-Content -Raw benchmark\doc-quality\generalization\recsdk\judge\prompt.md |
  codex exec -C ..\codewiki-community\benchmark\gitcode\repos\RecSDK --sandbox read-only --model gpt-5.5 --output-last-message benchmark\doc-quality\generalization\recsdk\judge\result.md -
```

Expected: result contains a JSON block.

- [ ] **Step 4: Run OpenHarmony judges**

Run:

```powershell
Get-Content -Raw benchmark\doc-quality\generalization\openharmony-arkui-water-flow\judge\prompt.md |
  codex exec -C ..\codewiki-community\benchmark\gitcode\repos\openharmony\arkui_ace_engine --sandbox read-only --model gpt-5.5 --output-last-message benchmark\doc-quality\generalization\openharmony-arkui-water-flow\judge\result.md -

Get-Content -Raw benchmark\doc-quality\generalization\openharmony-webview-ohos-nweb\judge\prompt.md |
  codex exec -C ..\codewiki-community\benchmark\gitcode\repos\openharmony\web_webview --sandbox read-only --model gpt-5.5 --output-last-message benchmark\doc-quality\generalization\openharmony-webview-ohos-nweb\judge\result.md -

Get-Content -Raw benchmark\doc-quality\generalization\openharmony-pasteboard-core\judge\prompt.md |
  codex exec -C ..\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard --sandbox read-only --model gpt-5.5 --output-last-message benchmark\doc-quality\generalization\openharmony-pasteboard-core\judge\result.md -
```

Expected: each result contains a JSON block.

- [ ] **Step 5: Extract and validate JSON**

For each result, extract the JSON object into `result.json`, then run:

```powershell
Get-ChildItem benchmark\doc-quality\generalization -Recurse -Filter result.json |
  ForEach-Object { Get-Content -Raw $_.FullName | ConvertFrom-Json | Out-Null; $_.FullName }
```

Expected: all five `result.json` files parse successfully.

- [ ] **Step 6: Commit judge results**

Run:

```powershell
git add benchmark/doc-quality/generalization
git commit -m "docs: add generalization judge results"
```

Expected: commit succeeds.

### Task 5: Write Reports and Verify

**Files:**
- Create: `benchmark/doc-quality/generalization/*/REPORT.md`
- Create: `benchmark/doc-quality/generalization/REPORT.md`

- [ ] **Step 1: Write sample reports**

Each sample report must include:

```markdown
# <Sample> Document Quality Comparison

## Scope

## Inputs

## Scores

## Findings

## Weaknesses

## Fairness Notes
```

Expected: each report quotes the corresponding `result.json` scores and does not invent extra scores.

- [ ] **Step 2: Write aggregate report**

Create `benchmark/doc-quality/generalization/REPORT.md` with:

```markdown
# Document Quality Generalization Report

## Scope

## Aggregate Results

## Per-Sample Results

## Per-Dimension Averages

## MatrixSpec vs DeepWiki

## MatrixSpec vs CodeWiki Community

## Remaining Weaknesses

## Next Optimization Backlog
```

Expected: aggregate claims are scoped to the five samples only.

- [ ] **Step 3: Verify files and JSON**

Run:

```powershell
Get-ChildItem benchmark\doc-quality\generalization -Recurse -Filter result.json |
  ForEach-Object { Get-Content -Raw $_.FullName | ConvertFrom-Json | Out-Null; $_.FullName }
git status --short --ignored benchmark\doc-quality\generalization benchmark\doc-quality\work
```

Expected: JSON parse succeeds; only intended report files are uncommitted; ignored work dirs stay ignored.

- [ ] **Step 4: Commit final reports**

Run:

```powershell
git add benchmark/doc-quality/generalization
git commit -m "docs: report document quality generalization"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: the plan covers five samples, baseline collection, MatrixSpec generation, independent judging, per-sample reports, aggregate report, JSON validation, and scoped conclusions.
- Placeholder scan: the plan contains no `TBD` or incomplete tasks.
- Type consistency: sample names, score dimensions, output paths, and commands match the design spec.

