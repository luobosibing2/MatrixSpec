# [AR编号] 任务拆解

## Context

- 输入物：`proposal.md`、`delta-spec.md`、`delta-design.md`、全量 spec/design
- 输出物：代码、测试、验证证据、更新后的全量 spec/design

## Task 依赖关系图

```text
Task 1 -> Task 2 -> Task 3
```

### Task 1: [可独立执行的任务标题]

[说明本任务承接的已确认规则或设计。]

**Files:**
- Modify: `src/example.js`
- Test: `test/example.test.js`

**Context:**
输入物：delta-spec.md 中的规则与 delta-design.md 中的设计决策。
输出物：可验证的实现和测试。

**Do:**
- [实现动作；不得猜测缺失上下文。]

**Verify:**
- [ ] 规格合规：[验证实现满足哪条规则]
- [ ] 串连验证：[运行命令或端到端检查]

- [ ]

### Task 2: Done Finalization

根据已确认增量刷新全量权威文档。

**Files:**
- Modify: `matspec/specs/spec.md`
- Modify: `matspec/specs/design.md`

**Context:**
输入物：delta-spec.md、delta-design.md 和实现验证结果。
输出物：与当前实现一致的全量规格和设计。

**Do:**
- 根据 delta-spec.md 更新 matspec/specs/spec.md。
- 根据 delta-design.md 更新 matspec/specs/design.md。

**Verify:**
- [ ] 规格合规：全量文档覆盖本次所有已确认增量
- [ ] 串连验证：执行 `matspec validate`

- [ ]

## Task Executor 报告状态

只能返回：`DONE`、`DONE_WITH_CONCERNS`、`BLOCKED`、`NEEDS_CONTEXT`。
