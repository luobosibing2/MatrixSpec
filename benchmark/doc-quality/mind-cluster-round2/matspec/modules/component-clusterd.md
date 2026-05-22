# Clusterd 模块中间设计文档

## 1. 模块定位

Clusterd 是 MindCluster 集群调度与故障恢复链路中的集群级控制组件。它运行为 Go 服务，主要负责从 Kubernetes/Volcano/Ascend Operator 资源与多类 ConfigMap 中汇聚集群状态，进行设备、节点、交换机、DPU、公共故障、作业故障等信息处理，并通过 gRPC 向 taskd、FD、业务客户端等组件提供故障通知、恢复编排、作业信息、RankTable、Profiling 和公共故障上报能力。

源码确认锚点：

| 结论 | 源码锚点 | 说明 |
|---|---|---|
| Clusterd 入口完成日志、K8s 客户端、全局配置、人工隔离、gRPC、FaultProcessCenter、Informer、统计模块初始化 | `component/clusterd/main.go` / `main` | 模块启动主流程 |
| gRPC 服务集中注册 Recover、PubFault、Profiling、Config、Fault、Job 服务 | `component/clusterd/pkg/interface/grpc/grpc_init.go` / `ClusterInfoMgrServer.Start` | 对外接口入口 |
| 故障处理中心每秒周期处理，也可按通知处理指定故障类型 | `component/clusterd/pkg/application/faultmanager/fault_process_center.go` / `faultProcessCenter.Work` | 故障处理主循环 |
| 设备故障中心按处理器链处理公共故障、自定义故障、UCE 伴随故障、Retry、原地恢复、压测过滤、预隔离、增量故障、人工隔离 | `component/clusterd/pkg/application/faultmanager/cmprocess/device_fault_center.go` / `init` | 设备故障处理链 |

## 2. 目录结构与职责

| 目录/文件 | 职责 |
|---|---|
| `component/clusterd/main.go` | 程序入口，完成参数解析、日志、K8s/Volcano/Operator 客户端、配置加载、gRPC、故障中心、Informer、统计与信号退出初始化。 |
| `component/clusterd/build/` | 构建、镜像、部署与运行配置。包含 `build.sh`、`test.sh`、`Dockerfile`、`clusterd.yaml`、`fdConfig.yaml`、故障策略 JSON。 |
| `pkg/interface/grpc/` | gRPC protobuf 生成代码与服务注册入口。子目录包括 `config`、`fault`、`job`、`profiling`、`pubfault`、`recover`。 |
| `pkg/interface/kube/` | Kubernetes、Volcano、Ascend Operator client 与 informer 封装，维护各业务回调注册表。 |
| `pkg/application/` | 应用层服务与业务编排，包括配置下发、故障服务、恢复服务、作业信息、PingMesh、公共故障、资源、统计、调度异常等。 |
| `pkg/application/faultmanager/` | 故障处理总入口，包含 ConfigMap 维度故障处理、作业维度故障处理和故障聚合通知。 |
| `pkg/application/faultmanager/cmprocess/` | 设备、节点、交换机、DPU ConfigMap 故障中心和处理器链。 |
| `pkg/application/faultmanager/jobprocess/` | 作业级故障关系处理、故障 Rank 定位与订阅通知。 |
| `pkg/application/recover/` | 训练恢复、热切、Retry、进程级/Pod 级恢复、OM 操作、压测等状态机控制。 |
| `pkg/domain/` | 领域模型、缓存、ConfigMap 编解码与领域工具，包括 job、pod、node、manualfault、publicfault、statistics、faultdomain 等。 |
| `pkg/common/` | 常量、日志工具、通用工具、限流与 ConfigMap 工具。 |
| `testdata/` | 单元测试使用的资源样例，如故障 Rank、人工隔离、公共故障、UCE 场景。 |

## 3. 启动与运行架构

Clusterd 启动顺序如下：

1. 解析命令行参数，支持 `-version`、`-logLevel`、`-maxAge`、`-logFile`、`-maxBackups`、`-useProxy`。
2. 初始化日志，默认日志路径为 `/var/log/mindx-dl/clusterd/clusterd.log`。
3. 初始化 Kubernetes、Volcano、Ascend Operator 客户端，并检查 Volcano 是否存在。
4. 加载全局配置 `clusterd-config-cm`，启动 300 秒周期配置刷新。
5. 初始化人工隔离缓存，从人工隔离 ConfigMap 加载已有隔离状态，并启动 15 秒周期同步/释放流程。
6. 启动 gRPC 服务，监听 `POD_IP + constant.GrpcPort`；`-useProxy` 时监听 `127.0.0.1`。
7. 启动 FD 在线控制、故障处理中心、Informer、统计模块、作业故障刷新。
8. 监听 SIGINT/SIGTERM/SIGQUIT/SIGKILL 信号并停止 gRPC 服务与上下文。

