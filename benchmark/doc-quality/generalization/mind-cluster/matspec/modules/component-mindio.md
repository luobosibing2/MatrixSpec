# Mindio 模块中间设计文档

## 1. 模块定位

Mindio 位于 `component/mindio`，在当前代码树中包含两个主要子模块：

| 子模块 | 目录 | 主要用途 | 证据锚点 |
|---|---|---|---|
| MindIO ACP | `component/mindio/acp` | 面向大模型 CheckPoint 保存、加载、预加载与异步落盘加速；通过内存文件系统 MemFS 先写入训练服务器内存，再异步写入后端可靠存储。 | `component/mindio/acp/README.md`，模块介绍；`component/mindio/acp/python_whl/mindio_acp/mindio_acp/__init__.py`，公开 Python API |
| MindIO TFT | `component/mindio/tft` | 面向训练容错，包含临终保存 CheckPoint、进程级在线恢复、进程级重调度、UCE、ARF 等能力。 | `component/mindio/tft/README.md`，模块介绍；`component/mindio/tft/src/csrc/framework/controller/controller.h`，`Controller` 状态协同入口 |

本模块文档以 `component/mindio/acp` 为主要白盒分析对象，因为给定 Module files 主要覆盖 ACP；TFT 作为同级 Mindio 子模块按已读 README 与接口头文件给出边界说明。

## 2. 目录结构

### 2.1 顶层结构

```text
component/mindio/
├── build/
│   └── build.sh
├── acp/
│   ├── build/
│   ├── doc/
│   ├── python_whl/
│   ├── scripts/
│   ├── src/
│   └── test/
└── tft/
    ├── build/
    ├── doc/
    ├── src/
    └── test/
```

### 2.2 ACP 目录分层

| 目录 | 职责 | 关键文件 |
|---|---|---|
| `acp/doc` | ACP API 与环境变量文档 | `Interface_description/API接口参考.md`、`环境变量.md` |
| `acp/python_whl/mindio_acp/mindio_acp` | Python 包源码，向 PyTorch、MindSpore、Megatron 暴露接口 | `__init__.py`、`acc_io/`、`acc_checkpoint/`、`ms/` |
| `acp/src/memfs` | C++ 内存文件系统服务端核心 | `memfs_api.h`、`fs/mem_file_system.h`、`sdk/memfs/...` |
| `acp/src/sdk/memfs` | MemFS 客户端 SDK、IPC client/server、Python C 扩展桥接 | `sdk/memfs_sdk_api.h`、`python_sdk/c2python_api.cpp` |
| `acp/src/background` | 后台异步备份、重试线程池、文件追踪 | `background_manager.h`、`backup/backup_target.h` |
| `acp/src/ufs` | 底层文件服务抽象，屏蔽后端存储读写差异 | `ufs_api.h`、`under_fs_manager.h` |
| `acp/src/util` | daemon 入口 | `ockio_daemon.cpp` |
| `acp/test` | C++ 单测、fuzz、测试工具 | `unit_test/`、`test_dt_fuzz/`、`tools/` |
| `acp/python_whl/mindio_acp/tests` | Python 单测 | `acc_io/`、`acc_checkpoint/` |

## 3. 核心组件

### 3.1 Python API 门面

`component/mindio/acp/python_whl/mindio_acp/mindio_acp/__init__.py` 是 Python 包入口，公开：

| API | 来源 | 用途 |
|---|---|---|
| `initialize` | `acc_io.acc_io.initialize` | 初始化 MemFS client 与默认 daemon 参数 |
| `save` | `acc_io.acc_io.save` | 保存对象，默认走 `memfs` |
| `multi_save` | `acc_io.acc_io.multi_save` | 多路径保存 |
| `load` | `acc_io.acc_io.load` | 加载 MindIO ACP 或 torch 文件 |
| `preload` | `acc_io.acc_io.preload` | 从真实文件预加载到 MemFS |
| `flush` | `acc_io.acc_io.flush` | 等待后台任务完成 |
| `register_checker` | `acc_io.acc_io.register_checker` | 注册异步完整性检查回调 |
| `convert` | `acc_io.convert.convert` | MindIO 格式转 torch zip 格式 |
| `open_file` / `create_file` | `ms.ms` | MindSpore 风格文件读写上下文 |
| `CheckpointHelper` | `acc_checkpoint.framework_acp.CheckpointHelper` | Megatron/大模型 checkpoint 辅助能力 |

