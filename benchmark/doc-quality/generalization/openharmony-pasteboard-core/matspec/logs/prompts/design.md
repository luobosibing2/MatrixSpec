You are the MatSpec design.md generation runner.
Task: synthesize a project-level implementation design document from module documents.

硬性输出规则：
1. 只输出最终 Markdown 正文，不要添加解释、前言或后记。
2. 不要用 ```md 或其他代码围栏包裹整篇文档。
3. 不要提及 sandbox、filesystem、read-only mode、无法写文件或“复制到仓库”等运行环境说明。
4. 默认使用中文输出。
5. 不要声称文件已经写入；MatSpec CLI 会保存产物。

Template requirements:
1. Strictly use the main section structure and headings from the DESIGN template below.
2. Preserve section meaning, but replace placeholders with real project content.
3. Do not delete non-applicable sections; write "No explicit design" or "To be confirmed" and explain the basis.
4. design.md is a white-box implementation design and may include technology stack, modules, APIs, data model, deployment, security, and observability.

DESIGN template:
# [组件名称] 实现设计

## 1. 设计概述

### 1.1 设计目标

[描述该设计必须满足的技术目标。]

### 1.2 设计约束

1. [约束 1]
2. [约束 2]

## 2. 系统架构

### 2.1 架构概述

[描述运行时架构和主要依赖。]

### 2.2 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| [模块] | [职责] | [文件] |

### 2.3 技术栈

| 层次 | 技术 | 用途 |
|------|------|------|
| [层次] | [技术] | [用途] |

## 3. 数据模型

### 3.1 实体与结构

| 实体 | 用途 | 重要字段 |
|------|------|----------|
| [实体] | [用途] | [字段] |

### 3.2 持久化

[描述存储、索引、迁移和兼容性策略。]

## 4. 接口设计

### 4.1 对外接口

| 接口 | 调用方 | 输入 | 输出 |
|------|--------|------|------|
| [接口] | [调用方] | [输入] | [输出] |

### 4.2 内部接口

[描述模块间调用边界。]

## 5. 核心流程设计

### 5.1 [流程名称]

[描述主要执行流程、关键分支和异常路径。]

## 6. 算法设计

[描述关键算法、规则计算或决策逻辑；如无复杂算法，说明不适用。]

## 7. 缓存设计

[描述缓存对象、失效策略、一致性和降级行为；如无缓存，说明不适用。]

## 8. 异常处理设计

[描述错误分类、用户可见错误、重试、补偿和告警策略。]

## 9. 监控与日志

[描述关键指标、日志字段、审计要求和排障入口。]

## 10. 安全设计

[描述认证、授权、数据保护、输入校验和依赖安全。]

Project: distributeddatamgr_pasteboard
Language: C/C++
Modules:
- Dfx: services/dfx
- Zidl: services/zidl
- Core: services/core
- Ohos Pasteboard: tools/ohos-pasteboard
- Dialog: services/dialog
- Load: services/load
- Switch: services/switch
- Account: services/account

Module documents:
# `services/dfx` 模块中间设计文档（供 `design.md` 合并）

## 模块目的与定位
- 核心目标：为剪贴板服务提供可观测性能力（故障上报、行为上报、时耗统计、事件上报、CLI dump/命令和执行追踪），并统一入口分发这些上报行为。[已确认]
  - 主要分发器：[`services/dfx/src/reporter.h:Reporter`](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/reporter.h:25) 维护故障、行为、时耗三类报告器实例并提供单例访问。[已确认]
- 模块不承载核心剪贴板业务逻辑，而是“旁路观察/埋点”层，消费来自其他服务层的调用参数并写入 HiSysEvent/HiAppEvent/Trace。 [已确认]

## 目录结构（实际文件）
| 相对路径 | 角色 |
|---|---|
| [services/dfx/src/reporter.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/reporter.h) | 三类上报器统一入口 |
| [services/dfx/src/reporter.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/reporter.cpp) | 上报器单例构造与返回实现 |
| [services/dfx/src/dfx_types.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/dfx_types.h) | 核心数据类型与枚举 |
| [services/dfx/src/dfx_code_constant.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/dfx_code_constant.h) | 事件码常量 |
| [services/dfx/src/hiview_adapter.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.h) | 事件写入网关 |
| [services/dfx/src/hiview_adapter.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.cpp) | 时耗/行为聚合与周期上报实现 |
| [services/dfx/src/calculate_time_consuming.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/calculate_time_consuming.h) | 时耗指标构造与 RAII 聚合入口 |
| [services/dfx/src/calculate_time_consuming.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/calculate_time_consuming.cpp) | 数据量和耗时分桶映射 |
| [services/dfx/src/behaviour/behaviour_reporter.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/behaviour/behaviour_reporter.h) | 行为上报抽象接口 |
| [services/dfx/src/behaviour/pasteboard_behaviour_reporter_impl.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/behaviour/pasteboard_behaviour_reporter_impl.h) | 行为上报具体实现类 |
| [services/dfx/src/behaviour/pasteboard_behaviour_reporter_impl.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/behaviour/pasteboard_behaviour_reporter_impl.cpp) | 行为上报到 HiViewAdapter 的桥接 |
| [services/dfx/src/fault/fault_reporter.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/fault/fault_reporter.h) | 故障上报抽象接口 |
| [services/dfx/src/fault/pasteboard_fault_impl.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/fault/pasteboard_fault_impl.h) | 故障上报具体实现类 |
| [services/dfx/src/fault/pasteboard_fault_impl.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/fault/pasteboard_fault_impl.cpp) | 故障事件写入网关 |
| [services/dfx/src/statistic/statistic_reporter.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/statistic/statistic_reporter.h) | 通用统计上报模板 |
| [services/dfx/src/statistic/time_consuming_statistic_impl.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/statistic/time_consuming_statistic_impl.h) | 时耗统计上报实现声明 |
| [services/dfx/src/statistic/time_consuming_statistic_impl.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/statistic/time_consuming_statistic_impl.cpp) | 时耗统计上报实现 |
| [services/dfx/src/pasteboard_event_common.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_common.h) | Radar/UE 共享数据结构 |
| [services/dfx/src/pasteboard_event_dfx.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_dfx.h) | Radar 阶段化事件宏和枚举 |
| [services/dfx/src/pasteboard_event_dfx.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_dfx.cpp) | 匿名化工具实现 |
| [services/dfx/src/pasteboard_event_ue.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_ue.h) | UE 事件宏与属性定义 |
| [services/dfx/src/pasteboard_app_event_dfx.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_app_event_dfx.h) | API 级别 AppEvent 生命周期对象 |
| [services/dfx/src/pasteboard_app_event_dfx.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_app_event_dfx.cpp) | AppEvent 处理器初始化与事件提交 |
| [services/dfx/src/pasteboard_trace.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_trace.h) | bytrace 生命周期封装 |
| [services/dfx/src/pasteboard_trace.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_trace.cpp) | bytrace 启停逻辑 |
| [services/dfx/src/command.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/command.h) | 命令对象定义 |
| [services/dfx/src/command.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/command.cpp) | 命令行为实现 |
| [services/dfx/src/pasteboard_dump_helper.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_dump_helper.h) | CLI 命令注册与分发（dump helper） |
| [services/dfx/src/pasteboard_dump_helper.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_dump_helper.cpp) | CLI 调度逻辑 |
| [services/dfx/src/pasteboard_deduplicate_memory.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_deduplicate_memory.h) | 去重记忆体（模板） |

## 核心组件设计（按职责链）
| 组件 | 关键符号 | 说明 | 影响范围 |
|---|---|---|---|
| 报告器分发 | [Reporter](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/reporter.h:25), [Reporter::GetInstance](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/reporter.cpp:31) | 统一暴露 `PasteboardFault()`、`TimeConsumingStatistic()`、`PasteboardBehaviour()`，各返回静态实现对象 | 全模块共享访问 |
| 故障上报链 | [FaultReporter](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/fault/fault_reporter.h:23), [PasteboardFaultImpl::Report](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/fault/pasteboard_fault_impl.cpp:21), [HiViewAdapter::ReportPasteboardFault](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.cpp:103) | 将 `PasteboardFaultMsg` 转为 HiSysEvent fault 写入 | 故障诊断 |
| 行为上报链 | [BehaviourReporter](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/behaviour/behaviour_reporter.h:23), [PasteboardBehaviourReporterImpl::Report](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/behaviour/pasteboard_behaviour_reporter_impl.cpp:21), [HiViewAdapter::ReportPasteboardBehaviour](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.cpp:251) | 按应用名统计 copy/paste 计数，周期写入 top-N | 行为统计 |
| 时耗统计链 | [CalculateTimeConsuming](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/calculate_time_consuming.h:36), [~CalculateTimeConsuming](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/calculate_time_consuming.cpp:38), [TimeConsumingStatisticImpl::Report](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/statistic/time_consuming_statistic_impl.cpp:21), [HiViewAdapter::ReportTimeConsumingStatistic](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.cpp:149) | 通过 RAII 在析构时落库上报时耗与数据量分桶 | 性能分析 |
| 周期聚合上报 | [HiViewAdapter::StartTimerThread](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.cpp:551), [HiViewAdapter::InvokeTimeConsuming](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.cpp:325), [HiViewAdapter::InvokePasteBoardBehaviour](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.cpp:371) | 通过定时线程触发时耗/行为统计清桶与上报 | 全量汇总 |
| 事件上报抽象 | [pasteboard_event_dfx.h: RADAR_REPORT/COPY_RADAR_REPORT/PASTE_RADAR_REPORT](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_dfx.h), [PasteboardDfxUntil::GetAnonymousID](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_dfx.cpp:21) | 定义 Radar 阶段事件的参数拼装与匿名化 | 远端协同事件 |
| UE 事件 | [UE_SWITCH](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_ue.h:38), [UE_REPORT](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_ue.h:44), [UeReportInfo](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_common.h:54) | UE 域事件宏 + 数据结构 | UE 侧观测 |
| CLI 调试入口 | [Command::DoAction](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/command.cpp:35), [PasteboardDumpHelper::Dump](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_dump_helper.cpp:8), [RegisterCommand](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_dump_helper.cpp:20) | 命令路由+输出机制，支持 `-h` 等帮助 | CLI/运维入口 |
| Trace + AppEvent | [PasteboardTrace](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_trace.h:23), [DfxAppEvent](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_app_event_dfx.h:27), [DfxAppEvent::~DfxAppEvent](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_app_event_dfx.cpp:23) | bytrace 生命周期自动 start/finish；应用事件通过 RAII 写入 | 端到端耗时与 API 级行为 |
| 内存去重工具 | [DeduplicateMemory](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_deduplicate_memory.h:25), [IsDuplicate](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_deduplicate_memory.h:57) | 时间窗内去重判断（泛型模板） | 防抖/重复上报控制 |

## 核心流程
1. 外部流程完成后，调用 `Reporter::GetInstance()` 获取统一实例。[确认]
2. 对应场景提交具体上报：故障走 `PasteboardFaultImpl::Report`，时耗走 `TimeConsumingStatisticImpl::Report`，行为走 `PasteboardBehaviourReporterImpl::Report`。[确认]
3. `TimeConsuming` 场景通过 RAII 方式记录，调用 `CalculateTimeConsuming::SetBeginTime` 标记开始，析构时自动计算耗时并提交 `TimeConsumingStat`。[确认+推断]
   - `CalculateTimeConsuming` 构造函数接收 `calPasteboardData` 和 `calPasteboardState`，并将数据量转为 `DataRange`。[确认]
   - 析构函数使用 `Reporter::GetInstance().TimeConsumingStatistic().Report(...)` 进行最终汇总提交。[确认]
4. 上报网关 `HiViewAdapter` 按类型将数据转为 HiSysEvent，并在 `StartTimerThread` 中定时执行行为/时耗聚合 flush。[确认]
5. 事件宏层构建 Radar/UE 事件字段（bizscene/stage/misc 属性）并输出到对应域。[确认]
6. CLI 场景下，`PasteboardDumpHelper::Dump` 解析参数并用 `Command` 实例分发执行，未命中返回 false。[确认]
7. 执行周期和资源控制：`HiViewAdapter` 使用互斥锁保护计数容器，`running_` 和线程名用于避免重复启动定时任务。[确认]

## 接口与数据结构
### 数据类型（核心）
| 名称 | 位置 | 结构/枚举 | 说明 |
|---|---|---|---|
| `TimeConsumingStatistic` | [dfx_types.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/dfx_types.h:23) | enum | 时耗桶（1..11） |
| `BehaviourPasteboardState` | 同上 | enum | 0 copy / 1 paste / 2 remote paste / 3 invalid |
| `StatisticPasteboardState` | 同上 | enum | 时耗路径状态 |
| `DataRange` | 同上 | enum | 数据量分桶（0KB~>50MB） |
| `PasteboardFaultMsg` | 同上 | struct | `{userId,errorCode}` |
| `PasteboardBehaviourMsg` | 同上 | struct | `{pasteboardState,bundleName}` |
| `TimeConsumingStat` | 同上 | struct | `{pasteboardState,dataSize,timeConsuming}` |
| `ReportStatus` | 同上 | enum class | `SUCCESS`/`ERROR` |
| `DataDescription` | [pasteboard_event_common.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_common.h:24) | struct | 记录数/类型信息 |
| `CommonInfo` | 同上 | struct | 设备类型、账号、数据量 |
| `RadarPasteInfo` | 同上 | struct | 分发场景中的分布式相关字段 |
| `RadarReportInfo` | 同上 | struct | Radar 事件聚合参数 |
| `UeReportInfo` | 同上 | struct | UE 事件统计参数 |

### 面向命令/服务的接口
| 接口 | 位置 | 行为 |
|---|---|---|
| `Command::Command(...)` | [command.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/command.h:27) | 持有参数格式与回调 |
| `Command::DoAction` | [command.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/command.cpp:35) | 执行 action |
| `PasteboardDumpHelper::Dump` | [pasteboard_dump_helper.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_dump_helper.cpp:8) | 解析命令参数并输出结果 |
| `PasteboardDumpHelper::RegisterCommand` | 同上 | 注册命令对象到 `cmdHandler` |
| `PasteboardTrace::PasteboardTrace(const string&)` | [pasteboard_trace.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_trace.h:24) | 构造时开启 Trace |
| `PasteboardTrace::~PasteboardTrace` | 同上 | 析构时结束 Trace |
| `DfxAppEvent::SetEvent` | [pasteboard_app_event_dfx.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_app_event_dfx.h:32) | 记录 api_name/error/result |
| `DfxAppEvent::~DfxAppEvent` | [pasteboard_app_event_dfx.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_app_event_dfx.cpp:11) | 写出 AppEvent |

## 关键约束与设计边界
- 单例与静态生命周期约束：多个报告器使用函数局部静态单例，需避免跨模块析构顺序导致悬空访问。[已确认]
- 并发约束：`HiViewAdapter` 中多个 `mutex` 保护时耗/行为统计容器，周期线程与调用线程可并发更新，需要保持互斥。[已确认]
- 事件码映射约束：`DfxCodeConstant` 中 4 个主事件码在 `EVENT_COVERT_TABLE` 中需要保持一致；当前映射在 `hiview_adapter.cpp` 已显式配置。[已确认]
- 统计桶映射约束：时长/数据量均采用分桶，细粒度归并在 `CalculateTimeConsuming` 与 `HiViewAdapter` 之间耦合，可能会丢失原始精度。[已确认]
- 时间单位约束：`CalculateTimeConsuming::GetCurrentTimeMicros` 使用 `gettimeofday` 并按 `SEC_TO_MILLISEC` 及 `MICROSEC_TO_MILLISEC` 组合为微秒级时间。[已确认]
- 定时线程行为约束：`StartTimerThread` 是分离线程，使用 `sleep` 驱动；对时钟漂移和进程生命周期敏感。[已确认]
- 配置文件证据约束：仅能确认存在 `pasteboardEvent.yaml` 事件定义模板（字段说明与事件元数据注释），但未从源码直接看到 YAML 载入流程。[已确认]
- 未发现本路径内可见的外部网络/权限处理入口；此类策略依赖调用方传入参数和平台能力。 [推断]
- `DeduplicateMemory::IsDuplicate` 在 `timestamp < expirationMS_` 情况下直接返回 false，这是一种防御式早退，行为与初始化窗口长度有关。[确认]

## 调试指导（按主要模块）
| 模块 | 常见症状 | 可能来源 | 排查文件/符号 |
|---|---|---|---|
| 报告分发层 | 上报调用后无任何事件 | Reporter 未进入正确实现或单例未触达 | [reporter.cpp: GetInstance/PasteboardFault/TimeConsumingStatistic/PasteboardBehaviour](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/reporter.cpp), [reporter.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/reporter.h) |
| 时耗统计层 | 某些接口缺少时耗上报 | `SetBeginTime` 未调用或生命周期未覆盖 | [calculate_time_consuming.h/.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/calculate_time_consuming.h), [calculate_time_consuming.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/calculate_time_consuming.cpp) |
| HiView 聚合层 | 周期性统计缺失/重复偏差 | 定时线程未启动、互斥阻塞、`running_` 状态未正确 | [hiview_adapter.cpp: StartTimerThread/InvokeTimeConsuming/InvokePasteBoardBehaviour](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.cpp), [hiview_adapter.h::running_](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.h) |
| CLI/Dump 入口 | CLI 不响应或帮助不显示 | 命令未注册或 `args` 为空分支异常 | [pasteboard_dump_helper.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_dump_helper.cpp), [command.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/command.cpp) |
| 事件宏 | 上报字段缺失/事件名错误 | 宏参数未对齐或常量拼写 | [pasteboard_event_dfx.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_dfx.h), [pasteboard_event_ue.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/pasteboard_event_ue.h) |

## 运行手册（基于现有运行证据）
- Build（已确认）
  - 该模块当前只确认了命令侧目标与命名：`ohos-pasteboard` 构建目标/安装路径来自工具文档（见工具说明）。[确认]
  - `services/dfx` 模块自身的构建入口、具体 hb/ninja 命令、模块开关未在当前证据中直接出现。[缺失证据]
- Validation（已确认）
  - 使用 `ohos-pasteboard` CLI 验证时，可在命令返回中检查 `type/result` 与 `status`、`data` 字段是否符合工具文档约定（如 `set-data/get-data/has-data` 等）。[确认, 证据来源为 tools/README]
  - 对时耗/行为/故障事件，可在平台事件日志侧观察 HiSysEvent 是否写入 `DfxCodeConstant` 对应事件码（`950001100/105/106/107`）。[已确认到常量映射]
- Deployment（已确认）
  - CLI 侧安装路径文档显示为 `/system/bin/cli_tool/executable/ohos-pasteboard`（仅 CLI 视角）。[确认]
  - 服务侧观测能力启用通常依赖系统服务整体部署与权限/进程策略，无该模块内可直接确认的独立部署步骤。[缺失证据]
- Rollback（缺失证据）
  - 未在当前证据中看到该模块级回滚开关或版本开关参数；建议回滚策略按服务包整体回退并禁用新版本 DFX 命令注册。 [缺失证据]
- 故障模式（已确认+推断）
  - 事件写失败：`OH_HiSysEvent_Write`/写入 API 返回值非成功码时记录错误日志并丢弃该次事件。[已确认]
  - 无输出或帮助异常：`PasteboardDumpHelper::Dump` 在未匹配命令时返回 false；需确认 `RegisterCommand` 已执行且 `GetOption` 能返回有效 key。[已确认]
  - 周期上报停滞：`StartTimerThread` 未启动、`running_` 锁定或循环阻塞会导致统计不能清桶。[推断]

## 源码确认边界
- 源码确认
  - 模块边界、类名、方法、枚举、常量、主要控制流路径以上文链接的源文件为准。[已确认]
  - 事件上报常量码与事件映射关系在 [dfx_code_constant.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/dfx_code_constant.h) 与 [hiview_adapter.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/openharmony/distributeddatamgr_pasteboard/services/dfx/src/hiview_adapter.cpp) 可直接对齐。[已确认]
- 推断
  - 调用方在何处创建 `CalculateTimeConsuming`、`SetBeginTime`、何时触发 `StartTimerThread`，当前模块视图未给出完整调用链，需要结合上层服务代码确认。[推断]
  - `DeduplicateMemory` 的具体上游用途（例如用于去重何种 payload）未在该路径内见到直接调用点。[推断]
- 缺失证据
  - 完整的构建/发布流水线、服务级部署清单、以及 dfx 与 `services/core` 的直接入口绑定点没有在本次证据内出现。[缺失证据]

# Zidl 模块中间设计文档（`services/zidl`）

## 1. 模块目标与范围

`services/zidl` 是剪贴板服务中的 IPC 适配层（ZIDL/Service IPC），负责将上层剪贴板能力与系统服务内核逻辑解耦并通过代理/桩模型进行跨进程调用。模块是白盒中间设计层，不承担业务决策，只承担请求分发、回调转发和数据编解码边界职责。

已知依据文件集合：
- [include](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\)
- [src](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\src\)

核心证据约束：仓库只给出了以下 12+12 文件，未提供实现细节源码清单，因此符号细节以“文件级锚点 + 命名推断”给出。

## 2. 目录结构

```text
services/zidl/
  include/
    entity_recognition_observer_proxy.h
    entity_recognition_observer_stub.h
    pasteboard_delay_getter_client.h
    pasteboard_delay_getter_proxy.h
    pasteboard_delay_getter_stub.h
    pasteboard_disposable_observer_proxy.h
    pasteboard_disposable_observer_stub.h
    pasteboard_entry_getter_client.h
    pasteboard_entry_getter_proxy.h
    pasteboard_entry_getter_stub.h
    pasteboard_observer_proxy.h
    pasteboard_observer_stub.h
  src/
    entity_recognition_observer_proxy.cpp
    entity_recognition_observer_stub.cpp
    pasteboard_delay_getter_client.cpp
    pasteboard_delay_getter_proxy.cpp
    pasteboard_delay_getter_stub.cpp
    pasteboard_disposable_observer_proxy.cpp
    pasteboard_disposable_observer_stub.cpp
    pasteboard_entry_getter_client.cpp
    pasteboard_entry_getter_proxy.cpp
    pasteboard_entry_getter_stub.cpp
    pasteboard_observer_proxy.cpp
    pasteboard_observer_stub.cpp
