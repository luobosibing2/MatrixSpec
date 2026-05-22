# MatSpec 模板体系详细 Spec

本文档定义当前仓库模板体系的用途、结构、字段语义和复刻规则。模板源文件位于 `templates/`，示例位于 `examples/sample-project/`。

## 1. 模板总览

模板分为三类：

1. 全量模板：`templates/full/`。
2. 增量模板：`templates/delta/`。
3. 产业化扩展模板：`templates/extension/`。

模板只提供写作结构，不代表真实项目内容。复刻 CLI 或 Agent 流程时，不应把空模板自动写入业务项目作为已完成文档。

## 2. 文件清单

| 类别 | 文件 | 目标位置 | 用途 |
|------|------|----------|------|
| 全量 | `templates/full/SPEC.md` | `SPEC.md` 或 `matspec/specs/spec.md` | 功能规格说明书 |
| 全量 | `templates/full/SPEC-annotated.md` | 写作参考 | 带注释的 Spec 写作指导 |
| 全量 | `templates/full/DESIGN.md` | `DESIGN.md` 或 `matspec/specs/design.md` | 实现设计文档 |
| 增量 | `templates/delta/proposal.md` | `changes/{REQ-ID}/proposal.md` | 需求澄清 |
| 增量 | `templates/delta/delta-spec.md` | `changes/{REQ-ID}/delta-spec.md` | Spec 增量设计 |
| 增量 | `templates/delta/delta-design.md` | `changes/{REQ-ID}/delta-design.md` | Design 增量设计 |
| 增量 | `templates/delta/tasks.md` | `changes/{REQ-ID}/tasks.md` | 可执行任务清单 |
| 增量 | `templates/delta/validation.md` | `changes/{REQ-ID}/validation.md` | 一致性验证 |
| 扩展 | `templates/extension/service-context.md` | `matspec/service-context.md` | 周边交互上下文 |
| 扩展 | `templates/extension/guidelines/coding.md` | `matspec/guidelines/coding.md` | 项目编码规范 |
| 扩展 | `templates/extension/guidelines/testing.md` | `matspec/guidelines/testing.md` | 项目测试规范 |

## 3. 命名规则

### 3.1 全量文档命名

轻量模式：

```text
SPEC.md
DESIGN.md
```

产业化模式：

```text
matspec/specs/spec.md
matspec/specs/design.md
```

规则：

1. 模板名使用大写 `SPEC.md` / `DESIGN.md`。
2. 产业化项目可使用小写 `spec.md` / `design.md`，当前 CLI 以小写为默认路径。
3. 全量文档必须是当前业务的完整权威描述。

### 3.2 增量目录命名

```text
matspec/changes/{REQ-ID}/
```

推荐形式：

```text
REQYYYYMMDD-feature-name
REQ20251015-incremental-analysis
```

规则：

1. `REQ-ID` 应包含可追踪的需求编号或日期。
2. `feature-name` 使用短横线连接。
3. 目录内文件名固定，不随功能重命名。

### 3.3 章节编号

1. Spec 全量章节使用 `1` 到 `6` 作为主结构。
2. Design 全量章节使用 `1` 到 `10` 作为主结构。
3. 增量文档应引用全量章节编号，例如 `5.X`、`6.X`。
4. 合并回全量时应重新整理编号，避免长期保留 `X` 或占位符。

## 4. `SPEC.md` 模板

### 4.1 用途

`SPEC.md` 定义组件的业务规格，回答 What 和 Why。

### 4.2 必备章节

1. `1. 组件定位`
2. `2. 领域术语`
3. `3. 角色与边界`
4. `4. DFX 约束`
5. `5. 核心能力`
6. `6. 数据约束`

### 4.3 字段语义

#### 组件定位

必须回答：

1. 本组件负责什么核心业务能力。
2. 核心输入来自哪里。
3. 核心输出给谁。
4. 本组件明确不负责什么。

#### 领域术语

写作规则：

1. 使用业务定义，不使用代码类名替代。
2. 可补充别名或备注。
3. 同一术语在 Spec、Design、任务和测试中保持一致。

#### 角色与边界

必须包含：

1. 核心角色。
2. 外部系统。
3. 交互上下文 PlantUML 图。

#### DFX 约束

至少覆盖：

1. 性能。
2. 可靠性。
3. 安全性。
4. 可维护性。
5. 兼容性。

这些是业务红线，Design 应再把它们落成技术策略。

#### 核心能力

每个功能模块应包含：

1. 业务规则。
2. 交互流程。
3. 异常场景。

业务规则格式：

```markdown
1. **规则名称**：[使用必须/应当/禁止描述约束]
   - **验收条件**：[触发场景] -> [预期行为]
```

#### 数据约束

描述领域对象级约束，例如：

1. 唯一性。
2. 枚举值范围。
3. 长度、精度、上下限。
4. 必填关系。
5. 时间或状态约束。

禁止写表结构、字段类型、索引和 DDL。

## 5. `SPEC-annotated.md` 模板

用途：

1. 新团队学习 Spec 写作。
2. 解释每个章节应该写什么。
3. 提供常见错误和禁写项提示。

复刻规则：

1. 可作为培训材料保留。
2. 不建议作为最终业务文档直接提交。
3. 若用它起草，提交前应删除指导性注释和占位符。

## 6. `DESIGN.md` 模板

### 6.1 用途

`DESIGN.md` 定义实现设计，回答 How。

### 6.2 必备章节

1. `1. 设计概述`
2. `2. 系统架构`
3. `3. 数据模型`
4. `4. 接口设计`
5. `5. 核心流程设计`
6. `6. 算法设计`
7. `7. 缓存设计`
8. `8. 异常处理设计`
9. `9. 监控与日志`
10. `10. 安全设计`

### 6.3 字段语义

#### 设计概述

说明设计目标和设计约束。约束应来自 Spec、现有技术栈、部署环境或兼容要求。

#### 系统架构

必须包含：

1. 架构概览图。
2. 模块职责表。
3. 技术栈表。

#### 数据模型

可包含：

1. ER 图。
2. 表结构。
3. 字段类型。
4. 索引。
5. 迁移说明。

#### 接口设计

必须可实现，至少包含：

1. 方法。
2. 路径。
3. 认证方式。
4. 请求示例。
5. 响应示例。
6. 错误码。

#### 核心流程设计

使用 PlantUML 描述调用流程，说明关键步骤。

#### 算法、缓存、异常、安全、监控

这些章节用于把 Spec 的 DFX 和业务规则转化为技术策略。无相关内容时应写“无新增”或“沿用现有设计”，不要删除章节。

## 7. `proposal.md` 模板

### 7.1 用途

需求澄清文档。它不是变更申请表，而是确认真实需求和边界的 gate：先区分用户提出的表面改动和背后的真实工作流问题，再确认范围、非目标、已确认决策、开放问题和影响预览。

### 7.2 必备章节

