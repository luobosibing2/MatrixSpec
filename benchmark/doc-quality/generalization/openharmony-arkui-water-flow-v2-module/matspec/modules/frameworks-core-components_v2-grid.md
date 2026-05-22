# Grid 模块中间设计文档（components_v2）

## 1. 模块目的与边界

### 1.1 目的
`components_v2/grid` 提供面向“网格容器 + 可滚动懒加载 + 事件与控制器透传”的一组核心实现，承担以下职责：

- 管理 Grid 的元素生命周期与渲染节点桥接；
- 在渲染层实现网格布局的增量构建与滚动可见性计算；
- 提供滚动与位置控制器，支持索引定位、位移动画、滚动条联动。

核心锚点：
- `[GridElement](/frameworks/core/components_v2/grid/grid_element.h)`：元素侧主控类；
- `[RenderGridScroll](/frameworks/core/components_v2/grid/render_grid_scroll.h)`：渲染侧布局与滚动引擎；
- `[GridPositionController](/frameworks/core/components_v2/grid/grid_position_controller.h)`：位置控制器；
- `[GridScrollController](/frameworks/core/components_v2/grid/grid_scroll_controller.h)`：滚动条控制器；
- `[RosenRenderGridScroll](/frameworks/core/components_v2/grid/rosen_render_grid_scroll.h)`：Rosen 后端实现入口。

### 1.2 非目标范围（不在当前模块内）
- 不在此目录中的 ArkTS 组件声明层（如前端 DSL/Modifier/API）；
- 与滚动条系统其他模块的生命周期管理、主流程调度（除本模块的代理调用）；
- 具体可访问性与动画系统的跨模块策略（除本模块内触发点）。

---

## 2. 目录结构（只含已给定模块文件）

| 文件 | 职责 | 备注 |
| --- | --- | --- |
| `grid_element.h/cpp` | Grid 元素节点（Element） | 建立渲染回调、子项构建、数据源更新入口 |
| `grid_event.h/cpp` | 事件信息定义 | 滚动事件序列化与索引承载 |
| `grid_position_controller.h/cpp` | 位置控制器（ScrollController） | 透传到 `RenderGridScroll` 的接口 |
| `grid_scroll_controller.h/cpp` | 滚动条控制器（ScrollBarController） | 滚动条偏移联动与重绘触发 |
| `render_grid_scroll_creator.cpp` | 渲染器工厂 | 在开启 Rosen 分支时返回 `RosenRenderGridScroll` |
| `render_grid_scroll.h/cpp` | 核心渲染实现 | `RenderGridLayout` + `RenderRefreshTarget` |
| `rosen_render_grid_scroll.h/cpp` | Rosen 渲染子类 | 绘制滚动条与 ScrollBar 可见性更新 |

---

## 3. 核心组件与接口边界

## 3.1 元素层（Element）

| 锚点 | 作用 | 关键点 |
| --- | --- | --- |
| `[GridElement]` | 组件元素入口 | 继承 `RenderElement`, `FocusGroup`, `FlushEvent`, `ElementProxyHost` |
| `[GridElement::CreateRenderNode]` | 创建渲染节点 | 绑定构建/删除/查询 span/总数等回调到 `RenderGridScroll` |
| `[GridElement::PerformBuild]` | 构建主入口 | 触发 `render->OnDataSourceUpdated(0)` 与 `UpdateChildren` |
| `[GridElement::BuildChildByIndex]` | 单子节点构建 | 通过 `GetElementByIndex` 拉取子 element 并 `AddChildByIndex` |
| `[GridElement::DeleteChildByIndex]` | 删除子节点 | 调用 `render->DeleteChildByIndex(index)` |
| `[GridElement::GetItemSpanByIndex]` | 查询单元跨列跨行 | 若 item 为 `GridLayoutItemComponent` 则读取 span；横向网格会交换轴语义 |
| `[GridElement::OnDataSourceUpdated]` | 列表数据变更响应 | 注册 post-flush listener 后同步调用渲染层数据更新 |
| `[GridElement::RequestNextFocus]` | 焦点转移 | 通过 `RenderGridScroll::OnRequestNextFocus`（回调接线） |

> 证据：以上符号都在 `grid_element.h/cpp` 可见且为直接调用关系中的核心路径。

## 3.2 事件对象