源码确认锚点：

| 流程 | 源码锚点 |
|---|---|
| 主启动顺序 | `component/clusterd/main.go` / `main` |
| K8s/Volcano/Operator 客户端初始化 | `component/clusterd/main.go` / `initK8sServer` |
| gRPC keepalive、限流、最大消息、最大并发流配置 | `component/clusterd/main.go` / `initGrpcServer` |
| gRPC 监听地址与服务注册 | `component/clusterd/pkg/interface/grpc/grpc_init.go` / `ClusterInfoMgrServer.Start` |
| Informer 回调注册 | `component/clusterd/main.go` / `startInformer`、`addResourceFunc`、`addJobFunc`、`addEpRankTableFunc` |

## 4. 核心组件设计

### 4.1 gRPC 服务层

`pkg/interface/grpc/grpc_init.go` 创建 `ClusterInfoMgrServer`，并注册以下服务：

| 服务 | 应用实现 | 主要用途 |
|---|---|---|
| `Recover` | `pkg/application/recover` | 训练恢复、故障处理、策略协商、热切、压测、网卡切换等控制。 |
| `PubFault` | `pkg/application/publicfault` | 接收外部公共故障上报。 |
| `TrainingDataTrace` | `pkg/application/profiling` | 训练数据/Profiling 相关跟踪接口。 |
| `Config` | `pkg/application/config` | 业务配置下发，主要包含 RankTable 注册与订阅。 |
| `Fault` | `pkg/application/fault` | 作业或集群故障查询、订阅、注册。 |
| `Job` | `pkg/application/jobinfo` | 作业摘要注册、订阅与批量推送。 |

源码确认锚点：

| 结论 | 源码锚点 |
|---|---|
| 服务注册清单 | `component/clusterd/pkg/interface/grpc/grpc_init.go` / `ClusterInfoMgrServer.Start` |
| Config 服务按 jobId 管理 `ConfigPublisher` 并订阅 RankTable | `component/clusterd/pkg/application/config/grpc_service.go` / `BusinessConfigServer`、`SubscribeRankTable` |
| Fault 服务注册作业故障订阅，并支持查询集群/作业故障 | `component/clusterd/pkg/application/fault/grpc_service.go` / `FaultServer`、`GetFaultMsgSignal` |
| Job 服务要求白名单角色注册，并按 clientId 订阅作业摘要 | `component/clusterd/pkg/application/jobinfo/job_grpc_service.go` / `JobServer.Register`、`SubscribeJobSummarySignal` |
| PubFault 服务将 gRPC 请求转换为 `api.PubFaultInfo` | `component/clusterd/pkg/application/publicfault/grpc_service.go` / `SendPublicFault`、`constructPubFaultInfo` |

### 4.2 Kubernetes Informer 与缓存层

`pkg/interface/kube/informer.go` 维护多类 informer 回调表，业务模块通过 `AddCmDeviceFunc`、`AddPodFunc`、`AddNodeFunc`、`AddPodGroupFunc` 等注册回调。`main.go` 的 `startInformer` 负责注册资源、作业、RankTable、PingMesh 等回调并启动 informer。

主要监听对象包括：

| 对象 | 回调注册入口 | 代表用途 |
|---|---|---|
| Device ConfigMap | `AddCmDeviceFunc` | 设备故障与设备状态采集。 |
| Node ConfigMap | `AddCmNodeFunc` | 节点故障采集。 |
| Switch ConfigMap | `AddCmSwitchFunc` | 交换机故障采集。 |
| DPU ConfigMap | `AddCmDpuFunc` | DPU 状态采集。 |
| PublicFault ConfigMap | `AddCmPubFaultFunc` | 公共故障变更采集。 |
| Pod / PodGroup | `AddPodFunc` / `AddPodGroupFunc` | 作业状态、恢复控制、RankTable、统计。 |
| AscendJob / Volcano Job | `AddACJobFunc` / `AddVCJobFunc` | 作业统计与作业缓存。 |
| Node | `AddNodeFunc` | 节点缓存与 PingMesh SuperPod 信息。 |

源码确认锚点：

| 结论 | 源码锚点 |
|---|---|
| 回调表定义 | `component/clusterd/pkg/interface/kube/informer.go` / package-level maps |
| 回调注册函数 | `component/clusterd/pkg/interface/kube/informer.go` / `AddPodFunc`、`AddCmDeviceFunc`、`AddNodeFunc` 等 |
| 资源回调注册 | `component/clusterd/main.go` / `addResourceFunc` |
| 作业回调注册 | `component/clusterd/main.go` / `addJobFunc` |
| PingMesh 节点采集 | `component/clusterd/pkg/application/pingmesh/collector.go` / `NodeCollector` |

