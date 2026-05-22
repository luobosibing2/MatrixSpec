# Ascend Faultdiag Online 模块设计文档

## 模块目的

`component/ascend-faultdiag-online` 是 MindCluster 在线故障诊断组件，当前目录下同时包含慢节点检测与网络故障检测能力。本模块文档聚焦 `pkg/algo_src/netfault` 及其在线服务接入路径。

网络故障检测的核心目标是：基于超节点拓扑、拨测配置、ping 结果 CSV 数据，生成网络拨测列表并周期性分析网络链路异常，输出网络故障结果，同时将结果写入在线诊断上下文指标池并上报公共故障中心。

## 目录结构

| 路径 | 作用 |
|---|---|
| `app.go` | 在线故障诊断组件启动入口，初始化上下文、注册函数与路由，并按 app 列表启动特性。 |
| `pkg/algo_src/netfault/` | 网络故障检测算法的统一导出入口。 |
| `pkg/algo_src/netfault/externalbridge/` | 将核心框架的 `model.Input` 命令转换为 controller start/stop/reload/register 操作。 |
| `pkg/algo_src/netfault/controller/` | 网络故障检测控制器，负责扫描超节点目录、启动检测协程、读取 CSV、调用算法、写结果和触发回调。 |
| `pkg/algo_src/netfault/controllerflags/` | controller 生命周期状态标志。 |
| `pkg/algo_src/netfault/policy/` | 解析超节点拓扑、rack map、node device 信息，生成算法输入和 ping list 文件。 |
| `pkg/algo_src/netfault/algo/` | 网络拨测策略生成、滑动窗口分析、根因判定等算法实现。 |
| `pkg/model/netfault/` | 对外网络故障结果模型。 |
| `pkg/service/serviceapi/netfaultapi/` | 在线服务 API 层，提供 start/stop/reload 控制接口，处理算法回调结果。 |
| `pkg/register/` | 注册 netfault 函数处理器和 `/netfault/controller` API 路由。 |

## 核心组件

### 启动与注册层

| 组件 | 关键锚点 | 设计说明 |
|---|---|---|
| FD Online 启动入口 | `component/ascend-faultdiag-online/app.go:35`，`StartFDOnline` | 创建 `FaultDiagContext`，调用 `register.Setup` 注册函数和路由，启动服务。 |
| 函数注册 | `pkg/register/func_map.go:29`，`functionMap` | 将 `enum.NetFault` 绑定到 `netfault.Execute`，通过统一 `funchandler` 暴露给 API 层。 |
| 路由注册 | `pkg/register/router/netfault.go:31`，`GetNetFaultApi` | 注册 `/netfault/controller/start|stop|reload` 风格的控制接口。 |
| NetFault 导出入口 | `pkg/algo_src/netfault/export_interface.go:25`，`Execute` | 记录请求并转发到 `externalbridge.Execute`。 |

需要注意：`app.go` 中 `appFunc` 对 `enum.NetFault` 的值为 `nil`，因此 netfault 不通过 `StartFDOnline` 的 app goroutine 直接启动，而是通过注册后的 API/handler 控制启动。这是代码确认事实。

### API 与结果上报层

| 组件 | 关键锚点 | 设计说明 |
|---|---|---|
| ControllerStartFunc | `pkg/service/serviceapi/netfaultapi/netfault_api.go:82` | 校验上下文，获取 `enum.NetFault` handler，先注册回调再下发 start 命令。 |
| ControllerStopFunc | `pkg/service/serviceapi/netfaultapi/netfault_api.go:119` | 通过 handler 下发 stop 命令。 |
| ControllerReloadFunc | `pkg/service/serviceapi/netfaultapi/netfault_api.go:149` | 注册回调后下发 reload 命令。 |
| netfaultResultCallBack | `pkg/service/serviceapi/netfaultapi/netfault_api.go:193` | 解析算法输出 JSON 为 `[]netfault.ClusterResult`，写指标并上报公共故障中心。 |
| parseAndAddMetric | `pkg/service/serviceapi/netfaultapi/netfault_api.go:214` | 将检测结果拆成 MetricPool 中的网络域指标。 |
| sendToPubFaultCenter | `pkg/service/serviceapi/netfaultapi/netfault_api.go:276` | 构造公共故障请求并通过 gRPC 发送。 |
| createPubFault | `pkg/service/serviceapi/netfaultapi/netfault_api.go:303` | 根据 `ClusterResult` 生成 `PublicFaultRequest`。 |

