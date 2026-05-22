# Zidl 模块中间设计文档（`services/zidl`）

## 1. 模块目标与范围

`services/zidl` 是剪贴板服务中的 IPC 适配层（ZIDL/Service IPC），负责将上层剪贴板能力与系统服务内核逻辑解耦并通过代理/桩模型进行跨进程调用。模块是白盒中间设计层，不承担业务决策，只承担请求分发、回调转发和数据编解码边界职责。

已知依据文件集合：
- [include](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\)
- [src](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\src\)

核心证据约束：仓库只给出了以下 12+12 文件，未提供实现细节源码清单，因此符号细节以“文件级锚点 + 命名推断”给出。

## 2. 目录结构

```text
services/zidl/
  include/
    entity_recognition_observer_proxy.h
    entity_recognition_observer_stub.h
    pasteboard_delay_getter_client.h
    pasteboard_delay_getter_proxy.h
    pasteboard_delay_getter_stub.h
    pasteboard_disposable_observer_proxy.h
    pasteboard_disposable_observer_stub.h
    pasteboard_entry_getter_client.h
    pasteboard_entry_getter_proxy.h
    pasteboard_entry_getter_stub.h
    pasteboard_observer_proxy.h
    pasteboard_observer_stub.h
  src/
    entity_recognition_observer_proxy.cpp
    entity_recognition_observer_stub.cpp
    pasteboard_delay_getter_client.cpp
    pasteboard_delay_getter_proxy.cpp
    pasteboard_delay_getter_stub.cpp
    pasteboard_disposable_observer_proxy.cpp
    pasteboard_disposable_observer_stub.cpp
    pasteboard_entry_getter_client.cpp
    pasteboard_entry_getter_proxy.cpp
    pasteboard_entry_getter_stub.cpp
    pasteboard_observer_proxy.cpp
    pasteboard_observer_stub.cpp
```

## 3. 核心组件与职责映射（文件锚点）

| 组件 | 典型文件锚点 | 推断职责 | 设计目的 |
|---|---|---|---|
| Pasteboard 观察者代理/桩 | [proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_observer_proxy.h) / [stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_observer_stub.h) / `.cpp` 对应实现 | 上行事件订阅与回调分发（例如 `on/off` 风格更新通知） | 接收系统端变更事件并回调上层 |
| 可回收观察者代理/桩 | [disposable_observer_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_proxy.h) / [disposable_observer_stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_stub.h) | 生命周期可回收的观察者机制（推断用于防泄漏） | 约束回调对象生命周期，支持显式销毁 |
| 延迟获取客户端 | [delay_getter_client.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_client.h) / [delay_getter_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_proxy.h) / [delay_getter_stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_stub.h) | 延迟返回/异步结果拉取或等待型读取 | 缓解阻塞，提高跨进程调用鲁棒性 |
| 实体识别观察者 | [entity_recognition_observer_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\entity_recognition_observer_proxy.h) / [entity_recognition_observer_stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\entity_recognition_observer_stub.h) | 剪贴板内容实体识别结果回调通道（推断） | 支持“识别到内容变化/类型”类通知 |
| 条目获取客户端 | [entry_getter_client.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_client.h) / [entry_getter_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_proxy.h) / [entry_getter_stub.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_stub.h) | 条目级读取（按记录/字段） | 与 `PasteData`/`PasteDataRecord` 的读取路径对接 |

> 表中符号名为依据文件名推断的层级角色（未提供源码内符号清单时采用命名约定推断）。

## 4. 核心流程（推断自文件分工）

### 4.1 读写主链路（系统粘贴板数据）
1. 上层 API 调用（如获取/设置数据）由框架入口进入服务侧 client/proxy。
2. `pasteboard_entry_getter_proxy` 进行跨进程请求封装。
3. 服务端由 `pasteboard_entry_getter_stub` 解析并转交业务核心处理。
4. 返回 `PasteData` 相关结构（与 `framework`/`interfaces/kits` 中公开对象对齐）。

### 4.2 变更事件/观察者链路
1. 上层注册监听（如 `on('update', cb)`/`off` 的语义，在 README 系统 Pasteboard 接口可见）。
2. 观察者代理接收本地注册并绑定远端引用。
3. 服务端变更触发经 `pasteboard_observer_stub` 回调到代理。
4. 代理转调用户回调；如为一次性或可回收实例，则经过 `disposable_observer_*` 管理生命周期。

### 4.3 延迟获取
1. 上层发起“延迟/异步”获取需求。
2. `pasteboard_delay_getter_proxy` 发起 IPC 并将阻塞与回调分离。
3. 服务器端 `delay_getter_stub` 根据时序回包或轮询式返回。

### 4.4 实体识别事件
1. 实体识别能力触发时，service 端走 `entity_recognition_observer_*` 对应通道透传；
2. 上层可接收富语义通知并决定二次读取/展示策略。

## 5. 接口与数据结构映射（边界说明）

该模块作为服务通信层，直接接触或传递的对象以框架层 API 为主，主要包括（源于仓库 README/README_ZH 的公开能力）：
- 剪贴板对象与操作：`SystemPasteboard`（`getPasteData`/`setPasteData`/`hasPasteData`/`clear`/`on`/`off`）
- 数据承载对象：`PasteData`, `PasteDataRecord`, `PasteDataProperty`
- 记录字段/属性：`mimeTypes`, `tag`, `timestamp`, `localOnly`, `additions`
- 兼容 API 变体：回调式、Promise 式、以及某些版本标识的转换接口（如 `convertToTextV9` 在中文文档中出现）

