# Indexer 模块中间设计文档（components_v2）

## 文档说明
- 模块路径：`frameworks/core/components_v2/indexer`
- 来源依据：该路径下 27 个相关源码文件（`.h/.cpp`）与现有构建/运行脚本上下文
- 目标：提供可直接用于 `design.md` 的白盒中间设计素材，重点覆盖模块目的、目录结构、核心组件、流程、数据结构与约束

## 1. 模块目的
`Indexer` 模块用于实现索引列表导航能力，支持两类表现形态：
- 基础索引列（字母/分区快速定位）
- 选中时弹出气泡提示
- 通过回调按需请求弹窗数据的弹窗模式（PopupList）

该模块本质上是一个“组件-元素-渲染”三层协同的交互控件，围绕以下目标：
- 在侧边快速点击/滑动时更新当前索引与选中状态
- 将高亮、气泡、弹窗状态统一同步到 Render 层
- 支持焦点与触摸事件两套输入路径
- 支持可替换的气泡/弹窗配置与数据提供逻辑

## 2. 目录结构
- `frameworks/core/components_v2/indexer/indexer_component.h/.cpp`
- `frameworks/core/components_v2/indexer/indexer_element.h/.cpp`
- `frameworks/core/components_v2/indexer/indexer_event_info.h/.cpp`
- `frameworks/core/components_v2/indexer/indexer_item_component.h/.cpp`
- `frameworks/core/components_v2/indexer/popup_list_component.h/.cpp`
- `frameworks/core/components_v2/indexer/popup_list_element.h/.cpp`
- `frameworks/core/components_v2/indexer/popup_list_item_component.h/.cpp`
- `frameworks/core/components_v2/indexer/popup_list_item_element.h/.cpp`
- `frameworks/core/components_v2/indexer/render_indexer.h/.cpp`
- `frameworks/core/components_v2/indexer/render_indexer_item.h/.cpp`
- `frameworks/core/components_v2/indexer/render_popup_list.h/.cpp`
- `frameworks/core/components_v2/indexer/render_popup_list_creator.cpp`
- `frameworks/core/components_v2/indexer/render_popup_list_item.h/.cpp`
- `frameworks/core/components_v2/indexer/rosen_render_popup_list.h/.cpp`
- `frameworks/core/components_v2/indexer/BUILD.gn`（构建锚点，后述）

## 3. 组件边界与分层职责

### 3.1 Component 层（声明/属性/树组装）
- `frameworks/core/components_v2/indexer/indexer_component.h`：`IndexerComponent`
  - `ComponentGroup` 派生，定义外部可见参数（字号/样式/颜色/气泡/弹窗/回调）及组装逻辑
  - 作用：构建完整子树（索引项、气泡、弹窗）与默认参数注入
- `frameworks/core/components_v2/indexer/indexer_item_component.h`：`IndexerItemComponent`
  - 单条索引条目组件，保存标签文本、索引位置、样式/旋转等数据
- `frameworks/core/components_v2/indexer/popup_list_component.h`：`PopupListComponent`
  - 弹窗容器组件，暴露方向、边缘效应等行为属性
- `frameworks/core/components_v2/indexer/popup_list_item_component.h`：`PopupListItemComponent`
  - 弹窗列表的单项展示组件（装箱、文本、背景/高亮）

### 3.2 Element 层（树管理/事件入口）
- `frameworks/core/components_v2/indexer/indexer_element.h/.cpp`：`IndexerElement`
  - 焦点节点/组件组节点，处理焦点方向键与按键事件
- `frameworks/core/components_v2/indexer/popup_list_element.h/.cpp`：`PopupListElement`
  - 弹窗容器的元素生命周期与渲染节点连接
- `frameworks/core/components_v2/indexer/popup_list_item_element.h/.cpp`：`PopupListItemElement`
  - 弹窗项元素处理

### 3.3 Render 层（实际渲染与布局）
- `frameworks/core/components_v2/indexer/render_indexer.h/.cpp`：`RenderIndexer`
  - 主索引条渲染节点：处理布局、尺寸、触摸索引、焦点动画、选中更新、气泡更新
- `frameworks/core/components_v2/indexer/render_indexer_item.h/.cpp`：`RenderIndexerItem`
  - 单条索引项具体绘制与状态变更（当前选中/普通态）
