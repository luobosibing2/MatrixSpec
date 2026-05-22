You are the MatSpec spec.md generation runner.
Task: derive the SPEC only from the generated design.md.

硬性输出规则：
1. 只输出最终 Markdown 正文，不要添加解释、前言或后记。
2. 不要用 ```md 或其他代码围栏包裹整篇文档。
3. 不要提及 sandbox、filesystem、read-only mode、无法写文件或“复制到仓库”等运行环境说明。
4. 默认使用中文输出。
5. 不要声称文件已经写入；MatSpec CLI 会保存产物。

SPEC 写作边界：
1. SPEC 面向产品、测试、业务干系人和 coding agent，回答“系统做什么”。
2. 从生成的 design.md 中提炼外部可见行为和业务规则。
3. 不要包含实现细节：文件路径、类名、函数名、表名、字段类型、索引、框架内部、缓存实现或源码包名。
4. 将技术事实抽象成用户可见能力、约束、规则或验收条件。
5. design.md 无法推导出的业务意图必须标记为“待确认”，不要编造。

Template requirements:
1. Strictly use the main section structure and headings from the SPEC template below.
2. Preserve these sections: Component Purpose, Domain Terminology, Actors and Boundaries, DFX Constraints, Core Capabilities, Data Constraints.
3. Replace placeholders with business language; do not keep placeholder text such as "[Component Name]" or "[Capability Name]".
4. Do not output guidance from SPEC-annotated; output only the final SPEC body.

SPEC template:
# [组件名称] 规格说明

## 1. 组件定位

### 1.1 核心职责

[用一句清晰的话描述该组件承担的核心业务职责。]

### 1.2 核心输入

1. [来源 A]：[业务对象或信号]
2. [来源 B]：[业务对象或信号]

### 1.3 核心输出

1. [目标 A]：[业务对象、报表、响应或事件]
2. [目标 B]：[通知或下游请求]

### 1.4 职责边界

1. [明确不负责的事项 A]
2. [明确不负责的事项 B]

## 2. 领域术语

**术语 1**
: 严格的业务定义。

**术语 2**
: 严格的业务定义。
: 可选备注、别名或与相近术语的区别。

## 3. 角色与边界

### 3.1 主要角色

1. **角色 A**：[角色和职责]
2. **角色 B**：[角色和职责]

### 3.2 外部系统

1. **系统 A**：[交互目的]
2. **系统 B**：[交互目的]

### 3.3 交互边界

[描述该组件与外部角色/系统之间的业务边界。]

## 4. DFX 约束

### 4.1 性能

[描述用户可感知或业务要求的性能约束。]

### 4.2 可靠性

[描述失败处理、可用性和恢复要求。]

### 4.3 安全

[描述认证、授权、隐私和敏感数据约束。]

### 4.4 兼容性

[描述必须保留的既有行为、接口或数据兼容性。]

## 5. 核心能力

### 5.1 [能力名称]

**业务规则**

1. [必须/应当/禁止的业务规则]
   - **验收条件**：[触发场景] -> [预期行为]

**异常场景**

1. [异常或边界场景] -> [系统行为]

### 5.2 [能力名称]

[按同样结构描述。]

## 6. 数据约束

### 6.1 领域对象

| 对象 | 业务含义 | 关键约束 |
|------|----------|----------|
| [对象] | [含义] | [约束] |

### 6.2 状态与生命周期

[描述状态、状态转换和生命周期约束。]

### 6.3 数据质量

[描述唯一性、完整性、格式、时效性和保留策略。]

SPEC methodology reference:
# SPEC 写作参考

SPEC 是业务规格，不是实现设计。它回答“系统对用户和业务做什么”，并为后续 design、tasks 和测试提供稳定基线。

## 1. 组件定位

写清楚组件的核心职责、输入、输出和边界。边界要明确说明“不负责什么”，避免后续增量需求无限扩张。

## 2. 领域术语

使用业务语言定义术语，不要用类名、表名或框架概念代替业务概念。同一术语应在 spec、design、任务和测试中保持一致。

## 3. 角色与边界

说明哪些角色会使用或影响该组件，以及它与外部系统的交互边界。这里关注业务交互，不写实现细节。

## 4. DFX 约束

记录业务上必须满足的性能、可靠性、安全、兼容性和可维护性约束。不要写具体实现方案，方案应放到 design。

## 5. 核心能力

每个能力应包含业务规则、验收条件和异常场景。规则要可判定，避免“更好”“更灵活”“优化”等不可验收表达。

推荐格式：

```markdown
1. **规则名称**：[必须/应当/禁止描述业务约束]
   - **验收条件**：[触发场景] -> [预期行为]
