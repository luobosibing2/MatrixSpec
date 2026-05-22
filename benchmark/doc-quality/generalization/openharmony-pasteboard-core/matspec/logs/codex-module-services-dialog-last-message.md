# Dialog 模块设计文档（中间稿）

## 1. 模块目的（模块化裁剪结论）

`services/dialog/PasteboardDialog` 是 `distributeddatamgr_pasteboard` 中的独立 UI/扩展能力子模块，定位于剪贴板相关对话与扩展能力接入。  
从文件名可确认该模块包含：
- 一个应用生命周期入口：[MyAbilityStage.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\Application\MyAbilityStage.ts)
- 一个扩展能力分支：[ToastExtensionAbility.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\ServiceExtAbility\ToastExtensionAbility.ts)
- 全局参数/上下文支撑：[GlobalContext.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\PasteboardProgressAbility\GlobalContext.ts)、[GlobalParam.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\ServiceExtAbility\GlobalParam.ts)

## 2. 目录结构与文件清单

| 目录/文件 | 角色 | 说明 |
|---|---|---|
| `services/dialog/PasteboardDialog/.gitignore` | 元文件 | 忽略规则（模块根） |
| `services/dialog/PasteboardDialog/AppScope/app.json` | 应用配置 | 应用级描述与元信息 |
| `services/dialog/PasteboardDialog/AppScope/resources/base/element/string.json` | 资源 | 基础字符串资源 |
| `services/dialog/PasteboardDialog/entry/.gitignore` | 元文件 | 入口目录忽略规则 |
| `services/dialog/PasteboardDialog/entry/hvigorfile.js` | 构建脚本 | 模块级构建入口 |
| `services/dialog/PasteboardDialog/entry/src/main/ets/Application/MyAbilityStage.ts` | 生命周期 | 应用生命周期入口（入口类） |
| `services/dialog/PasteboardDialog/entry/src/main/ets/PasteboardProgressAbility/GlobalContext.ts` | 全局上下文 | 全局状态/共享对象 |
| `services/dialog/PasteboardDialog/entry/src/main/ets/ServiceExtAbility/GlobalParam.ts` | 参数模型 | 扩展能力参数承载 |
| `services/dialog/PasteboardDialog/entry/src/main/ets/ServiceExtAbility/ToastExtensionAbility.ts` | 扩展能力 | ServiceExt Ability 的业务入口 |
| `services/dialog/PasteboardDialog/entry/src/main/module.json` | 模块声明 | Ability 与能力点配置 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/base/profile/main_pages.json` | 页面入口 | 主页面清单（当前树中未看到对应页面文件，需核对） |
| `services/dialog/PasteboardDialog/entry/src/main/resources/base/profile/configuration.json` | 配置文件 | 运行/页面配置 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/*/element/string.json` | 本地化 | 多语言字符串资源 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/base/element/color.json` | 主题资源 | 颜色资源 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/dark/element/color.json` | 主题资源 | 深色主题颜色 |
| `services/dialog/PasteboardDialog/entry/src/main/resources/rawfile/searchConfig/searchPage.json` | 原始配置 | 非资源表单的运行时配置 |
| `services/dialog/PasteboardDialog/hvigor/hvigor-wrapper.js` | 构建封装 | 任务执行封装 |
| `services/dialog/PasteboardDialog/hvigorfile.js` | 入口构建 | 顶层工程构建脚本 |

## 3. 核心组件与职责映射（含源码锚点）

| 组件/锚点 | 可见符号（文件名推断） | 作用 | 重要性 |
|---|---|---|---|
| [MyAbilityStage.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\Application\MyAbilityStage.ts) | `MyAbilityStage` | 应用级生命周期控制（启动/初始化） | 决定模块是否能被系统正确调度 |
| [GlobalContext.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\PasteboardProgressAbility\GlobalContext.ts) | `GlobalContext`（推断） | 保存跨能力调用的上下文/状态 | 确保能力间状态一致 |
| [GlobalParam.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\ServiceExtAbility\GlobalParam.ts) | `GlobalParam`（推断） | 解析/承载启动参数 | 影响 toast/对话展示行为 |
| [ToastExtensionAbility.ts](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\ets\ServiceExtAbility\ToastExtensionAbility.ts) | `ToastExtensionAbility`（推断） | 剪贴板对话/提示扩展能力入口 | 直接暴露用户可见行为 |
| [module.json](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\entry\src\main\module.json) | manifest 节点 | 注册 ability 与能力特征 | 与系统绑定能力的关键配置 |
| [app.json](C:\Users\kvenu\playground\codewiki-community\benchmark\gitcode\repos\openharmony\distributeddatamgr_pasteboard\services\dialog\PasteboardDialog\AppScope\app.json) | 应用声明 | 描述应用 id/配置信息 | 与系统安装和加载生命周期相关 |

