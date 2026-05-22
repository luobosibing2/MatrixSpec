# RecSDK 架构概览文档

## 组件定位与技术差异

### 四大训练组件概览
RecSDK 提供 `tf_rec_v1`、`tf_rec_v2`、`torch_rec_v1`、`torch_rec_v2` 四个训练组件，其定位和技术差异如下：

| 组件名称 | 基础框架 | 适配状态 | 框架类型 | 功能描述 | 状态 | 硬件支持 |
|---------|---------|---------|---------|---------|------|---------|
| **tf_rec_v1** | TensorFlow | **非全下沉** | 稀疏推荐框架 | 基于TensorFlow，适配NPU设备的非全下沉稀疏推荐框架。 | 生产可用 | Atlas A2/A3/A5 |
| **tf_rec_v2** | TensorFlow | **全下沉** | 稀疏推荐框架 | 基于TensorFlow，适配NPU设备的全下沉稀疏推荐框架。 | **POC状态** | 仅支持 Atlas A5 |
| **torch_rec_v1** | PyTorch + TorchRec | **非全下沉** | 稀疏推荐框架 | 基于PyTorch、TorchRec开源软件，适配NPU设备的非全下沉稀疏推荐框架。 | 生产可用 | Atlas A2/A3/A5 |
| **torch_rec_v2** | PyTorch + TorchRec | **全下沉** | 稀疏推荐框架 | 基于PyTorch、TorchRec开源软件，适配NPU设备的全下沉稀疏推荐框架。 | **POC状态** | 仅支持 Atlas A5 |

**源码依据**：`./README.md` 表格及 `./docs/zh/rec_full_stack.md` 表3。

### 非全下沉与全下沉的架构本质区别
架构的核心区别在于计算任务的执行位置和稀疏操作的处理方式：

#### 非全下沉模式
*   **定义**：稀疏表哈希映射、去重分桶相关操作在**CPU上执行**，其余计算任务在**NPU上执行**的混合模式。
*   **计算分布**：
    *   **CPU侧**：执行稀疏特征相关的预处理操作，如哈希映射、去重分桶。
    *   **NPU侧**：执行稠密计算、模型前向后向传播等主要计算任务。
*   **特点**：兼顾NPU算力与CPU处理灵活性的混合架构。

#### 全下沉模式
*   **定义**：指**所有计算任务都下沉到NPU上执行**，以获得更好的兼容性。
*   **计算分布**：
    *   **NPU侧**：执行包括稀疏表查询、特征处理在内的全部计算任务。
    *   **CPU侧**：仅承担部分数据调度和控制逻辑，不介入核心计算。
*   **特点**：最大化利用NPU算力，减少CPU与NPU之间的数据搬运，追求极致性能与兼容性。

**源码依据**：`./README.md` 与 `./docs/zh/rec_full_stack.md` 中关键术语说明章节。

### 生产可用与POC状态组件的限制
*   **生产可用组件**：`tf_rec_v1` 和 `torch_rec_v1`。它们功能稳定，支持多类硬件设备（Atlas A2/A3/A5），可作为生产环境推荐方案。
*   **POC状态组件限制**：`tf_rec_v2` 和 `torch_rec_v2` 当前处于概念验证阶段。
    *   **限制说明**：功能可能不完整或不稳定，仅支持特定硬件（Atlas A5），不建议直接用于生产环境。
    *   **使用建议**：可用于试验验证、技术探索或特定场景测试，但需注意其潜在的不稳定性。

**源码依据**：`./README.md` 表格及 `./docs/zh/rec_full_stack.md`。

---

## 自定义算子与训练框架的分工及调用栈

### `cust_op/` 与 `training/` 的分工
RecSDK 的代码仓库按层级清晰分工：

*   **`cust_op/` (自定义算子层)**
    *   **职责**：提供高性能、专用于推荐场景的自定义算子实现，弥补NPU原生算子库的不足或加速关键计算。
    *   **核心内容**：
        *   `ascendc_op/`: 使用 **Ascend C** 语言编写，编译后在 AI Core 执行的内核算子及其编译脚本。
        *   `framework/`: 算子适配层，实现算子在 TensorFlow 或 PyTorch 框架中的绑定、接口转换。
        *   `test/`: 算子测试用例。
        *   `hkv/`: 集成 HierarchicalKV-ascend 子模块，用于大规模 KV 存储。
    *   **目标**：作为底层算子库，为上层训练框架提供算子支撑。

