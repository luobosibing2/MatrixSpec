# CodeSpec CLI 软件设计说明书

> 实现目标：复刻 `@codespec/codespec-cli` `0.4.1-beta.3`  
> 设计原则：Markdown 是业务真理源；状态机只负责门禁；候选生成与权威应用分离；最少依赖、同步文件操作优先  
> 自足性：本设计包含模块划分、数据模型、关键算法、接口、错误与测试策略，不要求查阅其他 Markdown

## 1. 总体设计

### 1.1 架构风格

系统采用单进程 Node.js CLI + 文件系统持久化 + 外部 Agent/HTTP/WebSocket 适配器。不存在数据库、常驻核心服务或插件运行时。

```text
用户 / 主 Agent / CI
        │ argv + stdout/stderr + exit code
        ▼
bin/codespec.js
        ▼
src/cli.js ──────────────── 输出 / 更新检查 / 遥测
        │
        ├─ 项目与状态 ───── project.js / state.js / validation.js
        ├─ 工作流 ───────── packs.js / workflow.js / project-workflow.js
        ├─ 模板与扩展 ───── template-sync.js / extensions.js
        ├─ Agent 集成 ───── integrations.js / adapters/*
        ├─ 全量生成 ─────── generation.js / batch-generation.js / generator/*
        └─ 实现任务 ─────── implement/*
```

核心数据流：

```text
workflow pack + project override
             │
             ▼
        有效 workflow
             │ start 时冻结
             ▼
 .codespec-state.json + workflow.yaml
             │
       go / accept / validate
             │
             ▼
阶段 Markdown → implementation → review → full spec/design → archive
```

### 1.2 设计约束

1. 主包使用 ESM。
2. Node 18 可运行，不使用 Node 22 才有的 API。
3. 项目状态全部位于工作区或用户 home。
4. 写业务权威文档前必须有显式命令和覆盖门。
5. 核心命令失败必须可机器判断。
6. 外部服务失败与核心文件流程解耦。
7. pack/project 路径不得逃逸根目录。

## 2. 源码与职责划分

### 2.1 入口与交互层

| 文件 | 职责 |
|---|---|
| `bin/codespec.js` | shebang、动态加载、异常 JSON/文本格式化、退出 |
| `src/cli.js` | 参数解析、命令 dispatch、交互确认、任务子命令、help |
| `src/output.js` | 品牌、颜色、result/finding/status 渲染 |
| `src/ui/*` | generate 进度树、视口渲染、批量树、摘要和 ANSI 宽度 |
| `src/version-check.js` | 公司 npm 仓版本检查、changelog、TTY 更新 |

### 2.2 领域与持久化层

| 文件 | 职责 |
|---|---|
| `src/constants.js` | 版本、目录、默认 config、兼容阶段常量、扩展注册 |
| `src/fs-utils.js` | 同步文件读写、目录、配置 YAML |
| `src/project.js` | init、change、状态导航、确认、归档、模板解析 |
| `src/state.js` | 状态 schema、确认推进、SubAgent 会话 |
| `src/validation.js` | 项目/阶段 finding |
| `src/workflow-drift.js` | 冻结引用 hash 检测和刷新 |
| `src/cli-history.js` | 未接线的本地历史工具 |

### 2.3 工作流层

| 文件 | 职责 |
|---|---|
| `src/packs.js` | pack manifest、路径安全、资源引用 |
| `src/workflow.js` | workflow 加载优先级、schema、stage checks |
| `src/project-workflow.js` | project override、legacy 迁移、自定义命令 |
| `src/project-stages.js` | 兼容 facade |
| `src/stages-config.js` | 已弃用 stages.yaml 解析 |
| `workflow-packs/codespec/*` | 当前默认 workflow、commands、templates |

### 2.4 生成层

