# CodeSpec CLI 功能规格说明书

> 复刻基线：`@codespec/codespec-cli` `0.4.1-beta.3`  
> 文档状态：基于当前仓库源码、工作流包、模板与测试提炼  
> 目标：仅凭本文件与根目录 `design.md`，可重新实现行为兼容的 CodeSpec 工具；不要求读取本仓库其他 Markdown 文档

## 1. 产品定位

### 1.1 核心目标

CodeSpec 是一个面向规格驱动开发（Specification-Driven Development，SDD）的 Node.js 命令行工具。它以 Markdown 为业务真理源，把一次软件变更组织为可追溯、需人工确认、可由 Coding Agent 执行的线性工作流。

工具必须解决以下问题：

1. 为项目建立统一的全量规格、增量变更、归档和运行时目录。
2. 用固定或可扩展的阶段链管理需求澄清、规格、设计、任务、验证、实现和审查。
3. 在每个文档阶段完成后要求用户确认，禁止无确认自动推进。
4. 将阶段命令、模板和 SubAgent 定义安装到多种 Coding Agent 环境。
5. 从现有代码仓生成候选全量 `spec.md` 和 `design.md`，审查后才应用为权威文档。
6. 在结束变更前验证阶段状态，并验证全量规格和设计已在实现后刷新。

### 1.2 权威资产

权威业务资产必须是 Markdown：

```text
codespec/specs/spec.md
codespec/specs/design.md
codespec/changes/{change}/proposal.md
codespec/changes/{change}/delta-spec.md
codespec/changes/{change}/delta-design.md
codespec/changes/{change}/tasks.md
codespec/changes/{change}/validation.md
codespec/changes/{change}/review.md
```

`.codespec-state.json`、workflow YAML、manifest、run 日志和遥测队列仅是工具状态，不得替代 Markdown 规格。`codespec/data/*.json` 被视为违反核心方法的资产。

### 1.3 产品边界

CodeSpec CLI 负责：

- 项目初始化、变更创建、状态推进、检查和归档。
- 工作流包、项目工作流、模板、扩展和 Agent 集成管理。
- 候选全量文档生成、展示和应用。
- 实现任务上下文解析和任务状态标记。
- 命令输出、错误契约、更新检查和匿名/登录态使用上报。

CodeSpec CLI 不负责：

- 自身直接理解并修改业务实现代码；实现由外部 Coding Agent/SubAgent 完成。
- 自动批准阶段内容。
- 在 `start` 时复制空阶段模板到业务变更目录。
- 在 `init` 时用模板伪造全量 `spec.md` 或 `design.md`。
- 提供遥测服务端或 Dashboard 后端。
- 将静态官网或运营 Dashboard 作为 SDD 主流程的运行时依赖。

## 2. 用户与外部系统

### 2.1 用户角色

| 角色 | 能力 |
|---|---|
| 开发者 | 初始化项目、创建变更、生成文档、执行任务、完成归档 |
| 需求/产品/架构评审者 | 审查阶段 Markdown 并明确确认或拒绝 |
| 主 Agent | 调用 `go --json` 获取阶段，生成主 Agent 阶段文档，协调 SubAgent |
| `stage-generator` | 独立探索代码库，生成 `validation.md` 或 `review.md` |
| `task-executor` | 按 CLI 注入的单个 Task 上下文实现代码并返回标准报告 |
| CI/自动化 | 使用 `--json`、非交互 runner 和退出码集成 |

### 2.2 外部依赖

| 外部系统 | 用途 | 是否为核心工作流必需 |
|---|---|---|
| 本地文件系统 | Markdown、配置、状态、日志、manifest | 是 |
| Git | 推导 origin、分支、当前 commit | 部分命令需要 |
| Coding Agent CLI/API | 生成全量文档和执行阶段 | 生成/Agent 流程需要 |
| CodeSpec 遥测服务 | 使用统计 | 否，失败不得阻断命令 |
| 公司 npm 仓 | 版本检查和自更新提示 | 否，失败静默 |

## 3. 运行与打包约束

### 3.1 包信息

| 项目 | 规格 |
|---|---|
| npm 包名 | `@codespec/codespec-cli` |
| 当前版本 | `0.4.1-beta.3` |
| 模块系统 | ESM，`"type": "module"` |
| 可执行命令 | `codespec` |
| 入口 | `bin/codespec.js` |
| Node.js | `>=18.0.0` |
| 操作系统 | Windows、Linux、macOS |
| 测试 | Node 内置 `node:test`，命令 `npm test` |

### 3.2 运行依赖

复刻实现应使用以下能力或行为等价物：

- `@inquirer/prompts`：交互式输入。
- `@opencode-ai/sdk`：`opencode-serve` runner。
- `iconv-lite`：CodeAgent stderr 的 GBK 解码。
- `ignore`：`.gitignore` 规则处理。
- `js-yaml` 和 `yaml`：YAML 解析/序列化。
- `ws`：Relay WebSocket runner。
- Node 标准库：文件、路径、进程、加密、HTTP(S)、readline、child process。

