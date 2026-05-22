# Ohos Pasteboard 中间设计文档（CLI 组件）

## 1. 模块定位

**作用**  
`tools/ohos-pasteboard` 是 OpenHarmony 的剪贴板命令行工具（`ohos-pasteboard`），承担“本地文本/HTML/URI 剪贴板数据读写与状态查询”的单点入口，提供面向运维/脚本/自动化场景的统一 CLI 访问。该模块不承载系统级剪贴板服务实现，而是作为调用 `PasteboardClient` 的上层适配层。

**证据锚点**  
- 工具说明与安装信息：[`docs/README.md`](tools/ohos-pasteboard/docs/README.md)  
- 命令执行目标/路径定义：[`ohos-pasteboard.json`](tools/ohos-pasteboard/ohos-pasteboard.json)  
- 工具入口：[`src/main.cpp#L24`](tools/ohos-pasteboard/src/main.cpp)

## 2. 目录结构与文件职责（白盒）

| 路径 | 角色 |
|---|---|
| `src/main.cpp` | CLI 入口，收集参数并触发命令执行入口 |
| `src/executor.cpp` | 全局命令注册、帮助生成、命令路由与分发 |
| `src/parser.cpp` | 参数解析与参数校验（`--text/--html/--uri`、`--type`） |
| `src/printer.cpp` | 统一 JSON 输出构造（成功/失败）与帮助输出 |
| `src/error_handler.cpp` | `PasteboardError` 到标准错误码映射 |
| `src/{set, get, clear, has-data, has-data-type, has-remote-data}_command.cpp` | 各命令的执行实现 |
| `include/*.h` | 命令接口、解析器、执行器、打印器、错误处理器声明 |
| `tests/*.cpp` | 解析、执行、错误映射、集成流程的单元测试与集成测试 |
| `docs/*.md` | 命令约定、错误码、JSON 结构、测试矩阵 |
| `ohos-pasteboard.json` | CLI 子命令、权限与 I/O schema 元信息 |

## 3. 核心组件（白盒层次）

### 3.1 命令抽象与注册

- `Command`：纯虚接口，定义命令元信息与执行入口（`GetName/GetDescription/GetUsage/GetExamples/GetParameters/Execute`）。  
  锚点：[`include/command.h`](tools/ohos-pasteboard/include/command.h)
- `CommandRegistry`：单例命令注册中心，按名称查找命令并返回所有命令名。  
  锚点：[`CommandRegistry`](tools/ohos-pasteboard/include/command.h)
- `ExecuteCommand`：执行管道入口，处理空参、`--help`、未知命令、命令级 `--help` 与具体命令执行。  
  锚点：[`src/executor.cpp:ExecuteCommand`](tools/ohos-pasteboard/src/executor.cpp)

### 3.2 参数解析器

- `ParamParser`：通用参数按键查找（`FindParam`）和存在性检测（`HasParam`）。  
  锚点：[`src/parser.cpp:ParamParser`](tools/ohos-pasteboard/src/parser.cpp)
- `SpecialParser::ParseSetData`：要求至少一个 `--text/--html/--uri`，提取并保持原始顺序；参数缺失或空值会报错。  
  锚点：[`src/parser.cpp:SpecialParser::ParseSetData`](tools/ohos-pasteboard/src/parser.cpp)
- `SpecialParser::ParseHasDataType`：要求 `--type` 存在；仅返回字符串，不做 MIME 格式白名单校验。  
  锚点：[`src/parser.cpp:SpecialParser::ParseHasDataType`](tools/ohos-pasteboard/src/parser.cpp)

### 3.3 输出与错误策略

- `OutputPrinter::PrintSuccess` / `PrintError`：统一输出 `{type:"result", status:...}`，错误含 `errCode/errMsg/suggestion`。  
  锚点：[`src/printer.cpp`](tools/ohos-pasteboard/src/printer.cpp)
- `ErrorHandler`：将 `PasteboardError` 映射到 CLI 错误码，分为“设置类”和“获取类”。  
  锚点：[`src/error_handler.cpp`](tools/ohos-pasteboard/src/error_handler.cpp)

### 3.4 命令实现（6 个子命令）

- `SetDataCommand`：构建 `PasteData` 与 `PasteDataRecord`，调用 `PasteboardClient::SetPasteData`。  
  锚点：[`src/set_data_command.cpp`](tools/ohos-pasteboard/src/set_data_command.cpp)
