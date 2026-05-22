# RecSDK 架构与接口文档（基于本地源码片段）

## 1. TF_REC_V1 模块

### 1.1 稀疏 Embedding 表创建 (recsdk-04)

**文件路径**: `training/tf_rec_v1/python/core/emb/` (目录下存在 `base_sparse_embedding.py`，但 `emb_factory.py` 未在提供的源码片段中)

**工厂方法签名**: 根据提供的源码片段，未直接展示 `EmbeddingFactory` 的工厂方法签名。根据 `docs/zh/tensorflow/tf_rec_v1/migration_and_training.md` 的迁移示例，稀疏表创建通过 **`create_table`** 接口实现，其参数签名示例如下：
```python
# 来源：docs/zh/tensorflow/tf_rec_v1/migration_and_training.md
from mx_rec.core.embedding import create_table
user_emb_table = create_table(
    key_dtype=tf.int64,         # 键类型
    value_dtype=tf.float32,     # 值类型
    name="user_table",          # 表名
    dim=tf.TensorShape([1]),    # Embedding 维度
    emb_initializer=tf.compat.v1.truncated_normal_initializer(mean=10), # 初始化器
    device_vocabulary_size=800000, # 设备侧词表大小（HBM）
    host_vocabulary_size=0      # 主机侧词表大小（DDR/SSD）
)
```

**核心配置参数**:
- **特征列定义**: 通过 `name` 和后续 `sparse_lookup` 中的 `feature_spec_list` 关联。
- **Embedding 维度**: 通过 `dim` 参数指定。
- **优化器类型**: 在迁移示例中，通过 `mx_rec.optimizers` 包中的优化器接口（如 `LazyAdamByAddress`) 创建，与表创建分离。
- **存储介质级别**: 通过 `device_vocabulary_size` 和 `host_vocabulary_size` 参数控制，分别对应 NPU HBM 和 Host DDR/SSD。

**工厂实例化决策依据**: 
- 根据文档描述，工厂根据 `use_dynamic_expansion` 等环境参数决定是否实例化支持动态扩容的稀疏表。
- 具体决策逻辑未在源码片段中明确展示，但文档 (`docs/zh/tensorflow/tf_rec_v1/appendix.md`) 指出动态扩容模式通过初始化接口 `init(use_dynamic_expansion=True)` 开启。

### 1.2 稀疏优化器 (`by_addr` 变体) (recsdk-05)

**核心区别**: `by_addr` 后缀版本与普通版本的核心区别是 **直接操作内存地址** 而非标准梯度更新。
- 普通版本: 通过键进行梯度查找和更新，遵循标准 Embedding 优化流程。
- `by_addr` 版本: 在 forward 过程中通过 `ASCEND_SPARSE_LOOKUP_ID_OFFSET` 获取 Embedding 向量在内存中的地址，反向传播时直接根据地址进行梯度更新，避免额外的哈希查找开销。

**接口签名差异**: 
- 普通优化器 (`create_hash_optimizer`): 需传入梯度 和变量。
- `by_addr` 优化器 (`create_hash_optimizer_by_address`): 需传入梯度 和地址。
- 示例来源 (`docs/zh/tensorflow/tf_rec_v1/appendix.md`):
```python
# 反向更新时，by_addr 版本传入地址而非键
grads_and_vars = [(grad, address) for grad, address in zip(local_grads, train_address_list)]
train_ops.append(sparse_optimizer.apply_gradients(grads_and_vars))
```

**适用场景**: 
- **片上内存侧动态扩容模式**: 当稀疏表存储在 HBM 并启用动态扩容时，推荐使用 `by_addr` 版本以降低更新开销。
- **性能敏感场景**: 需减少反向传播中哈希表查找次数时选择 `by_addr` 版本。

### 1.3 稀疏 Embedding 表保存与恢复 (recsdk-06)

**文件路径**: `training/tf_rec_v1/python/saver/saver.py` (未在源码片段中，但文档有描述)

**接口签名**: 
- **保存接口**: 文档未明确 `save` 签名，但 `docs/zh/tensorflow/tf_rec_v1/appendix.md` 提到使用 `tf.train.Saver` 进行模型保存，需额外处理稀疏参数。
- **恢复接口**: 同上，未明确 `restore` 签名。
- **差异**: 与 TF 标准 `tf.train.Saver` 相比，RecSDK 需额外处理稀疏参数（如动态扩容表）的序列化逻辑，可能通过 `sparse.py` 模块处理。

