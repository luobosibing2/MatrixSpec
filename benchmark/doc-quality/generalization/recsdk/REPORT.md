# RecSDK Document Quality Comparison

## Scope

This sample evaluates an SDK-style repository with TensorFlow, PyTorch, C++ custom operators, docs, packaging, and tests.

## Inputs

- MatrixSpec: `matspec/`
- CodeWiki community: `codewiki/`
- DeepWiki: `deepwiki/`
- Judge: `judge/result.json`

## Scores

| Tool | Total | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MatrixSpec | 534 | 72 | 82 | 60 | 78 | 82 | 74 | 86 |
| CodeWiki community | 533 | 85 | 76 | 82 | 84 | 76 | 68 | 62 |
| DeepWiki | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Ranking from judge: CodeWiki community > MatrixSpec > DeepWiki.

## Findings

The judge text says CodeWiki community wins on repository/module understanding, while MatrixSpec wins on operational completeness and confidence boundaries. The numeric totals are inconsistent with that ranking: MatrixSpec totals 534 and CodeWiki totals 533. The aggregate report preserves the judge's declared winner for win/loss counts and preserves the numeric scores for averages.

DeepWiki receives no credit because the supplied DeepWiki material was for `mind-cluster`, not RecSDK.

## Weaknesses

MatrixSpec collapsed RecSDK into one fallback module and under-covered real SDK surfaces such as `mxrec`, `dynamic_emb`, `hybrid_torchrec`, validators, and custom operator packages.

## Fairness Notes

The judge sampled README/build/package metadata, API entry points, validators, and tests. The baseline mismatch for DeepWiki makes this sample useful for MatrixSpec vs CodeWiki, but not useful for MatrixSpec vs a valid RecSDK DeepWiki page.

