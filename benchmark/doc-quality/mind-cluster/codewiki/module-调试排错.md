# MindCluster 调度排错：Pod Pending 状态定位与 Predicate 失败分析

## 1. Pod Pending 状态问题定位流程

当训练任务 Pod 持续处于 Pending 状态时，建议按以下步骤排查：

### 1.1 查看 Kubernetes 事件
```bash
kubectl describe pod <pod-name> -n <namespace>
```
重点关注 Events 部分中的调度失败原因。

### 1.2 检查 MindCluster 组件状态
```bash
kubectl get pods -n mindx-dl -o wide
kubectl get pods -n kube-system -o wide
```
确保以下组件处于 Running 状态：
- `ascend-device-plugin` (DaemonSet)
- `volcano-scheduler`
- `noded` (可选，用于节点故障检测)
- `clusterd` (可选，用于集群故障聚合)

### 1.3 检查节点资源状态
```bash
kubectl get nodes -o wide
kubectl describe node <node-name>
```
查看节点上是否有 `accelerator=huawei-Ascend910` 等标签，以及 Allocatable 中的 NPU 资源。

### 1.4 查看组件日志
关键组件日志路径：
- **ascend-device-plugin**: `/var/log/mindx-dl/ascend-device-plugin/`
- **volcano-scheduler**: 通过 `kubectl logs volcano-scheduler-* -n mindx-dl` 查看
- **ascend-for-volcano 插件日志**: 集成在 volcano-scheduler 日志中

### 1.5 检查 ConfigMap 资源信息
```bash
kubectl get cm -n kube-system | grep deviceinfo
kubectl describe cm mindx-dl-deviceinfo-<node-name> -n kube-system
```
查看 `DeviceInfoCfg` 中的 NPU 节点信息、芯片健康状态等。

## 2. ascend-for-volcano Predicate 失败日志分析

### 2.1 Predicate 函数调用链
基于 `./component/ascend-for-volcano/plugin/node.go` 中的 `NodePredicate` 函数：

**核心调用链**:
```
NodePredicate (节点预选入口)
├── FaultHandle.CheckNodeNPUByTask (故障处理检查)
├── vcJob.preCheckNodePredicate (预检查)
└── vcJob.policyHandler.CheckNodeNPUByTask (资源策略检查)
```

### 2.2 Predicate 失败日志级别
根据 `./component/ascend-for-volcano/common/util/type.go` 定义的日志级别：
- **ErrorLev (1)**: 参数为空等严重错误
- **WarningLev (2)**: 未使用（当前代码中未出现）
- **InfoLev (3)**: 未使用
- **DebugLev (4)**: 节点预选详细过程

**Predicate 失败主要输出 DebugLev 级别日志**，包含节点名称和具体错误信息。

### 2.3 Predicate 失败典型日志示例
```go
// node.go 中第 57-63 行
klog.V(util.LogErrorLev).Infof("NodePredicate got null parameter(s), which is invalid.")

// node.go 中第 67-69 行
klog.V(util.LogDebugLev).Infof("NodePredicate %s not in.", nodeInfo.Name)

// node.go 中第 101-104 行
klog.V(util.LogDebugLev).Infof("checkNodeNPUByTask %s:%s ,cannot be selected.", 
    vcNode.Name, util.SafePrint(err))
```

### 2.4 Predicate 失败错误类型
从 `./component/ascend-for-volcano/common/util/type.go` 中提取的错误常量：

```go
ArgumentError = "invalid argument"          // 参数无效
RankIdNotExistError = "rank id does not exist"  // Rank ID 不存在
TopoTreeLabelError = "topology label does not match config" // 拓扑标签不匹配
```

从 `./component/ascend-for-volcano/plugin/type.go` 中的错误定义：
```go
objectNilError = "object or argument is nil"
FormatIncorrectError = "format incorrect"
```

## 3. 三种 Pending 原因的区分方法

### 3.1 NPU 资源不足
**识别依据**:
- 日志关键字: `JudgeNodeAndTaskNPU` 相关错误
- 来自 `policyHandler.CheckNodeNPUByTask` 调用链
- 典型日志模式 (参考 `superpod/frame.go` 第 89-92 行):
```go
klog.V(util.LogDebugLev).Infof("%s JudgeNodeAndTaskNPU err: %s", task.Name, err.Error())
```

**验证方法**:
1. 检查节点 ConfigMap 中空闲 NPU 数量:
   ```bash
   kubectl describe cm mindx-dl-deviceinfo-<node> -n kube-system | grep "Ascend910"
   ```
2. 对比 Pod 资源请求 (`kubectl describe pod` 的 `Requests` 部分)

### 3.2 调度策略拒绝
**识别依据**:
- 日志关键字: `preCheckNodePredicate`、`SuperPodID`、拓扑相关错误
- 来自调度策略检查 (如超节点调度、交换机亲和性)
- 示例错误 (参考 `superpod/frame.go` 第 55-56 行):
```go
return fmt.Errorf("node %s is not super-pod node or superPodID is not set", node.Name)
```
- 拓扑标签错误 (来自 `util.type.go`):
```go
TopoTreeLabelError = "topology label does not match config"
```