| 锚点 | 作用 | 关键点 |
| --- | --- | --- |
| `[GridEventInfo]` | 滚动事件承载 | 持有 `scrollIndex_` 与 `GetScrollIndex()` |
| `[GridEventInfo::ToJSONString]` | 事件串行化 | 输出 `grid` 名称与首可见项索引 |

> 证据：事件结构与 JSON 形态在 `grid_event.cpp` 明确写明。

## 3.3 位置与滚动控制器

| 锚点 | 作用 | 关键点 |
| --- | --- | --- |
| `[GridPositionController::ScrollToIndex]` | 按索引滚动 | 直接转发 `grid->ScrollToIndex(index, false, false)` |
| `[GridPositionController::AnimateTo]` | 平滑滚动 | 转发 `grid->AnimateTo(offset, curve, duration)` |
| `[GridPositionController::ScrollToEdge]` | 边缘跳转 | 转发 `grid->ScrollToEdge(edge)` |
| `[GridPositionController::ScrollPage]` | 分页滚动 | 转发 `grid->ScrollPage(step)` |
| `[GridPositionController::GetCurrentOffset]` | 当前滚动偏移读取 | 读取 `grid->CurrentOffset()` |
| `[GridScrollController::MarkScrollRender]` | 强制布局/刷新 | `RenderGridScroll` 存在时触发 `MarkNeedLayout()` |
| `[GridScrollController::UpdateScrollPosition]` | 外部滚动条联动位移映射 | 使用 `estimateHeight / height` 做比例缩放 |
| `[GridScrollController::ProcessScrollMotion]` | 滚动条驱动主流程 | 按位移差异区分动画来源并调 `UpdateScrollPosition` |

> 证据：上述成员在 `grid_position_controller.cpp` 与 `grid_scroll_controller.cpp` 中均有直接定义。

## 3.4 渲染核心层

| 锚点 | 作用 | 关键点 |
| --- | --- | --- |
| `[RenderGridScroll::Update]` | 重建参数更新 | 设置 `component_`，更新方向/布局配置、恢复信息、滚动条初始化 |
| `[RenderGridScroll::CreateScrollable]` | 建立可滚动组件 | 绑定滚动回调 `UpdateScrollPosition` 与滚动结束回调 |
| `[RenderGridScroll::UpdateScrollPosition]` | 统一滚动位移入口 | 处理方向反转、边界到达、刷新逻辑与位移更新 |
| `[RenderGridScroll::NeedUpdate]` | 更新判定 | 比对方向、对齐、尺寸、rows/columns 约束等关键字段 |
| `[RenderGridScroll::PerformLayout]` | 布局主循环 | 依据 viewport 与缓存构建可见区域 |
| `[RenderGridScroll::BuildGrid]` | 网格元信息构建 | 初始化 `metaData_` 与列宽等布局参数 |
| `[RenderGridScroll::SupplyItems/BuildItemsForwardByRange/BuildItemsBackwardByRange]` | 可见项构建 | 按方向加载可见区域内 item |
| `[RenderGridScroll::DealCache]` | 缓存策略 | 清理越界 item、保持局部内存可控 |
| `[RenderGridScroll::OnDataSourceUpdated]` | 动态数据响应 | 更新总数与首尾状态，触发布局 |
| `[RenderGridScroll::CalculateScrollLength]` | 索引跳转距离计算 | 为 `ScrollToIndex` 提供偏移估算 |
| `[RenderGridScroll::ScrollToIndex]` | 按索引跳转 | 结合 `CalculateScrollLength` 与可见/预加载策略 |
| `[RenderGridScroll::AnimateTo]` | 动画滚动 | 创建动画器并在每帧回调 `DoJump` |
| `[RenderGridScroll::CurrentOffset/GetEstimatedHeight]` | 状态读取 | 供控制器与滚动条估算 |
| `[RenderGridScroll::OnPaintFinish]` | 渲染完成回调 | 回填展示区起止索引 |

> 证据：上述方法在 `render_grid_scroll.h/.cpp` 中定义，覆盖渲染生命周期关键路径。

## 3.5 Rosen 子类

| 锚点 | 作用 | 关键点 |
| --- | --- | --- |
| `[RenderGridScroll::Create]` | 渲染器创建策略 | 系统属性开关下返回 `RosenRenderGridScroll` |
| `[RosenRenderGridScroll::Update]` | 渲染层增强更新 | 与基类一致后设置 `SetClipToFrame(true)` |
| `[RosenRenderGridScroll::Paint]` | 滚动条绘制 | 与 `NeedPaint`、`scrollBarOpacity_`/`GetEstimatedHeight` 联动 |

