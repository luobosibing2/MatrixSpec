# mind-cluster-source 实现设计

## 1. 设计概述

### 1.1 设计目标

mind-cluster-source 是面向昇腾 NPU 训练与推理集群的系统软件工程，目标是在 Kubernetes/Volcano 生态上提供资源发现、NPU 调度、作业控制、故障诊断、故障恢复、在线诊断、训练容错、Checkpoint 加速和公共 API/工具能力。项目级设计需要满足以下技术目标：

1. 建立从节点侧设备发现到集群级故障恢复的闭环：Ascend Device Plugin 上报设备与故障，Clusterd 聚合故障并编排恢复，Taskd 与 Mindio TFT 控制训练进程停训、重建通信与恢复训练。
2. 支持 Volcano 调度扩展：Ascend For Volcano 插件在 Volcano session 生命周期中完成 NPU 作业校验、节点过滤、节点打分、设备分配、软切分、多级网络亲和和故障重调度。
3. 支持离线与在线故障诊断：Ascend Faultdiag 基于日志清洗和知识图谱/root cluster 诊断输出根因；Ascend Faultdiag Online 基于在线指标、CSV 拨测数据和公共故障接口输出网络故障结果。
4. 提供统一公共契约：Ascend Common 维护 AscendJob API、公共常量、公共故障结构、SuperPod/DPU/慢网结构、Kubernetes client/informer/lister、日志与限流工具、DCMI/HCCN 设备管理封装。
5. 支持训练运行期管理：Taskd 以 Python API + Go c-shared 后端连接训练框架、ClusterD、MindIO Controller、Agent、Worker 和任务内网络。
6. 支持 Checkpoint 加速和训练容错：Mindio ACP 提供 MemFS + 后台异步落盘的 Checkpoint 保存/加载能力；Mindio TFT 提供 Controller/Processor/Adaptor 训练容错框架。
7. 保持可构建、可部署、可验证：Go 组件通过各自 `build.sh` 和 `test.sh` 构建验证，Faultdiag 通过 Python wheel 构建，Taskd/Mindio 通过 wheel 和共享库交付。

### 1.2 设计约束

1. 项目采用多组件同仓结构，根构建脚本 `build/build_all.sh` 会将 `component/*` 复制到 `$GOPATH`，说明 Go 组件存在 GOPATH 同级组件布局约束。
2. Go 版本以根 README 为准要求 Go 1.21；部分模块如 `ascend-faultdiag-online/go.mod` 声明 Go 1.20，构建时需验证模块与根构建环境兼容。
3. Ascend Faultdiag 要求 Python 版本 `>=3.7`，README 声明依赖 `scikit-learn`、`pandas`、`numpy`、`joblib`、`ply`；源码 `setup_utils.py` 中确认安装依赖至少包含 `ply>=3.11`。
4. Clusterd 启动依赖 Kubernetes、Volcano、Ascend Operator 客户端初始化成功；Volcano 不存在时启动失败。
5. Ascend Device Plugin 以 Kubernetes Device Plugin gRPC 协议接入 kubelet，部署需要 privileged DaemonSet、hostPath 和读取/更新 pods、nodes、configmaps、events 的 RBAC 权限。
6. Ascend For Volcano 强依赖 Volcano scheduler 内部包路径，构建脚本会把插件源码放入 Volcano 源码树并 patch scheduler 代码；`.so` 插件名必须与 scheduler 配置一致。
7. Taskd Python 层必须能加载同版本 `libtaskd.so`；`cython_api.py` 拒绝加载符号链接形式的共享库。
8. Mindio ACP 的 MemFS 加速依赖 `ockiod` daemon；daemon 不存在时部分 API 降级到 fopen 或 `torch.save/load`，`preload` 等能力会失败。
9. 在线网络故障检测依赖 `RAS_NET_ROOT_PATH/cluster`、`super-pod-N`、`cathelper.conf`、拓扑 JSON、CSV 拨测结果；滑窗未填满前不会输出告警。
10. 生成代码如 AscendJob deepcopy/defaults 文件标记 `DO NOT EDIT`，CRD 类型或默认值变更需走代码生成流程。

## 2. 系统架构

### 2.1 架构概述

mind-cluster-source 的运行时可划分为节点侧、调度侧、集群控制侧、训练进程侧、诊断侧和公共基础层。

节点侧由 Ascend Device Plugin 负责发现 NPU、向 kubelet 注册资源、向 Kubernetes Node/ConfigMap 写入设备、故障、DPU、交换机和软切分信息。Ascend Docker Runtime、Container Manager、NodeD、NPU Exporter 等组件虽不在本次模块列表中完整展开，但 README 和目录证据显示它们与设备挂载、节点监控和指标采集共同构成节点基础设施。

调度侧由 Volcano Scheduler 加载 Ascend For Volcano 插件。插件在 Volcano session 中注册 `JobValid`、`Predicate`、`BatchNodeOrder`、`JobReady`、`Enqueueable`、`TaskOrder`、`Allocate`、`Deallocate` 等回调，并基于 Device Plugin/Clusterd 写入的设备信息、Node 标签、ConfigMap、PodGroup annotation 完成 NPU 调度。

集群控制侧由 Clusterd 聚合 Device、Node、Switch、DPU、PublicFault、Pod、PodGroup、AscendJob/Volcano Job 等信息，通过 gRPC 暴露 Recover、PubFault、Profiling、Config、Fault、Job 服务，并将作业级故障推送给 Taskd、Fault 服务和恢复状态机。

训练进程侧由 Taskd 和 Mindio TFT 组成。Taskd Manager 订阅 Clusterd 的恢复、profiling、网卡切换、压力检测等信号，通过插件和业务流调度，将消息分发给 Taskd Agent、Worker 或 MindIO Controller。Mindio TFT Controller/Processor/Adaptor 负责训练状态机、进程级快恢、热切、重调度、UCE/ARF 等动作。Mindio ACP 负责 Checkpoint 保存/加载加速。

诊断侧包含离线 Ascend Faultdiag 和在线 Ascend Faultdiag Online。离线诊断通过 CLI/SDK 清洗日志，执行 root cluster、knowledge graph、node anomaly、network congestion 等诊断。在线诊断通过服务 API 控制 NetFault controller，读取在线 CSV 拨测结果，输出 MetricPool 指标并通过 PubFault gRPC 上报公共故障。

公共基础层由 Ascend Common 提供公共 API、AscendJob CRD client、公共常量、日志、限流、文件/IP 工具、devmanager/DCMI/HCCN 设备访问封装，是 Device Plugin、Clusterd、Volcano 插件、NPU Exporter、Ascend Operator 等组件的共享依赖。

关键源码锚点：