### 3.3 入口行为

`bin/codespec.js` 必须：

1. 动态导入 `src/cli.js` 并调用 `main(process.argv.slice(2))`。
2. 捕获未处理异常。
3. 普通模式向 stderr 输出中文错误及可用的 `path/reason/marker/line/excerpt/stdoutPreview/diagnostics/next`。
4. `--json` 模式向 stderr 输出结构化错误。
5. 错误进程退出码为 `1`。
6. Unix shebang 使用 LF，发布时保证可执行权限。

标准异常 JSON：

```json
{
  "ok": false,
  "code": "CLI_ERROR",
  "message": "错误信息",
  "path": "可选路径",
  "reason": "可选原因",
  "marker": "可选模板命中内容",
  "line": 12,
  "excerpt": "可选原文",
  "next": ["可执行的恢复动作"]
}
```

## 4. 项目文件系统契约

### 4.1 初始化后的目录

```text
project-root/
├─ codespec/
│  ├─ specs/
│  │  ├─ spec.md                 # 不由 init 创建
│  │  └─ design.md               # 不由 init 创建
│  ├─ changes/
│  │  ├─ archives/
│  │  └─ {change}/
│  │     ├─ .codespec-state.json
│  │     ├─ workflow.yaml
│  │     ├─ proposal.md
│  │     ├─ delta-spec.md
│  │     ├─ delta-design.md
│  │     ├─ tasks.md
│  │     ├─ validation.md
│  │     └─ review.md
│  ├─ guidelines/
│  ├─ templates/                 # 可选项目级阶段模板
│  └─ extensions/                # 已安装领域模板扩展
├─ .codespec-cli/
│  ├─ config.yaml
│  ├─ manifests/
│  │  └─ integrations/
│  ├─ workflows/
│  │  └─ project.yaml            # 可选项目工作流
│  ├─ workflow-commands/         # 项目自定义阶段命令
│  ├─ presets/
│  ├─ integrations/
│  ├─ extensions/
│  ├─ runs/
│  ├─ cache/
│  ├─ tmp/
│  └─ report-queue/
└─ .gitignore
```

用户级文件：

```text
~/.codespec/
└─ templates/
   ├─ proposal.md
   ├─ delta-spec.md
   ├─ delta-design.md
   ├─ tasks.md
   ├─ validation.md
   ├─ review.md
   └─ full/...

~/.codespec-cli/
├─ update-cache.json
└─ sync-manifest.json
```

### 4.2 `.gitignore`

`init` 必须幂等追加以下精确条目：

```gitignore
.codespec-cli/runs/
.codespec-cli/cache/
.codespec-cli/tmp/
.codespec-cli/report-queue/
```

### 4.3 默认配置

`.codespec-cli/config.yaml` 的语义必须等价于：

```yaml
version: 1
profile: industrial
structure: codespec-dir
workflowPack: codespec
paths:
  docs: codespec
  specs: codespec/specs
  changes: codespec/changes
  archives: codespec/changes/archives
  runtime: .codespec-cli
templates:
  preset: company-default
  language: zh-CN
change:
  id_prefix: AR
  naming: "{id}-{slug}"
  single_active_change: false
validation:
  require_validation_doc: true
  require_service_context: false
  fail_on_missing_required_sections: true
integrations:
  default: generic
  enabled: [generic]
generation:
  runner: opencode
  supported_runners:
    - opencode
    - opencode-serve
    - relay-serve
    - relay-pool
    - chrys
    - codegenie
    - codeagent
    - nga
  mode: module-first
  apply_requires_force_on_existing: true
extensions: {}
```

`init --force` 可重写此配置，但必须保留原配置中的 `extensions` 映射。

## 5. 默认工作流规格

### 5.1 工作流包

默认包 key 为 `codespec`，manifest 等价于：

```yaml
key: codespec
name: CodeSpec Default Workflow Pack
description: Official CodeSpec SDD workflow pack.
workflow: workflow.yaml
templatesRoot: templates
commandsRoot: commands
utilityCommands:
  - codespec.audit
  - codespec.back
  - codespec.implement
```

包路径必须完全位于包根目录内，不允许绝对路径或 `..`。每个模板和命令引用都要计算 SHA-256 并存入 change 的 workflow 快照。

### 5.2 默认阶段

| 顺序 | key | 文件 | 命令 | 执行者 | done 必需 |
|---:|---|---|---|---|---|
| 1 | `proposal` | `proposal.md` | `codespec.proposal` | 主 Agent | 是 |
| 2 | `delta-spec` | `delta-spec.md` | `codespec.delta-spec` | 主 Agent | 是 |
| 3 | `delta-design` | `delta-design.md` | `codespec.delta-design` | 主 Agent | 是 |
| 4 | `tasks` | `tasks.md` | `codespec.tasks` | 主 Agent | 是 |
| 5 | `validation` | `validation.md` | `codespec.validation` | `stage-generator` | 是 |
| 6 | `implementation` | 无文件 | `codespec.implement` | `task-executor` | 是 |
| 7 | `review` | `review.md` | `codespec.review` | `stage-generator` | 是 |

