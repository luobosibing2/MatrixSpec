# Ascend Common 模块设计文档

## 1. 模块定位

Ascend Common 是 MindCluster `component/ascend-common` 下的公共基础模块，目标是为其他组件提供可复用的 API 定义、Kubernetes 客户端代码、通用工具函数、日志能力、设备管理封装以及 Ascend 相关公共数据结构。

从 `component/ascend-common/README.md` 可确认，该组件“提供公共代码给其他组件使用，组件包括 NPU-Exporter 等”，并要求在编译 NPU-Exporter 等组件时与其他组件放在同一目录下。结合根 README 的目录结构，Ascend Common 位于 MindCluster 多组件源码树的公共层，服务于调度、资源监控、设备插件、Exporter、ClusterD 等组件的共享能力。

## 2. 目录结构

`component/ascend-common` 主要分为四类内容：

| 目录 | 作用 | 关键文件 |
|---|---|---|
| `api/` | 公共 API 常量、设备/故障/慢网/超节点结构，以及 AscendJob CRD 客户端代码 | `consts.go`、`type.go`、`publicfault.go`、`superpoddevice.go`、`slownet/fault_net.go` |
| `api/ascend-operator/` | AscendJob CRD 类型、默认值、clientset、informer、lister | `apis/batch/v1/ascendjob_types.go`、`client/.../job.go`、`informers/.../job.go` |
| `common-utils/` | 通用工具库，包括缓存、ethtool、日志、限流、解析、随机数、文件/IP/字符串工具 | `cache/lrucache.go`、`hwlog/api.go`、`limiter/limit_handler.go`、`utils/file.go` |
| `devmanager/` | Ascend 设备管理抽象与 DCMI/HCCN 封装，面向 A310/A910/A950 等设备形态 | `devmanager.go`、`devmanager_v2.go`、`dcmi/dcmi.go`、`hccn/hccn_tool.go` |

模块树中还包含大量测试文件，例如 `common-utils/cache/lrucache_test.go`、`common-utils/hwlog/*_test.go`、`devmanager/*_test.go`，表明该模块不仅提供静态定义，也承担运行时工具与设备访问逻辑。

## 3. 核心组件

### 3.1 公共 API 包 `api`

`component/ascend-common/api` 提供跨组件共享的数据结构、常量和命名规范。根据文件命名可分为：

| 文件 | 设计职责 |
|---|---|
| `consts.go`、`const_v2.go` | 公共常量定义，供组件间统一字段名、资源名、标签名等 |
| `default_name.go`、`default_name_v2.go` | 默认资源名或设备名规则 |
| `type.go` | 公共类型集合 |
| `common_info_v2.go` | v2 版本公共信息结构 |
| `publicfault.go` | 公共故障相关结构或字段 |
| `superpoddevice.go`、`superpoddevice_v2.go` | SuperPod/超节点设备信息结构 |
| `slownet/fault_net.go`、`slownet/fault_net_v2.go` | 慢网或网络故障相关结构 |

该包是多个组件交互时的“共享语言层”。例如 Device Plugin、ClusterD、NPU Exporter、调度器在处理设备状态、故障、超节点或网络异常时，需要使用一致的字段和结构，避免不同组件各自定义兼容性不一致的数据格式。

**源码锚点**

| 锚点 | 重要性 |
|---|---|
| `component/ascend-common/api/consts.go` | 公共常量入口，影响跨组件字段和资源名一致性 |
| `component/ascend-common/api/type.go` | 公共类型入口，影响组件间数据结构契约 |
| `component/ascend-common/api/publicfault.go` | 公共故障数据契约，关联故障上报、隔离、恢复流程 |
| `component/ascend-common/api/slownet/fault_net.go` | 慢网/网络故障相关契约，关联网络故障诊断和恢复流程 |
| `component/ascend-common/api/superpoddevice.go` | 超节点设备信息契约，关联 SuperPod 调度和资源管理 |

### 3.2 AscendJob API 与 Kubernetes 客户端

`api/ascend-operator` 是 AscendJob CRD 的白盒客户端模块，README 明确说明其用于提供 AscendJob API，以及 Clientsets、Listers、Informers，使用户可以对 AscendJob 做 CRUD 操作。

#### 3.2.1 CRD 类型定义

