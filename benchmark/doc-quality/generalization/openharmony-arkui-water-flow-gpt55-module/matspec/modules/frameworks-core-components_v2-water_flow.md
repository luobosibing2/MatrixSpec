# Water Flow 模块文档

## 模块概述

Water Flow 模块位于 `frameworks/core/components_v2/water_flow`，实现旧管线 `components_v2` 下的瀑布流容器及瀑布流子项。它负责把一组按索引延迟构建的子组件布局成多列或多行瀑布流，并提供滚动、滚动条、滚动到指定索引、数据源更新、尾部 footer、到达首尾事件等能力。

该模块属于 `OHOS::Ace::V2` 命名空间，核心实现基于旧框架的 `Component` / `Element` / `RenderNode` 分层：

- `WaterFlowComponent`：组件配置与属性承载。
- `WaterFlowElement`：桥接组件树、懒加载元素代理和渲染节点。
- `RenderWaterFlow`：瀑布流布局、滚动、缓存、事件与 footer 的核心实现。
- `RosenRenderWaterFlow`：Rosen 后端下的绘制扩展，主要处理裁剪和滚动条绘制。
- `WaterFlowItemComponent` / `WaterFlowItemElement` / `RenderWaterFlowItem`：瀑布流单个子项的组件、元素和渲染包装。

## 目录结构

```text
frameworks/core/components_v2/water_flow/
├── render_water_flow.h/cpp
├── render_water_flow_creator.cpp
├── render_water_flow_item.h/cpp
├── rosen_render_water_flow.h/cpp
├── water_flow_component.h/cpp
├── water_flow_element.h/cpp
├── water_flow_item_component.h/cpp
├── water_flow_item_element.h/cpp
├── water_flow_item_generator.h
├── water_flow_position_controller.h/cpp
└── water_flow_scroll_controller.h/cpp
```

文件职责如下：

| 文件 | 职责 |
| --- | --- |
| `water_flow_component.h/cpp` | 定义瀑布流组件属性，包括行列间距、布局方向、模板参数、尺寸约束、滚动条配置、控制器、footer、首尾事件。 |
| `water_flow_element.h/cpp` | 继承 `RenderElement`、`FlushEvent`、`WaterFlowItemGenerator`、`ElementProxyHost`，负责按索引构建/释放子元素，并把懒加载回调注册给渲染层。 |
| `render_water_flow.h/cpp` | 核心渲染节点，负责瀑布流测量布局、滚动、缓存、滚动条、footer、首尾事件、预测布局和数据源更新。 |
| `render_water_flow_creator.cpp` | 根据 Rosen 后端开关创建 `RosenRenderWaterFlow`。 |
| `rosen_render_water_flow.h/cpp` | Rosen 后端渲染实现，设置 RSNode 裁剪，绘制滚动条。 |
| `water_flow_item_component.h/cpp` | 瀑布流子项组件，创建 `WaterFlowItemElement` 和 `RenderWaterFlowItem`。 |
| `water_flow_item_element.h/cpp` | 子项元素包装，沿用 `SoleChildElement` 的渲染节点创建逻辑。 |
| `render_water_flow_item.h/cpp` | 子项渲染包装，布局唯一子节点并同步自身尺寸。 |
| `water_flow_item_generator.h` | 定义 footer 渲染节点生成接口。 |
| `water_flow_position_controller.h/cpp` | 对外位置控制器，支持 `ScrollToIndex` 和滚动方向查询。 |
| `water_flow_scroll_controller.h/cpp` | 滚动条控制器，负责把滚动条拖动距离换算成瀑布流滚动距离。 |

## 核心组件

### WaterFlowComponent

位置：`frameworks/core/components_v2/water_flow/water_flow_component.h`

`WaterFlowComponent` 继承 `ComponentGroup`，是瀑布流容器的组件层对象。它保存布局和滚动相关配置，并创建对应的 Element 和 RenderNode：

