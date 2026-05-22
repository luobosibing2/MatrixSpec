# RecSDK 核心架构与接口文档

本文档基于提供的源码片段，针对稀疏 Embedding 实现类、JaggedTensor 扩展类及 HSTU 算子进行详细说明。

## 1. 稀疏 Embedding 实现类 (`tf_rec_v1/python/core/emb/`)

### 1.1 类定义与继承关系
根据 `emb_factory.py` 和 `embedding_proxy.py`，RecSDK 定义了以下几种稀疏 Embedding 实现类：

*   **基类**: `BaseSparseEmbedding` (由 `emb_factory.py` 导入)
*   **具体实现类**:
    *   `HBMDynamicSparseEmbedding`: 纯 HBM 存储的动态扩容 Embedding 表。
    *   `HBMSparseEmbedding`: 纯 HBM 存储的非动态扩容 Embedding 表。
    *   `ExternalStorageSparseEmbedding`: 多级存储 Embedding 表（DDR + SSD，HBM 作为高速缓存）。
    *   `MergeableSparseEmbedding`: 支持自动合并的 Embedding 表。

**继承/组合关系**:
所有具体实现类均继承自 `BaseSparseEmbedding` 接口。`MergeableSparseEmbedding` 通过 `MergeableEmbeddingTableProxy` 代理类进行创建和管理，实现了对多个小表的自动合并逻辑。

### 1.2 特性差异

| 类名 | 动态扩容 | 合并查表优化 | 多级存储 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| **HBMDynamicSparseEmbedding** | 支持 | 不支持 | 否 (纯 HBM) | 特征规模动态增长，需全量高速访问的场景。 |
| **HBMSparseEmbedding** | 不支持 | 不支持 | 否 (纯 HBM) | 特征规模固定，无需扩容的常规场景。 |
| **ExternalStorageSparseEmbedding** | 不支持 (注: 通常由底层KV存储支持) | 不支持 | **是** (HBM作为Cache, DDR/SSD存储) | 超大规模稀疏特征（TB级），利用存储层次降低成本。 |
| **MergeableSparseEmbedding** | 不支持 | **支持** | 否 | 多个小特征表具有相同维度和配置，合并以减少查表次数和通信开销。 |

### 1.3 使用选择指南
开发者通常不直接实例化这些类，而是通过 `embedding.py` 中的 `create_table` 接口或 `embedding_proxy.py` 中的代理逻辑创建。

*   **选择多级存储**: 若 `host_vocabulary_size` 或 `ssd_vocabulary_size` 参数大于 0，`create_table` 会调用 `ExternalStorageSparseEmbeddingFactory` 创建多级存储实例。
*   **选择合并优化**: 若 `enable_merge` 参数为 True，系统会通过 `MergeableEmbeddingTableProxy` 创建或查找 `MergeableSparseEmbedding` 实例。
*   **选择动态扩容**: 若无需多级存储且无需合并，但特征 ID 空间不固定，可选择 `HBMDynamicSparseEmbedding`。

**源码依据**:
*   `emb_factory.py` 定义了各类 Factory 及其注释说明。
*   `embedding_proxy.py` 展示了 `MergeableSparseEmbedding` 的创建与合并逻辑 (`create_mergeable_table` 方法)。
*   `embedding.py` 展示了根据 `vocabulary_size` 等参数构建配置字典的过程。

---

## 2. JaggedTensor 扩展类 (`torch_rec_v1/hybrid_torchrec/sparse/`)

### 2.1 类定义与扩展字段
TorchRec 标准的 `JaggedTensor` 仅包含 `values`、`weights`、`lengths` 等基础字段。RecSDK 为了适配 NPU 上的高性能计算（如分桶去重），定义了以下扩展类：

#### **ExtendedJaggedTensor**
*   **文件路径**: `training/torch_rec_v1/hybrid_torchrec/hybrid_torchrec/sparse/extended_jagged_tensor.py` (测试代码引用)
*   **扩展字段**: `_extra` (通用扩展张量)。
*   **作用**: 提供了一个通用的扩展基类，允许在标准 JaggedTensor 基础上挂载额外的张量数据（如 Counts、Timestamp 等）。

#### **JaggedTensorWithCount**
*   **文件路径**: `training/torch_rec_v1/hybrid_torchrec/hybrid_torchrec/sparse/jagged_tensor_with_count.py`
*   **继承关系**: 继承自 `ExtendedJaggedTensor`。
*   **扩展字段**: `_counts` (映射到基类的 `_extra` 字段)。
    ```python
    class JaggedTensorWithCount(ExtendedJaggedTensor):
        _fields = "_counts"
        def __init__(self, ..., counts: Optional[torch.Tensor] = None):
            super().__init__(values=values, extra=counts, ...)
    ```
*   **核心作用**: 存储 IDs 在去重前的原始出现次数。在 NPU 上的分桶去重优化中，特征 ID 会被分桶并去重以减少查表量，此时需要记录每个 ID 的 `counts` 以便在查表结果返回后正确还原权重或进行 Pooling。

