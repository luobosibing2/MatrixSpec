# OpenHarmony Pasteboard Core Document Quality Comparison

## Scope

This sample evaluates `distributeddatamgr_pasteboard` with a focus on `services/core`.

## Inputs

- MatrixSpec: `matspec/`
- CodeWiki community: `codewiki/`
- DeepWiki: `deepwiki/`
- Judge: `judge/result.json`

## Scores

| Tool | Total | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MatrixSpec | 602 | 88 | 90 | 90 | 86 | 82 | 88 | 78 |
| DeepWiki | 578 | 86 | 84 | 86 | 84 | 80 | 76 | 82 |
| CodeWiki community | 285 | 45 | 35 | 40 | 55 | 45 | 30 | 35 |

Ranking: MatrixSpec > DeepWiki > CodeWiki community.

## Findings

MatrixSpec wins this former DeepWiki-strong sample. The judge credited the focused `services-core` module, accurate service boundaries, permission/IPC coverage, tests/CLI/build context, and explicit confirmed-versus-inferred labeling.

## Weaknesses

MatrixSpec still lacks exact runnable OpenHarmony build commands in some places. A few flow descriptions rely on function-name anchors rather than line-level excerpts.

## Fairness Notes

CodeWiki community was heavily penalized because multiple module pages contained generation failure messages and some surviving links used wrong repository-relative paths.