证据锚点：`__init__.py` 的 `__all__`；`acc_io/acc_io.py` 中 `save`、`load`、`multi_save`、`preload`、`flush`；`ms/ms.py` 中 `open_file`、`create_file`。

### 3.2 `acc_io` 读写链

`acc_io` 使用责任链实现多级降级：

| 链路 | 关键类/函数 | 行为 |
|---|---|---|
| 写链 | `create_write_chain`、`MemFsWriteHandler`、`FWriteHandler`、`TorchWriteHandler` | 默认先尝试 MemFS；失败后尝试 C fopen；再失败则回退 `torch.save` |
| 读链 | `create_read_chain`、`MemFsReadHandler`、`NdsReadHandler`、`FReadHandler`、`TorchReadHandler` | 默认先尝试 MemFS；失败后尝试 NDS、fopen、`torch.load` |
| MindSpore 文件 API | `_ReadableFileWrapper`、`_WriteableFileWrapper` | `open_file`/`create_file` 提供上下文管理器，失败时从 MemFS 降级到 fopen |
| 格式转换 | `convert` | 读取 MindIO 文件尾部 `mindio\0` 标记和 record map，写入 torch zipfile |

证据锚点：
- `component/mindio/acp/python_whl/mindio_acp/mindio_acp/acc_io/write_handler.py`：`create_write_chain` 说明写入降级顺序。
- `component/mindio/acp/python_whl/mindio_acp/mindio_acp/acc_io/read_handler.py`：`create_read_chain` 说明读取降级顺序。
- `component/mindio/acp/python_whl/mindio_acp/mindio_acp/ms/ms.py`：`_ReadableFileWrapper`、`_WriteableFileWrapper` 说明 MindSpore 文件接口。
- `component/mindio/acp/python_whl/mindio_acp/mindio_acp/acc_io/convert.py`：`convert` 说明 MindIO 到 torch 格式转换。

### 3.3 序列化与文件格式

`acc_io/serialization.py` 基于 PyTorch serialization 机制处理 tensor storage：

| 数据结构/常量 | 作用 |
|---|---|
| `MINDIO_FLAG = b'mindio\x00'` | MindIO 文件尾部标记 |
| `_prepare_write` | 将非 CPU storage 异步拷贝到 CPU，再组织写入 |
| `_copy_storage_to_cpu_non_blocking` | 使用 `torch_npu` 将 NPU storage 非阻塞迁移到 CPU |
| `register_deserializer` 与 `_cpu/_npu/_cuda_relocation` | 加载时按设备 tag 进行重定位 |

读侧通过尾部 record map 找到 `data.pkl` 与各 storage 片段；写侧将 pickle 元数据和 tensor storage 分块写入 MindIO 文件。  
证据锚点：`component/mindio/acp/python_whl/mindio_acp/mindio_acp/acc_io/serialization.py` 的 `MINDIO_FLAG`、`_prepare_write`、`_copy_storage_to_cpu_non_blocking`、`register_deserializer`。

### 3.4 CheckpointHelper 与 Megatron 适配

`CheckpointHelper` 组合三个 mixin：

| mixin | 来源 | 职责 |
|---|---|---|
| `CheckpointAsyncSaverMixin` | `acc_checkpoint/core/checkpoint_async_saver.py` | 异步保存模型和优化器 checkpoint |
| `CheckpointRapidLoaderMixin` | `acc_checkpoint/core/checkpoint_rapid_loader.py` | 指定 rank 加载 checkpoint 后广播给其他 rank |
| `CheckpointSaverMixin` | `acc_checkpoint/core/checkpoint_saver.py` | checkpoint 保存线程与拷贝 stream 管理 |

`CheckpointHelper.async_write_tracker_file` 会注册 checker，等待某一 iteration 目录中 checkpoint 文件数达到预期后写 tracker 文件。  
证据锚点：`component/mindio/acp/python_whl/mindio_acp/mindio_acp/acc_checkpoint/framework_acp.py` 的 `CheckpointHelper`、`async_write_tracker_file`、`save_model_checkpoint`、`load_model_checkpoint`。

