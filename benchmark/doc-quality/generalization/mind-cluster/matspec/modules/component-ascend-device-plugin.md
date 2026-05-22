# Ascend Device Plugin 模块设计文档

## 1. 模块定位

Ascend Device Plugin 位于 `component/ascend-device-plugin`，是 MindCluster 集群调度链路中负责向 Kubernetes 暴露昇腾 NPU 资源的节点侧组件。模块以 Kubernetes Device Plugin 机制为主入口，完成设备发现、健康状态更新、资源上报、容器分配、设备挂载、故障信息写入 ConfigMap、节点标签/注解更新，以及与 Volcano 调度、Ascend Docker Runtime、热复位、软切分、A5 拓扑、DPU、交换机故障等能力的协同。

源码确认的核心能力来自以下锚点：

| 能力 | 源码锚点 | 说明 |
|---|---|---|
| 启动参数、日志初始化、主流程编排 | `component/ascend-device-plugin/main.go`：`main`、`checkParam`、`setParameters` | 负责解析参数、校验运行模式、初始化设备管理器并启动监听协程 |
| 设备管理器 | `pkg/server/manager.go`：`HwDevManager`、`NewHwDevManager`、`ListenDevice` | 负责设备发现、状态刷新、K8s 通知、ConfigMap 同步、热复位等主循环 |
| Kubelet Device Plugin gRPC 服务 | `pkg/server/server.go`：`PluginServer.Start`、`serve`、`register` | 负责创建 Unix socket、启动 gRPC、向 kubelet 注册资源 |
| ListAndWatch / Allocate | `pkg/server/plugin.go`：`ListAndWatch`、`responseToKubelet`、`Allocate` | 负责向 kubelet 推送设备列表，并在容器创建时返回设备、环境变量和挂载 |
| 产品形态适配 | `pkg/device/ascend310.go`、`ascend310p.go`、`ascend910.go` | 负责不同 Ascend 设备类型的发现、健康处理和设备名组装 |
| Kubernetes 访问 | `pkg/kubeclient/kubeclient.go`：`ClientK8s`、`NewClientK8s` | 封装 node、pod、configmap、pod informer 等访问能力 |
| 故障策略与 ConfigMap 数据结构 | `pkg/common/fault_code.go`、`pkg/common/proto.go`、`pkg/common/upgradefault.go` | 定义故障等级、故障升级、设备信息缓存、任务恢复信息等结构 |
| 重复挂载检测 | `pkg/duplicatedetector/manager.go`：`CheckDuplicateDevices`、`Manager` | 通过容器运行时扫描/事件监听发现多个容器挂载同一 NPU 的风险 |

## 2. 目录结构与职责

| 路径 | 职责 |
|---|---|
| `main.go` | 进程入口，定义运行参数、日志配置、参数校验、初始化 `HwDevManager`，启动设备、DPU、拓扑、重复挂载检测等后台任务 |
| `build/` | 构建脚本、镜像 Dockerfile、部署 YAML、故障码配置、设备名定制配置、DPU 配置、测试脚本 |
| `pkg/common/` | 通用常量、运行参数、数据结构、故障码解析、故障升级原因、文件管理、切片工具、发送状态统计 |
| `pkg/device/` | 设备产品形态适配层，包含 Ascend310、Ascend310P、Ascend910、A3/A5、热复位、交换机和 DPU 相关处理 |
| `pkg/device/deviceswitch/` | 交换机故障相关封装，包含 C 头文件 `library.h` |
| `pkg/device/dpucontrol/` | DPU 发现与 DPU 设备映射过滤 |
| `pkg/duplicatedetector/` | 容器 NPU 重复挂载检测管理器 |
| `pkg/duplicatedetector/cache/` | 容器设备挂载缓存与重复检测 |
| `pkg/duplicatedetector/containerruntime/` | Docker / containerd 客户端适配 |
| `pkg/kubeclient/` | Kubernetes client、pod informer、ConfigMap、node/pod patch 等能力 |
| `pkg/next/devicefactory/` | 新设备工厂入口，初始化 devmanager、switch manager、自定义设备名配置 |
| `pkg/next/devicefactory/customname/` | 从 `/usr/local/deviceNameCustomization.json` 加载设备公开名/内部名转换规则 |
| `pkg/server/` | Device Plugin gRPC 服务、设备管理主循环、分配逻辑、PodResources 查询、DPU 监听、A5 拓扑信息 |
| `pkg/topology/` | RAS 拓扑文件写入与 A5 rack/super pod 拓扑配置检查 |

## 3. 核心组件设计

### 3.1 进程入口与参数模型

`main.go` 定义了中心侧、边侧、Volcano、虚拟设备、热复位、软切分、慢节点、A3 单 die、DPU/拓扑等运行开关。`checkParam` 聚合多个校验函数，约束典型冲突配置：