- `GetDataCommand`：调用 `PasteboardClient::GetPasteData`，序列化 records。  
  锚点：[`src/get_data_command.cpp`](tools/ohos-pasteboard/src/get_data_command.cpp)
- `ClearDataCommand`：调用 `PasteboardClient::Clear`。  
  锚点：[`src/clear_data_command.cpp`](tools/ohos-pasteboard/src/clear_data_command.cpp)
- `HasDataCommand`：调用 `PasteboardClient::HasPasteData`。  
  锚点：[`src/has_data_command.cpp`](tools/ohos-pasteboard/src/has_data_command.cpp)
- `HasDataTypeCommand`：调用 `PasteboardClient::HasDataType`。  
  锚点：[`src/has_data_type_command.cpp`](tools/ohos-pasteboard/src/has_data_type_command.cpp)
- `HasRemoteDataCommand`：调用 `PasteboardClient::HasRemoteData`。  
  锚点：[`src/has_remote_data_command.cpp`](tools/ohos-pasteboard/src/has_remote_data_command.cpp)

## 4. 核心流程

1. 进程启动收集参数并委托 `ExecuteCommand`。  
   锚点：[`src/main.cpp`](tools/ohos-pasteboard/src/main.cpp) + [`src/executor.cpp`](tools/ohos-pasteboard/src/executor.cpp)
2. `ExecuteCommand` 初始化命令表（6 个命令），并根据第一个 token 找到命令。  
   锚点：[`src/executor.cpp:RegisterAllCommands`](tools/ohos-pasteboard/src/executor.cpp)
3. 命令参数含 `--help` 时打印帮助；否则调用具体命令 `Execute`。  
   锚点：[`src/executor.cpp`](tools/ohos-pasteboard/src/executor.cpp)
4. 每个命令：
   - 获取 `PasteboardClient::GetInstance()`；若为空直接返回 `ERR_INTERNAL_ERROR`。
   - 调用对应客户端 API（set/get/clear/has*）。
   - 根据返回码输出成功 JSON 或经 `ErrorHandler` 转码后输出错误 JSON。  
   锚点：各命令实现 + [`src/error_handler.cpp`](tools/ohos-pasteboard/src/error_handler.cpp)

## 5. 接口与数据结构（模块内白盒定义）

### 5.1 命令与行为

| 子命令 | 入口类 | 关键接口 | 主要输入 | 主要输出 |
|---|---|---|---|---|
| set-data | `SetDataCommand` | `Execute` | `--text/--html/--uri` 至少一项 | `primaryMimeType` / `recordCount` |
| get-data | `GetDataCommand` | `Execute` | 无 | `records[]`, `recordCount`, `mimeTypes[]` |
| clear-data | `ClearDataCommand` | `Execute` | 无 | 空数据对象 |
| has-data | `HasDataCommand` | `Execute` | 无 | `hasData` |
| has-data-type | `HasDataTypeCommand` | `Execute` | `--type` | `hasType`, `type` |
| has-remote-data | `HasRemoteDataCommand` | `Execute` | 无 | `hasRemoteData` |

- 命令声明与 I/O schema 在 `ohos-pasteboard.json` 中有约束定义，且 `get-data`/`set-data` 的返回字段可被 schema 与实现代码互相印证。  
  锚点：[`ohos-pasteboard.json`](tools/ohos-pasteboard/ohos-pasteboard.json)

### 5.2 内部参数结构

- `SpecialParser::SetDataResult`：`success/errMsg/orderedParams`（保留参数顺序）。  
  锚点：[`include/parser.h:SpecialParser::SetDataResult`](tools/ohos-pasteboard/include/parser.h)
- `SpecialParser::HasDataTypeResult`：`success/errMsg/type`。  
  锚点：[`include/parser.h:SpecialParser::HasDataTypeResult`](tools/ohos-pasteboard/include/parser.h)

### 5.3 错误码体系

- 模块文档列举了标准错误码（例如 `ERR_PERMISSION_DENIED/ERR_DATA_EXPIRED/ERR_SERVICE_UNAVAILABLE` 等）。  
  锚点：[`docs/README.md`](tools/ohos-pasteboard/docs/README.md)
