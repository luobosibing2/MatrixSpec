# Taskd 模块设计文档

## 1. 模块定位

Taskd 是 MindCluster 中面向训练任务运行期管理的组件，提供 Python 对外 API、Go 后端共享库、任务内消息网络、Manager 插件编排、Agent 训练进程管理、Worker 监控能力。其核心用途是把训练框架进程、MindIO TTP controller、ClusterD 故障恢复控制面以及任务内 worker 监控连接起来，用于进程级快恢、进程级重调度、亚健康热切、profiling、网卡切换、压力检测等训练运行期动作。

已确认依据：

| 结论 | 源锚点 | 说明 |
|---|---|---|
| Python API 负责初始化/启动 manager、agent、worker、proxy | `component/taskd/taskd/api/taskd_manager_api.py::init_taskd_manager`、`taskd_agent_api.py::init_taskd_agent`、`taskd_worker_api.py::init_taskd_worker`、`taskd_proxy_api.py::init_taskd_proxy` | 对外入口函数直接封装底层框架对象或 `libtaskd.so` C 接口 |
| Go 后端以 c-shared 方式构建为 `libtaskd.so` | `component/taskd/build/build_backend.sh::build`、`component/taskd/taskd/go/backend_api.go` | 构建脚本使用 `go build -buildmode=c-shared`，Go 文件通过 `//export` 暴露 C ABI |
| Manager 与 ClusterD 通过 gRPC 恢复接口交互 | `component/taskd/taskd/go/framework_backend/manager/manager.go::registerClusterD`、`ReportControllerInfoToClusterd` | manager 订阅 ClusterD 信号，并向 ClusterD 上报恢复状态、故障、策略和停止完成 |
| Manager 内部以插件和业务流调度恢复动作 | `component/taskd/taskd/go/framework_backend/manager/application/businessStream.go::BusinessStreamProcessor`、`service/plugin_handler.go::PluginHandler.Init`、`service/stream_handler.go::StreamHandler.Init` | 插件按 stream 申请 token，业务流按优先级分配执行权 |
| Worker 负责 profiling、网卡切换、压力检测等 rank 侧监控动作 | `component/taskd/taskd/go/framework_backend/worker/worker.go::StartMonitor`、`component/taskd/taskd/python/framework/worker/worker.py::Worker` | Worker 启动 MSPTI profiling、OM 消息处理、profiling 文件管理，并注册 Python 回调 |

推断边界：

- Taskd 与 ClusterD、Ascend Operator、Volcano、MindIO Controller 的完整端到端交互在文档时序图中出现，但本模块内只直接实现 Taskd Manager/Agent/Worker/Proxy 和 ClusterD gRPC、MindIO Controller 回调桥接；Ascend Operator、Volcano 的动作由其他组件完成。
- `component/taskd/taskd/go/framework_backend/manager/plugins/*` 插件目录在模块树中存在，部分核心插件由 `PluginHandler.Init` 注册；具体每个插件内部策略未在本次摘要中逐文件展开。

## 2. 目录结构

| 路径 | 作用 |
|---|---|
| `component/taskd/build/` | Taskd 构建脚本。`build.sh` 先构建 Go 后端，再打 Python wheel；`build_backend.sh` 生成 `libtaskd.so` 并放入 Python 包目录。 |
| `component/taskd/setup.py` | Python 包构建配置，打包 `taskd/api/**`、`taskd/python/**` 和 `python/cython_api/libs/*.so`。 |
| `component/taskd/taskd/api/` | 对外 Python API 层，面向用户脚本或框架集成调用。 |
| `component/taskd/taskd/python/` | Python 框架适配层，包括 agent、manager、worker、controller、cython_api、toolkit、utils。 |
| `component/taskd/taskd/go/backend_api.go` | Go 后端 C ABI 聚合入口，供 Python `ctypes` 调用。 |
| `component/taskd/taskd/go/common/` | Go 常量、日志、通用工具。 |
| `component/taskd/taskd/go/framework_backend/manager/` | Manager 后端，包含消息处理、业务流、插件、ClusterD 订阅与上报。 |
| `component/taskd/taskd/go/framework_backend/proxy/` | Proxy 后端，负责代理网络节点初始化与销毁。 |
| `component/taskd/taskd/go/framework_backend/worker/` | Worker 后端，负责 rank 侧监控、profiling、OM 能力。 |
| `component/taskd/taskd/go/toolkit_backend/net/` | 任务内 gRPC 网络层，支持 manager、proxy、agent、worker 等角色分层路由。 |
| `component/taskd/taskd/go/toolkit_backend/grpool/` | Go 协程池工具，供网络广播等并发任务使用。 |
| `component/taskd/tests/` | 单元测试和系统测试脚本，覆盖 API、Go 后端、Python 框架、toolkit 和 utils。 |