| 参数/校验 | 源码锚点 | 约束 |
|---|---|---|
| `listWatchPeriod` | `main.go`：`checkListWatchPeriod` | 取值范围 `[3, 1800]` 秒 |
| `presetVirtualDevice` 与 `volcanoType` | `main.go`：`checkPresetAndVolcanoRelation` | 关闭预置虚拟设备时必须使用 Volcano |
| `use310PMixedInsert` 与 `volcanoType` | `main.go`：`checkUse310PMixedInsertWithVolcano` | 310P 混插模式不能同时开启 Volcano |
| `shareDevCount` | `main.go`：`checkShareDevCount` | 范围 `[1, 100]` |
| `softShareDevConfigDir` | `main.go`：`checkSoftShareDevConfigDir` | 必须是绝对路径，且 `shareDevCount` 必须为最大共享数 |
| `deviceResetTimeout` | `main.go`：`checkDeviceResetTimeout` | 必须在 `api.MinDeviceResetTimeout` 到 `api.MaxDeviceResetTimeout` 范围内 |

`main` 的启动链路为：解析参数 -> 初始化日志 -> 校验参数 -> `setParameters` 写入 `common.ParamOption` -> `devicefactory.InitFunction` -> `NewHwDevManager` -> 启动 `ListenDevice`、`ListenDpu`、`RasTopoWriteTask`、`CheckDuplicateDevices` -> 信号等待。

### 3.2 设备工厂与 HwDevManager

`pkg/next/devicefactory/entry.go` 的 `InitFunction` 先加载设备公开名配置，再初始化底层 devmanager 和 switch manager，最后构造 `server.HwDevManager`。`HwDevManager` 是模块内最核心的编排对象。

`HwDevManager` 的关键字段位于 `pkg/server/manager.go`：

| 字段 | 含义 |
|---|---|
| `SwitchDevManager` | 交换机故障管理器 |
| `groupDevice` | 按设备类型分组后的 NPU 设备 |
| `ServerMap` | 设备类型到 `PluginServer` 的映射 |
| `allInfo` | 全量 NPU 信息，类型为 `common.NpuAllInfo` |
| `manager` | 产品形态适配接口 `device.DevManager` |
| `RunMode` / `WorkMode` | 设备运行模式与工作模式 |
| `baseNPUInfo` | 节点注解中的 NPU 基础信息缓存 |
| `dpuManager` | DPU 过滤器 |
| `ContainerRuntime` | 从 node status 获取的容器运行时类型 |

`NewHwDevManager` 完成以下初始化：

1. `setAscendManager` 根据 `dmgr.GetDevType()` 选择 Ascend310、Ascend310P、Ascend910 管理器。
2. 获取产品型号、AiCore 数量、卡用法模式，写入 `common.ParamOption`。
3. `setAllDeviceAndType` 获取设备列表并按类型分组。
4. 初始化 reset info manager。
5. 校验产品形态支持范围。
6. 设置 SuperPod / Rack / ServerIndex 等信息。
7. `UpdateNode` 更新 Kubernetes Node 标签和注解。
8. 对新公开资源名 `huawei.com/npu` 场景清理旧资源名。
9. `initPluginServer` 为每类设备创建 `PluginServer`。
10. 获取容器运行时，用于重复挂载检测。

### 3.3 产品形态适配层

`pkg/device/ascendcommon.go` 定义 `DevManager` 接口，产品形态管理器必须实现设备发现、健康更新、虚拟设备创建销毁、Pod 注解、热复位、故障处理、DPU 设置、ConfigMap 加载等能力。

主要实现：

| 文件 | 类型 | 作用 |
|---|---|---|
| `pkg/device/ascend310.go` | `HwAscend310Manager` | 310 / 310B 设备发现和上报 |
| `pkg/device/ascend310p.go` | `HwAscend310PManager` | 310P、310P 虚拟设备/混插相关处理 |
| `pkg/device/ascend910.go` | `HwAscend910Manager` | 910 / 910A / 910B / 910A3 / 910A5 设备发现、虚拟设备、热复位 |
| `pkg/device/ascendtolerance.go` | 热复位/容错辅助 | 故障设备恢复、任务处理、reset CM 协同 |
| `pkg/device/ascendcommon_v2.go` | 公共补充能力 | A5、节点标签、故障模式等补充能力 |
| `pkg/device/reset_info_mgr.go` | reset 信息管理 | 启动时和恢复时维护 reset 状态 |

以 `HwAscend910Manager.GetNPUs` 为例，源码确认该函数通过 `dmgr.GetDeviceList()` 获取设备列表，再对每个设备获取 Davinci 信息和虚拟设备信息；没有虚拟设备时组装物理设备，有虚拟设备时组装虚拟设备；当 `PresetVDevice=false` 时还会构造 AiCore 资源列表。

### 3.4 PluginServer 与 kubelet Device Plugin 接口

`PluginServer` 位于 `pkg/server/types.go`，实现 kubelet Device Plugin gRPC 接口。其职责包括：