> 证据：`render_grid_scroll_creator.cpp` + `rosen_render_grid_scroll.cpp/h`.

---

## 4. 核心流程（白盒）

## 4.1 生命周期：Element 到 Render 的建立与同步
1. 框架创建 `GridElement`，`GridElement::CreateRenderNode` 构造 `RenderGridScroll`。
2. 在创建阶段注入回调：child build/delete/ span 查询/总数查询。
3. `PerformBuild` 时，先调用 `render->OnDataSourceUpdated(0)`，再 `UpdateChildren` 触发树同步。
4. 数据变化或重建时 `OnDataSourceUpdated` 注册 post-flush 回调并更新渲染层总数与偏移。

对应锚点：
- `GridElement::CreateRenderNode`, `PerformBuild`, `OnDataSourceUpdated`（`grid_element.cpp`）

## 4.2 可见区域滚动与懒加载
1. 用户滚动输入通过 `CreateScrollable` 的回调进入 `UpdateScrollPosition`。
2. `UpdateScrollPosition` 计算最终 offset、边界和方向修正后更新 `currentOffset_`。
3. `PerformLayout` 基于当前 viewport 构建/保留可见 item，`DealCache` 清理冗余项。
4. `RenderGridScroll::SupplyItems` 与 `BuildItems...ByRange` 负责按区间补建。
5. 布局完成后 `OnPaintFinish` 更新 show 范围。

对应锚点：
- `RenderGridScroll::CreateScrollable`, `UpdateScrollPosition`, `PerformLayout`, `SupplyItems`, `ClearItems`, `OnPaintFinish`（`render_grid_scroll.cpp`）

## 4.3 索引跳转与动画
1. 外部控制器调用 `GridPositionController::ScrollToIndex/AnimateTo`.
2. 转发到 `RenderGridScroll`。
3. `RenderGridScroll::ScrollToIndex` 使用 `CalculateScrollLength` 选择跳转路径；不可见区域可能触发前后补建。
4. `AnimateTo` 创建 `CurveAnimation<double>`，按 `DoJump` 应用滚动。

对应锚点：
- `GridPositionController::*`（`grid_position_controller.cpp`）与 `RenderGridScroll::ScrollToIndex/AnimateTo`（`render_grid_scroll.cpp`）

## 4.4 滚动条联动
1. 渲染层估算高度经 `GetEstimatedHeight` 与 `GetCurrentOffset` 暴露。
2. `GridScrollController::UpdateScrollPosition` 将外部滚动条位移映射成 content 偏移。
3. `MarkScrollRender` 在控制器侧触发布局更新。
4. 在 `RosenRenderGridScroll::Paint` 中根据 scrollBar 状态进行可视化绘制，并通过 proxy 通知宿主。

对应锚点：
- `GridScrollController::UpdateScrollPosition`, `GridScrollController::MarkScrollRender`, `RenderGridScroll::GetEstimatedHeight`, `RosenRenderGridScroll::Paint`

---

## 5. 接口与数据结构（模块内）

## 5.1 外部可见接口（本模块提供）
- `GridElement`：内部构建/回调对接主接口，不暴露业务 API；
- `GridPositionController`：提供滚动位置、索引、动画与边界控制；
- `GridScrollController`：提供滚动条行为控制接口；
- `GridEventInfo`：对外事件上报。

## 5.2 渲染层关键状态（`RenderGridScroll`）
- 布局/展示：
  - `items_`（item 实例池/列表）
  - `childrenInRect_`（在可视矩形中的子项索引）
  - `inCache_`（缓存状态）
  - `startIndex_ / endIndex_ / startShowItemIndex_ / endShowItemIndex_`
- 几何与估算：
  - `estimateHeight_`, `estimatePos_`, `estimateAverageHeight_`
- 绘制与交互：
  - `scrollBar_`、`scrollBarProxy_`、`scrollBarOpacity_`
- 约束参数：
  - `axis_`, `direction_`, `rows_`, `columns_`, `rowsGap_`, `columnsGap_` 等来自 `GridLayoutComponent`

> 这些字段在 `render_grid_scroll.h` 与 `render_grid_scroll.cpp` 的类成员与方法逻辑可直接对齐。

---

## 6. 关键约束与行为边界

## 6.1 源码确认的约束
- 当前工厂默认走 Rosen 路径：`Create()` 在系统属性和宏同时满足时返回 `RosenRenderGridScroll`，否则可能为空（依赖运行时编译宏）；
  锚点：`render_grid_scroll_creator.cpp:RenderGridScroll::Create`, `rosen_render_grid_scroll.h`.