`component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go` 定义核心 CRD：

| 类型 | 字段 | 说明 |
|---|---|---|
| `AscendJob` | `TypeMeta`、`ObjectMeta`、`Spec`、`Status` | Kubernetes 自定义资源主对象 |
| `AscendJobSpec` | `RunPolicy`、`SuccessPolicy`、`SchedulerName`、`ReplicaSpecs` | 描述分布式训练/推理作业期望状态 |
| `AscendJobList` | `Items []AscendJob` | 列表对象 |
| `SuccessPolicy` | 字符串枚举 | 作业成功判定策略 |

`AscendJobSpec` 复用了 `github.com/kubeflow/common/pkg/apis/common/v1` 中的 `RunPolicy`、`ReplicaSpec`、`JobStatus`，说明 AscendJob 设计继承 Kubeflow common job 风格，用 `ReplicaSpecs` 表示不同角色副本，如 Worker、Scheduler、Master 等。

**源码锚点**

| 锚点 | 重要性 |
|---|---|
| `component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go:25` `AscendJob` | AscendJob CRD 主对象定义 |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go:44` `AscendJobSpec` | 作业期望状态契约 |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/ascendjob_types.go:67` `ReplicaSpecs` | 分布式角色副本配置入口 |

#### 3.2.2 GroupVersion 与 Scheme 注册

`constants.go` 定义 API 组名为 `mindxdl.gitee.com`，默认端口为 `2222`，并定义 MindSpore、PyTorch、TensorFlow 的角色名称。

`register.go` 将 `AscendJob` 和 `AscendJobList` 注册到 `SchemeGroupVersion`，版本为 `v1`。`zz_generated.defaults.go` 将默认值函数注册到 Kubernetes runtime scheme。

**源码锚点**

| 锚点 | 重要性 |
|---|---|
| `component/ascend-common/api/ascend-operator/apis/batch/v1/constants.go:23` `GroupName` | AscendJob API group 契约 |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/constants.go:30` `DefaultPort` | 作业默认通信端口 |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/register.go:25` `SchemeGroupVersion` | CRD GroupVersion 注册入口 |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/register.go:40` `addKnownTypes` | 将 AscendJob 类型加入 runtime scheme |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/zz_generated.defaults.go:32` `RegisterDefaults` | 默认值注册入口 |

#### 3.2.3 默认值逻辑

`defaults.go` 提供 AscendJob 默认值处理：

| 函数 | 行为 |
|---|---|
| `Int32` | 返回 `int32` 指针，辅助设置副本数 |
| `addDefaultingFuncs` | 注册默认值函数 |
| `setDefaultPort` | 为默认容器补充默认端口 |
| `setDefaultReplicas` | 默认副本数为 1，默认重启策略为 `RestartPolicyNever` |
| `setTypeNamesToCamelCase` | 将副本类型规范化为预期大小写 |

**源码锚点**

| 锚点 | 重要性 |
|---|---|
| `component/ascend-common/api/ascend-operator/apis/batch/v1/defaults.go:37` `addDefaultingFuncs` | 默认值注册入口 |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/defaults.go:42` `setDefaultPort` | 默认容器端口补齐逻辑 |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/defaults.go:67` `setDefaultReplicas` | 默认副本数和重启策略逻辑 |
| `component/ascend-common/api/ascend-operator/apis/batch/v1/defaults.go:76` `setTypeNamesToCamelCase` | 角色类型兼容逻辑 |

#### 3.2.4 Clientset、Typed Client、Informer、Lister

`client/clientset/versioned/clientset.go` 定义 `Clientset`，包含 `DiscoveryClient` 和 `BatchV1Client`。`typed/batch/v1/job.go` 定义 `JobInterface`，提供 AscendJob 的完整 CRUD、Watch、Patch、Status 更新和批量删除能力。

`informers/externalversions` 提供 SharedInformerFactory、Batch/V1 入口和 JobInformer，用于控制器 watch AscendJob 变更。`listers/batch/v1/job.go` 提供缓存读取接口。

**源码锚点**

