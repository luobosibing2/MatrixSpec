# Water Flow 模块（components_v2）中间设计文档

## 1. 模块定位与目的

`Water Flow` 组件模块位于 `frameworks/core/components_v2/water_flow`，属于旧组件（非 NG）到渲染层桥接体系的一部分，承担“瀑布流/不规则流式列表”场景的构建、虚拟列表项渲染、滚动、索引定位与滑动事件处理职责。

[源代码确认]  
- `frameworks/core/components_v2/water_flow/water_flow_component.cpp` / `.h`：组件对外参数与行为入口在 `WaterFlowComponent`。
- `frameworks/core/components_v2/water_flow/water_flow_element.cpp` / `.h`：组件到渲染层桥接在 `WaterFlowElement` 与 `WaterFlowItemGenerator` 组合关系。
- `frameworks/core/components_v2/water_flow/render_water_flow.cpp` / `.h`：核心布局/渲染入口为 `RenderWaterFlow`。
- `frameworks/core/components_v2/water_flow/render_water_flow_item.cpp` / `.h`：子项渲染单元 `RenderWaterFlowItem`。

## 2. 目录结构（白盒粒度）

- `water_flow_component.h/cpp`：组件层定义与参数注入
- `water_flow_element.h/cpp`：Element 层（组件树节点）
- `water_flow_item_component.h/cpp`：子项组件定义
- `water_flow_item_element.h/cpp`：子项 Element
- `render_water_flow.h/cpp`：渲染节点与瀑布流布局核心
- `render_water_flow_item.h/cpp`：子项 Render 节点
- `render_water_flow_creator.cpp`：Render 对象创建入口
- `rosen_render_water_flow.h/cpp`：Rosen 后端渲染实现
- `water_flow_item_generator.h`：生成器抽象接口
- `water_flow_position_controller.h/cpp`：按索引滚动控制器
- `water_flow_scroll_controller.h/cpp`：滚动过程回调与偏移映射控制器

## 3. 核心组件职责

### 3.1 `WaterFlowComponent`
- 负责对外 API 聚合（属性、事件、回调）；
- 将业务参数透传至 render 层；
- 与 `WaterFlowElement` 形成组件-节点绑定。

[源代码确认]  
- 锚点：`frameworks/core/components_v2/water_flow/water_flow_component.h:class WaterFlowComponent`  
- 锚点：`.../water_flow_component.cpp:WaterFlowComponent::CreateElement`  
- 锚点：`.../water_flow_component.cpp:WaterFlowComponent::CreateRenderNode`  
- 锚点：`.../water_flow_component.cpp:WaterFlowComponent::Set*` / `Get*`（已见布局方向、列/行间距、滚动条、数量上限、首尾到达事件等配置/回调）

### 3.2 `WaterFlowElement`
- 继承关系：`RenderElement + FlushEvent + WaterFlowItemGenerator + ElementProxyHost`；
- 负责 render 节点创建与数据源驱动下的子节点构建/回收；
- 注册并透传 generator 回调，让 render 层可以按索引创建/删除子项。

[源代码确认]  
- 锚点：`frameworks/core/components_v2/water_flow/water_flow_element.h:class WaterFlowElement`  
- 锚点：`.../water_flow_element.cpp:WaterFlowElement::CreateRenderNode`  
- 锚点：`.../water_flow_element.cpp:WaterFlowElement::PerformBuild`  
- 锚点：`.../water_flow_element.cpp:WaterFlowElement::BuildChildByIndex`  
- 锚点：`.../water_flow_element.cpp:WaterFlowElement::DeleteChildByIndex`  
- 锚点：`.../water_flow_element.cpp:WaterFlowElement::OnDataSourceUpdated`  

### 3.3 `RenderWaterFlow`
- 负责瀑布流布局、尺寸计算、子项定位、滚动模型与事件触发；
- 管理 footer 与列表边界事件；
- 提供索引滚动与预布局能力。

[源代码确认]  
- 锚点：`frameworks/core/components_v2/water_flow/render_water_flow.h:class RenderWaterFlow`  
- 锚点：`frameworks/core/components_v2/water_flow/render_water_flow.cpp:RenderWaterFlow::Update`  
- 锚点：`.../render_water_flow.cpp:RenderWaterFlow::PerformLayout`  
- 锚点：`.../render_water_flow.cpp:RenderWaterFlow::CreateScrollable`  
- 锚点：`.../render_water_flow.cpp:RenderWaterFlow::SupplyItems`  
- 锚点：`.../render_water_flow.cpp:RenderWaterFlow::LayoutItems`  
- 锚点：`.../render_water_flow.cpp:RenderWaterFlow::ScrollToIndex`  
- 锚点：`.../render_water_flow.cpp:RenderWaterFlow::HandleScrollEvent`  

