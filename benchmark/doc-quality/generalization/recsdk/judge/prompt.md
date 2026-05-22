You are judging document quality for the `RecSDK` repository.

Source root is the current working directory. Before scoring, inspect a bounded sample of source files and docs:

- top-level README or docs files
- build/config files at the repository root
- representative API entry points under source directories
- representative examples or tests if present
- package/build metadata if present

Compare these documentation sets:

- MatrixSpec: `C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/generalization/recsdk/matspec`
- CodeWiki community: `C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/generalization/recsdk/codewiki`
- DeepWiki: `C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/generalization/recsdk/deepwiki`

Score each tool from 0 to 100 on:

- coverage
- source_grounding
- module_validity
- architecture_clarity
- developer_usability
- hallucination_control
- operational_completeness

Total is the sum of the seven dimensions.

Judge based on evidence from the sampled source and documents. Penalize unsupported claims, missing source-grounded references, module plans that do not match real repository structure, and missing build/config/debug guidance. Reward precise source references, accurate module boundaries, practical developer guidance, and clear uncertainty boundaries.

Return only one valid JSON object with this schema:

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
    },
    "CodeWiki community": {
      "coverage": 0,
      "source_grounding": 0,
      "module_validity": 0,
      "architecture_clarity": 0,
      "developer_usability": 0,
      "hallucination_control": 0,
      "operational_completeness": 0,
      "total": 0
    },
    "DeepWiki": {
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
  "rationale": {
    "MatrixSpec": "",
    "CodeWiki community": "",
    "DeepWiki": ""
  },
  "weaknesses": {
    "MatrixSpec": [],
    "CodeWiki community": [],
    "DeepWiki": []
  },
  "fairness_notes": ""
}