| 锚点 | 重要性 |
|---|---|
| `component/ascend-common/api/ascend-operator/client/clientset/versioned/clientset.go:31` `Interface` | Clientset 对外接口 |
| `component/ascend-common/api/ascend-operator/client/clientset/versioned/clientset.go:60` `NewForConfig` | 通过 `rest.Config` 创建 clientset |
| `component/ascend-common/api/ascend-operator/client/clientset/versioned/typed/batch/v1/client.go:31` `BatchV1Interface` | batch/v1 typed client 入口 |
| `component/ascend-common/api/ascend-operator/client/clientset/versioned/typed/batch/v1/job.go:44` `JobInterface` | AscendJob CRUD 接口集合 |
| `component/ascend-common/api/ascend-operator/client/informers/externalversions/batch/interface.go:25` `Interface` | batch informer 版本入口 |
| `component/ascend-common/api/ascend-operator/client/informers/externalversions/batch/v1/interface.go:24` `Interface` | v1 JobInformer 入口 |

### 3.3 common-utils 通用工具

`common-utils` 是 Ascend Common 的工程基础设施层，包含：

| 子目录 | 作用 |
|---|---|
| `cache/` | LRU 缓存实现与测试 |
| `ethtool/` | 网卡/链路工具封装 |
| `hwlog/` | 日志 API、适配器、限流、滚动日志等 |
| `limiter/` | 限流 handler、listener、writer |
| `parser/` | 设备解析工具 |
| `rand/` | 随机数封装，包含 Linux 实现 |
| `utils/` | 环境变量、文件、路径、IP、接口、字符串、切片等通用工具 |

其中 `common-utils/hwlog` 文件数和行数较多，是公共日志能力核心。`common-utils/utils` 规模最大，说明该模块大量承担跨组件基础工具职责。

**源码锚点**

| 锚点 | 重要性 |
|---|---|
| `component/ascend-common/common-utils/cache/lrucache.go` | LRU 缓存实现，供运行时缓存场景复用 |
| `component/ascend-common/common-utils/ethtool/ethtool.go` | 网络设备工具封装，关联链路和慢网诊断 |
| `component/ascend-common/common-utils/hwlog/api.go` | 日志 API 入口 |
| `component/ascend-common/common-utils/hwlog/hwlog_adaptor.go` | 日志适配层 |
| `component/ascend-common/common-utils/hwlog/log_limiter.go` | 日志限流能力 |
| `component/ascend-common/common-utils/limiter/limit_handler.go` | 通用限流处理器 |
| `component/ascend-common/common-utils/parser/device_parser.go` | 设备信息解析入口 |
| `component/ascend-common/common-utils/utils/file.go` | 文件工具 |
| `component/ascend-common/common-utils/utils/ip_utils.go` | IP 工具 |
| `component/ascend-common/common-utils/utils/path.go` | 路径校验/处理工具 |

### 3.4 devmanager 设备管理

`devmanager` 面向 Ascend 设备访问和管理，模块树显示其包含 A310、A310P、A910、A950 管理器，以及 DCMI 和 HCCN 封装：

| 文件/目录 | 作用 |
|---|---|
| `a310mgr.go`、`a310pmgr.go`、`a910mgr.go`、`a950mgr.go` | 不同硬件形态的设备管理实现 |
| `devmanager.go`、`devmanager_v2.go` | 设备管理主入口或接口实现 |
| `devmanager_common.go` | 设备管理公共逻辑 |
| `common/` | 设备管理常量、类型、工具 |
| `dcmi/` | DCMI C 头文件和 Go 封装 |
| `hccn/` | HCCN 网络工具封装 |
| `*_mock*.go` | 测试与错误注入 mock |

NPU Exporter 新增 `node_base_info` 指标的 RFC 显示，Exporter 通过 `n.Dmgr.GetDcmiVersion()` 获取驱动版本，底层调用 DCMI 接口。这说明 `devmanager` 是上层组件访问 Ascend 驱动、设备状态和网络状态的重要适配层。

**源码锚点**

| 锚点 | 重要性 |
|---|---|
| `component/ascend-common/devmanager/devmanager.go` | 设备管理主实现入口 |
| `component/ascend-common/devmanager/devmanager_v2.go` | v2 设备管理实现 |
| `component/ascend-common/devmanager/a910mgr.go` | A910 设备形态管理 |
| `component/ascend-common/devmanager/a950mgr.go` | A950/SuperPoD 相关设备形态管理 |
| `component/ascend-common/devmanager/dcmi/dcmi.go` | DCMI Go 封装 |
| `component/ascend-common/devmanager/dcmi/dcmi_interface_api.h` | DCMI C 接口声明 |
| `component/ascend-common/devmanager/hccn/hccn_tool.go` | HCCN 网络工具入口 |

