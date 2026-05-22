# MatrixSpec Round 2 Document Quality Experiment

## Scope

This experiment reruns the `mind-cluster` document quality comparison after the generate-quality round 2 implementation.

MatrixSpec round 2 was generated with local Codex CLI:

```bash
node bin/matspec.js --path benchmark/doc-quality/work/mind-cluster-source --lang zh generate --runner codex --mode react --json
```

Run ID: `20260522165724062`

The judge was also local Codex CLI, but used `gpt-5.5` because `gpt-5.3-codex-spark` hit its usage limit during judging. The evaluation prompt and scoring rubric were otherwise the same bounded-sampling document-quality rubric used in the first experiment.

## MatrixSpec Change Under Test

Round 2 includes:

- component-aware module planning for `component/*` style repositories
- bounded operational evidence from build/config/debug files
- stronger prompt requirements for source anchors, runbooks, debugging guidance, and certainty boundaries

For `mind-cluster`, the plan changed from one `Project Root` module to 8 component modules:

- `component/ascend-faultdiag`
- `component/clusterd`
- `component/ascend-faultdiag-online`
- `component/mindio`
- `component/ascend-for-volcano`
- `component/taskd`
- `component/ascend-common`
- `component/ascend-device-plugin`

## Scores

| Tool | Total | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| MatrixSpec round2 | 639 | 94 | 92 | 95 | 91 | 88 | 89 | 90 |
| CodeWiki community | 479 | 75 | 65 | 72 | 78 | 73 | 55 | 61 |
| DeepWiki | 462 | 68 | 70 | 60 | 74 | 62 | 62 | 66 |

Ranking:

1. MatrixSpec round2
2. CodeWiki community
3. DeepWiki

## Delta From Previous MatrixSpec Run

Previous MatrixSpec bounded-sampling score: 516.

Round 2 MatrixSpec bounded-sampling score: 639.

Delta: +123.

The strongest improvements came from:

- real component modules instead of one root fallback
- explicit coverage of `build/build_all.sh`, `build/build_each.sh`, `component/ascend-common`, `component/ascend-device-plugin`, and `component/ascend-for-volcano`
- more operational content around build, deployment, validation, and troubleshooting
- stronger source-grounded module documents

## Judge Summary

The judge concluded that MatrixSpec round2 won because it covered the required source regions as a coherent documentation system and matched sampled source facts better than the baselines. CodeWiki remained readable and useful, but the judge found more inferred content and some operational drift, especially around `service_config.ini` and Go version details. DeepWiki remained useful as a QA-style supplement, but was less cohesive as a maintainable documentation set.

## Remaining Backlog

- Add a one-page new-developer navigation guide.
- Split long source-anchor tables into a searchable index.
- Resolve or clearly label DFX scale/latency/throughput constraints that are not source-confirmed.
- Add a focused `build/service_config.ini` note: the sampled source only confirms `mind-cluster-version`.
- Add prerequisites and failure symptoms for key operations such as Volcano plugin name mismatch, kubelet socket registration failure, and missing `device-info` ConfigMap.
