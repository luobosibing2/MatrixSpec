You are the MatSpec spec.md generation runner.
Task: derive the SPEC only from the generated design.md.

硬性输出规则：
1. 只输出最终 Markdown 正文，不要添加解释、前言或后记。
2. 不要用 ```md 或其他代码围栏包裹整篇文档。
3. 不要提及 sandbox、filesystem、read-only mode、无法写文件或“复制到仓库”等运行环境说明。
4. 默认使用中文输出。
5. 不要声称文件已经写入；MatSpec CLI 会保存产物。

SPEC 写作边界：
1. SPEC 面向产品、测试、业务干系人和 coding agent，回答“系统做什么”。
2. 从生成的 design.md 中提炼外部可见行为和业务规则。
3. 不要包含实现细节：文件路径、类名、函数名、表名、字段类型、索引、框架内部、缓存实现或源码包名。
4. 将技术事实抽象成用户可见能力、约束、规则或验收条件。
5. design.md 无法推导出的业务意图必须标记为“待确认”，不要编造。

Template requirements:
1. Strictly use the main section structure and headings from the SPEC template below.
2. Preserve these sections: Component Purpose, Domain Terminology, Actors and Boundaries, DFX Constraints, Core Capabilities, Data Constraints.
3. Replace placeholders with business language; do not keep placeholder text such as "[Component Name]" or "[Capability Name]".
4. Do not output guidance from SPEC-annotated; output only the final SPEC body.

SPEC template:
# [组件名称] 规格说明

## 1. 组件定位

### 1.1 核心职责

[用一句清晰的话描述该组件承担的核心业务职责。]

### 1.2 核心输入

1. [来源 A]：[业务对象或信号]
2. [来源 B]：[业务对象或信号]

### 1.3 核心输出

1. [目标 A]：[业务对象、报表、响应或事件]
2. [目标 B]：[通知或下游请求]

### 1.4 职责边界

1. [明确不负责的事项 A]
2. [明确不负责的事项 B]

## 2. 领域术语

**术语 1**
: 严格的业务定义。

**术语 2**
: 严格的业务定义。
: 可选备注、别名或与相近术语的区别。

## 3. 角色与边界

### 3.1 主要角色

1. **角色 A**：[角色和职责]
2. **角色 B**：[角色和职责]

### 3.2 外部系统

1. **系统 A**：[交互目的]
2. **系统 B**：[交互目的]

### 3.3 交互边界

[描述该组件与外部角色/系统之间的业务边界。]

## 4. DFX 约束

### 4.1 性能

[描述用户可感知或业务要求的性能约束。]

### 4.2 可靠性

[描述失败处理、可用性和恢复要求。]

### 4.3 安全

[描述认证、授权、隐私和敏感数据约束。]

### 4.4 兼容性

[描述必须保留的既有行为、接口或数据兼容性。]

## 5. 核心能力

### 5.1 [能力名称]

**业务规则**

1. [必须/应当/禁止的业务规则]
   - **验收条件**：[触发场景] -> [预期行为]

**异常场景**

1. [异常或边界场景] -> [系统行为]

### 5.2 [能力名称]

[按同样结构描述。]

## 6. 数据约束

### 6.1 领域对象

| 对象 | 业务含义 | 关键约束 |
|------|----------|----------|
| [对象] | [含义] | [约束] |

### 6.2 状态与生命周期

[描述状态、状态转换和生命周期约束。]

### 6.3 数据质量

[描述唯一性、完整性、格式、时效性和保留策略。]

SPEC methodology reference:
# SPEC 写作参考

SPEC 是业务规格，不是实现设计。它回答“系统对用户和业务做什么”，并为后续 design、tasks 和测试提供稳定基线。

## 1. 组件定位

写清楚组件的核心职责、输入、输出和边界。边界要明确说明“不负责什么”，避免后续增量需求无限扩张。

## 2. 领域术语

使用业务语言定义术语，不要用类名、表名或框架概念代替业务概念。同一术语应在 spec、design、任务和测试中保持一致。

## 3. 角色与边界

说明哪些角色会使用或影响该组件，以及它与外部系统的交互边界。这里关注业务交互，不写实现细节。

## 4. DFX 约束

记录业务上必须满足的性能、可靠性、安全、兼容性和可维护性约束。不要写具体实现方案，方案应放到 design。

## 5. 核心能力

每个能力应包含业务规则、验收条件和异常场景。规则要可判定，避免“更好”“更灵活”“优化”等不可验收表达。

推荐格式：

```markdown
1. **规则名称**：[必须/应当/禁止描述业务约束]
   - **验收条件**：[触发场景] -> [预期行为]