## 4. 核心流程（基于证据+推断分层）

1. 系统加载 `AppScope/app.json` 与 `entry/src/main/module.json` 完成组件注册，确定 `ToastExtensionAbility` 可见性。  
   - 锚点：`AppScope/app.json`、`entry/src/main/module.json`
2. 运行时触发扩展能力时，进入应用生命周期，`MyAbilityStage` 执行初始化与注册。  
   - 锚点：`MyAbilityStage.ts`
3. 启动参数通过 `GlobalParam` 解析入参，构建共享上下文。  
   - 锚点：`GlobalParam.ts`、`GlobalContext.ts`
4. 能力具体逻辑在 `ToastExtensionAbility` 中执行，最终依赖本地化与配色资源完成界面和提示语输出。  
   - 锚点：`ToastExtensionAbility.ts`、`* /string.json`、`* /color.json`
5. 配置与页面入口从 `configuration.json`、`main_pages.json` 与资源文件组合加载。  
   - 锚点：`main_pages.json`、`configuration.json`

> 注：第 2~5 步为基于 OpenHarmony 扩展能力命名约定的推断流程，当前证据仅含文件名与配置清单，未提供源码正文。

## 5. 接口与数据结构

| 数据对象 | 来源文件 | 已确认内容 | 推断说明 |
|---|---|---|---|
| 模块声明与能力声明 | `entry/src/main/module.json` | 存在文件，属于能力注册与模块属性 | 具体 ability 名称/abilityType 需打开文件确认 |
| 应用声明与范围 | `AppScope/app.json` | 存在应用级元信息文件 | 约束应用身份、权限、版本 |
| 生命周期/状态 | `MyAbilityStage.ts` | 存在生命周期入口文件 | 典型包含 `onCreate`/`onDestroy` 等 |
| 参数模型 | `GlobalParam.ts` | 存在参数定义文件 | 典型用于 `want` 透传与参数解析 |
| 上下文共享 | `GlobalContext.ts` | 存在全局上下文文件 | 可能包含单例/全局变量/工具对象 |
| 文本与颜色资源 | 各语言 `string.json`、`color.json` | 多语与主题资源已完整覆盖 | 用于 toast 文案、样式一致性 |
| 原始配置 | `rawfile/searchConfig/searchPage.json` | 存在运行时原始配置 | 用于非编译时读取的页面或查询行为 |

## 6. 关键约束与边界

| 约束类别 | 内容 | 影响 |
|---|---|---|
| 模块边界 | 当前证据仅覆盖 `services/dialog/PasteboardDialog`，无服务核心实现源码片段 | 不能推导与核心 pasteboard service 的直接内部交互细节 |
| 证据缺口 | 未提供上述 TypeScript 文件正文 | 所有业务函数签名与具体业务逻辑需以源码实际内容二次确认 |
| 资源完整性 | 多语言字符串文件覆盖 `ar/de/es/.../zz_ZX` | 页面文本本地化应在新语种接入时保持一致 |
| 页面入口一致性 | 存在 `main_pages.json` 但树上未见 page 文件 | 需要确认页面文件是否在其他路径或构建时动态生成 |
| 配置一致性 | 同时存在 `AppScope` 和 `entry` 下构建脚本 | 两层构建/签名配置可能出现重复配置冲突 |
| 平台依赖 | 基于 OpenHarmony 义务约定的 ability/extension 生命周期 | 运行失败时首先排查能力注册与 manifest 配置 |

## 7. 运行手册（Runbook）

