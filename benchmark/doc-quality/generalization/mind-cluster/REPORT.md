# mind-cluster Document Quality Comparison

## Scope

This sample evaluates the multi-component MindCluster repository, with bounded checks over `README.md`, build scripts, `service_config.ini`, and representative component files.

## Inputs

- MatrixSpec: `matspec/`
- CodeWiki community: `codewiki/`
- DeepWiki: `deepwiki/`
- Judge: `judge/result.json`

## Scores

| Tool | Total | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MatrixSpec | 644 | 92 | 95 | 94 | 93 | 90 | 91 | 89 |
| CodeWiki community | 428 | 68 | 55 | 70 | 72 | 61 | 48 | 54 |
| DeepWiki | 415 | 62 | 65 | 60 | 73 | 58 | 45 | 52 |

Ranking: MatrixSpec > CodeWiki community > DeepWiki.

## Findings

MatrixSpec wins this sample. The judge credited its component-aware plan, accurate build/config interpretation, source anchors, and uncertainty boundaries.

## Weaknesses

MatrixSpec is broad and somewhat heavy for quick onboarding. Some low-priority components are covered by bounded inference rather than full expansion.

## Fairness Notes

The judge used bounded inspection of the requested files and component directories. Scores are scoped to that sample.

