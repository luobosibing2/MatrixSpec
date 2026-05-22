# Ascend Faultdiag 模块设计文档

## 1. 模块目的

Ascend Faultdiag 位于 `component/ascend-faultdiag`，是 MindCluster 中面向昇腾训练与推理场景的离线故障诊断组件。根据仓库 README，该组件提供日志清洗、故障诊断、单机诊断、超节点诊断、业务流日志清洗、根因节点清洗及诊断、故障事件清洗及诊断、自定义配置文件等能力。

从源码结构看，该模块由三类能力组成：

| 能力 | 主要目录 | 说明 |
|---|---|---|
| 命令行故障诊断工具 | `src/ascend_fd` | 提供 `ascend-fd` 命令，执行 parse、diag、single-diag、entity、blacklist、config 等操作 |
| 诊断工具包 | `toolkit_src/ascend_fd_tk` | 提供交互式/非交互式巡检、采集、分析、报告生成等工具链 |
| 构建、训练与辅助脚本 | `build/`、`platform/`、`scripts/` | 构建 wheel、训练内置模型、生成表达式解析器、配置转换、离线脚本工具 |

重要源码锚点：

| 锚点 | 作用 |
|---|---|
| `component/ascend-faultdiag/src/ascend_fd/cli.py::command_line` | 定义主 CLI 命令与参数，是用户入口 |
| `component/ascend-faultdiag/src/ascend_fd/controller/router.py::router` | 根据命令分发 parse、diag、single-diag、blacklist、entity、config |
| `component/ascend-faultdiag/src/ascend_fd/controller/controller.py::ParseController` | 负责日志清洗任务的输入发现、配置构建与多进程执行 |
| `component/ascend-faultdiag/src/ascend_fd/controller/controller.py::DiagController` | 负责诊断任务编排、根因聚类先行执行、结果导出 |
| `component/ascend-faultdiag/src/ascend_fd/controller/job_worker.py::generate_parse_job` | 定义 parse 子任务集合 |
| `component/ascend-faultdiag/src/ascend_fd/controller/job_worker.py::generate_diag_job` | 定义 diag 子任务集合 |
| `component/ascend-faultdiag/toolkit_src/ascend_fd_tk/cli.py::DiagToolCLI` | 诊断 toolkit 的交互式命令入口 |

## 2. 目录结构

模块目录可按主功能分为以下部分：

| 目录 | 职责 |
|---|---|
| `build/` | Ascend Faultdiag 构建入口，生成中英文 wheel 与 toolkit wheel |
| `platform/` | 构建前处理与模型训练脚本，包括表达式 parser 生成、知识库配置转换、随机森林/决策树模型训练 |
| `scripts/` | 辅助脚本，包括 Excel 生成、表达式转换、本地诊断、Top3 根因排序 |
| `src/ascend_fd` | 主故障诊断包，包含 CLI、控制器、模型、清洗、诊断、SDK、工具与输出包装 |
| `toolkit_src/ascend_fd_tk` | 辅助诊断 toolkit，包含采集器、fetcher、日志解析器、fault analyzer、巡检、报告、service 编排 |
| `test/` | DT/ST 测试、定制操作测试、清洗/诊断样例数据 |

`src/ascend_fd` 内部结构：

| 子目录 | 职责 |
|---|---|
| `configuration/` | 内置配置与错误码配置，如 `aicore-error-code-config-*.json` |
| `controller/` | 命令路由、任务控制、多进程任务集合 |
| `model/` | Parse/Diag 配置、清洗结果、根因诊断结果、节点和 MindIE 信息结构 |
| `module/mindie_trace_parser/` | MindIE trace/log 解析辅助逻辑 |
| `pkg/customize/` | 自定义知识实体和自定义配置管理 |
| `pkg/parse/` | 日志清洗主实现，按 knowledge_graph、root_cluster、node_anomaly、network_congestion、blacklist 划分 |
| `pkg/diag/` | 诊断主实现，按 knowledge_graph、root_cluster、node_anomaly、network_congestion 划分 |
| `sdk/` | 对外 SDK 接口，支持以结构化输入执行清洗/诊断 |
| `utils/` | 参数校验、安全文件操作、i18n、快速 parser、状态码、知识库配置加载等 |
| `wrapper/` | JSON 与表格输出包装 |

## 3. 核心组件

### 3.1 CLI 与命令路由

`ascend_fd/cli.py::command_line` 使用 `argparse` 定义以下命令：

| 命令 | 作用 |
|---|---|
| `version` | 输出组件版本 |
| `parse` | 清洗原始日志，生成 parser/analyzer 中间数据 |
| `diag` | 读取清洗结果并执行诊断 |
| `single-diag` | 单次执行清洗和诊断 |
| `entity` | 自定义故障实体 update/delete/show/check |
| `blacklist` | CANN 日志黑名单 add/delete/show/file |
| `config` | 自定义配置 update/check/show |

