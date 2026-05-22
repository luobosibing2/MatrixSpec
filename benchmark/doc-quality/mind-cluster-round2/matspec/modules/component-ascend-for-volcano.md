# Ascend For Volcano 模块设计文档

## 1. 模块定位

`component/ascend-for-volcano` 是 MindCluster 集群调度链路中面向 Volcano Scheduler 的 Ascend NPU 调度插件源码模块。该模块以 Volcano 插件形式接入调度框架，围绕 NPU 资源校验、节点过滤、节点打分、设备分配、故障重调度、NSLB/TOR 亲和、vNPU 软切分、多级网络亲和调度等能力扩展 Volcano 的调度行为。

已确认事实：

| 事实 | 依据 |
|---|---|
| 模块是 Volcano scheduler 插件，插件入口名由 `PluginName` 表示，默认值为 `volcano-npu_v6.0.0`，构建时通过 `-ldflags -X` 改写 | `component/ascend-for-volcano/type.go::PluginName`；`component/ascend-for-volcano/build/build.sh::build` |
| 插件在 `OnSessionOpen` 注册 Volcano session 钩子，包括 job 校验、predicate、batch node order、job ready、enqueueable、task order、allocate/deallocate 事件处理 | `component/ascend-for-volcano/npu.go::OnSessionOpen` |
| 调度处理器 `ScheduleHandler` 是插件运行期核心对象，持有作业、节点、TOR、SuperPod、故障处理器、策略构建器等缓存 | `component/ascend-for-volcano/plugin/type.go::ScheduleHandler` |
| NPU 策略由 `internal.Controller` 聚合 NPU 策略与 NSLB 策略，并按统一接口调用 | `component/ascend-for-volcano/internal/controller.go::Controller` |
| NPU 策略工厂根据资源名、annotation、selector、label 选择 Ascend310/310P/910/A3/A5/软切分/多级调度处理器 | `component/ascend-for-volcano/internal/npu/factory.go::InitPolicyHandler` |
| 重调度由 `internal/rescheduling` 独立处理，并作为 `FaultHandle` 挂入 `ScheduleHandler` | `component/ascend-for-volcano/npu.go::HandlerStart`；`component/ascend-for-volcano/internal/rescheduling/type.go::ReScheduler` |

推断边界：

| 类型 | 内容 |
|---|---|
| 代码事实 | 插件直接依赖 Volcano scheduler 内部 API，构建脚本会把源码放入 `volcano.sh/volcano/pkg/scheduler/plugins/ascend-volcano-plugin` 路径编译。 |
| 合理推断 | 运行时该模块与 Volcano scheduler 同进程加载，主要产物是 `vc-scheduler` 与 `volcano-npu_<version>.so`。 |
| 缺失证据 | 当前材料未包含完整部署 YAML、镜像制作脚本输出目录内容和真实集群运行日志，因此部署细节只按构建脚本、README 和代码接口描述。 |

## 2. 目录结构与职责

| 路径 | 职责 |
|---|---|
| `build/` | 构建与测试脚本。`build.sh` 面向 Volcano v1.7/v1.9，`build_1.10plus.sh` 面向 1.10+，`testBuild.sh` 执行 LLT。 |
| `common/k8s/` | Kubernetes ConfigMap 访问、缓存、informer 与集群设备/节点/交换机信息读取。 |
| `common/util/` | 调度通用常量、作业/任务抽象、vNPU 资源结构、多级调度资源树/任务树、错误收集工具。 |
| `config/` | Volcano scheduler 配置结构适配。 |
| `internal/` | 调度控制器、NPU 策略、NSLB/TOR 亲和、故障重调度等内部实现。 |
| `internal/npu/base/` | 通用 NPU 调度处理器，提供基础校验、过滤、打分、设备选择与 annotation 更新逻辑。 |
| `internal/npu/ascend310/` | Ascend310 卡/芯片形态调度策略。 |
| `internal/npu/ascend310p/` | Ascend310P、300I duo、vNPU 相关策略。 |
| `internal/npu/ascend910/` | Ascend910 old、910B、910A3、SuperPod、vNPU 等策略。 |
| `internal/npu/policy/` | 高阶策略，包括 1 卡软切分、4/8 芯片跨节点、SuperPod、RA64SP、多级调度等。 |
| `internal/npu/vnpu/` | vNPU 软切分通用调度逻辑。 |
| `internal/nslb/` | NSLB/TOR 亲和调度策略。 |
| `internal/rescheduling/` | 芯片、节点、DPU、任务、作业故障重调度处理及状态缓存。 |
| `plugin/` | 插件框架层，维护 `ScheduleHandler`、作业/节点/TOR/vNPU 缓存、Volcano session 交互。 |
| `test/`、`testdata/` | 单测辅助对象与 TOR 测试数据。 |
| `npu.go`、`type.go` | Volcano 插件入口、注册函数和主 session 生命周期。 |

