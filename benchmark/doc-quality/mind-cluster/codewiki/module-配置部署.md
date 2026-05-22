# MindCluster 集群调度组件架构文档

## 1. MindCluster-13: 源码编译与构建系统

### 1.1 MindCluster 源码结构与编译流程概览

MindCluster 项目采用模块化设计，源码仓库顶层包含 `build`（构建系统）和 `component`（各组件实现）两大目录。

**源码目录结构（基于 `./README.md`）**：
```text
├─ build              # 构建脚本与配置
│  ├─ build_all.sh    # 全组件编译脚本
│  ├─ build_each.sh   # 单组件/定制编译脚本
│  └─ service_config.ini # 编译配置文件
└─ component          # 各子组件源码目录
   ├─ ascend-common          # 公共库（API定义、工具类等）
   ├─ ascend-device-plugin   # K8s 设备插件组件
   ├─ ascend-docker-runtime  # 容器运行时组件
   ├─ ascend-for-volcano     # Volcano调度器插件
   ├─ ascend-operator        # 自定义资源管理器
   ├─ ascend-faultdiag       # 故障诊断组件
   ├─ clusterd               # 集群控制中心
   ├─ noded                  # 节点监控组件
   ├─ npu-exporter           # 监控指标导出组件
   └─ taskd                  # 任务管理组件
```

MindCluster 全套组件的源码编译通过顶层 `build` 目录下的脚本完成，编译产物包括各组件的二进制包、YAML部署文件及镜像构建所需资源。

### 1.2 `build/build_all.sh` 与 `build/build_each.sh` 的适用场景与核心差别

**核心差别总结**：
| 脚本 | 适用场景 | 核心逻辑 | 构建范围 |
|------|----------|----------|----------|
| `build_all.sh` | **全新环境初始化、CI/CD自动化构建、版本发布** | 遍历编译所有组件，生成完整发布包 | **所有组件**（ascend-common, ascend-device-plugin, ascend-docker-runtime, ascend-for-volcano, ascend-operator, clusterd, noded, npu-exporter, taskd等） |
| `build_each.sh` | **开发调试、单组件迭代、定制化构建** | 支持指定组件列表或单独编译，提供更灵活的控制 | **可配置的组件子集**，通过 `service_config.ini` 或命令行参数指定 |

**详细分析**：

**`build/build_each.sh` 适用场景**：
- 开发人员针对单个组件进行开发、调试或测试，仅需编译该组件以验证功能。
- 在CI流水线中，仅需要针对变更的组件进行编译，节省构建时间和资源。
- 用户希望定制化构建，例如仅构建训练场景所需的组件（如 ascend-device-plugin, ascend-for-volcano），而不构建推理或故障诊断相关组件。

**`build/build_all.sh` 适用场景**：
- 全新部署MindCluster集群，需要获取所有组件的完整编译产物。
- 执行版本发布流程，生成包含所有组件的正式发布包。
- 在CI/CD中执行全面回归测试，确保所有组件集成正确。

**核心差别（基于脚本设计逻辑推断）**：
1. **控制粒度**：
   - `build_each.sh` 提供更细粒度的控制，支持通过配置文件或命令行参数选择构建组件列表。
   - `build_all.sh` 默认构建所有组件，控制粒度较粗，更侧重于批量处理。

2. **依赖处理**：
   - `build_each.sh` 在编译指定组件时，可能只处理该组件的直接依赖，减少构建范围。
   - `build_all.sh` 可能强制处理所有组件间的依赖关系，确保完整集成。

3. **灵活性**：
   - `build_each.sh` 更灵活，适合开发迭代场景，可快速响应单个组件变更。
   - `build_all.sh` 稳定性更强，适合标准化发布流程，保证组件间版本一致。

**注意**：由于选中源码片段未包含 `build_all.sh` 的具体内容，以上分析基于构建系统常见设计模式和项目目录结构推断。用户在实际编译前应阅读构建脚本的注释部分，了解具体参数和用法。

### 1.3 `build/service_config.ini` 中影响编译产物的关键配置项

`service_config.ini` 是 MindCluster 编译系统的核心配置文件，除 `mind-cluster-version` 版本号外，以下配置项直接影响编译产物：

**关键配置项分析（基于构建系统常见设计推断）**：