`ascend_fd/controller/router.py::router` 是命令分发中心：

- `parse`、`diag`、`single-diag` 进入 `_controller_func`，分别创建 `ParseController`、`DiagController` 或 `SingleDiagController`。
- `blacklist` 调用 `start_blacklist_job`。
- `entity` 调用 `start_entity_job`。
- `config` 调用 `start_config_job`。

源码确认点：

| 锚点 | 结论 |
|---|---|
| `cli.py::add_parse_arguments` | parse 支持 `input_path` 以及 bmc、lcne、host、device、train、process、env、dl、mindie、amct、bus、custom 等日志路径 |
| `cli.py::add_diag_arguments` | diag 要求输入清洗结果目录和输出目录，并支持 `--performance` 与 `--scene` |
| `router.py::router` | parse/diag/single-diag 统一打印任务 ID 与 run log 路径 |

### 3.2 ParseController：日志清洗控制器

`controller/controller.py::ParseController` 负责：

1. 校验输入命令中至少存在一个日志路径。
2. 校验 parse 输出目录在非 `single-diag` 场景下为空。
3. 根据显式参数或目录遍历发现日志目录。
4. 使用 `SaverFactory.list_savers_classes()` 生成日志 saver。
5. 调用 `generate_parse_job(performance_flag)` 生成清洗任务。
6. 使用 `MultiProcessJob` 并发执行清洗子任务。

源码确认点：

| 锚点 | 结论 |
|---|---|
| `ParseController._check_input_cmd` | 除输出、性能、任务 ID、命令外，所有输入路径为空会抛 `ParamError` |
| `ParseController._check_output_path_data` | parse 输出目录已有内容时抛 `PathError` |
| `ParseController._deep_find_input_path` | 支持从 `input_path` 下递归查找预设日志目录 |
| `ParseController.start_job` | parse 子任务以 4 进程池执行，所有 parse 子任务失败时抛 `InnerError` |

### 3.3 DiagController：诊断控制器

`controller/controller.py::DiagController` 负责：

1. 构造 `DiagCFG` 和 `ParsedDataSaver`。
2. 创建 `fault_diag_result` 输出目录。
3. 对训练场景执行根因聚类和知识图谱诊断。
4. 对推理场景先执行 MindIE 诊断，再按推理实例组循环执行训练侧诊断逻辑。
5. 使用 `PrintWrapper` 输出表格，用 `JsonWrapper` 生成诊断 JSON。

关键约束是：根因聚类诊断先于其他诊断执行。`DiagController.start_train_task` 先调用 `_exec_root_cluster_job()`，再并发执行 `generate_diag_job(performance_flag)` 返回的诊断任务。

源码确认点：

| 锚点 | 结论 |
|---|---|
| `DiagController.OUT_DIR` | 诊断结果固定进入 `fault_diag_result` 子目录 |
| `DiagController.start_job` | 推理任务会先执行 `MindIEDiagWorker(self.cfg).start_job()` |
| `DiagController.start_train_task` | root cluster 诊断必须先执行，用于确定待检测 worker/device 和故障过滤时间 |
| `DiagController._exec_root_cluster_job` | root cluster 结果为空、无法确定待检测设备或无故障描述时会抛异常 |
| `DiagController._export_results` | 输出同时包含表格显示和 JSON 文件写入 |

### 3.4 job_worker：任务集合生成

`controller/job_worker.py` 将任务集合拆成基础任务和性能任务：

| 函数 | 默认任务 | `performance=True` 增量任务 |
|---|---|---|
| `generate_parse_job` | `ROOT_CLUSTER`、`KNOWLEDGE_GRAPH` | `NODE_ANOMALY`、`NET_CONGESTION` |
| `generate_diag_job` | `KNOWLEDGE_GRAPH` | `NODE_ANOMALY`、`NET_CONGESTION` |

其中 node anomaly 和 network congestion 通过延迟 import 加载；import 失败会转换为 `InnerError`。

### 3.5 日志 Saver 与清洗输入模型

`pkg/parse/parser_saver.py` 定义 `BaseLogSaver`、`SaverFactory` 以及不同日志类型 saver。其作用是将命令行路径或 SDK 输入归一成后续 parser 可消费的数据结构。

已确认的 saver 机制：

| 锚点 | 结论 |
|---|---|
| `BaseLogSaver.__init_subclass__` | 子类自动注册到 `SaverFactory` |
| `SaverFactory.create_saver` | 根据 saver 类名创建实例 |
| `ProcessLogSaver.filter_log` | 递归扫描 process log 目录，收集 plog 与 device log |
| `ProcessLogSaver.get_plog_dict` | 按 PID 汇总 plog 文件 |
| `ProcessLogSaver.get_device_log_dict` | 按 PID 汇总 device log 文件 |

`model/parse_info.py::KGParseFilePath` 是知识图谱清洗的统一文件路径结构，包含：

