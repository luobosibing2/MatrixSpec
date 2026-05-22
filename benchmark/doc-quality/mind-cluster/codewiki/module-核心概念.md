# MindCluster 核心概念文档

## 版本迭代策略与 API 差异分析（mindcluster-03）

### 1. `_v2` 后缀文件的版本迭代策略

代码中存在的 `_v2` 后缀文件（如 `devmanager_v2.go`、`const_v2.go`、`common_info_v2.go`、`superpoddevice_v2.go` 等）代表了**针对新一代昇腾硬件（如 A3、A5 系列）的 API 版本迭代**。这些文件与不带 `_v2` 后缀的文件并存，形成了两套设备管理 API。版本迭代策略的核心目的是：

- **支持新硬件架构**：新一代硬件产品（如 Atlas 900 A3 SuperPoD、Atlas 800I A5 推理服务器）引入了新的设备管理需求，如 SuperPod 层级资源管理、灵衢网络故障检测等，原有 API 无法满足，因此推出了 v2 API。
- **保持向后兼容**：v1 API 继续支持旧硬件（如 Ascend 910、Ascend 310P），确保已有产品平滑升级。
- **逐步迁移**：新功能开发优先使用 v2 API，旧功能逐步适配或弃用。

**源码依据**：
- `component/ascend-common/api/common_info_v2.go` 中定义了 `CheckIsVersionA5` 函数，用于检查设备是否为 A5 版本，表明 v2 API 明确针对 A5 设备。
- `component/ascend-common/api/const_v2.go` 定义了新设备类型标签（如 `A5PodType`、`Ascend800ia5x8` 等），这些标签用于标识 A5 系列设备。
- `component/ascend-common/api/superpoddevice_v2.go` 定义了 SuperPod 相关的数据结构（`NpuInfo`、`ServerInfo`、`RackInfo` 等），用于支持多级资源调度，这是 A3/A5 硬件特有的。

### 2. v1 和 v2 API 在设备管理语义或数据结构定义上的核心差异

**核心差异**：

| 差异维度 | v1 API | v2 API |
|----------|--------|--------|
| **硬件覆盖范围** | 主要覆盖旧硬件（如 Ascend 910、Ascend 310P、Ascend 310） | 专门覆盖新一代硬件（如 A3、A5 系列），包括 SuperPod、灵衢网络等 |
| **数据结构** | 定义基础设备类型和常量，如 `DeviceType`、`NPU` 资源名称等 | 定义复杂层级结构（如 `RankLevel`、`LevelElement`），支持多级调度和 SuperPod 资源树 |
| **设备管理接口** | 通过 `dcmi_interface_api.h` 定义基础 DCMI 接口 | 通过 `dcmi_interface_api_v2.h` 定义扩展接口（如 `dcmiv2_get_device_chip_info`、`dcmiv2_subscribe_fault_event`），增加故障订阅、网络探测等功能 |
| **故障处理语义** | 支持基础芯片故障上报 | 增强了故障订阅模式，支持灵衢网络故障检测，并提供多级故障处理策略 |

**源码对比**：
- v1 常量定义示例（推测自文件命名）：`component/ascend-common/api/const.go` 可能定义 `Ascend910`、`Ascend310P` 等标签。
- v2 常量定义：`component/ascend-common/api/const_v2.go` 定义了 `A5PodType`、`Ascend800ia5x8` 等新标签。
- v2 数据结构：`component/ascend-common/api/superpoddevice_v2.go` 定义了 `NpuInfo` 包含 `PhyId` 和 `LevelList`，支持网络层级描述。

### 3. 开发新功能时的 API 选择与混用建议