## 3. 核心组件

### 3.1 Python 对外 API 层

Python API 层提供简化入口，并维护进程内全局对象。

| API | 关键函数 | 作用 | 源锚点 |
|---|---|---|---|
| Manager API | `init_taskd_manager(config)`、`start_taskd_manager()` | 创建 `Manager`，初始化并启动 Taskd Manager | `component/taskd/taskd/api/taskd_manager_api.py` |
| Agent API | `init_taskd_agent(config, cls=None)`、`start_taskd_agent()`、`register_func(operator, func)` | 根据 `Framework` 初始化 PyTorch 或 MindSpore Agent，并注册回调 | `component/taskd/taskd/api/taskd_agent_api.py` |
| Worker API | `init_taskd_worker(rank_id, upper_limit_of_disk_in_mb, framework)`、`start_taskd_worker()`、`destroy_taskd_worker()` | 初始化 rank 侧 worker 监控并启动 | `component/taskd/taskd/api/taskd_worker_api.py` |
| Proxy API | `init_taskd_proxy(config)`、`destroy_taskd_proxy()` | 初始化/销毁本地 proxy 网络节点 | `component/taskd/taskd/api/taskd_proxy_api.py` |

关键约束：

- `taskd_agent_api.py::init_taskd_agent` 要求 `cython_api.lib` 已成功加载，否则直接失败。
- PyTorch Agent 使用环境变量 `RANK` 推导默认 server rank；MindSpore Agent 使用 `MS_NODE_RANK`。
- MindSpore Agent 初始化时会异步启动本地 proxy 线程，proxy 上游地址默认读取 `MS_SCHED_HOST` 或本地地址。
- Worker API 校验 `rank_id` 和 `upper_limit_of_disk_in_mb` 必须为非负整数。

### 3.2 Python 框架层

| 组件 | 职责 | 源锚点 |
|---|---|---|
| `Manager` | 设置 taskd 开关、调用 Go `InitTaskdManager`/`StartTaskdManager`，必要时启动 MindIO controller 并注册后端回调 | `component/taskd/taskd/python/framework/manager/manager.py::Manager` |
| `controller.py` | 对接 `mindio_ttp.controller_ttp`，把 Manager 下发动作转为 controller 调用，并把 controller 回调上报到 Go 后端 | `component/taskd/taskd/python/framework/manager/controller.py::backend_send_callback`、`controller_send_to_backend` |
| `BaseAgent` | 管理训练进程生命周期、消息队列、故障上报、优雅退出等通用 Agent 行为 | `component/taskd/taskd/python/framework/agent/base_agent/base_agent.py::BaseAgent` |
| `AgentMessageManager` | 用 `libtaskd.so` 的网络 C 接口初始化网络、注册 Agent、收发 Manager 消息 | `component/taskd/taskd/python/framework/agent/base_agent/agent_network.py::AgentMessageManager` |
| `Worker` | 调用 Go `InitWorker`、`StartMonitorClient`，注册网卡切换和压力检测回调 | `component/taskd/taskd/python/framework/worker/worker.py::Worker` |
| `cython_api` | 加载 `python/cython_api/libs/libtaskd.so`，拒绝加载符号链接 | `component/taskd/taskd/python/cython_api/cython_api.py::load_lib_taskd` |

### 3.3 Go C ABI 后端

`component/taskd/taskd/go/backend_api.go` 是 Python 与 Go 后端之间的统一桥接层，导出以下主要能力：

| 导出函数 | 作用 |
|---|---|
| `InitTaskdManager` / `StartTaskdManager` | 反序列化 manager 配置并启动 `BaseManager` |
| `InitWorker` / `StartMonitorClient` / `DestroyTaskdWorker` | 初始化 worker 日志、profiling、网络，并启动监控 |
| `InitNetwork` / `SyncSendMessage` / `AsyncSendMessage` / `ReceiveMessageC` / `DestroyNetTool` | 暴露任务内网络能力给 Python Agent |
| `InitTaskdProxy` / `DestroyTaskdProxy` | 初始化/销毁 proxy |
| `CreateTaskdLog` | 为 Agent/Proxy 创建自定义日志器 |
| `SendMessageToBackend` | controller 回调进入 Go 后端后，上报 ClusterD |
| `RegisterBackendCallback` | 注册 Go 到 Python controller 的回调 |
| `RegisterSwitchCallback` / `RegisterStressTestCallback` | 注册 worker 侧 OM 回调 |
| `AtExitAction` | 进程退出时标记 profiling 预退出，尽量 flush profiling 活动 |

