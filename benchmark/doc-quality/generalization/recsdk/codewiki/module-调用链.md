## Ascend/RecSDK 架构与接口文档

本文档基于提供的源码片段，针对评测问题涉及的组件、接口、调用链、配置及扩展点进行说明。

### 1. 稀疏特征前向计算调用链 (tf_rec_v1)
**问题背景**：追踪稀疏ID特征从用户输入到完成Embedding查表的完整路径。

**调用链分析**：
根据现有代码片段和文档，`tf_rec_v1`中稀疏特征的前向计算主要流程如下：

1.  **输入与数据预处理**：
    *   用户输入的稀疏ID特征首先通过 `tf.data.Dataset` API 进行加载和预处理（`data/dataset.py` 模块负责数据集构建）。
    *   预处理可能包括ID转换、特征筛选等操作。

2.  **特征处理与查表构建**：
    *   `core/feature_process.py` 模块负责将原始特征配置转换为模型所需的Embedding查表操作。此阶段会根据特征配置（如表名、维度等）创建 `EmbeddingLookup` 或类似算子。

3.  **图优化与改造（关键介入环节）**：
    *   **介入时机**：根据文档 `docs/zh/tensorflow/tf_rec_v1/api/automatic_graph_modification.md`，图改造通过 `modify_graph_and_start_emb_cache` 函数触发，调用时机明确要求在**计算梯度之后**。
    *   **核心操作**：`graph/modifier.py` 中的图改造逻辑会分析并修改计算图。主要目标是**适配NPU执行模型**，优化查表操作。具体操作包括：
        *   **替换/修改算子**：将原生TensorFlow的查表相关算子（如 `EmbeddingLookup`, `Unique` 等）替换或封装为NPU自定义算子（如源码片段中 `cust_op/ascendc_op/ai_core_op/dense_embedding_codegen_lookup_function` 目录下的算子）。
        *   **子图切分**：借助 `graph/patch.py` 和 `graph/slicers.py`，将包含特定类型算子（如通过 `LookupSubgraphSlicerHook` 指定的 `StringToNumber` 等类型）的Key Tensor子图识别并切分，使其能够在CPU侧的预取阶段执行，以实现流水线优化。
        *   **合并查表**：`graph/merge_lookup.py` 中的 `do_merge_lookup` 函数负责在自动改图模式下，将多次查询同一张表的操作进行合并，减少查表开销。此操作在 `Optimizer.compute_gradients()` 内部通过patch执行，或在eval阶段改图时执行。

4.  **底层执行**：
    *   经过图改造后，查表操作最终映射到底层NPU自定义算子（如 `dense_embedding_codegen_lookup_function`），这些算子直接在NPU上高效执行，完成最终的Embedding向量查询。

**总结**：`graph/modifier.py` 的图改造在**用户定义完计算图、计算梯度之后**介入。它通过对图的分析和修改，将Embedding查表操作转化为适配NPU的自定义算子，并利用 `merge_lookup` 进行合并优化，最后由底层算子执行查表。

---

### 2. 图改造机制 (Graph Modification)
**问题背景**：`graph/modifier.py` 的调用时机、修改对象及适配方法。

**调用时机**：
*   图改造由 `mx_rec.graph.modifier` 模块的 `modify_graph_and_start_emb_cache` 函数启动。
*   **明确要求**：该函数必须在计算梯度之后调用（例如，在 `tf.gradients(loss, variables)` 之后），以确保梯度计算时的计算图结构正确。同时，若使用 `NPUEstimator`，相关Hook（如 `GraphModifierHook`, `LookupSubgraphSlicerHook`）需按特定顺序注册，`GraphModifierHook` 需在 `LookupSubgraphSlicerHook` 等其他Hook之后。

**修改内容与适配方式**：
*   **替换/修改的算子**：主要针对TensorFlow原生计算图中的 **Embedding查表相关算子**（如 `EmbeddingLookup`, `Unique` 等）。
*   **适配NPU执行模型的方式**：
    1.  **算子替换**：将原生算子替换为NPU自定义算子（位于 `cust_op/ascendc_op/ai_core_op/` 目录下）。这些自定义算子利用NPU的硬件特性实现高效查表。
    2.  **子图切分**：配合 `LookupSubgraphSlicerHook`，将包含特定CPU算子（如 `StringToNumber`）的Key Tensor生成子图切分至CPU执行，使得Embedding Key的生成（CPU密集型）与查表（NPU密集型）可以流水线并行。
    3.  **合并优化**：通过 `do_merge_lookup` 合并重复的查表操作，减少NPU与Host之间的交互次数和显存访问。