### 4.3 故障处理中心

`faultProcessCenter` 是 Clusterd 的故障处理调度器。它持有 `notifyProcessChan`，支持：

- 每秒定时执行全量处理。
- 根据通知只处理 Device、Node、Switch、DPU 中某一类。
- 处理完成后按 ConfigMap 类型通知订阅者。
- 作业故障中心在 ConfigMap 中心之后运行，基于设备/节点/交换机处理结果生成作业维度故障信息。

源码确认锚点：

| 结论 | 源码锚点 |
|---|---|
| 周期与通知双触发机制 | `component/clusterd/pkg/application/faultmanager/fault_process_center.go` / `Work` |
| 处理顺序为 Switch、Device、Node、DPU、Job，然后通知恢复服务与调度相关订阅者 | `component/clusterd/pkg/application/faultmanager/fault_process_center.go` / `Process` |
| 作业故障中心聚合 Device/Switch/Node 处理结果 | `component/clusterd/pkg/application/faultmanager/jobprocess/fault_job_center.go` / `faultJobProcessCenter.Process` |

### 4.4 ConfigMap 故障中心与处理器链

`baseFaultCenter[T]` 是泛型故障中心基类，负责：

1. 从 `cmManager` 更新原始 ConfigMap。
2. 对设备 ConfigMap 将 cmName 转换为 nodeName 作为处理 key。
3. 顺序执行 `processorList` 中的 `constant.FaultProcessor`。
4. 保存处理后的 ConfigMap。
5. 当 `cmManager.IsChanged()` 为真时通知订阅者。

源码确认锚点：

| 结论 | 源码锚点 |
|---|---|
| 泛型故障中心处理模板 | `component/clusterd/pkg/application/faultmanager/cmprocess/base_fault_center.go` / `baseFaultCenter.Process` |
| 订阅者非阻塞通知 | `component/clusterd/pkg/application/faultmanager/cmprocess/base_fault_center.go` / `notifySubscriber` |
| 设备中心处理器链 | `component/clusterd/pkg/application/faultmanager/cmprocess/device_fault_center.go` / `init` |
| 节点中心处理器链 | `component/clusterd/pkg/application/faultmanager/cmprocess/node_fault_center.go` / `init` |
| 交换机中心处理器链 | `component/clusterd/pkg/application/faultmanager/cmprocess/switch_fault_center.go` / `init` |
| DPU 中心目前仅有基础中心，无额外处理器链 | `component/clusterd/pkg/application/faultmanager/cmprocess/dpu_fault_center.go` / `init` |

设备故障处理器链顺序为：

| 顺序 | 处理器 | 作用 |
|---|---|---|
| 1 | `publicfault.PubFaultProcessor` | 处理公共故障注入结果。 |
| 2 | `custom.CustomProcessor` | 处理作业 YAML 自定义故障与 L2 故障。 |
| 3 | `uceaccompany.UceAccompanyProcessor` | 过滤 UCE 伴随故障。 |
| 4 | `retry.RetryProcessor` | 过滤/标记 Retry 类故障。 |
| 5 | `recoverinplace.RecoverInplaceProcessor` | 处理单进程原地恢复相关故障。 |
| 6 | `stresstest.StressTestProcessor` | 过滤压测故障。 |
| 7 | `preseparate.PreSeparateFaultProcessor` | 处理预隔离故障。 |
| 8 | `incrementfault.IncrementFaultProcessor` | 处理增量故障。 |
| 9 | `manualfault.ManualFaultProcessor` | 处理人工隔离故障。 |

### 4.5 作业故障处理与故障 Rank

作业故障中心 `FaultJobCenter` 由两个处理器组成：

- `relationfault.RelationProcessor`
- `faultrank.JobFaultRankProcessor`

它从设备、交换机、节点处理后的 ConfigMap 中构建作业级故障视图，并支持按过滤级别向恢复服务、Fault gRPC 服务等订阅者推送 `map[string]constant.JobFaultInfo`。

源码确认锚点：

| 结论 | 源码锚点 |
|---|---|
| 作业故障处理器链 | `component/clusterd/pkg/application/faultmanager/jobprocess/fault_job_center.go` / `init` |
| 作业故障订阅接口 | `component/clusterd/pkg/application/faultmanager/jobprocess/fault_job_center.go` / `Register` |
| 订阅通知读取过滤后的故障 Rank 信息 | `component/clusterd/pkg/application/faultmanager/jobprocess/fault_job_center.go` / `NotifySubscriber` |
| Fault 服务订阅作业故障 Rank，过滤 `NotHandleFault` | `component/clusterd/pkg/application/fault/grpc_service.go` / `NewFaultServer` |
| Recover 服务订阅作业故障 Rank，过滤 `NotHandleFault` 与 `PreSeparateNPU` | `component/clusterd/pkg/application/recover/fault_recover_service.go` / `NewFaultRecoverService` |

