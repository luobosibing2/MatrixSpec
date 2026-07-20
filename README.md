# MatSpec

MatSpec 是 Markdown-first 的规格驱动开发 CLI。它从已有代码恢复全量 `spec.md` / `design.md`，再用可冻结、可审计的七阶段工作流管理每次变更。

```text
proposal → delta-spec → delta-design → tasks → validation → implementation → review → finalization/archive
```

## 快速开始

要求 Node.js 18 或更高版本。

```bash
npm install
matspec init
matspec generate
matspec show
matspec apply
```

开始一次变更：

```bash
matspec start AR-feature-name
matspec go --json
matspec accept
matspec implement --run --json
matspec review
matspec done
```

Coding Agent 的统一入口是 `/matspec`。非交互初始化默认安装 `nga` 集成，也可显式选择 `opencode`、`codegenie`、`codeagent`、`chrys`、`claude-code` 或 `none`。

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
```

`generate` 只在 `.matspec-cli/runs/` 写候选文档；`apply` 才会发布到 `matspec/specs/`，已有文件必须用 `--force` 才能覆盖。

## 生成与同步

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

也可以从 CodeWiki 同步：

```bash
matspec auth login
matspec sync
# 等价入口
matspec codewiki pull
```

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
npm run web
```

当前实现与行为契约见 [docs/full-spec.md](docs/full-spec.md) 和 [docs/full-design.md](docs/full-design.md)。产品、命令、目录、环境变量和 Agent 命令统一使用 `matspec` / `MATSPEC_*`，不提供旧名称兼容入口。