| 接口/函数 | 源码锚点 | 作用 |
|---|---|---|
| `Start` | `pkg/server/server.go`：`PluginServer.Start` | 清理旧服务、启动 gRPC、向 kubelet 注册 |
| `serve` | `pkg/server/server.go`：`serve` | 创建 Unix socket、注册 DevicePluginServer、启动 gRPC |
| `register` | `pkg/server/server.go`：`register` | 调用 kubelet registration API 注册资源名 |
| `ListAndWatch` | `pkg/server/plugin.go`：`ListAndWatch` | 推送设备列表和健康状态给 kubelet |
| `responseToKubelet` | `pkg/server/plugin.go`：`responseToKubelet` | 根据 Volcano、软切分、虚拟设备模式构造响应设备列表 |
| `Allocate` | `pkg/server/plugin.go`：`Allocate` | 根据 kubelet 分配请求返回设备挂载、环境变量、软切配置目录、拓扑文件环境变量 |
| `GetPreferredAllocation` | `pkg/server/plugin.go`：`GetPreferredAllocation` | 返回不支持 |
| `PreStartContainer` | `pkg/server/plugin.go`：`PreStartContainer` | 空实现，主要用于接口占位和单测 |

`register` 中资源名通过 `customname.ReplaceDevicePublicType(ps.deviceType, api.ResourceNamePrefix+ps.deviceType)` 转换，说明自定义公开名会影响 kubelet 看到的资源类型。

### 3.5 Kubernetes 客户端与 ConfigMap

`pkg/kubeclient/kubeclient.go` 的 `ClientK8s` 封装 Kubernetes clientset、当前节点名、device-info ConfigMap 名称、pod informer、workqueue 和 kubelet HTTP client。`NewClientK8s` 使用 in-cluster/default kube config 构建 client，并从环境读取节点名。

关键 ConfigMap 写入逻辑位于 `pkg/kubeclient/client_server.go`：

| 函数 | 作用 |
|---|---|
| `WriteDeviceInfoDataIntoCM` | 写入节点设备信息、手工隔离设备、升级故障原因、交换机信息、DPU 信息 |
| `GetManuallySeparateNPUFromDeviceInfo` | 从 `ManuallySeparateNPU` 字段解析物理卡 ID |
| `GetUpgradeFaultReasonFromDeviceInfo` | 从 `UpgradeFaultReason` 字段解析故障升级原因 |
| `WriteResetInfoDataIntoCM` | 写任务 reset 状态，用于故障恢复流程 |
| `WriteFaultInfoDataIntoCM` | 写任务故障 rank 信息 |
| `AnnotationReset` | 清理/重置相关 Pod 注解 |

`common.NodeDeviceInfoCache`、`NodeDeviceInfo`、`DeviceFault`、`TaskResetInfo`、`TaskFaultInfo` 等结构定义在 `pkg/common/proto.go`，是 device-info CM、reset-info CM、fault-info CM 的主要数据模型。

### 3.6 故障处理与升级原因

故障处理的基础类型和策略位于 `pkg/common/fault_code.go`。源码确认的故障等级包括 `NotHandleFault`、`RestartRequest`、`RestartBusiness`、`RestartNPU`、`FreeRestartNPU`、`PreSeparateNPU`、`SeparateNPU`、`ManuallySeparateNPU`、`SubHealthFault` 等。

`pkg/common/upgradefault.go` 负责维护故障升级原因缓存，并在 ConfigMap 和内存缓存之间转换。其核心结构包括：

| 结构 | 作用 |
|---|---|
| `UpgradeFaultReason` | 记录 `upgrade_time`、`fault_code`、`fault_level`、`upgrade_type` |
| `UpgradeFaultReasonKey` | 以故障码、故障级别、升级类型作为原因去重键 |
| `UpgradeFaultReasonSet` | 单卡多条升级原因集合 |
| `UpgradeFaultReasonMap[T]` | 以逻辑 ID 或物理 ID 为 key 的升级原因映射 |

该设计与 RFC 中 `UpgradeFaultReason` 字段兼容，支持从 CM 修复手工隔离原因、清理释放后的原因、按新策略更新缓存中的旧故障原因。

### 3.7 软切分与虚拟设备

源码确认的软切分链路集中在 `pkg/server/plugin.go` 和 `pkg/device/ascend910.go`：

| 能力 | 源码锚点 | 说明 |
|---|---|---|
| AiCore 资源上报 | `responseToKubelet`、`getUnhealthyAICore` | `PresetVDevice=false` 时上报 AiCore 资源，并根据物理卡健康状态推导 AiCore 健康状态 |
| Volcano 映射 | `generateAllDeviceMap`、`useVolcano` | 在 Volcano 模式下将调度器选择的设备映射为 kubelet 设备 |
| 共享设备扩展 | `addSoftShareDev` | 根据 `shareDevCount` 扩展软切分设备 ID |
| 软切配置挂载 | `mountShareDeviceConfig` | 按物理卡和 die ID 创建/挂载共享配置路径，并可挂载 `npu-info.config` 所在目录 |
| 容器可见设备 | `setNPUDeviceMount` | 根据是否使用 Ascend Docker Runtime 决定返回设备挂载还是设置 runtime 环境变量 |

约束来自 `main.go` 参数校验：设置 `softShareDevConfigDir` 时 `shareDevCount` 必须等于最大共享数；目录必须为绝对路径，并通过真实目录检查。

### 3.8 A5 拓扑与 Rank Level 信息

A5 相关能力分散在 `pkg/server/npu_base_v2.go`、`pkg/server/plugin_v2.go`、`pkg/topology/rack_topology.go`：

