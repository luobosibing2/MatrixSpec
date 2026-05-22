# mind-cluster-source 根模块实现设计

## 1. 设计概述

### 1.1 设计目标

本设计目标是将 `mind-cluster-source` 定位为可交付、可演进的仓库级聚合运行时设计文档，明确其在多组件生态中的职责边界与协作关系。核心目标包括：

- 建立统一的仓库级能力视图，覆盖调度、故障、容器、运行时、指标与推理工作负载多个域。
- 以 `component/*` 为单元组织系统能力，保证各组件可独立构建、独立发布，但通过公共契约实现跨组件协同。
- 明确 `ascend-common` 作为平台内核依赖在 API、client、informer、常量与工具层的主导地位，降低版本兼容风险。
- 提供可复用的故障闭环与恢复链路（device-plugin/noded/clusterd/taskd/mindio）并维持可观测性和审计追踪。
- 保留文档驱动交付模式（RFC、设计、任务、验证）并与实现变更闭环同步。

### 1.2 设计约束

1. 根模块无单一业务主线逻辑，属于“仓库级编排与交付聚合”入口，不承载单组件控制器的完整领域状态机。
2. 技术栈异构（Go、Python、C/C++），根模块和编排入口不能按单语言假设；构建与发布链路必须与语言边界解耦。
3. 对外核心对象与运行约束来自 `ascend-common`；任何跨组件对象访问必须以 `ascend-common` 的 API/类型/版本为基线。
4. Go 运行环境固定为 Go 1.21；`ascend-faultdiag` Python 依赖需满足 `Python>=3.7.5`、`scikit-learn>=1.3.0`、`pandas>=1.3.5`、`numpy>=1.21.6,<2.0.0`、`joblib>=1.2.0,<1.5.0`、`ply>=3.11`。
5. 兼容性约束以文档/版本策略为准，故障链路与 API 变更必须经过文档和 RFC 联动确认（`docs/rfc`、`docs/zh`）。
6. 根模块公开的 ConfigMap 字段需兼容历史格式，特别是人工隔离相关 CM 字段需支持旧版本字段回填。

## 2. 系统架构

### 2.1 架构概述

系统按“多组件并行 + 统一契约 + 共享控制面”的模式组织。根模块本身提供入口、文档、发布与依赖导航，不直接编排业务事务；业务能力由子组件分工实现：

- `ascend-operator` 提供调度作业控制与 AscendJob 生命周期管理。
- `ascend-for-volcano` 扩展 Volcano 调度能力，支持多级网络亲和性与重调度。
- `ascend-device-plugin` 负责 NPU 资源上报、隔离与容器运行时注入。
- `clusterd` 与 `noded` 负责节点/故障事件采集、策略下发、恢复流程触发。
- `taskd` 承载任务侧恢复/管理。
- `npu-exporter` 提供指标采集与监控输出。
- `ascend-faultdiag*` 负责故障解析、聚合与诊断。
- `infer-operator` 提供推理三层 CRD 工作负载编排能力。
- `mindio` 提供运维和故障恢复相关 Python/C++ 协同能力。

运行时依赖链路主要在以下对象上收敛：

- K8s API（CRD、ConfigMap、事件、Pod/Deployment/StatefulSet）
- 本地持久化对象（CM、Informer 缓存、任务与故障状态）
- 组件间 gRPC/HTTP/HTTP-client 与进程内调用。
- 文档体系驱动的特性变更（README/RFC/API 文档）与实现同步。

