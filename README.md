# MatSpec

MatSpec 是 Markdown-first 的规格驱动开发 CLI。它用可冻结、可审计的工作流管理每次变更，也可以从已有代码恢复全量 `spec.md` / `design.md`。默认采用 **Light + 无预置基线**：直接从需求、代码库事实和澄清结果开始，不要求先生成全量文档。

```text
light（默认）: proposal → delta-spec → tasks → implementation → review → finalization/archive
standard:     proposal → delta-spec → tasks → validation → implementation → review → finalization/archive
full:         proposal → delta-spec → delta-design → tasks → validation → implementation → review → finalization/archive
```

## 快速开始

要求 Node.js 18 或更高版本。

```bash
npm install
matspec init
matspec start AR-feature-name
matspec go --json
```

默认 Light 流程允许 `matspec/specs/spec.md` 和 `design.md` 不存在。Agent 会从仓库代码和已确认的 change 文档推进；实现与 review 完成后，在 `done` finalization 中首次创建或更新全量文档。

需要实现前一致性验证时显式选择 Standard；高风险变更需要独立设计阶段时选择 Full：

```bash
matspec start AR-validated-change --profile standard
matspec start AR-high-risk-change --profile full
```

如果项目希望先恢复全量基线，仍可在开始变更前显式执行：

```bash
matspec generate
matspec show
matspec apply
```

通用阶段命令：

```bash
matspec accept
matspec back --to delta-spec --reason "validation blocker"
matspec implement --run --json
matspec review
matspec done
```

Coding Agent 的统一入口是 `/matspec`。非交互初始化默认安装 `nga` 集成，也可显式选择 `opencode`、`codegenie`、`codeagent`、`chrys`、`claude-code` 或 `none`。

Standard/Full 的 `validation.md` 和所有 profile 的 `review.md` 使用 YAML front matter 给出机器可判定的 verdict。`revise` / `changes-required` 不会推进状态；CLI 会返回 blocker 与修复目标，随后可用带审计原因的 `matspec back` 回到目标阶段。全量文档状态在进入 implementation 前捕获：已有文档必须在 finalization 中更新；Light 无基线模式则必须创建缺失文档。

`go --json` 默认返回小于 3KB 的紧凑阶段上下文；需要模板时执行返回的 `templateCommand`（即带 `--with-template` 的 go），这样读取的是 change 已冻结的模板引用。本地 `.matspec-cli/metrics.jsonl` 自动记录 CLI 时长和回退，也可用 `matspec metrics record` 写入 agent turns、tool calls、token 与成本，`matspec metrics show` 按 candidate / validation / review / operator 汇总。

## 核心目录

```text
matspec/
  specs/
    spec.md
    design.md
  changes/
    {change}/
      proposal.md
      delta-spec.md
      delta-design.md
      tasks.md
      validation.md
      review.md
      .matspec-state.json
      workflow.yaml
    archives/
  templates/
  extensions/

.matspec-cli/
  config.yaml
  workflows/
  workflow-commands/
  manifests/
  runs/
  report-queue/
  metrics.jsonl
```

`generate` 只在 `.matspec-cli/runs/` 写候选文档；`apply` 才会发布到 `matspec/specs/`，已有文件必须用 `--force` 才能覆盖。它们是可选的 baseline recovery 工具，不是默认 Light 工作流的前置步骤。

## 离线生成

默认 runner 是 `opencode`，支持：

```text
opencode  opencode-serve  relay-serve  relay-pool
nga       codegenie       codeagent    chrys
```

模块分析默认并发 2、最多 10，默认重试 3 次。支持聚焦模块、batch、多路径模块、知识文件、显式 full 模板和领域扩展：

```bash
matspec generate module src/auth
matspec generate --batch modules.json --concurrency 4
matspec generate --knowledge docs/context
```

全量文档只通过本地 `generate → show → apply` 流程产生，不依赖远程规格服务。

## 工作流定制

```bash
matspec stages init
matspec stages add security-review --after tasks --delegate stage-generator
matspec stages validate

matspec template list
matspec template copy proposal
matspec template sync

matspec extension install harmonyos
matspec extension install ux
```

每个 change 在创建时冻结工作流、模板和命令的 SHA-256。引用发生漂移后，导航、确认和归档都会阻断；确认兼容后可审计刷新：

```bash
matspec workflow refresh-snapshot <change> --confirm-compatible "已审查模板变更"
```

## 开发验证

```bash
npm test
npm pack --dry-run
npm run test:e2e:codex-revision
npm run web
```

当前实现与行为契约见 [docs/full-spec.md](docs/full-spec.md) 和 [docs/full-design.md](docs/full-design.md)。产品、命令、目录、环境变量和 Agent 命令统一使用 `matspec` / `MATSPEC_*`，不提供旧名称兼容入口。