Megatron patch 层通过 `PatchManager.register_patch` 替换：
- `megatron.training.checkpointing.save_checkpoint`
- `megatron.training.checkpointing.load_checkpoint`
- `megatron.training.initialize.setup_logging`
- 多个 optimizer `step`

证据锚点：`component/mindio/acp/python_whl/mindio_acp/mindio_acp/acc_checkpoint/megatron/megatron_patch.py` 的 `exec_adaptation`、`patch_training`、`patch_core_optimizer`；`patch_utils.py` 的 `PatchManager`。

### 3.5 MemFS C++ 服务端与 SDK

| 层 | 关键符号 | 职责 |
|---|---|---|
| daemon | `main` in `src/util/ockio_daemon.cpp` | 初始化日志、配置、MemFS server、UnderFS、后台备份；等待退出信号 |
| MemFS API | `MemFsApi` | 服务端文件操作、数据块分配、元数据查询、回调注册 |
| client SDK | `MemFsClientInitialize`、`MemFsOpenFile`、`MemFsWrite`、`MemFsRead`、`MemFsFlush` | 供 Python C 扩展和外部 client 调用 |
| IPC server/client | `src/sdk/memfs/common`、`src/sdk/memfs/server` | MemFS client/server 通信 |
| Python C bridge | `src/sdk/memfs/python_sdk/c2python_api.cpp` | 将 C++ SDK 暴露为 Python `_c2python_api.so` |

证据锚点：
- `component/mindio/acp/src/util/ockio_daemon.cpp`：`main`、`DaemonModuleInitialize`，说明 daemon 启动顺序。
- `component/mindio/acp/src/memfs/memfs_api.h`：`MemFsApi`、`FileOpNotify`，说明服务端文件操作与回调。
- `component/mindio/acp/src/sdk/memfs/sdk/memfs_sdk_api.h`：`MemFsClientInitialize`、`MemFsWrite`、`MemFsRead`，说明 client API。

### 3.6 后台备份与底层存储抽象

后台备份将 MemFS 中完成写入的文件异步同步到后端文件系统：

| 组件 | 关键符号 | 职责 |
|---|---|---|
| `BackgroundManager` | `Initialize`、`Destroy` | 后台备份服务生命周期 |
| `BackupFileTracer` | `TraceOpen`、`CloseFind` | 追踪 fd 到文件路径、inode 的引用关系 |
| `BackupTarget` | `UploadFile`、`RemoveFile`、`MakeFileCache` | 上传、删除、缓存后端文件 |
| `ParallelLoadContext`、`TaskInfo` | 并行任务上下文 | 控制分片上传/预加载任务完成状态 |
| `BaseFileService` | `PutFile`、`GetFile`、`StatFile` 等 | 抽象后端文件系统能力 |

证据锚点：
- `component/mindio/acp/src/background/background_manager.h`：`BackgroundManager`。
- `component/mindio/acp/src/background/backup/backup_file_tracer.h`：`BackupFileTracer`。
- `component/mindio/acp/src/background/backup/backup_target.h`：`BackupTarget`、`ParallelLoadContext`。
- `component/mindio/acp/src/ufs/ufs_api.h`：`BaseFileService`、`InputStream`、`OutputStream`、`FileMeta`。

## 4. 核心流程

### 4.1 初始化流程

1. Python 调用 `mindio_acp.initialize(server_info)` 或在 `save/load/preload/open_file/create_file` 内部触发默认初始化。
2. `torch_initialize_helper` 合并 `server_info` 与 `default_server_info`，补充 `server.ockiod.path` 和 `server.worker.path`。
3. Python 通过 `c2python_api.initialize` 调用 C++ SDK 初始化 MemFS client。
4. daemon 侧 `ockio_daemon.cpp::main` 设置 `HCOM_FILE_PATH_PREFIX`，初始化日志、配置、`ShellFSServer`、`UnderFsManager`、`BackgroundManager`。
5. daemon 进入信号等待，退出时停止 MemFS server。

