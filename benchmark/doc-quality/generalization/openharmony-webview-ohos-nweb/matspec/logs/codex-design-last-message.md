# web_webview 根模块实现设计

## 1. 设计概述

### 1.1 设计目标

1. 提供 OpenHarmony Web 生态中 WebView 原生能力（nweb）与多语言运行时（ANI/NAPI/CJ/nativecommon）的一致访问入口，基于 `README.md` 说明的 Chromium/CEF 引擎定位完成实现。
2. 在统一入口层管理引擎版本选择、动态库加载、跨域适配、服务能力扩展（Native Messaging）与接口桥接，避免上层直接耦合底层实现细节。
3. 在 `arkweb_utils` 约束下保持轻量和高可维护性：仅依赖已声明库，不依赖 WebView 核心实现层，并支持旧引擎兼容隔离。
4. 支持构建阶段桥接代码生成与产物同步，保障接口变更可持续迭代。
5. 为生产可观测性提供日志、故障事件与测试钩子，形成从预发布验证到发布回滚的可执行运行手册。

### 1.2 设计约束

1. `libarkweb_utils.so` 不应新增额外系统依赖，也不应直接依赖 `ohos_nweb` 实现，仅允许基于头文件级接口协作（依据：[`arkweb_utils/README.md`](arkweb_utils/README.md:核心约束)、[`arkweb_utils/arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:第42行起状态定义)）。
2. 引擎兼容必须通过版本保护宏进行边界治理，避免不支持特性在旧引擎链路中执行（依据：[`arkweb_utils/arkweb_utils.h`](arkweb_utils/arkweb_utils.h:宏定义段)）。
3. x86_64 路径常量存在空值分支，预加载行为需按架构分支实现降级（依据：[`arkweb_preload_common.cpp`](arkweb_utils/arkweb_preload_common.cpp:31-34,58-63)）。
4. ASAN 分支下 `SHARED_RELRO` 禁用相关优化，避免检测逻辑干扰（依据：[`arkweb_utils/arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:36-38,59-61)）。
5. 多模块接口更新必须同步 `bridge_gen.sh` 与 `copy_files.py` 的桥接/同步链路（依据：[`bridge_gen.sh`](ohos_interface/ohos_glue/scripts/bridge_gen.sh:16-27)、[`copy_files.py`](copy_files.py:21-77)）。

## 2. 系统架构

### 2.1 架构概述

`web_webview` 是“多入口-桥接-适配-引擎”组合式系统：  
- 上层 `interfaces/kits` 提供 ANI/NAPI/CJ/NativeCommon API 能力；  
- `ohos_interface` 建立公共接口与 C++/JS/CJ 桥接；  
- `ohos_nweb` 与 `ohos_wrapper` 承担 nweb 侧初始化、能力封装与回调；  
- `ohos_adapter` 提供跨能力系统服务适配；  
- `sa/web_native_messaging` 提供服务端/客户端跨进程链路；  
- `arkweb_utils` 作为核心运行时底层工具库管理引擎版本与加载预加载策略。  
此架构由 README 与目录分区证据可确认：[`README.md`](README.md:软件架构)、模块树说明（`arkweb_utils/`、`interfaces/`、`ohos_interface/`、`ohos_nweb/`、`ohos_adapter/`、`sa/`）。

### 2.2 模块职责