## 4. 核心流程

### 4.1 AscendJob 客户端访问流程

1. 调用方通过 Kubernetes `rest.Config` 调用 `versioned.NewForConfig`。
2. `Clientset` 初始化 `BatchV1Client` 和 `DiscoveryClient`。
3. 调用方通过 `clientset.BatchV1().Jobs(namespace)` 获取 AscendJob typed client。
4. typed client 通过 REST 请求访问 `/apis/mindxdl.gitee.com/v1/namespaces/{namespace}/...`。
5. 对 AscendJob 执行 `Create`、`Get`、`List`、`Watch`、`Update`、`UpdateStatus`、`Patch`、`Delete`、`DeleteCollection`。
6. 控制器场景下，SharedInformerFactory 创建 JobInformer，基于 List/Watch 维护本地缓存；Lister 从缓存读取对象。

**关键接口锚点**

| 锚点 | 说明 |
|---|---|
| `clientset.go` `NewForConfig` | clientset 构造入口 |
| `typed/batch/v1/client.go` `setConfigDefaults` | 设置 GroupVersion、APIPath、serializer 等 REST 默认配置 |
| `typed/batch/v1/job.go` `JobInterface` | AscendJob 操作面 |
| `informers/externalversions/factory.go` | SharedInformerFactory 创建与生命周期管理 |
| `listers/batch/v1/job.go` | informer cache 查询入口 |

### 4.2 AscendJob 默认化流程

1. CRD 类型通过 `register.go` 注册到 Kubernetes runtime scheme。
2. `init()` 中将 `addDefaultingFuncs` 注册到 `SchemeBuilder`。
3. `zz_generated.defaults.go` 注册 `AscendJob` 和 `AscendJobList` 的默认值函数。
4. 创建或解码 AscendJob 对象时触发 `SetDefaultsAscendJob`。
5. 默认化逻辑补齐端口、副本数、重启策略，并规范化副本类型名称。

该流程保证 AscendJob 对象在进入控制器逻辑前具备一致的基础字段，降低控制器和调度器对缺省字段的处理复杂度。

### 4.3 公共设备信息与故障数据流

结合模块结构和 RFC，可推断公共数据流如下：

1. Device Plugin、NPU Exporter、ClusterD、调度器等组件引用 `ascend-common/api` 中的常量与类型。
2. Device Plugin 采集设备状态、故障、手工隔离、慢网等信息后，通过 ConfigMap、事件或组件接口上报。
3. ClusterD、Ascend Operator、Volcano 插件读取这些公共字段，完成故障聚合、调度、热切、进程级恢复或重调度。
4. NPU Exporter 通过 `devmanager` 获取设备与驱动信息，并通过 metrics 暴露给 Prometheus/Telegraf。
5. 日志、限流、文件校验、路径校验等基础能力由 `common-utils` 提供。

该流程中的跨组件字段稳定性依赖 `api` 包；运行时设备访问稳定性依赖 `devmanager`；可观测性和基础工程质量依赖 `common-utils`。

## 5. 接口与数据结构

### 5.1 AscendJob CRD 数据结构

| 结构 | 字段 | 类型 | 说明 |
|---|---|---|---|
| `AscendJob` | `TypeMeta` | `metav1.TypeMeta` | Kubernetes 类型元数据 |
| `AscendJob` | `ObjectMeta` | `metav1.ObjectMeta` | Kubernetes 对象元数据 |
| `AscendJob` | `Spec` | `AscendJobSpec` | 期望状态 |
| `AscendJob` | `Status` | `commonv1.JobStatus` | 当前状态 |
| `AscendJobSpec` | `RunPolicy` | `commonv1.RunPolicy` | 运行策略 |
| `AscendJobSpec` | `SuccessPolicy` | `*SuccessPolicy` | 成功策略 |
| `AscendJobSpec` | `SchedulerName` | `string` | 使用的调度器 |
| `AscendJobSpec` | `ReplicaSpecs` | `map[commonv1.ReplicaType]*commonv1.ReplicaSpec` | 分布式角色副本配置 |

