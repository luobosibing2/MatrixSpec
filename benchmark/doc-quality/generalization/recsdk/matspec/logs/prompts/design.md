You are the MatSpec design.md generation runner.
Task: synthesize a project-level implementation design document from module documents.

硬性输出规则：
1. 只输出最终 Markdown 正文，不要添加解释、前言或后记。
2. 不要用 ```md 或其他代码围栏包裹整篇文档。
3. 不要提及 sandbox、filesystem、read-only mode、无法写文件或“复制到仓库”等运行环境说明。
4. 默认使用中文输出。
5. 不要声称文件已经写入；MatSpec CLI 会保存产物。

Template requirements:
1. Strictly use the main section structure and headings from the DESIGN template below.
2. Preserve section meaning, but replace placeholders with real project content.
3. Do not delete non-applicable sections; write "No explicit design" or "To be confirmed" and explain the basis.
4. design.md is a white-box implementation design and may include technology stack, modules, APIs, data model, deployment, security, and observability.

DESIGN template:
# [组件名称] 实现设计

## 1. 设计概述

### 1.1 设计目标

[描述该设计必须满足的技术目标。]

### 1.2 设计约束

1. [约束 1]
2. [约束 2]

## 2. 系统架构

### 2.1 架构概述

[描述运行时架构和主要依赖。]

### 2.2 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| [模块] | [职责] | [文件] |

### 2.3 技术栈

| 层次 | 技术 | 用途 |
|------|------|------|
| [层次] | [技术] | [用途] |

## 3. 数据模型

### 3.1 实体与结构

| 实体 | 用途 | 重要字段 |
|------|------|----------|
| [实体] | [用途] | [字段] |

### 3.2 持久化

[描述存储、索引、迁移和兼容性策略。]

## 4. 接口设计

### 4.1 对外接口

| 接口 | 调用方 | 输入 | 输出 |
|------|--------|------|------|
| [接口] | [调用方] | [输入] | [输出] |

### 4.2 内部接口

[描述模块间调用边界。]

## 5. 核心流程设计

### 5.1 [流程名称]

[描述主要执行流程、关键分支和异常路径。]

## 6. 算法设计

[描述关键算法、规则计算或决策逻辑；如无复杂算法，说明不适用。]

## 7. 缓存设计

[描述缓存对象、失效策略、一致性和降级行为；如无缓存，说明不适用。]

## 8. 异常处理设计

[描述错误分类、用户可见错误、重试、补偿和告警策略。]

## 9. 监控与日志

[描述关键指标、日志字段、审计要求和排障入口。]

## 10. 安全设计

[描述认证、授权、数据保护、输入校验和依赖安全。]

Project: RecSDK
Language: Python
Modules:
- Project Root: .

Module documents:
# 中间模块设计文档：Project Root（回退模块聚合编排）

## 1. 模块目的与边界

`Project Root` 是 RecSDK 的顶层编排模块，作为“无明显单一源模块目录”的退化入口，聚合算子、训练框架、构建、测试、文档与发布约束，并提供统一的工程入口与协同关系。  
[[C]]: 根级说明见 [README.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/README.md) 的“目录结构”与“组件说明”。  
[[C]]: 算子子系统说明见 [cust_op/README.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/README.md)。  

## 2. 顶层目录结构（高层结构与职责）

| 目录 | 来源锚点 | 职责 |
|---|---|---|
| [build](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build) | `build.sh` 根脚本入口 | 版本打包、TF构建、镜像/安装产物组织、预冒烟流程脚本。 |
| [cust_op](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op) | `cust_op/README.md` | AscendC 自定义算子开发、适配与测试。 |
| [training](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/training) | `README.md` 中组件定义、`docs/zh/rec_full_stack.md` | TensorFlow/Torch 训练子系统与公共核心运行时。 |
| [docs](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs) | `docs/zh/overview.md` | 全栈文档、安装、API、调优与版本说明。 |
| [test](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/test) | 测试目录树 | 自定义算子端到端功能/性能/正确性测试。 |
| [.gitcode/.pre-commit-config.yaml](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/.pre-commit-config.yaml) | 预提交钩子定义 | 代码质量与静态检查治理。 |
| 根脚本与配置 | [build.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh), [.gitignore](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/.gitignore), [contributing.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/contributing.md), [config.ini](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/config.ini) | 仓库级治理、打包/协作契约和运行时参数入口。 |

## 3. 核心子模块与运行流

### 3.1 自定义算子子系统（cust_op）

1) 代码与版本双轨  
`cust_op/ascendc_op/ai_core_op` 下按算子名组织，且多数算子具有 `c310` 与 `v220` 两套实现目录，体现芯片/编译 profile 区分。  
[[C]]: 例如 `asynchronous_complete_cumsum` 下同时存在 [c310](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310) 与 [v220](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220) 目录。  
[[C]]: `run.sh` 调用统一构建库函数 `build_and_install_operator` 的通用流程，路径见 [asynchronous_complete_cumsum/v220/run.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/run.sh) 与 [asynchronous_complete_cumsum/c310/run.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/run.sh)。  

2) Host/Kernal 拆分  
每个算子通常包含 `op_host` 与 `op_kernel`，对应参数裁剪/分块与执行内核。  
[[C]]: 以 [asynchronous_complete_cumsum/c310](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310) 为例存在 `op_host/asynchronous_complete_cumsum.cpp` 与 `op_kernel/asynchronous_complete_cumsum.cpp`。  

3) PyTorch 适配层  
`cust_op/framework/torch_plugin/torch_library` 下按算子目录提供 `build_ops.sh` 与 C++ binding 源码；common 目录可批量构建并安装聚合 so。  
[[C]]: [torch_library/common/build_ops.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/framework/torch_plugin/torch_library/common/build_ops.sh) 中 `cmake -B build -DBUILD_VER` 与 `cmake --build build -j`。  
[[C]]: `cmake` 输出复制到 `sysconfig` `purelib` 路径。  

4) 适配层回退与加载模式  
`README` 中给出单算子 `torch.ops.load_library("...xxx.so")` 与多算子 `libfbgemm_npu_api.so` 的加载模式。  
[[C]]: [cust_op/README.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/README.md) 的“算子适配层编译/加载”。  

### 3.2 训练框架子系统（training）

1) 多框架并行  
顶层设计是 TF 与 Torch 两套框架并行演进，包括 `tf_rec_v1/tf_rec_v2` 与 `torch_rec_v1/torch_rec_v2`。  
[[C]]: [docs/zh/rec_full_stack.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/rec_full_stack.md) 与 [README.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/README.md) 的组件定义。  

2) 组件分层  
- `training/common` 提供通用绑定与基础设施。  
- `training/tf_rec_v1` 与 `training/tf_rec_v2` 提供 TensorFlow 侧 API、图改写与缓存/表管理。  
- `training/torch_rec_v1` 与 `training/torch_rec_v2` 提供 TorchRec/Torch 侧表结构与动态 Embedding 功能。  
[[C]]: `docs/zh/overview.md` 与 `docs/zh/rec_full_stack.md` 中的组件职责说明。  

### 3.3 构建与验证流（Root + build/预冒烟）

1) 根构建清理入口  
`[build.sh](.../build.sh)` 的 `clean()` 会清空 `dist`、`build`、`install`、`bdist` 等关键产物。  
[[C]]: [build.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh) 中 `clean()` 的删除路径。  

2) TF 版本构建入口  
`build/build_tf1.sh` 与 `build/build_tf2.sh` 作为 TF1/TF2 分支构建主流程入口。  
[[C]]: 这两个脚本前部注释约束构建环境（Python/CMake/GCC）与依赖准备逻辑。  

3) 算子构建入口  
`cust_op/ascendc_op/build/build_ai_core_op.sh` 约束可编译版本（A2/A3/A5/310P/A2-TF）。  
[[C]]: [cust_op/ascendc_op/build/build_ai_core_op.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/build/build_ai_core_op.sh) 的参数校验与执行 `build_and_install_operator` 前置流程。  

4) 冒烟验证  
`build/run_presmoke.sh` 与 `build/run_presmoke_tf.sh` 定义环境设置、安装 torch_npu、运行构建与测试目录。  
[[C]]: 见 [build/run_presmoke.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke.sh) 与 [build/run_presmoke_tf.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke_tf.sh)。  

## 4. 关键接口、类与数据结构

### 4.1 自定义算子核心接口（以 AsynchronousCompleteCumsum 为代表）

- `op_host` Tiling 数据定义  
  - `AsynchronousCompleteCumsumTilingData`（c310）: `totalLength`, `totalBlocks`, `blocksPerCore`, `remainderBlocks`, `elementsPerBlock`, `isSmall`, `isFullCore`。  
  [[C]]: [cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum_tiling.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum_tiling.h) `BEGIN_TILING_DATA_DEF`。  
  - `AsynchronousCompleteCumsumTilingData`（v220）: `totalLength`, `totalBlocks`, `blocksPerCore`, `remainderBlocks`。  
  [[C]]: [cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/asynchronous_complete_cumsum_tiling.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/asynchronous_complete_cumsum_tiling.h)。

- Host tiling 逻辑  
  - `TilingFunc(gert::TilingContext* context)` 完成输入shape/type校验、block 划分、workspace 估算、tiling 数据回填。  
  [[C]]: `TilingFunc` 在 [c310/op_host/asynchronous_complete_cumsum.cpp](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum.cpp) 与 [v220/op_host/...](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/asynchronous_complete_cumsum.cpp) 中可见。  
  - `AsynchronousCompleteCumsum` 算子在注册时约束输入为 1D、类型为 int32/int64。  
  [[C]]: `TilingFunc` 中的 `dimNum != 1` 与 `DT_INT32/DT_INT64` 校验。  

- Kernel 参数与执行入口  
  - `struct Args { GM_ADDR x; GM_ADDR y; GM_ADDR workspace; GM_ADDR tiling; }`（c310）和 `Args { input/output/workspace/tiling }`（v220）。  
  [[C]]: [c310/op_kernel/asynchronous_complete_cumsum_kernel.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_kernel/asynchronous_complete_cumsum_kernel.h)、[v220/op_kernel/asynchronous_complete_cumsum_kernel.h](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_kernel/asynchronous_complete_cumsum_kernel.h)。  
  - Kernel 入口统一为 `extern "C" __global__ __aicore__ void asynchronous_complete_cumsum(...)`。  
  [[C]]: 两版 `op_kernel/asynchronous_complete_cumsum.cpp`。  

### 4.2 构建/测试接口与脚本 API（脚本级）

- `parse_arguments` / `build_and_install_operator`  
  [[C]]: `run.sh` 调用链可见于 [cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/run.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/run.sh) 与 [v220/run.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/run.sh)。  
  - 具体定义不在当前证据片段中展开，但定义位于 [cust_op/ascendc_op/scripts/op_builder_utils.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/scripts/op_builder_utils.sh)。  

- `build_ops.sh` 统一编译插件  
  [[C]]: `torch_library/common/build_ops.sh` 的 `cmake -B build -DBUILD_VER` 与 `cmake --build build -j`。  

## 5. 约束与边界条件

### 5.1 运行环境与版本约束

1. 根目录发布与兼容说明显示目标版本为 `26.0.0`，CANN 9.0.0，Ascend HDK 版本矩阵列于 [docs/zh/release_notes_rec.md](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/release_notes_rec.md)。  
2. TF1/TF2 构建脚本在注释中明确依赖旧版构建工具链（Python3.7.5、GCC7.3.0、CMake3.20.6）。  
[[C]]: [build/build_tf1.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/build_tf1.sh) 与 [build/build_tf2.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/build_tf2.sh)。  
3. 自定义算子对输入要求明确：一维张量、int32/int64。  
[[C]]: [asynchronous_complete_cumsum README](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/README.md)。  

### 5.2 架构与组织约束

1. 同一算子多版本目录是常态（例：`c310`/`v220`），编译 profile 与内核实现不完全同构。  
2. 顶层模块不单一承担功能实现，属于协调器角色：build/test/docs/training/ops 共存。  
3. 预设质量门控依赖预提交 + ruff + codespell + pylint。  
[[C]]: [.pre-commit-config.yaml](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/.pre-commit-config.yaml) 与 [pre-commit/pyproject.toml](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/pre-commit/pyproject.toml)。  

## 6. 调试指导（按主要模块）

| 模块 | 常见症状 | 可能来源 | 建议排查项 |
|---|---|---|---|
| 根构建与清理 | 产物混入旧版本、重复包冲突 | `build.sh` 清理未执行或未生效 | 检查 [build.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build.sh) 中 `clean()` 列表是否覆盖目标目录 |
| 自定义算子编译（c310/v220） | 编译中途报 profile 不匹配、参数不被识别 | `run.sh` profile/env 配置不一致 | 查 [asynchronous_complete_cumsum/c310/run.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/run.sh) 与 [v220/run.sh](...)，确认 `AI_CORE_PROFILE`、`parse_arguments` |
| 自定义算子类型/shape 报错 | dim 或 dtype 检查失败 | host 侧 `TilingFunc` 参数校验 | 查看 [op_host/asynchronous_complete_cumsum.cpp](...) 中 `dimNum`、`DT_INT32/DT_INT64` 分支 |
| kernel 运行结果错位或越界 | block 分配/输出偏移错误 | `totalBlocks / blocksPerCore / remainderBlocks` 分配逻辑 | 比对 [op_kernel/asynchronous_complete_cumsum_kernel.h](...) 中 `coreId` 分配与 `outputGT` 长度边界 |
| Torch 插件加载失败 | `torch.ops.load_library` 报找不到符号 | so 文件未构建/路径不在 site-packages | 参考 [torch_library/common/build_ops.sh](...) 的 `PACKAGE_PATH` 分发逻辑；核对 `libfbgemm_npu_api.so` |
| 训练侧 API 报缺失 | 调用 API 接口失败 | 版本包缺失或接口未按文档初始化 | 对照 [docs/zh/tensorflow/tf_rec_v1/api](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/docs/zh/tensorflow/tf_rec_v1/api) 与相应训练子模块版本 |
| 预冒烟失败 | 测试环境初始化异常 | 依赖环境脚本未执行或路径未设置 | 检查 [build/run_presmoke.sh](C:/Users/kvenu/playground/codewiki-community/benchmark/gitcode/repos/RecSDK/build/run_presmoke.sh) 的环境导出与目录变量 |
| 常见 Python 依赖问题 | `Could NOT find Python3` | Python软链接缺失 | [cust_op/README.md](...) 的 FAQ 说明给出软链接修复建议 |

## 7. 运行手册（Operational Runbook）

### 7.1 Build（构建）

1. 根清理：执行 [build.sh](...)，触发 `clean()` 删除历史产物。  
2. 算子编译：对单算子执行其 `run.sh`（示例 `cust_op/ascendc_op/ai_core_op/.../asynchronous_complete_cumsum/v220/run.sh`）；对框架插件执行 `cust_op/framework/torch_plugin/torch_library/.../build_ops.sh`。  
3. 训练框架构建：执行 `build/build_tf1.sh` 或 `build/build_tf2.sh`。  

### 7.2 Validation（验证）

1. 算子级测试通过 `pytest` 运行 `cust_op/test/...`、`test/...`、`training/...` 下对应测试脚本。  
2. 冒烟验证可按 `build/run_presmoke.sh` 与 `build/run_presmoke_tf.sh` 的流程执行。  

### 7.3 Deployment（部署）

1. 成功构建后 `build.sh`/各模块构建脚本输出 wheel 或 so 后，按适配层说明在 Python 环境加载 `torch.ops.load_library(...)`。  
2. TensorFlow/Torch 侧功能开启以对应 `docs` 指南为准。  

### 7.4 Rollback（回退）

1. 清理本地/工作目录产物（`build.sh`）。  
2. 回退到上一个可用 wheel 或 so，删除冲突版本并重新 `build_and_install_operator`/`pip install`。  
3. 如涉及多算子库，优先回退 `common` 聚合库再回退单算子。  

### 7.5 Failure modes（故障模式）

1. 构建版本不兼容（如 profile 未匹配、Python/CMAKE/GCC 不一致）→ 先对照脚本注释和 `release_notes_rec.md` 的版本矩阵。  
2. 环境未设置导致找不到依赖（NPU/编译器路径）→ 对照 `run.sh` 及构建文档中的 env 约束。  
3. 权限/权限位导致可执行或链接失败 → 检查脚本 `chmod 550` 执行点。  
4. 形状与类型不合法导致 tiling 构建失败 → 按对应 `TilingFunc` 的检查点回归输入契约。  

## 8. 关键能力与数据流摘要

1. 输入输出主链路  
[asynchronous_complete_cumsum] 的 Host 将输入元数据映射为 tiling，再将 kernel 参数打包为 `Args`，Kernel 按 core/block 粒度并发计算并写回 `y`。  
[[C]]: [op_host/...cpp](...), [op_kernel/...cpp](...), [simt_kernel.h](...).  

2. 版本兼容与发布链路  
`build.py`/`build_tf*.sh` + `pre-commit` + docs + release notes 形成“代码-构建-验证-发布说明”闭环。  
[[C]]: `build`, `.pre-commit-config.yaml`, `docs/zh/release_notes_rec.md`。  

## 9. 置信度边界（Source / Inferred）

| 级别 | 内容 | 说明 |
|---|---|---|
| Source-Confirmed（源代码确认） | 根目录组件关系、算子目录结构、核心构建脚本行为、主要约束与字段定义 | 由仓库文件与代码片段直接可见 |
| Source-Confirmed（源代码确认） | AsynchronousCompleteCumsum 的接口签名、Host 验证逻辑、kernel入口、tiling字段 | `*.cpp/h` 与 `simt_kernel.h` 片段 |
| Inferred（推断） | 各模块在复杂发布链路中的真实调用顺序与默认部署时序 | 从脚本/文档组合推导，未见完整端到端脚本日志 |
| Inferred（推断） | 全量算子间性能/正确性协同表现 | 未提供基准测试总汇，只能基于 README 与个别算子证明 |
| Missing-Evidence（缺失证据） | `op_builder_utils.sh` 中 `parse_arguments` 与 `build_and_install_operator` 的完整实现 | 本上下文中只展示了调用方与部分文件顶部，未展示完整实现 |
| Missing-Evidence（缺失证据） | 所有算子的一致性行为（跨每个 op 目录） | 目录规模巨大，仅展示了部分代表性算子与文件 |

Project README/docs evidence:
Directory Source File Stats:
cust_op/ascendc_op/ai_core_op/hstu_dense_forward/v220/op_kernel/ (18 files, 4902 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward/v220/op_host/ (17 files, 2130 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_backward/v220/op_kernel/ (14 files, 4307 lines)
cust_op/framework/torch_plugin/torch_library/split_embedding_codegen_forward_unweighted/ (12 files, 4767 lines)
cust_op/ascendc_op/ai_core_op/lccl/v220/op_kernel/ (12 files, 2679 lines)
training/torch_rec_v2/dynamic_emb/dynamic_emb/distributed/ (11 files, 4307 lines)
training/torch_rec_v2/dynamic_emb/csrc/  (11 files, 3680 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward/c310/op_kernel/ (11 files, 3294 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_backward/v220/op_host/ (11 files, 1609 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward_fuxi/v220/op_host/ (11 files, 1512 lines)
training/tf_rec_v1/src/AccCTR/src/common/util/ (11 files, 830 lines)
cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/ (10 files, 2890 lines)
training/tf_rec_v1/src/core/emb_table/   (10 files, 2327 lines)
training/tf_rec_v1/src/core/utils/       (9 files, 1506 lines)
training/tf_rec_v1/python/optimizers/    (9 files, 1443 lines)
training/tf_rec_v1/python/util/          (9 files, 634 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/utils/ (9 files, 620 lines)
cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/v220/op_kernel/structure/ (9 files, 544 lines)
training/torch_rec_v1/hybrid_torchrec/hybrid_torchrec/distributed/ (8 files, 3006 lines)
training/tf_rec_v1/python/graph/         (8 files, 2608 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_backward_fuxi/v220/op_host/ (8 files, 1109 lines)
training/tf_rec_v1/python/saver/         (7 files, 2783 lines)
training/tf_rec_v1/python/core/asc/      (7 files, 1600 lines)
cust_op/ascendc_op/ai_core_op/in_linear_silu/v220/op_kernel/ (7 files, 1285 lines)
training/tf_rec_v1/src/core/l3_storage/  (7 files, 1067 lines)
training/torch_rec_v1/hybrid_torchrec/src/ids_process/ (7 files, 901 lines)
training/tf_rec_v2/mxrec/core/host/feature/ (7 files, 766 lines)
cust_op/ascendc_op/ai_core_op/lccl/v220/op_host/ (7 files, 604 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/distributed/ (6 files, 2968 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward_fuxi/v220/op_kernel/ (6 files, 2138 lines)
training/tf_rec_v1/src/core/ssd_engine/  (6 files, 1682 lines)
cust_op/ascendc_op/ai_core_op/block_bucketize_sparse_features/c310/op_kernel/ (6 files, 1609 lines)
training/tf_rec_v1/python/core/emb/      (6 files, 1123 lines)
cust_op/ascendc_op/ai_core_op/split_embedding_codegen_forward_unweighted/v220/op_kernel/ (6 files, 1043 lines)
cust_op/ascendc_op/ai_core_op/split_embedding_codegen_forward_unweighted/c310/op_kernel/ (6 files, 975 lines)
training/tf_rec_v1/python/util/config_utils/ (6 files, 472 lines)
cust_op/ascendc_op/ai_core_op/common/    (6 files, 401 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_backward_fuxi/v220/op_kernel/ (5 files, 1680 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/op_kernel/catlass_hstu/kernel/bwd/ (5 files, 1424 lines)
cust_op/framework/torch_plugin/torch_library/hstu/ (5 files, 997 lines)
training/torch_rec_v1/hybrid_torchrec/hybrid_torchrec/hybrid_lookup_invoke/ (5 files, 767 lines)
training/tf_rec_v1/python/core/          (5 files, 714 lines)
training/tf_rec_v1/src/core/ock_ctr_common/include/ (5 files, 642 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/feature_filter/ (5 files, 536 lines)
training/tf_rec_v2/ci/scripts/           (5 files, 391 lines)
training/tf_rec_v2/mxrec/python/config/  (5 files, 308 lines)
training/tf_rec_v1/src/AccCTR/build/     (5 files, 288 lines)
cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/v220/op_kernel/optimizers/ (5 files, 277 lines)
./                                       (5 files, 270 lines)
cust_op/framework/tf_plugin/src/         (5 files, 244 lines)
cust_op/tf_cpu_op/src/common/            (5 files, 237 lines)
training/tf_rec_v1/src/core/hybrid_mgmt/ (4 files, 3228 lines)
training/tf_rec_v1/src/core/key_process/ (4 files, 2696 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/embedding_cache/ (4 files, 2128 lines)
training/tf_rec_v1/src/AccCTR/src/embedding_cache/offset_mapper/ (4 files, 1541 lines)
training/torch_rec_v1/hybrid_torchrec/hybrid_torchrec/sparse/ (4 files, 1492 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/op_kernel/catlass_hstu/gemm/block/ (4 files, 1488 lines)
training/tf_rec_v1/src/AccCTR/src/unique/ (4 files, 1210 lines)
cust_op/ascendc_op/ai_core_op/int_nbit_split_embedding_codegen_lookup_function/c310/op_kernel/ (4 files, 1123 lines)
cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/v220/op_kernel/ (4 files, 1095 lines)
cust_op/framework/torch_plugin/torch_library/common/ (4 files, 808 lines)
training/torch_rec_v1/hybrid_torchrec/hybrid_torchrec/distributed/sharding/ (4 files, 780 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/emb_table/ (4 files, 769 lines)
cust_op/ascendc_op/ai_core_op/pcie_through/v220/op_kernel/ (4 files, 758 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/hash_table/ (4 files, 750 lines)
cust_op/ascendc_op/ai_core_op/in_linear_silu_backward/v220/op_kernel/ (4 files, 745 lines)
training/torch_rec_v2/dynamic_emb/dynamic_emb/distributed/planner/ (4 files, 634 lines)
training/tf_rec_v1/src/AccCTR/src/include/ (4 files, 611 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_backward/v220/ut_test/ (4 files, 577 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/op_kernel/catlass_hstu/epilogue/regbase/ (4 files, 568 lines)
cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/op_host/ (4 files, 521 lines)
training/torch_rec_v1/hybrid_torchrec/hybrid_torchrec/modules/ (4 files, 519 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/distributed/sharding/ (4 files, 506 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/optimizer_update/ (4 files, 475 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/optimizer_update_fused/ (4 files, 466 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/Adam_update/ (4 files, 432 lines)
training/tf_rec_v1/python/validator/     (4 files, 336 lines)
training/torch_rec_v2/dynamic_emb/dynamic_emb/distributed/optimizers/ (4 files, 315 lines)
training/common/src/core/lccl/include/   (4 files, 292 lines)
training/tf_rec_v2/mxrec/core/host/common/ (4 files, 224 lines)
cust_op/tf_cpu_op/src/include/           (4 files, 137 lines)
training/common/python/validator/        (3 files, 885 lines)
training/tf_rec_v1/src/core/file_system/hdfs_file_system/ (3 files, 656 lines)
training/tf_rec_v1/src/core/hd_transfer/ (3 files, 601 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/op_kernel/catlass_hstu/epilogue/block/ (3 files, 579 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/op_host/ (3 files, 511 lines)
cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_kernel/ (3 files, 465 lines)
training/tf_rec_v2/mxrec/core/host/hdc/  (3 files, 461 lines)
cust_op/ascendc_op/ai_core_op/jagged_to_padded_dense/v220/op_kernel/ (3 files, 446 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/unique_op/ (3 files, 433 lines)
training/torch_rec_v2/dynamic_emb/dynamic_emb/distributed/sharding/ (3 files, 395 lines)
cust_op/ascendc_op/ai_core_op/fused_sgd/v220/op_kernel/ (3 files, 390 lines)
training/tf_rec_v2/mxrec/python/embedding/ (3 files, 363 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_time/v220/op_kernel/ (3 files, 360 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/ (3 files, 341 lines)
training/tf_rec_v2/mxrec/python/embedding/lookup/ (3 files, 329 lines)
training/common/python/communication/hccl/ (3 files, 288 lines)
cust_op/ascendc_op/ai_core_op/pcie_through/v220/op_host/ (3 files, 287 lines)
cust_op/ascendc_op/ai_core_op/expand_into_jagged_permute/c310/op_kernel/ (3 files, 275 lines)
training/tf_rec_v2/mxrec/python/optimizer/ (3 files, 242 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_backward/v220/op_kernel/ (3 files, 239 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/common/ (3 files, 239 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_pos/v220/op_kernel/ (3 files, 237 lines)
cust_op/framework/torch_plugin/torch_library/relative_attn_bias/ (3 files, 211 lines)
training/tf_rec_v2/mxrec/python/embedding/table/ (3 files, 197 lines)
training/torch_rec_v2/dynamic_emb/scripts/ (3 files, 192 lines)
training/torch_rec_v1/hybrid_torchrec/   (3 files, 191 lines)
training/tf_rec_v2/mxrec/python/embedding/feature/ (3 files, 159 lines)
training/tf_rec_v1/src/core/file_system/ (3 files, 125 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/file_system/ (3 files, 124 lines)
training/tf_rec_v1/python/data/          (3 files, 103 lines)
cust_op/framework/torch_plugin/torch_library/asynchronous_complete_cumsum/ (3 files, 101 lines)
training/tf_rec_v2/mxrec/python/utils/   (3 files, 95 lines)
training/torch_rec_v1/hybrid_torchrec/hybrid_torchrec/ (3 files, 62 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/block_bucketsize_sparse_features/ (2 files, 1259 lines)
cust_op/ascendc_op/ai_core_op/disentangle_attention/v220/op_kernel/ (2 files, 667 lines)
training/tf_rec_v1/src/ops_tf/           (2 files, 633 lines)
cust_op/ascendc_op/ai_core_op/block_bucketize_sparse_features/c310/op_host/ (2 files, 628 lines)
training/common/src/core/lccl/src/tools/socket/ (2 files, 592 lines)
cust_op/ascendc_op/ai_core_op/norm_multiply_dropout_backward/v220/op_kernel/ (2 files, 575 lines)
training/tf_rec_v1/src/AccCTR/src/embedding_cache/embedding_local_table/ (2 files, 575 lines)
training/tf_rec_v1/src/AccCTR/src/embedding_cache/cache_manager/ (2 files, 554 lines)
cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_host/ (2 files, 545 lines)
training/tf_rec_v1/src/core/checkpoint/  (2 files, 540 lines)
cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/v220/op_host/ (2 files, 514 lines)
training/common/src/core/pcie_through/   (2 files, 506 lines)
cust_op/ascendc_op/ai_core_op/int_nbit_split_embedding_codegen_lookup_function/c310/op_host/ (2 files, 473 lines)
cust_op/ascendc_op/ai_core_op/norm_multiply_dropout/v220/op_kernel/ (2 files, 465 lines)
cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/op_kernel/ (2 files, 457 lines)
training/tf_rec_v1/src/core/file_system/local_file_system/ (2 files, 456 lines)
training/tf_rec_v1/src/dataset_tf/       (2 files, 416 lines)
cust_op/ascendc_op/ai_core_op/split_embedding_codegen_forward_unweighted/c310/op_host/ (2 files, 415 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/file_system/local_file_system/ (2 files, 399 lines)
cust_op/ascendc_op/ai_core_op/dense_embedding_codegen_lookup_function_grad/v220/op_host/ (2 files, 389 lines)
cust_op/ascendc_op/ai_core_op/dense_embedding_codegen_lookup_function/v220/op_host/ (2 files, 387 lines)
cust_op/framework/torch_plugin/torch_library/dense_embedding_codegen_lookup_function/ (2 files, 382 lines)
cust_op/ascendc_op/ai_core_op/ln_mul/v220/op_kernel/ (2 files, 368 lines)
cust_op/ascendc_op/ai_core_op/disentangle_attention/v220/op_host/ (2 files, 362 lines)
cust_op/ascendc_op/ai_core_op/in_linear_silu_backward/v220/op_host/ (2 files, 354 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/get_new_length_and_offsets_op/ (2 files, 344 lines)
cust_op/ascendc_op/ai_core_op/gather_for_rank1/v220/op_kernel/ (2 files, 336 lines)
cust_op/ascendc_op/ai_core_op/permute2d_sparse_data/v220/op_host/ (2 files, 333 lines)
cust_op/ascendc_op/ai_core_op/permute2d_sparse_data/v220/op_kernel/ (2 files, 333 lines)
cust_op/framework/torch_plugin/torch_library/jagged_to_padded_dense/ (2 files, 333 lines)
cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_kernel/ (2 files, 309 lines)
cust_op/ascendc_op/ai_core_op/fused_sgd/v220/op_host/ (2 files, 304 lines)
cust_op/ascendc_op/ai_core_op/split_embedding_codegen_forward_unweighted/v220/op_host/ (2 files, 301 lines)
cust_op/framework/torch_plugin/torch_library/concat_2d_jagged/ (2 files, 299 lines)
cust_op/ascendc_op/ai_core_op/permute_pooled_embs/v220/op_kernel/ (2 files, 297 lines)
training/tf_rec_v2/mxrec/python/training/ (2 files, 292 lines)
cust_op/ascendc_op/ai_core_op/multislice_concat/v220/op_host/ (2 files, 286 lines)
cust_op/ascendc_op/ai_core_op/fused_lazy_adam/v220/op_host/ (2 files, 285 lines)
training/tf_rec_v1/src/core/ckpt_data_handler/feat_admit_n_evict_ckpt/ (2 files, 282 lines)
cust_op/framework/torch_plugin/torch_library/block_bucketize_sparse_features/ (2 files, 274 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_time/v220/op_host/ (2 files, 269 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_backward/v220/op_host/ (2 files, 263 lines)
cust_op/ascendc_op/ai_core_op/token_mixing/v220/op_host/ (2 files, 261 lines)
cust_op/ascendc_op/ai_core_op/expand_into_jagged_permute/c310/op_host/ (2 files, 260 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/pooling_embeddings/ (2 files, 259 lines)
cust_op/ascendc_op/ai_core_op/offsets_range/v220/op_host/ (2 files, 252 lines)
training/tf_rec_v1/src/                  (2 files, 249 lines)
cust_op/ascendc_op/ai_core_op/norm_multiply_dropout_backward/v220/op_host/ (2 files, 244 lines)
cust_op/ascendc_op/ai_core_op/norm_multiply_dropout/v220/op_host/ (2 files, 243 lines)
cust_op/ascendc_op/ai_core_op/init_address_lookup/c310/op_host/ (2 files, 242 lines)
cust_op/ascendc_op/ai_core_op/offsets_range/v220/op_kernel/ (2 files, 240 lines)
training/tf_rec_v1/src/AccCTR/src/embedding_cache/ (2 files, 239 lines)
cust_op/framework/torch_plugin/torch_library/hstu_dense_forward_fuxi/ (2 files, 236 lines)
cust_op/ascendc_op/ai_core_op/concat_jagged_tensor_grad/v220/op_host/ (2 files, 228 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_pos/v220/op_host/ (2 files, 228 lines)
cust_op/ascendc_op/ai_core_op/dense_to_jagged/v220/op_host/ (2 files, 227 lines)
cust_op/ascendc_op/ai_core_op/reverse_sequence/v220/op_host/ (2 files, 227 lines)
training/tf_rec_v1/python/constants/     (2 files, 226 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/look_backward/ (2 files, 225 lines)
cust_op/framework/torch_plugin/torch_library/in_linear_silu/ (2 files, 223 lines)
cust_op/ascendc_op/ai_core_op/concat_jagged_tensor/v220/op_host/ (2 files, 222 lines)
cust_op/ascendc_op/ai_core_op/jagged_to_padded_dense/v220/op_host/ (2 files, 221 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/op_kernel/catlass_hstu/gemm/tile/ (2 files, 217 lines)
cust_op/ascendc_op/ai_core_op/select_dim1_to_permute/c310/op_kernel/ (2 files, 217 lines)
cust_op/ascendc_op/ai_core_op/in_linear_silu/v220/op_host/ (2 files, 214 lines)
cust_op/framework/torch_plugin/torch_library/hstu_dense_backward_fuxi/ (2 files, 214 lines)
cust_op/framework/torch_plugin/torch_library/dense_to_jagged/ (2 files, 206 lines)
training/tf_rec_v2/mxrec/core/host/runtime/ (2 files, 205 lines)
training/tf_rec_v1/src/core/ckpt_data_handler/key_freq_map_ckpt/ (2 files, 203 lines)
cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/ (2 files, 202 lines)
cust_op/ascendc_op/ai_core_op/permute_pooled_embs/v220/op_host/ (2 files, 201 lines)
cust_op/framework/torch_plugin/torch_library/norm_multiply_dropout/ (2 files, 201 lines)
cust_op/framework/torch_plugin/torch_library/disentangle_attention/ (2 files, 200 lines)
cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/ (2 files, 198 lines)
cust_op/ascendc_op/ai_core_op/ln_mul/v220/op_host/ (2 files, 194 lines)
training/common/src/core/log/            (2 files, 194 lines)
cust_op/framework/torch_plugin/torch_library/permute1d_sparse_data/ (2 files, 192 lines)
cust_op/framework/torch_plugin/torch_library/permute2d_sparse_data/ (2 files, 190 lines)
cust_op/framework/torch_plugin/torch_library/int_nbit_split_embedding_codegen_lookup_function/ (2 files, 184 lines)
cust_op/ascendc_op/ai_core_op/select_dim1_to_permute/c310/op_host/ (2 files, 182 lines)
training/common/src/                     (2 files, 181 lines)
cust_op/ascendc_op/ai_core_op/index_select_for_rank1_backward/v220/op_kernel/ (2 files, 179 lines)
cust_op/ascendc_op/ai_core_op/segment_sum_csr/v220/op_host/ (2 files, 178 lines)
training/tf_rec_v2/mxrec/python/constants/ (2 files, 176 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/sparse/ (2 files, 176 lines)
cust_op/ascendc_op/ai_core_op/gather_for_rank1/v220/op_host/ (2 files, 173 lines)
cust_op/framework/torch_plugin/torch_library/keyed_jagged_index_select_dim1/ (2 files, 172 lines)
cust_op/ascendc_op/ai_core_op/index_select_for_rank1_backward/v220/op_host/ (2 files, 168 lines)
training/common/src/core/error/          (2 files, 167 lines)
training/common/src/core/initializer/    (2 files, 164 lines)
cust_op/ascendc_op/ai_core_op/invert_permute/c310/op_host/ (2 files, 161 lines)
training/torch_rec_v2/dynamic_emb/dynamic_emb/distributed/initializers/ (2 files, 160 lines)
cust_op/ascendc_op/ai_core_op/multislice_concat/v220/op_kernel/ (2 files, 159 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/load_from_pointer/ (2 files, 158 lines)
training/torch_rec_v1/torchrec_embcache/ (2 files, 152 lines)
training/tf_rec_v2/                      (2 files, 151 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/gather_dim0/ (2 files, 150 lines)
cust_op/ascendc_op/ai_core_op/concat_jagged_tensor_grad/v220/op_kernel/ (2 files, 148 lines)
cust_op/ascendc_op/ai_core_op/concat_jagged_tensor/v220/op_kernel/ (2 files, 148 lines)
training/tf_rec_v1/src/core/ckpt_data_handler/key_count_map_ckpt/ (2 files, 143 lines)
cust_op/framework/torch_plugin/torch_library/permute_pooled_embs/ (2 files, 142 lines)
cust_op/framework/torch_plugin/torch_library/multislice_concat/ (2 files, 141 lines)
cust_op/framework/torch_plugin/torch_library/hstu_v2/ (2 files, 138 lines)
training/common/src/core/initializer/truncated_normal_initializer/ (2 files, 129 lines)
training/common/python/constants/        (2 files, 128 lines)
training/tf_rec_v1/src/core/ckpt_data_handler/ (2 files, 127 lines)
training/common/python/perf_factory/     (2 files, 123 lines)
training/tf_rec_v1/src/AccCTR/src/       (2 files, 122 lines)
cust_op/framework/torch_plugin/torch_library/gather_for_rank1/ (2 files, 118 lines)
cust_op/framework/torch_plugin/torch_library/reverse_sequence/ (2 files, 115 lines)
cust_op/framework/torch_plugin/torch_library/init_address_lookup/ (2 files, 112 lines)
cust_op/framework/torch_plugin/torch_library/expand_into_jagged_permute/ (2 files, 109 lines)
training/tf_rec_v2/mxrec/python/initializer/ (2 files, 108 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/get_table_range_op/ (2 files, 108 lines)
training/common/src/core/common_func/    (2 files, 102 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/ops/ (2 files, 94 lines)
training/common/src/core/initializer/random_normal_initializer/ (2 files, 91 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/reduce_grads/ (2 files, 88 lines)
training/common/python/log/              (2 files, 86 lines)
cust_op/framework/torch_plugin/torch_library/ln_mul/ (2 files, 85 lines)
cust_op/ascendc_op/ai_core_op/invert_permute/c310/op_kernel/ (2 files, 83 lines)
training/common/src/core/initializer/constant_initializer/ (2 files, 81 lines)
training/tf_rec_v1/                      (2 files, 78 lines)
cust_op/framework/torch_plugin/torch_library/offsets_range/ (2 files, 77 lines)
cust_op/framework/torch_plugin/torch_library/token_mixing/ (2 files, 77 lines)
cust_op/framework/torch_plugin/torch_library/segment_sum_csr/ (2 files, 74 lines)
cust_op/framework/torch_plugin/torch_library/invert_permute/ (2 files, 73 lines)
training/tf_rec_v2/mxrec/python/binding/ (2 files, 67 lines)
training/common/                         (2 files, 60 lines)
training/torch_rec_v1/torchrec_npu/      (2 files, 49 lines)
training/common/python/util/             (2 files, 47 lines)
training/torch_rec_v1/hybrid_torchrec/src/ (2 files, 30 lines)
training/tf_rec_v1/python/util/framework_npu_env/ (2 files, 29 lines)
training/common/src/core/lccl/src/       (1 files, 665 lines)
cust_op/ascendc_op/scripts/              (1 files, 641 lines)
cust_op/tf_cpu_op/src/kunpeng/compute/cmp/ (1 files, 491 lines)
cust_op/ascendc_op/ai_core_op/dense_embedding_codegen_lookup_function_grad/v220/op_kernel/ (1 files, 409 lines)
cust_op/ascendc_op/ai_core_op/dense_embedding_codegen_lookup_function/v220/op_kernel/ (1 files, 403 lines)
cust_op/ascendc_op/ai_core_op/token_mixing/v220/op_kernel/ (1 files, 321 lines)
cust_op/ascendc_op/build/                (1 files, 264 lines)
training/torch_rec_v2/dynamic_emb/       (1 files, 260 lines)
training/tf_rec_v1/src/pybind/           (1 files, 248 lines)
cust_op/ascendc_op/ai_core_op/fused_lazy_adam/v220/op_kernel/ (1 files, 243 lines)
cust_op/ascendc_op/ai_core_op/segment_sum_csr/v220/op_kernel/ (1 files, 220 lines)
cust_op/ascendc_op/ai_core_op/init_address_lookup/c310/op_kernel/ (1 files, 210 lines)
cust_op/tf_cpu_op/src/kunpeng/compute/floor_mod/ (1 files, 204 lines)
cust_op/ascendc_op/ai_core_op/dense_to_jagged/v220/op_kernel/ (1 files, 189 lines)
cust_op/ascendc_op/ai_core_op/reverse_sequence/v220/op_kernel/ (1 files, 163 lines)
cust_op/tf_cpu_op/demo/                  (1 files, 145 lines)
training/torch_rec_v1/torchrec_embcache/src/torchrec_embcache/csrc/ (1 files, 140 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/op_kernel/ (1 files, 135 lines)
training/common/src/core/lccl/src/3rdparty/asdops/utils/log/ (1 files, 115 lines)
training/tf_rec_v1/src/AccCTR/src/embedding_cache/initializer/truncated_normal_initializer/ (1 files, 100 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/AdamW_update/ (1 files, 100 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/op_kernel/catlass_hstu/gemm/ (1 files, 93 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward/c310/ (1 files, 91 lines)
training/tf_rec_v1/src/AccCTR/src/embedding_cache/initializer/random_normal_initializer/ (1 files, 82 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward_fuxi/v220/ (1 files, 79 lines)
cust_op/ascendc_op/ai_core_op/cust_op_by_addr/v220/ (1 files, 76 lines)
cust_op/ascendc_op/ai_core_op/cust_op_by_addr/c310/ (1 files, 74 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward_fuxi/c310/ (1 files, 72 lines)
cust_op/ascendc_op/ai_core_op/lccl/v220/ (1 files, 72 lines)
cust_op/ascendc_op/ai_core_op/fused_sgd/v220/ (1 files, 71 lines)
cust_op/ascendc_op/ai_core_op/multislice_concat/v220/ (1 files, 71 lines)
cust_op/ascendc_op/ai_core_op/pcie_through/v220/ (1 files, 70 lines)
cust_op/ascendc_op/ai_core_op/block_bucketize_sparse_features/c310/ (1 files, 69 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward/v220/ (1 files, 69 lines)
cust_op/ascendc_op/ai_core_op/norm_multiply_dropout_backward/c310/ (1 files, 69 lines)
cust_op/ascendc_op/ai_core_op/norm_multiply_dropout/c310/ (1 files, 69 lines)
cust_op/ascendc_op/ai_core_op/offsets_range/v220/ (1 files, 69 lines)
cust_op/ascendc_op/ai_core_op/gather_for_rank1/v220/ (1 files, 68 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/Adagrad_update/ (1 files, 68 lines)
cust_op/tf_cpu_op/build/                 (1 files, 67 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_time/v220/ (1 files, 66 lines)
training/tf_rec_v1/src/AccCTR/src/embedding_cache/initializer/constant_initializer/ (1 files, 66 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_backward_fuxi/c310/ (1 files, 65 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_pos/v220/ (1 files, 65 lines)
cust_op/ascendc_op/ai_core_op/disentangle_attention/c310/ (1 files, 64 lines)
cust_op/ascendc_op/ai_core_op/in_linear_silu_backward/c310/ (1 files, 64 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_backward/c310/ (1 files, 62 lines)
cust_op/ascendc_op/ai_core_op/jagged_to_padded_dense/v220/ (1 files, 62 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/Rowwise_adagrad_update/ (1 files, 62 lines)
cust_op/ascendc_op/ai_core_op/in_linear_silu/v220/ (1 files, 61 lines)
cust_op/ascendc_op/ai_core_op/permute2d_sparse_data/v220/ (1 files, 61 lines)
training/tf_rec_v1/python/               (1 files, 61 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward/onnx_plugin/ (1 files, 60 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_forward_fuxi/onnx_plugin/ (1 files, 58 lines)
cust_op/ascendc_op/ai_core_op/in_linear_silu_backward/v220/ (1 files, 58 lines)
cust_op/ascendc_op/ai_core_op/dense_embedding_codegen_lookup_function_grad/v220/ (1 files, 57 lines)
cust_op/ascendc_op/ai_core_op/dense_embedding_codegen_lookup_function/v220/ (1 files, 57 lines)
cust_op/ascendc_op/ai_core_op/fused_lazy_adam/v220/ (1 files, 57 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/op_kernel/tla_hstu/ (1 files, 57 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_backward_fuxi/v220/ (1 files, 56 lines)
training/tf_rec_v1/src/AccCTR/           (1 files, 56 lines)
training/tf_rec_v1/src/AccCTR/src/embedding_cache/initializer/ (1 files, 56 lines)
cust_op/ascendc_op/ai_core_op/concat_jagged_tensor_grad/c310/ (1 files, 55 lines)
cust_op/ascendc_op/ai_core_op/concat_jagged_tensor/c310/ (1 files, 55 lines)
cust_op/ascendc_op/ai_core_op/dense_to_jagged/c310/ (1 files, 55 lines)
cust_op/ascendc_op/ai_core_op/fused_lazy_adam/c310/ (1 files, 55 lines)
cust_op/ascendc_op/ai_core_op/fused_sgd/c310/ (1 files, 55 lines)
cust_op/ascendc_op/ai_core_op/in_linear_silu/c310/ (1 files, 54 lines)
cust_op/ascendc_op/ai_core_op/offsets_range/c310/ (1 files, 54 lines)
cust_op/ascendc_op/ai_core_op/permute2d_sparse_data/c310/ (1 files, 54 lines)
cust_op/ascendc_op/ai_core_op/dense_embedding_codegen_lookup_function_grad/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/dense_embedding_codegen_lookup_function/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/gather_for_rank1/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/hstu_v2/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/index_select_for_rank1_backward/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/jagged_to_padded_dense/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/ln_mul/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/multislice_concat/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/permute_pooled_embs/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_backward/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_pos/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_time/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/reverse_sequence/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/segment_sum_csr/c310/ (1 files, 53 lines)
cust_op/ascendc_op/ai_core_op/token_mixing/c310/ (1 files, 53 lines)
cust_op/tf_cpu_op/                       (1 files, 53 lines)
training/tf_rec_v2/mxrec/                (1 files, 52 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/ (1 files, 52 lines)
cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/ (1 files, 51 lines)
cust_op/ascendc_op/ai_core_op/index_select_for_rank1_backward/v220/ (1 files, 51 lines)
cust_op/ascendc_op/ai_core_op/init_address_lookup/c310/ (1 files, 51 lines)
cust_op/ascendc_op/ai_core_op/select_dim1_to_permute/c310/ (1 files, 51 lines)
training/common/src/pybind/              (1 files, 51 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/sgd_update/ (1 files, 51 lines)
training/torch_rec_v2/dynamic_emb/dynamic_emb/ (1 files, 51 lines)
cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/ (1 files, 50 lines)
cust_op/ascendc_op/ai_core_op/expand_into_jagged_permute/c310/ (1 files, 50 lines)
cust_op/ascendc_op/ai_core_op/int_nbit_split_embedding_codegen_lookup_function/c310/ (1 files, 50 lines)
cust_op/ascendc_op/ai_core_op/invert_permute/c310/ (1 files, 50 lines)
cust_op/ascendc_op/ai_core_op/split_embedding_codegen_forward_unweighted/c310/ (1 files, 50 lines)
cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/concat_jagged_tensor_grad/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/concat_jagged_tensor/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/dense_to_jagged/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/disentangle_attention/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/hstu_dense_backward/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/ln_mul/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/norm_multiply_dropout_backward/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/norm_multiply_dropout/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/permute_pooled_embs/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/relative_attn_bias_backward/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/reverse_sequence/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/segment_sum_csr/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/split_embedding_codegen_forward_unweighted/v220/ (1 files, 49 lines)
cust_op/ascendc_op/ai_core_op/token_mixing/v220/ (1 files, 49 lines)
training/tf_rec_v2/mxrec/core/host/      (1 files, 49 lines)
cust_op/tf_cpu_op/src/kunpeng/compute/select/ (1 files, 48 lines)
cust_op/ascendc_op/ai_core_op/custom_op_template/ (1 files, 44 lines)
cust_op/framework/tf_plugin/             (1 files, 44 lines)
cust_op/framework/tf_plugin/include/     (1 files, 43 lines)
cust_op/ascendc_op/ai_core_op/gather_for_rank1/onnx_plugin/ (1 files, 38 lines)
cust_op/ascendc_op/build/scripts/onnx_plugin/ (1 files, 33 lines)
training/torch_rec_v2/dynamic_emb/csrc/ops/device_timestamp/ (1 files, 31 lines)
training/torch_rec_v2/torchrec_npu/      (1 files, 23 lines)
training/tf_rec_v2/mxrec/python/         (1 files, 16 lines)
training/common/python/                  (1 files, 0 lines)
training/common/python/communication/    (1 files, 0 lines)

Core Directory Coverage:
- none

README context:
--- README.md ---
# Rec SDK

<div align="center">

[![Zread](https://img.shields.io/badge/Zread-Ask_AI-_.svg?style=flat&color=0052D9&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/Ascend/RecSDK)&nbsp;&nbsp;&nbsp;&nbsp;
[![DeepWiki](https://img.shields.io/badge/DeepWiki-Ask_AI-_.svg?style=flat&color=0052D9&labelColor=000000&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IArs4c6QAAA05JREFUaEPtmUtyEzEQhtWTQyQLHNak2AB7ZnyXZMEjXMGeK/AIi+QuHrMnbChYY7MIh8g01fJoopFb0uhhEqqcbWTp06/uv1saEDv4O3n3dV60RfP947Mm9/SQc0ICFQgzfc4CYZoTPAswgSJCCUJUnAAoRHOAUOcATwbmVLWdGoH//PB8mnKqScAhsD0kYP3j/Yt5LPQe2KvcXmGvRHcDnpxfL2zOYJ1mFwrryWTz0advv1Ut4CJgf5uhDuDj5eUcAUoahrdY/56ebRWeraTjMt/00Sh3UDtjgHtQNHwcRGOC98BJEAEymycmYcWwOprTgcB6VZ5JK5TAJ+fXGLBm3FDAmn6oPPjR4rKCAoJCal2eAiQp2x0vxTPB3ALO2CRkwmDy5WohzBDwSEFKRwPbknEggCPB/imwrycgxX2NzoMCHhPkDwqYMr9tRcP5qNrMZHkVnOjRMWwLCcr8ohBVb1OMjxLwGCvjTikrsBOiA6fNyCrm8V1rP93iVPpwaE+gO0SsWmPiXB+jikdf6SizrT5qKasx5j8ABbHpFTx+vFXp9EnYQmLx02h1QTTrl6eDqxLnGjporxl3NL3agEvXdT0WmEost648sQOYAeJS9Q7bfUVoMGnjo4AZdUMQku50McDcMWcBPvr0SzbTAFDfvJqwLzgxwATnCgnp4wDl6Aa+Ax283gghmj+vj7feE2KBBRMW3FzOpLOADl0Isb5587h/U4gGvkt5v60Z1VLG8BhYjbzRwyQZemwAd6cCR5/XFWLYZRIMpX39AR0tjaGGiGzLVyhse5C9RKC6ai42ppWPKiBagOvaYk8lO7DajerabOZP46Lby5wKjw1HCRx7p9sVMOWGzb/vA1hwiWc6jm3MvQDTogQkiqIhJV0nBQBTU+3okKCFDy9WwferkHjtxib7t3xIUQtHxnIwtx4mpg26/HfwVNVDb4oI9RHmx5WGelRVlrtiw43zboCLaxv46AZeB3IlTkwouebTr1y2NjSpHz68WNFjHvupy3q8TFn3Hos2IAk4Ju5dCo8B3wP7VPr/FGaKiG+T+v+TQqIrOqMTL1VdWV1DdmcbO8KXBz6esmYWYKPwDL5b5FA1a0hwapHiom0r/cKaoqr+27/XcrS5UwSMbQAAAABJRU5ErkJggg==)](https://deepwiki.com/Ascend/RecSDK)

</div>

## 最新消息

* [20260224] 资料结构整改，更新Roadmap（2026Q1）

### Roadmap

[Roadmap（2026Q1）](https://gitcode.com/Ascend/RecSDK/issues/1075)

## 简介

Rec SDK作为面向互联网市场搜索推荐广告的应用使能SDK产品，对于搜索推荐广告模型训练的应用场景需求，提供基于昇腾平台的搜索推荐广告框架，支撑大规模搜推广场景，助力完成搜推广模型的高效训练。

Rec SDK的功能涉及：

1. 模型训练基础功能。支持单机单卡训练、多机多卡分布式训练。
2. 推荐场景特有功能。基于Rec SDK的稀疏表方案，Rec SDK提供必备功能，如特征保存和加载、特征准入、特征淘汰等。
3. 大规模稀疏表特有功能。支持加速卡内存、主机内存、主机磁盘多级存储、支持多机存储、支持动态扩容。规模可超10TB。

## 目录结构

```text
RecSDK/                                          # 项目根目录
    |-- build/                                   # 构建脚本、生成的wheel包等
    |
    |-- cust_op/
    |    |-- ascendc_op                          # Ascend C编写，编译后在AI Core执行的算子和其编译脚本
    |    |-- framework                           # 算子适配层
    |    |-- hkv                                 # hkv子模块代码，项目代码来自https://gitcode.com/Ascend/HierarchicalKV-ascend.git
    |    |-- test                                # 算子测试用例
    |    |-- tf_cpu_op                           # CPU算子
    |
    |-- docs/                                    # 项目资料文档、镜像构建脚本、公网和邮箱地址及通信矩阵文档
    |
    |-- training
         |-- common                              # 公共组件
         |-- tf_rec_v1                           # 基于TensorFlow，适配NPU设备的非全下沉稀疏推荐框架
         |-- tf_rec_v2                           # 基于TensorFlow，适配NPU设备的全下沉稀疏推荐框架（POC状态）
         |-- torch_rec_v1                        # 基于PyTorch、TorchRec开源软件，适配NPU设备的非全下沉稀疏推荐框架
         |-- torch_rec_v2                        # 基于PyTorch、TorchRec开源软件，适配NPU设备的全下沉稀疏推荐框架（POC状态）