| 文件/函数 | 作用 |
|---|---|
| `ProductBase.getTopoFileInfo` | 根据产品类型读取 HCCL topo JSON 文件，并做大小、JSON 有效性、反序列化检查 |
| `ProductBase.getID` | 根据 rank level 返回节点内部 IP、SuperPod、ServerIndex 或默认集群名 |
| `PluginServer.setHcclTopoFilePathEnv` | Ascend910A5 场景下为容器设置 HCCL topo 文件路径环境变量 |
| `topology.RasTopoWriteTask` | 后台写入 RAS 拓扑相关文件 |

该能力依赖节点注解中的 `BaseDevInfo`、SuperPod、Rack、ServerIndex 等信息；`HwDevManager.updateNode` 和 `doUpdateNodeAnnotations` 负责更新这些信息。

### 3.9 DPU 与交换机故障

DPU 能力在 `pkg/server/dpu.go` 和 `pkg/device/dpucontrol/` 中实现。`main.go` 启动 `go hdm.ListenDpu(ctx)`，`WriteDeviceInfoDataIntoCM` 在 A5 且 DPU 信息非空时写入 `api.DpuInfoCMDataKey`。

交换机故障能力在 `pkg/device/deviceswitch/`、`pkg/common/fault_code.go` 和 `pkg/server/manager.go` 中出现。`ListenDevice` 在 Ascend910A3 且 `EnableSwitchFault` 开启时，会启动周期性查询交换机故障；A5/A3 的 device-info CM 也会包含 switch info 字段。

### 3.10 重复挂载检测

`pkg/duplicatedetector/manager.go` 的 `CheckDuplicateDevices` 使用 `sync.Once` 保证只初始化一个检测管理器。`Manager.Start` 先扫描所有容器，再监听容器创建/销毁事件。检测到多个容器挂载同一 `/dev/davinciX` 时写 warning 日志。

容器运行时适配位于：

| 路径 | 作用 |
|---|---|
| `pkg/duplicatedetector/containerruntime/docker_client.go` | Docker 容器解析 |
| `pkg/duplicatedetector/containerruntime/containerd_client.go` | containerd 容器解析 |
| `pkg/duplicatedetector/cache/container_cache.go` | 容器设备缓存和重复检测 |

## 4. 核心流程

### 4.1 启动流程

1. `main.go` 解析 flag。
2. `initLogModule` 初始化运行日志，默认路径为 `/var/log/mindx-dl/devicePlugin/devicePlugin.log`。
3. `checkParam` 校验参数组合。
4. `setParameters` 将参数写入 `common.ParamOption`。
5. `devicefactory.InitFunction` 初始化设备公开名配置、底层 devmanager、switch manager。
6. `server.NewHwDevManager` 根据硬件类型选择产品管理器，发现设备，更新 node 标签/注解，创建 `PluginServer`。
7. 主协程启动：
   - `hdm.ListenDevice(ctx)`
   - `hdm.ListenDpu(ctx)`
   - `topology.RasTopoWriteTask(ctx, hdm)`
   - `duplicatedetector.CheckDuplicateDevices(ctx, ...)`
8. `hdm.SignCatch(cancel)` 等待退出信号。

### 4.2 设备发现与健康上报流程

1. `ListenDevice` 订阅故障事件，加载故障码和 device-info CM。
2. 启动 `Serve(ctx)`，为每种设备类型启动 `PluginServer` 并注册 kubelet。
3. 周期性 ticker 按 `ListAndWatchPeriod` 调用 `handleDeviceInfoUpdate`。
4. `handleDeviceInfoUpdate` 更新设备信息、补齐订阅接口不能上报的故障、更新 Pod 注解、更新设备使用状态。
5. `notifyToK8s` 调用产品管理器 `UpdateHealth`，比较新旧设备状态。
6. 状态变化或发送失败重试条件满足时，调用 `pluginNotify`。
7. `PluginServer.Notify` 写入缓存并触发 `ListAndWatch` 发送。

### 4.3 kubelet 注册与 ListAndWatch

1. `PluginServer.Start` 清理旧 gRPC 服务并调用 `serve`。
2. `serve` 在 `/var/lib/kubelet/device-plugins` 下创建 `{deviceType}.sock`。
3. `register` 连接 kubelet socket 并发送 `RegisterRequest`。
4. kubelet 调用 `ListAndWatch` 后，`PluginServer` 首次发送设备列表。
5. 后续设备状态变化时通过 `reciChan` 触发再次发送。
6. 连续发送失败时，`strategyForSendStats` 和 `handleConsecutiveErrorStrategy` 可能触发重新注册或进程重启策略。

### 4.4 Allocate 与容器挂载流程

1. kubelet 调用 `Allocate`。
2. `checkAllocateRequest` 校验请求数量、设备名长度、设备是否存在、虚拟设备数量限制。
3. 获取当前 NPU 全量信息。
4. Volcano 场景下，调用 `useVolcano` 从 Pod 注解解析调度器分配的真实设备。
5. 调用 `common.GetDeviceListID` 得到可见设备 ID。
6. A5 特殊场景可能将物理 ID 转为逻辑 ID。
7. `mountShareDeviceConfig` 挂载软切共享配置和只读 `npu-info.config` 目录。
8. `setNPUDeviceMount`：
   - 使用 Ascend Docker Runtime 时设置 runtime 环境变量。
   - 不使用时直接返回设备节点挂载。