1. `0. User Clarification Log`
2. `1. Requested Change vs Real Need`
3. `2. Problem Statement`
4. `3. User, Actor, and Scenario`
5. `4. Success Criteria`
6. `5. Scope Boundary`
7. `6. Non-Goals`
8. `7. Confirmed Decisions`
9. `8. Assumptions and Open Questions`
10. `9. Impact Preview`

### 7.3 字段规则

`Requested Change vs Real Need` 必须区分：

1. 用户原始请求。
2. 该请求是否只是一个方案或 UI/API 改动。
3. 背后的痛点、工作流失败、业务目标或运营问题。
4. 可观察的成功信号。

`Scope Boundary` 必须指出：

1. 本次明确包含什么。
2. 哪些现有行为必须保持兼容。
3. 新增搜索、筛选、排序、表单输入、API 参数或配置项时，必须确认与既有输入的组合语义、优先级、空值行为、无结果行为、exact/partial、格式归一化和兼容性。

`Confirmed Decisions` 和 `Decision Ledger` 必须区分：

1. 用户确认。
2. 现有 spec/design。
3. 代码事实。
4. Agent 推断。

任何会影响业务范围、数据模型、迁移、兼容性、权限、可测试性或验收标准的 Agent 推断，进入下一阶段前必须确认。

## 8. `delta-spec.md` 模板

### 8.1 用途

描述对全量 Spec 的增量变更。

### 8.2 必备结构

1. `ADDED Requirements`
2. `MODIFIED Requirements`
3. `REMOVED Requirements`
4. `数据约束变更`
5. `术语变更`
6. `合并检查清单`

### 8.3 写作规则

`ADDED`：

1. 写新增业务能力。
2. 使用与全量 Spec 兼容的章节编号。
3. 每条规则有验收条件。

`MODIFIED`：

1. 写完整修改后的内容。
2. 标注原规则摘要，例如“原为”。
3. 说明新预期行为。

`REMOVED`：

1. 写删除对象。
2. 写删除原因。
3. 写迁移路径。

数据约束变更：

1. 可写新增领域对象。
2. 可写字段约束变化。
3. 不写数据库类型和索引。

## 9. `delta-design.md` 模板

### 9.1 用途

描述对全量 Design 的增量变更。

### 9.2 必备章节

1. `1. 设计背景`
2. `2. 设计决策`
3. `3. 数据模型变更`
4. `4. 接口设计变更`
5. `5. 流程设计`
6. `6. 风险与缓解`
7. `7. 待解决问题`
8. `合并检查清单`

### 9.3 写作规则

设计决策必须包含：

1. 决策内容。
2. 背景。
3. 方案对比。
4. 采纳理由。

数据模型变更必须能指导迁移实现。接口设计变更必须能指导接口实现和兼容性验证。

风险表至少包含：

1. 风险。
2. 可能性。
3. 影响。
4. 缓解措施。

## 10. `tasks.md` 模板

### 10.1 用途

把设计拆解为开发者或 AI Agent 可以执行的任务。

### 10.2 默认任务分组

1. 数据模型。
2. 领域层。
3. 应用层。
4. 基础设施层。
5. 接口层。
6. 测试。
7. 文档更新。
8. 验证。

### 10.3 写作规则

每个任务应尽量包含：

1. 动作：创建、修改、删除、验证。
2. 文件或模块路径。
3. 对应业务规则或设计项。
4. 验证方式。

不合格任务示例：

```markdown
- [ ] 优化登录逻辑
```

合格任务示例：

```markdown
- [ ] 修改 `src/auth/LoginService.ts`，实现 `delta-spec.md` 5.2.1 中的失败次数锁定规则，并补充单元测试。
```

## 11. `validation.md` 模板

### 11.1 用途

实现前阶段门，用于判断文档链是否可进入实现。

### 11.2 必备章节

1. 验证概览。
2. Proposal 与 Delta-Spec 覆盖检查。
3. Delta-Spec 与 Delta-Design 覆盖检查。
4. Delta-Design 与 Tasks 覆盖检查。
5. 与全量文档兼容性。
6. 遗漏检查。
7. 问题与修订建议。
8. 验证结论。

### 11.3 状态语义

建议状态：

1. `通过`：完全覆盖，无明显冲突。
2. `警告`：有低风险缺口，可带条件进入下一阶段。
3. `不通过`：存在阻断，必须修订。
4. `缺失`：没有对应内容。
5. `部分覆盖`：只覆盖部分场景或规则。

结尾必须写：

```markdown
- **是否允许进入实现**：[是/否]
- **阻断问题**：[无/列出问题]
```

## 12. 扩展模板

### 12.1 `service-context.md`

用途：描述仓库与外部系统的交互全集。

必备章节：

1. 服务定位。
2. 上游调用方。
3. 下游依赖。
4. 外部系统与平台依赖。
5. 数据流向。
6. 运维与环境依赖。
7. 相关文档。

规则：

1. 不替代 Spec / Design。
2. 用于补足上下游、数据流和运维依赖。
3. 应在任务和设计中被引用。

### 12.2 `guidelines/coding.md`

用途：项目级编码约束。

至少记录：

1. 基本原则。
2. 命名规范。
3. 分层与依赖。
4. 错误处理。
5. 提交前检查。

### 12.3 `guidelines/testing.md`

用途：项目级测试约束。

至少记录：

1. 测试分层。
2. 覆盖要求。
3. 命名规范。
4. 提交前检查。

## 13. 模板实例化流程

复刻新项目时：

1. 选择轻量模式或产业化模式。
2. 用真实业务内容创建全量 Spec。
3. 用真实技术内容创建全量 Design。
4. 收到需求后创建 `changes/{REQ-ID}/`。
5. 按顺序写 `proposal.md`、`delta-spec.md`、`delta-design.md`、`tasks.md`、`validation.md`。
6. 用户或评审方确认每个阶段。
7. 实现完成后合并增量到全量文档。
8. 归档变更目录。

当前 CLI 的设计选择是：`init` 和 `start` 不复制内容模板到业务工作区。Agent 在交互澄清后生成真实阶段文档。

## 14. 示例复刻依据

`examples/sample-project/` 展示完整闭环：

1. `spec.md`：全量业务规格。
2. `design.md`：全量实现设计。
3. `changes/REQ20251015-incremental-analysis/proposal.md`：增量分析需求。
4. `delta-spec.md`：新增和修改业务规则。
5. `delta-design.md`：设计决策、数据模型、API 和 worker 流程。
6. `tasks.md`：文件级实现任务。
7. `validation.md`：覆盖矩阵和可进入实现结论。

## 15. 模板质量检查清单

- [ ] 没有遗留 `[占位符]`。
- [ ] Spec 没有混入实现细节。
- [ ] Design 覆盖 Spec 规则。
- [ ] Proposal 的 P0 功能被 Delta-Spec 覆盖。
- [ ] Delta-Spec 的规则都有验收条件。
- [ ] Delta-Design 的关键决策都有理由。
- [ ] Tasks 到文件、模块或接口级。
- [ ] Tasks 包含测试和文档更新。
- [ ] Validation 给出明确进入实现结论。
- [ ] 增量文档能合并回全量文档。