```

### 各组件说明

| 组件名称 | 基础框架 | 适配状态 | 框架类型 | 功能描述 |
|---------|---------|---------|---------|---------|
| tf_rec_v1 | TensorFlow | 非全下沉 | 稀疏推荐框架 | 基于TensorFlow，适配NPU设备的非全下沉稀疏推荐框架 |
| tf_rec_v2 | TensorFlow | 全下沉 | 稀疏推荐框架 | 基于TensorFlow，适配NPU设备的全下沉稀疏推荐框架（POC状态） |
| torch_rec_v1 | PyTorch + TorchRec | 非全下沉 | 稀疏推荐框架 | 基于PyTorch、TorchRec开源软件，适配NPU设备的非全下沉稀疏推荐框架 |
| torch_rec_v2 | PyTorch + TorchRec | 全下沉 | 稀疏推荐框架 | 基于PyTorch、TorchRec开源软件，适配NPU设备的全下沉稀疏推荐框架（POC状态） |

### 关键术语说明

- **非全下沉**：指部分计算任务在NPU上执行，部分在CPU上执行的混合模式
- **全下沉**：指所有计算任务都下沉到NPU上执行，以获得更好的性能
- **POC状态**：Proof of Concept（概念验证）状态，表示该组件仍处于试验验证阶段，功能可能不完整或不稳定

## 版本说明

通常，RecSDK一年会有4个正式release版本。

具体版本更新内容，参见：

* [releases](https://gitcode.com/Ascend/RecSDK/releases)

## 环境部署

支持的产品型号如下：

* Atlas 200T A2 Box16
* Atlas 800T A2 训练服务器
* Atlas 900 A3 SuperPoD 超节点

具体组件部署方式，参见：

* [tf_rec_v1](./docs/zh/tensorflow/tf_rec_v1/recsdk_tf_installation_guide.md)
* [tf_rec_v2](./docs/zh/tensorflow/tf_rec_v2/recsdk_tf_installation_guide.md)
* [torch_rec_v1](./docs/zh/torch/torch_rec_v1/recsdk_torch_installation_guide.md)
* [torch_rec_v2](./docs/zh/torch/torch_rec_v2/recsdk_torch_installation_guide.md)

## 源码编译安装

参见具体组件：

* [tf_rec_v1](./docs/zh/tensorflow/tf_rec_v1/recsdk_tf_installation_guide.md#源码编译安装)
* [tf_rec_v2](./docs/zh/tensorflow/tf_rec_v2/recsdk_tf_installation_guide.md#源码编译安装)
* [torch_rec_v1](./docs/zh/torch/torch_rec_v1/recsdk_torch_installation_guide.md#源码编译安装)
* [torch_rec_v2](./docs/zh/torch/torch_rec_v2/recsdk_torch_installation_guide.md#源码编译安装)

## 快速入门

参见具体组件：

* [tf_rec_v1](./docs/zh/tensorflow/tf_rec_v1/quick_start.md)
* [tf_rec_v2](./docs/zh/tensorflow/tf_rec_v2/quick_start.md)
* [torch_rec_v1](./docs/zh/torch/torch_rec_v1/quick_start.md)
* [torch_rec_v2](./docs/zh/torch/torch_rec_v2/quick_start.md)

## 功能介绍&特性介绍

参见具体组件：

* [tf_rec_v1](./docs/zh/tensorflow/tf_rec_v1/introduction.md)
* [tf_rec_v2](./docs/zh/tensorflow/tf_rec_v2/introduction.md)
* [torch_rec_v1](./docs/zh/torch/torch_rec_v1/introduction.md)
* [torch_rec_v2](./docs/zh/torch/torch_rec_v2/introduction.md)

## API参考

参见具体组件：

* [tf_rec_v1](./docs/zh/tensorflow/tf_rec_v1/api)
* [tf_rec_v2](./docs/zh/tensorflow/tf_rec_v2/api)
* [torch_rec_v1](./docs/zh/torch/torch_rec_v1/api)
* [torch_rec_v2](./docs/zh/torch/torch_rec_v2/api)

## 模型适配样例

| 模型名称 | 适配框架 | 组件名称 | 说明 |
|---------|---------|---------|------|
| DIN | PyTorch | torch_rec_v1 | [代码链接](https://gitcode.com/Ascend/RecSDK/tree/develop_torch_benchmark/torch2.6.0_examples_benchmark/develop/din) |
| DLRM(DCNv2) | PyTorch | torch_rec_v1 | [代码链接](https://gitcode.com/Ascend/RecSDK/tree/develop_torch_benchmark/torch2.6.0_examples_benchmark/develop/dlrm) |
| GR | PyTorch | torch_rec_v1 | Facebook GR模型，[代码链接](https://gitcode.com/Ascend/RecSDK/tree/develop_torch_benchmark/torch2.6.0_examples_benchmark/develop/gr/gr_meta) |
| GR | PyTorch | torch_rec_v1 | NVIDIA recsys-GR模型，[代码链接](https://gitcode.com/Ascend/RecSDK/tree/develop_torch_benchmark/torch2.6.0_examples_benchmark/develop/gr_nv) |
| mmoe、eta | PyTorch | torch_rec_v1 | [代码链接](https://gitcode.com/Ascend/RecSDK/blob/develop_torch_benchmark/torch2.6.0_examples_benchmark/develop/model_zoo/README.md) |
| GR | PyTorch | torch_rec_v2 | NVIDIA recsys-GR模型，[代码链接](https://gitcode.com/Ascend/RecSDK/tree/develop_examples_and_tools/torch_rec_v2_examples/gr) |

## 分支维护策略

| 分支名 | 描述 | 维护状态 |
|---------|---------|---------|
| develop | 主开发分支 | 长期维护 |
| develop_examples_and_tools | demo，模型样例，模型相关工具 | 活跃维护 |
| develop_torch_benchmark | benchmark模型适配 | 活跃维护 |

## FAQ

参见具体组件：

* [tf_rec_v1](./docs/zh/tensorflow/tf_rec_v1/faq.md)
* [tf_rec_v2](./docs/zh/tensorflow/tf_rec_v2/faq.md)

## 贡献指导

贡献代码前，请先签署[开放项目贡献者许可协议（CLA）](https://clasign.osinfra.cn/sign/690ca9ddf91c03dee6082ab1)。

1. 如果您遇到bug，请[提交issue](https://gitcode.com/Ascend/RecSDK/issues)。
2. 如果您计划贡献bug-fixes，请提交Pull Requests，参见[具体要求](./contributing.md#pullrequest)。
3. 如果您计划贡献新特性、功能，请先创建issue与我们讨论。写明需求背景/目的，如何设计，对现有API等的影响。未经讨论提交PR可能会导致请求被拒绝，因为项目演进方向可能与您的想法存在偏差。

## 联系我们

更详细的交流、贡献方式，请参考[贡献指南](./contributing.md)。

## 安全声明

用户应根据自身业务，重新审视整个系统的网络安全加固措施，必要时可参考业界优秀加固方案和安全专家的建议。

具体安全加固措施，参见具体组件：

* [tf_rec_v1](./docs/zh/tensorflow/tf_rec_v1/security_hardening.md)
* [tf_rec_v2](./docs/zh/tensorflow/tf_rec_v2/security_hardening.md)
* [torch_rec_v1](./docs/zh/torch/torch_rec_v1/security_hardening.md)
* [torch_rec_v2](./docs/zh/torch/torch_rec_v2/security_hardening.md)

## 免责声明

本代码仓库中包含多个开发分支，这些分支可能包含未完成、实验性或未测试的功能。在正式发布之前，这些分支不应被用于任何生产环境或依赖关键业务的项目中。请务必仅使用我们的正式发行版本，以确保代码的稳定性和安全性。
使用开发分支所导致的任何问题、损失或数据损坏，本项目及其贡献者概不负责。
正式版本请参考Rec SDK正式[release](https://gitcode.com/Ascend/RecSDK/releases)版本。

## License

Apache License Version 2.0，详见[LICENSE文件](./LICENSE)。
Rec SDK docs目录下的文档适用CC-BY 4.0许可证，具体请参见[LICENSE文件](./docs/LICENSE)。

## 致谢

Rec SDK由华为公司的下列部门联合贡献：

* 昇腾计算应用使能开发部
* 计算软件平台部
* 灵衢算力集群开发部
* 计算技术开发部
* 泊松实验室

感谢来自社区的每一个PR，欢迎贡献Rec SDK！


--- cust_op/README.md ---
# RecSDK-Torch 自定义算子说明

在推荐训练中，存在部分算子无NPU实现，或已有NPU实现但性能较差，不能满足推荐训练需求。RecSDK提供了自定义算子用于支持或加速推荐模型NPU训练。其中部分自定义算子已绑定到开源API(将开源API的backend实现转发到NPU)
,导入RecSDK软件包后，可直接通过开源API调用到自定义算子。其余算子则需通过PTA层注册的mxrec模块进行调用。详情请参考各算子目录下的README文件。

说明：本说明文档只针对Torch框架下适配的推荐算子

## 算子文件结构

```shell
├── ascendc_op
    ├──ai_core_op   # 算子功能实现
    ├──build        # 算子编译
