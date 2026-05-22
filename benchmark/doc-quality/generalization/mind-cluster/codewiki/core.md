# MindCluster 项目总览文档

基于 `Ascend/mind-cluster` 仓库源码与模块文档，本文档梳理了 MindCluster 集群调度系统的核心架构、组件交互、关键接口及运维排错指南。

---

## 1. 架构概览

MindCluster 是面向昇腾（Ascend）NPU 集群的调度与管理系统，构建于 Kubernetes 之上，通过 Volcano 扩展实现了 NPU 拓扑感知调度、故障自动处理及精细化资源管理。

### 1.1 核心架构分层
系统采用分层架构设计，分为节点级、集群级及离线工具层：

| 运行层级 | 核心组件 | 关键职责 |
| :--- | :--- | :--- |
| **集群级** | **Ascend Operator** | 监听 `AscendJob` CRD，转换为 Volcano Job/PodGroup，管理训练任务生命周期。 |
| | **ascend-for-volcano** | Volcano 调度器插件，实现 NPU 亲和性调度、Tor/SuperPod 拓扑感知调度。 |
| | **ClusterD** | 汇总集群故障信息，统一判定故障级别，提供任务信息查询 gRPC 服务。 |
| **节点级** | **Ascend Device Plugin** | 向 Kubelet 注册 NPU 资源，检测芯片故障，上报设备信息至 ConfigMap。 |
| | **NodeD** | 检测节点硬件故障（CPU/内存/网络），上报给 ClusterD。 |
| **离线工具** | **Ascend FaultDiag** | 日志清洗与故障根因分析工具。 |

### 1.2 主链路调用流程
**用户提交任务 → 调度决策 → 资源分配 → 故障处理**

1.  **Job 提交**：用户提交 `AscendJob`，Ascend Operator 将其转换为 Volcano 调度单元。
2.  **调度决策**：`ascend-for-volcano` 插件介入 Volcano 调度过程，读取节点 ConfigMap 中的拓扑与故障信息，执行拓扑亲和性打分与过滤。
3.  **设备分配**：Kubelet 调用 Ascend Device Plugin 的 gRPC `Allocate` 接口，Device Plugin 根据调度结果挂载 NPU 设备文件到容器。
4.  **故障闭环**：NodeD/Device Plugin 检测故障 → ClusterD 汇总判定 → 上报至 ConfigMap → Volcano 调度器感知并隔离故障节点。

---

## 2. 核心组件与接口设计

### 2.1 核心接口概览

| 组件 | 核心接口/结构 | 功能说明 |
| :--- | :--- | :--- |
| **ascend-common** | `DeviceInterface` | 底层设备管理抽象，定义 `GetDeviceList`、`GetCardIDDeviceID` 等方法，屏蔽芯片型号差异。 |
| **Device Plugin** | `PluginServer` (gRPC) | 实现 Kubernetes Device Plugin 协议，处理 `Allocate` 请求，维护 `klt2RealDevMap` 设备映射。 |
| **ascend-for-volcano** | `AscendHandler` | 调度策略接口，定义 `NodePredicate`（过滤）、`ScoreBestNPUNodes`（打分）等方法。 |
| **ClusterD** | gRPC Service | 提供集群级任务信息查询与故障信息聚合服务。 |

### 2.2 设备管理 API 版本策略 (v1 vs v2)
源码中存在 `devmanager.go` 与 `devmanager_v2.go` 两套 API，分别对应不同代际硬件：

- **v1 API**：覆盖 Ascend 910、310P 等旧硬件，定义基础设备常量。
- **v2 API**：覆盖 A3、A5 系列新硬件，引入 `SuperPodDevice` 结构体，支持多级资源调度与灵衢网络故障检测。
- **开发建议**：新功能开发优先使用 v2 API；若需同时支持新旧硬件，需通过 `CheckIsVersionA5` 等函数进行硬件类型判断后分别调用，**严禁混用数据结构**。

---

## 3. 扩展开发指南

### 3.1 新增 NPU 芯片型号支持
开发流程需跨三个组件协同修改，通过 ConfigMap 实现数据同步：

1.  **ascend-common/devmanager**：
    - 扩展 `dcmi_interface_api.h` 接口定义。
    - 新增芯片型号常量与 ID 定义。
    - 实现 `DeviceInterface` 接口的具体芯片管理类（如 `a310mgr`）。
2.  **ascend-device-plugin**：
    - 调用 `devmanager` 获取设备信息。
    - 在 `pkg/device/` 新增设备识别逻辑。
    - 将拓扑信息写入节点级 ConfigMap `mindx-dl-deviceinfo-<nodename>`。
3.  **ascend-for-volcano**：
    - 在 `internal/npu/factory.go` 注册新芯片的调度策略工厂函数。
    - 实现具体的 `AscendHandler` 调度策略（读取 ConfigMap，执行打分）。

### 3.2 构建与编译
- **全量构建**：`build/build_all.sh`，用于 CI/CD 或版本发布，编译所有组件。
- **增量构建**：`build/build_each.sh`，用于单组件调试，通过 `service_config.ini` 配置编译范围。
- **关键配置**：`service_config.ini` 控制组件开关与镜像仓库地址。

---

## 4. 运维排错指南

### 4.1 Pod Pending 状态排查
当任务 Pod 处于 Pending 状态时，按以下优先级排查：

1.  **检查 Kubernetes 调度事件**：
    ```bash
    kubectl describe pod <pod-name> -n <namespace>
    ```
    关注 `Events` 中是否有 `Predicate` 失败信息。
2.  **检查组件状态**：
    确认 `ascend-device-plugin`、`volcano-scheduler`、`clusterd` 等组件 Pod 是否正常运行。
3.  **检查 ConfigMap 数据**：
    ```bash
    kubectl describe cm mindx-dl-deviceinfo-<node-name> -n kube-system
    ```
    确认 `DeviceInfoCfg` 中 NPU 资源是否上报且健康状态为 `Healthy`。

### 4.2 常见 Predicate 失败原因
- **拓扑标签不匹配**：`TopoTreeLabelError`，节点拓扑标签与调度策略不符。
- **参数无效**：`ArgumentError`，Job 配置缺失必要参数。
- **资源不足/故障**：节点 NPU 被标记为故障或资源已被占用。

---

## 5. 后续问答导航

| 主题 | 关键问题 | 参考 |
| :--- | :--- | :--- |
| **组件架构** | 核心组件有哪些？层级如何划分？主链路职责是什么？ | [mindcluster-01] |
| **接口设计** | `DeviceInterface` 包含哪些方法？`Allocate` 调用链是怎样的？ | [mindcluster-04], [mindcluster-08] |
| **版本差异** | v1/v2 API 有何区别？如何选择？ | [mindcluster-03] |
| **调度机制** | Volcano 插件如何对接？Predicate 失败如何排查？ | [mindcluster-09], [mindcluster-16] |
| **扩展开发** | 如何支持新 NPU 型号？构建系统如何使用？ | [mindcluster-13], [mindcluster-15] |
| **数据结构** | Job 和 Task 的调度层级代表什么？ | [mindcluster-12] |