最终化要求：

```yaml
finalization:
  require_updated:
    - codespec/specs/spec.md
    - codespec/specs/design.md
```

### 5.3 阶段文档质量检查

所有检查失败当前均产生 `warn` finding；是否可确认主要由文件存在性和模板占位符检查决定。

`proposal`：

- `CS111`：包含“用户请求 vs 真实需求”等同义表达。
- `CS112`：包含范围/边界。
- `CS113`：包含非目标/不在范围。
- `CS114`：包含已确认决策。
- `CS115`：包含假设或开放问题。
- `CS116`：包含决策账本或决策记录。

`delta-spec`：

- `CS201`：包含按顺序出现的 `ADDED Requirements / MODIFIED Requirements / REMOVED Requirements`；或包含完整的无基线草稿结构：`无基线草稿说明 / 候选业务规则 / 验收条件 / 待补全基线后确认的问题 / 代码事实依据`。

`tasks`：

- `CS301`：引用 `validation.md`、一致性验证或验证。
- `CS302`：包含 `## Context`。
- `CS303`：Task 包含 `**Files:**`。
- `CS304`：Task 包含 `**Context:**`。
- `CS305`：Task 包含 `**Do:**`。
- `CS306`：Task 包含 `**Verify:**`。
- `CS307`：Verify 包含未完成复选框。
- `CS308`：包含依赖关系图。
- `CS309`：包含任务状态 `DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT`。
- `CS310`：Context 包含输入物和输出物。
- `CS311`：Verify 包含规格合规和串连验证。

`validation`：

- `CS401`：包含是否允许进入实现、总体结论或验证结论。

`review`：

- `CS501`：包含 `Decision: Approved|Changes Required`、审查决策或结论。

### 5.4 工作流状态

Change 状态文件为 `codespec/changes/{change}/.codespec-state.json`。初始结构：

```json
{
  "version": 1,
  "change": "AR202607201030-feature",
  "flowId": "8位追踪ID",
  "currentStage": "proposal",
  "workflow": {
    "version": 1,
    "stages": [],
    "finalization": {}
  },
  "stages": {
    "proposal": {
      "status": "clarifying",
      "clarified": false,
      "confirmed": false,
      "file": "proposal.md",
      "required": true
    }
  },
  "deprecatedStages": {},
  "subagentSession": null,
  "history": [
    {
      "action": "create-change",
      "stage": "proposal",
      "timestamp": "ISO-8601"
    }
  ]
}
```

阶段状态值：

- `pending`：尚未进入。
- `clarifying`：当前阶段正在澄清/生成。
- `subagent-running`：SubAgent 会话运行中。
- `in_progress`：实现中。
- `confirmed`：用户已确认。

展示状态值：

- `pending`：文件尚不存在且可开始。
- `blocked`：文件尚不存在且前序文档尚未完成。
- `template`：文件存在但命中强占位符。
- `draft`：文件存在、非模板、尚未确认。
- `confirmed`：状态文件标记已确认。

确认阶段必须：

1. 验证当前 workflow 引用无漂移。
2. 验证阶段存在。
3. 对有文件阶段验证文件存在。
4. 阻止明显模板内容。
5. 验证所有前序阶段已确认。
6. 写 `status=confirmed`、`clarified=true`、`confirmed=true`、`confirmedAt`。
7. 追加 `confirm-stage` history。
8. 推进至下一阶段；有 delegate 的 no-file 阶段不得自动跳过。
9. 在最后一个必需阶段确认时，捕获 finalization 文件的实现前 SHA-256 baseline。

## 6. 命令行语法

### 6.1 参数解析

第一个未被识别为选项的 token 是主命令，后续普通 token 进入位置参数。支持：

```text
--help -h --json --force --path --change --integration
--confirm-compatible --module-path --no-template-update
--runner --serve-url --model --agent --concurrency --retries --batch
--design-template --spec-template --knowledge --template
--run --complete --block --resume --mock --task
--no-update-check
--file --label --delegate --objective --after --required --clean
--no-color
```

`--module-path` 和生成命令中的 `--task` 可重复。`--concurrency` 只允许 `1..10`。

### 6.2 命令总览

| 命令 | 用途 |
|---|---|
| `init [path]` | 初始化项目、全局模板和 Agent 集成 |
| `start <change>` / `new <change>` | 创建 change 和冻结工作流 |
| `list` | 列出活动 change |
| `status [change]` | 展示阶段文件和状态 |
| `go [change]` / `next [change]` | 返回当前阶段和下一动作 |
| `accept [change]` | 确认当前阶段 |
| `confirm <stage> [change]` | 确认指定阶段 |
| `implement [change]` | 展示/进入实现、获取 Task、标记状态 |
| `review [change]` | 进入审查阶段 |
| `done [change]` | 校验、最终化并归档 |
| `archive [change]` | 直接归档，支持恢复用途的 `--force` |
| `validate [change]` | 校验项目和文档链 |
| `doctor` | 在 validate 基础上诊断 `.gitignore` |
| `generate` / `show` / `apply` | 候选全量文档生命周期 |
| `integration list/install/remove` | Agent 集成 |
| `workflow refresh-snapshot` | 审计后刷新漂移 hash |
| `stages init/list/add/remove/validate/cleanup` | 项目工作流 |
| `template list/show/copy/sync` | 模板管理 |
| `extension list/install/remove` | 领域扩展 |
| `version` | 输出版本 |