### External Bridge 层

| 组件 | 关键锚点 | 设计说明 |
|---|---|---|
| 命令校验 | `pkg/algo_src/netfault/externalbridge/interfacebridge.go:38`，`checkInputInvalid` | 只接受 start、stop、reload、register；register 必须提供 callback。 |
| 命令转换 | `pkg/algo_src/netfault/externalbridge/interfacebridge.go:57`，`switchCommand` | 将框架枚举命令映射到 controller 内部命令。 |
| 生命周期执行 | `pkg/algo_src/netfault/externalbridge/interfacebridge.go:82`，`executeOrderByOrderQueue` | 根据 controller 退出状态决定启动、停止、重启或注册回调。 |
| 统一入口 | `pkg/algo_src/netfault/externalbridge/interfacebridge.go:110`，`Execute` | 使用全局互斥锁串行处理控制命令。 |

### Controller 层

| 组件 | 关键锚点 | 设计说明 |
|---|---|---|
| Start/Reload/Stop | `pkg/algo_src/netfault/controller/controller.go:75`，`Start`；`:84`，`Reload`；`:93`，`Stop` | 校验 `RAS_NET_ROOT_PATH + "/cluster"` 后启动或停止检测。 |
| 超节点扫描 | `pkg/algo_src/netfault/controller/net_fault_controller.go:391`，`startSuperPodsDetectionAsync` | 创建协程扫描 cluster 下的 `super-pod-N` 目录和 RoCE 目录。 |
| 检测任务入口 | `pkg/algo_src/netfault/controller/net_fault_controller.go:495`，`detectionCurSuperPod` | 等待配置文件和拓扑 JSON，组装算法参数，生成 ping list，进入循环检测。 |
| CSV 循环检测 | `pkg/algo_src/netfault/controller/net_fault_controller.go:293`，`loopCsvCallDetection` | 查找 CSV，异步读取，调用 `StartFaultDetect`，写 `network_fault.json`，触发 callback。 |
| CSV 读取 | `pkg/algo_src/netfault/controller/net_fault_controller.go:573`，`readCSVFile` | 读取有限大小文件，按 header 映射字段，并过滤早于检测启动时间的记录。 |
| RoCE 检测 | `pkg/algo_src/netfault/controller/net_fault_controller.go:677`，`startRoceDetection` | 读取 `super-pod-roce` 配置，合并多个超节点拓扑，生成跨超节点 RoCE ping list。 |

### Policy 层

| 组件 | 关键锚点 | 设计说明 |
|---|---|---|
| 超节点数据结构 | `pkg/algo_src/netfault/policy/type.go:25`，`SuperPodInfo` | 描述超节点版本、节点设备映射和 rack 映射。 |
| 算法参数组装 | `pkg/algo_src/netfault/policy/get_cur_superpodinfo.go:166`，`SetCallAlgorithmParamInfo` | 读取拓扑与配置，补齐算法所需参数。 |
| NPU 信息获取 | `pkg/algo_src/netfault/policy/get_cur_superpodinfo.go:233`，`GetTargetSuperPodNpuMap` | 返回当前超节点用于检测的 NPU 信息映射。 |
| A5 拓扑解析 | `pkg/algo_src/netfault/policy/get_cur_superpodinfo.go:521`，`parseA5ServerLevelTopologyFile` | 解析 A5 server-level 拓扑，生成链路路径和 NPU 信息。 |
| A3 超节点解析 | `pkg/algo_src/netfault/policy/parse_superpod_json.go:45`，`GetCurSuperPodInfoFromMapA3` | 从 `SuperPodInfo` 生成 A3 当前超节点信息。 |
| Rack map 解析 | `pkg/algo_src/netfault/policy/parse_rack_map.go:305`，`parseRackMap` | 解析 rack 内 NPU 全互联和网络平面路径。 |
| 超节点 ping list | `pkg/algo_src/netfault/policy/make_cur_superpod_serverspinglist.go:253`，`GenSuperPodServersPingList` | 调用算法生成超节点内服务器级 ping list。 |
| RoCE ping list | `pkg/algo_src/netfault/policy/make_cur_superpod_serverspinglist.go:269`，`GenRoceSuperPodLevelPingList` | 生成跨超节点 RoCE 平面的 ping list。 |