### 3.4 Manager 后端

Manager 是 Taskd 控制面的核心，主要由消息处理、业务流、插件、ClusterD 交互组成。

| 子组件 | 核心职责 | 源锚点 |
|---|---|---|
| `BaseManager` | 初始化日志、消息处理器、业务流处理器，循环执行 `Service` | `component/taskd/taskd/go/framework_backend/manager/manager.go::BaseManager` |
| `MsgHandler` | 初始化 manager 网络、接收消息、处理消息、发送消息、维护 `DataPool` | `component/taskd/taskd/go/framework_backend/manager/application/msghandler.go::MsgHandler` |
| `DataPool` / `SnapShot` | 存储 Agent、Worker、Cluster、Manager 状态快照 | `component/taskd/taskd/go/framework_backend/manager/infrastructure/storage/datapool.go::DataPool` |
| `BusinessStreamProcessor` | 插件 predicate、stream token 分配、插件处理、消息分发 | `component/taskd/taskd/go/framework_backend/manager/application/businessStream.go::BusinessStreamProcessor` |
| `Stream` / `StreamHandler` | 对业务流 token 进行绑定、释放、重置和优先级排序 | `component/taskd/taskd/go/framework_backend/manager/infrastructure/stream.go::Stream`、`service/stream_handler.go::StreamHandler` |
| `PluginHandler` | 注册并调度 manager 插件 | `component/taskd/taskd/go/framework_backend/manager/service/plugin_handler.go::PluginHandler` |

已确认的内置插件注册列表：

- `ProfilingPlugin`
- `OMSwitchNicPlugin`
- `OMStressTestPlugin`
- `StopTrainPlugin`，由 `prerecover.New()` 创建
- `ElasticTrainingPlugin`
- `JobReschedulingPlugin`
- `PodReschedulingPlugin`
- `recoverPlugin`
- `HotSwitchPlugin`

业务流已确认包括：

| Stream | 主要插件优先级 |
|---|---|
| `ProfilingCollect` | `ProfilingPlugin` |
| `OMSwitchNicStream` | `OMSwitchNicPlugin` |
| `OMStressTestStream` | `OMStressTestPlugin` |
| `ResumeTrainingAfterFaultStream` | `StopTrainPlugin`、`recoverPlugin`、`ElasticTrainingPlugin`、`PodReschedulingPlugin`、`JobReschedulingPlugin`、`HotSwitchPlugin` |

### 3.5 Worker 后端

Worker 运行在训练 rank 侧，承担监控与执行类动作：

- `worker.go::InitMonitor` 初始化 MSPTI profiling、设置 profiling 磁盘上限和全局 rank。
- `worker.go::InitNetwork` 以 `Worker` 角色连接本地 proxy，默认上游地址为 `127.0.0.1:9602`。
- `worker.go::registerAndLoopRecv` 向 Manager 注册并循环接收消息，分发给网卡切换、压力检测和 profiling 处理。
- `worker.go::StartMonitor` 注册 MSPTI activity callbacks，启动 profiling 保存、domain 状态管理、磁盘用量管理和压力检测处理。

Python `Worker` 还负责把 Go 后端回调接入训练框架：

- PyTorch 网卡切换调用 `torch_npu.npu._comm_switch_nic`。
- MindSpore 网卡切换调用 `mindspore.communication.management._comm_switch_nic`。
- PyTorch 压力检测调用 `torch_npu.npu.stress_detect`。
- MindSpore 压力检测调用 `mindspore.utils.stress_detect`。

### 3.6 任务内网络层

网络层位于 `taskd/go/toolkit_backend/net`，用于 Manager、Proxy、Agent、Worker 之间的分层消息路由。

