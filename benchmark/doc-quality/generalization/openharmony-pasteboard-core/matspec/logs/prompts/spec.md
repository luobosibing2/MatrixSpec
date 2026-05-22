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
# distributeddatamgr_pasteboard 实现设计

## 1. 设计概述

### 1.1 设计目标

1. 提供系统级剪贴板能力与分布式协同能力的统一服务，实现设置/获取/查询/清理/监听等核心操作，支撑 OpenHarmony 文档中定义的 `SystemPasteboard`、`PasteData`、`PasteDataRecord` 外部能力入口。  
2. 将业务路径与观测路径解耦：业务主链路在 `core` 与 `zidl` 中实现，`dfx` 负责故障、行为、时耗与事件上报，`ohos-pasteboard` 负责运维可见的 CLI 入口。  
3. 按模块边界隔离可替换能力：`load` 动态组件加载、`switch` 状态开关、`dialog` 弹框能力、`account` 账号占位接口通过轻量封装对上层透明。  
4. 保障并发安全与跨进程一致性：`core`/`dfx` 关键共享结构受互斥保护，`zidl` 提供 Proxy/Stub 对齐 IPC 通信，`DataShare` 与设备状态同步通过统一封装访问外部配置。  
5. 提供可观测性与故障闭环：`HiSysEvent`/`HiAppEvent`/`bytrace`/结构化日志覆盖主流程、聚合统计与异常路径，支持回溯。  

### 1.2 设计约束

1. 采用 OpenHarmony 的服务化能力模型与系统能力机制，核心服务必须与现有 SA 生命周期兼容；`PasteboardService` 继承 `PasteboardServiceStub` 并通过 `OnStart/Init` 发布能力（`services/core/include/pasteboard_service.h` 的 `PasteboardService`）。  
2. `PasteboardClient` 外部调用与 `zidl` 契约必须严格对齐（Proxy/Stub 名称与参数签名成对一致），否则会导致跨进程编解码失败（`services/zidl/include/*.h` 与 `services/zidl/src/*.cpp`）。  
3. 分布式与本地配置依赖系统配置源稳定可读写，若配置缺失需有降级语义（例如 switch 模块对空值默认“开启”）。  
4. 观测事件分桶（时耗/数据量）按预设级别聚合，存在可接受的精度损失（时间与大小分桶），不追求每一次精确值留存（`services/dfx/src/calculate_time_consuming.cpp`）。  
5. 多模块并发与回调分支（`PastedSwitchObserver`, `EventCenter`, `DevProfile`）需显式处理并发竞态与延迟触发，避免重复实例化与竞争。

## 2. 系统架构

### 2.1 架构概述

运行时为“三层分工、四类依赖”的结构：  
- 外层：CLI/应用框架层 (`tools/ohos-pasteboard`、`framework/interfaces`) 负责 API 暴露与命令入口。  
- 中间：IPC 层 (`services/zidl`) 负责 proxy/stub 桥接与跨进程参数传递。  
- 内核：服务层 (`services/core`) 持有状态机、权限校验、分布式策略、观察者与异步回调。  
- 辅助：观测 (`services/dfx`)、配置加载 (`services/load`)、功能开关 (`services/switch`)、弹框/扩展 (`services/dialog`)、账号接口 (`services/account`)、`adapter/*` 外部能力接入（DataShare/设备画像/安全级别/进度存储）支撑内核能力。  
该架构的事件和状态从 `core` 向外输出后，由 `dfx` 的 `HiViewAdapter` 统一上报；`ohos-pasteboard` 的命令结果与服务状态均通过统一 JSON 与错误码返回。

### 2.2 模块职责