证据锚点：`acc_io/mindio_help.py` 的 `torch_initialize_helper`；`src/util/ockio_daemon.cpp` 的 `main`、`DaemonModuleInitialize`。

### 4.2 保存流程

1. `mindio_acp.save(obj, path, open_way='memfs')` 规范化真实路径。
2. `_TorchSaveHelp.__call__` 触发初始化。
3. `SerializationMixin.marshal_checkpoint` 将对象拆分为 pickle 元数据、tensor storage、record map。
4. `PrepareWriteMixin.get_write_content` 构造可写内容。
5. `create_write_chain` 创建 `MemFsWriteHandler -> FWriteHandler -> TorchWriteHandler`。
6. `MemFsWriteHandler` 检查 `ockiod` 进程存在后，通过 `writeable_file` 写入 MemFS。
7. 若 MemFS 写失败，则降级到 fopen；fopen 失败再降级到 `torch.save`。
8. C++ 后台根据文件操作回调追踪 close/new file，并异步上传到底层存储。

证据锚点：`acc_io/acc_io.py` 的 `save`；`acc_io/mindio_help.py` 的 `_TorchSaveHelp`；`acc_io/write_handler.py` 的 `MemFsWriteHandler`、`FWriteHandler`、`TorchWriteHandler`；`src/memfs/memfs_api.h` 的 `FileOpNotify`。

### 4.3 多文件保存流程

`mindio_acp.multi_save(obj, path_list)` 对 `path_list` 做类型、空列表、路径长度校验；如果 `ockiod` 不存在，则逐个路径用 fopen 方式保存；如果只有一个路径，复用 `save`；多个路径则走 `create_multi_write_chain`。  
证据锚点：`acc_io/mindio_help.py` 的 `torch_multi_save_helper`、`_TorchMultiSaveHelp`。

### 4.4 加载流程

1. `mindio_acp.load(path, open_way='memfs', map_location=None, weights_only=True)` 校验 `map_location` 只支持 `None` 或 `cpu`。
2. `_TorchLoadHelp.__call__` 初始化并创建读链。
3. `create_read_chain` 创建 `MemFsReadHandler -> NdsReadHandler -> FReadHandler -> TorchReadHandler`。
4. 读处理器读取文件尾部 `mindio\0` 标记与 record map。
5. 若为 MindIO 格式，则按 record map 读取 `data.pkl` 和 tensor storage 并反序列化；未知格式或失败则降级。
6. 最终兜底使用 `torch.load`。

证据锚点：`acc_io/acc_io.py` 的 `load`；`acc_io/read_handler.py` 的 `get_tail_bytes`、`get_record_map`、`create_read_chain`、`TorchReadHandler`。

### 4.5 预加载与 flush 流程

`mindio_acp.preload(*path)` 将真实路径预加载为 MemFS 数据；它要求 `ockiod` 存在，并通过 SDK `preload(path_list)` 提交任务。`mindio_acp.flush()` 调用 `check_background_task` 等待后台任务结束，若 `ockiod` 不存在则直接视为无需等待。  
证据锚点：`acc_io/mindio_help.py` 的 `torch_preload_helper`、`torch_wait_flush_helper`；`memfs_api.h` 的 `PreloadProgressView` 和 `BackgroundTaskEmpty`。

### 4.6 异步 tracker 更新流程

1. 用户调用 `CheckpointHelper.async_write_tracker_file(iteration, iteration_dir, total_file_count, tracker_filename)`。
2. 方法校验路径长度与目录存在性。
3. 通过 `mindio_acp.register_checker` 注册目录文件数检查任务，默认超时 300 秒。
4. checker 回调成功后写 tracker 文件内容为 iteration。
5. 回调失败时记录错误，并调用用户 callback。

证据锚点：`acc_checkpoint/framework_acp.py` 的 `async_write_tracker_file`；`doc/Interface_description/register_checker接口.md` 对 callback、`check_dict`、`timeout_sec` 的说明。

### 4.7 TFT 控制流边界

TFT 的 README 明确其核心模块为 Controller、Processor、Adaptor：
- Controller 维护分布式任务状态机，收集训练状态并根据异常类型触发 Action。
- Processor 与训练框架交互，汇报训练状态并执行 Controller 下发动作。
- Adaptor 完成训练框架对 TTP、UCE、ARF 的适配。