9. `setHcclTopoFilePathEnv` 在 A5 场景设置 HCCL topo 文件路径。
10. `SetSlowNodeNoticeEnv` 在慢节点开关开启时读取 ConfigMap 并注入 perf dump 环境变量。

### 4.5 device-info ConfigMap 更新流程

`WriteDeviceInfoDataIntoCM` 将节点设备状态固化为 ConfigMap，典型字段包括：

| 字段 | 来源/结构 | 说明 |
|---|---|---|
| `DeviceInfo` | `common.NodeDeviceInfoCache` | 设备列表、更新时间、校验码 |
| `ManuallySeparateNPU` | 字符串 | 手工隔离设备名列表 |
| `UpgradeFaultReason` | `common.UpgradeFaultReasonMap` 序列化 | 故障升级原因 |
| `SwitchInfo` | `common.SwitchFaultInfo` | A3/A5 交换机故障信息 |
| `DpuInfo` | `common.DpuInfo` | A5 DPU 信息 |
| `Description` | 常量 | CM 描述字段 |

源码确认：A5 会写 `DeviceInfo`、`SwitchInfo`、`UpgradeFaultReason`、`ManuallySeparateNPU`，并在 DPU 信息存在时写 `DpuInfo`；A3 会写 `SwitchInfo`；其他产品写基础设备信息和手工隔离/升级原因。

## 5. 接口与数据结构

### 5.1 外部接口

| 接口 | 协议/对象 | 源码锚点 | 说明 |
|---|---|---|---|
| Kubelet Device Plugin | gRPC `v1beta1.DevicePluginServer` | `pkg/server/plugin.go`、`pkg/server/server.go` | 注册资源、ListAndWatch、Allocate |
| Kubernetes API | client-go | `pkg/kubeclient/kubeclient.go` | Node、Pod、ConfigMap、Event、Informer |
| PodResources API | kubelet podresources | `pkg/server/pod_resource.go` | 查询 Pod 已分配设备 |
| Ascend devmanager | `ascend-common/devmanager` | `pkg/device/*` | 获取设备列表、物理/逻辑 ID、IP、故障、拓扑、虚拟设备等 |
| 容器运行时 | Docker / containerd | `pkg/duplicatedetector/containerruntime/*` | 扫描容器挂载，检测重复 NPU |
| 部署接口 | Kubernetes YAML | `build/ascendplugin-*.yaml` | ServiceAccount、RBAC、DaemonSet、hostPath、privileged 容器 |

### 5.2 核心数据结构

| 结构 | 文件 | 关键字段 | 用途 |
|---|---|---|---|
| `common.Option` | `pkg/common/proto.go` | `UseVolcanoType`、`PresetVDevice`、`HotReset`、`ShareCount`、`RealCardType`、`SoftShareDevConfigDir` | 全局运行参数 |
| `common.NpuAllInfo` | `pkg/common/proto.go` | `AllDevTypes`、`AllDevs`、`AICoreDevs` | 一次设备发现的完整结果 |
| `common.NpuDevice` | `pkg/common/proto.go` | `DeviceName`、`Health`、`NetworkHealth`、`DpuHealth`、`LogicID`、`PhyID`、`UsedAicoreQuota`、`UsedHbmQuota` | 单个设备状态 |
| `common.NodeDeviceInfoCache` | `pkg/common/proto.go` | `DeviceInfo`、`SuperPodID`、`ServerIndex`、`RackID`、`CheckCode` | 写入 device-info CM 的节点级设备缓存 |
| `common.DeviceFault` | `pkg/common/proto.go` | `FaultType`、`NPUName`、`FaultLevel`、`FaultHandling`、`FaultCode` | 对外展示设备故障信息 |
| `common.TaskResetInfo` | `pkg/common/proto.go` | `RankList`、`RetryTime`、`FaultFlushing`、`GracefulExit` | 任务级恢复/重置状态 |
| `server.PluginServer` | `pkg/server/types.go` | `cachedDevices`、`deviceType`、`klt2RealDevMap`、`deviceSyncStat` | 单一资源类型的 kubelet gRPC server |
| `server.HwDevManager` | `pkg/server/manager.go` | `groupDevice`、`ServerMap`、`manager`、`ContainerRuntime` | 全局设备管理编排器 |
| `common.UpgradeFaultReason` | `pkg/common/upgradefault.go` | `UpgradeTime`、`FaultCode`、`FaultLevel`、`UpgradeType` | 记录人工隔离等故障升级原因 |

## 6. 构建、部署与运行

### 6.1 构建

源码确认的构建入口是 `component/ascend-device-plugin/build/build.sh`：

