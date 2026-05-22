# Ascend/mind-cluster 架构与接口文档

本文档基于提供的源码片段及官方文档，针对 MindCluster 集群调度组件的核心调用链、插件接口对接、重调度机制及故障诊断流程进行梳理。

## 1. mindcluster-08: Ascend Device Plugin Allocate gRPC 调用链

**概述**：
当 K8s 调度器完成 Pod 调度后，Kubelet 调用 Ascend Device Plugin 的 gRPC 接口进行 NPU 资源的最终分配与挂载。

### 1.1 核心组件与接口

| 组件/模块 | 文件路径 | 关键结构/接口 | 说明 |
| :--- | :--- | :--- | :--- |
| **gRPC Server** | `pkg/server` (推断) | `PluginServer` | 实现 Kubernetes Device Plugin gRPC 协议，接收 Allocate 请求。 |
| **Device Manager** | `pkg/device` | `HwAscend910Manager` (及其他芯片 Manager) | 节点本地设备管理，维护设备列表与状态。 |
| **Ascend Docker Runtime** | `ascend-docker-runtime` | Runtime Hook | 容器创建时的 PreStart/Hook 机制，执行设备挂载。 |

### 1.2 Allocate 处理流程

基于源码片段 `plugin_test.go` 与文档 `03_full_npu_scheduling_and_static_vnpu_scheduling_training.md` 的调用链如下：

1. **接收请求** (`pkg/server`):
   - Kubelet 向 Device Plugin 发送 `Allocate` gRPC 请求，请求内容包含容器请求的 NPU 资源 ID（通常从 Pod Annotation 获取）。
   - 源码依据：`plugin_test.go` 中测试了 `NewPluginServer`，Server 初始化时注入了 `device.NewHwAscend910Manager()`，表明 Server 持有设备管理器实例。

2. **设备分配逻辑** (`pkg/device`):
   - Server 调用底层 `HwAscend910Manager` 查询设备状态。
   - **健康检查**: 参考源码中的 `mockAllNpuInfo` 结构，Manager 维护 `AllDevs` 列表，并包含 `Health` 状态字段。只有 `Health: "Healthy"` 的设备才可分配。
   - **映射构建**: 源码 `TestUpdateAllocMap` 显示存在 `klt2RealDevMap`，用于将 Kubelet 理解的设备 ID 映射到实际物理设备 ID。

3. **协作与挂载** (`ascend-docker-runtime`):
   - 文档依据：`03_full_npu_scheduling...md` 原理图指出，Kubelet 创建容器时，调用 Ascend Device Plugin 挂载芯片。Device Plugin 将分配结果返回给 Kubelet。
   - **资源注入**: Ascend Docker Runtime 拦截容器创建过程，依据 Device Plugin 返回的设备信息，挂载 NPU 设备文件（如 `/dev/davinci0`）、配置文件（如 `hccl.json`）到容器内部。
   - **Annotation 更新**: Device Plugin 或 Volcano Scheduler 会将芯片信息和节点硬件信息写入 Pod 的 Annotation 中。

### 1.3 调用链验证
源码 `plugin_test.go` 中虽未直接展示 `Allocate` 实现函数（源码未提供完整实现文件），但通过测试代码可验证关键数据结构：
- `devices` 列表定义了节点上可用的 NPU 设备。
- `NewPluginServer` 初始化确认了 Server 对 Device Manager 的依赖关系。

---

## 2. mindcluster-09: Ascend-for-Volcano 插件接口对接与调度策略

**概述**：
`ascend-for-volcano` 作为 Volcano 调度器的扩展插件，实现 NPU 亲和性调度。通过 `internal/npu/factory.go` 构建不同芯片型号的策略处理器。

### 2.1 Volcano Plugin 接口对接

| Volcano 扩展点 | 插件实现位置 (推断) | 函数/方法名 | 源码依据 |
| :--- | :--- | :--- | :--- |
| **Predicate (过滤)** | `plugin/` (包含 ScheduleHandler) | `NodePredicate` | `plugin/node_test.go` 中包含 `TestSNodePredicate`，测试了节点 NPU 资源校验逻辑。 |
| **Score (打分)** | `internal/npu/...` | `ScoreBestNPUNodes` | 文档 `05_scheduling_algorithm...md` 明确提及该函数用于节点优选打分。 |
| **Init (初始化)** | `internal/npu/factory.go` | `InitPolicyHandler` | 源码 `factory.go` 定义了初始化入口，根据 Job 属性加载对应策略。 |

**对接机制**：
- 插件注册：通过 `factory.go` 注册到 Volcano 的 `framework.Plugin` 接口。
- **Predicate 流程**: 
  1. `TestSNodePredicate` 显示，插件首先校验 Task 所属 Job 是否在 `ScheduleEnv.ClusterCache.Jobs` 中。
  2. 校验节点资源 `Idle` 是否满足请求 `Resreq`。
  3. 校验节点健康状态，排除标注了 `NodeHealthyStatusKey: PreSeparateFaultCode` 的故障节点。

### 2.2 芯片型号调度策略差异

源码 `factory.go` 使用工厂模式管理不同芯片型号的策略实现：

