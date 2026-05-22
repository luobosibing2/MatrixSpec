# MindCluster 集群调度架构概览

## 核心组件构成、层级与职责 (mindcluster-01)

### 1. 核心组件构成及运行层级
MindCluster 集群调度部分由以下核心组件构成：

| 组件名称 | 运行层级 | 关键职责 | 主要文件依据 |
|---------|----------|----------|--------------|
| **NodeD** | **节点级** | 检测计算节点异常状态，从 IPMI 获取 CPU、内存、硬盘故障信息及 DPC 共享存储、灵衢网络故障信息，上报给 ClusterD | `./docker/noded/OVERVIEW.zh.md` |
| **ClusterD** | **集群级** | 部署在管理节点，收集汇总集群任务、资源、故障信息，从任务、芯片、故障维度统计分析，统一判定故障处理级别和策略 | `./docker/clusterd/OVERVIEW.zh.md` |
| **Ascend Device Plugin** | **节点级** | 在每个计算节点上运行，向 kubelet 注册 NPU 设备资源，通过 gRPC 提供设备插件接口，检测并上报芯片故障、参数面网络故障 | `./component/ascend-device-plugin/pkg/server/server.go` |
| **ascend-for-volcano** | **集群级** | 作为 Volcano 调度器的扩展插件，在调度决策阶段进行 NPU 亲和性调度、拓扑感知调度（如 Tor、SuperPod）等 | `./component/ascend-for-volcano/plugin/tor.go` |
| **Ascend Operator** | **集群级** | 作为 Kubernetes 控制器，管理 `AscendJob` CRD 的生命周期，将用户提交的训练 Job 转换为 Volcano Job 或 PodGroup，协调训练任务状态 | `./component/ascend-operator/build/ascend-operator.yaml` |
| **Ascend FaultDiag** | **离线工具** | 提供日志清洗和故障诊断功能，提取训练及推理过程相关日志的关键信息，分析故障根因节点以及故障事件 | `./component/ascend-faultdiag/README.md` |

### 2. 主链路职责划分
在 **“用户提交训练 Job → 调度决策 → NPU 设备分配 → 容器运行”** 主链路中，各组件职责如下：

- **Job 提交与管理（Ascend Operator）**：用户提交 `AscendJob` CRD（定义见 `component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go`），Ascend Operator 监听并管理其状态，将 `AscendJob` 转换为 Volcano `Job` 或 `PodGroup` 以进行调度。源码路径：`./component/ascend-operator/build/ascend-operator.yaml`（CRD 定义与控制器部署）。

- **调度决策（ascend-for-volcano + Volcano）**：`ascend-for-volcano` 作为 Volcano 调度器插件，在调度阶段对 NPU 进行亲和性调度、拓扑感知调度（如 Tor 拓扑调度，见 `./component/ascend-for-volcano/plugin/tor.go`）、虚拟化设备调度等。调度决策结果生成 Pod 的设备分配 annotation。

- **设备发现与注册（Ascend Device Plugin）**：在每个计算节点上，Ascend Device Plugin 通过 gRPC 向 kubelet 注册 NPU 设备（见 `./component/ascend-device-plugin/pkg/server/server.go` 中的 `register()` 方法），并通过 `ListAndWatch` 接口上报设备状态。故障检测后，将芯片信息写入节点级 ConfigMap `mindx-dl-deviceinfo-<nodename>`（简称 `device-info-cm`）。

- **节点故障检测（NodeD）**：NodeD 检测节点级故障（CPU、内存、硬盘、DPC 共享存储、灵衢网络故障），写入节点级 ConfigMap `mindx-dl-nodeinfo-<nodename>`（简称 `node-info-cm`），并上报给 ClusterD。

- **集群级故障汇总与决策（ClusterD）**：ClusterD 部署在管理节点，汇总所有节点的 `device-info-cm` 和 `node-info-cm`，以及公共故障信息，写入集群级 ConfigMap `cluster-info-device-cm`、`cluster-info-node-cm`（简称 `cluster-info-cm`），统一判定故障处理级别，并通过 gRPC 接口向 ascend-for-volcano 提供任务信息查询服务（见 `./docs/zh/scheduling/api/clusterd/07_job_information_apis.md`）。

- **容器运行（Ascend Docker Runtime + Kubelet）**：Ascend Docker Runtime（未在本次源码中详细体现，但为关键组件）作为容器运行时，根据 Pod annotation 中的设备分配信息（如 `huawei.com/Ascend910`）将 NPU 设备挂载到容器。训练任务容器通过环境变量 `ASCEND_VISIBLE_DEVICES` 或 annotation `huawei.com/AscendReal` 获取设备信息。

### 3. 组件协作机制
组件之间主要通过以下机制协作：

- **Kubernetes API（CRD + Controller）**：
  - Ascend Operator 通过监听 `AscendJob` CRD 并更新其状态（见 `./component/ascend-operator/build/ascend-operator.yaml` 中的 RBAC 规则）。
  - Ascend Device Plugin 通过 ConfigMap `device-info-cm` 上报芯片信息，ClusterD 通过 ConfigMap `cluster-info-cm` 汇总并上报给调度器。

- **gRPC 接口**：
  - Ascend Device Plugin 通过 gRPC 向 kubelet 注册设备（见 `./component/ascend-device-plugin/pkg/server/server.go` 中的 `v1beta1.RegisterDevicePluginServer`）。
  - ClusterD 提供 gRPC 服务接口供 ascend-for-volcano 查询任务信息（见 `./docs/zh/scheduling/api/clusterd/07_job_information_apis.md`）。