| 组件 | 职责 | 源锚点 |
|---|---|---|
| `NetInstance` | 维护网络配置、上下游 endpoint、接收 buffer、协程池和生命周期 | `component/taskd/taskd/go/toolkit_backend/net/network.go::NetInstance` |
| `InitNetwork` | 根据角色层级启动 server/client，初始化接收队列和协程池 | `component/taskd/taskd/go/toolkit_backend/net/network.go::InitNetwork` |
| `downStreamEndpoint` | 启动 gRPC server，管理下游注册、路由表、广播和单播 | `component/taskd/taskd/go/toolkit_backend/net/downstream_endpoint.go::downStreamEndpoint` |
| `upStreamEndpoint` | 连接上游、注册、路径发现、监听上游消息，异常时重建网络 | `component/taskd/taskd/go/toolkit_backend/net/upstream_endpoint.go::upStreamEndpoint` |

网络约束：

- gRPC server 监听地址需要通过 host 校验。
- 接收 buffer 写入有 10ms 超时，繁忙时返回 `RecvBufBusy`。
- 上游连接会循环重试；流接收失败会触发 `rebuildNet`。
- 下游注册数量受 `MaxRegistryNum` 限制。
- 服务端 unary 请求使用 QPS limiter。

## 4. 核心流程

### 4.1 构建与装载流程

1. `component/taskd/build/build.sh` 读取 `service_config.ini` 或默认版本，设置 `BUILD_VERSION`。
2. `build.sh` 调用 `build_backend.sh`。
3. `build_backend.sh` 在 `component/taskd/taskd/go` 下执行 `go build -buildmode=c-shared`，输出 `libtaskd.so`。
4. `build_backend.sh` 将 `libtaskd.so` 移入 `taskd/python/cython_api/libs/`。
5. `build.sh` 执行 `python3 ./setup.py bdist_wheel`。
6. `setup.py` 将 Python 包和 `python/cython_api/libs/*.so` 一起打进 wheel。

### 4.2 Manager 启动流程

1. 用户或上层框架调用 `taskd.api.taskd_manager_api.init_taskd_manager(config)`。
2. Python `Manager.init_taskd_manager` 根据环境变量写入 `fault_recover`、`taskd_enable` 等配置。
3. Python 通过 `cython_api.lib.InitTaskdManager(config_json)` 调用 Go。
4. Go `InitTaskdManager` 反序列化为 `manager.Config`，创建 `BaseManager`。
5. `start_taskd_manager` 调用 Go `StartTaskdManager`。
6. `BaseManager.Start` 进入 `Init` 和 `Process`。
7. `Init` 初始化 `MsgHandler`、`BusinessStreamProcessor`，并启动 ClusterD 注册与 profiling 配置监听。
8. `Process` 按 `TASKD_PROCESS_INTERVAL` 或默认 100ms 周期读取 DataPool 快照并执行业务流。

### 4.3 Agent 与训练进程管理流程

1. `init_taskd_agent` 根据 `Framework` 选择 PyTorch 或 MindSpore Agent。
2. 初始化 `NetworkConfig`：Agent 默认上游为 `127.0.0.1:9602`，角色为 `Agent`。
3. 通过 Go `CreateTaskdLog` 创建 agent 日志器。
4. PyTorch 场景创建 `PtAgent(cls, network_config, logger)`；MindSpore 场景创建本地 proxy 线程并创建 `MsAgent`。
5. `start_taskd_agent`：PyTorch 调用 `invoke_run("DEFAULT_ROLE")`；MindSpore 调用 `start()`。
6. `AgentMessageManager` 初始化网络后向 Manager 注册，随后循环接收消息并写入 Agent 队列。
7. `BaseAgent.handle_message` 从队列取命令，并由具体 Agent 的 `command_map` 执行。

### 4.4 Worker 监控流程

1. 训练进程调用 `init_taskd_worker(rank_id, upper_limit_of_disk_in_mb, framework)`。
2. Python `Worker.init_worker` 计算 node rank：MindSpore 使用 `MS_NODE_RANK`，PyTorch 使用 `RANK / LOCAL_WORLD_SIZE`。
3. Python 调用 Go `InitWorker(globalRank, nodeRank, upperLimitOfDiskInMb)`。
4. Go 初始化 worker 日志，异步启动 `InitMonitor` 和 `InitNetwork`。
5. `start_taskd_worker` 调用 Go `StartMonitorClient`。
6. Go `StartMonitor` 等待 MSPTI 和网络初始化，注册 profiling callback，并启动消息接收、压力检测、profiling 文件保存和磁盘管理协程。

### 4.5 ClusterD 与 MindIO Controller 恢复流程