*   **`training/` (训练框架层)**
    *   **职责**：提供完整的、面向用户模型的训练框架，封装模型构建、数据管道、分布式训练、稀疏表管理等高层逻辑。
    *   **核心内容**：
        *   `tf_rec_v1`, `tf_rec_v2`: TensorFlow 生态的训练框架组件。
        *   `torch_rec_v1`, `torch_rec_v2`: PyTorch + TorchRec 生态的训练框架组件。
        *   `common/`: 框架公共组件。
    *   **目标**：作为应用层，通过调用底层算子库，为用户提供易用的训练体验。

**源码依据**：`./README.md` 目录结构部分及 `./cust_op/README.md` 算子文件结构部分。

### NPU自定义算子调用栈：从 Python 到 AI Core
以算子 `block_bucketize_sparse_features` 为例，其完整调用栈如下：

1.  **Python 框架层调用 (用户代码)**：
    *   用户在 PyTorch/TorchRec 模型或数据处理管道中，通过导入的模块调用算子。
    *   例如，在 `torch_rec_v2` 的分布式分片逻辑中，可能调用 `block_bucketize_sparse_features` 进行特征分桶预处理。
    *   **文件路径示例**：`./training/torch_rec_v2/dynamic_emb/tests/ut/distributed/sharding/test_rw_sharding.py` 展示了调用链的测试场景。

2.  **Python → C++ 插件层 (算子适配层)**：
    *   Python 调用通过 `torch.ops.load_library(...)` 或类似机制，加载编译好的 `.so` 动态库。
    *   该 `.so` 文件由 `cust_op/framework/torch_plugin` 目录下的适配层代码编译生成，它通过 **pybind** 或 **PyTorch Extension** 机制，将 Python 调用桥接到 C++ 端。
    *   **文件路径**：`cust_op/framework/torch_plugin` 对应此层。

3.  **C++ 插件 → AscendC 内核层**：
    *   C++ 插件层将算子参数、计算逻辑转换为对 Ascend C 内核的调用请求，并管理 NPU 内存、流等资源。
    *   内核算子代码位于 `cust_op/ascendc_op/ai_core_op` 下，使用 Ascend C 编写，负责在 AI Core 上执行具体的并行计算。
    *   **文件路径示例**：
        *   `./cust_op/ascendc_op/ai_core_op/block_bucketize_sparse_features/c310/op_kernel/block_bucketize_sparse_features_kernel_full.h`：提供内核主逻辑。
        *   `./cust_op/ascendc_op/ai_core_op/block_bucketize_sparse_features/c310/op_kernel/block_bucketize_sparse_features_common.h`：提供公共辅助函数。
        *   `./cust_op/ascendc_op/ai_core_op/token_mixing/v220/op_kernel/token_mixing.cpp`：另一个算子内核示例，展示 Ascend C 编程模式。

4.  **AI Core 内核执行**：
    *   Ascend C 内核代码被编译成二进制，最终由 NPU 的 AI Core 硬件单元执行，完成高性能计算。

### `cust_op/framework/torch_plugin` 与 `cust_op/ascendc_op` 的角色
调用栈中各层的对应关系如下：

| 调用栈层级 | 负责模块 | 核心职责 |
| :--- | :--- | :--- |
| **Python API层** | 用户代码 / `training/` 框架 | 提供用户接口，发起算子调用。 |
| **框架适配层 (C++ Plugin)** | `cust_op/framework/torch_plugin` | **(1)** 通过 Python 绑定将 Python 脚本桥接到 C++；**(2)** 处理框架特有逻辑，如 tensor 格式转换；**(3)** 调用下层 AscendC 内核接口。 |
| **AscendC 内核层** | `cust_op/ascendc_op` | **(1)** 用 Ascend C 编写，实现核心计算算法；**(2)** 直接在 AI Core 上执行并行计算。 |

**源码依据**：`./cust_op/README.md` 文件结构与调用流程说明，以及相关算子内核源码。