# MatSpec 方法论详细 Spec

本文档用于复刻当前仓库中的 matspec 规格驱动开发方法。复刻时应以本文件描述的方法论为流程骨架，以 `docs/workflow.md`、`standards/matspec-standard.md`、`templates/` 和 `examples/sample-project/` 作为源材料。

## 1. 定位

MatSpec 是一种规格驱动开发方法，目标是把需求、规格、设计、任务、验证和实现串成可追溯闭环。

核心主张：

1. **规格是业务真理源**：业务规则以全量 `SPEC.md` 或 `matspec/specs/spec.md` 为准。
2. **设计承接规格**：实现方案以全量 `DESIGN.md` 或 `matspec/specs/design.md` 为准。
3. **增量驱动变更**：每个需求变更先写在 `changes/{REQ-ID}/`，通过阶段门和实现验证后，在 done finalization 中刷新全量文档。
4. **文档服务实现**：`tasks.md` 必须能被开发者或 AI Agent 直接执行。
5. **实现前验证**：`validation.md` 明确文档链是否可进入实现。

matspec 不把工具状态、平台脚本或 JSON 数据文件作为方法论核心。CLI、Agent 命令、本地生成和静态网站都属于工具适配层。

## 2. 方法论分层

### 2.1 Core Methodology

所有复刻项目都应具备：

1. Spec/Design 分离。
2. 全量文档维护。
3. 增量变更目录。
4. `proposal -> delta-spec -> delta-design -> tasks -> validation` 文档链。
5. 变更完成后在 done finalization 中刷新全量文档。

### 2.2 Industrial Extensions

企业、多仓、微服务和 AI 协作场景推荐增加：

1. `matspec/` 专用目录。
2. `matspec/service-context.md` 周边交互上下文。
3. `matspec/guidelines/` 编码、测试、安全和评审规范。
4. 阶段门确认。
5. 归档目录 `matspec/changes/archives/`。
6. Agent 集成入口，例如 opencode 的 `/matspec`、Claude Code 的项目命令和 Codex 的仓库技能。

### 2.3 Tooling Adapters

工具层可以实现：

1. CLI 流程推进。
2. 本地自动化脚本。
3. Agent prompt 或 command。
4. 本地运行时状态。
5. 可视化网页。

工具层不得替代 Markdown 权威文档。尤其禁止用 `matspec/data/*.json` 作为核心规格资产。

## 3. 目录模式

### 3.1 轻量模式

适用于单组件或早期项目：

```text
SPEC.md
DESIGN.md
changes/
  {REQ-ID}/
    proposal.md
    delta-spec.md
    delta-design.md
    tasks.md
    validation.md
archive/
  {date}-{REQ-ID}/
```

### 3.2 产业化模式

当前 CLI 和 README 推荐的复刻结构：

```text
matspec/
  specs/
    spec.md
    design.md
  changes/
    {REQ-ID}/
      proposal.md
      delta-spec.md
      delta-design.md
      tasks.md
      validation.md
    archives/
  guidelines/
    coding.md
    testing.md
  service-context.md
.matspec-cli/
  config.yaml
  manifests/
  workflows/
  presets/
  integrations/
  extensions/
  runs/
  cache/
  tmp/
```

复刻规则：

1. 同一项目只选择一种主结构，不维护两套互相独立的全量规格。
2. `matspec/specs/spec.md` 和 `matspec/specs/design.md` 必须来自真实项目内容，不得用空模板冒充。
3. `.matspec-cli/runs/`、`.matspec-cli/cache/`、`.matspec-cli/tmp/` 是运行缓存，应进入 `.gitignore`。

## 4. 核心文档模型

### 4.1 全量 Spec

文件：`SPEC.md` 或 `matspec/specs/spec.md`。

职责：

1. 描述组件定位、业务边界、角色、外部系统、DFX 红线。
2. 描述核心业务能力、业务规则、验收条件、异常场景。
3. 描述领域对象的数据约束。

禁止内容：

1. 数据库表结构、索引、DDL。
2. 类、函数、模块内部调用链。
3. 缓存、消息队列、算法选型。
4. 测试代码和部署脚本。

### 4.2 全量 Design

文件：`DESIGN.md` 或 `matspec/specs/design.md`。

职责：

1. 描述架构、模块职责和技术栈。
2. 描述数据模型、接口设计、核心流程、算法、缓存、异常、安全、监控。
3. 将 Spec 的业务约束转化为可实现方案。

Design 不应重新定义业务真理。若 Design 与 Spec 冲突，除非 Spec 被确认错误，否则以 Spec 为准修正 Design 和代码。

### 4.3 增量文档链

每个 `changes/{REQ-ID}/` 固定包含以下阶段产物：

| 阶段 | 文件 | 关注点 | 阶段目标 |
|------|------|--------|----------|
| 1 | `proposal.md` | Why / What / Impact | 澄清需求背景、范围、非目标、验收标准和影响 |
| 2 | `delta-spec.md` | What / Why | 把需求转成可验证业务规则 |
| 3 | `delta-design.md` | How | 设计实现方案并覆盖规格规则 |
| 4 | `tasks.md` | Execution | 拆成可执行、可验证任务 |
| 5 | `validation.md` | Gate | 检查文档链覆盖、冲突和遗漏 |

## 5. 生命周期

### 5.1 阶段 0：需求输入

输入是一个需求条目，通常使用 `REQ{date-or-id}-{slug}` 命名，例如 `REQ20251015-incremental-analysis`。

产物：

```text
matspec/changes/{REQ-ID}/
```

最小规则：

1. 目录名必须能唯一标识需求。
2. 同一变更目录只承载一个需求闭环。
3. 不在此阶段创建空模板内容作为已完成文档。

### 5.2 阶段 1：需求澄清

产物：`proposal.md`。

必须澄清：

1. 现状痛点。
2. 业务驱动。
3. 功能清单和优先级。
4. 用户故事和验收标准。
5. 非目标。
6. 受影响的 Spec / Design 章节。
7. 破坏性变更、迁移方案和依赖关系。
8. 本次新增 DFX 约束。

完成标准：

1. 用户或评审方确认需求范围。
2. 非目标足够清晰，避免实现阶段范围蔓延。
3. 后续 `delta-spec.md` 能逐项追溯到 proposal 功能点。

### 5.3 阶段 2：Spec 增量设计

产物：`delta-spec.md`。

必须包含：

1. `ADDED Requirements`。
2. `MODIFIED Requirements`。
3. `REMOVED Requirements`。
4. 数据约束变更。
5. 术语变更。
6. 合并检查清单。

规则：

1. `ADDED` 写新增能力和业务规则。
2. `MODIFIED` 必须写完整替换后的规则，不只写补丁说明。
3. `REMOVED` 必须写删除原因和迁移路径。
4. 每条规则必须有可判定验收条件。
5. 使用 `必须`、`应当`、`禁止` 表达约束强度。

完成标准：

1. 覆盖 proposal 中所有 P0 功能点。
2. 没有实现细节。
3. 与全量 Spec 无未解释冲突。