源码上 `Controller` 提供 `Initialize`、`Start`、`SendMsg`、`HandleHeartBeat`、`ProcessRepairFlow` 等协同入口。  
证据锚点：`component/mindio/tft/README.md`；`component/mindio/tft/src/csrc/framework/controller/controller.h` 的 `Controller`。

## 5. 接口与数据结构

### 5.1 Python API 返回约定

| 接口 | 返回 | 约束 |
|---|---|---|
| `initialize(server_info=None)` | `0` 成功，`-1` 失败 | `server_info` key 必须存在于默认配置 |
| `save(obj, path, open_way='memfs')` | `0` torch 保存，`1` memfs 保存，`2` fopen 保存；文档还列出 `-1` 失败 | `open_way` 为 `memfs` 或 `fopen` |
| `multi_save(obj, path_list)` | `None` 失败，`0/1/2` 表示不同保存路径 | `path_list` 必须为 list，单路径复用 save |
| `load(path, open_way='memfs', map_location=None, weights_only=True)` | Python object | `map_location` 仅支持 `None` 或 `cpu` |
| `preload(*path)` | `0` 成功，`1` 失败 | path 必须存在且长度不超过 1024 |
| `flush()` | `0` 成功，`1` 失败 | 等待后台任务完成 |
| `register_checker(callback, check_dict, user_context, timeout_sec)` | `1` 成功，`None` 失败 | `timeout_sec` 范围 `[1, 3600]` |
| `convert(src, dst)` | `0` 成功，`-1` 失败 | `src != dst`，`src` 必须是 MindIO 格式 |

证据锚点：`acc_io/acc_io.py`；`doc/Interface_description/*.md`；`acc_io/convert.py`。

### 5.2 C++ 服务端核心结构

| 结构/类 | 位置 | 关键字段/方法 | 说明 |
|---|---|---|---|
| `FileOpNotify` | `src/memfs/memfs_api.h` | `openNotify`、`closeNotify`、`newFileNotify`、`preloadFileNotify`、`bgTaskEmptyNotify` | MemFS 文件操作回调集合 |
| `MemfsFileAcl` | `src/memfs/memfs_api.h` | `ownerPerm`、`groupPerm`、`usersAcl`、`groupsAcl` | MemFS ACL 表示 |
| `MemFsApi` | `src/memfs/memfs_api.h` | `Initialize`、`OpenFile`、`AllocDataBlocks`、`BlockToAddress` | 服务端内存文件系统 API |
| `ClientInitParam` | `src/sdk/memfs/sdk/memfs_sdk_api.h` | TLS 证书、CRL、CA、私钥、密码路径 | client 初始化安全参数 |
| `BaseFileService` | `src/ufs/ufs_api.h` | `PutFile`、`InputStream`、`OutputStream` | 底层存储抽象 |
| `BackupTarget` | `src/background/backup/backup_target.h` | `UploadFile`、`RemoveFile`、`MakeFileCache` | 异步落盘目标 |
| `ParallelLoadContext` | `src/background/backup/backup_target.h` | `succeedCnt`、`failedCnt`、`AllTaskFinished` | 并行分片任务状态 |

### 5.3 文件格式

MindIO ACP 文件尾部包含：
- record map 起始位置：8 字节。
- record map 大小：8 字节。
- 文件标记：`b'mindio\x00'`。
- record map 使用 pickle 存储 key 到 `(start, size)` 的映射。

证据锚点：`acc_io/read_handler.py` 的 `FILE_FLAG_LENGTH`、`RECORD_MAP_SIZE`、`OCKIO_TAIL_BYTE`；`acc_io/convert.py` 的 `read_tails`、`read_record_map`。

## 6. 关键约束

### 6.1 路径与参数