## 3. 核心组件

### 3.1 Volcano 插件入口

`huaweiNPUPlugin` 是 Volcano 插件实例，包含 `Scheduler *plugin.ScheduleHandler` 和 `Arguments framework.Arguments`。`New(arguments)` 返回插件实例，`Name()` 返回构建期注入的插件名。

关键锚点：

| 锚点 | 作用 |
|---|---|
| `component/ascend-for-volcano/npu.go::HandlerStart` | 构造全局 `ScheduleHandler`，初始化 NPU 插件集合、重调度处理器、调度环境与策略工厂。 |
| `component/ascend-for-volcano/npu.go::OnSessionOpen` | 每个 Volcano session 开始时初始化缓存并注册所有调度回调。 |
| `component/ascend-for-volcano/npu.go::OnSessionClose` | session 结束时写入未调度原因、更新状态、保存缓存和执行收尾逻辑。 |
| `component/ascend-for-volcano/npu.go::addEventHandler` | 注册分配/释放事件，驱动 NPU annotation 更新。 |

### 3.2 ScheduleHandler 调度框架

`ScheduleHandler` 是模块内的中心状态机，聚合三类数据：

| 数据 | 结构 | 用途 |
|---|---|---|
| 调度环境 | `ScheduleEnv` | 持有 `VolcanoFrame`、`ClusterCache`、`JobScheduleInfoRecorder`、`OutputCache`。 |
| 集群缓存 | `ClusterCache` | 维护 `Jobs`、`Nodes`、`Tors`、`SuperPodInfo`。 |
| 校验结果 | `CheckResult` | 维护 job valid、enqueue、batch order、node predicate 错误，供 `OnSessionClose` 写入 PodGroup condition。 |

关键锚点：

| 锚点 | 作用 |
|---|---|
| `component/ascend-for-volcano/plugin/factory.go::InitNPUSession` | session 初始化主流程：初始化 frame、ConfigMap informer、节点、作业、TOR、策略、缓存和故障处理器。 |
| `component/ascend-for-volcano/plugin/node.go::InitNodesFromSsn` | 从 Volcano session 与 ConfigMap 构建 NPU 节点缓存。 |
| `component/ascend-for-volcano/plugin/job.go::SchedulerJob.init` | 将 Volcano `JobInfo` 转换为模块内部 `SchedulerJob`。 |
| `component/ascend-for-volcano/plugin/task.go::NPUAllocateFunc` | 任务绑定后更新节点 NPU 可用 annotation。 |
| `component/ascend-for-volcano/plugin/task.go::NPUDeallocateFunc` | 任务释放后恢复节点 NPU annotation。 |

### 3.3 NPU 策略控制器

`internal.Controller` 实现统一的调度策略接口，并把调用转发给具体 policy handler。它同时装配 NPU 策略和 NSLB 策略，因此一个作业可能经过多类策略共同过滤与打分。

关键锚点：