- `CreateElement()` 创建 `WaterFlowElement`。
- `CreateRenderNode()` 调用 `RenderWaterFlow::Create()`。
- `SetColumnsGap()` / `SetRowsGap()` 设置列间距和行间距，负值会被重置为 `0.0px`。
- `SetLayoutDirection()` 设置 `FlexDirection`，只接受 `ROW` 到 `COLUMN_REVERSE` 范围内的值。
- `SetColumnsArgs()` / `SetRowsArgs()` 保存模板参数字符串。
- `SetMinWidth()` / `SetMinHeight()` / `SetMaxWidth()` / `SetMaxHeight()` 设置子项尺寸约束，负值重置为 `0.0px`。
- `SetController()` 绑定 `WaterFlowPositionController`。
- `SetScrollBarProxy()` 绑定外部滚动条代理。
- `SetFooterComponent()` 设置 footer 组件。
- 通过 `ACE_DEFINE_COMPONENT_EVENT` 暴露 `OnReachStart` 和 `OnReachEnd` 事件。

默认值包括：

| 字段 | 默认值 |
| --- | --- |
| `columnsGap_` | `0.0_px` |
| `rowsGap_` | `0.0_px` |
| `direction_` | `FlexDirection::COLUMN` |
| `displayMode_` | `DisplayMode::ON` |
| `minWidth_` / `minHeight_` / `maxWidth_` / `maxHeight_` | `0.0_px` |

### WaterFlowElement

位置：`frameworks/core/components_v2/water_flow/water_flow_element.h/cpp`

`WaterFlowElement` 是组件层与渲染层之间的关键桥接类。它继承：

- `RenderElement`
- `FlushEvent`
- `WaterFlowItemGenerator`
- `V2::ElementProxyHost`

核心职责：

1. 在 `CreateRenderNode()` 中把构建、删除、获取总数、footer 生成回调注册给 `RenderWaterFlow`。
2. 在 `PerformBuild()` 中通过 `ElementProxyHost::UpdateChildren()` 管理瀑布流子项，并通过 `UpdateChild()` 更新 footer。
3. 在 `BuildChildByIndex()` 中按索引获取 Element、拿到 RenderNode，并交给 `RenderWaterFlow::AddChildByIndex()`。
4. 在 `OnDataSourceUpdated()` 中通知渲染层清理布局与子项缓存，然后触发重新布局。
5. 在 `OnPostFlush()` 中调用 `ReleaseRedundantComposeIds()` 清理冗余 compose id。
6. 在 `RequestWaterFlowFooter()` 中返回 footer element 的渲染节点。

该类让瀑布流支持按需构建，而不是一次性构建全部子项。

### RenderWaterFlow

位置：`frameworks/core/components_v2/water_flow/render_water_flow.h/cpp`

`RenderWaterFlow` 是模块核心，继承 `RenderNode`。它负责：

- 根据 `WaterFlowComponent` 更新布局参数和滚动参数。
- 解析行/列模板参数。
- 管理瀑布流矩阵 `flowMatrix_`。
- 按需构建和释放可见区及缓存区内的子项。
- 计算每个子项的主轴位置、交叉轴位置、主轴尺寸、交叉轴尺寸。
- 处理四种 `FlexDirection`：`COLUMN`、`COLUMN_REVERSE`、`ROW`、`ROW_REVERSE`。
- 维护滚动视口 `viewportStartPos_`。
- 处理滚动条、滚动条代理和滚动事件。
- 支持 `ScrollToIndex()`。
- 支持 footer 布局。
- 支持首尾到达事件。
- 支持预测布局 `OnPredictLayout()`。

关键回调类型：

| 类型 | 定义 | 用途 |
| --- | --- | --- |
| `BuildChildByIndex` | `std::function<bool(size_t)>` | 按索引构建子项。 |
| `DeleteChildByIndex` | `std::function<void(size_t)>` | 按索引释放子项。 |
| `UpdateTotalCount` | `std::function<size_t()>` | 获取数据总数。 |

核心状态：