- `plog_path`
- `device_log_path`
- `npu_info_path`
- `train_log_path`
- `host_log_path`
- `host_dmesg_path`
- `slog_path`
- `noded_log_path`
- `device_plugin_path`
- `volcano_scheduler_path`
- `mindie_log_path`
- `bmc_*`
- `lcne_log_path`
- `bus_log_path`
- `custom_log_list`

### 3.6 Knowledge Graph 清洗

`pkg/parse/knowledge_graph/kg_parse_job.py` 负责知识图谱清洗入口：

| 锚点 | 结论 |
|---|---|
| `start_kg_parse_job` | 创建 `SingleJsonFileProcessing(get_parse_ctx(cfg))`，导出 JSON 文件与 MindIE cluster info |
| `get_single_parse_data` | `single-diag` 场景直接返回单次清洗数据 |
| `get_parse_ctx` | 通过 `SaverCollector` 生成 `KGParseCtx`，并进行文件数量/大小校验和空输入校验 |
| `SaverCollector` | 从各类 saver 中收集 plog、device、host、MindIE、BMC、LCNE、custom 等路径 |

清洗结果会进入后续 `kg_diag_job` 或 `single_diag_job`，用于知识图谱推理。

### 3.7 Root Cluster 清洗与诊断

Root Cluster 逻辑用于识别通信域、rank、device 与根因节点关系。

关键结构和流程：

| 锚点 | 结论 |
|---|---|
| `pkg/diag/root_cluster/rc_diag_job.py::RCDiagWorker` | root cluster 诊断主类 |
| `RCDiagWorker.assemble_rc_parser` | 优先读取 `rc-parser.json`；不存在时对旧版本 plog parser 输出进行兼容解析 |
| `RCDiagWorker.update_cluster_level_parameters` | 计算断点续训时间、恢复时间、最晚 lagging 时间、训练开始/结束时间 |
| `RCDiagWorker._get_device_instance` | 根据 plog base/rank 信息构建设备实例并维护通信域 |
| `RCDiagWorker._generate_checker` | 根据集群训练状态、基础信息完整性选择不同 checker |
| `start_rc_diag_job` | root cluster 诊断入口，返回 `RCDiagResult` |

`model/diag_info.py::RCDiagResult` 表示 root cluster 诊断结果，字段包括：

- `analyze_success`
- `fault_description`
- `root_cause_device`
- `device_link`
- `remote_link`
- `first_error_device`
- `last_error_device`
- `fault_filter_time`
- `mindie_error_device`
- `detect_workers_devices`

### 3.8 Knowledge Graph 诊断与推理引擎

知识图谱诊断由 `pkg/diag/knowledge_graph/kg_diag_job.py` 和 `kg_engine/` 完成。

主要流程：

1. 根据 root cluster 输出的 `root_worker_devices` 选择每个 worker 的待分析设备。
2. 若存在预分析文件，则执行 `pre_analyze_job`。
3. 否则对每个 worker 并发执行 `_kg_diag_job`。
4. 汇总各 worker root cause。
5. 合并相同故障码的事件属性、故障源和故障链。
6. 输出排序后的 `fault`、`note_msgs`、`version_info`、失败子任务等信息。

源码确认点：

| 锚点 | 结论 |
|---|---|
| `kg_diag_job.start_kg_diag_job` | worker 级知识图谱诊断使用 `MultiProcessJob` 并发执行 |
| `kg_diag_job.hand_all_root_cause` | 合并多 worker 的 root cause，并生成最终 `kg_result` |
| `kg_diag_job.handle_root_cause` | 按故障码聚合 `event_attr`、`fault_chains`、`fault_source` |
| `kg_engine/kg_engine_main.py::kg_engine_analyze` | 捕获推理异常并返回 `Response`，失败时 `analyze_success=False` |
| `kg_engine/graph/graph_builder.py::GraphBuilder` | 根据 schema 和 package data 构建图、加边、推断设备 |

`GraphBuilder` 的推理设计：

| 阶段 | 代码锚点 | 行为 |
|---|---|---|
| 事件有效性判断 | `GraphBuilder._judge_event` | 判断是否存在底层有效故障事件；train call 类故障仅在无有效故障时展示 |
| 顶点构建 | `GraphBuilder._add_vertices` | 将事件映射为图顶点 |
| 边构建 | `GraphBuilder._add_edges`、`_match_vertex` | 根据知识库 rule 与表达式匹配建立故障传播关系 |
| 设备推断 | `GraphBuilder._infer_device`、`_in_vertex_set_device` | 当链路中存在 root device 时，将 Unknown 设备推断为根设备 |

### 3.9 自定义知识实体与配置

自定义实体位于 `pkg/customize/custom_entity`，自定义配置位于 `pkg/customize/custom_config`。

`custom_entity/custom_check.py::EntityChecker` 负责校验用户自定义知识实体：