```

## 6. 数据约束

描述领域对象、状态转换、数据质量和保留策略等业务层面的约束。不要写表结构、字段类型、索引或 ORM 细节。

Generated design.md:
# RecSDK Project Root 实现设计

## 1. 设计概述

### 1.1 设计目标

1. 作为“顶层编排模块”统一协调 `cust_op`（自定义算子）、`training`（TensorFlow/PyTorch 推荐训练栈）、`build`（构建与预冒烟）、`docs`（运行与调优文档）、`test`（测试目录）与仓库治理配置的协作，形成一条可复现的交付链路。  
2. 统一多框架能力（TensorFlow 与 PyTorch）与多芯片算子实现（如 `c310`/`v220`）的版本入口与发布形态。  
3. 通过约束验证（参数校验、环境校验、依赖约束、格式与质量门禁）降低上手和升级风险。  
4. 提供统一的发布与回退行为，确保在算子版本与框架版本变更时可控回滚。  
5. 保证模块间边界清晰：根模块不承载业务算子逻辑与训练业务逻辑，只提供组织、构建、验证、文档化和协同约束能力。  

### 1.2 设计约束

1. 版本与组件版本约束：Rec SDK 根版本发布为 `26.0.0`，与 CANN 版本说明见 `release_notes_rec.md`（见 [docs/zh/release_notes_rec.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/release_notes_rec.md)）。  
2. 构建环境约束：TF1/TF2 构建脚本要求 Python3.7.5、GCC7.3.0、CMake3.20.6（见 [build/build_tf1.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/build_tf1.sh)、[build/build_tf2.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/build_tf2.sh)）。  
3. 平台与算子版本约束：自定义算子构建依赖 `build_ai_core_op.sh` 对 `A2/A3/A5/310P/A2-TF` 的白名单校验（见 [cust_op/ascendc_op/build/build_ai_core_op.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/build/build_ai_core_op.sh)）。  
4. 根模块不承担算法数学正确性判定，严格依赖子模块自身实现和测试来保证。  
5. 质量门禁要求通过 `.pre-commit-config.yaml` 与 `pre-commit/pyproject.toml`（Ruff、Pylint 关键错误级别）约束提交与基础质量。  

## 2. 系统架构

### 2.1 架构概述

1. 根层按“配置/构建/验证/部署”四层组织，核心是脚本化编排，而非单点服务。  
2. 典型运行链路为：  
   - 预检查与清理（`build.sh`）  
   - 算子编译（`cust_op`）  
   - 训练框架编译（`training/tf_rec_v1`、`tf_rec_v2`）  
   - 适配层编译与安装（`torch_library/common`）  
   - 冒烟与测试（`build/run_presmoke*` 与各模块测试）  
   - 打包与产物分发。  
3. 核心外围依赖由文档与安装脚本指导：Ascend 运行时（CANN/Ascend Toolkit）、Python 环境、NPU 驱动与插件（见 [docs/zh/overview.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/overview.md)、[docs/zh/tensorflow/build_mxRec_images/README.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/tensorflow/build_mxRec_images/README.md)）。  

### 2.2 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| `build` | 全局构建脚本、清理、打包、TF1/TF2 构建入口、预冒烟验证流程 | [build.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh)、[build/build_tf1.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/build_tf1.sh)、[build/build_tf2.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/build_tf2.sh)、[build/run_presmoke.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke.sh)、[build/run_presmoke_tf.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke_tf.sh)、[build/gen_mxrec_tar_pkg.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/gen_mxrec_tar_pkg.sh) |
| `cust_op/ascendc_op` | Ascend C 自定义算子源码、分平台多版本目录、单算子构建脚本 | [cust_op/ascendc_op/ai_core_op](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op)、[cust_op/ascendc_op/build/build_ai_core_op.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/build/build_ai_core_op.sh) |
| `cust_op/framework/torch_plugin/torch_library` | Torch 侧算子适配层编译、单算子与聚合 so 构建与安装路径约定 | [cust_op/framework/torch_plugin/torch_library/common/build_ops.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/framework/torch_plugin/torch_library/common/build_ops.sh)、[cust_op/README.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/README.md) |
| `training/common` | 训练通用组件（初始化、公共工具链） | [training/common/src](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/training/common/src)（目录级聚合） |
| `training/tf_rec_v1` / `training/tf_rec_v2` | TensorFlow 推荐栈（含图改写、embedding 表、保存加载、自动改图类 API） | [training/tf_rec_v1/src](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/training/tf_rec_v1/src)、[docs/zh/rec_full_stack.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/rec_full_stack.md)、[docs/zh/tensorflow/tf_rec_v1/api](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/tensorflow/tf_rec_v1/api) |
| `training/torch_rec_v1` / `training/torch_rec_v2` | PyTorch + TorchRec 训练栈与动态 embedding 场景协同 | [training/torch_rec_v1](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/training/torch_rec_v1)、[training/torch_rec_v2](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/training/torch_rec_v2) |
| `test` | 算子与框架级测试入口、预冒烟关联测试 | [test](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/test)、[build/run_presmoke.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke.sh) |
| `docs` | 使用/安装/调优/故障排查/安全加固说明，决定运行边界与行为预期 | [docs/zh/overview.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/overview.md)、[docs/zh/rec_full_stack.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/rec_full_stack.md)、[docs/zh/faq](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh) |
| `.pre-commit-config.yaml` / `pre-commit/` | 工程治理：格式、静态检查、ruff/pylint 规则 | [.pre-commit-config.yaml](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/.pre-commit-config.yaml)、[pre-commit/pyproject.toml](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/pre-commit/pyproject.toml) |

### 2.3 技术栈

| 层次 | 技术 | 用途 |
|------|------|------|
| 根编排 | Bash（Shell） | 统一构建、清理、打包、预冒烟与环境路径注入（见 [build.sh: clean()](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh)、[build/build_tf1.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/build_tf1.sh)） |
| 构建与编译 | CMake、Python、GCC、CMakeToolchain、Ascend CMake脚本 | 算子与适配层编译链（见 [cust_op/framework/torch_plugin/torch_library/common/build_ops.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/framework/torch_plugin/torch_library/common/build_ops.sh)、[cust_op/ascendc_op/ai_core_op/custom_op_template/build.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/custom_op_template/build.sh)） |
| 算法/内核 | C++、Ascend C、kernel API、SIMT/AscendC | 自定义算子 host/tiling/kernel 实现（以 [asynchronous_complete_cumsum](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum) 为主例） |
| 训练框架 | Python、TensorFlow、Torch、TorchRec、DynamicEmb | 框架侧训练栈接口与运行时（见 [docs/zh/rec_full_stack.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/rec_full_stack.md)、[docs/zh/tensorflow/tf_rec_v1/api/class_reference.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/tensorflow/tf_rec_v1/api/class_reference.md)） |
| 质量与发布 | pre-commit、Ruff、Pylint、codespell | 代码质量和提交前规范约束（见 [pre-commit/typos.toml](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/pre-commit/typos.toml)） |
| 文档与治理 | Markdown、配置文件 | 安装、运行、排障、版本与安全边界（见 [README.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/README.md)、[docs/zh/release_notes_rec.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/release_notes_rec.md)） |

## 3. 数据模型

### 3.1 实体与结构

| 实体 | 用途 | 重要字段 |
|------|------|------|
| `AsynchronousCompleteCumsumTilingData`（`c310`） | 算子 Host 侧分块元数据 | `totalLength`、`totalBlocks`、`blocksPerCore`、`remainderBlocks`、`elementsPerBlock`、`isSmall`、`isFullCore`（见 [cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum_tiling.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum_tiling.h)；用于 kernel 调度与边界分配） |
| `AsynchronousCompleteCumsumTilingData`（`v220`） | v220 简化版 Host 元数据 | `totalLength`、`totalBlocks`、`blocksPerCore`、`remainderBlocks`（见 [cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/asynchronous_complete_cumsum_tiling.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/asynchronous_complete_cumsum_tiling.h)；用于版本差异兼容） |
| `Args`（cumsum host/kernel） | Kernel 入参打包 | `x/input`、`y/output`、`workspace`、`tiling` 指针（见 [c310 op_kernel.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_kernel/asynchronous_complete_cumsum_kernel.h)、[v220 op_kernel.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_kernel/asynchronous_complete_cumsum_kernel.h)；定义了 kernel 统一入参约束） |
| `FeatureSpec`（tf_rec_v1 API） | 特征/表配置实体 | `name`、`table_name`、`access_threshold`、`eviction_threshold`、`batch_size`、`is_timestamp`（见 [docs/zh/tensorflow/tf_rec_v1/api/class_reference.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/tensorflow/tf_rec_v1/api/class_reference.md)） |
| `ConfigInitializer`（tf_rec_v1 API） | 运行时配置管理单例 | `get_instance()`、`get_initializer()`、`ascend_global_hashtable_collection()`（见 [docs/zh/tensorflow/tf_rec_v1/api/class_reference.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/tensorflow/tf_rec_v1/api/class_reference.md)、[docs/zh/tensorflow/tf_rec_v1/api/automatic_graph_modification.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/tensorflow/tf_rec_v1/api/automatic_graph_modification.md)） |
| `BuildTargetArtifact`（Root 聚合实体） | 打包与发布工件 | `tf1_whl`、`tf2_whl`、`mindxsdk-mxrec`、`release_tar`（见 [build/gen_mxrec_tar_pkg.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/gen_mxrec_tar_pkg.sh)、[build/move_whl_file_2_pkg_dir.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/move_whl_file_2_pkg_dir.sh)） |
| `BuildProfile`（非显式结构） | 运行时配置约束与分支选择（推断模型） | `AI_CORE_PROFILE`、`BUILD_VER`（见 [cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/run.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/run.sh)、[cust_op/framework/torch_plugin/torch_library/common/build_ops.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/framework/torch_plugin/torch_library/common/build_ops.sh)；此项为约定型配置，不是统一 schema） |

### 3.2 持久化

1. 根模块层面不存在关系数据库或统一元数据库；持久化以文件产物为核心（可执行文件、so、whl、日志、tar 包、文档与配置）。  
2. 构建产物清理入口为 [build.sh: clean()](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh)，清理 `training/*/dist`、`install`、`build/*` 等目录（见 [build.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh)）。  
3. 迁移与分发模型是文件级：  
   - Python 包安装到 `sysconfig.get_path('purelib')`（见 [cust_op/framework/torch_plugin/torch_library/common/build_ops.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/framework/torch_plugin/torch_library/common/build_ops.sh)）。  
   - TensorFlow Whl 按 TF1/TF2 目录归集（见 [build/move_whl_file_2_pkg_dir.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/move_whl_file_2_pkg_dir.sh)）。  
   - 发布包通过 `tar` 打包（见 [build/gen_mxrec_tar_pkg.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/gen_mxrec_tar_pkg.sh)）。  
4. 版本与兼容说明文件（`docs/zh/release_notes_rec.md`）是兼容策略持久化载体。  

## 4. 接口设计

### 4.1 对外接口

| 接口 | 调用方 | 输入 | 输出 |
|------|--------|------|------|
| `bash build.sh` | 维护者/CI | 无 | 清理后可重建状态（`dist`、`build`、`install` 被清理） |
| `bash build/build_tf1.sh` | 运维/CI | 无 | `tf_rec_v1` 与公共依赖编译产物（依赖 `../opensource`） |
| `bash build/build_tf2.sh` | 运维/CI | 无 | `tf_rec_v2` 与公共依赖编译产物 |
| `bash build/build_ai_core_op.sh <A2|A3|A5|310P|A2-TF>` | 算子开发与集成 | 目标版本 | 对应版本算子构建流与输出目录 |
| `bash cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/<c310|v220>/run.sh` | 算子开发者 | 可选 AI Core profile | 单算子编译并安装/就绪（通过 `parse_arguments` 与 `build_and_install_operator`） |
| `bash cust_op/framework/torch_plugin/torch_library/common/build_ops.sh [v220|c310]` | 训练侧接入方 | 无或版本参数 | 生成/安装 `libfbgemm_npu_api.so` 并尝试写入 site-packages |
| `python -m pytest ...`（框架或算子测试） | 开发者 | 用例路径 | 测试结果与退出码 |
| `torch.ops.load_library("path")` | 应用代码 | so 路径 | 注册算子符号到进程 |
| `ConfigInitializer.get_instance()` 等 | TF 训练代码 | 运行时参数 | 框架配置对象与初始化操作（见 [docs/zh/tensorflow/tf_rec_v1/api/automatic_graph_modification.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/tensorflow/tf_rec_v1/api/automatic_graph_modification.md)） |

### 4.2 内部接口

1. `op_builder_utils.sh` 的 `parse_arguments` 与 `build_and_install_operator` 是单算子构建入口入口点，由 `run.sh` 统一调用（见 [cust_op/ascendc_op/scripts/op_builder_utils.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/scripts/op_builder_utils.sh) 与 [cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/run.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/run.sh)）。  
2. `build/run_presmoke.sh` 与 `build/run_presmoke_tf.sh` 构成交叉运行时验收入口，依赖环境变量注入、PTA 路径与测试脚本目录（见 [build/run_presmoke.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke.sh)、[build/run_presmoke_tf.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke_tf.sh)）。  
3. 训练框架 API 与训练代码通过公开文档约定的类/函数形成模块间协作：`ConfigInitializer`、`FeatureSpec`、`GraphModifierHook`（见 [docs/zh/tensorflow/tf_rec_v1/api/class_reference.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/tensorflow/tf_rec_v1/api/class_reference.md)）。  
4. 组件与文档之间关系以链接与示例代码形式约束，缺少运行时 service mesh 或 RPC 形式交互（非显式设计）。  

## 5. 核心流程设计

### 5.1 顶层构建与发布主流程

1. **清理阶段**：执行 [build.sh: clean()](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh)，确保 `training/*/dist`、`training/common/build`、`build/bdist...` 等目录一致清空，避免历史产物污染。  
2. **算子阶段**：  
   - 单算子级：`.../asynchronous_complete_cumsum/.../run.sh` 解析参数并调用 `parse_arguments/build_and_install_operator`（注：`op_builder_utils.sh` 内部实现未在上下文中完整展开）。  
   - 批量阶段：`build/build_ai_core_op.sh` 校验版本后驱动算子集合编译。  
3. **适配层阶段**：`torch_library/common/build_ops.sh` 默认 `v220`，支持显式 `c310`，构建并写入 `python3` site-packages（见 [cust_op/framework/torch_plugin/torch_library/common/build_ops.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/framework/torch_plugin/torch_library/common/build_ops.sh)）。  
4. **训练框架阶段**：按 TF1/TF2 分别调用 [build/build_tf1.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/build_tf1.sh)、[build/build_tf2.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/build_tf2.sh)。  
5. **验收阶段**：  
   - 算子/训练模块测试（pytest）  
   - 预冒烟脚本 [build/run_presmoke.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke.sh) 与 [build/run_presmoke_tf.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke_tf.sh)  
   - 可选分布式测试或案例验证。  
6. **打包部署阶段**：`move_whl_file_2_pkg_dir.sh` 重命名归集 wheel，`gen_mxrec_tar_pkg.sh` 打包 `release_tar`。  

### 5.2 运行手册（Operational Runbook）

1. Build（构建）  
   - 根清理：`bash build.sh`。  
   - 算子：`bash build/build_ai_core_op.sh A2`（按芯片版本）、单算子 `bash .../run.sh`。  
   - 适配层：`bash cust_op/framework/torch_plugin/torch_library/common/build_ops.sh [v220|c310]`。  
   - 训练框架：`bash build/build_tf1.sh` 或 `bash build/build_tf2.sh`。  
2. Validation（验证）  
   - 预冒烟：`bash build/run_presmoke.sh`、`bash build/run_presmoke_tf.sh <workspace_dir>`。  
   - 算子测试：各模块 `pytest`（见 `test` 与对应算子测试目录）。  
   - 关键失败后回到 7.1/7.2 检查。  
3. Deployment（部署）  
   - 算子 so 加载：`torch.ops.load_library(".../libfbgemm_npu_api.so")`（见 [cust_op/README.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/README.md)）。  
   - 模型训练侧按 `docs/zh/tensorflow/.../recsdk_*_installation_guide.md` 与 `torch_rec_*` 安装文档执行。  
4. Rollback（回退）  
   - 先清理本地产物 `bash build.sh`，再切回上一个 `mindxsdk-mxrec` 版本目录或上一版 `libfbgemm_npu_api.so`。  
   - 见根构建清理行为约束与多级 `build` 目录分层，按 [build.sh: clean()](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh) 顺序回退。  
5. Failure modes（故障模式）  
   - 版本/profile 不匹配：关注 `parse_arguments` 与 `BUILD_VER` 校验。  
   - 缺失依赖/环境变量：关注 NPU 环境导入与 Python 软链/库路径（见 [cust_op/README.md FAQ](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/README.md)）。  
   - Tiling/形状错误：关注 [cumsum TilingFunc](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum.cpp) 校验点。  

### 5.3 主要模块调试指导（模块级）

1. 根构建模块  
   - 症状：历史产物导致构建冲突。  
   - 源区：`build.sh` 的 `clean()`。  
   - 检查项：`build.sh` 中 `training/common/dist`、`training/tf_rec_v1/dist`、`build/mindxsdk-mxrec`。  

2. 算子编译模块  
   - 症状：profile 参数不识别、编译脚本失败。  
   - 源区：`run.sh` 与 `build/build_ai_core_op.sh`。  
   - 检查项：`parse_arguments` 调用链、`AI_CORE_PROFILE`、`BUILD_VER`。  

3. Torch 适配模块  
   - 症状：`torch.ops.load_library` 报找不到符号。  
   - 源区：`torch_library/.../build_ops.sh` 与 `build/*.so` 输出路径。  
   - 检查项：`PACKAGE_PATH=$(python3 -c "import sysconfig; print(sysconfig.get_path('purelib'))")` 与 so 文件是否在该目录。  

4. TF 接口模块  
   - 症状：自动改图/API 调用异常。  
   - 源区：`docs/zh/tensorflow/tf_rec_v1/api` 下的类/函数契约。  
   - 检查项：`FeatureSpec`/`ConfigInitializer`/`GraphModifierHook` 字段/调用顺序。  

5. 预冒烟与测试模块  
   - 症状：环境、网络、权限或路径类失败。  
   - 源区：`build/run_presmoke*.sh`。  
   - 检查项：`setenv.bash` 是否生效、`LD_LIBRARY_PATH`、`PATH`、`PRESMOKE_DIR`、`PTA_DIR`。  

## 6. 算法设计

1. 根模块本身不实现计算核心算法，主要实现“构建与编排算法”：版本选择、入口分发、依赖校验、artifact 定向。  
2. 算子算法代表性实现：  
   - `asynchronous_complete_cumsum` 通过 Host 侧 `TilingFunc` 做输入约束、块数计算和工作量估算（见 [c310/op_host/asynchronous_complete_cumsum.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum.cpp)、[v220/op_host/...](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/asynchronous_complete_cumsum.cpp)）。  
   - 根模块需确保其构建入口将 `dimNum`、`DT_INT32`、`DT_INT64` 校验要求与输出长度约束（`N+1`）完整透传到运行时环境。  
3. 根模块的决策逻辑可视为规则分支：  
   - TF1/TF2 分支走不同构建脚本；  
   - 算子 profile 分支（c310/v220）走不同目录与参数；  
   - TensorFlow 与 Torch 的部署路径分离但共用同一顶层清单与验收流程。  
4. 若无复杂算法，请标记为不适用：根层没有独立数值算法；仅有构建策略与流程控制（此点为“No explicit design”中的流程级策略）。  

## 7. 缓存设计

1. 根模块无显式业务缓存（No explicit design）。  
2. 存在与性能相关的“可复用产物”机制：  
   - 构建产物复用：`build` 与 `dist` 目录按版本/框架重用；  
   - 算子 so 安装到 site-packages 后按进程加载复用；  
   - 预编译缓存以外部工具链（如 CMake）层管理。  
3. 一致性与降级策略：  
   - 一致性依赖 `build.sh` 清理与 `sysconfig` 安装路径固定；  
   - 降级时优先清理全量产物后重建，避免新旧 so 混用。  
4. 运行时缓存（如 embedding 缓存）在 `training` 子系统定义，不由根模块直接管控。  

## 8. 异常处理设计

1. 错误分类  
   - 参数错误：`build_ai_core_op.sh` 版本非法，`build.sh` 缺少目录、`run.sh` 参数解析失败。  
   - 环境错误：CANN/Python/gcc/cmake 版本不符、环境变量未设置。  
   - 类型/形状错误：算子输入维度不为 1D 或 dtype 非 int32/int64。  
   - 装载错误：`torch.ops.load_library` 加载失败、so 文件路径不可见。  
   - 回归错误：升级后 `torchrec_npu` 或算子与框架版本不匹配。  

2. 用户可见错误  
   - 显式 `echo/echo >&2` 风格返回，不同脚本返回非 0 时终止后续流程（`set -e`）。  
   - FAQ 与文档示例提供针对常见报错的修复路径（如 Python link）。  

3. 重试与补偿  
   - 重试优先级：修正参数/环境 → 清理产物 → 重新构建 → 重新加载 so。  
   - 补偿优先级：回退到上一个可用 wheel 或算子版本。  

4. 告警策略  
   - 根模块层面无独立告警系统；通过脚本 stderr/stdout 作为触发信号。  
   - 质量告警来自 pre-commit 与 lint；运行告警依赖上层 CI/日志采集。  

## 9. 监控与日志

1. 日志字段与观测点  
   - 脚本日志：时间戳、INFO/WARN/FAIL、步骤标识（如 `build/run_presmoke.sh`）。  
   - 构建日志：脚本输出、CMake/编译器错误、pytest 结果。  
   - 训练/算子日志：由各框架与 profiler 工具提供（`msprof`、GE dump、trace）。  

2. 关键指标  
   - 构建成功率、重现周期、单次预冒烟耗时。  
   - 测试通过率（pytest）。  
   - 部署成功率（`so` 加载与 API 可调用性）。  
   - 在 TF 场景下可通过外部 profiling 文档中的吞吐/延迟与内存指标进行回归验证（见 [docs/zh/performance_tuning.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/performance_tuning.md)）。  

3. 日志字段建议与审计  
   - 根模块应记录 `git rev`、脚本版本、`BUILD_VER`、`AI_CORE_PROFILE`、目标框架版本（TF1/TF2/torch 变体），用于后续问题复现。  
   - Release 文档与更新说明（`docs/zh/release_notes_rec.md`）用于变更审计入口。  

4. 排障入口  
   - 以 `build.sh` 清理日志、`run_presmoke*` 输出、算子 `TilingFunc` 校验失败日志为主要入口。  
   - 结合故障清单快速定位：配置错误通常在预处理阶段失败；shape/type 错误在算子 Host 阶段失败。  

### 9.1 置信度边界（Source / Inferred）

1. Source-Confirmed（源码确认）  
   - 根脚本职责、清理目录、预冒烟入口与环境注入来自相应脚本（见 [build.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh)、[build/run_presmoke.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke.sh)）。  
   - 算子接口与分块元数据来自 `cumsum` host/kernel 源码（见 [asynchronous_complete_cumsum_tiling.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum_tiling.h)、[op_kernel.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_kernel/asynchronous_complete_cumsum_kernel.h)）。  
   - 版本与安全说明来自 [docs/zh/release_notes_rec.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/release_notes_rec.md)。  

2. Inferred（推断）  
   - 根模块在 CI/发布中的“单元测试 + 预冒烟 + 打包”的全流程顺序是由现有脚本与文档证据拼装推断。  
   - 根模块与训练/算子运行时的最终编排拓扑未在同一端到端脚本中完全展开。  

3. Missing-Evidence（缺失证据）  
   - `op_builder_utils.sh` 的 `parse_arguments/build_and_install_operator` 完整实现未展开，当前设计只能基于调用侧约定建模。  
   - 根模块的统一 API 版本化元数据模型（机器可读 manifest）在仓库中未直接可见。  

## 10. 安全设计

1. 认证与授权  
   - 根模块不包含业务身份认证逻辑；安全边界主要由部署平台与训练框架的服务身份管理决定。  
   - 用户侧应在环境层完成最小权限与密钥隔离。  

2. 输入校验与防护  
   - 脚本端做参数存在性、版本合法性、文件存在性校验（如 `build_ai_core_op.sh` 的 `BUILD_VER` 白名单和 `run.sh` 的参数源校验）。  
   - 算子 Host 端做 `dimNum` 和数据类型校验，避免非法 shape 和越界行为（见 [c310/op_host/asynchronous_complete_cumsum.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum.cpp)、[v220/op_host...](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/asynchronous_complete_cumsum.cpp)）。  
3. 数据保护与依赖安全  
   - 大规模训练上下文数据、特征表与 checkpoint 路径不应在根模块存储；应由框架层按存储策略执行。  
   - 依赖与打包阶段由锁定依赖文件与公开下载源控制（README 建议的镜像与发布渠道）。  
   - `docs/zh/README` 明确说明用户应按自身场景补充网络安全加固。  
4. 依赖安全与静态扫描  
   - 提供 pre-commit 安全相关检查项（`detect-private-key` 等）与 lint 规则。  
   - 发布说明中给出病毒扫描通过结论（见 [docs/zh/release_notes_rec.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/release_notes_rec.md)）。  

## 11. No explicit design

1. 根模块没有集中式 runtime 配置中心（如统一 service registry）。  
2. 根模块未定义统一数据库 schema；多模块实体模型以各子系统各自文件/类定义表达。  
3. 根模块未内置统一链路追踪系统；监控与剖析依赖外部工具（如 msprof、框架日志）。