| 文件 | 职责 |
|---|---|
| `src/generation.js` | 单项目生成编排、run、show、apply |
| `src/batch-generation.js` | 多业务模块并发生成 |
| `src/generator/scanner.js` | 仓库扫描和统计 |
| `src/generator/planner.js` | 初始模块规划 |
| `src/generator/planner-utils.js` | 计划文件校验和 TTY 编辑 |
| `src/generator/file-selector.js` | 关键文件选择 |
| `src/generator/module-analyzer.js` | 单模块上下文与设计生成 |
| `src/generator/md-template-loader.js` | full 模板解析、模块插入和章节提取 |
| `src/generator/templates.js` | prompt 规则与 fallback 模板 |
| `src/generator/knowledge-loader.js` | 领域知识加载/复制 |
| `src/generator/module-loader.js` | batch JSON 和模块过滤 |
| `src/generator/utils/*` | 并发、重试、语言、中心性、定义、PlantUML |
| `src/generator/{runner}.js` | 各 Agent 进程/API/WebSocket 适配 |

### 2.5 外部集成层

| 文件 | 职责 |
|---|---|
| `src/integrations.js` | Agent 资产安装/删除和 manifest |
| `src/adapters/*` | 各 Agent 的目标目录和特殊安装 |
| `src/extensions.js` | HarmonyOS/UX 模板套件 |
| `src/template-sync.js` | 用户级模板和 Agent 命令 hash 同步 |
| `src/reporter.js` | 遥测、脱敏、离线队列 |

## 3. CLI 控制流设计

### 3.1 入口

伪代码：

```js
const { main } = await import(cliUrl);
main(argv).catch(error => {
  const payload = normalizeError(error);
  if (argv.includes("--json")) stderr(JSON.stringify(payload));
  else printHumanError(payload);
  exit(1);
});
```

`normalizeError` 合并：

```js
{
  ok: false,
  code: error.code ?? "CLI_ERROR",
  message: error.message ?? String(error),
  ...allEnumerableFieldsExceptNameMessageStack
}
```

### 3.2 参数解析器

解析器为一次线性扫描，时间 O(n)，无需命令框架。

```js
for token in argv:
  if booleanOption(token): options[key] = true
  else if valueOption(token): options[key] = argv[++i]
  else if repeatableOption(token): (options[key] ??= []).push(argv[++i])
  else if command is null: command = token
  else args.push(token)
```

注意：

- 不验证缺失的 option value；下游可能得到 `undefined`。
- `--help` 立即返回当前已解析内容。
- `--task` 在 command 已是 `implement` 时为单值，否则为数组。
- `--block` 可消费后一个非 `--` token 作为 reason。
- `--concurrency` 在解析期校验并可直接退出。

### 3.3 Dispatch

`main` 顺序：

1. parse args。
2. 设置输出颜色选项。
3. 无 command 打全局 help。
4. 非 JSON/非禁用时做更新检查。
5. `version` 短路。
6. switch dispatch。
7. 写操作/重要读操作通过 `withReporting` 包装。

`withReporting` 负责：

- 计时。
- 捕获 handler 异常并构造失败上报后重新抛出。
- 从结果提取 success、runId、flowId、change、stage、runner、model。
- 异步上报失败静默。

## 4. 文件与配置基础设施

### 4.1 `fs-utils`

所有路径入口先经：

```js
resolveProject(target) = path.resolve(process.cwd(), target)
```

基础写规则：

- `writeText` 默认不覆盖，返回 boolean。
- `copyFile` 默认不覆盖，返回 boolean。
- `ensureDir` 使用 recursive。
- `appendUniqueLines` 以 trim 后整行去重。
- config 固定 `.codespec-cli/config.yaml`，YAML 解析失败时 `loadConfig` 返回空对象。

这是刻意简单的同步 IO 设计；CLI 操作粒度小，避免引入锁、事务和异步文件抽象。

### 4.2 原子性边界

当前实现没有临时文件 + rename 的通用原子写。复刻兼容版应使用直接写；增强版可在不改变结果的前提下对状态/config/manifest 使用同目录临时文件原子替换。

跨文件事务仅靠执行顺序降低风险：

- start 先准备 workflow，再创建 change。
- generate 先写 run，最后更新 latest。
- apply 质量验证后连续复制 spec/design。
- archive 最后使用目录 rename。

## 5. Workflow Pack 设计

### 5.1 Pack loader

`loadPack(packKey)`：