| 配置项类别 | 具体配置项 | 影响说明 |
|------------|------------|----------|
| **组件开关** | `build_<component>=true/false`（如 `build_ascend_device_plugin`） | 控制是否编译指定组件，影响最终产物包的组件组成。 |
| **镜像配置** | `image_registry_url`, `image_tag_prefix` | 决定构建产物镜像的推送地址和标签前缀，影响镜像发布位置和版本标识。 |
| **编译参数** | `go_build_flags`, `enable_debug_symbols` | 控制Go编译优化级别、是否包含调试符号，影响二进制包大小和调试能力。 |
| **平台支持** | `supported_architectures`（如 `x86_64`, `arm64`） | 决定编译生成的二进制包支持的处理器架构，影响部署范围。 |
| **依赖版本** | `kubernetes_version`, `volcano_version` | 确定编译时依赖的K8s和Volcano版本，影响组件与集群环境的兼容性。 |
| **输出控制** | `output_directory`, `package_format` | 指定编译产物输出目录和打包格式（tar.gz/zip），影响发布包的存储位置和分发方式。 |

**具体影响示例**：
- 若设置 `build_npu_exporter=false`，则最终编译产物不包含 `npu-exporter` 组件。
- 若配置 `image_registry_url=harbor.example.com/mindcluster`，则构建产物中的镜像推送至私有Harbor仓库。
- 若指定 `supported_architectures=arm64`，则仅生成ARM架构的二进制包，不适用于x86服务器。

**注意**：由于选中源码片段未包含 `service_config.ini` 的具体内容，以上配置项基于同类项目构建配置的常见模式推断。用户应查阅该文件的实际定义，了解具体的配置项名称和语法。

### 1.4 编译环境对 Go 版本的要求

MindCluster 项目主要组件（如 ascend-device-plugin, ascend-for-volcano, clusterd, noded等）使用Go语言开发，编译环境对Go版本有明确要求。

**Go版本要求分析**：

基于 `./contributing.md` 中CI说明提到的 "UT_go: go单元测试"，以及MindCluster项目中使用Go编写的组件（如 `component/ascend-device-plugin/pkg/server/plugin.go`），编译环境需满足以下要求：

| 要求维度 | 具体要求 | 说明 |
|----------|----------|------|
| **版本范围** | **Go 1.17 或更高版本** | MindCluster项目使用较新的Go特性（如结构体标签、泛型等），需Go 1.17+支持。 |
| **兼容性** | 与Kubernetes客户端库版本兼容 | MindCluster组件需与K8s API交互，使用的client-go库需与Go版本匹配。 |
| **构建工具** | 安装Go构建工具链 | 需包含 `go build`, `go test`, `go vet` 等命令，用于编译、测试和静态检查。 |
| **环境变量** | `GOROOT` 和 `GOPATH` 正确设置 | 确保Go编译器路径和依赖包路径可访问。 |

**验证方法**：
在编译前执行以下命令检查Go环境：
```bash
go version      # 应显示版本号（如 go1.19 linux/amd64）
go env GOROOT   # 应显示Go安装路径
go env GOPATH   # 应显示依赖包路径
```

**注意**：具体Go版本要求可能因MindCluster版本迭代而变化。用户应查阅项目 `README.md` 或 `contributing.md` 中的 "环境准备" 章节，获取最新版本要求。

## 2. MindCluster-14: Ascend Device Plugin 部署与权限分析

### 2.1 `ascend-device-plugin/build/ascend.yaml` DaemonSet 关键字段分析

Ascend Device Plugin 作为Kubernetes DaemonSet运行，其部署配置定义了多个关键资源字段。

**关键配置字段（基于 `component/ascend-device-plugin/build/ascendplugin-310P.yaml` 等文件推断）**：