**`sparse.py` 负责逻辑**: 
- 根据文档描述，稀疏参数的序列化逻辑（如动态扩容表的 Dump/Load）可能由专门的模块处理。`docs/zh/torch/torch_rec_v2/migration_and_training.md` 提到了 `DynamicEmbDump` 和 `DynamicEmbLoad`，类似逻辑在 TF 版本中可能对应 `sparse.py`。

**热启动 vs. 断点续训**:
- **热启动**: 从预训练模型或已有 Embedding 表初始化，不依赖训练中断点。文档未明确具体入口。
- **断点续训**: 从训练中断点的 checkpoint 恢复，通常通过 `tf.train.Saver` 实现。

## 2. Torch_REC_V1 模块

### 2.1 Embedding 配置类 (recsdk-07)

**文件路径**: `torch_rec_v1/hybrid_torchrec/hybrid_torchrec/modules/embedding_config.py` (未在源码片段中，但迁移文档有描述)

**核心字段**: 
根据迁移文档 (`docs/zh/torch/torch_rec_v1/migration_and_training.md`)，配置类为 **`HashEmbeddingBagConfig`**，继承自 TorchRec 的 `EmbeddingBagConfig`。核心字段可能包括：
- `name`: 表名。
- `embedding_dim`: Embedding 维度。
- `num_embeddings`: Hash 表大小。
- `feature_names`: 关联的特征名。
- `data_type`: 数据类型（如 `DataType.FP32`）。
- 优化器配置: 可能通过外部优化器传入。

**描述 HashEmbeddingBag 表**: 
```python
# 来源：docs/zh/torch/torch_rec_v1/migration_and_training.md
from hybrid_torchrec import HashEmbeddingBagCollection
eb_configs = [
    HashEmbeddingBagConfig(
        name=f"t_{feature_name}",
        embedding_dim=args.embedding_dim,
        num_embeddings=args.num_embeddings,
        feature_names=[feature_name],
        # 其他初始化参数
    )
    for feature_idx, feature_name in enumerate(DEFAULT_CAT_NAMES)
]
```

**传入分片策略函数**: 
通过 `DynamicEmbeddingShardingPlanner` 将配置传入分片策略：
```python
# 来源：docs/zh/torch/torch_rec_v2/migration_and_training.md（TorchRec 接口对应关系）
planner = DynamicEmbeddingShardingPlanner(
    eb_configs=eb_configs,  # 传入 Embedding 配置列表
    topology=topology,
    constraints=constraints,
    batch_size=batch_size,
)
```

### 2.2 分片策略定制 (recsdk-13)

**文件路径**: `torch_rec_v1/hybrid_torchrec/hybrid_torchrec/distributed/sharding_plan.py` (未在源码片段中，但文档有描述)

**分片策略定制**: 
- 在 NPU 环境下，通过 `DynamicEmbeddingShardingPlanner` 定制 TorchRec 的 Embedding 分片策略。
- 支持的分片模式: 根据文档 (`docs/zh/torch/torch_rec_v2/api/subtable_apis.md`)，`DynamicEmbParameterConstraints` 的 `sharding_type` 参数支持 `row_wise`（按行分片）。
- 分片决策依据: 根据拓扑信息、 Embedding 表规模、NPU 卡数等，通过 `Topology` 和 `constraints` 参数传递。
- 多表配置: 为多张 Embedding 表配置不同分片策略，通过 `constraints` 字典为每张表指定 `DynamicEmbParameterConstraints`。

## 3. Torch_REC_V2 模块

### 3.1 DynamicEmb 架构区别 (recsdk-19)

**核心区别**: 
- **存储架构**: `torch_rec_v1` 基于 TorchRec 的静态 Embedding 表（如 `HashEmbeddingBag`），需预设 `num_embeddings`。
- **torch_rec_v2**: 采用 **动态 Key-Value 哈希表** 方案，通过 `DynamicVariableBase` / `HkvVariable` 替代静态表，支持动态扩容和淘汰。