### 5.4 阶段 3：Design 增量设计

产物：`delta-design.md`。

必须描述：

1. 设计目标和约束。
2. 非目标。
3. 架构决策、备选方案、采纳理由。
4. 数据模型变更。
5. 接口设计变更。
6. 核心流程。
7. 风险与缓解。
8. 待解决问题。

完成标准：

1. 每条重要业务规则都有设计承接。
2. 关键技术决策有理由。
3. 接口、数据、兼容性和发布风险被明确处理。
4. 与全量 Design 风格和架构方向一致。

### 5.5 阶段 4：任务拆解

产物：`tasks.md`。

任务必须：

1. 拆到模块、文件、接口或责任边界级。
2. 引用对应的 `delta-spec.md` 规则或 `delta-design.md` 设计项。
3. 包含测试任务。
4. 包含文档合并或更新任务。
5. 描述任务依赖关系。

完成标准：

1. 开发者或 AI Agent 可直接执行。
2. 每个业务规则至少有测试或验证任务。
3. 任务顺序与依赖关系一致。

### 5.6 阶段 5：一致性验证

产物：`validation.md`。

必须检查：

1. Proposal 功能点是否被 Delta-Spec 覆盖。
2. Delta-Spec 业务规则是否被 Delta-Design 覆盖。
3. Delta-Design 设计项是否被 Tasks 拆解。
4. 增量文档是否与全量 Spec / Design 冲突。
5. 异常场景、边界条件、DFX 约束和测试任务是否遗漏。

结尾必须给出：

1. 是否允许进入实现。
2. 阻断问题。
3. 验证人或角色。
4. 验证日期。

完成标准：

1. 无阻断问题，或阻断问题已修复后重新验证。
2. 明确允许进入实现。

### 5.7 阶段 6：实现

输入：

1. `tasks.md`。
2. `delta-spec.md`。
3. `delta-design.md`。
4. 全量 `spec.md` 和 `design.md`。
5. `guidelines/` 和 `service-context.md`，如存在。

规则：

1. 实现必须服从 Spec。
2. 若代码发现反向事实，应先修正文档链，再改代码。
3. 测试覆盖至少对应新增或修改的业务规则。

### 5.8 阶段 7：Done Finalization 与归档

活动：

1. 根据最终实现和 `delta-spec.md` 更新全量 Spec。
2. 根据最终实现和 `delta-design.md` 更新全量 Design。
3. 确认 full `spec.md` / `design.md` 在 validation 后已有更新证据。
4. 将变更目录归档到 `archives/{date}-{REQ-ID}`。
5. 将代码和文档一起提交。

当前 CLI 归档路径为：

```text
matspec/changes/archives/{YYYY-MM-DD}-{REQ-ID}/
```

归档前必须确保 done finalization 已经让全量文档成为最新权威版本；默认 `archive` / `done` 会检查 full docs 在 validation 后是否更新。

### 5.9 阶段 8：代码与规格验证

活动：

1. 从源码反向分析实际行为。
2. 与 Spec 语义比对。
3. 冲突时优先修正代码，除非 Spec 被确认错误。

## 6. 阶段门

产业化复刻应设置以下阶段门：

| 阶段门 | 进入下一阶段条件 |
|--------|------------------|
| `proposal confirmed` | 需求范围、非目标、影响分析被确认 |
| `delta-spec reviewed` | 业务规则可验证，未混入实现细节 |
| `delta-design reviewed` | 设计覆盖业务规则，关键决策有理由 |
| `tasks executable` | 任务拆到可执行粒度，依赖明确 |
| `validation passed` | 文档链无阻断问题，可进入实现 |

阶段门可以由 CLI 状态、评审记录、PR 评论或提交历史承载。方法论不强制某种状态文件。

## 7. 角色与职责

| 角色 | 主要责任 |
|------|----------|
| 产品经理 / 业务分析人员 | 组件规格、业务规则、需求澄清、Spec 增量 |
| 产品 | 业务目标、价值、优先级、验收口径 |
| 技术负责人 / 架构师 | Design 增量、架构决策、技术风险 |
| 开发 | 任务拆解、实现、测试 |
| QA | 验证口径、异常场景、质量风险 |
| AI Agent | 辅助澄清、生成文档、执行任务，但不替代用户确认 |
| Committer | 合并增量、归档、提交代码和文档 |

## 8. 编写规范

1. 使用标准 Markdown。
2. 图表使用 PlantUML 代码块。
3. 不使用 YAML Frontmatter 作为核心文档元数据。
4. 不在全量 Spec 内维护独立变更日志，历史由 Git 和归档目录承载。
5. 章节编号稳定，便于增量文档引用和合并。
6. 业务规则写得可判定，避免“尽量”“适当”“合理”等模糊表述。

## 9. 质量规则

复刻项目至少校验：

1. 必备目录存在。
2. 全量 Spec / Design 存在，且不是空模板。
3. `delta-spec.md` 包含 ADDED / MODIFIED / REMOVED。
4. `tasks.md` 包含测试或验证任务。
5. `validation.md` 包含是否允许进入实现的结论。
6. 不存在核心方法论依赖的 `matspec/data/*.json`。
7. 阶段文档顺序符合生命周期。
8. 已确认阶段不得被后续阶段绕过。

## 10. 复刻检查清单

- [ ] 确定采用轻量模式还是产业化模式。
- [ ] 建立全量 Spec 和 Design 的真实初始内容。
- [ ] 建立变更目录命名规则。
- [ ] 固定五个增量文档文件名。
- [ ] 固定阶段门确认方式。
- [ ] 建立合并和归档规则。
- [ ] 建立实现前 `validation.md` 门禁。
- [ ] 建立代码与规格冲突处理规则。
- [ ] 为 AI Agent 明确只可在用户确认后推进阶段。
- [ ] 让所有实现任务可追溯到 Spec / Design。

# MatSpec 工作流程

本文档描述 matspec 增量驱动开发的完整工作流程。

---

## 流程概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           全量文档区（仓库级）                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   SPEC.md （全量功能规格）              DESIGN.md （全量实现设计）            │
│   ════════════════════════            ════════════════════════              │
│   · 组件定位                           · 架构设计                            │
│   · 领域术语                           · 数据模型                            │
│   · 角色与边界                         · 接口详设                            │
│   · DFX约束                            · 技术选型                            │
│   · 核心能力（业务规则）               · 算法设计                            │
│   · 数据约束                           · 实现策略                            │
│                                                                              │
│   What & Why                           How                                   │
│                                                                              │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          │ 增量变更触发
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           增量变更区（需求驱动）                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   changes/{REQ-ID}/                                                           │
│   ├── proposal.md         ← 阶段1: 需求澄清（Why + What Changes）            │
│   ├── delta-spec.md       ← 阶段2: Spec增量设计（ADDED/MODIFIED/REMOVED）    │
│   ├── delta-design.md     ← 阶段3: Design增量设计（技术方案）                │
│   ├── tasks.md            ← 阶段4: 任务拆解（AI Agent 输入）                 │
│   └── validation.md       ← 阶段5: 文档链一致性验证                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ 归档合并
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           归档区（历史追溯）                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   archive/{date}-{REQ-ID}/                                                    │
│   └── [完整的变更提案副本]                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 详细阶段说明

