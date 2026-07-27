# MatSpec

**让 Coding Agent 先把需求说清楚，再开始改代码。**

MatSpec 为 Codex、OpenCode、Claude Code 等 Coding Agent 提供一套可确认、可回退、可审查的开发流程。你只需要提出需求、回答澄清问题并确认关键决策，Agent 会负责整理规格、拆解任务、实现代码、执行审查和归档证据。

## 为什么需要 MatSpec

普通 AI Coding 很容易从一句模糊需求直接进入实现。需求理解、设计选择和修复过程留在聊天记录里，一旦会话变长、换人或返工，Agent 就可能丢失约束。

MatSpec 把这条链路变成仓库内可追溯的开发过程：

```text
你提出需求
    ↓
Agent 阅读代码并澄清关键问题
    ↓
你确认需求和方案
    ↓
Agent 规划、实现并验证
    ↓
Agent 审查实现，必要时回退修订
    ↓
更新全量规格并归档本次变更
```

MatSpec 不替你决定业务需求。它负责让 Agent 在正确的阶段做正确的事，并把关键决策和验证结果留在仓库中。

## 快速开始

需要 Node.js 18 或更高版本，以及一个已经安装并登录的 Coding Agent。

> 当前版本尚未发布到 npm registry，以下使用源码安装。

```bash
git clone https://gitcode.com/OpenMatrix/MatrixSpec.git
cd MatrixSpec
npm install
npm link
matspec version
```

然后进入你真正要开发的项目：

```bash
cd /path/to/your-project

# 初始化 MatSpec，默认安装项目级 Codex 集成
matspec init

# 为本次需求创建一个变更
matspec start REQ-user-login
```

接下来打开 Codex：

```bash
codex
```

在 Codex 中输入：

```text
$matspec 推进当前 REQ-user-login：增加邮箱密码登录，并保持现有手机号登录兼容。
```

也可以直接说：

```text
使用 MatSpec 推进当前需求
```

`matspec start` 只创建本次变更的工作空间，详细需求在 Coding Agent 的对话中说明。从这里开始，Agent 会读取当前状态并推进正确阶段。`go`、`accept`、`implement`、`review`、`done` 等命令由 Agent 调用，普通用户不需要手工执行。

## 第一次使用会发生什么

MatSpec 不会让 Agent 在看到需求后立即写代码。一次典型交互是：

```text
你：$matspec 推进当前登录需求，需要增加邮箱密码登录，并兼容现有手机号登录。

Agent：我已经找到当前需求。开始前需要确认几个会影响实现的问题：
1. 未登录用户是否可以访问？
2. 是否需要兼容现有接口？
3. 失败时应该保留旧状态还是回滚？

你：回答问题。

Agent：需求已经整理完成。是否生成本阶段文档？

你：生成。

Agent：需求文档已经生成，请检查并确认。

你：确认。

Agent：需求已确认，接下来会继续拆解任务、实现和验证。
```

用户始终控制需求和关键决策；Agent 负责操作 MatSpec、读取代码、生成文档和执行开发任务。

## MatSpec、Agent 和用户分别负责什么

| 角色 | 责任 |
|---|---|
| 用户 | 提出需求、回答澄清问题、确认阶段结果、决定是否接受最终交付 |
| Coding Agent | 阅读仓库、生成规格和任务、修改代码、运行测试、执行审查、更新全量文档 |
| MatSpec CLI | 冻结工作流、记录状态、限制阶段写入、阻断不完整结果、保存审计证据 |

核心原则是：**用户管理需求和决策，Agent 操作 MatSpec，MatSpec 管理状态和约束。**

## 选择工作流

不知道选哪个时，使用默认的 Light。

| 模式 | 适合场景 | 区别 |
|---|---|---|
| Light，默认 | 普通功能、Bug 修复、中小型改动 | 不要求项目已经维护全量规格，澄清后直接进入任务和实现 |
| Standard | 已有全量规格，需要实现前一致性检查 | 在写代码前增加规格、任务和现有基线的一致性验证 |
| Full | 架构变化、安全、数据迁移、跨系统改动 | 增加独立设计阶段和实现前验证 |

```bash
matspec start REQ-normal-change
matspec start REQ-validated-change --profile standard
matspec start REQ-high-risk-change --profile full
```

三个 profile 的内部流程如下。它们主要供 Agent 和高级用户理解，普通用户不需要逐阶段操作：