| 字段 | 含义 |
| --- | --- |
| `items_` | 已构建的子项渲染节点，索引到 `RenderNode` 的映射。 |
| `cacheItems_` | 当前缓存区内需要布局的子项索引集合。 |
| `flowMatrix_` | 瀑布流布局矩阵，记录每个 item 的主轴/交叉轴位置和尺寸。 |
| `mainSideEndPos_` | 每条瀑布流分栏/分行在主轴方向的结束位置。 |
| `crossSideSize_` | 每个交叉轴分片的尺寸。 |
| `itemsByCrossIndex_` | 交叉轴分片到 item 索引列表的映射。 |
| `viewportStartPos_` | 当前视口在主轴方向的起始偏移。 |
| `mainSize_` / `crossSize_` | 容器主轴尺寸和交叉轴尺寸。 |
| `mainGap_` / `crossGap_` | 主轴间距和交叉轴间距。 |
| `crossCount_` | 交叉轴分片数量。 |
| `targetIndex_` | `ScrollToIndex` 时需要补齐布局的目标索引。 |
| `footer_` / `footerMaxSize_` | footer 渲染节点及最大布局尺寸。 |

### RosenRenderWaterFlow

位置：`frameworks/core/components_v2/water_flow/rosen_render_water_flow.h/cpp`

`RosenRenderWaterFlow` 继承 `RenderWaterFlow`，只补充 Rosen 后端绘制相关逻辑：

- `Update()` 调用基类更新后，对 RSNode 设置 `SetClipToFrame(true)`。
- `Paint()` 先调用 `RenderNode::Paint()` 绘制子节点，再通知 `ScrollBarProxy`，最后在需要时使用 `RosenScrollBarPainter` 绘制滚动条。
- 滚动条绘制依赖 `scrollBar_`、`scrollBarOpacity_`、`lastOffset_`、`GetEstimatedHeight()` 等状态。

`render_water_flow_creator.cpp` 中的 `RenderWaterFlow::Create()` 只在 Rosen 后端启用且编译宏 `ENABLE_ROSEN_BACKEND` 存在时返回 `RosenRenderWaterFlow`，否则返回 `nullptr`。

### WaterFlowItemComponent / Element / Render

`WaterFlowItemComponent` 继承 `SoleChildComponent`，用于包装瀑布流中的单个子项。

`RenderWaterFlowItem` 的布局逻辑很简单：

1. 如果没有子节点，记录错误日志。
2. 取第一个子节点。
3. 使用自身 `GetLayoutParam()` 布局子节点。
4. 将子节点位置设为 `Offset::Zero()`。
5. 将自身布局尺寸设置为子节点布局尺寸。

这意味着 WaterFlowItem 本身主要是瀑布流布局识别和尺寸同步包装，实际内容由唯一子组件决定。

### WaterFlowPositionController

位置：`frameworks/core/components_v2/water_flow/water_flow_position_controller.h/cpp`

`WaterFlowPositionController` 继承 `ScrollController`，对外提供位置控制能力：

- `ScrollToIndex(int32_t index, bool smooth, ScrollAlign align, std::optional<float> extraOffset)`：实际只使用 `index`，内部转调 `RenderWaterFlow::ScrollToIndex(index)`；`smooth`、`align`、`extraOffset` 在当前实现中未参与计算。
- `GetScrollDirection()`：从绑定的 `RenderWaterFlow` 获取当前滚动轴；如果渲染节点不存在，默认返回 `Axis::VERTICAL`。

### WaterFlowScrollController

位置：`frameworks/core/components_v2/water_flow/water_flow_scroll_controller.h/cpp`

`WaterFlowScrollController` 继承 `ScrollBarController`，负责滚动条拖动和瀑布流滚动之间的换算：

- `MarkScrollRender()`：标记瀑布流需要布局。
- `CheckScroll()`：检查绑定的滚动节点是否是 `RenderWaterFlow`。
- `UpdateScrollPosition()`：根据瀑布流可视高度、估算总高度和滚动条偏移，换算出内容滚动距离并调用 callback。
- `ProcessScrollMotion()`：处理滚动条动画/拖动过程中的位置变化。

## 核心数据结构

### SCROLLABLE

位置：`render_water_flow.h`

```cpp
enum class SCROLLABLE : uint32_t {
    NO_SCROLL = 0,
    VERTICAL,
    HORIZONTAL,
};
```

表示瀑布流当前是否可滚动，以及滚动方向。`RenderWaterFlow::GetAxis()` 根据该枚举返回 `Axis::VERTICAL` 或 `Axis::HORIZONTAL`。

### WaterFlowEvents

位置：`render_water_flow.h`

```cpp
enum class WaterFlowEvents : uint32_t {
    NONE = 0,
    REACH_START,
    REACH_END,
};
```