| 锚点 | 作用 |
|---|---|
| `component/ascend-for-volcano/internal/controller.go::SetPolicyHandler` | 按作业属性初始化 NPU policy 和 NSLB policy。 |
| `component/ascend-for-volcano/internal/controller.go::ValidNPUJob` | 逐个策略校验作业，任一策略失败则返回失败。 |
| `component/ascend-for-volcano/internal/controller.go::CheckNodeNPUByTask` | 节点过滤阶段统一调用策略过滤。 |
| `component/ascend-for-volcano/internal/controller.go::ScoreBestNPUNodes` | 节点打分阶段统一调用策略打分。 |
| `component/ascend-for-volcano/internal/controller.go::UseAnnotation` | 设备选择阶段按策略更新节点资源视图。 |

### 3.4 基础 NPU 处理器

`internal/npu/base.NPUHandler` 提供多数硬件形态共用的逻辑：校验每个任务请求 NPU 数、从节点 annotation 获取可用拓扑、判断节点资源是否满足请求、按健康卡数和空闲拓扑打分、选择前 N 个可用 NPU 并写入 Pod annotation。

关键锚点：

| 锚点 | 作用 |
|---|---|
| `component/ascend-for-volcano/internal/npu/base/frame.go::ValidNPUJob` | 校验任务请求数量是否在节点最大 NPU 数、非法数量表范围内。 |
| `component/ascend-for-volcano/internal/npu/base/frame.go::CheckNodeNPUByTask` | 判断单节点可用拓扑是否满足任务请求。 |
| `component/ascend-for-volcano/internal/npu/base/frame.go::ScoreBestNPUNodes` | 按健康 NPU 数和可用拓扑数量给节点打基础分。 |
| `component/ascend-for-volcano/internal/npu/base/frame.go::UseAnnotation` | 选卡并调用 `SetNPUTopologyToPodFn` 写入任务拓扑。 |
| `component/ascend-for-volcano/internal/npu/base/type.go::NPUHandler` | 基础处理器状态结构。 |

### 3.5 策略工厂

`internal/npu/factory.go` 是硬件形态与调度策略的分发中心：

| 输入 | 分发行为 |
|---|---|
| `ReqNPUName` 为 `huawei.com/Ascend910` 或 `huawei.com/NPU` | 进入 910 系列策略。 |
| `ReqNPUName` 为 `huawei.com/Ascend310` | 根据 `Accelerator310Key` 选择 card/chip 策略。 |
| `ReqNPUName` 为 `huawei.com/Ascend310P` | 根据 duo 与 accelerator label 选择 310P 策略；缺省回退基础处理器。 |
| `ReqNPUName` 为 `AscendNPUCore` | 进入 vNPU 策略。 |
| `huawei.com/schedule_policy` | 对 910 系列选择 SuperPod、A3、RA64SP、软切分、多级调度等 policy。 |

关键锚点：

| 锚点 | 作用 |
|---|---|
| `component/ascend-for-volcano/internal/npu/factory.go::policy910HandlerMap` | schedule policy 到 handler 名称的静态映射。 |
| `component/ascend-for-volcano/internal/npu/factory.go::initCard910Factory` | 注册 910/A3/A5/SuperPod/高级策略构造函数。 |
| `component/ascend-for-volcano/internal/npu/factory.go::InitPolicyHandler` | 顶层策略选择入口。 |
| `component/ascend-for-volcano/internal/npu/factory.go::get910CardHandlerName` | 910 策略名解析规则。 |

## 4. 核心流程

### 4.1 Session 初始化流程

1. Volcano 调用 `New(arguments)` 创建插件实例。
2. session 开始时调用 `OnSessionOpen`。
3. `InitNPUSession` 初始化配置、节点、作业、TOR、策略、缓存和重调度处理器。
4. 插件注册 job valid、predicate、batch node order、job ready、enqueueable、task order、allocate/deallocate 等回调。
5. 调度过程中 Volcano 依次调用这些回调完成资源过滤、打分、绑定和状态更新。
6. session 结束时 `OnSessionClose` 记录不可调度原因并写回 ConfigMap 缓存。

源锚点：`npu.go::OnSessionOpen`、`plugin/factory.go::InitNPUSession`、`npu.go::OnSessionClose`。

### 4.2 作业校验流程

`JobValid` 从 `ScheduleHandler.Jobs` 取内部作业对象，再调用作业绑定的 `policyHandler.ValidNPUJob()`。基础处理器会按任务规格去重校验 NPU 请求数，特定策略还会校验 SuperPod、RA block、affinity config、软切分资源等策略参数。