```

## 3. 核心组件与职责映射（文件锚点）

| 组件 | 典型文件锚点 | 推断职责 | 设计目的 |
|---|---|---|---|
| Pasteboard 观察者代理/桩 | [proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_observer_proxy.h) / [stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_observer_stub.h) / `.cpp` 对应实现 | 上行事件订阅与回调分发（例如 `on/off` 风格更新通知） | 接收系统端变更事件并回调上层 |
| 可回收观察者代理/桩 | [disposable_observer_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_proxy.h) / [disposable_observer_stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_stub.h) | 生命周期可回收的观察者机制（推断用于防泄漏） | 约束回调对象生命周期，支持显式销毁 |
| 延迟获取客户端 | [delay_getter_client.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_client.h) / [delay_getter_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_proxy.h) / [delay_getter_stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_stub.h) | 延迟返回/异步结果拉取或等待型读取 | 缓解阻塞，提高跨进程调用鲁棒性 |
| 实体识别观察者 | [entity_recognition_observer_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\entity_recognition_observer_proxy.h) / [entity_recognition_observer_stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\entity_recognition_observer_stub.h) | 剪贴板内容实体识别结果回调通道（推断） | 支持“识别到内容变化/类型”类通知 |
| 条目获取客户端 | [entry_getter_client.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_client.h) / [entry_getter_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_proxy.h) / [entry_getter_stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_stub.h) | 条目级读取（按记录/字段） | 与 `PasteData`/`PasteDataRecord` 的读取路径对接 |

> 表中符号名为依据文件名推断的层级角色（未提供源码内符号清单时采用命名约定推断）。

## 4. 核心流程（推断自文件分工）

### 4.1 读写主链路（系统粘贴板数据）
1. 上层 API 调用（如获取/设置数据）由框架入口进入服务侧 client/proxy。
2. `pasteboard_entry_getter_proxy` 进行跨进程请求封装。
3. 服务端由 `pasteboard_entry_getter_stub` 解析并转交业务核心处理。
4. 返回 `PasteData` 相关结构（与 `framework`/`interfaces/kits` 中公开对象对齐）。

### 4.2 变更事件/观察者链路
1. 上层注册监听（如 `on('update', cb)`/`off` 的语义，在 README 系统 Pasteboard 接口可见）。
2. 观察者代理接收本地注册并绑定远端引用。
3. 服务端变更触发经 `pasteboard_observer_stub` 回调到代理。
4. 代理转调用户回调；如为一次性或可回收实例，则经过 `disposable_observer_*` 管理生命周期。

### 4.3 延迟获取
1. 上层发起“延迟/异步”获取需求。
2. `pasteboard_delay_getter_proxy` 发起 IPC 并将阻塞与回调分离。
3. 服务器端 `delay_getter_stub` 根据时序回包或轮询式返回。

### 4.4 实体识别事件
1. 实体识别能力触发时，service 端走 `entity_recognition_observer_*` 对应通道透传；
2. 上层可接收富语义通知并决定二次读取/展示策略。

## 5. 接口与数据结构映射（边界说明）

该模块作为服务通信层，直接接触或传递的对象以框架层 API 为主，主要包括（源于仓库 README/README_ZH 的公开能力）：
- 剪贴板对象与操作：`SystemPasteboard`（`getPasteData`/`setPasteData`/`hasPasteData`/`clear`/`on`/`off`）
- 数据承载对象：`PasteData`, `PasteDataRecord`, `PasteDataProperty`
- 记录字段/属性：`mimeTypes`, `tag`, `timestamp`, `localOnly`, `additions`
- 兼容 API 变体：回调式、Promise 式、以及某些版本标识的转换接口（如 `convertToTextV9` 在中文文档中出现）

> 说明：上述类型定义与完整序列化细节未在 `services/zidl` 证据中展开，且本模块文件名层级并未提供字段级定义。

关键锚点：
- [README 主体接口说明](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\README.md)
- [README_ZH 说明](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\README_ZH.md)

## 6. 关键约束与设计边界

1. IPC 边界固定  
   `services/zidl` 由 `include`/`src` 成对文件组成，天然面向“声明-实现”分层，任何业务签名变化必须保持代理/桩对齐。  
   锚点：各模块的 `*_proxy.*` 与 `*_stub.*` 文件对。

2. 版本兼容性约束  
   README 中出现 Promise 与回调并行、以及 `V9` 接口变体，表明远端调用协议可能存在版本分支。  
   锚点：[README_ZH 表 4](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\README_ZH.md)（PasteDataRecord 转文本多版本方法）。

3. 回调生命周期约束  
   `disposable_observer_*` 的存在意味着观察者需要可回收策略，避免泄漏和僵尸回调。  
   锚点：[pasteboard_disposable_observer_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_proxy.h)

4. 错误与超时  
   尽管该模块自身未给出错误码定义，CLI 文档显示剪贴板链路普遍存在权限、序列化、超时、远端异常等失败类别。  
   锚点：[tools/ohos-pasteboard/docs/README.md](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\tools\ohos-pasteboard\docs\README.md)

5. 证据缺口  
   未提供 `symbol` 级实现、IPC transaction code、parcel 结构、构建脚本，必须在下一轮加入源码级锚点。

## 7. 调试指引（按模块）

| 模块 | 常见症状 | 可能来源 | 建议检查文件 |
|---|---|---|---|
| pasteboard_entry_getter | `getPasteData`/`setPasteData` 偶发超时或空返回 | proxy/stub 事务码或序列化字段不一致 | [entry_getter_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_proxy.h), [entry_getter_stub.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_stub.h) |
| pasteboard_delay_getter | 延迟读返回延迟过大或无回调 | 异步队列或超时策略异常 | [delay_getter_client.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_client.h), [delay_getter_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_proxy.h) |
| pasteboard_observer | `on/off` 回调不生效、重复触发 | 回调注册/注销、回传 token 管理错误 | [pasteboard_observer_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_observer_proxy.h), [pasteboard_observer_stub.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_observer_stub.h) |
| pasteboard_disposable_observer | 监听卸载后仍有回调、内存/句柄增长 | 生命周期未回收、句柄未销毁 | [pasteboard_disposable_observer_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_proxy.h), [pasteboard_disposable_observer_stub.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_stub.h) |
| entity_recognition_observer | 内容识别事件缺失/乱序 | 观察者链路注册或事件映射错误 | [entity_recognition_observer_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\entity_recognition_observer_proxy.h), [entity_recognition_observer_stub.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\entity_recognition_observer_stub.h) |

## 8. 运行手册（有证据时给出）

### Build（构建）
- 现有证据未提供 `services/zidl` 的直接 build 命令或目标清单（仅见服务规模与文件清单）。
- 建议在后续补充阶段以仓库统一构建入口验证该目录是否被纳入 `services` 编译单元。
- 源码变更影响范围仅限 `services/zidl/include/*` 与 `services/zidl/src/*` 配对文件，需保证头文件/实现文件一一一致。

### Validation（校验）
- 以接口兼容性为先：proxy 与 stub 的方法签名必须版本对齐。
- 基于文档语义对照：`on/off`、`getPasteData/setPasteData`、`hasPasteData`、记录读写等行为需与 README 描述一致。
- 典型回归：更新通知丢失、空数据、类型查询失败、权限拒绝路径。

### Deployment（部署）
- 模块为系统服务链路的一部分，通常随剪贴板服务组件发布到系统镜像；当前证据仅能确认其在服务树中位于 `services/zidl`，未给出安装/镜像打包步骤。

### Rollback（回滚）
- 回滚策略优先按文件组：`*_proxy.*` 与 `*_stub.*` 成对回退，避免单边不一致。
- 若仅 `stub` 回滚失败且 `proxy` 保持新版本，建议同步回退完整对，或临时将旧接口代理到兼容层 shim。

### Failure-mode notes（故障模式）
1. 接口签名/事务码不匹配 → 客户端与服务端 marshal 失败、返回空或错误码。
2. 观察者生命周期泄漏 → 连续 `on` 后服务端仍持有监听句柄。
3. 权限/安全策略变化 → 外围返回拒绝，需核对调用链上 permission 与调用来源。
4. 版本不一致（回调样式兼容）→ 同名 API 的回调/Promise 处理分支错误。

## 9. 确定性边界

- **源文件确认事实**
  - `services/zidl` 包含 24 个明确文件（12 头文件 + 12 源文件），且文件命名体现 Proxy/Stub/Client 分层。
  - 模块定位于 pasteboard 服务下的跨进程通信代码实现区。
  - README 系列明确了 `SystemPasteboard`、`PasteData`、`PasteDataRecord`、事件监听与文本转换语义。

- **推断事实**
  - 各类名具体为 `Pasteboard*`/`EntityRecognition*` 的形式为命名约定推断。
  - `delay_getter` 与 `disposable_observer` 的具体调度策略与具体事务 ID、序列化字段在当前证据中未展开，需要实现文件确认。
  - 构建/部署命令、回归验证脚本及模块接入方式当前未在证据中直接给出，按仓库通用构建流程推断。

# Core 模块中间设计文档（服务端实现）

## 模块目标与边界
1. `services/core` 是分布式粘贴板服务的内核服务域，承担系统级剪贴板内容的持久化内存态管理、权限校验、延迟/一次性数据处理、分布式获取与通知分发。  
   锚点：`[services/core/include/pasteboard_service.h:PasteboardService](services/core/include/pasteboard_service.h)`  
   依据：该头文件定义了服务入口类、生命周期、关键能力方法与大量成员状态变量。

2. `services/core` 不直接暴露应用层 API（高层 API 在 `framework/` 与 `interfaces/`），而通过 ZIDL/IPC 与客户端交互。  
   锚点：`[services/core/include/pasteboard_service.h:PasteboardServiceStub](services/core/include/pasteboard_service.h)`  
   依据：`PasteboardService` 继承自 `PasteboardServiceStub`，并实现多组远端调用方法（如 `SetPasteData`, `GetPasteData`, `HasPasteData` 等）。

3. 该模块与分布式粘贴、窗口焦点、URI 权限、事件订阅链路耦合强，属于“状态机 + 管道”式服务边界，不是单纯的存储层。  
   锚点：`[services/core/src/pasteboard_service.cpp:SaveData](services/core/src/pasteboard_service.cpp)` / `[services/core/src/pasteboard_service.cpp:GetData](services/core/src/pasteboard_service.cpp)` / `[services/core/include/pasteboard_common_event_subscriber.h:PasteBoardCommonEventSubscriber](services/core/include/pasteboard_common_event_subscriber.h)`

## 目录结构（仅基于给定文件）
1. 接口/能力声明（include）
   - `pasteboard_service.h`（核心服务类）
   - `pasteboard_delay_manager.h`（延迟记录聚合策略）
   - `pasteboard_disposable_manager.h`（一次性粘贴监听/回调）
   - `pasteboard_pattern.h`（文本实体识别模式引擎）
   - `pasteboard_dialog.h`（跨进程进度弹框能力）
   - `pasteboard_window_manager.h`（焦点窗口查询）
   - `pasteboard_ability_manager.h`（能力启动与焦点检查）
   - `pasteboard_common_event_subscriber.h`（公共事件订阅）
   - `pasteboard_account_state_subscriber.h`（账户状态订阅）
   - `pasteboard_serv_ipc_interface_code.h`（IPC 命令码）
   - `ipasteboard_*.h` 系列（观察者与延迟/实体回调接口）

2. 实现（src）
   - `pasteboard_service.cpp`（主服务实现）
   - `pasteboard_delay_manager.cpp`（延迟记录排序、取值）
   - `pasteboard_disposable_manager.cpp`（一次性回调生命周期）
   - `pasteboard_pattern.cpp`（正则识别规则与 HTML 文本提取）
   - `pasteboard_dialog.cpp`（弹框能力拉起）
   - `pasteboard_ability_manager.cpp`（能力管理器远端请求封装）
   - `pasteboard_window_manager.cpp`（窗口焦点 ID 获取）

## 核心组件（白盒层面）
1. `PasteboardService`（主控服务）
   - 主要角色：  
     - 处理 `Set/Get/Has/Clear/订阅/权限` 等请求入口。  
     - 组织本地/远端数据路径和状态机（超时、链接、事件通知）。
   - 关键锚点：
     - `[services/core/include/pasteboard_service.h:Clear](services/core/include/pasteboard_service.h)`
     - `[services/core/include/pasteboard_service.h:SetPasteData](services/core/include/pasteboard_service.h)`
     - `[services/core/include/pasteboard_service.h:GetPasteData](services/core/include/pasteboard_service.h)`
     - `[services/core/src/pasteboard_service.cpp:ClearInner](services/core/src/pasteboard_service.cpp)`
     - `[services/core/src/pasteboard_service.cpp:SetPasteData](services/core/src/pasteboard_service.cpp)`
     - `[services/core/src/pasteboard_service.cpp:GetPasteDataInner](services/core/src/pasteboard_service.cpp)`

2. `DelayManager`（延迟值记录管理）
   - 关键角色：  
     - 按记录/条目层级筛选 `std::monostate` 形式的延迟值条目。  
     - 按 MIME/UTD 优先级排序并回填。  
   - 关键锚点：
     - `[services/core/include/pasteboard_delay_manager.h:DelayManager](services/core/include/pasteboard_delay_manager.h)`
     - `[services/core/src/pasteboard_delay_manager.cpp:GetAllDelayEntryInfo](services/core/src/pasteboard_delay_manager.cpp)`
     - `[services/core/src/pasteboard_delay_manager.cpp:GetLocalEntryValue](services/core/src/pasteboard_delay_manager.cpp)`

3. `DisposableManager`（一次性读取窗口联动）
   - 关键角色：  
     - 注册一次性监听器并按焦点窗口匹配派发。  
     - 到期后超时回调清理。  
   - 关键锚点：
     - `[services/core/include/pasteboard_disposable_manager.h:DisposableManager](services/core/include/pasteboard_disposable_manager.h)`
     - `[services/core/src/pasteboard_disposable_manager.cpp:AddDisposableInfo](services/core/src/pasteboard_disposable_manager.cpp)`
     - `[services/core/src/pasteboard_disposable_manager.cpp:TryProcessDisposableData](services/core/src/pasteboard_disposable_manager.cpp)`
     - `[services/core/src/pasteboard_disposable_manager.cpp:ProcessMatchedInfo](services/core/src/pasteboard_disposable_manager.cpp)`

4. `PatternDetection`（内容识别）
   - 关键角色：  
     - 从文本/HTML 中识别 URL、电话号码、邮箱、航班号等。  
     - 对 HTML 内容先抽取文本再做正则匹配。  
   - 关键锚点：
     - `[services/core/include/pasteboard_pattern.h:PatternDetection::Detect](services/core/include/pasteboard_pattern.h)`
     - `[services/core/src/pasteboard_pattern.cpp:Detect](services/core/src/pasteboard_pattern.cpp)`
     - `[services/core/src/pasteboard_pattern.cpp:ExtractHtmlContent](services/core/src/pasteboard_pattern.cpp)`

5. `PasteboardDialog` + `PasteboardAbilityManager`
   - 关键角色：  
     - 将进度展示参数打包为 `Want`，通过 `AbilityManager` 拉起预置能力。  
   - 关键锚点：
     - `[services/core/include/pasteboard_dialog.h:PasteboardDialog::ShowProgress](services/core/include/pasteboard_dialog.h)`
     - `[services/core/src/pasteboard_dialog.cpp:ShowProgress](services/core/src/pasteboard_dialog.cpp)`
     - `[services/core/include/pasteboard_ability_manager.h:PasteboardAbilityManager::StartAbility](services/core/include/pasteboard_ability_manager.h)`
     - `[services/core/src/pasteboard_ability_manager.cpp:CheckUIExtensionIsFocused](services/core/src/pasteboard_ability_manager.cpp)`
     - `[services/core/src/pasteboard_ability_manager.cpp:StartAbility](services/core/src/pasteboard_ability_manager.cpp)`

6. 观察者与回调接口
   - 关键角色：  
     - `IPasteboardChangedObserver`：本地/远端变更与事件回调。  
     - `IPasteboardDisposableObserver`：一次性读取返回文本/错误码。  
     - `IEntityRecognitionObserver`：实体识别事件回调。  
     - `IPasteboardDelayGetter` / `IPasteboardEntryGetter`：延迟内容回拉回调。  
   - 关键锚点：
     - `[services/core/include/ipasteboard_changed_observer.h](services/core/include/ipasteboard_changed_observer.h)`
     - `[services/core/include/ipasteboard_disposable_observer.h](services/core/include/ipasteboard_disposable_observer.h)`
     - `[services/core/include/ientity_recognition_observer.h](services/core/include/ientity_recognition_observer.h)`
     - `[services/core/include/ipasteboard_delay_getter.h](services/core/include/ipasteboard_delay_getter.h)`
     - `[services/core/include/ipasteboard_entry_getter.h](services/core/include/ipasteboard_entry_getter.h)`

## 核心流程

### 流程 A：写入（SetPasteData）
1. 客户端请求落到 `PasteboardService::SetPasteData(int fd, int64_t rawDataSize, ...)`。  
   锚点：`[services/core/src/pasteboard_service.cpp:SetPasteData](services/core/src/pasteboard_service.cpp)`
2. 服务端校验文件描述符和大小后，调用 `WritePasteData` 反序列化 `PasteData`。  
   锚点：`[services/core/src/pasteboard_service.cpp:WritePasteData](services/core/src/pasteboard_service.cpp)`（在调用链可见）
3. 通过 `GetDataTokenId` 识别调用方 token 与来源权限约束，再交给 `SaveData` 入仓。  
   锚点：`[services/core/src/pasteboard_service.cpp:GetDataTokenId](services/core/src/pasteboard_service.cpp)` / `SaveData`
4. 入仓时会进行：
   - 数据归属设置、Webview 切片处理、分片记录等；
   - 设置超时销毁计时器；
   - 延迟数据回填策略；
   - 分布式数据设置与本地观察者通知。  
   锚点：`[services/core/src/pasteboard_service.cpp:SaveData](services/core/src/pasteboard_service.cpp)`
5. 若注册了 `DisposableManager`，在 `TryProcessDisposableData` 命中时可提前触发一次性回调并结束后续入库路径。  
   锚点：`[services/core/src/pasteboard_service.cpp:SetPasteData](services/core/src/pasteboard_service.cpp)` / `[services/core/src/pasteboard_disposable_manager.cpp:TryProcessDisposableData](services/core/src/pasteboard_disposable_manager.cpp)`

### 流程 B：读取（GetPasteData）
1. 调用 `GetPasteData`，并返回 `fd/size/rawData`。  
   锚点：`[services/core/src/pasteboard_service.cpp:GetPasteData](services/core/src/pasteboard_service.cpp)`
2. 进入 `GetPasteDataInner` 后做权限校验（`VerifyPermission`）和应用信息映射。  
   锚点：`[services/core/src/pasteboard_service.cpp:GetPasteDataInner](services/core/src/pasteboard_service.cpp)`
3. 依据分布式事件与屏幕状态，在 `GetData` 内决策本地数据或远端数据路径：
   - 有本地可用 + 条件满足：直接 `GetLocalData`
   - 远端可用：尝试 `GetRemoteData` 并建立/复用 P2P 链路。  
   锚点：`[services/core/src/pasteboard_service.cpp:GetData](services/core/src/pasteboard_service.cpp)` / `[services/core/include/pasteboard_service.h:OpenP2PLink]`
4. 将 `PasteData` 编码为 TLV；大数据走 ashmem，小数据走内存向量返回。  
   锚点：`[services/core/src/pasteboard_service.cpp:DealData](services/core/src/pasteboard_service.cpp)`

### 流程 C：查询/清空
1. `HasPasteData`、`HasRemoteData` 通过用户态/分发事件+`clips_` 缓存判断。  
   锚点：`[services/core/src/pasteboard_service.cpp:HasPasteData](services/core/src/pasteboard_service.cpp)` / `[services/core/src/pasteboard_service.cpp:HasRemoteData](services/core/src/pasteboard_service.cpp)`
2. `HasDataType / HasUtdType / GetMimeTypes` 依赖本地数据或事件路径获取 MIME/UTD。  
   锚点：`[services/core/include/pasteboard_service.h:HasDataType](services/core/include/pasteboard_service.h)` / `[services/core/src/pasteboard_service.cpp:HasDataType](services/core/src/pasteboard_service.cpp)`（及衍生实现）
3. `Clear` 与 `ClearByUser` 触发本地/分布式清理，并通知变更事件。  
   锚点：`[services/core/src/pasteboard_service.cpp:Clear](services/core/src/pasteboard_service.cpp)` / `[services/core/src/pasteboard_service.cpp:ClearInner](services/core/src/pasteboard_service.cpp)`

### 流程 D：观察者与事件
1. `SubscribeObserver/UnsubscribeObserver/UnsubscribeAllObserver` 按本地/远端/事件位图更新不同观察者 map。  
   锚点：`[services/core/src/pasteboard_service.cpp:SubscribeObserver](services/core/src/pasteboard_service.cpp)`
2. 事件发起点从读写和安全检查后，统一调用 `NotifyObservers` 派发。  
   锚点：`[services/core/src/pasteboard_service.cpp:NotifyObservers](services/core/src/pasteboard_service.cpp)`
3. 实体识别订阅通过 `SubscribeEntityObserver` 与 `NotifyEntityObservers` 按数据长度过滤触发。  
   锚点：`[services/core/include/pasteboard_service.h:SubscribeEntityObserver](services/core/include/pasteboard_service.h)` / `[services/core/src/pasteboard_service.cpp:NotifyEntityObservers](services/core/src/pasteboard_service.cpp)`

### 流程 E：延迟数据回填
1. `DelayManager` 按优先级映射记录延迟字段。  
   锚点：`[services/core/src/pasteboard_delay_manager.cpp:GetEntryPriority](services/core/src/pasteboard_delay_manager.cpp)`
2. `GetAllDelayEntryInfo / GetPrimaryDelayEntryInfo` 过滤 monostate entry 并排序。  
   锚点：`[services/core/src/pasteboard_delay_manager.cpp:GetAllDelayEntryInfo](services/core/src/pasteboard_delay_manager.cpp)`
3. `GetLocalEntryValue` 调用远端/注入回调 `IPasteboardEntryGetter` 实际抓取缺失内容。  
   锚点：`[services/core/src/pasteboard_delay_manager.cpp:GetLocalEntryValue](services/core/src/pasteboard_delay_manager.cpp)`

### 流程 F：实体识别与一次性回调
1. `PatternDetection::Detect` 遍历主记录与可用文本片段，使用正则集合识别实体类型。  
   锚点：`[services/core/src/pasteboard_pattern.cpp:Detect](services/core/src/pasteboard_pattern.cpp)`
2. `RecognizePasteData` 触发实体识别后，按监听条件回调 `IEntityRecognitionObserver::OnRecognitionEvent`。  
   锚点：`[services/core/include/pasteboard_service.h:RecognizePasteData](services/core/include/pasteboard_service.h)` / `pasteboard_service.cpp` 中对应实现链
3. `DisposableManager` 使用焦点窗口 ID 过滤，一旦匹配立即尝试返回文本，否则清空队列并回报不匹配。  
   锚点：`[services/core/src/pasteboard_disposable_manager.cpp:TryProcessDisposableData](services/core/src/pasteboard_disposable_manager.cpp)`  
   锚点：`[services/core/include/pasteboard_window_manager.h:GetFocusWindowId](services/core/include/pasteboard_window_manager.h)`

## 核心结构与关键约束
1. 数据模型锚点：
   - `AppInfo`/`HistoryInfo`：应用和历史追踪上下文。  
     锚点：`[services/core/include/pasteboard_service.h:AppInfo](services/core/include/pasteboard_service.h)`
   - `PasteDateTime/PasteDateResult`：远端拉取返回元信息。  
     锚点：`[services/core/include/pasteboard_service.h:PasteDateTime](services/core/include/pasteboard_service.h)`
   - `DelayEntryInfo`：延迟字段优先级与 record 关系。  
     锚点：`[services/core/include/pasteboard_delay_manager.h:DelayEntryInfo](services/core/include/pasteboard_delay_manager.h)`
   - `DisposableInfo`：一次性回调注册元数据（窗口/长度/类型/超时反馈）。  
     锚点：`[services/core/include/pasteboard_disposable_manager.h:DisposableInfo](services/core/include/pasteboard_disposable_manager.h)`

2. 并发控制：
   - `pasteDataMutex_`、多个 `std::mutex`、`shared_mutex`、`ConcurrentMap` 在 `PasteboardService` 与管理器内用于并发保护。  
   - `setting_` 原子位用于防止并发写入竞态。  
   锚点：`[services/core/include/pasteboard_service.h:pasteDataMutex_](services/core/include/pasteboard_service.h)` / `setting_` / `SetPasteData`

3. 生命周期与容量约束：
   - 本地最大容量、默认容量、最小容量等在服务头文件定义。  
     锚点：`[services/core/include/pasteboard_service.h:MIN_LOCAL_CAPACITY](services/core/include/pasteboard_service.h)` / `MAX_LOCAL_CAPACITY`
   - `AGE` 清理与延时清理 timer 由 `SetDataExpirationTimer` 和 `ClearAgedData` 执行。  
     锚点：`[services/core/src/pasteboard_service.cpp:SetDataExpirationTimer](services/core/src/pasteboard_service.cpp)` / `ClearAgedData`
   - 一次性回调超时时间支持参数 `pasteboard.disposable_expiration` 与上下界。  
     锚点：`[services/core/src/pasteboard_disposable_manager.cpp:AddDisposableInfo](services/core/src/pasteboard_disposable_manager.cpp)`

4. IPC 约束：
   - 服务命令码、观察者回调码、一次性回调码、实体码集中在 `pasteboard_serv_ipc_interface_code.h`。  
     锚点：`[services/core/include/pasteboard_serv_ipc_interface_code.h:PasteboardServiceInterfaceCode](services/core/include/pasteboard_serv_ipc_interface_code.h)`

5. 安全与权限约束：
   - 读写操作与报告路径存在 `VERIFY_PERMISSION` / `Read/Secure` 分支与 App 权限映射。  
     锚点：`[services/core/src/pasteboard_service.cpp:GetPasteDataInner](services/core/src/pasteboard_service.cpp)`  
     （内部引用了 `SECURE_PASTE_PERMISSION`、`READ_PASTEBOARD_PERMISSION` 常量）

## 运行手册（含构建 / 校验 / 发布 / 回滚）

### 构建（Build）
1. 【确认】仓库内存在服务实现与发布配置文件路径（非完整证据）：
   - Core 实现文件位于 `services/core/src`，声明在 `services/core/include`。  
2. 【推断】建议按 OpenHarmony 模块标准进行整仓/子系统构建（需结合当前分支的实际构建脚本执行），优先构建 `distributeddatamgr` 相关目标或组件单元。  
3. 【推断】未在当前证据中检出明确的 `core` 独立 build 命令；如需最小化验证，可在集成流水线中构建该模块所在系统包。

### 校验（Validation）
1. 【确认】服务启动会执行 `Init` 与 `OnStart` 注册路径，含 `Publish`、监听注册与命令注册。  
   锚点：`[services/core/src/pasteboard_service.cpp:Init](services/core/src/pasteboard_service.cpp)` / `OnStart`
2. 【确认】可用以下行为点做冒烟：
   - `SetPasteData` 后 `HasPasteData` 为真；
   - `GetMimeTypes` 返回非空；
   - `GetPasteData` 能获取可反序列化 TLV；
   - 清空后 `HasPasteData` 变为假。
3. 【推断】验证方式可通过系统测试或 CLI：`ohos-pasteboard` 命令层可反查服务状态与内容（命令文档在工具子目录）。  
   依据：`tools/ohos-pasteboard/docs/README.md` 定义 set/get/has/clear 流程。

### 发布（Deployment）
1. 【确认】服务为 `SystemAbility` 注册对象，需与系统能力启动生命周期配合。  
   锚点：`[services/core/src/pasteboard_service.cpp:G_REGISTER_RESULT](services/core/src/pasteboard_service.cpp)` / `SystemAbility`
2. 【推断】部署路径：系统镜像更新后重启相关 system ability；对线上验证需观察 `pasteboard_service` 发布日志与 subscriber 注册状态。

### 回滚（Rollback）
1. 【推断】回滚策略：
   - 回退到上一版本二进制；
   - 重置服务侧配置参数；
   - 清理或关闭新增回调窗口/事件订阅，避免旧逻辑残留。
2. 【确认】服务具备 `OnStop`/`~PasteboardService` 的退出清理入口与事件解订阅动作，可用于最小影响回退。  
   锚点：`[services/core/src/pasteboard_service.cpp:OnStop](services/core/src/pasteboard_service.cpp)`

### 失败模式与处理建议
1. 写入返回 `invalid param / serialization / prohibit copy / no permission`：优先检查 fd/长度、调用方 token、目标 MIME 与权限。  
2. 获取返回空或超时：检查 `GetData` 的本地/远端分支是否走中断路径，重点看 `GetValidDistributeEvent`、屏幕状态、P2P 建链状态。  
3. 一次性回调无响应：检查焦点窗口匹配及参数 `targetWindowId`、`maxLen`、订阅时长配置。  
4. 观察者不触发：核对 `ObserverType` 组合位与用户 ID 映射是否正确。  
   锚点：`SubscribeObserver` / `NotifyObservers`

## 调试指引（按模块）
| 模块 | 常见症状 | 可能根因 | 优先检查文件 |
|---|---|---|---|
| `PasteboardService` | `SetPasteData` 成功返回但读取失败 | `SaveData` 后通知链路或分布式状态不一致 | `services/core/src/pasteboard_service.cpp`（`SetPasteData`, `SaveData`, `NotifyObservers`）, `services/core/include/pasteboard_service.h` |
| `PasteboardService` | `HasRemoteData` 总是 false/false-positive | 屏幕锁状态、`GetValidDistributeEvent` 分支、`HasRemoteUri` 判定 | `services/core/src/pasteboard_service.cpp`（`HasRemoteData`, `GetData`, `HasRemoteUri`） |
| `DelayManager` | 某些延迟内容一直不回填 | 未命中 monostate 条目或优先级过滤/排序 | `services/core/include/pasteboard_delay_manager.h`, `services/core/src/pasteboard_delay_manager.cpp` |
| `DisposableManager` | 订阅后无回调或提前超时 | `targetWindowId` 不匹配、权限不符、超时参数 | `services/core/include/pasteboard_disposable_manager.h`, `services/core/src/pasteboard_disposable_manager.cpp`, `services/core/include/pasteboard_window_manager.h` |
| `PatternDetection` | 实体识别漏报/误报 | 正则表未覆盖、HTML 清洗失败、`hasPlain/hasHTML` 输入不完整 | `services/core/src/pasteboard_pattern.cpp` |
| 观察者订阅 | 回调不触发 | `ObserverType` 位掩码错误、用户维度 map 错误、注册 UID 校验 | `services/core/src/pasteboard_service.cpp:SubscribeObserver/UnsubscribeObserver/NotifyObservers` |
| 进度弹框 | 预置弹框不出现 | 参数 `Want` 缺失或 `StartAbility` 失败 | `services/core/src/pasteboard_dialog.cpp`, `services/core/include/pasteboard_ability_manager.h`, `services/core/src/pasteboard_ability_manager.cpp` |

## 确认度与边界
1. 【确认】本模块文件清单与主要方法、类和常量的来源直接来自 `services/core/include` 与 `services/core/src` 的源码片段；上述结构与流程以代码符号为准。  
2. 【确认】`pasteboard_event`/`clipPlugin` 的全部实现细节在本范围外未展开，涉及分发链路细节采用接口与调用链推导。  
3. 【推断】关于 build 命令、系统级重启与部署步骤，当前证据不含确凿命令模板，故采用“流程级”描述并标注为操作链路推断。  
4. 【缺失证据】源码中未提供 `src` 下部分函数（如完整 `SetPasteData` 上游/下游所有调用点）完整 1:1 运行链条；文档中未超过已读到的函数体范围的行为细节。

# Ohos Pasteboard 中间设计文档（CLI 组件）

## 1. 模块定位

**作用**  
`tools/ohos-pasteboard` 是 OpenHarmony 的剪贴板命令行工具（`ohos-pasteboard`），承担“本地文本/HTML/URI 剪贴板数据读写与状态查询”的单点入口，提供面向运维/脚本/自动化场景的统一 CLI 访问。该模块不承载系统级剪贴板服务实现，而是作为调用 `PasteboardClient` 的上层适配层。

**证据锚点**  
- 工具说明与安装信息：[`docs/README.md`](tools/ohos-pasteboard/docs/README.md)  
- 命令执行目标/路径定义：[`ohos-pasteboard.json`](tools/ohos-pasteboard/ohos-pasteboard.json)  
- 工具入口：[`src/main.cpp#L24`](tools/ohos-pasteboard/src/main.cpp)

## 2. 目录结构与文件职责（白盒）

| 路径 | 角色 |
|---|---|
| `src/main.cpp` | CLI 入口，收集参数并触发命令执行入口 |
| `src/executor.cpp` | 全局命令注册、帮助生成、命令路由与分发 |
| `src/parser.cpp` | 参数解析与参数校验（`--text/--html/--uri`、`--type`） |
| `src/printer.cpp` | 统一 JSON 输出构造（成功/失败）与帮助输出 |
| `src/error_handler.cpp` | `PasteboardError` 到标准错误码映射 |
| `src/{set, get, clear, has-data, has-data-type, has-remote-data}_command.cpp` | 各命令的执行实现 |
| `include/*.h` | 命令接口、解析器、执行器、打印器、错误处理器声明 |
| `tests/*.cpp` | 解析、执行、错误映射、集成流程的单元测试与集成测试 |
| `docs/*.md` | 命令约定、错误码、JSON 结构、测试矩阵 |
| `ohos-pasteboard.json` | CLI 子命令、权限与 I/O schema 元信息 |

## 3. 核心组件（白盒层次）

### 3.1 命令抽象与注册

- `Command`：纯虚接口，定义命令元信息与执行入口（`GetName/GetDescription/GetUsage/GetExamples/GetParameters/Execute`）。  
  锚点：[`include/command.h`](tools/ohos-pasteboard/include/command.h)
- `CommandRegistry`：单例命令注册中心，按名称查找命令并返回所有命令名。  
  锚点：[`CommandRegistry`](tools/ohos-pasteboard/include/command.h)
- `ExecuteCommand`：执行管道入口，处理空参、`--help`、未知命令、命令级 `--help` 与具体命令执行。  
  锚点：[`src/executor.cpp:ExecuteCommand`](tools/ohos-pasteboard/src/executor.cpp)

### 3.2 参数解析器

- `ParamParser`：通用参数按键查找（`FindParam`）和存在性检测（`HasParam`）。  
  锚点：[`src/parser.cpp:ParamParser`](tools/ohos-pasteboard/src/parser.cpp)
- `SpecialParser::ParseSetData`：要求至少一个 `--text/--html/--uri`，提取并保持原始顺序；参数缺失或空值会报错。  
  锚点：[`src/parser.cpp:SpecialParser::ParseSetData`](tools/ohos-pasteboard/src/parser.cpp)
- `SpecialParser::ParseHasDataType`：要求 `--type` 存在；仅返回字符串，不做 MIME 格式白名单校验。  
  锚点：[`src/parser.cpp:SpecialParser::ParseHasDataType`](tools/ohos-pasteboard/src/parser.cpp)

### 3.3 输出与错误策略

- `OutputPrinter::PrintSuccess` / `PrintError`：统一输出 `{type:"result", status:...}`，错误含 `errCode/errMsg/suggestion`。  
  锚点：[`src/printer.cpp`](tools/ohos-pasteboard/src/printer.cpp)
- `ErrorHandler`：将 `PasteboardError` 映射到 CLI 错误码，分为“设置类”和“获取类”。  
  锚点：[`src/error_handler.cpp`](tools/ohos-pasteboard/src/error_handler.cpp)

### 3.4 命令实现（6 个子命令）

- `SetDataCommand`：构建 `PasteData` 与 `PasteDataRecord`，调用 `PasteboardClient::SetPasteData`。  
  锚点：[`src/set_data_command.cpp`](tools/ohos-pasteboard/src/set_data_command.cpp)
- `GetDataCommand`：调用 `PasteboardClient::GetPasteData`，序列化 records。  
  锚点：[`src/get_data_command.cpp`](tools/ohos-pasteboard/src/get_data_command.cpp)
- `ClearDataCommand`：调用 `PasteboardClient::Clear`。  
  锚点：[`src/clear_data_command.cpp`](tools/ohos-pasteboard/src/clear_data_command.cpp)
- `HasDataCommand`：调用 `PasteboardClient::HasPasteData`。  
  锚点：[`src/has_data_command.cpp`](tools/ohos-pasteboard/src/has_data_command.cpp)
- `HasDataTypeCommand`：调用 `PasteboardClient::HasDataType`。  
  锚点：[`src/has_data_type_command.cpp`](tools/ohos-pasteboard/src/has_data_type_command.cpp)
- `HasRemoteDataCommand`：调用 `PasteboardClient::HasRemoteData`。  
  锚点：[`src/has_remote_data_command.cpp`](tools/ohos-pasteboard/src/has_remote_data_command.cpp)

## 4. 核心流程

1. 进程启动收集参数并委托 `ExecuteCommand`。  
   锚点：[`src/main.cpp`](tools/ohos-pasteboard/src/main.cpp) + [`src/executor.cpp`](tools/ohos-pasteboard/src/executor.cpp)
2. `ExecuteCommand` 初始化命令表（6 个命令），并根据第一个 token 找到命令。  
   锚点：[`src/executor.cpp:RegisterAllCommands`](tools/ohos-pasteboard/src/executor.cpp)
3. 命令参数含 `--help` 时打印帮助；否则调用具体命令 `Execute`。  
   锚点：[`src/executor.cpp`](tools/ohos-pasteboard/src/executor.cpp)
4. 每个命令：
   - 获取 `PasteboardClient::GetInstance()`；若为空直接返回 `ERR_INTERNAL_ERROR`。
   - 调用对应客户端 API（set/get/clear/has*）。
   - 根据返回码输出成功 JSON 或经 `ErrorHandler` 转码后输出错误 JSON。  
   锚点：各命令实现 + [`src/error_handler.cpp`](tools/ohos-pasteboard/src/error_handler.cpp)

## 5. 接口与数据结构（模块内白盒定义）

### 5.1 命令与行为

| 子命令 | 入口类 | 关键接口 | 主要输入 | 主要输出 |
|---|---|---|---|---|
| set-data | `SetDataCommand` | `Execute` | `--text/--html/--uri` 至少一项 | `primaryMimeType` / `recordCount` |
| get-data | `GetDataCommand` | `Execute` | 无 | `records[]`, `recordCount`, `mimeTypes[]` |
| clear-data | `ClearDataCommand` | `Execute` | 无 | 空数据对象 |
| has-data | `HasDataCommand` | `Execute` | 无 | `hasData` |
| has-data-type | `HasDataTypeCommand` | `Execute` | `--type` | `hasType`, `type` |
| has-remote-data | `HasRemoteDataCommand` | `Execute` | 无 | `hasRemoteData` |

- 命令声明与 I/O schema 在 `ohos-pasteboard.json` 中有约束定义，且 `get-data`/`set-data` 的返回字段可被 schema 与实现代码互相印证。  
  锚点：[`ohos-pasteboard.json`](tools/ohos-pasteboard/ohos-pasteboard.json)

### 5.2 内部参数结构

- `SpecialParser::SetDataResult`：`success/errMsg/orderedParams`（保留参数顺序）。  
  锚点：[`include/parser.h:SpecialParser::SetDataResult`](tools/ohos-pasteboard/include/parser.h)
- `SpecialParser::HasDataTypeResult`：`success/errMsg/type`。  
  锚点：[`include/parser.h:SpecialParser::HasDataTypeResult`](tools/ohos-pasteboard/include/parser.h)

### 5.3 错误码体系

- 模块文档列举了标准错误码（例如 `ERR_PERMISSION_DENIED/ERR_DATA_EXPIRED/ERR_SERVICE_UNAVAILABLE` 等）。  
  锚点：[`docs/README.md`](tools/ohos-pasteboard/docs/README.md)
- 实际映射来自两个表：设置类和获取类。  
  锚点：[`src/error_handler.cpp`](tools/ohos-pasteboard/src/error_handler.cpp)

## 6. 关键约束与边界条件

1. 本工具目标数据类型限定为 HTML、URI、纯文本（文档与实现一致）。  
   锚点：[`docs/README.md`](tools/ohos-pasteboard/docs/README.md)、[`include/set_data_command.h`](tools/ohos-pasteboard/include/set_data_command.h)、[`src/set_data_command.cpp`](tools/ohos-pasteboard/src/set_data_command.cpp)
2. `set-data` 至少必须提供一个有效参数；全空/缺参直接返回 `ERR_ARG_INVALID`（由解析器 + 命令层联合返回）。  
   锚点：[`src/parser.cpp:ParseSetData`](tools/ohos-pasteboard/src/parser.cpp)、[`src/set_data_command.cpp:Execute`](tools/ohos-pasteboard/src/set_data_command.cpp)
3. `has-data-type` 只做参数存在性检查，不做 MIME 格式白名单验证；运行时行为可能接受非标准值。  
   锚点：[`src/parser.cpp:ParseHasDataType`](tools/ohos-pasteboard/src/parser.cpp)、[`ohos-pasteboard.json`](tools/ohos-pasteboard/ohos-pasteboard.json)
4. 获取/设置失败统一以 JSON 失败响应返回，不抛异常。  
   锚点：[`src/printer.cpp`](tools/ohos-pasteboard/src/printer.cpp)
5. 帮助输出不返回 JSON，而是直接 `stdout` 打印。  
   锚点：[`src/printer.cpp:PrintHelp`](tools/ohos-pasteboard/src/printer.cpp)、[`src/executor.cpp`](tools/ohos-pasteboard/src/executor.cpp)、[`tests/executor_test.cpp`](tools/ohos-pasteboard/tests/executor_test.cpp)

## 7. 主要测试与质量证据

- 文档测试覆盖：解析器 15、打印 3、错误处理 12、执行器 10、集成 8，共 46。  
  锚点：[`docs/TEST.md`](tools/ohos-pasteboard/docs/TEST.md)
- 单测与集成分布在五个 suite：`ParserTest`、`PrinterTest`、`ErrorHandlerTest`、`ExecutorTest`、`IntegrationTest`。  
  锚点：[`tests/parser_test.cpp`](tools/ohos-pasteboard/tests/parser_test.cpp)、[`tests/printer_test.cpp`](tools/ohos-pasteboard/tests/printer_test.cpp)、[`tests/error_handler_test.cpp`](tools/ohos-pasteboard/tests/error_handler_test.cpp)、[`tests/executor_test.cpp`](tools/ohos-pasteboard/tests/executor_test.cpp)、[`tests/integration_test.cpp`](tools/ohos-pasteboard/tests/integration_test.cpp)
- 测试构建目标与依赖信息在 `tests/BUILD.gn`，用于与主模块联动编译。  
  锚点：[`tests/BUILD.gn`](tools/ohos-pasteboard/tests/BUILD.gn)

## 8. 调试指导（按模块）

| 模块 | 典型症状 | 首选定位点 |
|---|---|---|
| 命令路由 | `ohos-pasteboard foo` 返回 `ERR_CMD_INVALID` | [`src/executor.cpp:ExecuteCommand`](tools/ohos-pasteboard/src/executor.cpp) |
| 全局/子命令帮助异常 | 无输出或输出格式错误 | [`src/executor.cpp:BuildGlobalHelp/BuildCommandHelp`](tools/ohos-pasteboard/src/executor.cpp) + 对应测试 |
| 参数解析错误 | `set-data` 返回 `ERR_ARG_INVALID` 或 `ERR_ARG_MISSING` | [`src/parser.cpp`](tools/ohos-pasteboard/src/parser.cpp) + `tests/parser_test.cpp` |
| set-data 无法写入 | `set-data` 返回错误码（如 `ERR_SERVICE_UNAVAILABLE`） | [`src/set_data_command.cpp:SetDataCommand::Execute`](tools/ohos-pasteboard/src/set_data_command.cpp)、[`src/error_handler.cpp:HandleSetPasteDataError`](tools/ohos-pasteboard/src/error_handler.cpp) |
| get-data 返回失败 | `ERR_PERMISSION_DENIED`/`ERR_NO_DATA` 等 | [`src/get_data_command.cpp`](tools/ohos-pasteboard/src/get_data_command.cpp)、[`src/error_handler.cpp:HandleGetPasteDataError`](tools/ohos-pasteboard/src/error_handler.cpp) |
| has-* 命令全为空 | `hasData/hasType` 总是 false 但预期有值 | [`src/*_command.cpp`](tools/ohos-pasteboard/src/has_data_command.cpp)、`PasteboardClient::GetInstance()` 可用性 |
| JSON 输出格式偏差 | `type`/`status` 不符合 schema | [`src/printer.cpp`](tools/ohos-pasteboard/src/printer.cpp)、`docs/TEST.md` 验证项 |

## 9. 运行手册（基于现有证据）

### 9.1 构建（源代码级）
- 模块目标定义：[`BUILD.gn`](tools/ohos-pasteboard/BUILD.gn)（`ohos_cli_executable("ohos-pasteboard")`）
- 测试目标：`tests/BUILD.gn` 中 `ohos_unittest("ExecuteCommandTest")`  
  锚点：[`tests/BUILD.gn`](tools/ohos-pasteboard/tests/BUILD.gn)
- 文档给出的可参考构建命令（测试链）：`hb build pasteboard -t --no-prebuilt-sdk --ignore-api-check --skip-partlist-check --skip-download --skip-prebuilts`  
  锚点：[`docs/TEST.md`](tools/ohos-pasteboard/docs/TEST.md)

### 9.2 验证
- 集成测试工作流与单测执行命令见文档。  
  锚点：[`docs/TEST.md`](tools/ohos-pasteboard/docs/TEST.md)
- 预期：`46` 用例、`5` 测试套件、`46` tests from 5 suites（由文档描述）。  
  锚点：[`docs/TEST.md`](tools/ohos-pasteboard/docs/TEST.md)

### 9.3 部署
- 目标安装路径：`/system/bin/cli_tool/executable/ohos-pasteboard`。  
  锚点：[`docs/README.md`](tools/ohos-pasteboard/docs/README.md)、[`ohos-pasteboard.json:executablePath`](tools/ohos-pasteboard/ohos-pasteboard.json)
- 子命令能力与输出 schema 在 `ohos-pasteboard.json` 定义。  
  锚点：[`ohos-pasteboard.json`](tools/ohos-pasteboard/ohos-pasteboard.json)

### 9.4 回滚
- 源码层无显式回滚脚本；按当前证据应采用部署层回滚（替换可执行文件/恢复镜像版本）。  
  说明：该行为为部署策略推断，不在当前源码中直接给出。

### 9.5 常见失败模式
- `ERR_INTERNAL_ERROR`：`PasteboardClient::GetInstance()` 为空。  
  触发点：各命令 `Execute` 首步空实例检查。  
- `ERR_ARG_INVALID`：`set-data` 无参数/参数空值。  
  触发点：`ParseSetData`。  
- `ERR_ARG_MISSING`：`has-data-type` 缺 `--type`。  
  触发点：`HasDataTypeCommand::Execute`。  
- `ERR_PERMISSION_DENIED`：涉及读取权限场景返回。  
  触发点：`HandleGetPasteDataError` 映射到 `PERMISSION_VERIFICATION_ERROR`。

## 10. 证据边界

### 10.1 已有源码/文档直接确认
- 命令路由、注册、帮助、错误返回链路。  
- `set/get/clear/has*` 六类命令实现存在且使用 `PasteboardClient`。  
- 错误码映射表与 JSON 输出 schema 的实现。  
- 测试覆盖规模与五类套件分解。  
- 安装路径与子命令能力声明。

### 10.2 推断与缺失证据
- 回滚步骤、整机镜像级回退流程（源码未定义，需按厂商发布机制执行）。  
- `--type` 的最终白名单行为：虽然 JSON schema 限定了 `text/plain|text/html|text/uri`，解析层未严格校验；实际可接受值边界在 CLI 层更偏向“运行时下发后返回服务方结果”，需结合运行态验证确认。  
- `set-data` 使用多参数时实际“单记录承载多 MIME 条目”的内部语义是基于源码实现推导（`orderedParams` 仅第一个参数用于主记录创建，后续 `AddEntryByMimeType` 追加到同一 `record`）。

# Dialog 模块设计文档（中间稿）

## 1. 模块目的（模块化裁剪结论）

`services/dialog/PasteboardDialog` 是 `distributeddatamgr_pasteboard` 中的独立 UI/扩展能力子模块，定位于剪贴板相关对话与扩展能力接入。  
从文件名可确认该模块包含：
- 一个应用生命周期入口：[MyAbilityStage.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\Application\MyAbilityStage.ts)
- 一个扩展能力分支：[ToastExtensionAbility.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\ServiceExtAbility\ToastExtensionAbility.ts)
- 全局参数/上下文支撑：[GlobalContext.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\PasteboardProgressAbility\GlobalContext.ts)、[GlobalParam.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\ServiceExtAbility\GlobalParam.ts)

## 2. 目录结构与文件清单

| 目录/文件 | 角色 | 说明 |
|---|---|---|
| `services/dialog/PasteboardDialog/.gitignore` | 元文件 | 忽略规则（模块根） |
| `services/dialog/PasteboardDialog/AppScope/app.json` | 应用配置 | 应用级描述与元信息 |
| `services/dialog/PasteboardDialog/AppScope/resources/base/element/string.json` | 资源 | 基础字符串资源 |
| `services/dialog/PasteboardDialog/entry/.gitignore` | 元文件 | 入口目录忽略规则 |
| `services/dialog/PasteboardDialog/entry/hvigorfile.js` | 构建脚本 | 模块级构建入口 |
| `services/dialog/PasteboardDialog/entry/src/main/ets/Application/MyAbilityStage.ts` | 生命周期 | 应用生命周期入口（入口类） |
| `services/dialog/PasteboardDialog/entry/src/main/ets/PasteboardProgressAbility/GlobalContext.ts` | 全局上下文 | 全局状态/共享对象 |
| `services/dialog/PasteboardDialog/entry/src/main/ets/ServiceExtAbility/GlobalParam.ts` | 参数模型 | 扩展能力参数承载 |
| `services/dialog/PasteboardDialog/entry/src/main/ets/ServiceExtAbility/ToastExtensionAbility.ts` | 扩展能力 | ServiceExt Ability 的业务入口 |
| `services/dialog/PasteboardDialog/entry/src/main/module.json` | 模块声明 | Ability 与能力点配置 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/base/profile/main_pages.json` | 页面入口 | 主页面清单（当前树中未看到对应页面文件，需核对） |
| `services/dialog/PasteboardDialog/entry/src/main/resources/base/profile/configuration.json` | 配置文件 | 运行/页面配置 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/*/element/string.json` | 本地化 | 多语言字符串资源 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/base/element/color.json` | 主题资源 | 颜色资源 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/dark/element/color.json` | 主题资源 | 深色主题颜色 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/rawfile/searchConfig/searchPage.json` | 原始配置 | 非资源表单的运行时配置 |
| `services/dialog/PasteboardDialog/hvigor/hvigor-wrapper.js` | 构建封装 | 任务执行封装 |
| `services/dialog/PasteboardDialog/hvigorfile.js` | 入口构建 | 顶层工程构建脚本 |