### Algorithm 层

| 组件 | 关键锚点 | 设计说明 |
|---|---|---|
| 算法对象 | `pkg/algo_src/netfault/algo/constants.go:201`，`NetDetect` | 保存当前超节点、NPU 类型、拨测周期、抑制周期、滑窗数据、历史告警等状态。 |
| 拨测参数设置 | `pkg/algo_src/netfault/algo/gen_pinglist.go:31`，`SetFaultDetectParam` | 校验参数和 NPU 信息，并写入 `NetDetect`。 |
| 拨测策略生成 | `pkg/algo_src/netfault/algo/gen_pinglist.go:63`，`GenPingStrategy` | 初始化策略、处理拓扑输入、生成 ping 字典并输出 ping list。 |
| 故障检测入口 | `pkg/algo_src/netfault/algo/fault_analyze.go:34`，`StartFaultDetect` | 更新告警 TTL、格式化输入、更新滑窗、取检测窗口并生成最终告警。 |
| 滑窗更新 | `pkg/algo_src/netfault/algo/window_sliding.go:30`，`updateCurSlideWindows` | 合并去重输入，只保留最近 `saveLenNum * period` 时间跨度数据。 |
| 队列消费 | `pkg/algo_src/netfault/algo/window_sliding.go:50`，`consumeQueueData` | 滑窗填满后按周期从待消费队列推进数据。 |
| 检测窗口提取 | `pkg/algo_src/netfault/algo/window_sliding.go:97`，`getWindowData` | 从滑窗中取指定周期区间的数据。 |
| 动态阈值 | `pkg/algo_src/netfault/algo/window_sliding.go:126`，`calDynamicThresholds` | 对同一路径的历史值计算均值与标准差阈值。 |
| 根因告警生成 | `pkg/algo_src/netfault/algo/fault_analyze.go:277`，`getFinalAlarm` | 基于检测窗口生成最终网络故障告警。 |

## 核心流程

### 1. 组件初始化流程

1. `StartFDOnline` 创建在线诊断上下文。
2. `register.Setup` 注册函数处理器和 API 路由。
3. `functionMap` 将 `enum.NetFault` 绑定到 `netfault.Execute`。
4. 外部调用 `/netfault/controller/start` 后进入 `ControllerStartFunc`。
5. `ControllerStartFunc` 注册算法回调，再通过 handler 下发 start 命令。

源码确认锚点：`app.go:35`、`pkg/register/func_map.go:29`、`pkg/register/router/netfault.go:31`、`pkg/service/serviceapi/netfaultapi/netfault_api.go:82`。

### 2. Controller 启动与目录扫描流程

1. `externalbridge.Execute` 串行处理 start 命令。
2. `executeOrderByOrderQueue` 在 controller 已退出时设置状态为运行并 goroutine 调用 `controller.Start`。
3. `controller.Start` 校验 `RAS_NET_ROOT_PATH + "/cluster"`。
4. `startSuperPodsDetectionAsync` 启动扫描循环。
5. 扫描逻辑识别 `super-pod-[0-9]+` 目录和 `super-pod-roce` 目录，并为每个检测对象创建协程。

源码确认锚点：`pkg/algo_src/netfault/externalbridge/interfacebridge.go:82`、`pkg/algo_src/netfault/controller/controller.go:75`、`pkg/algo_src/netfault/controller/net_fault_controller.go:391`。

### 3. 超节点内网络检测流程