源锚点：`npu.go::OnSessionOpen` 注册 `AddJobValidFn`；`internal/controller.go::ValidNPUJob`；`internal/npu/base/frame.go::ValidNPUJob`；`internal/npu/policy/multilevelscheduling/frame.go::ValidNPUJob`。

### 4.3 节点过滤流程

节点过滤入口是 `ScheduleHandler.NodePredicate`：

1. 若存在重调度处理器，先调用 `FaultHandle.CheckNodeNPUByTask` 排除故障相关不可用节点。
2. 非 NPU 任务直接放行。
3. NPU 作业先执行 `preCheckNodePredicate`，包括资源稳定性、节点健康等前置检查。
4. 调用具体 policy 的 `CheckNodeNPUByTask` 判断可用拓扑、网络亲和、vNPU 或策略约束。
5. 失败信息被记录到 `NodePredicateErrors`，session close 时写入 PodGroup condition。

源锚点：`plugin/node.go::NodePredicate`；`npu.go::addPredicateFn`；`plugin/type.go::NodePredicateError`。

### 4.4 节点打分流程

节点打分入口是 `BatchNodeOrderFn`：

1. 初始化候选节点分数。
2. 获取任务所属 `SchedulerJob`。
3. 调用 `vcJob.policyHandler.ScoreBestNPUNodes` 进行策略打分。
4. 若启用重调度处理器，再调用 `FaultHandle.ScoreBestNPUNodes` 修正分数。
5. 最终分数乘以统一权重后返回 Volcano。

基础处理器按健康卡数和剩余拓扑打分；SuperPod、RA64SP、多级调度、NSLB 等策略会覆盖或增强该逻辑。

源锚点：`plugin/factory.go::BatchNodeOrderFn`；`internal/npu/base/frame.go::ScoreBestNPUNodes`；`internal/npu/policy/chip8node8ra64sp/score.go::scoreNodeForReadyJob`；`internal/npu/policy/multilevelscheduling/frame.go::ScoreBestNPUNodes`。

### 4.5 设备分配与释放流程

任务被 Volcano 分配后，`NPUAllocateFunc` 通过 `UseAnnotation` 选择设备并更新节点 annotation；任务释放时，`NPUDeallocateFunc` 通过 `ReleaseAnnotation` 恢复资源视图。节点 annotation 同时承载 device plugin、clusterd、noded、switch info 等信息。

源锚点：`plugin/task.go::NPUAllocateFunc`；`plugin/task.go::NPUDeallocateFunc`；`internal/controller.go::UseAnnotation`；`plugin/node.go::GetNewNPUNodeAnnotation`。

### 4.6 ConfigMap 与集群信息同步

`common/k8s` 同时支持 device plugin ConfigMap 和 clusterd 聚合 ConfigMap。`InitCmInformer` 根据 `useClusterD` 参数初始化 informer；`GetDeviceInfosAndSetInformerStart`、`GetNodeDInfos`、`GetSwitchInfos` 为节点初始化提供设备、节点健康、交换机健康信息。

源锚点：`common/k8s/cmmgr.go::InitCmInformer`；`common/k8s/cmmgr.go::GetDeviceInfosAndSetInformerStart`；`common/k8s/configmap.go::CreateOrUpdateConfigMap`；`common/k8s/configmap.go::UpdateConfigmapIncrementally`。

### 4.7 故障重调度流程

`rescheduling.ReScheduler` 作为 `FaultHandle` 接入调度主流程。它读取故障节点、故障卡、故障任务、故障作业状态，影响节点过滤、打分、设备选择，并在 session 收尾时把重调度状态写入输出缓存，最终由 `ScheduleHandler.saveCacheToCm` 写回 ConfigMap。

源锚点：`internal/rescheduling/frame.go::Execute`；`internal/rescheduling/reschedule.go::Reschedule`；`internal/rescheduling/cache.go::WriteReSchedulerCacheToEnvCache`；`plugin/factory.go::BeforeCloseHandler`。