| 约束 | 来源 |
|---|---|
| checkpoint 文件路径长度最大 1024 字符 | `framework_acp.py` 的 `MAX_FILE_PATH_LENGTH`、`load_model_checkpoint` |
| `register_checker.timeout_sec` 必须为整数且在 `[1, 3600]` | `acc_io/acc_io.py` 的 `register_checker` |
| `load.map_location` 只支持 `cpu` 或空值 | `acc_io/acc_io.py` 的 `load` |
| `preload` 输入路径必须为字符串且长度不超过 1024 | `mindio_help.py` 的 `torch_preload_helper` |
| `convert` 不允许源路径和目标路径相同 | `acc_io/convert.py` 的 `convert` |

### 6.2 运行依赖

| 依赖 | 说明 |
|---|---|
| `ockiod` daemon | MemFS 读写、预加载、后台 flush 依赖该进程；缺失时部分 API 会降级或失败 |
| `_c2python_api.so`、`libbdm.so`、`ockiod` | 构建脚本会复制到 Python 包中 |
| `torch` / `torch_npu` | checkpoint 序列化和 NPU storage 非阻塞拷贝依赖 |
| CANN/NPU 环境 | TFT README 明确 whl 只能安装到 NPU 环境并依赖 NPU 固件驱动和 CANN |
| 第三方源码 | ACP build 会拉取 `ubs-comm`、`libboundscheck`、`spdlog`；C++ UT 会拉取 `googletest`、`mockcpp` |

### 6.3 安全与兼容性

| 约束 | 说明 |
|---|---|
| `load` 使用 pickle | 文档明确只应加载可信数据，否则存在 unpickle 攻击风险 |
| `HCOM_FILE_PATH_PREFIX` | daemon 设置该环境变量，用于限制 HCOM 文件路径前缀 |
| `MINDIO_AUTO_PATCH_MEGATRON` | 控制 import 时是否自动 patch Megatron checkpoint 相关函数 |
| `HCOM_FILE_PATH_PREFIX` 默认 `${install_path}` | 环境变量文档说明 |

## 7. 运行手册

### 7.1 构建

ACP 构建入口：

```bash
cd component/mindio/acp
bash build/build.sh -t release
```

常用构建参数：

| 参数 | 说明 |
|---|---|
| `-t debug|release|asan|tsan` | 构建类型 |
| `-b <build_path>` | 指定构建目录，目录需已存在 |
| `--ut ON` | 构建单测版本 |
| `--tools ON` | 构建测试工具 |
| `--dtfuzz` | 打开 fuzz 构建 |
| `-f <cmake_flags>` | 传递自定义 CMake 参数 |

构建产物：
- C++ 输出：`component/mindio/acp/output/lib`、`output/bin`。
- Python wheel：`component/mindio/acp/output/mindio_acp-*.whl`。
- Python 包内复制：`_c2python_api.so`、`lib/libbdm.so`、`bin/ockiod`、`c2python_api.py`。

证据锚点：`component/mindio/acp/build/build.sh`。

### 7.2 验证

Python 单测：

```bash
cd component/mindio/acp
bash scripts/run_python_ut.sh
```

该脚本会：
1. 执行 `build/build.sh`。
2. 安装 Python 包到 `python_test`。
3. 设置 `PYTHONPATH`。
4. 在 `python_whl/mindio_acp/tests` 下运行 `pytest --cov=mindio_acp`。
5. 复制 `htmlcov`、`coverage.xml`、`final.xml` 到 `output`。

C++ gtest：

```bash
cd component/mindio/acp
bash scripts/run_gtest_ut.sh
```

常用过滤：

```bash
bash scripts/run_gtest_ut.sh -f TestBackupFileManager.*
```

证据锚点：`scripts/run_python_ut.sh`、`scripts/run_gtest_ut.sh`。

### 7.3 安装与部署

ACP wheel 安装：

```bash
pip3 install component/mindio/acp/output/mindio_acp-*.whl --force-reinstall
```

ACP README 中说明 wheel 格式为：

```text
mindio_acp-${mindio_acp_version}-py3-none-linux_${arch}.whl
```

运行时需要 `ockiod` daemon。Python 默认配置会将 `server.ockiod.path` 指向包内 `bin/ockiod`，并将 `server.worker.path` 指向工作目录配置。  
证据锚点：`python_whl/mindio_acp/mindio_acp/launch_server_conf/launch_server_param.py` 在代码中被 `mindio_help.py` 引用；`mindio_help.py` 的 `torch_initialize_helper`。