1. key 匹配安全正则。
2. root 默认 `{packageRoot}/workflow-packs/{key}`。
3. 读取 `pack.yaml`。
4. 验证 key、workflow、templatesRoot、commandsRoot。
5. 所有路径用 `path.resolve` 后验证仍在 pack root 内。
6. 解析 workflow，并以 canonical command 模式验证。
7. 对每个有文件 stage 解析 template；对全部 stage 解析 command。
8. 验证资源是普通文件。
9. 为资源构造：

```json
{
  "packPath": "templates/delta/proposal.md",
  "packagePath": "workflow-packs/codespec/templates/delta/proposal.md",
  "sha256": "..."
}
```

10. utility command 也必须唯一、安全并实际存在。

当前内置 pack 的线性阶段必须固定为：

| 顺序 | key | file | command | delegate | 必需 |
|---:|---|---|---|---|---|
| 1 | `proposal` | `proposal.md` | `codespec.proposal` | 无 | 是 |
| 2 | `delta-spec` | `delta-spec.md` | `codespec.delta-spec` | 无 | 是 |
| 3 | `delta-design` | `delta-design.md` | `codespec.delta-design` | 无 | 是 |
| 4 | `tasks` | `tasks.md` | `codespec.tasks` | 无 | 是 |
| 5 | `validation` | `validation.md` | `codespec.validation` | `stage-generator` | 是 |
| 6 | `implementation` | 无 | `codespec.implement` | `task-executor` | 是 |
| 7 | `review` | `review.md` | `codespec.review` | `stage-generator` | 是 |

最终化默认比较 `codespec/specs/spec.md` 和 `codespec/specs/design.md`。内置 checks 的稳定代码为 proposal `CS111..CS116`、delta-spec `CS201`、tasks `CS301..CS311`、validation `CS401`、review `CS501`；检查失败形成 warning finding。

### 5.2 Workflow loader

加载优先级必须按 `spec.md` 第 9.1 节实现。返回对象统一规范化为：

```ts
type Workflow = {
  version: number
  source?: "project" | "pack-extended" | "project-migrated" | "builtin"
  pack?: { key: string; name?: string; description?: string } | null
  extends?: string | null
  stages: Stage[]
  finalization: { require_updated: string[] }
}
```

`Stage`：

```ts
type Stage = {
  key: string
  file?: string
  label: string
  command: string
  template?: string
  objective?: string
  required_for_done: boolean
  delegate?: "stage-generator" | "task-executor" | string
  noFile: boolean
  checks: StageCheck[]
  templateRef?: FileRef | null
  commandRef?: FileRef | null
}
```

### 5.3 Project workflow merge

采用 replace-by-key：

```js
resultStages = [...base.stages]
for overrideStage:
  if same key exists:
    replace entire object at same index
  else if after target exists:
    insert after target
  else:
    append
finalization = override.finalization ?? base.finalization
```

不要做深合并，否则被 override 省略的 delegate/check/template 会错误继承。

### 5.4 Legacy 迁移

发现 `.codespec-cli/stages.yaml`：

1. 将旧 `required` 映射 `required_for_done`。
2. `validationRules.requiredSections` 转为 `must_contain_heading`。
3. customChecks 转为 regex。
4. `/codespec.x` 命令转 `project.x`。
5. 写 `project.yaml`，默认 `extends: codespec`。
6. 为各阶段生成 `.codespec-cli/workflow-commands/{command}.md`。
7. 原文件 rename 为 `stages.yaml.migrated.{epochMs}`。

## 6. Change 状态机设计

### 6.1 创建

`createInitialState(change, workflow)` 对每个 stage 建立状态；首阶段 `clarifying`，其他 `pending`。workflow 对象完整嵌入状态，形成快照。

`createChange` 的关键顺序：

```text
check template sync
→ reject local pack overrides
→ load and fully validate workflow
→ normalize name
→ mkdir change
→ create flowId/state
→ save state
→ save human-readable workflow.yaml
```

workflow 无效时必须在 mkdir 前失败，避免 partial change。

### 6.2 状态选择

`selectCurrentChange`：