## 3. 核心组件与职责映射（含源码锚点）

| 组件/锚点 | 可见符号（文件名推断） | 作用 | 重要性 |
|---|---|---|---|
| [MyAbilityStage.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\Application\MyAbilityStage.ts) | `MyAbilityStage` | 应用级生命周期控制（启动/初始化） | 决定模块是否能被系统正确调度 |
| [GlobalContext.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\PasteboardProgressAbility\GlobalContext.ts) | `GlobalContext`（推断） | 保存跨能力调用的上下文/状态 | 确保能力间状态一致 |
| [GlobalParam.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\ServiceExtAbility\GlobalParam.ts) | `GlobalParam`（推断） | 解析/承载启动参数 | 影响 toast/对话展示行为 |
| [ToastExtensionAbility.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\ServiceExtAbility\ToastExtensionAbility.ts) | `ToastExtensionAbility`（推断） | 剪贴板对话/提示扩展能力入口 | 直接暴露用户可见行为 |
| [module.json](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\module.json) | manifest 节点 | 注册 ability 与能力特征 | 与系统绑定能力的关键配置 |
| [app.json](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\AppScope\app.json) | 应用声明 | 描述应用 id/配置信息 | 与系统安装和加载生命周期相关 |

## 4. 核心流程（基于证据+推断分层）