- `frameworks/core/components_v2/indexer/render_popup_list.h/.cpp`：`RenderPopupList`
  - 弹窗列表渲染节点：数据管理、滚动计算、子项回收与布局、触摸映射
- `frameworks/core/components_v2/indexer/render_popup_list_item.h/.cpp`：`RenderPopupListItem`
  - 弹窗项样式切换（选中/普通）
- `frameworks/core/components_v2/indexer/rosen_render_popup_list.h/.cpp`：`RosenRenderPopupList`
  - Rosen 后端绘制适配实现（`Paint`）

### 3.4 事件模型
- `frameworks/core/components_v2/indexer/indexer_event_info.h/.cpp`：`IndexerEventInfo`
  - 统一事件载体，含 `selectedIndex_` 和 JSON 序列化能力
  - 用于索引点击/选择变化事件上报

## 4. 核心类与关键 symbol 说明（附锚点与为何重要）

| 类/符号 | 文件 | 作用锚点 | 重要性 |
|---|---|---|---|
| `IndexerComponent` | `indexer_component.h/.cpp` | `CreateElement`, `CreateRenderNode`, `Build`, `BuildIndexerItems`, `BuildPopupList` | 控制整个索引控件的入口与子树组装 |
| `AlignStyle` | `indexer_component.h` | 枚举（`LEFT/RIGHT/START/END`） | 决定弹出/对齐行为的关键策略值 |
| `OnRequestPopupDataFunc` | `indexer_component.h` | `std::function<std::vector<std::string>(std::shared_ptr<IndexerEventInfo>)>` | 允许父层在需要时异步/动态返回弹窗列表内容 |
| `SetRequestPopupDataFunc` | `indexer_component.h` | 配置函数 | 控制弹窗列表是否工作以及数据来源 |
| `OnPopupDataSelected` | `indexer_component.h` | 回调挂接点 | 统一弹窗项点击结果回传 |
| `IndexerElement` | `indexer_element.h/.cpp` | `HandleKeyEvent`, `RequestNextFocus` | 输入模型（键盘/遥控）与焦点行为入口 |
| `IndexerEventInfo` | `indexer_event_info.h/.cpp` | `ToJSONString` | 事件序列化与参数透传依据 |
| `RenderIndexer` | `render_indexer.h/.cpp` | `OnTouchTestHit`, `HandleTouchDown`, `HandleTouchUp`, `HandleFocusAnimation`, `GetTouchedItemIndex`, `UpdateBubbleText`, `MoveSectionWithIndexer` | 运行时交互的核心控制器 |
| `RenderPopupList` | `render_popup_list.h/.cpp` | `Update`, `PerformLayout`, `LayoutOrRecycleCurrentItems`, `RequestAndLayoutNewItem`, `TouchTest`, `GetTouchedListIndex` | 弹窗列表滚动/布局/交互关键逻辑 |
| `RosenRenderPopupList` | `rosen_render_popup_list.h/.cpp` | `Paint` | Rosen 平台渲染入口，确认后端一致性 |
| `RenderPopupListItem` | `render_popup_list_item.h/.cpp` | `UpdateBoxSelected` / `UpdateBoxNormal` | 弹窗项视觉状态切换的最小粒度控制 |

## 5. 关键流程

### 5.1 组件创建与初始树构建
1. 上层创建 `IndexerComponent` 并设置属性
2. `CreateElement` 与 `CreateRenderNode` 产生 `IndexerElement` 和 `RenderIndexer`
3. `BuildIndexerItems` 按索引标签构造 `IndexerItemComponent` 集合
4. 若启用气泡/弹窗，构造对应 `PopupListComponent` 与弹窗节点
5. 渲染阶段 `RenderIndexer` 接收更新参数并执行布局/显示

锚点：`frameworks/core/components_v2/indexer/indexer_component.cpp`，`indexer_component.h`

### 5.2 触摸交互流程（核心）
1. `RenderIndexer::TouchTest`/`HandleTouchDown/Move/Up` 将触点映射到条目索引
2. 通过 `GetTouchedItemIndex` 确定命中行
3. 选中状态与气泡文案由 `UpdateBubbleText`/内部状态更新
4. 回调触发（例如弹窗请求、最终选择更新）时驱动 `OnPopupDataSelected` 或事件派发