├── framework
    ├──torch_plugin # 算子适配层实现
├── test            # 算子测试用例
├── third_party     # 第三方依赖库
    ├── catlass        # CATLASS源码目录
```

## Ascend C参考设计

更多详情可以参考CANN官方的Ascend C算子开发手册[Ascend C算子开发](https://www.hiascend.com/document/detail/zh/canncommercial/80RC2/developmentguide/opdevg/Ascendcopdevg/atlas_ascendc_10_0001.html)。

## 版本配套说明

当前支持两种软件版本配套：PyTorch 2.6.0和PyTorch2.7.1。调用算子前需完成配套软件的安装和所需算子的安装。详细配套关系如下：

| 配套版本  | PyTorch | torch-npu | torchrec  | fbgemm_gpu | hybrid_torchrec |
|-------|---------|-----------|-----------|------------|-----------------|
| 配套版本1 | 2.6.0   | 2.6.0     | 1.1.0+npu | 1.1.0      | 1.1.0           |
| 配套版本2 | 2.7.1   | 2.7.1     | 1.2.0+npu | 1.2.0      | 1.2.0           |

**后续说明以PyTorch 2.6.0配套版本为例进行说明。**

## 单算子使用说明

### 算子编译

进入指定算子的功能实现目录(ascendc_op/ai_core_op/目录下)，执行指令对算子进行编译和部署，默认编译安装Atlas A2训练系列产品AI Core类型。

```shell
git submodule update --init --recursive #部分算子存在三方库依赖，需要初始化submodule
bash run.sh
```

若指定 AI Core 类型编译：

```shell
bash run.sh --ai-core ai_core-<soc_version>
```

> AI处理器的型号<soc_version>请通过如下方式获取:
> 
> - 在安装昇腾AI处理器的服务器执行`npu-smi info`命令进行查询，获取`Chip Name`信息。实际配置值为AscendChip Name，例如`Chip Name`取值为`xxxyy`，实际配置值为`Ascendxxxyy`。
> 
> 基于同系列的AI处理器型号创建的算子工程，其基础功能（基于该工程进行算子开发、编译和部署）通用。

注：需先在环境中设置CANN相关环境变量，再执行算子编译和安装指令。使用默认路径安装CANN时设置环境变量指令如下：

```shell
source /usr/local/Ascend/ascend-toolkit/set_env.sh
```

### 算子适配层编译

#### 单算子编译

进入算子适配层(framework/torch_plugin/torch_library/目录下)，并进入到指定的算子目录。执行算子适配层编译。

```shell
bash build_ops.sh
```

执行完在当前build目录生成 xxx.so文件,调用算子时执行以下命令进行加载。

```python
import torch
torch.ops.load_library("path/to/build/xxx.so")  #.so文件的绝对路径
```

#### 多算子编译

进入算子适配层目录`RecSDK/cust_op/framework/torch_plugin/torch_library/common`下，执行如下命令编译。

```shell
bash build_ops.sh
```

编译完成后，会在common/build目录下生成`libfbgemm_npu_api.so`，并同时在python默认的site-packages路径下存放编译好的`libfbgemm_npu_api.so`。<br>
该so包含`RecSDK/cust_op/framework/torch_plugin/torch_library/`目录下所有算子的适配层。

加载so：

```python
import sysconfig
import torch
torch.ops.load_library(f"{sysconfig.get_path('purelib')}/libfbgemm_npu_api.so")
```

## 算子测试用例

完成算子及其算子适配层准备后，可通过算子用例验证。进入指定算子的测试用例目录(cust_op/test/目录下/torch)，执行如下命令运行测试用例：

```bash
python3 -m pytest -x your_script.py
```

## 算子介绍

各算子实现的详细介绍见具体算子目录中readme说明。

须知：自定义算子为高性能计算，用户调用自定义算子时需自行确保输入的参数满足算子约束条件、参数类型、参数shape等要求，否则可能出现数组越界，显存不够等问题导致算子执行失败。

# FAQs

## `Could NOT find Python3 (missing: Python3_INCLUDE_DIRS Python3_LIBARIES)`

若编译时报错：`Could NOT find Python3 (missing: Python3_INCLUDE_DIRS Python3_LIBARIES)`

需检查python3的软连接是否正确创建。未创建时，可参考如下命令创建：

```bash
ln -s /usr/local/python3.11.0/bin/python3 /usr/bin/python3 
```



--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/README.md ---
# AsynchronousCompleteCumsum算子及样例说明
本算子仅支持NPU调用

## AsynchronousCompleteCumsum算子文件结构

```shell
├── asynchronous_complete_cumsum.json    # 算子原型配置
├── op_host    # AsynchronousCompleteCumsum算子Host侧实现
├── op_kernel  # AsynchronousCompleteCumsum算子Kernel侧实现
├── README.md  # AsynchronousCompleteCumsum算子说明文档
└── run.sh     # AsynchronousCompleteCumsum算子安装脚本
```

## Ascend C参考设计

更多详情可以参考CANN官方的Ascend C算子开发手册[Ascend C算子开发](https://www.hiascend.com/document/detail/zh/canncommercial/80RC2/developmentguide/opdevg/Ascendcopdevg/atlas_ascendc_10_0001.html)。

## AsynchronousCompleteCumsum算子使用

1. 上传asynchronous_complete_cumsum文件夹到目标环境，并进入当前目录，执行指令对asynchronous_complete_cumsum算子进行编译和部署

默认编译安装Atlas A5训练系列产品AI Core类型：
```shell
bash run.sh
```

指定 AI Core 类型编译，目前此版本支持Atlas A5系列产品：

```shell
bash run.sh ai_core-<soc_version>
```
> AI处理器的型号<soc_version>请通过如下方式获取:
> - 在安装昇腾AI处理器的服务器执行`npu-smi info`命令进行查询，获取`Chip Name`信息。实际配置值为AscendChip Name，例如`Chip Name`取值为`xxxyy`，实际配置值为`Ascendxxxyy`。
>
> 基于同系列的AI处理器型号创建的算子工程，其基础功能（基于该工程进行算子开发、编译和部署）通用。

注：需先在环境中设置CANN相关环境变量，再执行算子编译和安装指令。安装8.3.RC1版本的CANN时设置环境变量指令如下：

```shell
source /usr/local/Ascend/driver/bin/setenv.bash
source /usr/local/Ascend/ascend-toolkit/8.3.RC1/bin/setenv.bash
export ASCEND_OPP_KERNEL_PATH=/usr/local/Ascend/ascend-toolkit/8.3.RC1
export ASCEND_HOME_PATH=/usr/local/Ascend/ascend-toolkit/latest
```

## asynchronous_complete_cumsum算子介绍

1. 算子分析

a) 算子的主要功能是实现输入offset的异步并行累加（前缀和计算）；  
b) 算子输入说明：
* x：输入的offset tensor, eg: [1,5,6]

c) 算子输出说明：
* y：输入的offset tensor对应的累加和, eg: [0, 1, 6, 12]
  - 前N个元素为前缀和结果：[0, 1, 6]
  - 最后一个元素为总和：12

d) 算法特点：
* **异步并行**：支持多AI Core并行计算，充分利用硬件资源
* **双模式优化**：根据数据规模自动选择最优算法策略
* **内存友好**：使用Cache对齐和共享内存优化，减少全局内存访问
* **负载均衡**：智能分配Block到不同AI Core，确保计算负载均衡

e) 算子约束说明：
* 支持的型号：Atlas A5系列产品;
* 支持的CANN版本：8.3.RC1及之后版本；
* 支持的输入数据类型：int32；int64
* 输入的数据只支持1维。
* 算子参数均会在NPU显存中存放，请根据显存大小合理设置参数长度。
* 最大支持输入长度：理论上无限制，实际受NPU显存大小约束

2. Host侧算子实现

Host侧算子实现在目录 op_host下，包括asynchronous_complete_cumsum.cpp和asynchronous_complete_cumsum_tiling.h。

a) Tiling实现

**TilingFunc函数**：
- 从context中获取输入参数信息（输入shape、数据类型等）
- 进行输入有效性校验：确保输入为1维张量，支持int32/int64数据类型
- 根据输入长度选择算法策略
- 计算资源分配：
  - 根据输入长度计算所需Block数量
  - 获取可用AI Core数量，实现负载均衡
  - 计算每个Core处理的Block数量
- 工作空间计算：
   - SharedMemory空间：存储每个Block的累积和
  - 系统工作空间：AscendC平台所需空间

**TilingData结构**：
- totalLength：输入数据总长度
- totalBlocks：总Block数量
- blocksPerCore：每个Core处理的Block数量
- remainderBlocks：余数Block数量（用于负载均衡）
- elementsPerBlock：单线程块处理的最大元素个数
- isSmall：判断是否是小数据
- isFullCore：判断是否用到全部的核

b) Shape推导

**InferShape函数**：
- 输入：1维张量，长度为N
- 输出：1维张量，长度为N+1
- 前N个元素为前缀和结果，第N+1个元素为总和
- 支持动态shape（-1表示未知长度）

**InferDataType函数**：
- 输出数据类型与输入数据类型保持一致
- 支持int32和int64两种数据类型

c) 原型注册

**AsynchronousCompleteCumsum类**：
- 继承自OpDef基类
- 定义输入输出参数：
  - 输入"x"：必需参数，支持int32/int64，ND格式
  - 输出"y"：必需参数，支持int32/int64，ND格式
- 绑定推理函数：InferShape和InferDataType
- 绑定Tiling函数：optiling::TilingFunc
- 配置AI Core支持：ascend950

3. Kernel侧算子实现

Kernel侧算子实现在目录op_kernel下，其中包括：asynchronous_complete_cumsum.cpp和asynchronous_complete_cumsum_kernel.h。

a) 核函数的入口：`extern "C" __global__ __aicore__ void asynchronous_complete_cumsum`

b) 解析tiling参数：`GET_TILING_DATA(tilingData, tiling)`从TilingData中获取host侧传入的数据

c) 核心算法实现：

   **小数据模式**：
   - 使用SIMT向量化函数`SimtSmallDataCompute`进行并行计算
   - 采用Warp级前缀和算法：每个Warp内部使用`WarpPrefixSum`进行并行前缀和计算
   - 通过共享内存实现Block级同步和前缀和聚合
   - 支持多Block场景下的两阶段更新：使用ReduceSum指令计算块级的前缀和

   **大数据模式**：
   - 第一阶段：`SimtLargeDataCompute` - 每个线程处理多个元素，计算局部前缀和
   - 第二阶段：使用ReduceSum指令计算块级的前缀和，更新当前Block的输出
   - 支持多核并行：每个AI Core处理多个Block，通过`blocksPerCore`和`remainderBlocks`实现负载均衡

d) 关键技术特性：

   **内存优化**：
  - 共享内存用于Block内Warp间通信，减少全局内存访问

   **并行策略**：
   - 最大支持1024个线程/Block，32个线程/Warp
   - 小数据模式：每个线程处理1个元素
   - 大数据模式：每个线程最多处理4个元素
   - 支持多AI Core并行执行

   **前缀和算法**：
   - Warp级前缀和：使用`WarpShflUpSync`进行线程间数据交换
   - Block级前缀和：通过共享内存聚合Warp结果
   - 全局前缀和：通过BlockSums实现跨Block的累积
   
4. 性能优化特性

a) **内存访问优化**：
   - 共享内存通信：Block内Warp间通过共享内存通信，减少全局内存访问
   - 向量化处理：使用SIMT向量化函数，提高指令吞吐量

b) **并行计算优化**：
   - 多级并行：Warp级、Block级、Core级三级并行
   - 负载均衡：智能分配Block到不同AI Core，避免负载不均
   - 异步执行：支持多Block异步并行执行
   


Docs context:
--- docs/zh/overview.md ---
# 简介<a name="ZH-CN_TOPIC_0000002374690129"></a>

## Rec SDK是什么<a name="ZH-CN_TOPIC_0000002340851986"></a>

**产品背景<a name="section9310436192913"></a>**

随着人工智能技术的演进，电商、长短视频、社交等行业对搜索系统、推荐系统以及广告系统的效果诉求越发强烈。在如今互联网发达的时代，大量的用户数据、商品数据、视频资料，使信息剧烈爆炸，也使得搜索推荐广告系统的价值进一步凸显。搜索推荐广告系统的需求增长必然带来对算力的需求，如何部署更大算力并充分发挥算力成为从业人员重点关注的问题。

**产品定义<a name="section16741737202912"></a>**

Rec SDK作为**面向互联网市场搜索推荐广告的应用使能SDK产品**，对于搜索推荐广告模型训练的应用场景需求，提供基于昇腾平台的搜索推荐广告框架，支撑大规模搜索推荐广告场景，助力完成搜索推荐广告模型的高效训练。

**产品价值<a name="section1385410372299"></a>**

**表 1**  产品价值说明

|产品特性|产品价值|
|--|--|
|易用|极简易用API，快速开发算法模型。|
|精度|在标准模型验证精度误差小于万分之一。|
|性能|高效多级流水加速，高速集合通信加速，极致性能优化。|


--- docs/zh/performance_tuning.md (truncated) ---
# 性能调优<a name="ZH-CN_TOPIC_0000002412005857"></a>

## 性能调优流程<a name="ZH-CN_TOPIC_0000002414255969"></a>

在计算越来越重要的今天，以GPU（Graphics Processing Unit）和NPU（Neural Network Processing Unit）为代表的并行计算设备，在人工智能和其他行业，都扮演着重要角色。计算的效率，或者称之为计算的性能，越来越得到广泛关注。

本章节以性能的含义以及性能工具等基础概念介绍为出发点，介绍了训练模型在昇腾设备上的通用性能调优方法。对应的性能调优流程如[图1](#fig87871647115415)所示。

**图 1**  性能调优流程图<a id="fig87871647115415"></a>  
![](figures/performance_tuning/性能调优流程图.png "性能调优流程图")

## 性能指标<a name="ZH-CN_TOPIC_0000002414375817"></a>

需要对齐如下关键指标：

- 单卡/多卡场景：单卡场景验证时按照客户配置，在Docker中切分CPU资源进行验证；多卡场景可能会出现CPU bound，前期调试需确认CPU资源是否已满足需求。
- 时延要求：要求某个固定值，或是变化值；以及低负载和高负载的要求标准。
- batchsize分布情况：要求固定值，或是动态值以及batchsize分布情况。
- QPS（Queries Per Second，每秒钟请求量）：请求次数是间隔时间内请求的总量，QPS=请求数/秒（req/sec）。
- 吞吐量：定义为网络模型在单位时间（例如1s）内可以处理的最大样本数据量，吞吐量=QPS\*batchsize。
- 数据类型：float16、float32或者其他类型。

### 性能调优工具介绍<a name="ZH-CN_TOPIC_0000002380656610"></a>

#### msprof工具介绍<a name="ZH-CN_TOPIC_0000002380816482"></a>

##### PyTorch专用的性能采集<a name="ZH-CN_TOPIC_0000002414255973"></a>

PyTorch推荐使用接口进行性能采集，采集完之后会自动解析性能数据，详细请参考《CANN 性能调优工具用户指南》中的“msprof采集通用命令”。

完整示例如下：

```python
import torch
import torch_npu
device = torch.device("npu")
class DemoModel(torch.nn.Module):
    def forward(self, in0, in1):
        mul0 = in0 * in1
        sub0 = mul0 ** 2 - in0
        sub1 = mul0 ** 2 - in1
        slice0 = sub0[:, :2]
        slice1 = sub1[:, 2:]
        cat0 = torch.cat([slice0, slice1], dim=1)
        return cat0
def main():
    torch.manual_seed(2025)
    in0 = torch.randn(3,5).to(device)
    in1 = torch.randn(3,5).to(device)
    model = DemoModel().to(device)
    output = model(in0, in1)
    print(output.shape)
    print(output.device)
    print(output)
    # perf code
    experimental_config = torch_npu.profiler._ExperimentalConfig(
        export_type=[
            torch_npu.profiler.ExportType.Text,
            torch_npu.profiler.ExportType.Db
            ],
        profiler_level=torch_npu.profiler.ProfilerLevel.Level1,
        msprof_tx=False,
        aic_metrics=torch_npu.profiler.AiCMetrics.AiCoreNone,
        l2_cache=False,
        op_attr=False,
        data_simplification=False,
        record_op_args=False,
        gc_detect_threshold=None
    )
    steps = 10
    with torch_npu.profiler.profile(
        activities=[
            torch_npu.profiler.ProfilerActivity.CPU,
            torch_npu.profiler.ProfilerActivity.NPU
            ],
        schedule=torch_npu.profiler.schedule(wait=3, warmup=0, active=1, repeat=1, skip_first=1),
        on_trace_ready=torch_npu.profiler.tensorboard_trace_handler("./result"),
        record_shapes=False,
        profile_memory=False,
        with_stack=False,
        with_modules=False,
        with_flops=False,
        experimental_config=experimental_config) as prof:
        print("profiling start...")
        for step in range(steps):
            output = model(in0, in1)
            prof.step()
if __name__ == "__main__":
    main()
```

##### TensorFlow和PyTorch的性能采集<a name="ZH-CN_TOPIC_0000002414375821"></a>

TensorFlow下没有接口可以直接调用，需要使用msprof命令进行采集，一般使用动态采集，方便控制采集数据量；详细请参考《CANN 性能调优工具用户指南》中的“动态采集性能数据”。

示例代码如下：

```python
import npu_device
from npu_device.compat.v1.npu_init import *
import numpy as np
import tensorflow as tf
tf.compat.v1.disable_eager_execution()
session_config = tf.compat.v1.ConfigProto()
custom_op = session_config.graph_options.rewrite_options.custom_optimizers.add()
custom_op.name = "NpuOptimizer"
custom_op.parameter_map["graph_max_parallel_model_num"].i = 1
custom_op.parameter_map["aicore_num"].s = tf.compat.as_bytes("7|10")
session_config.graph_options.rewrite_options.remapping = RewriterConfig.OFF
left_shape = [1, 8000]
right_shape = [800, 1]
x = tf.compat.v1.placeholder(tf.int64, shape=left_shape)
y = tf.compat.v1.placeholder(tf.int64, shape=right_shape)
equal_ret = tf.math.equal(x, y)
inputs_x = np.random.rand(*left_shape)
inputs_x = inputs_x.astype(np.int64)
inputs_y = np.random.rand(*right_shape)
inputs_y = inputs_y.astype(np.int64)
with tf.compat.v1.Session(config=session_config) as sess:
  for i in range(100000):
    result = sess.run(equal_ret, feed_dict={x:inputs_x, y:inputs_y})
    