| 校验点 | 源码锚点 |
|---|---|
| 不允许覆盖默认实体 | `EntityChecker.check` |
| 实体 code 格式校验 | `EntityChecker.check` |
| 必填字段校验 | `EntityChecker.entity_check` |
| `source_file` 校验 | `EntityChecker._source_file_check` |
| `attribute` 字段校验 | `EntityChecker._attribute_check` |
| 禁止自定义 `regex.regex` | `EntityChecker._regex_check` |

必填字段包括 `attribute.class`、`attribute.component`、`attribute.module`、`attribute.cause_*`、`attribute.description_*`、`attribute.suggestion_*`、`source_file`、`regex.in`。具体语言后缀由 `utils.i18n::LANG` 决定。

### 3.10 SDK 接口

`src/ascend_fd/sdk` 提供结构化输入接口，适用于外部系统集成。

| 文件 | 主要接口 | 作用 |
|---|---|---|
| `kg_parse_interface.py` | `parse_knowledge_graph` | 传入结构化日志列表，返回知识图谱清洗结果与错误列表 |
| `kg_diag_interface.py` | `diag_knowledge_graph` | 传入 kg-analyzer 或 CCAE fault 格式，返回诊断结果与错误列表 |
| `rc_parse_interface.py` | `parse_root_cluster` | 传入 plog/MindIE 结构化日志，返回 root cluster parse 结果 |
| `rc_diag_interface.py` | 未展开分析 | 从文件名推断为 root cluster 诊断 SDK 接口 |
| `fault_type_parse_interface.py` | 未展开分析 | 从文件名推断为故障类型解析接口 |

源码确认点：

| 锚点 | 结论 |
|---|---|
| `kg_parse_interface.parse_knowledge_graph` | 执行参数校验、自定义实体临时更新、逐 server 清洗 |
| `kg_parse_interface.input_params_validation` | SDK 输入包含 `log_domain.server` 和 `log_items`，每个 item 可含 `item_type`、`path`、`device_id`、`log_lines`、`modification_time`、`component` |
| `kg_diag_interface.diag_knowledge_graph` | 多 server 诊断通过 `MultiProcessJob` 并发执行 |
| `kg_diag_interface.process_input` | 支持 `source=ccae` 的 fault 列表转换为 kg-analyzer |
| `rc_parse_interface.parse_root_cluster` | 支持按 server、instance_id、pid、device_id、rank_id、log_lines 解析 root cluster 信息 |

### 3.11 Toolkit 子系统

`toolkit_src/ascend_fd_tk` 是单独的诊断工具包源码，构建产物为 `ascend_faultdiag_toolkit*.whl`。

主要结构：

| 子目录 | 职责 |
|---|---|
| `core/cli_module` | 命令模型与上下文 |
| `core/collect` | 主机、BMC、HCCS、交换机等信息采集与 fetcher |
| `core/context` | 诊断上下文与 analyzer 注册机制 |
| `core/crypto` | 密钥与加密 |
| `core/fault_analyzer` | BMC、HCCS、Host、Switch、光模块等故障分析器 |
| `core/inspection` | 巡检检查项与配置 |
| `core/log_parser` | 本地/远端日志解析 |
| `core/model` | 采集与诊断领域模型 |
| `core/report` | Excel/表格报告生成 |
| `core/service` | 自动采集、自动诊断、巡检、报告、缓存等服务编排 |
| `examples/` | 自动诊断、巡检、loopback 诊断示例 |
| `utils/` | 压缩、CSV、Excel、文件、表格、日志、执行器等工具 |

源码确认点：

| 锚点 | 结论 |
|---|---|
| `toolkit_src/ascend_fd_tk/cli.py::DiagToolCLI` | 支持交互式命令行，读取用户输入并派发到 CLI context |
| `toolkit_src/ascend_fd_tk/cli.py::run_parser` | 支持非交互式参数解析，按命令模型逐个执行 |
| `toolkit_src/ascend_fd_tk/core/service/auto_diag.py::AutoDiag.run` | 动态扫描并注册 `core.fault_analyzer`，逐个 analyzer 执行 `analyse()` |

## 4. 核心流程

### 4.1 parse 流程

```text
ascend-fd parse
  -> cli.command_line
  -> router.router
  -> ParseController
  -> init_cfg / SaverFactory / BaseLogSaver.filter_log
  -> generate_parse_job
     -> ROOT_CLUSTER: start_rc_parse_job
     -> KNOWLEDGE_GRAPH: start_kg_parse_job
     -> performance=True 时增加 NODE_ANOMALY / NET_CONGESTION
  -> MultiProcessJob 并发执行
  -> 输出 parser/analyzer JSON
```

关键约束：

- 至少需要一个输入路径或日志类型参数。
- 非 `single-diag` 场景下输出目录必须为空。
- `--performance` 才会执行 node anomaly 和 network congestion 的清洗。

### 4.2 diag 流程