### 2.2 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| `component/ascend-common` | 统一 API 契约与客户端工具库：AscendJob CRD、clientset、informer、lister、公共常量与工具。 | [README](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-common/README.md)、[ascend-operator APIs](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-common/api/ascend-operator/README.md)、[ascendjob_types.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go)、[clientset](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-common/api/ascend-operator/client/clientset/versioned/clientset.go) |
| `component/ascend-device-plugin` | 设备故障采集、隔离控制、资源上报、Pod 容器能力注入。 | [main.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-device-plugin/main.go)、[pkg/server](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-device-plugin/pkg/server)、[pkg/device](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-device-plugin/pkg/device) |
| `component/ascend-docker-runtime` | 容器运行时集成（CLI、hook、install、runtime、destroy）与 NPU 运行时能力接入。 | [main.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-docker-runtime/main.go)、[runtime](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-docker-runtime/runtime)、[hook](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-docker-runtime/hook) |
| `component/ascend-operator` | AscendJob 控制器与调度治理，PodGroup 协同、状态维护。 | [main.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-operator/main.go)、[pkg/controllers/v1](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-operator/pkg/controllers/v1)、[pkg/api/v1](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-operator/pkg/api/v1) |
| `component/ascend-for-volcano` | Volcano 插件与调度策略实现：多级亲和性、重调度、资源预留、节点过滤/打分。 | [plugin](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-for-volcano/plugin)、[internal/npu/policy/multilevelscheduling](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-for-volcano/internal/npu/policy/multilevelscheduling)、[internal/rescheduling](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-for-volcano/internal/rescheduling) |
| `component/clusterd` | 集群级故障策略管理与恢复流程，人工隔离状态维护与事件上报入口。 | [main.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/clusterd/main.go)、[pkg/application](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/clusterd/pkg/application)、[pkg/domain](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/clusterd/pkg/domain) |
| `component/noded` | 节点链路与节点状态探测、故障上报。 | [main.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/noded/main.go)、[pkg/pingmesh](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/noded/pkg/pingmesh)、[pkg/monitoring](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/noded/pkg/monitoring) |
| `component/npu-exporter` | NPU 指标采集与 `Prometheus/Telegraf` 采集输出。 | [cmd/npu-exporter/main.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/npu-exporter/cmd/npu-exporter/main.go)、[collector/metrics](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/npu-exporter/collector/metrics)、[collector/common](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/npu-exporter/collector/common) |
| `component/taskd` | 任务恢复管理服务（agent/manager/worker）与任务级策略动作编排。 | [taskd/taskd/taskd.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/taskd/taskd/taskd.go)、[pkg/framework_backend](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/taskd/taskd/go/framework_backend)、[taskd/api](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/taskd/taskd/api) |
| `component/infer-operator` | 推理工作负载三层 CRD（InferServiceSet/InferService/InstanceSet）与控制器。 | [main.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/infer-operator/main.go)、[pkg/controller/v1](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/infer-operator/pkg/controller/v1)、[pkg/controller/workload](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/infer-operator/pkg/controller/workload) |
| `component/ascend-faultdiag` | 离线/在线统一故障日志解析、故障知识图谱诊断与清洗。 | [build](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-faultdiag/build)、[src/ascend_fd](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-faultdiag/src/ascend_fd)、[toolkit_src](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-faultdiag/toolkit_src) |
| `component/ascend-faultdiag-online` | 在线故障诊断与服务端决策链路。 | [app.go](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-faultdiag-online/app.go)、[pkg/algo_src](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-faultdiag-online/pkg/algo_src)、[pkg/core](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/ascend-faultdiag-online/pkg/core) |
| `component/mindio` | 持久化与通信修复组件（Python/C++）；用于进程级恢复链路辅助。 | [acp/README.md](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/mindio/acp/README.md)、[python_whl](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/mindio/python_whl)、[tft/src](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/component/mindio/tft/src) |
| `docs/` | 设计、RFC、故障、调度、指标 API 文档与运维建议。 | [docs/rfc](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/docs/rfc)、[docs/zh](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/docs/zh) |
| `.agents/.claude/.opencode` | 命令化工程化流程（MatSpec、技能、PR 模板）。 | [.agents](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/.agents)、[.claude](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/.claude)、[.opencode](C:/Users/kvenu/playground/MatrixSpec/benchmark/doc-quality/work/mind-cluster-source/.opencode) |

### 2.3 技术栈

| 层次 | 技术 | 用途 |
|------|------|------|
| 仓库/编排层 | Go、PowerShell/Bash 脚本、Makefile/构建脚本 | 构建、发布、版本与入口文档组织 |
| 控制面 | Go、Kubernetes client-go、controller-runtime、Volcano API、CRD | AscendJob/InferService 系列资源控制、故障策略驱动、调度事件交互 |
| 数据平面 | Go、CNI/容器运行时拓展、GPU/NPU 驱动接口（设备管理封装） | NPU 资源上报、容器挂载、故障采集、运行时 Hook |
| 诊断与恢复 | Go + Python + C/C++ | 故障日志解析、在线/离线诊断、恢复命令链路、进程回刷 |
| 监控与运维 | Go、Prometheus、Telegraf、日志模块 | 指标暴露、采集标签标准化、日志与告警 |
| 工程化与文档 | Markdown、RFC、MatSpec 命令、CI 配置 | 文档驱动交付、变更可追溯性、审核与贡献流程 |

## 3. 数据模型

### 3.1 实体与结构