### 5.2 AscendJob Client 接口

`JobInterface` 提供以下方法：

| 方法 | 用途 |
|---|---|
| `Create(ctx, job, opts)` | 创建 AscendJob |
| `Update(ctx, job, opts)` | 更新 AscendJob spec/metadata |
| `UpdateStatus(ctx, job, opts)` | 更新 AscendJob status |
| `Delete(ctx, name, opts)` | 删除单个 AscendJob |
| `DeleteCollection(ctx, opts, listOpts)` | 按条件批量删除 |
| `Get(ctx, name, opts)` | 获取单个 AscendJob |
| `List(ctx, opts)` | 列表查询 |
| `Watch(ctx, opts)` | watch 资源变化 |
| `Patch(ctx, name, pt, data, opts, subresources...)` | patch 对象或子资源 |

### 5.3 Informer/Lister 接口

| 接口 | 用途 |
|---|---|
| `NewSharedInformerFactory(client, defaultResync)` | 创建 informer factory |
| `sharedInformerFactory.Batch().V1().Jobs().Informer()` | 获取 AscendJob informer |
| `Batch().V1().Jobs().Lister()` | 从本地缓存读取 AscendJob |

### 5.4 公共工具接口边界

`common-utils` 的接口是包级工具，不直接对 Kubernetes API 暴露。典型边界如下：

| 子模块 | 输入 | 输出 | 主要约束 |
|---|---|---|---|
| `cache` | key/value、容量或淘汰策略 | 缓存命中/淘汰结果 | 需要关注并发访问和容量边界 |
| `hwlog` | 日志配置、日志内容 | 文件日志/运行日志 | 需要关注权限、滚动、限流 |
| `limiter` | 请求/写入/监听事件 | 被限流后的处理结果 | 需要避免高频事件打爆日志或 API |
| `utils` | 文件、路径、环境变量、IP、字符串 | 校验或转换结果 | 需要关注安全路径和异常输入 |
| `devmanager` | 设备 ID、驱动/DCMI/HCCN 调用 | 设备状态、版本、网络信息 | 依赖 Ascend 驱动和运行环境 |

## 6. 关键约束

### 6.1 编译与目录约束

`component/ascend-common/README.md` 明确要求：编译 NPU-Exporter 等组件时，Ascend Common 要放在同一目录下。根构建脚本 `build/build_all.sh` 会将 `component/*` 拷贝到 `$GOPATH/`，说明仓内组件采用 GOPATH 风格的同级组件引用方式。

**源码锚点**

| 锚点 | 重要性 |
|---|---|
| `component/ascend-common/README.md` | 明确 Ascend Common 是其他组件的公共依赖 |
| `build/build_all.sh:30` | 将 `component/*` 复制到 GOPATH，形成同级组件构建布局 |
| `build/service_config.ini:1` | 全局组件版本配置入口 |

### 6.2 Kubernetes API 兼容约束

AscendJob API 组名为 `mindxdl.gitee.com`，版本为 `v1`。typed client 默认访问 `/apis` 路径，并依赖 Kubernetes client-go 的 `rest.Config`、runtime scheme、serializer、watch 和 informer 机制。修改 GroupVersion、资源名、scheme 注册或默认值逻辑会影响 Ascend Operator 和外部调用方。

### 6.3 Kubeflow common 依赖约束

AscendJob 的 `RunPolicy`、`ReplicaSpec`、`JobStatus` 来自 `github.com/kubeflow/common/pkg/apis/common/v1`。这意味着 AscendJob 的作业生命周期语义、副本角色模型和状态结构与 Kubeflow common job 绑定，升级依赖时需要验证字段兼容性。

### 6.4 生成代码约束

`zz_generated.deepcopy.go` 和 `zz_generated.defaults.go` 是生成代码，文件头标记 `DO NOT EDIT`。CRD 类型或默认值逻辑变更后，应通过对应代码生成流程更新，而不是手工改生成文件。

### 6.5 设备管理运行约束

`devmanager` 依赖 DCMI、HCCN、Ascend 驱动库和设备环境。上层调用如 NPU Exporter 获取驱动版本、设备信息时，需要处理底层接口失败、返回空值或设备型号差异。