```text
ascend-fd diag
  -> cli.command_line
  -> router.router
  -> DiagController
  -> ParsedDataSaver 加载清洗结果
  -> start_train_task
     -> _exec_root_cluster_job
        -> start_rc_diag_job
        -> 产生 detect_workers_devices / fault_filter_time
     -> generate_diag_job
        -> KNOWLEDGE_GRAPH
        -> performance=True 时增加 NODE_ANOMALY / NET_CONGESTION
     -> MultiProcessJob 并发执行
  -> PrintWrapper 表格输出
  -> JsonWrapper 生成 diag_report.json
```

关键约束：

- root cluster 诊断先行，是后续知识图谱诊断的输入边界。
- root cluster 无法获得待检测 worker/device 时，诊断会终止。
- 推理任务会先执行 MindIE 诊断，并按推理实例组输出独立诊断报告。

### 4.3 single-diag 流程

```text
ascend-fd single-diag
  -> SingleDiagController
  -> ParseController.start_single_parse
  -> DiagController.start_single_diag_job
  -> single_diag_job
  -> 输出 fault_diag_result/diag_report.json
```

该流程不经过落盘后的 parse 输入目录，而是用内存中的单次清洗结果直接诊断。

### 4.4 SDK 清洗/诊断流程

```text
外部系统传入结构化日志列表
  -> sdk/kg_parse_interface.py::parse_knowledge_graph
  -> 参数 SchemaValidator 校验
  -> KnowledgeGraphParser 创建 saver
  -> get_parse_ctx
  -> PackageParser.parse
  -> 返回格式化清洗结果
```

```text
外部系统传入 kg-analyzer 或 CCAE fault 列表
  -> sdk/kg_diag_interface.py::diag_knowledge_graph
  -> process_input / transform_kg_parser_to_kg_analyzer
  -> diagnose_server
  -> pre_analyze_job
  -> hand_all_root_cause
  -> JsonWrapper.export_kg_sdk_results
```

### 4.5 构建流程

`build/build.sh` 的源码确认流程：

1. 设置 `PYTHONPATH=${ROOT_PATH}/src:${ROOT_PATH}/toolkit_src:$PYTHONPATH`。
2. 训练网络随机森林模型：`platform/net_model_training/rf_train.py`。
3. 训练资源诊断决策树模型：`platform/res_model_training/decision_tree_train.py`。
4. 初始化表达式 parser：`platform/expr_parser_initializing/generate_parser_out.py`。
5. 读取 `service_config.ini` 中的版本号，默认构建版本在脚本中为 `7.3.0`，存在配置文件时以配置文件为准。
6. 调用 `src/setup_linux.py --mode zh ... bdist_wheel` 构建 `ascend-faultdiag`。
7. 调用 `platform/international_pkg_config.py` 将 `ascend_fd` 转为 `alan_fd` 并构建英文包 `alan-faultdiag`。
8. 调用 `toolkit_src/setup.py bdist_wheel` 构建 toolkit wheel。
9. 输出文件复制到 `component/ascend-faultdiag/output/`，并设置 wheel 权限为 `640`。

源码锚点：

| 锚点 | 结论 |
|---|---|
| `build/build.sh::train_net_model` | 构建时训练并复制网络随机森林模型到 `src/ascend_fd/configuration/model/` |
| `build/build.sh::train_res_model` | 构建时训练并复制 CPU decision tree 模型 |
| `build/build.sh::init_kg_engine_expr_parser` | 构建前生成知识图谱表达式 parser 输出 |
| `build/build.sh::compile_build` | 构建中英文 faultdiag wheel |
| `build/build.sh::diag_tool_build` | 构建 toolkit wheel |
| `src/setup_utils.py::get_setup_config` | Python 依赖声明为 `ply>=3.11`，`python_requires >=3.7`，console script 为 `ascend-fd=ascend_fd.cli:main` |

## 5. 接口与数据结构

### 5.1 CLI 参数接口

| 命令 | 关键输入 | 关键输出 |
|---|---|---|
| `parse` | 原始日志目录或按类型传入的日志目录 | 清洗 JSON 数据 |
| `diag` | parse 输出目录 | `fault_diag_result/diag_report.json` |
| `single-diag` | 原始日志目录或按类型传入的日志目录 | `fault_diag_result/diag_report.json` |
| `entity` | 自定义实体 JSON、故障码、显示 item | 用户自定义实体操作结果 |
| `blacklist` | 关键词、ID、文件 | 黑名单配置变更或展示 |
| `config` | 自定义配置 JSON | 配置变更、校验或展示 |

### 5.2 配置对象

| 数据结构 | 文件 | 字段/作用 |
|---|---|---|
| `ParseCFG` | `model/cfg.py` | parse 任务配置，包含 task_id、输入输出路径、各类 log saver |
| `DiagCFG` | `model/cfg.py` | diag 任务配置，包含 task_id、输入输出路径、ParsedDataSaver、root_worker_devices、fault_filter_time |
| `KGParseCtx` | `model/context.py` | KG 清洗上下文，包含 `KGParseFilePath`、断点续训时间、SDK 输入标记、自定义信息 |
| `KGParseFilePath` | `model/parse_info.py` | 汇总各类日志路径 |
| `RCDiagResult` | `model/diag_info.py` | root cluster 诊断结果 |

