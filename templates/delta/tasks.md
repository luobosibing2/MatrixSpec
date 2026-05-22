# [REQ ID] 任务拆解

> 本文档将已确认的 spec/design 增量拆解为可执行实现任务。

## 1. 数据与迁移

- [ ] [创建或更新迁移文件。]
- [ ] [如需要，更新种子数据、fixture 或兼容数据。]

## 2. 领域与应用逻辑

- [ ] [更新领域规则或服务行为。]
- [ ] [将每个任务映射到 delta-spec 规则。]

## 3. 基础设施

- [ ] [更新 repository、gateway、外部 client 或配置。]

## 4. 接口层

- [ ] [更新 controller、route、handler、command 或 UI 入口。]
- [ ] [更新校验和错误报告。]

## 5. 测试

- [ ] [正向路径单元测试。]
- [ ] [负向和边界路径单元测试或集成测试。]
- [ ] [兼容性或迁移回归测试。]

## 6. Done Finalization

- [ ] 实现和验证完成后，根据 delta-spec.md 刷新 matspec/specs/spec.md。
- [ ] 实现和验证完成后，根据 delta-design.md 刷新 matspec/specs/design.md。
- [ ] 保持实现说明可追溯到已确认决策。

## 7. 验证

- [ ] 运行项目所需测试：`[command]`。
- [ ] 运行必要的手工或 E2E 检查：`[command or steps]`。
- [ ] 在 validation 或实现记录中记录结果。

## 依赖顺序

```text
数据/迁移 -> 领域/应用 -> 基础设施 -> 接口 -> 测试 -> 验证 -> done finalization
```

## Agent 执行规则

1. 只实现 delta-spec.md 或 delta-design.md 支撑的任务。
2. 遵循项目现有架构和代码风格。
3. 每条变更业务规则都应有测试覆盖。
4. 不要用 `matspec generate` 演进已确认变更；generate/apply 只用于 baseline recovery。
5. 实现、验证和 done finalization 刷新 full spec/design 之前，不要执行 `matspec done`。