- 实际映射来自两个表：设置类和获取类。  
  锚点：[`src/error_handler.cpp`](tools/ohos-pasteboard/src/error_handler.cpp)

## 6. 关键约束与边界条件

1. 本工具目标数据类型限定为 HTML、URI、纯文本（文档与实现一致）。  
   锚点：[`docs/README.md`](tools/ohos-pasteboard/docs/README.md)、[`include/set_data_command.h`](tools/ohos-pasteboard/include/set_data_command.h)、[`src/set_data_command.cpp`](tools/ohos-pasteboard/src/set_data_command.cpp)
2. `set-data` 至少必须提供一个有效参数；全空/缺参直接返回 `ERR_ARG_INVALID`（由解析器 + 命令层联合返回）。  
   锚点：[`src/parser.cpp:ParseSetData`](tools/ohos-pasteboard/src/parser.cpp)、[`src/set_data_command.cpp:Execute`](tools/ohos-pasteboard/src/set_data_command.cpp)
3. `has-data-type` 只做参数存在性检查，不做 MIME 格式白名单验证；运行时行为可能接受非标准值。  
   锚点：[`src/parser.cpp:ParseHasDataType`](tools/ohos-pasteboard/src/parser.cpp)、[`ohos-pasteboard.json`](tools/ohos-pasteboard/ohos-pasteboard.json)
4. 获取/设置失败统一以 JSON 失败响应返回，不抛异常。  
   锚点：[`src/printer.cpp`](tools/ohos-pasteboard/src/printer.cpp)
5. 帮助输出不返回 JSON，而是直接 `stdout` 打印。  
   锚点：[`src/printer.cpp:PrintHelp`](tools/ohos-pasteboard/src/printer.cpp)、[`src/executor.cpp`](tools/ohos-pasteboard/src/executor.cpp)、[`tests/executor_test.cpp`](tools/ohos-pasteboard/tests/executor_test.cpp)

## 7. 主要测试与质量证据

- 文档测试覆盖：解析器 15、打印 3、错误处理 12、执行器 10、集成 8，共 46。  
  锚点：[`docs/TEST.md`](tools/ohos-pasteboard/docs/TEST.md)
- 单测与集成分布在五个 suite：`ParserTest`、`PrinterTest`、`ErrorHandlerTest`、`ExecutorTest`、`IntegrationTest`。  
  锚点：[`tests/parser_test.cpp`](tools/ohos-pasteboard/tests/parser_test.cpp)、[`tests/printer_test.cpp`](tools/ohos-pasteboard/tests/printer_test.cpp)、[`tests/error_handler_test.cpp`](tools/ohos-pasteboard/tests/error_handler_test.cpp)、[`tests/executor_test.cpp`](tools/ohos-pasteboard/tests/executor_test.cpp)、[`tests/integration_test.cpp`](tools/ohos-pasteboard/tests/integration_test.cpp)
- 测试构建目标与依赖信息在 `tests/BUILD.gn`，用于与主模块联动编译。  
  锚点：[`tests/BUILD.gn`](tools/ohos-pasteboard/tests/BUILD.gn)

## 8. 调试指导（按模块）

| 模块 | 典型症状 | 首选定位点 |
|---|---|---|
| 命令路由 | `ohos-pasteboard foo` 返回 `ERR_CMD_INVALID` | [`src/executor.cpp:ExecuteCommand`](tools/ohos-pasteboard/src/executor.cpp) |
| 全局/子命令帮助异常 | 无输出或输出格式错误 | [`src/executor.cpp:BuildGlobalHelp/BuildCommandHelp`](tools/ohos-pasteboard/src/executor.cpp) + 对应测试 |
| 参数解析错误 | `set-data` 返回 `ERR_ARG_INVALID` 或 `ERR_ARG_MISSING` | [`src/parser.cpp`](tools/ohos-pasteboard/src/parser.cpp) + `tests/parser_test.cpp` |
| set-data 无法写入 | `set-data` 返回错误码（如 `ERR_SERVICE_UNAVAILABLE`） | [`src/set_data_command.cpp:SetDataCommand::Execute`](tools/ohos-pasteboard/src/set_data_command.cpp)、[`src/error_handler.cpp:HandleSetPasteDataError`](tools/ohos-pasteboard/src/error_handler.cpp) |
| get-data 返回失败 | `ERR_PERMISSION_DENIED`/`ERR_NO_DATA` 等 | [`src/get_data_command.cpp`](tools/ohos-pasteboard/src/get_data_command.cpp)、[`src/error_handler.cpp:HandleGetPasteDataError`](tools/ohos-pasteboard/src/error_handler.cpp) |
| has-* 命令全为空 | `hasData/hasType` 总是 false 但预期有值 | [`src/*_command.cpp`](tools/ohos-pasteboard/src/has_data_command.cpp)、`PasteboardClient::GetInstance()` 可用性 |
| JSON 输出格式偏差 | `type`/`status` 不符合 schema | [`src/printer.cpp`](tools/ohos-pasteboard/src/printer.cpp)、`docs/TEST.md` 验证项 |