注意：`DiagCFG.root_worker_devices` 和 `DiagCFG.fault_filter_time` 在源码中定义为类属性形式，而不是 dataclass 字段形式；这意味着设计上应谨慎评估多实例/并发情况下是否存在共享状态风险。

### 5.3 知识图谱诊断输出

`kg_diag_job.start_kg_diag_job` 注释中明确最终结果包含：

| 字段 | 说明 |
|---|---|
| `analyze_success` | 诊断是否成功 |
| `fault` | 故障列表 |
| `fault[].code` | 故障错误码 |
| `fault[].class/component/module/...` | 来自知识实体 attribute |
| `fault[].event_attr` | 设备维度的事件属性 |
| `fault[].fault_source` | 根因设备或 worker 列表 |
| `fault[].fault_chains` | 故障传播链 |
| `note_msgs` | 诊断提示 |
| `version_info` | 组件版本信息 |
| `failed_jobs` | 部分失败子任务信息 |

## 6. 关键约束

### 6.1 输入与路径约束

| 约束 | 源码锚点 |
|---|---|
| parse 至少需要一个有效输入路径 | `ParseController._check_input_cmd` |
| parse 输出目录必须为空 | `ParseController._check_output_path_data` |
| KG 清洗输入不能为空 | `SaverCollector.validate_all_emtpy` |
| SDK 输入列表存在数量上限 | `kg_parse_interface.MAX_SERVER_NUM_LIMIT`、`rc_parse_interface.MAX_SERVER_NUM_LIMIT` |
| SDK `device_id` 范围限制为 `0..15` | `kg_parse_interface.MAX_DEVICE_NUM`、`rc_parse_interface.MAX_DEVICE_NUM` |

### 6.2 执行顺序约束

| 约束 | 源码锚点 |
|---|---|
| diag 必须先执行 root cluster 诊断 | `DiagController.start_train_task` |
| root cluster 失败会阻断后续诊断 | `DiagController._exec_root_cluster_job` |
| performance 模块需显式开启 | `generate_parse_job`、`generate_diag_job` |
| 推理场景需要先执行 MindIE 诊断 | `DiagController.start_job` |

### 6.3 知识库与自定义实体约束

| 约束 | 源码锚点 |
|---|---|
| 自定义实体不能覆盖默认实体 | `EntityChecker.check` |
| 自定义实体 code 必须合法 | `EntityChecker.check` |
| 自定义实体必须包含核心 attribute、source_file、regex.in | `EntityChecker.entity_check` |
| 用户不能自定义 `regex.regex` | `EntityChecker._regex_check` |
| rule 校验会检查目标实体存在性 | `EntityChecker.entity_check` 调用 `CHECK_MAP.get("rule")` |

### 6.4 构建约束

| 约束 | 源码锚点 |
|---|---|
| Python 版本要求 `>=3.7` | `src/setup_utils.py::get_setup_config` |
| wheel 构建依赖至少包含 `ply>=3.11` | `src/setup_utils.py::get_setup_config` |
| 完整构建会训练模型并生成 parser | `build/build.sh::main` |
| 构建输出在 `output/` | `build/build.sh` 中 `OUTPUT_PATH` |

README 还声明性能相关依赖包括 `scikit-learn>=1.3.0`、`pandas>=1.3.5`、`numpy>=1.21.6,<2.0.0`、`joblib>=1.2.0,<1.5.0`、`ply>=3.11`。源码 `setup_utils.py` 只将 `ply>=3.11` 写入 `install_requires`，其余依赖更多体现在 README 和构建/测试运行需求中。

## 7. 运维 Runbook

### 7.1 构建

| 步骤 | 命令/文件 | 说明 |
|---|---|---|
| 进入模块目录 | `cd component/ascend-faultdiag` | README 指定构建位置 |
| 执行构建 | `bash build/build.sh` | 训练模型、初始化 parser、构建中英文包和 toolkit 包 |
| 查看输出 | `component/ascend-faultdiag/output/` | 预期生成 `ascend_faultdiag*.whl`、`alan_faultdiag*.whl`、`ascend_faultdiag_toolkit*.whl` |

失败模式：

| 症状 | 可能原因 | 检查点 |
|---|---|---|
| `network random forest training error` | `rf_train.py` 未生成模型文件 | `platform/net_model_training/rf_train.py`、`platform/net_model_training/net_rf_model_latest.pt` |
| `cpu decision tree training error` | `decision_tree_train.py` 未生成模型文件 | `platform/res_model_training/decision_tree_train.py`、`cpu_decision_tree_latest.pkl` |
| 构建 wheel 失败 | setup 参数、包目录或权限问题 | `src/setup_linux.py`、`src/setup_utils.py`、`build/build.sh::compile_build` |
| 英文包构建失败 | 包名转换后路径异常 | `platform/international_pkg_config.py`、`build/build.sh::compile_build` |