**`graph/patch.py` 与 `graph/slicers.py` 的角色**：
*   **`graph/patch.py`**：负责对原始计算图进行“打补丁”式的修改。它可能包含对图节点、张量或操作的包装、替换或插入逻辑，是实现算子替换等图修改的核心工具。
*   **`graph/slicers.py`**：专注于**子图切分**逻辑。它识别计算图中需要切分的子图（例如，由 `LookupSubgraphSlicerHook` 指定的算子类型构成的子图），并将其从主计算图中分离出来，为后续的CPU/NPU流水线执行做准备。

---

### 3. 混合训练流水线 (Hybrid Training Pipeline)
**问题背景**：`torch_rec_v1` 混合训练流水线如何异步流水化CPU查表与NPU计算。

**流水线实现机制**：
基于TorchRec的 `TrainPipelineSparseDist` 思想，RecSDK实现了混合训练流水线，其核心是**将不同类型的计算分发到不同设备（CPU/NPU）上并行执行**，并通过异步通信隐藏数据传输延迟。

**阶段划分与 `progress` 函数**：
每个训练step的 `progress` 函数（或等价方法）通常执行以下阶段：
1.  **阶段一 - 数据预取与准备 (CPU)**：
    *   从数据加载器获取下一个batch的数据。
    *   执行数据预处理，特别是**稀疏特征的ID查表和Embedding向量获取**。这部分在CPU（主机内存侧）完成。
    *   将获取的Embedding向量异步传输至NPU设备内存。
2.  **阶段二 - 前向与反向计算 (NPU)**：
    *   NPU接收从CPU传来的Embedding向量，执行Dense网络的前向计算。
    *   执行反向传播，计算梯度。
3.  **阶段三 - 梯度聚合与参数更新 (CPU/NPU)**：
    *   将Dense部分的梯度在NPU上聚合（如果使用分布式）。
    *   对于稀疏表，梯度可能被传回CPU进行聚合，并更新CPU侧的Embedding表（如果采用CPU-Host参数服务器模式）。更新后的参数可用于下一个step的查表。

**CPU与NPU的数据搬运与同步点**：
*   **数据搬运**：
    *   **CPU -> NPU**：稀疏Embedding向量（查表结果）通过异步拷贝（如 `torch_npu` 提供的异步传输API）从主机内存传输到NPU设备内存。
    *   **NPU -> CPU**：部分梯度或控制信息可能需要回传。
*   **同步点**：
    *   **流水线同步**：`progress` 方法内部使用 `torch.cuda.stream` (在NPU上为 `torch_npu.npu.stream`) 或类似的流同步机制，确保数据传输完成后再开始NPU计算，同时允许当前batch的NPU计算与下一个batch的CPU查表重叠。
    *   **阶段间隐式同步**：NPU前向计算的开始依赖于CPU查表和数据传输的完成。这种依赖通过事件或流的同步来保证。

---

### 4. 自动子图计算 (ASC) 模块
**问题背景**：`tf_rec_v1/python/core/asc/` 模块的作用及内部组件职责。

**模块作用**：
ASC (Automatic Subgraph Computation) 模块旨在**自动化计算子图的构建与管理**，可能用于将部分计算（如特征提取、预处理）独立成子图，以提高计算效率或支持特定的硬件加速。它可能涉及将计算图分割、重组，并生成可独立执行的计算单元。

**组件职责**：
*   **`build_graph.py`**：
    *   **职责**：作为图构建的入口，负责解析模型配置或特征描述，**构建初始化的、未优化的计算图**。它可能根据特征定义创建初始的算子节点和连接。
*   **`manager.py`**：
    *   **职责**：作为ASC流程的**管理中心**。它可能负责协调子图的编译、缓存、调度和执行。例如，管理子图的版本、执行状态，并在运行时决定何时、如何调用某个子图。
*   **`merge_table.py`**：
    *   **职责**：负责**合并多个特征表**的查询或操作。这与 `graph/merge_lookup.py` 的功能类似，可能是ASC流程中针对特征表合并的特定实现，旨在减少查表次数，优化内存和计算。
*   **`feature_spec.py`**：
    *   **职责**：**定义和解析特征规范**。它可能包含特征名称、类型、维度、表映射等元数据，为 `build_graph.py` 和 `manager.py` 提供建图和管理的依据。