### 3.4 `RenderWaterFlowItem` 与 `WaterFlowItemElement`
- `WaterFlowItemComponent` 承载单项业务组件；
- `WaterFlowItemElement` 将 component 转为 render node；
- `RenderWaterFlowItem` 做单项 layout/update 的最小化执行，默认定位偏移交给父 `RenderWaterFlow`。

[源代码确认]  
- 锚点：`frameworks/core/components_v2/water_flow/render_water_flow_item.cpp:RenderWaterFlowItem::PerformLayout`  
- 锚点：`.../render_water_flow_item.cpp:RenderWaterFlowItem::Update`  
- 锚点：`frameworks/core/components_v2/water_flow/water_flow_item_element.cpp:WaterFlowItemElement::PerformBuild`  
- 锚点：`frameworks/core/components_v2/water_flow/water_flow_item_component.cpp:WaterFlowItemComponent::CreateRenderNode`  

### 3.5 后端与控制器
- `RosenRenderWaterFlow`：Rosen 环境下的渲染适配（`Update`/`Paint` 转发与回调）。
- `WaterFlowPositionController`：按 index 控制滚动入口。
- `WaterFlowScrollController`：ScrollMotion 与滚动位移回调，协调位移同步与布局更新。

[源代码确认]  
- 锚点：`frameworks/core/components_v2/water_flow/render_water_flow_creator.cpp:RenderWaterFlowCreator`  
- 锚点：`frameworks/core/components_v2/water_flow/rosen_render_water_flow.h/cpp`（类定义与 `Update/Paint` 覆盖）
- 锚点：`frameworks/core/components_v2/water_flow/water_flow_position_controller.cpp:WaterFlowPositionController::ScrollToIndex`
- 锚点：`frameworks/core/components_v2/water_flow/water_flow_scroll_controller.cpp:WaterFlowScrollController::UpdateScrollPosition`
- 锚点：`frameworks/core/components_v2/water_flow/water_flow_scroll_controller.cpp:WaterFlowScrollController::ProcessScrollMotion`

## 4. 核心流程

### 4.1 创建链路（组件到 Render）
1. 前端声明实例化 `WaterFlowComponent`，属性设置到组件对象。
2. `WaterFlowComponent::CreateElement` 构建 `WaterFlowElement` 并绑定当前属性与 footer 信息。
3. `WaterFlowElement::CreateRenderNode` 创建 `RenderWaterFlow`（或 Rosn 封装）并注册：
   - `BuildChildByIndex/DeleteChildByIndex`
   - `GetTotalCount`
   - `RegisterItemGenerator(this)`
4. `PerformBuild` 中按需创建/回收子节点，并保持 footer 生命周期管理。

[源代码确认]

### 4.2 数据更新与重建
- 当数据源变化时，`WaterFlowElement::OnDataSourceUpdated` 注册 post-flush 回调后调用 render 更新入口；
- `RenderWaterFlow::OnDataSourceUpdated` 触发项重算与布局更新；
- `Update` 会重置滚动条配置并标记必要布局状态。

[源代码确认]

### 4.3 布局与定位
- `PerformLayout` 中根据方向/间距/约束先后计算主轴和交叉轴布局；
- 内部按矩阵缓存(`flowMatrix_`)计算每项位置信息；
- `SetChildPosition` 按方向（COLUMN/COLUMN_REVERSE/ROW/ROW_REVERSE）设置每项偏移，决定坐标系方向；
- footer 使用独立尺寸估算与定位路径（`LayoutWaterFlowFooter` 等）。

[源代码确认 + 少量抽象]  
- 抽象范围：具体数学公式和所有条件分支需结合源码继续逐行确认（当前仅抓取了方法与关键调用链）。

### 4.4 滚动与边界事件
- `CreateScrollable` 创建滚动处理闭包；滑动行为统一到 `UpdateScrollPosition`；
- `HandleScrollEvent` 进入可滚动域判断与事件分发；
- 到达顶部/底部时触发 `ReachStart/ReachEnd` 事件状态位，防止重复抖动上报。

[源代码确认]

## 5. 核心接口与数据结构