### 阶段0: 需求输入

**来源**：产品或工程需求池中的需求条目

**触发**：创建 `changes/{REQ-ID}/` 目录

```bash
mkdir -p changes/REQ20240101-feature-name
```

---

### 阶段1: 需求澄清

**产出**：`proposal.md`

**内容**：
- Why - 变更动机、业务背景、痛点
- What Changes - 功能清单、用户故事、优先级
- Impact - 影响范围、破坏性变更、依赖关系

**责任人**：产品经理 + 业务分析人员

**评审**：需求评审会

**模板**：[templates/delta/proposal.md](../templates/delta/proposal.md)

---

### 阶段2: Spec增量设计

**产出**：`delta-spec.md`

**内容**：
- ADDED Requirements - 新增的业务规则
- MODIFIED Requirements - 修改的业务规则
- REMOVED Requirements - 删除的业务规则
- 每条规则带验收条件

**关注点**：What & Why（业务规则、数据约束、DFX红线）

**责任人**：产品经理

**评审**：Spec评审

**模板**：[templates/delta/delta-spec.md](../templates/delta/delta-spec.md)

---

### 阶段3: Design增量设计

**产出**：`delta-design.md`

**内容**：
- Goals / Non-Goals - 技术目标
- Decisions - 架构决策、技术选型
- 数据模型变更
- 接口设计变更
- Risks / Trade-offs - 风险与权衡

**关注点**：How（怎么实现）

**责任人**：技术负责人 / 架构师

**评审**：设计评审

**模板**：[templates/delta/delta-design.md](../templates/delta/delta-design.md)

---

### 阶段4: 任务拆解

**产出**：`tasks.md`

**内容**：
- 分组的可执行任务清单
- 每个任务具体到文件/模块级别
- 任务间依赖关系
- 验证/测试任务

**用途**：作为 AI Agent（Claude Code/Cursor）的输入

**责任人**：技术负责人 / 开发工程师

**模板**：[templates/delta/tasks.md](../templates/delta/tasks.md)

---

### 阶段5: 一致性验证

**产出**：`validation.md`

**内容**：
- `proposal.md` 中的功能点是否被 `delta-spec.md` 覆盖
- `delta-spec.md` 中的业务规则是否被 `delta-design.md` 承接
- `delta-design.md` 中的设计项是否被 `tasks.md` 分解
- 增量文档是否与全量 `SPEC.md` / `DESIGN.md` 冲突
- 遗漏的异常场景、边界条件和 DFX 约束

**关注点**：文档链可追溯、无明显断点、可进入实现

**责任人**：产品经理 / 技术负责人 / 测试工程师

**模板**：[templates/delta/validation.md](../templates/delta/validation.md)

---

### 阶段6: 开发实现

**输入**：`tasks.md` + `delta-spec.md` + `delta-design.md`

**活动**：
- AI Agent 根据 tasks.md 逐个执行任务
- 人工审核 AI 输出
- 单元测试、代码评审

**产出**：代码实现

**责任人**：开发 / AI Agent

---

### 阶段7: Done Finalization 与归档

**活动**：
- 根据最终实现和 `delta-spec.md` 更新 `SPEC.md`（全量刷新）
- 根据最终实现和 `delta-design.md` 更新 `DESIGN.md`（全量刷新）
- 确认 full `spec.md` / `design.md` 在 validation 后已有更新证据
- 变更提案归档到 `archive/{date}-{REQ-ID}/`
- 代码与文档原子化提交

**责任人**：Committer

```bash
# 归档命令示例
mv changes/REQ20240101-feature-name archive/20240115-REQ20240101-feature-name
```

---

### 阶段8: 代码与规格验证

**活动**：
- 代码逆向分析，与 SPEC.md 语义比对
- 冲突时以 SPEC 为准修正代码

**责任人**：QA / Committer

---

## 文档流转关系

```
                              需求输入
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     changes/{REQ-ID}/ 增量变更区                               │
│                                                                               │
│  proposal.md ─▶ delta-spec.md ─▶ delta-design.md ─▶ tasks.md ─▶ validation.md│
│      Why          ADDED/MODIFIED       Decisions        可执行项        覆盖检查 │
│      What         REMOVED              Risks            依赖关系        冲突检查 │
│      Impact       验收条件             How              验证任务        修订建议 │
│                                                                               │
└────────────────────────────┬──────────────────┬──────────────────┬──────────┘
                             │                  │                  │
                             ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            全量文档区                                         │
│                                                                               │
│  ┌─────────────────────┐         ┌─────────────────────┐                     │
│  │      SPEC.md        │◀────────│     DESIGN.md       │                     │
│  │    （全量规格）      │  依赖   │    （全量设计）      │                     │
│  │                     │         │                     │                     │
│  │  What & Why         │         │  How                │                     │
│  └─────────────────────┘         └─────────────────────┘                     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │       代码          │
                              │     （实现）        │
                              │                     │
                              │  AI Agent 输入:     │
                              │  tasks.md           │
                              └─────────────────────┘
```

---

## 各阶段责任人

| 阶段 | 文档 | 责任人 | 关注点 |
|------|------|--------|--------|
| 0. 需求输入 | 创建 changes 目录 | 产品经理 / 业务分析人员 | 需求来源 |
| 1. 需求澄清 | `proposal.md` | 产品经理 + 业务分析人员 | Why + What |
| 2. Spec增量设计 | `delta-spec.md` | 产品经理 | What & Why（业务规则） |
| 3. Design增量设计 | `delta-design.md` | 技术负责人/架构师 | How（技术方案） |
| 4. 任务拆解 | `tasks.md` | 技术负责人/开发工程师 | 可执行任务 |
| 5. 一致性验证 | `validation.md` | 产品经理 / 技术负责人 / 测试工程师 | 文档链覆盖与冲突检查 |
| 6. 开发实现 | 代码 | 开发/AI Agent | 实现 |
| 7. Done Finalization 与归档 | SPEC.md + DESIGN.md 刷新 | Committer | 全量刷新和归档 |
| 8. 代码与规格验证 | 验证报告 | QA | 代码与Spec一致 |

---

## 关键原则

1. **SPEC和DESIGN都是全量的**，增量变更通过delta文档驱动
2. **增量流程**：proposal → delta-spec → delta-design → tasks → validation
3. **validation.md作为实现前检查点**，发现文档链断点时先修订文档
4. **tasks.md作为AI Agent的输入**，实现人机协作
5. **归档机制**保留完整变更历史
6. **代码服从SPEC**：冲突时以SPEC为准修正代码

---

## 产业化扩展

企业、多仓、微服务和 AI 协作场景可采用以下扩展：