```

## 6. 数据约束

描述领域对象、状态转换、数据质量和保留策略等业务层面的约束。不要写表结构、字段类型、索引或 ORM 细节。

Generated design.md:
# arkui_ace_engine 实现设计

## 1. 设计概述

### 1.1 设计目标

`arkui_ace_engine` 是 OpenHarmony ArkUI 的 ACE Engine 仓库级实现，目标是提供从 ArkTS/JS/CJ 前端声明式组件到 C++ 核心组件树、布局、渲染、事件、无障碍和平台能力适配的完整运行时链路。

设计必须满足以下目标：

1. 支持多前端范式：Declarative ArkTS/TypeScript、ArkTS Static、JavaScript、Cangjie、Card/Plugin 等入口通过 Bridge 层接入统一 Core。
2. 支持 NG 组件架构：以 `FrameNode`、`Pattern`、`LayoutProperty`、`LayoutAlgorithm`、`PaintMethod`、`EventHub`、`AccessibilityProperty` 为主要分层模型。
3. 支持跨平台适配：通过 `adapter/ohos/` 和 `adapter/preview/` 对接 OHOS 真机、Preview、窗口、输入、图形、资源、无障碍、剪贴板、UI Service 等系统能力。
4. 支持外部 API 与 ABI：通过 `interfaces/native/`、`frameworks/core/interfaces/native/`、`interfaces/napi/`、`interfaces/ets/ani/`、`interfaces/inner_api/` 暴露 Native C API、NAPI、ANI、inner_api、ace_kit 等接口。
5. 支持工程级可维护性：通过 GN/Ninja 构建、单元测试、C API 测试、benchmark、知识库文档和 `.claude/skills` 故障分析工具支撑大规模演进。
6. 支持白盒可诊断：构建错误、C API 测试失败、单文件编译耗时、无障碍焦点、调试边界、手势调试边界等能力应有明确入口和排障路径。

关键源码锚点：

| 锚点 | 依据 |
|------|------|
| `frameworks/core/components_ng/base/frame_node.h`, `FrameNode` | NG 组件树基础节点，是组件创建、布局、渲染和事件挂载的核心实体 |
| `frameworks/core/components_ng/pattern/pattern.h`, `Pattern` | NG 组件行为基类，承载组件生命周期、事件和状态逻辑 |
| `frameworks/core/pipeline_ng/pipeline_context.h`, `PipelineContext` | NG Pipeline 上下文，负责调度布局、绘制和帧刷新 |
| `frameworks/bridge/declarative_frontend/ark_component/src/` | ArkTS 组件入口集中区，目录统计为 108 files / 45499 lines |
| `frameworks/bridge/declarative_frontend/engine/jsi/nativeModule/` | ArkTS Native bridge 集中区，目录统计为 156 files / 57623 lines |
| `frameworks/core/interfaces/native/implementation/` | Native C API 实现集中区，目录统计为 632 files / 89765 lines |
| `adapter/ohos/entrance/ace_container.cpp` / `.h` | OHOS 容器入口，连接前端、Pipeline 和平台窗口 |
| `docs/knowledge_base_INDEX.json` | 组件与架构知识库元数据索引 |

### 1.2 设计约束

1. 代码事实优先：仓库要求基于实际源码、目录和文档证据描述实现，未验证行为需要标记为推断或 To be confirmed。
2. 构建系统约束：主构建由 OpenHarmony 根目录 `build.sh` 驱动，底层使用 GN/Ninja；常见产品为 `rk3568` 和 `ohos-sdk`。
3. 组件扩展约束：新增 C++ 实现文件必须进入对应 `BUILD.gn` 或 source set；跨模块符号可能需要 `ACE_FORCE_EXPORT` 和 `build/libace.map` 白名单。
4. C API 测试约束：modifier 测试依赖静态 modifier；`ARKUI_CAPI_UNITTEST` 分支和 `*_static_modifier.cpp` 测试构建配置必须一致。
5. Converter API 约束：本地变量应使用 `Converter::GetOpt(var)`；指针场景才使用 `Converter::GetOptPtr(ptr)`。
6. 知识库约束：新增或更新知识库时，需要维护 `docs/knowledge_base_INDEX.json` 和 `docs/knowledge_base_README.md`，源码路径使用 `OpenHarmony/` 前缀。
7. 平台能力约束：OHOS 与 Preview 的能力实现存在差异，涉及输入、窗口、剪贴板、无障碍、UI Service 时必须按平台适配层分别验证。
8. 安全约束：动态模块和系统配置加载必须限制可信路径、校验输入格式，并通过错误码或日志暴露失败原因；例如 `extra_modules_manager_impl.cpp` 中 `IsValidLibraryPath` 限制 `/system/lib*` 前缀并拒绝 `..` 和反斜杠路径。

## 2. 系统架构

### 2.1 架构概述

运行时架构采用分层设计：

应用侧 ArkTS/JS/CJ DSL 经过 `frameworks/bridge/` 前端桥接层解析为组件创建、属性 modifier 和事件绑定调用；Bridge 层通过 JSI/NAPI/ANI/FFI 等 native bridge 调用 `frameworks/core/` 的组件模型；Core 层以 NG 组件架构维护 `FrameNode` 树，并由 Pattern、Layout、Paint、Event、Accessibility 等分层处理行为；最终通过 `adapter/ohos/` 或 `adapter/preview/` 对接窗口、输入、图形、资源、无障碍、系统服务等平台能力。

典型组件链路：

```text
ArkTS/JS 组件 DSL
  -> ark_component / ark_modifier
  -> engine/jsi/nativeModule 或 NAPI/ANI/FFI bridge
  -> components_ng/pattern/<component>/*_model_ng.cpp
  -> FrameNode / Pattern / LayoutProperty / PaintProperty
  -> LayoutAlgorithm / PaintMethod / RenderContext
  -> PipelineContext
  -> adapter/ohos 或 adapter/preview
```

典型 Native C API 链路：

```text
interfaces/native/*.h
  -> interfaces/native/node/*.cpp
  -> frameworks/core/interfaces/native/node/*.cpp
  -> frameworks/core/interfaces/native/implementation/*.cpp
  -> frameworks/core/components_ng/pattern/*/bridge/*_static_modifier.cpp
  -> test/unittest/capi/*
```

源确认事实：

| 事实 | 锚点 |
|------|------|
| Declarative 前端有独立 `ark_component`、`ark_modifier`、`jsview`、`engine/jsi/nativeModule`、`state_mgmt` 目录 | `frameworks/bridge/declarative_frontend/` |
| NG 组件按 Pattern、Model、Layout、Paint、Event、Accessibility 分层组织 | `frameworks/core/components_ng/pattern/*/` |
| 渲染适配集中在 NG render 和 Rosen adapter | `frameworks/core/components_ng/render/`, `frameworks/core/components_ng/render/adapter/` |
| OHOS 平台能力通过 OSAL 与 capability 接入 | `adapter/ohos/osal/`, `adapter/ohos/capability/` |
| Native C API 实现集中在 generated/interface、implementation、node、utility | `frameworks/core/interfaces/native/` |

推断行为：

| 推断 | 依据 |
|------|------|
| 仓库级设计应按子系统聚合，不逐个展开所有组件 | `frameworks/core/components_ng/pattern/` 下组件数量和目录规模极大 |
| Bridge 到 Core 的调用链通常由 ArkTS/JS 组件入口进入 native bridge，再落到 Model/Pattern | `Ark<Component>.ts`、`*_modifier.ts`、`arkts_native_*_bridge.cpp`、`*_model_ng.cpp` 命名配套 |
| 具体组件的最终调用顺序需要按组件源码和测试进一步确认 | 当前输入材料是仓库级模块文档，不包含全部调用栈跟踪 |

### 2.2 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| `frameworks/base/` | 基础能力，包括内存、几何、日志、线程、资源、图像、性能、工具类 | `frameworks/base/memory/ace_type.h`, `frameworks/base/geometry/`, `frameworks/base/thread/task_executor.h` |
| `frameworks/bridge/declarative_frontend/` | ArkTS/TypeScript 声明式前端桥接，包含组件入口、modifier、JSI bridge、StateMgmt | `ark_component/src/`, `ark_modifier/src/`, `engine/jsi/nativeModule/`, `state_mgmt/` |
| `frameworks/bridge/arkts_frontend/` | ArkTS Static、Koala/Arkoala、增量编译、生成器和部署流程 | `koala_projects/tools/regenerate_gni.sh`, `arkoala_generator/gn/command/deploy.py` |
| `frameworks/bridge/cj_frontend/` | Cangjie 前端 FFI 和运行时接口 | `frameworks/bridge/cj_frontend/interfaces/cj_ffi/` |
| `frameworks/core/components_ng/` | NG 组件核心框架，承载节点、组件分层、布局、渲染、事件、手势、管理器 | `base/frame_node.h`, `pattern/pattern.h`, `layout/`, `render/`, `event/`, `gestures/` |
| `frameworks/core/components/` | 旧组件架构和兼容实现 | `frameworks/core/components/` |
| `frameworks/compatible/` | 兼容组件库，支撑旧架构或兼容库拆分 | `frameworks/compatible/components/` |
| `frameworks/core/interfaces/native/` | Native UI Node API、modifier、accessor、converter、validator、generated interface | `generated/interface/ui_node_api.h`, `implementation/`, `node/`, `utility/converter.h` |
| `adapter/ohos/entrance/` | OHOS 容器、Ability、UIContent、窗口、子窗、动态组件入口 | `adapter/ohos/entrance/ace_container.cpp`, `subwindow/`, `window/` |
| `adapter/ohos/osal/` | OSAL 平台适配，接入输入、显示、资源、图像、字体、IME、无障碍、性能等 | `adapter/ohos/osal/js_accessibility_manager.h`, `input_manager.cpp` |
| `adapter/ohos/capability/` | 系统能力实现，包括剪贴板、环境、feature config、html、UDMF、window connection、extra modules | `clipboard/clipboard_impl.cpp`, `environment/environment_impl.cpp`, `feature_config/` |
| `adapter/ohos/services/uiservice/` | UI Service 服务端、IDL、Proxy/Stub、统计事件 | `adapter/ohos/services/hisysevent.yaml`, `services/uiservice/src/` |
| `adapter/preview/` | Preview 环境入口、OSAL、Inspector、SDK dump、外部 mock 能力 | `adapter/preview/entrance/ace_view_preview.cpp`, `adapter/preview/osal/` |
| `interfaces/native/` | Native API 对外头文件和 node/event/styled string 等接口 | `interfaces/native/native_interface.h`, `interfaces/native/native_node_napi.h` |
| `interfaces/napi/kits/` | NAPI 模块，如 router、promptAction、animator、observer、componentSnapshot | `interfaces/napi/kits/` |
| `interfaces/ets/ani/` | ArkTS Static / ANI native 模块实现 | `interfaces/ets/ani/` |
| `interfaces/inner_api/` | 内部 API，包括 UIContent、NavigationController、FormRender、UI Session、ace_kit | `interfaces/inner_api/ace/ui_content.h`, `interfaces/inner_api/ace_kit/include/ui/view/frame_node.h` |
| `docs/` | 组件、架构、SDK/API、语法、无障碍、布局和最佳实践知识库 | `docs/knowledge_base_INDEX.json`, `docs/knowledge_base_README.md` |
| `test/` | mock、单元测试、C API 测试、benchmark、组件测试 | `test/unittest/`, `test/unittest/capi/`, `test/mock/`, `test/benchmark/` |
| `.claude/skills/` | 工程自动化辅助，包括构建错误分析、C API 修复、命名校验、编译分析 | `.claude/skills/build-error-analyzer/`, `.claude/skills/capi-test-fixer/`, `.claude/skills/compile-analysis/` |
| `examples/` | ArkUI 示例工程和 C API 示例 | `examples/` |
| `advanced_ui_component/`, `component_ext/`, `generative_ui/` | 高阶组件、扩展组件、生成式 UI 示例和库工程 | `advanced_ui_component/`, `component_ext/`, `generative_ui/` |

### 2.3 技术栈

| 层次 | 技术 | 用途 |
|------|------|------|
| 前端 DSL | ArkTS / TypeScript / JavaScript / Cangjie | 声明式 UI、状态管理、组件 API、FFI 接入 |
| 前端桥接 | JSI / NAPI / ANI / Cangjie FFI / JSView | 将前端调用转换为 C++ 模型、节点和 modifier 操作 |
| 核心语言 | C / C++ | ACE Engine 主体实现、Native API、组件运行时、平台适配 |
| 组件架构 | Components NG | `FrameNode`、`Pattern`、`LayoutAlgorithm`、`PaintMethod`、`EventHub` 分层 |
| 渲染 | Rosen / Skia 兼容路径 / RSCanvas / RenderContext | 组件绘制、调试边界、手势调试边界和图形系统适配 |
| 构建 | GN / Ninja / OpenHarmony `build.sh` | 产品构建、组件目标构建、单元测试和 SDK 构建 |
| 测试 | gtest / benchmark / mock / C API tests | Core、Pattern、Layout、C API、性能回归验证 |
| 生成与部署 | Koala / Arkoala / Python scripts / GNI 生成 | ArkTS Static、Modifier.ets、components.gni、runtime.gni 生成 |
| 平台能力 | OHOS OSAL / SystemAbility / Pasteboard / HiSysEvent / HiDumper | 系统剪贴板、无障碍、日志事件、UI Service、窗口输入等 |
| 文档 | Markdown / JSON 知识库索引 | 组件白盒知识库、API 说明、架构文档 |
| 诊断工具 | Shell / Python | 构建日志提取、错误分类、命名校验、编译依赖分析 |

## 3. 数据模型

### 3.1 实体与结构

| 实体 | 用途 | 重要字段 |
|------|------|----------|
| `AceType` | ACE 引用类型和运行时类型系统基础 | 类型声明、引用计数基类 |
| `RefPtr` / `WeakPtr` | ACE 对象生命周期管理 | 强引用、弱引用 |
| `Dimension` / `Offset` / `Size` / `Rect` | 布局和绘制几何基础类型 | 长度、偏移、尺寸、矩形 |
| `TaskExecutor` | 任务调度抽象 | 线程类型、异步/同步任务投递 |
| `PipelineContext` | UI Pipeline 上下文 | 布局、绘制、事件、帧刷新调度状态 |
| `FrameNode` | NG 组件树核心节点 | 节点 ID、tag、children、Pattern、LayoutProperty、RenderContext |
| `Pattern` | 组件行为基类 | 生命周期、事件、状态、Layout/Paint 创建逻辑 |
| `LayoutProperty` | 组件布局属性 | 尺寸、约束、padding、margin、组件特有布局参数 |
| `PaintProperty` | 绘制属性 | 颜色、边框、背景、绘制状态 |
| `LayoutAlgorithm` | 组件测量和布局算法 | `Measure`、`Layout` 相关逻辑 |
| `NodePaintMethod` / `PaintMethod` | 组件绘制方法 | 绘制任务、foreground/background 绘制 |
| `EventHub` | 组件事件中心 | 点击、手势、状态变化、生命周期事件 |
| `AccessibilityProperty` | NG 无障碍属性基类 | text、role、state、action、focusable、clickable 等 |
| `NavigationStack` | Navigation 页面栈管理 | page stack、push/pop/replace、索引和名称映射 |
| `ArkUI_AccessibilityElementInfo` | 向无障碍服务暴露元素信息 | elementId、parentId、pageId、checked、focused、visible、clickable、scrollable |
| `ArkUI_AccessibilityEventInfo` | 无障碍事件信息 | eventType、pageId、requestFocusId、elementInfo、textAnnouncedForAccessibility |
| `GestureDebugBoundaryInfo` | 手势调试边界渲染快照 | `gestureMask`、`strokeWidthPx`、`colors` |
| `ParseErrCode` | feature config XML 解析错误码 | `PARSE_EXEC_SUCCESS`、`PARSE_SYS_FILE_LOAD_FAIL`、`PARSE_NOT_SUPPORT` |
| C API generated interface | Native UI Node API 生成接口 | modifier、accessor、controller、node 操作函数表 |
| `PasteDataMix` / `MultiTypeRecordMix` | 剪贴板多类型数据封装 | text、pixel map、URI、span string、多类型记录 |

关键源码锚点：

| 锚点 | 依据 |
|------|------|
| `frameworks/base/memory/ace_type.h`, `AceType` | ACE 类型系统基础 |
| `frameworks/base/thread/task_executor.h`, `TaskExecutor` | 平台任务调度抽象 |
| `frameworks/core/components_ng/base/frame_node.h`, `FrameNode` | NG 节点核心类型 |
| `frameworks/core/components_ng/pattern/pattern.h`, `Pattern` | NG 组件行为核心 |
| `frameworks/core/components_ng/layout/layout_algorithm.h`, `LayoutAlgorithm` | 布局算法抽象 |
| `frameworks/core/components_ng/render/node_paint_method.h`, `NodePaintMethod` | 绘制方法抽象 |
| `frameworks/core/components_ng/property/accessibility_property.h`, `AccessibilityProperty` | NG 无障碍属性基类 |
| `frameworks/core/accessibility/native_interface_accessibility_impl.h`, `ArkUI_AccessibilityElementInfo` | NDK 无障碍元素信息结构 |
| `frameworks/core/components_ng/manager/gesture_debug/gesture_debug_boundary_manager.h`, `GestureDebugBoundaryInfo` | 手势调试边界数据结构，包含 mask、线宽和颜色 |

### 3.2 持久化

ACE Engine 本身不是以业务数据库为核心的系统，项目级持久化主要体现在配置、生成物、构建产物、日志和系统服务数据：

1. 构建产物：Engine libraries 输出到 `out/rk3568/arkui/ace_engine/`，测试输出到 `out/rk3568/tests/ace_engine/` 和 `out/rk3568/tests/unittest/ace_engine/C-API-Main/components/`。
2. 构建日志：普通产品日志位于 `out/rk3568/build.log`，SDK 日志位于 `out/sdk/build.log`；错误提取脚本将 `last_error.log` 写到构建日志同目录。
3. 知识库元数据：`docs/knowledge_base_INDEX.json` 维护组件知识库索引、关键词、别名、路径和更新时间。
4. Arkoala/Koala 生成物：`regenerate_gni.sh` 生成 `components.gni` 和 `runtime.gni`；`deploy.py` 将生成的 `*Modifier.ets` 从 source 拷贝到 destination，并通过 stamp 标记成功。
5. 平台配置：`adapter/ohos/capability/feature_config/config_parser_base.cpp` 读取 `/etc/arkui/arkui_async_build_config.xml` 和 `arkui/arkui_layout_config.xml`；`extra_modules_manager_impl.cpp` 读取 `/etc/arkui/extra_modules_feature_config.json`。
6. 系统剪贴板：当 `SYSTEM_CLIPBOARD_SUPPORTED` 启用时，通过 OHOS PasteboardClient 读取和写入剪贴板；未启用时有进程内 fallback 变量 `g_clipboard` 和 `g_pixmap`。
7. HiSysEvent 配置：`adapter/ohos/build/hisysevent.yaml` 和 `adapter/ohos/services/hisysevent.yaml` 使用 `domain: ACE` 定义事件域和 UI Service 统计事件。

兼容性策略：

| 对象 | 策略 |
|------|------|
| 构建产物 | 按产品名隔离，如 `rk3568`、`ohos-sdk`；C API host 测试需要确认 x86-64 架构 |
| 生成物 | 通过 JSON ignore 配置控制部署跳过列表，减少生成文件覆盖风险 |
| 配置文件 | XML/JSON 解析失败通过错误码、日志和 fallback 路径处理 |
| 剪贴板 | 编译宏区分系统剪贴板与本地 fallback |
| 知识库 | JSON 格式校验、路径校验、README 统计同步 |
| ABI/API | Native C API、NAPI、ANI 和 inner_api 需要保持头文件、实现、BUILD.gn、测试同步 |

## 4. 接口设计

### 4.1 对外接口

| 接口 | 调用方 | 输入 | 输出 |
|------|--------|------|------|
| ArkTS 全局组件 API | ArkTS 应用 | `Text()`、`Button()`、`Navigation()`、`NavDestination()` 等 DSL 调用和 modifier 参数 | 组件节点、属性更新、事件绑定 |
| ArkTS Static 组件声明 | ArkTS Static 编译链 | `*.static.d.ets` 组件函数、Attribute、Options、CommonMethod | 静态类型检查和组件调用签名 |
| JSView 接口 | Declarative JS/ArkTS 前端 | JS 组件调用、事件回调、属性值 | C++ View/Model 调用 |
| Native C API | NDK/C 调用方 | `ArkUI_NodeHandle`、modifier/accessor 参数、事件参数 | 节点创建、属性设置、事件注册、查询结果 |
| NAPI kits | JS/ArkTS 模块调用方 | router、promptAction、observer、animator、componentSnapshot 等模块参数 | Promise、callback、对象结果 |
| ANI 接口 | ArkTS Static runtime | ANI native 调用参数 | Native 能力返回值、异常或状态 |
| Cangjie FFI | Cangjie 前端 | FFI 参数、状态管理和组件调用 | C++ bridge 调用结果 |
| `UIContent` inner_api | Ability、系统内部模块 | Context、window、page 参数、事件 | UI 内容创建、加载、更新、销毁 |
| `ace_kit` API | 内部/外部抽象使用方 | FrameNode、属性、事件、布局、资源接口 | 封装后的 UI 节点和能力 |
| Accessibility NDK 接口 | 系统无障碍服务 | elementId、requestId、action、focus 参数 | `ArkUI_AccessibilityElementInfo`、执行状态、事件通知 |
| UI Service IPC | 系统服务或应用 | bundle、ability、事件和服务请求 | Proxy/Stub 调用结果、统计事件 |

关键锚点：

| 锚点 | 依据 |
|------|------|
| `interfaces/native/native_interface.h` | Native API 入口声明 |
| `interfaces/native/native_node_napi.h` | Native Node API 声明 |
| `interfaces/native/node/node_model.cpp` / `.h` | Native Node 模型操作实现 |
| `frameworks/core/interfaces/native/generated/interface/ui_node_api.h` | 生成的 UI Node API 接口 |
| `frameworks/core/interfaces/native/implementation/all_modifiers.cpp` | modifier 汇总实现 |
| `frameworks/core/interfaces/native/node/node_api.cpp` | Node API 实现 |
| `frameworks/core/interfaces/native/utility/converter.h` | Native 参数转换工具 |
| `interfaces/inner_api/ace/ui_content.cpp` / `.h` | UIContent 内部接口 |
| `interfaces/inner_api/ace_kit/include/ui/view/frame_node.h` | ace_kit FrameNode 抽象入口 |
| `frameworks/core/accessibility/accessibility_provider.h`, `AccessibilityProvider` | 查找节点、执行动作、发送无障碍事件的核心接口 |
| `adapter/ohos/osal/js_accessibility_manager.h`, `JsAccessibilityManager` | OHOS 无障碍管理器，对接系统服务和 Core |

### 4.2 内部接口

内部接口按模块边界划分：

1. Bridge -> Core：前端组件入口和 modifier 通过 native bridge 调用 `*_model_ng.cpp`、Node API 或 generated modifier，实现节点创建和属性更新。
2. Core Model -> Node：Model 层负责创建或查找 `FrameNode`，写入 `LayoutProperty`、`PaintProperty`、事件和 Pattern 状态。
3. Pattern -> Layout/Paint/Event：Pattern 创建或协调 `LayoutAlgorithm`、`PaintMethod`、`EventHub`、`AccessibilityProperty`，并处理生命周期。
4. Core -> Pipeline：FrameNode 标记 dirty 后，由 `PipelineContext` 调度 measure、layout、paint、event flush。
5. Core -> Adapter：Core 抽象能力通过 clipboard、environment、window、accessibility、input、resource 等 interface 调用平台实现。
6. Adapter -> System：OHOS adapter 调用 Pasteboard、Display、MMI、Rosen、Accessibility SA、HiSysEvent、BundleMgr 等系统能力。
7. Native API -> Core：Native Node API、modifier、accessor 经 converter/validator 转换后写入 Core 节点或组件属性。
8. Accessibility -> Component：`JsAccessibilityManager` 通过 `AccessibilityProvider`、`AccessibilityProperty`、组件特定 accessibility property 提取信息和执行动作。
9. Tooling -> Build/Test：`.claude/skills` 脚本读取 build log、ninja 文件、`.ii` 文件、C API 测试文件，生成诊断或修复建议。

内部边界原则：

| 边界 | 规则 |
|------|------|
| Bridge/Core | Bridge 只做参数解析和绑定，不承载组件复杂业务逻辑；业务行为落在 Pattern/Model |
| Model/Pattern | Model 负责创建和设置状态；Pattern 负责运行时行为、生命周期和事件 |
| Layout/Paint | 布局计算不直接绘制；绘制逻辑通过 PaintMethod/RenderContext/RS modifier 执行 |
| Core/Adapter | Core 使用抽象接口，不直接依赖具体系统服务实现 |
| Native API/Core | 参数转换和校验集中在 `utility/converter.h`、`validators.h` 等工具层 |
| Test/Product | 测试路径可通过 `ARKUI_CAPI_UNITTEST` 等宏使用静态 modifier，产品路径使用动态模块加载 |

## 5. 核心流程设计

### 5.1 组件创建与更新流程

主要流程：

1. ArkTS/JS 层调用组件函数或 modifier，例如 `Navigation()`、`Text()`、`.title()`、`.mode()`。
2. `ark_component/src/` 和 `ark_modifier/src/` 承接前端声明和属性绑定。
3. `engine/jsi/nativeModule/arkts_native_*_bridge.cpp` 解析参数，进入 native bridge。
4. `frameworks/core/components_ng/pattern/<component>/*_model_ng.cpp` 创建或更新 `FrameNode`。
5. `Pattern` 处理组件生命周期、事件注册、状态变更和子组件关系。
6. `LayoutProperty` 和 `PaintProperty` 存储布局与绘制参数。
7. `LayoutAlgorithm` 执行 measure/layout，计算节点尺寸和位置。
8. `PaintMethod` / `RenderContext` 生成绘制任务或 RS modifier。
9. `PipelineContext` 调度 dirty node 刷新、帧更新和渲染提交。
10. 平台 adapter 将窗口、输入、图形、资源和系统事件接入运行时。

关键分支：

| 分支 | 行为 |
|------|------|
| 属性更新 | modifier 只更新对应属性，并触发对应 dirty 标记 |
| 子节点变化 | FrameNode 树结构变更后触发布局和事件关系更新 |
| 事件绑定 | EventHub 或 GestureEventHub 注册点击、手势、生命周期回调 |
| 无障碍属性 | AccessibilityProperty 提供 text、role、state、action 等信息 |
| 平台能力 | 需要通过 OSAL 或 capability 调用系统服务 |

异常路径：

| 异常 | 处理 |
|------|------|
| 参数非法 | bridge/converter/validator 返回默认值、空值或错误状态 |
| FrameNode 不存在 | `CHECK_NULL_RETURN` / `CHECK_NULL_VOID` 风格提前返回 |
| 动态模块不可用 | C API 测试路径应使用静态 modifier；产品路径需检查动态模块加载失败 |
| 布局约束异常 | LayoutAlgorithm 按最小/最大约束裁剪或回退 |
| 绘制 canvas 为空 | RS modifier 和 painter 使用空指针检查后返回 |

### 5.2 Native C API modifier 调用流程

1. 调用方通过 `interfaces/native/*.h` 获取 Native C API。
2. Node API 在 `interfaces/native/node/` 和 `frameworks/core/interfaces/native/node/` 中转换节点句柄。
3. modifier/accessor 实现在 `frameworks/core/interfaces/native/implementation/` 中查找生成接口或静态 modifier。
4. 参数经 `Converter`、`ReverseConverter`、`validators` 转换和校验。
5. 组件静态 modifier 位于 `frameworks/core/components_ng/pattern/*/bridge/*_static_modifier.cpp`。
6. 测试覆盖集中在 `test/unittest/capi/modifiers`、`accessors`、`utils`。

关键分支：

| 分支 | 行为 |
|------|------|
| 产品运行 | 通过 `DynamicModuleHelper` 获取动态模块和 static modifier |
| C API 单测 | 通过 `ARKUI_CAPI_UNITTEST` 条件编译直接调用 `GeneratedModifier::Get*StaticModifier()` |
| Converter 值类型 | 使用 `Converter::GetOpt(var)` |
| Converter 指针类型 | 使用指针语义接口 |
| BUILD.gn 缺失 | 链接期出现 undefined symbol 或 static modifier 未定义 |

### 5.3 Navigation / NavRouter 导航流程

Navigation 是仓库文档中展开较完整的组件级流程，可作为复杂组件设计样本。

页面跳转流程：

1. 用户触发导航操作，可能来自 `NavRouter` 包装组件点击、Navigation controller 或应用逻辑。
2. `NavigationPattern` 接收请求。
3. 根据操作类型执行 `PUSH`、`POP`、`REPLACE`。
4. 更新 `NavigationStack`。
5. 触发 NavDestination 生命周期事件。
6. 执行页面过渡动画。
7. 更新 UI 显示、标题栏、工具栏、NavBar 和内容区域布局。
8. 对 NavRouter 场景，更新激活状态并触发 `onStateChange`。

源码锚点：

| 锚点 | 依据 |
|------|------|
| `frameworks/core/components_ng/pattern/navigation/navigation_pattern.h` | Navigation 运行时行为核心 |
| `frameworks/core/components_ng/pattern/navigation/navigation_stack.h` | 页面栈管理 |
| `frameworks/core/components_ng/pattern/navigation/navigation_model_ng.cpp` | NG 模型落点 |
| `frameworks/core/components_ng/pattern/navrouter/navrouter_pattern.h` | NavRouter 点击触发和路由行为 |
| `docs/Navigation组件知识库.md` | Navigation API、源码结构、流程和生命周期知识库 |
| `docs/NavRouter组件知识库.md` | NavRouter API、模式和与 Navigation 的关系 |

### 5.4 无障碍请求与事件流程

1. 系统无障碍服务通过 NDK/OSAL 接口请求节点信息、焦点移动或动作执行。
2. `JsAccessibilityManager` 接收请求并处理节点搜索、动作执行、焦点移动、事件发送。
3. Core 层通过 `AccessibilityProvider`、`AccessibilityNode` 或 NG `AccessibilityProperty` 获取组件树信息。
4. 组件特定 `*_accessibility_property.h/cpp` 提供定制化属性。
5. 动作请求通过组件事件或 Pattern 执行。
6. 组件树变化、焦点变化、文本变化等通过 `ArkUI_AccessibilityEventInfo` 回传系统服务。
7. 悬停探测通过 `AccessibilityManagerNG` 和第三方 hover manager 处理。

关键异常路径：

| 异常 | 处理 |
|------|------|
| 节点不存在 | 返回查找失败或空结果 |
| 焦点移动失败 | `AceFocusMoveResult` 表示失败原因，如 `FIND_FAIL_LOST_NODE`、`FIND_FAIL_IN_SCROLL` |
| 非法 hover 参数 | `HandleHoverRet::ILLEGAL_PARAM` |
| 第三方 provider 未注册 | 第三方操作返回失败或跳过 |
| Web 支持宏未启用 | Web accessibility 分支不参与编译或运行 |

### 5.5 构建、验证与故障处理流程

构建流程：

1. 从 OpenHarmony 根目录执行 `./build.sh --product-name rk3568 --build-target ace_engine`。
2. 组件级目标可使用 GN target，例如 `//arkui/ace_engine/frameworks/core/components_ng/pattern/text:text_pattern`。
3. 单元测试目标使用 `unittest`，C API 测试使用 `linux_unittest_capi --ccache`，benchmark 使用 `benchmark_linux`。
4. 构建产物和日志进入 `out/<product>/`。

构建错误定位流程：

1. 使用 `.claude/skills/build-error-analyzer/script/extract_last_error.sh out/rk3568/build.log` 提取最后完整错误块。
2. 普通产品输出 `out/rk3568/last_error.log`；SDK 输出 `out/sdk/last_error.log`。
3. `openharmony-build/scripts/analyze_build_error.sh <product>` 统计 error、warning、fatal，并定位 FAILED 段。
4. `find_recent_errors.sh` 查看最近 error/fatal/FAILED。
5. `check_fast_rebuild.sh` 检查最近是否修改 GN 文件，决定是否可使用 fast rebuild。
6. C API 测试失败时，用 `capi-test-fixer/scripts/diagnose.py` 匹配 static modifier、Converter API、BUILD.gn 缺失等模式。

部署与生成流程：

1. `frameworks/bridge/arkts_frontend/koala_projects/tools/regenerate_gni.sh` 执行 annotate、process_arkoala、gen_gni，生成 `components.gni` 和 `runtime.gni`。
2. `frameworks/bridge/arkts_frontend/arkoala_generator/gn/command/deploy.py` 将生成的 `*Modifier.ets` 从 source 部署到 destination，支持 JSON ignore 列表和 stamp 文件。
3. Koala CI 阶段包括 install-deps、prebuild、build-compiler、build、test、idlize、build-with-idlize、pre-deploy、deploy。

回滚与恢复：

| 场景 | 策略 |
|------|------|
| 构建配置变更失败 | 回退最近修改的 `BUILD.gn` / `*.gni`，重新执行标准构建 |
| 新增 `.cpp` 后链接失败 | 检查组件 `BUILD.gn`、`frameworks/core/BUILD.gn` source set、导出宏和 map |
| 生成文件异常 | 重新运行对应生成脚本，检查 source/destination/ignore/stamp |
| C API 修复脚本误改 | 检查 `.bak` 或版本控制 diff，仅保留必要修改 |
| 知识库更新错误 | 校验 JSON，恢复错误条目，重新核对源码路径和 README 统计 |
| fast rebuild 不可靠 | 如果最近修改过 GN 文件，使用标准构建命令 |

## 6. 算法设计

项目级算法主要分布在布局、导航、无障碍焦点、手势、调试绘制、配置解析和构建诊断中。

1. 组件布局算法：每个 NG 组件可提供独立 `LayoutAlgorithm`，按照父约束、组件属性、子节点测量结果计算尺寸和位置。典型路径为 `frameworks/core/components_ng/pattern/<component>/*_layout_algorithm.cpp/h`。
2. Navigation 模式决策：Navigation 支持 `STACK`、`SPLIT`、`AUTO`，根据设备状态、折叠状态、宽度、属性和动画配置切换导航模式。具体函数级行为需针对 `navigation_pattern.cpp` 进一步确认。
3. SideBarContainer 宽度计算：根据容器总宽度、`sideBarPosition`、`sideBarWidth`、`minSideBarWidth`、`maxSideBarWidth`、`minContentWidth` 计算侧边栏和内容区宽度。
4. Stepper 状态转移：根据当前步骤索引、`ItemState`、上一步/下一步/跳过/完成按钮触发 `onNext`、`onPrevious`、`onChange`、`onSkip`、`onFinish`。
5. 无障碍焦点搜索：`AccessibilityFocusStrategy` 提供查找下一个/上一个可读节点、滚动祖先、根类型边界检查等算法，结果通过 `AceFocusMoveResult` 分类。
6. 无障碍 hover 命中：`AccessibilityManagerNG` 按坐标、SurfaceId、事件类型处理悬停探测，返回 `HandleHoverRet`。
7. 手势调试边界：`GestureDebugBoundaryManager` 根据手势类型生成 `gestureMask` 和颜色列表；`GestureDebugBoundaryPainter` 在 `gestureMask != 0` 且颜色非空时绘制边界。
8. 编译依赖解析：`parse_ii.py` 用正则解析 `.ii` 文件中的 `# line "file"`，筛选 `foundation/arkui/` 依赖并构建树形结构。
9. 构建错误提取：`extract_last_error.sh` 使用 Python 查找最后一个包含错误的完整编译错误块并输出到 `last_error.log`。
10. C API 错误模式匹配：`diagnose.py` 和 `error_patterns.py` 使用正则识别 `undefined symbol.*Get(\w+)StaticModifier`、`GetOptPtr\(&`、`modifier_ != nullptr`、`undefined reference.*static_modifier` 等模式。
11. 动态模块路径校验：`extra_modules_manager_impl.cpp` 的 `IsValidLibraryPath` 要求库路径以 `/system/lib64/` 或 `/system/lib/` 开头，并拒绝空路径、重复分隔、反斜杠和 `..`。

不适用说明：

| 项 | 说明 |
|------|------|
| 统一业务规则算法 | No explicit design。仓库是 UI 引擎，不是单一业务规则系统 |
| 统一数据库索引算法 | No explicit design。未见项目级数据库持久化设计 |
| 全局调度算法细节 | To be confirmed。Pipeline、TaskExecutor、线程模型需要进一步读取源码确认函数级顺序 |

## 7. 缓存设计

项目级缓存分散在运行时对象、动态模块、平台能力和构建诊断中，未见单一全局缓存设计。

已确认或可定位的缓存/复用对象：

| 缓存对象 | 位置 | 策略 |
|----------|------|------|
| C API modifier 指针 | `frameworks/core/interfaces/native/implementation/*_modifier.cpp` 模式 | 常见实现使用 `static const GENERATED_ArkUI*Modifier* cachedModifier` 缓存动态模块或静态 modifier 指针 |
| 剪贴板 fallback 数据 | `adapter/ohos/capability/clipboard/clipboard_impl.cpp` | 未启用 `SYSTEM_CLIPBOARD_SUPPORTED` 时使用进程内 `g_clipboard`、`g_pixmap` |
| 无障碍 hover 状态 | `AccessibilityHoverState`, `AccessibilityHoverForThirdState` | 保存 hover source、hovering nodes、time、idle 状态 |
| Gesture Debug Boundary 快照 | `GestureDebugBoundaryInfo` | 保存手势 mask、线宽、颜色，传递给 painter |
| 构建错误输出 | `last_error.log` | 与 build log 同目录保存最近完整错误块 |
| 编译依赖分析输出 | `.ii` 解析结果和可选依赖树输出 | 通过 `parse_ii.py` 生成依赖树 |
| Arkoala deploy stamp | `deploy.py --stamp` | 成功复制后写 stamp，用于构建系统判断 |

失效策略：

| 缓存 | 失效依据 |
|------|----------|
| modifier 指针缓存 | 进程生命周期内复用；动态模块变更需要进程重启或模块重载机制，具体策略 To be confirmed |
| 剪贴板 fallback | Set/Clear 覆盖；系统剪贴板路径由 PasteboardClient 管理 |
| hover 状态 | hover EXIT/CANCEL、节点变化、第三方操作完成后更新 |
| 构建错误日志 | 每次重新提取覆盖 `last_error.log` |
| 生成 stamp | source/config 变更后由构建系统重新触发 |
| 知识库索引 | 手动维护，需 JSON 校验和 README 统计同步 |

一致性和降级：

1. C API 单测中动态模块不可用时，通过 `ARKUI_CAPI_UNITTEST` 降级到静态 modifier。
2. 系统剪贴板不可用时，编译宏 fallback 到本地字符串和 PixelMap 缓存。
3. 无障碍第三方 provider 不可用时，第三方 hover/action 返回失败，不影响普通组件树。
4. 构建分析工具找不到日志时返回明确错误并提示候选路径。
5. feature config XML 读取失败返回 `PARSE_SYS_FILE_LOAD_FAIL` 等错误码。

## 8. 异常处理设计

错误分类：

| 类型 | 典型症状 | 处理策略 |
|------|----------|----------|
| 参数错误 | Converter 失败、空指针、非法枚举、非法路径 | validator、`CHECK_NULL_RETURN`、默认值、错误码 |
| 构建错误 | `error:`、`fatal error:`、GN/Ninja 配置失败 | 提取 `last_error.log`、分类、定位 BUILD.gn/source set |
| 链接错误 | `ld.lld: error: undefined symbol` | 检查 `.cpp` 是否加入 BUILD.gn、符号导出、map 白名单 |
| C API static modifier 缺失 | `undefined symbol.*Get*StaticModifier` 或 `modifier_ != nullptr` 失败 | 添加 `ARKUI_CAPI_UNITTEST` 分支和 static modifier source |
| Converter API 误用 | `GetOptPtr(&var)` 相关失败 | 改为 `Converter::GetOpt(var)` |
| 平台能力失败 | Pasteboard、BundleMgr、Accessibility、Display、Window 服务不可用 | 返回错误码、日志记录、fallback 或提前返回 |
| 配置解析失败 | XML/JSON 文件不存在或格式错误 | `ParseErrCode`、日志、默认配置 |
| 动态模块加载失败 | 模块文件路径非法、dlopen 失败、符号不存在 | 路径校验、错误码、日志 |
| 无障碍查找失败 | 节点丢失、无匹配节点、焦点移动失败 | `AceFocusMoveResult`、`HandleHoverRet` 分类返回 |
| 绘制上下文异常 | canvas/property/paintTask 为空 | 空指针检查后跳过绘制 |
| 测试命名违规 | `HWTEST_F` 名称不符合 `methodNameTestScenario` | `verify_naming.py` 报告违规行 |

用户可见错误：

1. 应用层主要通过组件事件、Promise reject、callback fail、日志或系统 UI 表现感知错误。
2. Native API 调用方通过返回值、空句柄或错误码感知错误。
3. 无障碍服务通过查找结果、动作执行状态和事件信息感知错误。
4. 构建和测试用户通过 `build.log`、`last_error.log`、gtest 输出和诊断脚本报告感知错误。

重试和补偿：

| 场景 | 策略 |
|------|------|
| 构建失败 | 修复后重新执行目标构建；GN 文件变更后避免 fast rebuild |
| 生成失败 | 修正 source/config 后重新运行生成和 deploy |
| 剪贴板异步读取失败 | 可选择 syncMode 或 fallback 路径，具体由 ClipboardImpl 分支控制 |
| 无障碍焦点失败 | 尝试其他方向搜索、滚动祖先或返回失败原因 |
| 动态模块失败 | 检查可信路径、配置文件、符号名和模块状态 |
| 测试失败 | 按 C API fixer 模式定位后重新构建和运行测试 |

告警策略：

1. OHOS 侧 HiSysEvent 使用 `domain: ACE`。
2. UI Service 定义 `UI_SERVICE_STATISTIC_EVENT`，包含 `EVENT_NAME`、`EVENT_COUNT`、`BUNDLE_NAME`、`ABILITY_NAME`、`VERSION_NAME`、`VERSION_CODE`。
3. Core 和 Adapter 使用日志宏记录配置、系统能力和运行时错误。
4. 调试边界、手势调试边界、HiDumper、build-error-analyzer、compile-analysis 提供排障入口。

## 9. 监控与日志

关键指标和日志入口：

| 领域 | 指标/日志 | 入口 |
|------|-----------|------|
| 构建 | error 数、warning 数、fatal 数、FAILED 段、last error block | `out/<product>/build.log`, `.claude/skills/openharmony-build/scripts/analyze_build_error.sh` |
| SDK 构建 | SDK build error | `out/sdk/build.log`, `out/sdk/last_error.log` |
| C API 测试 | modifier/accessor/utils 测试结果、undefined symbol、nullptr modifier | `out/rk3568/tests/unittest/ace_engine/C-API-Main/components/` |
| 单文件编译 | 编译耗时、资源开销、头文件依赖树 | `.claude/skills/compile-analysis/scripts/analyze_compile.sh`, `parse_ii.py` |
| UI Service | 统计事件 | `adapter/ohos/services/hisysevent.yaml`, `UI_SERVICE_STATISTIC_EVENT` |
| ACE HiSysEvent | 事件域 | `adapter/ohos/build/hisysevent.yaml`, `domain: ACE` |
| 无障碍 | 节点查找、焦点移动、hover、事件发送、HiDumper | `adapter/ohos/osal/js_accessibility_manager.h`, `frameworks/core/accessibility/hidumper/` |
| 调试边界 | 组件边界、margin、corner 绘制 | `frameworks/core/components_ng/render/debug_boundary_painter.*` |
| 手势调试边界 | 手势类型 mask、颜色、边界绘制 | `gesture_debug_boundary_manager.*`, `gesture_debug_boundary_painter.*` |
| 状态管理测试 | HAP 安装、hilog 抓取、Ability 启动 | `frameworks/bridge/declarative_frontend/state_mgmt/test/unittest/scripts/run_ut.ps1` |

日志字段建议：

| 场景 | 字段 |
|------|------|
| 构建失败 | product、build target、failed action、source file、symbol、BUILD.gn path、timestamp |
| C API 失败 | test executable、test name、modifier/accessor 名称、symbol、component、source path |
| Native 参数错误 | API name、node id、parameter name、input type、converted result |
| 无障碍事件 | elementId、parentId、pageId、eventType、componentType、action、requestId |
| UI Service 统计 | event name、event count、bundle name、ability name、version name、version code |
| 动态模块加载 | feature、capability、library path、symbol、ErrCode |
| 配置解析 | config path、bundleName、node name、ParseErrCode |
| 性能分析 | source file、product、compile command、include dependency root、elapsed time |

排障入口：

| 症状 | 可能区域 | 命令或文件 |
|------|----------|------------|
| 组件属性不生效 | Bridge、Model、Modifier | 搜索 `Ark<Component>.ts`、`<component>_modifier.ts`、`arkts_native_<component>_bridge.cpp`、`*_model_ng.cpp` |
| 布局异常 | LayoutProperty、LayoutAlgorithm | `frameworks/core/components_ng/pattern/<component>/*layout*` |
| 绘制异常 | PaintMethod、RenderContext、RS modifier | `*paint_method*`, `frameworks/core/components_ng/render/` |
| 点击/手势异常 | EventHub、GestureEventHub、recognizer | `frameworks/core/components_ng/event/`, `frameworks/core/components_ng/gestures/` |
| 无障碍信息错误 | AccessibilityProperty、OSAL manager | `*_accessibility_property.*`, `adapter/ohos/osal/js_accessibility_manager.*` |
| OHOS 和 Preview 行为不一致 | 平台适配层差异 | 对比 `adapter/ohos/` 和 `adapter/preview/` 同名 OSAL/entrance |
| C API 符号未定义 | implementation、node、BUILD.gn | 搜索符号定义，检查 `frameworks/core/interfaces/native/implementation/` 和 `BUILD.gn` |
| modifier 返回空 | static modifier 或动态模块加载 | 检查 `Get*Modifier` 是否有 `ARKUI_CAPI_UNITTEST` 分支 |
| Converter 失败 | Converter / ReverseConverter | `frameworks/core/interfaces/native/utility/converter.h` |
| 知识库路径失效 | docs index 或 KB | `docs/knowledge_base_INDEX.json`, `docs/knowledge_base_README.md` |

运行手册：

| 场景 | 命令/动作 |
|------|-----------|
| 构建 ACE Engine | `./build.sh --product-name rk3568 --build-target ace_engine` |
| 构建 SDK | `./build.sh --product-name ohos-sdk --build-target ace_engine` |
| 构建单组件目标 | `./build.sh --product-name rk3568 --build-target //arkui/ace_engine/frameworks/core/components_ng/pattern/text:text_pattern` |
| 构建单元测试 | `./build.sh --product-name rk3568 --build-target unittest` |
| 构建 C API 测试 | `./build.sh --product-name rk3568 --build-target linux_unittest_capi --ccache` |
| 构建 benchmark | `./build.sh --product-name rk3568 --build-target benchmark_linux` |
| 运行组件单测 | `./out/rk3568/tests/ace_engine/unittest/components_ng/text/text_pattern_test` |
| 运行指定 gtest | `./out/rk3568/tests/ace_engine/unittest/components_ng/text/text_pattern_test --gtest_filter=TextPatternTest.OnModifyDone` |
| 列出 C API 测试 | `./capi_all_modifiers_test --gtest_list_tests` |
| 运行 C API modifier 测试 | `./capi_all_modifiers_test` |
| 校验 C API 可执行架构 | `file ./capi_all_modifiers_test` |
| 提取普通产品错误 | `foundation/arkui/ace_engine/.claude/skills/build-error-analyzer/script/extract_last_error.sh out/rk3568/build.log` |
| 提取 SDK 错误 | `foundation/arkui/ace_engine/.claude/skills/build-error-analyzer/script/extract_last_error.sh out/sdk/build.log` |
| 查看最近错误 | `.claude/skills/openharmony-build/scripts/find_recent_errors.sh rk3568` |
| 分析构建错误 | `.claude/skills/openharmony-build/scripts/analyze_build_error.sh rk3568` |
| 判断 fast rebuild | `.claude/skills/openharmony-build/scripts/check_fast_rebuild.sh 30` |
| Arkoala GNI 重新生成 | `frameworks/bridge/arkts_frontend/koala_projects/tools/regenerate_gni.sh` |
| Modifier.ets 部署 | `frameworks/bridge/arkts_frontend/arkoala_generator/gn/command/deploy.py` |
| 校验知识库 JSON | `python3 -m json.tool docs/knowledge_base_INDEX.json > /dev/null` |

## 10. 安全设计

认证与授权：

1. 项目级认证授权主要由 OpenHarmony 系统能力、Ability、服务接口和 Native API 调用边界承担，仓库材料中没有单独的应用级账号认证设计。
2. UI Service、无障碍、剪贴板、窗口、BundleMgr 等能力依赖系统服务权限和平台 API 控制。
3. Native/inner_api/ANI/NAPI 调用需要遵守对应系统能力和模块导出边界。

数据保护：

| 数据 | 保护策略 |
|------|----------|
| 剪贴板数据 | `CopyOptions` 区分 InApp、LocalDevice、CrossDevice；系统剪贴板通过 PasteboardClient 管理 |
| AutoFill 安全粘贴 | `AUTO_FILL_SECURE_PASTE = "autofill/secure"` 用于识别自动填充安全数据类型 |
| 无障碍数据 | 仅通过 AccessibilityProvider 和 AccessibilityProperty 暴露组件必要信息 |
| SpanString / PixelMap | 通过 paste data record、多类型 record 封装，按系统剪贴板能力处理 |
| 配置文件 | XML/JSON 解析时按固定路径和结构读取，失败返回错误码 |
| 动态模块 | 限制库路径在系统可信目录，拒绝路径穿越和非法路径字符 |

输入校验：

1. Native C API 使用 converter、validator、peer utils 等工具集中处理参数转换和校验。
2. `extra_modules_manager_impl.cpp` 的 `IsValidLibraryPath` 校验动态库路径：非空、必须以 `/system/lib64/` 或 `/system/lib/` 开头、模块相对路径不能为空、不能以 `/` 开头、不能包含反斜杠或 `..`。
3. `ConfigParserBase` 通过 `ParseErrCode` 区分 XML 节点名错误、类型错误、大小错误、缺少参数、文件加载失败等。
4. Bridge 层需要对 ArkTS/JS 参数进行类型和空值处理，具体校验分散在各 `arkts_native_*_bridge.cpp` 与 converter 中。
5. 无障碍 action、focus、hover 输入通过 elementId、requestId、坐标、source type 和 event type 校验并分类返回。

依赖安全：

| 依赖 | 设计要求 |
|------|----------|
| 动态模块 | 仅加载可信系统路径，校验 symbol，失败时返回 `MODULE_LOAD_FAILED` 或 `SYMBOL_NOT_FOUND` |
| 系统剪贴板 | 通过系统 PasteboardClient，不直接绕过平台权限 |
| XML/JSON 配置 | 固定路径、解析错误码、日志输出，避免静默失败 |
| 生成脚本 | `deploy.py` 支持 ignore 配置，避免无差别覆盖 |
| 构建脚本 | GN 文件变更后使用标准构建，避免 fast rebuild 造成配置不一致 |
| C API 测试脚本 | 自动修复脚本可能生成 `.bak`，需要通过 diff 审核保留必要修改 |

确定性边界：

| 类型 | 内容 |
|------|------|
| 源确认事实 | `adapter/ohos/build/hisysevent.yaml` 和 `adapter/ohos/services/hisysevent.yaml` 使用 `domain: ACE` |
| 源确认事实 | `extract_last_error.sh` 将输出写到 build log 同目录的 `last_error.log` |
| 源确认事实 | `error_patterns.py` 和 `diagnose.py` 覆盖 static modifier、Converter API、nullptr modifier、build config 缺失四类 C API 测试模式 |
| 源确认事实 | `verify_naming.py` 默认扫描 `test/unittest/capi/modifiers`、`accessors`、`utils`，排除 `generated` |
| 源确认事实 | `analyze_compile.sh` 要求编译命令在 `out/{product}` 下执行，头文件依赖通过 `.ii` 解析 |
| 源确认事实 | `deploy.py` 用于复制生成的 `*Modifier.ets`，支持 source、destination、config、stamp |
| 源确认事实 | `gesture_debug_boundary_manager.h` 中 `GestureDebugBoundaryInfo` 包含 `gestureMask`、`strokeWidthPx`、`colors` |
| 推断行为 | 组件普遍遵循 Model/Pattern/Layout/Paint/Event/Accessibility 分层，因为 `components_ng/pattern/*` 大量存在同名文件结构 |
| 推断行为 | Bridge 到 Core 的常规链路为 ArkTS/JS 入口 -> native bridge -> Model/Pattern，因为目录命名和组件配套文件一致 |
| 缺失证据 | 顶层 `BUILD.gn`、`.gn`、`bundle.json` 具体内容未展开，构建规则细节需后续读取确认 |
| 缺失证据 | Pipeline 线程模型、TaskExecutor 调度细节、符号导出 map 全量规则未在当前材料中展开 |
| 缺失证据 | 所有组件 API 声明未逐一读取，本设计不替代具体组件知识库 |