1. changes 已按字典序排序。
2. 过滤包含 `.codespec-state.json` 的目录。
3. 取有效目录最后一个；无有效目录时退回所有目录最后一个。

### 6.3 文件展示状态推断

```js
if state.confirmed: "confirmed"
else if file exists:
  if strongTemplateMarker: "template"
  else: "draft"
else:
  if first stage: "pending"
  else if previous noFile: "pending"
  else if previous file exists and not template: "pending"
  else: "blocked"
```

这里的 pending 只按文件判断，阶段确认门仍由 `confirmStage` 检查。

### 6.4 确认推进

`confirmStageInState`：

```js
mark current confirmed
next = stage immediately after current
while next is noFile and has no delegate:
  auto-confirm next
  next = following
if next exists:
  currentStage = next
  pending → clarifying
else:
  currentStage = "completed"
```

有 delegate 的 noFile implementation 必须停留。

### 6.5 Baseline

确认某阶段后，如果其后不存在任何必需阶段且 state 尚无 baseline：

```js
implementationBaseline = {
  capturedAt,
  documents: {
    [relativePath]: {
      exists: boolean,
      sha256: string | null,
      path: relativePath
    }
  }
}
```

这意味着默认 pack 实际会在最后一个必需阶段 review 确认时捕获 baseline；如果通过兼容流程更早触发，则以当时状态为准。

### 6.6 漂移

对快照每个 `templateRef/commandRef`：

```text
resolve packagePath against packageRoot
or projectPath against projectRoot
→ ensure contained
→ ensure exists and regular file
→ sha256 compare
```

pack ref 漂移为 error，project ref 漂移为 warn。核心导航/确认/归档目前对任意非空漂移数组均阻断。

## 7. 项目命令实现

### 7.1 Init

`projectPaths` 固定使用 `codespec` 与 `.codespec-cli`，不读取 config 中自定义 paths。复刻兼容版必须保持这一点。

init 创建目录、配置、gitignore 和全局模板。业务 `spec.md/design.md` 由 CLI wrapper 的 `applyInitFullSpecGuidance` 仅生成提示，不写文件。

### 7.2 Go 路由

路由优先级：

```text
no active → error
drift → block
current implementation and not confirmed → delegate task-executor
review is next but not activated → reviewReady
no current file → done
current stage has delegate → delegate-subagent
otherwise → stageNavigation
```

`stageNavigation` 将：

```text
pending/template → open_agent_stage
draft            → await_user_accept
blocked          → complete_previous_stage
```

### 7.3 Done

`done` 组合 `validateProject + archiveChange`。它不单独合并 delta；Agent/用户必须先更新全量 Markdown。工具只用 baseline hash 提供“发生过更新”的证据，不理解语义是否正确。

## 8. 阶段模板设计

### 8.1 两类模板

1. Delta stage templates：供 proposal 到 review 生成。
2. Full templates：供代码仓反向生成全量 spec/design。

二者不要共用解析逻辑：

- stage template 支持 `extends/append`。
- full design template 支持 `module:start/end`。

### 8.2 Stage template resolver

返回：

```ts
type TemplateInfo = {
  source: "extension" | "project" | "global" | "builtin"
  extension?: string
  path: string
  extends: { baseStage: string } | null
  inheritanceChain: Array<{
    level: string
    path: string
    content?: string
    appendContent: string | null
  }> | null
  useFullContent: boolean
}
```

Agent navigation另有 `loadTemplateContentForAgent`，直接按优先级返回最终选中文件全文，不执行 append 合并；需要严格兼容时保留两套返回行为。

### 8.3 Full template parser

模块标记：

```html
<!-- module:start -->
## 2.3 [模块名]
...
<!-- module:end -->
```

解析结果：

- `skeleton`：原完整模板。
- `skeletonWithoutModules`：移除模块块。
- `moduleTemplates`：模块标题和正文。
- `baseNumber/baseHash`。
- `hasMarkers`。
- 必需章节：一级/二级编号标题，过滤占位符标题。

Assembler 将各模块标题重新编号，并优先插入原 end marker 之后的首个固定标题之前；找不到锚点则追加。