兼容/废弃入口：

- `integration uninstall <name>` 等价于 `integration remove <name>`。
- `extension uninstall <name>` 等价于 `extension remove <name>`。
- `generation` 是已废弃命令，必须返回 `DEPRECATED_COMMAND`，并引导改用 `generate --design-template/--spec-template`。

## 7. 核心命令功能规格

### 7.1 `codespec init [path]`

必须：

1. 幂等创建第 4.1 节中的项目目录。
2. 创建配置；`--force` 重写配置但保留扩展记录。
3. 幂等更新 `.gitignore`。
4. 同步六个 delta 模板到 `~/.codespec/templates/`；`--no-template-update` 跳过，`--force` 覆盖。
5. 交互环境提示选择 Agent 集成；显式 `--integration` 直接使用；非 TTY 或 JSON 模式默认 `nga`。
6. 安装选中的集成，且不覆盖用户已存在文件。
7. 不创建任何业务阶段文档或全量文档。
8. 缺少全量文档时只提示本地 `generate → show → apply`。

### 7.2 `codespec start/new <change>`

变更名规则：

- 去除首尾空白。
- 空名称报错。
- 若输入以至少两个字母加至少六位数字开头，则仅 slugify 后使用。
- 否则前缀为本地时间 `ARyyyyMMddHHmm-`。
- 将空白和 `\/:*?"<>|#%{}[]^~`` 等字符替换为 `-`，合并连续 `-`。
- 最大 200 字符。

创建行为：

1. `start` 前检查全局模板/Agent 命令同步；同 CLI 版本已检查可跳过。
2. 拒绝业务仓中的本地 workflow pack 覆盖目录。
3. 加载当前有效 workflow。
4. 创建 change 目录，但不复制 `proposal.md`。
5. 总是写入新的 `.codespec-state.json`。
6. 写只读语义的 `workflow.yaml` 快照。
7. 冻结每个阶段的配置、模板/命令路径和 SHA-256。
8. 返回 `flowId` 和进入 `/codespec` 的提示。

### 7.3 `list/status/go/next`

`list` 仅列出 `codespec/changes/` 下除 `archives` 外的目录。

`status`：

- 未指定 change 时优先选择按名称排序后最后一个、且包含状态文件的 change。
- 输出所有目录、当前 change、各阶段文件、展示状态、冻结 workflow 和漂移 finding。
- 手工创建但无状态文件的目录可出现在 changes 列表，但不会优先成为有效 current。

`go`：

- 无活动 change：返回 `NO_ACTIVE_CHANGE`。
- workflow 漂移：返回 `WORKFLOW_PACK_DRIFT`，不得推进。
- 主 Agent 文档阶段：`nextAction=open_agent_stage`。
- 已有草稿：`nextAction=await_user_accept`。
- delegate 阶段：`nextAction=delegate-subagent`，并返回 `delegateInputs`。
- implementation：返回 `task-executor` 委托信息。
- implementation 已确认且 review 未激活：提示执行 `codespec review`。
- 全部阶段确认：`nextAction=done`。

阶段 payload 至少包含：

```json
{
  "index": 1,
  "total": 7,
  "key": "proposal",
  "name": "需求澄清",
  "status": "pending",
  "file": "codespec/changes/{change}/proposal.md",
  "command": "codespec.proposal",
  "agentCommand": "/codespec.proposal",
  "entryCommand": "/codespec",
  "template": "templates/delta/proposal.md",
  "templateContent": {
    "source": "global",
    "path": "...",
    "content": "..."
  },
  "objective": "..."
}
```

### 7.4 `accept/confirm`

`accept` 确认 `currentStage`；`confirm` 可指定 stage。成功后返回已确认阶段、下一阶段、是否等待 implementation，以及下一步。

强模板占位符必须阻断并返回 `STAGE_FILE_LOOKS_TEMPLATE`。强模式包括：

- `[待填...]`、`[待定...]`、`[占位]`、`[TODO...]`、`[FIXME...]`、`[TBD...]`。
- `[待做...]`、`[待实现...]`、`[placeholder...]`。
- `[EntityName]`、`[ServiceName]` 等类型名占位符。
- 固定模板样例：`[AR编号]`、`F-01 | [功能名]`、`US-01`、`方案A（采纳）`、样例 API 和样例实体路径。
- 内容仅为 `# {fileName}`。

`[功能名]`、`[字段名]` 等弱模式当前只警告，不阻断。

### 7.5 `implement`

无选项时：

- 必须已有已确认的 validation。
- 必须存在 `tasks.md`。
- 解析 plan 或 legacy 任务，返回任务数、分组、文档路径和执行指导。