## 9. 运行手册（基于现有证据）

### 9.1 构建（源代码级）
- 模块目标定义：[`BUILD.gn`](tools/ohos-pasteboard/BUILD.gn)（`ohos_cli_executable("ohos-pasteboard")`）
- 测试目标：`tests/BUILD.gn` 中 `ohos_unittest("ExecuteCommandTest")`  
  锚点：[`tests/BUILD.gn`](tools/ohos-pasteboard/tests/BUILD.gn)
- 文档给出的可参考构建命令（测试链）：`hb build pasteboard -t --no-prebuilt-sdk --ignore-api-check --skip-partlist-check --skip-download --skip-prebuilts`  
  锚点：[`docs/TEST.md`](tools/ohos-pasteboard/docs/TEST.md)

### 9.2 验证
- 集成测试工作流与单测执行命令见文档。  
  锚点：[`docs/TEST.md`](tools/ohos-pasteboard/docs/TEST.md)
- 预期：`46` 用例、`5` 测试套件、`46` tests from 5 suites（由文档描述）。  
  锚点：[`docs/TEST.md`](tools/ohos-pasteboard/docs/TEST.md)

### 9.3 部署
- 目标安装路径：`/system/bin/cli_tool/executable/ohos-pasteboard`。  
  锚点：[`docs/README.md`](tools/ohos-pasteboard/docs/README.md)、[`ohos-pasteboard.json:executablePath`](tools/ohos-pasteboard/ohos-pasteboard.json)
- 子命令能力与输出 schema 在 `ohos-pasteboard.json` 定义。  
  锚点：[`ohos-pasteboard.json`](tools/ohos-pasteboard/ohos-pasteboard.json)

### 9.4 回滚
- 源码层无显式回滚脚本；按当前证据应采用部署层回滚（替换可执行文件/恢复镜像版本）。  
  说明：该行为为部署策略推断，不在当前源码中直接给出。

### 9.5 常见失败模式
- `ERR_INTERNAL_ERROR`：`PasteboardClient::GetInstance()` 为空。  
  触发点：各命令 `Execute` 首步空实例检查。  
- `ERR_ARG_INVALID`：`set-data` 无参数/参数空值。  
  触发点：`ParseSetData`。  
- `ERR_ARG_MISSING`：`has-data-type` 缺 `--type`。  
  触发点：`HasDataTypeCommand::Execute`。  
- `ERR_PERMISSION_DENIED`：涉及读取权限场景返回。  
  触发点：`HandleGetPasteDataError` 映射到 `PERMISSION_VERIFICATION_ERROR`。

## 10. 证据边界

### 10.1 已有源码/文档直接确认
- 命令路由、注册、帮助、错误返回链路。  
- `set/get/clear/has*` 六类命令实现存在且使用 `PasteboardClient`。  
- 错误码映射表与 JSON 输出 schema 的实现。  
- 测试覆盖规模与五类套件分解。  
- 安装路径与子命令能力声明。

### 10.2 推断与缺失证据
- 回滚步骤、整机镜像级回退流程（源码未定义，需按厂商发布机制执行）。  
- `--type` 的最终白名单行为：虽然 JSON schema 限定了 `text/plain|text/html|text/uri`，解析层未严格校验；实际可接受值边界在 CLI 层更偏向“运行时下发后返回服务方结果”，需结合运行态验证确认。  
- `set-data` 使用多参数时实际“单记录承载多 MIME 条目”的内部语义是基于源码实现推导（`orderedParams` 仅第一个参数用于主记录创建，后续 `AddEntryByMimeType` 追加到同一 `record`）。