print(result)
```

1. 需要在循环运行推理，然后在模型开始推理一小段时间后，自行获取运行程序的pid，比如本次为9527，则运行如下命令动态采集命令采集数据

    ```bash
    msprof --dynamic=on --pid=9527 --output=/home/projects/output --model-execution=on --runtime-api=on --aicpu=on
    > start
        
    ...
    > stop
       
    ...
    > quit
    ```

    其中start命令之后，为动态采集的时间窗，到输入stop命令时结束采集；

2. 采集出数据后，还需要手动解析，进入到上一步采集的目录（一般是一个带有时间戳的目录），使用以下命令解析数据

    ```cpp
    // 启用解析并将profiling输出到当前目录
    msprof --parse=on --output=./
    // 启用导出，并将结果以CSV格式保存到当前目录
    msprof --export=on --output=. --summary-format=csv
    ```

    >[!NOTE]
    >采集时间过长，解析时间会很长，需要适当控制采集时间，一般采集5s就可以进行数据分析。

#### GE DUMP介绍<a name="ZH-CN_TOPIC_0000002380656614"></a>

执行图的分析，要基于GE优化过后的图，需要通过配置相关环境变量dump下来。

涉及的环境变量有DUMP\_GE\_GRAPH、DUMP\_GRAPH\_LEVEL、DUMP\_GRAPH\_PATH，详细请参考《CANN 环境变量参考》中的“图编译”。

常用配置为DUMP\_GE\_GRAPH=2、DUMP\_GRAPH\_LEVEL=2。

在dump图文件夹下，会生成若干张pbtxt/pb，其均为在图优化过程中各个阶段执行完后，按顺序生成。例如ge\_onnx\_00000101\_graph\_0\_Build.pbtxt中00000101为这个序号，后面的graph\_0的0代表rank id，在推荐推理场景恒为0。这里的build图对应的就是执行阶段的图，在需要通过profiling与该图对应的网络结构，分析优化空间。

[msIT工具](https://gitcode.com/Ascend/msit/blob/master/msit/docs/graph/README.md)：dump出GE图，再用工具的msit graph功能，扫描重复结构，重复出现次数多，且占比较大的子结构，可以考虑手写融合pass和融合算子进行优化，其中也有子图抽取功能，比如图太大打不开的场景，可以抽取某块子图打开来分析，推荐使用第三方网络可视化工具：[netron.app](https://netron.app/)。

## 性能优化分析<a name="ZH-CN_TOPIC_0000002380816486"></a>

可能涉及的软件栈主要是PyTorch和TensorFlow，在这两种场景下，也有可能根据客户的实际使用场景，衍生出不同的框架，这里只介绍这套软件栈的基础流程。

### PyTorch技术栈<a name="ZH-CN_TOPIC_0000002414255977"></a>

![](figures/performance_tuning/zh-cn_image_0000002414375861.png)

### TensorFlow技术栈<a name="ZH-CN_TOPIC_0000002414375825"></a>

![](figures/performance_tuning/zh-cn_image_0000002380656654.png)

### 开箱<a name="ZH-CN_TOPIC_0000002380656618"></a>

启动客户模型时，具体使用TensorFlow技术栈或是PyTorch技术栈通常取决于客户的需求，开箱软件栈的选择应基于客户的推理框架流程。

- 使用TensorFlow框架，客户通常会提供一个pb文件，可以根据客户的软件栈运行模型，可参考社区上的demo（[TF推理样例参考](https://www.hiascend.com/document/detail/zh/TensorFlowCommunity/82RC1alpha002/migration/tfmigr1/atlastfserv_26_0006.html)）。
- 使用PyTorch路线，可以使用TorchAir套件进行推理，参考社区上的demo\([TorchAir推理样例](https://www.hiascend.com/document/detail/zh/Pytorch/710/modthirdparty/torchairuseguide/torchair_00005.html)\)。
- 使用生态路线，即使用Inductor+Triton这套流程。完成开箱后，可以初步观察到性能基线，并与目标进行对比，同时参考本文前述章节中的profiling采集方法进行后续分析。

### 不同的瓶颈点<a name="ZH-CN_TOPIC_0000002380816490"></a>

下面尝试举例几种理想的场景进行分析，实际中大部分情况是解决完一个bound，又会出现另一个bound，或者混杂到一起的场景；没有出现bound可能是NPU利用率没有打满，可以先构造压力打满的场景（如本地压测脚本，多流大压力跑本模型），再分析瓶颈点。

#### cube/vector<a name="ZH-CN_TOPIC_0000002414255981"></a>

程序性能由计算核心（Kernel）的执行时间主导，可以通过以下几处查看是否bound。

1. npu-smi info查看利用率，如果利用率很高则很有可能就是bound，也有可能前期跑单个推理利用率比较低，多个推理并行时，利用率超过80%（一般认为这个值就已经很高了）；这种方式查看到的值是cube核上的cycle与时钟频率换算出来的cycle的比值，不包含vector core的占比，所以这个值是个初步查看，具体的需要从profiling里面的cycle自行计算；

    通过profiling计算利用率，以下图为例：

    ![](figures/performance_tuning/zh-cn_image_0000002380816526.png)

2. 按照算子type筛选，比如这里筛选AI\_CORE，就是计算CUBE的利用率。
3. 按照start time排序，计算第一个和最后一个时间戳的差值，就是这一整段的所有耗时。
4. CUBE的总cycle数就是aic\_total\_cycles数求和。
5. 利用率为③/\(②/1000000\*20\*1650\*1000000\)。其中②的单位是us，所以除以1000000转换成s；20是具体芯片的ai\_core数量；1650是当前芯片的频率，单位为MHz/s，所以需要乘以1000000。

    这里计算出来的利用率是cube整体利用率的78.9%。

6. 计算过程中各流程的占比直接用时间可以算出来。比如mte2耗时占比为ai\_core总耗时的70.18%，可以推断出ai\_core上的耗时内存搬入占大头。

cube/vector bound场景下的优化手段：

- 图优化，比如torch.compile或者TensorFlow的xla。
- 算子融合，可以减少算子启动开销和算子中间读写。
- 数据类型，如本来是float32降低到HF32，相同数据，计算量将减少（可能影响精度，要做好精度测试）。其中，HF32数据类型仅针对Conv类算子与Matmul类算子生效。

#### host<a name="ZH-CN_TOPIC_0000002414375829"></a>

**分析过程<a name="section12759386573"></a>**

profiling的timeline文件，通过chrome://tracing/网页打开，可以看到类似这样的算子下发。

![](figures/performance_tuning/zh-cn_image_0000002383562202.png)

如上图所示，device上存在大量气泡，卡算力未用满。

这种情况一般见于动态图场景或者单算子下发场景，依赖host侧处理计算完成后，再下发单个算子，同时算子执行时间小于host侧处理时间；

host侧有计算工作量的，通过TensorFlow原生的Profiler工具导出，查看host和device耗时占比，以及CPU利用率判断；混合计算开启后（可参考：[www.hiascend.com](https://www.hiascend.com/document/detail/zh/TensorFlowCommunity/82RC1alpha003/migration/tfmigr1/tfmigr1_000074.html)），系统会自动把不能在device侧执行的算子留在host侧执行，也可以根据用户配置指定某些算子不下沉到device上，从而导致host计算量变高。可以通过TensorFlow原生的Profiler工具，抓取整个session-\>run的性能（参考[www.tensorflow.org](https://www.tensorflow.org/guide/profiler?hl=zh-cn#%25E6%25A6%2582%25E8%25A7%2588%25E9%25A1%25B5%25E9%259D%25A2)），分析host侧与device侧耗时占比。

**解决方案<a name="section7313618185710"></a>**

- 单算子下发方案替换成整图下沉。
- 动态图转静态图。
- 增大batchsize，增加算子执行时间，减少free的缝隙时间占比。
- host侧性能提升，CPU利用率过高的话，则要考虑CPU侧的一些优化。
- 集群方式部署，保证host侧资源足够。
- 单机器部署可以考虑非host bound模型和host bound模型混布。

#### PCIe<a name="ZH-CN_TOPIC_0000002380656622"></a>

最简单就是增大压力，PCIe时间明显变长，其他时间变化不大；

PCIe的耗时在timeline文件中的耗时就是图中的model@inputcopy。

![](figures/performance_tuning/zh-cn_image_0000002414375865.png)

实际速率指标：通过summary信息在pcie\_\*.csv文件汇总（profiling抓PCIe信息，参考：[www.hiascend.com](https://www.hiascend.com/document/detail/zh/canncommercial/82RC1/devaids/Profiling/atlasprofiling_16_0012.html)，相关变量为--sys-interconnection-profiling）；比如下图中的Tx\_p\_avg就是input的数据，平均速率为99.628MB/s。

![](figures/performance_tuning/zh-cn_image_0000002380656658.png)

理论数据计算：假设是PCIe5.0版本，每条PCIe Lane的双向传输速率接近 8GB/s，一般卡是x4的接口，则理论最大速率接近32GB/s，实际根据传输的文件大小不同，速率不一样；一般认为最大能达到80%的理论带宽；实际带宽根据发送数据的shape和大小强相关。

**分析方向<a name="section1960542154611"></a>**

1. 一个CPU对应多少张卡，是否可以通过numa node节点绑定等操作，减少PCIe抢占带来的耗时
2. 增大batchsize，减少PCIe传输头开销的占比
3. 数据格式，从float32降低到float16也能有效解决（需要关注精度是否达标，或者客户接受）
4. host侧先把数据攒到一起，把小份数据传输转换为大份数据传输（GE框架已自带该功能，如果客户调用aclrt接口需要自己实现）

#### 访存<a name="ZH-CN_TOPIC_0000002380816494"></a>

主要是针对vector算子或者cube算子的内存搬入或者搬出，会存在访存bound。

1. 一般可以通过profiling文件，根据每个算子的数据搬运量和其消耗在搬运上的时间，来计算访存速率，判断是否存在访存bound。

    ![](figures/performance_tuning/zh-cn_image_0000002380816530.png)

    如上图所示，input的数据量是20000/48\*2\*8=6.5KB。其中，48是因为数据被分配到48个核上、2表示有两个20000的shape、8表示int64、mte2时间为1051us，所以计算其带宽为0.005GB/s。这个带宽远不达理论带宽，肯定是有问题的。

2. 直接通过profiling文件的aiv\_mte2\_ratio字段，判断是否超过0.8。如果有大量超过0.8的算子出现，则这一部分是需要进行优化的，如下图所示：

    ![](figures/performance_tuning/zh-cn_image_0000002414256021.png)

**分析方向<a name="section1559362095619"></a>**

1. 需要分析耗时是否合理
2. vector算子融合，可以有效减少需要拷贝的数据量，从而释放访存压力
3. 排查搬运的数据量是否非32byte对齐，非对齐场景也会导致带宽低，也需要在算子内做特殊处理

### 案例分享1<a name="ZH-CN_TOPIC_0000002414255985"></a>

**背景描述<a name="section137426914212"></a>**

该客户的数据是从大盘分配固定百分比的流量，到某一个集群中，这个集群中有若干数量的NPU卡来处理这些请求，性能调优以降低这个集群中的卡的数量，且同时保证处理请求的时延不超标为目标。

**分析过程<a name="section1868616174234"></a>**

本地测试数据 ---\> step1：

1. batching策略是在客户的服务端框架做的，可以通过参数，修改其攒batch时间，和档位；
2. 最大档位意思是从1到该最大档位中间每个bs都配置成档位；
3. 流数则表示一张NPU卡上的实例数，即最大可以几个推理任务同时并行跑；
4. 分核第一个数字是cube数量，第二个数字是vector数量；
5. 最后三列性能均是通过1000/平均时间\*流数算出来的QPS值。

    ![](figures/performance_tuning/zh-cn_image_0000002477306400.png)

    通过上面数据表格，可以看到最大档位为16bs，流数为3时，QPS最高。需要注意的是，这个数据本身是本地均匀压力测试，bs分布不代表线上真实情况，所以跟线上实际表现，不一定完全一致，只能作为定向的分析手段。

线上bs分布 ---\> step2：

从线上环境抓取的bs数据如下，可以看到大多数bs都很小，90%都是bs 20以下的，86%是bs 16以下。

![](figures/performance_tuning/zh-cn_image_0000002380656662.png)

那么这里结合上面的本地测试性能，我们就可以选择最大档位为16，流数为3。

线上bs性能调优 ---\> step3：

实际数据，在流量高峰的时候，NPU的时延劣化严重，即时延随流量增大而增大，所以怀疑到利用率上面去。

通过本地测试数据（12/24分核的场景），对比当单个batch size为20的请求过来时，NPU卡上的处理情况如下所示：

![](figures/performance_tuning/zh-cn_image_0000002380816534.png)

- 如配置最大bs为20，则这个请求可以一次性跑完，耗时9.19ms，硬件资源只需要占用12/24的核数。
- 如配置最大bs为16，则这个请求会被拆分为两个bs 10，两个bs 10并行跑完，耗时7.01ms，时间比直接跑bs 20要少，但是占用的硬件资源是24/48的核数，比直接跑bs 20多一倍，这样就会导致NPU利用率过高。

通过修改最大bs配置，线上实际的平均时延无明显变化，但是NPU利用率平均下降5%，流量高峰时延劣化情况明显改善。

### 案例分享2<a name="ZH-CN_TOPIC_0000002414375833"></a>

**背景描述<a name="section322775392014"></a>**

粗排模型，需要在保持限核的情况下（保证高压场景性能，当前是cube7核，vec10核），将低压下的TP99时延降至5ms之内。

**分析过程<a name="section10234172516217"></a>**

profiling采集：

因为当前主要优化低压场景下时延，故profiling采集采用串行方式采集。直接运行模型跑推理，然后使用msprof --dynamic=on --pid=9527 --output=/home/projects/output --model-execution=on --runtime-api=on --aicpu=on命令动态采集，具体使用可以参考[msprof工具介绍](#msprof工具介绍)。

开箱：在未开启优化的场景（只沿用算子模式的配置，gatherV2高性能，Cube开启HF32），模型单次modelExecute需要51ms，离目标性能差距在10倍。

![](figures/performance_tuning/zh-cn_image_0000002414256025.png)

1. 因为串行执行，算子的耗时是稳定的，profiling上可以直接基于op\_name去重后分析单次推理的性能。

    ![](figures/performance_tuning/zh-cn_image_0000002496791749.png)

2. 这里通过按task\_duration倒排，可以看到每次推理执行时间在44ms左右，同时因为大量dynamic算子，引入了7ms左右的task\_wait时间（等待host调度）。

    分析这里的Gather算子shape和周遭结构，首先dynamic的Gather算子，使用的是逻辑核，无法通过GE的限核功能限制，在这里不满足需要兼顾高压下性能的前提，同时，步骤1图中Gather算子的index数量只有至多20000，理论上分析不需要ms级别（实际因为数据重复度较高，有较大的核间冲突）。

    从结构上分析，这部分Gather来源于如下结构中第一个Gather。

    ![](figures/performance_tuning/zh-cn_image_0000002417307965.png)

    这段子结构因为引入Where算子，后续算子的shape都不固定，所以引入动态子图，同时由于Where是3类算子（输出shape不固定），会导致动态图执行到Where算子后，将shape信息返回host，才能执行后续算子的shape推导。导致整网出现大量的task\_wait时间。

    从执行逻辑上分析，这段子结构在原始Gather逻辑上扩展了一个遇到<0的索引则返回全0向量的功能。同时，基于重复数据做分析，这里的输入实际上带着很长的一段padding的0，实现一个自定义的Gather算子，同时对部分table在UB内全载之后能解决这段动态子图/Gather动态限核不生效/Gather性能问题。

profiling分析--\>step2：

通过自定义算子解决上述问题后，重新采集profiling进行分析。当前串行执行时间已经降低到9ms左右，同时default\_gather的性能对比原始场景性能有了极大提升。

![](figures/performance_tuning/zh-cn_image_0000002380816538.png)

![](figures/performance_tuning/zh-cn_image_0000002414256029.png)

然后这里没有被DefaultGather替代的算子，不在那个动态结构中，但是对于序列长度仅为4000的Gather算子，从理论分析也不需要180us+的时间（这里的问题实际上是因为GatherV2高性能模式在全载场景实现导致的）。从算子设计上，对于shape为400,50的table shape，直接全载之后，性能会有较大提升。

这里通过自定义Gather算子覆盖该场景（同步算子优化需求）。

profiling分析--\>step3：

通过CustomGather实现全载逻辑后替换剩余Gather算子后，模型串行时间来到了6.1ms左右。在这个场景下，就可以针对模型的优化点去全量扫一遍。

![](figures/performance_tuning/zh-cn_image_0000002414375877.png)

继续分析瓶颈点，top的TopK和Equal，TopK算子因为底层不支持SIMT，所以通过vec上一套较为复杂的算法实现，导致时延很长，从算子上无优化空间。但是基于用户实际业务，这里的TopK的输入，也有包含padding的0，所以设计上如果给TopK算子传入有效长度，能大幅降低TopK算子的平均执行时间（对TP99影响不大，但会影响最大QPS）。这个优化点依赖用户上层框架改动传入实际长度，所以在这个示例中暂未实现。

针对Equal算子，1,4000;400,1的shape执行在230us+，理论上距离vector算子的算力相差很远。这里实际是因为Int64的实现造成的，通过测试，同shape的Int32 Equal算子只需要30us不到，Int64相较于Int32，是线上肯定不可能需要近一个数量级以上的时间。这里针对这种双广播场景，单独设计了一个Equal的Int64实现，可以将Equal算子时延降到75us上下。

同时，我们发现这里还有Unique，Where等AICPU算子，

算子需要依赖上层拆图（当前场景拆图逻辑受用户控制，在示例中未处理）。而Where算子，来源于以下这个结构，可以通过自定义PASS消除Where引入的动态结构。

![](figures/performance_tuning/zh-cn_image_0000002380656670.png)

同时针对这种batchMatmul，将运算逻辑替换为2,400, 300 \* 2, 300, 16后，性能也能有提升。

![](figures/performance_tuning/zh-cn_image_0000002380816542.png)

最终模型在通过自定义Equal、消除Where，替换BMM后，串行时延到了4.6ms，基本满足性能需求。

![](figures/performance_tuning/zh-cn_image_0000002414256033.png)

## 性能调优方法<a name="ZH-CN_TOPIC_0000002380656626"></a>

### AI CPU算子消除<a name="ZH-CN_TOPIC_0000002380816498"></a>

**使用背景<a name="section736814187110"></a>**

因为SIMD原因，NPU上的AICPU算子普遍性能很差，对于该类算子，需要想办法消除，或将其切到CPU上执行。

**使用约束<a name="section1042475016118"></a>**

当前都是通过人眼识别，手动修改客户模型代码实现，需要客户配合。

**具体案例<a name="section424121710210"></a>**

**案例一：**

针对topK算子，如果值为int32/int64类型，则只能在AICPU上执行，但如果为fp32类型，则有ai vector实现。基于用户实际场景，如果可以满足int32/int64fp32转换且不损失精度（值<2^24），则可以通过自定义pass将索引为int32/int64的topK转为cast\(int32fp32/int64\) + TopK\(索引fp32\) + cast\(fp32int32/int64\)去执行。

**案例二：**

针对部分在NPU上执行的AICPU算子，没有vector实现，同时上层有其他不好切到CPU侧的算子时，需要考虑通过改图，让AICPU算子不依赖其他NPU算子。如下图，Bucketize算子依赖的Gather算子，索引来源于一大块NPU子图，这张子图本身不可能全部切到CPU执行。如果想把Bucketize算子切到CPU，需要分析Bucketize算子实际只直接依赖Gather算子，而Gather算子作为索引类算子，实际上可以针对Gather的Table做Bucketize而不是对Gather的结果做Bucketize（这里需要有table size 不会远大于gather output size的先验结论），如果将Bucketize挪至Gather的table分支上方，则发现squeeze算子实际上和Bucketize无顺序依赖，故可以将Bucketize挪到input上方，在CPU侧执行。

![](figures/performance_tuning/zh-cn_image_0000002417288229.png)

### 自定义pass<a name="ZH-CN_TOPIC_0000002380816502"></a>

**具体案例<a name="section424121710210"></a>**

**案例一：bmm + tile**

Bmm算子内部本身有广播逻辑，如果周围有算子实现的正好是广播逻辑，则可以将其消除以提高性能。如下图，删掉Tile算子之后，能得到几个性能提升点：

1. Tile算子本身时间。
2. Tile算子引入的一块128\*8\*300\*32\*4 = 37.5M的访存，对其他实例的Cache命中率有影响。
3. BMM算子本身的mte速度，因为广播变快。

    ![](figures/performance_tuning/zh-cn_image_0000002383734476.png)

**案例二：同源concat**

该场景构图时使用concat实际上与Tile算子实现的相同功能，但是tile算子的搬入数据量，只有concat的1/240, 同时，如果尾轴非对齐，concat算子还会有不少性能损失。

![](figures/performance_tuning/zh-cn_image_0000002417333869.png)

**案例三：广播BMM算子**

可以观察到原始的BMM，做的是 1，32  300, 32的 matmul计算，在npu硬件单元上，只能利用cube矩阵单元1/16的算子，有很大的算力浪费，这里因为首轴有广播，所以通过将广播轴缩到k轴上，将128  8 次  1，32  300, 32 替换为8 次 128, 32  300, 32的矩阵运算，提高整体的Cube利用率. 这里引入的Reshape算子不在NPU上执行，引入的transpose算子影响比不上计算效率带来的提升，整体而言收益非常明显。

![](figures/performance_tuning/zh-cn_image_0000002417293733.png)

**案例四：Tile+Concat**

通过交换tile/concat的执行顺序，将读访存量，从1\*32\*3+128\*32\*3 降到了 1\*32\*3+1\*96, 下降98.5%, 写访存量从128\*32\*3+128\*96下降到1\*96+128\*96, 下降50%。

![](figures/performance_tuning/zh-cn_image_0000002383574596.png)

### 自定义算子<a name="ZH-CN_TOPIC_0000002414375841"></a>

**使用背景<a name="section736814187110"></a>**

针对部分算子的性能问题，如果无法通过PASS，优化周围的计算结构规避时，就需要针对这部分算子进行手动优化。但手写算子，如果要保证其泛化性，往往会需要针对不同shape实现不同tiling分支，代码量非常大。在针对模型优化时，优化时间过长往往不能满足用户需求。所以，如果需要手写自定义算子，最优的策略是基于一些特定网络结构，基于模型上带来的先验知识，去实现针对特定网络结构的优化分支。

**具体案例<a name="section81292121776"></a>**

**案例一：带有效数据长度的TopK**

TopK算子在推荐推理如TWINS模型中使用，该算子即使通过1.5.4中的cast方案优化到vector core上，对于序列长度很长的topK，性能还是很差。同时，基于硬件原因，TOPK算子的算法在NPU上很难实现和GPU相同的性能。所以，针对自定义TOPK算子的优化需要上升到模型层面进行分析。从模型上看，TOPK入参的序列源自于一段padding过后的序列，实际上不需要所有数据参与topK，且其中有效数据占比平均只有10%左右。基于此先验条件，只需要实现一个自定义topK算子，新增一个有效长度入参，就能让算子耗时平均下降90%。

**案例二：自定义floormod算子**

模型中，针对部分特征，采取了如下图实现的通过floormod进行分桶的方式处理，这里实现逻辑为0索引作为0，其余索引会针对一个数取余后+1作为分桶后的索引传递给Gather算子。当前，因为NPU实际上底层不直接支持int64的计算，floormod算子针对int64类型实际上是使用的scalar指令做运算，当入参数量多时，性能很差。从数学上，如果要将int64转换为两个int32计算，其计算逻辑和符号位的处理都很复杂。但基于这个结构，可以得到索引从一定\>0的约束（否则Gather报错），同时floormod用于Gather索引分桶，所以除数（桶数）并不需要int64表达。因为底层fmod/除法指令只支持fp32/fp16的计算，分析除数如果转到fp32，在2^24-1（1677万）内不会出现精度损失，这个范围已经满足用户需求（实际上考虑算法需要桶数在2^21-1以内保证性能，也在大部分场景够用）。故设计算子可以设计为int64/fp32, 在vec范围内有实现，可以避免scalar的问题。

![](figures/performance_tuning/zh-cn_image_0000002383735928.png)

**案例三：自定义Gather算子**

对于部分带有缺省值的特征，通过如下结构实现将<0的索引转为0向量，\>0的索引正常作为索引去Embedding. 该结构中Where算子作为AICPU算子，同时这个结构会被作为动态子图执行，性能很差。这里通过将该逻辑融入Gather算子中，在算子内部对每个索引值进行判断，然后将0向量或者从embedding值搬到目标位置实现这一套逻辑，整体耗时减少3个数量级。

![](figures/performance_tuning/zh-cn_image_0000002383576056.png)

### 多流<a name="ZH-CN_TOPIC_0000002414255997"></a>

**使用背景<a name="section736814187110"></a>**

在推荐推理场景下，模型大多存在算子数量大，算子shape小的特点，且通常会要求单次推理时间在合理范围内尽可能的提高吞吐量（单次推理的数据量\*单位时间内的推理次数）。由于算子shape小，通常会出现算力利用率低从而导致性能不佳的情况，一般需要开启多流并行推理，提升利用率，进而提升吞吐量。

**使用约束<a name="section1042475016118"></a>**

1. 多流并行场景下，存在资源抢占，比如带宽，计算资源等，单个推理的时延，会比单流场景下单个推理的时延更长，在时延敏感场景使用需要做好时延控制；
2. 多流如果不配合分核，可能会存在计算资源排队严重情况，需不需要配合分核一起使用，需要根据具体实际数据而定；
3. 需要根据模型实际吞吐量，控制流数；流数越大，NPU利用率会越高，实际上卡的吞吐量就会越大，实际上超过流数某个阈值之后，会存在不同流之间刷cache的现象，导致整体吞吐量下降。

**具体案例<a name="section1470014569106"></a>**

- TensorFlow  demo：可以参考[GitCode.com](https://gitcode.com/Ascend/RecSDK/blob/develop_examples_and_tools/examples/rec_infer/README.md)进行多流功能使能。
- PyTorch demo：在PyTorch框架中，由于社区对多流没有直接支持，推荐直接使用多进程方式进行推理。

### 分核<a name="ZH-CN_TOPIC_0000002380656642"></a>

**使用背景<a name="section736814187110"></a>**

以A2服务器配置的NPU卡为例，一个卡中包含ai cube core计�

--- docs/zh/rec_full_stack.md ---
# 推荐全栈介绍

## 简介

### 产品背景

随着人工智能技术的演进，电商、长短视频、社交等行业对搜索系统、推荐系统以及广告系统的效果诉求越发强烈。在如今互联网发达的时代，大量的用户数据、商品数据、视频资料，使信息剧烈爆炸，也使得搜索推荐广告系统的价值进一步凸显。搜索推荐广告系统的需求增长必然带来对算力的需求，如何部署更大算力并充分发挥算力成为从业人员重点关注的问题。

### 产品定义

Rec SDK 作为面向互联网市场搜索推荐广告场景的应用使能SDK产品，基于昇腾平台提供完整的推荐系统框架。联合 fbgemm-ascend（基于昇腾平台的高性能PyTorch NPU算子库）与 HierarchicalKV-ascend（基于昇腾平台的高性能key-value存储加速库），共同为搜索推荐广告模型训练提供从上层框架、高性能算子计算到大规模稀疏特征存储的全栈式解决方案，支撑超大规模推荐场景，助力高效完成昇腾平台上推荐模型的训练与部署。产品架构图参见图1。

图1 产品架构图

![推荐全栈架构图](./figures/rec_full_stack/全栈架构图.png)

### 产品价值

表1 产品价值说明

| 产品特性 | 产品价值                                           |
| -------- | -------------------------------------------------- |
| 易用     | 极简易用API，快速开发算法模型。                    |
| 精度     | 在标准模型验证精度误差小于万分之一。               |
| 性能     | 高效多级流水加速，高速集合通信加速，极致性能优化。 |

## 组件介绍

### 组件概览

推荐解决方案由以下三个核心组件构成（产品架构图参见图1）：

表2 推荐解决方案核心组件说明

| 组件                      | 定位         | 核心职责                                |
| :------------------------ | :----------- | :-------------------------------------- |
| Rec SDK               | 推荐框架     | 模型开发、TB级Embedding存储、全流程调度 |
| fbgemm-ascend         | 高性能算子库 | 嵌入表查询、融合算子、计算加速          |
| HierarchicalKV-ascend | KV存储加速库 | 大规模稀疏特征存储与低延迟访问          |

#### Rec SDK

[Rec SDK](https://gitcode.com/Ascend/RecSDK)作为面向互联网市场搜索推荐广告的应用使能SDK产品，对于搜索推荐广告模型训练的应用场景需求，提供基于昇腾平台的搜索推荐广告框架，支撑大规模搜索推荐广告场景，助力完成搜索推荐广告模型的高效训练。

Rec SDK的功能涉及：

- 模型训练基础功能。支持单机单卡训练、多机多卡分布式训练。

- 推荐场景特有功能。基于Rec SDK的稀疏表方案，Rec SDK提供必备功能，如特征保存和加载、特征准入、特征淘汰等。

- 大规模稀疏表特有功能。支持加速卡内存、主机内存、主机磁盘多级存储、支持多机存储、支持动态扩容。规模可超10TB。

Rec SDK由多个组件构成，包含`tf_rec_v1`、`tf_rec_v2`、`torch_rec_v1`、`torch_rec_v2`和`rec_ops`多个内部组件，参见表3：

表3 Rec SDK组件说明

| 组件名称     | 基础框架           | 适配状态 | 框架类型     | 功能描述                                                     |
| ------------ | ------------------ | -------- | ------------ | ------------------------------------------------------------ |
| tf_rec_v1    | TensorFlow         | 非全下沉 | 稀疏推荐框架 | 基于TensorFlow，适配NPU设备的非全下沉稀疏推荐框架，支持Atlas A2/A3/A5设备。 |
| tf_rec_v2    | TensorFlow         | 全下沉   | 稀疏推荐框架 | 基于TensorFlow，适配NPU设备的全下沉稀疏推荐框架，仅支持Atlas A5设备。 |
| torch_rec_v1 | PyTorch + TorchRec | 非全下沉 | 稀疏推荐框架 | 基于PyTorch、[TorchRec](https://github.com/meta-pytorch/torchrec/tree/release/v1.2.0)开源软件，适配NPU设备的非全下沉稀疏推荐框架，支持Atlas A2/A3/A5设备。 |
| torch_rec_v2 | PyTorch + TorchRec | 全下沉   | 稀疏推荐框架 | 基于PyTorch、[DynamicEmb](https://github.com/NVIDIA/recsys-examples/tree/v25.09)、[TorchRec](https://github.com/meta-pytorch/torchrec/tree/release/v1.2.0)开源软件，适配NPU设备的全下沉稀疏推荐框架，仅支持Atlas A5设备。 |
| rec_ops      | -                  | -        | 算子         | 基于Ascend C开发的推荐场景自定义算子集，支持Atlas A2/A3/A5设备。 |

关键术语说明：

- 非全下沉：稀疏表哈希映射、去重分桶相关操作在CPU上执行，其余计算任务在NPU上执行的混合模式

- 全下沉：指所有计算任务都下沉到NPU上执行，以获得更好的兼容性

#### fbgemm-ascend

[fbgemm-ascend](https://gitcode.com/Ascend/fbgemm-ascend)是 FBGEMM 算子在昇腾 NPU 平台上的算子实现，通过 `torch.ops.fbgemm.*` 提供高性能稀疏/稠密算子，帮助推荐、搜索等场景在 Ascend 设备上获得与 GPU 同步的训练体验。目标是承接社区 [FBGEMM](https://link.gitcode.com/?target=https%3A%2F%2Fgithub.com%2Fpytorch%2FFBGEMM&from=https%3A%2F%2Fgitcode.com%2FAscend%2Ffbgemm-ascend&lang=zh&theme=white) 的新能力，并针对 Ascend AI Core 进行深度调优。

核心功能：

- Ascend 定制算子：提供 AscendC 实现的核心推荐算子，并向上提供 Python 绑定。

- PyTorch 生态无缝集成：与 Torch、TorchRec 等组件协同，直接复用 `torch.ops.fbgemm.*` 接口。

- 多芯片自适应：自动探测 Atlas A2/A3/A5 训练系列产品芯片，区分编译目标。

#### HierarchicalKV-ascend

[HierarchicalKV-ascend](https://gitcode.com/Ascend/HierarchicalKV-ascend)（下称HKV）是 [HierarchicalKV](https://github.com/NVIDIA-Merlin/HierarchicalKV/commit/bbe2ee1858b6e54bccf9106e9f3c2d8c1c5d248c) 在昇腾 NPU 平台上的算子实现，是一个面向推荐系统的高性能key-value存储加速库。 在推荐系统中，HKV提供了大容量、高性能的动态Embedding表的增删改查能力。

核心功能：

- 支持分级存储

- 支持可定制的淘汰策略

- keys和values存储分离，keys仅存储于HBM

#### 组件协同

内部协同关系

- Rec SDK 内部组件：`tf_rec_v1`、`tf_rec_v2`、`torch_rec_v1`、`torch_rec_v2` 四个框架组件各自独立，分别适配 TensorFlow 和 PyTorch 生态，满足不同算法框架的诉求；`rec_ops` 作为公共算子集，为各框架组件提供基础算子能力。

- fbgemm-ascend 与 Rec SDK 的协同：`torch_rec_v1` 和 `torch_rec_v2` 基于 [TorchRec](https://github.com/meta-pytorch/torchrec/tree/release/v1.2.0) 开源框架，而 TorchRec 的 Embedding 算子实现复用 FBGEMM。因此，`fbgemm-ascend` 作为昇腾平台的算子实现，通过 `torch.ops.fbgemm.*` 接口为两个 PyTorch 框架组件提供高性能 Embedding 查询、融合算子等核心计算能力。

- HierarchicalKV-ascend 与 Rec SDK 的协同：`torch_rec_v2` 基于 [TorchRec](https://github.com/meta-pytorch/torchrec/tree/release/v1.2.0) 和 [DynamicEmb](https://github.com/NVIDIA/recsys-examples/tree/v25.09) 开源框架，而 `HierarchicalKV-ascend`作为 DynamicEmb 的底层 KV 存储引擎，为大规模稀疏特征提供高性能的增删改查能力，支持 HBM 内动态扩容与可定制淘汰策略。

协同关系示意

表4 组件协同关系说明

| 组件                    | 应用位置                       | 协同方式                                                     |
| ----------------------- | ------------------------------ | ------------------------------------------------------------ |
| `fbgemm-ascend`         | `torch_rec_v1`、`torch_rec_v2` | 作为底层算子库，通过 `torch.ops.fbgemm.*` 接口提供 Embedding 计算能力 |
| `HierarchicalKV-ascend` | `torch_rec_v2`                 | 作为 DynamicEmb 的底层 KV 存储层，提供大容量 Embedding 存储与访问能力 |

独立使用能力

除与 Rec SDK 集成外，`fbgemm-ascend` 和 `HierarchicalKV-ascend` 也支持独立使用：

- `fbgemm-ascend`：用户可在原生 PyTorch 环境中直接调用 `torch.ops.fbgemm.*` 算子，无缝复用现有 FBGEMM 生态代码。

- `HierarchicalKV-ascend`：可作为独立的 KV 存储加速库，集成到自定义的训练框架或推理服务中。

### 周边组件

除核心的 Rec SDK、fbgemm-ascend、HierarchicalKV-ascend 三大组件外，推荐解决方案还依托昇腾生态的周边组件，提供从算子开发、模型迁移到性能调优、精度分析的全流程能力。

#### 周边组件概览

表5 周边组件说明

| 类别         | 组件                                                                                                                              | 功能说明                                                                                                                                                   | 在推荐方案中的作用                                           |
| :----------- |:--------------------------------------------------------------------------------------------------------------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------| :----------------------------------------------------------- |
| 算子开发 | [Ascend C](https://www.hiascend.com/document-scene/zh/devScene/operatordev/index.html)                                          | 面向昇腾AI处理器的算子编程语言，支持C/C++标准规范，提供多层接口抽象与自动并行计算                                                                                                           | 支撑`rec_ops`及自定义算子的高效开发                          |
|              | [CATLASS](https://gitcode.com/cann/catlass)                   | 高性能矩阵乘类算子模板库，提供GEMM类算子的模板化实现与性能优化模块；此外，在 Inductor-Ascend 遇到矩阵乘相关算子时，CATLASS 可通过模版生成高性能内核并配合 autotuning 机制自动选择最优的 tile 配置                               | 加速推荐模型中大量存在的矩阵运算，为矩阵乘类算子提供标杆性能模板 |
|              | [Triton-Ascend](https://gitcode.com/Ascend/triton-ascend)                                                                       | 基于昇腾平台的Triton编译框架，支持将Python编写的算子编译为高效NPU内核；此外，Triton-Ascend 是昇腾平台中 PyTorch 后端编译链的关键后端，负责接收 Inductor-Ascend 生成的 Triton DSL 代码，并最终编译、优化生成可在昇腾硬件上高效执行的机器码 | 支持动态shape场景下的算子编译优化，拓展推荐模型的灵活性      |
| 算子融合 | [AutoFuse](https://www.hiascend.com/document/detail/zh/canncommercial/850/graph/autofuse/autofuse_1_0001.html)                  | 基于Ascend C的自动融合框架，自动识别融合范围并生成融合算子代码                                                                                                                    | 减少推荐网络中Vector计算间的内存搬运，缓解Memory Bound问题，提升执行性能 |
|              | [Inductor-Ascend](https://gitcode.com/Ascend/pytorch/blob/v2.7.1/torch_npu/_inductor/docs/overview/overview.md)                 | Inductor-Ascend在继承Pytorch社区Inductor能力的基础上，针对昇腾Ascend硬件，进行了亲和性改进和优化。其目标是：提供昇腾亲和的torch.compile图模式后端；生成昇腾亲和的Triton DSL，支持基于triton的算子自动融合；支持动态shape        | 与`torch_rec_v1/v2`协同，支持PyTorch模型的自动编译优化       |
| 框架适配 | [PyTorch-Adapter](https://www.hiascend.com/document/detail/zh/Pytorch/730/productoverview/docs/zh/overview/product_overview.md) | PyTorch框架的昇腾适配层，使PyTorch模型能运行在昇腾设备上                                                                                                                    | 支撑`torch_rec_v1/v2`在NPU上的运行                           |
|              | [TensorFlow-Adapter](https://www.hiascend.com/document/detail/zh/TensorFlowCommunity/850/index/index.html)                      | TensorFlow框架的昇腾适配层，使TensorFlow模型能运行在昇腾设备上                                                                                                              | 支撑`tf_rec_v1/v2`在NPU上的运行                              |
| 硬件使能 | [CANN](https://www.hiascend.com/cann)                                                                                           | 昇腾异构计算架构，提供模型推理与训练的基础能力                                                                                                                                | 所有上层组件的基础软件栈，提供芯片使能、算子库、图编译等核心能力 |

#### 周边组件能力支撑

依托上述周边组件，推荐解决方案对外提供以下关键能力：

- 算子开发：基于 [Ascend C](https://www.hiascend.com/document-scene/zh/devScene/operatordev/index.html)、[CATLASS](https://gitcode.com/cann/catlass)、[Triton-Ascend](https://gitcode.com/Ascend/triton-ascend)，支持从标准算子到高性能矩阵乘算子的灵活开发与定制

- 算子自动融合：通过 [AutoFuse](https://www.hiascend.com/document/detail/zh/canncommercial/850/graph/autofuse/autofuse_1_0001.html) 与 [Inductor-Ascend](https://www.hiascend.com/document/detail/zh/Pytorch/730/ptmoddevg/Frameworkfeatures/docs/zh/framework_feature_guide_pytorch/pytorch_compilation_mode.md)，自动识别融合机会并生成融合算子，减少内存搬运，释放昇腾算力

- 样例演示：提供完整的算子开发与模型迁移示例，帮助用户快速上手

- 模型迁移：借助 [PyTorch-Adapter](https://www.hiascend.com/document/detail/zh/Pytorch/730/productoverview/docs/zh/overview/product_overview.md)、[TensorFlow-Adapter](https://www.hiascend.com/document/detail/zh/TensorFlowCommunity/850/index/index.html)，将存量 TensorFlow/PyTorch 模型快速迁移至昇腾平台

- 模型开发：基于 [Rec SDK](https://gitcode.com/Ascend/RecSDK) 的高层 API，快速构建推荐模型训练任务

- 性能分析和调优：依托 CANN 提供的[性能分析工具](https://www.hiascend.com/document/detail/zh/CANNCommunityEdition/900beta2/devaids/Profiling/atlasprofiling_16_0144.html)（如 msProf），定位模型执行瓶颈和性能调优

- 精度分析：利用 CANN [精度调试工具](https://www.hiascend.com/document/detail/zh/CANNCommunityEdition/900beta2/devaids/ModelAccuracyAnalyzer/atlasaccuracy_16_1000.html)，验证模型迁移前后的精度一致性

#### 依赖关系说明

周边组件与核心组件（`Rec SDK`、`fbgemm-ascend` 和 `HierarchicalKV-ascend`）的关系如下：

- CANN 作为基础软件栈，为所有组件提供底层算力支持与运行时环境

- PyTorch-Adapter / TensorFlow-Adapter 分别支撑 `torch_rec_v1/v2` 与 `tf_rec_v1/v2` 在昇腾设备上的运行

- Inductor-Ascend 与 `torch_rec_v1/v2` 协同，实现 PyTorch 模型的自动编译与性能优化

- AutoFuse 在图编译阶段对推荐网络进行自动融合优化，用户无需感知融合细节

- Ascend C / CATLASS / Triton-Ascend 为 `rec_ops` 的自定义算子开发提供编程框架与模板库


--- docs/zh/release_notes_rec.md ---
# 版本配套说明<a name="ZH-CN_TOPIC_0000002524441743"></a>

## 产品版本信息<a name="ZH-CN_TOPIC_0000002492442016"></a>

<a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108__Ref249955742"></a>
<table><tbody><tr id="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_row244mcpsimp"><th class="firstcol" valign="top" width="25%" id="mcps1.1.3.1.1"><p id="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p246mcpsimp"><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p246mcpsimp"></a><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p246mcpsimp"></a>产品名称</p>
</th>
<td class="cellrowborder" valign="top" width="75%" headers="mcps1.1.3.1.1 "><p id="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p1684675795511"><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p1684675795511"></a><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p1684675795511"></a><span id="ph925512229126"><a name="ph925512229126"></a><a name="ph925512229126"></a>MindSDK</span></p>
</td>
</tr>
<tr id="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_row255mcpsimp"><th class="firstcol" valign="top" width="25%" id="mcps1.1.3.2.1"><p id="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p257mcpsimp"><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p257mcpsimp"></a><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p257mcpsimp"></a>产品版本</p>
</th>
<td class="cellrowborder" valign="top" width="75%" headers="mcps1.1.3.2.1 "><p id="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p233mcpsimp"><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p233mcpsimp"></a><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p233mcpsimp"></a>26.0.0</p>
</td>
</tr>
<tr id="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_row7259721105019"><th class="firstcol" valign="top" width="25%" id="mcps1.1.3.3.1"><p id="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p7260182135013"><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p7260182135013"></a><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p7260182135013"></a>版本类型</p>
</th>
<td class="cellrowborder" valign="top" width="75%" headers="mcps1.1.3.3.1 "><p id="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p72606219501"><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p72606219501"></a><a name="zh-cn_topic_0000001938532254_zh-cn_topic_0000001935094108_p72606219501"></a>Release版本</p>
</td>
</tr>
</tbody>
</table>

## 相关产品版本配套说明<a name="ZH-CN_TOPIC_0000002524561713"></a>

| 产品名称   | 版本     |
| ---------- | -------- |
| Ascend HDK | <ul><li>Atlas 350 ：1.0.RC1</li><li>其他产品：26.0.RC1</li></ul>|
| CANN       | 9.0.0    |

## 病毒扫描结果<a name="ZH-CN_TOPIC_0000002492442006"></a>

病毒扫描通过。

# 版本兼容性说明<a name="ZH-CN_TOPIC_0000002492442012"></a>

- Rec SDK Torch（torch_rec_v1）：在升级版本后，需要重新编译torchrec_npu和自定义算子相关包。

**表 1**  软件版本兼容性说明

| MindSDK软件版本 | MindSDK待升级版本                                                         | CANN版本兼容性                                                                                    | Ascend HDK版本兼容性                                                                                        |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Rec SDK 26.0.0  | <ul><li>MindSDK 7.3.0及7.3.0.x</li></ul> | <ul><li>CANN 8.3.RC1及补丁版本</li><li>CANN 8.5.0及补丁版本</li><li>CANN 9.0.0及补丁版本</li></ul> | <ul><li>Ascend HDK 25.5.0及补丁版本</li><li>Ascend HDK 25.1.RC1及补丁版本</li><li>Ascend HDK 26.0.RC1及补丁版本</li></ul> |

> [!NOTE] 说明 
>软件版本兼容性是指产品软件版本升级时，其他关联软件不需要联动升级或打补丁，仍然可以支持已有功能。

# 版本使用注意事项<a name="ZH-CN_TOPIC_0000002492282032"></a>

无

# 更新说明<a name="ZH-CN_TOPIC_0000002524441747"></a>

## 新增特性<a name="ZH-CN_TOPIC_0000002492282034"></a>

|特性名称|特性描述|配套产品型号|
|--|--|--|
|Rec SDK TensorFlow(tf_rec_v1)|<ul><li>适配Atlas 350 标卡。</li></ul>|Atlas 800T A2 训练服务器<br>Atlas 200T A2 Box16 异构子框<br>Atlas 800T A3 超节点服务器<br>Atlas 350 标卡|
|Rec SDK Torch(torch_rec_v1)|<ul><li>多级缓存保存加载：支持增量保存加载、差异卡加载。</li><li>多级缓存准入淘汰：支持showclick准入淘汰策略。</li><li>推荐模型支持在算力切分设备推理。</li><li>适配Atlas 350 标卡。</li></ul>|Atlas 800T A2 训练服务器<br>Atlas 200T A2 Box16 异构子框<br>Atlas 800T A3 超节点服务器<br>Atlas 350 标卡|
|Rec SDK TensorFlow(tf_rec_v2)|<ul><li>实现稀疏表基础功能：建表、查表、保存、加载、特征准入、特征淘汰。</li></ul>|Atlas 350 标卡|
|Rec SDK Torch(torch_rec_v2)|<ul><li>实现稀疏表基础功能：建表、查表、保存、加载、特征准入、特征淘汰。</li></ul>|Atlas 350 标卡|
|Rec SDK 算子|<ul><li>生成式推荐模型融合算子补齐，并适配Atlas 350 标卡：in_linear_silu、reverse_sequence。</li><li>生成式推荐模型融合算子补齐，暂不支持Atlas 350 标卡：norm_multiply_dropout、concat_2d_jagged。</li><li>HSTU算子增强：反向算子性能优化，前反向算子支持int32。</li><li>算子重构：查表反向算子、HSTU前反向算子重构。</li></ul>|Atlas 800T A2 训练服务器<br>Atlas 200T A2 Box16 异构子框<br>Atlas 800T A3 超节点服务器<br>Atlas 350 标卡|
|fbgemm-npu|<ul><li>适配Atlas 350 标卡。</li></ul>|Atlas 800T A2 训练服务器<br>Atlas 200T A2 Box16 异构子框<br>Atlas 800T A3 超节点服务器<br>Atlas 350 标卡|
|HKV|<ul><li>适配Atlas 350 标卡。</li></ul>|Atlas 350 标卡| 

## 业务接口变更<a name="ZH-CN_TOPIC_0000002492442008"></a>

**Rec SDK<a name="zh-cn_topic_0000001963197973_section3125124045019"></a>**

- Rec SDK TensorFlow(tf_rec_v1)：不涉及接口变更。
- Rec SDK Torch(torch_rec_v1)：不涉及接口变更。
- Rec SDK TensorFlow(tf_rec_v2)：不涉及接口变更。
- Rec SDK Torch(torch_rec_v2)：不涉及接口变更。

## 关键特性变更<a name="ZH-CN_TOPIC_0000002524441749"></a>

**Rec SDK<a name="zh-cn_topic_0000001935999544_section18133752165114"></a>**

- Rec SDK TensorFlow(tf_rec_v1)：不涉及关键特性变更。
- Rec SDK Torch(torch_rec_v1)：不涉及关键特性变更。
- Rec SDK TensorFlow (tf_rec_v2)：不涉及关键特性变更。
- Rec SDK Torch(torch_rec_v2)：不涉及关键特性变更。

## 已解决的问题<a name="ZH-CN_TOPIC_0000002492442002"></a>

无

## 遗留问题<a name="ZH-CN_TOPIC_0000002524561719"></a>

无

# 升级影响<a name="ZH-CN_TOPIC_0000002524561715"></a>

## 升级过程对现行系统的影响<a name="ZH-CN_TOPIC_0000002492282026"></a>

无

## 升级后对现行系统的影响<a name="ZH-CN_TOPIC_0000002524441745"></a>

无

# 26.0.0版本配套文档<a name="ZH-CN_TOPIC_0000002524561717"></a>

|文档名称|内容简介|更新说明|
|--|--|--|
|《[Rec SDK 26.0.0 用户指南](../../README.md)》|主要包括Rec SDK的简介、软件安装部署、功能特性、模型适配和相关的API接口参考。|变更详见《Rec SDK 26.0.0 用户指南》。|

# 漏洞修补列表<a name="ZH-CN_TOPIC_0000002492282030"></a>

无


--- docs/zh/tensorflow/build_mxRec_images/README.md ---
# 说明文档

本文档旨在指导用户根据已有镜像制作Rec SDK的训练镜像

## 文档结构

```shell
└── build_mxRec_images
    ├── centos_build    # 以AscendHub上CentOS开源镜像以及客户自己的镜像为基础镜像
    │   └── Dockerfile
    ├── mxrec-build     # 以AscendHub上Rec SDK开源镜像为基础镜像
    │   └── Dockerfile
    └── README.md       # 说明文档