1. Manager 启动后 `registerClusterD` 连接 ClusterD，订阅恢复、profiling、网卡切换、压力检测等流。
2. ClusterD 下发 `ProcessManageSignal` 后，Manager 写入 MsgQueue。
3. 插件在业务流中 predicate 和 handle，生成发往 Agent、Worker、Manager 或 controller 的消息。
4. 发往 controller 的消息由 `BusinessStreamProcessor.distributedToController` 调用 Python controller callback。
5. Python `controller.py` 根据 action 调用 `mindio_ttp.controller_ttp` 中的 stop、change strategy、global rank、dump 等函数。
6. Controller 回调如 `report_process_fault`、`report_stop_complete`、`report_recover_strategy`、`report_recover_status` 通过 Go `SendMessageToBackend` 上报 ClusterD。
7. Go `ReportControllerInfoToClusterd` 根据 action 调用 ClusterD recover gRPC 接口。

该流程与 `docs/zh/advanced knowledge/进程级重调度.md`、`亚健康热切.md`、`网络故障进程级快恢.md`、`HBM UCE进程级快恢.md` 中的时序图相符：Taskd Manager 在 ClusterD 与 MindIO Controller/Agent 之间传递停止、策略、恢复状态等控制信号。

## 5. 接口与数据结构

### 5.1 Manager 配置

源锚点：`component/taskd/taskd/go/framework_backend/manager/manager.go::Config`

| 字段 | 类型 | 含义 |
|---|---|---|
| `job_id` | string | Manager 所属作业 ID |
| `node_nums` | int | 作业节点数 |
| `proc_per_node` | int | 每节点业务进程数 |
| `plugin_dir` | string | 插件目录 |
| `fault_recover` | string | 故障恢复开关或策略 |
| `taskd_enable` | string | Taskd 进程管理开关 |
| `cluster_infos` | `[]ClusterInfo` | ClusterD 等集群服务信息 |

### 5.2 网络位置与消息结构

Python 数据结构源锚点：`component/taskd/taskd/python/framework/common/type.py`

| 数据结构 | 字段 | 用途 |
|---|---|---|
| `Position` | `role`、`server_rank`、`process_rank` | 标识 Manager、Proxy、Agent、Worker 等网络角色位置 |
| `NetworkConfig` | `pos`、`upstream_addr`、`listen_addr`、`enable_tls`、`tls_conf` | 初始化 Go 网络层 |
| `MessageInfo` | `uuid`、`biz_type`、`dst`、`body` | Python Agent 发送给 Manager 的消息 |
| `MsgBody` | `msg_type`、`code`、`message`、`extension` | 消息业务负载 |
| `AgentReportInfo` | `fault_ranks`、`restart_times` | Agent 上报信息 |

Go 网络结构源锚点：`component/taskd/taskd/go/toolkit_backend/net/common/type.go` 和 `network.go::NetInstance`。

### 5.3 Manager 内部状态

源锚点：`component/taskd/taskd/go/framework_backend/manager/infrastructure/storage/datapool.go::SnapShot`

| 结构 | 内容 |
|---|---|
| `DataPool` | 包含当前 `SnapShot` 和读写锁 |
| `SnapShot` | 包含 `AgentInfos`、`WorkerInfos`、`ClusterInfos`、`MgrInfos` 和 `WorkerNum` |
| `MsgQueue` | 进程内消息队列，最大长度由 `constant.MaxMsgQueueLength` 控制，当前值为 40000 |

### 5.4 插件接口

源锚点：`component/taskd/taskd/go/framework_backend/manager/infrastructure/plugin.go::ManagerPlugin`

| 方法 | 用途 |
|---|---|
| `Name()` | 返回插件名称 |
| `Predicate(shot storage.SnapShot)` | 判断是否申请业务流 token |
| `Handle()` | 执行插件处理逻辑 |
| `PullMsg()` | 拉取插件生成的消息 |
| `Release()` | 释放插件资源 |

### 5.5 Controller 回调数据

源锚点：`component/taskd/taskd/python/framework/manager/controller.py::ControllerMessage`

| 字段 | 含义 |
|---|---|
| `action` | 单个动作，如 `stop_complete`、`recover_strategy`、`recover_status`、`process_fault` |
| `actions` | Manager 下发给 controller 的动作列表 |
| `code` / `msg` | 状态码和说明 |
| `strategy` / `strategy_list` | 恢复策略 |
| `fault_ranks` | 故障 rank 与故障类型映射 |
| `params` / `timeout` | 扩展参数和超时 |