### 7.2 验证

| 验证类型 | 命令/入口 | 说明 |
|---|---|---|
| DT 测试 | `bash test/run_dt.sh` | 安装开发模式、训练模型、运行 pytest 与覆盖率 |
| CLI 基础验证 | `ascend-fd version` | 验证 console script 和 Version.info |
| parse 验证 | `ascend-fd parse -i <origin_log_dir> -o <empty_output_dir>` | 验证日志清洗 |
| diag 验证 | `ascend-fd diag -i <parse_output_dir> -o <diag_output_dir>` | 验证诊断输出 |
| single-diag 验证 | `ascend-fd single-diag -i <origin_log_dir> -o <diag_output_dir>` | 验证单次清洗诊断 |

源码锚点：

| 锚点 | 说明 |
|---|---|
| `test/run_dt.sh::build_ascend_fd` | 测试前以 develop 模式安装 |
| `test/run_dt.sh::run_test` | 使用 pytest，生成 junit、html、coverage xml/html |
| `cli.py::show_version` | version 命令输出组件版本 |

### 7.3 部署

可确认的部署方式是 Python wheel 安装：

1. 构建 wheel。
2. 安装 `ascend_faultdiag*.whl`。
3. 使用 `ascend-fd` 命令执行 parse/diag/single-diag。
4. 如需 toolkit，安装 `ascend_faultdiag_toolkit*.whl`，使用 toolkit CLI。

README 中声明 Ascend FaultDiag 安装详情位于 `docs/zh/faultdiag/installation_guide.md`，本模块源码分析未展开该文档内容。

### 7.4 回滚

源码未提供专门的回滚脚本。基于构建产物形式，实际回滚边界为 Python 包版本：

| 场景 | 建议动作 |
|---|---|
| 新版本 CLI 异常 | 卸载当前 wheel，重新安装上一版本 wheel |
| 构建生成的模型异常 | 回退到上一版本 wheel 或上一版 `configuration/model/` 内置模型 |
| 自定义实体导致诊断异常 | 使用 `entity --delete` 或恢复默认知识库配置 |
| 自定义配置异常 | 使用 `config --check` 校验后再 `config --update` |

以上回滚策略为基于 wheel 分发和 CLI 功能的推断；仓库证据中未发现专门 rollback 命令。

### 7.5 常见失败模式

| 症状 | 可能源区 | 检查命令/文件 |
|---|---|---|
| parse 报 “All input path parameters are empty” | CLI 输入参数 | `ascend_fd/controller/controller.py::ParseController._check_input_cmd` |
| parse 报输出目录非空 | 输出路径 | `ParseController._check_output_path_data` |
| KG parse 报无有效日志 | saver 收集或输入目录结构 | `kg_parse_job.SaverCollector.validate_all_emtpy`、检查 `process_log/`、`device_log/`、`mindie_log/` 等 |
| diag 报 root cluster 失败 | root cluster parser/诊断 | `pkg/diag/root_cluster/rc_diag_job.py::RCDiagWorker`、输出中的 `rc-parser.json` |
| diag 报待检测 worker/device 为空 | root cluster 未识别通信域或设备 | `DiagController._exec_root_cluster_job`、`RCDiagResult.detect_workers_devices` |
| KG 诊断无根因 | 知识库实体、regex、rule 或 parser 输出缺失 | `pkg/diag/knowledge_graph/kg_diag_job.py`、`kg_engine/graph/graph_builder.py` |
| 自定义实体 check 失败 | 用户知识实体格式 | `pkg/customize/custom_entity/custom_check.py::EntityChecker` |
| MindIE 推理场景报告缺失 | MindIE 日志解析或实例组映射 | `DiagController.start_job`、`module/mindie_trace_parser/`、`pkg/diag/root_cluster/rc_diag_job.py::add_mindie_error_device` |

## 8. 调试指南

### 8.1 CLI 与任务分发

| 症状 | 可能源区 | 检查点 |
|---|---|---|
| 命令不存在或参数校验失败 | `cli.py` | `command_line`、`add_parse_arguments`、`add_diag_arguments` |
| 命令没有进入预期控制器 | `router.py` | `router`、`_controller_func` |
| 任务 ID 或日志路径显示异常 | `cli.py`、`configuration/config.py` | `generate_task_id`、`RUN_LOG_FORMAT` |

### 8.2 日志清洗