#### **KeyedJaggedTensorWithCount**
*   **继承关系**: 继承自 `KeyedExtendedJaggedTensor`。
*   **扩展字段**: `_counts`。
*   **关键方法**:
    *   `dist_labels()`: 分布式通信时返回标签列表，包含 `"counts"`。
    *   `dist_tensors()`: 返回待通信的张量列表，包含 `self._counts`。
    *   `dist_init()`: 从通信结果重构对象时处理 `counts` 的维度与形状。

### 2.2 解决 NPU 特定问题
这些扩展主要用于解决 **可变长稀疏特征的批处理与查表辅助信息传递** 问题：
1.  **分桶去重**: NPU 算子 `block_bucketize_sparse_features` (见 `block_bucketize_sparse_features_kernel_full.h`) 对稀疏特征进行分桶和去重。去重后的 ID 需要附带 `counts` 信息，告知后续流程该 ID 在原始输入中出现了多少次。
2.  **分布式通信**: 在多卡训练中，`counts` 需要随 `values` 一起进行 All2All 通信。`KeyedJaggedTensorWithCount` 提供了 `dist_tensors` 和 `dist_init` 接口，确保 `counts` 能够被正确打包、传输和解析。
3.  **Pooling 还原**: 在反向传播或特征处理中，依据 `counts` 对去重后的梯度或 Embedding 进行还原。

### 2.3 开发建议
在 NPU 上进行变长稀疏 ID 特征处理，特别是涉及去重或分桶操作时，应使用 `JaggedTensorWithCount` 或 `KeyedJaggedTensorWithCount`。
*   若仅需附带计数信息，使用 `JaggedTensorWithCount`。
*   若涉及多特征 Key 管理及分布式通信，使用 `KeyedJaggedTensorWithCount`。

---

## 3. HSTU Dense Forward 算子

### 3.1 算子定义与核心问题
*   **算子名称**: HSTU Dense Forward / `hstu_jagged` (对应文件 `hstu_dense_forward` 目录)。
*   **功能描述**: HSTU (Hierarchical Sequential Transduction Units) 是一种针对推荐系统序列建模的算子。
*   **解决的问题**: 相比标准 Attention，HSTU 针对推荐场景的超长序列和稀疏性进行了优化。从 `migration_and_training.md` 中的调用接口 `torch.ops.mxrec.hstu_jagged` 可见，该算子原生支持 **Jagged Tensor**（变长序列），无需 Padding 到固定长度，从而避免了标准 Attention 中无效计算和显存浪费的问题。

### 3.2 接口形式 (基于文档与源码推断)
在 `migration_and_training.md` 中展示了其封装类 `NpuFusedHSTUAttention`：
```python
# 输入参数示例
torch.ops.mxrec.hstu_jagged(
    tq, tk, tv,        # Query, Key, Value (变长展开形式)
    None, None,        # 可选的偏置项
    0,                 # mask_type (如下三角 mask)
    max_seqlen,        # 最大序列长度
    1.0 / max_seqlen,  # scale
    offsets.long(),    # 变长序列的偏移量
    num_contextuals, num_candidates, target_group_size, ...
)
```
该算子直接接收 `offsets`，直接处理非对齐的变长序列，这比标准 Attention 需要的 Padding+Mask 方案更高效。

### 3.3 实现细节与验证 (基于现有源码)
> **注意**: 评测问题中提及的 AscendC 内核实现文件 (`hstu_dense_forward_fuxi/...` 及 `test/...` 测试文件) 在提供的源码片段列表中**未包含具体内容**。以下分析基于提供的其他文件及算子通用模式。

1.  **AscendC 实现工具**: 
    *   参考同类算子 `disentangle_attention.cpp` 和 `block_bucketize_sparse_features_kernel_full.h`，NPU 算子通常利用 `AscendC` 编程模型。
    *   虽然未提供 HSTU 的源码，但根据 NPU 算子开发规范，通常会使用 Tiling 策略进行切块计算。
    *   问题中提到的 `workload_sharder.h` 和 `matmul_check.h` 推测用于计算任务的切分和矩阵乘维度的合法性检查。

2.  **验证方法**:
    *   鉴于缺少测试文件源码，推荐参考 `test_extended_jagged_tensor.py` 中的测试模式：
        *   构造变长输入数据 (`values`, `lengths`, `offsets`)。
        *   传入 `torch.ops.mxrec.hstu_jagged` 接口。
        *   对比 NPU 输出与 CPU 参考实现（如 PyTorch 组网实现的 Attention）的结果一致性。

### 3.4 源码缺失说明
当前提供的源码片段中缺少 `cust_op/ascendc_op/ai_core_op/hstu_dense_forward_fuxi/` 目录下的具体实现文件及测试文件，因此无法给出 AscendC 内核中具体使用的工具类调用细节及测试脚本的完整逻辑。建议查阅仓库完整代码以获取该部分细节。
