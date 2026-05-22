# OpenHarmony ArkUI WaterFlow Document Quality Comparison

## Scope

This sample evaluates `arkui_ace_engine` with a focus on `frameworks/core/components_v2/water_flow`.

## Inputs

- MatrixSpec: `matspec/`
- CodeWiki community: `codewiki/`
- DeepWiki: `deepwiki/`
- Judge: `judge/result.json`

## Scores

| Tool | Total | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CodeWiki community | 468 | 78 | 62 | 78 | 72 | 70 | 58 | 50 |
| DeepWiki | 170 | 8 | 35 | 10 | 35 | 22 | 35 | 25 |
| MatrixSpec | 165 | 10 | 25 | 5 | 30 | 20 | 45 | 30 |

Ranking: CodeWiki community > DeepWiki > MatrixSpec.

## Findings

This is MatrixSpec's clearest failure case. The generated output stayed at repository level and missed the focused WaterFlow module almost entirely. CodeWiki community wins because it is the only documentation set centered on the requested module.

## Weaknesses

MatrixSpec's planner selected a fallback project-root module instead of `frameworks/core/components_v2/water_flow`. This exposes a concrete optimization target: focused subpath/module generation for large repositories.

## Fairness Notes

CodeWiki was penalized for stale line references and several overstated behavior claims, but it still won because the other two outputs were mostly generic repository overviews.

