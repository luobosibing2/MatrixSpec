# 阶段二、阶段三实现与真实 E2E 报告（2026-07-25）

> 历史说明：本报告记录的是 2026-07-25 当时以 Standard 为默认值的验证轨迹。当前产品默认值已经调整为 Light + 无预置基线，现行行为以 README 和 full-spec 为准。

## 结论

阶段二、阶段三均已完成，并通过确定性回归、包检查和一次真实 Codex 历史需求 E2E。

- 产品结果：Echo `binder.go` diff 与历史 oracle 完全一致，`go test ./...` 通过，质量未出现可观察下降。
- 默认工作流：`standard` 六阶段成功走通；`full` 七阶段仍可显式选择。
- 状态机：validation 的 `revise` 真实阻断，`back delta-spec` 真实失效下游，修订后重新放行并捕获实现前 baseline。
- 最终化：先被 `FULL_DOCS_NOT_UPDATED` 阻断；更新全量文档并保留 delta 中的 `REQ-*` 后才允许归档。
- 降本：相对阶段一成功轨迹，input token -45.4%，output token -37.7%，已观测 agent tool calls -37.9%，Codex 累计时间 -33.4%。
- 实际美元成本：Codex CLI 未返回账户账单或单价，因此记录为 `null / 不可观测`，不把 token 推算值冒充真实结算。

## 阶段二：默认路径与完成门

### Profile

默认 `standard`：

```text
proposal → delta-spec → tasks → validation → implementation → review → finalization
```

显式 `full`：

```text
proposal → delta-spec → delta-design → tasks → validation → implementation → review → finalization
```

实现约束：

1. 未指定 profile 时固定为 `standard`。
2. `matspec start --profile full` 才选择 full。
3. profile 写入 change state 和 workflow 快照；项目配置随后变化不会切换在途 change。
4. standard 的 `tasks.md` 必须包含文件级 Implementation Approach；新增 `CS312` 检查。
5. 迁移、持久化、权限、并发、一致性或跨系统改造仍建议使用 full。

### Delta 到全量规格的可判定覆盖

本阶段没有加入“已确认文档内容哈希”。原有 implementation 前 baseline SHA 仅用于证明最终化后文件确实发生变化。

新增的完成门是需求标识覆盖：

1. delta-spec 的新增/修改需求必须具有稳定 `REQ-*` ID。
2. done/archive 在全量文件变化检查后提取 delta 的 ID 集合。
3. 全量 spec 缺失任一 ID 返回 `DELTA_COVERAGE_MISSING`。
4. delta 没有可验证 ID 返回 `DELTA_COVERAGE_IDS_MISSING`。

这不是开放式语义判定，但比“文件变了即可完成”更强，同时避免绑定具体类名或补丁形状。

## 阶段三：上下文、skill 与成本观测

### 紧凑上下文

- `matspec go --json` 默认不再嵌入完整模板。
- payload 返回冻结 change 对应的 `templateCommand`；需要时调用带 `--with-template` 的 go。
- `--with-template` / `--verbose` 保留显式取完整模板的能力。
- 固定状态行由 CLI `message/items` 生成，不再要求模型重复生成展示卡。

### Skill 去重

主 MatSpec skill 统一承载路由、确认、回退、实现、review 和 finalization 规则。阶段 skill 只保留阶段目标、输入、产物约束和澄清重点。

实测尺寸：

| 指标 | 修改前 | 修改后 | 预算 | 结果 |
|---|---:|---:|---:|---|
| 默认 proposal `go --json` | 5,052 B | 1,680 B | ≤ 3,000 B | 通过 |
| validation `go --json`（真实 E2E） | 未单列 | 2,795 B | ≤ 3,000 B | 通过 |
| Codex skills 合计 | 约 54 KB | 13,656 B | < 20 KB | 通过 |
| 最大单个 stage skill | 未单列 | 2,187 B | ≤ 2,500 B | 通过 |

### 本地指标

`.matspec-cli/metrics.jsonl` 现在记录：

- 每次 CLI 调用的 command、component、成功状态、duration 和 backtrack；
- runner 显式写入的 turns、tool calls、input/cached/output token、cost 和 duration；
- `metrics show` 的总量及 candidate / validation / review / operator / workflow 分组。

缺失的 provider cost 保持 `null`。显式记录真实成本时才汇总为数字。

## 确定性验证

- `npm test`：113/113 通过。
- `git diff --check`：通过。
- `npm pack --dry-run`：通过，82 files，156.8 kB package。
- PowerShell E2E runner AST parse：通过。
- 新增回归覆盖：standard 默认、full 显式选择、profile 冻结、compact/verbose go、skill 尺寸预算、delta ID 覆盖门、指标分组与 cost 缺失语义。

## 真实 Codex E2E

环境：