1. `detectionCurSuperPod` 等待 `super-pod-N` 目录、`cathelper.conf` 和 `super-pod-N.json`。
2. `checkDiffConfig` 读取 `networkType`、`pingType`、`pingTimes`、`pingInterval`、`suppressedPeriod`、`period` 等配置。
3. `SetCallAlgorithmParamInfo` 解析超节点拓扑并设置算法参数。
4. `GetTargetSuperPodNpuMap` 获取检测目标 NPU map。
5. `NewNetDetect` 创建算法对象，`SetFaultDetectParam` 写入检测参数。
6. `GenSuperPodServersPingList` 生成 `ping_list_*`。
7. `loopCsvCallDetection` 周期读取 CSV，调用 `StartFaultDetect`。
8. 检测结果写入 `network_fault.json`，并通过 callback 交给 API 层处理。

源码确认锚点：`pkg/algo_src/netfault/controller/net_fault_controller.go:495`、`pkg/algo_src/netfault/policy/get_cur_superpodinfo.go:166`、`pkg/algo_src/netfault/policy/get_cur_superpodinfo.go:233`、`pkg/algo_src/netfault/policy/make_cur_superpod_serverspinglist.go:253`、`pkg/algo_src/netfault/controller/net_fault_controller.go:293`。

### 4. RoCE 跨超节点检测流程

1. 扫描到 `super-pod-roce` 目录后进入 `startRoceDetection`。
2. 等待 `super-pod-roce.json` 和 `cathelper.conf`。
3. 读取 RoCE 配置中的 `superPodList`。
4. 对每个超节点等待对应 `super-pod-N.json` 就绪。
5. `GetSuperPodsRoceNpuInfo` 合并多个超节点 NPU 与链路信息。
6. `GenRoceSuperPodLevelPingList` 生成跨超节点 RoCE ping list。
7. 后续复用 `loopCsvCallDetection` 的 CSV 读取和算法分析流程。

源码确认锚点：`pkg/algo_src/netfault/controller/net_fault_controller.go:677`、`pkg/algo_src/netfault/policy/get_cur_superpodinfo.go:1041`、`pkg/algo_src/netfault/policy/make_cur_superpod_serverspinglist.go:269`。

### 5. 算法检测流程

1. `StartFaultDetect` 先更新历史告警抑制 TTL。
2. 将 CSV 字段格式化为算法内部类型：丢包率转百分比、延迟转浮点、时间戳转整数、补齐 from/to layer。
3. 滑窗未填满时仅积累数据；达到 `saveLenNum` 个周期后开启队列消费。
4. 从滑窗中取最近检测周期数据。
5. 对同一路径计算动态阈值并识别丢包、延迟、断连等故障。
6. 聚合路径后生成根因告警结果。

源码确认锚点：`pkg/algo_src/netfault/algo/fault_analyze.go:34`、`pkg/algo_src/netfault/algo/window_sliding.go:30`、`pkg/algo_src/netfault/algo/window_sliding.go:97`、`pkg/algo_src/netfault/algo/window_sliding.go:126`、`pkg/algo_src/netfault/algo/fault_analyze.go:277`。

### 6. 结果处理流程

1. controller 将 `StartFaultDetect` 返回值 JSON 化。
2. 若已注册 callback，则异步调用 callback。
3. `netfaultResultCallBack` 将 JSON 解析为 `[]ClusterResult`。
4. `parseAndAddMetric` 写入诊断 MetricPool。
5. `sendToPubFaultCenter` 通过 gRPC 上报公共故障中心。
6. `createPubFault` 根据源/目的类型和 ID 生成 fault code、fault ID、影响范围和描述。

源码确认锚点：`pkg/algo_src/netfault/controller/net_fault_controller.go:293`、`pkg/service/serviceapi/netfaultapi/netfault_api.go:193`、`pkg/service/serviceapi/netfaultapi/netfault_api.go:214`、`pkg/service/serviceapi/netfaultapi/netfault_api.go:276`、`pkg/service/serviceapi/netfaultapi/netfault_api.go:303`。

## 接口与数据结构

### 控制输入