| 模块 | 职责 | 关键文件 |
|---|---|---|
| `arkweb_utils` | 引擎版本控制、路径解析、预加载与动态库加载、应用元信息解析、Shared RELRO 管理 | [`arkweb_utils/arkweb_utils.h`](arkweb_utils/arkweb_utils.h), [`arkweb_utils/arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp), [`arkweb_utils/arkweb_preload_common.h`](arkweb_utils/arkweb_preload_common.h), [`arkweb_utils/arkweb_preload_common.cpp`](arkweb_utils/arkweb_preload_common.cpp) |
| `interfaces/kits/ani` | ANI 侧 WebView 与 Native Messaging 扩展对象定义、生命周期、回调、异常转换（`business_error`） | [`interfaces/kits/ani/webnativemessagingextension/ability/include/ets_web_native_messaging_extension.h`](interfaces/kits/ani/webnativemessagingextension/ability/include/ets_web_native_messaging_extension.h), [`interfaces/kits/ani/webnativemessagingextension/ability/src/ets_web_native_messaging_extension.cpp`](interfaces/kits/ani/webnativemessagingextension/ability/src/ets_web_native_messaging_extension.cpp), [`interfaces/kits/ani/webview/native/common/business_error.h`](interfaces/kits/ani/webview/native/common/business_error.h) |
| `interfaces/kits/napi/cj/nativecommon` | WebView、媒体、存储、消息等 JS/CJ 能力暴露与参数适配 | `interfaces/kits/napi`, `interfaces/kits/cj`, `interfaces/native`（目录级统计与文件清单） |
| `ohos_interface` | 公共接口声明、生成式桥接、脚本化同步；确保多语言层与实现层调用边界一致 | [`ohos_interface/include`](ohos_interface/include), [`ohos_interface/ohos_glue`](ohos_interface/ohos_glue), [`ohos_interface/ohos_glue/scripts/bridge_gen.sh`](ohos_interface/ohos_glue/scripts/bridge_gen.sh), [`ohos_interface/ohos_glue/base/*`](ohos_interface/ohos_glue/base) |
| `ohos_adapter` | 分领域系统能力适配（音频、显示、传感器、网络等）与 `include/src` 映射 | `ohos_adapter/*`（如 `audio_adapter`, `camera_adapter`, `display_manager_adapter`, `net_connect_adapter`） |
| `ohos_nweb` | nweb 平台侧核心适配、初始化、快照/日志/调试相关封装 | [`ohos_nweb/include`](ohos_nweb/include), [`ohos_nweb/src`](ohos_nweb/src) |
| `ohos_wrapper` | 上层可见包装层，桥接内部对象与外部暴露能力 | [`ohos_wrapper/src/nweb_location_wrapper.cpp`](ohos_wrapper/src/nweb_location_wrapper.cpp) |
| `sa/web_native_messaging` | Native Messaging Service Ability 客户端与服务端协同、JSON 配置与 IPC 回调 | `sa/web_native_messaging/client`, `sa/web_native_messaging/service`, `sa/web_native_messaging/common` |
| 构建与同步脚本 | 桥接生成、头文件/接口同步、部署配置 | [`copy_files.py`](copy_files.py), [`bridge_gen.sh`](ohos_interface/ohos_glue/scripts/bridge_gen.sh), [`bundle.json`](bundle.json), [`hisysevent.yaml`](hisysevent.yaml) |
| `test` | 单元与 fuzz 侧质量验证（接口、nweb、adapter、Native messaging） | `test/fuzztest`, `test/unittest` |

### 2.3 技术栈

| 层次 | 技术 | 用途 |
|---|---|---|
| 引擎与系统库 | C/C++ | 核心能力、接口实现、适配器实现、桥接对象 |
| 构建与打包 | GN/HB（`BUILD.gn`）+ shell 脚本 | 多模块目标编译、桥接生成、构建流程联动 |
| 自动化与同步 | Python 脚本 (`copy_files.py`) | include 与 glue 同步到分发目录 |
| 语言绑定 | ANI, NAPI, CJ | 暴露给运行时（ArkTS/JS/CJ） |
| 持久化与配置 | JSON/参数系统/系统文件 | 引擎配置、运行参数与版本策略 |
| 测试 | fuzztest + unittest | 稳定性、边界输入与回归验证 |
| 监控与日志 | nweb_log + hisysevent | 运行时问题定位与事件上报 |

## 3. 数据模型

### 3.1 实体与结构

| 实体 | 用途 | 重要字段 |
|---|---|---|
| `ArkWebEngineVersion` | 引擎版本枚举（SYSTEM_DEFAULT/M114/M132/PLAYGROUND/SYSTEM_EVERGREEN） | `SYSTEM_DEFAULT`, `M114`, `M132`, `PLAYGROUND`, `SYSTEM_EVERGREEN`；依据：[`arkweb_utils/arkweb_utils.h`](arkweb_utils/arkweb_utils.h) |
| `ArkWebEngineType` | 将版本映射为类型语义 | `LEGACY`, `EVERGREEN`, `PLAYGROUND`；依据：[`arkweb_utils/arkweb_utils.h`](arkweb_utils/arkweb_utils.h) |
| `RenderPreLoadMode` | 渲染侧预加载策略 | `PRELOAD_NO`, `PRELOAD_PARTIAL`, `PRELOAD_FULL`；依据：[`arkweb_preload_common.h`](arkweb_utils/arkweb_preload_common.h), [`arkweb_preload_common.cpp`](arkweb_utils/arkweb_preload_common.cpp) |
| 应用元信息缓存 | 启动期参数与运行态状态 | `g_bundleName`, `g_apiVersion`, `g_appVersion`, `g_appEngineVersion`, `g_activeEngineVersion`, `g_appInfoMutex`；依据：[`arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:42-52,48-51) |
| Native messaging 连接上下文 | 连接生命周期与异步回调承载 | `ConnectNativeAsyncContext`, `AniExtensionConnectionCallback`, `WebExtensionConnectionCallback`，`WNMEConnectionInfo` 与连接 id；依据：[`ani_web_native_messaging_extension_manager.h`](interfaces/kits/ani/webnativemessagingextension/manager/include/ani_web_native_messaging_extension_manager.h), [`manager/src/ani_web_native_messaging_extension_manager.cpp`](interfaces/kits/ani/webnativemessagingextension/manager/src/ani_web_native_messaging_extension_manager.cpp) |
| ARTI 端能力扩展上下文 | ANI context 生命周期与 native 对象绑定 | `ETSWebNativeMessagingExtensionContext`, `nativeEtsContext`, `Finalizer`；依据：[`ets_web_native_messaging_extension_context.cpp`](interfaces/kits/ani/webnativemessagingextension/ability/src/ets_web_native_messaging_extension_context.cpp) |

### 3.2 持久化

- 主要持久化对象为文件配置与系统参数，而非数据库：  
  - 运行配置文件：`/data/service/el1/public/update/param_service/install/system/etc/ArkWebSafeBrowsing/generic/ArkWebCoreCfg.json`  
  - 版本文件：`/system/etc/ArkWebSafeBrowsing/generic/version.txt`、更新参数路径版本文件；  
  - 启动参数通过参数服务读取（如 `persist.arkwebcore.package_name`、`const.startup.nwebspawn.preloadMode` 等）。  
  - 依据：[`arkweb_utils/README.md`](arkweb_utils/README.md:路径与配置说明)、[`arkweb_utils/arkweb_preload_common.cpp`](arkweb_utils/arkweb_preload_common.cpp:47-53,74-76)。

- 索引与兼容策略：无显式索引层；以映射结构（集合/集合键）和内存缓存替代，如 `unordered_set` 管理应用名单与版本约束。  
  - 依据：[`arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:42-48)。

- 兼容与迁移策略：当前代码证据显示基于优先级判定+回退，且 `Set...Inner` 与公共接口分离，属于“前向兼容优先，失败回退可用”。具体迁移版本策略未在现有片段中完整展开。  
  - To be confirmed：`g_dataMigrateApp` 与 `DATA_MIGRATE_APP_*` 的完整生命周期与调用面（依据：[`arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:46-63)）。

## 4. 接口设计

### 4.1 对外接口

| 接口 | 调用方 | 输入 | 输出 |
|---|---|---|---|
| `getActiveWebEngineVersion()` | nweb 初始化、适配层、调试代码 | 无 | 当前活跃引擎版本（`ArkWebEngineVersion`） |
| `setActiveWebEngineVersion()` | CLI 参数解析/测试入口 | `ArkWebEngineVersion` | 更新全局活跃版本 |
| `IsActiveWebEngineEvergreen()` | 业务逻辑兼容分支 | 无 | 布尔 |
| `getActiveWebEngineType()` | 适配层选择逻辑 | 无 | `ArkWebEngineType` |
| `UpdateAppInfoFromCmdline(std::string&)` | 渲染进程参数处理 | 渲染命令行字符串 | 更新 `bundle/api/version` 缓存并清理参数 |
| `PreloadArkWebLibForRender()` / `PreloadArkWebLibForBrowser()` | Browser/Render 启动路径 | 无 | 触发库预加载 |
| `DlopenArkWebLib()` / `DlcloseArkWebLib()` | 引擎加载时序 | 无 | 执行/释放动态库加载 |
| `GetArkwebBundleInstallLibPath()` / `GetOhosAdptGlueSrcLibPath()` | 预加载与路径策略 | 无 | 真实加载路径 |
| `SetActiveWebEngineVersionInner`, `SetBundleNameInner` 等 | 内部调用 | 内部状态参数 | 更新内存状态 |
| `ANI_Constructor` | ANI 模块初始化入口 | VM 与返回版本 | `ANI_OK`/错误码 |
| `StsExtensionContextInit` | ANI 上下文初始化 | `ani_env*` | 初始化状态 |
| `ConnectNative` / `DisconnectNative` | Native Messaging 服务消费方 | `WNMEConnectionInfo` 引用 | 错误码 |
| `ConnectNativeAsyncContext` / `CommonAsyncContext` 及 `NmErrorCode` | 异步连接管理 | 回调上下文 | 回调与错误码 |
| 生成式桥接接口（如 WebSchemeHandler、webviewcontroller 等） | NAPI/ANI/CJ 上层 API 使用 | API 入参（运行时对象/回调） | 平台事件与对象返回值 |

所有对外接口的来源可追踪：核心入口和能力符号分别见  
- [`arkweb_utils.h`](arkweb_utils/arkweb_utils.h)  
- [`arkweb_preload_common.h`](arkweb_utils/arkweb_preload_common.h)  
- [`web_native_messaging_extension_context_ani.h`](interfaces/kits/ani/webnativemessagingextension/ability/include/web_native_messaging_extension_context_ani.h)  
- [`ani_web_native_messaging_extension_manager.h`](interfaces/kits/ani/webnativemessagingextension/manager/include/ani_web_native_messaging_extension_manager.h)。

### 4.2 内部接口

- `interfaces/kits` 与 `ohos_interface` 分离边界：业务接口变更先落在接口定义，再通过 `bridge_gen.sh` 生成桥接文件供适配层调用。  
  - 依据：[`bridge_gen.sh`](ohos_interface/ohos_glue/scripts/bridge_gen.sh), `ohos_glue` 目录结构。
- `ohos_adapter` 的 `include/src` 对应关系用于领域隔离，每个域保持单向依赖：接口声明在 include，具体实现在 src。  
  - 依据：`ohos_adapter/<domain>/include` 与 `ohos_adapter/<domain>/src`（目录证据+示例如 `audio_adapter`）。
- `ohos_nweb` 与 `sa` 通过 Service Ability 与客户端统一通信协议衔接，构成 Native Messaging 端到端链路。  
  - 依据：`interfaces/kits/ani` 头文件与 `sa/web_native_messaging` 目录证据。
- `ohos_adapter/ohos_glue` 与 `copy_files.py` 负责将桥接/接口同步到目标目录，避免手工复制导致的 API 不一致。  
  - 依据：[`copy_files.py`](copy_files.py:63-77), [`ohos_interface/ohos_glue`](ohos_interface/ohos_glue).

## 5. 核心流程设计

### 5.1 引擎选择与预加载流程

1. 启动/运行期读取应用参数与系统参数（含 `#--appEngineVersion`、`persist.arkwebcore.package_name` 等）确定候选版本；依据：`APP_ENGINE_VERSION_PREFIX` 与参数读取痕迹。  
   - 依据：[`arkweb_utils/arkweb_utils.h`](arkweb_utils/arkweb_utils.h:APP_ENGINE_VERSION_PREFIX), [`arkweb_preload_common.cpp`](arkweb_utils/arkweb_preload_common.cpp:46-53), [`arkweb_utils/README.md`](arkweb_utils/README.md:版本选择逻辑)。
2. 调用 `setActiveWebEngineVersion` 更新活跃引擎版本并进入 `getActiveWebEngineType` 分支。
3. 根据进程角色执行预加载：Render/Browser 使用 `PreloadArkWebLibForRender/Browser`；部分/完全预加载依赖 `RenderPreLoadMode` 与 RAM 门槛。  
   - 依据：[`arkweb_preload_common.h`](arkweb_preload_common.h), [`arkweb_preload_common.cpp`](arkweb_preload_common.cpp:40-44,69-80)。
4. 关键分支：  
   - 若系统参数或路径缺失 -> 记录错误并返回，不做强制加载（软失败）。  
   - ASAN 下 RELRO 禁用 -> 回退普通加载（通过编译分支控制）。  
   - x86_64 下 `GetArkwebBundleInstallLibPath` 的路径为空分支 -> 需结合 x86_64 运行约束决策。  
   - 依据：[`arkweb_preload_common.cpp`](arkweb_utils/arkweb_preload_common.cpp:21-34,58-63)。
5. 异常路径输出包括：路径为空、dlopen 失败、版本兼容不匹配时通过宏返回。

### 5.2 Native Messaging 生命周期流程

1. ANI 模块加载通过 `ANI_Constructor` 进入并完成 `StsExtensionContextInit`。  
   - 依据：[`web_native_messaging_extension_context_ani.cpp`](interfaces/kits/ani/webnativemessagingextension/ability/src/web_native_messaging_extension_context_ani.cpp:21-29,31-48)。
2. 扩展能力实例化：`ETSWebNativeMessagingExtension::Create` 创建能力对象，`Init` 注册上下文、能力信息；`CreateEtsWebNativeMessagingExtensionContext` 绑定 native context。  
   - 依据：[`ets_web_native_messaging_extension.cpp`](interfaces/kits/ani/webnativemessagingextension/ability/src/ets_web_native_messaging_extension.cpp:40-48,64-80), [`ets_web_native_messaging_extension_context.h`](interfaces/kits/ani/webnativemessagingextension/ability/include/ets_web_native_messaging_extension_context.h)。
3. 连接建立由 `ConnectNative` 与 `manager` 管理上下文并注册回调；连接结束由 `DisconnectNative` / `RemoveConnection` 触发资源回收。  
   - 依据：[`ani_web_native_messaging_extension_manager.h`](interfaces/kits/ani/webnativemessagingextension/manager/include/ani_web_native_messaging_extension_manager.h:33-67), [`ani_web_native_messaging_extension_manager.cpp`](interfaces/kits/ani/webnativemessagingextension/manager/src/ani_web_native_messaging_extension_manager.cpp:61-63,70-79)。
4. 回调销毁与上下文析构通过 Finalizer 执行；`nativeEtsContext` 非空则 delete。  
   - 依据：[`ets_web_native_messaging_extension_context.cpp`](interfaces/kits/ani/webnativemessagingextension/ability/src/ets_web_native_messaging_extension_context.cpp:52-67)。

### 5.3 桥接生成与同步流程

1. 接口变更触发 `bridge_gen.sh`，按 `nweb` / `adapter` / 全量生成。  
   - 依据：[`bridge_gen.sh`](ohos_interface/ohos_glue/scripts/bridge_gen.sh:17-27,38-40)。
2. 生成产物与头文件通过 `copy_files.py` 拷贝到分发树（include / glue 分层目录）。  
   - 依据：[`copy_files.py`](copy_files.py:63-77)。
3. 失败时采用回滚优先级：先回滚生成物，再回滚源码。  
   - To be confirmed 的策略基于工程执行经验与 Runbook 证据草案，不是直接完整代码路径。

## 6. 算法设计

1. 版本决策算法（高置信）
- 输入优先级：应用强制参数 > 系统参数 > legacy 应用名单 > 云端/更新版本文件。  
  - 依据：`arkweb_utils/README.md` 的版本决策说明 + `arkweb_utils.cpp` 状态变量。
- 输出：`getActiveWebEngineVersion` 与 `getActiveWebEngineType`，用于后续 API 兼容分支。  
  - 依据：[`arkweb_utils.h`](arkweb_utils/arkweb_utils.h:ArkWebEngineVersion/ArkWebEngineType定义), [`arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:42-45)。
2. 兼容门禁算法
- `RETURN_IF_UNSUPPORTED_ENGINE(minVersion)` 在运行时比对全局版本，低于阈值直接返回并记录不支持日志。  
  - 依据：[`arkweb_utils.h`](arkweb_utils/arkweb_utils.h:30-40)。
- `IS_CALLING_FROM_M114/M132` 与 `RETURN_IF_CALLING_FROM_*` 提供定向禁用策略。  
  - 依据：同上 43-78。
3. 预加载算法
- `RAM_SIZE_8G` 判断 + `RenderPreLoadMode` 控制是否加载 `libohos_adapter_glue_source.z.so` 与 `libarkweb_engine.so`。  
  - 依据：[`arkweb_preload_common.cpp`](arkweb_utils/arkweb_preload_common.cpp:37,40-44,69-76)。
4. Native Messaging 连接 id 策略
- 全局自增 `g_serialNumber` + 全局连接映射 `g_connects`，配合锁保护。  
  - 依据：[`ani_web_native_messaging_extension_manager.cpp`](interfaces/kits/ani/webnativemessagingextension/manager/src/ani_web_native_messaging_extension_manager.cpp:61-64,70-79)。

## 7. 缓存设计

1. 应用元信息与引擎状态缓存：`g_bundleName`、`g_apiVersion`、`g_appVersion`、`g_activeEngineVersion` 使用 `g_appInfoMutex` 保护，避免重复解析与多处计算。  
   - 依据：[`arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:42-52,51)。

2. 连接与回调对象缓存：
- `webview`/ANI 层在 context/connection 管理中维持长生命周期映射（`g_connects`、`connections_`），通过连接 id 进行查找和清理。  
  - 依据：[`ani_web_native_messaging_extension_manager.cpp`](interfaces/kits/ani/webnativemessagingextension/manager/src/ani_web_native_messaging_extension_manager.cpp:61-64,70-79)、[`ets_web_native_messaging_extension.h`](interfaces/kits/ani/webnativemessagingextension/ability/include/ets_web_native_messaging_extension.h:50-80)。

3. 缓存失效与一致性：
- 没有显式 TTL；主要靠生命周期退出、显式 remove/disconnect、进程销毁回收。  
- To be confirmed：是否存在持久化会话缓存与回收策略在未覆盖文件中未完全可见。  
- Inference：连接池行为主要是过程内状态，未见跨进程共享缓存语义。

4. No explicit design:
- No explicit distributed cache / LRU / 跨进程共享缓存。  
- No explicit 降级重建策略 beyond re-init（依据：缓存类实现片段未展示）。

## 8. 异常处理设计

| 类别 | 触发点 | 处理策略 | 观察点 |
|---|---|---|---|
| 参数与路径错误 | `GetArkwebBundleInstallLibPath` 返回空、缺参数、非法参数 | 日志记录并返回空/失败路径；不做崩溃式处理 | `WVLOG_E` 错误日志、dlopen 失败返回 |
| 版本不兼容 | 低版本调用高版本接口 | 宏判断返回 + `LogForUnsupportedFunc` 记录 | 兼容性日志 |
| 资源生命周期异常 | `Finalizer` 未获取 `nativeEtsContext`，或 `env` 为空 | 错误日志+防御性返回，避免野指针访问 | `WNMLOG_E` / `WVLOG_E` |
| 连接异常 | 连接不存在、重复连接 id、回调对象空 | 输出告警并按连接状态执行清理 | `WNMLOG_E/I/D` + `onDisconnect/onFailed` 路径 |
| 加载与预加载异常 | `dlopen` 或 `arkweb` namespace 组合异常 | 记录并终止该加载流程，允许后续逻辑按回退继续 | 预加载日志、测试路径 |

异常恢复与告警：
- 重试：当前证据未展示明确指数退避或重试循环（No explicit design）。
- 补偿：依赖分支式退回（无预加载、普通加载、降级策略）和连接清理。
- 告警：`hisysevent.yaml` 提供音视频/拖拽等组件级故障事件用于外部监控；日志主要用于开发排障。  
  - 依据：[`hisysevent.yaml`](hisysevent.yaml), [`nweb_log`](各文件日志调用)

## 9. 监控与日志

### 9.1 日志与指标

- 日志体系：`WVLOG_I`、`WVLOG_D`、`WVLOG_E` 为主链路输出（来自各 ANI/nweb 实现）。  
  - 依据：[`arkweb_utils/README.md`](arkweb_utils/README.md:日志与调试)、[`nweb_web_inited_callback.cpp`](interfaces/kits/ani/webview/native/webfunction/webview_web_inited_callback.cpp:33-47)。
- 关键日志字段：版本值、连接状态、回调执行状态、路径解析结果、加载成功/失败。
- 事件上报：`hisysevent.yaml` 中定义 `AUDIO_FRAME_DROP_STATISTICS`、`AUDIO_PLAY_ERROR`、`CAMERA_CAPTURE_ERROR`、`DRAG_DROP` 等域事件，`preserve=true` 提供可追踪保留。  
  - 依据：[`hisysevent.yaml`](hisysevent.yaml:14-40)。
- 审计要求：错误码、bundle 名称、错误分类、事件标签应可串联到具体能力域（如媒体/拖拽）。

### 9.2 运行手册（Runbook）

#### Build

1. 接口/桥接变更后执行桥接生成（按模块或全量）：  
   - `ohos_interface/ohos_glue/scripts/bridge_gen.sh [nweb|adapter] [--log-dir ...] [--stamp ...]`  
   - 依据：[`bridge_gen.sh`](ohos_interface/ohos_glue/scripts/bridge_gen.sh:17-27)  
2. 执行仓库标准 GN/HB 构建流程（当前证据中为推断）并生成对应目标。  
   - 依据：文件分布与 `BUILD.gn` 记录（如 fuzz 构建）。  
3. 必要时运行 `copy_files.py` 同步接口与 glue 产物：  
   - 依据：[`copy_files.py`](copy_files.py:63-77)。

#### Validation

1. fuzz 流水线优先最小验证：`test/fuzztest/ohos_nweb/setwebdebug_fuzzer`。  
   - 依据：[`test/fuzztest/ohos_nweb/setwebdebug_fuzzer/BUILD.gn`](test/fuzztest/ohos_nweb/setwebdebug_fuzzer/BUILD.gn:20-39)
2. 单元与能力验证：根据目录证据执行对应 `interfaces/` 与 `ohos_adapter` 子目录测试（To be confirmed：具体目标定义未在证据中完全展开）。  
3. 运行时验证项：引擎版本日志、预加载路径、Native messaging 注册与连接生命周期。

#### Deployment

1. 打包前确认 `bundle.json` 与同步产物（include/接口）一致。  
   - 依据：模块根目录存在 `bundle.json` 与 `copy_files.py` 设计目的。
2. 事件模型与日志链路对齐：确认 `hisysevent.yaml` 与发布版本一致。  
   - 依据：[`hisysevent.yaml`](hisysevent.yaml)。

#### Rollback

1. 优先回滚桥接/同步产物（bridge 或复制目录）到上次可用版本。  
2. 如为配置回退，恢复 `ArkWebCoreCfg.json`、`bundle.json`、`bridge_gen` 输入参数及参数策略。  
3. 若影响面大，先禁用新增模块入口并回退到原有 nweb 运行路径。

#### Failure mode 说明

- 版本判定偏差：参数优先级错置或配置未生效。  
- 预加载失败：路径为空、`dlns` 加载异常。  
- 注册失败：`ANI_Constructor` 未返回成功或模块名注册不一致。  
- 跨层符号缺失：桥接未生成或未同步导致链接/启动期 undef。  
- 资源泄漏迹象：连接未及时清理或 context finalizer 未触发。  

### 9.3 调试指南（按主要模块）

| 模块 | 典型症状 | 可能来源 | 检查方式 |
|---|---|---|---|
| `arkweb_utils` | 引擎类型与预期不符 | 版本参数读取顺序、`g_activeEngineVersion` 未刷新、路径常量错误 | 查阅 [`arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:42-53), [`arkweb_preload_common.cpp`](arkweb_utils/arkweb_preload_common.cpp:46-63), 参数文件与 `param` 值 |
| `ohos_interface/ohos_glue` | 启动报 undef symbol / binding 缺失 | `bridge_gen.sh` 未执行、生成结果未同步 | 检查 [`bridge_gen.sh`](ohos_interface/ohos_glue/scripts/bridge_gen.sh), 运行 `git diff` 对比生成产物, [`copy_files.py`](copy_files.py) 执行结果 |
| `interfaces/ani/webnativemessaging` | 注册失败、回调异常、对象泄漏 | `ANI_Constructor` 初始化失败、Finalizer 未触发、连接状态异常 | 检查 [`web_native_messaging_extension_context_ani.cpp`](interfaces/kits/ani/webnativemessagingextension/ability/src/web_native_messaging_extension_context_ani.cpp), [`ets_web_native_messaging_extension_context.cpp`](interfaces/kits/ani/webnativemessagingextension/ability/src/ets_web_native_messaging_extension_context.cpp), [`manager/src/ani_web_native_messaging_extension_manager.cpp`](interfaces/kits/ani/webnativemessagingextension/manager/src/ani_web_native_messaging_extension_manager.cpp) |
| `ohos_adapter` | 某域能力调用异常或崩溃 | 接口与实现签名不一致 | 对照 `ohos_adapter/<domain>/include` 与 `ohos_adapter/<domain>/src`；运行相关领域单元测试 |
| `ohos_nweb` | Web 初始化、debug 开关异常 | 参数解析、SDK 加载、日志策略 | 查阅 [`ohos_nweb/include`](ohos_nweb/include), [`ohos_nweb/src`](ohos_nweb/src), fuzz 样例 [`test/fuzztest/ohos_nweb/setwebdebug_fuzzer/setwebdebug_fuzzer.cpp`](test/fuzztest/ohos_nweb/setwebdebug_fuzzer/setwebdebug_fuzzer.cpp) |
| `sa/web_native_messaging` | Client-Service 连接失败 | IPC 回调签名、权限校验、Want 内容 | 比对 `sa/web_native_messaging/client` 与 `sa/web_native_messaging/service`，复查 `NmErrorMsg` 与 `NmErrorCode` |

### 9.4 设计确认边界与推断说明

- Source-confirmed（已确认）  
  - 引擎版本类型、兼容宏、路径/预加载常量与接口集合。  
  - `bridge_gen.sh` 与 `copy_files.py` 的生成/同步角色。  
  - ANI Native Messaging 类与上下文销毁链路。  

- Inferred（推断）  
  - 顶层 `BUILD` 入口与完整交付流水线顺序；当前仅见关键子模块 `BUILD.gn` 片段。  
  - 完整 `ohos_nweb` 与 `ohos_interface` 生成产物到运行时绑定的逐项映射表。  
  - 组件级重试策略的精细机制（如统一重试框架）。

- Missing evidence（缺失证据，To be confirmed）  
  - `ohos_nweb/src` 与 `ohos_nweb/include` 的关键初始化/生命周期入口签名在当前证据中未逐行展开。  
  - `bundle.json` 与部署目标间的完整关系映射。  
  - 跨域安全策略的全部鉴权链路与权限最小化策略完整证据。

## 10. 安全设计

1. 访问控制与权限  
- Native Messaging 错误码包含权限拒绝场景（`PERMISSION_DENY_ERR_MSG`、`PERMISSION_DENY`）。  
- 依据：[`ani_web_native_messaging_extension_manager.h`](interfaces/kits/ani/webnativemessagingextension/manager/include/ani_web_native_messaging_extension_manager.h:42-50)。

2. 输入校验与边界处理  
- 通过参数解析、类型检查与回调签名验证减少异常注入。  
- ANI/NAPI 侧统一错误码与异常对象封装（`BusinessError`、`AniBusinessErrorError`）。  
- 依据：[`business_error.h`](interfaces/kits/ani/webview/native/common/business_error.h), [`business_error.cpp`](interfaces/kits/ani/webview/native/common/business_error.cpp:23-61), [`napi_common_macros.h`](interfaces/kits/ani/webview/native/common/napi_common_macros.h:19-28)。

3. 资源与生命周期安全  
- `finalizer` 与 `connections_` destructor 主动关闭 fd，避免泄漏。  
- 依据：[`ets_web_native_messaging_extension.h`](interfaces/kits/ani/webnativemessagingextension/ability/include/ets_web_native_messaging_extension.h:50-80), [`ets_web_native_messaging_extension_context.cpp`](interfaces/kits/ani/webnativemessagingextension/ability/src/ets_web_native_messaging_extension_context.cpp:52-67), [`ani_web_native_messaging_extension_manager.cpp`](interfaces/kits/ani/webnativemessagingextension/manager/src/ani_web_native_messaging_extension_manager.cpp:70-80)。

4. 依赖与构建安全  
- 限制 `libarkweb_utils` 额外依赖并避免依赖 WebView 核心实现是显式设计约束，降低循环依赖与供应链复杂度。  
- 依据：[`arkweb_utils/README.md`](arkweb_utils/README.md:依赖约束章节), [`arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:40-63, 65-82)。

5. 运行时安全与兼容  
- ASAN 分支禁用 `Shared RELRO`，减少对检测稳定性的影响。  
- 依据：[`arkweb_utils.cpp`](arkweb_utils/arkweb_utils.cpp:36-38,59-61), [`arkweb_preload_common.cpp`](arkweb_utils/arkweb_preload_common.cpp:69-76).