- **ConfigMap 机制**：
  - **节点级 ConfigMap**：
    - `mindx-dl-deviceinfo-<nodename>`：每个节点的 Ascend Device Plugin 创建，记录本节点 NPU 和灵衢总线设备信息。
    - `mindx-dl-nodeinfo-<nodename>`：每个节点的 NodeD 创建，记录本节点设备信息。
  - **集群级 ConfigMap**：
    - `cluster-info-device-cm`、`cluster-info-node-cm`：ClusterD 创建，汇总集群资源信息。
    - `reset-config-<job-name>`：任务级 ConfigMap，用于断点续训场景。
  - ConfigMap 详细说明见 `./docs/zh/scheduling/usage/resumable_training/01_solutions_principles.md`。

- **Volcano 调度框架集成**：
  - `ascend-for-volcano` 作为 Volcano 插件，在 `session` 中注册并参与 `predicate`、`prioritize`、`allocate` 等调度阶段（见 `./component/ascend-for-volcano/plugin/tor.go`）。

- **故障信息流**：
  - 断点续训场景下的故障检测信息流：Ascend Device Plugin → device-info-cm → ClusterD → cluster-info-cm → ascend-for-volcano；NodeD → node-info-cm → ClusterD → cluster-info-cm → ascend-for-volcano。详细流程见 `./docs/zh/scheduling/usage/resumable_training/01_solutions_principles.md`。

---

## `ascend-common` 公共库能力解析 (mindcluster-02)

### 1. 三个子目录能力
`component/ascend-common` 是公共库，被多个组件依赖。其三个子目录能力如下：

| 子目录 | 提供能力 | 关键内容示例 |
|-------|----------|--------------|
| **`api/`** | **业务 API 定义与客户端生成**：包含 Ascend Operator 的 CRD 定义（如 `AscendJob` 类型）、clientset、informers、listers 等客户端代码，以及默认资源名称、品牌标识等公共常量。 | `component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go`（`AscendJob` CRD 类型定义）；`component/ascend-common/api/default_name.go`（公共常量如 `ResourceNamePrefix`、`Ascend910`、`HuaweiAscend910` 等） |
| **`common-utils/`** | **通用工具集**：提供日志、缓存、限流、随机数、通用函数等基础能力。 | `component/container-manager/pkg/workflow/modulemgr_test.go` 中使用了 `ascend-common/common-utils/hwlog`（日志配置）；`component/ascend-device-plugin/pkg/server/server.go` 中使用了 `ascend-common/common-utils/limiter`（限流监听器） |
| **`devmanager/`** | **设备管理接口**：封装与 NPU 设备交互的底层接口，如 DCMI（设备管理接口）、HCCN（网络配置）等。 | `README.md` 目录结构中显示 `devmanager/` 包含 `common/`、`dcmi/`、`hccn/` 子目录，用于封装设备驱动交互 |

### 2. Go module 引用路径
其他组件通过以下 Go module 路径引用 `ascend-common`：
- **`ascend-common/api`**：引用公共 API 定义和常量。示例：`./component/ascend-device-plugin/pkg/server/server.go` 中 `"ascend-common/api"`（使用 `api.ResourceNamePrefix` 等常量）。
- **`ascend-common/common-utils/hwlog`**：引用日志配置。示例：`./component/container-manager/pkg/workflow/modulemgr_test.go` 中 `"ascend-common/common-utils/hwlog"`。
- **`ascend-common/common-utils/limiter`**：引用限流工具。示例：`./component/ascend-device-plugin/pkg/server/server.go` 中 `"ascend-common/common-utils/limiter"`。
- **`ascend-common/api/ascend-operator/apis/batch/v1`**：引用 Ascend Operator CRD 类型。示例：`./component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go`。

### 3. 新开发者优先了解内容
新建组件时，应优先了解：
1. **`api/` 中的核心业务对象**：
   - **优先级最高**：了解 `AscendJob` CRD 定义（`component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go`），这是 MindCluster 集群调度中最核心的业务对象。
   - 其次：了解公共常量（`component/ascend-common/api/default_name.go`），特别是资源名称前缀（`ResourceNamePrefix`）、芯片型号常量（如 `Ascend910`、`Ascend910B`）、annotation 键名（如 `Pod910DeviceAnno`、`PodAnnotationAscendReal`）。

2. **`common-utils/` 中的基础设施工具**：
   - 优先：了解 **`hwlog`** 日志配置，这是所有组件日志初始化的基础（见 `./component/container-manager/pkg/workflow/modulemgr_test.go` 中的 `hwlog.LogConfig` 结构）。
   - 其次：了解 `limiter`、`cache`、`utils` 等工具，用于限流、缓存、通用函数。

3. **`devmanager/` 中的设备管理接口**：
   - 仅当组件需要直接与 NPU 设备交互时才需深入了解（如 Ascend Device Plugin、ClusterD、FaultDiag 等组件）。新开发者一般无需立即深入此模块。

---

## 总结
MindCluster 集群调度架构采用 **“节点级检测 → 集群级汇总 → 调度决策”** 的分层协作模式：
- **节点级组件**（NodeD、Ascend Device Plugin）负责故障检测与信息上报。
- **集群级组件**（ClusterD、Ascend Operator、ascend-for-volcano）负责信息汇总、业务管理、调度决策。
- 协作机制以 **ConfigMap** 为核心信息载体，辅以 **gRPC** 注册与查询接口、**Kubernetes API** 控制 loop。

`ascend-common` 作为公共库，以 **业务 API 定义**为核心，**通用工具**为基础设施，**设备管理接口**为硬件交互层。新开发者应优先掌握 `api/` 中的 `AscendJob` CRD 和公共常量，以及 `common-utils/hwlog` 的日志配置。