1. **`matspec/` 目录**：集中承载 `specs/`、`changes/`、`guidelines/` 与 `service-context.md`。
2. **`AGENTS.md`**：作为 AI Agent 的仓库导航页，只放通用上下文和文档索引，不承载业务规则。
3. **`service-context.md`**：记录上游、下游、外部系统、数据流和运维依赖，补足组件周边交互信息。
4. **`guidelines/`**：记录项目级编码、测试、安全和评审规范，供人和 AI 执行任务时引用。
5. **阶段门**：将 proposal confirmed、delta-spec reviewed、delta-design reviewed、tasks executable、validation passed 作为进入下一阶段的确认点。

`data/*.json`、`state.json`、`skills/`、本地自动化脚本和子代理调度协议属于工具适配层。matspec 不强制这些文件存在，也不允许它们替代 Markdown 规格与设计文档。
# MatSpec CLI 详细 Spec


## 1. 当前实现状态

当前仓库存在真实 CLI，而不是只有文档约定。

基本信息：

| 项 | 值 |
|----|----|
| 包名 | `matspec-community` |
| 命令名 | `matspec` |
| 版本 | `0.1.0` |
| Node 要求 | `>=20.0.0` |
| 入口 | `bin/matspec.js` |
| 主逻辑 | `src/cli.js` |
| 测试命令 | `npm test` |

CLI 的职责：

1. 初始化 matspec 项目结构。
2. 创建和推进变更状态。
3. 校验目录和文档链。
4. 归档完成的变更。
5. 安装 opencode、Claude Code 和 Codex 集成命令或技能。
6. 生成候选 Spec / Design，并在用户确认后应用到权威目录。

CLI 不负责：

1. 自动生成业务文档内容。
2. 修改实现代码。
3. 用模板冒充真实全量文档。
4. 替代用户确认阶段门。

## 2. 打包与入口

`package.json` 必须声明：

```json
{
  "type": "module",
  "bin": {
    "matspec": "./bin/matspec.js"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

`bin/matspec.js` 行为：

1. 调用 `main(process.argv.slice(2))`。
2. 捕获异常。
3. 普通模式向 stderr 输出 `错误：{message}`。
4. `--json` 模式向 stderr 输出：

```json
{
  "ok": false,
  "code": "CLI_ERROR",
  "message": "错误信息"
}
```

5. 异常退出码为 `1`。

## 3. 参数解析

当前实现使用轻量 `parseArgs`，不依赖第三方参数库。

支持的全局选项：

| 选项 | 含义 |
|------|------|
| `--help`, `-h` | 输出帮助 |
| `--json` | 输出机器可读 JSON |
| `--force` | 允许覆盖支持覆盖的文件或强制归档 |
| `--path <dir>` | 指定目标项目目录 |
| `--change <name>` | 指定变更目录 |
| `--integration <name>` | init 时安装集成，默认 `all`，支持 `opencode` / `claude-code` / `codex` / `all` / `none` |


解析规则：

1. 第一个非选项 token 是命令。
2. 后续非选项 token 进入 `args`。
3. 未识别命令抛出 `未知命令：{command}`。

## 4. 目录与文件契约

### 4.1 权威文档目录

CLI 使用产业化目录模式：

```text
matspec/
  specs/
  changes/
  changes/archives/
  guidelines/
```

### 4.2 运行时目录

```text
.matspec-cli/
  config.yaml
  manifests/
  workflows/
  presets/
  integrations/
  extensions/
  runs/
  cache/
  tmp/
```

`.gitignore` 应包含：

```text
.matspec-cli/runs/
.matspec-cli/cache/
.matspec-cli/tmp/
```

### 4.3 配置文件

`.matspec-cli/config.yaml` 默认内容表达：

1. `version: 1`
2. `profile: industrial`
3. `structure: matspec-dir`
4. `paths.docs: matspec`
5. `paths.specs: matspec/specs`
6. `paths.changes: matspec/changes`
7. `paths.archives: matspec/changes/archives`
8. `paths.runtime: .matspec-cli`
9. `change.id_prefix: REQ`
10. `change.single_active_change: false`
11. `validation.require_validation_doc: true`

## 5. 阶段模型

CLI 固定五个阶段：

| index | key | file | agent command | label |
|-------|-----|------|---------------|-------|
| 1 | `proposal` | `proposal.md` | `/matspec.proposal` | 需求澄清 |
| 2 | `delta-spec` | `delta-spec.md` | `/matspec.delta-spec` | Spec 增量设计 |
| 3 | `delta-design` | `delta-design.md` | `/matspec.delta-design` | Design 增量设计 |
| 4 | `tasks` | `tasks.md` | `/matspec.tasks` | 任务拆解 |
| 5 | `validation` | `validation.md` | `/matspec.validation` | 一致性验证 |

状态文件：

```text
matspec/changes/{change}/.matspec-state.json
```

初始状态：

```json
{
  "version": 1,
  "change": "REQ202604270001-user-login",
  "currentStage": "proposal",
  "stages": {
    "proposal": {
      "status": "clarifying",
      "clarified": false,
      "confirmed": false,
      "file": "proposal.md"
    }
  },
  "history": [
    {
      "action": "create-change",
      "stage": "proposal",
      "timestamp": "ISO-8601"
    }
  ]
}
```

确认阶段后：

1. 当前阶段 `status` 变为 `confirmed`。
2. `clarified` 和 `confirmed` 变为 `true`。
3. 写入 `confirmedAt`。
4. `history` 追加 `confirm-stage`。
5. `currentStage` 推进到下一阶段；最后阶段确认后为 `completed`。

## 6. 命令规格

### 6.1 `matspec init [path]`


输入：

```bash
```

行为：

1. 创建 `matspec/specs`。
2. 创建 `matspec/changes`。
3. 创建 `matspec/changes/archives`。
4. 创建 `matspec/guidelines`。
5. 创建 `.matspec-cli/` 运行时目录。
6. 创建或按 `--force` 更新 `.matspec-cli/config.yaml`。
7. 更新 `.gitignore`。
8. 默认安装全部 Agent 集成；`--integration none` 跳过。
10. 不复制 `spec.md`、`design.md`、`proposal.md` 等业务内容模板。

典型 JSON 输出：

```json
{
  "root": "D:/repo",
  "created": ["matspec/specs"],
  "skipped": [".matspec-cli/config.yaml"],
  "items": ["已补齐：", "  matspec/specs"],
  "message": "已检查 matspec 项目：D:/repo",
  "next": ["matspec start REQ202604270001-feature-name", "在 opencode、Claude Code 或 Codex 中进入 matspec 命令/技能"]
}
```

### 6.2 `matspec start <change>` / `matspec new <change>`

用途：创建变更目录和状态文件。

行为：

1. 规范化变更名。
2. 创建 `matspec/changes/{change}/`。
3. 写入 `.matspec-state.json`。
4. 不创建 `proposal.md`。
5. 输出下一步进入 `/matspec`。

变更名规范化：

1. 若输入以至少两个字母加至少六位数字开头，则直接 slugify。
2. 否则生成 `REQ{YYYYMMDDHHmm}-{slug}`。
3. 删除或替换路径非法字符。

### 6.3 `matspec list`

用途：列出活动变更。

行为：

1. 读取 `matspec/changes/` 直接子目录。
2. 排除 `archives`。
3. 文本模式输出“活动变更”或“没有活动变更”。

### 6.4 `matspec status [change]`

用途：查看当前变更的五阶段文档状态。

状态枚举：

| 状态 | 含义 |
|------|------|
| `pending` | 当前阶段可开始，但文件不存在 |
| `blocked` | 前序阶段未完成，暂不可开始 |
| `template` | 文件存在但仍像模板 |
| `draft` | 文件存在且不是模板，等待用户确认 |
| `confirmed` | 状态文件记录已确认 |

模板判定包括：

1. 未解决的 `[占位符]`。
2. 常见模板标记，例如 `[需求编号]`、`F-01 | [功能名]`、`US-01`。
3. 文件内容仅为 `# {fileName}`。