```text
light（默认）: proposal → delta-spec → tasks → implementation → review → finalization/archive
standard:     proposal → delta-spec → tasks → validation → implementation → review → finalization/archive
full:         proposal → delta-spec → delta-design → tasks → validation → implementation → review → finalization/archive
```

## MatSpec 会替你守住什么

- Agent 在生成阶段文档前必须先澄清问题并获得确认。
- 每个阶段只能写入当前允许的文件，不能顺手修改其他规格或状态文件。
- 工作流、模板和命令会随 change 冻结，发生漂移后阻断推进。
- validation 或 review 给出 `revise` / `changes-required` 时不能继续完成。
- 后续发现需求或设计问题时，可以带审计原因回退到更早阶段。
- 完成前必须更新全量 `spec.md` / `design.md`，并通过项目验证。
- 每次变更最终归档到仓库，保留需求、实现和审查链路。

## 其他 Coding Agent

`matspec init` 默认安装 Codex 项目技能。也可以显式选择其他集成：

```bash
matspec init --integration opencode
matspec init --integration claude-code
matspec init --integration chrys
```

常用入口：

| Coding Agent | 在 Agent 对话框中使用 |
|---|---|
| Codex | `$matspec`，也可以通过 `/skills` 选择 |
| OpenCode | `/matspec` |
| Claude Code | `/matspec` |

查看当前版本支持的全部集成：

```bash
matspec integration list
```

## 从已有代码恢复全量规格

默认 Light 工作流不要求预先存在 `matspec/specs/spec.md` 和 `design.md`。如果项目希望先从代码恢复一份全量基线，可以在开始变更前执行：

```bash
matspec generate --runner codex
matspec show
matspec apply
```

`generate` 只在 `.matspec-cli/runs/` 中写候选文档；`show` 用于检查结果；`apply` 才会发布到 `matspec/specs/`。覆盖已有文件必须显式使用 `--force`。

生成过程不依赖独立的远程规格服务，但 Codex、Claude 或 OpenCode 等模型服务仍可能需要网络和账号认证。

常用生成 runner 包括 `opencode`、`codex`、`claude`、`chrys` 和 `opencode-serve`。默认 runner 是 `opencode`，完整列表以 `matspec help` 为准。

还支持聚焦模块、批量模块和补充领域知识：

```bash
matspec generate module src/auth --runner codex
matspec generate --batch modules.json --concurrency 4 --runner codex
matspec generate --knowledge docs/context --runner codex
```

## 产物在哪里

```text
matspec/
  specs/                         # 当前全量规格与设计
    spec.md
    design.md
  changes/
    {change}/                    # 当前变更的文档、状态和冻结工作流
      proposal.md
      delta-spec.md
      delta-design.md            # Full 使用
      tasks.md
      validation.md              # Standard / Full 使用
      review.md
      .matspec-state.json
      workflow.yaml
    archives/                    # 已完成变更

.matspec-cli/
  config.yaml
  workflows/
  workflow-commands/
  manifests/
  runs/                          # 全量规格候选产物
  report-queue/
  metrics.jsonl
```

## 高级使用

下面这些能力通常由 Agent 使用，或者用于调试和定制，不是完成第一次需求的前置知识。

### 查看和修复工作流状态

```bash
matspec status
matspec go --json
matspec accept
matspec back --to delta-spec --reason "validation blocker"
matspec implement --run --json
matspec review
matspec done
```

### 定制阶段、模板和领域扩展

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

每个 change 在创建时冻结工作流、模板和命令的 SHA-256。确认新版本兼容后，可以审计刷新：

```bash
matspec workflow refresh-snapshot <change> --confirm-compatible "已审查模板变更"
```

### 查看时间、token 和工具成本

本地 `.matspec-cli/metrics.jsonl` 自动记录 CLI 时长和回退。Agent 还可以记录 turns、tool calls、token 与成本，并按 candidate、validation、review、operator 汇总：

```bash
matspec metrics record
matspec metrics show
```

## 开发与验证

```bash
npm test
npm pack --dry-run
npm run test:e2e:codex-revision
npm run web
```

当前实现与行为契约见 [docs/full-spec.md](docs/full-spec.md) 和 [docs/full-design.md](docs/full-design.md)。产品、命令、目录、环境变量和 Agent 命令统一使用 `matspec` / `MATSPEC_*`，不提供旧名称兼容入口。