`model.Input` 是 netfault 对核心框架暴露的统一控制输入。当前代码使用字段包括：

| 字段 | 用途 |
|---|---|
| `Command` | 支持 `start`、`stop`、`reload`、`register`。 |
| `Func` | register 命令时传入检测结果 callback。 |
| `Target` | API 层创建输入时传入 `enum.Cluster`。 |

源码确认锚点：`pkg/algo_src/netfault/externalbridge/interfacebridge.go:38`、`pkg/service/serviceapi/netfaultapi/netfault_api.go:411`。

### 检测结果模型

`ClusterResult` 位于 `pkg/model/netfault/netfault.go:23`，字段包括：

| 字段 | JSON 名 | 说明 |
|---|---|---|
| `TaskID` | `taskId` | 网络检测任务 ID。 |
| `TimeStamp` | `timestamp` | 检测结果时间戳。 |
| `MinLossRate` / `MaxLossRate` / `AvgLossRate` | `minLossRate` / `maxLossRate` / `avgLossRate` | 丢包率统计。 |
| `MinDelay` / `MaxDelay` / `AvgDelay` | `minDelay` / `maxDelay` / `avgDelay` | 延迟统计。 |
| `SrcID` / `DstID` | `srcId` / `dstId` | 源和目的对象 ID。 |
| `SrcType` / `DstType` | `srcType` / `dstType` | 源和目的对象类型。 |
| `Level` | `level` | 故障等级。 |
| `FaultType` | `faultType` | 故障类型。 |

### 拨测列表模型

`PingItem` 位于 `pkg/algo_src/netfault/algo/type.go:19`，用于输出 ping list：

| 字段 | JSON 名 | 说明 |
|---|---|---|
| `SrcType` / `DstType` | `srcType` / `dstType` | 源/目的对象类型。 |
| `PktSize` | `pktSize` | ping 包大小。 |
| `SrcCardPhyId` | `srcCardPhyId` | 源端物理卡 ID。 |
| `SrcAddr` / `DstAddr` | `srcAddr` / `dstAddr` | 源/目的网络地址。 |

### 拓扑模型

`SuperPodInfo` 位于 `pkg/algo_src/netfault/policy/type.go:25`，包含：

| 字段 | 说明 |
|---|---|
| `Version` | 超节点版本，如 A3/A5。 |
| `SuperPodID` | 超节点标识。 |
| `NodeDeviceMap` | 节点到设备信息的映射。 |
| `RackMap` | rack 到服务器和 NPU 的映射。 |

`NpuInfo` 同文件定义，承载端口、物理 ID、VNIC IP 和多层网络拓扑信息。

### 算法对象

`NetDetect` 位于 `pkg/algo_src/netfault/algo/constants.go:201`，保存以下关键状态：

| 字段类别 | 代表字段 | 作用 |
|---|---|---|
| 当前检测对象 | `curSuperPodId`、`curNpuType` | 标识当前检测范围和拓扑类型。 |
| 检测配置 | `curPingPeriod`、`curSuppressedPeriod`、`curPingObjType` | 控制检测周期、告警抑制和拨测对象类型。 |
| 拓扑输入 | `curNpuInfo`、`curServerIdMap`、`curTopo` | 支撑路径和根因定位。 |
| 滑窗状态 | `curSlideWindows`、`curConsumedQueue`、`curSlideWindowsMaxTs` | 支撑周期性检测和队列推进。 |
| 根因索引 | `pathIndex` | 聚合路径和根因判断。 |

## 关键约束