## 6. 关键约束

### 6.1 运行环境约束

- `libtaskd.so` 必须存在于 `taskd/python/cython_api/libs/`，并能被 `ctypes.CDLL` 加载。
- `cython_api.py::load_lib_taskd` 显式拒绝加载符号链接形式的 `libtaskd.so`。
- Worker PyTorch 场景依赖 `RANK` 和 `LOCAL_WORLD_SIZE`；MindSpore 场景依赖 `MS_NODE_RANK`。
- MindIO Controller 初始化依赖 `WORLD_SIZE` 或 `MS_WORKER_NUM`，以及 `POD_IP`、`TTP_PORT`。
- Manager 默认监听 `127.0.0.1:9601`，Worker 默认连接 proxy `127.0.0.1:9602`；本地 proxy 模式受 `LOCAL_PROXY_ENABLE=on` 影响。
- Manager 主循环间隔由 `TASKD_PROCESS_INTERVAL` 控制，合法范围为 100ms 到 1000ms，否则回退默认 100ms。

### 6.2 消息与并发约束

- `MsgQueue` 最大长度为 40000，满队列会返回错误。
- Manager 消息处理会启动 `RequestChanNum` 个处理协程，当前常量为 100。
- Stream token 同一时刻只能被一个插件持有；业务流完成后插件需释放 token，final 阶段还会 reset stream。
- 网络接收 buffer 忙时会返回错误，可能导致发送端收到 `RecvBufBusy`。
- 上游网络异常会自动重建，但重建期间消息可能失败或被重试逻辑处理。

### 6.3 安全与构建约束

- Go 后端构建启用了 `-fstack-protector-strong`、`_FORTIFY_SOURCE=2`、`-fPIC`、`-ftrapv` 和链接器 `relro/now/noexecstack` 等选项。
- Python 包要求 `python_requires >= 3.7`。
- `build.sh` 最终对 output 包内容执行 `chmod 400`。
- Go 测试脚本要求 race 检测，并期望覆盖率不低于 80%，但覆盖率不足处当前脚本未强制 `exit 1`。

## 7. 运维 Runbook

### 7.1 构建

| 场景 | 命令 | 依据 |
|---|---|---|
| 构建 Taskd wheel 和 Go 后端 | `cd component/taskd && bash build/build.sh` | `component/taskd/build/build.sh::main` |
| 仅构建 Go 后端共享库 | `cd component/taskd && bash build/build_backend.sh` | `component/taskd/build/build_backend.sh::main` |
| 全仓多组件构建时包含 taskd | `cd build && ./build_all.sh $GOPATH` | `build/build_all.sh` 会复制 `component/*` 到 GOPATH 并调组件构建 |

构建产物：

- Go 后端：`component/taskd/taskd/python/cython_api/libs/libtaskd.so`
- Python wheel：`component/taskd/output/` 下的 wheel 包

### 7.2 验证

| 验证项 | 命令 | 结果产物 |
|---|---|---|
| Taskd 全量 UT | `cd component/taskd/tests/ut && bash run_test.sh` | `component/taskd/test/ut/` |
| Go UT | `cd component/taskd/tests/ut/go && bash run_test.sh` | `unit-tests.xml`、`cov.out`、`api.html` |
| Python UT | `cd component/taskd/tests/ut/python && bash run_test.sh` | `test.xml`、`api.html`、`htmlcov`、`coverage.xml` |
| ST framework 测试 | `cd component/taskd/tests/st && bash run_test.sh` | 先临时构建 `libtaskd.so`，再执行 `pytest tests/st/framework` |

注意：

- Go UT 依赖 `gocov`、`gocov-html`、`gotestsum`。
- Python UT 会安装 `tests/ut/python/requirements.txt`。
- ST 脚本会清理并重建 `taskd/python/cython_api/libs`。

### 7.3 部署

源内未发现 Taskd 独立 Kubernetes YAML 部署文件。基于构建脚本和包结构，已确认的交付方式是 Python wheel 携带 `libtaskd.so`，由训练任务或框架集成在运行时调用 `taskd.api` 初始化。

部署检查点：

1. 确认 wheel 中包含 `taskd/python/cython_api/libs/libtaskd.so`。
2. 确认训练容器环境变量满足所选框架要求：
   - PyTorch：`RANK`、`LOCAL_WORLD_SIZE`，以及 controller 需要的 `WORLD_SIZE`、`POD_IP`、`TTP_PORT`。
   - MindSpore：`MS_NODE_RANK`、`MS_WORKER_NUM` 或 `WORLD_SIZE`、`POD_IP`、`TTP_PORT`。