**动态表方案**: 
- **DynamicVariableBase**: C++ 层基类，提供哈希表操作接口（如 `find`, `insert_and_evict`）。来源：`training/torch_rec_v2/dynamic_emb/csrc/dynamic_variable_base.cpp`。
- **HkvVariable**: 具体实现类，继承自 `DynamicVariableBase`。
- **VariableFactory::Create**: 核心工厂方法，参数控制哈希表行为：
```cpp
// 来源：training/torch_rec_v2/dynamic_emb/csrc/dynamic_variable_base.cpp
std::shared_ptr<DynamicVariableBase> VariableFactory::Create(
    DataType key_type, DataType value_type, 
    EvictStrategy evict_type,       // 淘汰策略（如 LRU、LFU）
    int64_t dim,                    // Embedding 维度
    size_t init_capacity,           // 初始容量
    size_t max_capacity,            // 最大容量
    size_t max_hbm_for_vectors,     // HBM 可用内存上限
    size_t max_bucket_size,         // 桶大小
    float max_load_factor,          // 装载因子
    int block_size,                 // 块大小
    int io_block_size,              // IO 块大小
    int device_id,                  // 设备 ID
    bool io_by_cpu,                 // 是否 CPU IO
    bool use_constant_memory,       // 是否使用常量内存
    int reserved_key_start_bit,     // 保留键起始位
    size_t num_of_buckets_per_alloc, // 每次分配桶数
    const InitializerArgs& initializer_args, // 初始化器参数
    // 其他参数...
);
```

**绑定层**: Python 侧的 `DynamicEmbTableOptions` 通过 `dynamic_emb_extensions` 绑定模块与 C++ 侧的 `DynamicVariableBase` 打通。来源：`training/torch_rec_v2/dynamic_emb/tests/ut/dynamic_emb_op/test_create_dynamic_emb_table.py`，其中通过 `demb.DynamicEmbTable` 调用。

### 3.2 Forward 查表调用链 (recsdk-21)

**入口**: `distributed/batched_dynamicemb_function.py` 中的 `apply` 方法（未在源码片段中，但可通过单元测试推断）。

**底层算子**: 
- **`unique_op`**: 对输入稀疏 ID 进行去重，输出唯一键和计数。
- **`find_pointers`**: 在哈希表中查询键对应的指针。输入：唯一键；输出：指针张量、命中标记。
- **`load_from_pointer`**: 根据指针加载 Embedding 向量。输入：指针张量；输出：Embedding 张量。
- **`pooling_embeddings`**: 按 SUM/MEAN 聚合 Embedding。输入：Embedding 张量、索引；输出：聚合后 Embedding。

**协调调度**: 
根据 `training/torch_rec_v2/dynamic_emb/tests/ut/dynamic_emb_op/test_table_operations.py` 的单元测试，调用链通过 Python 绑定调用 C++ 实现：
```python
# 来源：training/torch_rec_v2/dynamic_emb/tests/ut/dynamic_emb_op/test_table_operations.py
demb.find_pointers(dynamic_table, n, keys, values_out, founds, None)  # 调用 find_pointers
```
C++ 端的 `pooling_embeddings_kernel.h` 可能负责协调算子调度顺序，具体调度逻辑未在源码片段中明确展示。

## 4. 组件协同与部署 (补充信息)

**组件协同**: 
- `fbgemm-ascend`: 为 `torch_rec_v1` 和 `torch_rec_v2` 提供高性能 Embedding 算子（通过 `torch.ops.fbgemm.*`）。
- `HierarchicalKV-ascend`: 作为 `torch_rec_v2` 的底层 KV 存储引擎，支持动态 Embedding 表。

**配置部署**: 
- 根据 `docs/zh/torch/torch_rec_v2/recsdk_torch_installation_guide.md`，需安装 `torch_rec_v2-*.tar.gz`、`fbgemm_ascend-*.whl`、`rec_ops-*.whl` 和 `HierarchicalKV_ascend`。

**扩展点**: 
- `dynamic_emb` 支持自定义淘汰策略（通过 `EvictStrategy.kCustomized`）。
- 分片策略可通过 `DynamicEmbParameterConstraints` 定制。

## 5. 关键发现与限制

1. **缺失源码**: `emb_factory.py`, `saver.py`, `sharding_plan.py`, `batched_dynamicemb_function.py` 等关键文件未在源码片段中提供，部分回答基于文档描述。
2. **接口签名不完整**: 多数接口签名通过迁移示例或单元测试推断，未直接展示完整定义。
3. **文档优先**: 对于缺失源码的问题，文档提供了较高可信度的信息，但需注意文档可能未覆盖所有细节。
4. **Python-C++ 绑定**: 多数核心功能通过 Python 绑定调用 C++ 实现，如 `DynamicEmbTable` 通过 `demb.DynamicEmbTable` 绑定。

## 6. 总结

本文档基于提供的源码片段和文档，覆盖了 RecSDK 的主要模块接口、配置和调用链。对于缺失的源码文件，通过文档和上下文进行了合理推断。建议后续补充 `emb_factory.py`、`saver.py` 等关键源码以完善文档。