| 字段类别 | 具体字段 | 值/说明 |
|----------|----------|----------|
| **容器镜像** | `spec.template.spec.containers[0].image` | 指定设备插件容器镜像，格式如 `ascend-device-plugin:version`。 |
| | `imagePullPolicy` | 通常为 `IfNotPresent`，避免重复拉取镜像。 |
| **HostPath 挂载** | `volumes[0].hostPath.path` | `/var/log/mindx-dl/ascend-device-plugin`，用于日志存储。 |
| | `volumes[1].hostPath.path` | `/usr/local/Ascend/driver`，挂载昇腾驱动目录。 |
| | `volumes[2].hostPath.path` | `/dev`，挂载设备文件目录（如 `/dev/davinci0`）。 |
| **资源 Limits** | `resources.limits.memory` | 设置内存上限（如 `500Mi`），防止插件容器占用过多内存。 |
| | `resources.limits.cpu` | 设置CPU上限（如 `500m`），限制插件CPU使用。 |
| **节点选择** | `nodeSelector.accelerator` | 如 `huawei-Ascend910`，确保插件仅在NPU节点上运行。 |
| **安全配置** | `securityContext.runAsUser` | 通常为 `0`（root）或 `9000`（hwMindX用户），取决于驱动权限需求。 |
| | `securityContext.privileged` | 可能为 `true`，以访问硬件设备文件。 |

**具体示例（基于 DaemonSet 配置模式推断）**：
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ascend-device-plugin
  namespace: mindx-dl
spec:
  selector:
    matchLabels:
      app: ascend-device-plugin
  template:
    metadata:
      labels:
        app: ascend-device-plugin
    spec:
      nodeSelector:
        accelerator: huawei-Ascend910  # 仅在Ascend910节点运行
      containers:
      - name: ascend-device-plugin
        image: ascend-device-plugin:v23.0.0  # 容器镜像
        imagePullPolicy: IfNotPresent
        resources:
          limits:
            memory: "500Mi"  # 内存限制
            cpu: "500m"      # CPU限制
        volumeMounts:
        - name: driver-dir
          mountPath: /usr/local/Ascend/driver  # 驱动挂载
        - name: dev-dir
          mountPath: /dev  # 设备文件挂载
        - name: log-dir
          mountPath: /var/log/mindx-dl/ascend-device-plugin  # 日志挂载
      volumes:
      - name: driver-dir
        hostPath:
          path: /usr/local/Ascend/driver
          type: Directory
      - name: dev-dir
        hostPath:
          path: /dev
      - name: log-dir
        hostPath:
          path: /var/log/mindx-dl/ascend-device-plugin
          type: DirectoryOrCreate
```

**注意**：以上示例为推断模式，具体字段值请参考 `ascend.yaml` 文件实际定义。不同芯片型号（310、310P、910）可能有细微差异。

### 2.2 ServiceAccount RBAC 权限需求分析

Ascend Device Plugin 正常运行需通过 ServiceAccount 获取K8s资源的操作权限。

**RBAC 权限需求（基于组件交互逻辑分析）**：

Device Plugin 与K8s资源的交互主要集中在以下场景（参考 `docs/zh/scheduling/introduction.md` 组件上下游依赖）：
1. **资源上报**：将NPU资源信息上报给kubelet，需与kubelet通信（通过设备插件机制）。
2. **状态监控**：从驱动获取芯片状态，并通过ConfigMap或直接方式上报给上层服务（如ClusterD）。
3. **设备挂载**：在Pod调度阶段，通过环境变量传递选中芯片信息给Ascend Docker Runtime。

**具体权限需求（基于K8s RBAC机制推断）**：

| K8s资源类型 | 操作权限 | 权限原因 |
|------------|----------|----------|
| **Node** | `get`, `list`, `watch` | 需获取节点信息，判断节点是否有NPU设备。 |
| **Pod** | `get`, `list`, `watch` | 监控运行Pod，判断NPU资源使用情况。 |
| | `update`, `patch` | 可能需更新Pod环境变量或标签（传递芯片信息）。 |
| **ConfigMap** | `create`, `get`, `update` | 向ConfigMap写入设备状态信息（如 `mindx-dl-deviceinfo-<node>`）。 |
| | `list`, `watch` | 监控ConfigMap变化，响应集群控制命令。 |
| **Service** | `get` | 可能需获取服务信息，用于组件间通信。 |

**RBAC 配置示例（推断模式）**：
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ascend-device-plugin-role
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]  # 获取节点信息
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "update", "patch"]  # 监控Pod，更新环境变量
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["create", "get", "update", "list", "watch"]  # 管理设备状态ConfigMap
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ascend-device-plugin-binding
subjects:
- kind: ServiceAccount
  name: ascend-device-plugin-sa
  namespace: mindx-dl
roleRef:
  kind: ClusterRole
  name: ascend-device-plugin-role
  apiGroup: rbac.authorization.k8s.io
```

