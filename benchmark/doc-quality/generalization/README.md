# Document Quality Generalization Benchmark

This benchmark compares MatrixSpec round two, CodeWiki community, and DeepWiki on five repository shapes.

Rules:

- MatrixSpec documents are generated with `node bin/matspec.js --lang zh generate --runner codex --mode react`.
- MatrixSpec must use CLI runners only.
- The judge is a separate read-only Codex CLI run.
- Each judge prompt must inspect bounded source checkpoints before scoring.
- Scores use the same dimensions as `benchmark/doc-quality/mind-cluster-round2`.
- Conclusions are scoped to this five-sample benchmark.