| 模块 | 职责 | 关键文件 |
|---|---|---|
| services/core | 核心服务执行、权限与状态管理、读写主链路、观察者分发、延迟取值与一次性读取 | `services/core/include/pasteboard_service.h`, `services/core/src/pasteboard_service.cpp` |
| services/zidl | IPC 抽象层，Proxy/Stub/Client 声明与实现 | `services/zidl/include/pasteboard_entry_getter_proxy.h`, `services/zidl/src/pasteboard_entry_getter_stub.cpp` 等 |
| services/dfx | 故障/行为/时耗观测网关与上报、CLI dump 命令、trace/app event | `services/dfx/src/reporter.h`, `services/dfx/src/hiview_adapter.cpp`, `services/dfx/src/pasteboard_dump_helper.cpp` |
| tools/ohos-pasteboard | 运维/脚本 CLI，支持 set/get/clear/has* 命令与 JSON 输出 | `tools/ohos-pasteboard/src/executor.cpp`, `tools/ohos-pasteboard/src/parser.cpp` |
| services/load | 配置化组件加载器，dlopen/dlsym 初始化可插拔组件 | `services/load/src/config.cpp`, `services/load/src/loader.cpp` |
| services/switch | 分布式粘贴板开关初始化、监听与状态上报 | `services/switch/pasteboard_switch.h`, `services/switch/pasteboard_switch.cpp` |
| services/dialog | 剪贴板进度/提示扩展能力，ETS 页面与 ability 配置 | `services/dialog/PasteboardDialog/entry/src/main/ets/Application/MyAbilityStage.ts`, `service/dialog/PasteboardDialog/entry/src/main/module.json` |
| services/account | 账号上下文薄封装（当前返回空账户实现） | `services/account/include/account_manager.h`, `services/account/src/account_manager.cpp` |
| adapter/* | 安全级别、设备画像、DataShare、进度存储等外部系统接入 | `adapter/data_share/datashare_delegate.cpp`, `adapter/device_profile/device_profile_client.h` |
| framework | 剪贴板数据与插件运行时对象、事件中心、线程/工具设施 | `framework/framework/clip/clip_plugin.h`, `framework/framework/eventcenter/event_center.cpp` |

### 2.3 技术栈

| 层次 | 技术 | 用途 |
|---|---|---|
| 服务与IPC | C++（原生服务、binder/stub）、OpenHarmony SA | `PasteboardService` 主体处理与进程内控制 |
| 可观测 | HiSysEvent、HiAppEvent、bytrace、PASTEBOARD_HILOG 日志 | 事件与时耗观测、问题追踪 |
| 配置与动态扩展 | JSON、`dlopen/dlsym`、静态配置文件 | 运行时组件加载、分层配置 |
| 并发与调度 | std::mutex/shared_mutex、线程 detach、FFRT、异步队列 | 回调隔离、超时/重试任务、异步通知 |
| 工具与交付 | ETS + hvigor、C++ 测试框架 | CLI 与 dialog 构建、测试与签名 |

## 3. 数据模型

### 3.1 实体与结构

| 实体 | 用途 | 重要字段 |
|---|---|---|
| `GlobalEvent` | 分布式事件载体，携带设备与数据元信息 | `version/frameNum/user/seqId/status/syncTime/dataId/expiration/isDelay/notNeedLink/deviceId/account/dataType`（`framework/framework/include/clip/clip_plugin.h`） |
| `PasteData`（外部 API 语义） | 剪贴板复合数据结构 | `mimeTypes`, `tag`, `timestamp`, `localOnly`, `additions`（README 接口约束） |
| `TimeConsumingStatistic` | 时耗统计分桶（枚举） | 1..11 桶（`services/dfx/src/dfx_types.h`） |
| `DataRange` | 数据量分桶 | 0KB~50MB（`services/dfx/src/dfx_types.h`） |
| `PasteboardFaultMsg` / `PasteboardBehaviourMsg` / `TimeConsumingStat` | DFX 上报 payload | `errorCode/userId/bundleName/dataSize/timeConsuming/state`（`services/dfx/src/dfx_types.h`） |
| `Config::Component` | 可加载组件描述 | `description/lib/constructor/destructor/params`（`services/load/include/config.h`） |
| `Config` | 全局加载配置 | `processLabel/version/features/plugins/components/uid`（`services/load/include/config.h`） |
| `DelayEntryInfo` | 延迟条目优先级与记录映射 | `recordId/key/entry`（`services/core/include/pasteboard_delay_manager.h`） |
| `DisposableInfo` | 一次性读取上下文 | `user/window/record/长度/超时行为`（`services/core/include/pasteboard_disposable_manager.h`） |
| `AppInfo`/`HistoryInfo` | 访问历史与应用上下文 | 成员见 `services/core/include/pasteboard_service.h` |
| `AccountManager` 返回值 | 当前账户占位标识 | 目前固定返回空字符串（`services/account/src/account_manager.cpp`） |

### 3.2 持久化

- 已确认持久化与配置类数据来源：
  - `services/load/include/loader.h` 的 `CONF_FILE` 指向 `/system/etc/pasteboard/conf/pasteboard.json`（硬编码）作为组件配置源；`Loader::LoadComponents` 读取与反序列化后驱动插件加载（`services/load/src/loader.cpp`）。  
  - `DataShare` 读取通过 `DataShareDelegate` 提供到设置键空间，如分布式开关与协作开关（`adapter/data_share/datashare_delegate.cpp/.h`）。  
  - `PasteboardSwitch` 通过 `DataShareDelegate::GetValue` 读取 `distributed_pasteboard_switch` 与 `DISTRIBUTED_PASTEBOARD_SWITCH` 对应键位，空值按默认开启处理（`services/switch/pasteboard_switch.cpp`）。  
- 现有证据未给出 `core` 对剪贴板内容在闪断恢复后的全局持久化方案细节；读取/写入分发链路在主流程已确认，但“重启后恢复一致性”需结合上游实现进一步确认（To be confirmed）。
- 索引/迁移：本证据未提供数据库表、schema 迁移脚本；索引约束以内存态结构与配置键/事件状态为主。  
- 容错：配置加载失败时 `load` 采用容错行为，返回空配置并继续流程；若关键配置缺失，相关模块使用默认策略或日志告警（`services/load/src/loader.cpp`、`services/switch/pasteboard_switch.cpp`）。

## 4. 接口设计

### 4.1 对外接口

| 接口 | 调用方 | 输入 | 输出 |
|---|---|---|---|
| `SystemPasteboard` 系列（如 `setPasteData`, `getPasteData`, `hasPasteData`, `on/off`） | framework/应用侧 | 数据对象、回调或 Promise | 操作结果、`PasteData`、布尔值 | 
| `ohos-pasteboard` 子命令（`set-data/get-data/clear-data/has-data/has-data-type/has-remote-data`） | 运维/脚本/自动化 | 命令参数（`--text/--html/--uri/--type`） | JSON 响应（成功/失败） |
| `PasteboardService` IPC 方法（`SetPasteData/GetPasteData/HasPasteData/Clear/HasRemoteData/SubscribeObserver`） | `zidl` 客户端 | IPC 序列化参数 | 服务执行码与返回结构 |
| `Reporter::GetInstance()/PasteboardFault()/TimeConsumingStatistic()/PasteboardBehaviour()` | 各服务模块 | 结构化上报结构体 | 上报动作与日志事件落库 |
| `CalculateTimeConsuming` RAII（ctor / dtor） | 服务业务代码 | 开始时间、数据量、状态 | 析构时自动触发时耗统计上报 |
| `Loader::LoadComponents()/LoadUid()` | 服务初始化链 | 无（默认配置路径） | 已加载组件映射、UID |
| `PastedSwitch::Init()/SetSwitch()/GetDeviceCollabSwitch()` | 服务启动/状态查询 | userId、键值读结果 | 开关状态与 UE 上报 |
| `AccountManager::GetCurrentAccount()` | 业务兼容层 | 无 | `std::string`（当前为空） |
| `PasteboardDialog` Ability 启动接口（由 `ToastExtensionAbility` 执行） | `PasteboardService` / dialog 调用链 | `Want` 参数 | 用户提示与进度展示 |

### 4.2 内部接口

- `zidl` 代理（Client/Proxy）与桩（Stub）处理上层调用与服务端方法分发；`PasteData` 等结构通过序列化协议在进程边界传输（`services/zidl/include/*.h`, `services/zidl/src/*.cpp`）。
- `core` 与 `adapter` 的关键内部接口：
  - `DataShareDelegate::{RegisterObserver/GetValue/SetUserId}` 接入系统设置（`adapter/data_share/datashare_delegate.h/.cpp`）。
  - `DeviceProfileClient::{LoadDeviceProfileService/GetDeviceProfileService/Put/GetCharacteristicProfile}` 接入分布式设备画像能力（`adapter/src/device_profile_client.cpp`）。
  - `DevProfile::PutDeviceStatus/GetDeviceStatus` 同步协作状态到设备画像层并触发 `Notify`（`framework/framework/device/dev_profile.cpp`）。
- `dfx` 内部入口链：
  - `Reporter::GetInstance()` 聚合三个上报器；`HiViewAdapter` 提供时耗/行为聚合与周期线程；`CalculateTimeConsuming` 将原始耗时映射为枚举桶（`services/dfx/src/reporter.*`, `services/dfx/src/hiview_adapter.*`）。
- `core` 内部回调接口集合（观察者、实体识别、延迟获取、一次性读取）通过 `IPasteboard*` 系列接口分发给客户端回调实现（`services/core/include/ipasteboard_*.h`）。

## 5. 核心流程设计

### 5.1 写入与读取核心流程（`SetPasteData` / `GetPasteData`）

1. 上层 API/IPC 请求到达 `PasteboardService::SetPasteData`（源码锚点：`services/core/include/pasteboard_service.h:PasteboardService::SetPasteData`）。  
2. 服务端校验调用方、文件/大小参数，反序列化 PasteData，并按权限与上下文更新本地/分布式路径状态（`services/core/src/pasteboard_service.cpp:SetPasteData`, `WritePasteData`, `SaveData`）。  
3. 成功写入后触发观察者回调，按 `ObserverType` 分发 `on` 订阅回路（`services/core/src/pasteboard_service.cpp:NotifyObservers`）。  
4. 同时通过 DFX 链路上报时耗、行为（copy/paste 计数）和故障（如有）用于可观测性。  
5. 读取时，`GetPasteData` 走 `GetPasteDataInner`，再按本地可用性与分布式链路判断 `GetData/GetRemoteData`，最终返回 TLV/ashmem 流（`services/core/src/pasteboard_service.cpp:GetData`, `DealData`）。  

### 5.2 一次性读取与观察回调流程

1. 写入路径后尝试 `DisposableManager::TryProcessDisposableData`：若窗口匹配则触发一次性回调并清理；不匹配走清理/回退逻辑（`services/core/src/pasteboard_disposable_manager.cpp:TryProcessDisposableData`）。  
2. `SubscribeObserver/UnsubscribeObserver` 管理 `on/off` 生命周期（`services/core/src/pasteboard_service.cpp:SubscribeObserver`）。  
3. 实体识别通过 `PatternDetection::Detect` 与 `NotifyEntityObservers` 串联，匹配文本实体并回调观察者（`services/core/src/pasteboard_pattern.cpp`, `services/core/src/pasteboard_service.cpp`）。

### 5.3 CLI 流程与服务调用链

1. `ohos-pasteboard` 解析参数并路由命令（`tools/ohos-pasteboard/src/executor.cpp:ExecuteCommand`）。  
2. 解析器对 `set-data`、`has-data-type` 做参数完整性校验（`tools/ohos-pasteboard/src/parser.cpp:ParseSetData`, `ParseHasDataType`）。  
3. 命令执行通过 `PasteboardClient::GetInstance()` + 对应 API 获取服务响应，失败则按 `error_handler.cpp` 映射成统一错误码（`tools/ohos-pasteboard/src/error_handler.cpp`）。  
4. 成功与失败均通过标准 JSON 输出；`--help` 输出帮助文本，不走 JSON 包装（`tools/ohos-pasteboard/src/printer.cpp`）。

### 5.4 开关、配置与动态加载流程

1. 服务启动/初始化时由 `Loader::LoadComponents` 读取 `pasteboard.json` 并逐组件 `dlopen`/`dlsym` 调用 constructor（`services/load/src/loader.cpp`）。  
2. `PastedSwitch::Init` 读取系统参数与 DataShare 键，注册监听并异步刷新状态（`services/switch/pasteboard_switch.cpp`）。  
3. `DataShareDelegate` 在 `SetUserId` 后构建设置 URI 并访问 `PASTEBOARD_SA_ID` 对应 service（`adapter/data_share/datashare_delegate.cpp`）。

## 6. 算法设计

- 时耗统计算法：`CalculateTimeConsuming` 在构造记录起始时间，析构时计算耗时并按数据量映射到 `DataRange`，形成 `TimeConsumingStatistic` 上报；`HiViewAdapter::ReportTimeConsumingStatistic` 做进一步聚合后上报（`services/dfx/src/calculate_time_consuming.cpp`, `services/dfx/src/hiview_adapter.cpp`）。  
- 行为统计算法：`PasteboardBehaviourReporterImpl::Report` 按应用名聚合 copy/paste 次数，并周期 flush；`HiViewAdapter::InvokePasteBoardBehaviour` 进行 top-N 汇总上报（`services/dfx/src/behaviour/pasteboard_behaviour_reporter_impl.cpp`, `hiview_adapter.cpp`）。  
- 去重算法：`DeduplicateMemory` 基于时间窗快速判重，早退条件为时间戳窗口外直接返回 false（`services/dfx/src/pasteboard_deduplicate_memory.h`）。  
- 延迟数据优先级算法：`DelayManager` 对延迟字段按 MIME/UTD 与优先级排序，提取首要条目回填（`services/core/src/pasteboard_delay_manager.cpp`）。  
- 实体识别算法：`PatternDetection::Detect` 先处理 HTML 提取，再对文本执行正则规则匹配 URL/电话/邮箱/航班号等（`services/core/src/pasteboard_pattern.cpp`）。  
- 开关判定算法：`PastedSwitch::SetSwitch` 读取布尔开关值，空值默认开启，`GetDeviceCollabSwitch` 以 `"1"` 为开。  
- 动态组件加载算法：`Loader::ComponentIsExist` 用 `lib` 名字去重，多次请求重复库名仅首次 `dlopen`（`services/load/src/loader.cpp`）。

> 说明：开关模块与 IPC 事务码细节、部分 `zidl` 序列化字段与对端协议边界来自文件命名与结构推断，待补充源码逐条对齐（To be confirmed）。

## 7. 缓存设计

- `dfx` 有时耗与行为的内存聚合容器：由互斥锁保护，周期线程 flush 触发聚合上报（`services/dfx/src/hiview_adapter.h/.cpp`）。  
- `PasteboardService` 与相关管理器含并发保护容器：`pasteDataMutex_`、`shared_mutex`、`ConcurrentMap` 等用于状态与订阅关系保护（`services/core/include/pasteboard_service.h`）。  
- `Loader` 使用静态 `handleMap` 缓存已加载库句柄，当前实现无 `dlclose` 回收路径（`services/load/include/loader.h`, `services/load/src/loader.cpp`）。  
- `DeviceProfileProxy` 与 `DataShareDelegate` 采用按需创建 + 缓存代理实例策略，必要时触发清理（`framework/framework/device/device_profile_proxy.cpp`, `adapter/data_share/datashare_delegate.cpp`）。  
- 除上述之外无持久化缓存；若需统一缓存策略（如 CLI 与 core 结果缓存）当前证据不足，记为 `To be confirmed`。

## 8. 异常处理设计

- 错误分类：
  - 参数与调用链错误：`ERR_ARG_INVALID/ARG_MISSING/CMD_INVALID`（CLI）与参数校验分支（`tools/ohos-pasteboard/src/parser.cpp`）。  
  - 权限与用户错误：`ERR_PERMISSION_DENIED`、`ERR_INVALID_USER`（CLI 与服务权限入口）。  
  - 读取/序列化类错误：`ERR_NO_DATA/DESERIALIZATION/SERIALIZATION`（CLI 到服务返回映射）。  
  - 远端/协同错误：`ERR_GET_REMOTE/REMOTE_TASK/REMOTE_EXCEPTION`，由 `core` 分支与重试任务处理（`framework/framework/device/distributed_module_config.cpp`）。  
- 用户可见错误：
  - CLI 全部错误统一输出 JSON 失败结构；`type/status/errCode/errMsg/suggestion`（`tools/ohos-pasteboard/src/printer.cpp`）。  
  - 服务异常默认降级策略：`switch` 空值默认开启；`load` 配置缺失采用空配置继续；`PasteboardClient` 空实例返回 `ERR_INTERNAL_ERROR`（`tools/ohos-pasteboard/src/*_command.cpp`）。  
- 重试与补偿：
  - `DistributedModuleConfig` 在 DP 加载失败时触发 30 次、1 秒间隔重试（`framework/framework/device/distributed_module_config.cpp`）。  
  - `PastedSwitchObserver::OnChange` 使用 `std::thread` 异步刷新，避免主线程阻塞（`services/switch/pasteboard_switch.cpp`）。  
  - `hiview` 上报失败只记录错误并丢弃本次事件，不阻塞主链路（`services/dfx/src/hiview_adapter.cpp`）。  
- 告警策略：
  - 关键失败点建议接入 `PASTEBOARD_HILOG` + `HiSysEvent` 错误码日志，结合 CLI `failed` 与 `dfx` 统计做联动告警。

## 9. 监控与日志

- 日志体系：
  - `PASTEBOARD_HILOG*` 通道按模块 tag（`PASTEBOARD_MODULE_SERVICE/COMMON/CLIENT/DFX`）输出关键路径和异常（`pasteboard_hilog` 引用多个核心文件）。  
  - `hiview_adapter` 将行为/时耗聚合到 HiSysEvent，故障走 `PasteboardFault`，并配套 `pasteboardEvent.yaml` 作为事件字典约束。  
- 指标与统计：
  - 时耗桶、数据量桶、行为 copy/paste 应用维度计数、异常码分布、周期 flush 次数（`services/dfx/src/dfx_types.h`, `services/dfx/src/hiview_adapter.cpp`）。  
- 日志字段建议（排障需保留）：
  - service 名称、uid、seqId、bundleName、errorCode、timeConsuming、dataRange、remote/local 标识、`deviceId`（来源于各上报结构与 `GlobalEvent`）。

### 9.1 运行手册（基于现有证据）

#### Build（构建）
- `ohos-pasteboard`：存在 BUILD 配置与入口可建（`tools/ohos-pasteboard/BUILD.gn`，文档未提供具体执行环境）。  
- `services/core/switch/load/dfx/dialog/account/zidl` 在现有证据未给出独立 BUILD 命令，按仓库统一构建入口触发服务与模块产物。  
- `pasteboardDialog` 使用 `hvigorfile.js` 与 `ohos-cli` 插件链路构建（`services/dialog/PasteboardDialog/hvigorfile.js`）。

#### Validation（验证）
- 服务级冒烟：
  - `set` 后 `has` 为真；
  - `getData` 可反序列化为预期 `PasteData`；
  - `clear` 后 `hasData` 为假。  
- CLI 验证：
  - 按文档命令覆盖 `set-data/get-data/clear-data/has-data/has-data-type/has-remote-data`；
  - 对 `set-data` 空参数、`has-data-type` 缺参和非法命令做负例验收（`tools/ohos-pasteboard/docs/README.md`）。  
- 分布式与切换验证：
  - 切换开关值后确认 `PastedSwitch::SetSwitch` 同步路径生效；
  - 一次性读取、延迟条目、实体识别订阅按配置进行。

#### Deployment（部署）
- CLI 安装路径：`/system/bin/cli_tool/executable/ohos-pasteboard`（`tools/ohos-pasteboard/docs/README.md`）。  
- `load` 配置文件需部署到 `/system/etc/pasteboard/conf/pasteboard.json`（`services/load/include/loader.h:CONF_FILE`）。  
- `switch` 依赖 `settingsdata` 键路径可访问与 `DataShare` 权限。  
- `dialog` 依赖模块/应用清单与 HAP 签名部署。

#### Rollback（回退）
- `load` 回退优先替换配置文件，逐项禁用新增 `components` 项。  
- `core` 或 `zidl` 回退建议以服务目标为粒度回滚，避免 `Proxy/Stub` 不对齐。  
- `ohos-pasteboard` 回退用版本替换可执行文件；`dfx` 为功能降级可先关闭 `Report` 路径验证业务不受阻。  
- `account` 回退保持“返回空字符串”基线不触发更复杂兼容性风险。

#### Failure-mode notes（故障模式）
- CLI 不响应：`Command::DoAction` 未命中、help 输出异常。  
- 周期上报缺失：`HiViewAdapter` 线程未起、`running_` 状态或锁竞争。  
- 开关误判：`distributed_pasteboard_switch` 读空导致默认开启。  
- 异步回调堆积/泄漏：`std::thread::detach` 频繁创建导致系统资源上升（`PastedSwitch`, `DmStateObserver`, `EventCenter` 等）。

### 9.2 调试指导（主要模块）

| 模块 | 常见症状 | 可能源区 | 需检查文件 |
|---|---|---|---|
| core | 读写异常、无数据或事件缺失 | `SetPasteData/GetPasteData/NotifyObservers` | `services/core/src/pasteboard_service.cpp`, `services/core/include/pasteboard_service.h` |
| zidl | 调用端参数缺失、回调异常 | `*_proxy` 与 `*_stub` 不对齐 | `services/zidl/include/*`, `services/zidl/src/*` |
| dfx | 上报缺失、JSON/事件缺失、时耗异常 | `hiview_adapter` 聚合/线程、`CalculateTimeConsuming` 生命周期 | `services/dfx/src/hiview_adapter.cpp`, `services/dfx/src/calculate_time_consuming.cpp` |
| load | 组件未加载、`dlopen` 失败 | 配置路径/组件库/构造函数名 | `services/load/src/loader.cpp`, `services/load/include/loader.h` |
| switch | 开关无效、状态抖动 | `Init/OnChange/SetSwitch` 异常分支 | `services/switch/pasteboard_switch.cpp`, `services/switch/pasteboard_switch.h` |
| account | 总是空账号 | `GetCurrentAccount()` 直接返回空实现 | `services/account/src/account_manager.cpp` |
| dialog | 弹框不显示、页面异常 | Ability 注册与 global 参数解析 | `services/dialog/PasteboardDialog/entry/src/main/module.json`, `entry/src/main/ets/Application/MyAbilityStage.ts` |

## 10. 安全设计

- 身份与权限边界：
  - 服务端权限分支包括读取与写入校验、账号用户上下文校验；`GetPasteDataInner` 中的权限路径与验证逻辑是核心安全入口（`services/core/src/pasteboard_service.cpp`）。  
  - CLI 读取命令声明依赖 `ohos.permission.READ_PASTEBOARD`（`tools/ohos-pasteboard/docs/README.md`）。  
  - 远端服务能力依赖 `DistributedDeviceProfile` 与 `DataShare` 参数化访问，参数通过 `DataShareDelegate` 与 `userId_` 限定（`adapter/data_share/datashare_delegate.h/.cpp`）。  
- 输入校验与命令安全：
  - 参数解析限制参数是否存在、类型，不满足直接返回标准错误码（`tools/ohos-pasteboard/src/parser.cpp`）。  
  - `has-data-type` 仅做存在性检查，未做 MIME 白名单严格校验（安全与兼容性需上层约束，属于待确认风险）。  
- 依赖安全：
  - 动态库加载通过白名单化组件列表与 `dlsym` constructor 字符串，未回收句柄（`services/load/src/loader.cpp`），应在发布链路上限制插件来源。  
  - `DeviceProfileProxy` 使用 `dlopen(RTLD_NOW)` 并回收顺序明确，减少运行时链接符号风险（`framework/framework/device/device_profile_proxy.cpp`）。  
- 审计与追踪：
  - 开关与核心行为采用 UE 事件/HI 事件上报（`UE_SWITCH`, `Radar/AppEvent` 系列），并配套 `pasteboardEvent.yaml` 做事件字典治理。  
- 源码确认与推断边界：
  - 源码确认：外部接口、模块边界、主要路径与异常分支基于给定文件；`services/dfx/src/*`, `services/core/*`, `services/zidl/*`, `tools/ohos-pasteboard/*`, `services/load/*`, `services/switch/*`, `services/account/*`。  
  - 推断/缺失：`main-pages` 与 Dialog 运行时页面行为、`zidl` 事务码映射细节、core 与外部适配器之间所有真实数据持久化细节、完整构建命令与回退脚本，需要在后续源码核对后补齐。  
  - `AccountManager` 当前仅返回空账户属于占位实现，属于架构性兼容风险，待上游接入真实账号服务后需补充异常模型（`services/account/src/account_manager.cpp`）。
