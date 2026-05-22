根据提供的 RecSDK 模块摘要，以下是生成的问答检索指南：

# RecSDK 问答检索指南

## 1. 架构选型与组件差异

| 问题类型 | 关键映射路径/模块 | 回答注意事项 |
| :--- | :--- | :--- |
| **组件选型与硬件适配** | - **文档**: `./README.md`, `./docs/zh/rec_full_stack.md`<br>- **模块**: `tf_rec_v1`, `tf_rec_v2`, `torch_rec_v1`, `torch_rec_v2` | 1. **状态区分**: `tf_rec_v1` 和 `torch_rec_v1` 为生产可用；`v2` 版本均为 POC 状态，仅支持 Atlas A5。<br>2. **架构差异**: 明确区分“非全下沉”（v1，CPU处理稀疏操作）与“全下沉”（v2，全NPU计算）。 |
| **计算模式原理** | - **文档**: `./docs/zh/rec_full_stack.md` (关键术语说明) | 解释 CPU 与 NPU 的分工。非全下沉模式下，哈希映射、去重分桶在 CPU 执行；全下沉模式所有计算在 NPU 执行，追求极致性能。 |
| **目录结构与职责** | - **目录**: `./cust_op/`, `./training/` | `cust_op/` 负责底层高性能算子（Ascend C 实现），`training/` 负责上层训练框架封装。回答时应明确“底层算子支撑上层框架”的关系。 |

## 2. 稀疏特征与 Embedding 实现

| 问题类型 | 关键映射路径/模块 | 回答注意事项 |
| :--- | :--- | :--- |
| **Embedding 表类型选择** | - **路径**: `./training/tf_rec_v1/python/core/emb/`<br>- **文件**: `emb_factory.py`, `embedding_proxy.py`, `embedding.py` | 1. **类继承**: 基类为 `BaseSparseEmbedding`。<br>2. **场景区分**: <br>   - 动态扩容选 `HBMDynamicSparseEmbedding`。<br>   - 超大规模/多级存储选 `ExternalStorageSparseEmbedding`。<br>   - 多小表合并优化选 `MergeableSparseEmbedding`。<br>3. **创建方式**: 建议通过 `create_table` 接口或代理类创建，而非直接实例化。 |
| **JaggedTensor 扩展机制** | - **路径**: `./training/torch_rec_v1/hybrid_torchrec/hybrid_torchrec/sparse/`<br>- **文件**: `extended_jagged_tensor.py`, `jagged_tensor_with_count.py` | RecSDK 扩展了标准 TorchRec 的 `JaggedTensor`。`ExtendedJaggedTensor` 提供通用扩展基类，`JaggedTensorWithCount` 专门挂载 `_counts` 字段以支持 NPU 上的分桶去重等高性能计算。 |
| **动态 Embedding (torch_rec_v2)** | - **路径**: `./training/torch_rec_v2/dynamic_emb/`<br>- **源码**: `csrc/dynamic_variable_base.cpp`, `tests/ut/dynamic_emb_op/test_table_operations.py` | 1. **核心差异**: `torch_rec_v2` 采用全下沉的动态 KV 哈希表，由 NPU C++ 实现 (`DynamicVariableBase`)。<br>2. **关键参数**: 关注 `max_capacity` (容量上限)、`evict_strategy` (淘汰策略)、`max_hbm_for_vectors` (显存控制)。 |

## 3. 训练流程与图优化

| 问题类型 | 关键映射路径/模块 | 回答注意事项 |
| :--- | :--- | :--- |
| **TF 图改造机制** | - **路径**: `./training/tf_rec_v1/python/core/graph/`<br>- **文件**: `modifier.py`, `patch.py`, `slicers.py`, `merge_lookup.py` | 1. **介入时机**: 必须在计算梯度之后调用 `modify_graph_and_start_emb_cache`。<br>2. **核心操作**: 替换原生 TF 算子为 NPU 自定义算子；利用 `merge_lookup` 合并查表操作；通过 `slicers.py` 切分子图以实现 CPU/NPU 流水线并行。 |
| **稀疏特征前向调用链** | - **流程**: 数据输入 -> `core/feature_process.py` -> 图优化 (`graph/modifier.py`) -> 底层算子执行 | 描述清楚数据流向：原始特征 -> Embedding 查表构建 -> 图修改/算子替换 -> NPU 执行。强调图优化是自动介入的环节。 |

## 4. 自定义算子开发

| 问题类型 | 关键映射路径/模块 | 回答注意事项 |
| :--- | :--- | :--- |
| **AscendC 算子新增流程** | - **路径**: `./cust_op/ascendc_op/ai_core_op/<op_name>/`<br>- **文件**: `op_host/<op_name>.cpp`, `op_kernel/<op_name>.cpp` | 1. **目录规范**: 需包含 `op_host` (定义与 Tiling) 和 `op_kernel` (内核实现)。<br>2. **注册实现**: 继承 `OpDef` 类，使用 `OP_ADD` 宏注册。<br>3. **配置**: 在 `OpAICoreConfig` 中配置芯片类型（如 `ascend910b`）及动态形状支持。 |
| **算子框架适配** | - **路径**: `./cust_op/framework/` | 说明如何将底层算子绑定到 TensorFlow 或 PyTorch 框架，提供高层 API 接口。 |

## 5. 常见问题排查指引

| 问题现象 | 排查方向 | 涉及模块/文档 |
| :--- | :--- | :--- |
| **硬件不兼容报错** | 检查组件版本与硬件匹配度 | `README.md` 中的硬件支持表（v2 组件仅支持 Atlas A5）。 |
| **Embedding OOM (显存不足)** | 检查存储模式配置 | `emb_factory.py` 中的 `ExternalStorageSparseEmbedding` 配置，确认是否开启了 DDR/SSD 多级存储。 |
| **性能未达预期 (TF)** | 检查图优化是否生效 | `graph/merge_lookup.py` (是否合并查表), `graph/slicers.py` (是否切分 CPU 子图以优化流水线)。 |
| **动态扩容失效** | 检查动态表参数配置 | `torch_rec_v2` 的 `dynamic_emb` 模块，确认 `max_capacity` 和 `evict_strategy` 设置是否合理。 |