`--run`：

- plan 格式先执行 no-placeholder 检查。
- 将 `currentStage` 设为 `implementation`，状态设为 `in_progress`，追加 history。
- 返回 `delegate-subagent`。

`--task N --json`：

- 仅支持 `### Task N: 标题` 或全角冒号格式。
- 返回单个 Task 的 `description/context/files/do/verify/status`。
- 返回完整 `subagentPrompt` 和变更文档路径。

`--complete N` 将 Task 的独立状态行改为 `- [✓]`。  
`--block N [reason]` 改为 `- [⚠]`，原因只在命令结果中展示，不写入任务正文。  
`--resume` 返回从断点继续的指导。

plan Task 标准格式：

```markdown
### Task 1: 标题

描述

**Files:**
- Create: `src/new.js`
- Modify: `src/existing.js`
- Test: `test/new.test.js`

**Context:**
输入物：...
输出物：...

**Do:**
...

**Verify:**
- [ ] 规格合规：...
- [ ] 串连验证：...

- [ ]
```

状态映射：空格=`pending`，`→`=`in_progress`，`✓`=`done`，`⚠`=`blocked`。

SubAgent 报告状态必须为：

- `DONE`
- `DONE_WITH_CONCERNS`
- `BLOCKED`
- `NEEDS_CONTEXT`

### 7.6 `review`

进入条件：

1. 当前 workflow 定义 `review`。
2. 有活动 change。
3. validation 已确认。
4. implementation 已确认。

进入后必须将 `currentStage` 设为 `review`，初始化/更新 review 状态，追加 `enter-review-stage`，并返回 review 阶段信息。

若 implementation 未确认：

- 任务未全部为 done/blocked：`IMPLEMENTATION_NOT_COMPLETED`。
- 任务已全部终止但未由用户确认：`IMPLEMENTATION_PENDING_CONFIRM`。

### 7.7 `done/archive`

`done` 必须：

1. 拒绝 `--force`，返回 `DONE_FORCE_NOT_SUPPORTED`。
2. 执行完整 `validate`。
3. 有 error finding 时返回 `VALIDATION_FAILED`。
4. 调用非强制 archive。

非强制 archive 必须：

1. 阻止 workflow 漂移。
2. 要求所有 `required_for_done` 阶段已确认。
3. 要求所有必需的有文件阶段文件存在。
4. 验证 finalization 文件。

finalization 算法：

- 确认最后一个必需阶段时记录目标文件是否存在及其 SHA-256。
- baseline 时不存在的文件，done 时不强制比较。
- baseline 时存在的文件，done 时必须仍存在且 SHA-256 已变化。
- 缺 baseline 返回 `BASELINE_UPDATE_SNAPSHOT_MISSING`。
- 未变化返回 `FULL_DOCS_NOT_UPDATED`。

成功归档使用：

```text
codespec/changes/archives/{YYYY-MM-DD}-{change}/
```

目标已存在时报错。`archive --force` 仅跳过阶段/文档/finalization 检查，仍不得跳过 workflow 漂移。

## 8. 校验与诊断

`validate` findings：

| 代码 | 级别 | 含义 |
|---|---|---|
| `CS001` | error | 缺 `codespec/` |
| `CS002` | error | 缺 `codespec/specs/` |
| `CS003` | warn | 缺全量 `spec.md` |
| `CS004` | warn | 缺全量 `design.md` |
| `CS005` | error | 缺 changes |
| `CS006` | error | 缺 archives |
| `CS007` | error | 缺 config |
| `CS008` | error | 存在 `codespec/data/*.json` |
| `CS100` | error | 显式 change 不存在 |
| `CS101` | error | change 无状态文件 |
| `CS102` | warn | 后序文件越过缺失前序文件存在 |
| `CS103` | warn | 阶段文档未确认 |
| workflow checks | warn | 阶段内容规则未满足 |
| workflow drift | error/warn | 冻结引用变化 |

`doctor` 在 validate 基础上增加 `CSD001`：缺少 `.gitignore`。

JSON 模式返回 findings；只要存在 error，命令退出码必须为 `1`。

## 9. 工作流与阶段定制

### 9.1 加载优先级

有效 workflow 按以下优先级：

1. `.codespec-cli/workflows/project.yaml`。
2. 旧 `.codespec-cli/stages.yaml` 自动迁移后的 project workflow。
3. 命令显式 pack 或 config 的 `workflowPack`。
4. 未配置 pack 时的 legacy `.codespec-cli/workflows/default.yaml`。
5. 内置 `codespec` pack。

project workflow 可通过 `extends: codespec` 继承 pack。相同 key 的 stage 采用完全替换，不是字段合并；新 key 使用 `after` 插入，否则追加。

### 9.2 Workflow schema

```yaml
version: 1
extends: codespec
stages:
  - key: security-review
    file: security-review.md
    label: 安全审查
    command: project.security-review
    template: codespec/templates/security-review.md
    objective: 检查安全风险
    required_for_done: false
    delegate: stage-generator
    noFile: false
    after: tasks
    checks:
      - code: PRJ001
        type: must_contain_heading
        value: "## 安全结论"
        message: 缺安全结论
finalization:
  require_updated:
    - codespec/specs/spec.md
```