```

## 前提

物理机上已经安装好对应CANN版本的驱动和固件

物理机上已经安装docker，并且docker网络可用

准备好基础镜像，如果用户没有准备好基础镜像，可以从[昇腾镜像仓库](https://www.hiascend.com/developer/ascendhub/)拉取基础镜像，建议拉取以下镜像作为基础镜像：

* 优先拉取Rec SDK训练镜像，因为AscendHub上的Rec SDK训练镜像中已经安装gcc、cmake等基础依赖，无需再次安装。
同时，镜像也安装了CANN以及Rec SDK包，但是版本较老。所以如果使用Rec SDK镜像作为基础镜像只需更新其中的CANN和Rec SDK包即可。
* 其次从AscendHub上拉取[CentOS7.6.1810](https://www.hiascend.com/developer/ascendhub/detail/9353d9619c2a44db87845bce546c17bd)这个镜像。
* 最后，如果不用以上两个镜像，用户自己准备一个镜像作为基础镜像，建议这个镜像是CentOS 7.6.1810为基础。

## 准备依赖

根据基础镜像的不同，需要下载的依赖也有所区别

1. 以AscendHub上的Rec SDK训练镜像作为基础镜像，只需要下载[昇腾社区](https://www.hiascend.com/developer/download/community/result?module=sdk+cann)上最新版本配套的CANN、tf-plugin和Rec SDK安装包。可以参考以下链接下载配套版本的CANN和Rec SDK：

    https://www.hiascend.com/zh/developer/download/community/result?module=sdk+cann
    
    https://www.hiascend.com/developer/download/community/result?module=tf+cann
    
    具体构建镜像步骤参考mxrec-build下的Dockerfile

2. 以CentOS7.6.1810以及用户镜像作为基础镜像，这种情况下需要较多的依赖，同时用户需要确认自己镜像中是否已经安装以下依赖。由于需要安装许多依赖，建议按照Dockerfile中的步骤**手动安装**其中的依赖，比如gcc、cmake等。

    * gcc-7.3.0
    
    下载链接：[https://mirrors.ustc.edu.cn/gnu/gcc/gcc-7.3.0/gcc-7.3.0.tar.gz](https://mirrors.ustc.edu.cn/gnu/gcc/gcc-7.3.0/gcc-7.3.0.tar.gz)
    
    * cmake-3.20.6
    
    下载链接：[https://cmake.org/files/v3.20/cmake-3.20.6.tar.gz](https://cmake.org/files/v3.20/cmake-3.20.6.tar.gz)
    
    * ucx
    
    下载链接：[https://github.com/openucx/ucx/archive/master.zip](https://github.com/openucx/ucx/archive/master.zip)
    
    * openmpi-4.1.5
    
    下载链接：[https://download.open-mpi.org/release/open-mpi/v4.1/openmpi-4.1.5.tar.gz](https://download.open-mpi.org/release/open-mpi/v4.1/openmpi-4.1.5.tar.gz)
    
    * python-3.7.5
    
    下载链接：[https://repo.huaweicloud.com/python/3.7.5/Python-3.7.5.tar.xz](https://repo.huaweicloud.com/python/3.7.5/Python-3.7.5.tar.xz)
    
    * hdf5-1.10.5
    
    下载链接：[https://support.hdfgroup.org/ftp/HDF5/releases/hdf5-1.10/hdf5-1.10.5/src/hdf5-1.10.5.tar.gz](https://support.hdfgroup.org/ftp/HDF5/releases/hdf5-1.10/hdf5-1.10.5/src/hdf5-1.10.5.tar.gz)
    
    * CANN与Rec SDK
    
    Rec SDK在[昇腾社区](https://www.hiascend.com/developer/download/community/result?module=sdk+cann)上发布的版本包与CANN都是配套的，所以用户需要从社区下载配套版本的Rec SDK、CANN与tf-plugin。
    用户可以通过以下链接选择下载版本配套的Rec SDK和CANN：
    
    https://www.hiascend.com/zh/developer/download/community/result?module=sdk+cann
    
    https://www.hiascend.com/developer/download/community/result?module=tf+cann
    
    * Tensorflow（1.15.0/2.6.5）
    
    当前Rec SDK是基于tensorflow开发的，所以需要在环境中安装tensorflow。其中x86环境下可以通过pip或pip3命令直接安装。
    但是在arm环境下，tensorflow没有对应的whl包，无法直接用pip或pip3命令安装。用户可以从以下链接下载arm架构的tensorflow。
    
    [https://ascend-repo.obs.cn-east-2.myhuaweicloud.com/MindX/OpenSource/python/index.html](https://ascend-repo.obs.cn-east-2.myhuaweicloud.com/MindX/OpenSource/python/index.html)
    
    * 安装CANN时需要的version.info、ascend_install.info
    
    在安装CANN包时需要两个文件，分别是version.info（驱动版本文件）、ascend_install.info（固件驱动安装参数），这两个文件可以参考物理机上对应的文件将其拷贝到同一个目录下。
    其中，version.info默认安装在/usr/local/Ascend/driver/version.info；ascend_install.info文件默认路径是/etc/ascend_install.info。
    
    具体构建镜像步骤参考centos-build下的Dockerfile
    
    **建议**：根据实际需要**下载上述依赖到同一个目录下**，这样方便处理。同时，在使用Dockerfile构建镜像之前可以仔细看一下对应的
    Dockerfile，因为需要用户根据实际情况修改一下Dockerfile，构建镜像的步骤在Dockerfile中有详细的说明。


--- docs/zh/tensorflow/tf_rec_v1/api/README.md ---
-   [接口说明](api_description.md)
-   [训练框架初始化与去初始化](initialization_and_deinitialization_of_the_training_framework.md)
-   [数据接口](data_apis.md)
-   [模型接口](model_apis.md)
-   [自动改图](automatic_graph_modification.md)
-   [其他接口](other_apis.md)
-   [优化器](optimizers_apis.md)
-   [类参考](class_reference.md)
-   [常量参考](constant_reference.md)
-   [TensorFlow相关接口](tensorflow_apis.md)


--- docs/zh/tensorflow/tf_rec_v1/api/api_description.md ---
# 接口说明<a name="ZH-CN_TOPIC_0000001749624593"></a>

Rec SDK TensorFlow通过Python接口进行应用开发，从代码调用角度上来说所有Python侧接口都可以被调用。本章节仅列出业务提供的对外接口，其余未进行说明的接口用户请勿直接调用。


--- docs/zh/tensorflow/tf_rec_v1/api/automatic_graph_modification.md ---
# 自动改图<a name="ZH-CN_TOPIC_0000001630246497"></a>

## get\_initializer<a name="ZH-CN_TOPIC_0000001630246481"></a>

**功能描述<a name="section634582619155"></a>**

获取tensorflow.data.Iterator的初始化算子（Operation），该算子需要通过使用sess.run\(\)来初始化Iterator。

**函数原型<a name="section1483104721911"></a>**

```bash
from mx_rec.util.initialize import ConfigInitializer
ConfigInitializer.get_instance().train_params_config.get_initializer(is_training)
```

**参数说明<a name="section888634319218"></a>**

|参数名|类型|可选/必选|说明|
|--|--|--|--|
|is_training|bool|必选|是否为训练模式。<li>True：训练（train）模式。</li><li>False：评估（eval）模式。</li>|

**返回值说明<a name="section651195312311"></a>**

- 成功：返回初始化Iterator的TensorFlow算子（tf.Operation）。
- 失败：抛出异常。

**使用示例<a name="section193151694205"></a>**

```python
import tensorflow as tf
from mx_rec.util.initialize import ConfigInitializer
from mx_rec.graph.modifier import modify_graph_and_start_emb_cache
# train，需要开启自动改图
# train模式下，自动改图需要在计算梯度之后
# 计算梯度（省略计算梯度的实现细节）
modify_graph_and_start_emb_cache(dump_graph=True)
with tf.compat.v1.Session() as sess:
    # 请确保已调用过modify_graph_and_start_emb_cache()接口
    initializer = ConfigInitializer.get_instance().train_params_config.get_initializer(True)
    sess.run(initializer)
```

**参考资源<a name="section426664933312"></a>**

接口调用流程及示例，参见[自动改图](../appendix.md#自动改图)。

## LookupSubgraphSlicerHook<a name="ZH-CN_TOPIC_0000001911330801"></a>

**功能描述<a name="section634364213155"></a>**

该Hook用于在查表KeyTensor的子图中查找指定类型算子，然后将查找到的指定类型算子及其最小依赖子图切换到CPU预取阶段执行。如果没有找到目标类型的算子，不会执行切分操作。

>[!NOTE]
>该Hook的使用场景是NPUEstimator模式，启用自动改图功能。该Hook的调用时机需要在自动改图的GraphModifierHook之前。

**参数说明<a name="section888634296311"></a>**

|参数名|类型|必选/可选|参数说明|
|--|--|--|--|
|op_types|list[str]|必选|指定需要切分的算子类型，目前仅支持列表格式。|

**使用示例<a name="section11333109979"></a>**

```bash
from mx_rec.graph import LookupSubgraphSlicerHook, GraphModifierHook


def input_fn():
    """
    用户自定义Estimator输入函数。
    """

lookup_slicer_hook = LookupSubgraphSlicerHook(op_types=["StringToNumber"] )
modifier_hook = GraphModifierHook(modify_graph=params.modify_graph)
hooks_list = [lookup_slicer_hook, modifier_hook]

est = NPUEstimator(...)
est.train(input_fn=lambda: input_fn, hooks=npu_hooks_append(hooks_list))
```

## OrphanLookupKeySlicerHook<a name="ZH-CN_TOPIC_0000001865451328"></a>

**功能描述<a name="section276399619155"></a>**

该Hook用于支持稀疏表查询时传入向上无法找到Dataset的孤儿Key类型，主要用于拓展自动改图模式下的稀疏表查询功能。如果没有找到目标类型的算子，不会执行切分操作。

>[!NOTE]
>该Hook的使用场景是NPUEstimator模式，启用自动改图功能。该Hook的调用时机需要在自动改图的GraphModifierHook之前。

**使用示例<a name="section473316525914"></a>**

```bash
from mx_rec.graph import OrphanLookupKeySlicerHook, GraphModifierHook

def input_fn():
    """
    用户自定义Estimator输入函数。
    """

orphan_slicer_hook = OrphanLookupKeySlicerHook()
modifier_hook = GraphModifierHook(modify_graph=params.modify_graph)
hooks_list = [orphan_slicer_hook, modifier_hook]

est = NPUEstimator(...)
est.train(input_fn=lambda: input_fn, hooks=npu_hooks_append(hooks_list))
```

## do\_merge\_lookup<a name="ZH-CN_TOPIC_0000001935068449"></a>

**功能描述<a name="section634582619155"></a>**

该接口用于自动改图模式下，对多次查询的表进行lookup合并操作。

在模型中，此函数在Optimizer.compute\_gradients\(\)中利用patch执行，确保train时拥有正确的梯度和计算图；eval时在改图阶段执行。

**函数原型<a name="section1483104721911"></a>**

```bash
from mx_rec.graph.merge_lookup import do_merge_lookup
```

**参数说明<a name="section888634319218"></a>**

|参数名|类型|可选/必选|说明|
|--|--|--|--|
|is_train|bool|必选|当前是否为训练模式。<li>True：训练（train）模式。</li><li>False：评估（eval）模式。</li>|

**使用示例<a name="section193151694205"></a>**

例如，train模式，全部的梯度计算都使用tf.gradients，则需要主动调用do\_merge\_lookup。

```bash
from mx_rec.graph.merge_lookup import do_merge_lookup
do_merge_lookup(is_train=True)
sparse_grads = tf.gradients(loss, sparse_variables)
grads_and_vars = [(grad, variable) for grad, variable in zip(sparse_grads, sparse_variables)]
optimizer.apply_gradients(grads_and_vars)
```


--- docs/zh/tensorflow/tf_rec_v1/api/class_reference.md ---
# 类参考<a name="ZH-CN_TOPIC_0000001580007112"></a>

## FeatureSpec<a name="ZH-CN_TOPIC_0000001580007124"></a>

待查询特征的配置描述类，适用于非自动改图模式。

|参数名|类型|**必选/可选**|说明|
|--|--|--|--|
|index_key|int/string|可选|索引键。默认值：table_name的值。<br>取值范围：<li>int：取值范围为[0,255]。</li><li>string：长度范围为[1,255]</li>|
|table_name|string|可选|表名。<br>表名长度范围：[1, 255]。|
|access_threshold|int|可选|特征准入阈值。<br>取值范围：[-1, 2147483647]。<li>等于0：开启准入功能。不累加新batch中key出现的次数，使用历史特征计数记录。</li><li>大于0：开启准入功能。累加新batch中key出现的次数，更新特征计数记录。</li><li>等于-1：关闭功能。</li>|
|eviction_threshold|int|可选|特征淘汰阈值。<br>取值范围：[-1, 2147483647]。<li>等于或大于0：开启淘汰功能。</li><li>等于-1：关闭淘汰功能。</li>如果需要设置特征淘汰阈值，需要同时设置特征准入阈值。|
|is_timestamp|bool|可选|是否为时间戳。<br>取值范围：True、False。|
|batch_size|int|可选|数据集batch的大小。<br>取值范围：[1, 2147483647]。|
|faae_coefficient|int|可选|特征准入系数。默认值：1。<br>取值范围：[1, 2147483647]。|
|name|string|必选|FeatureSpec名称。长度范围：[1,255]。|

**使用示例<a name="section6456105313583"></a>**

```bash
from mx_rec.core.asc.feature_spec import FeatureSpec
feature_spec_list = FeatureSpec("user_ids", table_name="user_table",
                                access_threshold=1,
                                eviction_threshold=1,
                                faae_coefficient=1)

```

## GraphModifierHook<a name="ZH-CN_TOPIC_0000001630127057"></a>

自动改图Hook类，仅在[使用Estimator训练](../migration_and_training.md#使用estimator训练)模式下使用，添加后即可开启自动改图功能。

|参数名|类型|**必选/可选**|说明|
|--|--|--|--|
|dump_graph|bool|可选|是否保存TensorFlow当前计算图，默认为False。|
|modify_graph|bool|可选|是否开启自动改图功能，默认为True。|

**使用示例<a name="section14589163715471"></a>**

```bash
from mx_rec.graph.modifier import GraphModifierHook

#定义数据处理函数
def input_fn():
     pass

est.train(input_fn=lambda: input_fn(), hooks=[GraphModifierHook()])   #est为创建的NPUEstimator对象
```

## EvictHook<a name="ZH-CN_TOPIC_0000001580007108"></a>

特征淘汰Hook类，仅在特征准入与淘汰模式下使用，配合特征淘汰的阈值“eviction\_threshold”设置，添加后即可开启特征淘汰功能。

>[!NOTE]
>特征淘汰Hook类仅支持在训练场景下使用。

|参数名|类型|**必选/可选**|说明|
|--|--|--|--|
|evict_enable|bool|可选|是否开启特征淘汰功能，默认为False。|
|evict_time_interval|int|可选|淘汰功能触发时间间隔，单位：秒，默认为24 \* 60 \* 60。取值范围：[1, MAXINT32]。|
|evict_step_interval|int|可选|淘汰功能触发步数间隔，单位：步，默认为None。取值范围：[1, MAXINT32]。|

**使用示例<a name="section14589163715471"></a>**

```bash
from mx_rec.core.feature_process import EvictHook
hooks_list = []
hook_evict = EvictHook(evict_enable=True, evict_time_interval=30, evict_step_interval=20)
hooks_list.append(hook_evict)

#定义数据处理函数
def input_fn():
     pass

