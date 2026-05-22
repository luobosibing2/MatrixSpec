# MindCluster 扩展开发架构文档

## 一、新增 NPU 芯片型号支持（mindcluster-15）

### 1. 组件职责与文件变更分析

基于源码目录结构，三个组件在支持新 NPU 芯片型号时的职责分工如下：

#### 1.1 `ascend-common/devmanager` - 底层设备管理接口层

**职责**：提供与硬件交互的统一抽象接口，屏蔽不同芯片型号的差异。

**关键目录/文件**（推断基于 `README.md` 目录结构）：
- `component/ascend-common/devmanager/common/` - 设备管理公共定义
- `component/ascend-common/devmanager/dcmi/` - DCMI（Device Control and Management Interface）接口封装
- `component/ascend-common/devmanager/hccn/` - HCCN（High-speed Cluster Communication Network）接口封装

**变更内容**：
- 在 `dcmi/` 下新增芯片型号的 DCMI 接口定义（如 `dcmi_interface_api.h` 中需添加新芯片的接口声明）
- 在 `common/` 中扩展芯片型号标识常量、设备类型枚举等
- **统一接口约定**：`devmanager` 提供 `DeviceInterface` 接口（源码未直接提供，但 `npu-exporter` 中使用了 `devmanager.DeviceManager`），所有芯片型号需实现该接口的设备查询、健康状态获取等方法。

#### 1.2 `ascend-device-plugin/pkg/device` - 设备插件与上报层

**职责**：Kubernetes 设备插件，负责节点级芯片资源发现、健康状态上报、资源分配。

**关键目录/文件**（推断基于 `README.md`）：
- `pkg/device/` - 设备逻辑实现
- `pkg/device/deviceswitch/` - 设备开关/选择逻辑
- `pkg/next/deviceswitch/customname` - 自定义设备名称处理（可能用于新芯片型号映射）

**变更内容**：
- 在 `pkg/device/` 下新增新芯片型号的设备识别逻辑（如芯片 ID 匹配、拓扑构建）
- 在 `deviceswitch/` 中扩展新芯片的资源挂载和 annotation 注入策略
- 与 `devmanager` 同步：使用 `devmanager.DeviceInterface` 获取设备信息，并上报至 ConfigMap（如 `device-info-cm`）

#### 1.3 `ascend-for-volcano/internal/npu` - 调度策略层

**职责**：Volcano 调度插件，实现 NPU 亲和性调度策略，根据芯片拓扑优化任务分配。

**关键目录/文件**（基于 `factory.go` 源码）：
- `internal/npu/` - NPU 调度核心目录
- `internal/npu/factory.go` - 调度处理器工厂，注册各芯片型号的调度策略
- `internal/npu/ascend910/`、`ascend310/` 等 - 具体芯片型号的调度策略实现

**源码依据**：`factory.go` 中通过 `card910Factory`、`card310Factory`、`card310pFactory` 等字典注册调度处理器：
```go
// 文件路径: ./component/ascend-for-volcano/internal/npu/factory.go
func initCard910Factory() {
    card910Factory[module910bx16.SchedulerName] = func() base.AscendHandler { return module910bx16.New(module910bx16.SchedulerName) }
    card910Factory[module910x8.SchedulerName] = func() base.AscendHandler { return module910x8.New(module910x8.SchedulerName) }
    // ... 其他型号注册
}
```

**变更内容**：
- 在 `internal/npu/` 下新建芯片型号子目录（如 `ascend910c/`），实现 `base.AscendHandler` 接口（推断接口包含调度方法如 `ScoreBestNPUNodes`、`UseAnnotation` 等，源码未直接提供接口定义，但 `factory.go` 返回 `base.AscendHandler`）
- 在 `factory.go` 中注册新芯片型号的调度策略工厂函数
- 与 `device-plugin` 同步：读取 `device-info-cm` 中上报的拓扑信息，实现调度打分

### 2. 组件间接口约定

三个组件通过**共享数据模型**和**配置定义**同步：