| 步骤 | 源码锚点 | 说明 |
|---|---|---|
| 版本读取 | `build.sh`：`version_file="${TOP_DIR}"/service_config.ini` | 默认 `v6.0.0`，可从组件内 `service_config.ini` 第一行读取 |
| 编译 | `build.sh`：`build_plugin` | 使用 `go build -mod=mod -buildmode=pie`，开启 CGO 和安全编译/链接参数 |
| 注入版本 | `build.sh`：`-ldflags -X main.BuildName/BuildScene/BuildVersion` | 将名称、场景、版本写入二进制 |
| 输出 | `build.sh`：`mv_file`、`modify_version` | 生成 `output/device-plugin`、Dockerfile、部署 YAML、故障配置文件 |
| 权限 | `build.sh`：`change_mod` | 输出文件默认 `400`，二进制 `500` |
| 边侧 | `build_edge.sh` | 调用 `build.sh "edge"`，边侧只生成二进制 |
| 中国站/CI | `build_ch.sh` | 支持 `ci` 参数设置 `GO111MODULE=on`、`GONOSUMDB=*` |

根仓构建脚本 `build/build_all.sh` 会将 `component/*` 复制到 GOPATH，并通过 `build/build_each.sh` 进入各组件 `build` 目录执行组件构建。

### 6.2 验证

`build/test.sh` 的 `execute_test` 执行：

| 验证项 | 说明 |
|---|---|
| 单元测试 | `go test -mod=mod -gcflags=all=-l -v -race -coverprofile cov.out ${TOP_DIR}/pkg/...` |
| 覆盖率 | `go tool cover -func=cov.out`，向上取整后要求不低于 80% |
| 报告 | 使用 `gocov`、`gocov-html`、`gotestsum --junitfile unit-tests.xml` 生成 HTML 和 JUnit 报告 |

### 6.3 部署

`build/ascendplugin-*.yaml` 提供不同产品和调度模式的部署模板。源码证据显示这些 YAML 包含：

| 配置 | 证据 |
|---|---|
| `ServiceAccount` | `ascendplugin-910.yaml`、`ascendplugin-npu.yaml` 等开头定义 |
| `ClusterRole` / `ClusterRoleBinding` | 授权 pods、nodes、nodes/status、configmaps、events 等资源 |
| `DaemonSet` | 多个 YAML 中 `kind: DaemonSet` |
| 特权容器 | YAML 中 `securityContext.privileged: true` |
| kubelet device plugin 目录 | hostPath `/var/lib/kubelet/device-plugins` 挂载到容器同路径 |
| 日志目录 | `/var/log/mindx-dl/devicePlugin` |
| 默认启动命令 | `device-plugin -useAscendDocker=true -logFile=/var/log/mindx-dl/devicePlugin/devicePlugin.log -logLevel=0` |
| 镜像 | `ascend-k8sdeviceplugin:<version>`，构建脚本会替换版本号 |

Dockerfile 使用 Ubuntu 22.04，创建 `HwHiAiUser`，复制 `device-plugin`、`faultCode.json`、`faultCustomization.json`、`SwitchFaultCode.json`、`deviceNameCustomization.json` 到镜像，并设置执行/只读权限。

### 6.4 回滚

源码未提供专门的回滚脚本。基于部署方式可确认的回滚路径是 Kubernetes 资源层面的镜像/YAML 回退：

1. 使用旧版本 `device-plugin-*.yaml` 或将 DaemonSet 镜像回退到旧 tag。
2. 重新应用对应 DaemonSet。
3. 确认 Pod 重建后 kubelet device plugin socket 被重新注册。
4. 观察 `devicePlugin.log` 中 `register <deviceType> to kubelet success` 和 `receive ListAndWatch from kubelet`。
5. 如因新版本写入的 `UpgradeFaultReason`、`ManuallySeparateNPU` 字段导致兼容问题，应优先检查 device-info CM；源码中存在旧 CM 自动修复/兼容逻辑，但具体跨版本回滚矩阵未在本模块文档中给出。

## 7. 关键约束

### 7.1 Kubernetes 权限与运行权限

- 部署 YAML 授权读取/更新 pods、nodes、nodes/status、configmaps，并创建 events。
- DaemonSet 使用 privileged 容器并挂载宿主机设备、日志、kubelet device plugin 目录。
- README 明确当前容器部署方式使用 ServiceAccount 认证鉴权，token 明文显示，建议用户自行安全加强。
- Dockerfile 将二进制权限设为 `550`，故障配置设为 `440`，并设置 `umask 027`。

### 7.2 参数组合约束

- 非预置虚拟设备模式只支持 310P 和 910B，且必须配合 Volcano。
- 310P 混插模式不能与 Volcano 或共享设备数量大于 1 同时开启。
- 软切配置目录必须为绝对路径，且需要与最大共享数搭配。
- A5 场景存在 HCCL topo 文件路径、SuperPod、Rack、ServerIndex 等额外依赖。
- `UseAscendDocker` 会被环境变量 `AscendDockerRuntimeEnv` 和混插/特定产品形态重写，不完全等同于命令行传入值。

### 7.3 数据一致性约束

- `HwDevManager.handleDeviceInfoUpdate` 使用 `common.LockAllDeviceInfo` 保护全局设备信息更新。
- `PluginServer` 使用 `cachedLock`、`allocMapLock` 保护设备缓存和 kubelet/Volcano 映射。
- 故障缓存、手工隔离缓存、升级原因缓存均有独立锁或转换流程。
- `notifyToK8s` 会比较新旧设备状态，避免无变化时频繁推送，但发送失败或启动初期会触发重发。