## 5. 接口与数据结构

| 类型/接口 | 位置 | 说明 |
|---|---|---|
| `SchedulerPluginNeed` | `plugin/plugin.go` | 具体策略必须实现的接口：校验、过滤、打分、分配、释放、预处理、初始化。 |
| `ScheduleHandler` | `plugin/type.go` | 插件核心状态与调度入口承载结构。 |
| `SchedulerJob` | `plugin/type.go` | 内部作业结构，包含调度属性、未调度原因、policy handler、SuperPods、owner、A5 字段等。 |
| `NPUNode` | `plugin/node.go` | 内部节点结构，由 `CommonNode` 和 `VNode` 组成。 |
| `CommonNode` | `plugin/node.go` | 保存 capacity、allocate、idle、annotation、label、SuperPodID、RackID、ServerIndex 等基础节点信息。 |
| `VNode` / `VChip` | `plugin/node.go` | vNPU 软切分资源视图，保存芯片、已用资源、空闲资源、DVPP、切分标记等。 |
| `SchedulerJobAttr` | `common/util/job.go` | 从 Volcano JobInfo 提取出的作业调度属性。 |
| `NPUTask` | `common/util/task.go` | 内部任务抽象，保存 NPU 请求、rank、规格等调度字段。 |
| `ResourceTree` / `TaskTree` | `common/util/type_multilevel.go` | 多级调度的资源树与任务树模型。 |
| `ReScheduler` | `internal/rescheduling/type.go` | 故障重调度处理器。 |
| `TorList` / `Tor` / `Server` | `plugin/tor.go` | TOR/NSLB 拓扑缓存结构。 |

## 6. 关键约束

| 约束 | 依据 |
|---|---|
| 插件强依赖 Volcano 内部包路径，构建前需把源码放到 Volcano 源码树的 scheduler plugin 目录下 | `build/build.sh::TOP_DIR`、`BASE_PATH` |
| `build.sh` 标注 `BASE_VER` 只支持 `v1.7.0` 或 `v1.9.0`；`build_1.10plus.sh` 用于 1.10+ | `build/build.sh`；`build/build_1.10plus.sh` |
| 插件名与 release version 绑定，产物名为 `volcano-npu_<REL_VERSION>.so` | `build/build.sh::REL_NPU_PLUGIN`；`build/build_1.10plus.sh::REL_NPU_PLUGIN` |
| 构建脚本会修改 Volcano 源码中的 job running 行为、node predicate 签名、klog 引用和 allocate 单节点评分逻辑 | `build/build.sh::replace_code`、`replace_node_predicate`、`replace_node_score` |
| 非 vNPU 作业要求节点 device-info、K8s idle/capacity 资源稳定，否则过滤失败 | `plugin/node.go::checkNPUResourceStable` |
| 多级调度要求 affinity level 连续，且上层任务数可被下层分组数整除 | `common/util/type_multilevel.go::GetTaskTreeLevels` |
| resource-level-config 解析时层级必须连续；只在 level1 继承 `ReservedNode` | `plugin/factory.go::getConfigLevel` |
| `testBuild.sh` 运行 `go test -race -coverprofile` 并计算覆盖率，脚本逻辑期望覆盖率不低于 80% | `build/testBuild.sh` |

## 7. 运维 Runbook

### 7.1 构建

| 场景 | 操作 |
|---|---|
| 全量构建 | 在仓库根目录通过 `build/build_all.sh $GOPATH` 将 `component/*` 拷贝到 GOPATH，并准备 Volcano 源码目录。 |
| 单组件构建 | `build/build_each.sh` 的 `build_volcano` 分支会进入 `$GOPATH/src/volcano.sh/volcano/pkg/scheduler/plugins/ascend-volcano-plugin/build` 执行组件构建。 |
| Volcano v1.7/v1.9 | 在插件 build 目录执行 `./build.sh v1.7.0` 或 `./build.sh v1.9.0`。 |
| Volcano 1.10+ | 执行 `./build_1.10plus.sh`。 |
| 版本注入 | `service_config.ini` 第一行 `mind-cluster-version=<version>` 会被解析为 `v<version>` 并用于插件产物名。 |

