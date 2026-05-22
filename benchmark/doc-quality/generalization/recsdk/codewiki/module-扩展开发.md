# RecSDK 自定义算子与优化器扩展开发文档

本文档基于 Ascend/RecSDK 源码片段，详细说明新增 AscendC 自定义算子、TF 框架适配层及自定义稀疏优化器的开发流程，覆盖组件、接口、调用链、配置部署及扩展点，并提供可验证的源码依据。

---

## 1. AscendC 自定义算子新增流程 (针对 `recsdk-15`)

### 1.1 核心目录结构
根据源码分析，AscendC 算子位于 `cust_op/ascendc_op/ai_core_op/` 目录下。新增算子需遵循以下结构（以 `cust_op_by_addr` 算子为例）：
- **算子根目录**：`cust_op/ascendc_op/ai_core_op/<op_name>/`
- **版本子目录**：`v220` 或 `c310`（对应芯片版本）
- **核心文件**：
  - `op_host/<op_name>.cpp`：算子定义与 Tiling 函数实现
  - `op_kernel/<op_name>.cpp`：算子内核（Kernel）实现
  - `CMakeLists.txt`：构建配置（在模板工程中）
  - `CMakePresets.json`：编译预设（在模板工程中）

**源码依据**：
```
./cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/op_host/embedding_lookup_by_address.cpp
./cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/op_kernel/embedding_lookup_by_address.cpp
```

### 1.2 算子实现核心要点
#### 1.2.1 算子定义
在 `op_host` 目录下，需继承 `OpDef` 类并注册算子。以下为 `embedding_lookup_by_address.cpp` 的关键结构：
```cpp
namespace ops {
    class EmbeddingLookupByAddress : public OpDef {
    public:
        EmbeddingLookupByAddress(const char *name) : OpDef(name) {
            // 输入声明
            this->Input("address")
                .ParamType(REQUIRED)
                .DataType({ge::DT_INT64, ge::DT_INT64, ge::DT_INT64})
                .Format({ge::FORMAT_ND, ge::FORMAT_ND, ge::FORMAT_ND})
                .UnknownShapeFormat({ge::FORMAT_ND, ge::FORMAT_ND, ge::FORMAT_ND});
            // 输出声明
            this->Output("y")
                .ParamType(REQUIRED)
                .DataType({ge::DT_INT32, ge::DT_FLOAT, ge::DT_FLOAT16})
                .Format({ge::FORMAT_ND, ge::FORMAT_ND, ge::FORMAT_ND})
                .UnknownShapeFormat({ge::FORMAT_ND, ge::FORMAT_ND, ge::FORMAT_ND});
            // 属性声明
            this->Attr("embedding_dim").AttrType(OPTIONAL).Int(32);
            this->Attr("embedding_type").AttrType(OPTIONAL).Int(1);
            // 形状推断与 Tiling 设置
            this->SetInferShape(ge::InferShape1).SetInferDataType(ge::InferDataType1);
            this->AICore().SetTiling(optiling::TilingFunc);
            // 芯片配置
            OpAICoreConfig aicConfig;
            aicConfig.DynamicCompileStaticFlag(true)
                .DynamicFormatFlag(true)
                .DynamicRankSupportFlag(true)
                .DynamicShapeSupportFlag(true);
            this->AICore().AddConfig("ascend910b", aicConfig);
        }
    };
    OP_ADD(EmbeddingLookupByAddress); // 算子注册宏
}
```
**源码文件**：`cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/op_host/embedding_lookup_by_address.cpp` (第90-116行)

#### 1.2.2 算子内核
内核实现需定义 `__aicore__` 函数，使用 AscendC API（如 `DataCopy`、`TPipe` 等）。以下为 `embedding_lookup_by_address.cpp` 的内核结构：
```cpp
extern "C" __global__ __aicore__ void embedding_lookup_by_address(
    GM_ADDR address, GM_ADDR y, GM_ADDR usrWorkspace, GM_ADDR tiling) {
    GET_TILING_DATA(constData, tiling); // 获取 Tiling 数据
    int32_t embeddingType = constData.embedding_type;
    // 核心处理流程
    switch (embeddingType) {
        case 0: {
            AscendC::KernelEimtable<int32_t> op;
            op.Init_param(tiling);
            op.Init(address, y);
            op.Process();
        } break;
        // ... 其他类型处理
    }
}
```
**源码文件**：`cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/op_kernel/embedding_lookup_by_address.cpp` (第199-224行)