| 约束 | 来源锚点 | 说明 |
|---|---|---|
| 控制命令串行执行 | `pkg/algo_src/netfault/externalbridge/interfacebridge.go:110` | `Execute` 使用全局互斥锁，避免 start/stop/reload 并发交错。 |
| controller 初始状态为退出 | `pkg/algo_src/netfault/controllerflags/controller_flags.go:38` | `IsControllerExited` 初始为 `true`，start/reload 基于该状态切换。 |
| 根目录来自环境变量 | `pkg/algo_src/netfault/controller/controller.go:69` | 检测目录为 `RAS_NET_ROOT_PATH + "/cluster"`。 |
| 空根目录保护 | `pkg/algo_src/netfault/controller/controller.go:34` | 若 clusterPath 为 `/cluster`，认为缺少 root dir 并退出。 |
| 超节点目录命名 | `pkg/algo_src/netfault/controller/net_fault_controller.go:36` | 仅识别 `super-pod-[0-9]+`。 |
| 超节点 ID 范围 | `pkg/algo_src/netfault/controller/net_fault_controller.go:42` | super-pod ID 限制为 `0..65535`。 |
| 最大检测对象数 | `pkg/algo_src/netfault/controller/net_fault_controller.go:31` | 超过 `maxSuperPodDetectionNums` 会拒绝新增检测。 |
| 文件遍历数量限制 | `pkg/algo_src/netfault/controller/net_fault_controller.go:329`、`:554` | Walk 时受 `constants.MaxFileCount` 限制。 |
| 文件读取大小限制 | `pkg/algo_src/netfault/controller/net_fault_controller.go:574` | CSV 和配置读取使用 `ReadLimitBytes`，限制为 `constants.Size10M`。 |
| 结果文件拒绝软链接 | `pkg/algo_src/netfault/controller/net_fault_controller.go:94` | 写 `network_fault.json` 前检查软链接并拒绝。 |
| 滑窗填满前不输出告警 | `pkg/algo_src/netfault/algo/fault_analyze.go:48` | 窗口周期数小于 `saveLenNum` 时返回空结果。 |
| 告警抑制周期 | `pkg/algo_src/netfault/algo/fault_analyze.go:93` | 历史告警按 `curSuppressedPeriod` TTL 清理。 |

## 运维 Runbook

### 构建

源码确认事实：

- 仓库级构建脚本 `build/build_all.sh` 会将 `component/*` 复制到 `$GOPATH`，再按组件构建。
- `component/ascend-faultdiag-online/go.mod` 声明模块名为 `ascend-faultdiag-online`，Go 版本为 `1.20`，并通过 `replace ascend-common => ../ascend-common` 依赖相邻公共组件。
- README 中仓库构建说明提到整体构建使用 Go 1.21，但该模块 `go.mod` 自身声明 Go 1.20。

建议验证命令：

| 场景 | 命令 |
|---|---|
| 模块级单测 | `cd component/ascend-faultdiag-online && go test ./...` |
| 仅网络故障算法 | `cd component/ascend-faultdiag-online && go test ./pkg/algo_src/netfault/...` |
| API 层测试 | `cd component/ascend-faultdiag-online && go test ./pkg/service/serviceapi/netfaultapi` |
| Controller 测试 | `cd component/ascend-faultdiag-online && go test ./pkg/algo_src/netfault/controller` |
| Policy 测试 | `cd component/ascend-faultdiag-online && go test ./pkg/algo_src/netfault/policy` |
| Algorithm 测试 | `cd component/ascend-faultdiag-online && go test ./pkg/algo_src/netfault/algo` |

### 部署与启动

源码确认的运行前置：

1. 设置 `RAS_NET_ROOT_PATH`，使 `${RAS_NET_ROOT_PATH}/cluster` 指向网络检测数据根目录。
2. 在 cluster 根目录下准备 `super-pod-N` 目录。
3. 每个超节点目录需要有 `cathelper.conf` 和 `super-pod-N.json`。
4. 如果启用跨超节点 RoCE 检测，需要准备 `super-pod-roce` 目录、`super-pod-roce.json` 和对应 `cathelper.conf`。
5. 通过在线服务 API 调用 netfault controller start/reload/stop。

缺失证据边界：当前给定文件列表和仓库证据中没有看到 `ascend-faultdiag-online` 独立部署 YAML、Dockerfile 或 build 脚本，因此部署镜像、容器参数、Service 暴露方式不能从本模块源码直接确认。

### 回滚与停止