### 4.6 恢复控制中心

`FaultRecoverService` 是恢复 gRPC 服务的应用实现。它维护：

- `eventCtl`: jobId 到 `EventController` 的映射。
- `faultCh`: 从故障中心接收作业故障变更。
- `podEventCh` 和 `newPodInfos`: 处理 Pod 状态与新 Pod 信息。
- `currentFaults`: 当前故障缓存。

恢复服务在初始化时订阅作业故障中心，并注册 PodGroup 删除、Pod 变更回调，以清理 EventController、更新原始 Pod 信息与监控热切/重调度状态。

源码确认锚点：

| 结论 | 源码锚点 |
|---|---|
| 恢复服务核心字段 | `component/clusterd/pkg/application/recover/fault_recover_service.go` / `FaultRecoverService` |
| 初始化故障订阅、PodGroup 回调、Pod 回调和后台协程 | `component/clusterd/pkg/application/recover/fault_recover_service.go` / `NewFaultRecoverService` |
| Pod Running/Deleted 事件驱动热切状态 | `component/clusterd/pkg/application/recover/fault_recover_service.go` / `podStatusMonitor` |
| 作业故障进入恢复控制器并根据健康状态、Retry 支持、故障节点决定事件 | `component/clusterd/pkg/application/recover/fault_recover_service.go` / `notifyFaultInfoForJob` |
| 具体状态机规则集中在 `rules.go` | `component/clusterd/pkg/application/recover/rules.go` / `getBaseRules`、`getFixRules`、`getHotSwitchRules` 等 |

### 4.7 人工隔离

人工隔离由配置、故障计数、任务级软件故障识别、人工隔离 ConfigMap 同步共同组成。

关键行为：

- 全局配置从 `clusterd-config-cm` 的 `manually_separate_policy.conf` 加载。
- 配置每 300 秒轮询刷新一次。
- 人工隔离管理每 15 秒检查缓存和 ConfigMap 差异、释放超时隔离设备、更新或创建人工隔离 ConfigMap。
- 若配置禁用人工隔离，会重置 JobFaultManager、Counter 和 FaultCmInfo。
- 有 jobId 的故障进入任务级软件故障识别；无 jobId 的故障直接进入频率计数。
- 同一任务滑动窗口内不同设备出现相同故障时，当前实现判定为软件故障，不计入频率计数。
- 频率达到阈值后，清理该设备对应故障计数并写入人工隔离缓存。

源码确认锚点：

| 结论 | 源码锚点 |
|---|---|
| 人工隔离初始化必须早于故障处理中心 | `component/clusterd/main.go` / `dealManuallySeparateNPUFault`、`main` |
| 配置结构与约束 | `component/clusterd/pkg/domain/conf/config.go` / `ManuallySeparatePolicy`、`Check` |
| 配置加载与禁用时重置缓存 | `component/clusterd/pkg/application/conf/watch.go` / `loadGlobalConfig` |
| 300 秒配置轮询 | `component/clusterd/pkg/application/conf/watch.go` / `WatchGlobalConfig` |
| 15 秒人工隔离同步循环 | `component/clusterd/pkg/application/manualfault/cm.go` / `ProcessManuSep` |
| 手动从 ConfigMap 删除设备后同步清理缓存 | `component/clusterd/pkg/application/manualfault/cm.go` / `checkDiffAndDelete` |
| 自动释放逻辑 | `component/clusterd/pkg/application/manualfault/cm.go` / `release`、`doRelease` |
| 频率计数与达到阈值后隔离 | `component/clusterd/pkg/domain/manualfault/counter.go` / `FaultCounter.AddFault`、`dealFrequencyFault` |
| 任务级软件故障判断 | `component/clusterd/pkg/domain/manualfault/job_fault_mgr.go` / `JobFaultManager.AddFault`、`firstItemIsSfwFault` |

### 4.8 作业信息与 RankTable

作业信息由 `jobv2` 和 `domain/job` 缓存维护。PodGroup/Pod/ACJob/VCJob informer 触发作业缓存与 ConfigMap 更新，并通过 `jobinfo` gRPC 服务向客户端推送作业摘要。RankTable 由 `epranktable` 管理，Config 服务在 RankTable 变更时通过 `ConfigPublisher` 推送给订阅者。

源码确认锚点：

