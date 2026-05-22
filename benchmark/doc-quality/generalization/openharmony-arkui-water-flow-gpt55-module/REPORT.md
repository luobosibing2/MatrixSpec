# OpenHarmony ArkUI WaterFlow GPT-5.5 Module Quality Comparison

## Scope

This experiment tests MatrixSpec after changing the default Codex model to `gpt-5.5`, focused on `frameworks/core/components_v2/water_flow`.

Full project-level `matspec generate --runner codex --mode react` did not complete. It failed on the first broad `Inspector` module before reaching WaterFlow or final synthesis. The focused command did complete:

```powershell
node C:\Users\kvenu\playground\MatrixSpec\bin\matspec.js generate module frameworks/core/components_v2/water_flow --runner codex --mode react --json
```

The judge therefore scores the available MatrixSpec `gpt-5.5` focused module output and explicitly penalizes the missing final project-level `design.md/spec.md`.

## Inputs

- MatrixSpec gpt-5.5 module output: `matspec/`
- CodeWiki community baseline: `../openharmony-arkui-water-flow/codewiki/`
- DeepWiki baseline: `../openharmony-arkui-water-flow/deepwiki/`
- Judge prompt: `judge/prompt.md`
- Judge result: `judge/result.json`

## Scores

| Tool | Total | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MatrixSpec gpt-5.5 module output | 576 | 88 | 78 | 92 | 90 | 82 | 88 | 58 |
| CodeWiki community | 510 | 75 | 80 | 72 | 78 | 76 | 61 | 68 |
| DeepWiki | 91 | 5 | 8 | 3 | 15 | 10 | 30 | 20 |

Ranking from judge: MatrixSpec gpt-5.5 module output > CodeWiki community > DeepWiki.

## Findings

The focused gpt-5.5 module output is materially better than the previous module-level run. It wins on coverage, module validity, architecture clarity, developer usability, and hallucination control. CodeWiki keeps a small advantage in source grounding and operational completeness because it has stronger line-linked references and a more complete documentation package.

Compared with the previous MatrixSpec module benchmark on the same sample:

- MatrixSpec v2 module total: 500
- MatrixSpec gpt-5.5 module total: 576
- CodeWiki community in this run: 510
- DeepWiki in this run: 91

## Remaining Weaknesses

- Full project generation still fails before completion on a broad module, so this is not an end-to-end project documentation win.
- The MatrixSpec module manifest still reports no final `design.md/spec.md`.
- Source grounding should move from mostly file-level anchors to exact line-numbered references.
- Operational guidance should include a clearer WaterFlow-specific build/test command section.

## Conclusion

The gpt-5.5 default improves focused WaterFlow module quality enough to beat CodeWiki in this independent judge run: 576 vs 510. The next bottleneck is not model quality but pipeline robustness for broad module generation and final synthesis.
