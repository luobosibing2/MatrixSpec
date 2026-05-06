# MatSpec

先恢复系统全量规格，再安全地做增量变更。

MatSpec 是面向已有代码库的规格驱动开发工作流。它先扫描仓库，恢复全量 `spec.md` 和 `design.md`，再把每个新需求放进 proposal、spec 增量、design 增量、任务拆解、一致性验证、实现和归档流程。

## 核心差异

很多 AI coding 工作流从“下一个需求”开始。MatSpec 从更早的一层开始：先让 agent 理解当前仓库，形成稳定的业务规格和软件设计基线，然后再修改。

```text
恢复全量 spec/design -> 需求澄清 -> spec 增量 -> design 增量 -> 任务拆解 -> 一致性验证 -> 实现 -> 归档
```

这使它更适合 brownfield 项目，而不只是新项目。

## 快速开始

```bash
matspec init
matspec generate
matspec show
matspec apply
```

新需求：

```bash
matspec start REQ20260428-owner-phone-validation
matspec go --json
matspec accept
matspec validate
matspec done
```

Agent 入口：

```text
/matspec
```

## 中文命令行

MatSpec 默认英文输出。需要中文输出时使用：

```bash
matspec --lang zh-CN --help
matspec --lang zh-CN init
```

或设置环境变量：

```bash
$env:MATSPEC_LANG = "zh-CN"
matspec --help
```

## 目录结构

```text
matspec/
  specs/
    spec.md
    design.md
  changes/
    REQ20260428-owner-phone-validation/
      proposal.md
      delta-spec.md
      delta-design.md
      tasks.md
      validation.md
      .matspec-state.json
    archives/

.matspec-cli/
  config.yaml
  runs/
```

`generate` 只写入 `.matspec-cli/runs/` 候选产物。`apply` 才会把审查后的文档发布到 `matspec/specs/`。已有全量规格默认不会被覆盖，除非显式传 `--force`。

## 为什么不是普通增量 spec

OpenSpec 类工具很适合轻量增量变更，但如果没有恢复当前系统的全量基线，增量 spec 容易漂移。MatSpec 的重点是：

- 先恢复全量业务规格 `spec.md`
- 先恢复全量软件设计 `design.md`
- 每个增量变更都必须对齐这两个基线
- Agent 只能写 CLI 授权的阶段产物
- validation 之后不能立刻 done，必须先实现和验证

## Agent 集成

```bash
matspec integration install all
```

支持仓库级：

- opencode commands
- Claude Code commands and skills
- Codex repository skills

## 开发验证

```bash
npm test
node bin/matspec.js --help
node bin/matspec.js --lang zh-CN --help
```

## 来源与致谢

MatSpec 基于 MetaSpec 派生，并在此基础上进行中文文档、本地化命令入口和命名调整。

MetaSpec 原项目：https://github.com/kvenux/metaspec