| 结论 | 源码锚点 |
|---|---|
| PodGroup 与 Pod 回调注册到 `jobv2` | `component/clusterd/main.go` / `addJobFunc` |
| 作业新增、更新、预删除、删除逻辑 | `component/clusterd/pkg/application/jobv2/processor.go` / `addJob`、`updateJob`、`preDeleteJob`、`deleteJob` |
| 作业状态基于 PodGroup、Pod phase、设备分配完成情况判断 | `component/clusterd/pkg/application/jobv2/processor.go` / `getStatusByCache` |
| Job gRPC 服务按白名单角色注册客户端 | `component/clusterd/pkg/application/jobinfo/job_grpc_service.go` / `Register` |
| RankTable 变更回调推送 | `component/clusterd/pkg/application/config/grpc_service.go` / `rankTableChange` |

### 4.9 PingMesh、公共故障、统计与资源

| 子模块 | 主要职责 | 源码锚点 |
|---|---|---|
| PingMesh | 从 Node 标签/设备信息维护 SuperPod 设备缓存，并处理 PingMesh 配置与发布。 | `component/clusterd/pkg/application/pingmesh/collector.go` / `NodeCollector` |
| PublicFault | 接收 gRPC 公共故障请求，转换为 `api.PubFaultInfo` 并进入公共故障采集/处理链。 | `component/clusterd/pkg/application/publicfault/grpc_service.go` / `SendPublicFault` |
| Statistics | 启动作业统计采集、输出与故障统计更新。 | `component/clusterd/main.go` / `initStatisticModule` |
| Resource | 启动资源上报协程。 | `component/clusterd/main.go` / `startInformer` 调用 `resource.Report(ctx)` |
| SchedulingException | 启动调度异常检查。 | `component/clusterd/main.go` / `initStatisticModule` |

## 5. 核心数据结构与接口

| 数据结构/接口 | 位置 | 用途 |
|---|---|---|
| `constant.DeviceInfo`、`DeviceInfoNoName`、`DeviceFault`、`FaultTimeAndLevel` | `pkg/common/constant/type.go` | 设备信息、设备故障、故障时间与级别。 |
| `constant.NodeInfo`、`FaultDev` | `pkg/common/constant/type.go` | 节点故障与故障设备列表。 |
| `constant.SwitchInfo`、`SwitchFaultInfo` | `pkg/common/constant/type.go` | 交换机故障状态、故障码、节点状态、故障时间级别映射。 |
| `constant.DpuInfoCM`、`DpuCMDataItem` | `pkg/common/constant/type.go` | DPU ConfigMap 结构。 |
| `constant.JobInfo`、`RankTable`、`ServerHccl`、`Device` | `pkg/common/constant/type.go` | 作业缓存、HCCL RankTable 与设备 Rank 映射。 |
| `conf.ManuallySeparatePolicy` | `pkg/domain/conf/config.go` | 人工隔离配置结构。 |
| `manualfault.FaultCounter` | `pkg/domain/manualfault/counter.go` | 设备故障频率计数。 |
| `manualfault.JobFaultManager`、`manualfault.Fault` | `pkg/domain/manualfault/job_fault_mgr.go` | 任务级故障缓存和软件故障判断。 |
| `baseFaultCenter[T]` | `pkg/application/faultmanager/cmprocess/base_fault_center.go` | ConfigMap 故障中心泛型模板。 |
| `FaultRecoverService` | `pkg/application/recover/fault_recover_service.go` | 恢复服务状态、订阅和作业恢复控制入口。 |
| `BusinessConfigServer` | `pkg/application/config/grpc_service.go` | RankTable 注册/订阅服务。 |
| `FaultServer` | `pkg/application/fault/grpc_service.go` | 故障注册、订阅和查询服务。 |
| `JobServer` | `pkg/application/jobinfo/job_grpc_service.go` | 作业摘要注册与订阅服务。 |

## 6. 核心流程

### 6.1 设备/节点/交换机故障汇聚流程

1. Device Plugin、NodeD 等组件更新对应 ConfigMap。
2. Clusterd informer 回调将变更写入领域 collector。
3. `faultProcessCenter` 每秒触发 `Process`。
4. `SwitchCenter`、`DeviceCenter`、`NodeCenter`、`DpuCenter` 从各自 cmManager 获取原始 ConfigMap。
5. 各中心按处理器链输出处理后的 ConfigMap。
6. `FaultJobCenter` 基于处理后的设备、交换机、节点信息生成作业故障信息。
7. 订阅者收到故障中心变更，恢复服务或 Fault 服务继续处理。

源码确认锚点：`main.go` / `addResourceFunc`，`fault_process_center.go` / `Process`，`base_fault_center.go` / `Process`，`fault_job_center.go` / `Process`。

### 6.2 作业故障通知与恢复控制流程