3. 若启用进程级恢复，确认 `PROCESS_RECOVER=on`。
4. 若使用本地 proxy，确认 `LOCAL_PROXY_ENABLE=on` 且端口 `9601/9602` 可用。
5. 确认 ClusterD recover gRPC 地址可由 `utils.GetClusterdAddr()` 解析，默认端口常量为 `8899`。

### 7.4 回滚

已确认源码没有 Taskd 专属部署清单，因此回滚以包版本切换为主：

1. 停止或重启承载训练任务的 Pod/进程。
2. 切回上一版本 taskd wheel，确保 wheel 内 `libtaskd.so` 与 Python 代码同版本。
3. 清理旧进程，避免旧 `libtaskd.so` 已加载但 Python 包被替换造成 ABI 不一致。
4. 重新启动训练任务，并检查 manager、agent、worker 日志。

### 7.5 常见失败模式

| 失败模式 | 可能原因 | 检查位置 |
|---|---|---|
| `libtaskd.so loaded failed` | wheel 缺少 so、so 路径错误、so 是符号链接、动态依赖缺失 | `taskd/python/cython_api/cython_api.py::load_lib_taskd` |
| Manager 初始化失败 | `InitTaskdManager` 不存在、JSON 配置不合法、Go manager 初始化失败 | `taskd/api/taskd_manager_api.py`、`taskd/go/backend_api.go::InitTaskdManager` |
| Agent 无法注册或收发消息失败 | proxy/manager 网络未启动、端口不可达、上游连接重建中 | `agent_network.py::AgentMessageManager`、`toolkit_backend/net/upstream_endpoint.go` |
| Worker 监控启动失败 | MSPTI 初始化失败、网络初始化超时、rank 环境变量错误 | `worker.go::InitMonitor`、`worker.py::init_worker` |
| Controller 初始化失败 | 缺少 `WORLD_SIZE`/`MS_WORKER_NUM`、`POD_IP`、`TTP_PORT` | `python/framework/manager/controller.py::init_controller` |
| 恢复信号未执行 | ClusterD 订阅失败、插件未获得 stream token、controller callback 未注册 | `manager.go::subscribeProcessManageSignal`、`businessStream.go::distributedToController` |
| 消息堆积或丢失 | `MsgQueue` 满、接收 buffer busy、网络 ack 超时 | `storage/datapool.go::MsgQueue.Enqueue`、`network.go::send2Buffer`、`downstream_endpoint.go::waitAck` |

## 8. 调试指南

### 8.1 Python API / C 共享库加载

| 症状 | 可能源区 | 建议检查 |
|---|---|---|
| API 初始化立即返回 False，日志提示 so 未加载 | `taskd/python/cython_api/cython_api.py` | 检查 `taskd/python/cython_api/libs/libtaskd.so` 是否存在且不是 symlink |
| `InitTaskdManager`、`InitWorker`、`InitTaskdProxy` 函数不存在 | `taskd/go/backend_api.go` 与实际 so ABI 不匹配 | 重新运行 `component/taskd/build/build_backend.sh`，确保 Python 包内 so 更新 |
| wheel 安装后版本不符合预期 | `component/taskd/setup.py`、`component/taskd/build/build.sh` | 检查 `BUILD_VERSION` 和 `service_config.ini` |

### 8.2 Manager 控制面

| 症状 | 可能源区 | 建议检查 |
|---|---|---|
| Manager 启动后无消息处理 | `application/msghandler.go::Start` | 检查 manager 监听地址、`POD_IP`、本地 proxy 配置 |
| 恢复动作未触发 | `application/businessStream.go::AllocateToken`、`StreamRun` | 检查插件 `Predicate` 是否返回 `candidate`，stream token 是否被占用 |
| ClusterD 信号收不到 | `manager.go::registerClusterD`、`subscribeProcessManageSignal` | 检查 ClusterD 地址、gRPC 连接和订阅流日志 |
| 上报 ClusterD 失败 | `manager.go::ReportControllerInfoToClusterd` | 检查 action 是否为 `recover_status`、`process_fault`、`recover_strategy`、`stop_complete` 之一 |

### 8.3 Agent / Controller