用于记录首尾到达事件。`RenderWaterFlow::PerformLayout()` 检测首尾状态变化后设置事件标记，`HandleScrollEvent()` 再触发 `WaterFlowComponent` 上的 `OnReachStart` / `OnReachEnd` 回调。

### FlowStyle

位置：`render_water_flow.h`

```cpp
using FlowStyle = struct {
    double mainPos = 0.0;
    double crossPos = 0.0;
    double mainSize = 0.0;
    double crossSize = 0.0;
};
```

描述单个瀑布流 item 的布局结果：

| 字段 | 含义 |
| --- | --- |
| `mainPos` | 主轴位置。 |
| `crossPos` | 交叉轴位置。 |
| `mainSize` | 主轴尺寸。 |
| `crossSize` | 交叉轴尺寸。 |

`flowMatrix_` 使用 `std::map<size_t, FlowStyle>` 保存 item index 到布局结果的映射。

### ItemConstraintSize

位置：`render_water_flow.h`

```cpp
using ItemConstraintSize = struct {
    double minCrossSize = 0.0;
    double maxCrossSize = 0.0;
    double minMainSize = 0.0;
    double maxMainSize = 0.0;
};
```

描述瀑布流 item 在主轴和交叉轴上的尺寸约束。`CallItemConstraintSize()` 会根据布局方向，把组件上的 min/max width/height 映射为主轴或交叉轴约束。

### WaterFlowItemGenerator

位置：`water_flow_item_generator.h`

`WaterFlowItemGenerator` 是 footer 生成接口：

```cpp
class WaterFlowItemGenerator : virtual public Referenced {
public:
    virtual RefPtr<RenderNode> RequestWaterFlowFooter()
    {
        return nullptr;
    }
};
```

`WaterFlowElement` 私有继承该接口，并将自身注册给 `RenderWaterFlow`。`RenderWaterFlow::RequestWaterFlowFooter()` 通过该接口获取 footer 的渲染节点。

## 核心流程

### 组件创建流程

```text
WaterFlowComponent::CreateElement()
        │
        ▼
创建 WaterFlowElement
        │
        ▼
WaterFlowComponent::CreateRenderNode()
        │
        ▼
RenderWaterFlow::Create()
        │
        ├─ Rosen 后端启用且 ENABLE_ROSEN_BACKEND：创建 RosenRenderWaterFlow
        └─ 其他情况：返回 nullptr
```

子项创建流程：

```text
WaterFlowItemComponent::CreateElement()
        │
        ▼
创建 WaterFlowItemElement
        │
        ▼
WaterFlowItemComponent::CreateRenderNode()
        │
        ▼
RenderWaterFlowItem::Create()
```

### Element 与 Render 的懒加载回调注册

`WaterFlowElement::CreateRenderNode()` 创建渲染节点后，会向 `RenderWaterFlow` 注册四类能力：

```text
RenderWaterFlow::SetBuildChildByIndex()
RenderWaterFlow::SetDeleteChildByIndex()
RenderWaterFlow::SetGetTotalCount()
RenderWaterFlow::RegisterItemGenerator()
```

因此 `RenderWaterFlow` 在布局过程中不直接操作数据源，而是通过 Element 层按索引请求构建或释放子项。

### 更新流程

`RenderWaterFlow::Update()` 的主要步骤：

1. 将传入组件转换为 `WaterFlowComponent`。
2. 将 `WaterFlowPositionController` 绑定到当前渲染节点。
3. 初始化动画器 `animator_`。
4. 标记 `updateFlag_ = true`。
5. 读取布局方向、行列间距、模板参数、滚动条代理。
6. 初始化滚动条和滚动条代理。
7. 创建 `Scrollable`。
8. `MarkNeedLayout()` 请求布局。

### 主布局流程

`RenderWaterFlow::PerformLayout()` 是核心布局入口，主要流程如下：