### 5.1 组件层 API（对外）
- `Set/Get` 间距/方向/回调类 API（可见于 `water_flow_component.h` 与 `cpp`）；
- 典型配置项（源代码可见）：列间距、行间距、布局方向、最小/最大尺寸、count/总量、scroll bar 配置、footer；  
- 回调事件：reach-start/reach-end。

[源代码确认]

### 5.2 渲染层 API（内部契约）
- `RenderWaterFlow`：
  - `AddChildByIndex/DeleteChildByIndex/BuildChildByIndex`
  - `GetTotalCount`
  - `DoJump`, `ScrollToIndex`, `UpdateScrollPosition`
  - `OnPredictLayout`
  - `RequestWaterFlowFooter`
  - 触控入口 `OnTouchTestHit`
  - 命中测试与边界标记（`NeedPredictLayout`）
- 类型枚举：
  - `SCROLLABLE { NO_SCROLL, VERTICAL, HORIZONTAL }`
  - `WaterFlowEvents { NONE, REACH_START, REACH_END }`
  - `FlowStyle`, `ItemConstraintSize`

[源代码确认]

### 5.3 控制器
- `WaterFlowPositionController`
  - `MarkNeedLayout`
  - `ScrollToIndex`
  - `GetScrollDirection`
- `WaterFlowScrollController`
  - `MarkNeedLayout`
  - `UpdateScrollPosition`
  - `ProcessScrollMotion`
  - `ScrollFrom`
  - `GetActiveHeight`

[源代码确认]

## 6. 关键约束（源代码层面）

1. `WaterFlowElement` 依赖 `WaterFlowItemGenerator` 回调模式，因此子项构建必须通过索引化入口完成；不支持一次性静态全量挂载场景。  
2. 滚动模型绑定在 render 节点，外层控制器仅是状态与回调适配，不直接参与布局。  
3. 数据更新依赖 post-flush 流程触发（`OnDataSourceUpdated` 中通过 flush listener），与立即重建模型不同步。  
4. footer 属于独立子元素链路：footer 由 `WaterFlowElement` 保持并通过 `RequestWaterFlowFooter` 取回给 render 使用。  
5. 布局方向会影响子项绝对定位符号（特别是反向布局方向）。  
6. 事件抖动控制依赖边界状态位（`currentEvent_`/事件枚举）来保证边界回调触发语义稳定。

[源代码确认]

## 7. 运行手册（runbook）

### 7.1 构建
- 全量构建：`./build.sh --product-name rk3568 --build-target ace_engine`
- SDK 构建：`./build.sh --product-name ohos-sdk --build-target ace_engine`
- 按模块编译（若支持）：`./build.sh --product-name rk3568 --build-target //arkui/ace_engine/frameworks/core/components_v2/water_flow`
- 增量开发后再现：在修改后直接重复上述目标（或按项目规范走增量策略）。

### 7.2 验证
- 仅从源可确认的层面验证建议：
  - 检查组件构建不报渲染树破坏（`CreateRenderNode`/`CreateElement` 链路）；
  - 验证 data source 更新后可见项变化；
  - 验证滚动到头尾事件触发；
  - 在有 UI 测试环境时增加针对 `ScrollToIndex`、`reach start/end`、footer 可见性的回归用例。

### 7.3 运行时定位
- 滚动异常：优先检查 `render_water_flow.cpp:RenderWaterFlow::UpdateScrollPosition`、`HandleScrollEvent`。
- 子项错位：优先检查 `RenderWaterFlow::LayoutItems` + `SetChildPosition` + `RenderWaterFlowItem::PerformLayout`。
- Footer 缺失：检查 `WaterFlowElement` footer 注册、`RequestWaterFlowFooter` 与 `LayoutWaterFlowFooter`。

### 7.4 发布/回滚
- 回滚颗粒建议：
  1. 仅退回 `water_flow_component.*`（行为面）或 `render_water_flow.*`（布局面）；
  2. 需要时同时回滚对应 controller；
  3. 跨后端问题回滚为 `RenderWaterFlow` 通路优先级更高，Rosen 相关变更单独控制。
- 变更风险低耦合点优先：优先改 `scroll/position` 控制器，避免同时改 layout 与 element 逻辑。

### 7.5 失败模式与处置
- 只在首渲染无显示：多为 `BuildChildByIndex/GetTotalCount` 回调未正确注册；
- 列表跳动：多为 `UpdateScrollPosition` 与 `UpdateViewport` 之间状态不一致；
- 事件未触发：多为边界状态位未重置、滚动方向判断与可滚动性分支异常；
- 构建失败：通常因 include/导出链变更导致，按增量修复 build log；必要时查看 `out/rk3568/build.log` 与 `out/rk3568/arkui/ace_engine/build.log`。