| 症状 | 可能源区 | 建议检查 |
|---|---|---|
| Agent 一直等待 message manager | `BaseAgent.check_network` | 检查 `AgentMessageManager` 是否初始化成功、proxy 是否可达 |
| MindSpore Agent 启动后 proxy 不通 | `taskd_agent_api.py::init_taskd_agent`、`taskd_proxy_api.py::init_taskd_proxy` | 检查 `MS_SCHED_HOST`、`MS_NODE_RANK`、proxy 日志 |
| Controller 报缺少环境变量 | `controller.py::init_controller` | 检查 `WORLD_SIZE` 或 `MS_WORKER_NUM`、`POD_IP`、`TTP_PORT` |
| Manager 下发 action 后 controller 无动作 | `controller.py::send_msg_to_controller` | 检查 action 是否在 `action_func_map` 中，MindIO TTP 版本是否支持对应函数 |

### 8.4 Worker / Profiling / OM

| 症状 | 可能源区 | 建议检查 |
|---|---|---|
| Worker 初始化失败，提示 invalid node rank | `python/framework/worker/worker.py::init_worker` | PyTorch 检查 `RANK`、`LOCAL_WORLD_SIZE`；MindSpore 检查 `MS_NODE_RANK` |
| profiling 无输出 | `worker.go::StartMonitor`、`worker/monitor/profiling` | 检查 MSPTI 初始化、profiling 开关、`/user/cluster-info/profiling` 写权限 |
| 网卡切换回调失败 | `worker.py::Worker._do_switch_nic` | 检查框架类型、`torch_npu` 或 MindSpore `_comm_switch_nic` 是否存在 |
| 压力检测返回 exec failed | `worker.py::Worker._exec_stress_test` | 检查 `torch_npu.npu.stress_detect` 或 `mindspore.utils.stress_detect` 可用性和 NPU device 设置 |

### 8.5 网络层

| 症状 | 可能源区 | 建议检查 |
|---|---|---|
| `client not inited` | `network.go::route`、`upstream_endpoint.go::joinTaskNetwork` | 检查上游地址、端口、proxy/manager 启动顺序 |
| `recv ack timeout` | `downstream_endpoint.go::waitAck` | 检查目标角色是否处理消息、网络流是否阻塞 |
| `no route` | `downstream_endpoint.go::uniCast`、`PathDiscovery` | 检查 path discovery 是否成功、routeTable 是否建立 |
| `qps exceeded` | `downstream_endpoint.go::limitQPS` | 检查消息风暴、重试频率、业务插件是否重复发送 |

## 9. 确定性边界

### 源码已确认

- Taskd 使用 Python + Go 双层架构，Python 通过 `ctypes` 加载 Go c-shared 产物 `libtaskd.so`。
- Manager 通过 ClusterD recover gRPC 订阅恢复、profiling、网卡切换、压力检测信号，并向 ClusterD 上报 controller 结果。
- Manager 内部存在 DataPool、MsgQueue、PluginHandler、StreamHandler、BusinessStreamProcessor 等白盒组件。
- Worker 侧负责 profiling、压力检测、网卡切换相关监控与回调。
- 网络层使用 gRPC，支持角色分层、注册、路径发现、同步/异步消息、广播、单播、上游重建。
- 构建脚本会先生成 `libtaskd.so`，再打包 Python wheel。
- 测试脚本覆盖 Go UT、Python UT 和 ST framework 测试。

### 基于证据的推断

- Taskd 的实际部署形态更可能是随训练任务 Python 环境和 wheel 一起分发，而不是独立 K8s Deployment；因为模块内未发现 Taskd 专属 YAML，且 `setup.py` 明确将 so 和 Python API 打包。
- 文档时序图中的 Ascend Operator、Volcano、Device Plugin、NodeD 交互由其他组件实现，Taskd 在其中承担训练进程控制面与恢复状态桥接角色。
- 插件内部恢复策略的完整业务语义需要进一步阅读 `manager/plugins/*` 目录；本设计文档只确认插件注册、业务流编排和消息分发框架。

### 缺失或未展开证据

- 未发现 Taskd 专属部署 YAML、Helm chart 或容器镜像 Dockerfile。
- 未展开全部 Python Agent 子类、全部 Manager 插件、profiling MSPTI 细节和 recover toolkit protobuf 细节。
- README 中 Taskd 只出现在总目录结构中，缺少 Taskd 组件级使用说明，因此运行参数主要来自源码与测试脚本。