1. `FaultRecoverService` 在初始化时向 `FaultJobCenter` 注册 `faultCh`。
2. `FaultJobCenter.NotifySubscriber` 推送过滤后的作业故障。
3. 恢复服务将 `constant.JobFaultInfo` 转换为 gRPC 格式故障。
4. `EventController` 保存故障缓存、更新健康状态与重启/恢复信息。
5. 若是亚健康热切，触发 `BeginHotSwitchEvent`。
6. 若新增故障不支持 Retry，或非纯 Retry 且存在故障节点，则向 agent 发送预退出信号。
7. 否则触发 `FaultOccurEvent` 进入恢复状态机。

源码确认锚点：`fault_recover_service.go` / `NewFaultRecoverService`、`notifyFaultInfoForJob`、`sendPreExitSignal`。

### 6.3 RankTable 配置下发流程

1. 客户端调用 Config 服务 `Register`，按 jobId 创建或抢占 `ConfigPublisher`。
2. 客户端调用 `SubscribeRankTable` 订阅 RankTable。
3. 服务向 RankTable 队列加入生成请求。
4. `RankTableManager` 发生变更时回调 `BusinessConfigServer.rankTableChange`。
5. 回调将 `RankTableStream` 写入对应 publisher，订阅流发送给客户端。
6. 订阅结束后按创建时间删除 publisher，避免误删新连接。

源码确认锚点：`config/grpc_service.go` / `Register`、`SubscribeRankTable`、`rankTableChange`、`deletePublisher`。

### 6.4 人工隔离流程

1. Clusterd 启动时加载 `clusterd-config-cm` 中的人工隔离策略。
2. 初始化人工隔离缓存，并从人工隔离 ConfigMap 加载已有状态。
3. 设备故障进入人工隔离处理器后，若有 jobId，则进入 `JobFaultManager` 进行任务级软件故障识别。
4. 非软件故障或无 jobId 故障进入 `FaultCounter`。
5. `FaultCounter` 根据 `fault_window_hours` 和 `fault_threshold` 判断是否达到频率阈值。
6. 达到阈值后写入 `FaultCmInfo` 人工隔离缓存。
7. `ProcessManuSep` 每 15 秒同步缓存到 ConfigMap，并处理手动删除和自动释放。

源码确认锚点：`main.go` / `dealManuallySeparateNPUFault`，`watch.go` / `loadGlobalConfig`，`job_fault_mgr.go` / `AddFault`，`counter.go` / `AddFault`，`cm.go` / `ProcessManuSep`。

### 6.5 作业状态与作业摘要推送流程

1. PodGroup、Pod、ACJob、VCJob informer 触发 `jobv2` 回调。
2. `jobv2` 根据 PodGroup、Pod 数量、Pod phase、设备分配状态计算作业状态。
3. 通过 `domain/job` 更新作业缓存与 ConfigMap。
4. 通过 `jobinfo.SendJobInfoSignal` 推送作业摘要。
5. `JobServer` 将摘要推送给已注册并订阅的白名单客户端。

源码确认锚点：`main.go` / `addJobFunc`，`jobv2/processor.go` / `updateJob`、`getStatusByCache`，`jobinfo/job_grpc_service.go` / `SubscribeJobSummarySignal`。

## 7. 配置、部署与构建 Runbook

### 7.1 构建

| 操作 | 命令/文件 | 说明 |
|---|---|---|
| 单组件构建 | `component/clusterd/build/build.sh` | 执行 `go mod tidy`，设置 `CGO_ENABLED=0`，使用 PIE 与安全链接参数构建 `clusterd`。 |
| 全仓构建入口 | `build/build_all.sh` | 将 `component/*` 复制到 GOPATH，并准备 Volcano 源码。 |
| 单组件分发构建 | `build/build_each.sh` | 对非 Volcano 组件进入对应 `build` 目录执行 `build.sh`。 |
| 版本来源 | `component/clusterd/service_config.ini` 或上层复制后的 `service_config.ini` | `build.sh` 默认 `v6.0.0`，存在版本文件时读取第一行并加 `v`。 |
| 输出产物 | `component/clusterd/output/` | 包含二进制、Dockerfile、故障配置 JSON、`fdConfig.yaml` 和版本化部署 YAML。 |

源码确认锚点：`component/clusterd/build/build.sh` / `build`、`mv_file`、`change_mod`。

### 7.2 测试与验证

| 操作 | 命令/文件 | 说明 |
|---|---|---|
| 单元测试 | `component/clusterd/build/test.sh` | 执行 `go test -mod=mod -gcflags=all=-l -v -coverprofile cov.out ${TOP_DIR}/pkg/...`。 |
| 覆盖率门禁 | `component/clusterd/build/test.sh` | 使用 `go tool cover -func=cov.out`，向上取整后要求覆盖率 `>= 80%`。 |
| 报告产物 | `component/clusterd/test/api.html`、`unit-tests.xml`、`cov.out` | `gocov`、`gocov-html`、`gotestsum` 生成。 |