```text
PerformLayout()
    │
    ├─ InitialFlowProp()
    │   ├─ 获取主轴/交叉轴尺寸
    │   ├─ 计算主轴/交叉轴 gap
    │   ├─ 计算 item 尺寸约束
    │   ├─ 解析 columnsArgs 或 rowsArgs
    │   ├─ 初始化 crossCount 和 mainSideEndPos
    │   ├─ 清理旧子项和旧布局矩阵
    │   └─ 请求 footer
    │
    ├─ AdjustViewPort()
    ├─ GetNextSupplyedIndex()
    ├─ GetTargetPos()
    ├─ SupplyItems()
    │   ├─ 按需 build child
    │   ├─ 布局子项
    │   ├─ 找到当前最短分栏/分行
    │   ├─ 写入 flowMatrix_
    │   └─ 更新 mainSideEndPos_
    │
    ├─ AdjustViewPort()
    ├─ UpdateCacheItems()
    ├─ LayoutItems(cacheItems_)
    ├─ LayoutFooter()
    ├─ CheckReachTail()
    ├─ CheckReachHead()
    ├─ 更新滚动条可滚动状态
    ├─ 设置 REACH_START / REACH_END 事件标记
    ├─ 设置自身布局尺寸
    ├─ HandleScrollEvent()
    ├─ 更新 lastOffset_
    └─ MarkNeedPredictLayout()
```

瀑布流的放置策略是典型的“放到当前主轴结束位置最小的交叉轴分片”。相关方法包括：

- `GetLastMainBlankCross()`：找到当前主轴结束位置最小的分片索引。
- `GetLastMainBlankPos()`：返回该分片下一项应该放置的位置。
- `GetCrossEndPos()`：计算交叉轴分片的起始位置。
- `ConstraintItemSize()`：约束 item 主轴尺寸，并把交叉轴尺寸固定为对应分片尺寸。
- `UpdateMainSideEndPos()`：数据更新或清理后重建每个分片的主轴结束位置。

### 模板参数解析流程

`InitialFlowProp()` 使用 `TemplatesParser::ParseArgs()` 解析模板参数：

- `COLUMN` / `COLUMN_REVERSE`：解析 `columnsArgs_`。
- `ROW` / `ROW_REVERSE`：解析 `rowsArgs_`。

解析前会调用 `PreParseArgs()`。该函数将模板字符串中的 `"auto"` 替换为 `"1fr"`，注释明确说明：WaterFlow 中 `"auto"` 表示 `1fr`。

如果解析结果为空，则使用单个交叉轴分片，尺寸为整个 `crossSize_`。

### 滚动流程

滚动能力由 `Scrollable` 和 `ScrollBar` 共同支持。

`CreateScrollable()` 根据 `useScrollable_` 创建垂直或水平 `Scrollable`，其滚动回调最终调用：

```text
UpdateScrollPosition(offset, source)
```

`UpdateScrollPosition()` 的主要约束：

1. `SCROLL_FROM_START` 直接返回 true。
2. 偏移接近 0 时直接返回 true。
3. 如果首尾都到达，不允许继续滚动。
4. 根据 `FlexDirection` 和滚动方向判断是否已经到边界。
5. 更新 `viewportStartPos_ -= offset`。
6. 标记需要布局。

方向约束：

| 布局方向 | 正向边界判断 |
| --- | --- |
| `COLUMN` | 向上到达 head，向下到达 tail |
| `ROW` | 向左到达 head，向右到达 tail |
| `COLUMN_REVERSE` | 向下到达 head，向上到达 tail |
| `ROW_REVERSE` | 向右到达 head，向左到达 tail |

鼠标轴事件由 `HandleAxisEvent()` 处理，它会把滚轮角度换算成 vp 偏移后调用 `UpdateScrollPosition()`。

### 滚动条流程

`InitScrollBar()` 创建并配置滚动条：

1. 如果已有 `scrollBar_`，更新 display mode 并 reset。
2. 获取 `ScrollBarTheme`。
3. 创建 `WaterFlowScrollController`。
4. 创建 `ScrollBar` 并设置 controller。
5. 从主题中设置最小高度、动态高度、前景色、背景色、padding、宽度等。
6. 根据布局方向设置滚动方向和滚动条位置：
   - `COLUMN` / `COLUMN_REVERSE`：垂直滚动，滚动条在右侧。
   - `ROW` / `ROW_REVERSE`：水平滚动，滚动条在底部。
7. 初始化滚动条并注册回调。