约束：

- key：`[A-Za-z0-9][A-Za-z0-9._-]*`。
- file：单一文件名，不得带路径；不同阶段大小写不敏感唯一。
- canonical command：与 key 相同字符集，不带 `/`，唯一，不得为保留命令 `codespec`。
- noFile 可省略 file/template。
- template 为安全相对路径。
- check 类型仅 `must_contain_heading`、`must_match_regex`、`file_not_empty`。
- `must_match_regex` 必须能编译。
- finalization 路径必须是仓库内相对路径。

### 9.3 `stages` 命令

- `init`：创建注释充分、`extends: codespec`、空 stages 的 project workflow；已有文件需 `--force`。
- `list`：列出合并后的阶段、来源、执行者和必需性。
- `add <key>`：新增阶段，默认文件 `{key}.md`、命令 `project.{key}`、模板 `codespec/templates/{key}.md`、默认 `after: tasks`、默认非必需；同时生成模板和命令。
- `remove <key>`：必需阶段需 `--force`；`--clean` 删除关联模板和命令。
- `validate`：加载并校验 project workflow。
- `cleanup`：删除超过 7 天的 `stages.yaml.migrated.*`，`--force` 删除全部。

### 9.4 Workflow 漂移

每个 change 冻结的 `templateRef` 和 `commandRef` 保存路径与 SHA-256。当前文件缺失、不是普通文件、路径不安全或 hash 改变均形成 finding。

`workflow refresh-snapshot <change> --confirm-compatible "<说明>"`：

- 没有确认说明必须失败。
- 引用文件缺失必须失败。
- 更新 hash。
- 写入维护者、时间、确认原文和变更列表到 `workflowDriftAudit`。
- 追加 history。

## 10. 模板与扩展

### 10.1 阶段模板优先级

1. 已启用 extension：`codespec/extensions/{name}/{stage}.md`。
2. 项目：`codespec/templates/{stage}.md`。
3. 全局：`~/.codespec/templates/{stage}.md`。
4. workflow pack 内置模板。

### 10.2 模板继承

项目或全局模板可声明：

```markdown
<!-- extends:proposal -->
<!-- append-start -->
## 团队追加章节
...
<!-- append-end -->
```

规则：

- 项目模板可继承内置或全局模板。
- 全局模板只能继承内置模板。
- 继承链返回顺序为内置/全局基底到项目追加层。
- 无 `extends` 时使用完整文件。
- 基模板缺失：`BASE_TEMPLATE_NOT_FOUND`。
- 全局继承全局：`GLOBAL_TEMPLATE_EXTENDS_GLOBAL`。

### 10.3 模板命令

- `list`：展示六个阶段模板来源和继承。
- `show <stage>`：展示来源、路径和继承信息。
- `copy <stage>`：优先从全局、其次内置复制到项目模板；已有文件需 `--force`。
- `sync [--force]`：按 SHA-256 同步全局 delta/full 模板和已存在的 Agent 命令目录。强制模式不确认。

### 10.4 内置扩展

`harmonyos`：

- proposal、delta-spec、delta-design、tasks、validation、full design、full spec。
- 安装到 `codespec/extensions/harmonyos/`。
- 可作为生成模板。

`ux`：

- proposal、delta-spec、delta-design、tasks、validation。
- 安装到 `codespec/extensions/ux/`。
- 可作为生成模板。

安装要求：

- 未知扩展返回 `EXTENSION_NOT_FOUND`。
- 同阶段模板的多个扩展冲突，除非 `--force`。
- 更新 config 的 `extensions`，记录启用、安装日期、模板和生成模板。
- remove 删除扩展目录和配置；现有 change 的冻结内容不受影响。

## 11. Agent 集成

支持：

| key | 命令/Skill 位置 | 附加资产 |
|---|---|---|
| `opencode` | `.opencode/command/*.md` | `.opencode/agents/stage-generator.md`、`task-executor.md` |
| `nga` | `.opencode/command/*.md` | 同 opencode agents |
| `codegenie` | `.codegenie/command/*.md` | `.codegenie/agents/*` |
| `codeagent` | `~/.cac/command/*.md` | `~/.cac/skills/codespec/` |
| `chrys` | `.agents/skills/codespec/SKILL.md` | 展平到 references 的 pack/workflow/command/template |
| `claude-code` | `.claude/commands/` | `.claude/skills/codespec/` 及 references |

安装必须包括：

- 主命令 `codespec`。
- workflow 所有 stage commands。
- pack utility commands：`codespec.audit`、`codespec.back`、`codespec.implement`。
- 集成 manifest：`.codespec-cli/manifests/integrations/{key}.json`。
- 每个受管文件路径、SHA-256、是否全局。

删除时：

- 文件 hash 未变化或 `--force` 时删除。
- 用户修改过的文件默认保留。
- section 型资产不删除。
- 清理空目录。
- 最后删除 manifest。

