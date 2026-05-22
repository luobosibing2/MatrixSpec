You are judging document quality for the OpenHarmony `arkui_ace_engine` repository, focused on `frameworks/core/components_v2/water_flow`.

Source root is the current working directory. Before scoring, inspect a bounded sample of source files and docs:

- `frameworks/core/components_v2/water_flow`
- adjacent component registration or render pipeline references that mention WaterFlow
- top-level or nearby README/docs if present
- representative build metadata for the component area if present

Compare these documentation sets:

- MatrixSpec v2 module output: `C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/generalization/openharmony-arkui-water-flow-v2-module/matspec`
- CodeWiki community: `C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/generalization/openharmony-arkui-water-flow/codewiki`
- DeepWiki: `C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/generalization/openharmony-arkui-water-flow/deepwiki`

Important fairness note:

- MatrixSpec v2 failed final project-level synthesis because the design synthesis prompt exceeded the local Codex context window.
- Still score the available MatrixSpec v2 module output on the same quality dimensions, but penalize missing final `design.md/spec.md` where it affects developer usability or operational completeness.
- Do not give MatrixSpec credit for the previous MatrixSpec baseline output. Only use the v2 module output directory above.

Score each tool from 0 to 100 on:

- coverage
- source_grounding
- module_validity
- architecture_clarity
- developer_usability
- hallucination_control
- operational_completeness

Total is the sum of the seven dimensions.

Judge based on evidence from the sampled source and documents. Penalize unsupported claims, missing source-grounded references, module plans that do not match the focused module, and generic repository overviews that miss WaterFlow. Reward precise source references, accurate WaterFlow internals, practical developer guidance, and clear uncertainty boundaries.

Return only one valid JSON object with this schema:

{
  "winner": "MatrixSpec v2 module output | CodeWiki community | DeepWiki | Tie",
  "ranking": ["..."],
  "scores": {
    "MatrixSpec v2 module output": {
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
    "MatrixSpec v2 module output": "",
    "CodeWiki community": "",
    "DeepWiki": ""
  },
  "weaknesses": {
    "MatrixSpec v2 module output": [],
    "CodeWiki community": [],
    "DeepWiki": []
  },
  "fairness_notes": ""
}