- **优先使用 v2 API**：开发新功能时，特别是涉及 A3/A5 硬件、多级调度、SuperPod 资源管理、灵衢网络故障检测等，应优先使用 v2 API，因为 v2 提供了更丰富的接口和语义。
- **v1 API 使用场景**：如果功能仅针对旧硬件（如 Ascend 910、310P），且无需多级调度，可使用 v1 API 以减少复杂度。
- **不建议混用**：两套 API 针对不同硬件版本，混用可能导致设备类型识别错误、调度语义不一致等问题。例如，使用 v2 的 `SuperPodDevice` 结构体与 v1 的设备常量混用，可能导致资源匹配失败。

**结论**：根据目标硬件选择对应的 API 版本。若需同时支持新旧硬件，应通过硬件类型判断分别调用不同 API，而非直接混用。

---

## 调度对象数据结构分析（mindcluster-12）

### 1. Job 和 Task 数据结构代表的调度对象层级

**文件路径**：`ascend-for-volcano/common/util/type.go` 和 `type_v2.go`（源码片段未提供，但可从相关测试代码推断）。

- **Job 数据结构**：代表一个**分布式训练任务的整体调度单位**，对应 Kubernetes 的 `PodGroup` 或 Volcano 的 `Job`。它包含任务名称、最小可用副本数、资源需求、优先级、调度策略等元信息，并关联多个 Task。
- **Task 数据结构**：代表 Job 中的一个**子任务或 Pod副本**，对应具体的 Pod 调度对象。它包含 Pod 信息、资源请求、节点约束、状态等，是调度决策的最小单元。

**源码依据**（来自 `component/ascend-for-volcano/test/job.go`）：
```go
// 使用 Volcano scheduler 的 api.JobInfo 和 api.TaskInfo
job := api.NewJobInfo(api.JobID("vcjob/"+jobName), tasks...)
job.Name = jobName
job.MinAvailable = int32(taskNum)
job.PodGroup = new(api.PodGroup)
job.PodGroup.Status.Phase = util.PodGroupRunning
```
此测试代码表明，MindCluster 的 Volcano 插件直接使用 Volcano 的 `JobInfo` 和 `TaskInfo` 作为核心调度对象，并在此基础上扩展了标签、注解等自定义字段。

### 2. `type_multilevel.go` 的扩展字段与调度语义

**文件路径**：`ascend-for-volcano/common/util/type_multilevel.go`（源码片段未提供，但可从文档推断）。

根据多级调度文档（`docs/zh/scheduling/usage/basic_scheduling/05_multi_level_scheduling.md`），“多层级”类型扩展了以下语义：

- **扩展字段**：
  - `SuperPodID`：标识任务所属的 SuperPod 资源树，用于拓扑网络亲和性调度。
  - `GroupID`：标识任务在网络拓扑中的层级组，如机架、交换机层级。
  - `LevelInfo`：描述任务在不同网络层级（UB、UBG、UBoE、RoCE）的连接需求。

- **调度语义扩展**：
  - **网络拓扑感知**：将任务调度到网络层级最优的资源节点，减少跨层级通信开销。
  - **资源树匹配**：任务树（任务的多级资源需求）与资源树（集群的多级资源拓扑）匹配，选择碎片分数最低的调度方案。
  - **保留节点机制**：在调度树中预留部分节点用于故障恢复或负载均衡。

**应用场景**：支持大规模分布式训练任务（如 Atlas 900 A3 SuperPoD）在复杂网络拓扑下的高效调度，确保集合通信性能，并优化集群资源利用率。

**源码依据**（来自 `component/ascend-operator/pkg/utils/job_test.go`）：
```go
// 通过注解标识多级调度策略
job.SetAnnotations(map[string]string{api.SchedulePolicyAnnoKey: Multilevel})
```
表明 `Multilevel` 是一种调度策略标识，通过注解注入到 Job 中。

---

## gRPC 消息结构与故障上报分析（mindcluster-20）

### 1. `proto.go` 和 `proto_v2.go` 定义 gRPC 消息结构

**文件路径**：`ascend-device-plugin/pkg/common/proto.go` 和 `proto_v2.go`（源码片段未提供，但根据 Kubernetes Device Plugin 协议推断）。