## 9. 生成系统设计

### 9.1 Run lifecycle

manifest 状态：

```text
running → generated → applied
       ↘ failed
```

`createRun` 生成毫秒时间 ID，冲突加 `-2/-3`。记录当前短 commit；Git 不可用为 null。

失败路径必须：

1. `status=failed`。
2. 保存错误 code/message/diagnostics/log pointer。
3. 写 manifest 和 latest。
4. 尝试上报。
5. 返回原错误对象。

### 9.2 仓库扫描

遍历算法：

```js
walk(root):
  sort directory entries
  if gitignore matches: ignore
  if ignored directory: skip subtree
  if file:
    increment totalFiles
    if lock/test/binary/large/unsupported: ignore
    else read UTF-8, collect stats
```

内置 ignore 应作为配置常量实现。语言识别按扩展名；只有累计至少 100 行的语言进入主要 languages。文件树只展示识别语言对应代码扩展。

### 9.3 关键文件选择

候选打分综合：

- 导入图中心性。
- 接口/定义/稳定性注解。
- 路径语义。
- 语言特定模式。
- 文件大小。
- 排除和质量规则。

file-selector 可调用 runner 做最终选择，并将 key files 和 centrality 写日志。失败终止整个 run。

### 9.4 模块规划

先由本地启发式根据语言、目录和框架生成 initial plan，再将 scan、候选模块、关键文件、文档上下文和 knowledge 写 prompt。Runner 返回 JSON 后：

- 规范化 module paths。
- 删除重叠路径。
- 丢弃不存在路径。
- 保留项目名、语言、统计。

TTY 编辑器直接编辑 `plan.json`，支持增删改、排序和路径校验。非 TTY 直接使用 Agent 决策。

### 9.5 并发

`createGlobalConcurrencyController(max)` 维护 active count 和 FIFO queue。所有模型任务通过同一控制器；模块用 `Promise.all`，但实际并发不超过 max。

批量模式的所有业务模块共享同一个控制器，避免“外层模块并发 × 内层分析并发”放大。

### 9.6 Retry

设计和 spec 任务每次：

1. 调 runner。
2. runner 失败则按重试策略等待。
3. 内容成功后运行质量检查。
4. 质量失败时把 finding 注入下一次修复 prompt。
5. 达上限返回质量或 runner 错误。

默认三次。planning、关键文件和模块分析也使用相应重试工具。

### 9.7 PlantUML

提取所有 ` ```plantuml ` block，调用 PlantUML 服务/验证逻辑识别错误，将多个错误组成修复 prompt 交给同一 runner，解析修复块并重建原文。无法完全修复可记录 remaining errors，不阻止当前 run 完成。

### 9.8 Runner 接口

统一接口：

```ts
type RunTask = (args: {
  root: string
  runDir: string
  promptFile: string
  task: string
  model?: string | null
  agent?: string | null
  planMode?: string
  attempt?: number
}) => Promise<{
  ok: boolean
  content?: string
  log?: object
  code?: string
  message?: string
  next?: string[]
}>
```

各 runner：

| runner | 调用 |
|---|---|
| opencode | `opencode run --dir ROOT --format json [--model] [--agent plan]`，prompt stdin |
| codegenie | 与 opencode 等价命令形状 |
| codeagent | `codeagent -p --output-format json --add-dir ROOT [--model]`，stderr GBK |
| chrys | `chrys run -t PROMPT -a AGENT -C ROOT --json` |
| nga | `nga run generate [-f PROMPT] [--model] [--agent plan]` |
| opencode-serve | `@opencode-ai/sdk` 连接默认 `http://127.0.0.1:4096`，复用 client |
| relay-serve | WebSocket 默认 `ws://localhost:8080/ws/codespec-client`，每任务会话 |
| relay-pool | WebSocket 默认 `ws://localhost:8080/ws/codespec-pool`，持久连接/切 session |

本地 CLI runner 长任务超时 60 分钟，file-selection/planning 快速任务 10 分钟。Serve/Relay 全局 30 分钟、单任务约 15 分钟、session 初始化 10 秒。

输出解析策略：

