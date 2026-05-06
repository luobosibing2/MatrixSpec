
# [REQ编号] 任务清单

> 本文档作为 AI Agent（Claude Code / Cursor）的输入，拆解为可执行的开发任务。
> 每个任务应具体到文件/模块级别。


## 1. 数据模型

- [ ] 创建数据库迁移脚本：`migrations/YYYYMMDD_[描述].sql`
- [ ] 新增表 `[table_name]`，包含字段：[字段列表]
- [ ] 修改表 `[table_name]`，新增字段：[字段列表]
- [ ] 创建/更新索引

## 2. 领域层

- [ ] 创建实体类：`src/domain/entities/[EntityName].ts`
- [ ] 创建值对象：`src/domain/valueObjects/[ValueObjectName].ts`
- [ ] 创建仓储接口：`src/domain/repositories/[RepositoryName].ts`

## 3. 应用层

- [ ] 创建服务类：`src/application/services/[ServiceName].ts`
  - 实现方法：`[methodName]`
  - 业务规则：[对应 delta-spec.md 中的规则编号]
- [ ] 创建 DTO：`src/application/dto/[DtoName].ts`
- [ ] 创建用例：`src/application/useCases/[UseCaseName].ts`

## 4. 基础设施层

- [ ] 创建仓储实现：`src/infrastructure/repositories/[RepositoryImpl].ts`
- [ ] 创建外部服务客户端：`src/infrastructure/clients/[ClientName].ts`

## 5. 接口层

- [ ] 创建 Controller：`src/interfaces/controllers/[ControllerName].ts`
  - `POST /api/v1/[resource]` - [描述]
  - `GET /api/v1/[resource]/{id}` - [描述]
- [ ] 创建请求验证器：`src/interfaces/validators/[ValidatorName].ts`
- [ ] 更新路由配置：`src/interfaces/routes/index.ts`

## 6. 测试

- [ ] 单元测试：`tests/unit/[ServiceName].test.ts`
  - 测试场景：[场景1]
  - 测试场景：[场景2]
- [ ] 集成测试：`tests/integration/[FeatureName].test.ts`
  - 测试场景：[场景1]
- [ ] 更新测试数据：`tests/fixtures/[fixtureName].json`

## 7. 文档更新

- [ ] 更新 API 文档：`docs/api/[resource].md`
- [ ] 完成文档链一致性验证：`validation.md`
- [ ] 合并 delta-spec.md 到 SPEC.md
- [ ] 合并 delta-design.md 到 DESIGN.md

## 8. 验证

- [ ] 运行单元测试：`npm test`
- [ ] 运行集成测试：`npm run test:integration`
- [ ] 运行 lint 检查：`npm run lint`
- [ ] 本地环境验证功能


## 任务依赖关系

```
1. 数据模型
    ↓
2. 领域层 ─────┐
    ↓         │
3. 应用层 ←───┘
    ↓
4. 基础设施层
    ↓
5. 接口层
    ↓
6. 测试
    ↓
7. 文档更新
    ↓
8. 验证
```


## AI Agent 执行指引

1. **按顺序执行**：遵循上述依赖关系，先完成依赖项
2. **参考文档**：
   - 业务规则参考：`delta-spec.md`
   - 技术设计参考：`delta-design.md`
   - 一致性验证参考：`validation.md`
   - 全量规格参考：`SPEC.md`
   - 全量设计参考：`DESIGN.md`
3. **代码规范**：遵循项目现有代码风格
4. **测试覆盖**：每个业务规则至少有一个测试用例
5. **提交粒度**：每完成一个模块可以单独提交