`InitScrollBarProxy()` 会将当前瀑布流注册到外部 `ScrollBarProxy`，使外部代理可以驱动当前瀑布流滚动。

`RosenRenderWaterFlow::Paint()` 中会根据滚动条 active 状态、display mode 和 opacity 决定是否绘制滚动条。

### ScrollToIndex 流程

`WaterFlowPositionController::ScrollToIndex()` 转调 `RenderWaterFlow::ScrollToIndex(index)`。

`RenderWaterFlow::ScrollToIndex()` 逻辑：

1. 如果不可滚动或 index 小于 0，直接返回。
2. 如果目标 index 尚未在 `flowMatrix_` 中：
   - 设置 `targetIndex_ = index`。
   - 从下一个待补齐索引开始调用 `SupplyItems()`。
   - 再次查找目标 index。
3. 根据方向计算目标主轴位置：
   - `COLUMN` / `ROW`：使用 `item.mainPos`。
   - reverse 方向：使用反向位置换算。
4. 调用 `AnimateToPos()`，以固定 `ANIMATE_DURATION = 800ms` 和 `CURVE_SCROLL_TO_TOP` 执行动画。

当前实现忽略 `ScrollController::ScrollToIndex()` 参数中的 `smooth`、`align` 和 `extraOffset`。

### 缓存与预测布局流程

模块维护两类范围：

- 可见区：`viewportStartPos_` 到 `viewportStartPos_ + mainSize_`。
- 缓存区：可见区前后扩展 `cacheSize_`，其中 `cacheSize_ = mainSize_ * 3`。

`UpdateCacheItems()` 将 `flowMatrix_` 中与缓存区有交集的 item 放入 `cacheItems_`。

`DealCache()` 检查 `items_` 中已经构建但超出缓存区的子项，调用 `DeleteItems()` 释放。

`OnPredictLayout(deadline)` 用于在过渡结束且时间允许时预构建缓存区后续子项：

1. `NeedPredictLayout()` 判断是否需要预测布局。
2. 如果上下文处于 transition 未停止状态，继续标记预测布局。
3. 调用 `DealCache()` 删除缓存区外子项。
4. 如果耗时接近 deadline，则推迟。
5. 调用 `SupplyItems()` 补齐到 `GetCacheTargetPos()`。
6. 更新缓存项并布局。
7. 记录 `dVPStartPosBackup_` 和 `totalCountBack_`。
8. 再次 `MarkNeedPredictLayout()`。

### 数据源更新流程

`WaterFlowElement::OnDataSourceUpdated(startIndex)`：

1. 将自身加入 post flush listener。
2. 调用 `RenderWaterFlow::OnDataSourceUpdated(startIndex)`。
3. 更新渲染层 total count。
4. 调用 `ElementProxyHost::OnDataSourceUpdated(startIndex)`。

`RenderWaterFlow::OnDataSourceUpdated(index)`：

1. 如果 items 为空且正在 update，直接返回。
2. 如果没有 total count 回调，直接返回。
3. 更新 `totalCount_`。
4. `ClearItems(index)`：隐藏并移除 index 之后已构建子项。
5. `ClearLayout(index)`：清理 index 之后布局矩阵、缓存项、首尾状态，并重建主轴结束位置。
6. `MarkNeedLayout()`。

### Footer 流程

footer 由 `WaterFlowComponent::SetFooterComponent()` 设置，`WaterFlowElement::PerformBuild()` 更新 footer element。

渲染层流程：

1. `InitialFlowProp()` 中调用 `RequestWaterFlowFooter()`。
2. `RenderWaterFlow::RequestWaterFlowFooter()` 通过 `WaterFlowItemGenerator` 获取 footer render node。
3. 如果 footer 存在，则加入子节点并布局。
4. 如果 footer 主轴或交叉轴尺寸非正，移除 footer。
5. 否则调用 `GetFooterSize()` 计算 footer 最大尺寸。
6. `PerformLayout()` 中调用 `LayoutFooter()`。
7. `SetFooterPosition()` 根据布局方向把 footer 放在尾部，并判断是否在视口范围内，符合条件才设置可见。

### 首尾事件流程

`PerformLayout()` 中计算：

- `reachTail_ = CheckReachTail()`
- `reachHead_ = CheckReachHead()`