1. 去 ANSI。
2. 尝试 JSONL，从 assistant/final/message/result/text 事件收集文本。
3. 尝试单 JSON 的 `content/markdown/final/result/message.content`。
4. 文档任务提取 Markdown；规划任务保留普通 JSON/text。
5. 为空时返回 `{RUNNER}_EMPTY_OUTPUT` 和日志/预览/诊断。

## 10. Batch 设计

batch 只接收 JSON，不接收 YAML。输入路径相对项目根解析，允许文件或目录。

处理：

```text
load and validate modules
→ load templates once
→ scan full repository once
→ create batch run
→ copy knowledge once
→ create renderer and global concurrency controller
→ for each module:
     filter scan by paths
     generate in modules/{slug}
→ aggregate manifest
```

模块 slug 使用与 change 相似的危险字符替换。

## 11. Implement 子系统设计

### 11.1 两种任务格式

legacy：

```markdown
## 2. 领域层
- [ ] 动作
- [→] 动作
- [✓] 动作
- [⚠] 动作
```

解析 ID 为 `{sectionNumber}.{itemCounter}`。支持 `## 检查点：` 下的阻塞原因/恢复指引附加到最近未完成任务。

plan：

- 以是否包含 `### Task ` 检测。
- Header 只接受整数 Task ID。
- section title 支持冒号在粗体内/外。
- Files 只解析 `- Create|Modify|Test: path`。
- Task 结束于下一个 Task、`---`、二级标题或 EOF。
- 状态行必须独立。

### 11.2 状态修改

根据解析出的 `lineNumber` 修改同一行，不重排文档。`markTask` 重新读文件，防止调用者内容过旧。

### 11.3 No-placeholder

plan `--run` 扫描：

```text
[占位]
TODO:
待做:
待实现:
类似 Task N
fill in
placeholder
[ TODO ]
```

发现任一返回具体匹配和行号，不进入实现。

### 11.4 Prompt

CLI 内有两套近似 prompt builder；行为兼容版保留 `cli.js` 的 builder 作为 `--task` 输出。Prompt 包含完整 Task、文件、Do、Verify、禁止猜测和四种报告格式。

`review-gates.js` 当前是扩展占位：`executeQuickReview` 总返回通过；不要把它误接为强门。

## 12. Agent 集成设计

### 12.1 Adapter

普通 adapter 仅定义：

```ts
{
  key,
  displayName,
  commandDir | globalCommandDir,
  installCommand(root, commandId, sourcePath, options)
}
```

`chrys` 使用定制 `install`，因为它安装单一 Skill 和展平资源，而不是 slash command 目录。

### 12.2 安装

```text
resolve integration
→ resolve root/config
→ reject local pack overrides
→ reject legacy workflow without workflowPack
→ load pack
→ install main + stages + utilities
→ copy agent/skill/reference asset groups
→ write integration manifest
```

manifest 示例：

```json
{
  "integration": "opencode",
  "version": "0.1.0",
  "commandDir": ".opencode/command",
  "subagentDir": ".opencode/agents",
  "files": [
    {
      "path": ".opencode/command/codespec.md",
      "sha256": "...",
      "managed": "file",
      "isGlobal": false
    }
  ]
}
```

### 12.3 删除

逐文件 hash 比较是用户修改保护。全局文件相对 home 解析，本地文件相对 root。删除后按路径深度倒序清理空目录。

## 13. Template Sync 设计

源：

- `workflow-packs/codespec/templates/delta`
- `workflow-packs/codespec/templates/full`
- pack commands
- Claude Code 专用 commands

目标：

- `~/.codespec/templates`
- 已存在的 `.opencode/command`、`.codegenie/command`、`~/.cac/command`
- Chrys references
- `.claude/commands`

只比较同名 `.md` 的新增/修改，不删除目标多余文件。Chrys 在目标端使用 `command.{sourceName}`。

缓存 `~/.codespec-cli/sync-manifest.json`：

```json
{
  "version": 1,
  "cliVersion": "0.4.1-beta.3",
  "lastCheckAt": "ISO-8601",
  "lastAction": "no-diff|updated|declined|force-updated"
}
```