## 8. 调试指引（模块级）

### 8.1 组件层调试
- 症状：组件参数未生效（间距/方向/总数）  
- 可能位置：`water_flow_component.cpp` 的 `Update` / `CreateElement`  
- 建议检查：  
  - `frameworks/core/components_v2/water_flow/water_flow_component.cpp:WaterFlowComponent::Update`  
  - 对应 setters 是否被上层调用路径覆盖

### 8.2 构建链路调试
- 症状：子项不创建 / 只部分创建  
- 可能位置：`water_flow_element.cpp`  
- 建议检查：  
  - `WaterFlowElement::CreateRenderNode` 回调注册  
  - `WaterFlowElement::BuildChildByIndex` / `DeleteChildByIndex`  
  - `OnDataSourceUpdated` flush listener 注册和触发顺序

### 8.3 布局/定位调试
- 症状：子项坐标错位、重叠、间距异常  
- 可能位置：`render_water_flow.cpp`  
- 建议检查：  
  - `PerformLayout` → `SupplyItems` → `LayoutItems`  
  - `SetChildPosition`（方向分支）  
  - `CallGap`、`ItemConstraintSize`、`InitialFlowProp` 的输入值

### 8.4 滚动/边界调试
- 症状：滚动卡顿、回弹异常、到头事件重复  
- 可能位置：`render_water_flow.cpp` + `water_flow_scroll_controller.cpp`  
- 建议检查：  
  - `CreateScrollable` / `HandleScrollEvent`  
  - `UpdateScrollPosition` / `ProcessScrollMotion`  
  - 边界事件函数与状态位复位逻辑

### 8.5 索引跳转调试
- 症状：ScrollToIndex 未生效或跳偏  
- 可能位置：`water_flow_position_controller.cpp` + `RenderWaterFlow::ScrollToIndex` / `DoJump`  
- 建议检查：  
  - 索引有效性判断  
  - 目标偏移计算与目标位置边界约束

### 8.6 后端适配调试
- 症状：Rosen 环境下仅部分绘制或滚动条异常  
- 可能位置：`rosen_render_water_flow.cpp` + `rosen_render_water_flow.h`  
- 建议检查：  
  - `Update` 是否正确调用基类更新  
  - `Paint` 与 `RosenScrollBarPainter` 的回调联动

## 9. 关键源码锚点（事实确认与用途）

- `frameworks/core/components_v2/water_flow/water_flow_component.h: WaterFlowComponent`  
  用途：定义组件对外属性与事件边界。
- `.../water_flow_component.cpp: WaterFlowComponent::CreateElement/Setters`  
  用途：组件实例化与参数注入。
- `frameworks/core/components_v2/water_flow/water_flow_element.h: WaterFlowElement`  
  用途：桥接渲染节点与生成器生命周期。
- `.../water_flow_element.cpp: CreateRenderNode/PerformBuild/OnDataSourceUpdated`  
  用途：构建与数据变更驱动的重构流程。
- `frameworks/core/components_v2/water_flow/render_water_flow.h: RenderWaterFlow`  
  用途：核心布局与滚动行为定义（滚动方向/事件/子项布局/估算）。
- `.../render_water_flow.cpp: Update/PerformLayout/SupplyItems/LayoutItems/HandleScrollEvent/ScrollToIndex`  
  用途：核心算法与运行时行为。
- `frameworks/core/components_v2/water_flow/render_water_flow_item.cpp: RenderWaterFlowItem::Update/PerformLayout`  
  用途：单子项的最小布局动作。
- `frameworks/core/components_v2/water_flow/render_water_flow_creator.cpp: render factory`  
  用途：Rosen/非 Rosen render 分发切换。
- `.../water_flow_position_controller.cpp: ScrollToIndex` 与 `water_flow_scroll_controller.cpp: UpdateScrollPosition/ProcessScrollMotion`  
  用途：滚动控制入口与位移映射。

## 10. 证据边界与待确认事项

- 源代码确认：上述“类、方法、回调、调用关系、创建链路、控制器职责”均已在对应文件符号和实现中可见。  
- 推测范围：具体数值布局策略的每一分支（例如某些尺寸计算、边界收敛条件、动画参数）建议在未展示的源码片段做完整逐行核对后再用于实现细节级设计。  
- 缺失证据：目前未在本次产出中给出该模块专项单测文件与构建 target 清单；若需进一步补齐，应追加该模块相关测试路径与命令的实测结果。