*   **`graph/hooks.py`**：
    *   **职责**：定义和注册**训练生命周期中的钩子**。这些Hook在训练的特定阶段（如 `before_run`, `after_run`, `begin`, `end`）被触发。
    *   **触发时机与功能**：在 `tf.estimator.Estimator` 或 `NPUEstimator` 模式下，Hook会在每个训练步骤的开始或结束时被调用。ASC模块可能利用Hook在 `begin` 阶段初始化子图，或在 `before_run` 阶段准备输入数据，在 `after_run` 阶段处理输出或更新状态。

---

### 5. 动态嵌入表配置详解 (Dynamic Emb Table)
**问题背景**：`DynamicEmbTableOptions` 配置字段及策略枚举语义。

**关键配置字段 (`DynamicEmbTableOptions`)**：
以下字段定义了动态嵌入表的核心行为：
*   `init_capacity`：哈希表的初始容量（桶的数量）。哈希表会根据负载因子自动扩容。
*   `max_capacity`：哈希表允许的最大容量。
*   `max_load_factor`：**最大负载因子**。当哈希表中元素数量与桶数量的比例超过此值时，会触发扩容。`bucket_capacity`（单个桶的最大元素数）和 `max_load_factor` 共同控制哈希表的冲突策略。
*   `bucket_capacity`：每个哈希桶中最多可以存储的元素数量。此值需为2的幂次（代码中有向上取整到最近2的幂的逻辑）。
*   `score_strategy`：定义如何计算一个键值对的“分数”，分数用于淘汰策略。见下文详解。
*   `evict_strategy`：定义当哈希表满时，如何选择键值对进行淘汰。见下文详解。
*   `safe_check_mode`：定义当哈希桶已满且无法插入新键值对时的处理行为。见下文详解。
*   `initializer_args`：初始化器参数，定义新嵌入向量的初始值生成方式（如 `DynamicEmbInitializerArgs`）。
*   `optimizer_type`：与动态嵌入表关联的优化器类型（如 `Null`, `SGD`, `Adam`），用于训练时更新嵌入向量。

**枚举语义与配合关系**：

1.  **`DynamicEmbEvictStrategy` (淘汰策略)**：
    *   **LRU**：最近最少使用。淘汰分数最低（即最久未被访问）的键值对。
    *   **LFU**：最不经常使用。淘汰访问频率最低的键值对。
    *   **EPOCH_LRU / EPOCH_LFU**：基于训练轮次信息的LRU/LFU变体。可能只在每个epoch结束时更新分数或执行淘汰。
    *   **CUSTOMIZED**：自定义淘汰策略。允许用户通过接口完全控制淘汰逻辑。

2.  **`DynamicEmbScoreStrategy` (分数策略)**：
    *   **TIMESTAMP**：分数为访问时的**时间戳**（纳秒级）。新访问的键分数更高（时间戳更大）。配合LRU使用时，自然地淘汰最旧的项。
    *   **STEP**：分数为全局的**训练步数**。同一个step内所有访问的键获得相同分数。这可以用于实现基于时间或步数的淘汰。
    *   **CUSTOMIZED**：分数完全由用户通过 `set_score` 接口设置，提供最大灵活性。
    *   **LFU**：分数为访问频率（或其变种）。配合LFU淘汰策略使用。

    **配合关系**：`score_strategy` 定义了分数的生成方式，`evict_strategy` 定义了如何利用分数进行淘汰。两者需要合理搭配：
    *   `LRU` 通常与 `TIMESTAMP` 或 `STEP` 搭配。
    *   `LFU` 与 `LFU` 分数策略搭配。
    *   `CUSTOMIZED` 策略可以与任何淘汰策略搭配，由用户自定义逻辑。

3.  **`DynamicEmbCheckMode` (安全检查模式)**：
    当插入操作因桶满等原因失败时的处理行为：
    *   **ERROR**：**抛出异常**，训练立即终止。适用于要求严格的场景，确保所有数据都被正确处理。
    *   **WARNING**：**打印警告日志**，但允许训练继续，插入失败的数据可能被丢弃。适用于可容忍部分数据丢失的调试场景。
    *   **IGNORE**：**静默忽略**，不做任何处理。适用于性能敏感且能接受数据丢失的场景。
    **选择建议**：训练初期或调试阶段应开启 `WARNING` 或 `ERROR` 以发现配置问题（如 `bucket_capacity` 过小）。确认配置合理后，可使用 `IGNORE` 以避免日志开销。生产环境推荐 `ERROR` 以保证数据完整性。