### 6.5 `matspec go [change]` / `matspec next [change]`

用途：供 Agent 获取当前阶段和下一步动作。

无活动变更输出：

```json
{
  "ok": false,
  "code": "NO_ACTIVE_CHANGE",
  "message": "未发现活动的 matspec 变更。",
  "next": ["matspec start REQ202604270001-feature-name"]
}
```

有活动变更输出：

```json
{
  "ok": true,
  "change": "REQ202604270001-user-login",
  "stage": {
    "index": 1,
    "total": 5,
    "key": "proposal",
    "name": "需求澄清",
    "status": "pending",
    "file": "matspec/changes/REQ202604270001-user-login/proposal.md",
    "agentCommand": "/matspec.proposal",
    "entryCommand": "/matspec",
    "objective": "明确业务目标、范围、约束、非目标和验收标准。"
  },
  "nextAction": "open_agent_stage",
  "next": ["在 Agent 中进入 matspec 命令/技能"]
}
```

`nextAction` 语义：

| 值 | 含义 |
|----|------|
| `open_agent_stage` | Agent 应处理当前阶段 |
| `await_user_accept` | 阶段文档已生成，等待用户确认 |
| `complete_previous_stage` | 前序阶段未完成 |
| `implementation` | 文档链已验证，可按 `tasks.md` 执行实现；实现、验证和 done finalization 完成后才能归档 |

### 6.6 `matspec accept [change]`

用途：确认当前阶段并自动推进。

规则：

1. 必须存在当前阶段文件。
2. 当前阶段文件不能是模板内容。
3. 前序阶段必须已确认。
4. 成功后状态推进到下一阶段。

输出字段：

```json
{
  "ok": true,
  "change": "REQ202604270001-user-login",
  "acceptedStage": "proposal",
  "acceptedLabel": "需求澄清",
  "nextStage": {},
  "completed": false,
  "message": "已确认 proposal，进入 Spec 增量设计。",
  "next": ["继续在 Agent 中进入 matspec 命令/技能"]
}
```

### 6.7 `matspec confirm <stage> [change]`

用途：确认指定阶段。

规则与 `accept` 相同，但阶段由参数显式指定。若缺少阶段参数，当前实现兼容为确认当前阶段。

### 6.8 `matspec validate [change]`

用途：校验项目结构和变更文档链。

输出：

1. 文本模式：逐行 `[level] code path - message`。
2. JSON 模式：`{ "findings": [...] }`。
3. 存在 error finding 时退出码为 `1`。

finding 结构：

```json
{
  "level": "error",
  "code": "CS001",
  "path": "matspec",
  "message": "缺少 matspec/ 目录。"
}
```

### 6.9 `matspec doctor`

用途：在 `validate` 基础上诊断本地设置。

额外检查：

1. `.gitignore` 是否存在。
2. 若缺失，输出 `CSD001` 警告。

### 6.10 `matspec done [change]`

用途：实现、验证和 done finalization 完成后，校验并归档已完成变更。

`validation.md` 确认后只表示文档链允许进入实现，不表示实现已经完成。Agent 或开发者必须先按 `tasks.md` 完成代码、测试。实现和验证完成后，进入 done finalization：根据本次 `delta-spec.md` / `delta-design.md` 刷新全量 `matspec/specs/spec.md` / `matspec/specs/design.md`，然后才能执行 `done`。

`matspec generate && matspec apply` 只用于从代码库恢复或重建 baseline，不用于已确认变更的常规版本演进。常规演进由 coding agent 在 done finalization 阶段把增量文档刷新进全量文档。

行为：

1. 先执行 `validateProject`。
2. 存在 error finding 时输出 `VALIDATION_FAILED`，退出码 `1`。
3. 检查 `validation.md` 确认后，`matspec/specs/spec.md` 和 `matspec/specs/design.md` 是否都已在 done finalization 中刷新。
4. 若缺少 done finalization 更新证据，输出 `FULL_DOCS_NOT_UPDATED`，退出码 `1`。
5. 无阻断问题时调用归档。

校验失败输出：

```json
{
  "ok": false,
  "code": "VALIDATION_FAILED",
  "message": "变更未通过校验，不能完成。",
  "findings": []
}
```

done finalization 未完成时：

```json
{
  "ok": false,
  "code": "FULL_DOCS_NOT_UPDATED",
  "message": "done finalization 证据不完整。archive/done 前，matspec/specs/spec.md 和 matspec/specs/design.md 都必须在 validation 后更新。",
  "notUpdated": []
}
```

`done --force` 不作为旁路；需要手工恢复时显式使用 `archive --force`：

```json
{
  "ok": false,
  "code": "DONE_FORCE_NOT_SUPPORTED",
  "message": "matspec done 不支持 --force。仅在明确手工恢复时使用 matspec archive --force。"
}
```

### 6.11 `matspec archive [change]`

用途：把活动变更移动到归档目录。

`archive` 是收尾动作，不是实现前验证动作。默认会检查阶段完成和 done finalization 更新证据。除非显式使用 `--force`，调用者应确保实现、验证和 done finalization 已经完成。

默认规则：

1. 所有阶段必须确认。
2. 所有阶段文件必须存在。
3. 使用 `--force` 可绕过上述检查。
4. 归档目录名为 `{YYYY-MM-DD}-{change}`。
5. 目标目录已存在时失败。

归档前应已经完成代码实现、测试验证，以及 done finalization 对全量 `spec.md` / `design.md` 的刷新。

### 6.12 `matspec integration list`

用途：列出支持的 Agent 集成。

当前支持：

```text
opencode -> .opencode/command
claude-code -> .claude/commands + .claude/skills
codex -> .agents/skills
```

### 6.13 `matspec integration install opencode|claude-code|codex|all`

用途：安装 Agent 仓库级命令文件或技能。

行为：

1. `opencode` 创建 `.opencode/command`。
2. `claude-code` 创建 `.claude/commands` 和 `.claude/skills`。
3. `codex` 创建 `.agents/skills`。
4. 安装 matspec 主入口和五个阶段入口：
   - `matspec.md`
   - `matspec.proposal.md`
   - `matspec.delta-spec.md`
   - `matspec.delta-design.md`
   - `matspec.tasks.md`
   - `matspec.validation.md`