### 7.3 镜像

| 文件 | 关键行为 |
|---|---|
| `component/clusterd/build/Dockerfile` | 基于 `ubuntu:22.04`，创建 `hwMindX` 非登录用户，复制 `clusterd`、故障策略 JSON 与 `fdConfig.yaml`，设置只读权限和 `umask 027`，最终以 `hwMindX` 运行。 |

### 7.4 部署

| 文件 | 关键配置 |
|---|---|
| `component/clusterd/build/clusterd.yaml` | 定义 `clusterd-config-cm`、ServiceAccount、ClusterRole、ClusterRoleBinding、Deployment 等资源。 |
| `clusterd-config-cm` | 包含 `manually_separate_policy.conf`，默认 `enabled: true`、`fault_window_hours: 24`、`fault_threshold: 3`、`fault_free_hours: 48`。 |
| RBAC | 需要 pods、services、configmaps、nodes、nodes/status 等权限；ConfigMap 权限包含 get/create/update/list/watch/delete/patch。 |

### 7.5 回滚

源码中未提供专用回滚脚本。基于部署与构建产物，可确认的回滚边界是：

- 回滚镜像版本：使用上一版本 `clusterd` 镜像与对应 `clusterd-<version>.yaml`。
- 回滚配置：恢复 `clusterd-config-cm` 中 `manually_separate_policy.conf` 到上一个版本。
- 人工隔离状态：人工隔离状态独立持久化在运行期 ConfigMap 中，回滚代码或镜像不会自动清空隔离状态；如需解除，需要按人工隔离 ConfigMap 当前格式手动删除目标设备条目，并由 `ProcessManuSep` 同步缓存。

确定性边界：上述回滚方式来自部署文件与运行逻辑推断；仓库未发现 Clusterd 专属 rollback 脚本。

## 8. 关键约束

| 约束 | 来源 |
|---|---|
| Clusterd 启动依赖 Kubernetes、Volcano、Ascend Operator 客户端初始化成功；Volcano 不存在时启动失败。 | `main.go` / `initK8sServer` |
| gRPC 监听依赖 `POD_IP` 为合法 IPv4/IPv6；`-useProxy` 会改为 `127.0.0.1`。 | `grpc_init.go` / `Start`、`isIPValid` |
| gRPC 有全局 QPS 限流和连接数限制。 | `main.go` / `limitQPS`，`grpc_init.go` / `limiter.LimitListener` |
| Recover 探测接口使用独立限流器，其他业务 gRPC 使用通用限流器。 | `main.go` / `limiterMap` |
| Job 服务只允许 `CCAgent`、`DefaultUser1`、`DefaultUser2`、`FdAgent` 角色注册。 | `job_grpc_service.go` / `init`、`Register` |
| Fault 查询 jobId 长度必须在 8 到 128 之间，且不能包含中文字符。 | `fault/grpc_service.go` / `isValidJobId` |
| 人工隔离配置：`fault_window_hours` 为 1-720，`fault_threshold` 为 1-50，`fault_free_hours` 为 1-240 或 -1。 | `domain/conf/config.go` / `Check` |
| 人工隔离初始化必须早于故障处理中心。 | `main.go` / `dealManuallySeparateNPUFault` 前置注释与调用顺序 |
| `baseFaultCenter.Register` 和 `FaultJobCenter.Register` 对订阅者数量有限制。 | `base_fault_center.go` / `Register`，`fault_job_center.go` / `Register` |
| 单元测试覆盖率门禁为 80%。 | `build/test.sh` / `execute_test` |

## 9. 故障模式与调试指南