锚点：`frameworks/core/components_v2/indexer/render_indexer.h/.cpp`

### 5.3 键盘/遥控焦点流程
1. `IndexerElement` 接收键盘事件（方向键/确认键）
2. 调用焦点查找与切换 API（如 `RequestNextFocus`）
3. 与 `RenderIndexer` 的 focus animation 与选中映射配合更新视觉态

锚点：`frameworks/core/components_v2/indexer/indexer_element.h/.cpp`

### 5.4 弹窗列表请求与更新流程
1. 在需要弹出展示时，组件层可调用/检查 `OnRequestPopupData` 函数
2. 回调返回新字符串列表
3. `RenderPopupList` 更新内部 `itemDatas_`，并通过 `LayoutOrRecycleCurrentItems`/`RequestAndLayoutNewItem` 刷新子节点布局
4. 触摸选择弹窗项时回传索引给父级回调

锚点：`frameworks/core/components_v2/indexer/indexer_component.h/.cpp`, `render_popup_list.h/.cpp`

## 6. 约束与配额

### 6.1 结构性约束
- 索引列项数存在上限约束：`INDEXER_ITEM_MAX_COUNT = 29`（防止异常超长标签布局）
- 支持字体/颜色/尺寸等默认值常量（如字体大小、item 间距、气泡尺寸、偏移），以常量定义管理
- `.` 标签转换为显示符号逻辑存在（用于视觉替换），避免单字符特殊含义直接透传导致显示问题

锚点：`indexer_component.h`

### 6.2 交互约束
- 按键与触摸路径是独立入口，均需同步 selected state 与可视状态
- 触摸映射依赖当前布局矩形与滚动偏移计算，边界判定失败会导致索引命中为空
- 弹窗列表要求有可用的数据集合且与滚动/索引计算一致

锚点：`render_indexer.h/.cpp`, `render_popup_list.h/.cpp`

### 6.3 平台约束
- `RosenRenderPopupList` 提供 Rosen 后端绘制分支，平台差异由渲染节点创建链路区分
- 现有构建/注册逻辑需要通过 `BUILD.gn`/渲染对象工厂（待补齐的 `render_popup_list_creator.cpp` 细节）完成实例化

锚点：`rosen_render_popup_list.h/.cpp`, `render_popup_list_creator.cpp`, `BUILD.gn`

## 7. 对外行为接口与数据结构

### 7.1 事件信息
- `IndexerEventInfo`
  - 字段：`selectedIndex_`
  - 方法：`SetSelectedIndex`/`GetSelectedIndex`/`ToJSONString`
  - 用途：事件回调上下文与上报序列化

锚点：`indexer_event_info.h/.cpp`

### 7.2 组件配置参数（抽象）
- 索引组件主要配置（颜色、尺寸、字体、气泡、对齐、弹窗方向/边缘效果）
- 回调参数：
  - 请求弹窗数据回调（输入事件对象，返回字符串列表）
  - 弹窗选中回调（返回选中索引）

锚点：`indexer_component.h`

### 7.3 渲染状态
- `RenderIndexer` 状态机包括：当前选中索引、是否显示气泡、是否启用 popup、touch down/up 状态、气泡位置信息
- `RenderPopupList` 状态包括：当前列表项数据、滚动偏移、当前显示窗口范围、是否边界回弹等

锚点：`render_indexer.h/.cpp`, `render_popup_list.h/.cpp`

## 8. 主要运行时关系图（文本）
`IndexerComponent`  
→ 创建 `IndexerElement` + `RenderIndexer`  
→ 构建 `IndexerItemComponent` / `PopupListComponent`  
→ Element 处理键盘焦点与事件分发  
→ Render 处理触摸命中与布局绘制  
→ 通过 `IndexerEventInfo` 回调上报选中/弹窗选择

## 9. 调试指导（症状-定位-建议）
1. **症状：滑动/点击命中错误索引**
   - 可能源：`RenderIndexer::GetTouchedItemIndex` 或布局尺寸偏移
   - 检查：
     - `frameworks/core/components_v2/indexer/render_indexer.cpp`（触点映射逻辑）
     - `render_indexer.h` 的布局与尺寸字段
     - `indexer_item_component.h` 的索引与尺寸参数