### 6.6 日志与限流约束

故障、隔离、恢复、事件上报等流程可能高频触发。`common-utils/hwlog/log_limiter.go`、`common-utils/limiter` 的存在说明日志与事件限流是公共能力之一。故障恢复相关 RFC 也要求事件需要限流，避免高频更新造成日志或 Kubernetes event 压力。

## 7. 运行手册

### 7.1 构建

| 场景 | 操作 | 依据 |
|---|---|---|
| 全量构建 | 在仓库 `build/` 下执行 `build_all.sh $GOPATH` | `build/build_all.sh` 会设置或使用 GOPATH，并复制 `component/*` |
| 单组件构建 | 使用 `build/build_each.sh GOPATH config servicename` | `build/build_each.sh` 根据组件名进入对应 build 目录 |
| Go 版本 | 使用 Go 1.21 | 根 README 环境部署说明 |
| 版本号 | 修改 `build/service_config.ini` 的 `mind-cluster-version` | 根 README 和构建配置显示默认 `6.0.0` |

Ascend Common 自身没有独立 build 脚本证据，作为公共源码包随依赖组件一起构建。构建失败时优先确认 GOPATH 布局中 `ascend-common` 与消费组件是否同级。

### 7.2 验证

建议按子模块分层验证：

| 子模块 | 验证方式 |
|---|---|
| `api/ascend-operator/apis/batch/v1` | 编译引用 AscendJob 类型，验证 scheme 注册、默认值生成代码无冲突 |
| `api/ascend-operator/client` | 使用 fake 或真实 `rest.Config` 编译 typed client、informer、lister |
| `common-utils/cache` | 执行 `go test` 覆盖 LRU 行为 |
| `common-utils/hwlog` | 执行 `go test` 覆盖日志适配、限流、滚动日志 |
| `common-utils/utils` | 执行 `go test` 覆盖文件、路径、IP、字符串、slice 工具 |
| `devmanager` | 在具备 Ascend 驱动/DCMI 环境的节点上执行集成验证；普通环境使用 mock 测试 |

### 7.3 部署

Ascend Common 不作为独立容器部署。它被编译进消费组件中，例如 NPU Exporter、Device Plugin、ClusterD、Ascend Operator 等。部署验证应在消费组件层完成：

| 消费组件 | 关注点 |
|---|---|
| Ascend Operator | AscendJob CRD client、informer、默认值是否正常 |
| NPU Exporter | devmanager 获取设备/驱动信息是否正常 |
| Device Plugin | 公共设备名、故障字段、ConfigMap 字段是否兼容 |
| ClusterD | 公共故障、手工隔离、SuperPod 信息结构是否兼容 |
| Volcano 插件 | 调度相关公共字段与作业注解是否兼容 |

### 7.4 回滚

Ascend Common 是公共依赖，回滚需要以消费组件镜像或二进制为单位进行：

1. 回滚使用旧版 Ascend Common 编译出的消费组件镜像或二进制。
2. 若变更涉及 AscendJob API 字段或默认值，需确认 CRD YAML 和控制器代码同步回滚。
3. 若变更涉及 ConfigMap 字段格式，需确认旧组件能够读取现有字段；必要时保留新增字段但不依赖。
4. 若变更涉及 devmanager/DCMI 行为，回滚后验证 NPU Exporter、Device Plugin 的设备发现和指标上报。

### 7.5 失败模式

| 现象 | 可能原因 | 排查位置 |
|---|---|---|
| 消费组件编译失败，提示找不到 `ascend-common/...` | GOPATH 布局不符合组件同级要求 | `build/build_all.sh`、`component/ascend-common/README.md` |
| AscendJob client 请求 404 | GroupVersion、资源名、CRD 安装不匹配 | `apis/batch/v1/constants.go`、`register.go`、`typed/batch/v1/client.go` |
| AscendJob 默认端口或副本数未补齐 | 默认值函数未注册或生成代码不匹配 | `defaults.go`、`zz_generated.defaults.go` |
| Informer 无事件 | factory 未启动、namespace 错误、List/Watch 权限不足 | `informers/externalversions/factory.go`、`batch/v1/job.go` |
| NPU Exporter 设备/驱动信息为空 | DCMI 调用失败或驱动环境不可用 | `devmanager/dcmi/`、NPU Exporter collector |
| 故障事件或日志过多 | 限流配置或公共限流逻辑未生效 | `common-utils/hwlog/log_limiter.go`、`common-utils/limiter/` |

