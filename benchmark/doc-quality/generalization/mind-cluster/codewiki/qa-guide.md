根据提供的模块摘要文档，以下是针对 Ascend/mind-cluster 仓库的问答检索指南。

---

# MindCluster QA Guide 检索指南

## 一、架构与组件职责类

| 问题类型 | 映射模块/源码路径 | 回答注意事项 |
| :--- | :--- | :--- |
| **组件功能与定位** | `mindcluster-01`<br>源码路径：<br>- `./docker/noded/OVERVIEW.zh.md`<br>- `./docker/clusterd/OVERVIEW.zh.md`<br>- `./component/ascend-device-plugin/pkg/server/server.go`<br>- `./component/ascend-for-volcano/plugin/tor.go` | 1. **区分层级**：NodeD 和 Device Plugin 运行在**节点级**，ClusterD、Ascend Operator、ascend-for-volcano 运行在**集群级**。<br>2. **职责边界**：NodeD 侧重物理硬件（IPMI、磁盘、网络）故障；Device Plugin 侧重 NPU 芯片注册与健康；ClusterD 侧重全局故障汇总与策略判定。<br>3. **主链路顺序**：Operator(提交) -> Volcano(调度) -> Device Plugin(分配) -> Runtime(运行)。 |
| **CRD 与生命周期管理** | `mindcluster-01`<br>源码路径：<br>- `./component/ascend-operator/build/ascend-operator.yaml`<br>- `./component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go` | 1. 明确 `AscendJob` CRD 由 Ascend Operator 转换为 Volcano Job 或 PodGroup。<br>2. 说明 Operator 负责任务状态协调与转换逻辑。 |
| **故障诊断工具使用** | `mindcluster-01`<br>源码路径：<br>- `./component/ascend-faultdiag/README.md` | 强调该组件为**离线工具**，主要用于日志清洗和根因分析，不属于在线调度链路。 |

## 二、调度机制与策略类

| 问题类型 | 映射模块/源码路径 | 回答注意事项 |
| :--- | :--- | :--- |
| **调度流程与决策逻辑** | `mindcluster-01` (架构概览)<br>`mindcluster-09` (接口对接)<br>源码路径：<br>- `./component/ascend-for-volcano/plugin/tor.go`<br>- `./component/ascend-for-volcano/internal/npu/factory.go` | 1. **插件角色**：ascend-for-volcano 是 Volcano 的扩展插件，而非独立调度器。<br>2. **核心动作**：实现 Predicate (过滤) 和 Score (打分) 接口。<br>3. **拓扑调度**：重点关注 Tor 拓扑感知调度，通过 `tor.go` 实现。<br>4. **初始化入口**：调度策略处理器通过 `factory.go` 中的 `InitPolicyHandler` 注册。 |
| **Job 与 Task 数据结构** | `mindcluster-12`<br>源码路径：<br>- `./component/ascend-for-volcano/common/util/type.go`<br>- `./component/ascend-for-volcano/common/util/type_v2.go` | 1. **层级关系**：Job 对应 `PodGroup`/Volcano Job（整体调度单位）；Task 对应 Pod（具体实例）。<br>2. **版本差异**：注意区分 v1 与 v2 数据结构，v2 支持更复杂的层级资源描述。 |
| **资源分配与挂载 (Allocate)** | `mindcluster-08`<br>源码路径：<br>- `./component/ascend-device-plugin/pkg/server/server.go` (推断)<br>- `./component/ascend-device-plugin/pkg/device/` | 1. **触发时机**：Kubelet 在 Pod 调度成功后调用 Device Plugin 的 gRPC `Allocate` 接口。<br>2. **关键逻辑**：设备 ID 映射 (`klt2RealDevMap`) 与健康状态检查。<br>3. **协作组件**：需提及 Ascend Docker Runtime 负责最终的设备挂载。 |

## 三、设备管理与接口类