## 12. 全量文档生成

### 12.1 支持的 runner

`opencode`、`opencode-serve`、`relay-serve`、`relay-pool`、`nga`、`codegenie`、`codeagent`、`chrys`。

默认 concurrency 为 2，重试 3 次。runner 不可用必须在生成前返回明确错误。

### 12.2 单项目生成流程

`generate` 必须：

1. 验证项目已 init。
2. 解析 full design/spec 模板；可显式传路径。
3. 创建唯一 run 目录和初始 manifest。
4. 扫描代码仓并写 `logs/scan.json`。
5. 复制 `--knowledge` 文件/目录到 run。
6. 选择关键文件并写 `logs/key-files.json`。
7. 若 design 模板含 `<!-- module:start/end -->`：
   - 生成初始模块规划。
   - 调 runner 产出规划 JSON。
   - TTY 下允许用户编辑计划。
   - 并发分析各模块。
8. 生成完整 `design.md`，按模板固定章节验证，失败重试。
9. 基于 design 和代码事实生成黑盒 `spec.md`，按模板固定章节验证，失败重试。
10. 校验并尝试由 Agent 修复 PlantUML。
11. 写 runner stdout/stderr、prompt、调用清单和 manifest。
12. 更新 `runs/latest.json`。
13. 返回候选文件，不直接覆盖权威 specs。

扫描必须：

- 遵守 `.gitignore` 和内置 ignore。
- 忽略 VCS、`.codespec-cli`、Agent 目录、`codespec`、依赖、构建目录、docs、tests、二进制、lock 文件、大于 256 KiB 文件和不支持扩展。
- 读取最多 3 个 README、10 个 Markdown 文档；单文档最多 32 KiB，总计 128 KiB。
- 统计代码文件、行数、非空行、语言和文件树。

生成质量必须拒绝：

- 空文档。
- 缺模板固定章节。
- 整篇 Markdown 被代码围栏包裹。
- runner 环境说明、无法写文件声明。
- 对话式开头或确认请求。
- 截断/续写声明。

### 12.3 Run 目录

```text
.codespec-cli/runs/{yyyyMMddHHmmssSSS[-N]}/
├─ manifest.json
├─ plan.json
├─ design.md
├─ spec.md
├─ knowledge/
├─ modules/
└─ logs/
   ├─ scan.json
   ├─ key-files.json
   ├─ {runner}.json
   ├─ prompts/
   └─ *stdout.log / *stderr.log
```

### 12.4 `show/apply`

`show` 读取 `latest.json`；缺失时按 `createdAt` 选择最新 run。无 run 返回 `NO_GENERATED_RUN`。

`apply`：

1. 要求候选 spec/design 都存在。
2. 重新执行质量检查。
3. 目标任一存在且无 `--force`：`APPLY_OVERWRITE_REQUIRED`。
4. 同时复制两份文档到 `codespec/specs/`。
5. manifest 写 `applied=true` 和 `appliedAt`。

### 12.5 批量生成

`generate --batch modules.json` 接受：

```json
{
  "modules": [
    {
      "name": "CLI",
      "paths": ["src/cli.js", "src/project.js"],
      "description": "命令与工作流"
    }
  ]
}
```

也接受顶层数组。每个模块必须有非空 name、非空 paths，路径必须存在。每个模块使用过滤后的同一仓库扫描结果独立生成 spec/design，批次并发，共享全局并发控制器。结果写入：

```text
.codespec-cli/runs/batch-{timestamp}/
├─ manifest.json
└─ modules/{slug}/...
```

任一模块失败时批次状态为 partial，CLI `ok=false`，但保留成功模块产物。

## 13. 输出、退出码、更新与遥测

### 13.1 输出

- `--json`：stdout 只输出 JSON 结果；异常由入口写 stderr JSON。
- 普通模式：品牌头、状态、条目、Next Actions。
- `--no-color`、`NO_COLOR` 禁用颜色；TTY 或 `FORCE_COLOR` 可启用。
- `validate/doctor` 以 finding 列表展示。
- 业务失败结果应设置 `process.exitCode=1`；抛出异常由入口 `process.exit(1)`。

### 13.2 更新检查

除 `--json` 或 `--no-update-check` 外，每次命令前检查公司 npm 仓最新版本。网络失败静默。新版本提醒 24 小时内最多一次；TTY 下 Enter 执行全局 npm 更新，Esc 取消。

### 13.3 遥测

命令通过 HTTPS POST 上报到 CodeSpec 服务，至少包括：

- operation type、command、成功/失败、耗时、错误。
- change、flowId、stage、runId。
- CLI/Node/平台、runner/model。
- git URL。
- 用户标识：系统用户名优先，否则使用稳定匿名 ID。

敏感 option key（包含 token/password/secret/key/apiKey）必须替换为 `***REDACTED***`。上报失败不得影响命令，写入 `.codespec-cli/report-queue/`；最多 100 条，每条最多重试 3 次。`CODESPEC_NO_REPORT` 或内部 `noReport` 关闭上报。