| 实体 | 用途 | 重要字段 |
|------|------|------|
| `AscendJob`（CRD） | 训练作业描述与状态管理的核心对象。 | `metadata`、`spec.runPolicy`、`spec.successPolicy`、`spec.schedulerName`、`spec.replicaSpecs`、`status` |
| `AscendJobList` | 批量查询 AscendJob 列表。 | `items`、`metadata` |
| `InferServiceSet/InferService/InstanceSet`（推理CRD） | 推理服务拓扑编排（服务集-服务-实例集）。 | `replicas`、`roles`、`workload.kind`、`spec`、`services`、`status` |
| `Fault` / `PubFaultInfo` | 故障事件与公共故障数据传递。 | `faultId`、`faultCode`、`faultTime`、`faults`、`influence`（node/device） |
| 人工隔离 CM 数据 | 持久化人工隔离状态。 | `Total`、`Detail.<dev>.FaultCode`、`FaultLevel`、`LastSeparateTime`、`UpgradeFaultReason` |
| 故障计数缓存（内存） | 频率故障识别与升级判定。 | `node/dev/faultCode` 时间序列、滑动窗口参数、计数阈值 |
| `NodeBaseCollector` 节点基础信息 | 指标采集输出。 | `exporterVersion`、`driverVersion`、`timestamp` |
| `Device Info CM` | 设备隔离与资源状态共享。 | `ManuallySeparateNPU`、`UpgradeFaultReason`（含 `upgrade_time/fault_code/fault_level/upgrade_type`） |

### 3.2 持久化

1. 持久化对象主要是 Kubernetes 原生对象：CRD（AscendJob、Infer 系列）与 ConfigMap（设备/故障运行状态）；
2. 数据结构通过 JSON/YAML 存储在 CM 字段中，要求与历史字段兼容（如 `ManuallySeparateNPU` 老格式兼容补齐 `UpgradeFaultReason`）；
3. 索引策略依赖 K8s 原生机制（labels/selectors/namespaces）与控制器本地索引缓存（Informer）；
4. 兼容性策略：
   - 首次读取历史字段时进行补齐与兼容转换；
   - 新增字段通过新增 key 实现前向兼容，避免删除旧字段；
   - 升级需保持 `apiVersion`、CRD 名称、clientset 接口与 JSON 标签稳定；
   - Python/C++ 子系统变更需保持对外配置文件格式向后兼容并在 RFC 中声明。

## 4. 接口设计

### 4.1 对外接口

| 接口 | 调用方 | 输入 | 输出 |
|------|--------|------|------|
| AscendJob CRUD（`Create/Update/Get/List/Watch/Delete/Patch`） | ascend-operator、第三方控制器/运维工具 | `context`、`v1.AscendJob`、`metav1.Options` | `v1.AscendJob` / `v1.AscendJobList` |
| AscendJob Informer 接口 | 上层控制器（ascend-operator/fault flow） | `namespace`、`resync`、`indexers` | `SharedIndexInformer`、`Lister` |
| InferServiceSet/InferService/InstanceSet API | 推理编排用户、ascend-operator 关联链路 | YAML CR 实例（`roles/replicas/workload/services`） | K8s 资源生命周期与状态 |
| Device/故障 ConfigMap 接口 | `ascend-device-plugin`、`clusterd`、`taskd` | CM Name/Namespace + 状态实体 | 运行时隔离/恢复状态与事件 |
| NPU Exporter `/metrics` 与 Telegraf 输出 | Prometheus、Telegraf、运维平台 | 周期采集窗口 | 指标集合（含 `node_base_info` 等） |
| MatSpec 文档命令 | 开发者 | CLI 命令/子命令 | proposal/design/tasks/validation 文档 |

### 4.2 内部接口

- `ascend-device-plugin` → `clusterd`：故障上报、人工隔离触发（含频率型升级信息、释放窗口）。
- `clusterd` → `taskd`：故障策略上报、stop/recover 信号、重建策略变更（如 `retry`、`recover`、`migration`）。
- `ascend-operator` ↔ `ascend-for-volcano`：调度触发、节点选择结果、重调度策略协同。
- `ascend-operator` → `infer-operator`：通过 labels/annotations 与任务层编排联动（推理扩展场景）。
- `npu-exporter` → 监控系统：统一指标名与标签字典（Prometheus/Telegraf）。
- `noded` → `clusterd`：节点故障、链路状态输入，触发上层恢复。
- `ascend-faultdiag*` → `clusterd`/运维端：诊断摘要、根因输出、故障事件记录。

## 5. 核心流程设计

### 5.1 设计目标