> 说明：上述类型定义与完整序列化细节未在 `services/zidl` 证据中展开，且本模块文件名层级并未提供字段级定义。

关键锚点：
- [README 主体接口说明](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\README.md)
- [README_ZH 说明](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\README_ZH.md)

## 6. 关键约束与设计边界

1. IPC 边界固定  
   `services/zidl` 由 `include`/`src` 成对文件组成，天然面向“声明-实现”分层，任何业务签名变化必须保持代理/桩对齐。  
   锚点：各模块的 `*_proxy.*` 与 `*_stub.*` 文件对。

2. 版本兼容性约束  
   README 中出现 Promise 与回调并行、以及 `V9` 接口变体，表明远端调用协议可能存在版本分支。  
   锚点：[README_ZH 表 4](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\README_ZH.md)（PasteDataRecord 转文本多版本方法）。

3. 回调生命周期约束  
   `disposable_observer_*` 的存在意味着观察者需要可回收策略，避免泄漏和僵尸回调。  
   锚点：[pasteboard_disposable_observer_proxy.h](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_proxy.h)

4. 错误与超时  
   尽管该模块自身未给出错误码定义，CLI 文档显示剪贴板链路普遍存在权限、序列化、超时、远端异常等失败类别。  
   锚点：[tools/ohos-pasteboard/docs/README.md](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\tools\ohos-pasteboard\docs\README.md)

5. 证据缺口  
   未提供 `symbol` 级实现、IPC transaction code、parcel 结构、构建脚本，必须在下一轮加入源码级锚点。

## 7. 调试指引（按模块）

| 模块 | 常见症状 | 可能来源 | 建议检查文件 |
|---|---|---|---|
| pasteboard_entry_getter | `getPasteData`/`setPasteData` 偶发超时或空返回 | proxy/stub 事务码或序列化字段不一致 | [entry_getter_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_proxy.h), [entry_getter_stub.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_entry_getter_stub.h) |
| pasteboard_delay_getter | 延迟读返回延迟过大或无回调 | 异步队列或超时策略异常 | [delay_getter_client.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_client.h), [delay_getter_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_delay_getter_proxy.h) |
| pasteboard_observer | `on/off` 回调不生效、重复触发 | 回调注册/注销、回传 token 管理错误 | [pasteboard_observer_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_observer_proxy.h), [pasteboard_observer_stub.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_observer_stub.h) |
| pasteboard_disposable_observer | 监听卸载后仍有回调、内存/句柄增长 | 生命周期未回收、句柄未销毁 | [pasteboard_disposable_observer_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_proxy.h), [pasteboard_disposable_observer_stub.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\pasteboard_disposable_observer_stub.h) |
| entity_recognition_observer | 内容识别事件缺失/乱序 | 观察者链路注册或事件映射错误 | [entity_recognition_observer_proxy.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\entity_recognition_observer_proxy.h), [entity_recognition_observer_stub.h/cpp](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\zidl\include\entity_recognition_observer_stub.h) |

## 8. 运行手册（有证据时给出）

### Build（构建）
- 现有证据未提供 `services/zidl` 的直接 build 命令或目标清单（仅见服务规模与文件清单）。
- 建议在后续补充阶段以仓库统一构建入口验证该目录是否被纳入 `services` 编译单元。
- 源码变更影响范围仅限 `services/zidl/include/*` 与 `services/zidl/src/*` 配对文件，需保证头文件/实现文件一一一致。

### Validation（校验）
- 以接口兼容性为先：proxy 与 stub 的方法签名必须版本对齐。
- 基于文档语义对照：`on/off`、`getPasteData/setPasteData`、`hasPasteData`、记录读写等行为需与 README 描述一致。
- 典型回归：更新通知丢失、空数据、类型查询失败、权限拒绝路径。

### Deployment（部署）
- 模块为系统服务链路的一部分，通常随剪贴板服务组件发布到系统镜像；当前证据仅能确认其在服务树中位于 `services/zidl`，未给出安装/镜像打包步骤。

### Rollback（回滚）
- 回滚策略优先按文件组：`*_proxy.*` 与 `*_stub.*` 成对回退，避免单边不一致。
- 若仅 `stub` 回滚失败且 `proxy` 保持新版本，建议同步回退完整对，或临时将旧接口代理到兼容层 shim。

### Failure-mode notes（故障模式）
1. 接口签名/事务码不匹配 → 客户端与服务端 marshal 失败、返回空或错误码。
2. 观察者生命周期泄漏 → 连续 `on` 后服务端仍持有监听句柄。
3. 权限/安全策略变化 → 外围返回拒绝，需核对调用链上 permission 与调用来源。
4. 版本不一致（回调样式兼容）→ 同名 API 的回调/Promise 处理分支错误。

## 9. 确定性边界

- **源文件确认事实**
  - `services/zidl` 包含 24 个明确文件（12 头文件 + 12 源文件），且文件命名体现 Proxy/Stub/Client 分层。
  - 模块定位于 pasteboard 服务下的跨进程通信代码实现区。
  - README 系列明确了 `SystemPasteboard`、`PasteData`、`PasteDataRecord`、事件监听与文本转换语义。

- **推断事实**
  - 各类名具体为 `Pasteboard*`/`EntityRecognition*` 的形式为命名约定推断。
  - `delay_getter` 与 `disposable_observer` 的具体调度策略与具体事务 ID、序列化字段在当前证据中未展开，需要实现文件确认。
  - 构建/部署命令、回归验证脚本及模块接入方式当前未在证据中直接给出，按仓库通用构建流程推断。