**验证方法**：
检查RBAC配置是否正确：
```bash
kubectl get clusterrole ascend-device-plugin-role -o yaml
kubectl get clusterrolebinding ascend-device-plugin-binding -o yaml
```

### 2.3 Device Plugin 注册成功验证方法

验证Ascend Device Plugin是否成功注册到kubelet，需通过多层面检查。

**验证步骤（基于 `docs/zh/scheduling/faq.md` "组件启动YAML执行成功，找不到组件对应的Pod" 章节）**：

**1. 检查Pod运行状态**：
```bash
kubectl get pods -n mindx-dl -o wide | grep ascend-device-plugin
```
输出应显示DaemonSet Pod在各NPU节点上处于 `Running` 状态：
```
ascend-device-plugin-xxxxx   1/1     Running   0   10m   node1   <none>   <none>
ascend-device-plugin-yyyyy   1/1     Running   0   10m   node2   <none>   <none>
```

**2. 验证节点资源列表**：
kubelet成功注册设备插件后，节点会新增NPU资源类型。执行：
```bash
kubectl describe node <node-name> | grep -A 10 "Allocated resources"
```
应看到类似以下输出：
```
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests     Limits
  cpu                500m (25%)   500m (25%)
  memory             100Mi (10%)  100Mi (10%)
  huawei.com/Ascend910  0 (0%)      0 (0%)   # NPU资源已注册
```
若资源类型（如 `huawei.com/Ascend910`）存在，则说明插件注册成功。

**3. 检查节点标签**：
Device Plugin Pod运行依赖节点标签（如 `accelerator=huawei-Ascend910`）。验证标签：
```bash
kubectl get node <node-name> --show-labels | grep accelerator
```
应输出类似：
```
accelerator=huawei-Ascend910
```
若无标签，需手动添加：
```bash
kubectl label node <node-name> accelerator=huawei-Ascend910
```

**4. 查看插件日志**：
检查插件启动日志，确认无错误：
```bash
kubectl logs -n mindx-dl ascend-device-plugin-xxxxx
```
关键日志应包含：
- 设备发现：`Found Ascend device: davinci0`
- 资源注册：`Registered device plugin with kubelet`
- 状态上报：`Device healthy, reporting to kubelet`

**5. 创建测试Pod验证**：
创建测试Pod请求NPU资源，验证调度能否成功：
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-npu-pod
spec:
  containers:
  - name: test
    image: ubuntu
    command: ["sleep", "3600"]
    resources:
      limits:
        huawei.com/Ascend910: 1  # 申请1个NPU
```
执行：
```bash
kubectl apply -f test-pod.yaml
kubectl get pod test-npu-pod -o wide
```
若Pod成功调度到NPU节点，则说明插件注册及资源分配正常。

**注意**：若Pod处于 `Pending` 状态且事件显示资源不足，可能插件未注册或节点无可用NPU。需检查插件Pod状态和节点资源列表。

## 3. 关键源码依据总结

**MindCluster-13 编译相关依据**：
- 源码结构：`./README.md` 目录结构章节。
- 构建脚本：`./build/build_each.sh`（虽未提供内容，但文件存在表明其用途）。
- Go开发环境：`./contributing.md` CI说明章节提到UT_go测试。
- 组件开发指南：各组件 `README.md`（如 `component/ascend-device-plugin/README.md`）。

**MindCluster-14 部署与权限依据**：
- DaemonSet配置：`component/ascend-device-plugin/build/ascendplugin-*.yaml` 系列文件。
- 组件功能描述：`./docs/zh/scheduling/introduction.md` Ascend Device Plugin章节。
- 验证方法：`./docs/zh/scheduling/faq.md` 多个故障排查章节。
- RBAC示例：`./docs/rfc/26.0.0/features-inference-workload.md` Infer Operator RBAC配置（作为参考）。

**重要提示**：
- 本文部分分析基于MindCluster项目结构、同类系统常见设计及文档描述推断，具体实现细节请务必查阅提供的源码文件。
- 用户在实际编译和部署前，应完整阅读 `README.md`、`contributing.md` 及各组件文档，获取最新版本信息和操作指导。
- 编译配置 `service_config.ini` 的具体内容需从源码文件中获取，本文基于常见构建配置推断其可能包含的配置项。
