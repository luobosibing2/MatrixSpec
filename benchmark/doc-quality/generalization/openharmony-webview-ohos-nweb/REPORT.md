# OpenHarmony WebView ohos_nweb Document Quality Comparison

## Scope

This sample evaluates `web_webview` with a focus on `ohos_nweb` and its cross-layer integration.

## Inputs

- MatrixSpec: `matspec/`
- CodeWiki community: `codewiki/`
- DeepWiki: `deepwiki/`
- Judge: `judge/result.json`

## Scores

| Tool | Total | Coverage | Source Grounding | Module Validity | Architecture | Usability | Hallucination Control | Operations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DeepWiki | 617 | 91 | 92 | 88 | 90 | 86 | 86 | 84 |
| CodeWiki community | 551 | 80 | 76 | 82 | 83 | 84 | 72 | 74 |
| MatrixSpec | 540 | 74 | 80 | 72 | 78 | 76 | 82 | 78 |

Ranking: DeepWiki > CodeWiki community > MatrixSpec.

## Findings

DeepWiki wins because it combines broad WebView repository coverage with strong `ohos_nweb` source links and build/code-generation context. MatrixSpec is competitive with CodeWiki but too broad for the requested focus.

## Weaknesses

MatrixSpec over-spends attention on repository-level process and adjacent areas. It under-covers concrete `ohos_nweb` build targets, `nweb_helper.cpp`, `nweb_config_helper.cpp`, surface adapters, and exported inner kits.

## Fairness Notes

The judge credited DeepWiki breadth only where it stayed linked to real repository files. MatrixSpec's uncertainty boundaries helped hallucination control but did not offset the focus gap.