普通 `start` 同版本有缓存即跳过 hash 扫描。显式 `template sync` 可强制检测；`--force` 无确认覆盖。

## 14. Extension 设计

扩展是编译期注册在常量中的模板集合，不支持运行时发现第三方包。

安装：

1. 查注册表。
2. 读取 config。
3. 文件存在但 config 缺记录时允许修复安装。
4. 按 stageKey 检测与其他 extension 冲突。
5. 创建目录并复制全部文件。
6. 写 config。

解析模板时遍历 config 中已启用 extension，首个存在对应 stage 文件的扩展获胜；因此 config 对象顺序在多扩展强制安装时会影响优先级。

## 15. 遥测设计

### 15.1 事件

`OPERATION_TYPES` 为命令成功/失败提供稳定字符串。通用映射：

```text
command.toUpperCase().replace("-", "_")
→ explicit *_SUCCESS/*_FAILED
→ explicit neutral type
→ codespec-{command}-{success|failed}
```

### 15.2 投递

```text
retry up to 10 queued files
→ build current report
→ choose identity
→ POST 10s timeout
→ success: return
→ failure: queue JSON
→ trim queue to newest 100
```

队列记录 attempts、createdAt、lastAttemptAt、lastError。attempts >= 3 的旧记录删除。

## 16. 输出与错误设计

### 16.1 Result 约定

所有 handler 应尽量返回：

```ts
type Result = {
  ok?: boolean
  code?: string
  message?: string
  root?: string
  change?: string
  items?: unknown[]
  next?: string[]
  [extra: string]: unknown
}
```

规则：

- 业务预期失败优先返回 `ok:false`，调用点设置 exitCode。
- 编程/输入致命错误可抛出带 code 的 Error。
- JSON 模式不得夹杂品牌/颜色。
- 更新检查在 JSON 模式完全禁用。

### 16.2 关键错误码

实现必须稳定支持：

```text
CLI_ERROR
NO_ACTIVE_CHANGE
CHANGE_NOT_FOUND
UNKNOWN_STAGE
STAGE_FILE_MISSING
STAGE_FILE_LOOKS_TEMPLATE
PREVIOUS_STAGE_UNCONFIRMED
WORKFLOW_PACK_DRIFT
WORKFLOW_REFRESH_CONFIRMATION_REQUIRED
WORKFLOW_PACK_REF_MISSING
VALIDATION_FAILED
DONE_FORCE_NOT_SUPPORTED
BASELINE_UPDATE_SNAPSHOT_MISSING
FULL_DOCS_NOT_UPDATED
TASKS_FILE_MISSING
TASK_NOT_FOUND
UNSUPPORTED_FORMAT
NO_PLACEHOLDER_VIOLATION
VALIDATION_NOT_CONFIRMED
IMPLEMENTATION_NOT_COMPLETED
IMPLEMENTATION_PENDING_CONFIRM
REVIEW_STAGE_NOT_FOUND
CODESPEC_NOT_INITIALIZED
UNSUPPORTED_RUNNER
NO_GENERATED_RUN
RUN_ARTIFACT_MISSING
APPLY_OVERWRITE_REQUIRED
APPLY_QUALITY_FAILED
INVALID_MODULES
NO_MODULES
EXTENSION_NOT_FOUND
EXTENSION_ALREADY_INSTALLED
EXTENSION_NOT_INSTALLED
TEMPLATE_CONFLICT
BASE_TEMPLATE_NOT_FOUND
GLOBAL_TEMPLATE_EXTENDS_GLOBAL
```

Runner 错误使用 `{RUNNER}_NOT_FOUND/FAILED/EMPTY_OUTPUT`。

## 17. 静态 Web 与 Dashboard 设计

### 17.1 静态服务器

使用 Node `http.createServer`。URL 先用 `new URL` 解析和 decode，normalize 后 `path.relative(staticRoot, candidate)` 验证不以 `..` 开头且不是绝对路径。

只需流式读取文件，不做缓存、压缩、目录列表或 SPA fallback。

### 17.2 Dashboard

独立 workspace：