根模块级核心流程围绕“变更闭环 + 故障闭环 + 发布交付”三条主线运行：

1. 文档驱动研发闭环  
   - 需求形成 RFC（`docs/rfc`）→ 设计文档与任务分解 → 实现与验证。  
   - 变更需在 `docs/zh` 与 API 文档中同步更新。

2. 故障-恢复链路闭环（device-plugin → clusterd → taskd → mindio → ascend-operator/volcano）  
   - 故障产生：`device-plugin` 写入 CM 并上报事件。  
   - 聚合与判断：`clusterd` 进行策略判断（频率/持续、软件故障识别、自动释放）。  
   - 命令下发：`taskd` 触发 stop/recover，`mindio` 执行训练进程恢复动作。  
   - 重建/替换：必要时创建备份 Pod 或执行迁移，返回状态并写审计痕迹。  
   - 异常分支：任务缺少上下文、CM 读取失败、策略冲突时，按保守策略暂停或降级策略，并输出事件与告警。

3. 组件构建与版本交付  
   - 根入口文档标注版本与兼容矩阵，构建脚本按组件产出 output。  
   - 发布过程必须记录对应组件/仓库版本；依赖 `ascend-common` 的组件需同步 `api` 与构建配置更新。  
   - 异常分支：构建脚本失败时回滚为上一个稳定 tag；故障组件不影响无关组件发布。

关键支撑流程包括：  
- AscendJob 生命周期控制（创建/缩扩/失败恢复/状态回传）  
- 推理工作负载三层编排（ISS/IS/IS）  
- 多级网络亲和性调度与重调度  
- 人工隔离自动释放与兼容回填  
- NPU 版本/运行时信息指标化采集

## 6. 算法设计

1. **故障频率升级算法（人工隔离）**  
   - 按设备+故障码维护时间序列窗口。  
   - 最近 `N` 次故障时间差小于配置窗口即判定升级。  
   - 可配置 `ReleaseTimeWindow`，用于频率升级后定时释放隔离；离线事件触发时更新隔离原因明细（`fault_code`/`upgrade_time`）。

2. **软件故障识别算法（任务级去噪）**  
   - 将任务上下文故障按时间排序；若同任务内同故障码在滑动窗口内跨设备并发触发，判定为可能软件故障，不计入硬件频率升级。  
   - 若非软件故障，仅对同设备故障进行计数并参与升级流程。  
   - 该算法在 `manual fault` 场景下抑制误隔离。

3. **多级网络亲和性调度算法（ascend-for-volcano）**  
   - 初始化校验层级连贯性与 NPU 整卡约束。  
   - 构建资源树与任务树，进行候选树遍历和碎片分数最小化策略。  
   - 两轮调度：优先无预留资源，再允许使用预留资源。  
   - 结果返回固定分组策略下的节点映射，并缓存到作业对象以实现幂等绑定。

4. **推理工作负载编排算法（infer-operator）**  
   - `InstanceSet` 层级按 CRD 模版递归创建 `Deployment/StatefulSet` 与 `Service`。  
   - 支持 Gang 调度语义（PodGroup）映射和标签链路管理，保持一致性扩缩与状态收敛。  
   - 异常分支：部分工作负载创建失败时，按 Controller 循环回滚/重试并保持上层对象可观察状态。

5. **指标采集与缓存算法（npu-exporter）**  
   - 采集阶段写入本地缓存，输出阶段从缓存读取并统一打标签，降低实时查询抖动。  
   - 节点基础信息指标使用固定值 1，标签承载版本语义（exporterVersion/driverVersion）。

## 7. 缓存设计

1. **是否使用缓存：是（按组件分层）**
   - ascend-common/控制器层：client-go informer 本地缓存（watch/index/lister）用于状态监听与一致性。
   - clusterd/manual-fault：内存缓存 `Cache` 与 ConfigMap 同步，减少频繁 K8s 读写；单轮更新设备信息保持“读一次 CM，写一次 CM”。
   - npu-exporter：`LocalCache` 存储采集快照，统一用于 Prometheus 与 Telegraf 更新。
2. **失效策略**
   - informer: 周期重同步（resync）+ watch 事件；
   - manual fault 缓存：定时扫描释放窗口并清理历史记录；
   - 指标缓存：按采集周期更新，输出使用最新时间戳。
3. **一致性**
   - 所有关键状态以 K8s 对象（CRD/CM）为最终一致源；本地缓存仅为加速层，不持久化最终真相。