1. **芯片标识**：统一在 `ascend-common/devmanager/common/` 中定义芯片型号 ID、名称常量。
2. **设备拓扑信息**：`ascend-device-plugin` 通过 ConfigMap（`device-info-cm`）上报芯片拓扑，`ascend-for-volcano` 读取该 ConfigMap 进行调度。
3. **调度策略名称**：`ascend-for-volcano` 中的调度策略名称（如 `SchedulerName`）需与任务 YAML 中 `accelerator-type` 值匹配（源码片段未直接展示，但调度算法文档提到"选择不同的YAML进行修改适配"）。

**无直接源码提供接口约定文件**，但通过组件交互模式推断存在隐式约定。

---

## 二、新增 NPU 监控指标（mindcluster-16）

### 1. 自定义指标开发步骤

基于 `plugins/README.md` 和 `register.go` 源码，完整步骤如下：

#### 1.1 实现自定义 Collector（`plugins/` 目录）

**接口要求**（源码片段来自 `plugins/README.md`）：
```go
// 文件路径: ./component/npu-exporter/plugins/README.md
type MetricCollector interface {
    Describe(ch chan<- *prometheus.Desc)        // 指标描述注册
    CollectToCache(n *common.NpuCollector, chipList []common.HuaWeiAIChip)  // 采集到缓存
    UpdatePrometheus(ch chan<- prometheus.Metric, n *common.NpuCollector, containerMap map[int32]container.DevicesInfo, chips []common.HuaWeiAIChip) // Prometheus 格式上报
    UpdateTelegraf(fieldsMap map[string]map[string]interface{}, n *common.NpuCollector, containerMap map[int32]container.DevicesInfo, chips []common.HuaWeiAIChip) map[string]map[string]interface{} // Telegraf 格式上报
    IsSupported() bool  // 环境支持检测
    PreCollect()        // 采集前初始化（可为空实现）
    PostCollect()       // 采集后清理（可为空实现）
}
```

**实现示例**（`custom_metrics.go` 片段）：
```go
// 文件路径: ./component/npu-exporter/plugins/README.md (custom_metrics.go 片段)
type PluginInfoCollector struct {
    common.MetricsCollectorAdapter
    Cache sync.Map
}
func (c *PluginInfoCollector) Describe(ch chan<- *prometheus.Desc) { ... }
func (c *PluginInfoCollector) CollectToCache(n *common.NpuCollector, chipList []common.HuaWeiAIChip) { ... }
func (c *PluginInfoCollector) UpdatePrometheus(...) { ... }
```

#### 1.2 注册插件（`plugins/register.go`）

**注册函数**（源码）：
```go
// 文件路径: ./component/npu-exporter/plugins/register.go
func RegisterPlugin() {
    registerPlugin("text", &TextMetricsInfoCollector{})
    // Add custom plugin，pluginName should be consistent with the name in pluginConfiguration.json
    registerPlugin(machineCardNumPluginName, &MachineCardNumPluginInfoCollector{})
}
func registerPlugin(pluginName string, c common.MetricsCollector) {
    err := config.AddPluginCollector(pluginName, c)
    if err != nil {
        logger.Errorf("%v", err)
    }
}
```

**注意**：插件名称需与 `/usr/local/pluginConfiguration.json` 配置文件中的指标组名称一致。

#### 1.3 集成到 Prometheus Registry

**注册流程**（推断基于 `prometheus_collector.go` 源码）：
- `CollectorForPrometheus` 结构体通过 `Describe` 方法向 Prometheus Registry 注册指标描述：
```go
// 文件路径: ./component/npu-exporter/platforms/prom/prometheus_collector.go
func (*CollectorForPrometheus) Describe(ch chan<- *prometheus.Desc) {
    // ...
    describeChain(tempCh, common.ChainForCustomPlugin) // 链式调用所有 Collector 的 Describe 方法
    // ...
}
```
- 自定义 Collector 被添加到 `common.ChainForCustomPlugin` 链中（通过 `config.AddPluginCollector` 实现，源码未提供该函数细节，但 `register.go` 调用了它）。

#### 1.4 通过 `/metrics` 暴露

**暴露逻辑**（源码片段推断）：
- `prometheus_collector.go` 中 `Collect` 方法调用所有 Collector 的 `UpdatePrometheus` 方法生成 Metric，并通过 HTTP handler `/metrics` 暴露（标准 Prometheus exporter 模式）。

### 2. `plugins/` 与 `collector/` 目录分工