1. 系统加载 `AppScope/app.json` 与 `entry/src/main/module.json` 完成组件注册，确定 `ToastExtensionAbility` 可见性。  
   - 锚点：`AppScope/app.json`、`entry/src/main/module.json`
2. 运行时触发扩展能力时，进入应用生命周期，`MyAbilityStage` 执行初始化与注册。  
   - 锚点：`MyAbilityStage.ts`
3. 启动参数通过 `GlobalParam` 解析入参，构建共享上下文。  
   - 锚点：`GlobalParam.ts`、`GlobalContext.ts`
4. 能力具体逻辑在 `ToastExtensionAbility` 中执行，最终依赖本地化与配色资源完成界面和提示语输出。  
   - 锚点：`ToastExtensionAbility.ts`、`* /string.json`、`* /color.json`
5. 配置与页面入口从 `configuration.json`、`main_pages.json` 与资源文件组合加载。  
   - 锚点：`main_pages.json`、`configuration.json`

> 注：第 2~5 步为基于 OpenHarmony 扩展能力命名约定的推断流程，当前证据仅含文件名与配置清单，未提供源码正文。

## 5. 接口与数据结构

| 数据对象 | 来源文件 | 已确认内容 | 推断说明 |
|---|---|---|---|
| 模块声明与能力声明 | `entry/src/main/module.json` | 存在文件，属于能力注册与模块属性 | 具体 ability 名称/abilityType 需打开文件确认 |
| 应用声明与范围 | `AppScope/app.json` | 存在应用级元信息文件 | 约束应用身份、权限、版本 |
| 生命周期/状态 | `MyAbilityStage.ts` | 存在生命周期入口文件 | 典型包含 `onCreate`/`onDestroy` 等 |
| 参数模型 | `GlobalParam.ts` | 存在参数定义文件 | 典型用于 `want` 透传与参数解析 |
| 上下文共享 | `GlobalContext.ts` | 存在全局上下文文件 | 可能包含单例/全局变量/工具对象 |
| 文本与颜色资源 | 各语言 `string.json`、`color.json` | 多语与主题资源已完整覆盖 | 用于 toast 文案、样式一致性 |
| 原始配置 | `rawfile/searchConfig/searchPage.json` | 存在运行时原始配置 | 用于非编译时读取的页面或查询行为 |

## 6. 关键约束与边界

| 约束类别 | 内容 | 影响 |
|---|---|---|
| 模块边界 | 当前证据仅覆盖 `services/dialog/PasteboardDialog`，无服务核心实现源码片段 | 不能推导与核心 pasteboard service 的直接内部交互细节 |
| 证据缺口 | 未提供上述 TypeScript 文件正文 | 所有业务函数签名与具体业务逻辑需以源码实际内容二次确认 |
| 资源完整性 | 多语言字符串文件覆盖 `ar/de/es/.../zz_ZX` | 页面文本本地化应在新语种接入时保持一致 |
| 页面入口一致性 | 存在 `main_pages.json` 但树上未见 page 文件 | 需要确认页面文件是否在其他路径或构建时动态生成 |
| 配置一致性 | 同时存在 `AppScope` 和 `entry` 下构建脚本 | 两层构建/签名配置可能出现重复配置冲突 |
| 平台依赖 | 基于 OpenHarmony 义务约定的 ability/extension 生命周期 | 运行失败时首先排查能力注册与 manifest 配置 |

## 7. 运行手册（Runbook）

### Build
1. 在仓库层或模块层执行构建前先确认 `hvigorfile.js` 与 `hvigor/hvigor-wrapper.js` 可解析。  
   - 锚点：`PasteboardDialog/hvigorfile.js`、`PasteboardDialog/hvigor/hvigor-wrapper.js`
2. 以 `hvigor` 为入口执行模块构建，产物应可用于安装/签名链路。  
3. 若构建失败，优先核对 `entry/hvigorfile.js` 与 `entry/src/main/module.json`。

### Validation
1. 安装成功后触发相关扩展能力启动路径，确认 toast 或进度提示是否可见。  
2. 检查 `global`/`dark`/多语言资源是否落地生效。  
3. 校验 `main_pages.json` 与实际页面映射一致，避免空白页面启动。

### Deployment
1. 与系统发布链路一致，按模块发布策略打包到目标设备。  
2. 首发应使用配置最小化：仅保留 `base` + 目标 locale 资源和必要 extension。  
3. 若为新地区版本，增加对应语言 `string.json` 并回归 UI 文案。

### Rollback
1. 回退到上一版模块 HAP。  
2. 同步回退 `module.json`/`app.json` 与 `configuration.json` 的历史版本，避免 manifest 与资源不一致。  
3. 检查资源文件 `string.json` 是否出现键缺失导致回退界面不一致。

### Failure-mode notes
- 能力启动失败：高概率是 manifest 注册与能力类不一致。  
- 空白弹窗/无展示：高概率是 `main_pages.json` 与页面入口不一致。  
- 文案空白或乱码：高概率是 locale key 缺失/资源路径不一致。  
- 构建通过但运行异常：高概率是 entry 与 AppScope 配置存在差异。

## 8. 调试指导（按主要模块）

| 模块 | 常见症状 | 可能源区 | 检查文件/命令 |
|---|---|---|---|
| 生命周期模块 | 安装后无日志、能力不被触发 | `MyAbilityStage` 未进入预期回调 | `[MyAbilityStage.ts]`（构造/生命周期方法） |
| 扩展能力模块 | toast 不显示/异常关闭 | `ToastExtensionAbility` 处理链或参数解析失败 | `[ToastExtensionAbility.ts]` 与 `[GlobalParam.ts]` |
| 全局状态模块 | 多次触发后行为紊乱 | 上下文生命周期或单例污染 | `[GlobalContext.ts]`（状态初始化/重置点） |
| 配置与页面 | 启动后白屏或报页面不存在 | `main_pages.json` 与页面清单不一致 | `[main_pages.json]`、`[configuration.json]` |
| 国际化/主题 | 文案回退、主题异常 | string/color 资源 key 缺失或 locale 匹配失败 | `base/element/string.json`、`dark/element/color.json`、其他 locale 的 `string.json` |
| 构建链路 | `hvigor` 构建失败或打包产物缺失 | 配置脚本或入口文件缺失 | `hvigorfile.js`、`entry/hvigorfile.js`、`hvigor-wrapper.js` |

## 9. 证据边界（源确认 vs 推断）

| 置信度类别 | 内容 |
|---|---|
| 源码可确认（Source-confirmed） | 文件/目录存在、模块路径、构建脚本、资源文件列表、多语言资源范围、与主仓库子系统关系（通过给定 README、模块树） |
| 推断（Inferred） | 能力具体执行流程、类名语义（如 `ToastExtensionAbility` 的业务行为）、参数/状态对象字段、build/deploy 命令细节、与粘贴板核心服务直接交互方式 |
| 证据缺失（Missing evidence） | `MyAbilityStage.ts`、`GlobalContext.ts`、`GlobalParam.ts`、`ToastExtensionAbility.ts` 的具体代码、`module.json`/`configuration.json` 的具体字段值、实际构建产物与运行日志 |

## 10. 与上层设计文档对接建议（供 design.md 复用）

- 该模块应作为“系统服务对话/扩展能力子系统”的独立子模块编写，不与核心剪贴板算法逻辑耦合。  
- 设计文档中可按「能力入口层（Ability）」与「配置资源层（module/app/resource）」拆分。  
- 需要补齐的高优先信息：`module.json` 与 `ToastExtensionAbility.ts` 的实际 symbol/方法签名。

# Load 模块中间设计文档（草案）

## 1. 模块目的与职责边界

Load 模块是剪贴板服务内部的启动期组件加载器，负责读取运行时配置并按配置动态加载服务扩展组件。  
它不直接实现粘贴板业务 API，而是提供“可插拔扩展初始化”的基础能力，典型职责如下：

- 解析服务配置文件，产出结构化配置对象。
- 按配置加载共享库（`dlopen`）并可选调用构造入口。
- 记录已加载组件，避免重复加载。
- 对外提供配置化 UID 的读取能力。

**锚点说明（为何关键）**  
- [`services/load/src/loader.cpp: Loader::LoadComponents`](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)  
  决定动态库加载、错误处理与初始化行为，直接影响服务启动可用性与扩展能力。  
- [`services/load/src/config.cpp: Config::Unmarshal / Component::Unmarshal`](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\config.cpp)  
  决定配置解析成功与否及后续组件字段可用性。  
- [`services/load/include/loader.h: Loader::CONF_FILE`](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h)  
  绑定了运行时配置来源路径，属于部署约束入口。  

## 2. 目录结构

```text
services/load/
  include/
    config.h
    loader.h
  src/
    config.cpp
    loader.cpp
```

与仓库整体关系上，该模块位于 `services/`，作为服务启动链的一部分；其配置能力可复用于服务组件化加载场景。

## 3. 核心组件

### 3.1 `Config` 与 `Config::Component`

文件: [services/load/include/config.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\config.h)

- `Config` 继承 `DistributedData::Serializable`，用于统一 JSON 编解码。
- `Config::Component` 作为组件描述单元，包含动态库与生命周期相关元数据。
- 所有 `Marshal/Unmarshal` 方法返回 `bool`，但内部并未在字段级别严格强制完整性（见下文约束）。

### 3.2 `Loader`

文件: [services/load/include/loader.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h)  
文件: [services/load/src/loader.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)

- `LoadComponents()`：主流程入口，按组件列表逐个尝试加载。  
- `LoadUid()`：返回配置中的 `uid`。  
- `LoadConfig()`：读取配置文件内容并反序列化。  
- `ComponentIsExist()`：通过静态 `handleMap` 避免重复加载同一个 `lib`。  
- `handleMap` 为 `static inline std::unordered_map<std::string, void*>`，仅写入不回收（与当前析构行为一致）。

## 4. 核心流程

### 4.1 配置驱动的组件加载流程

1. `LoadComponents()` 调用 `LoadConfig()` 获得 `Config`。  
2. 遍历 `config.components`。  
3. 跳过 `lib` 为空的组件。  
4. 检查 `ComponentIsExist(lib)`，若已存在则跳过。  
5. 执行 `dlopen(lib, RTLD_LAZY)`；失败时记录错误并继续下一个组件。  
6. 成功后将 handle 写入 `handleMap`。  
7. 如果 `constructor` 非空，则 `dlsym` 获取函数并调用 `constructor(params.c_str())`。

锚点：  
- [`services/load/src/loader.cpp: Loader::LoadComponents`](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)

### 4.2 配置读取与 UID 获取流程

1. `LoadUid()` 内部调用 `LoadConfig()`，返回 `config.uid`。  
2. `LoadConfig()` 通过 `std::ifstream` 读取固定路径配置。  
3. 使用 `Config::Unmarshall(context)` 反序列化 JSON。  

锚点：  
- [`services/load/src/loader.cpp: Loader::LoadUid`](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)  
- [`services/load/src/loader.cpp: Loader::LoadConfig`](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)

## 5. 接口与数据结构

| 文件 | 符号 | 类型 | 说明 |
|---|---|---|---|
| [config.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\config.h) | `Config::Component` | 类 | 组件配置信息载体；字段含 `description/lib/constructor/destructor/params` |
| [config.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\config.h) | `Config` | 类 | 顶层配置；字段含 `processLabel/version/features/plugins/components/uid` |
| [config.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\config.h) | `Component::Marshal/Unmarshal` | 方法 | 与 JSON 映射的序列化/反序列化 |
| [config.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\config.h) | `Config::Marshal/Unmarshal` | 方法 | 顶层配置序列化/反序列化 |
| [loader.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h) | `Loader::LoadComponents` | 方法 | 启动期组件加载主流程 |
| [loader.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h) | `Loader::LoadUid` | 方法 | 提供 UID 配置读取 |
| [loader.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h) | `Loader::ComponentIsExist` | 方法 | 通过 `lib` 去重 |
| [loader.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp) | `Loader::handleMap` | 字段 | 已加载库句柄缓存（无清理路径） |

## 6. 关键约束与边界条件

- 配置文件路径硬编码为 `/system/etc/pasteboard/conf/pasteboard.json`，部署时必须存在且可读。锚点: [loader.h: CONF_FILE](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h)  
- 构造函数调用约定固定为 `void (*)(const char *)`，参数来源于 `params` 字符串。锚点: [loader.h: using Constructor](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h)  
- 未找到 `lib` 或 `constructor` 为空的组件不会报错终止，仅跳过。  
- 注释明确“no need to close the component”，当前实现也未在析构时 `dlclose`；该行为是长期驻留型组件加载。锚点: [loader.cpp: LoadComponents](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)  
- `Config::Unmarshal` 只对前两个字段聚合校验返回值，其他字段即使失败也不会影响最终 bool。锚点: [config.cpp: Config::Unmarshal](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\config.cpp)  
- `LoadConfig()` 使用逐行拼接读取文件内容，未处理换行保留；对 JSON 来说通常可行，但对非标准文本结构无额外保护。锚点: [loader.cpp: LoadConfig](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)

## 7. 运行手册（可用于后续 design.md）

### 7.1 Build（构建）
- 证据缺口：未检索到本模块独立构建脚本或目标定义。  
- 建议（推断）: 以仓库服务主线构建目标触发编译该模块，确保链接依赖包含 `dl` 与 `Serializable` 框架。  
- 产出验收点：`Loader` 可链接且 `config.cpp/loader.cpp` 无未解析符号。

### 7.2 Validation（验证）
- 目标用例：
  1. 准备合法与非法 JSON 配置，验证 `LoadComponents`、`LoadUid` 行为。
  2. 模拟组件库重复项，验证 `ComponentIsExist` 的去重效果。
  3. 模拟 `dlopen` 失败场景（不存在路径），检查日志与继续加载行为。
- 证据缺口：仓库内未给出本模块专项测试文件。

### 7.3 Deployment（部署）
- 关键部署项：
  - 配置文件部署到 `CONF_FILE` 定义路径。  
  - 组件库文件路径与 `dlsym` 构造函数名需与配置一致。  
  - 运行用户与权限需允许访问配置与加载库文件。

### 7.4 Rollback（回退）
- 回退策略：
  - 快速回退至上一个可用 `pasteboard.json`，避免新增组件导致启动异常。
  - 若新库加载失败，服务仍可继续（按现状会继续其余组件），因此回退颗粒度可先“逐项禁用新组件”再重启服务。
- 证据缺口：无内置回滚逻辑；回滚依赖运维侧替换配置与库文件。

### 7.5 Failure-mode notes（故障模式）
- 配置不可读/不可解析：`LoadComponents` 将用默认空 `Config` 行为运行（未显式上报强失败）。  
- 重复组件：以 `lib` 名称去重防重复 `dlopen`。  
- 构造函数缺失：`dlsym` 失败后，库仍保留加载状态。  
- 句柄泄漏：当前无卸载路径，长期运行后可接受，但热更新/热卸载场景需额外考虑。

## 8. 调试指引（按主要模块）

### 8.1 配置与反序列化（`Config`）
- 症状：组件列表为空、UID 读取异常、字段缺失。  
- 源码区域：`Config::Unmarshal` / `LoadConfig`。  
- 检查文件与命令：  
  - [services/load/src/config.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\config.cpp)  
  - [services/load/src/loader.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)  
  - 运行时检查 `/system/etc/pasteboard/conf/pasteboard.json`。

### 8.2 动态库加载（`Loader::LoadComponents`）
- 症状：组件初始化未触发、服务行为异常。  
- 源码区域：`Loader::LoadComponents`。  
- 检查文件与命令：  
  - [services/load/src/loader.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)  
  - [services/load/include/loader.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h)  
  - 日志中关注 `PASTEBOARD_MODULE_SERVICE` 标签中的 `dlopen` 错误。  

### 8.3 生命周期与资源（`handleMap`）
- 症状：多次启动后组件重复加载/句柄增长。  
- 源码区域：`Loader::handleMap`、`ComponentIsExist`。  
- 检查文件：  
  - [services/load/include/loader.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h)  
  - [services/load/src/loader.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)

## 9. 可信度边界

### 9.1 源码确认事实
- 文件与符号定义、流程、调用关系均基于以下文件直接读取确认：  
  - [config.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\config.h)  
  - [loader.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\include\loader.h)  
  - [config.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\config.cpp)  
  - [loader.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\load\src\loader.cpp)

### 9.2 推断与缺失证据
- 模块在系统启动链中的调用时机、与上层服务的编排顺序。  
- 与本模块联动的具体 `.so` 构建产物名与 `constructor` ABI 约束。  
- 编译目标与标准化部署步骤（本轮证据中未提供模块级 build/test 文档）。  
- 配置文件具体 JSON 字段完整示例及其在真实运行中的校验规范。

# Switch 模块中间设计文档（服务侧）

## 1. 模块目的与职责
`Switch` 模块负责管理分布式粘贴板开关状态的本地持久化读取、变化监听与状态上报，属于 `pasteboard` 服务内部控制链路的一部分。其核心职责是：
1. 从系统参数/数据库键读取开关值并同步到设备能力状态。
2. 监听分布式粘贴板开关配置变更，触发异步更新。
3. 提供查询接口用于读取设备协同能力开关。
4. 将当前开关状态上报至 UE 统计事件。

锚点：
- [PastedSwitch 类](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.h)
- [PastedSwitchObserver 类](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.h)
- [services/switch/pasteboard_switch.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)

## 2. 目录结构
模块目录结构如下：

- `services/switch/pasteboard_switch.h`
- `services/switch/pasteboard_switch.cpp`

仅包含该模块核心实现，未见公开接口文件。

## 3. 核心组件与数据结构

| 组件 | 位置 | 作用 | 关键字段/方法 |
|---|---|---|---|
| `PastedSwitch` | `pasteboard_switch.h/cpp` | 分布式粘贴板开关主控对象 | `Init(int32_t)`, `DeInit()`, `SetSwitch(int32_t)`, `GetDeviceCollabSwitch(int32_t)`, `userId_`, `switchObserver_` |
| `PastedSwitchObserver` | `pasteboard_switch.h/cpp` | DataAbility 观察者，监听配置变化 | `OnChange()`, 回调 `func_` |
| 配置常量 | `pasteboard_switch.cpp` | 绑定数据源与状态语义 | `DISTRIBUTED_PASTEBOARD_SWITCH`, `SUPPORT_STATUS`, `DISABLE_DISTRIBUTED_PASTEBOARD`, `UE_SWITCH_STATUS` |

锚点：
- `class PastedSwitch`、`int32_t userId_`、`sptr<PastedSwitchObserver> switchObserver_`
- `PastedSwitch::Init` / `PastedSwitch::DeInit` / `PastedSwitch::SetSwitch` / `PastedSwitch::GetDeviceCollabSwitch` / `PastedSwitch::ReportUeSwitchEvent`
- `PastedSwitchObserver::OnChange`  
来源锚点均位于 [pasteboard_switch.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp) 与 [pasteboard_switch.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.h)。

## 4. 核心流程

### 4.1 初始化流程
1. `Init(userId)` 读取系统参数 `const.pasteboard.disable_crossdevice_clipboard`。若为 true：调用 `DevProfile::GetInstance().PutDeviceStatus(false)` 并提前返回。  
2. 校验 `userId` 是否为 `-1`（`ERROR_USERID`），无效则返回。  
3. 缓存 `userId` 并同步到 `DataShareDelegate`。  
4. 注册观察者：`DataShareDelegate::GetInstance().RegisterObserver("distributed_pasteboard_switch", switchObserver_)`。  
5. 调用 `SetSwitch(userId)` 立刻刷新一次状态。  
6. 调用 `ReportUeSwitchEvent()` 上报开关状态。

锚点：[PastedSwitch::Init](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)

### 4.2 开关同步流程
- 观察者回调 `PastedSwitchObserver::OnChange()` 触发后启动异步线程，调用 `SetSwitch(userId_)`。  
- `SetSwitch` 从 `DataShareDelegate` 查询 `distributed_pasteboard_switch`：
  - 空值：默认启用并记录日志。  
  - 非空值：仅当值等于 `"1"` 时视为开启，其余视为关闭，写入 `DevProfile` 状态。

锚点：
- [PastedSwitchObserver::OnChange](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)
- [PastedSwitch::SetSwitch](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)

### 4.3 协同开关查询流程
- `GetDeviceCollabSwitch(userId)` 读取 `DEVICE_COLLAB_SWITCH`：
  - 空值默认返回 `true`。
  - 否则以 `"1"` 代表开启。

锚点：[PastedSwitch::GetDeviceCollabSwitch](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)

### 4.4 退出流程
- `DeInit()` 注销 `distributed_pasteboard_switch` 观察者。

锚点：[PastedSwitch::DeInit](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)

## 5. 接口与数据结构约束

### 5.1 接口契约
- 无对外公开 API，服务内调用函数。
- 返回值语义：
  - `GetDeviceCollabSwitch`：缺失值按“启用”处理（`true`）。
  - `SetSwitch` 不返回值，依赖 `DevProfile` 副作用生效。
- `Init` 对无效用户和禁用参数场景直接短路，避免继续注册观察者。