### Build
1. 在仓库层或模块层执行构建前先确认 `hvigorfile.js` 与 `hvigor/hvigor-wrapper.js` 可解析。  
   - 锚点：`PasteboardDialog/hvigorfile.js`、`PasteboardDialog/hvigor/hvigor-wrapper.js`
2. 以 `hvigor` 为入口执行模块构建，产物应可用于安装/签名链路。  
3. 若构建失败，优先核对 `entry/hvigorfile.js` 与 `entry/src/main/module.json`。

### Validation
1. 安装成功后触发相关扩展能力启动路径，确认 toast 或进度提示是否可见。  
2. 检查 `global`/`dark`/多语言资源是否落地生效。  
3. 校验 `main_pages.json` 与实际页面映射一致，避免空白页面启动。

### Deployment
1. 与系统发布链路一致，按模块发布策略打包到目标设备。  
2. 首发应使用配置最小化：仅保留 `base` + 目标 locale 资源和必要 extension。  
3. 若为新地区版本，增加对应语言 `string.json` 并回归 UI 文案。

### Rollback
1. 回退到上一版模块 HAP。  
2. 同步回退 `module.json`/`app.json` 与 `configuration.json` 的历史版本，避免 manifest 与资源不一致。  
3. 检查资源文件 `string.json` 是否出现键缺失导致回退界面不一致。

### Failure-mode notes
- 能力启动失败：高概率是 manifest 注册与能力类不一致。  
- 空白弹窗/无展示：高概率是 `main_pages.json` 与页面入口不一致。  
- 文案空白或乱码：高概率是 locale key 缺失/资源路径不一致。  
- 构建通过但运行异常：高概率是 entry 与 AppScope 配置存在差异。

## 8. 调试指导（按主要模块）

| 模块 | 常见症状 | 可能源区 | 检查文件/命令 |
|---|---|---|---|
| 生命周期模块 | 安装后无日志、能力不被触发 | `MyAbilityStage` 未进入预期回调 | `[MyAbilityStage.ts]`（构造/生命周期方法） |
| 扩展能力模块 | toast 不显示/异常关闭 | `ToastExtensionAbility` 处理链或参数解析失败 | `[ToastExtensionAbility.ts]` 与 `[GlobalParam.ts]` |
| 全局状态模块 | 多次触发后行为紊乱 | 上下文生命周期或单例污染 | `[GlobalContext.ts]`（状态初始化/重置点） |
| 配置与页面 | 启动后白屏或报页面不存在 | `main_pages.json` 与页面清单不一致 | `[main_pages.json]`、`[configuration.json]` |
| 国际化/主题 | 文案回退、主题异常 | string/color 资源 key 缺失或 locale 匹配失败 | `base/element/string.json`、`dark/element/color.json`、其他 locale 的 `string.json` |
| 构建链路 | `hvigor` 构建失败或打包产物缺失 | 配置脚本或入口文件缺失 | `hvigorfile.js`、`entry/hvigorfile.js`、`hvigor-wrapper.js` |

## 9. 证据边界（源确认 vs 推断）

| 置信度类别 | 内容 |
|---|---|
| 源码可确认（Source-confirmed） | 文件/目录存在、模块路径、构建脚本、资源文件列表、多语言资源范围、与主仓库子系统关系（通过给定 README、模块树） |
| 推断（Inferred） | 能力具体执行流程、类名语义（如 `ToastExtensionAbility` 的业务行为）、参数/状态对象字段、build/deploy 命令细节、与粘贴板核心服务直接交互方式 |
| 证据缺失（Missing evidence） | `MyAbilityStage.ts`、`GlobalContext.ts`、`GlobalParam.ts`、`ToastExtensionAbility.ts` 的具体代码、`module.json`/`configuration.json` 的具体字段值、实际构建产物与运行日志 |

## 10. 与上层设计文档对接建议（供 design.md 复用）

- 该模块应作为“系统服务对话/扩展能力子系统”的独立子模块编写，不与核心剪贴板算法逻辑耦合。  
- 设计文档中可按「能力入口层（Ability）」与「配置资源层（module/app/resource）」拆分。  
- 需要补齐的高优先信息：`module.json` 与 `ToastExtensionAbility.ts` 的实际 symbol/方法签名。