| 芯片型号/策略 | 实现模块路径 | 核心处理器 | 调度差异说明 |
| :--- | :--- | :--- | :--- |
| **Ascend 910** | `internal/npu/ascend910/...` | `card910Factory` | 支持复杂拓扑调度，如 SuperPod、多级调度。 |
| - SuperPod (A3) | `ascend910a3/superpod` | `module910SuperPod` | `mindie_job.go` 实现 `selectSuperPodForMindIEJob`，基于虚拟 SuperPod 分组进行亲和性调度，支持空闲资源优先策略 (`idlestResourceFitPolicy`)。 |
| - 多级调度 | `policy/multilevelscheduling` | `MultilevelHandler` | RFC 文档详述，支持三级网络拓扑，构建调度树进行分配。 |
| **Ascend 310/310P** | `internal/npu/ascend310/...` | `card310Factory` | 侧重基础卡调度或虚拟化调度。 |
| - vNPU | `ascend310p/vnpu` | `vnpu.Handler` | 处理虚拟 NPU 资源的切分与分配。 |
| **Ascend 910B** | `ascend910b/module910bx16` | `module910bx16` | 910B 系列专用 16 卡模块调度策略。 |

**关键源码逻辑** (`factory.go`):
- **初始化**: `initCard910Factory`, `initCard310Factory` 分别注册处理器。
- **策略选择**: `policy910HandlerMap` 将调度策略字符串（如 `Chip8Node8`, `MultiLevel`）映射到具体的 Handler 名称，通过 `InitPolicyHandler` 实例化。

---

## 3. mindcluster-10: Ascend-for-Volcano 重调度

**概述**：
重调度特性通过监控节点与设备的故障状态，触发 Pod 驱逐以保障集群训练任务的可用性。

### 3.1 触发条件与判定依据

基于 `internal/rescheduling/reschedule_test.go` 中定义的故障模型：

| 故障类型 | 数据结构字段 | 判定依据 |
| :--- | :--- | :--- |
| **节点故障** | `FaultNode.NodeHealthState` | 状态值为 `NodeUnhealthy`（节点级故障）或 `NodeCardUnhealthy`（节点上卡故障）。 |
| **慢节点/网络故障** | `FaultNode.LinkDownTime` | 存在 `LinkDownTime` 时间戳，且 `FaultDeviceList` 中包含 `linkDownFaultCode`。 |
| **亚健康状态** | `FaultNode.HasCardSubHealthFault` / `HasSwitchSubHealthFault` | 标记为 `true`，表示设备或交换机处于亚健康状态。 |
| **设备故障** | `FaultNode.UnhealthyNPU` | 列表中包含具体的故障 NPU 名称（如 `Ascend910-0`）。 |

### 3.2 执行流程

1. **故障检测** (`internal/rescheduling/`):
   - 系统维护 `DealReSchedulerCache`，缓存 `FaultNodes` 和 `FaultJobs` 信息。
   - 定期检测节点状态，更新 Cache 中的 `FaultNode` 对象。

2. **触发重调度**:
   - 源码 `reschedule_test.go` 构造 `FaultJob` 时，包含 `ReScheduleKey` 标签（如 `JobGraceRescheduleLabelValue`），表明 Job 配置了重调度策略。
   - 当检测到节点故障（如 `fakeTestFaultNodeNodeUnhealthy`）或任务故障（`FaultTask`），系统触发重调度逻辑。

3. **通知与驱逐**:
   - **模块协作**: RFC 文档指出 `multilevelscheduling` 模块包含 `rescheduling.go`，处理重调度逻辑。
   - **执行**: 系统调用 Volcano 或 K8s API 驱逐故障节点上的 Pod。
   - **恢复**: Volcano Scheduler 重新调度被驱逐的 Pod 到健康的节点。

---

## 4. mindcluster-11: Ascend-faultdiag 故障诊断端到端流程

**概述**：
故障诊断系统通过日志采集、清洗、知识图谱分析，最终定位故障根因。

### 4.1 数据流与模块结构

基于 `README.md` 目录结构描述：

1. **日志采集** (`utils/fast_parser`):
   - **功能**: 快速解析原始日志数据，作为诊断的输入源。
   - **位置**: `ascend-faultdiag/src/ascend_fd/utils/fast_parser`。

2. **日志清洗** (`pkg/parse`):
   - **功能**: 对原始日志进行预处理，包括黑名单过滤 (`blacklist`)、日志解析 (`knowledge_graph/parser`)、网络拥塞分析 (`network_congestion`)、节点异常解析 (`node_anomaly`)。
   - **位置**: `ascend-faultdiag/src/ascend_fd/pkg/parse`。

3. **知识图谱引擎分析** (`pkg/diag/knowledge_graph/kg_engine`):
   - **功能**: 核心分析引擎，基于图谱规则进行故障推演。
   - **子目录**:
     - **`graph`**: 存放知识图谱的拓扑结构定义，定义节点间关系（如设备-服务器-交换机层级）。
     - **`model`**: 存放故障诊断模型或规则逻辑，用于推理故障类型与根因。
   - **位置**: `ascend-faultdiag/src/ascend_fd/pkg/diag/knowledge_graph/kg_engine`。

4. **根因节点定位** (`pkg/diag/root_cluster`):
   - **功能**: 综合分析结果，定位发生故障的具体集群节点或设备实体。
   - **位置**: `ascend-faultdiag/src/ascend_fd/pkg/diag/root_cluster`。

### 4.2 核心处理逻辑
整个流程构成一条流水线：
- **Input**: 节点/设备日志。
- **Process**: Fast Parser -> Parse (清洗与结构化) -> KG Engine (图谱匹配与推理) -> Root Cluster (实体定位)。
- **Output**: 故障根因报告。

---

**总结**：
本文档基于源码测试文件、工厂模式实现及官方 RFC 文档，梳理了 MindCluster 四个核心模块的架构与流程。`ascend-device-plugin` 侧重设备生命周期管理，`ascend-for-volcano` 实现复杂的调度与重调度策略，`ascend-faultdiag` 提供闭环的故障诊断能力。各模块通过 Annotation、Cache 及 gRPC 紧密协作。
