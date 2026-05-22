# Planner Focus Generalization Design

## Objective

Fix the document generation failure exposed by the `openharmony-arkui-water-flow` benchmark: MatrixSpec generated a repository-level `Project Root` document while the evaluation target was the focused module `frameworks/core/components_v2/water_flow`.

The optimization should improve default module planning for large repositories and make focused-module experiments explicit and fair.

## Problem

The failed run produced this plan:

```json
{
  "modules": [
    {
      "name": "Project Root",
      "path": ".",
      "description": "Fallback module for a small project without obvious source module directories."
    }
  ]
}
```

This was wrong for two reasons:

1. `arkui_ace_engine` is not a small project. The run scanned more than 25,000 files and included more than 16,000 files.
2. The benchmark target was a focused module, but default `matspec generate` had no target path and the deterministic planner did not recognize OpenHarmony paths such as `frameworks/core/components_v2/*`.

Codex CLI did not make the bad plan. The local planner made the plan, and Codex CLI generated documents from that plan.

## Chosen Approach

Use a two-layer fix:

1. Improve deterministic planning so default `matspec generate` handles more large-repository shapes.
2. Treat focused benchmark samples as focused generation tasks instead of comparing a full-repository MatrixSpec output against module-specific CodeWiki output.

This avoids hiding a planner bug behind manual target paths while also avoiding unfair benchmark comparisons.

## Planner Changes

### Large Repository Guard

Add a large-repository guard using available scan data:

- `includedFiles.length >= 1000`, or
- `sourceFileStats.length >= 1000`

When a large repository has no detected modules:

- do not describe the fallback as a small project
- return a neutral fallback description such as `Fallback module because no safe module boundaries were detected`
- attach warning metadata where the current result shape supports it, or keep the warning in the module description if planner return shape remains unchanged

The planner should preserve small-project fallback behavior for genuinely small repositories.

### OpenHarmony Module Discovery

Add deterministic discovery for common OpenHarmony paths:

- `frameworks/core/components_v2/<module>`
- `frameworks/core/components_ng/pattern/<module>`
- `frameworks/core/interfaces/native/<module>`
- `frameworks/bridge/<subsystem>`
- `adapter/<platform>`
- `interfaces/<surface>`

For `frameworks/core/components_v2/water_flow`, the planner should produce at least:

```json
{
  "name": "Water Flow",
  "path": "frameworks/core/components_v2/water_flow",
  "description": "OpenHarmony component module discovered under frameworks/core/components_v2."
}
```

The planner should still cap module count so OpenHarmony repositories do not explode into hundreds of component modules. Existing `MAX_COMPONENT_MODULES` behavior can be reused or generalized.

### SDK Repository Discovery

Add deterministic discovery for SDK-style repositories:

- `training/<framework_or_version>`
- `cust_op/<operator_package>`
- `docs/<language_or_area>` only when source directories are otherwise under-covered

For a RecSDK-like repository, the planner should produce modules such as:

- `training/tf_rec_v1`
- `training/tf_rec_v2`
- `training/torch_rec_v1`
- `training/torch_rec_v2`
- `cust_op/tf_cpu_op`

This prevents large SDK repositories from collapsing into one `Project Root` module.

## Focused Benchmark Changes

The benchmark should distinguish two experiment types:

- full-repository generation: `matspec generate`
- focused-module generation: `matspec generate module <path>`

For samples whose baseline is explicitly module-specific, such as `openharmony-arkui-water-flow`, the experiment report should label the run as focused-module comparison.

If the benchmark needs full `design.md` and `spec.md` for a focused module later, that should be a separate enhancement. The current minimum fix is to avoid judging a full-repository MatrixSpec output against a focused module baseline without marking the mismatch.

## Error Handling

- Missing target module path should keep the existing warning behavior from `generate module`.
- Large repositories with no detected modules should produce a non-misleading fallback description.
- If a focused benchmark uses module-only output, the report must state that MatrixSpec did not produce full project-level `design.md` and `spec.md` for that sample.
- If planner discovers too many candidates, it should rank by source file count, source lines, then path name and keep a bounded number.

## Testing

Add tests in `test/cli.test.js`:

1. OpenHarmony `components_v2` fixture:
   - source files under `frameworks/core/components_v2/water_flow`
   - expected module path: `frameworks/core/components_v2/water_flow`

2. OpenHarmony `components_ng/pattern` fixture:
   - source files under `frameworks/core/components_ng/pattern/list`
   - expected module path: `frameworks/core/components_ng/pattern/list`

3. RecSDK fixture:
   - source files under `training/tf_rec_v1`, `training/torch_rec_v2`, `cust_op/tf_cpu_op`
   - expected module paths include those directories

4. Large fallback fixture:
   - more than 1,000 synthetic source files
   - no recognized module roots
   - expected fallback description does not contain `small project`

5. Small fallback fixture:
   - a tiny repository with no obvious module roots
   - existing `Project Root` behavior remains acceptable

Run `npm test` after implementation.

## Success Criteria

- Planner no longer labels a large repository fallback as a small project.
- Synthetic OpenHarmony fixtures plan focused module paths instead of `Project Root`.
- Synthetic RecSDK fixtures plan framework/operator modules instead of `Project Root`.
- Existing `mind-cluster` component planning remains unchanged.
- No LLM API provider is added; generation still uses Codex CLI / Claude Code CLI / opencode CLI runners.

## Follow-Up Experiment

After implementation, rerun at least the `openharmony-arkui-water-flow` sample:

1. Generate with the improved planner and record whether the default plan finds `frameworks/core/components_v2/water_flow`.
2. Run a focused-module comparison using `matspec generate module frameworks/core/components_v2/water_flow`.
3. Judge the focused output against CodeWiki community and DeepWiki with the same bounded source checkpoints.
4. Update the generalization report with a clearly labeled round-two focused result.