**分工说明**（基于目录结构和源码）：
- **`plugins/`**：存放**用户自定义插件**，允许用户扩展监控指标，通过统一注册机制集成。插件需实现 `MetricCollector` 接口，支持通过配置文件启用/禁用。
- **`collector/`**：存放**内置 Collector**，如 `collector/common/metrics_collector.go`、`collector/metrics/collector_for_hbm.go` 等，实现核心 NPU 指标采集。这些 Collector 硬编码在 `common.ChainForSingleGoroutine` 或 `ChainForMultiGoroutine` 中（见 `prometheus_collector_test.go`）。

**源码依据**：
```go
// 文件路径: ./component/npu-exporter/platforms/prom/prometheus_collector_test.go
func initChain() {
    common.ChainForSingleGoroutine = []common.MetricsCollector{
        &metrics.HccsCollector{},
        &metrics.BaseInfoCollector{},
        // ...
    }
    common.ChainForMultiGoroutine = []common.MetricsCollector{
        &metrics.NetworkCollector{},
        // ...
    }
}
```

自定义插件通过 `config.AddPluginCollector` 加入 `ChainForCustomPlugin` 链（推断）。

---

## 三、在线/离线故障诊断架构差异与扩展（mindcluster-17）

### 1. 架构核心差异

**目录结构对比**：
- **`ascend-faultdiag-online`**（在线诊断）：
  ```
  pkg/
  ├─algo_src/netfault    # 网络故障在线检测算法
  ├─algo_src/slownode    # 慢节点在线检测算法
  ├─core/                # 核心诊断框架
  ├─register/            # 注册路由和配置
  ├─service/             # 服务层
  └─utils/               # 工具
  ```
- **`ascend-faultdiag`**（离线诊断）：
  ```
  src/ascend_fd/
  ├─pkg/diag/            # 诊断逻辑
  ├─pkg/parse/           # 解析日志/指标
  ├─pkg/customize/       # 自定义诊断
  └─pkg/controller/      # 控制器
  ```

**核心差异推断**：
- **在线诊断**：实时运行在集群中，通过 grpc 接收实时数据（见 `pkg/utils/grpc/client_test.go`），执行 `algo_src` 中的在线算法，可能集成到训练任务生命周期中。
- **离线诊断**：事后分析工具，解析已生成的日志文件（如 `host_metrics_*.json`），基于知识图谱等模型进行诊断（见 `pkg/diag/knowledge_graph`）。

**源码依据**：
- `client_test.go` 展示在线诊断通过 grpc 连接实时数据源（如 `JobSummarySignalList`）。
- 离线诊断目录结构中有 `pkg/parse/node_anomaly/host_metrics_parse.py`，解析静态指标文件。

### 2. 在线检测算法实现

**`algo_src/netfault` 和 `algo_src/slownode`**：
源码片段未提供具体算法文件内容，但目录结构表明：
- **实现模式**：作为独立算法模块，集成到 `core` 诊断框架中。推断算法通过注册机制被调用，处理实时数据流。
- **数据输入**：通过 grpc 客户端接收实时训练数据（如 `JobSummarySignalList`）。
- **推断输出**：故障检测结果上报至服务层。

**源码依据**（推断）：
- `register/router/metric.go` 可能注册算法路由（未提供内容）。
- `core/context/diagcontext/metric_pool.go` 管理实时指标池（见文件名）。

### 3. 新增故障模式扩展点

基于目录结构，新增故障模式（如通信超时故障）需扩展：

#### 3.1 `register/` 目录
- **路由注册**：在 `register/router/` 下新增故障模式的路由处理（推断基于 `register/router/metric.go` 文件名）。
- **配置注册**：在 `register/` 下扩展配置文件，定义故障检测参数。

#### 3.2 `core/` 目录
- **核心诊断逻辑**：在 `core/` 下新增故障检测处理模块，可能扩展 `core/model/` 中的故障模型。
- **算法集成**：在 `algo_src/` 下新增对应算法实现（如 `algo_src/commtimeout`），并注册到 `core` 框架。

**源码依据**：
- `component/ascend-faultdiag-online/pkg/core/model/diagmodel/metricmodel/metric_model.go` 定义指标模型，需扩展新故障指标。
- `register/router/metric.go` 文件名表明存在路由注册机制。

**注意**：具体接口和配置格式源码未提供，只能基于目录结构推断扩展位置。