当状态从未到达到到达时，设置：

- `waterflowEventFlags_[WaterFlowEvents::REACH_START] = true`
- `waterflowEventFlags_[WaterFlowEvents::REACH_END] = true`

随后 `HandleScrollEvent()` 消费标记：

- `REACH_START` 调用 `WaterFlowComponent::GetOnReachStart`
- `REACH_END` 调用 `WaterFlowComponent::GetOnReachEnd`

事件触发后会把对应标记重置为 false，避免重复触发。

## 接口与数据边界

### 组件层接口

`WaterFlowComponent` 暴露的主要 setter/getter 包括：

| 接口 | 说明 |
| --- | --- |
| `SetColumnsGap()` / `GetColumnsGap()` | 设置/获取列间距。 |
| `SetRowsGap()` / `GetRowsGap()` | 设置/获取行间距。 |
| `SetLayoutDirection()` / `GetDirection()` | 设置/获取布局方向。 |
| `SetColumnsArgs()` / `GetColumnsArgs()` | 设置/获取列模板参数。 |
| `SetRowsArgs()` / `GetRowsArgs()` | 设置/获取行模板参数。 |
| `SetMinWidth()` / `GetMinWidth()` | 设置/获取 item 最小宽度。 |
| `SetMinHeight()` / `GetMinHeight()` | 设置/获取 item 最小高度。 |
| `SetMaxWidth()` / `GetMaxWidth()` | 设置/获取 item 最大宽度。 |
| `SetMaxHeight()` / `GetMaxHeight()` | 设置/获取 item 最大高度。 |
| `SetController()` / `GetController()` | 设置/获取位置控制器。 |
| `SetScrollBarProxy()` / `GetScrollBarProxy()` | 设置/获取滚动条代理。 |
| `SetScrollBarDisplayMode()` / `GetScrollBarDisplayMode()` | 设置/获取滚动条显示模式。 |
| `SetFooterComponent()` / `GetFooterComponent()` | 设置/获取 footer 组件。 |

### 渲染层接口

`RenderWaterFlow` 对 Element 层开放的关键接口：

| 接口 | 说明 |
| --- | --- |
| `SetBuildChildByIndex()` | 注册按索引构建子项回调。 |
| `SetDeleteChildByIndex()` | 注册按索引删除子项回调。 |
| `SetGetTotalCount()` | 注册获取总数回调。 |
| `AddChildByIndex()` | 将指定索引的渲染节点加入瀑布流。 |
| `RemoveChildByIndex()` | 移除指定索引的渲染节点。 |
| `ClearLayout()` | 清理布局矩阵和缓存状态。 |
| `ClearItems()` | 清理指定索引之后的已构建 item。 |
| `OnDataSourceUpdated()` | 响应数据源更新。 |
| `ScrollToIndex()` | 滚动到指定 index。 |
| `RegisterItemGenerator()` | 注册 footer 生成器。 |

### 控制器接口

`WaterFlowPositionController` 对接通用滚动控制器接口：

| 接口 | 实现行为 |
| --- | --- |
| `ScrollToIndex(index, smooth, align, extraOffset)` | 转调 `RenderWaterFlow::ScrollToIndex(index)`。 |
| `GetScrollDirection()` | 从渲染节点读取轴向，不存在时默认垂直。 |

`WaterFlowScrollController` 对接滚动条控制器接口：

| 接口 | 实现行为 |
| --- | --- |
| `MarkScrollRender()` | 标记瀑布流重新布局。 |
| `CheckScroll()` | 判断绑定节点是否有效。 |
| `UpdateScrollPosition()` | 将滚动条偏移换算为内容偏移。 |
| `ProcessScrollMotion()` | 处理滚动条运动过程。 |

## 关键约束

1. 该模块是 `components_v2` 旧管线实现，不是 `components_ng/pattern/waterflow` 的 NG 实现。

2. `RenderWaterFlow::Create()` 依赖 Rosen 后端：
   - `SystemProperties::GetRosenBackendEnabled()` 为 true 且 `ENABLE_ROSEN_BACKEND` 存在时才创建 `RosenRenderWaterFlow`。
   - 其他分支返回 `nullptr`。