**验证方法**:
1. 检查 PodGroup annotations (`kubectl get pg -n <namespace> -o yaml`)
2. 验证是否配置了 `sp-block`、`tor-affinity` 等策略
3. 检查节点标签是否满足拓扑要求 (如 `tor-affinity` 标签)

### 3.3 设备插件未就绪
**识别依据**:
- 日志关键字: `ArgumentError`、`Annotation` 相关错误
- 来自设备信息缺失或节点不健康
- 典型错误 (参考 `superpod/frame.go` 第 42-46 行):
```go
if tp == nil || task == nil || len(node.Annotation) == 0 {
    err := errors.New(util.ArgumentError)
    klog.V(util.LogErrorLev).Infof("CheckNodeNPUByTask err: %s", err)
    return err
}
```

**节点不健康检测** (参考 `node_test.go` 第 116-124 行):
```go
// 测试案例: UnHealthy Node
CommonNode: CommonNode{
    Label:      map[string]string{util.NodeDEnableKey: util.NodeDEnableOnValue},
    Annotation: map[string]string{util.NodeHealthyStatusKey: util.PreSeparateFaultCode},
}
```

**验证方法**:
1. 检查节点健康状态 ConfigMap (`mindx-dl-nodeinfo-*`):
   ```bash
   kubectl describe cm mindx-dl-nodeinfo-<node> -n kube-system
   ```
   查看是否包含 `UnHealthy` 或 `PreSeparate` 状态
2. 验证 ascend-device-plugin 是否正常运行:
   ```bash
   kubectl get pod -l app=ascend-device-plugin -n kube-system
   kubectl logs <device-plugin-pod> -n kube-system
   ```
3. 检查节点是否上报了设备信息:
   ```bash
   kubectl describe cm mindx-dl-deviceinfo-<node> -n kube-system
   ```
   若 ConfigMap 不存在或内容为空，表示设备插件未上报

## 4. 关键文件路径与源码依据

### 4.1 Predicate 核心逻辑
- **文件**: `./component/ascend-for-volcano/plugin/node.go`
- **函数**: `NodePredicate` (第 34-106 行)
- **关键调用**: `FaultHandle.CheckNodeNPUByTask`, `preCheckNodePredicate`, `policyHandler.CheckNodeNPUByTask`

### 4.2 日志级别定义
- **文件**: `./component/ascend-for-volcano/common/util/type.go`
- **常量**: `LogErrorLev = 1`, `LogDebugLev = 4` (第 28-33 行)

### 4.3 节点健康状态定义
- **文件**: `./component/ascend-for-volcano/common/util/type.go`
- **常量**: `NodeHealthyStatusKey`, `NodeUnHealthy`, `PreSeparateFaultCode` (第 82-93 行)

### 4.4 SuperPod 调度检查
- **文件**: `./component/ascend-for-volcano/internal/npu/ascend910/ascend910a3/superpod/frame.go`
- **函数**: `CheckNodeNPUByTask` (第 40-93 行)
- **典型错误**: 节点 Annotation 缺失、SuperPodID 不合法、资源不足

### 4.5 调度算法说明
- **文档**: `./docs/zh/scheduling/usage/basic_scheduling/01_affinity_scheduling/05_scheduling_algorithm_of_ascend_ai_processor.md`
- **流程**: 任务校验 → 节点预选 → 节点优选 → NPU 选择

### 4.6 故障检测原理
- **文档**: `./docs/zh/scheduling/usage/resumable_training/01_solutions_principles.md`
- **故障上报**: Ascend Device Plugin 通过 ConfigMap 上报芯片故障和节点健康状态

## 5. 扩展点与配置部署

### 5.1 调度策略扩展
通过 PodGroup annotations 配置调度策略 (参考 `./docs/zh/scheduling/api/volcano.md`):
```yaml
annotations:
  sp-block: "16"          # 超节点大小
  tor-affinity: "normal-schema" # 交换机亲和性
```

### 5.2 节点健康检测配置
节点健康状态由 NodeD 通过 ConfigMap 上报 (参考 `./component/ascend-for-volcano/common/util/type.go`):
- ConfigMap 名称: `mindx-dl-nodeinfo-<node-name>`
- 健康状态键: `NodeHealthyStatus`

### 5.3 资源隔离配置
节点需配置标签以启用 NPU 资源 (参考 `./docs/zh/scheduling/faq.md`):
```bash
kubectl label node <node-name> accelerator=huawei-Ascend910
```

## 6. 总结
通过分析 `ascend-for-volcano` 的 Predicate 日志输出和错误类型，结合 Kubernetes 事件和 ConfigMap 资源状态，可有效区分 NPU 资源不足、调度策略拒绝和设备插件未就绪三种 Pending 原因。关键依据包括：
1. **日志级别**: Predicate 失败主要输出 DebugLev (4) 日志
2. **错误内容**: 区分 `ArgumentError`、拓扑错误、资源不足错误
3. **组件状态**: 结合 device-plugin、noded、clusterd 的健康状态
4. **资源上报**: 验证 ConfigMap 中节点设备信息和健康状态