TFT wheel 安装由 TFT README 说明，格式为：

```text
mindio_ttp-{version}-py3-none-linux_{arch}.whl
```

且需要 NPU 固件驱动与 CANN 环境。

### 7.4 回滚

ACP 回滚建议：
1. 使用上一版本 `mindio_acp-*.whl` 执行 `pip3 install --force-reinstall`。
2. 停止当前 `ockiod` 进程，确保新包内 daemon 生效。
3. 清理或隔离当前工作目录下未完成的 MemFS/后台备份状态文件。
4. 重新运行最小验证：`initialize`、`save`、`load`、`flush`。

TFT 回滚建议：
1. 重新安装上一版本 `mindio_ttp-*.whl`。
2. 关闭 `MINDIO_AUTO_PATCH_MEGATRON` 或撤回框架 patch 配置。
3. 用训练框架原生 checkpoint 路径验证加载恢复。

以上回滚流程基于 wheel 安装方式和 daemon 进程依赖推断；仓库中未发现专门的 rollback 脚本。

### 7.5 失败模式

| 现象 | 可能原因 | 处理 |
|---|---|---|
| `save` 返回 `0` 或 `2`，性能未达预期 | `ockiod` 不存在或 MemFS 写失败后降级 | 检查 `ockiod` 进程、`output/bin/ockiod`、工作目录日志 |
| `preload` 返回 `1` | `ockiod` 不存在、路径无效、路径过长或 SDK preload 失败 | 检查路径、daemon、`torch_preload_helper` 日志 |
| `flush` 返回 `1` | `check_background_task` 异常或后台任务失败 | 检查后台备份日志、`BackupTarget` 相关单测 |
| `register_checker` 返回 `None` | callback 不可调用、`check_dict` 非 dict 或空、超时参数非法 | 检查调用参数和 `timeout_sec` |
| `load` 降级到 `torch.load` | 文件不是 MindIO 格式或 record map 读取失败 | 检查尾部 `mindio\0` 标记，必要时用 `convert` |
| Megatron patch 未生效 | 未设置自动 patch 环境变量或 patch 目标路径变化 | 检查 `MINDIO_AUTO_PATCH_MEGATRON` 和 `PatchManager` 注册目标 |

## 8. 调试指南

| 子模块 | 症状 | 重点源码 | 建议命令/检查 |
|---|---|---|---|
| Python API 门面 | import 后 API 缺失 | `mindio_acp/__init__.py` | `python3 -c "import mindio_acp; print(mindio_acp.__all__)"` |
| 初始化 | `initialize` 失败 | `acc_io/mindio_help.py::torch_initialize_helper`、`write_handler.py::import_mindio_sdk_api` | 检查 `_c2python_api.so` 是否在包内，检查 `server.ockiod.path` |
| 保存链 | `save` 降级或失败 | `acc_io/write_handler.py::MemFsWriteHandler.handle` | 搜索日志 `[mindio_acp] ockiod service not available`、`write file path` |
| 加载链 | `load` 失败或格式不识别 | `acc_io/read_handler.py::get_tail_bytes`、`TorchReadHandler.read` | 检查文件尾部标记；必要时执行 `mindio_acp.convert(src, dst)` |
| MindSpore 文件接口 | `open_file/read` 或 `create_file/write` 报错 | `ms/ms.py::_ReadableFileWrapper`、`_WriteableFileWrapper` | 检查 `offset/count` 参数，确认 `offset + count <= file.size()` |
| 预加载 | `preload` 失败 | `mindio_help.py::torch_preload_helper`、`src/background/backup/mem_fs_backup_initiator.*` | 检查 `ockiod` 进程和源文件是否存在 |
| 后台落盘 | `flush` 卡住或失败 | `BackgroundManager`、`BackupTarget`、`RetryTaskPool` | 运行 `bash scripts/run_gtest_ut.sh -f TestBackup*` |
| MemFS daemon | daemon 启动失败 | `src/util/ockio_daemon.cpp::main` | 检查工作目录参数、`HCOM_FILE_PATH_PREFIX`、`logs/ockiod.log` |
| SDK/IPC | Python 调用 C++ API 异常 | `src/sdk/memfs/sdk/memfs_sdk_api.h`、`python_sdk/c2python_api.cpp` | 检查 `LD_LIBRARY_PATH` 是否包含 `output/lib` |
| CheckpointHelper | tracker 未更新 | `framework_acp.py::async_write_tracker_file` | 检查 `check_dict` 目录文件数、`timeout_sec`、日志 `watching checkpoint failed` |
| Megatron patch | save/load 未被接管 | `megatron/megatron_patch.py`、`patch_utils.py` | 检查 patch 目标函数路径是否与当前 Megatron 版本一致 |
| TFT Controller | 容错流程卡在状态转换 | `tft/src/csrc/framework/controller/controller.h`、高级知识时序图 | 检查 controller 与 processor 心跳、`MindXNotify*`、`ProcessRepairFlow` |