#### 1.2.3 Tiling 函数
Tiling 函数负责切分任务、设置核数、计算数据分块等。示例如下：
```cpp
static ge::graphStatus TilingFunc(gert::TilingContext *context) {
    // 获取工作空间大小
    size_t *currentWorkspace = context->GetWorkspaceSizes(1);
    currentWorkspace[0] = SYS_WORKSPACE_SIZE + USR_SIZE;
    // 获取属性并校验
    auto *attrs = context->GetAttrs();
    const auto *attr0Value = attrs->GetAttrPointer<int64_t>(0);
    int32_t embeddingDim = *attr0Value;
    // 计算数据分块参数
    int32_t addrPerLoop = static_cast<int32_t>((UB_LIMIT /
        static_cast<uint32_t>(occupyAddressBytesNum)) & (~3u));
    // 设置 Tiling 数据并保存
    TilingData1 tiling;
    tiling.set_ping_pong_num(PING_PONG_NUM);
    tiling.set_addr_nums(inputShape);
    tiling.SaveToBuffer(context->GetRawTilingData()->GetData(), 
                       context->GetRawTilingData()->GetCapacity());
    context->SetBlockDim(BLOCK_DIM); // 设置核数
    return ge::GRAPH_SUCCESS;
}
```
**源码文件**：`cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/op_host/embedding_lookup_by_address.cpp` (第43-89行)

### 1.3 算子注册与配置部署
#### 1.3.1 算子类型映射注册
在 `cust_op/ascendc_op/config/transform.json` 中需注册算子类型映射。根据 `op_builder_utils.sh` 的路径推断：
```bash
readonly CONFIG_DIR="${__PROJECT_ROOT}/config"
```
**推断位置**：`./cust_op/ascendc_op/config/transform.json`（源码未提供内容，需用户填写映射关系）

#### 1.3.2 编译环境与脚本
编译脚本 `build/build_ai_core_op.sh`（源码未提供）依赖以下环境变量（来自 `op_builder_utils.sh`）：
```bash
export AI_CORE_PROFILE="${AI_CORE_PROFILE:-v220}"  # 芯片版本，可选 c310/v220
export vendor_name="${vendor_name}"                 # 算子厂商名（必须提供）
export ai_core="${ai_core:-ai_core-Ascend910B1}"   # AI Core类型
export GPP_PATH="${gpp_path}"                      # g++ 编译器路径
```
**源码文件**：`./cust_op/ascendc_op/scripts/op_builder_utils.sh` (第62-67行、第118-126行)

#### 1.3.3 生成算子工程
使用 `msopgen` 工具生成算子工程，核心函数：
```bash
gen_build_dir() {
    local work_dir="$1"; local vendor_name="$2"; local op_name="$3"
    rm -rf "${work_dir}/${vendor_name}"
    msopgen gen -i "${json_file}" -f tf -c ${ai_core} -lan cpp \
                -out "${work_dir}/${vendor_name}" -m 0 -op ${op_name}
    # 设置版本并覆盖模板文件
    set_build_version "${work_dir}/${vendor_name}"
    if [ "${BUILD_VERSION}" = "modern" ]; then
        overwrite_source_with_target "${work_dir}/${vendor_name}" \
        "${__PROJECT_ROOT}/ai_core_op/custom_op_template"
    fi
}
```
**源码文件**：`./cust_op/ascendc_op/scripts/op_builder_utils.sh` (第195-208行)

---

## 2. TF 框架适配层开发 (针对 `recsdk-16`)

### 2.1 适配层目录结构
TF 框架适配层位于 `cust_op/framework/tf_plugin/src/` 目录。核心文件为 C++ 实现（如 `cust_embedding_by_address.cpp`、`lazy_adam.cpp`），需注册 TF 自定义算子。