构建产物由脚本生成并设置权限：`vc-scheduler`、必要时的 `vc-controller-manager`、`volcano-npu_<version>.so`。

### 7.2 验证

| 验证项 | 命令或检查点 |
|---|---|
| 单元测试 | `component/ascend-for-volcano/build/testBuild.sh` 在 Volcano 源码树内运行插件包 `go test -v -race -gcflags=all=-l -coverprofile`。 |
| 覆盖率 | 查看 `_output/test/cov.out`、`api.html`、`unit-tests.xml`；脚本会输出 `coverage passed` 或 `coverage failed`。 |
| 插件名 | 检查输出 `.so` 文件名与 scheduler 配置中的插件名一致。 |
| session 注册 | 运行时日志应能看到 `enter <PluginName> OnSessionOpen` 与 `leave <PluginName> OnSessionOpen`。 |

### 7.3 部署

已确认构建脚本会复制/修改 Volcano YAML 并将插件名替换为 `REL_NPU_PLUGIN`。实际部署应保证：

| 检查项 | 说明 |
|---|---|
| Scheduler 配置 | Volcano scheduler 配置中启用 `ascend-volcano-plugin` 对应插件名。 |
| 插件文件 | `volcano-npu_<version>.so` 与 `vc-scheduler` 来自同一次构建。 |
| init-params | 需要与功能匹配，例如 NSLB、SuperPod、多级调度的 `resource-level-config`、`useClusterInfoManager` 等。 |
| RBAC | 插件通过 scheduler kube client 读取/写入 ConfigMap、读取 Node/Pod/PodGroup，部署权限需覆盖这些资源。 |
| 设备信息来源 | device plugin 或 clusterd 的 ConfigMap 必须可读，否则节点 NPU 信息初始化会失败或降级。 |

### 7.4 回滚

| 回滚对象 | 建议动作 |
|---|---|
| 调度二进制 | 回滚到上一版 `vc-scheduler`。 |
| 插件 `.so` | 回滚到与上一版 scheduler 配套的 `volcano-npu_<version>.so`。 |
| Scheduler 配置 | 回滚插件名、init-params、策略配置。 |
| 多级调度配置 | 移除或恢复 `resource-level-config`，避免策略找不到拓扑层级。 |
| ConfigMap 缓存 | 如出现重调度状态污染，重点检查 re-scheduler 输出 ConfigMap 与 TOR share ConfigMap；清理前需确认不会影响正在恢复的作业。 |

### 7.5 常见失败模式

| 现象 | 可能原因 | 关注锚点 |
|---|---|---|
| 插件未加载 | scheduler 配置插件名与 `.so` 内 `PluginName` 不一致 | `type.go::PluginName`；`build/build.sh::REL_NPU_PLUGIN` |
| NPU 作业一直 Pending | device-info 与 K8s resource 不稳定，或节点 annotation 缺失 | `plugin/node.go::checkNPUResourceStable` |
| 多级调度作业校验失败 | affinity level 不连续或整除关系不满足 | `common/util/type_multilevel.go::GetTaskTreeLevels` |
| 节点全部过滤失败 | 故障处理器、noded/switch 状态、policy 约束共同排除节点 | `plugin/node.go::NodePredicate`；`internal/rescheduling` |
| 分数异常或只选单节点 | 构建脚本未正确 patch Volcano allocate 单节点评分分支 | `build/build.sh::replace_node_score` |
| 重调度不生效 | reset/recovery ConfigMap 未写入或 `FaultHandle` 未执行 | `internal/rescheduling/cache.go::WriteReSchedulerCacheToEnvCache`；`plugin/factory.go::BeforeCloseHandler` |

## 8. 调试指南