### 7.4 兼容性约束

- `customname` 支持旧设备类型和新公开名转换，A5 场景可能使用 `huawei.com/npu`。
- `WriteDeviceInfoDataIntoCM` 针对 A5、A3、其他产品写入不同字段集合。
- `UpgradeFaultReason` 设计用于兼容旧 `ManuallySeparateNPU` 字段，并保留升级原因。

## 8. 运维 Runbook

### 8.1 构建

| 场景 | 操作 |
|---|---|
| 中心侧构建 | 进入 `component/ascend-device-plugin/build`，执行 `bash build.sh` |
| 边侧构建 | 执行 `bash build_edge.sh` |
| CI/覆盖率验证 | 执行 `bash test.sh` |
| 全仓组件构建 | 根目录使用 `build/build_all.sh` 或 `build/build_each.sh` 触发组件构建 |

检查点：

- `component/ascend-device-plugin/output/device-plugin` 存在且可执行。
- 对应产品的 `device-plugin-*-<version>.yaml` 存在。
- `faultCode.json`、`faultCustomization.json`、`SwitchFaultCode.json`、`deviceNameCustomization.json` 被复制到 output。
- 测试覆盖率不低于 80%。

### 8.2 部署

| 场景 | 检查点 |
|---|---|
| DaemonSet 启动 | Pod 运行在目标 NPU 节点，容器以 privileged 运行 |
| kubelet 注册 | 日志出现 `register <deviceType> to kubelet success` |
| 设备上报 | kubelet 调用 `ListAndWatch`，日志出现 `ListAndWatch resp devices` |
| 节点信息 | Node 标签/注解包含设备类型、基础 NPU 信息、SuperPod/Rack 等 |
| ConfigMap | `device-info-<nodeName>` 存在并包含 `DeviceInfo`、`ManuallySeparateNPU`、`UpgradeFaultReason` |

### 8.3 回滚

| 步骤 | 说明 |
|---|---|
| 回退 YAML 或镜像 tag | 使用旧版本 DaemonSet 模板或旧镜像 |
| 等待 Pod 重建 | 确认旧 Pod 删除、新 Pod Ready |
| 确认 socket 重建 | 检查 `/var/lib/kubelet/device-plugins/{deviceType}.sock` |
| 确认 kubelet 注册 | 查看 `devicePlugin.log` 注册日志 |
| 检查 device-info CM | 对比 `DeviceInfo`、`ManuallySeparateNPU`、`UpgradeFaultReason` 是否符合预期 |

### 8.4 常见失败模式

| 现象 | 可能原因 | 排查锚点 |
|---|---|---|
| device-plugin 启动后立即退出 | 参数组合非法、日志路径用户不匹配、设备类型不支持 | `main.go`：`initLogModule`、`checkParam`；日志 `devicePlugin.log` |
| kubelet 看不到 NPU 资源 | gRPC socket 创建失败、注册失败、资源名被自定义转换、YAML 未挂载 device plugin 目录 | `pkg/server/server.go`：`createNetListener`、`register`；检查 `/var/lib/kubelet/device-plugins` |
| 设备健康状态未更新 | 故障订阅失败、轮询周期未到、CM 缓存未同步、产品管理器 `UpdateHealth` 异常 | `pkg/server/manager.go`：`ListenDevice`、`handleDeviceInfoUpdate`、`notifyToK8s` |
| Pod 分配失败 | kubelet 请求的设备不存在、Volcano 注解缺失、虚拟设备数量超限、软切配置目录非法 | `pkg/server/plugin.go`：`checkAllocateRequest`、`Allocate`、`mountShareDeviceConfig` |
| 手工隔离未生效或未释放 | `ManuallySeparateNPU` 与内存缓存不一致，升级原因解析失败 | `pkg/common/upgradefault.go`；`pkg/kubeclient/client_server.go`：`GetManuallySeparateNPUFromDeviceInfo` |
| A5 容器 HCCL 拓扑缺失 | topo 文件不存在、SuperPodType 不支持、cardType 未识别 | `pkg/server/npu_base_v2.go`：`getTopoFileInfo`、`getTopoPath`；`pkg/server/plugin_v2.go`：`setHcclTopoFilePathEnv` |
| 重复挂载风险 | Docker/containerd 中多个容器挂载同一 `/dev/davinciX` | `pkg/duplicatedetector/manager.go`：`logDuplicate`；查看 warning 日志 |
| ConfigMap 更新失败 | RBAC 权限不足、apiserver 异常、resourceVersion 冲突 | `pkg/kubeclient/client_server.go`：`createOrUpdateDeviceCM`；部署 YAML RBAC |

## 9. 调试指南