### 2.2 TF 算子注册与实现
#### 2.2.1 注册宏 (`REGISTER_OP`)
注册宏需声明算子名称、输入输出类型、属性等。示例结构（推断自源码）：
```cpp
REGISTER_OP("EmbeddingLookupByAddress")
    .Input("address: int64")
    .Output("y: float")  // 或支持多类型
    .Attr("embedding_dim: int = 32")
    .Attr("embedding_type: int = 1")
    .SetShapeFn([](InferenceContext* c) {
        // 形状推断逻辑
        return Status::OK();
    });
```
（注：源码中未提供 TF 插件文件，故结构推断自 AscendC 算子定义与 RecSDK 文档描述）

#### 2.2.2 Compute 函数实现
Compute 函数需调用 CANN 底层接口。在 `lazy_adam.py` 中，调用示例：
```python
output_m, output_v, output_var = import_host_pipeline_ops().lazy_adam(
    grad, nd_indices, slot_m, slot_v, var,
    learning_rate, self._custom_initial_beta1,
    self._custom_initial_beta2, self._custom_initial_epsilon)
```
**源码文件**：`./training/tf_rec_v1/python/optimizers/lazy_adam.py` (第145-152行)
这表明 TF 端通过 `import_host_pipeline_ops()` 调用底层算子（推断该算子在 TF 插件中注册）。

#### 2.2.3 公共接口声明
头文件 `include/mxrec_tf_plugin.h`（源码未提供）应声明公共接口，如：
```cpp
// 推断内容（基于 RecSDK 组件描述）
namespace mxrec {
    // 算子注册接口
    void RegisterCustomOps();
    // 算子调用接口
    tensorflow::Status LazyAdamOpKernel(
        tensorflow::OpKernelContext* context);
    // Embedding 相关接口
    tensorflow::Status EmbeddingLookupByAddress(
        tensorflow::OpKernelContext* context);
}
```
**推断依据**：`./docs/zh/rec_full_stack.md` 中描述 TF 组件 `tf_rec_v1`、`tf_rec_v2` 需通过适配层调用底层算子。

### 2.3 调用链示例
稀疏优化器调用链（以 LazyAdam 为例）：
```
Python 端：LazyAdamOptimizer._apply_sparse() 
          ↓ 调用 import_host_pipeline_ops().lazy_adam()
TF 插件端：LazyAdamOpKernel::Compute() 
          ↓ 调用 CANN 底层算子
CANN 算子端：embedding_update_by_address (AscendC Kernel)
```
**源码依据**：`./training/tf_rec_v1/python/optimizers/lazy_adam.py` (第145行)、`./cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/op_kernel/embedding_update_by_address.cpp`

---

## 3. 自定义稀疏优化器开发 (针对 `recsdk-17`)

### 3.1 基类继承
自定义优化器需继承 `training/tf_rec_v1/python/optimizers/base.py` 中的基类。源码示例：
```python
class CustomizedFtrl(ftrl.FtrlOptimizer, CustomizedOptimizer):
    def __init__(self, learning_rate, use_locking=False, name="Ftrl", **kwargs):
        self.optimizer_type = "ftrl"
        self.optim_param_list = ["accum", "linear"]
        super(CustomizedFtrl, self).__init__(...)  # 初始化基类
```
**源码文件**：`./training/tf_rec_v1/python/optimizers/ftrl.py` (第63-71行)
```python
class CustomizedLazyAdam(adam.AdamOptimizer, CustomizedOptimizer):
    def __init__(self, learning_rate=0.001, beta1=0.9, ...):
        self.optimizer_type = "LazyAdam"
        self.optim_param_list = ["momentum", "velocity"]
        super(CustomizedLazyAdam, self).__init__(...)
```
**源码文件**：`./training/tf_rec_v1/python/optimizers/lazy_adam.py` (第72-81行)