## 8. 调试指南

### 8.1 AscendJob CRD 与 Client

| 症状 | 可能源码区域 | 建议检查 |
|---|---|---|
| 创建 AscendJob 失败 | `typed/batch/v1/job.go` | 检查 `Create` 使用的 namespace、resource、body 和 API server 返回错误 |
| client 初始化失败 | `typed/batch/v1/client.go` | 检查 `rest.Config` 是否为空、GroupVersion、APIPath、serializer 设置 |
| scheme 解码失败 | `scheme/register.go`、`apis/batch/v1/register.go` | 检查 `AddToScheme` 是否注册 AscendJob 和 AscendJobList |
| 默认值不生效 | `defaults.go`、`zz_generated.defaults.go` | 检查 `RegisterDefaults` 和 `SetDefaultsAscendJob` 调用链 |
| informer 不更新 | `informers/externalversions/factory.go`、`batch/v1/job.go` | 检查 informer factory 是否 `Start`，List/Watch 权限是否存在 |

常用命令：

```bash
rg "type AscendJob" component/ascend-common/api/ascend-operator/apis/batch/v1
rg "func NewForConfig" component/ascend-common/api/ascend-operator/client
rg "type JobInterface" component/ascend-common/api/ascend-operator/client
rg "RegisterDefaults|SetDefaultsAscendJob" component/ascend-common/api/ascend-operator/apis/batch/v1
```

### 8.2 公共 API 字段

| 症状 | 可能源码区域 | 建议检查 |
|---|---|---|
| ConfigMap 字段读写不一致 | `api/consts.go`、`api/default_name.go` | 检查字段名、默认名是否被多个组件共享 |
| 故障级别识别异常 | `api/publicfault.go` | 检查故障码、故障级别、隔离字段契约 |
| 慢网故障字段不兼容 | `api/slownet/fault_net.go` | 检查 v1/v2 结构差异 |
| SuperPod 设备信息缺失 | `api/superpoddevice.go` | 检查设备结构和字段序列化 |

常用命令：

```bash
rg "ManuallySeparate|PublicFault|Fault" component/ascend-common/api
rg "SuperPod|superpod" component/ascend-common/api
rg "Slow|slownet|Net" component/ascend-common/api
```

### 8.3 common-utils

| 症状 | 可能源码区域 | 建议检查 |
|---|---|---|
| 缓存命中异常或淘汰异常 | `common-utils/cache/lrucache.go` | 检查容量、key 比较、并发读写 |
| 日志不落盘或权限异常 | `common-utils/hwlog/` | 检查日志路径、权限、滚动配置 |
| 日志洪泛 | `common-utils/hwlog/log_limiter.go`、`common-utils/limiter/` | 检查限流器是否被接入 |
| 文件路径校验失败 | `common-utils/utils/path.go`、`file_check.go` | 检查路径规范、安全校验、权限 |
| IP 或网卡解析异常 | `common-utils/utils/ip_utils.go`、`ethtool/ethtool.go` | 检查网卡名、IP 格式、ethtool 调用环境 |

常用命令：

```bash
go test ./component/ascend-common/common-utils/...
rg "RunLog|Log|Limiter" component/ascend-common/common-utils/hwlog
rg "Check|Path|File" component/ascend-common/common-utils/utils
```

### 8.4 devmanager

| 症状 | 可能源码区域 | 建议检查 |
|---|---|---|
| 设备数量不正确 | `devmanager/devmanager.go`、具体型号 manager | 检查设备枚举逻辑和型号分支 |
| 驱动版本为空 | `devmanager/dcmi/` | 检查 DCMI 动态库、头文件绑定、返回码 |
| HCCN 信息异常 | `devmanager/hccn/hccn_tool.go` | 检查 HCCN 工具调用和权限 |
| 单元测试依赖设备失败 | `*_mock.go`、`*_mock_err.go` | 使用 mock 路径隔离硬件依赖 |

常用命令：