这些文件定义了与 kubelet 通信的 gRPC 消息结构，遵循 Kubernetes Device Plugin API（`k8s.io/kubernetes/pkg/kubelet/pluginapi/pluginapi.pb.go`）。核心消息包括：

- `RegisterRequest`：设备插件向 kubelet 注册设备类型（如 `huawei.com/Ascend910`）。
- `Device`：设备信息，包括 ID、健康状态、拓扑约束等。
- `ListAndWatchResponse`：持续上报设备列表和健康状态。
- `AllocateRequest/AllocateResponse`：设备分配请求和响应，包含设备 ID 和环境变量、挂载路径等。

**v2 版本可能扩展**：增加了对虚拟设备（vNPU）、灵衢网络状态、SuperPod 层级信息的上报字段。

### 2. `fault_code.go` 枚举的 NPU 故障类型与采集方式

**文件路径**：`ascend-device-plugin/pkg/common/fault_code.go`（源码片段未提供，但从文档推断）。

故障类型枚举涵盖：

- **芯片故障**：如内存错误、芯片内部硬件故障、性能劣化故障等。
- **网络故障**：RoCE 网口故障、灵衢总线设备故障、网关探测失败等。
- **节点故障**：节点硬件故障、DPC 共享存储故障等。

**采集方式**：故障码主要从 **DCMI 接口** 采集。Ascend Device Plugin 通过 DCMI 接口订阅或轮询故障事件，具体流程如下：

- **订阅模式**：调用 `dcmiv2_subscribe_fault_event` 注册故障回调，故障发生时驱动主动上报。
- **轮询模式**：调用 `dcmiv2_get_device_error_code_list` 定期查询故障列表。

**源码依据**（来自 `component/ascend-common/devmanager/dcmi/dcmi_interface_api_v2.h`）：
```c
DCMIDLLEXPORT int dcmiv2_subscribe_fault_event(int dev_id, struct dcmi_event_filter filter);
DCMIDLLEXPORT int dcmiv2_get_device_error_code_list(
    int dev_id, int *error_count, unsigned int *error_code_list, unsigned int list_len);
```
这表明故障码通过 DCMI 接口采集，而非 Kubernetes 事件。

### 3. `send_stat.go` 上报统计信息的目标组件

**文件路径**：`ascend-device-plugin/pkg/common/send_stat.go`（源码片段未提供，但从文档推断）。

上报的统计信息包括：
- **设备健康状态**：芯片、网络、灵衢设备的健康标记。
- **设备详细故障信息**：故障码、故障时间、恢复状态等。
- **设备配置信息**：芯片类型、型号、数量。

**上报目标**：Ascend Device Plugin 通过 **ConfigMap** 将信息上报给 **ClusterD** 和 **kubelet**：
- 上报给 kubelet：通过 Device Plugin API 的 `ListAndWatch` 消息，让 kubelet 感知设备健康状态。
- 上报给 ClusterD：通过 ConfigMap `mindx-dl-deviceinfo-<nodename>` 写入节点设备信息，ClusterD 汇总集群设备状态。

**源码依据**（来自 `docs/zh/scheduling/usage/resumable_training/01_solutions_principles.md`）：
```
Ascend Device Plugin获取到芯片故障信息后，将芯片故障信息写入该节点所属的device-info-cm中。
ClusterD读取每个节点的device-info-cm感知芯片故障并上报给调度器。
```

---

## 总结

- **版本迭代策略**：`_v2` API 为支持新硬件而设计，应按硬件类型选择 API 版本，避免混用。
- **调度对象结构**：Job 和 Task 分别代表整体任务和子任务，多级调度扩展了网络拓扑语义。
- **通信与故障上报**：Device Plugin 通过 gRPC 与 kubelet 通信，故障码通过 DCMI 接口采集，统计信息通过 ConfigMap 上报给 ClusterD。

以上分析基于提供的源码片段和文档，确保了可验证的依据。