### 3.2 必须实现的抽象方法
#### 3.2.1 `_apply_sparse` (稀疏梯度更新核心方法)
稀疏场景下核心路径，实现示例：
```python
def _apply_sparse(self, grad, var):
    # 处理重复索引
    unique_local_grad, unique_keys = self.sum_same_id_gradients(grad=grad.values, var=var, is_expansion=False)
    gradient_no_duplicate_indices = ops.IndexedSlices(
        indices=unique_keys, values=unique_local_grad, dense_shape=grad.dense_shape)
    return self._apply_sparse(gradient_no_duplicate_indices, var)

@control_update_op_decorator
def _apply_sparse(self, grad, var):
    return self._apply_sparse_shared(
        grad.values, var, grad.indices, lambda x, i, v: tf.compat.v1.scatter_nd_add(x, i, v))
```
**源码文件**：`./training/tf_rec_v1/python/optimizers/lazy_adam.py` (第109-121行)
调用逻辑：当梯度为 `IndexedSlices` 类型时，TF 自动调用 `_apply_sparse`。

#### 3.2.2 `_apply_dense` (稠密梯度更新方法)
稠密场景调用，但稀疏优化器中常不实现：
```python
def _apply_dense(self, grad, var):
    raise NotImplementedError("You are using a wrong type of variable.")
```
**源码文件**：`./training/tf_rec_v1/python/optimizers/lazy_adam.py` (第123行)
**注意**：稀疏 Embedding 场景下，不应调用此方法（抛出异常提示变量类型错误）。

#### 3.2.3 `get_config` (配置序列化)
获取优化器配置（推断需实现，源码未显示具体实现）。示例结构：
```python
def get_config(self):
    config = {
        "learning_rate": self._learning_rate,
        "beta1": self._beta1,
        "beta2": self._beta2,
        "epsilon": self._epsilon,
        "name": self._name
    }
    return config
```
（推断依据：TF 优化器基类要求）

### 3.3 核心路径分析
稀疏 Embedding 场景下：
- **核心路径**：`_apply_sparse` 被调用，因为 Embedding 查询返回稀疏梯度（`IndexedSlices`）。
- **调用场景**：`_apply_sparse_duplicate_indices` 先处理重复梯度索引，再调用 `_apply_sparse`。
- **实现要点**：需实现 `_apply_sparse_shared` 等内部方法，计算更新值并应用。

**源码依据**：`./training/tf_rec_v1/python/optimizers/lazy_adam.py` (第109-121行)、`./training/tf_rec_v1/python/optimizers/ftrl.py` (第78-95行)

### 3.4 扩展点：融合优化器
可设置 `use_fusion_optim=True` 启用融合优化器，直接调用底层算子：
```python
if self.use_fusion_optim:
    output_m, output_v, output_var = import_host_pipeline_ops().lazy_adam(
        grad, nd_indices, slot_m, slot_v, var, ...)
    return control_flow_ops.group(output_m, output_v, output_var)
```
**源码文件**：`./training/tf_rec_v1/python/optimizers/lazy_adam.py` (第144-152行)

---

## 4. 配置与部署总结
- **算子编译**：依赖 `msopgen` 工具、`g++` 环境、芯片版本配置（`AI_CORE_PROFILE`）。
- **算子注册**：需在 `transform.json` 映射类型，并通过 `OP_ADD` 宏注册。
- **TF 适配**：通过 `REGISTER_OP` 注册算子，Compute 函数调用 CANN 算子接口。
- **优化器扩展**：继承 `CustomizedOptimizer` 基类，实现 `_apply_sparse` 核心方法。

所有信息均基于提供的源码片段推断，未编造上下文没有的函数签名。扩展开发需参考 RecSDK 文档与源码模板（如 `custom_op_template/` 目录）。

**关键源码文件索引**：
- 算子工具：`./cust_op/ascendc_op/scripts/op_builder_utils.sh`
- 算子示例：`./cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/op_host/embedding_lookup_by_address.cpp`
- 优化器示例：`./training/tf_rec_v1/python/optimizers/lazy_adam.py`
- 组件描述：`./docs/zh/rec_full_stack.md`