2. **症状：键盘上下左右无法切换焦点**
   - 可能源：`IndexerElement::HandleKeyEvent` 或焦点请求链路中断
   - 检查：
     - `frameworks/core/components_v2/indexer/indexer_element.cpp`
     - `focus` 相关配置是否启用、render 中是否同步当前选中状态
3. **症状：弹窗列表不显示或闪烁**
   - 可能源：popup 数据回调未返回、RenderPopupList 未正确 `Update` 或布局失败
   - 检查：
     - `indexer_component.cpp` 中 popup 创建与回调挂接
     - `render_popup_list.cpp` 的 `Update`、`PerformLayout`、`TouchTest`
     - `popup_list_element.*` 生命周期是否进入正常渲染链
4. **症状：弹窗中点击项未高亮**
   - 可能源：`RenderPopupListItem::Update` 或选中状态未下发
   - 检查：
     - `render_popup_list_item.cpp/.h`
     - `popup_list_item_component.*` 的 child style 构造
5. **症状：气泡文案错位/未更新**
   - 可能源：`UpdateBubbleText` 未在 touch move/up 时同步
   - 检查：
     - `render_indexer.cpp` 的气泡更新调用点
     - `indexer_component` 中气泡子树构建参数

## 10. 构建/验证/回滚/部署运行手册（基于已知构建链路）
### 10.1 构建（模块级影响）
- 全量模块构建（工程根）：
  - `./build.sh --product-name rk3568 --build-target ace_engine`
- 常见最小验证（组件级）：
  - `./build.sh --product-name rk3568 --build-target //frameworks/core/components_v2/indexer/...`（若 GN 目标可定位）
- 日志检查：
  - `./build.sh` 输出日志位于 `out/rk3568/build.log`
  - 失败片段可按 `error:` 与 `FAILED:` 查找

### 10.2 运行时验证
- 在相关 UI 场景触发 indexer 触摸与按键交互，观察：
  - 选中变化是否正确
  - 气泡是否跟随更新
  - popup 列表是否按回调返回数据展示并能点击选择

### 10.3 回滚
- 若变更导致行为回退，优先在版本管理层回滚对应提交
- 如为资源/默认值回退，可回到上一个稳定参数配置
- 清理构建缓存后重新构建（避免旧渲染对象残留）

### 10.4 常见失败模式
- 触摸索引错位：多见于布局字段不一致导致命中区与视觉区不一致
- 回调未触发：常见于 `OnRequestPopupDataFunc` 未设置或返回空集合
- 渲染器未实例化：`Render`/Factory 链路不完整（需核对 `render_popup_list_creator.cpp` 与 GN 注册）
- 视觉状态不一致：`selected` 状态更新到了 Element 侧，但未同步到 Render侧对应 item render

## 11. 与历史/平台生态关系（要点）
- 该模块是 `components_v2` 下的非 NG 旧式组件链路风格，与 `components_ng` 的现代化实现并行存在
- 采用通用 Component/Element/Render 模式，便于与现有前端桥接事件系统兼容
- 后端绘制存在 `RenderPopupList` 与 `RosenRenderPopupList` 的分叉，说明在不同渲染栈需保持行为一致性

锚点：`render_popup_list.h/.cpp`, `rosen_render_popup_list.h/.cpp`

## 12. 证据确认与推测边界
- 已从源码直接确认：模块文件清单、主要类存在关系、关键函数簇（触摸、布局、回调、事件信息、构建树）、常量约束、回调模型
- 推测范围：
  - `render_indexer.cpp`、`render_popup_list_creator.cpp`、部分头文件行内细节未在单次抓取中完全展开；本文对这些文件行为按已读片段与上下文作了边界化表述
  - 部分命令行 build target 的精确 GN 路径未逐个核验，故以仓库通用构建入口与日志路径为主
- 缺失证据提示：
  - 若需要逐行级别的最终确定性，应补齐 `render_indexer.cpp` 全量读取并补齐 `render_popup_list_creator.cpp` 全量内容
  - 需要单独补充 `test/unittest` 对应用例目录后补充“功能与回归测试覆盖表”