```bash
rg "GetDcmiVersion|Dcmi|DCMI" component/ascend-common/devmanager
rg "HCCN|hccn" component/ascend-common/devmanager
go test ./component/ascend-common/devmanager/...
```

## 9. 与其他模块的关系

| 关联模块 | 依赖关系 |
|---|---|
| `component/ascend-operator` | 使用 AscendJob API 类型、client/informer/lister；根 README 中 Ascend Operator 负责作业控制和恢复编排 |
| `component/ascend-device-plugin` | 使用公共设备名、故障字段、设备结构和工具；Device Plugin 构建/部署 YAML 显示其负责 pods、nodes、configmaps、events 权限 |
| `component/npu-exporter` | 使用 devmanager 获取设备和驱动信息，使用公共工具和常量；RFC 中 `node_base_info` 指标依赖 `Dmgr.GetDcmiVersion()` |
| `component/clusterd` | 使用公共故障、隔离、SuperPod、设备信息结构；故障恢复 RFC 中 ClusterD 汇总分析来自 Device Plugin、NodeD、taskd 的故障 |
| `component/ascend-for-volcano` | 使用公共调度和设备字段；多级调度、软切分和故障重调度需要稳定的设备资源契约 |
| `component/container-manager`、`noded`、`taskd` | 间接依赖公共故障、日志、工具或设备信息结构 |

## 10. 确定性边界

### 已由源码或文档确认

| 事实 | 证据 |
|---|---|
| Ascend Common 是公共代码模块，供 NPU-Exporter 等组件使用 | `component/ascend-common/README.md` |
| 编译其他组件时 Ascend Common 需要与组件处于同一目录 | `component/ascend-common/README.md`、`build/build_all.sh` |
| AscendJob API group 是 `mindxdl.gitee.com`，version 是 `v1` | `constants.go`、`register.go` |
| AscendJob 包含 `Spec` 和 `Status`，`Status` 使用 Kubeflow common `JobStatus` | `ascendjob_types.go` |
| AscendJob client 提供 CRUD、Watch、Patch、UpdateStatus 等接口 | `typed/batch/v1/job.go` |
| AscendJob informer/lister/clientset 由 `api/ascend-operator/client` 提供 | `clientset.go`、`informers/...`、`listers/...` |
| 默认副本数、默认端口、默认重启策略由 `defaults.go` 处理 | `defaults.go` |
| `zz_generated.*` 文件是生成代码 | 文件头 `Code generated ... DO NOT EDIT` |
| `common-utils` 覆盖 cache、ethtool、hwlog、limiter、parser、rand、utils | 模块树 |
| `devmanager` 覆盖 A310/A910/A950、DCMI、HCCN 等设备管理能力 | 模块树 |
| NPU Exporter 可通过 devmanager 获取 DCMI 驱动版本 | `features-NPUExporter新增node_base_info指标.md` |

### 基于结构和上下文推断

| 推断 | 依据 | 风险 |
|---|---|---|
| `api` 包是跨组件字段契约中心 | 文件命名、根 README 组件关系、故障/调度 RFC | 具体字段语义需逐文件确认 |
| `devmanager` 被多个运行组件复用 | NPU Exporter RFC、设备管理目录结构 | 具体调用方需通过 import 搜索确认 |
| `common-utils/hwlog` 是统一日志基础设施 | 文件规模、命名和测试覆盖 | 各组件是否全部使用需逐组件确认 |
| AscendJob 主要服务训练/推理作业编排 | AscendJob 类型、Kubeflow common 依赖、Ascend Operator README | 具体控制器行为在 `component/ascend-operator` 中实现，不在本模块内 |

### 当前证据不足

| 问题 | 缺口 |
|---|---|
| `api/consts.go` 中每个常量的完整语义 | 未提供该文件源码正文 |
| `common-utils` 每个工具函数的具体输入输出 | 仅有目录、文件名和少量文件列表 |
| `devmanager` 接口完整方法集合 | 未提供 `devmanager.go` 正文 |
| AscendJob CRD YAML 安装位置和资源复数名完整定义 | 当前证据仅显示 client 使用公共常量 `api.AscendJobsLowerCase` |
| 生成代码的生成命令 | 未看到 codegen 脚本或 Makefile 证据 |