### 5.2 关键常量语义
- `DISTRIBUTED_PASTEBOARD_SWITCH`：主开关数据源键名。  
- `DEVICE_COLLAB_SWITCH`：设备协同开关查询键名。  
- `SUPPORT_STATUS = "1"`：通用“开启”判定值。  
- `DISABLE_DISTRIBUTED_PASTEBOARD = "const.pasteboard.disable_crossdevice_clipboard"`：全局参数短路开关。  
- `UE_SWITCH_STATUS = "PASTEBOARD_SWITCH_STATUS"`：UE 事件名。  

## 6. 依赖关系
- 观察者基类依赖 `AAFwk::DataAbilityObserverStub`（观察能力变化事件）。  
- 状态读写依赖 `DataShareDelegate`，表示配置来源于跨进程共享数据源。  
- 设备状态落地依赖 `DevProfile`。  
- 日志与事件依赖 `pasteboard_hilog.h` 与 `pasteboard_event_ue.h`。  
- 运行时参数判断依赖 `parameters.h`。  

锚点：
- 包含头文件见 [pasteboard_switch.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.h) 与 [pasteboard_switch.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)。

## 7. 运行手册（Runbook）

### 7.1 Build（构建）
- 证据缺口：当前未给出该模块对应的 build target 或命令。  
- 操作建议（推断）：在仓库构建入口按服务模块进行全量/增量构建，并确保 `services/switch/*` 被编译纳入 `pasteboard` 服务目标。  
- 关联锚点：文件变更范围限定于本模块源码文件。

### 7.2 Validation（验证）
- 验证点 1：服务启动后执行一次 `Init`，日志应出现初始化与上报相关信息。  
- 验证点 2：修改 `distributed_pasteboard_switch` 值，观察状态回调后设备状态变化。  
- 验证点 3：`userId = -1` 调用 `Init` 不应注册观察者。  
- 验证点 4：未设置开关值时 `SetSwitch` 默认为开启（`true` 写入 `DevProfile`）。  
- 验证点 5：`GetDeviceCollabSwitch` 在空值下应返回 true。  
- 证据锚点：[PastedSwitch::Init](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp), [PastedSwitch::SetSwitch](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp), [PastedSwitch::GetDeviceCollabSwitch](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)

### 7.3 Deployment（部署）
- 部署依赖系统参数与 DataShare key 可用性，默认行为在配置缺失时偏向“开启”以保证兼容。  
- 关键部署检查点：`const.pasteboard.disable_crossdevice_clipboard` 与 `distributed_pasteboard_switch` 两项配置在设备侧可被正常读取。  
- 事件埋点通过 `UE_SWITCH_STATUS` 上报，可用于开关变更审计（对应模板与事件体系可由 `pasteboardEvent.yaml` 中的事件定义流程确认）。

### 7.4 Rollback（回滚）
- 回滚策略：恢复旧版 `pasteboard_switch.cpp/h` 与 DataShare 键值策略（尤其 `distributed_pasteboard_switch` 默认值解释）并重启 pasteboard 服务。
- 风险控制：将 `DISABLE_DISTRIBUTED_PASTEBOARD` 置为 true 可在平台层禁用分布式粘贴板能力，作为紧急降级手段。

### 7.5 Failure-mode notes（故障模式）
- 观察者未触发：检查 `RegisterObserver` 是否成功、DataShare key 名是否一致。  
- 开关始终开启：常见于配置值缺失（代码默认开启）或读取异常。  
- 开关状态抖动：关注多线程回调和 `userId` 变更时序，观察 `SetSwitch` 调度线程。  

## 8. 调试指引（按模块）
### 8.1 初始化与观察链路
- 症状：服务启动后仍未响应开关变化。  
- 可能区域：`PastedSwitch::Init` / `DataShareDelegate::RegisterObserver` / `PastedSwitchObserver::OnChange`。  
- 检查文件：  
  - [pasteboard_switch.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)  
  - 建议命令：检查日志是否出现 `Init SetSwitch`、`empty switch`、`not support distributed pasteboard` 等关键字。

### 8.2 状态读取与默认行为
- 症状：配置为空时状态不符合预期。  
- 可能区域：`PastedSwitch::SetSwitch` 与 `GetDeviceCollabSwitch` 的空值分支。  
- 检查文件：  
  - [pasteboard_switch.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)  
  - 检查点：`SUPPORT_STATUS` 和两个关键键值的实际存储内容。

### 8.3 全局禁用参数
- 症状：即使开关配置已开启也显示关闭。  
- 可能区域：`Init` 初始参数短路。  
- 检查文件：  
  - [pasteboard_switch.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)  
  - 检查系统参数 `const.pasteboard.disable_crossdevice_clipboard` 是否被置为 true。

### 8.4 UE 上报
- 症状：开关变更埋点缺失。  
- 可能区域：`PastedSwitch::ReportUeSwitchEvent` 与 UE 宏接口。  
- 检查文件：  
  - [pasteboard_switch.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)  
  - 事件名锚点：`UE_SWITCH_STATUS`。  
  - 进一步对齐到事件定义规范可参考 `pasteboardEvent.yaml` 中的事件元数据说明。  

## 9. 约束与风险
1. 数据源键值缺失时默认值策略固定为“开启”，可能掩盖配置错误。  
2. 回调中 `std::thread` `detach` 不能回收，需通过生命周期管理避免资源泄漏级累积。  
3. `OnChange` 回调捕获的 `userId_` 为构造时拷贝（`userId = userId_`），在并发切换用户场景下可能出现短时不同步。  
4. `DeInit` 仅注销观察者，无显式等待线程收敛。  

## 10. 证据确认边界
### Source-confirmed（源码确认）
- 模块代码结构、类、函数、常量、默认值逻辑、线程化回调和状态上报调用均来自 [pasteboard_switch.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.h) 与 [pasteboard_switch.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\switch\pasteboard_switch.cpp)。
- 事件定义流程的总体模板性约束来自 `pasteboardEvent.yaml` 的元数据说明。

### Inferred / Missing Evidence（推断或缺失）
- 具体构建目标、编译命令、部署脚本、完整调用方链路未在提供证据中出现。  
- `DataShareDelegate`、`DevProfile`、`UE_SWITCH` 的底层实现和持久化行为属于外部依赖，当前未直接读取其源码，行为为推断。

# 模块中间设计文档：Account（services/account）

## 1. 模块目的与边界

- 该模块是 `distributeddatamgr_pasteboard` 仓库中的独立子模块，目录仅包含 `include/account_manager.h` 与 `src/account_manager.cpp` 两个文件，定位为“账户信息获取/会话上下文服务”的薄封装层。
- 从源代码可确认该模块当前只暴露并实现了一个单例类型 `AccountManager` 与 `GetCurrentAccount()` 接口，尚未在此模块内实现真实账户读取逻辑。
- 该模块在当前仓库证据中未看到与外部系统能力、进程生命周期、事件总线或序列化流程的直接绑定代码，因此更像是其他业务模块的“账户依赖占位注入点”。

## 2. 目录结构

`services/account` 目录结构（基于给定树）：

```text
services/account/
  include/
    account_manager.h
  src/
    account_manager.cpp
```

## 3. 核心组件

### 3.1 `AccountManager` 类

- 文件锚点：`[services/account/include/account_manager.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\account\include\account_manager.h)`
- 符号锚点：`OHOS::MiscServices::AccountManager`
- 关键原因：
  - 该类定义了模块对外可见的唯一公共能力（单例工厂与账户查询接口），可作为该模块功能边界的最高层入口。

### 3.2 单例访问：`GetInstance()`

- 文件锚点：`[services/account/src/account_manager.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\account\src\account_manager.cpp)`
- 符号锚点：`AccountManager::GetInstance`
- 关键原因：
  - 使用函数内静态局部变量实现单例，保证进程内统一实例点。
  - 当前实现不依赖外部注入参数，返回引用类型，易于被调用方直接复用。

### 3.3 账户查询：`GetCurrentAccount()`

- 文件锚点：`[services/account/src/account_manager.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\account\src\account_manager.cpp)`
- 符号锚点：`AccountManager::GetCurrentAccount`
- 关键原因：
  - 当前返回常量空字符串，表明功能未落地或由上层按场景接管，意味着模块行为在生产路径中可能只用于“兼容接口”。

## 4. 核心流程

## 4.1 典型调用流程（当前实现）

1. 调用方通过 `AccountManager::GetInstance()` 获取实例（单例）。
2. 调用 `GetCurrentAccount()` 获取账户标识字符串。
3. 当前返回值固定为空串，后续逻辑若依赖非空账号需要做好兼容处理。

## 4.2 未来可扩展路径（推断）

1. 在 `GetCurrentAccount()` 内接入系统账户服务/用户管理服务。
2. 引入账户变更监听并缓存最小化更新策略。
3. 与剪贴板服务主流程打通，实现基于账号的隔离/策略控制。

> 以上 2 的流程为推断，当前代码未体现具体依赖或监听机制。

## 5. 接口与数据结构

### 5.1 接口表

| 接口 | 定义位置 | 说明 | 输入/输出 |
|---|---|---|---|
| `OHOS::MiscServices::AccountManager &GetInstance()` | `services/account/include/account_manager.h` | 获取 `AccountManager` 单例引用 | 输入：无；输出：`AccountManager&` |
| `std::string GetCurrentAccount()` | `services/account/include/account_manager.h` | 获取当前账号信息 | 输入：无；输出：`std::string` |
| `AccountManager()` / `~AccountManager()`（私有） | `services/account/include/account_manager.h` | 禁止外部实例化/销毁 | 默认构造/析构实现 |

### 5.2 数据结构

- 无复杂结构体、枚举或成员变量；`AccountManager` 为无状态（stateless）单例封装。
- 无额外缓存字段、配置参数或持久化字段可见。

## 6. 关键约束与风险

## 约束（源文件确认）

- 私有构造函数与析构函数限制类外实例化/销毁，确保单例访问模式。
- 当前实现不包含线程安全修饰；依赖 C++ 局部静态变量的线程安全语义。
- 返回值约束：`GetCurrentAccount()` 目前固定返回 `""`，与“真实账号查询”语义不一致。

## 风险（推断 + 源码支持）

- 上游逻辑若假设非空账号，会触发跨用户策略或审计决策偏差。
- 若未来改为查询系统账户服务，需明确错误路径（无账户、服务不可用、超时）与降级策略。
- 由于该模块当前缺少输入参数与错误码，接口在失败场景中表达能力有限。

## 7. 与其他模块关系（当前证据视角）

- 仓库整体文档定位为剪贴板服务，但 `Account` 子模块未在当前可见代码中出现直接服务调用链。
- 因而可理解为：
  - 低耦合提供侧。
  - 在上层服务/客户端适配层中按需替换实现或补齐逻辑。

## 8. 调试与问题定位指引（按模块：Account）

| 症状 | 可能源区域 | 检查点 |
|---|---|---|
| 始终拿不到账号信息或空账号 | `AccountManager::GetCurrentAccount` 实现 | 查看 `[services/account/src/account_manager.cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\account\src\account_manager.cpp)` 的返回值与未来接入逻辑 |
| 多次调用返回行为不一致（若后续实现有状态） | `GetInstance` 生命周期 | 检查单例函数 `[services/account/src/account_manager.cpp](...)` 与编译单元链接一致性 |
| 链接/链接期符号重复或未定义 | 头文件/实现声明不一致 | 对照 `[services/account/include/account_manager.h](...)` 与 `[services/account/src/account_manager.cpp](...)` 声明-定义一致性 |

## 9. 运行手册（Runbook）

> 该小节基于现有证据能力编写；仓库中未提供 `services/account` 的独立构建、验证、部署、回滚脚本证据。

## 9.1 构建（Build）

- 源证据状态：未发现 `services/account` 独立构建脚本或目标定义。
- 建议：将模块与 `distributeddatamgr_pasteboard` 的整体构建流程挂接，确认该文件是否被编译进对应服务 target。

## 9.2 验证（Validation）

- 源证据状态：未提供模块级单测/集成测试文件。
- 建议（待实现）：新增最小单测覆盖
  - `GetInstance()` 返回同一实例引用。
  - `GetCurrentAccount()` 默认行为可断言（当前应为空串）。
- 验证项（现阶段推断）：在上层业务中模拟无账户/多用户场景，确认容错。

## 9.3 部署（Deployment）

- 源证据状态：未见账户子模块部署说明。
- 关联配置证据仅有行为事件规范文件 `[pasteboardEvent.yaml]`（非部署脚本）。
- 建议：将本模块纳入服务镜像构建产物时保持 `account_manager.cpp` 的链接一致性，避免按头文件优化删除。

## 9.4 回滚（Rollback）

- 回滚对象：`account_manager.cpp` 与 `account_manager.h`。
- 建议：回滚时优先恢复到“返回空字符串的稳定基线”，并回退调用方对该接口的严格账号依赖分支。
- 风险：若上游调用方已假设非空账号，需同步回滚调用方校验逻辑。

## 9.5 失败模式与处理（Failure-mode notes）

- 失败模式 A：上层出现“空账号”异常行为  
  处理：在调用点判空，走匿名或本地默认策略，并记录告警。
- 失败模式 B：剪贴板相关功能在多用户场景混淆  
  处理：在后续实现中加入用户上下文参数或显式账号来源标记，避免依赖隐式返回值。
- 失败模式 C：编译链接时未包含该文件  
  处理：检查目标编译清单是否包含 `services/account/src/account_manager.cpp`。

## 10. 证据边界与确定性

### Source-Confirmed（源确认）

- `AccountManager` 类定义与方法签名见 `services/account/include/account_manager.h`。
- `GetInstance()` 与 `GetCurrentAccount()` 定义见 `services/account/src/account_manager.cpp`。
- `GetCurrentAccount()` 当前返回空字符串为源码可见事实。
- 模块目录仅含一对头文件/实现文件。

### Inferred / Missing Evidence（推断或缺失证据）

- 当前是否有上游调用方、调用链、构建目标与服务部署方式未在给定证据中直接出现。
- 与系统账户服务真正联动、跨用户策略、权限校验与事件埋点未见实现。
- 运行命令、回归命令、部署步骤为按仓库缺省实践推断，不构成当前证据直接确认。

Project README/docs evidence:
Directory Source File Stats:
services/dfx/src/                        (21 files, 1860 lines)
framework/innerkits/include/             (20 files, 1853 lines)
framework/innerkits/src/                 (19 files, 6595 lines)
services/core/include/                   (15 files, 1156 lines)
interfaces/kits/napi/include/            (12 files, 1132 lines)
services/zidl/src/                       (12 files, 808 lines)
services/zidl/include/                   (12 files, 455 lines)
framework/tlv/                           (11 files, 1742 lines)
tools/ohos-pasteboard/src/               (11 files, 1103 lines)
tools/ohos-pasteboard/include/           (11 files, 408 lines)
interfaces/kits/napi/src/                (10 files, 5535 lines)
services/core/src/                       (7 files, 5845 lines)
utils/native/include/                    (7 files, 679 lines)
interfaces/cj/src/                       (5 files, 1556 lines)
interfaces/cj/include/                   (5 files, 320 lines)
interfaces/taihe/src/                    (4 files, 2160 lines)
framework/framework/device/              (4 files, 856 lines)
interfaces/ndk/include/                  (4 files, 720 lines)
framework/framework/include/common/      (4 files, 376 lines)
framework/framework/include/device/      (4 files, 272 lines)
framework/framework/clip/                (3 files, 288 lines)
framework/framework/eventcenter/         (3 files, 196 lines)
framework/framework/include/eventcenter/ (3 files, 149 lines)
services/dfx/src/statistic/              (3 files, 90 lines)
services/dfx/src/fault/                  (3 files, 87 lines)
services/dfx/src/behaviour/              (3 files, 86 lines)
interfaces/ndk/src/                      (2 files, 535 lines)
adapter/src/                             (2 files, 514 lines)
interfaces/ani/include/                  (2 files, 317 lines)
adapter/data_share/                      (2 files, 204 lines)
interfaces/taihe/include/                (2 files, 189 lines)
utils/native/src/                        (2 files, 162 lines)
services/switch/                         (2 files, 157 lines)
services/load/src/                       (2 files, 141 lines)
adapter/include/                         (2 files, 117 lines)
adapter/security_level/                  (2 files, 106 lines)
adapter/pasteboard_progress/             (2 files, 100 lines)
services/dialog/PasteboardDialog/entry/src/main/ets/ServiceExtAbility/ (2 files, 89 lines)
services/load/include/                   (2 files, 77 lines)
interfaces/ndk/unittest/                 (1 files, 2429 lines)
interfaces/ani/src/                      (1 files, 1150 lines)
framework/framework/serializable/        (1 files, 213 lines)
framework/framework/ffrt/                (1 files, 170 lines)
framework/framework/include/ffrt/        (1 files, 153 lines)
framework/framework/include/serializable/ (1 files, 135 lines)
framework/framework/include/clip/        (1 files, 95 lines)
framework/framework/common/              (1 files, 36 lines)
framework/framework/include/permission/  (1 files, 35 lines)
services/dialog/PasteboardDialog/entry/src/main/ets/PasteboardProgressAbility/ (1 files, 34 lines)
framework/framework/permission/          (1 files, 32 lines)
services/account/include/                (1 files, 30 lines)
services/account/src/                    (1 files, 27 lines)
services/dialog/PasteboardDialog/entry/src/main/ets/Application/ (1 files, 23 lines)
framework/framework/include/api/         (1 files, 22 lines)
services/dialog/PasteboardDialog/hvigor/ (1 files, 15 lines)
services/dialog/PasteboardDialog/        (1 files, 2 lines)
services/dialog/PasteboardDialog/entry/  (1 files, 2 lines)

Core Directory Coverage:
- none

README context:
--- README.md ---
# pasteBoardService

## Introduction

​     As a functional component of the stray subsystem, the clipboard service provides the ability to manage the system clipboard and supports the system copy and paste functions. The system clipboard supports package text, hypertext, URIs and other content operations.

**picture 1**  Subsystem Architecture Diagram
![](figures/subsystem_architecture.png "Subsystem architecture")

​		The clipboard service provides functions that support application developers to use clipboard-related services conveniently and efficiently. Its main components include clipboard management client and clipboard service. The clipboard management client is responsible for clipboard interface management, providing clipboard northbound JS API to applications; creating clipboard data on the application framework side, requesting clipboard SA to perform clipboard creation, deletion, query, text conversion, configuration, etc. The clipboard service is responsible for clipboard event management, manages the life cycle of clipboard SA (startup, destruction, multi-user, etc.); executes application requests, notifies clipboard data management, and returns the results to the clipboard management client.



## Directory Structure

```
/foundation/distributeddatamgr/pasteboard
├── etc         # Configuration files for the processes contained in the component
├── figures     # Framework diagram
├── framework   # innerKit interface
├── interfaces  # The interface code provided by the component externally
│   └── kits    # Interface provided to the application
├── profile     # Configuration files for system services contained in the component
├── services    # clipboard service implementation
│    └── core   # Core code implementation
│    └── test   # native test code
│    └── zidl   # Cross-process communication code implementation
├── utils       # Tests or services use mocked data
└──README.md    # Instructions for use
```

## illustrate

### Interface Description