| 锚点 | 重要性 |
|------|--------|
| `build/build_all.sh` `cp -rf "$TOP_DIR"/component/* ${GOPATH}/` | 确认多组件 GOPATH 同级构建布局 |
| `component/ascend-device-plugin/main.go::main` | Device Plugin 节点侧启动主入口 |
| `component/ascend-device-plugin/pkg/server/plugin.go::ListAndWatch` / `Allocate` | kubelet Device Plugin 对外协议核心 |
| `component/clusterd/main.go::main` | Clusterd 控制面启动主流程 |
| `component/clusterd/pkg/interface/grpc/grpc_init.go::ClusterInfoMgrServer.Start` | Clusterd gRPC 服务注册入口 |
| `component/ascend-for-volcano/npu.go::OnSessionOpen` | Volcano 插件调度回调注册入口 |
| `component/taskd/taskd/go/backend_api.go` exported C ABI | Python 与 Go Taskd 后端桥接边界 |
| `component/mindio/acp/src/util/ockio_daemon.cpp::main` | Mindio ACP daemon 入口 |
| `component/ascend-faultdiag/src/ascend_fd/cli.py::command_line` | Faultdiag CLI 用户入口 |
| `component/ascend-faultdiag-online/pkg/algo_src/netfault/export_interface.go::Execute` | 在线 NetFault 算法框架入口 |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go::AscendJob` | AscendJob CRD 公共数据模型 |

### 2.2 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| Ascend Device Plugin | 节点侧 NPU 发现、kubelet 资源注册、ListAndWatch、Allocate、设备健康、device-info ConfigMap、软切分挂载、A5 拓扑、DPU/交换机故障、重复挂载检测 | `component/ascend-device-plugin/main.go`；`pkg/server/manager.go`；`pkg/server/plugin.go`；`pkg/device/ascend910.go`；`pkg/kubeclient/client_server.go` |
| Ascend For Volcano | Volcano NPU 调度插件，完成作业校验、节点过滤、节点打分、设备分配/释放、软切分、多级网络亲和、NSLB/TOR、故障重调度 | `component/ascend-for-volcano/npu.go`；`plugin/type.go`；`plugin/factory.go`；`internal/controller.go`；`internal/npu/factory.go`；`internal/rescheduling/*` |
| Clusterd | 集群级故障聚合、ConfigMap 处理器链、作业故障、恢复控制、人工隔离、RankTable、作业摘要、公共故障、Profiling、PingMesh 和 gRPC 服务 | `component/clusterd/main.go`；`pkg/application/faultmanager/fault_process_center.go`；`pkg/application/recover/fault_recover_service.go`；`pkg/application/manualfault/cm.go`；`pkg/interface/grpc/grpc_init.go` |
| Taskd | 训练任务运行期管理，提供 Python API、Go c-shared 后端、Manager 插件流、Agent、Worker、Proxy、任务内网络、ClusterD 与 MindIO Controller 桥接 | `component/taskd/taskd/api/*.py`；`taskd/go/backend_api.go`；`framework_backend/manager/manager.go`；`application/businessStream.go`；`toolkit_backend/net/network.go` |
| Mindio | ACP 提供 Checkpoint MemFS 加速与异步落盘；TFT 提供训练容错 Controller/Processor/Adaptor 框架 | `component/mindio/acp/python_whl/mindio_acp/mindio_acp/__init__.py`；`acc_io/write_handler.py`；`src/memfs/memfs_api.h`；`src/util/ockio_daemon.cpp`；`tft/src/csrc/framework/controller/controller.h` |
| Ascend Faultdiag | 离线日志清洗、root cluster 诊断、knowledge graph 诊断、单次诊断、SDK、custom entity/config、toolkit 巡检和报告 | `component/ascend-faultdiag/src/ascend_fd/cli.py`；`controller/controller.py`；`controller/job_worker.py`；`pkg/parse/knowledge_graph/kg_parse_job.py`；`pkg/diag/root_cluster/rc_diag_job.py`；`pkg/diag/knowledge_graph/kg_diag_job.py` |
| Ascend Faultdiag Online | 在线慢节点和网络故障检测；NetFault controller 读取拓扑/配置/CSV，执行滑窗与动态阈值分析，写指标并上报公共故障 | `component/ascend-faultdiag-online/app.go`；`pkg/register/func_map.go`；`pkg/service/serviceapi/netfaultapi/netfault_api.go`；`pkg/algo_src/netfault/controller/net_fault_controller.go`；`pkg/algo_src/netfault/algo/fault_analyze.go` |
| Ascend Common | 公共常量、AscendJob CRD 类型与 client/informer/lister、公共故障结构、SuperPod/DPU/慢网结构、日志/限流/工具、devmanager/DCMI/HCCN | `component/ascend-common/api/consts.go`；`api/publicfault.go`；`api/ascend-operator/apis/batch/v1/*.go`；`common-utils/hwlog/*`；`devmanager/*` |

### 2.3 技术栈

| 层次 | 技术 | 用途 |
|------|------|------|
| 容器编排 | Kubernetes | Node、Pod、ConfigMap、Event、CRD、Informer、Device Plugin、DaemonSet、Deployment |
| 调度框架 | Volcano Scheduler | PodGroup、gang 调度、scheduler plugin session hooks、NPU 调度扩展 |
| 控制面通信 | gRPC | Clusterd Recover/PubFault/Profiling/Config/Fault/Job 服务，Taskd 内部网络 |
| 后端语言 | Go | Clusterd、Taskd 后端、Ascend Device Plugin、Ascend For Volcano、Ascend Common、Faultdiag Online |
| 诊断语言 | Python | Ascend Faultdiag CLI/SDK/toolkit、Mindio ACP Python API、Taskd Python API |
| 系统语言 | C/C++ | Mindio ACP MemFS/daemon/SDK，Mindio TFT Controller/Processor，Taskd Go c-shared ABI |
| 设备访问 | Ascend DCMI/HCCN/devmanager | NPU 设备发现、驱动版本、网络信息、故障与拓扑信息 |
| 构建 | shell、go build、python setup.py、CMake | 组件构建、wheel 构建、Volcano 插件构建、MemFS/TFT 构建 |
| 可观测性 | hwlog、Prometheus/Telegraf、JSON/ConfigMap/Event | 运行日志、指标、公共故障、诊断报告、事件记录 |
| 数据交换 | ConfigMap、Pod annotation/label、Node annotation/label、JSON、CSV | 跨组件设备/故障/拓扑/诊断/调度状态传递 |

## 3. 数据模型

### 3.1 实体与结构

| 实体 | 用途 | 重要字段 |
|------|------|----------|
| `AscendJob` | Ascend Operator 公共 CRD 类型 | `Spec`、`Status`、`RunPolicy`、`SuccessPolicy`、`SchedulerName`、`ReplicaSpecs` |
| `AscendJobSpec` | 分布式作业期望状态 | `RunPolicy`、`SuccessPolicy`、`SchedulerName`、`ReplicaSpecs map[ReplicaType]*ReplicaSpec` |
| `common.NodeDeviceInfoCache` | Device Plugin 写入 device-info CM 的节点设备缓存 | `DeviceInfo`、`SuperPodID`、`ServerIndex`、`RackID`、`CheckCode` |
| `common.NpuDevice` | 单个 NPU 设备状态 | `DeviceName`、`Health`、`NetworkHealth`、`DpuHealth`、`LogicID`、`PhyID`、`UsedAicoreQuota`、`UsedHbmQuota` |
| `common.DeviceFault` | Device Plugin 对外故障结构 | `FaultType`、`NPUName`、`FaultLevel`、`FaultHandling`、`FaultCode` |
| `api.PubFaultInfo` | 公共故障输入结构 | `Id`、`TimeStamp`、`Version`、`Resource`、`Faults` |
| `api.Fault` | 公共故障项 | `FaultId`、`FaultType`、`FaultCode`、`FaultTime`、`FaultLocation`、`Influence`、`Description` |
| `constant.JobFaultInfo` | Clusterd 作业级故障视图 | 作业 ID、故障 Rank、故障节点/设备、过滤级别 |
| `manualfault.FaultCounter` | 人工隔离频率计数 | `faults map[node]map[dev]devFault` |
| `manualfault.JobFaultManager` | 任务级软件故障识别 | job 维度故障列表、滑动窗口、故障码、节点、设备 |
| `conf.ManuallySeparatePolicy` | Clusterd 人工隔离配置 | `enabled`、`fault_window_hours`、`fault_threshold`、`fault_free_hours` |
| `SchedulerJob` | Volcano 插件内部作业模型 | 调度属性、policy handler、SuperPods、未调度原因、owner、A5 字段 |
| `NPUNode` / `CommonNode` / `VNode` / `VChip` | Volcano 插件节点与虚拟设备资源视图 | capacity、allocate、idle、annotation、label、SuperPodID、RackID、vNPU quota |
| `ResourceTree` / `TaskTree` | 多级网络亲和调度模型 | `Levels`、`ResourceNode`、`TaskNode`、`ReservedNode`、`FragmentScore` |
| `Taskd Manager Config` | Taskd Manager 初始化配置 | `job_id`、`node_nums`、`proc_per_node`、`plugin_dir`、`fault_recover`、`cluster_infos` |
| `Taskd SnapShot` | Taskd Manager 运行时状态快照 | `AgentInfos`、`WorkerInfos`、`ClusterInfos`、`MgrInfos`、`WorkerNum` |
| `MessageInfo` / `MsgBody` | Taskd Python/Go 消息结构 | `uuid`、`biz_type`、`dst`、`body`、`msg_type`、`code`、`extension` |
| `RCDiagResult` | Faultdiag root cluster 诊断结果 | `analyze_success`、`fault_description`、`root_cause_device`、`detect_workers_devices`、`fault_filter_time` |
| `KGParseFilePath` | Faultdiag KG 清洗路径汇总 | plog、device、npu_info、train、host、MindIE、BMC、LCNE、bus、custom log 路径 |
| `ClusterResult` | Faultdiag Online NetFault 结果 | `taskId`、`timestamp`、loss/delay 统计、`srcId`、`dstId`、`level`、`faultType` |
| `NetDetect` | 在线网络故障算法对象 | 当前超节点、NPU 类型、周期、抑制周期、滑窗、历史告警、拓扑输入 |
| `MindIO record map` | ACP 文件格式索引 | record map 起始位置、大小、`mindio\0` 文件尾标记、pickle key 到 `(start,size)` 映射 |

重要源码锚点：

| 锚点 | 重要性 |
|------|--------|
| `component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go::AscendJobSpec` | CRD 作业期望状态字段 |
| `component/ascend-common/api/publicfault.go::PubFaultInfo` | 公共故障跨组件数据契约 |
| `component/ascend-device-plugin/pkg/common/proto.go::NodeDeviceInfoCache` | device-info CM 节点设备缓存结构 |
| `component/clusterd/pkg/domain/conf/config.go::ManuallySeparatePolicy` | 人工隔离配置结构 |
| `component/ascend-for-volcano/common/util/type_multilevel.go::ResourceTree` / `TaskTree` | 多级调度核心模型 |
| `component/taskd/taskd/go/framework_backend/manager/infrastructure/storage/datapool.go::SnapShot` | Taskd Manager 内部状态模型 |
| `component/ascend-faultdiag/src/ascend_fd/model/diag_info.py::RCDiagResult` | root cluster 诊断输出 |
| `component/ascend-faultdiag-online/pkg/model/netfault/netfault.go::ClusterResult` | 在线网络故障结果模型 |
| `component/mindio/acp/python_whl/mindio_acp/mindio_acp/acc_io/read_handler.py` | MindIO 文件尾和 record map 读取逻辑 |

### 3.2 持久化

mind-cluster-source 以 Kubernetes 对象、ConfigMap、Node/Pod annotation、日志文件、JSON 报告、CSV 输入和 wheel/二进制产物为主要持久化形态。

1. Kubernetes ConfigMap：
   - Ascend Device Plugin 写入 `device-info-<nodeName>`，包含 `DeviceInfo`、`ManuallySeparateNPU`、`UpgradeFaultReason`、`SwitchInfo`、`DpuInfo` 等字段。
   - Clusterd 使用 `clusterd-config-cm` 存储 `manually_separate_policy.conf`，使用人工隔离 ConfigMap 保存节点隔离状态。
   - Volcano 插件通过 ConfigMap 缓存调度输出、重调度状态、TOR 共享状态等。
   - Faultdiag Online 使用网络检测目录而非 ConfigMap 作为 NetFault 的主要文件输入，但结果会写入指标池和公共故障中心。
2. Kubernetes annotation/label：
   - Device Plugin 更新 Node 标签与注解，如 `accelerator-type`、`baseDeviceInfos`、SuperPod、Rack、ServerIndex。
   - Volcano 插件读取 PodGroup/Pod annotation，如 `huawei.com/schedule_policy`、`huawei.com/affinity-config`、NPU 分配 annotation。
   - Clusterd、Ascend Operator、Taskd 恢复链路通过 Pod 标签/annotation 触发创建备份 Pod、删除故障 Pod、热切和恢复。
3. 文件持久化：
   - Faultdiag parse 输出 parser/analyzer JSON，diag 输出 `fault_diag_result/diag_report.json`。
   - Faultdiag Online NetFault 写 `network_fault.json`，读取 CSV 拨测结果和 `super-pod-N.json` 拓扑文件。
   - Mindio ACP MemFS 文件异步落盘到底层文件系统，MindIO 格式在文件尾保存 record map 与 `mindio\0` 标记。
   - Clusterd、Device Plugin、Taskd、Mindio、Faultdiag 均有运行日志文件。
4. 构建产物：
   - Go 组件输出二进制、Dockerfile、部署 YAML、故障策略 JSON。
   - Taskd 输出 Python wheel 和 `libtaskd.so`。
   - Mindio ACP 输出 `mindio_acp-*.whl`、`ockiod`、`libbdm.so`、`_c2python_api.so`。
   - Faultdiag 输出 `ascend_faultdiag*.whl`、`alan_faultdiag*.whl`、`ascend_faultdiag_toolkit*.whl`。

兼容性策略：

- Device Plugin 的 `ManuallySeparateNPU` 字段保持原格式，新增 `UpgradeFaultReason` 存储隔离原因；老版本 CM 可被新逻辑自动补齐原因。
- Faultdiag root cluster 诊断优先读取 `rc-parser.json`，不存在时兼容旧版本 plog parser 输出。
- Ascend Common 的 CRD 生成代码不可手工修改，确保 Kubernetes runtime scheme、deepcopy、defaulting 与类型定义一致。
- Volcano 插件产物 `.so` 与 `vc-scheduler` 必须来自同一次构建，避免插件 ABI、插件名和 patch 逻辑不一致。
- Taskd wheel 内 Python 代码与 `libtaskd.so` 必须同版本，避免 C ABI 不匹配。

## 4. 接口设计

### 4.1 对外接口

| 接口 | 调用方 | 输入 | 输出 |
|------|--------|------|------|
| Kubernetes Device Plugin gRPC | kubelet | `RegisterRequest`、`ListAndWatch` stream、`AllocateRequest` | 设备列表、健康状态、容器设备挂载、环境变量、Mounts |
| Kubernetes API / ConfigMap | Device Plugin、Clusterd、Volcano 插件、Ascend Operator | Node、Pod、ConfigMap、Event、PodGroup、AscendJob | 设备状态、故障状态、调度状态、恢复状态 |
| Clusterd Recover gRPC | Taskd Manager、恢复客户端 | stop train、recover strategy、recover status、process fault、hot switch 等信号 | 恢复策略协商、停止完成、恢复状态上报 |
| Clusterd PubFault gRPC | Faultdiag Online、外部公共故障上报方 | `api.PubFaultInfo` / `PublicFaultRequest` | 公共故障采集与处理结果 |
| Clusterd Config gRPC | 业务客户端、taskd 等 | jobId 注册、RankTable 订阅请求 | RankTable stream |
| Clusterd Fault gRPC | FD、业务客户端 | 作业/集群故障注册、查询、订阅 | 作业故障、故障 Rank、集群故障 |
| Clusterd Job gRPC | 白名单客户端 | client role、clientId、订阅请求 | 作业摘要 stream |
| Volcano plugin callbacks | Volcano scheduler | session、job、task、node、allocate/deallocate event | valid/predicate/order/ready/enqueue/annotation 更新 |
| Taskd Python API | 训练框架或集成代码 | manager/agent/worker/proxy 配置、回调函数 | Manager/Agent/Worker/Proxy 初始化与启动 |
| Taskd Go C ABI | Taskd Python 层 | JSON config、网络消息、callback、rank 参数 | `libtaskd.so` 函数返回码、消息收发结果 |
| Mindio ACP Python API | 训练框架、Megatron/MindSpore/PyTorch 用户 | `save/load/preload/flush/register_checker/convert` 参数 | Checkpoint 读写结果、对象、返回码 |
| Mindio TFT Controller API | Taskd Manager、Mindio Processor | stop、change strategy、global rank、recover status、process fault | 训练状态机动作与回调上报 |
| Ascend Faultdiag CLI | 运维用户 | `parse`、`diag`、`single-diag`、`entity`、`blacklist`、`config` 参数 | parser/analyzer JSON、`diag_report.json`、表格输出 |
| Ascend Faultdiag SDK | 外部系统 | 结构化日志、KG analyzer、CCAE fault、root cluster 输入 | 清洗结果、诊断结果、错误列表 |
| Faultdiag Online NetFault API | 在线服务调用方 | `/netfault/controller/start|stop|reload` 控制请求 | controller 生命周期结果、MetricPool 指标、公共故障上报 |
| AscendJob client/informer/lister | Ascend Operator 或外部控制器 | `rest.Config`、AscendJob CRD 对象、ListOptions | CRUD、Watch、Informer cache、Lister 查询 |

### 4.2 内部接口

内部接口按模块边界划分：

1. Device Plugin 内部：
   - `HwDevManager` 调用产品形态 `device.DevManager` 获取设备、健康、虚拟设备、故障、拓扑。
   - `PluginServer.Notify` 触发 `ListAndWatch` 更新 kubelet 设备视图。
   - `kubeclient.ClientK8s` 封装 Node/Pod/ConfigMap/Event 读写。
   - `duplicatedetector.Manager` 通过 Docker/containerd client 更新容器设备挂载缓存。

2. Clusterd 内部：
   - `faultProcessCenter` 按 Switch、Device、Node、DPU、Job 顺序处理故障。
   - `baseFaultCenter[T]` 从 cmManager 更新原始 CM，顺序执行 processorList，并通知订阅者。
   - Device 处理器链包含公共故障、自定义故障、UCE 伴随故障、Retry、原地恢复、压测过滤、预隔离、增量故障、人工隔离。
   - `FaultJobCenter` 将 CM 级故障转为作业级故障，并按过滤级别通知 Recover/Fault 服务。
   - `FaultRecoverService` 订阅作业故障并驱动 EventController 状态机。

3. Volcano 插件内部：
   - `ScheduleHandler` 聚合 Volcano frame、ClusterCache、CheckResult、FaultHandle。
   - `internal.Controller` 聚合 NPU policy 和 NSLB policy，统一执行 valid/predicate/score/use/release。
   - `internal/npu/factory.go` 根据资源名、label、selector、annotation 和 schedule policy 选择具体 handler。
   - `ReScheduler` 读取故障状态，影响节点过滤、打分、设备选择，并将重调度缓存写入输出缓存。

4. Taskd 内部：
   - Python API 通过 `ctypes` 调用 Go c-shared 导出函数。
   - Go Manager 由 `MsgHandler`、`DataPool`、`BusinessStreamProcessor`、`PluginHandler`、`StreamHandler` 组成。
   - 插件通过 `Predicate` 申请 stream token，通过 `Handle` 生成消息，通过 `PullMsg` 分发给 Agent、Worker、Controller 或 Manager。
   - 任务内网络 `NetInstance` 基于 manager/proxy/agent/worker 层级路由消息。

5. Mindio 内部：
   - ACP Python 写链为 `MemFsWriteHandler -> FWriteHandler -> TorchWriteHandler`。
   - ACP Python 读链为 `MemFsReadHandler -> NdsReadHandler -> FReadHandler -> TorchReadHandler`。
   - C++ daemon 初始化 MemFS server、UnderFS、BackgroundManager，文件 close/new/preload 回调触发后台备份。
   - TFT Controller 与 Processor 通过心跳和动作消息协同训练状态。

6. Faultdiag 内部：
   - CLI 进入 router，router 分发到 ParseController、DiagController、SingleDiagController 或 customize job。
   - ParseController 通过 SaverFactory 收集日志路径，通过 `generate_parse_job` 生成 root cluster 和 knowledge graph 清洗任务。
   - DiagController 必须先执行 root cluster 诊断，再执行 knowledge graph、node anomaly、network congestion。
   - KG 引擎通过 schema、package data 构图，根据 rule/expression 建立事件边并推断 root device。

7. Faultdiag Online 内部：
   - API 层通过 handler 下发 start/stop/reload/register 命令。
   - externalbridge 使用全局互斥锁串行化控制命令。
   - controller 扫描 `RAS_NET_ROOT_PATH/cluster` 下的 `super-pod-N` 和 `super-pod-roce`。
   - policy 解析拓扑与配置生成 ping list。
   - algo 维护滑窗、动态阈值、历史告警抑制和根因告警结果。

## 5. 核心流程设计

### 5.1 集群启动与资源上报流程

1. Ascend Device Plugin DaemonSet 在 NPU 节点启动，`main.go::main` 解析参数、初始化日志、校验参数、写入 `common.ParamOption`。
2. `devicefactory.InitFunction` 加载设备名定制配置，初始化 devmanager 和 switch manager。
3. `server.NewHwDevManager` 根据硬件型号选择 Ascend310/310P/910 管理器，发现设备，初始化 `PluginServer`，更新 Node 标签和注解。
4. `HwDevManager.ListenDevice` 启动故障订阅、设备轮询、ConfigMap 加载、kubelet server 注册和周期性健康刷新。
5. `PluginServer.Start` 创建 Unix socket，注册 kubelet Device Plugin gRPC 服务，并向 kubelet registration API 注册资源名。
6. kubelet 调用 `ListAndWatch` 后，Device Plugin 初次推送设备列表；设备健康变化时通过 channel 再次推送。
7. `WriteDeviceInfoDataIntoCM` 将设备、手工隔离、升级原因、交换机、DPU 信息写入 device-info ConfigMap。
8. Volcano 插件、Clusterd、NPU Exporter 等消费者通过 Node/ConfigMap 获取设备状态。

关键异常路径：

- socket 创建或 kubelet 注册失败时，`PluginServer` 记录错误并依赖重试/重新注册策略。
- 参数组合非法时 Device Plugin 启动退出。
- RBAC 不足时 ConfigMap/Node/Event 更新失败，调度和故障恢复链路会缺少输入。

### 5.2 Volcano NPU 调度流程

1. Volcano scheduler 加载 Ascend For Volcano 插件，`New(arguments)` 创建插件实例。
2. 每个 session 开始时调用 `OnSessionOpen`。
3. `InitNPUSession` 初始化 Volcano frame、ConfigMap informer、节点、作业、TOR、策略、缓存、重调度处理器。
4. 插件注册 job valid、predicate、batch node order、job ready、enqueueable、task order、allocate/deallocate 回调。
5. 作业校验阶段，`internal.Controller.ValidNPUJob` 调用具体 policy 验证 NPU 数量、软切分请求、多级亲和、SuperPod、RA64SP 等约束。
6. 节点过滤阶段，`ScheduleHandler.NodePredicate` 先执行故障过滤，再执行 NPU policy/NSLB policy 的 `CheckNodeNPUByTask`。
7. 节点打分阶段，`BatchNodeOrderFn` 调用 `ScoreBestNPUNodes`，并由故障重调度处理器修正分数。
8. 分配阶段，`NPUAllocateFunc` 调用 `UseAnnotation` 选择设备并更新节点 annotation。
9. 释放阶段，`NPUDeallocateFunc` 调用 `ReleaseAnnotation` 恢复资源视图。
10. session close 时写入不可调度原因、调度缓存和重调度缓存。

关键异常路径：

- 插件名与 `.so` 或 scheduler 配置不一致时插件不会按预期加载。
- device-info 或 Node annotation 不完整时，节点可能在 predicate 阶段被过滤。
- 多级调度层级编号不连续或任务数不能整除时，作业校验失败。
- Volcano 构建 patch 不完整时，节点打分或 predicate 签名可能与预期不一致。

### 5.3 Clusterd 故障聚合与恢复流程

1. Clusterd 启动时初始化日志、K8s/Volcano/Ascend Operator client、全局配置、人工隔离缓存、gRPC 服务、FD 在线控制、故障处理中心、Informer、统计模块。
2. Informer 回调采集 Device、Node、Switch、DPU、PublicFault ConfigMap，Pod/PodGroup，AscendJob/Volcano Job，Node 等对象变更。
3. `faultProcessCenter.Work` 每秒执行全量处理，也可按通知处理指定故障类型。
4. `Process` 顺序执行 Switch、Device、Node、DPU、Job 故障中心。
5. Device center 按公共故障、自定义故障、UCE 伴随故障、Retry、原地恢复、压测过滤、预隔离、增量故障、人工隔离顺序处理。
6. `FaultJobCenter` 将处理后的设备、节点、交换机故障聚合成作业级故障。
7. Recover 服务、Fault 服务等订阅者收到作业故障后进入恢复或查询流程。
8. `FaultRecoverService` 根据故障健康状态、Retry 支持、故障节点、热切状态选择 stop train、pre-exit、fault occur、hot switch 等事件。
9. Taskd Manager 订阅 Clusterd Recover gRPC 信号，并把停止、策略、故障 Rank、恢复状态在训练进程侧执行。

关键异常路径：

- Volcano client 初始化失败会阻断 Clusterd 启动。
- gRPC 监听依赖合法 `POD_IP`；`-useProxy` 时监听 `127.0.0.1`。
- root gRPC 限流、连接限制或订阅数限制会导致高频客户端请求失败。
- 人工隔离初始化必须在故障处理中心前完成，否则故障处理器无法正确使用已有隔离状态。

### 5.4 人工隔离流程

1. Clusterd 从 `clusterd-config-cm` 加载 `manually_separate_policy.conf`。
2. `manualfault.InitFaultCmInfo` 初始化人工隔离缓存。
3. `manualfault.LoadManualCmInfo` 从人工隔离 ConfigMap 加载已有隔离状态。
4. `ProcessManuSep` 每 15 秒同步缓存与 ConfigMap，处理手动删除、自动释放和状态写回。
5. 设备故障进入人工隔离处理器后，若无 jobId，直接进入 `FaultCounter`。
6. 若有 jobId，先进入 `JobFaultManager` 识别软件故障：同一任务滑动窗口内不同设备出现相同故障时，不计入频率计数。
7. 非软件故障进入 `FaultCounter`，按 `fault_window_hours` 和 `fault_threshold` 判断是否达到阈值。
8. 达到阈值后清理该设备故障计数，并写入人工隔离缓存。
9. 配置禁用人工隔离时，重置 JobFaultManager、Counter 和 FaultCmInfo。

关键异常路径：

- 配置超出范围会被 `ManuallySeparatePolicy.Check` 拒绝。
- 用户手动删除 CM 中隔离设备后，缓存会在同步周期中删除对应设备。
- Device Plugin 的 `ManuallySeparateNPU` 与 `UpgradeFaultReason` 需要保持兼容，老 CM 可自动补齐原因。

### 5.5 Taskd 训练运行期控制流程

1. 用户或训练框架调用 `init_taskd_manager(config)`，Python Manager 处理配置并调用 `libtaskd.so::InitTaskdManager`。
2. Go `BaseManager` 初始化日志、MsgHandler、BusinessStreamProcessor、ClusterD 注册和 profiling 配置监听。
3. `StartTaskdManager` 启动 Manager 主循环，默认按 100ms 周期读取 DataPool 快照并执行插件业务流。
4. Agent 初始化时根据 PyTorch/MindSpore 框架创建网络配置、启动 proxy 或连接本地 proxy，并向 Manager 注册。
5. Worker 初始化时根据 rank 环境变量启动 Go `InitWorker`，随后 `StartMonitorClient` 启动 profiling、OM、压力检测和消息接收。
6. Clusterd 下发恢复信号后，Manager 插件通过 stream token 机制处理消息，生成发往 Agent、Worker、Manager 或 MindIO Controller 的消息。
7. 发往 MindIO Controller 的消息通过 Python callback 调用 `mindio_ttp.controller_ttp`。
8. MindIO Controller 回调如 `report_process_fault`、`report_stop_complete`、`report_recover_strategy`、`report_recover_status` 通过 Go `SendMessageToBackend` 上报 Clusterd。
9. Taskd 内部网络根据 Manager/Proxy/Agent/Worker 分层路由，支持注册、路径发现、同步/异步发送和上游重建。

关键异常路径：

- `libtaskd.so` 缺失、为符号链接或 ABI 与 Python 不匹配时，API 初始化失败。
- Taskd 网络上游连接失败时会重试并重建，重建期间消息可能失败。
- `MsgQueue` 满或接收 buffer busy 会导致消息入队失败。
- Controller 依赖 `WORLD_SIZE`/`MS_WORKER_NUM`、`POD_IP`、`TTP_PORT`，缺失时初始化失败。

### 5.6 Mindio ACP Checkpoint 加速流程

1. Python 调用 `mindio_acp.initialize` 或在 `save/load/preload/open_file/create_file` 中触发默认初始化。
2. `torch_initialize_helper` 合并 server_info 与默认配置，设置 `server.ockiod.path` 和 `server.worker.path`。
3. Python C bridge 调用 C++ SDK 初始化 MemFS client。
4. `ockio_daemon.cpp::main` 初始化日志、配置、MemFS server、UnderFS、BackgroundManager，并等待信号。
5. `save` 通过 serialization 将对象拆为 pickle 元数据、tensor storage、record map。
6. 写链默认先尝试 MemFS，失败后降级到 fopen，再降级到 `torch.save`。
7. daemon 侧文件 close/new/preload 回调触发后台备份，将 MemFS 文件异步上传到后端文件系统。
8. `load` 读链默认先尝试 MemFS，再尝试 NDS、fopen、`torch.load`；MindIO 格式通过文件尾 `mindio\0` 和 record map 读取。
9. `flush` 等待后台任务结束，`register_checker` 可用于异步检查 checkpoint 文件数并写 tracker。

关键异常路径：

- `ockiod` 不存在时，`save` 可能降级，`preload` 失败，`flush` 直接视为无需等待或返回失败。
- `load` 只支持 `map_location=None` 或 `cpu`。
- pickle 反序列化只应加载可信数据。
- `register_checker.timeout_sec` 必须在 `[1,3600]`。

### 5.7 离线 Faultdiag 清洗与诊断流程

1. 用户执行 `ascend-fd parse|diag|single-diag`。
2. `cli.py::command_line` 解析参数，`router.py::router` 分发到对应 Controller。
3. ParseController 校验至少一个输入路径，非 single-diag 场景要求输出目录为空。
4. ParseController 根据参数或目录遍历生成 Saver，调用 `generate_parse_job`。
5. parse 默认执行 root cluster 与 knowledge graph 清洗，`--performance` 时增加 node anomaly 和 network congestion。
6. DiagController 创建 `DiagCFG` 和 `ParsedDataSaver`，输出进入 `fault_diag_result` 子目录。
7. train 场景先执行 root cluster 诊断，产出 `detect_workers_devices` 和 `fault_filter_time`。
8. 然后并发执行 `generate_diag_job` 返回的 KG、node anomaly、network congestion 等诊断任务。
9. 推理场景先执行 MindIE 诊断，再按推理实例组循环执行训练侧诊断逻辑。
10. 结果通过 `PrintWrapper` 表格输出，并由 `JsonWrapper` 写入 JSON。

关键异常路径：

- 输入路径全部为空、输出目录非空、KG 清洗输入为空会抛参数或路径错误。
- root cluster 无法确定待检测 worker/device 或故障描述为空时，diag 终止。
- node anomaly 和 network congestion 的延迟 import 失败会转换为 `InnerError`。

### 5.8 在线 NetFault 检测流程

1. `StartFDOnline` 创建 `FaultDiagContext`，`register.Setup` 注册函数 handler 和 API 路由。
2. `ControllerStartFunc` 获取 NetFault handler，先注册结果 callback，再下发 start 命令。
3. `externalbridge.Execute` 使用全局互斥锁串行化 start/stop/reload/register 命令。
4. controller 校验 `RAS_NET_ROOT_PATH + "/cluster"`，启动扫描协程。
5. 扫描识别 `super-pod-N` 和 `super-pod-roce` 目录。
6. `detectionCurSuperPod` 等待 `cathelper.conf` 与拓扑 JSON，解析配置与拓扑，生成 ping list。
7. `loopCsvCallDetection` 周期读取 CSV，过滤早于检测启动时间的记录，调用 `StartFaultDetect`。
8. `StartFaultDetect` 更新告警 TTL、格式化输入、更新滑窗、计算动态阈值、生成根因告警。
9. controller 写 `network_fault.json` 并异步调用 callback。
10. `netfaultResultCallBack` 解析 `[]ClusterResult`，写 MetricPool，并通过 PubFault gRPC 上报 Clusterd。

关键异常路径：

- `RAS_NET_ROOT_PATH` 未设置导致 clusterPath 为 `/cluster`，controller 退出。
- 超节点目录、配置或拓扑 JSON 未就绪时检测协程等待或退出。
- CSV 文件为空、过大、header 错误或 timestamp 解析失败会跳过或失败。
- 滑窗未达到 `saveLenNum` 个周期时不输出告警。

## 6. 算法设计

项目中的核心算法和决策逻辑集中在故障聚合、人工隔离、调度、在线网络故障、Faultdiag KG 诊断和 ACP 序列化。

1. Clusterd 人工隔离软件故障识别：
   - `JobFaultManager` 以同一任务内故障时间序列为输入。
   - 若滑动窗口内不同设备出现相同故障码，则判定为软件故障，不进入设备频率计数。
   - 非软件故障进入 `FaultCounter`，按最近 N 次故障是否落在 `fault_window_hours` 内判断是否人工隔离。
   - 来源锚点：`component/clusterd/pkg/domain/manualfault/job_fault_mgr.go::JobFaultManager.AddFault`、`firstItemIsSfwFault`；`counter.go::FaultCounter.AddFault`、`dealFrequencyFault`。

2. Volcano 多级网络亲和调度：
   - 集群侧 `resource-level-config` 定义资源树层级，节点标签映射实际网络域。
   - 作业侧 `huawei.com/affinity-config` 定义任务树层级和每层分组大小。
   - 调度时构建资源树和任务树，遍历资源树选择碎片得分最低的方案。
   - 第一次遍历不使用预留资源，必要时第二次允许使用预留资源。
   - 故障重调度通过定位故障子树并保持原有层级关系重新分配故障任务。
   - 来源锚点：`component/ascend-for-volcano/internal/npu/policy/multilevelscheduling/frame.go::ValidNPUJob`、`ScoreBestNPUNodes`；`common/util/type_multilevel.go::GetTaskTreeLevels`；RFC `features-multilevel-scheduling-npu-affinity.md`。

3. Volcano 软切分调度：
   - 节点过滤要求存在完全空闲物理芯片，或存在与任务共享策略一致且 NPU/片上内存占比之和不超过 100% 的芯片。
   - 打分优先级为刚好满足需求、策略一致且剩余空间更小、节点已有软切分芯片、完全空闲节点。
   - Device Plugin 侧按芯片数量 × 100 上报资源，挂载软切共享目录。
   - 来源锚点：RFC `支持NPU软切分.md`；`component/ascend-device-plugin/pkg/server/plugin.go::addSoftShareDev`、`mountShareDeviceConfig`；`component/ascend-for-volcano/internal/npu/vnpu/*`。

4. Faultdiag knowledge graph 诊断：
   - 清洗阶段将日志事件解析为 package data。
   - 诊断阶段按 root cluster 输出的 root worker/device 限定分析范围。
   - `GraphBuilder` 根据 schema 和 rule/expression 构建事件顶点和边，推断设备，合并相同故障码的事件属性、故障源和故障链。
   - 来源锚点：`component/ascend-faultdiag/src/ascend_fd/pkg/diag/knowledge_graph/kg_diag_job.py::start_kg_diag_job`；`kg_engine/graph/graph_builder.py::GraphBuilder`。

5. Faultdiag root cluster 诊断：
   - 根据 plog/MindIE 清洗结果识别通信域、rank、device、训练状态、断点续训时间、lagging 时间。
   - root cluster 诊断先于 KG 诊断，输出待检测 worker/device 和故障过滤时间。
   - 来源锚点：`component/ascend-faultdiag/src/ascend_fd/pkg/diag/root_cluster/rc_diag_job.py::RCDiagWorker`；`DiagController.start_train_task`。

6. Faultdiag Online NetFault 算法：
   - 维护按路径聚合的滑动窗口。
   - 滑窗填满前只积累数据。
   - 对同一路径历史值计算均值和标准差动态阈值，识别丢包、延迟、断连异常。
   - 维护历史告警 TTL，按 suppressedPeriod 抑制重复告警。
   - 来源锚点：`component/ascend-faultdiag-online/pkg/algo_src/netfault/algo/fault_analyze.go::StartFaultDetect`；`window_sliding.go::updateCurSlideWindows`、`calDynamicThresholds`。

7. Mindio ACP 序列化与异步落盘：
   - 写侧将对象拆为 `data.pkl` 与 tensor storage，非 CPU storage 可通过 `torch_npu` 非阻塞拷贝到 CPU。
   - 文件尾保存 record map start、record map size 和 `mindio\0` 标记。
   - 后台备份通过 MemFS 文件操作通知追踪新文件和 close 事件，异步上传到底层文件系统。
   - 来源锚点：`component/mindio/acp/python_whl/mindio_acp/mindio_acp/acc_io/serialization.py`；`read_handler.py`；`src/background/backup/backup_target.h`。

## 7. 缓存设计

1. Kubernetes informer cache：
   - Clusterd 使用 informer 监听 Device/Node/Switch/DPU/PublicFault ConfigMap、Pod、PodGroup、AscendJob/Volcano Job、Node。
   - Ascend Common AscendJob client 提供 SharedInformerFactory、JobInformer 和 JobLister。
   - Volcano 插件在 session 初始化时基于 informer 和 session 构建 `ClusterCache`。
   - 一致性策略：informer 本地缓存用于降低 API Server 压力，关键写入仍通过 Kubernetes client 更新对象或 ConfigMap。

2. Device Plugin 内存缓存：
   - `HwDevManager` 缓存 `allInfo`、`baseNPUInfo`、`groupDevice`、`ServerMap`。
   - `PluginServer` 缓存 `cachedDevices`、`klt2RealDevMap`、设备同步状态。
   - `UpgradeFaultReason`、人工隔离设备、故障码策略有独立缓存。
   - 失效策略：周期性 `ListAndWatchPeriod` 刷新设备信息；设备状态变化或发送失败触发重新通知 kubelet；ConfigMap 每轮读写保持跨进程状态。

3. Clusterd 故障缓存：
   - `cmManager` 保存各类 ConfigMap 原始与处理后状态，并通过 `IsChanged` 判断是否通知订阅者。
   - `manualfault.FaultCounter` 保存滑动窗口故障次数，过期故障按窗口清理。
   - `manualfault.FaultCmInfo` 保存人工隔离状态，并周期性同步到 CM。
   - `FaultRecoverService` 保存 `eventCtl`、`currentFaults`、`newPodInfos` 等恢复状态。

4. Volcano 插件调度缓存：
   - `ScheduleHandler.ClusterCache` 保存 Jobs、Nodes、Tors、SuperPodInfo。
   - `CheckResult` 保存 job valid、enqueue、batch order、node predicate 错误，session close 写入 PodGroup condition。
   - `OutputCache` 保存调度状态与重调度状态，session close 写回 ConfigMap。
   - 一致性边界：Volcano session 是调度批次内缓存边界，session close 负责持久化必要状态。

5. Taskd 缓存：
   - Go `DataPool` 保存 `SnapShot`，包含 Agent、Worker、Cluster、Manager 状态。
   - `MsgQueue` 最大长度 40000，作为进程内消息缓冲。
   - Stream token 保存插件执行权，业务流完成后释放或 reset。
   - 网络层维护路由表、上下游 endpoint、接收 buffer，异常时重建。

6. Mindio ACP 缓存：
   - MemFS 将 checkpoint 文件先写入内存文件系统。
   - `BackupFileTracer` 追踪 fd 到路径/inode 的引用关系。
   - `BackupTarget.MakeFileCache` 可构建后端文件缓存。
   - `flush` 用于等待后台任务完成，避免缓存未落盘。
   - 降级策略：MemFS 不可用时读写链降级到 NDS/fopen/torch。

7. Faultdiag 缓存：
   - parse 结果落盘为 JSON，diag 通过 `ParsedDataSaver` 读取。
   - `DiagCFG.root_worker_devices` 和 `fault_filter_time` 由 root cluster 诊断更新，后续 KG 使用。
   - 注意：模块文档指出 `DiagCFG.root_worker_devices` 和 `fault_filter_time` 源码中为类属性形式，存在多实例/并发共享状态风险，需要在改动时特别验证。

8. Faultdiag Online 缓存：
   - `NetDetect` 保存滑动窗口、待消费队列、历史告警、路径索引、拓扑输入。
   - 告警按 `suppressedPeriod` TTL 清理。
   - controller 维护检测对象状态，stop/reload 时清理 ping list 或重置结果文件。

9. NPU Exporter 相关公共缓存：
   - RFC `features-NPUExporter新增node_base_info指标.md` 显示 NodeBaseCollector 使用 `LocalCache` 缓存 exporterVersion、driverVersion 和 timestamp，再上报 Prometheus/Telegraf。
   - 该行为依赖 Ascend Common devmanager 的 `GetDcmiVersion()`。

## 8. 异常处理设计

1. 参数与输入错误：
   - Device Plugin 在 `main.go::checkParam` 阶段校验运行模式、软切分目录、shareDevCount、reset timeout 等参数，非法即退出。
   - Faultdiag ParseController 在输入路径全部为空、输出目录非空时抛 `ParamError` 或 `PathError`。
   - Faultdiag Online externalbridge 只接受 start/stop/reload/register，register 必须提供 callback。
   - Taskd Worker API 校验 rank、磁盘上限为非负整数，Controller 校验必要环境变量。

2. Kubernetes API 错误：
   - Device Plugin 写 Node/ConfigMap/Event 失败会记录日志，依赖下一轮刷新或重试。
   - Clusterd gRPC 与 informer 初始化失败会阻断启动或导致对应功能不可用。
   - Volcano 插件 session close 会把不可调度原因写入 PodGroup condition，便于调试。

3. gRPC 与网络错误：
   - Clusterd gRPC 使用 QPS limiter、连接数限制、keepalive、最大消息和最大并发流配置；超限返回失败。
   - Taskd 网络接收 buffer 写入有超时，繁忙返回 `RecvBufBusy`；上游连接失败会循环重试并触发 `rebuildNet`。
   - PubFault 上报失败时 NetFault API 记录 gRPC client 或返回码异常。

4. 故障处理异常：
   - Clusterd `faultProcessCenter` 支持定时全量和按类型通知处理，避免单次通知丢失导致永久不处理。
   - Device fault 处理器链顺序固定，人工隔离在链路尾部执行，确保公共故障、自定义故障、Retry、预隔离等先完成。
   - root cluster 诊断失败会阻断 Faultdiag KG 诊断，避免在缺少 root device 边界时输出误导性根因。

5. 诊断异常：
   - Faultdiag KG 引擎捕获推理异常并返回 `Response(analyze_success=False)`。
   - `generate_parse_job` 和 `generate_diag_job` 中 performance 子任务延迟 import 失败会转换为 `InnerError`。
   - Faultdiag Online CSV 超大小、空文件、timestamp 无法解析、header 错误会导致记录被跳过或检测失败。

6. 降级与补偿：
   - Mindio ACP 写链降级顺序为 MemFS -> fopen -> torch.save，读链为 MemFS -> NDS -> fopen -> torch.load。
   - Device Plugin 旧 CM 缺失 `UpgradeFaultReason` 时可自动补齐。
   - Clusterd 人工隔离支持手动删除同步和自动释放。
   - Taskd 上游网络异常时尝试重建网络，恢复后继续注册和收发。

7. 用户可见错误与运维入口：
   - Device Plugin：`devicePlugin.log`、kubelet device plugin socket、Node resource、device-info CM。
   - Clusterd：`clusterd.log`、gRPC 返回码、PodGroup/ConfigMap、人工隔离 CM。
   - Volcano 插件：scheduler 日志、PodGroup condition、重调度 ConfigMap。
   - Taskd：Python API 返回值、manager/agent/worker 日志、ClusterD recover gRPC 状态。
   - Faultdiag：CLI stdout、run log、`diag_report.json`、parser JSON。
   - Faultdiag Online：controller 日志、`network_fault.json`、MetricPool、PubFault 上报结果。
   - Mindio：`ockiod` 日志、API 返回码、checkpoint 文件格式、flush 状态。

## 9. 监控与日志

项目的监控与日志设计分为运行日志、诊断报告、Prometheus/Telegraf 指标、Kubernetes Event、ConfigMap 状态和调试命令入口。

1. 运行日志：
   - Device Plugin 默认日志路径为 `/var/log/mindx-dl/devicePlugin/devicePlugin.log`，日志模块在 `main.go::initLogModule` 初始化。
   - Clusterd 默认日志路径为 `/var/log/mindx-dl/clusterd/clusterd.log`。
   - Taskd 通过 Go `CreateTaskdLog` 创建 manager/agent/worker/proxy 日志。
   - Mindio ACP daemon 产生 `ockiod` 相关日志。
   - Faultdiag CLI 输出 task ID 和 run log 路径，诊断结果写 JSON 和表格。
   - Ascend Common `common-utils/hwlog` 提供统一日志 API、滚动日志和日志限流能力。

2. 指标：
   - NPU Exporter 指标体系通过 Ascend Common devmanager 获取设备和驱动信息；RFC 确认新增 `node_base_info` 暴露 exporterVersion 和 driverVersion。
   - Faultdiag Online NetFault 将 `ClusterResult` 写入在线诊断 MetricPool 的 NetworkDomain。
   - Clusterd statistics、resource、schedulingexception 模块启动作业统计、资源上报和调度异常检查。

3. 公共故障与事件：
   - Faultdiag Online 将网络故障结果通过 PubFault gRPC 上报 Clusterd。
   - Device Plugin 对人工隔离自动释放等事件需写 Kubernetes Event，并通过限流避免事件风暴。
   - Clusterd 处理 PublicFault ConfigMap 与 PubFault gRPC 输入，将公共故障进入设备故障处理链。

4. 审计和排障字段：
   - device-info CM：`DeviceInfo`、`ManuallySeparateNPU`、`UpgradeFaultReason`、`SwitchInfo`、`DpuInfo`。
   - Clusterd 人工隔离 CM：节点名、`Total`、`Detail`、`FaultCode`、`FaultLevel`、`LastSeparateTime`。
   - Faultdiag diag report：`analyze_success`、`fault`、`fault_source`、`fault_chains`、`note_msgs`、`failed_jobs`。
   - NetFault result：`taskId`、`timestamp`、loss/delay、`srcId`、`dstId`、`faultType`、`level`。
   - Taskd messages：`uuid`、`biz_type`、`dst`、`msg_type`、`code`、`extension`。

5. Runbook：构建
   - 全仓构建：在 `build/` 执行 `./build_all.sh $GOPATH`，脚本复制 `component/*` 到 GOPATH，并准备 Volcano 源码。
   - 单组件构建：`build/build_each.sh GOPATH config servicename`，普通组件进入对应 `build` 目录执行 `build.sh`，Volcano 插件进入 Volcano scheduler plugin 目录构建。
   - Device Plugin：`component/ascend-device-plugin/build/build.sh`，输出二进制、Dockerfile、部署 YAML、故障配置。
   - Clusterd：`component/clusterd/build/build.sh`，输出二进制、Dockerfile、`clusterd.yaml`、`fdConfig.yaml`。
   - Faultdiag：`component/ascend-faultdiag/build/build.sh`，训练模型、生成表达式 parser、构建中英文 faultdiag wheel 和 toolkit wheel。
   - Taskd：`component/taskd/build/build.sh`，先构建 `libtaskd.so`，再构建 Python wheel。
   - Mindio ACP：`component/mindio/acp/build/build.sh -t release`，输出 wheel、`ockiod` 和 C++ 库。
   - Ascend For Volcano：Volcano v1.7/v1.9 执行插件 `build.sh v1.7.0|v1.9.0`，1.10+ 使用 `build_1.10plus.sh`。

6. Runbook：验证
   - Device Plugin：`component/ascend-device-plugin/build/test.sh` 执行 `go test -race`，覆盖率要求不低于 80%。
   - Clusterd：`component/clusterd/build/test.sh` 执行 `go test ... pkg/...`，覆盖率要求不低于 80%。
   - Ascend For Volcano：`component/ascend-for-volcano/build/testBuild.sh` 在 Volcano 源码树内执行 race + coverage。
   - Taskd：`component/taskd/tests/ut/run_test.sh`，分 Go UT、Python UT、ST framework。
   - Mindio ACP：`scripts/run_python_ut.sh` 和 `scripts/run_gtest_ut.sh`。
   - Faultdiag：`component/ascend-faultdiag/test/run_dt.sh`，并通过 `ascend-fd version/parse/diag/single-diag` 验证 CLI。
   - Faultdiag Online：建议执行 `go test ./pkg/algo_src/netfault/...`、`go test ./pkg/service/serviceapi/netfaultapi`。

7. Runbook：部署
   - Device Plugin：使用 `build/ascendplugin-*.yaml` DaemonSet，要求 privileged、hostPath `/var/lib/kubelet/device-plugins`、日志目录、NPU 设备和 RBAC。
   - Clusterd：使用 `build/clusterd.yaml`，包含 `clusterd-config-cm`、ServiceAccount、ClusterRole、Deployment 等资源。
   - Ascend For Volcano：部署配套 `vc-scheduler`、`volcano-npu_<version>.so` 和 scheduler 配置，确保插件名一致。
   - Taskd：随训练任务 Python 环境以 wheel 交付，运行时通过 `taskd.api` 初始化 Manager/Agent/Worker/Proxy。
   - Mindio ACP/TFT：以 wheel 安装，ACP 需要 `ockiod` daemon，TFT 需要 NPU 固件驱动与 CANN 环境。
   - Faultdiag：安装构建出的 wheel 后使用 `ascend-fd` CLI；toolkit 安装独立 wheel。
   - Faultdiag Online：需准备服务部署、API 路由和 `RAS_NET_ROOT_PATH/cluster` 数据目录；当前证据未看到独立部署 YAML。

8. Runbook：回滚
   - Device Plugin：回退 DaemonSet 镜像或旧版 YAML，确认 kubelet socket 重建和资源重新注册；必要时检查 device-info CM。
   - Clusterd：回退镜像和 `clusterd-<version>.yaml`；人工隔离 CM 是运行期状态，代码回滚不会自动清空。
   - Ascend For Volcano：回退 `vc-scheduler` 与配套 `.so`，同时回退 scheduler 配置和 init-params。
   - Taskd：回退 wheel，确保 Python 代码与 `libtaskd.so` 同版本，并重启承载训练任务的进程。
   - Mindio ACP/TFT：回退 wheel，重启或停止旧 `ockiod`，验证最小 save/load/flush 或训练恢复链路。
   - Faultdiag：卸载当前 wheel，安装上一版本 wheel；自定义实体和配置可通过 CLI 删除或恢复。
   - Faultdiag Online：调用 stop/reload 控制检测，回退服务镜像和配置；清理 `network_fault.json` 与 ping list 需按 controller 行为执行。

9. 调试指南
   - Device Plugin：资源不上报时检查 `pkg/server/server.go::register`、`pkg/server/plugin.go::ListAndWatch`、`/var/lib/kubelet/device-plugins`、`device-info-<node>` CM。
   - Clusterd：故障未恢复时检查 `fault_process_center.go::Process`、`cmprocess/device_fault_center.go`、`jobprocess/fault_job_center.go`、`recover/fault_recover_service.go`。
   - Volcano 插件：作业 Pending 时检查 scheduler 日志中的 `OnSessionOpen`、PodGroup condition、`plugin/node.go::NodePredicate`、具体 policy 的 `CheckNodeNPUByTask`。
   - Taskd：API 初始化失败检查 `taskd/python/cython_api/cython_api.py::load_lib_taskd`；恢复信号未执行检查 `businessStream.go`、`PluginHandler`、ClusterD gRPC 连接。
   - Mindio ACP：save 降级检查 `acc_io/write_handler.py::MemFsWriteHandler` 和 `ockiod` 进程；load 失败检查文件尾 `mindio\0` 和 record map。
   - Faultdiag：parse 无日志检查 SaverCollector 和 `ParseController._deep_find_input_path`；diag 无根因检查 root cluster 输出和 `kg_engine/graph_builder.py`。
   - Faultdiag Online：start 无检测检查 `RAS_NET_ROOT_PATH`、`super-pod-N`、`cathelper.conf`、CSV header/timestamp、滑窗是否填满。
   - Ascend Common：AscendJob client 404 检查 `constants.go::GroupName`、`register.go::SchemeGroupVersion`、CRD 安装；devmanager 返回空检查 DCMI/HCCN 环境。

## 10. 安全设计

1. 认证与授权：
   - Kubernetes 组件主要依赖 ServiceAccount 和 RBAC。README 明确当前容器部署使用 ServiceAccount token，建议用户自行安全加强。
   - Device Plugin 部署 YAML 授权 pods、nodes、nodes/status、configmaps、events；Clusterd YAML 授权 pods、services、configmaps、nodes、nodes/status 等。
   - Clusterd gRPC 使用 QPS limiter 和连接限制，Recover 探测接口使用独立限流器。
   - Job gRPC 服务只允许白名单角色注册，如 `CCAgent`、`DefaultUser1`、`DefaultUser2`、`FdAgent`。

2. 容器安全：
   - Device Plugin DaemonSet 使用 privileged 容器，存在权限风险，需要生产环境按安全加固文档收敛能力。
   - Device Plugin Dockerfile 创建非登录用户 `HwHiAiUser`，设置二进制和配置只读权限，并设置 `umask 027`。
   - Clusterd Dockerfile 使用 `hwMindX` 非登录用户运行，并设置策略文件权限。
   - Mindio/Taskd wheel 运行在训练容器内，需避免旧进程加载旧共享库后热替换文件导致 ABI 不一致。

3. 文件与路径安全：
   - Device Plugin 软切配置目录要求绝对路径并校验真实目录。
   - Faultdiag 使用安全文件操作和参数校验，parse 输出目录非空时拒绝覆盖。
   - Faultdiag Online 写 `network_fault.json` 前拒绝软链接，CSV 和配置读取受 `ReadLimitBytes` 和文件数量限制。
   - Taskd `cython_api.py` 拒绝加载符号链接形式的 `libtaskd.so`。
   - Ascend Docker Runtime 安装脚本使用路径检查、日志权限和 `umask 027`。

4. 数据保护：
   - Mindio ACP `load` 使用 pickle，文档明确只应加载可信数据，避免 unpickle 攻击。
   - Mindio ACP client 初始化结构包含 TLS 证书、CRL、CA、私钥、密码路径等安全参数。
   - Toolkit `conn.ini` 示例包含 host/bmc/switch 的用户名、密码、私钥配置，生产使用需避免明文泄露和弱权限。
   - PublicFault、device-info CM、人工隔离 CM 包含节点 SN、设备 ID、故障码等运维敏感信息，应限制 RBAC 访问。

5. 输入校验：
   - AscendJob client 和 CRD 默认值逻辑通过 scheme/defaulting 保证基础字段一致。
   - Faultdiag SDK 使用 SchemaValidator 校验 server、log_items、device_id、log_lines 等结构。
   - Clusterd Fault 查询校验 jobId 长度和中文字符。
   - NetFault controller 限制 super-pod ID 范围、文件数量、文件大小、控制命令集合。

6. 依赖安全：
   - Go 构建脚本多处启用 race 测试和覆盖率门禁。
   - Device Plugin、Taskd 等构建启用 PIE、CGO 安全编译/链接参数或 cgo 安全 flags。
   - 预提交配置包含 trailing whitespace、end-of-file、yaml/json、detect-private-key、ruff、codespell 等检查。
   - Volcano 插件构建会 patch 上游 Volcano 源码，必须把 patch 行为纳入版本配套验证，避免与高版本 Volcano 内部 API 不兼容。

7. 确定性边界：
   - 已由源码和文档确认：模块职责、主要入口、构建脚本、Device Plugin gRPC、Clusterd gRPC 服务清单、Faultdiag parse/diag 顺序、Taskd Python+Go 架构、Mindio ACP MemFS 读写链、Ascend Common AscendJob API。
   - 基于结构推断：Taskd 更偏随训练任务 wheel 分发而非独立 Deployment；Mindio ACP 后台落盘完整链路由 MemFS 回调、BackupFileTracer、BackupTarget、BaseFileService 组合完成；Device Plugin 是 Clusterd/Volcano/Operator 的上游设备状态源。
   - 缺失证据：未完整展开 Ascend Operator、NPU Exporter、NodeD、Container Manager、Ascend Docker Runtime 的白盒模块设计；未看到 Faultdiag Online 独立部署 YAML；未看到所有 protobuf 原始定义；未逐行展开所有故障处理器和所有 parser 正则。