est.train(input_fn=lambda: input_fn(), hooks=hooks_list)    #est为创建的NPUEstimator对象
```

## ConfigInitializer<a name="ZH-CN_TOPIC_0000002095874621"></a>

保存全局配置信息的管理类，为单例模式。

该类通过init\(\)函数自动初始化，不需要手动进行构建。同时，本章节只列举该类中对外公开的接口，剩余未在此处公示的为内部接口，不推荐直接调用。

**调用示例<a name="section73615361858"></a>**

|接口|作用|原型|
|--|--|--|
|get_instance()|获取ConfigInitializer的全局唯一实例。|from mx_rec.util.initialize import ConfigInitializerConfigInitializer.get_instance()|
|use_dynamic_expansion()|请参见[use_dynamic_expansion](other_apis.md#use_dynamic_expansion)。|
|get_target_batch()|请参见[get_target_batch](other_apis.md#get_target_batch)。|
|if_load()|请参见[if_load](model_apis.md#if_load)。|
|get_initializer(is_training)|请参见[get_initializer](automatic_graph_modification.md#get_initializer)。|
|ascend_global_hashtable_collection()|请参见[ascend_global_hashtable_collection](other_apis.md#ascend_global_hashtable_collection)。|

## TrainParamsConfig<a name="ZH-CN_TOPIC_0000002470669008"></a>

保存训练任务参数配置的数据类，例如哈希表集合的名字。

该类通过init\(\)函数自动初始化，不需要手动进行构建。同时，本章节只列举该类中对外公开的接口，剩余未在此处公示的为内部接口，不推荐直接调用。

**调用示例<a name="section73615361858"></a>**

|接口|作用|
|--|--|
|ascend_global_hashtable_collection()|请参见[ascend_global_hashtable_collection](other_apis.md#ascend_global_hashtable_collection)。|


--- docs/zh/tensorflow/tf_rec_v1/api/constant_reference.md ---
# 常量参考<a name="ZH-CN_TOPIC_0000001627638374"></a>

## ASCEND\_TIMESTAMP<a name="ZH-CN_TOPIC_0000001627158698"></a>

**功能描述<a name="section123217321652"></a>**

集合名常量，在TensorFlow构建图时作为key调用，用于设定数据集是否启用时间戳。

**使用示例<a name="section7851532751"></a>**

```bash
from mx_rec.constants.constants import ASCEND_TIMESTAMP
tf.compat.v1.add_to_collection(ASCEND_TIMESTAMP, batch["timestamp"])   #batch为数据集的迭代器对象
```


Operational evidence:
Build evidence:
--- build/build_tf1.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: ##################################################################
18: #   build_tf1.sh 编译Rec SDK
19: # 编译环境：Python3.7.5 GCC 7.3.0 CMake 3.20.6
20: # 代码主要分为两部分：
21: # 1、准备编译Rec SDK所需依赖：pybind11(v2.10.3) securec
22: # 2、编译securec、AccCTR以及Rec SDK
23: ##################################################################
24: 
25: set -e
26: warn() { echo >&2 -e "\033[1;31m[WARN ][Depend  ] $1\033[1;37m" ; }
27: ARCH="$(uname -m)"
28: SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
29: MxRec_DIR=$(dirname "${SCRIPT_DIR}")
30: 
31: export CC=$(which gcc)
32: 
33: opensource_path="${MxRec_DIR}"/../opensource
34: if [ ! -d ${opensource_path} ]; then
35:   echo "user should download dependency packages to mxRec/../opensource directory, see README.md"
36:   exit -1
37: fi
38: 
39: function prepare_pybind(){
40:   cd "${opensource_path}"

--- build/build_tf2.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: ##################################################################
18: #   build_tf2.sh 编译Rec SDK
19: # 编译环境：Python3.7.5 GCC 7.3.0 CMake 3.20.6
20: # 代码主要分为两部分：
21: # 1、准备编译Rec SDK所需依赖：pybind11(v2.10.3) securec
22: # 2、编译securec、AccCTR以及Rec SDK
23: ##################################################################
24: 
25: set -e
26: warn() { echo >&2 -e "\033[1;31m[WARN ][Depend  ] $1\033[1;37m" ; }
27: ARCH="$(uname -m)"
28: SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
29: MxRec_DIR=$(dirname "${SCRIPT_DIR}")
30: 
31: export CC=$(which gcc)
32: 
33: opensource_path="${MxRec_DIR}"/../opensource
34: if [ ! -d ${opensource_path} ]; then
35:   echo "user should download dependency packages to mxRec/../opensource directory, see README.md"
36:   exit -1
37: fi
38: 
39: function prepare_pybind(){
40:   cd "${opensource_path}"

--- build/gen_mxrec_tar_pkg.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: set -e
18: warn() { echo >&2 -e "\033[1;31m[WARN ][Depend  ] $1\033[1;37m" ; }
19: ARCH="$(uname -m)"
20: SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
21: MxRec_DIR=$(dirname "${SCRIPT_DIR}")
22: 
23: pkg_dir=mindxsdk-mxrec
24: release_tar=Ascend-"${pkg_dir}"_linux-"${ARCH}".tar.gz
25: 
26: function gen_tar_file()
27: {
28:   cd "${MxRec_DIR}"
29: 
30:   if [ ! -d "./output" ]; then
31:     mkdir -p "output"
32:   fi
33: 
34:   # change dirs and files 's permission
35:   chmod 550 ./build/"${pkg_dir}"/tf1_whl
36:   chmod 550 ./build/"${pkg_dir}"/tf1_whl/mx_rec*.whl
37:   chmod 550 ./build/"${pkg_dir}"/tf2_whl
38:   chmod 550 ./build/"${pkg_dir}"/tf2_whl/mx_rec*.whl
39:   cd ./build
40:   tar -zvcf "${release_tar}" "${pkg_dir}" || {

--- build/move_whl_file_2_pkg_dir.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: set -e
18: warn() { echo >&2 -e "\033[1;31m[WARN ][Depend  ] $1\033[1;37m" ; }
19: ARCH="$(uname -m)"
20: SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
21: MxRec_DIR=$(dirname "${SCRIPT_DIR}")
22: Tf_Rec_V1_DIR=${MxRec_DIR}/training/tf_rec_v1/
23: pkg_dir=mindxsdk-mxrec
24: tf_version=$1
25: 
26: function move_whl_file_2_pkg_dir() {
27:     mkdir -p "$SCRIPT_DIR"/"${pkg_dir}"/"${tf_version}"_whl
28:     rm -rf "$SCRIPT_DIR"/"${pkg_dir}"/"${tf_version}"_whl/*
29:     mv ${Tf_Rec_V1_DIR}/dist/*.whl "$SCRIPT_DIR"/"${pkg_dir}"/"${tf_version}"_whl
30:     cd "$SCRIPT_DIR"/"${pkg_dir}"/"${tf_version}"_whl
31:     for whl in *.whl; do
32:       new_name="${whl/any/linux_${ARCH}}"
33:       echo "Renaming $whl to $new_name"
34:       mv "$whl" "$new_name"
35:     done
36:     cd -
37: }
38: 
39: move_whl_file_2_pkg_dir

--- build/presmoke/hstu/run.sh ---
1: OP_DIR=$PROJECT_DIR/cust_op/ascendc_op/ai_core_op/hstu_dense_forward/v220/
2: 
3: echo "----------------        build ops        ----------------"
4: rm -fr $VENDORS/hstu_dense_forward
5: cd $OP_DIR && sed -i '/ascend950/d' op_host/* && bash run.sh
6: 
7: echo "----------------        run pytest        ----------------"
8: cd $PRESMOKE_DIR/hstu && python3 -m pytest -x test_hstu_fwd.py
9: 

--- build/run_presmoke_tf.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2026. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: ##################################################################
18: #   run_presmoke_tf.sh TF框架预冒烟验证
19: ##################################################################
20: 
21: set -e
22: #################### 工具函数 ####################
23: log()  { echo "$(date '+%F %T') [INFO] $*" ; }
24: warn() { echo >&2 -e "\033[1;31m[$(date '+%F %T')][WARN] $*\033[0m" ; }
25: die()  { echo >&2 -e "\033[1;31m[$(date '+%F %T')][FAIL] $*\033[0m"; exit 1; }
26: 
27: #################### 入参校验 ####################
28: [[ $# -eq 1 ]] || die "Usage: $0 <workspace_dir>"
29: WORKSPACE=$(realpath "$1")
30: [[ -d $WORKSPACE ]] || die "Workspace $WORKSPACE not exists or not a directory"
31: 
32: #################### 全局变量 ####################
33: CODE_DIR=${WORKSPACE}/RecSDK  # develop分支源码存放路径
34: MODEL_DIR=${WORKSPACE}/RecSDK_examples  # develop_examples_and_tools分支源码存放路径
35: ARCH=$(uname -m)
36: PKG_NAME=Ascend-mindxsdk-mxrec*${ARCH}.tar.gz
37: PKG_PATH=${WORKSPACE}/${PKG_NAME}
38: TF_WHL=mindxsdk-mxrec/tf1_whl/mx_rec-*.whl
39: DEMO_DIR="little_demo"
40: INSTALL_BASE="${WORKSPACE}/workspace_tf"

--- build/run_presmoke.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2026. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: ##################################################################
18: #   run_presmoke.sh 预冒烟验证
19: ##################################################################
20: 
21: set -e
22: echo "================        run presmoke test!!!!        ================"
23: export PROJECT_DIR=$(pwd)/../
24: 
25: export VENDORS=/usr/local/Ascend/ascend-toolkit/latest/opp/vendors/
26: 
27: export PRESMOKE_DIR=$PROJECT_DIR/build/presmoke/
28: 
29: export PTA_DIR=$PROJECT_DIR/cust_op/framework/torch_plugin/torch_library/common/
30: 
31: source /usr/local/Ascend/driver/bin/setenv.bash
32: source /usr/local/Ascend/ascend-toolkit/set_env.sh
33: 
34: export LD_LIBRARY_PATH=/usr/local/python3.11.0/lib/:${LD_LIBRARY_PATH}
35: export PATH=/usr/local/python3.11.0/bin:${PATH}
36: 
37: unset ASCEND_CUSTOM_OPP_PATH
38: 
39: echo "----------------        install torch_npu        ----------------"
40: cd $PRESMOKE_DIR

--- build.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: set -e
18: ROOT_DIR=$(dirname "$(readlink -f "$0")")
19: 
20: remove()
21: {
22:   if [ -d "$1" ]; then
23:     rm -rf "$1"
24:   elif [ -f "$1" ]; then
25:     rm -f "$1"
26:   fi
27: }
28: 
29: clean()
30: {
31:   remove "${ROOT_DIR}"/training/common/dist
32:   remove "${ROOT_DIR}"/training/tf_rec_v1/dist
33:   remove "${ROOT_DIR}"/install
34:   remove "${ROOT_DIR}"/training/common/mx_rec.egg-info
35:   remove "${ROOT_DIR}"/training/tf_rec_v1/mx_rec.egg-info
36:   remove "${ROOT_DIR}"/training/common/build
37:   remove "${ROOT_DIR}"/training/tf_rec_v1/build
38:   remove "${ROOT_DIR}"/build/bdist.linux-"$(arch)"
39:   remove "${ROOT_DIR}"/build/tf1_env
40:   remove "${ROOT_DIR}"/build/tf2_env

--- cust_op/ascendc_op/ai_core_op/custom_op_template/build.sh ---
1: # ----------------------------------------------------------------------------------------------------------
2: # Copyright (c) 2026 Huawei Technologies Co., Ltd.
3: # This program is free software, you can redistribute it and/or modify it under the terms and conditions of
4: # CANN Open Software License Agreement Version 2.0 (the "License").
5: # Please refer to the License for details. You may not use this file except in compliance with the License.
6: # THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
7: # INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
8: # See LICENSE in the root of the software repository for the full text of the License.
9: # ----------------------------------------------------------------------------------------------------------
10: 
11: #!/bin/bash
12: if [ -z "$BASE_LIBS_PATH" ]; then
13:     if [ -z "$ASCEND_HOME_PATH" ]; then
14:         if [ -z "$ASCEND_AICPU_PATH" ]; then
15:             echo "please set env."
16:             exit 1
17:         else
18:             export ASCEND_HOME_PATH=$ASCEND_AICPU_PATH
19:         fi
20:     else
21:         export ASCEND_HOME_PATH=$ASCEND_HOME_PATH
22:     fi
23: else
24:     export ASCEND_HOME_PATH=$BASE_LIBS_PATH
25: fi
26: echo "using ASCEND_HOME_PATH: $ASCEND_HOME_PATH"
27: script_path=$(realpath $(dirname $0))
28: 
29: BUILD_DIR="build_out"
30: HOST_NATIVE_DIR="host_native_tiling"
31: mkdir -p build_out
32: rm -rf build_out/*
33: 
34: ENABLE_CROSS="-DENABLE_CROSS_COMPILE=True"
35: ENABLE_BINARY="-DENABLE_BINARY_PACKAGE=True"
36: ENABLE_LIBRARY="-DASCEND_PACK_SHARED_LIBRARY=True"
37: cmake_version=$(cmake --version | grep "cmake version" | awk '{print $3}')
38: 
39: target=package
40: if [ "$1"x != ""x ]; then target=$1; fi

--- cust_op/ascendc_op/build/build_ai_core_op.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2025. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: set -e
18: 
19: if [ "$#" -ne 1 ]; then
20:     echo "ERROR: Please specify the version to compile. e.g. 'bash $0 A2'"
21:     exit 1
22: fi
23: 
24: BUILD_VER=${1}
25: 
26: if [[ "${BUILD_VER}" =~ ^(A2|A3|A5|310P|A2-TF)$ ]]; then
27:     echo "BUILD_VER: ${BUILD_VER}"
28: else
29:     echo "ERROR: Unknown BUILD_VER:${BUILD_VER}"
30:     exit 1
31: fi
32: 
33: ARCH="$(uname -m)"
34: CUR_DIR=$(dirname "$(readlink -f "$0")")
35: ASCENDC_OP_DIR=$(dirname "${CUR_DIR}")
36: torch_plugin_path="${ASCENDC_OP_DIR}"/../framework/torch_plugin
37: ops_path="${ASCENDC_OP_DIR}"/ai_core_op
38: base_op_dir="v220"
39: 
40: source /etc/profile

--- cust_op/ascendc_op/build/scripts/onnx_plugin/build_onnx.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2025. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: set -e
17: SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
18: JSON_FILE=$SCRIPT_DIR/json.hpp
19: 
20: function get_nlohmann()
21: {
22:     cd "$SCRIPT_DIR"
23:     if [ ! -e "v3.9.1.tar.gz" ]; then
24:         echo "The required component 'v3.9.1.tar.gz' for the ONNX plugin does not exist."
25:     else
26:         tar -xvf v3.9.1.tar.gz
27:         cp json-3.9.1/single_include/nlohmann/json.hpp .
28:     fi
29: }
30: 
31: if [ ! -e "$JSON_FILE" ]; then
32:     get_nlohmann
33: fi

--- cust_op/ascendc_op/scripts/op_builder_utils.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2026. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: # 防止被直接执行
18: if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
19:     echo "Error: This file is a library. Please source it."
20:     exit 1
21: fi
22: 
23: # ==============================================================================
24: # 路径初始化逻辑
25: # 基于本脚本位置确定 __PROJECT_ROOT 和 CONFIG_DIR
26: # ==============================================================================
27: 
28: # 获取本脚本的绝对路径
29: readonly __UTILS_SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
30: # 获取本脚本所在目录 (project_root/scripts)
31: readonly __UTILS_DIR="$(dirname "${__UTILS_SCRIPT_PATH}")"
32: # 推导项目根目录 (project_root) - 假设 scripts 在根目录下
33: readonly __PROJECT_ROOT="$(dirname "${__UTILS_DIR}")"
34: # 推导 config 目录
35: readonly CONFIG_DIR="${__PROJECT_ROOT}/config"
36: # ONNIX 适配层路径
37: readonly ONNX_PATH="${__PROJECT_ROOT}/build/scripts/onnx_plugin"
38: readonly JSON_FILE="${ONNX_PATH}/json.hpp"
39: 
40: # ==============================================================================

--- cust_op/framework/tf_plugin/build.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: set -e
18: 
19: python_path="$(dirname "$(dirname "$(realpath "$(which python3.7)")")")"
20: 
21: # HDF5_PATH is optional
22: if [ -d /usr/local/Ascend/ascend-toolkit/latest ]; then
23:     ascend_path=/usr/local/Ascend/ascend-toolkit/latest
24: elif [ -d /usr/local/Ascend/latest ]; then
25:     ascend_path=/usr/local/Ascend/latest
26: else
27:     echo "ERROR: can not find toolkit and tfplugin"
28:     exit 1
29: fi
30: 
31: [ -d build ] && rm -rf build;
32: mkdir build && cd build || exit 1
33: 
34: cmake -DCMAKE_BUILD_TYPE=Release \
35:     -DTF_PATH="$1" \
36:     -DOMPI_PATH="$(whereis openmpi)" \
37:     -DPYTHON_PATH="$python_path" \
38:     -DASCEND_PATH="$ascend_path" \
39:     -DSECUREC_PATH="$2"/../opensource/securec \
40:     -DCMAKE_INSTALL_PREFIX="$2"/cust_op_output \

--- cust_op/framework/torch_plugin/torch_library/asynchronous_complete_cumsum/build_ops.sh ---
1: #!/bin/bash
2: 
3: set -e
4: rm -rf build
5: mkdir -p build
6: cmake -B build
7: cmake --build build -j
8: chmod 550 ./build/*.so
9: 

--- cust_op/framework/torch_plugin/torch_library/block_bucketize_sparse_features/build_ops.sh ---
1: #!/bin/bash
2: 
3: set -e
4: rm -rf build
5: mkdir -p build
6: cmake -B build
7: cmake --build build -j
8: chmod 550 ./build/*.so
9: 

--- cust_op/framework/torch_plugin/torch_library/common/build_ops.sh ---
1: #!/bin/bash
2: 
3: set -e
4: rm -rf build
5: mkdir -p build
6: 
7: # 默认A2
8: if [ "$#" -eq 0 ]; then
9:     BUILD_VER="v220"
10:     echo "No version specified, using default: ${BUILD_VER}"
11: elif [ "$#" -eq 1 ]; then
12:     BUILD_VER=${1}
13: else
14:     echo "ERROR: Too many arguments. Usage: 'bash $0 [v220|c310]'"
15:     echo "If no argument is provided, default is c310"
16:     exit 1
17: fi
18: 
19: # 验证版本参数
20: if [ "${BUILD_VER}" == "v220" ] || [ "${BUILD_VER}" == "c310" ]; then
21:     echo "BUILD_VER: ${BUILD_VER}"
22: else
23:     echo "ERROR: Unknown BUILD_VER:${BUILD_VER}"
24:     echo "Supported versions: v220, c310"
25:     exit 1
26: fi
27: 
28: cmake -B build -DBUILD_VER="${BUILD_VER}"
29: 
30: cmake --build build -j
31: chmod 550 ./build/*.so
32: # 默认放在python3,site-package目录下
33: PACKAGE_PATH=$(python3 -c "import sysconfig; print(sysconfig.get_path('purelib'))")
34: if [ -d "$PACKAGE_PATH" ]; then
35:   echo "build to: $PACKAGE_PATH"
36:   cp -a ./build/*.so ${PACKAGE_PATH}/
37: else
38:   echo "build to: ${PWD}/build"
39: fi
40: 

Config/deploy evidence:
--- .pre-commit-config.yaml ---
1: minimum_pre_commit_version: 4.0.0
2: exclude: ^LICENSES/|\.(html|csv|svg)$
3: 
4: default_stages: [pre-commit]
5: ci:
6:   autofix_prs: false
7:   autoupdate_schedule: monthly
8: 
9: repos:
10:   # pre-commit 基础检查
11:   - repo: https://gitcode.com/pre-commit/pre-commit-hooks
12:     rev: v4.6.0
13:     hooks:
14:       - id: trailing-whitespace
15:       - id: end-of-file-fixer
16:       - id: check-yaml
17:         args: ["--allow-multiple-documents"]
18:       - id: check-added-large-files
19:       - id: check-merge-conflict
20:       - id: detect-private-key
21:       - id: check-json
22: 
23:   # -------------------------- Python 核心检查 --------------------------
24:   # Ruff：指定读取 pre-commit/pyproject.toml
25:   - repo: https://gitcode.com/gh_mirrors/ru/ruff-pre-commit
26:     rev: v0.14.14
27:     hooks:
28:       - id: ruff-check
29:         args: ["--config", "pre-commit/pyproject.toml", "--output-format", "github", "--fix"]
30:         types: [python]
31:       - id: ruff-format
32:         args: ["--config", "pre-commit/pyproject.toml"]
33:         types: [python]
34: 
35:   # codespell
36:   - repo: https://gitcode.com/gh_mirrors/co/codespell
37:     rev: v2.4.1
38:     hooks:
39:       - id: codespell
40:         args: [

--- config.ini ---
1: 

--- pre-commit/pyproject.toml ---
1: [tool.ruff]
2: line-length = 120
3: target-version = "py310"
4: format.quote-style = "preserve"
5: 
6: [tool.ruff.lint]
7: # 追加 D209，不会覆盖、不会屏蔽任何现有规则
8: extend-select = [
9:     "D209",  # 规则8：多行文档字符串末尾 """ 必须单独一行
10:     "SIM115",    # 规则17：推荐用 with 代替 try-finally
11: ]
12: 
13: # 业界标准 PYLINT 生产配置
14: # 只开高价值规则，关闭所有洁癖规则
15: # ================================
16: [tool.pylint]
17: reports = false
18: score = false
19: max-line-length = 120
20: max-args = 15       # 放宽，不检查
21: max-branches = 50   # 放宽，不检查
22: max-statements = 200# 放宽，不检查
23: max-locals = 50     # 放宽，不检查
24: max-positional-arguments = 20  # 放宽，不检查
25: 
26: # ================================
27: # 只开启：真正会导致程序崩溃的错误（BUG 级别）
28: # ================================
29: enable = [
30:     # 语法/运行时错误（必开）
31:     "E0100",  # 语法错误
32:     "E0601",  # 使用未定义变量
33:     "E0602",  # 变量未定义
34:     "E0603",  # 使用未定义属性
35:     "E0611",  # 导入不存在的包
36:     "E0632",  # 缺少返回值
37:     "E1101",  # 访问不存在成员
38:     "E1120",  # 不可调用对象被调用
39:     "E0632",  # 缺少返回值
40: 

--- pre-commit/typos.toml ---
1: [files]
2: # these files may be written in non english words
3: extend-exclude = []
4: ignore-hidden = true
5: ignore-files = true
6: ignore-dot = true
7: ignore-vcs = true
8: ignore-global = true
9: ignore-parent = true
10: 
11: [default]
12: binary = false
13: check-filename = false
14: check-file = true
15: unicode = true
16: ignore-hex = true
17: identifier-leading-digits = false
18: locale = "en"
19: extend-ignore-identifiers-re = [".*Unc.*", ".*_thw",
20:     ".*UE8M0.*", ".*[UE4M3|ue4m3].*", ".*eles.*", ".*fo.*", ".*ba.*",
21:     ".*ot.*", ".*[Tt]h[rR].*"]
22: extend-ignore-words-re = ["CANN", "cann","ND","alog"]
23: extend-ignore-re = []
24: 
25: [default.extend-identifiers]
26: nd_to_nz_2d = "nd_to_nz_2d"
27: bbc5b7ede = "bbc5b7ede"
28: womens_doubles = "womens_doubles"
29: v_2nd = "v_2nd"
30: splitted_input = "splitted_input"
31: NOOPs = "NOOPs"
32: typ = "typ"
33: nin_shortcut = "nin_shortcut"
34: UperNetDecoder = "UperNetDecoder"
35: subtile = "subtile"
36: SFOuput = "SFOuput"
37: # huggingface transformers repo uses these words
38: depthwise_seperable_out_channel = "depthwise_seperable_out_channel"
39: DepthWiseSeperableConv1d = "DepthWiseSeperableConv1d"
40: depthwise_seperable_CNN = "depthwise_seperable_CNN"

--- training/tf_rec_v2/mxrec/python/tests/ut_test.toml ---
1: [mxrec]
2: log_level = "ERROR"
3: # If use_ranktable is true, the environment variable "RANK_TABLE_FILE" will be read; if it is false, the configuration
4: # of "mxrec.cm-node-info" in the toml file will be read.
5: use_ranktable = true
6: use_fusion_op = false
7: use_lccl_all2all_op = false
8: fusion_op_type = ""     #  choose 1 from  ["all2all_v_c_uss_fm" | "all2all_v_c_uss_cf" | "all2all_v_c_uss"] 
9: all2all_op_type = ""    #  choose 1 from  ["all2all_v_c_fm" | "all2all_v_c_cf" | "all2all_v_c"] 
10: 
11: [mxrec.cm-node-info]
12: cm_chief_ip = "127.0.0.1"
13: cm_chief_port = 60001
14: cm_chief_device = 0
15: cm_worker_ip = "127.0.0.1"
16: cm_worker_size = 1
17: 

--- training/tf_rec_v2/pyproject.toml ---
1: [project]
2: name = "mxrec_for_lingqu"
3: authors = [{ name = "HUAWEI Inc" }]
4: description = "MindX RecSDK for Lingqu 2.0"
5: readme = { file = "README.md", content-type = "text/markdown" }
6: requires-python = "==3.7.5"
7: license = { file = "LICENSE" }
8: classifiers = [
9:     "Private :: Do Not Upload",
10:     "Programming Language :: Python :: 3",
11: ]
12: 
13: dynamic = ["version"]
14: 
15: [project.optional-dependencies]
16: test = ["pytest ==7.4.4", "pytest-cov ==4.1.0", "pytest-html ==4.1.1"]
17: 
18: [project.urls]
19: Homepage = "https://gitcode.com/Ascend/RecSDK"
20: 
21: [tool.pyright]
22: reportGeneralTypeIssues = false
23: reportReturnType = false
24: reportArgumentType = false
25: reportAssignmentType = false
26: reportInvalidTypeForm = false
27: reportCallIssue = false
28: reportAttributeAccessIssue = false
29: 
30: [tool.black]
31: line-length = 120
32: 
33: [tool.ruff]
34: line-length = 120
35: 

--- training/torch_rec_v2/pyproject.toml ---
1: [project]
2: name = "torch_rec_v2"
3: authors = [{ name = "HUAWEI Inc" }]
4: description = "MindSDK-RecSDK"
5: readme = { file = "README.md", content-type = "text/markdown" }
6: requires-python = ">=3.11.0"
7: license = { file = "LICENSE" }
8: classifiers = [
9:     "Private :: Do Not Upload",
10:     "Programming Language :: Python :: 3",
11: ]
12: 
13: dynamic = ["version"]
14: 
15: [project.urls]
16: Homepage = "https://gitcode.com/Ascend/RecSDK"
17: 
18: [tool.pyright]
19: reportGeneralTypeIssues = false
20: reportReturnType = false
21: reportArgumentType = false
22: reportAssignmentType = false
23: reportInvalidTypeForm = false
24: reportCallIssue = false
25: reportAttributeAccessIssue = false
26: 
27: [tool.black]
28: line-length = 120
29: 
30: [tool.ruff]
31: line-length = 120
32: 

Troubleshooting evidence:
--- docs/zh/tensorflow/tf_rec_v1/faq.md ---
1: # FAQ<a name="ZH-CN_TOPIC_0000001579847284"></a>
2: 
3: ## 多机训练HCCL集群通信失败<a name="ZH-CN_TOPIC_0000001795546622"></a>
4: 
5: **问题现象<a name="section964994911912"></a>**
6: 
7: HCCL集群通信失败。
8: 
9: **可能原因<a name="section1581817491790"></a>**
10: 
11: - 多机节点的NPU device ip不能互相ping通。
12: - 多机节点的NPU device的TLS配置不同。
13: - 其他
14: 
15: **解决方案<a name="section181445017916"></a>**
16: 
17: 1. 检查多机节点的NPU device ip是否能互相ping通。以双机集群（节点A、B），每个节点8卡示例。
18:     1. 查询节点A的device ip:
19: 
20:         ```bash
21:         for i in {0..7}; do hccn_tool -i $i -ip -g ; done
22:         ```
23: 
24:     2. 在节点B上ping节点A的device ip：
25: 
26:         ```bash
27:         hccn_tool -i 0 -ping -g address 192.x.x.x
28:         ```
29: 
30:         其中192.x.x.x为节点A的rank0的device ip；0为指定使用B节点rank0 device去ping对应ip。
31: 
32:         若指令回显包含“0.00% packet loss”则说明能ping通；ping不通则需检查环境网络配置。
33: 
34:         >[!NOTE]
35:         >若device ip配置为IPv6，查询device ip指令和ping device指令有所区别，示例：
36:         >- 查询device ip：
37:         >
38:         >    ```bash
39:         >    for i in {0..7}; do hccn_tool -i $i -ip -inet6 -g; done
40:         >    ```

--- docs/zh/tensorflow/tf_rec_v2/faq.md ---
1: # FAQ<a name="ZH-CN_TOPIC_0000001579847284"></a>
2: 
3: ## 多机训练HCCL集群通信失败<a name="ZH-CN_TOPIC_0000001795546622"></a>
4: 
5: **问题现象<a name="section964994911912"></a>**
6: 
7: HCCL集群通信失败。
8: 
9: **可能原因<a name="section1581817491790"></a>**
10: 
11: - 多机节点的NPU device ip不能互相ping通。
12: - 多机节点的NPU device的TLS配置不同。
13: - 其他
14: 
15: **解决方案<a name="section181445017916"></a>**
16: 
17: 1. 检查多机节点的NPU device ip是否能互相ping通。以双机集群（节点A、B），每个节点8卡示例。
18:     1. 查询节点A的device ip:
19: 
20:         ```bash
21:         for i in {0..7}; do hccn_tool -i $i -ip -g ; done
22:         ```
23: 
24:     2. 在节点B上ping节点A的device ip：
25: 
26:         ```bash
27:         hccn_tool -i 0 -ping -g address 192.x.x.x
28:         ```
29: 
30:         其中192.x.x.x为节点A的rank0的device ip；0为指定使用B节点rank0 device去ping对应ip。
31: 
32:         若指令回显包含“0.00% packet loss”则说明能ping通；ping不通则需检查环境网络配置；
33: 
34:         >[!NOTE] 说明 
35:         >若device ip配置为IPv6，查询device ip指令和ping device指令有所区别，示例：
36:         > - 查询device ip：
37:         >
38:         > ```bash
39:         > for i in {0..7}; do hccn_tool -i $i -ip -inet6 -g; done
40:         > ```

Source excerpts with line numbers:
--- build.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: set -e
18: ROOT_DIR=$(dirname "$(readlink -f "$0")")
19: 
20: remove()
21: {
22:   if [ -d "$1" ]; then
23:     rm -rf "$1"
24:   elif [ -f "$1" ]; then
25:     rm -f "$1"
26:   fi
27: }
28: 
29: clean()
30: {
31:   remove "${ROOT_DIR}"/training/common/dist
32:   remove "${ROOT_DIR}"/training/tf_rec_v1/dist
33:   remove "${ROOT_DIR}"/install
34:   remove "${ROOT_DIR}"/training/common/mx_rec.egg-info
35:   remove "${ROOT_DIR}"/training/tf_rec_v1/mx_rec.egg-info
36:   remove "${ROOT_DIR}"/training/common/build
37:   remove "${ROOT_DIR}"/training/tf_rec_v1/build
38:   remove "${ROOT_DIR}"/build/bdist.linux-"$(arch)"
39:   remove "${ROOT_DIR}"/build/tf1_env
40:   remove "${ROOT_DIR}"/build/tf2_env
41:   remove "${ROOT_DIR}"/build/lib
42:   remove "${ROOT_DIR}"/build/mindxsdk-mxrec
43: }
44: 
45: clean
46: 

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum_tiling.h ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025-2026. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef ASYNCHRONOUS_COMPLETE_CUMSUM_H
17: #define ASYNCHRONOUS_COMPLETE_CUMSUM_H
18: #include "register/tilingdata_base.h"
19: 
20: namespace optiling {
21:     BEGIN_TILING_DATA_DEF(AsynchronousCompleteCumsumTilingData)
22:     TILING_DATA_FIELD_DEF(int64_t, totalLength);
23:     TILING_DATA_FIELD_DEF(int64_t, totalBlocks);
24:     TILING_DATA_FIELD_DEF(int64_t, blocksPerCore);
25:     TILING_DATA_FIELD_DEF(int32_t, remainderBlocks);
26:     TILING_DATA_FIELD_DEF(int32_t, elementsPerBlock);
27:     TILING_DATA_FIELD_DEF(bool, isSmall);
28:     TILING_DATA_FIELD_DEF(bool, isFullCore);
29:     END_TILING_DATA_DEF;
30: 
31:     REGISTER_TILING_DATA_CLASS(AsynchronousCompleteCumsum, AsynchronousCompleteCumsumTilingData)
32: }
33: #endif // ASYNCHRONOUS_COMPLETE_CUMSUM_H
34: 

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_host/asynchronous_complete_cumsum.cpp (truncated) ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025-2026. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #include <cstdint>
17: #include <cmath>
18: #include "tiling/platform/platform_ascendc.h"
19: #include "register/op_def_registry.h"
20: #include "ops_log.h"
21: #include "asynchronous_complete_cumsum_tiling.h"
22: 
23: namespace {
24:     constexpr int32_t MAX_THREADS_PER_BLOCK = 1024;
25:     constexpr int32_t MAX_ELEMENTS_PER_THREAD = 4;
26:     constexpr int32_t MAX_WARPS = MAX_THREADS_PER_BLOCK / 32;
27:     constexpr int DCACHE_SIZE = 128 * 1024;
28:     constexpr int32_t MULTIPLIER = 2;
29:     constexpr int32_t DIVISOR = 4;
30: }
31: 
32: namespace optiling {
33: 
34: static ge::graphStatus TilingFunc(gert::TilingContext* context)
35: {
36:     OPS_LOG_E_IF_NULL("context", context, return ge::GRAPH_FAILED);
37:     OPS_LOG_E_IF_NULL("inputShape", context->GetInputShape(0), return ge::GRAPH_FAILED);
38:     OPS_LOG_E_IF_NULL("inputTensor", context->GetInputTensor(0), return ge::GRAPH_FAILED);
39: 
40:     int64_t inputLength = context->GetInputShape(0)->GetOriginShape().GetShapeSize();
41:     auto inputTensor = context->GetInputTensor(0);
42:     ge::DataType inputDataType = inputTensor->GetDataType();
43: 
44:     uint32_t dimNum = context->GetInputShape(0)->GetOriginShape().GetDimNum();
45:     OPS_LOG_E_IF(dimNum != 1, context, return ge::GRAPH_FAILED,
46:                  "[ERROR]AsynchronousCompleteCumsum required the dim of input-0 is 1");
47: 
48:     OPS_CHECK(inputDataType != ge::DT_INT32 && inputDataType != ge::DT_INT64,
49:               OPS_LOG_E("[ERROR]Invalid data type",
50:                         "AsynchronousCompleteCumsum only support int64 and int32."),
51:               return ge::GRAPH_FAILED);
52: 
53:     // 获取可用核心数，但只使用实际需要的核心数
54:     auto ascendPlatform = platform_ascendc::PlatformAscendC(context->GetPlatformInfo());
55:     size_t maxCores = ascendPlatform.GetCoreNumAiv();
56:     int32_t SMALL_DATA_THRESHOLD_32 = maxCores * MAX_THREADS_PER_BLOCK / DIVISOR;
57:     int32_t SMALL_DATA_THRESHOLD_64 = maxCores * MAX_THREADS_PER_BLOCK * MULTIPLIER + SMALL_DATA_THRESHOLD_32;
58: 
59:     int32_t elementsPerBlock = MAX_THREADS_PER_BLOCK * MAX_ELEMENTS_PER_THREAD;
60:     bool isSmall = false;
61:     if (inputLength <= (inputDataType == ge::DT_INT32 ? SMALL_DATA_THRESHOLD_32 : SMALL_DATA_THRESHOLD_64)) {
62:         isSmall = true;
63:         elementsPerBlock = MAX_THREADS_PER_BLOCK;
64:     }
65:     int64_t totalBlocks = (inputLength + elementsPerBlock - 1) / elementsPerBlock;
66: 
67:     bool isFullCore = (totalBlocks > maxCores);
68:     size_t coreNum = isFullCore ? maxCores : totalBlocks;
69:     if (coreNum == 0) {
70:         OPS_LOG_E(context, "[ERROR] need more than 0 ai core");
71:         return ge::GRAPH_FAILED;
72:     }
73:     int64_t blocksPerCore = totalBlocks / coreNum;                      // 每核基础块数k
74:     int32_t remainderBlocks = totalBlocks % coreNum;                    // 余数块数l
75: 
76:     size_t* workspaceSize = context->GetWorkspaceSizes(1);
77:     OPS_LOG_E_IF_NULL("workspaceSize", workspaceSize, return ge::GRAPH_FAILED);
78:     size_t systemWorkspacesSize = ascendPlatform.GetLibApiWorkSpaceSize();
79: 
80:     size_t blockSumsSize = totalBlocks * sizeof(int64_t);

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_kernel/asynchronous_complete_cumsum_kernel.h (truncated) ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2026. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef ASYNCHRONOUS_COMPLETE_CUMSUM_KERNEL_H
17: #define ASYNCHRONOUS_COMPLETE_CUMSUM_KERNEL_H
18: 
19: #include "simt_kernel.h"
20: #include "kernel_common_utils.h"
21: 
22: struct Args {
23:     GM_ADDR x;
24:     GM_ADDR y;
25:     GM_ADDR workspace;
26:     GM_ADDR tiling;
27: };
28: 
29: namespace AsynchronousCompleteCumsum {
30: 
31: constexpr int BUFFER_NUM = 2;
32: 
33: template <typename T>
34: class AsynchronousCompleteCumsumKernel {
35: public:
36:     __aicore__ inline AsynchronousCompleteCumsumKernel(Args &args)
37:     {
38:         GET_TILING_DATA(tilingData, args.tiling);
39: 
40:         InitTilingParams(tilingData);
41:         InitGmParams(args);
42:         InitUbParams();
43:     }
44: 
45:     __aicore__ inline void Compute()
46:     {
47:         int32_t coreIdx = GetBlockIdx();
48:         if (coreIdx < remainderBlocks) {
49:             blockCount = blocksPerCore + 1;
50:             blockStart = coreIdx * blockCount;
51:         } else {
52:             blockCount = blocksPerCore;
53:             blockStart = remainderBlocks * (blocksPerCore + 1) + (coreIdx - remainderBlocks) * blocksPerCore;
54:         }
55: 
56:         if (coreIdx == 0) {
57:             outputGT.SetValue(0, static_cast<T>(0));
58:             AscendC::DataCacheCleanAndInvalid<T, AscendC::CacheLine::SINGLE_CACHE_LINE,
59:                                               AscendC::DcciDst::CACHELINE_OUT>(outputGT[0]);
60:         }
61: 
62:         if (isFullCore) {
63:             ProcessMultiCycles();
64:         } else {
65:             ProcessOneCycle();
66:         }
67:     }
68: 
69: private:
70:     __aicore__ inline void InitTilingParams(const AsynchronousCompleteCumsumTilingData &tilingData)
71:     {
72:         totalLength = tilingData.totalLength;
73:         totalBlocks = tilingData.totalBlocks;
74:         blocksPerCore = tilingData.blocksPerCore;
75:         remainderBlocks = tilingData.remainderBlocks;
76:         elementsPerBlock = tilingData.elementsPerBlock;
77:         isSmall = tilingData.isSmall;
78:         isFullCore = tilingData.isFullCore;
79:     }
80: 

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_kernel/asynchronous_complete_cumsum.cpp ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025-2026. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #include "asynchronous_complete_cumsum_kernel.h"
17: 
18: // Kernel入口函数
19: extern "C" __global__ __aicore__ void asynchronous_complete_cumsum(
20:     GM_ADDR x, GM_ADDR y, GM_ADDR workspace, GM_ADDR tiling)
21: {
22:     Args args{
23:         x, y, workspace, tiling
24:     };
25: 
26:     AsynchronousCompleteCumsum::AsynchronousCompleteCumsumKernel<DTYPE_X> kernel(args);
27:     kernel.Compute();
28: }

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/op_kernel/simt_kernel.h (truncated) ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2026. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef SIMT_KERNEL_H
17: #define SIMT_KERNEL_H
18: 
19: #include "kernel_operator.h"
20: #include "simt_api/asc_simt.h"
21: 
22: using namespace AscendC;
23: 
24: constexpr int32_t MAX_THREADS_PER_BLOCK = 1024;
25: constexpr int32_t WARP_SIZE = 32;
26: constexpr int32_t MAX_ELEMENTS_PER_THREAD = 4;
27: constexpr int32_t MAX_WARPS = MAX_THREADS_PER_BLOCK / WARP_SIZE;
28: constexpr int32_t DATA_ALIGN_BYTES = 32;
29: 
30: namespace CumsumSimt {
31: 
32: // Warp级前缀和计算
33: template <typename T>
34: __simt_callee__ inline T WarpPrefixSum(T val)
35: {
36:     int32_t laneId = threadIdx.x % WARP_SIZE;
37: #pragma unroll
38:     for (int32_t offset = 1; offset < WARP_SIZE; offset <<= 1) {
39:         T temp = asc_shfl_up(val, offset);
40:         if (laneId >= offset) {
41:             val += temp;
42:         }
43:     }
44:     return val;
45: }
46: 
47: template<typename T>
48: __simt_vf__ __aicore__ LAUNCH_BOUND(MAX_THREADS_PER_BLOCK)
49:     inline void SmallDataCompute(__local_mem__ T* input, __local_mem__ T* output,
50:                                  __gm__ T* blockSums, __ubuf__ T* sharedMemory,
51:                                  int32_t elementsThisBlock, int64_t blockIdx)
52: {
53:     // 线程信息计算
54:     const int32_t warpId = threadIdx.x / WARP_SIZE;
55:     const int32_t laneId = threadIdx.x % WARP_SIZE;
56: 
57:     int32_t activeWarpCount = (elementsThisBlock + WARP_SIZE - 1) / WARP_SIZE;
58: 
59:     T currentValue = (threadIdx.x < elementsThisBlock) ? input[threadIdx.x] : static_cast<T>(0);
60:     T warpPrefixSum = WarpPrefixSum(currentValue);
61: 
62:     int32_t elementsInThisWarp = (warpId < activeWarpCount - 1) ? WARP_SIZE :
63:                                                                 (elementsThisBlock - warpId * WARP_SIZE);
64:     elementsInThisWarp = (warpId >= activeWarpCount) ? 0 : elementsInThisWarp;
65:     if (laneId == elementsInThisWarp - 1 && warpId < activeWarpCount) {
66:         sharedMemory[warpId] = warpPrefixSum;
67:     }
68:     asc_syncthreads();
69: 
70:     if (threadIdx.x < activeWarpCount) {
71:         T warpSumValue = sharedMemory[threadIdx.x];
72:         T warpSumPrefix = WarpPrefixSum(warpSumValue);
73:         sharedMemory[threadIdx.x] = warpSumPrefix;
74:     }
75:     asc_syncthreads();
76: 
77:     T warpExclusive = static_cast<T>(0);
78:     if (warpId > 0 && warpId < activeWarpCount) {
79:         warpExclusive = sharedMemory[warpId - 1];
80:     }

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/c310/run.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2025-2026. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: set -e
18: 
19: # ==============================================================================
20: # 1. 初始化路径
21: # ==============================================================================
22: readonly THIS_SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
23: readonly WORK_DIR="$(dirname "${THIS_SCRIPT}")"
24: readonly UTILS_SCRIPT="${WORK_DIR}/../../../scripts/op_builder_utils.sh"
25: 
26: # ==============================================================================
27: # 2. 加载通用库
28: # ==============================================================================
29: 
30: if [ ! -f "$UTILS_SCRIPT" ]; then
31:     echo "ERROR: Cannot find op_builder_utils.sh at ${UTILS_SCRIPT}" >&2
32:     echo "Please check your directory structure." >&2
33:     exit 1
34: fi
35: 
36: source "$UTILS_SCRIPT"
37: 
38: # ==============================================================================
39: # 3. 参数配置（默认 ai_core 由 parse_arguments 按 AI_CORE_PROFILE=c310 设为 Ascend950）
40: # ==============================================================================
41: vendor_name="asynchronous_complete_cumsum"
42: export AI_CORE_PROFILE="c310"
43: export COPY_KERNEL_COMMON_UTILS="1"
44: 
45: parse_arguments "$@" || exit 1
46: 
47: # ==============================================================================
48: # 4. 执行标准化流程
49: # ==============================================================================
50: 
51: build_and_install_operator "$WORK_DIR" "$vendor_name" || exit 1
52: 

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/asynchronous_complete_cumsum_tiling.h ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef ASYNCHRONOUS_COMPLETE_CUMSUM_H
17: #define ASYNCHRONOUS_COMPLETE_CUMSUM_H
18: #include "register/tilingdata_base.h"
19: 
20: namespace optiling {
21:     BEGIN_TILING_DATA_DEF(AsynchronousCompleteCumsumTilingData)
22:     TILING_DATA_FIELD_DEF(int64_t, totalLength); // 处理数据的总长度
23: 
24:     // 分块策略参数
25:     TILING_DATA_FIELD_DEF(int64_t, totalBlocks);           // 总块数
26:     TILING_DATA_FIELD_DEF(int64_t, blocksPerCore);         // 每核处理的块数k
27:     TILING_DATA_FIELD_DEF(int64_t, remainderBlocks);       // 余数块数l
28:     
29:     END_TILING_DATA_DEF;
30: 
31:     REGISTER_TILING_DATA_CLASS(AsynchronousCompleteCumsum, AsynchronousCompleteCumsumTilingData)
32: }
33: #endif // ASYNCHRONOUS_COMPLETE_CUMSUM_H

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_host/asynchronous_complete_cumsum.cpp (truncated) ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #include <cstdint>
17: #include <cmath>
18: #include "tiling/platform/platform_ascendc.h"
19: #include "register/op_def_registry.h"
20: #include "ops_log.h"
21: #include "asynchronous_complete_cumsum_tiling.h"
22: 
23: namespace {
24:     constexpr int32_t BLOCK_SIZE = 256;                    // 每块元素数量
25:     constexpr int32_t CACHE_LINE_SIZE = 64;               // Cache Line大小
26:     constexpr int32_t RESERVERD_UB_SIZE = 20 * 1024;      // UB保留空间
27:     constexpr int NUM_QUEUE = 2;
28:     constexpr int UB_ALIGN = 32;
29: }
30: 
31: namespace optiling {
32: 
33: static ge::graphStatus TilingFunc(gert::TilingContext* context)
34: {
35:     // 参数验证
36:     OPS_LOG_E_IF_NULL("context", context, return ge::GRAPH_FAILED);
37:     OPS_LOG_E_IF_NULL("inputShape", context->GetInputShape(0), return ge::GRAPH_FAILED);
38:     OPS_LOG_E_IF_NULL("inputTensor", context->GetInputTensor(0), return ge::GRAPH_FAILED);
39: 
40:     // 获取输入信息
41:     int64_t inputLength = context->GetInputShape(0)->GetOriginShape().GetShapeSize();
42:     auto inputTensor = context->GetInputTensor(0);
43:     ge::DataType inputDataType = inputTensor->GetDataType();
44: 
45:     auto dimNum = context->GetInputShape(0)->GetOriginShape().GetDimNum();
46:     OPS_LOG_E_IF(dimNum != 1, context, return ge::GRAPH_FAILED,
47:                  "[ERROR]AsynchronousCompleteCumsum required the dim of input-0 is 1");
48: 
49:     OPS_CHECK(inputDataType != ge::DT_INT32 && inputDataType != ge::DT_INT64,
50:               OPS_LOG_E("[ERROR]Invalid data type",
51:                         "AsynchronousCompleteCumsum only support int64 and int32."),
52:               return ge::GRAPH_FAILED);
53:     
54:     // 获取平台信息
55:     auto ascendPlatform = platform_ascendc::PlatformAscendC(context->GetPlatformInfo());
56:     size_t coreNum = ascendPlatform.GetCoreNumAiv();
57:     
58:     // 获取UB大小
59:     uint64_t ubTotal;
60:     ascendPlatform.GetCoreMemSize(platform_ascendc::CoreMemType::UB, ubTotal);
61:     int64_t ubAvailable = (ubTotal - RESERVERD_UB_SIZE) / UB_ALIGN / NUM_QUEUE * UB_ALIGN * NUM_QUEUE;
62: 
63:     // 计算分块策略
64:     int64_t totalBlocks = (inputLength + BLOCK_SIZE - 1) / BLOCK_SIZE;  // 向上取整
65:     if (totalBlocks < coreNum) {
66:         coreNum = totalBlocks;
67:     }
68:     
69:     if (coreNum == 0) {
70:         OPS_LOG_E(context, "[ERROR] need more than 0 ai core");
71:         return ge::GRAPH_FAILED;
72:     }
73:     int64_t blocksPerCore = totalBlocks / coreNum;                      // 每核基础块数k
74:     int64_t remainderBlocks = totalBlocks % coreNum;                    // 余数块数l
75: 
76:     // 配置Workspace
77:     // 每个块需要一个cache line（64字节）来避免false sharing
78:     // 实际只用每个cache line的前sizeof(T)字节存储部分和
79:     size_t* workspaceSize = context->GetWorkspaceSizes(1);
80:     OPS_LOG_E_IF_NULL("workspaceSize", workspaceSize, return ge::GRAPH_FAILED);

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_kernel/asynchronous_complete_cumsum_kernel.h (truncated) ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef ASYNCHRONOUS_COMPLETE_CUMSUM_KERNEL_H
17: #define ASYNCHRONOUS_COMPLETE_CUMSUM_KERNEL_H
18: 
19: #include <cstdint>
20: #include <type_traits>
21: #include "kernel_operator.h"
22: 
23: using namespace AscendC;
24: 
25: namespace AsynchronousCompleteCumsum {
26: 
27: // 常量定义
28: constexpr int USE_QUEUE_NUM = 2;
29: constexpr int32_t BLOCK_SIZE = 256;                  // 每块元素数量
30: constexpr int32_t CACHE_LINE_SIZE = 64;              // Cache Line大小
31: constexpr int32_t DATA_ALIGN_BYTES = 32;             // 数据对齐字节数
32: constexpr int32_t RESERVER_UB_SIZE = 20 * 1024;      // UB保留空间
33: constexpr int32_t K_THRESHOLD = 48;                  // 中等规模阈值
34: 
35: // 参数结构体
36: struct Args {
37:     GM_ADDR input;
38:     GM_ADDR output;
39:     GM_ADDR workspace;
40:     GM_ADDR tiling;
41: };
42: 
43: 
44: template<typename T>
45: class AsynchronousCompleteCumsumKernel {
46: public:
47:     __aicore__ inline AsynchronousCompleteCumsumKernel(Args args)
48:     {
49:         // 获取tiling数据
50:         GET_TILING_DATA(tilingData, args.tiling);
51: 
52:         inputLength = tilingData.totalLength;
53:         totalBlocks = tilingData.totalBlocks;
54:         blocksPerCore = tilingData.blocksPerCore;
55:         remainderBlocks = tilingData.remainderBlocks;
56: 
57:         static_assert(sizeof(T) == sizeof(int32_t) || sizeof(T) == sizeof(int64_t), "T must be 4 or 8 bytes");
58:         cache_align = CACHE_LINE_SIZE / static_cast<int32_t>(sizeof(T));
59: 
60:         // 根据负载均衡策略计算每个core的工作分配
61:         int64_t coreId = GetBlockIdx();
62:         if (coreId < remainderBlocks) {
63:             myBlocksCount = blocksPerCore + 1;
64:             myStartBlock = coreId * myBlocksCount;
65:         } else {
66:             myBlocksCount = blocksPerCore;
67:             myStartBlock = remainderBlocks * (blocksPerCore + 1) +
68:                            (coreId - remainderBlocks) * blocksPerCore;
69:         }
70: 
71:         // 初始化gm内存
72:         inputGT.SetGlobalBuffer(reinterpret_cast<__gm__ T*>(args.input), (inputLength));
73:         outputGT.SetGlobalBuffer(reinterpret_cast<__gm__ T*>(args.output), (inputLength + 1));
74: 
75:         auto user_workspace = GetUserWorkspace(args.workspace);
76:         __gm__ T *addr = reinterpret_cast<__gm__ T *>(user_workspace);
77:         sharedMem.SetGlobalBuffer(addr, totalBlocks * cache_align);
78: 
79:         // 初始化UB资源
80:         pipe.InitBuffer(inputQueue, USE_QUEUE_NUM, BLOCK_SIZE * sizeof(T));

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/op_kernel/asynchronous_complete_cumsum.cpp ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #include "asynchronous_complete_cumsum_kernel.h"
17: #include "kernel_operator.h"
18: 
19: // Kernel入口函数
20: extern "C" __global__ __aicore__ void asynchronous_complete_cumsum(
21:     GM_ADDR x, GM_ADDR y, GM_ADDR workspace, GM_ADDR tiling)
22: {
23:     GET_TILING_DATA(tilingData, tiling);
24:     AsynchronousCompleteCumsum::Args args{x, y, workspace, tiling};
25: 
26:     AsynchronousCompleteCumsum::AsynchronousCompleteCumsumKernel<DTYPE_X> kernel(args);
27:     kernel.Compute();
28: }

--- cust_op/ascendc_op/ai_core_op/asynchronous_complete_cumsum/v220/run.sh ---
1: #!/bin/bash
2: # Copyright (c) Huawei Technologies Co., Ltd. 2025-2026. All rights reserved.
3: #
4: # Licensed under the Apache License, Version 2.0 (the "License");
5: # you may not use this file except in compliance with the License.
6: # You may obtain a copy of the License at
7: #
8: #    http://www.apache.org/licenses/LICENSE-2.0
9: #
10: # Unless required by applicable law or agreed to in writing, software
11: # distributed under the License is distributed on an "AS IS" BASIS,
12: # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
13: # See the License for the specific language governing permissions and
14: # limitations under the License.
15: # ==============================================================================
16: 
17: set -e
18: 
19: # ==============================================================================
20: # 1. 初始化路径
21: # ==============================================================================
22: readonly THIS_SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
23: readonly WORK_DIR="$(dirname "${THIS_SCRIPT}")"
24: readonly UTILS_SCRIPT="${WORK_DIR}/../../../scripts/op_builder_utils.sh"
25: 
26: # ==============================================================================
27: # 2. 加载通用库
28: # ==============================================================================
29: 
30: if [ ! -f "$UTILS_SCRIPT" ]; then
31:     echo "ERROR: Cannot find op_builder_utils.sh at ${UTILS_SCRIPT}" >&2
32:     echo "Please check your directory structure." >&2
33:     exit 1
34: fi
35: 
36: source "$UTILS_SCRIPT"
37: 
38: # ==============================================================================
39: # 3. 参数配置
40: # ==============================================================================
41: vendor_name="asynchronous_complete_cumsum"
42: 
43: parse_arguments "$@" || exit 1
44: 
45: # ==============================================================================
46: # 4. 执行标准化流程
47: # ==============================================================================
48: 
49: build_and_install_operator "$WORK_DIR" "$vendor_name" || exit 1
50: 

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_host/backward_codegen_adagrad_unweighted_exact_tiling.h ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef BACKWARD_CODEGEN_ADAGRAD_UNWEIGHTED_EXACT_TILING
17: #define BACKWARD_CODEGEN_ADAGRAD_UNWEIGHTED_EXACT_TILING
18: #include "register/tilingdata_base.h"
19: 
20: namespace optiling {
21: BEGIN_TILING_DATA_DEF(BackwardCodegenAdagradUnweightedExactTilingData)
22: TILING_DATA_FIELD_DEF(int64_t, gradOutputDim0);
23: TILING_DATA_FIELD_DEF(int64_t, gradOutputDim1);
24: TILING_DATA_FIELD_DEF(int64_t, devWeightsDim0);
25: TILING_DATA_FIELD_DEF(int64_t, weightsOffsetsDim0);
26: TILING_DATA_FIELD_DEF(int64_t, dOffsetsDim0);
27: TILING_DATA_FIELD_DEF(int64_t, indicesDim0);
28: TILING_DATA_FIELD_DEF(int64_t, offsetsDim0);
29: TILING_DATA_FIELD_DEF(int64_t, outDim0);
30: TILING_DATA_FIELD_DEF(int64_t, bytesOfDataType);
31: TILING_DATA_FIELD_DEF(int64_t, offsetDataType);
32: TILING_DATA_FIELD_DEF(int64_t, splitBaseLen);
33: TILING_DATA_FIELD_DEF(int64_t, tailSplitIndex);
34: TILING_DATA_FIELD_DEF(int64_t, ubCanUsed);
35: TILING_DATA_FIELD_DEF(int64_t, poolMode);
36: TILING_DATA_FIELD_DEF(int64_t, maxD);
37: TILING_DATA_FIELD_DEF(int64_t, uniqueIdDim0);
38: TILING_DATA_FIELD_DEF(int64_t, uniqueHashDim0);
39: TILING_DATA_FIELD_DEF(float, eps);
40: TILING_DATA_FIELD_DEF(float, learningRate);
41: TILING_DATA_FIELD_DEF(bool, enableHash);
42: TILING_DATA_FIELD_DEF(float, beta1);
43: TILING_DATA_FIELD_DEF(float, beta2);
44: TILING_DATA_FIELD_DEF(float, beta1pow);
45: TILING_DATA_FIELD_DEF(float, beta2pow);
46: TILING_DATA_FIELD_DEF(float, beta2sqrt);
47: TILING_DATA_FIELD_DEF(int64_t, iter);
48: TILING_DATA_FIELD_DEF(bool, useOptimize); // where to use optimizer update
49: TILING_DATA_FIELD_DEF(bool, useRegBase);
50: TILING_DATA_FIELD_DEF(int64_t, momentumDim0);
51: TILING_DATA_FIELD_DEF(int64_t, totalHashSize);
52: END_TILING_DATA_DEF;
53: 
54: REGISTER_TILING_DATA_CLASS(BackwardCodegenAdagradUnweightedExact, BackwardCodegenAdagradUnweightedExactTilingData)
55: }  // namespace optiling
56: #endif
57: 

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_host/backward_codegen_adagrad_unweighted_exact.cpp (truncated) ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025-2026. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #include <cmath>
17: #include <cstdint>
18: 
19: #include "backward_codegen_adagrad_unweighted_exact_tiling.h"
20: #include "register/op_def_registry.h"
21: #include "tiling/platform/platform_ascendc.h"
22: #include "ops_log.h"
23: 
24: namespace optiling {
25: constexpr int DATA_TYPE_FLOAT32 = 0;
26: constexpr int DATA_TYPE_INT64 = 1;
27: 
28: constexpr int RESERVER_UB_SIZE = 40 * 1024;
29: constexpr uint64_t UB_ALIGN = 32;
30: constexpr int NUM_QUEUE = 32;
31: // input index
32: constexpr int GRAD_OUTPUT_INDEX = 0;
33: constexpr int DEV_WEIGHTS_INDEX = 1;
34: constexpr int UVM_WEIGHTS_INDEX = 2;
35: constexpr int LXU_CACHE_WEIGHTS_INDEX = 3;
36: constexpr int WEIGHTS_PLACEMENTS_INDEX = 4;
37: constexpr int WEIGHTS_OFFSETS_INDEX = 5;
38: constexpr int D_OFFSETS_INDEX = 6;
39: constexpr int INDICES_INDEX = 8;
40: constexpr int OFFSETS_INDEX = 9;
41: constexpr int LXU_CACHE_LOCATIONS_INDEX = 10;
42: constexpr int MOMENTUM1_DEV_INDEX = 11;
43: constexpr int HASH_INDICES_INDEX = 19;
44: constexpr int UNIQUE_ID_INDEX = 20;
45: constexpr int UNIQUE_HASH_SIZE_INDEX = 21;
46: constexpr int UNIQUE_INVERSE_INDEX = 22;
47: // attribute index
48: constexpr int MAX_D_INDEX = 0;
49: constexpr int TOTAL_HASH_SIZE_BITS = 1;
50: constexpr int POOL_MODE_INDEX = 2;
51: 
52: constexpr int OPTIM_TYPE_INDEX = 10;
53: constexpr int EPS_INDEX = 11;
54: constexpr int LEARNING_RATE_INDEX = 12;
55: constexpr int BETA1_INDEX = 13;
56: constexpr int BETA2_INDEX = 14;
57: constexpr int ITER_INDEX = 15;
58: constexpr int USE_OPTIMIZE_INDEX = 16;
59: 
60: // tilling key index
61: constexpr int NORMAL_ADAGRAD = 1;
62: constexpr int UNIQUE_ADAGRAD = 4;
63: constexpr int NORMAL_ADAM = 2;
64: constexpr int UNIQUE_ADAM = 5;
65: constexpr int NORMAL_SGD = 3;
66: constexpr int UNIQUE_SGD = 6;
67: constexpr int NORMAL_ROWWISE_ADAGRAD = 7;
68: // optimize type
69: constexpr int ADAGRAD = 1;
70: constexpr int ADAM = 2;
71: constexpr int SGD = 3;
72: constexpr int ROWWISE_ADAGRAD = 7;
73: 
74: /// Stride for accessing triad elements
75: constexpr int64_t TRIAD_ACCESS_STRIDE = 3;
76: 
77: static ge::graphStatus UniqueTilingFunc(gert::TilingContext* context,
78:                                         BackwardCodegenAdagradUnweightedExactTilingData& tilingData)
79: {
80:     auto uniqueOffset = context->GetOptionalInputTensor(UNIQUE_HASH_SIZE_INDEX);

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_adagrad_unweighted_exact_kernel_unique.h (truncated) ---
1: /* Copyright 2025. Huawei Technologies Co.,Ltd. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef BACKWARD_CODEGEN_ADAGRAD_UNWEIGHTED_EXACT_KERNEL_UNIQUE_FUN_H
17: #define BACKWARD_CODEGEN_ADAGRAD_UNWEIGHTED_EXACT_KERNEL_UNIQUE_FUN_H
18: 
19: #include <cstdint>
20: 
21: #include "kernel_operator.h"
22: #include "backward_codegen_unweighted_exact_kernel_unique.h"
23: 
24: using namespace AscendC;
25: using namespace BackwardCodegenUnweightedExact;
26: using namespace BackwardCodegenUnweightedExactUnique;
27: 
28: namespace BackwardCodegenUnweightedExactAdagradUnique {
29: 
30: template <typename T>
31: __aicore__ inline void AdagradCompute(__local_mem__ T* dstGrad, __local_mem__ T* dstMoment,
32:                                       __local_mem__ T* srcGrad, __local_mem__ T* srcMoment,
33:                                       uint32_t calCount, uint16_t repeatCount, uint32_t oneRepeat,
34:                                       float eps, float learning_rate)
35: {
36:     AscendC::MicroAPI::RegTensor<T> dstVregG;
37:     AscendC::MicroAPI::RegTensor<T> dstVregM;
38:     AscendC::MicroAPI::RegTensor<T> srcVregG;
39:     AscendC::MicroAPI::RegTensor<T> srcVregM;
40:     AscendC::MicroAPI::MaskReg mask;
41: 
42:     for (uint16_t i = 0; i < repeatCount; ++i) {
43:         mask = AscendC::MicroAPI::UpdateMask<uint32_t>(calCount);
44:         AscendC::MicroAPI::DataCopy(srcVregG, srcGrad + i * oneRepeat);
45:         AscendC::MicroAPI::DataCopy(srcVregM, srcMoment + i * oneRepeat);
46: 
47:         AscendC::MicroAPI::Mul(dstVregG, srcVregG, srcVregG, mask);
48:         AscendC::MicroAPI::Add(dstVregG, srcVregM, dstVregG, mask);
49: 
50:         AscendC::MicroAPI::Sqrt(dstVregG, dstVregG, mask);
51:         AscendC::MicroAPI::Adds(dstVregG, dstVregG, eps, mask);
52:         AscendC::MicroAPI::Duplicate(dstVregM, learning_rate, mask);
53:         AscendC::MicroAPI::Div(dstVregG, dstVregM, dstVregG, mask);
54: 
55:         AscendC::MicroAPI::Mul(dstVregG, dstVregG, srcVregG, mask);
56:         AscendC::MicroAPI::Muls(dstVregG, dstVregG, -1, mask);
57:         AscendC::MicroAPI::Mul(dstVregM, srcVregG, srcVregG, mask);
58: 
59:         AscendC::MicroAPI::DataCopy(dstGrad + i * oneRepeat, dstVregG, mask);
60:         AscendC::MicroAPI::DataCopy(dstMoment + i * oneRepeat, dstVregM, mask);
61:     }
62: }
63: 
64: class BackwardCodegenAdagradUnweightedExactKernelUnique : public BackwardCodegenUnweightedExactKernelUnique {
65: public:
66:     __aicore__ inline BackwardCodegenAdagradUnweightedExactKernelUnique() {}
67: 
68:     __aicore__ inline void AdagradScheduler()
69:     {
70:         int64_t lastIndices = 0;
71:         for (int64_t i = 1; i < uniqueHashDim0; i++) {
72:             if (uniqueHashSizeGT.GetValue(i) != lastIndices) { // 每张表上的indices尽量均分到每张卡上
73:                 Scheduler(uniqueHashSizeGT.GetValue(i) - lastIndices, offsetOfThisCore, thisTableLen);
74:                 if (thisTableLen > 0) {
75:                     tableIndex = i - 1;
76:                     thisTableOffset = offsetOfThisCore + lastIndices;
77:                     UpdateEmbedAdagrad();
78:                 }
79:                 lastIndices = uniqueHashSizeGT.GetValue(i);
80:             }

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_adagrad_unweighted_exact_kernel.h (truncated) ---
1: /* Copyright 2025. Huawei Technologies Co.,Ltd. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef BACKWARD_CODEGEN_ADAGRAD_UNWEIGHTED_EXACT_KERNEL_KERNEL_FUN_H
17: #define BACKWARD_CODEGEN_ADAGRAD_UNWEIGHTED_EXACT_KERNEL_KERNEL_FUN_H
18: 
19: #include <cstdint>
20: 
21: #include "kernel_operator.h"
22: #include "backward_codegen_unweighted_exact_kernel.h"
23: 
24: using namespace AscendC;
25: using namespace BackwardCodegenUnweightedExact;
26: 
27: namespace BackwardCodegenAdagradUnweightedExact {
28: 
29: template <typename T>
30: __aicore__ inline void AdagradCompute(__local_mem__ T* dstGrad, __local_mem__ T* dstMoment,
31:                                       __local_mem__ T* srcGrad, __local_mem__ T* srcMoment,
32:                                       uint32_t calCount, uint16_t repeatCount, uint32_t oneRepeat,
33:                                       float eps, float learning_rate)
34: {
35:     AscendC::MicroAPI::RegTensor<T> dstVregG;
36:     AscendC::MicroAPI::RegTensor<T> dstVregM;
37:     AscendC::MicroAPI::RegTensor<T> srcVregG;
38:     AscendC::MicroAPI::RegTensor<T> srcVregM;
39:     AscendC::MicroAPI::MaskReg mask;
40: 
41:     for (uint16_t i = 0; i < repeatCount; ++i) {
42:         mask = AscendC::MicroAPI::UpdateMask<uint32_t>(calCount);
43:         AscendC::MicroAPI::DataCopy(srcVregG, srcGrad + i * oneRepeat);
44:         AscendC::MicroAPI::DataCopy(srcVregM, srcMoment + i * oneRepeat);
45: 
46:         AscendC::MicroAPI::Mul(dstVregG, srcVregG, srcVregG, mask);
47:         AscendC::MicroAPI::Add(dstVregG, srcVregM, dstVregG, mask);
48: 
49:         AscendC::MicroAPI::Sqrt(dstVregG, dstVregG, mask);
50:         AscendC::MicroAPI::Adds(dstVregG, dstVregG, eps, mask);
51:         AscendC::MicroAPI::Duplicate(dstVregM, learning_rate, mask);
52:         AscendC::MicroAPI::Div(dstVregG, dstVregM, dstVregG, mask);
53: 
54:         AscendC::MicroAPI::Mul(dstVregG, dstVregG, srcVregG, mask);
55:         AscendC::MicroAPI::Muls(dstVregG, dstVregG, -1, mask);
56:         AscendC::MicroAPI::Mul(dstVregM, srcVregG, srcVregG, mask);
57: 
58:         AscendC::MicroAPI::DataCopy(dstGrad + i * oneRepeat, dstVregG, mask);
59:         AscendC::MicroAPI::DataCopy(dstMoment + i * oneRepeat, dstVregM, mask);
60:     }
61: }
62: 
63: class BackwardCodegenAdagradUnweightedExactKernel : public BackwardCodegenUnweightedExactKernel {
64: public:
65:     __aicore__ inline BackwardCodegenAdagradUnweightedExactKernel() {}
66: 
67:     __aicore__ inline void UpdateEmbedAda()
68:     {
69:         this->UniqIndices();
70:         SyncAll();
71:         
72:         __gm__ int32_t* dOffsetsPtr = (__gm__ int32_t*)dOffsets;
73:         __gm__ int64_t* weightsOffsetsPtr = (__gm__ int64_t*)weightsOffsets;
74:         __gm__ int64_t* offsetsPtr = (__gm__ int64_t*)offsets;
75: 
76:         int64_t allLen = totalHashSize;
77:         int64_t totalTableSizeSplit = allLen % GetBlockNum();
78:         int64_t aCoreTableLen = allLen / GetBlockNum();
79: 
80:         int64_t thisTableLen = 0;

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_adagrad_unweighted_exact.cpp (truncated) ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2025-2026. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #include "backward_codegen_adagrad_unweighted_exact_kernel.h"
17: #include "backward_codegen_adam_unweighted_exact_kernel.h"
18: #include "backward_codegen_sgd_unweighted_exact_kernel.h"
19: #include "backward_codegen_adagrad_unweighted_exact_kernel_unique.h"
20: #include "backward_codegen_adam_unweighted_exact_kernel_unique.h"
21: #include "backward_codegen_sgd_unweighted_exact_kernel_unique.h"
22: #include "backward_codegen_rowwise_adagrad_unweighted_exact_kernel.h"
23: #include "kernel_operator.h"
24: 
25: 
26: extern "C" __global__ __aicore__ void backward_codegen_adagrad_unweighted_exact(GM_ADDR gradOutput,
27:                                                                                 GM_ADDR devWeights,
28:                                                                                 GM_ADDR uvmWeights,
29:                                                                                 GM_ADDR lxuCacheWeights,
30:                                                                                 GM_ADDR weightsPlacements,
31:                                                                                 GM_ADDR weightsOffsets,
32:                                                                                 GM_ADDR dOffsets,
33:                                                                                 GM_ADDR hashSizeCumsum,
34:                                                                                 GM_ADDR indices, GM_ADDR offsets,
35:                                                                                 GM_ADDR lxuCacheLocations,
36:                                                                                 GM_ADDR momentum1Dev,
37:                                                                                 GM_ADDR momentum1Uvm,
38:                                                                                 GM_ADDR momentum1Placements,
39:                                                                                 GM_ADDR momentum1Offsets,
40:                                                                                 GM_ADDR momentum2Dev,
41:                                                                                 GM_ADDR momentum2Uvm,
42:                                                                                 GM_ADDR momentum2Placements,
43:                                                                                 GM_ADDR momentum2Offsets,
44:                                                                                 GM_ADDR hashIndices, GM_ADDR uniqueId,
45:                                                                                 GM_ADDR uniqueHashSize,
46:                                                                                 GM_ADDR uniqueInverse,
47:                                                                                 GM_ADDR indiceSizeCumsum,
48:                                                                                 GM_ADDR out,
49:                                                                                 GM_ADDR momentum1DevOut,
50:                                                                                 GM_ADDR momentum2DevOut,
51:                                                                                 GM_ADDR weightsDevOut,
52:                                                                                 GM_ADDR workspace, GM_ADDR tiling)
53: {
54:     GET_TILING_DATA(tiling_data, tiling);
55:     BackwardCodegenUnweightedExact::Args args{
56:         gradOutput, devWeights,      weightsPlacements, weightsOffsets, dOffsets,  hashSizeCumsum, indices,
57:         offsets,    momentum1Dev,    momentum2Dev,      hashIndices,    uniqueId,  uniqueHashSize, uniqueInverse,
58:         indiceSizeCumsum, out,       momentum1DevOut, momentum2DevOut,   weightsDevOut,  workspace, tiling};
59:     if (TILING_KEY_IS(1)) {  // NORMAL_ADAGRAD
60:         BackwardCodegenAdagradUnweightedExact::BackwardCodegenAdagradUnweightedExactKernel kernel;
61:         if (tiling_data.useOptimize) {
62:             kernel.Compute(args);
63:             kernel.UpdateEmbedAda();
64:         } else {
65:             kernel.Compute(args);
66:         }
67:     } else if (TILING_KEY_IS(2)) {  // NORMAL_ADAM
68:         BackwardCodegenAdamUnweightedExact::BackwardCodegenAdamUnweightedExactKernel kernel;
69:         if (tiling_data.useOptimize) {
70:             kernel.Compute(args);
71:             kernel.UpdateEmbedAdam(args);
72:         } else {
73:             kernel.Compute(args);
74:         }
75:     } else if (TILING_KEY_IS(3)) {  // NORMAL_SGD
76:         BackwardCodegenSgdUnweightedExact::BackwardCodegenSgdUnweightedExactKernel kernel;
77:         if (tiling_data.useOptimize) {
78:             kernel.Compute(args);
79:             kernel.UpdateEmbedSgd(args);
80:         } else {

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_adam_unweighted_exact_kernel_unique.h (truncated) ---
1: /* Copyright 2025. Huawei Technologies Co.,Ltd. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef BACKWARD_CODEGEN_ADAM_UNWEIGHTED_EXACT_KERNEL_UNIQUE_FUN_H
17: #define BACKWARD_CODEGEN_ADAM_UNWEIGHTED_EXACT_KERNEL_UNIQUE_FUN_H
18: 
19: #include <cstdint>
20: 
21: #include "kernel_operator.h"
22: #include "backward_codegen_unweighted_exact_kernel_unique.h"
23: 
24: using namespace AscendC;
25: using namespace BackwardCodegenUnweightedExact;
26: using namespace BackwardCodegenUnweightedExactUnique;
27: namespace BackwardCodegenUnweightedAdamExactUnique {
28: 
29: constexpr int NUM_OUTPUTS = 3; // grad, momentum1, momentum2
30: 
31: template <typename T>
32: __aicore__ inline void AdamCompute(__local_mem__ T* dstG, __local_mem__ T* dstM1, __local_mem__ T* dstM2,
33:                                           __local_mem__ T* srcG, __local_mem__ T* srcM1, __local_mem__ T* srcM2,
34:                                           uint32_t calCount, uint16_t repeatCount, uint32_t oneRepeat,
35:                                           float eps, float beta1, float oneMinusBeta1, float beta2, float oneMinusBeta2,
36:                                           float stepSize)
37: {
38:     AscendC::MicroAPI::RegTensor<T> dstVregG;
39:     AscendC::MicroAPI::RegTensor<T> dstVregM1;
40:     AscendC::MicroAPI::RegTensor<T> dstVregM2;
41:     AscendC::MicroAPI::RegTensor<T> srcVregG;
42:     AscendC::MicroAPI::RegTensor<T> srcVregM1;
43:     AscendC::MicroAPI::RegTensor<T> srcVregM2;
44:     AscendC::MicroAPI::MaskReg mask;
45: 
46:     for (uint16_t i = 0; i < repeatCount; ++i) {
47:         mask = AscendC::MicroAPI::UpdateMask<uint32_t>(calCount);
48:         AscendC::MicroAPI::DataCopy(srcVregG, srcG + i * oneRepeat);
49:         AscendC::MicroAPI::DataCopy(srcVregM1, srcM1 + i * oneRepeat);
50:         AscendC::MicroAPI::DataCopy(srcVregM2, srcM2 + i * oneRepeat);
51: 
52:         AscendC::MicroAPI::Muls(dstVregM1, srcVregM1, beta1, mask);
53:         AscendC::MicroAPI::Muls(dstVregG, srcVregG, oneMinusBeta1, mask);
54:         AscendC::MicroAPI::Add(dstVregM1, dstVregM1, dstVregG, mask);
55: 
56:         AscendC::MicroAPI::Muls(dstVregM2, srcVregM2, beta2, mask);
57:         AscendC::MicroAPI::Mul(dstVregG, srcVregG, srcVregG, mask);
58:         AscendC::MicroAPI::Muls(dstVregG, dstVregG, oneMinusBeta2, mask);
59:         AscendC::MicroAPI::Add(dstVregM2, dstVregM2, dstVregG, mask);
60: 
61:         AscendC::MicroAPI::Sqrt(srcVregM2, dstVregM2, mask);
62:         AscendC::MicroAPI::Adds(srcVregM2, srcVregM2, eps, mask);
63:         AscendC::MicroAPI::Div(dstVregG, dstVregM1, srcVregM2, mask);
64:         AscendC::MicroAPI::Muls(dstVregG, dstVregG, stepSize, mask);
65: 
66:         AscendC::MicroAPI::DataCopy(dstG + i * oneRepeat, dstVregG, mask);
67:         AscendC::MicroAPI::DataCopy(dstM1 + i * oneRepeat, dstVregM1, mask);
68:         AscendC::MicroAPI::DataCopy(dstM2 + i * oneRepeat, dstVregM2, mask);
69:     }
70: }
71: 
72: class BackwardCodegenAdamUnweightedExactKernelUnique : public BackwardCodegenUnweightedExactKernelUnique {
73: public:
74:     __aicore__ inline BackwardCodegenAdamUnweightedExactKernelUnique() {}
75:     __aicore__ inline void InitAdam(Args args)
76:     {
77:         GET_TILING_DATA(tilingData, args.tiling);
78:         momentum2Dev = args.momentum2Dev;
79:         momentum2DevOut = args.momentum2DevOut;
80:         momentum2DevGT.SetGlobalBuffer((__gm__ float*)momentum2Dev, outDim0);

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_adam_unweighted_exact_kernel.h (truncated) ---
1: /* Copyright 2025. Huawei Technologies Co.,Ltd. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef BACKWARD_CODEGEN_ADAM_UNWEIGHTED_EXACT_KERNEL_KERNEL_FUN_H
17: #define BACKWARD_CODEGEN_ADAM_UNWEIGHTED_EXACT_KERNEL_KERNEL_FUN_H
18: 
19: #include <cstdint>
20: 
21: #include "kernel_operator.h"
22: #include "backward_codegen_unweighted_exact_kernel.h"
23: 
24: using namespace AscendC;
25: using namespace BackwardCodegenUnweightedExact;
26: 
27: namespace BackwardCodegenAdamUnweightedExact {
28: 
29: constexpr int NUM_OUTPUTS = 3; // grad, momentum1, momentum2
30: constexpr int GRAD_OFFSET_IDX = 0;
31: constexpr int MOMENTUM1_OFFSET_IDX = 1;
32: constexpr int MOMENTUM2_OFFSET_IDX = 2;
33: 
34: template <typename T>
35: __aicore__ inline void AdamCompute(__local_mem__ T* dstG, __local_mem__ T* dstM1, __local_mem__ T* dstM2,
36:                                    __local_mem__ T* srcG, __local_mem__ T* srcM1, __local_mem__ T* srcM2,
37:                                    uint32_t calCount, uint16_t repeatCount, uint32_t oneRepeat,
38:                                    float eps, float beta1, float oneMinusBeta1, float beta2, float oneMinusBeta2,
39:                                    float stepSize)
40: {
41:     AscendC::MicroAPI::RegTensor<T> dstVregG;
42:     AscendC::MicroAPI::RegTensor<T> dstVregM1;
43:     AscendC::MicroAPI::RegTensor<T> dstVregM2;
44:     AscendC::MicroAPI::RegTensor<T> srcVregG;
45:     AscendC::MicroAPI::RegTensor<T> srcVregM1;
46:     AscendC::MicroAPI::RegTensor<T> srcVregM2;
47:     AscendC::MicroAPI::MaskReg mask;
48: 
49:     for (uint16_t i = 0; i < repeatCount; ++i) {
50:         mask = AscendC::MicroAPI::UpdateMask<uint32_t>(calCount);
51:         AscendC::MicroAPI::DataCopy(srcVregG, srcG + i * oneRepeat);
52:         AscendC::MicroAPI::DataCopy(srcVregM1, srcM1 + i * oneRepeat);
53:         AscendC::MicroAPI::DataCopy(srcVregM2, srcM2 + i * oneRepeat);
54: 
55:         AscendC::MicroAPI::Muls(dstVregM1, srcVregM1, beta1, mask);
56:         AscendC::MicroAPI::Muls(dstVregG, srcVregG, oneMinusBeta1, mask);
57:         AscendC::MicroAPI::Add(dstVregM1, dstVregM1, dstVregG, mask);
58: 
59:         AscendC::MicroAPI::Muls(dstVregM2, srcVregM2, beta2, mask);
60:         AscendC::MicroAPI::Mul(dstVregG, srcVregG, srcVregG, mask);
61:         AscendC::MicroAPI::Muls(dstVregG, dstVregG, oneMinusBeta2, mask);
62:         AscendC::MicroAPI::Add(dstVregM2, dstVregM2, dstVregG, mask);
63: 
64:         AscendC::MicroAPI::Sqrt(srcVregM2, dstVregM2, mask);
65:         AscendC::MicroAPI::Adds(srcVregM2, srcVregM2, eps, mask);
66:         AscendC::MicroAPI::Div(dstVregG, dstVregM1, srcVregM2, mask);
67:         AscendC::MicroAPI::Muls(dstVregG, dstVregG, stepSize, mask);
68: 
69:         AscendC::MicroAPI::DataCopy(dstG + i * oneRepeat, dstVregG, mask);
70:         AscendC::MicroAPI::DataCopy(dstM1 + i * oneRepeat, dstVregM1, mask);
71:         AscendC::MicroAPI::DataCopy(dstM2 + i * oneRepeat, dstVregM2, mask);
72:     }
73: }
74: 
75: class BackwardCodegenAdamUnweightedExactKernel : public BackwardCodegenUnweightedExactKernel {
76: public:
77:     __aicore__ inline BackwardCodegenAdamUnweightedExactKernel() {}
78: 
79:     __aicore__ inline void InitAdam(Args args)
80:     {

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_rowwise_adagrad_unweighted_exact_kernel.h (truncated) ---
1: /**
2:  * @file backward_codegen_rowwise_adagrad_unweighted_exact_kernel.h
3:  *
4:  * Copyright (C) 2025. Huawei Technologies Co., Ltd. All rights reserved.
5:  * This program is distributed in the hope that it will be useful,
6:  * but WITHOUT ANY WARRANTY; without even the implied warranty of
7:  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
8:  */
9: 
10: #ifndef BACKWARD_CODEGEN_ROWWISE_ADAGRAD_UNWEIGHTED_EXACT_KERNEL_H
11: #define BACKWARD_CODEGEN_ROWWISE_ADAGRAD_UNWEIGHTED_EXACT_KERNEL_H
12: 
13: #include "kernel_operator.h"
14: 
15: #include <type_traits>
16: #include "backward_codegen_unweighted_exact_kernel.h"
17: 
18: 
19: /// Padding number for momentum storage
20: constexpr int64_t MOMENTUM_STORAGE_PAD_NUM = 16;
21: 
22: /// Number of output tensors
23: constexpr int OUTPUT_TENSOR_COUNT = 2;
24: /// Index for output gradient tensor in the output tensors array
25: constexpr int OUTPUT_GRADIENT_TENSOR_INDEX = 0;
26: /// Index for output momentum tensor in the output tensors array
27: constexpr int OUTPUT_MOMENTUM_TENSOR_INDEX = 1;
28: 
29: using namespace AscendC;
30: using namespace BackwardCodegenUnweightedExact;
31: 
32: namespace BackwardCodegenRowwiseAdagradUnweightedExact {
33: /**
34:  * Performs Adagrad computation for rowwise updates
35:  *
36:  * @tparam T Data type
37:  * @param dstGrad Destination gradient tensor
38:  * @param dstMoment Destination moment tensor
39:  * @param srcGrad Source gradient tensor
40:  * @param srcMoment Source moment tensor
41:  * @param calCount Number of elements to calculate
42:  * @param repeatCount Number of repeat operations
43:  * @param oneRepeat Size of one repeat operation
44:  * @param eps Epsilon value for numerical stability
45:  * @param learning_rate Learning rate
46:  * @param invEmbedDim Inverse of embedding dimension
47:  */
48: template <typename T>
49: __aicore__ __simd_vf__ inline void AdagradCompute(__local_mem__ T* dstGrad, __local_mem__ T* dstMoment,
50:                                                   __local_mem__ T* srcGrad, __local_mem__ T* srcMoment,
51:                                                   uint32_t calCount, uint16_t repeatCount, uint32_t oneRepeat,
52:                                                   float eps, float learning_rate, float invEmbedDim)
53: {
54:     // === Scalar mask: must be a variable (lvalue) ===
55:     uint32_t scalarLen = 1;
56:     auto maskScalar = AscendC::MicroAPI::UpdateMask<uint32_t>(scalarLen);
57: 
58:     // --- Step 1: Compute total sum of squared gradients ---
59:     AscendC::MicroAPI::RegTensor<float> vSumTotal;
60:     AscendC::MicroAPI::Duplicate(vSumTotal, 0.0f, maskScalar);
61: 
62:     // 在函数开始处声明所有需要的变量
63:     uint32_t offset, remaining, blockLen;
64:     AscendC::MicroAPI::RegTensor<float> vGrad, vGradSq, vSumSq, vOutGrad;
65:     
66:     for (uint16_t i = 0; i < repeatCount; ++i) {
67:         offset = i * oneRepeat;
68:         remaining = calCount - offset;
69:         blockLen = (remaining > oneRepeat) ? oneRepeat : remaining;
70: 
71:         // === Vector mask: must be a variable ===
72:         auto maskVec = AscendC::MicroAPI::UpdateMask<uint32_t>(blockLen);
73: 
74:         AscendC::MicroAPI::DataCopy(vGrad, srcGrad + offset);
75:         AscendC::MicroAPI::Mul(vGradSq, vGrad, vGrad, maskVec);
76:         AscendC::MicroAPI::Reduce<AscendC::MicroAPI::ReduceType::SUM>(vSumSq, vGradSq, maskVec);
77:         AscendC::MicroAPI::Add(vSumTotal, vSumTotal, vSumSq, maskScalar);
78:     }
79: 
80:     AscendC::MicroAPI::Muls(vSumTotal, vSumTotal, invEmbedDim, maskScalar);

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_sgd_unweighted_exact_kernel_unique.h (truncated) ---
1: /* Copyright (c) Huawei Technologies Co., Ltd. 2026. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef BACKWARD_CODEGEN_SGD_UNWEIGHTED_EXACT_KERNEL_UNIQUE_FUN_H
17: #define BACKWARD_CODEGEN_SGD_UNWEIGHTED_EXACT_KERNEL_UNIQUE_FUN_H
18: 
19: #include <cstdint>
20: 
21: #include "kernel_operator.h"
22: #include "backward_codegen_unweighted_exact_kernel_unique.h"
23: 
24: using namespace AscendC;
25: using namespace BackwardCodegenUnweightedExact;
26: using namespace BackwardCodegenUnweightedExactUnique;
27: 
28: namespace BackwardCodegenUnweightedSgdExactUnique {
29: 
30: class BackwardCodegenSgdUnweightedExactKernelUnique : public BackwardCodegenUnweightedExactKernelUnique {
31: public:
32:     __aicore__ inline BackwardCodegenSgdUnweightedExactKernelUnique() {}
33:     
34:     __aicore__ inline void SgdScheduler()
35:     {
36:         int64_t lastIndices = 0;
37:         for (int64_t i = 1; i < this->uniqueHashDim0; i++) {
38:             if (this->uniqueHashSizeGT.GetValue(i) != lastIndices) { // 每张表上的indices尽量均分到每张卡上
39:                 Scheduler(this->uniqueHashSizeGT.GetValue(i) - lastIndices, this->offsetOfThisCore, thisTableLen);
40:                 if (thisTableLen > 0) {
41:                     tableIndex = i - 1;
42:                     thisTableOffset = this->offsetOfThisCore + lastIndices;
43:                     UpdateEmbedSgd();
44:                 }
45:                 lastIndices = this->uniqueHashSizeGT.GetValue(i);
46:             }
47:         }
48:     }
49: 
50:     __aicore__ inline void ComputeSgd(LocalTensor<float>inputLt, LocalTensor<float>outLt, int64_t totalLen)
51:     {
52:         int64_t thisGradIndex = 0;
53: 
54:         float minusLearningRate = -this->learning_rate;
55: 
56:         // p[:] -= learning_rate * g[:]
57:         Muls<float>(outLt[thisGradIndex], inputLt[thisGradIndex], minusLearningRate, totalLen);
58:     }
59: 
60:     __aicore__ inline void CopyInNormal(int64_t *updateArgs, int thisLen, int embedDim)
61:     {
62:         __gm__ int64_t* weightsOffsetsPtr = (__gm__ int64_t*)this->weightsOffsets;
63:         LocalTensor<float> inputLt = this->queIn.template DeQue<float>();
64:         for (int64_t i = 0; i < thisLen; i++) {
65:             int64_t thisIndForThisTable = this->uniqueIdGT.GetValue(thisTableOffset + i);
66:             int64_t thisWeightOffset = *(weightsOffsetsPtr + tableIndex);
67:             updateArgs[i] = thisWeightOffset + thisIndForThisTable * embedDim;
68:         }
69:         this->queIn.template EnQue(inputLt);
70:     }
71:     
72:     __aicore__ inline void CopyOutNormal(int64_t *outOffset, int thisLen, int embedDim)
73:     {
74:         LocalTensor<float> newOutLt = this->queOut.template DeQue<float>();
75:         SetAtomicAdd<float>();
76:         for (int64_t i = 0; i < thisLen; i++) {
77:             int thisGradIndex = i * this->maxD;
78:             DataCopy(this->weightsDevOutGT[outOffset[i]], newOutLt[thisGradIndex], embedDim);
79:         }
80:         SetAtomicNone();

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_sgd_unweighted_exact_kernel.h (truncated) ---
1: /* Copyright 2025. Huawei Technologies Co.,Ltd. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef BACKWARD_CODEGEN_SGD_UNWEIGHTED_EXACT_KERNEL_FUN_H
17: #define BACKWARD_CODEGEN_SGD_UNWEIGHTED_EXACT_KERNEL_FUN_H
18: 
19: #include <cstdint>
20: 
21: #include "kernel_operator.h"
22: #include "backward_codegen_unweighted_exact_kernel.h"
23: 
24: using namespace AscendC;
25: using namespace BackwardCodegenUnweightedExact;
26: 
27: namespace BackwardCodegenSgdUnweightedExact {
28: 
29: class BackwardCodegenSgdUnweightedExactKernel : public BackwardCodegenUnweightedExactKernel {
30: public:
31:     __aicore__ inline BackwardCodegenSgdUnweightedExactKernel() {}
32: 
33:     __aicore__ inline void InitSgd(Args args)
34:     {
35:         GET_TILING_DATA(tilingData, args.tiling);
36: 
37:         numOfOut = 1;  // 输出个数为1：grad
38:         indicesNumOneBlock = blockLen / numOfOut / maxD;
39:         if (indicesNumOneBlock >= MAX_ARGS_PIPE_LEN) {
40:             indicesNumOneBlock = MAX_ARGS_PIPE_LEN;
41:         }
42:     }
43: 
44:     __aicore__ inline void Tilling()
45:     {
46:         int64_t allLen = totalHashSize;
47:         int64_t totalTableSizeSplit = allLen % GetBlockNum();
48:         int64_t aCoreTableLen = allLen / GetBlockNum();
49: 
50:         if (GetBlockIdx() >= totalTableSizeSplit) {
51:             thisTableLen = aCoreTableLen;
52:             thisTableOffset =
53:                     totalTableSizeSplit * (aCoreTableLen + 1) + (GetBlockIdx() - totalTableSizeSplit) * aCoreTableLen;
54:         } else {
55:             thisTableLen = aCoreTableLen + 1;
56:             thisTableOffset = GetBlockIdx() * (aCoreTableLen + 1);
57:         }
58: 
59:         for (int64_t i = weightsOffsetsDim0; i >= 0; i--) {
60:             if (thisTableOffset >= hashSizeCumsumGT.GetValue(i)) {
61:                 tableIndex = i;
62:                 break;
63:             }
64:         }
65:     }
66: 
67:     __aicore__ inline int64_t FillUpdateArgs(UpdateArgs* updateArgs, int64_t& remain)
68:     {
69:         __gm__ int32_t* dOffsetsPtr = (__gm__ int32_t*)dOffsets;
70:         __gm__ int64_t* weightsOffsetsPtr = (__gm__ int64_t*)weightsOffsets;
71: 
72:         int64_t tableHashStart = hashSizeCumsumGT.GetValue(tableIndex);
73:         int64_t tableHashEnd = hashSizeCumsumGT.GetValue(tableIndex + 1);
74:         int64_t embedDim = *(dOffsetsPtr + tableIndex + 1) - *(dOffsetsPtr + tableIndex);
75:         int64_t weightOffsetBase = *(weightsOffsetsPtr + tableIndex);
76: 
77:         int64_t cnt = 0;
78:         while (cnt < indicesNumOneBlock && remain > 0) {
79:             int64_t thisIndForTotalTable = thisTableOffset + thisTableLen - remain;
80:             remain = remain - 1;

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_unweighted_exact_kernel_unique.h (truncated) ---
1: /* Copyright 2025. Huawei Technologies Co.,Ltd. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef BACKWARD_CODEGEN_UNWEIGHTED_EXACT_KERNEL_UNIQUE_FUN_H
17: #define BACKWARD_CODEGEN_UNWEIGHTED_EXACT_KERNEL_UNIQUE_FUN_H
18: 
19: #include <cstdint>
20: 
21: #include "kernel_operator.h"
22: #include "backward_codegen_unweighted_exact_kernel.h"
23: using namespace AscendC;
24: using namespace BackwardCodegenUnweightedExact;
25: namespace BackwardCodegenUnweightedExactUnique {
26: 
27: constexpr int M1_INDEX = 1;
28: constexpr int M2_INDEX = 2;
29: 
30: struct ComputeUniqueArgs {
31:     int64_t tableIndex;
32:     int64_t embedDim;
33:     int64_t inOffset;
34:     int64_t thisLen;
35:     int64_t startInd;
36:     int64_t weightsAddr;
37:     int64_t m1Addr;
38:     int64_t m2Addr;
39: };
40: 
41: struct DynamicArgs {
42:     int64_t weightsAddr;
43:     int64_t m1Addr;
44:     int64_t m2Addr;
45: };
46: 
47: __aicore__ inline void Scheduler(const int64_t &totalLen, int64_t &offsetLen, int64_t &calcLen)
48: {
49:     int64_t splitBaseLen = totalLen / GetBlockNum();
50:     int64_t tailSplitIndex = totalLen % GetBlockNum();
51:     if (GetBlockIdx() >= tailSplitIndex) {
52:         calcLen = splitBaseLen;
53:         offsetLen =
54:             tailSplitIndex * (splitBaseLen + 1) + (GetBlockIdx() - tailSplitIndex) * splitBaseLen;
55:     } else {
56:         calcLen = splitBaseLen + 1;
57:         offsetLen = GetBlockIdx() * (splitBaseLen + 1);
58:     }
59: }
60: 
61: class BackwardCodegenUnweightedExactKernelUnique : public BackwardCodegenUnweightedExactKernel {
62: public:
63:     __aicore__ inline BackwardCodegenUnweightedExactKernelUnique() {}
64: 
65:     __aicore__ inline void InitUnique(Args args)
66:     {
67:         GET_TILING_DATA(tilingData, args.tiling);
68:         uniqueId = args.uniqueId;
69:         uniqueInverse = args.uniqueInverse;
70:         uniqueHashSize = args.uniqueHashSize;
71:         indiceSizeCumsum = args.indiceSizeCumsum;
72: 
73:         uniqueHashDim0 = tilingData.uniqueHashDim0;
74: 
75:         uniqueHashSizeGT.SetGlobalBuffer((__gm__ int64_t*)uniqueHashSize, uniqueHashDim0);
76:         uniqueInverseGT.SetGlobalBuffer((__gm__ int64_t*)uniqueInverse, indicesDim0);
77: 
78:         offsetsGT.SetGlobalBuffer((__gm__ int64_t*)offsets, offsetsDim0);
79:         dOffsetsGT.SetGlobalBuffer((__gm__ int32_t*)dOffsets, dOffsetsDim0);
80: 

--- cust_op/ascendc_op/ai_core_op/backward_codegen_adagrad_unweighted_exact/c310/op_kernel/backward_codegen_unweighted_exact_kernel.h (truncated) ---
1: /* Copyright 2025. Huawei Technologies Co.,Ltd. All rights reserved.
2: 
3: Licensed under the Apache License, Version 2.0 (the "License");
4: you may not use this file except in compliance with the License.
5: You may obtain a copy of the License at
6: 
7:         http://www.apache.org/licenses/LICENSE-2.0
8: 
9: Unless required by applicable law or agreed to in writing, software
10: distributed under the License is distributed on an "AS IS" BASIS,
11: WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: See the License for the specific language governing permissions and
13:         limitations under the License.
14: ==============================================================================*/
15: 
16: #ifndef BACKWARD_CODEGEN_UNWEIGHTED_EXACT_KERNEL_KERNEL_FUN_H
17: #define BACKWARD_CODEGEN_UNWEIGHTED_EXACT_KERNEL_KERNEL_FUN_H
18: 
19: #include <cstdint>
20: 
21: #include "kernel_operator.h"
22: 
23: using namespace AscendC;
24: 
25: namespace BackwardCodegenUnweightedExact {
26: 
27: constexpr int USE_QUEUE_NUM = 2;
28: constexpr int USE_BUFFER_NUM = 2;
29: constexpr int DATA_ALIGN_BYTES = 32;
30: constexpr int DATA_TYPE_INT64 = 1;
31: constexpr int FLOAT_ALIGNMENT = 8;
32: constexpr int INT_ALIGNMENT = 8;
33: constexpr int DATA_TYPE_FLOAT32 = 0;
34: constexpr int SUM_POOL = 0;
35: constexpr int MEAN_POOL = 1;
36: constexpr int NONE_POOL = 2;
37: 
38: enum class UpdateState : uint32_t {
39:     CLEAR = 0,         // 初始状态
40:     NEED_UPDATE = 1,   // 需要更新状态
41:     COMPUTE_GRAD = 2   // 计算梯度状态
42: };
43: 
44: enum class TriadIndex : int64_t {
45:     UNIQUE_INDEX = 0,      // 唯一索引在三元组中的位置
46:     WEIGHT_OFFSET = 1,     // 权重偏移在三元组中的位置
47:     EMBED_DIM = 2,         // 嵌入维度在三元组中的位置
48:     ACCESS_STRIDE = 3      // 访问三元组元素的步长
49: };
50: 
51: constexpr int MAX_ARGS_PIPE_LEN = 300;
52: constexpr int FLAG_LEN = DATA_ALIGN_BYTES / sizeof(uint32_t);
53: constexpr uint32_t MAX_THREADS_PER_BLOCK = 1024;
54: 
55: struct Args {
56:     GM_ADDR gradOutput;
57:     GM_ADDR devWeights;
58:     GM_ADDR weightsPlacements;
59:     GM_ADDR weightsOffsets;
60:     GM_ADDR dOffsets;
61:     GM_ADDR hashSizeCumsum;
62:     GM_ADDR indices;
63:     GM_ADDR offsets;
64:     GM_ADDR momentum1Dev;
65:     GM_ADDR momentum2Dev;
66:     GM_ADDR hashIndices;
67:     GM_ADDR uniqueId;
68:     GM_ADDR uniqueHashSize;
69:     GM_ADDR uniqueInverse;
70:     GM_ADDR indiceSizeCumsum;
71: 
72:     GM_ADDR out;
73:     GM_ADDR momentum1DevOut;
74:     GM_ADDR momentum2DevOut;
75:     GM_ADDR weightsDevOut;
76: 
77:     GM_ADDR workspace;
78:     GM_ADDR tiling;
79: };
80: 

Developer documentation requirements:
- Include source anchors for important claims: file path, visible symbol/function/class name when available, and why the anchor matters.
- Include a runbook when operational evidence exists: build, validation, deployment, rollback, and failure-mode notes.
- Include debugging guidance for each major module: symptom, likely source area, and command or file to inspect.
- State certainty boundaries: mark source-confirmed facts separately from inferred behavior or missing evidence.