| 子模块 | 典型症状 | 优先检查文件/命令 |
|---|---|---|
| 入口参数 | 启动无明显输出或直接返回 | `component/ascend-device-plugin/main.go`；检查启动 args 中 `-volcanoType`、`-presetVirtualDevice`、`-shareDevCount`、`-softShareDevConfigDir` |
| 日志 | 无日志或日志初始化失败 | `main.go`：`initLogModule`；检查 `/var/log/mindx-dl/devicePlugin/devicePlugin.log` 权限 |
| kubelet 注册 | `kubectl describe node` 无资源 | `pkg/server/server.go`；检查 `/var/lib/kubelet/device-plugins`、kubelet socket、`register to kubelet failed` |
| ListAndWatch | 节点资源数量与物理卡不一致 | `pkg/server/plugin.go`：`responseToKubelet`；检查是否启用 Volcano、软切、虚拟设备、设备公开名转换 |
| Allocate | Pod 创建卡在 container creating 或设备不可见 | `pkg/server/plugin.go`：`Allocate`、`setNPUDeviceMount`；检查容器环境变量和设备挂载 |
| 设备发现 | 设备数量为 0 或类型不支持 | `pkg/device/ascend310.go`、`ascend310p.go`、`ascend910.go`；检查 devmanager 返回的 `GetDevType`、`GetDeviceList` |
| Node 标签/注解 | 调度器无法识别节点能力 | `pkg/server/manager.go`：`UpdateNode`、`getNewNodeAnnotation`；检查 Node metadata labels/annotations |
| device-info CM | 调度器/ClusterD 读不到设备状态 | `pkg/kubeclient/client_server.go`：`WriteDeviceInfoDataIntoCM`；检查 `device-info-<nodeName>` |
| 故障码策略 | 故障级别不符合预期 | `pkg/common/fault_code.go`；检查 `/usr/local/faultCode.json`、`/usr/local/faultCustomization.json` |
| 故障升级原因 | `UpgradeFaultReason` 缺失或格式错误 | `pkg/common/upgradefault.go`；检查 CM 字段是否为合法 JSON |
| 热复位 | 故障设备长期 unhealthy 或 reset 状态不清理 | `pkg/device/ascend910.go`、`ascendtolerance.go`、`reset_info_mgr.go` |
| 软切分 | vNPU / AiCore 上报不符合预期 | `pkg/server/plugin.go`：`getUnhealthyAICore`、`addSoftShareDev`、`mountShareDeviceConfig` |
| A5 拓扑 | HCCL topo env 未注入 | `pkg/server/plugin_v2.go`、`pkg/server/npu_base_v2.go`、`pkg/topology/rack_topology.go` |
| DPU | A5 DPU 故障未影响设备健康 | `pkg/server/dpu.go`、`pkg/device/dpucontrol/` |
| 重复挂载 | 日志出现 duplicate NPU device mount | `pkg/duplicatedetector/manager.go`、`containerruntime/*` |

## 10. 源码确认、推断与缺口

### 10.1 源码确认事实

- 模块通过 Kubernetes Device Plugin gRPC 接口向 kubelet 注册资源，并实现 `ListAndWatch`、`Allocate`。
- 模块支持 Ascend310、Ascend310P、Ascend910 系列，并对 A3/A5、虚拟设备、软切分、热复位、DPU、交换机故障存在专门处理。
- `common.ParamOption` 是跨包共享的运行参数模型，由 `main.go` 的 flag 写入。
- `HwDevManager` 是设备发现、健康更新、ConfigMap 更新和 kubelet 通知的核心编排对象。
- `PluginServer` 以设备类型为粒度创建 socket 和 kubelet 注册项。
- device-info ConfigMap 会写入设备信息、手工隔离、升级故障原因；A3/A5 场景还会写交换机信息，A5 可写 DPU 信息。
- 构建脚本会生成二进制、部署 YAML、Dockerfile 和故障配置，并通过 ldflags 注入版本。
- 测试脚本要求 `pkg/...` 单元测试在 race 模式下通过，并要求覆盖率至少 80%。

### 10.2 基于代码关系的推断

- Ascend Device Plugin 是 ClusterD、Volcano、Ascend Operator、Ascend Docker Runtime 等组件的上游数据源之一：它写 device-info CM、Node 注解、kubelet 资源，而其他组件据此进行调度、故障恢复或任务重建。
- A5 拓扑信息既服务于节点标签/注解，也服务于容器内 HCCL topo 文件路径注入，属于调度和运行时共同依赖的信息。
- `UpgradeFaultReason` 的引入是为了在 `ManuallySeparateNPU` 之外保存故障升级原因，降低人工隔离后原因丢失的运维成本。
- 重复挂载检测是防御性观测能力，不直接阻断容器启动；当前源码体现为记录 warning 日志。

### 10.3 缺失或未完全确认的信息

- 本模块内未看到独立的端到端部署回滚脚本，回滚依赖 Kubernetes DaemonSet/YAML 层面的版本回退。
- 运行时对外 ConfigMap 字段的完整消费者不在本模块内，需要结合 ClusterD、Volcano、Operator 文档进一步确认跨组件契约。
- 部分底层设备能力来自 `ascend-common/devmanager`，具体 DCMI/HCCN 调用实现不在本模块目录内。
- 软切分调度打分逻辑主要在 `ascend-for-volcano`，本模块只确认 device-plugin 侧的资源上报、映射和挂载逻辑。
- 安全加固建议在 README 中有提示，但完整生产安全基线需要参考仓库调度安全声明文档。