| 操作 | 机制 |
|---|---|
| 停止检测 | 调用 `/netfault/controller/stop` 对应的 `ControllerStopFunc`，下发 stop 命令。 |
| 重载检测 | 调用 `/netfault/controller/reload`，先停止再重新启动 controller。 |
| 清理检测产物 | controller 停止某个超节点检测后会删除该超节点目录下的 `ping_list_*` 文件。 |
| 避免残留误判 | reload 首次写结果时会清空已有 `network_fault.json`。 |

源码锚点：`pkg/service/serviceapi/netfaultapi/netfault_api.go:119`、`:149`，`pkg/algo_src/netfault/controller/net_fault_controller.go:263`、`:76`。

### 失败模式

| 症状 | 可能原因 | 检查位置 |
|---|---|---|
| start 后没有检测 | `RAS_NET_ROOT_PATH` 未设置，导致路径为 `/cluster`。 | `controller.go:34`，检查运行环境变量和日志 `empty input : no root dir`。 |
| 超节点检测未启动 | `super-pod-N` 目录、`cathelper.conf` 或 `super-pod-N.json` 未就绪。 | `net_fault_controller.go:413`，查看 retry 日志。 |
| 没有算法输出 | 滑窗周期未填满。 | `fault_analyze.go:48`，查看 `windows num is... data is not full` 日志。 |
| CSV 读取失败 | CSV 为空、格式错误、超出大小限制或时间戳无法解析。 | `net_fault_controller.go:573`，检查 CSV header、最后一列 timestamp。 |
| 结果没有进入指标池 | callback 未注册、上下文为空或运行模式不是 cluster。 | `netfault_api.go:193`。 |
| 公共故障中心无上报 | gRPC client 获取失败、请求构造失败或返回码非 0。 | `netfault_api.go:276`。 |
| ping list 未生成 | policy 解析拓扑失败或算法参数不完整。 | `get_cur_superpodinfo.go:166`、`make_cur_superpod_serverspinglist.go:253`、`gen_pinglist.go:31`。 |
| RoCE 检测未启动 | `super-pod-roce.json` 缺失、`superPodList` 为空或关联超节点 JSON 未就绪。 | `net_fault_controller.go:622`、`:677`。 |

## 调试指南

### API/注册层

| 症状 | 可能源码区域 | 建议检查 |
|---|---|---|
| API 返回 no handler | `pkg/register/func_map.go`、`pkg/service/serviceapi/netfaultapi/netfault_api.go` | 确认 `register.Setup` 是否执行，`ctxData.Framework.FuncHandler[enum.NetFault]` 是否存在。 |
| start/reload 无回调结果 | `registerCallback`、`netfaultResultCallBack` | 检查 `ControllerStartFunc` 是否先注册 callback，算法输出 JSON 是否匹配 `ClusterResult`。 |
| 指标池没有网络指标 | `parseAndAddMetric` | 检查 `ClusterResult` 是否为空，MetricPool 是否接受 `NetworkDomain`。 |

### Controller 层

| 症状 | 可能源码区域 | 建议检查 |
|---|---|---|
| controller 卡住 stop | `controller.go:51`，`stopController` | 查看 `controllerExitCond.Signal()` 是否被触发，检测协程是否退出。 |
| 检测目录反复 retry | `loopWaitSuperPodDirAndCheckConfigFile` | 检查 `super-pod-N`、`cathelper.conf`、`super-pod-N.json` 的路径和命名。 |
| 检测对象被删除后不再运行 | `ifAddNewSuperPodDetection`、`markFalseDetection` | 检查 config switch 是否关闭，或者检测函数是否因错误调用 `markFalseDetection`。 |
| 结果文件写入失败 | `writeNetFaultResult` | 检查 `network_fault.json` 是否软链接、目录权限、文件大小和路径合法性。 |

### Policy 层

| 症状 | 可能源码区域 | 建议检查 |
|---|---|---|
| A3 拓扑解析异常 | `parse_superpod_json.go`、`parse_node_device_json.go` | 检查 `SuperPodInfo.NodeDeviceMap`、`RackMap` 是否完整。 |
| A5 拓扑解析异常 | `get_cur_superpodinfo.go:521` | 检查 server-level topology 文件是否存在，端口、EID、rack/server ID 是否匹配。 |
| ping list 为空 | `gen_ping_listinput.go`、`make_cur_superpod_serverspinglist.go` | 检查 `npu_npu`、`npu_netplane`、`serverIdMap` 是否生成。 |
| RoCE 拓扑合并异常 | `GetSuperPodsRoceNpuInfo` | 检查 `superPodList` 去重排序后每个超节点的 JSON 是否就绪。 |