| 问题类型 | 映射模块/源码路径 | 回答注意事项 |
| :--- | :--- | :--- |
| **底层设备接口** | `mindcluster-04`<br>源码路径：<br>- `./component/ascend-common/devmanager/`<br>- `./component/npu-exporter/collector/common/npu_collector.go` | 1. **接口定义**：核心接口为 `DeviceInterface`，方法包括 `GetDeviceList`, `GetCardIDDeviceID`, `SetServerIndex` 等。<br>2. **CGo 封装**：`devmanager/dcmi` 模块通过 CGo 封装底层 C 语言 DCMI API。<br>3. **芯片差异**：`a310mgr.go` 与 `a910mgr.go` 分别实现不同芯片型号的管理逻辑，注意故障处理策略的差异。 |
| **API 版本差异 (v1 vs v2)** | `mindcluster-03`<br>源码路径：<br>- `./component/ascend-common/api/common_info_v2.go`<br>- `./component/ascend-common/api/const_v2.go`<br>- `./component/ascend-common/api/superpoddevice_v2.go` | 1. **适用场景**：v2 API 专用于新一代硬件（A3、A5、SuperPod），v1 用于旧硬件（Ascend 910、310P）。<br>2. **数据结构**：v2 引入了 `RankLevel`, `LevelElement` 等多级调度结构，支持 SuperPod 资源树。<br>3. **使用建议**：不建议混用，应根据硬件类型选择对应 API 版本。 |
| **设备注册与发现** | `mindcluster-01`<br>源码路径：<br>- `./component/ascend-device-plugin/pkg/server/server.go` | 重点说明 `ListAndWatch` 接口用于上报设备状态，以及节点级 ConfigMap (`mindx-dl-deviceinfo-<nodename>`) 的写入机制。 |

## 四、构建与配置类

| 问题类型 | 映射模块/源码路径 | 回答注意事项 |
| :--- | :--- | :--- |
| **编译与构建流程** | `mindcluster-13`<br>源码路径：<br>- `./build/build_all.sh`<br>- `./build/build_each.sh`<br>- `./build/service_config.ini` | 1. **脚本区别**：`build_all.sh` 用于全量发布/CI 构建；`build_each.sh` 用于单组件开发调试。<br>2. **配置影响**：`service_config.ini` 中的组件开关控制最终编译产物范围。<br>3. **模块化**：提醒用户关注 `component` 目录下的子模块依赖关系。 |
| **版本号与镜像配置** | `mindcluster-13`<br>配置文件：<br>- `./build/service_config.ini` | 回答时需指出 `mind-cluster-version` 控制版本号，`image_registry_url` 等配置影响镜像构建结果。 |

## 五、扩展开发类

| 问题类型 | 映射模块/源码路径 | 回答注意事项 |
| :--- | :--- | :--- |
| **新增 NPU 芯片型号支持** | `mindcluster-15`<br>涉及模块：<br>1. `component/ascend-common/devmanager`<br>2. `component/ascend-device-plugin/pkg/device`<br>3. `component/ascend-for-volcano/internal/npu` | **必须三处联动修改**：<br>1. **接口层**：在 `ascend-common/devmanager` 扩展芯片 ID 常量和 DCMI 接口定义。<br>2. **上报层**：在 `ascend-device-plugin/pkg/device` 新增设备识别与 ConfigMap 上报逻辑。<br>3. **调度层**：在 `ascend-for-volcano/internal/npu` 实现调度策略，并在 `factory.go` 中注册工厂函数。<br>**同步机制**：通过 ConfigMap (`device-info-cm`) 同步拓扑信息。 |

## 六、故障排查与调试类

| 问题类型 | 映射模块/源码路径 | 回答注意事项 |
| :--- | :--- | :--- |
| **Pod Pending 状态排查** | `mindcluster-排错`<br>排查对象：<br>- `kubectl describe pod`<br>- ConfigMap: `mindx-dl-deviceinfo-<nodename>`<br>- Component: `ascend-device-plugin`, `volcano-scheduler` | 1. **排查步骤**：Event -> 组件状态 -> 节点资源/标签 -> Device Plugin 日志。<br>2. **资源检查**：确认节点是否有 NPU 资源 (`accelerator=huawei-Ascend910`)。<br>3. **数据一致性**：检查 ConfigMap 中的芯片健康状态是否为 `Healthy`。 |
| **调度 Predicate 失败分析** | `mindcluster-排错`<br>源码路径：<br>- `./component/ascend-for-volcano/plugin/node.go`<br>- `./component/ascend-for-volcano/common/util/type.go` | 1. **日志级别**：Predicate 失败日志多为 `DebugLev`，需调整日志级别才能看到详细信息。<br>2. **关键函数**：调用链为 `NodePredicate` -> `CheckNodeNPUByTask`。<br>3. **常见错误**：关注 `RankIdNotExistError` (Rank ID 不存在) 和 `TopoTreeLabelError` (拓扑标签不匹配)。 |
| **故障检测与上报** | `mindcluster-01` | 区分 NodeD (IPMI/网络/磁盘) 与 Device Plugin (芯片/参数面网络) 的故障检测范围，以及 ClusterD 的聚合逻辑。 |