- Grid 为流式布局优化设计，依赖回调 `BuildChildByIndex/DeleteChildByIndex/GetItemSpanByIndex/GetItemTotalCount` 动态构建子项；
  锚点：`GridElement::CreateRenderNode`.
- 横向网格中，`GetItemSpanByIndex` 会交换主次轴语义；
  锚点：`GridElement::GetItemSpanByIndex`.
- `GridScrollController::UpdateScrollPosition` 存在除零/高度无效保护场景（依赖 `NearEqual` 与估算逻辑）；
  锚点：`GridScrollController::UpdateScrollPosition`.

## 6.2 推断性约束（未在当前模块代码中直接给出全部证据）
- 与上层 ArkTS `Grid` 声明的属性映射关系（如 `rows`、`columns` 的来源）依赖 `GridLayoutComponent`，其定义与默认值不在给定 12 文件内；
- 列表项真实可见性/高度估算精度的具体误差边界，需结合 `GridLayoutItemComponent` 和滚动内容实际统计；
- `scrollBar_` 的动画衰减策略与透明度更新时机，在 Rosen 分支以外可能与当前实现存在差异（本模块仅展示接入点，未覆盖全部策略）。

---

## 7. 调试指南（症状-来源-动作）

## 7.1 空白/白屏（内容不显示）
- 症状：Grid 列表区域无内容或只显示极少项；
- 可能来源：`GridElement::OnDataSourceUpdated` 未触发；`RenderGridScroll::NeedUpdate` 误判触发重建或 `BuildGrid` 未完成；
- 建议检查：
  - `[grid_element.cpp](frameworks/core/components_v2/grid/grid_element.cpp):GridElement::OnDataSourceUpdated`
  - `[render_grid_scroll.cpp](frameworks/core/components_v2/grid/render_grid_scroll.cpp):RenderGridScroll::NeedUpdate`
  - `[render_grid_scroll.cpp](frameworks/core/components_v2/grid/render_grid_scroll.cpp):RenderGridScroll::PerformLayout`
  - 运行 `RenderGridScroll` 周期日志（若有）确认 `OnDataSourceUpdated` 与 `MarkNeedLayout` 触发。

## 7.2 滚动跳动/错位
- 症状：快速滚动时位置抖动或回弹；
- 可能来源：`UpdateScrollPosition` 的方向修正与边界逻辑、`currentOffset_` 写入过于频繁；
- 建议检查：
  - `[render_grid_scroll.cpp](frameworks/core/components_v2/grid/render_grid_scroll.cpp):RenderGridScroll::UpdateScrollPosition`
  - `[render_grid_scroll.cpp](frameworks/core/components_v2/grid/render_grid_scroll.cpp):RenderGridScroll::GetGridSize`
  - `[grid_position_controller.cpp](frameworks/core/components_v2/grid/grid_position_controller.cpp):GridPositionController::ScrollToIndex`

## 7.3 索引跳转不准
- 症状：`ScrollToIndex` 到目标项后仍未显示目标；
- 可能来源：`CalculateScrollLength` 估算偏差、可见区外预建不足；
- 建议检查：
  - `[render_grid_scroll.cpp](frameworks/core/components_v2/grid/render_grid_scroll.cpp):RenderGridScroll::CalculateScrollLength`
  - `[render_grid_scroll.cpp](frameworks/core/components_v2/grid/render_grid_scroll.cpp):RenderGridScroll::ScrollToIndex`
  - item span 是否被正确返回：`[grid_element.cpp](frameworks/core/components_v2/grid/grid_element.cpp):GridElement::GetItemSpanByIndex`

## 7.4 滚动条不动/不同步
- 症状：拖拽滚动条无效或与内容偏移不一致；
- 可能来源：`GridScrollController` 的估算高度与实际高度不一致；
- 建议检查：
  - `[grid_scroll_controller.cpp](frameworks/core/components_v2/grid/grid_scroll_controller.cpp):GridScrollController::UpdateScrollPosition`
  - `[render_grid_scroll.h](frameworks/core/components_v2/grid/render_grid_scroll.h):RenderGridScroll::GetEstimatedHeight`
  - `[render_grid_scroll.cpp](frameworks/core/components_v2/grid/render_grid_scroll.cpp):RenderGridScroll::GetEstimatedHeight`