### Algorithm 层

| 症状 | 可能源码区域 | 建议检查 |
|---|---|---|
| 参数校验失败 | `gen_pinglist.go:91`，`checkParamsMap` | 必需参数包括 `period`、`suppressedPeriod`、`pingObjType`；`setNecessaryParams` 还要求 `serverIdMap`。 |
| 不生成 ping 策略 | `GenPingStrategy` | 检查输入 topology 是否能构建 `chainList` 和 `dfChainsMap`。 |
| 延迟/丢包异常未告警 | `fault_analyze.go`、`window_sliding.go` | 检查滑窗是否填满、同一路径历史数据是否足够、动态阈值是否过高。 |
| 重复告警被抑制 | `updateHistoryAlarmMap` | 检查 `suppressedPeriod` 配置和 `globalHistoryAlarms` 状态。 |

## 测试覆盖

给定模块文件包含以下测试分布：

| 目录 | 测试重点 |
|---|---|
| `pkg/algo_src/netfault/algo/*_test.go` | 通用工具、拨测策略生成、滑动窗口、故障分析。 |
| `pkg/algo_src/netfault/controller/*_test.go` | controller start/stop、CSV 读取、超节点检测流程、RoCE 流程。 |
| `pkg/algo_src/netfault/controllerflags/*_test.go` | controller 状态标志读写。 |
| `pkg/algo_src/netfault/externalbridge/*_test.go` | 输入校验、命令转换、Execute 行为。 |
| `pkg/algo_src/netfault/policy/*_test.go` | superpod JSON、node device、rack map、ping list 输入和拓扑解析。 |
| `pkg/service/serviceapi/netfaultapi/*_test.go` | controller API、公共故障请求构造、故障码判断。 |

## 确定性边界

### 源码确认事实

- NetFault 通过 `functionMap` 注册为框架 handler，而不是由 `app.go` 的 `appFunc` 直接启动。
- 控制命令支持 start、stop、reload、register，并由 `externalbridge.Execute` 串行化。
- controller 检测根路径来自 `RAS_NET_ROOT_PATH + "/cluster"`。
- 超节点目录命名为 `super-pod-N`，跨超节点 RoCE 目录名为 `super-pod-roce`。
- 检测结果落盘文件名为 `network_fault.json`。
- 算法在滑窗未达到 `saveLenNum` 个周期前不会输出告警。
- API 回调会将检测结果写入 MetricPool，并尝试通过 gRPC 上报公共故障中心。
- 模块 `go.mod` 使用 Go 1.20，并依赖相邻 `ascend-common`。

### 基于代码的推断

- NetFault 的常规启动路径应是服务启动后调用 `/netfault/controller/start`，而不是在 `StartFDOnline` 的 app 列表中直接传入 `netFault` 后自动运行。
- `cathelper.conf` 是超节点检测和 RoCE 检测的关键运行配置文件，缺失时检测协程会等待或退出。
- CSV 文件的最后一列必须是毫秒时间戳，否则 `readCSVFile` 会跳过无法解析的记录。
- 公共故障中心上报依赖外部 gRPC 客户端配置，模块内只包含调用逻辑，没有部署侧连接配置证据。

### 缺失证据

- 未在给定证据中看到 `ascend-faultdiag-online` 独立构建脚本、容器镜像 Dockerfile 或 Kubernetes 部署 YAML。
- 未在给定证据中看到 `cathelper.conf`、`super-pod-N.json`、`super-pod-roce.json` 的完整生产样例。
- 未在给定证据中看到在线服务 API 的最终 HTTP 路径拼接规则和监听端口配置。
- 未执行运行时验证，本文档仅基于仓库源码和给定证据分析生成。