# Document Quality Comparison

This benchmark compares documentation quality across MatrixSpec, CodeWiki community, and DeepWiki.

The first run uses `mind-cluster` because `../codewiki-community/benchmark/gitcode` already contains source, CodeWiki docs, DeepWiki answers, and prior judge output for that repository.

Rules:
- MatrixSpec documents are generated with local `codex` CLI through `matspec generate`.
- The judge is a separate `codex exec` run.
- No LLM API provider is used.
- The judge must inspect source files before scoring.
- Results are stored as JSON plus Markdown.