## 14. Web 附属物

### 14.1 静态官网

`npm run web` 启动零依赖 Node HTTP 静态服务器：

- 默认 `127.0.0.1:4173`，支持 `--host/--port` 或环境变量。
- `/` 和 `/index.html` 映射 `packages/web/static/codespec-home.html`。
- 只允许 GET/HEAD。
- 防止路径穿越。
- 按扩展名返回 MIME；404/403/405/400 有明确状态。

### 14.2 运营 Dashboard

Dashboard 是独立 Vue 3/Vite 应用，不属于 CLI npm 主构建。它依赖外部 API：

```text
GET  /dashboard/codespec-stats
GET  /dashboard/codespec-detail-stats
GET  /dashboard/codespec-user-distribution
POST /dashboard/codespec-user-sync
GET  /dashboard/codespec-user-sync-status
POST /dashboard/codespec-user-migrate
GET  /dashboard/spec-stats
```

展示用户分布钻取、命令/阶段分布、留存、趋势、runner、成功率和用户排行。后端不在本仓库，完整复刻 CLI 时可不实现 Dashboard。

## 15. 安全与质量属性

### 15.1 安全

- pack、workflow、finalization、静态服务路径必须防目录穿越。
- 集成卸载不得默认删除用户修改过的文件。
- 生成 runner prompt 必须声明只读仓库，产物只由 CLI 写 run 目录。
- apply 覆盖必须显式 `--force`。
- `done` 不允许 `--force`。

### 15.2 可靠性

- init 和目录创建幂等。
- 候选生成与权威应用分离。
- change 冻结 workflow，检测模板/命令漂移。
- 遥测、更新检查失败不阻断核心操作。
- 生成失败保留 run manifest 和日志。
- 批量生成保留部分成功产物。

### 15.3 性能

- 仓库扫描单次遍历，忽略大文件和非目标目录。
- 模块分析并发受全局 `1..10` 控制。
- Relay pool 可复用 WebSocket。
- 模板同步用 hash 和 CLI 版本缓存减少重复扫描。

### 15.4 兼容性

- Windows/Linux/macOS。
- 支持 legacy workflow 和旧 tasks 格式。
- `new/next/confirm` 作为 `start/go/accept` 兼容入口。
- 自动迁移旧 `stages.yaml`，保留 7 天备份。
- 兼容多种 Agent 命令目录和全局/项目级安装。

## 16. 行为兼容测试清单

复刻实现至少覆盖：

1. init 首次创建、幂等、force、全量文档不覆盖、全局模板同步。
2. start 命名、空名称、长度、无模板业务文件、冻结 workflow。
3. status/go 在 pending/template/draft/confirmed/blocked/delegate/noFile 的输出。
4. accept/confirm 的前序门、模板阻断、结构化定位字段和 baseline。
5. workflow pack 路径安全、schema、hash、漂移和审计刷新。
6. 默认阶段 checks 和自定义 checks。
7. implementation plan/legacy 解析、no-placeholder、task context、状态标记。
8. review 的 validation/implementation 门。
9. done 的 validate、full doc hash 更新和 archive。
10. 集成安装、canonical 文件名、manifest、修改保护、force 删除。
11. 模板优先级、继承链、非法继承和同步。
12. extension 冲突、配置修复、安装移除。
13. 本地 generate 的 runner 选择、扫描、计划、模块并发、质量重试、run/apply。
14. batch 输入校验、partial 结果。
15. JSON/普通输出、颜色、错误码、退出码。
16. 遥测脱敏、失败队列和禁用。
17. 静态服务 GET/HEAD、MIME 和路径穿越。

## 17. 当前实现兼容注意事项

以下是当前源码的真实行为，严格复刻时应保留；若做修正版，应明确作为不兼容修复：

1. `template validate` 在测试和旧说明中出现，但当前 `handleTemplate` 未实现该分支；真实 CLI 会报用法错误。
2. `review` 命令的 handler 在返回基础对象后仍有一段不可达的 delegate 赋值代码，因此直接 `review` 的结果缺少预期 `nextAction`；后续 `go` 仍可返回 review delegate。
3. `accept` 确认 no-file implementation 时不直接检查所有 Task 是否已完成；任务完成检查只在尚未确认 implementation 时的 `review` 入口执行。
4. 未识别的 `--xxx` 不会报 unknown option，而会作为 command 或位置参数处理。
5. workflow 阶段内容 checks 只产生 warning，不阻断 `accept`。
6. 仓库生成扫描明确忽略 tests 和 docs；测试事实只能通过其他被选中的上下文间接进入生成。
7. `src/cli-history.js` 和 quick review 的扩展字段存在，但未接入主 CLI 执行链；quick review 当前始终通过。
8. `DEFAULT_WORKFLOW`、`DEFAULT_STAGES_CONFIG` 是兼容回退，当前新项目的真实默认以 `workflow-packs/codespec/workflow.yaml` 为准。
9. Dashboard 路由 `/` 配置为重定向到自身，完整前端复刻时应先决定保持兼容还是修复循环。