4. **降级行为**
   - 缓存缺失或类型异常时，降级为直接返回空数据/跳过该次上报并记录 debug 日志，避免级联失败；
   - 对关键故障决策，若缓存与 CM 不一致优先回源 K8s 状态并重建缓存。
5. **不适用场景**
   - 对长期历史分析不在根模块内落库，统一交由外部日志分析系统处理；根模块不内置时序数据库。

## 8. 异常处理设计

1. **异常分类**
   - 配置类：字段缺失、非法阈值（如窗口/阈值越界）→ 回退默认值或拒绝变更并记录错误。
   - 资源类：K8s API 调用失败、CM 读写失败、Informer 暂失效 → 重试 + 降级到保守策略。
   - 运行时类：设备故障上报格式异常、指标采集失败 → 记录诊断日志，输出最小可观测告警。
   - 协议兼容类：旧 CM/旧 RFC 字段变化 → 填充兼容映射，避免直接清除旧字段。
2. **用户可见错误**
   - 告警与事件以 K8s Event 暴露关键状态变更（如自动隔离升级/释放、故障无法恢复等）。
3. **重试与补偿**
   - 控制器及 gRPC/HTTP 流程应具备幂等重试；  
   - 人工隔离释放与升级均采用时间窗口+状态刷新策略避免重复执行。
4. **告警策略**
   - 高频事件需做限流：特别是释放/降级相关事件，避免短时间内日志与事件风暴；
   - 故障诊断链路输出到告警面板时区分“故障已发生”与“恢复动作已下发”两个阶段。
5. **异常示例与处理**
   - 老版 CM 缺失 `UpgradeFaultReason`：自动补齐；
   - 任务级故障时间窗口重叠导致抖动：延迟决策并复用滑动窗口，避免误隔离；
   - 指标采集驱动调用失败：标签置空但指标仍上报，确保监控面可持续工作。

## 9. 监控与日志

1. **关键指标**
   - NPU Exporter：节点基础信息、容器/NPU 资源指标、健康与错误计数类指标；新增 `node_base_info` 暴露 `exporterVersion`、`driverVersion`（标签）和固定指标值。
   - 调度与故障：升降级次数、隔离设备数量、恢复成功率、重调度耗时、任务替换次数。
2. **日志字段**
   - 建议统一记录：时间戳、组件名、trace/request context、对象名（job/pod/node）、fault_code、策略版本、关键参数（窗口/阈值）；
   - 故障链路日志要保留“故障来源模块→决策模块→执行模块→结果”四段。
3. **审计要求**
   - 重要状态变更（隔离、释放、重建、策略切换）必须可追踪到 K8s Event + 日志；
   - 文档层面应同步版本说明与兼容范围。
4. **排障入口**
   - `docs/zh/scheduling/api` 提供指标/API 说明；  
   - `docs/zh/faultdiag` 与 RFC 提供诊断/恢复策略说明；  
   - 复杂链路可使用时序图文档（进程级快恢、亚健康热切、网络故障）定位调用顺序。

## 10. 安全设计

1. **认证与授权**
   - 控制面组件按最小权限请求 RBAC（CRD、ConfigMap、Pod/Deployment、PodGroup）；
   - 运维控制与集群访问采用 ServiceAccount，并建议结合 Namespace 隔离。
2. **数据保护**
   - 敏感运行时信息（节点、故障、任务映射）以最小字段化记录，避免在日志中输出原始凭据类内容；
   - 采用只读挂载与权限最小化实践（如挂载目录权限分离）。
3. **输入校验**
   - 所有来自 CRD/CM/配置文件/用户输入的参数做边界校验（窗口、阈值、层级编号、资源声明、路径）。
4. **依赖安全**
   - 容器镜像与 Python 组件依赖保持版本钉定与兼容审查；
   - 第三方执行链路（容器运行时、DCMI、gRPC 接口）应限制命令注入风险和越权调用入口；
   - 对外公开文档中明确安全声明，要求使用者按环境加强（特权容器、网络策略、明文 token 风险）。

## 11. 部署与运维实现说明（补充）

根模块默认输出是仓库级交付文档，因此本节用于聚合各组件部署要点与落地步骤：

- 构建：`build/build_all.sh` 与组件级 build 脚本按版本输出到 `output`；
- 兼容性：`README.md` 明确主流 k8s/volcano/docker 兼容矩阵，变更需同步更新；
- 安全基线：仓库文档中的安全声明链路需要与实际部署模板保持一致；
- 变更策略：核心变更优先落到 RFC，再落地到设计、测试、验证与发布说明。