| 症状 | 可能源区 | 检查命令/文件 |
|---|---|---|
| Clusterd 启动失败，日志提示 Volcano 不存在 | K8s/Volcano 初始化 | 检查 `component/clusterd/main.go` / `initK8sServer`；运行环境检查 Volcano 组件与 CRD。 |
| gRPC 无法监听或客户端连接失败 | `POD_IP`、监听地址、连接限流、RBAC/Service | 检查 `component/clusterd/pkg/interface/grpc/grpc_init.go` / `Start`；查看 Clusterd 日志中的 `listen on:`。 |
| gRPC 请求返回 `qps exceeded` | gRPC 限流 | 检查 `component/clusterd/main.go` / `limitQPS`、`limiterMap`；调整调用频率或排查异常重试。 |
| Fault 服务注册失败，提示 job 不存在 | 作业缓存或多实例 job namespace/appType 查询失败 | 检查 `component/clusterd/pkg/application/fault/grpc_service.go` / `preRegistry`；检查 PodGroup、Pod、ACJob/VCJob informer 状态。 |
| Job 服务注册失败，提示角色不在白名单 | 客户端 role 不允许 | 检查 `component/clusterd/pkg/application/jobinfo/job_grpc_service.go` / `clientWhiteList`。 |
| 作业摘要不更新或状态不符合预期 | `jobv2` 作业状态计算、Pod 设备分配标记、PodGroup MinMember | 检查 `component/clusterd/pkg/application/jobv2/processor.go` / `getStatusByCache`；检查 Pod phase、PodGroup、设备分配 annotation。 |
| RankTable 订阅无数据 | Config 注册/订阅顺序、RankTable 生成队列、publisher 是否被抢占 | 检查 `component/clusterd/pkg/application/config/grpc_service.go` / `Register`、`SubscribeRankTable`、`rankTableChange`。 |
| 设备故障未进入恢复流程 | ConfigMap informer、FaultProcessCenter、设备处理器链、JobFaultCenter | 检查 `component/clusterd/pkg/application/faultmanager/fault_process_center.go` / `Process`；检查 `cmprocess/device_fault_center.go` 处理器链；检查 `jobprocess/fault_job_center.go` / `NotifySubscriber`。 |
| 人工隔离未生效 | 全局配置、人工隔离处理器、频率阈值、软件故障过滤 | 检查 `component/clusterd/pkg/application/conf/watch.go` / `loadGlobalConfig`；`pkg/domain/manualfault/counter.go` / `AddFault`；`pkg/domain/manualfault/job_fault_mgr.go` / `firstItemIsSfwFault`。 |
| 人工隔离被自动释放或手动删除后状态变化 | `ProcessManuSep` 周期同步、ConfigMap 差异检查、释放配置 | 检查 `component/clusterd/pkg/application/manualfault/cm.go` / `checkDiffAndDelete`、`release`、`doRelease`。 |
| 公共故障上报被拒绝或限流 | PubFault 参数转换、公共故障 collector、资源级 limiter | 检查 `component/clusterd/pkg/application/publicfault/grpc_service.go` / `SendPublicFault`。 |
| 热切/恢复状态停滞 | Recover EventController 状态机、Pod Running/Deleted 事件、FaultRank 变化 | 检查 `component/clusterd/pkg/application/recover/fault_recover_service.go` / `notifyFaultInfoForJob`、`podStatusMonitor`；检查 `component/clusterd/pkg/application/recover/rules.go`。 |
| PingMesh SuperPod 信息不更新 | Node 标签/设备信息非法、SuperPodID 非自然数 | 检查 `component/clusterd/pkg/application/pingmesh/collector.go` / `NodeCollector`。 |
| 测试覆盖率失败 | 单元测试或覆盖率门禁 | 执行 `bash component/clusterd/build/test.sh`，查看 `component/clusterd/test/testClusterd.txt` 与 `cov.out`。 |

## 10. 源码确认事实、推断与缺口

### 10.1 源码确认事实

- Clusterd 是 Go 组件，入口为 `component/clusterd/main.go`。
- 运行时依赖 K8s、Volcano、Ascend Operator 客户端初始化。
- gRPC 服务包括 Recover、PubFault、Profiling、Config、Fault、Job。
- 故障处理中心每秒周期处理，并支持按类型通知处理。
- 设备故障处理链包含公共故障、自定义故障、UCE 伴随故障、Retry、原地恢复、压测过滤、预隔离、增量故障、人工隔离。
- 人工隔离支持配置加载、频率计数、任务级软件故障识别、ConfigMap 同步、手动删除同步和自动释放。
- 构建脚本会生成 `output` 目录，测试脚本要求 `pkg/...` 单元测试覆盖率不低于 80%。
- 容器默认使用 `hwMindX` 用户运行，并将策略配置文件放在 `/home/hwMindX`。

### 10.2 基于源码与文档的合理推断

- Clusterd 位于 MindCluster 集群调度故障恢复控制面，连接 Device Plugin、NodeD、Volcano、Ascend Operator、taskd、FD 等组件。
- `FaultJobCenter` 的输出是 Recover、Fault gRPC 等上游消费者的核心故障输入。
- 人工隔离 ConfigMap 是运行时状态的一部分，镜像回滚不会天然清除该状态。
- 公共故障可以通过 gRPC 上报，也可以通过 PublicFault ConfigMap informer 进入处理链。

### 10.3 证据缺口

- 本次材料未包含 `.proto` 原始文本内容摘录，接口字段级说明主要基于生成代码、服务实现与文件结构。
- 未看到 Clusterd 专属回滚脚本，回滚说明来自构建/部署文件和运行逻辑。
- 未看到完整 Deployment 片段摘录；部署权限与配置基于 `component/clusterd/build/clusterd.yaml` 已给出的片段和源码运行依赖整理。
- 故障处理器内部算法较多，本文只覆盖模块级设计与主链路，不逐一展开每个处理器的细节规则。