| 症状 | 可能源区 | 检查点 |
|---|---|---|
| 指定目录找不到日志 | `ParseController._deep_find_input_path` | 目录名是否匹配 saver 的 `CENTRALIZED_STORAGE_DIRECTORY` |
| plog/device log 未被收集 | `ProcessLogSaver` | 文件名是否以 `plog-` 或 `device-` 开头并匹配正则 |
| SDK 清洗输入被拒绝 | `kg_parse_interface.input_params_validation` | `log_domain`、`log_items`、`item_type`、`log_lines` 格式 |
| 自定义日志不生效 | `CustomLogSaver`、`CustomLogParser` | `custom_log` 参数、自定义实体 `source_file` 与 parser 映射 |

### 8.3 Root Cluster

| 症状 | 可能源区 | 检查点 |
|---|---|---|
| 无法识别 rank | `RCDiagWorker._get_device_instance` | `PlogPidParseInfo.base.rank_map` |
| 通信域 rank 数不一致 | `RCDiagWorker._get_device_instance` | identifier 的 `rank_num` 是否一致 |
| 旧版本清洗结果兼容失败 | `RCDiagWorker.assemble_rc_parser` | 是否存在 `rc-parser.json`；若不存在则检查 `plog-parser-*.log` |
| 断点续训时间异常 | `RCDiagWorker.update_cluster_level_parameters` | `start_resumable_training_time`、`recovery_success_time`、`lagging_time` |

### 8.4 Knowledge Graph

| 症状 | 可能源区 | 检查点 |
|---|---|---|
| 知识图谱没有故障链 | `GraphBuilder._add_edges` | 知识库 rule 的 `dst_code` 和 expression 是否匹配 |
| Unknown 设备未被推断 | `GraphBuilder._infer_device` | `PackageData.root_device_list` 是否存在 |
| 自定义 CANN/PyTorch/MindIE 故障未识别 | `GraphBuilder._handle_schema_entity` | 故障码前缀是否匹配对应 common entity |
| 所有 KG 子任务失败 | `kg_diag_job.start_kg_diag_job` | worker parser 文件、`kg-analyzer` 数据、知识库配置 |

### 8.5 Toolkit

| 症状 | 可能源区 | 检查点 |
|---|---|---|
| 交互式命令未知 | `toolkit_src/ascend_fd_tk/cli.py::DiagToolCLI.process_command` | `cli_ctx.is_cmd_valid(cmd)` |
| 非交互式参数未执行 | `toolkit_src/ascend_fd_tk/cli.py::run_parser` | 参数是否与 `cli_model_map` 中命令匹配 |
| 自动诊断无结果 | `core/service/auto_diag.py::AutoDiag.run` | analyzer 是否被 `recursive_scan_and_register` 注册 |
| 采集连接失败 | `toolkit_src/ascend_fd_tk/conn.ini`、`core/collect/fetcher` | host/bmc/switch 连接配置 |

## 9. 源码确认与推断边界

### 9.1 源码确认事实

- Ascend Faultdiag 主 CLI 入口由 `src/ascend_fd/cli.py` 提供。
- 命令路由由 `src/ascend_fd/controller/router.py` 负责。
- parse、diag、single-diag 分别由 `ParseController`、`DiagController`、`SingleDiagController` 控制。
- parse 默认执行 root cluster 与 knowledge graph 清洗；开启 performance 后增加 node anomaly 与 network congestion。
- diag 默认先执行 root cluster，再执行 knowledge graph；开启 performance 后增加 node anomaly 与 network congestion。
- Knowledge Graph 引擎通过 schema、package data 构图，并根据 rule/expression 建立事件边。
- 构建脚本会训练随机森林模型、决策树模型、生成表达式 parser，并构建中英文包与 toolkit 包。
- toolkit 是独立 wheel 源码，提供交互式命令行、采集、分析、巡检和报告服务。

### 9.2 推断行为

- `toolkit_src` 与 `src/ascend_fd` 同属 Ascend Faultdiag 模块，但运行入口和分发包相对独立；该结论基于 `build/build.sh::diag_tool_build` 单独构建 toolkit wheel。
- wheel 版本回滚是主要回滚方式；该结论基于构建产物形态推断，源码未提供专门 rollback 脚本。
- `rc_diag_interface.py` 与 `fault_type_parse_interface.py` 的完整接口行为未展开读取，仅根据文件名和 SDK 目录职责判断其边界。

### 9.3 缺失或未展开证据

- 未展开 `docs/zh/faultdiag/installation_guide.md`、`user_guide.md`、`api/README.md` 的详细安装/API 文档。
- 未逐一展开所有 parser，例如 `amct_log_parser.py`、`cann_log_parser.py`、`mindie_parser.py`、`npu_info_parser.py` 等，因此各日志格式的精确 regex 和字段映射需以对应 parser 源码为准。
- 未逐一展开 node anomaly、network congestion、resource preemption 的算法细节；已确认其由 `--performance` 控制加载。
- 未展开全部 toolkit collector/fetcher/analyzer，因此 toolkit 每类硬件采集协议和字段需以 `toolkit_src/ascend_fd_tk/core/collect` 与 `core/fault_analyzer` 源码为准。