# 文档质量对比评测任务（受限抽样版）

你是独立评测者。请比较三套文档对 `mind-cluster` 仓库的文档质量。

输入路径：
- MatrixSpec: `C:\Users\kvenu\playground\MatrixSpec\benchmark\doc-quality\mind-cluster\matspec`
- CodeWiki community: `C:\Users\kvenu\playground\MatrixSpec\benchmark\doc-quality\mind-cluster\codewiki`
- DeepWiki: `C:\Users\kvenu\playground\MatrixSpec\benchmark\doc-quality\mind-cluster\deepwiki`
- 源码仓库: `C:\Users\kvenu\playground\MatrixSpec\benchmark\doc-quality\work\mind-cluster-source`
- community 既有两方评测摘要: `C:\Users\kvenu\playground\MatrixSpec\benchmark\doc-quality\mind-cluster\community-judge-summary.json`

硬性限制：
1. 不要递归打印整个源码树或整个 DeepWiki answers 文件。
2. 不要把长文件整文件输出到上下文。
3. 只做抽样核验：最多读取每套文档 5 个文件、每个文件最多前 120 行；最多读取 8 个源码文件、每个文件最多前 120 行或命中的 40 行上下文。
4. 必须至少核验这些源码区域是否被文档覆盖：`build/build_all.sh`、`build/build_each.sh`、`component/ascend-common`、`component/ascend-device-plugin`、`component/ascend-for-volcano`。
5. 可以用 `rg -n` 搜索关键词，但不要输出超过 80 行搜索结果。

评分维度固定为：coverage、source_grounding、module_validity、architecture_clarity、developer_usability、hallucination_control、operational_completeness。每项 0-100 分，totalScore 为七项相加。

请输出一个可解析 JSON 代码块，格式为：

```json
{
  "repo": "mind-cluster",
  "judgedAt": "2026-05-22",
  "scores": {
    "MatrixSpec": {"coverage": 0, "source_grounding": 0, "module_validity": 0, "architecture_clarity": 0, "developer_usability": 0, "hallucination_control": 0, "operational_completeness": 0, "totalScore": 0, "strengths": [], "weaknesses": []},
    "CodeWiki community": {"coverage": 0, "source_grounding": 0, "module_validity": 0, "architecture_clarity": 0, "developer_usability": 0, "hallucination_control": 0, "operational_completeness": 0, "totalScore": 0, "strengths": [], "weaknesses": []},
    "DeepWiki": {"coverage": 0, "source_grounding": 0, "module_validity": 0, "architecture_clarity": 0, "developer_usability": 0, "hallucination_control": 0, "operational_completeness": 0, "totalScore": 0, "strengths": [], "weaknesses": []}
  },
  "winner": "",
  "ranking": [],
  "rationale": "",
  "matrixSpecBacklog": []
}
```

JSON 后面再写一段中文简评。不要修改任何文件。
