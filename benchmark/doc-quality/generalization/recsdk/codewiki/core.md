# RecSDK 项目总览文档

## 1. 架构概览

RecSDK 是面向 Ascend NPU 设备的高性能推荐系统训练框架，采用分层架构设计，底层为自定义算子层，上层为训练框架层，支持 TensorFlow 与 PyTorch 生态。

### 1.1 核心架构分层

| 层级 | 目录 | 职责 | 核心内容 |
| :--- | :--- | :--- | :--- |
| **自定义算子层** | `cust_op/` | 提供高性能底层算子实现，弥补 NPU 原生算子不足 | `ascendc_op/` (Ascend C 内核算子), `framework/` (框架适配层), `hkv/` (KV 存储) |
| **训练框架层** | `training/` | 提供完整的模型构建、数据管道、分布式训练能力 | `tf_rec_v1/v2`, `torch_rec_v1/v2`, `common/` |

### 1.2 训练组件矩阵

RecSDK 提供四大训练组件，主要区分在于**基础框架**与**计算下沉模式**：

| 组件名称 | 基础框架 | 架构模式 | 状态 | 硬件支持 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **tf_rec_v1** | TensorFlow | **非全下沉** (CPU预处理 + NPU计算) | 生产可用 | Atlas A2/A3/A5 | 稳定性要求高的生产环境 |
| **tf_rec_v2** | TensorFlow | **全下沉** (全 NPU 计算) | POC | 仅 Atlas A5 | 追求极致性能验证 |
| **torch_rec_v1** | PyTorch + TorchRec | **非全下沉** | 生产可用 | Atlas A2/A3/A5 | PyTorch 生态生产环境 |
| **torch_rec_v2** | PyTorch + TorchRec | **全下沉** | POC | 仅 Atlas A5 | 动态 Embedding 探索 |

> **架构本质区别**：
> *   **非全下沉**：稀疏特征预处理（哈希、去重）在 CPU 执行，模型计算在 NPU 执行。兼顾灵活性与性能。
> *   **全下沉**：所有计算任务（含稀疏查表）均在 NPU 执行，消除 CPU-NPU 数据搬运瓶颈，追求极致性能。

---

## 2. 核心组件

### 2.1 稀疏 Embedding 实现体系 (`tf_rec_v1`)
针对不同规模与场景，提供了多种 Embedding 表实现：

*   **HBMDynamicSparseEmbedding**: 纯 HBM 存储，支持动态扩容，适用于特征规模增长的场景。
*   **HBMSparseEmbedding**: 纯 HBM 存储，非动态，适用于特征规模固定的常规场景。
*   **ExternalStorageSparseEmbedding**: 多级存储 (HBM Cache + DDR/SSD)，适用于 TB 级超大规模稀疏特征。
*   **MergeableSparseEmbedding**: 支持自动合并多个小表，减少查表次数与通信开销。

### 2.2 动态 Embedding 核心机制 (`torch_rec_v2`)
`torch_rec_v2` 引入了全下沉的动态 KV 哈希表方案，核心由 C++ 层的 `DynamicVariableBase` 驱动：
*   **动态扩容与淘汰**：支持 LRU/LFU 等淘汰策略，突破静态表大小限制。
*   **优化器状态融合**：底层哈希表直接融合优化器状态（如 Adam, Adagrad），减少显存占用与同步开销。
*   **参数控制**：通过 `max_capacity`, `evict_strategy`, `max_hbm_for_vectors` 等参数精细控制内存使用。

### 2.3 JaggedTensor 扩展
为适配 NPU 高性能计算，扩展了标准 TorchRec 的 `JaggedTensor`：
*   **ExtendedJaggedTensor**: 通用扩展基类，支持挂载额外张量。
*   **JaggedTensorWithCount**: 扩展 `_counts` 字段，支持带计数的稀疏张量操作，适配分桶去重等场景。

---

## 3. 核心调用链

### 3.1 稀疏特征前向计算流程 (`tf_rec_v1`)
该流程展示了非全下沉模式下，从原始 ID 到 Embedding 向量的关键路径：

1.  **数据输入**: `tf.data.Dataset` 加载并预处理原始稀疏 ID 特征。
2.  **图优化介入 (关键环节)**:
    *   **触发时机**: 在 `Optimizer.compute_gradients()` 计算梯度之后，由 `mx_rec.graph.modifier.modify_graph_and_start_emb_cache` 触发。
    *   **核心操作**:
        *   **算子替换**: 将原生 TF 查表算子替换为 NPU 自定义算子 (`cust_op/`)。
        *   **子图切分**: `LookupSubgraphSlicerHook` 将 Key 生成子图（含 StringToNumber 等 CPU 算子）切分至 CPU 执行，实现流水线并行。
        *   **查表合并**: `do_merge_lookup` 合并相同配置的查表操作，减少调用开销。
3.  **底层执行**: 最终由 `cust_op/ascendc_op` 中的内核算子在 NPU 上执行查表计算。

### 3.2 动态表查表流程 (`torch_rec_v2`)
全下沉模式下的典型调用链：

1.  **去重**: Python 侧调用 `unique_op` (或 CPU 模拟 `segmented_unique_op_cpu`)，对输入 Keys 进行去重，生成 `unique_keys` 和 `inverse_idx`。
2.  **指针查询**: 调用 `demb.find_pointers` 算子，在 NPU 侧的动态哈希表中查询 Key 对应的存储指针。
3.  **向量读取**: 根据指针从 HBM 或多级存储中读取 Embedding 向量。

---

## 4. 扩展开发

### 4.1 新增 AscendC 自定义算子
开发者可在 `cust_op/ascendc_op/ai_core_op/` 目录下扩展算子：

*   **目录结构**: `<op_name>/v220/op_host/` (定义与 Tiling) 与 `op_kernel/` (内核实现)。
*   **实现步骤**:
    1.  **定义类**: 继承 `OpDef`，声明输入、输出、属性及形状推断函数。
    2.  **注册配置**: 使用 `OP_ADD` 宏注册，配置 `OpAICoreConfig` 支持动态形状与格式。
    3.  **实现 Tiling**: 在 `op_host` 中实现 Tiling 逻辑，通过 `SetTiling` 绑定。
    4.  **实现 Kernel**: 在 `op_kernel` 中编写 Ascend C 核心计算逻辑。

---

## 5. 后续问答导航

基于本文档内容，您可以进一步探索以下细节：

*   **架构选型**: [RecSDK 的 tf_rec_v1 与 torch_rec_v2 在架构本质上有何区别？](#)
*   **Embedding 机制**: [如何在 RecSDK 中选择合适的 Embedding 表实现（如 HBM vs 多级存储）？](#)
*   **性能优化**: [tf_rec_v1 的图优化机制是如何通过算子替换与合并提升 NPU 性能的？](#)
*   **自定义开发**: [如何在 RecSDK 中新增一个 Ascend C 自定义算子？](#)
*   **动态特征**: [torch_rec_v2 的 DynamicVariableBase 如何管理动态哈希表的生命周期？](#)
