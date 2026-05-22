# OpenHarmony ArkUI WaterFlow v2 Module Quality Comparison

## Scope

This experiment re-runs the MatrixSpec planner/generation path after the OpenHarmony component-planning fix, focused on `frameworks/core/components_v2/water_flow`.

Full project synthesis did not complete: the module-first generation produced module documents, but the final `design.md` synthesis prompt exceeded the local Codex context window. The judge therefore scores the available MatrixSpec v2 module output and explicitly penalizes the missing final `design.md/spec.md`.

## Inputs

- MatrixSpec v2 module output: `matspec/`
- CodeWiki community baseline: `../openharmony-arkui-water-flow/codewiki/`
- DeepWiki baseline: `../openharmony-arkui-water-flow/deepwiki/`
- Judge prompt: `judge/prompt.md`
- Judge result: `judge/result.json`

## Scores

| Tool | Total | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MatrixSpec v2 module output | 500 | 78 | 70 | 82 | 78 | 70 | 67 | 55 |
| CodeWiki community | 500 | 80 | 60 | 77 | 80 | 78 | 55 | 70 |
| DeepWiki | 170 | 10 | 30 | 5 | 35 | 20 | 45 | 25 |

Ranking from judge: MatrixSpec v2 module output > CodeWiki community > DeepWiki.

## Findings

The planner fix changed the failure mode substantially. The old MatrixSpec run planned only `Project Root` and scored 165. The new run plans `frameworks/core/components_v2/water_flow` and the judge credits it as the best focused match to the WaterFlow source area.

This is not yet a clean end-to-end win. Numeric total is tied with CodeWiki at 500, and MatrixSpec loses points because final `design.md/spec.md` were not produced. The remaining pipeline issue is synthesis context management after module generation.

## Remaining Weaknesses

- Final synthesis failed because the prompt included too much module content for the Codex context window.
- MatrixSpec module output lacks exact current line numbers for most source anchors.
- The judge found a few source inaccuracies around `WaterFlowComponent::Update`, `LayoutWaterFlowFooter`, `currentEvent_`, and the precise `BUILD.gn` target.
- Adjacent inspector and `scroll_bar_proxy` integration needs more coverage.

## Conclusion

Measured effect is positive but incomplete: MatrixSpec moved from a clear WaterFlow miss to a focused module-level tie/win against CodeWiki by judge ranking. The next optimization should be synthesis compression plus stronger line-number anchors, not another planner-only change.