- Vue 3 composition API。
- Vue Router history。
- Axios `withCredentials=true`，base URL 来自 `VITE_API_BASE_URL`。
- DevUI + ECharts。
- onMounted 并行加载 summary/detail/distribution。
- 时间范围切换重新请求。
- 部门树展平后本地分页，饼图点击和 breadcrumb 钻取。

Dashboard 的 API server、鉴权和部署不在本仓实现。

## 18. 测试设计

### 18.1 单元测试

使用 `node:test` + `assert`，不引入测试框架。

优先单测：

- workflow schema/path/hash。
- state 初始化和前后阶段。
- template 占位符和继承。
- task 两种格式与 marker。
- runner stdout parser。
- scanner ignore/language。
- report option 脱敏。

### 18.2 CLI 集成测试

每个测试使用临时目录，调用真实 `bin/codespec.js`，断言：

- status code。
- stdout/stderr JSON。
- 目录、文件和 hash。
- 不覆盖/修改保护。

测试环境应设置 `--no-update-check` 或注入等价禁用，避免每个子进程访问版本服务。

### 18.3 生成测试

通过 options 注入 fake runner，不依赖真实 Agent：

1. fake planning 返回模块 JSON。
2. fake module 返回合规模块 Markdown。
3. fake design/spec 返回模板完整章节。
4. 断言 run、manifest、logs、apply。
5. 质量失败用固定序列响应测试 retry。

### 18.4 E2E

真实 E2E 默认 skip，由环境开关运行，验证：

- 真实 Agent 安装。
- 完整 change 进入 archive。
- full spec/design 在 baseline 后发生更新。

## 19. 构建与发布

根包：

```json
{
  "type": "module",
  "bin": { "codespec": "./bin/codespec.js" },
  "files": [
    "bin", "src", "scripts", "assets", "templates",
    "workflow-packs", "README.md", "CHANGELOG.md", "standards", "docs"
  ],
  "scripts": {
    "web": "node ./scripts/serve-web.js",
    "test": "node --test",
    "codespec": "node ./bin/codespec.js",
    "prepare": "node scripts/fix-bin-perms.js",
    "postinstall": "node scripts/fix-bin-perms.js"
  }
}
```

发布前：

1. `npm test`。
2. 检查 bin shebang LF 和 Unix execute bit。
3. 校验 workflow pack 所有 command/template 文件。
4. 从干净临时目录执行 init/start/go。
5. 打包 dry-run，确认 files 白名单包含运行所需资产。

Dashboard 独立在其目录执行 `npm install && npm run build`，不影响 CLI 包发布。

## 20. 复刻实施顺序

为降低返工，按以下垂直切片：

1. ESM 包、bin、parseArgs、JSON 错误、fs-utils。
2. 默认 pack loader、workflow validator、state。
3. init/start/status/go/accept/validate/archive/done。
4. project workflow、漂移、stage/template/extension。
5. Agent integration 和 SubAgent 资产。
6. tasks parser、implement、review。
7. scanner、template loader、fake runner 生成、show/apply。
8. 各真实 runner 和 batch。
9. 遥测、版本检查、终端 UI。
10. 静态官网；如确有运营需要再实现 Dashboard。

每一切片必须带最小可运行测试；不要先搭建插件框架、数据库或常驻服务。

## 21. 当前缺陷的实现决策

复刻前必须选择：

### 21.1 严格兼容模式

保留 `spec.md` 第 17 节全部行为，包括未实现 `template validate`、review 直接返回缺 delegate 字段、implementation 可提前 accept 等。适合替换现有二进制而不改变自动化。

### 21.2 修正版模式

建议只做以下最小修复，并以 minor/major 版本声明：

1. 实现或从 help/测试移除 `template validate`。
2. 修复 review handler 不可达代码。
3. `confirmStage` 对 implementation 强制检查 Task 均 done，blocked 需显式豁免。
4. 未知 option 报错。
5. 明确 checks 是 warning 还是 confirmation gate。
6. 修复 Dashboard `/` 自重定向。

除此之外不新增抽象层；现有“同步文件 + 纯函数 + adapter”的结构足够支撑当前规模。