| 模块 | 症状 | 可能源码区域 | 建议检查 |
|---|---|---|---|
| 插件入口 | scheduler 启动后无 NPU 调度行为 | `npu.go::OnSessionOpen`、`npu.go::HandlerStart` | 搜索 scheduler 日志中的 `OnSessionOpen`、`InitNPUSession`、插件名。 |
| 作业初始化 | NPU 作业未被识别或 policy handler 为空 | `plugin/job.go::SchedulerJob.init`、`internal/npu/factory.go::InitPolicyHandler` | 检查 PodGroup/Pod 的 resource name、`huawei.com/schedule_policy`、`accelerator-type`、310/310P label。 |
| 节点初始化 | 节点不进入 `ScheduleHandler.Nodes` | `plugin/node.go::initNPUNodeByNodeInf`、`common/k8s/cmmgr.go` | 检查 Node capacity/idle、device-info ConfigMap、`baseDeviceInfos`、节点健康状态。 |
| 节点过滤 | PodGroup condition 出现 `NodePredicateFailed` | `plugin/node.go::NodePredicate`、具体 policy `CheckNodeNPUByTask` | 查看 PodGroup condition message；定位 `NodePredicateErrors` 中的原因与示例节点。 |
| 节点打分 | 候选节点分数为 0 或排序不符合预期 | `plugin/factory.go::BatchNodeOrderFn`、具体 policy `ScoreBestNPUNodes` | 打开 debug 日志，搜索 `batchNodeOrderFn`、`ScoreBestNPUNodes`。 |
| 设备分配 | Pod 未写入预期 NPU annotation | `plugin/task.go::NPUAllocateFunc`、`internal/controller.go::UseAnnotation` | 检查 Pod annotation 中真实使用卡、rank、拓扑字段；核对节点 annotation 变化。 |
| vNPU/软切分 | 多副本或软切分资源调度失败 | `plugin/vnode.go`、`internal/npu/vnpu`、`policy/chip1softsharedev` | 检查 `AscendNPUCore` request、aicore/hbm quota、DVPP、segment/preset 配置。 |
| 多级调度 | `multilevel` 作业校验失败或无节点可选 | `policy/multilevelscheduling/frame.go`、`common/util/type_multilevel.go` | 检查 `resource-level-config`、节点拓扑 label、`huawei.com/affinity-config`。 |
| NSLB/TOR | TOR 亲和作业跨 TOR 或无法调度 | `internal/nslb`、`plugin/tor.go` | 检查 TOR ConfigMap、`tor-affinity` label、`NslbVersion`、TOR share 状态。 |
| 重调度 | 故障 Pod 未删除或未重新选节点 | `internal/rescheduling`、`plugin/factory.go::BeforeCloseHandler` | 检查故障节点/卡 ConfigMap、reset ConfigMap、re-scheduler cache、PodGroup 恢复策略 annotation。 |

## 9. 与其他组件的关系

| 组件 | 交互方式 |
|---|---|
| Volcano Scheduler | 插件 API、session 回调、PodGroup 状态与调度流程。 |
| Ascend Device Plugin | 通过节点资源与 device-info ConfigMap 提供可用卡、故障卡、虚拟设备等信息。 |
| ClusterD / NodeD | 通过 ConfigMap 提供节点健康、公共故障、重调度、进程级恢复相关状态。 |
| Ascend Operator | 通过 PodGroup、Pod annotation/label 传递调度策略、rank、SuperPod、软切分等参数。 |
| Kubernetes API Server | 读取 Node/Pod/PodGroup/ConfigMap，写入 ConfigMap 与 PodGroup condition。 |

## 10. 后续 design.md 合成建议

合成正式 `design.md` 时建议把本模块放入“调度平面”章节，并围绕以下主题抽象：

1. Volcano 插件生命周期：入口、session 初始化、回调注册、session 收尾。
2. 统一调度策略接口：`SchedulerPluginNeed` 与 `internal.Controller` 的策略聚合。
3. NPU 节点与作业模型：`SchedulerJob`、`NPUNode`、`VNode`、`VChip`。
4. 策略扩展机制：factory 按硬件型号、资源名、annotation、selector 分发。
5. 故障闭环：device-info/node-info/switch-info 输入，predicate/score 输出，re-scheduler cache 写回。
6. 运维构建约束：Volcano 版本 patch、插件名注入、`.so` 与 scheduler 二进制配套。