5. 对 Claude Code 和 Codex，阶段入口以 `matspec-*` 技能或命令形式写入。
6. 写入 `.matspec-cli/manifests/integrations/{name}.json`。
7. manifest 记录每个文件路径和 sha256。
8. 不修改 `AGENTS.md`。

### 6.14 `matspec integration remove opencode|claude-code|codex|all`

用途：移除由 CLI 生成且未被用户修改的 Agent 集成文件。

规则：

1. 读取 manifest。
2. 若当前文件 sha256 与 manifest 一致，则删除。
3. 若文件已被用户修改，则保留。
4. `--force` 可强制删除。
5. 删除 manifest。

## 7. 输出规范

### 7.1 人类可读输出

`printResult` 规则：

1. 先输出 `message`。
2. 输出 `items`。
3. 输出 `下一步：` 和 `next`。

`printFindings` 规则：

1. 无问题输出 `未发现问题。`
2. 有问题逐行输出：

```text
```

### 7.2 JSON 输出

规则：

1. `--json` 时输出完整对象。
2. findings 命令输出 `{ "findings": [...] }`。
3. 异常由 bin 层输出 `CLI_ERROR`。
4. 有 error finding 的命令设置退出码 `1`。

## 8. 校验码

| code | level | 含义 |
|------|-------|------|
| `CS001` | error | 缺少 `matspec/` |
| `CS002` | error | 缺少 `matspec/specs/` |
| `CS003` | warn | 缺少全量 `spec.md` |
| `CS004` | warn | 缺少全量 `design.md` |
| `CS005` | error | 缺少 `matspec/changes/` |
| `CS006` | error | 缺少 `matspec/changes/archives/` |
| `CS007` | error | 缺少 `.matspec-cli/config.yaml` |
| `CS008` | error | 存在禁止的 `matspec/data/*.json` |
| `CS100` | error | 指定变更目录不存在 |
| `CS102` | warn | 后序阶段文件存在但前序阶段未完成 |
| `CS103` | warn | 阶段文件未经过用户确认 |
| `CS111` | warn | `proposal.md` 缺少 Requested Change vs Real Need |
| `CS112` | warn | `proposal.md` 缺少范围边界 |
| `CS113` | warn | `proposal.md` 缺少非目标或不在范围事项 |
| `CS114` | warn | `proposal.md` 缺少已确认决策 |
| `CS115` | warn | `proposal.md` 缺少假设或开放问题 |
| `CS116` | warn | `proposal.md` 缺少决策账本 |
| `CS201` | warn | `delta-spec.md` 缺 ADDED / MODIFIED / REMOVED 标题 |
| `CS301` | warn | `tasks.md` 未引用或包含验证任务 |
| `CS302` | warn | `tasks.md` 未包含 done 阶段根据 `delta-spec.md` 刷新 `matspec/specs/spec.md` 的任务 |
| `CS303` | warn | `tasks.md` 未包含 done 阶段根据 `delta-design.md` 刷新 `matspec/specs/design.md` 的任务 |
| `CS401` | warn | `validation.md` 缺少进入实现结论 |
| `CSD001` | warn | 缺少 `.gitignore` |

运行时错误码：

| code | 含义 |
|------|------|
| `NO_ACTIVE_CHANGE` | 没有活动变更 |
| `VALIDATION_FAILED` | done 前校验存在 error |
| `CLI_ERROR` | 顶层异常 |

## 9. Agent 集成契约

opencode 文件安装到：

```text
.opencode/command/
```

Claude Code 仓库级命令和技能安装到：

```text
.claude/commands/
.claude/skills/
```

Codex 仓库级技能安装到：

```text
.agents/skills/
```

主入口：

```text
/matspec
```

opencode 阶段入口：

1. `/matspec.proposal`
2. `/matspec.delta-spec`
3. `/matspec.delta-design`
4. `/matspec.tasks`
5. `/matspec.validation`

Claude Code 阶段入口：

1. `/matspec-proposal`
2. `/matspec-delta-spec`
3. `/matspec-delta-design`
4. `/matspec-tasks`
5. `/matspec-validation`

Codex 阶段入口以仓库级技能形式提供，可通过技能选择或 `$matspec`、`$matspec-proposal` 等方式调用。

Agent 行为契约：

1. 先调用 `matspec go --json`。
2. 根据返回的阶段处理当前文档。
3. 每轮最多问 3 个澄清问题。
4. 用户未明确确认前不调用 `matspec accept --json`。
5. 写入阶段产物后必须输出相对路径。
6. 只写当前阶段产物。
7. 不直接修改 `.matspec-state.json`。
8. 不修改实现代码。
9. 不创建空模板文档。
10. 全量 `spec.md` / `design.md` 缺失时必须提示风险。

阶段面板必须表达：

1. 当前 change。
2. 五阶段进度。
3. 当前阶段 key、名称和目标。
4. 产物路径。
5. 下一步动作。

## 10. 静态网站边界

`packages/web/static/index.html` 是展示性静态网站：

1. 使用 Tailwind CDN。
2. 使用内联 JavaScript。
3. 提供导航、步骤切换、Accordion、复制按钮等前端交互。
4. 不调用本地 CLI。
5. 不执行子进程。
6. 不作为 CLI 实现入口。

复刻 CLI 时无需依赖静态网站；复刻文档展示时可单独复刻该 HTML。

## 11. 安全与敏感信息

3. Git remote 中的用户名密码会被清理。
4. 输出中的 Bearer token 会被替换为 `<redacted>`。
5. 文档中不应写入 token。

## 12. 复刻最小验收

实现一个兼容 CLI 至少应通过以下行为：

- [ ] `matspec init` 幂等创建目录和配置。
- [ ] `matspec init` 不复制内容模板到业务目录。
- [ ] `matspec start REQ...` 只创建变更目录和 `.matspec-state.json`。
- [ ] `matspec status` 能识别 pending、blocked、draft、template、confirmed。
- [ ] `matspec go --json` 返回当前阶段 payload。
- [ ] `matspec accept --json` 能确认非模板阶段文件并推进。
- [ ] `matspec confirm <stage>` 校验前序阶段。
- [ ] `matspec validate` 输出上述校验码。
- [ ] `matspec done` 在 error findings 存在时失败。
- [ ] `matspec archive` 将变更移动到 `matspec/changes/archives/{date}-{change}`。
- [ ] `matspec integration install opencode|claude-code|codex|all` 安装对应命令或技能并写 manifest。
- [ ] `matspec integration remove opencode|claude-code|codex|all` 保留被用户修改的文件。
- [ ] 所有检查类命令支持 `--json`。

## 13. 测试建议

复刻实现应至少覆盖：

1. init 幂等。
2. init 不覆盖已有全量文档。
3. start 不生成模板内容。
4. status 阶段状态推断。
5. accept / confirm 阶段推进。
6. validate 校验码。
7. archive 成功与失败路径。
8. integration install/remove。
9. 生成配置、覆盖保护、候选文档质量检查。
10. JSON 输出和退出码。