3. `WaterFlowComponent` 的间距和尺寸约束不接受负值：
   - 负数 gap 会重置为 `0.0px`。
   - 负数 min/max width/height 会重置为 `0.0px`。

4. `SetLayoutDirection()` 只接受 `FlexDirection::ROW` 到 `FlexDirection::COLUMN_REVERSE` 范围内的方向值。

5. 模板参数中的 `"auto"` 在 WaterFlow 中会被预处理为 `"1fr"`。

6. 如果模板解析结果为空，瀑布流退化为单个交叉轴分片。

7. 主轴 item 最大尺寸会受到根节点尺寸的 3 倍约束：
   - 纵向布局使用 `pipelineContext->GetRootHeight() * 3`。
   - 横向布局使用 `pipelineContext->GetRootWidth() * 3`。

8. 缓存区大小固定为主轴视口尺寸的 3 倍，即 `cacheSize_ = mainSize_ * 3`。

9. `ScrollToIndex()` 当前只按 index 滚动：
   - `smooth` 参数未参与逻辑。
   - `ScrollAlign align` 未参与逻辑。
   - `extraOffset` 未参与逻辑。
   - 动画时长固定为 800ms。

10. `RenderWaterFlowItem` 只布局第一个子节点，瀑布流子项语义上是单子组件包装。

11. footer 只有在布局后主轴尺寸和交叉轴尺寸均为正时才保留，否则会被移除。

12. reach start / reach end 事件只在状态从未到达到到达时设置标记，随后由 `HandleScrollEvent()` 消费，避免连续重复触发。

13. 反向布局方向使用不同的视口和 item 位置换算逻辑，涉及的方法包括 `SetChildPosition()`、`CheckReachHead()`、`CheckReachTail()`、`AdjustViewPort()`、`ScrollToIndex()`。

## 模块关系图

```text
WaterFlowComponent
        │
        ├─ CreateElement()
        ▼
WaterFlowElement
        │
        ├─ ElementProxyHost 管理懒加载子项
        ├─ WaterFlowItemGenerator 提供 footer render node
        └─ 注册 Build/Delete/TotalCount/Footer 回调
        │
        ▼
RenderWaterFlow
        │
        ├─ flowMatrix_ 记录 item 布局
        ├─ items_ 记录已构建 render node
        ├─ cacheItems_ 记录缓存区 item
        ├─ Scrollable 处理触摸/轴滚动
        ├─ ScrollBar / ScrollBarProxy 处理滚动条
        ├─ Animator 处理 ScrollToIndex 动画
        └─ footer_ 处理尾部组件
        │
        ▼
RosenRenderWaterFlow
        │
        └─ Paint() 绘制滚动条并设置 Rosen 裁剪
```

子项关系：

```text
WaterFlowItemComponent
        │
        ├─ CreateElement()
        ▼
WaterFlowItemElement
        │
        ├─ CreateRenderNode()
        ▼
RenderWaterFlowItem
        │
        └─ 布局唯一子节点，并把自身尺寸同步为子节点尺寸
```

## 典型运行过程

```text
1. 前端/上层创建 WaterFlowComponent，并设置 rows/columns、gap、direction、controller、footer 等属性。
2. WaterFlowComponent 创建 WaterFlowElement 和 RenderWaterFlow。
3. WaterFlowElement 注册按索引构建、删除、总数获取和 footer 生成回调。
4. RenderWaterFlow::Update() 读取组件属性，初始化滚动条、滚动代理和 Scrollable。
5. RenderWaterFlow::PerformLayout() 初始化瀑布流尺寸、模板分片和约束。
6. RenderWaterFlow::SupplyItems() 从当前待补齐索引开始按需请求 Element 构建子项。
7. 每个 item 被放入当前主轴结束位置最短的分片，布局结果写入 flowMatrix_。
8. RenderWaterFlow::UpdateCacheItems() 找出缓存区内 item，并调用 LayoutItems() 布局和定位。
9. footer 被布局到尾部。
10. 检查是否到达首尾并触发对应事件。
11. RosenRenderWaterFlow::Paint() 绘制内容和滚动条。
12. 滚动、数据源更新或 ScrollToIndex 会更新 viewportStartPos_ 或清理布局矩阵，再触发下一轮布局。
```