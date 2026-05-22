# Document Quality Generalization Report

## Scope

This benchmark compares MatrixSpec round two, CodeWiki community, and DeepWiki on five samples. It is not a universal claim; it is a five-sample check of whether the `mind-cluster` improvement generalizes.

MatrixSpec generation used local CLI runners. Judging used separate read-only Codex CLI runs.

## Aggregate Results

| Sample | Winner | MatrixSpec | CodeWiki community | DeepWiki |
| --- | --- | ---: | ---: | ---: |
| `mind-cluster` | MatrixSpec | 644 | 428 | 415 |
| `recsdk` | CodeWiki community | 534 | 533 | 0 |
| `openharmony-arkui-water-flow` | CodeWiki community | 165 | 468 | 170 |
| `openharmony-webview-ohos-nweb` | DeepWiki | 540 | 551 | 617 |
| `openharmony-pasteboard-core` | MatrixSpec | 602 | 285 | 578 |

Judge-declared wins:

- MatrixSpec: 2
- CodeWiki community: 2
- DeepWiki: 1

Numeric average total:

- MatrixSpec: 497
- CodeWiki community: 453
- DeepWiki: 356

## Per-Dimension Averages

| Tool | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MatrixSpec | 67.2 | 74.4 | 64.2 | 73.0 | 70.0 | 76.0 | 72.2 | 497.0 |
| CodeWiki community | 71.2 | 60.8 | 70.4 | 73.2 | 67.2 | 55.2 | 55.0 | 453.0 |
| DeepWiki | 49.4 | 55.2 | 48.8 | 56.4 | 49.2 | 48.4 | 48.6 | 356.0 |

## MatrixSpec vs DeepWiki

By numeric score, MatrixSpec beats DeepWiki on 3 of 5 samples:

- Wins: `mind-cluster`, `recsdk`, `openharmony-pasteboard-core`
- Losses: `openharmony-arkui-water-flow`, `openharmony-webview-ohos-nweb`

The RecSDK DeepWiki baseline is not valid for that repository, so the meaningful MatrixSpec-vs-DeepWiki count is better treated as 2 wins, 2 losses, and 1 invalid baseline.

## MatrixSpec vs CodeWiki Community

By judge-declared winner, MatrixSpec beats CodeWiki community on 2 of 5 samples:

- Wins: `mind-cluster`, `openharmony-pasteboard-core`
- Losses: `recsdk`, `openharmony-arkui-water-flow`, `openharmony-webview-ohos-nweb`

The RecSDK result has a ranking/score inconsistency: judge ranking says CodeWiki wins, but numeric totals are MatrixSpec 534 and CodeWiki 533. The aggregate keeps the declared winner for win counts and keeps numeric totals for averages.

## Main Weaknesses

The experiment shows MatrixSpec round two did not fully generalize to focused submodule tasks in large repositories.

Observed failures:

- `RecSDK`: collapsed a large SDK into one project-root fallback module.
- `arkui-water-flow`: missed the requested WaterFlow path almost entirely.
- `webview-ohos-nweb`: covered the repository well but was less focused and less complete than DeepWiki on `ohos_nweb`.

Observed strengths:

- Strongest hallucination control average.
- Strongest source grounding average.
- Strong operational completeness average.
- Clear win on `mind-cluster`.
- Clear win on `pasteboard-core`, including a sample where previous CodeWiki output had generation failures.

## Next Optimization Backlog

1. Add focused-subpath generation mode so large repositories can target a module path such as `frameworks/core/components_v2/water_flow`.
2. Improve planner recognition for SDK repositories with `training/*`, `cust_op/*`, framework-version directories, and docs-heavy API surfaces.
3. Add validation that rejects a single `Project Root` fallback when the repository has many source-heavy top-level or second-level directories.
4. Add source-checkpoint prompts for focused module generation so docs do not drift into broad repository summaries.
5. Add report-time consistency checks for judge outputs, including ranking sorted by numeric total unless the judge explicitly explains an override.

## Conclusion

MatrixSpec round two improved strongly but is not yet consistently better than DeepWiki or CodeWiki community across repository shapes. The strongest current advantage is grounded, operational documentation when the planner selects real modules. The main blocker is planner focus: large repositories and SDK-style projects still need better module selection and focused-path generation.