## 9. 测试覆盖入口

| 类型 | 路径 | 覆盖重点 |
|---|---|---|
| Python acc_io | `python_whl/mindio_acp/tests/acc_io` | save/load/convert/read/write/serialization |
| Python checkpoint | `python_whl/mindio_acp/tests/acc_checkpoint` | async saver、rapid loader、Megatron patch、framework_acp |
| C++ MemFS | `test/unit_test/memfs` | inode、权限、evict、API 基础接口 |
| C++ background | `test/unit_test/background` | backup manager、tracer、target、thread pool |
| C++ SDK | `test/unit_test/sdk/memfs` | fs operation、server、driver |
| C++ UFS | `test/unit_test/ufs` | byte buffer、file utils、under fs |
| fuzz | `test/test_dt_fuzz` | MemFS API fuzz |

## 10. 源码确认与推断边界

### 10.1 已由源码或文档确认

- ACP 的目标是 CheckPoint 保存和加载加速，采用“先写内存系统，再异步写后端可靠存储”的设计。来源：`component/mindio/acp/README.md`。
- Python 包公开 `initialize/save/multi_save/register_checker/load/convert/preload/open_file/create_file/flush`。来源：`mindio_acp/__init__.py`。
- `save` 默认走 MemFS，并具备 fopen、torch.save 降级链。来源：`acc_io/write_handler.py::create_write_chain`。
- `load` 默认走 MemFS，并具备 NDS、fopen、torch.load 降级链。来源：`acc_io/read_handler.py::create_read_chain`。
- MindIO 文件格式依赖尾部 `mindio\0` 标记和 pickle record map。来源：`acc_io/read_handler.py`、`acc_io/convert.py`。
- daemon 启动顺序包括配置、日志、MemFS server、UnderFS、BackgroundManager。来源：`src/util/ockio_daemon.cpp::main`。
- `register_checker.timeout_sec` 在 Python 实现中限制为 1 到 3600 秒。来源：`acc_io/acc_io.py::register_checker`。
- `CheckpointHelper` 负责异步保存、快速加载和 tracker 更新。来源：`acc_checkpoint/framework_acp.py::CheckpointHelper`。
- TFT 包含 Controller、Processor、Adaptor 三类核心模块。来源：`component/mindio/tft/README.md`。

### 10.2 基于代码结构的推断

- 后台异步落盘的完整链路推断为 MemFS 文件操作回调触发 `BackupFileTracer/BackupTarget`，再通过 `BaseFileService` 写入后端存储；当前证据中可确认这些类和方法存在，但未逐行展开所有调用链。
- `NdsReadHandler` 与 `BaseFileService` 的关系根据命名和读链行为推断为后端可靠存储读取路径；当前分析未展开 `nds_readable_file` 的 C++ 实现。
- 回滚流程基于 wheel 安装、daemon 进程、patch 开关和构建脚本推断；仓库证据中未发现专用 rollback 脚本。

### 10.3 缺失或未展开证据

- ACP README 引用的 `doc/architecture.JPG` 未作为文本证据展开。
- 当前未展开 `CMakeLists.txt` 和完整安装部署配置，因此构建依赖列表仅来自 `build/build.sh` 与测试脚本。
- TFT 只读取了 README、C API 头文件和 Controller 头文件，未对白盒展开 Processor、state machine、TCP 链路和 Python 包全部实现。