**list 1**   PasteBoard open main method

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>interface name</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>describe</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createHtmlData(htmlText: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteData object of type MIMETYPE_TEXT_HTML for HTML type data</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>createWantData(want: Want): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>Create a PasteData object of type MIMETYPE_TEXT_WANT for data of type want</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createPlainTextData(text: string): PasteData</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteData object of type MIMETYPE_TEXT_PLAIN for plain text data</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createUriData(uri: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteData object of type MIMETYPE_TEXT_URI for data of type URI</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createHtmlTextRecord(htmlText: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteDataRecord object of type RecordMIMETYPE_TEXT_HTML for hypertext type data</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createWantRecord(want: Want): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteDataRecord object of type MIMETYPE_TEXT_WANT for data of type want</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createPlainTextRecord(text: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteDataRecord object of type MIMETYPE_TEXT_PLAIN for plain text data</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createUriRecord(uri: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteDataRecord object of type MIMETYPE_TEXT_URI for data of type URI</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getSystemPasteboard(): SystemPasteboard</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Get system clipboard</p>
</td>
</tr>
</tbody>
</table>



**list 2**  SystemPasteboard open main method

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>interface name</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>describe</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>on(type:'update', callback: () => void): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Callback called when the open pasteboard content changes</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>off(type: 'update', callback?: () => void): void</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>Callback called when the content of the pasteboard is closed</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>clear(callback: AsyncCallback<void>): void</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>clear clipboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>clear(): Promise<void>;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>clear clipboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPasteData(callback: AsyncCallback&lt;PasteData&gt;): void</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Get system clipboard data object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPasteData():Promise&lt;PasteData&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Get system clipboard data object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasPasteData(callback: AsyncCallback&lt;boolean&gt:void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Check if there is content in the pasteboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasPasteData(): Promise&lt;boolean&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Check if there is content in the pasteboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setPasteData(data: PasteData, callback: AsyncCallback&lt;void&gt:void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Write PasteData to the pasteboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setPasteData(data: PasteData): Promise&lt;void&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Write PasteData to the pasteboard</p>
</td>
</tr>
</tbody>
</table>



**list 3**  PasteData open main method

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>interface name</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>describe</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addHtmlRecord(htmlText: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Add the HTML text record to the PasteData object and update the MIME type to PasteData#MIMETYPE_TEXT_HTML in the DataProperty.</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>addWantRecord(want: Want): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>Add want record to PasteData object and update MIME type to PasteData#MIMETYPE_TEXT_WANT in DataProperty</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addRecord(record: PasteDataRecord): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Add PasteRecord to paste data object and update MIME type in data attribute</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addTextRecord(text: string): void;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Add plain text records to PasteData object and update MIME type to PasteData#MIMETYPE_TEXT_PLAIN in DataProperty</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addUriRecord(uri: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Add URI record to PasteData object and update MIME type to PasteData#MIMETYPE_TEXT_URI in DataProperty</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getMimeTypes(): Array&lt;string&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>MIME type of everything on the pasteboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryHtml(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>HTML text of the main record in the PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryWant(): Want;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>The want of the main record in the PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryMimeType(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>The MIME type of the main record in the PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryUri(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>URI of the main record in the PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getProperty(): PasteDataProperty;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Get the properties of the clipboard data object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getRecordAt(index: number): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>records based on the specified index</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getRecordCount(): number;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Number of records in PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasMimeType(mimeType: string): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Checks if data of the specified MIME type exists in the DataProperty</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>removeRecordAt(index: number): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Delete records based on specified index</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>replaceRecordAt(index: number, record: PasteDataRecord): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Replace the specified record with a new record</p>
</td>
</tr>
</tbody>
</table>





**list 4**  PasteDataRecord open main method

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>interface name</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>describe</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>convertToText(callback: AsyncCallback&lt;string&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Convert PasteData to text content</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>convertToText():  Promise&lt;void&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>Convert PasteData to text content</p>
</td>
</tr>
</tbody>
</table>



**list 5**  PasteDataProperty Parameter Description

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="30%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>name</p>
</th>
<th class="cellrowborder" valign="top" width="30%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>type</p>
</th>
<th class="cellrowborder" valign="top" width="40%" id="mcps1.2.3.1.3"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>illustrate</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>additions{[key:string]}</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>object</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Additional property data key-value pair</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>mimeTypes</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Array<string></p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Distinct MIME types for all records in PasteData</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>tag</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>string</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>User-defined labels for PasteData objects</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>timestamp</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>number</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Timestamp indicating when the data was written to the system clipboard.</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>localOnly</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a> boolean</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Check if PasteData is set for local access only.</p>
</td>
</tr>
</tbody>
</table>


### Instructions for use

Clipboard module usage example：

```
// import module
import pasteboard from '@ohos.pasteboard'
//text copy
console.log('Get SystemPasteboard')
var systemPasteboard = pasteboard.getSystemPasteboard()
systemPasteboard.clear()
        
var textData = 'Hello World!'
console.log('createPlainTextData = ' + textData)
var pasteData = pasteboard.createPlainTextData(textData)
        
console.log('Writes PasteData to the pasteboard')
systemPasteboard.setPasteData(pasteData)
        
console.log('Checks there is content in the pasteboard')
assert.equal(systemPasteboard.hasPasteData(), true)
        
console.log('Checks the number of records')
pasteData = systemPasteboard.getPasteData()
assert.equal(pasteData.getRecordCount(), 1)
        
console.log('Checks the pasteboard content')
assert.equal(pasteData.getPrimaryText(), textData)
        
console.log('Checks there is a MIMETYPE_TEXT_PLAIN MIME type of data')
assert.equal(pasteData.hasMimeType(MIMETYPE_TEXT_PLAIN), true)
assert.equal(pasteData.getPrimaryMimeType(), MIMETYPE_TEXT_PLAIN)

//clipboard change listener
console.log('Off the content changes')
var systemPasteboard = pasteboard.getSystemPasteboard()
systemPasteboard.off(contentChanges)
systemPasteboard.clear()
        
var textData = 'Hello World!'
console.log('createUriData = ' + textData)
var pasteData = pasteboard.createUriData(textData)
        
console.log('Writes PasteData to the pasteboard')
systemPasteboard.setPasteData(pasteData)
        
console.log('Checks there is content in the pasteboard')
assert.equal(systemPasteboard.hasPasteData(), true)
        
console.log('Checks the number of records')
pasteData = systemPasteboard.getPasteData()
assert.equal(pasteData.getRecordCount(), 1)
        
console.log('On the content changes')
systemPasteboard.on(contentChanges)
        
console.log('Removes the Record')
assert.equal(pasteData.removeRecordAt(0), true)
        
console.log('Writes PasteData to the pasteboard')
systemPasteboard.setPasteData(pasteData)
        
console.log('Checks the number of records')
pasteData = systemPasteboard.getPasteData()
assert.equal(pasteData.getRecordCount(), 0)
        
console.log('Checks there is  no content in the pasteboard')
assert.equal(systemPasteboard.hasPasteData(), false)
        
var textDataNew = 'Hello World!-New'
console.log('createUriData = ' + textDataNew)
var pasteData = pasteboard.createUriData(textDataNew)
        
console.log('Writes PasteData to the pasteboard')
systemPasteboard.setPasteData(pasteData)
        
console.log('Checks there is content in the pasteboard')
assert.equal(systemPasteboard.hasPasteData(), true)
        
console.log('Checks the number of records')
pasteData = systemPasteboard.getPasteData()
assert.equal(pasteData.getRecordCount(), 1)
        
console.log('Checks the pasteboard content')
assert.equal(pasteData.getRecordAt(0).plainText, textDataNew)

```



## Related warehouse

**Distributed Data Management subsystem**

[distributeddatamgr\_pasteboard](https://gitee.com/openharmony/distributeddatamgr_pasteboard)



--- README_ZH.md (truncated) ---
# 剪贴板服务

## 简介

剪贴板服务作为杂散子系统的功能组件，提供管理系统剪贴板的能力，为系统复制、粘贴功能提供支持。系统剪切板支持包文本、超本文、URIs等内容操作。

**图 1**  子系统架构图
![](figures/subsystem_architecture_zh.png "子系统架构图")

剪贴板服务，提供支撑应用开发者方便、高效的使用剪贴板相关业务的功能。其主要组件包括剪贴板管理客户端和剪贴板服务。剪贴板管理客户端负责剪贴板接口管理，提供剪贴板北向JS API给应用；在应用框架侧创建剪贴板数据、请求剪贴板SA执行剪贴板的新建、删除、查询、转换文本、配置等。剪贴板服务负责剪贴板事件管理，管理剪贴板SA的生命周期（启动、销毁、多用户等）；执行应用请求，通知剪贴板数据管理，并将结果返回给剪贴板管理客户端。



## 目录

```
/foundation/distributeddatamgr/pasteboard
├── etc                      # 组件包含的进程的配置文件
├── figures                  # 构架图
├── framework                # innerKit接口
├── interfaces               # 组件对外提供的接口代码
│   └── kits                 # 对应用提供的接口
├── profile                  # 组件包含的系统服务的配置文件
├── services                 # 剪贴板服务实现
│    └── core                # 核心代码实现
│    └── test                # native测试代码
│    └── zidl                # 跨进程通信代码实现
├── utils                    # 测试或服务使用mock的数据
└──README_zh.md              # 使用说明
```

## 说明

### 接口说明

**表 1**   PasteBoard开放的主要方法

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>接口名</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>描述</p>
</th>
</tr>
</thead>
<tbody>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>createData(mimeType: string, value: ValueType): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>用MIME类型和值创建一个PasteData 对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>createRecord(mimeType: string, value: ValueType): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>用MIME类型和值创建一个PasteDataRecord对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>createHtmlData(htmlText: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为HTML类型的数据创建一个MIMETYPE_TEXT_HTML类型的PasteData 对象</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>createWantData(want: Want): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>为want类型的数据创建一个MIMETYPE_TEXT_WANT类型的PasteData对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createPlainTextData(text: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为纯文本类型的数据创建一个MIMETYPE_TEXT_PLAIN类型的PasteData 对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createUriData(uri: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为URI类型的数据创建一个MIMETYPE_TEXT_URI类型的PasteData 对象</p></td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createHtmlTextRecord(htmlText: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为超文本类型的数据创建一个RecordMIMETYPE_TEXT_HTML类型的PasteDataRecord对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createWantRecord(want: Want): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为want类型的数据创建一个MIMETYPE_TEXT_WANT类型的PasteDataRecord对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createPlainTextRecord(text: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为纯文本类型的数据创建一个MIMETYPE_TEXT_PLAIN类型的PasteDataRecord对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createUriRecord(uri: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为URI类型的数据创建一个MIMETYPE_TEXT_URI类型的PasteDataRecord对象</p></td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getSystemPasteboard(): SystemPasteboard;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>获取系统剪贴板</p>
</td>
</tr>
</tbody>
</table>


**表 2**  SystemPasteboard开放的主要方法

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>接口名</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>描述</p>
</th>
</tr>
</thead>
<tbody>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>clearData(callback: AsyncCallback&lt;void&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>清除剪贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>clearData(): Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>清除剪贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>getData(callback: AsyncCallback&lt;PasteData&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>从系统剪贴板获取pastedata对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>getData(): Promise&lt;PasteData&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>从系统剪贴板获取pastedata对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>hasData(callback: AsyncCallback&lt;boolean&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>判断系统剪贴板中的内容</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>hasData(): Promise&lt;boolean&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>判断系统剪贴板中的内容</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>setData(data: PasteData, callback: AsyncCallback&lt;void&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>向系统剪贴板写入PasteData</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>setData(data: PasteData): Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>向系统剪贴板写入PasteData</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>on(type:'update', callback: () => void): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>打开粘贴板内容更改时调用的回调</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>off(type: 'update', callback?: () => void): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>关闭粘贴板内容更改时调用的回调</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>clear(callback: AsyncCallback&lt;void&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>清除剪贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>clear(): Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>清除剪贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPasteData(callback: AsyncCallback&lt;PasteData&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>获取系统剪贴板数据对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPasteData():Promise&lt;PasteData&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>获取系统剪贴板数据对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasPasteData(callback: AsyncCallback&lt;boolean&gt;:void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>检查粘贴板中是否有内容</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasPasteData(): Promise&lt;boolean&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>检查粘贴板中是否有内容</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setPasteData(data: PasteData, callback: AsyncCallback&lt;void&gt;:void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 PasteData 写入粘贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setPasteData(data: PasteData): Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 PasteData 写入粘贴板</p>
</td>
</tr>
</tbody>
</table>


**表 3**  PasteData开放的主要方法

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>接口名</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>描述</p>
</th>
</tr>
</thead>
<tbody>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>addRecord(mimeType: string, value: ValueType): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>将mimeType和对应值添加到 PasteData 对象中</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>getRecord(index: number): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>使用PasteData对象中的次序获取PasteDataRecord记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>hasType(mimeType: string): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>判断DataProperty中是否有指定MIME类型的值</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>removeRecord(index: number): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>基于PasteData中值的次序删除一条记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>replaceRecord(index: number, record: PasteDataRecord): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>用PasteDataRecord记录替换PasteData中指定次序的记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>addHtmlRecord(htmlText: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>将 HTML 文本记录添加到 PasteData 对象，并将 MIME 类型更新为 DataProperty 中的 PasteData#MIMETYPE_TEXT_HTML。</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>addWantRecord(want: Want): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>将want记录添加到 PasteData 对象，并将 MIME 类型更新为 DataProperty 中的 PasteData#MIMETYPE_TEXT_WANT</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addRecord(record: PasteDataRecord): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 PasteRecord 添加到粘贴数据对象并更新数据属性中的 MIME 类型</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addTextRecord(text: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将纯文本记录添加到 PasteData 对象，并将 MIME 类型更新为 DataProperty 中的 PasteData#MIMETYPE_TEXT_PLAIN</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addUriRecord(uri: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 URI 记录添加到 PasteData 对象，并将 MIME 类型更新为 DataProperty 中的 PasteData#MIMETYPE_TEXT_URI</p></td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getMimeTypes(): Array&lt;string&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>粘贴板上所有内容的 MIME 类型</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryHtml(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中主要记录的 HTML 文本</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryWant(): Want;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中的主记录的want</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryMimeType(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中主记录的 MIME 类型。</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryUri(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中主记录的 URI</p>  </td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryPixelMap(): image.PixelMap;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中主记录的 PixelMap。</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getProperty(): PasteDataProperty;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>获取剪贴板数据对象的属性</p>         </td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setProperty(property: PasteDataProperty): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>设置属性描述对象，当前仅支持设置shareOption属性。</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getRecordAt(index: number): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>基于指定索引的记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getRecordCount(): number;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中的记录数</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasMimeType(mimeType: string): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>检查 DataProperty 中是否存在指定的 MIME 类型的数据</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>removeRecordAt(index: number): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>根据指定索引删除记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>replaceRecordAt(index: number, record: PasteDataRecord): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>用新记录替换指定记录</p>
</td>
</tr>
</tbody>
</table>


**表 4**  PasteDataRecord开放的主要方法

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>接口名</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>描述</p>
</th>
</tr>
</thead>
<tbody>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>convertToTextV9(callback: AsyncCallback&lt;string&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a></a>将 PasteData中的数据 转换为文本格式</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144">convertToTextV9(): Promise&lt;string&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>将 PasteData中的数据 转换为文本格式</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>convertToText(callback: AsyncCallback&lt;string&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 PasteData 转换为文本内容的内容</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>convertToText():  Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>将 PasteData 转换为文本内容的内容</p>
</td>
</tr>
</tbody>
</table>

**表 5**  PasteDataProperty参数说明

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="30%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>名称</p>
</th>
<th class="cellrowborder" valign="top" width="30%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>类型</p>
</th>
<th class="cellrowborder" valign="top" width="40%" id="mcps1.2.3.1.3"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>说明</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>additions{[key:string]}</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>object</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>附加属性数据键值对</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>mimeTypes</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Array<string></p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 中所有记录的非重复 MIME 类型</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>tag</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>string</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象的用户定义标签</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>timestamp</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>number</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>时间戳，指示何时将数据写入系统粘贴板。</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>localOnly</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a> boolean</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>检查 PasteData 是否设置为仅用于本地访问。</p></td>
</tr>
<tr id="row204321219393">

--- tools/ohos-pasteboard/docs/README.md ---
# ohos-pasteboard

## 概述

剪贴板命令行工具，支持对剪贴板数据的读取、写入和查询操作。适用于设置或获取 HTML、URI 或纯文本数据。不适用于非文本数据类型的设置或获取。

## 功能列表

- **设置剪贴板数据**：将 HTML、URI 或纯文本内容写入系统剪贴板
- **获取剪贴板数据**：读取文本类型的剪贴板内容
- **清空剪贴板数据**：清空剪贴板数据内容
- **检查剪贴板状态**：检查剪贴板是否有数据
- **检查数据类型**: 检查剪贴板是否有指定类型的数据
- **检查远端数据**：检查剪贴板是否有远端设备的数据

## 依赖

### 系统能力

- `PasteboardClient` - 系统剪贴板服务客户端
- `PasteData` - 剪贴板数据结构
- `PasteDataRecord` - 单条剪贴板记录

### 权限

| 权限 | 命令 | 说明 |
|-----------|----------|-------------|
| `ohos.permission.READ_PASTEBOARD` | get-data | 读取剪贴板内容所需权限 |

## 基本用法

```bash
ohos-pasteboard <command> [options]
ohos-pasteboard --help
ohos-pasteboard <command> --help
```

## 命令列表

| 命令 | 说明 | 参数 | 权限 | 前置依赖 |
|---------|-------------|------------|-------------|--------------|
| set-data | 设置剪贴板数据，支持 HTML、URI 或纯文本内容 | `--text <string>`、`--html <string>`、`--uri <string>`（至少提供一个） | 无 | 无 |
| get-data | 读取文本类型的剪贴板数据 | 无 | `ohos.permission.READ_PASTEBOARD` | 无 |
| clear-data | 清空剪贴板数据内容 | 无 | 无 | 无 |
| has-data | 检查剪贴板是否有数据 | 无 | 无 | 无 |
| has-data-type | 检查剪贴板是否有指定类型的数据 | `--type <string>`（必填） | 无 | 无 |
| has-remote-data | 检查剪贴板是否有远端设备数据 | 无 | 无 | 无 |

**前置依赖说明**：
- **无**：命令可直接执行，无需前置条件

## 输出格式

所有命令将 JSON 输出到 stdout，结构如下：

### 成功响应
```json
{
  "type": "result",
  "status": "success",
  "data": {
    // 命令特定数据
  }
}
```

### 失败响应
```json
{
  "type": "result",
  "status": "failed",
  "errCode": "ERR_XXX",
  "errMsg": "错误描述",
  "suggestion": "建议的下一步操作"
}
```

### 错误码

| 错误码 | 说明 |
|------------|-------------|
| `ERR_ARG_INVALID` | 参数值无效 |
| `ERR_ARG_MISSING` | 缺少必需参数 |
| `ERR_CMD_INVALID` | 未知命令 |
| `ERR_CROSS_BORDER` | 屏幕状态不匹配 |
| `ERR_DATA_EXPIRED` | 剪贴板数据已过期 |
| `ERR_DATA_INVALID` | 数据格式无效 |
| `ERR_DATA_SIZE` | 数据大小超限 |
| `ERR_DESERIALIZATION` | 数据反序列化失败 |
| `ERR_GET_DATA_FAILED` | 获取数据失败 |
| `ERR_GET_REMOTE` | 获取远端数据失败 |
| `ERR_INTERNAL_ERROR` | 内部系统错误 |
| `ERR_INVALID_PARAM` | 参数无效 |
| `ERR_INVALID_USER` | 用户 ID 无效 |
| `ERR_NO_DATA` | 剪贴板无数据 |
| `ERR_NO_USER_DATA` | 当前用户无剪贴板数据 |
| `ERR_PERMISSION_DENIED` | 权限不足 |
| `ERR_REMOTE_EXCEPTION` | 远端设备异常 |
| `ERR_REMOTE_TASK` | 远端任务失败 |
| `ERR_SERIALIZATION` | 数据序列化失败 |
| `ERR_SERVICE_UNAVAILABLE` | 剪贴板服务不可用 |
| `ERR_SET_DATA_FAILED` | 设置数据失败 |
| `ERR_TASK_PROCESSING` | 任务正在处理中 |
| `ERR_TIMEOUT` | 操作超时 |

## 示例

### set-data

```bash
# 将纯文本数据写入剪贴板
ohos-pasteboard set-data --text "Hello World"

# 将 HTML 数据写入剪贴板
ohos-pasteboard set-data --html "<html><p>Hello</p></html>"

# 将 URI 数据写入剪贴板
ohos-pasteboard set-data --uri "file:///path/to/file"

# 同时设置多种数据类型（创建多记录剪贴板）
ohos-pasteboard set-data --text "Hello" --html "<p>Hello</p>"
```

### get-data

```bash
# 读取剪贴板内容
ohos-pasteboard get-data

# 输出示例：
{
  "type": "result",
  "status": "success",
  "data": {
    "recordCount": 1,
    "mimeTypes": ["text/plain"],
    "records": [
      {
        "mimeType": "text/plain",
        "plainText": "Hello World"
      }
    ]
  }
}
```

### clear-data

```bash
# 清空剪贴板所有数据
ohos-pasteboard clear-data

# 输出示例：
{
  "type": "result",
  "status": "success",
  "data": {}
}
```

### has-data

```bash
# 检查剪贴板是否有内容
ohos-pasteboard has-data

# 输出示例（有数据）：
{
  "type": "result",
  "status": "success",
  "data": {
    "hasData": true
  }
}
```

### has-data-type

```bash
# 检查是否包含纯文本数据
ohos-pasteboard has-data-type --type text/plain

# 检查是否包含 HTML 数据
ohos-pasteboard has-data-type --type text/html

# 检查是否包含 URI 数据
ohos-pasteboard has-data-type --type text/uri

# 输出示例：
{
  "type": "result",
  "status": "success",
  "data": {
    "hasType": true,
    "type": "text/plain"
  }
}
```

### has-remote-data

```bash
# 检查剪贴板数据是否来自远端设备
ohos-pasteboard has-remote-data

# 输出示例（本地数据）：
{
  "type": "result",
  "status": "success",
  "data": {
    "hasRemoteData": false
  }
}
```

## 典型工作流

```bash
# 1. 检查剪贴板状态
ohos-pasteboard has-data

# 2. 设置新数据
ohos-pasteboard set-data --text "测试内容"

# 3. 验证数据已设置
ohos-pasteboard has-data-type --type text/plain

# 4. 获取数据
ohos-pasteboard get-data

# 5. 完成后清空
ohos-pasteboard clear-data
```

## 安装

CLI 工具安装于 OpenHarmony 设备的 `/system/bin/cli_tool/executable/ohos-pasteboard`。

## 构建配置

- **构建目标**：`ohos-pasteboard`
- **子系统**：`distributeddatamgr`
- **部件**：`pasteboard`


Docs context:
(none)

Operational evidence:
Build evidence:
(none)

Config/deploy evidence:
--- pasteboardEvent.yaml ---
1: 
2: #  Copyright (c) 2022-2023 Huawei Device Co., Ltd.
3: #  Licensed under the Apache License, Version 2.0 (the "License");
4: #  you may not use this file except in compliance with the License.
5: #  You may obtain a copy of the License at
6: #
7: #      http://www.apache.org/licenses/LICENSE-2.0
8: #
9: #  Unless required by applicable law or agreed to in writing, software
10: #  distributed under the License is distributed on an "AS IS" BASIS,
11: #  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: #  See the License for the specific language governing permissions and
13: #  limitations under the License.
14: 
15: #####################################################
16: #     below is the format of defining event         #
17: #####################################################
18: #domain: domain name.  [Only one domain name can be defined at the top]
19: #
20: #author: the author name who defined this event.
21: #date: the date when this event was defined, format is YYYY-MM-DD.
22: #logged: source file which refer to this event.
23: #usage: the usage of this event.
24: #//Define event name and event properties.
25: #@EVENT_NAME: the event definition part begin.
26: #  // __BASE is used for defining the basic info of the event.
27: #  // "type" optional values are: FAULT, STATISTICS, SECURITY, BEHAVIOR.
28: #  // "level" optional values are: CRITICAL, MINOR.
29: #  // "tag" set tags with may used by subscriber of this event, multiple tags devided by space.
30: #  // "desc" full description of this event.
31: #  @PARAMETER: {type: parameter type, arrsize: array length(optional), desc: parameter description}.
32: #  // follow the __BASE block, each line defines a parameter of this event.
33: #  // "type" optional values are: INT8, UINT8, INT16, UINT16, INT32, UINT32, INT64, UINT64, FLOAT, DOUBLE, STRING.
34: #  // "arrsize" of the parameter is an array, set a non-zero value.
35: #  // "desc" full description of this parameter.
36: 
37: #####################################################
38: #   Example of some hiviewdfx events definition     #
39: #####################################################
40: 

Troubleshooting evidence:
(none)

Source excerpts with line numbers:
--- adapter/data_share/datashare_delegate.cpp (truncated) ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: #include "datashare_delegate.h"
16: 
17: #include "iservice_registry.h"
18: #include "pasteboard_error.h"
19: #include "pasteboard_hilog.h"
20: 
21: namespace OHOS::MiscServices {
22: const constexpr char *SETTING_COLUMN_KEYWORD = "KEYWORD";
23: const constexpr char *SETTING_COLUMN_VALUE = "VALUE";
24: const constexpr char *SETTING_URI_PROXY_PREFIX = "datashare:///com.ohos.settingsdata/entry/settingsdata/"
25:                                           "USER_SETTINGSDATA_SECURE_";
26: const constexpr char *SETTING_URI_PROXY_SUFFIX = "?Proxy=true";
27: constexpr const char *SETTINGS_DATA_EXT_URI = "datashare:///com.ohos.settingsdata.DataAbility";
28: const constexpr char *SETTING_URI_WIFI_PROXY =
29:     "datashare:///com.ohos.settingsdata/entry/settingsdata/SETTINGSDATA?Proxy=true";
30: constexpr const int32_t PASTEBOARD_SA_ID = 3701;
31: 
32: DataShareDelegate &DataShareDelegate::GetInstance()
33: {
34:     static DataShareDelegate instance;
35:     return instance;
36: }
37: 
38: sptr<IRemoteObject> GetSystemAbilitySafe(int32_t saId)
39: {
40:     auto samgr = SystemAbilityManagerClient::GetInstance().GetSystemAbilityManager();
41:     return samgr ? samgr->GetSystemAbility(saId) : nullptr;
42: }
43: 
44: std::shared_ptr<DataShare::DataShareHelper> DataShareDelegate::CreateDataShareHelper(const std::string &key)
45: {
46:     std::string SETTING_URI_PROXY;
47:     if (key == DEVICE_COLLAB_SWITCH) {
48:         SETTING_URI_PROXY = std::string(SETTING_URI_WIFI_PROXY);
49:     } else {
50:         SETTING_URI_PROXY = std::string(SETTING_URI_PROXY_PREFIX) + userId_ + std::string(SETTING_URI_PROXY_SUFFIX);
51:     }
52:     auto remoteObj = GetSystemAbilitySafe(PASTEBOARD_SA_ID);
53:     if (!remoteObj) {
54:         PASTEBOARD_HILOGE(PASTEBOARD_MODULE_SERVICE, "get sa manager return nullptr");
55:         return nullptr;
56:     }
57:     
58:     auto [ret, helper] = DataShare::DataShareHelper::Create(remoteObj, SETTING_URI_PROXY, SETTINGS_DATA_EXT_URI);
59:     remoteObj = nullptr;
60:     return helper;
61: }
62: 
63: void DataShareDelegate::SetUserId(int32_t userId)
64: {
65:     this->userId_ = std::to_string(userId);
66: }
67: 
68: bool DataShareDelegate::ReleaseDataShareHelper(std::shared_ptr<DataShare::DataShareHelper> helper)
69: {
70:     if (helper == nullptr) {
71:         PASTEBOARD_HILOGE(PASTEBOARD_MODULE_SERVICE, "helper is nullptr");
72:         return false;
73:     }
74:     if (!helper->Release()) {
75:         PASTEBOARD_HILOGE(PASTEBOARD_MODULE_SERVICE, "release helper fail");
76:         return false;
77:     }
78:     return true;
79: }
80: 

--- adapter/data_share/datashare_delegate.h ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #ifndef OHOS_DISTRIBUTED_DATA_PASTEBOARD_ADAPTER_DATA_SHARE_DELEGATE_H
17: #define OHOS_DISTRIBUTED_DATA_PASTEBOARD_ADAPTER_DATA_SHARE_DELEGATE_H
18: 
19: #include "datashare_helper.h"
20: 
21: namespace OHOS::MiscServices {
22: using ChangeInfo = DataShare::DataShareObserver::ChangeInfo;
23: const constexpr char *DEVICE_COLLAB_SWITCH = "settings.collaboration.multi_device_collaboration_service_switch";
24: class DataShareDelegate {
25: public:
26:     static DataShareDelegate &GetInstance();
27:     int32_t RegisterObserver(const std::string &key, sptr<AAFwk::IDataAbilityObserver> observer);
28:     int32_t UnregisterObserver(const std::string &key, sptr<AAFwk::IDataAbilityObserver> observer);
29:     int32_t GetValue(const std::string &key, std::string &value);
30:     void SetUserId(int32_t userId);
31: 
32: private:
33:     DataShareDelegate() = default;
34:     ~DataShareDelegate() = default;
35:     DISALLOW_COPY_AND_MOVE(DataShareDelegate);
36: 
37:     static void Initialize();
38:     bool ReleaseDataShareHelper(std::shared_ptr<DataShare::DataShareHelper> helper);
39:     std::shared_ptr<DataShare::DataShareHelper> CreateDataShareHelper(const std::string &key);
40:     Uri MakeUri(const std::string &key);
41: 
42:     static DataShareDelegate *instance_;
43:     std::string userId_ = "100";
44: };
45: } // namespace OHOS::MiscServices
46: 
47: #endif // OHOS_DISTRIBUTED_DATA_PASTEBOARD_ADAPTER_DATA_SHARE_DELEGATE_H

--- adapter/include/device_profile_adapter.h ---
1: /*
2:  * Copyright (c) 2025 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #ifndef PASTEBOARD_DEVICE_PROFILE_ADAPTER_H
17: #define PASTEBOARD_DEVICE_PROFILE_ADAPTER_H
18: 
19: #include <cstdint>
20: #include <string>
21: 
22: #include "api/visibility.h"
23: 
24: namespace OHOS {
25: namespace MiscServices {
26: 
27: class IDeviceProfileAdapter {
28: public:
29:     typedef void (*OnProfileUpdateCallback)(const std::string &udid, bool status);
30: 
31:     virtual ~IDeviceProfileAdapter() = default;
32:     virtual int32_t RegisterUpdateCallback(const OnProfileUpdateCallback callback) = 0;
33:     virtual int32_t PutDeviceStatus(const std::string &udid, bool status) = 0;
34:     virtual int32_t GetDeviceStatus(const std::string &udid, bool &status) = 0;
35:     virtual bool GetDeviceVersion(const std::string &udid, uint32_t &versionId) = 0;
36:     virtual int32_t SubscribeProfileEvent(const std::string &udid) = 0;
37:     virtual int32_t UnSubscribeProfileEvent(const std::string &udid) = 0;
38:     virtual void SendSubscribeInfos() = 0;
39:     virtual void ClearDeviceProfileService() = 0;
40: };
41: 
42: extern "C" {
43:     typedef IDeviceProfileAdapter *(*GetDeviceProfileAdapterFunc)();
44:     typedef void (*DeinitDeviceProfileAdapterFunc)();
45: 
46:     API_EXPORT IDeviceProfileAdapter *GetDeviceProfileAdapter();
47:     API_EXPORT void DeinitDeviceProfileAdapter();
48: }
49: 
50: } // namespace MiscServices
51: } // namespace OHOS
52: 
53: #endif // PASTEBOARD_DEVICE_PROFILE_ADAPTER_H
54: 

--- adapter/include/device_profile_client.h ---
1: /*
2:  * Copyright (c) 2025 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #ifndef PASTEBOARD_DEVICE_PROFILE_CLIENT_H
17: #define PASTEBOARD_DEVICE_PROFILE_CLIENT_H
18: 
19: #include <condition_variable>
20: #include <map>
21: #include <memory>
22: #include <mutex>
23: 
24: #include "i_distributed_device_profile.h"
25: #include "iremote_object.h"
26: #include "system_ability_load_callback_stub.h"
27: 
28: namespace OHOS {
29: namespace DistributedDeviceProfile {
30: class DeviceProfileLoadCb : public SystemAbilityLoadCallbackStub {
31: public:
32:     void OnLoadSystemAbilitySuccess(int32_t systemAbilityId, const sptr<IRemoteObject> &remoteObject) override;
33:     void OnLoadSystemAbilityFail(int32_t systemAbilityId) override;
34: };
35: 
36: class DeviceProfileClient {
37: public:
38:     static DeviceProfileClient &GetInstance();
39: 
40:     int32_t PutCharacteristicProfile(const CharacteristicProfile &characteristicProfile);
41:     int32_t GetCharacteristicProfile(const std::string &deviceId, const std::string &serviceName,
42:         const std::string &characteristicId, CharacteristicProfile &characteristicProfile);
43:     int32_t SubscribeDeviceProfile(const SubscribeInfo &subscribeInfo);
44:     int32_t UnSubscribeDeviceProfile(const SubscribeInfo &subscribeInfo);
45:     void SendSubscribeInfos();
46:     void ClearDeviceProfileService();
47: 
48:     void LoadSystemAbilitySuccess(const sptr<IRemoteObject> &remoteObject);
49:     void LoadSystemAbilityFail();
50: 
51: private:
52:     sptr<IDistributedDeviceProfile> LoadDeviceProfileService();
53:     sptr<IDistributedDeviceProfile> GetDeviceProfileService();
54: 
55:     std::mutex serviceLock_;
56:     std::condition_variable proxyConVar_;
57:     sptr<IDistributedDeviceProfile> dpProxy_ = nullptr;
58: 
59:     std::mutex subscribeLock_;
60:     std::map<std::string, SubscribeInfo> subscribeInfos_;
61: };
62: } // namespace DistributedDeviceProfile
63: } // namespace OHOS
64: #endif // PASTEBOARD_DEVICE_PROFILE_CLIENT_H
65: 

--- adapter/pasteboard_progress/pasteboard_progress.cpp ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "pasteboard_progress.h"
17: #include "iservice_registry.h"
18: #include "pasteboard_error.h"
19: #include "pasteboard_hilog.h"
20: #include "pasteboard_time.h"
21: #include "udmf_client.h"
22: 
23: using namespace OHOS::UDMF;
24: namespace OHOS::MiscServices {
25: constexpr const int32_t PASTEBOARD_SA_ID = 3701;
26: 
27: int32_t PasteBoardProgress::InsertValue(std::string &key, std::string &value)
28: {
29:     CustomOption option = {.intention = Intention::UD_INTENTION_DATA_HUB};
30:     UnifiedData data;
31:     auto udsObject = std::make_shared<Object>();
32:     if (udsObject == nullptr) {
33:         PASTEBOARD_HILOGE(PASTEBOARD_MODULE_CLIENT, "udsObject is nullptr");
34:         return static_cast<int32_t>(PasteboardError::INVALID_PARAM_ERROR);
35:     }
36:     auto utdId = UDMF::UtdUtils::GetUtdIdFromUtdEnum(UDMF::PLAIN_TEXT);
37:     udsObject->value_[UDMF::UNIFORM_DATA_TYPE] = utdId;
38:     udsObject->value_[UDMF::CONTENT] = value;
39:     udsObject->value_[UDMF::ABSTRACT] = std::to_string(PasteBoardTime::GetCurrentTimeMicros());
40:     std::shared_ptr<UnifiedRecord> record = std::make_shared<UnifiedRecord>();
41:     record->AddEntry(utdId, std::move(udsObject));
42:     data.AddRecord(record);
43:     UdmfClient::GetInstance().SetData(option, data, key);
44:     return static_cast<int32_t>(PasteboardError::E_OK);
45: }
46: 
47: int32_t PasteBoardProgress::UpdateValue(std::string &key, std::string value)
48: {
49:     QueryOption queryOption = { .key = key };
50:     UnifiedData data;
51:     auto udsObject = std::make_shared<Object>();
52:     if (udsObject == nullptr) {
53:         PASTEBOARD_HILOGE(PASTEBOARD_MODULE_CLIENT, "udsObject is nullptr");
54:         return static_cast<int32_t>(PasteboardError::INVALID_PARAM_ERROR);
55:     }
56:     auto utdId = UDMF::UtdUtils::GetUtdIdFromUtdEnum(UDMF::PLAIN_TEXT);
57:     udsObject->value_[UDMF::UNIFORM_DATA_TYPE] = utdId;
58:     udsObject->value_[UDMF::CONTENT] = value;
59:     udsObject->value_[UDMF::ABSTRACT] = std::to_string(PasteBoardTime::GetCurrentTimeMicros());
60:     std::shared_ptr<UnifiedRecord> record = std::make_shared<UnifiedRecord>();
61:     record->AddEntry(utdId, std::move(udsObject));
62:     data.AddRecord(record);
63:     UdmfClient::GetInstance().UpdateData(queryOption, data);
64:     return static_cast<int32_t>(PasteboardError::E_OK);
65: }
66: } // namespace OHOS::MiscServices

--- adapter/pasteboard_progress/pasteboard_progress.h ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #ifndef OHOS_DISTRIBUTED_DATA_PASTEBOARD_ADAPTER_PASTEBOARD_PROGRESS_H
17: #define OHOS_DISTRIBUTED_DATA_PASTEBOARD_ADAPTER_PASTEBOARD_PROGRESS_H
18: 
19: #include "iremote_object.h"
20: 
21: namespace OHOS::MiscServices {
22: class PasteBoardProgress {
23: public:
24:     static int32_t InsertValue(std::string &key, std::string &value);
25:     static int32_t UpdateValue(std::string &key, std::string value);
26: 
27: private:
28:     PasteBoardProgress() = default;
29:     ~PasteBoardProgress() = default;
30:     DISALLOW_COPY_AND_MOVE(PasteBoardProgress);
31: };
32: } // namespace OHOS::MiscServices
33: 
34: #endif // OHOS_DISTRIBUTED_DATA_PASTEBOARD_ADAPTER_PASTEBOARD_PROGRESS_H

--- adapter/security_level/security_level.cpp ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: #include "security_level.h"
16: 
17: #include "device/dm_adapter.h"
18: #include "pasteboard_hilog.h"
19: 
20: namespace OHOS::MiscServices {
21: uint32_t SecurityLevel::GetDeviceSecurityLevel()
22: {
23: #ifdef PB_DATACLASSIFICATION_ENABLE
24:     uint32_t level = securityLevel_.load();
25:     if (level > DATA_SEC_LEVEL0) {
26:         return level;
27:     }
28: #endif
29:     return GetSensitiveLevel();
30: }
31: 
32: #ifdef PB_DATACLASSIFICATION_ENABLE
33: bool SecurityLevel::InitDEVSLQueryParams(DEVSLQueryParams *params, const std::string &udid)
34: {
35:     PASTEBOARD_CHECK_AND_RETURN_RET_LOGE(params != nullptr && !udid.empty(), false, PASTEBOARD_MODULE_SERVICE,
36:         "params check failed, params is null %{public}d", params == nullptr);
37:     std::vector<uint8_t> vec(udid.begin(), udid.end());
38:     for (size_t i = 0; i < MAX_UDID_LENGTH && i < vec.size(); i++) {
39:         params->udid[i] = vec[i];
40:     }
41:     params->udidLen = static_cast<uint32_t>(MAX_UDID_LENGTH);
42:     return true;
43: }
44: #endif
45: 
46: uint32_t SecurityLevel::GetSensitiveLevel()
47: {
48:     auto &udid = DMAdapter::GetInstance().GetLocalDeviceUdid();
49: #ifdef PB_DATACLASSIFICATION_ENABLE
50:     DEVSLQueryParams query;
51:     PASTEBOARD_CHECK_AND_RETURN_RET_LOGE(InitDEVSLQueryParams(&query, udid), DATA_SEC_LEVEL0, PASTEBOARD_MODULE_SERVICE,
52:         "init query params failed! udid:%{public}.6s", udid.c_str());
53: 
54:     uint32_t level = DATA_SEC_LEVEL0;
55:     int32_t result = DATASL_GetHighestSecLevel(&query, &level);
56:     PASTEBOARD_CHECK_AND_RETURN_RET_LOGE(result == DEVSL_SUCCESS, DATA_SEC_LEVEL0, PASTEBOARD_MODULE_SERVICE,
57:         "get highest level failed(%{public}.6s)! level:%{public}u, error:%{public}d", udid.c_str(), level, result);
58:     securityLevel_.store(level);
59:     PASTEBOARD_HILOGI(
60:         PASTEBOARD_MODULE_SERVICE, "get highest level success(%{public}.6s)! level: %{public}u", udid.c_str(), level);
61:     return level;
62: #else
63:     return 0;
64: #endif
65: }
66: } // namespace OHOS::MiscServices

--- adapter/security_level/security_level.h ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #ifndef OHOS_PASTEBOARD_SECURITY_LEVEL_H
17: #define OHOS_PASTEBOARD_SECURITY_LEVEL_H
18: #include <string>
19: #include <atomic>
20: #ifdef PB_DATACLASSIFICATION_ENABLE
21: #include "dev_slinfo_mgr.h"
22: #endif
23: 
24: namespace OHOS::MiscServices {
25: class SecurityLevel {
26: public:
27: #ifdef PB_DATACLASSIFICATION_ENABLE
28:     SecurityLevel() : securityLevel_(DATA_SEC_LEVEL0) {}
29: #endif
30:     uint32_t GetDeviceSecurityLevel();
31: 
32: private:
33: #ifdef PB_DATACLASSIFICATION_ENABLE
34:     bool InitDEVSLQueryParams(DEVSLQueryParams *params, const std::string &udid);
35:     std::atomic<uint32_t> securityLevel_;
36: #endif
37:     uint32_t GetSensitiveLevel();
38: };
39: } // namespace OHOS::MiscServices
40: #endif // OHOS_PASTEBOARD_SECURITY_LEVEL_H

--- adapter/src/device_profile_adapter.cpp (truncated) ---
1: /*
2:  * Copyright (C) 2025 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "device_profile_adapter.h"
17: 
18: #include <thread>
19: 
20: #include "cJSON.h"
21: #include "device_profile_client.h"
22: #include "distributed_device_profile_errors.h"
23: #include "i_static_capability_collector.h"
24: #include "common/pasteboard_common_utils.h"
25: #include "pasteboard_error.h"
26: #include "pasteboard_hilog.h"
27: #include "profile_change_listener_stub.h"
28: #include "system_ability_definition.h"
29: 
30: namespace OHOS {
31: namespace MiscServices {
32: using namespace OHOS::DistributedDeviceProfile;
33: 
34: constexpr const int32_t ERR_OK = 0;
35: 
36: constexpr const char *STATUS_ENABLE = "1";
37: constexpr const char *STATUS_DISABLE = "0";
38: constexpr const char *SERVICE_ID = "pasteboardService";
39: constexpr const char *STATIC_CHARACTER_ID = "static_capability";
40: constexpr const char *VERSION_ID = "PasteboardVersionId";
41: constexpr const char *CHARACTERISTIC_VALUE = "characteristicValue";
42: constexpr const char *SWITCH_ID = "SwitchStatus_Key_Distributed_Pasteboard";
43: constexpr const char *CHARACTER_ID = "SwitchStatus";
44: 
45: static IDeviceProfileAdapter::OnProfileUpdateCallback g_onProfileUpdateCallback = nullptr;
46: 
47: static inline std::string Bool2Str(bool value)
48: {
49:     return value ? STATUS_ENABLE : STATUS_DISABLE;
50: }
51: 
52: static inline bool Str2Bool(const std::string &value)
53: {
54:     return value == STATUS_ENABLE;
55: }
56: 
57: class SubscribeDPChangeListener : public ProfileChangeListenerStub {
58: public:
59:     SubscribeDPChangeListener() = default;
60:     ~SubscribeDPChangeListener() = default;
61: 
62:     int32_t OnTrustDeviceProfileAdd(const TrustDeviceProfile &profile) override
63:     {
64:         (void)profile;
65:         return ERR_OK;
66:     }
67: 
68:     int32_t OnTrustDeviceProfileDelete(const TrustDeviceProfile &profile) override
69:     {
70:         (void)profile;
71:         return ERR_OK;
72:     }
73: 
74:     int32_t OnTrustDeviceProfileUpdate(const TrustDeviceProfile &oldProfile,
75:         const TrustDeviceProfile &newProfile) override
76:     {
77:         (void)oldProfile;
78:         (void)newProfile;
79:         return ERR_OK;
80:     }

--- adapter/src/device_profile_client.cpp (truncated) ---
1: /*
2:  * Copyright (C) 2025 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "device_profile_client.h"
17: 
18: #include <chrono>
19: 
20: #include "distributed_device_profile_errors.h"
21: #include "distributed_device_profile_proxy.h"
22: #include "iservice_registry.h"
23: #include "pasteboard_hilog.h"
24: #include "system_ability_definition.h"
25: 
26: namespace OHOS {
27: namespace DistributedDeviceProfile {
28: using namespace OHOS::MiscServices;
29: 
30: constexpr int32_t LOAD_SA_TIMEOUT_MS = 10000;
31: 
32: void DeviceProfileLoadCb::OnLoadSystemAbilitySuccess(int32_t systemAbilityId, const sptr<IRemoteObject> &remoteObject)
33: {
34:     DeviceProfileClient::GetInstance().LoadSystemAbilitySuccess(remoteObject);
35:     PASTEBOARD_HILOGI(PASTEBOARD_MODULE_COMMON, "on load system ability success");
36: }
37: 
38: void DeviceProfileLoadCb::OnLoadSystemAbilityFail(int32_t systemAbilityId)
39: {
40:     DeviceProfileClient::GetInstance().LoadSystemAbilityFail();
41:     PASTEBOARD_HILOGE(PASTEBOARD_MODULE_COMMON, "on load system ability failed");
42: }
43: 
44: DeviceProfileClient &DeviceProfileClient::GetInstance()
45: {
46:     static DeviceProfileClient instance;
47:     return instance;
48: }
49: 
50: sptr<IDistributedDeviceProfile> DeviceProfileClient::GetDeviceProfileService()
51: {
52:     {
53:         std::lock_guard lock(serviceLock_);
54:         if (dpProxy_ != nullptr) {
55:             return dpProxy_;
56:         }
57: 
58:         auto samgr = SystemAbilityManagerClient::GetInstance().GetSystemAbilityManager();
59:         PASTEBOARD_CHECK_AND_RETURN_RET_LOGE(samgr != nullptr, nullptr, PASTEBOARD_MODULE_COMMON,
60:             "get samgr failed");
61: 
62:         auto object = samgr->CheckSystemAbility(DISTRIBUTED_DEVICE_PROFILE_SA_ID);
63:         if (object != nullptr) {
64:             PASTEBOARD_HILOGI(PASTEBOARD_MODULE_COMMON, "get dp service success");
65:             dpProxy_ = new DistributedDeviceProfileProxy(object);
66:             return dpProxy_;
67:         }
68:     }
69: 
70:     PASTEBOARD_HILOGW(PASTEBOARD_MODULE_COMMON, "remoteObject is null");
71:     bool loadSucc = LoadDeviceProfileService();
72:     PASTEBOARD_CHECK_AND_RETURN_RET_LOGE(loadSucc, nullptr, PASTEBOARD_MODULE_COMMON,
73:         "load dp service failed");
74: 
75:     std::lock_guard lock(serviceLock_);
76:     PASTEBOARD_CHECK_AND_RETURN_RET_LOGE(dpProxy_ != nullptr, nullptr, PASTEBOARD_MODULE_COMMON,
77:         "load dp service failed");
78:     PASTEBOARD_HILOGI(PASTEBOARD_MODULE_COMMON, "load dp service success");
79:     return dpProxy_;
80: }

--- framework/framework/clip/clip_plugin.cpp (truncated) ---
1: /*
2:  * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "default_clip.h"
17: #include "pasteboard_event_dfx.h"
18: #include "pasteboard_hilog.h"
19: 
20: namespace OHOS::MiscServices {
21: std::map<std::string, ClipPlugin::Factory *> ClipPlugin::factories_;
22: DefaultClip g_defaultClip;
23: bool ClipPlugin::RegCreator(const std::string &name, Factory *factory)
24: {
25:     if (factory == nullptr) {
26:         PASTEBOARD_HILOGE(PASTEBOARD_MODULE_SERVICE, "factory is null, name=%{public}s", name.c_str());
27:         return false;
28:     }
29:     auto it = factories_.find(name);
30:     if (it != factories_.end()) {
31:         return false;
32:     }
33:     factories_[name] = factory;
34:     return true;
35: }
36: 
37: ClipPlugin *ClipPlugin::CreatePlugin(const std::string &name)
38: {
39:     auto it = factories_.find(name);
40:     if (it == factories_.end() || it->second == nullptr) {
41:         return &g_defaultClip;
42:     }
43:     RADAR_REPORT(
44:         RadarReporter::DFX_PLUGIN_CREATE_DESTROY, RadarReporter::DFX_PLUGIN_CREATE, RadarReporter::DFX_SUCCESS);
45:     return it->second->Create();
46: }
47: 
48: bool ClipPlugin::DestroyPlugin(const std::string &name, ClipPlugin *plugin)
49: {
50:     if (plugin == nullptr) {
51:         return false;
52:     }
53: 
54:     if (plugin == &g_defaultClip) {
55:         return true;
56:     }
57: 
58:     auto it = factories_.find(name);
59:     if (it == factories_.end() || it->second == nullptr) {
60:         return false;
61:     }
62:     RADAR_REPORT(
63:         RadarReporter::DFX_PLUGIN_CREATE_DESTROY, RadarReporter::DFX_PLUGIN_DESTROY, RadarReporter::DFX_SUCCESS);
64:     return it->second->Destroy(plugin);
65: }
66: 
67: std::vector<ClipPlugin::GlobalEvent> ClipPlugin::GetTopEvents(uint32_t topN)
68: {
69:     (void)topN;
70:     return std::vector<GlobalEvent>();
71: }
72: 
73: std::vector<ClipPlugin::GlobalEvent> ClipPlugin::GetTopEvents(uint32_t topN, int32_t user)
74: {
75:     (void)user;
76:     (void)topN;
77:     return std::vector<GlobalEvent>();
78: }
79: 
80: void ClipPlugin::Clear() {}

--- framework/framework/clip/default_clip.cpp ---
1: /*
2:  * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: #include "default_clip.h"
16: 
17: namespace OHOS::MiscServices {
18: int32_t DefaultClip::SetPasteData(const GlobalEvent &event, const std::vector<uint8_t> &data, uint32_t version,
19:     const std::vector<uint8_t> &mimeTypes)
20: {
21:     return 0;
22: }
23: 
24: std::pair<int32_t, int32_t> DefaultClip::GetPasteData(const GlobalEvent &event, std::vector<uint8_t> &data)
25: {
26:     return std::make_pair(0, 0);
27: }
28: 
29: std::vector<DefaultClip::GlobalEvent> DefaultClip::GetTopEvents(uint32_t topN, int32_t user)
30: {
31:     return std::vector<GlobalEvent>();
32: }
33: 
34: void DefaultClip::Clear(int32_t user) {}
35: 
36: int32_t DefaultClip::ApplyAdvancedResource(const std::string &deviceId)
37: {
38:     return 0;
39: }
40: 
41: int32_t DefaultClip::PublishServiceState(const std::string &networkId, ServiceStatus status)
42: {
43:     return 0;
44: }
45: } // namespace OHOS::MiscServices

--- framework/framework/clip/default_clip.h ---
1: /*
2:  * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #ifndef OHOS_DISTRIBUTED_DATA_PASTEBOARD_SERVICES_FRAMEWORK_CLIPS_DEFAULT_CLIPS_H
17: #define OHOS_DISTRIBUTED_DATA_PASTEBOARD_SERVICES_FRAMEWORK_CLIPS_DEFAULT_CLIPS_H
18: 
19: #include "clip/clip_plugin.h"
20: 
21: namespace OHOS::MiscServices {
22: class DefaultClip : public ClipPlugin {
23: public:
24:     int32_t SetPasteData(const GlobalEvent &event, const std::vector<uint8_t> &data, uint32_t version,
25:         const std::vector<uint8_t> &mimeTypes) override;
26:     std::pair<int32_t, int32_t> GetPasteData(const GlobalEvent &event, std::vector<uint8_t> &data) override;
27:     std::vector<GlobalEvent> GetTopEvents(uint32_t topN, int32_t user) override;
28:     void Clear(int32_t user) override;
29:     int32_t ApplyAdvancedResource(const std::string &deviceId) override;
30:     int32_t PublishServiceState(const std::string &networkId, ServiceStatus status) override;
31: };
32: } // namespace OHOS::MiscServices
33: #endif // OHOS_DISTRIBUTED_DATA_PASTEBOARD_SERVICES_FRAMEWORK_CLIPS_DEFAULT_CLIPS_H
34: 

--- framework/framework/common/pasteboard_common_utils.cpp ---
1: /*
2:  * Copyright (c) 2026 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "common/pasteboard_common_utils.h"
17: 
18: #include <pthread.h>
19: 
20: namespace OHOS {
21: namespace MiscServices {
22: void PasteBoardCommonUtils::SetThreadTaskName(std::thread &thread, const std::string &taskName)
23: {
24: #ifndef CROSS_PLATFORM
25:     pthread_setname_np(thread.native_handle(), taskName.c_str());
26: #endif
27: }
28: 
29: void PasteBoardCommonUtils::SetTaskName(const std::string &taskName)
30: {
31: #ifndef CROSS_PLATFORM
32:     pthread_setname_np(pthread_self(), taskName.c_str());
33: #endif
34: }
35: } // namespace MiscServices
36: } // namespace OHOS
37: 

--- framework/framework/device/dev_profile.cpp (truncated) ---
1: /*
2:  * Copyright (C) 2022-2025 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "device/dev_profile.h"
17: #include <thread>
18: 
19: #include "common/pasteboard_common_utils.h"
20: #include "device/device_profile_proxy.h"
21: #include "device/dm_adapter.h"
22: #include "ffrt/ffrt_utils.h"
23: #include "pasteboard_error.h"
24: #include "pasteboard_event_ue.h"
25: #include "pasteboard_hilog.h"
26: namespace OHOS {
27: namespace MiscServices {
28: constexpr const char *UE_SWITCH_OPERATION = "PASTEBOARD_SWITCH_OPERATION";
29: 
30: DevProfile &DevProfile::GetInstance()
31: {
32:     static DevProfile instance;
33:     return instance;
34: }
35: 
36: void DevProfile::OnProfileUpdate(const std::string &udid, bool status)
37: {
38:     PASTEBOARD_HILOGI(PASTEBOARD_MODULE_SERVICE, "udid=%{public}.5s, status=%{public}d", udid.c_str(), status);
39:     DevProfile::GetInstance().UpdateEnabledStatus(udid, status);
40:     DevProfile::GetInstance().Notify(status);
41: }
42: 
43: void DevProfile::PostDelayReleaseProxy()
44: {
45:     PASTEBOARD_HILOGI(PASTEBOARD_MODULE_SERVICE, "post delay task start");
46:     constexpr uint32_t DELAY_TIME = 60 * 1000; // 60s
47:     static FFRTTimer ffrtTimer("release_dp_proxy");
48: 
49:     FFRTTask task = [this]() {
50:         std::thread thread([=]() {
51:             std::lock_guard lock(proxyMutex_);
52:             PASTEBOARD_HILOGI(PASTEBOARD_MODULE_SERVICE, "execute delay task");
53:             if (proxy_ == nullptr) {
54:                 return;
55:             }
56: 
57:             if (subscribeUdidList_.empty()) {
58:                 PASTEBOARD_HILOGI(PASTEBOARD_MODULE_SERVICE, "deinit dp proxy");
59:                 proxy_ = nullptr;
60:             }
61:         });
62:         PasteBoardCommonUtils::SetThreadTaskName(thread, "PostDelayReleas");
63:         thread.detach();
64:     };
65: 
66:     ffrtTimer.SetTimer("release_dp_proxy", task, DELAY_TIME);
67:     PASTEBOARD_HILOGI(PASTEBOARD_MODULE_SERVICE, "post delay task end");
68: }
69: 
70: void DevProfile::PutDeviceStatus(bool status)
71: {
72:     std::string networkId = DMAdapter::GetInstance().GetLocalNetworkId();
73:     std::string udid = DMAdapter::GetInstance().GetUdidByNetworkId(networkId);
74:     PASTEBOARD_CHECK_AND_RETURN_LOGE(!udid.empty(), PASTEBOARD_MODULE_SERVICE,
75:         "get udid failed, netId=%{public}.5s", networkId.c_str());
76: 
77:     UpdateEnabledStatus(udid, status);
78:     UE_SWITCH(UE_SWITCH_OPERATION, UeReporter::UE_OPERATION_TYPE, status ?
79:         UeReporter::SwitchStatus::SWITCH_OPEN : UeReporter::SwitchStatus::SWITCH_CLOSE);
80: 

--- framework/framework/device/device_profile_proxy.cpp ---
1: /*
2:  * Copyright (c) 2025 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "device/device_profile_proxy.h"
17: 
18: #include <dlfcn.h>
19: #include <thread>
20: 
21: #include "pasteboard_hilog.h"
22: 
23: namespace OHOS {
24: namespace MiscServices {
25: constexpr const char *LIB_NAME = "libpasteboard_adapter.z.so";
26: constexpr const char *FUN_NAME_GET = "GetDeviceProfileAdapter";
27: constexpr const char *FUN_NAME_DEINIT = "DeinitDeviceProfileAdapter";
28: 
29: DeviceProfileProxy::DeviceProfileProxy()
30: {
31:     handler = dlopen(LIB_NAME, RTLD_NOW);
32:     PASTEBOARD_CHECK_AND_RETURN_LOGE(handler != nullptr, PASTEBOARD_MODULE_COMMON,
33:         "dlopen failed, msg=%{public}s", dlerror());
34: }
35: 
36: DeviceProfileProxy::~DeviceProfileProxy()
37: {
38:     if (handler == nullptr) {
39:         return;
40:     }
41: 
42:     auto func = reinterpret_cast<DeinitDeviceProfileAdapterFunc>(dlsym(handler, FUN_NAME_DEINIT));
43:     if (func != nullptr) {
44:         PASTEBOARD_HILOGI(PASTEBOARD_MODULE_COMMON, "deinit adapter");
45:         func();
46:         std::this_thread::sleep_for(std::chrono::seconds(1));
47:     } else {
48:         PASTEBOARD_HILOGE(PASTEBOARD_MODULE_COMMON, "dlsym failed, msg=%{public}s", dlerror());
49:     }
50: 
51:     dlclose(handler);
52:     handler = nullptr;
53: }
54: 
55: IDeviceProfileAdapter *DeviceProfileProxy::GetAdapter()
56: {
57:     auto func = reinterpret_cast<GetDeviceProfileAdapterFunc>(dlsym(handler, FUN_NAME_GET));
58:     PASTEBOARD_CHECK_AND_RETURN_RET_LOGE(func != nullptr, nullptr, PASTEBOARD_MODULE_COMMON,
59:         "dlsym failed, msg=%{public}s", dlerror());
60:     return func();
61: }
62: 
63: } // namespace MiscServices
64: } // namespace OHOS
65: 

--- framework/framework/device/distributed_module_config.cpp (truncated) ---
1: /*
2:  * Copyright (C) 2022-2025 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: #include "device/distributed_module_config.h"
16: 
17: #include <thread>
18: #include "common/pasteboard_common_utils.h"
19: #include "device/dev_profile.h"
20: #include "pasteboard_error.h"
21: #include "pasteboard_hilog.h"
22: 
23: namespace OHOS {
24: namespace MiscServices {
25: constexpr uint32_t RETRY_TIMES = 30;
26: constexpr uint32_t RETRY_INTERVAL = 1000; // milliseconds
27: constexpr uint32_t RANDOM_MAX = 500;
28: constexpr uint32_t RANDOM_MIN = 5;
29: bool DistributedModuleConfig::IsOn()
30: {
31:     if (GetDeviceNum() != 0) {
32:         Notify();
33:     }
34:     return status_.load();
35: }
36: 
37: void DistributedModuleConfig::Watch(const Observer &observer)
38: {
39:     observer_ = std::move(observer);
40: }
41: 
42: void DistributedModuleConfig::Notify()
43: {
44:     auto status = GetEnabledStatus();
45:     if (status == static_cast<int32_t>(PasteboardError::DP_LOAD_SERVICE_ERROR)) {
46:         if (!retrying_.exchange(true)) {
47:             GetRetryTask();
48:         }
49:         return;
50:     }
51:     bool newStatus = (status == static_cast<int32_t>(PasteboardError::E_OK));
52:     if (newStatus != status_.load()) {
53:         status_.store(newStatus);
54:         if (observer_ != nullptr) {
55:             observer_(newStatus);
56:         }
57:     }
58: }
59: 
60: void DistributedModuleConfig::GetRetryTask()
61: {
62:     std::thread remover([this]() {
63:         retrying_.store(true);
64:         uint32_t retry = 0;
65:         auto status = static_cast<int32_t>(PasteboardError::REMOTE_TASK_ERROR);
66:         while (retry < RETRY_TIMES) {
67:             ++retry;
68:             status = GetEnabledStatus();
69:             if (status == static_cast<int32_t>(PasteboardError::DP_LOAD_SERVICE_ERROR)) {
70:                 PASTEBOARD_HILOGE(PASTEBOARD_MODULE_SERVICE,
71:                     "dp load err, retry:%{public}d, status_:%{public}d"
72:                     "newStatus:%{public}d",
73:                     retry, status_.load(), status);
74:                 std::this_thread::sleep_for(std::chrono::milliseconds(RETRY_INTERVAL));
75:                 continue;
76:             }
77:             break;
78:         }
79:         PASTEBOARD_HILOGI(PASTEBOARD_MODULE_SERVICE,
80:             "Retry end. count:%{public}d, status_:%{public}d"

--- framework/framework/device/dm_adapter.cpp (truncated) ---
1: /*
2:  * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include <thread>
17: 
18: #include "common/pasteboard_common_utils.h"
19: #include "device/dm_adapter.h"
20: 
21: #include "pasteboard_error.h"
22: #include "pasteboard_hilog.h"
23: 
24: namespace OHOS::MiscServices {
25: constexpr size_t DMAdapter::MAX_ID_LEN;
26: constexpr const char *PKG_NAME = "pasteboard_service";
27: 
28: #ifdef PB_DEVICE_MANAGER_ENABLE
29: DmStateObserver::DmStateObserver(const std::function<void(const DmDeviceInfo &)> online,
30:     const std::function<void(const DmDeviceInfo &)> onReady, const std::function<void(const DmDeviceInfo &)> offline)
31:     : online_(std::move(online)), onReady_(std::move(onReady)), offline_(std::move(offline))
32: {
33: }
34: 
35: void DmStateObserver::OnDeviceOnline(const DmDeviceInfo &deviceInfo)
36: {
37:     std::thread thread([=] {
38:         if (online_ == nullptr || deviceInfo.authForm != IDENTICAL_ACCOUNT) {
39:             return;
40:         }
41:         PASTEBOARD_HILOGI(PASTEBOARD_MODULE_SERVICE, "device on:%{public}.6s", deviceInfo.networkId);
42:         online_(deviceInfo);
43:     });
44:     PasteBoardCommonUtils::SetThreadTaskName(thread, "OnDeviceOnline");
45:     thread.detach();
46: }
47: 
48: void DmStateObserver::OnDeviceOffline(const DmDeviceInfo &deviceInfo)
49: {
50:     std::thread thread([=] {
51:         if (offline_ == nullptr) {
52:             return;
53:         }
54:         PASTEBOARD_HILOGI(PASTEBOARD_MODULE_SERVICE, "device off:%{public}.6s", deviceInfo.networkId);
55:         offline_(deviceInfo);
56:     });
57:     PasteBoardCommonUtils::SetThreadTaskName(thread, "OnDeviceOffline");
58:     thread.detach();
59: }
60: 
61: void DmStateObserver::OnDeviceChanged(const DmDeviceInfo &deviceInfo)
62: {
63:     if (DeviceManager::GetInstance().IsSameAccount(deviceInfo.networkId)) {
64:         std::thread thread([=] {
65:             // authForm not valid use networkId
66:             PASTEBOARD_CHECK_AND_RETURN_LOGE(online_ != nullptr, PASTEBOARD_MODULE_SERVICE, "online_ is null");
67:             PASTEBOARD_HILOGI(PASTEBOARD_MODULE_SERVICE, "device config changed:%{public}.6s", deviceInfo.networkId);
68:             online_(deviceInfo);
69:         });
70:         PasteBoardCommonUtils::SetThreadTaskName(thread, "OnDeviceChanged");
71:         thread.detach();
72:     }
73: }
74: 
75: void DmStateObserver::OnDeviceReady(const DmDeviceInfo &deviceInfo)
76: {
77:     std::thread thread([=] {
78:         if (onReady_ == nullptr || deviceInfo.authForm != IDENTICAL_ACCOUNT) {
79:             return;
80:         }

--- framework/framework/eventcenter/event_center.cpp (truncated) ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "eventcenter/event_center.h"
17: #include "pasteboard_hilog.h"
18: 
19: namespace OHOS::MiscServices {
20: thread_local EventCenter::AsyncQueue *EventCenter::asyncQueue_ = nullptr;
21: constexpr int32_t EventCenter::AsyncQueue::MAX_CAPABILITY;
22: EventCenter &EventCenter::GetInstance()
23: {
24:     static EventCenter eventCenter;
25:     return eventCenter;
26: }
27: 
28: bool EventCenter::Subscribe(int32_t evtId, const std::function<void(const Event &)> &observer)
29: {
30:     return observers_.Compute(evtId, [&observer](const auto &id, auto &list) -> bool {
31:         list.push_back(observer);
32:         return true;
33:     });
34: }
35: 
36: bool EventCenter::Unsubscribe(int32_t evtId)
37: {
38:     return observers_.Erase(evtId);
39: }
40: 
41: int32_t EventCenter::PostEvent(std::unique_ptr<Event> evt) const
42: {
43:     if (evt == nullptr) {
44:         PASTEBOARD_HILOGE(PASTEBOARD_MODULE_SERVICE, "evt is null");
45:         return CODE_INVALID_ARGS;
46:     }
47:     if (asyncQueue_ == nullptr) {
48:         Dispatch(*evt);
49:         return CODE_SYNC;
50:     }
51:     asyncQueue_->Post(std::move(evt));
52:     return CODE_ASYNC;
53: }
54: 
55: void EventCenter::Dispatch(const Event &evt) const
56: {
57:     auto observers = observers_.Find(evt.GetEventId());
58:     PASTEBOARD_CHECK_AND_RETURN_LOGE(
59:         observers.first, PASTEBOARD_MODULE_SERVICE, "event not find, id=%{public}d", evt.GetEventId());
60:     for (const auto &observer : observers.second) {
61:         observer(evt);
62:     }
63: }
64: 
65: EventCenter::Defer::Defer(std::function<void(const Event &)> handler, int32_t evtId)
66: {
67:     if (asyncQueue_ == nullptr) {
68:         asyncQueue_ = new (std::nothrow) AsyncQueue();
69:     }
70:     PASTEBOARD_CHECK_AND_RETURN_LOGE(asyncQueue_ != nullptr, PASTEBOARD_MODULE_SERVICE, "asyncQueue_ is null");
71:     ++(*asyncQueue_);
72:     asyncQueue_->AddHandler(evtId, std::move(handler));
73: }
74: 
75: EventCenter::Defer::~Defer()
76: {
77:     PASTEBOARD_CHECK_AND_RETURN_LOGE(asyncQueue_ != nullptr, PASTEBOARD_MODULE_SERVICE, "asyncQueue_ is null");
78:     --(*asyncQueue_);
79:     if ((*asyncQueue_) <= 0) {
80:         delete asyncQueue_;

--- framework/framework/eventcenter/event.cpp ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "eventcenter/event.h"
17: namespace OHOS::MiscServices {
18: Event::Event(int32_t evtId) : evtId_(evtId) {}
19: Event::~Event() {}
20: int32_t Event::GetEventId() const
21: {
22:     return evtId_;
23: }
24: 
25: bool Event::Equals(const Event &) const
26: {
27:     return false;
28: }
29: } // namespace OHOS::MiscServices

--- framework/framework/eventcenter/pasteboard_event.cpp ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "eventcenter/pasteboard_event.h"
17: 
18: namespace OHOS::MiscServices {
19: 
20: PasteboardEvent::PasteboardEvent(int32_t evtId, std::string networkId) : Event(evtId), networkId_(std::move(networkId))
21: {
22: }
23: 
24: std::string PasteboardEvent::GetNetworkId() const
25: {
26:     return networkId_;
27: }
28: }

--- framework/framework/ffrt/ffrt_utils.cpp (truncated) ---
1: /*
2:  * Copyright (c) 2024 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #include "ffrt/ffrt_utils.h"
17: #include "pasteboard_common.h"
18: #include "pasteboard_hilog.h"
19: 
20: namespace OHOS {
21: namespace MiscServices {
22: std::unordered_map<std::string, std::shared_ptr<FFRTTimer>> FFRTPool::ffrtPool_;
23: std::mutex FFRTPool::mutex_;
24: 
25: void FFRTUtils::SubmitTask(const FFRTTask &task)
26: {
27:     ffrt::submit(task);
28: }
29: 
30: void FFRTUtils::SubmitQueueTasks(const std::vector<FFRTTask> &tasks, FFRTQueue &queue)
31: {
32:     if (tasks.empty()) {
33:         return;
34:     }
35:     for (const auto &task : tasks) {
36:         queue.submit(task);
37:     }
38: }
39: 
40: FFRTHandle FFRTUtils::SubmitDelayTask(FFRTTask &task, uint32_t delayMs, FFRTQueue &queue)
41: {
42:     using namespace std::chrono;
43:     milliseconds ms(delayMs);
44:     microseconds us = duration_cast<microseconds>(ms);
45:     return queue.submit_h(task, ffrt::task_attr().delay(us.count()));
46: }
47: 
48: FFRTHandle FFRTUtils::SubmitDelayTask(FFRTTask &task, uint32_t delayMs, std::shared_ptr<FFRTQueue> queue)
49: {
50:     using namespace std::chrono;
51:     milliseconds ms(delayMs);
52:     microseconds us = duration_cast<microseconds>(ms);
53:     return queue->submit_h(task, ffrt::task_attr().delay(us.count()));
54: }
55: 
56: bool FFRTUtils::SubmitTimeoutTask(const FFRTTask &task, uint32_t timeoutMs)
57: {
58:     ffrt::future<void> future = ffrt::async(task);
59:     auto status = future.wait_for(std::chrono::milliseconds(timeoutMs));
60:     return status == ffrt::future_status::ready;
61: }
62: 
63: int FFRTUtils::CancelTask(FFRTHandle &handle, FFRTQueue &queue)
64: {
65:     return queue.cancel(handle);
66: }
67: 
68: int FFRTUtils::CancelTask(FFRTHandle &handle, std::shared_ptr<FFRTQueue> &queue)
69: {
70:     return queue->cancel(handle);
71: }
72: 
73: FFRTTimer::FFRTTimer() : queue_("ffrt_timer") {}
74: 
75: FFRTTimer::FFRTTimer(const std::string &timerName) : queue_(timerName.c_str()) {}
76: 
77: FFRTTimer::~FFRTTimer()
78: {
79:     Clear();
80: }

--- framework/framework/include/api/visibility.h ---
1: /*
2:  * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #ifndef OHOS_DISTRIBUTED_API_VISIBILITY_H
17: #define OHOS_DISTRIBUTED_API_VISIBILITY_H
18: 
19: #ifndef API_EXPORT
20: #define API_EXPORT __attribute__((visibility("default")))
21: #endif
22: #endif // OHOS_DISTRIBUTED_API_VISIBILITY_H
23: 

--- framework/framework/include/clip/clip_plugin.h (truncated) ---
1: /*
2:  * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
3:  * Licensed under the Apache License, Version 2.0 (the "License");
4:  * you may not use this file except in compliance with the License.
5:  * You may obtain a copy of the License at
6:  *
7:  *     http://www.apache.org/licenses/LICENSE-2.0
8:  *
9:  * Unless required by applicable law or agreed to in writing, software
10:  * distributed under the License is distributed on an "AS IS" BASIS,
11:  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12:  * See the License for the specific language governing permissions and
13:  * limitations under the License.
14:  */
15: 
16: #ifndef OHOS_DISTRIBUTED_DATA_PASTEBOARD_SERVICES_FRAMEWORK_CLIPS_PLUGIN_H
17: #define OHOS_DISTRIBUTED_DATA_PASTEBOARD_SERVICES_FRAMEWORK_CLIPS_PLUGIN_H
18: #include <map>
19: 
20: #include "serializable/serializable.h"
21: 
22: namespace OHOS::MiscServices {
23: class API_EXPORT ClipPlugin {
24: public:
25:     enum EventStatus : uint32_t { EVT_UNKNOWN, EVT_INVALID, EVT_NORMAL, EVT_BUTT };
26:     enum ServiceStatus : uint32_t { UNKNOWN = 0, IDLE, CONNECT_SUCC };
27:     enum InfoType : uint8_t { DEFAULT = 0, DELAY_DATA = 1, MIMETYPE = 2};
28: 
29:     struct GlobalEvent final : public DistributedData::Serializable {
30:         uint8_t version = 0;
31:         uint8_t frameNum = 0;
32:         uint16_t user = 0;
33:         uint16_t seqId = 0;
34:         uint16_t status = EVT_UNKNOWN;
35:         int32_t syncTime = 0;
36:         uint32_t dataId = 0;
37:         uint64_t expiration = 0;
38:         bool isDelay = false;
39:         bool notNeedLink = false;
40:         std::string deviceId;
41:         std::string account;
42:         std::vector<std::string> dataType;
43: 
44:         bool operator==(const GlobalEvent globalEvent)
45:         {
46:             return globalEvent.seqId == this->seqId && globalEvent.deviceId == this->deviceId;
47:         }
48:         bool Marshal(json &node) const override;
49:         bool Unmarshal(const json &node) override;
50:     };
51: 
52:     class Factory {
53:     public:
54:         virtual ClipPlugin *Create() = 0;
55:         virtual bool Destroy(ClipPlugin *) = 0;
56:     };
57: 
58:     using DelayDataCallback = std::function<int32_t(const GlobalEvent &, uint8_t, std::vector<uint8_t> &)>;
59:     using DelayEntryCallback = std::function<int32_t(const GlobalEvent &, uint32_t, const std::string &,
60:         std::vector<uint8_t> &)>;
61:     using PreSyncCallback = std::function<void(const std::string &, ClipPlugin *)>;
62:     using PreSyncMonitorCallback = std::function<void(void)>;
63: 
64:     static bool RegCreator(const std::string &name, Factory *factory);
65:     static ClipPlugin *CreatePlugin(const std::string &name);
66:     static bool DestroyPlugin(const std::string &name, ClipPlugin *plugin);
67: 
68:     virtual ~ClipPlugin() = default;
69:     virtual int32_t SetPasteData(const GlobalEvent &event, const std::vector<uint8_t> &data, uint32_t version,
70:         const std::vector<uint8_t> &mimeTypes) = 0;
71:     virtual std::pair<int32_t, int32_t> GetPasteData(const GlobalEvent &event, std::vector<uint8_t> &data) = 0;
72:     virtual std::vector<GlobalEvent> GetTopEvents(uint32_t topN);
73:     virtual std::vector<GlobalEvent> GetTopEvents(uint32_t topN, int32_t user);
74:     virtual void Clear();
75:     virtual int32_t ApplyAdvancedResource(const std::string &deviceId);
76:     virtual int32_t PublishServiceState(const std::string &networkId, ServiceStatus status);
77:     virtual void Clear(int32_t user);
78:     virtual int32_t Close(int32_t user);
79:     virtual void RegisterDelayCallback(const DelayDataCallback &dataCallback, const DelayEntryCallback &entryCallback);
80:     virtual int32_t GetPasteDataEntry(const GlobalEvent &event, uint32_t recordId, const std::string &utdId,

Developer documentation requirements:
- Include source anchors for important claims: file path, visible symbol/function/class name when available, and why the anchor matters.
- Include a runbook when operational evidence exists: build, validation, deployment, rollback, and failure-mode notes.
- Include debugging guidance for each major module: symptom, likely source area, and command or file to inspect.
- State certainty boundaries: mark source-confirmed facts separately from inferred behavior or missing evidence.
