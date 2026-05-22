# MatrixSpec vs CodeWiki community vs DeepWiki Document Quality

## Scope

This is the first small-sample document quality comparison. It uses the `mind-cluster` repository because `../codewiki-community/benchmark/gitcode` already contains:

- source repository: `repos/mind-cluster`
- CodeWiki community generated docs
- DeepWiki answer artifacts
- previous CodeWiki vs DeepWiki judge summary

MatrixSpec was generated locally with:

```bash
node bin/matspec.js --path benchmark/doc-quality/work/mind-cluster-source --lang zh generate --runner codex --mode react --json
```

The independent judge was run with local Codex CLI in read-only mode. No LLM API provider was added or used by MatrixSpec.

The final judge prompt is a bounded sampling prompt. It explicitly prevents recursive full-tree dumps and asks Codex to inspect a small set of source and document samples before scoring.

## Inputs

- MatrixSpec: `benchmark/doc-quality/mind-cluster/matspec/`
- CodeWiki community: `benchmark/doc-quality/mind-cluster/codewiki/`
- DeepWiki: `benchmark/doc-quality/mind-cluster/deepwiki/`
- Codex judge prompt: `benchmark/doc-quality/mind-cluster/judge/prompt.md`
- Codex judge Markdown: `benchmark/doc-quality/mind-cluster/judge/result.md`
- Codex judge JSON: `benchmark/doc-quality/mind-cluster/judge/result.json`

## Scores

| Tool | Total | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| CodeWiki community | 584 | 89 | 80 | 84 | 88 | 86 | 72 | 85 |
| MatrixSpec | 516 | 72 | 70 | 74 | 81 | 65 | 84 | 70 |
| DeepWiki | 449 | 60 | 55 | 70 | 78 | 50 | 64 | 52 |

Ranking:

1. CodeWiki community
2. MatrixSpec
3. DeepWiki

## Findings

CodeWiki community wins this bounded-sampling round. Its strongest advantages are module granularity, developer-oriented structure, and practical task coverage across architecture, concepts, interfaces, call chains, deployment, extension, and debugging.

MatrixSpec ranks second in this specific document-quality sampling. The judge found that the latest `matspec generate` output is no longer an empty shell: it covers the repository root, key component boundaries, and core areas such as `ascend-common`, `ascend-device-plugin`, and `ascend-for-volcano`. Its main weakness is execution depth: it still reads more like a governance/design baseline than a hands-on developer manual.

DeepWiki ranks third in this document-quality sampling. It remains useful as a quick QA and overview surface, but the sampled material had weaker source grounding, less stable file-level citation, and less operational detail than CodeWiki or MatrixSpec.

## Community Baseline Context

The imported CodeWiki community baseline previously scored CodeWiki above DeepWiki on the broader GitCode judge set:

- CodeWiki average: 79.45
- DeepWiki average: 63.33
- Wins: CodeWiki 32, DeepWiki 8

This MatrixSpec run is not directly comparable to the full 40-question QA benchmark because this round judged document quality directly with bounded sampling. It is still directionally consistent with the prior community result on the main point: CodeWiki remains the strongest when the task requires module-level engineering documentation.

## MatrixSpec Improvement Backlog

The Codex judge recommended these next changes:

- Add executable operations and development snippets: startup, build, validation, rollback, and failure drill commands.
- Add minimum verifiable source paths to the core/design output, with at least 3-5 key files and symbols.
- Make module responsibilities more decision-oriented: conventions, boundaries, compatibility evolution, and forbidden changes.
- Explain `build/build_all.sh` and `build/build_each.sh` outputs, failure modes, and prerequisites more precisely.

## Notes

This run intentionally used one repository first. The next useful step is to repeat the same flow on `RecSDK`, then decide whether to automate the prompt generation and JSON extraction.