- 模型：`gpt-5.6-terra`
- reasoning：`high`
- profile：`standard`
- 历史项目：`labstack/echo`
- 基线：`c08ea0fc769e83a9b938ee1bd05c26b69f23ed87`
- oracle：`dac56bceda4c9e799afc3cee2d4f137c8102db58`
- retained workspace：`C:\Users\kvenu\AppData\Local\Temp\matspec-codex-history-93d3a472167244c1bb0178f8a6930a91\repo`
- retained logs：`C:\Users\kvenu\AppData\Local\Temp\matspec-codex-history-93d3a472167244c1bb0178f8a6930a91\logs`
- metrics：workspace 下 `.matspec-cli/metrics.jsonl`

真实轨迹：

```text
generate/apply
→ start standard
→ proposal
→ delta-spec（REQ-*）
→ tasks（文件级实现方案）
→ validation: revise (REV-E2E-001)
→ accept blocked
→ back delta-spec
→ Codex repair
→ tasks reaccept
→ validation: allow
→ baseline captured
→ implementation
→ oracle assertions + git diff --check + go test ./...
→ review: approved
→ done blocked with FULL_DOCS_NOT_UPDATED
→ Codex finalization（REQ-* 进入 full spec）
→ done/archive
```

最终结果：

- `sourceDiffMatchesOracle = true`。
- `go test ./...` 全量通过。
- 归档路径：`matspec/changes/archives/2026-07-25-REQ20260527-must-unix-time-docs`。
- standard 链没有创建或错误要求 delta-design。
- validation 阻断、一次审计式 back、再放行、baseline、review、文档更新门和 REQ 覆盖门均有真实 CLI/state/session 证据。

## 成本与过程分解

主成功轨迹：

| component | turns | 已观测 tool calls | input | cached input | output | 记录时长 |
|---|---:|---:|---:|---:|---:|---:|
| candidate | 8 | 37 | 1,274,190 | 1,091,840 | 22,508 | 720.5 s |
| validation | 2 | 14 | 603,343 | 533,504 | 11,198 | 268.7 s |
| review | 1 | 8 | 285,704 | 260,864 | 3,624 | 103.5 s |
| operator | 0 | 0 | 0 | 0 | 0 | 1 次 back |
| 合计 | 11 | 59 | 2,163,237 | 1,886,208 | 37,330 | Codex 1,087.1 s |

说明：candidate 包括两次 full-document generation；这两次只有合计 token，没有 cached/tool-call 拆分，所以 tool-call 总数只覆盖 9 次 JSONL Codex 调用。`workflowMetrics.durationMs` 还叠加 CLI 与 generation 观测窗口，不应当当作纯 Codex wall time。

## 与阶段一对比

| 指标 | 阶段一 full | 阶段二+三 standard | 变化 |
|---|---:|---:|---:|
| 产品 oracle | exact | exact | 无下降 |
| Go 全量测试 | pass | pass | 无下降 |
| Codex calls（含 2 次 generation） | 14 | 11 | -21.4% |
| input tokens | 3,961,897 | 2,163,237 | -45.4% |
| cached input tokens | 3,475,456 | 1,886,208 | -45.7% |
| total non-cached input | 486,441 | 277,029 | -43.0% |
| output tokens | 59,903 | 37,330 | -37.7% |
| 已观测 JSONL tool calls | 95 | 59 | -37.9% |
| Codex 累计时间 | 1,633.3 s | 1,087.1 s | -33.4% |
| 实际美元账单 | 不可观测 | 不可观测 | 不可归因 |

预注册的 input -40%、tool calls -25%、wall time -20% 三个目标均达到；产品 oracle 仍为 exact，因此没有可观察的质量降幅。

### 因果边界

这不是只改变 compact skill 的单变量试验，不能把全部下降归因给 prompt 压缩：

1. 阶段一使用 full，当前使用 standard，少一次 delta-design 调用。
2. 阶段一 review 因代理导致测试失败，额外经历 implementation repair 与第二次 review；当前 review prompt 已明确清理代理，因此一次通过，又少两次调用。
3. skill/context 压缩会影响每次调用 token，但 profile 和 review 路径也影响调用次数。

因此本轮能确认的是“阶段二+三组合方案在相同任务、模型和 oracle 下保持交付质量，并显著降低资源”；要单独估计 compact skill 的因果贡献，应在相同 standard profile、相同 review prompt 下只切换 compact/full context 再跑配对重复。

## 实验外开销

首次启动时外层 shell 被错误设置为 5 秒 timeout，留下一个重复 psmux session。发现后立即终止。该孤儿 run 只创建了 baseline-generation 的 design prompt，没有完成 turn usage，也没有进入 stage workflow；它不计入主成功轨迹。由于 provider 没有返回该未完成调用的 usage，无法可靠量化这部分额外 token/账单，必须作为实验外不可观测开销单列。

## 复跑

```powershell
npm test
npm pack --dry-run
pwsh -NoLogo -NoProfile -File .\scripts\psmux-codex-history-e2e.ps1 `
  -ExerciseRevision -Profile standard `
  -Model gpt-5.6-terra -ReasoningEffort high `
  -AllowDangerFullAccess -KeepArtifacts
```

最后一条调用真实 Codex、产生真实资源消耗，不进入默认测试套件。