## 7.5 刷新/动画异常
- 症状：滚动动画卡顿或立即停止；
- 可能来源：`AnimateTo` animator 生命周期管理；
- 建议检查：
  - `[render_grid_scroll.cpp](frameworks/core/components_v2/grid/render_grid_scroll.cpp):RenderGridScroll::AnimateTo`
  - `[render_grid_scroll.cpp](frameworks/core/components_v2/grid/render_grid_scroll.cpp):RenderGridScroll::OnScrolled`
  - `[grid_scroll_controller.cpp](frameworks/core/components_v2/grid/grid_scroll_controller.cpp):GridScrollController::ProcessScrollMotion`

---

## 8. 运行与发布 runbook（基于已有仓库运维证据）

## 8.1 build
- 全量组件构建（建议）：`./build.sh --product-name rk3568 --build-target ace_engine`
- 关键源码变更后增量构建：同上（按仓库规则默认可复用增量）。
- 仅组件调试场景：以 `out/rk3568/build.log` 为主线查错（AGENTS 中有 build 指令与路径）。

## 8.2 验证
- 触发用例建议关注：
  - 列表增删（data source update）路径；
  - `ScrollToIndex` 与 `AnimateTo`；
  - 横向 `isHorizontal` 场景；
  - 低速/高速连续滚动与边界滚动。
- 若有回归，应检查：
  - `RenderGridScroll::Update` 是否触发；
  - `GridElement::OnDataSourceUpdated` post-flush 回调是否执行；
  - `GridPositionController` 与 `GridScrollController` 是否能拿到有效 `RenderGridScroll`（`Upgrade` 成功）。

## 8.3 部署
- 与 UI 组件变更一致，通常与 `ace_engine` 或上层 bundle 制作流程配套发布，不在本模块单独定义额外部署脚本。
- 推荐先在目标 product（如 rk3568）构建产物通过回归用例验证，再更新版本分支。

## 8.4 回滚
- 回滚策略：恢复 `components_v2/grid` 变更文件到上一个稳定提交，重新 `ace_engine` 构建验证；
- 若存在 ABI/行为变更，优先回滚最晚一次改动到控制器/渲染层接口（`GridPositionController` 或 `RenderGridScroll`）再逐步恢复。

## 8.5 典型失败模式与缓解
- 失败模式1：滚动偏移 NaN/异常激增  
  处理：检查 `estimateHeight_` 与 `height_` 的输入是否有效，关注 `UpdateScrollPosition` 的比例映射分支。
- 失败模式2：频繁重建导致掉帧  
  处理：检查 `NeedUpdate` 判定字段是否过于敏感，确认 span/rows/cols 变更是否来自真实需求；
- 失败模式3：滚动条不可见  
  处理：检查 `RosenRenderGridScroll::Paint` 中 `NeedPaint` 与 `DisplayMode` 条件、`scrollBarOpacity_` 更新链路。

---

## 9. 确定性边界（Certainty Boundary）

## 9.1 源码确认事实
- 以上“元素到渲染回调注入、索引控制透传、滚动主逻辑、布局/缓存、Rosen paint 路径”均在本模块文件内直接可见。
- `RenderGridScroll` 是本模块核心渲染类，`GridPositionController` 仅做转发，不持有独立布局算法。
- `RosenRenderGridScroll` 存在并且承担滚动条绘制职责，工厂方法决定是否使用。

## 9.2 推测/缺失证据
- 上层 ArkTS API 与 `GridLayoutComponent` 在何处定义、默认参数边界如何约束：未在给定 12 文件中完全展开，需要追加上层声明文件与测试文件核对。
- 回归测试覆盖面、性能基线阈值不在本文证据中给出；需结合现有 test 仓库用例补齐。

---

## 10. 可直接用于后续 design.md 的合成摘要

Grid v2 模块采用“Element 回调注入 + Render 渲染引擎 + 控制器透传”的三层结构：Element 层负责子项构建和数据源事件桥接，Render 层负责布局/懒加载/滚动估算/索引跳转，控制器层负责位置信息与滚动条联动；同时在 Rosen 开启时由 `RosenRenderGridScroll` 接管滚动条渲染与 clip。该设计适配大规模数据列表的增量渲染与按索引跳转，但滚动估算与 span 获取质量依赖上游 `GridLayoutComponent` 与子项尺寸分布，涉及精度问题时优先检查 `GetItemSpanByIndex` 与 estimate 相关路径。