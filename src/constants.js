export const STAGES = [
  {
    index: 1,
    key: "proposal",
    file: "proposal.md",
    agentCommand: "/matspec.proposal",
    command: "matspec.proposal",
    label: "需求澄清",
    name: "Requirement clarification",
    objective: "Discover the real need behind the requested change, then clarify scope boundary, non-goals, confirmed decisions, and acceptance criteria.",
    inputs: ["matspec/specs/spec.md", "matspec/specs/design.md", "matspec/service-context.md"],
    requiresFullSpec: false,
    requiresFullDesign: false,
    required_for_done: true,
    noFile: false
  },
  {
    index: 2,
    key: "delta-spec",
    file: "delta-spec.md",
    agentCommand: "/matspec.delta-spec",
    command: "matspec.delta-spec",
    label: "规格增量",
    name: "Spec delta",
    objective: "Turn the requirement into verifiable business-rule deltas and mark added, modified, and removed behavior.",
    inputs: ["matspec/specs/spec.md", "proposal.md"],
    requiresFullSpec: true,
    requiresFullDesign: false,
    required_for_done: true,
    noFile: false
  },
  {
    index: 3,
    key: "delta-design",
    file: "delta-design.md",
    agentCommand: "/matspec.delta-design",
    command: "matspec.delta-design",
    label: "设计增量",
    name: "Design delta",
    objective: "Design the implementation approach across rules, APIs, data, flows, and risks.",
    inputs: ["matspec/specs/design.md", "proposal.md", "delta-spec.md"],
    requiresFullSpec: false,
    requiresFullDesign: true,
    required_for_done: true,
    noFile: false
  },
  {
    index: 4,
    key: "tasks",
    file: "tasks.md",
    agentCommand: "/matspec.tasks",
    command: "matspec.tasks",
    label: "任务拆解",
    name: "Task breakdown",
    objective: "Break the design into executable and verifiable tasks for developers or AI agents.",
    inputs: ["matspec/specs/spec.md", "matspec/specs/design.md", "delta-spec.md", "delta-design.md"],
    requiresFullSpec: true,
    requiresFullDesign: true,
    required_for_done: true,
    noFile: false
  },
  {
    index: 5,
    key: "validation",
    file: "validation.md",
    agentCommand: "/matspec.validation",
    command: "matspec.validation",
    label: "一致性验证",
    name: "Consistency validation",
    objective: "Validate coverage across proposal, spec, design, and tasks, then decide whether implementation may start.",
    inputs: ["matspec/specs/spec.md", "matspec/specs/design.md", "proposal.md", "delta-spec.md", "delta-design.md", "tasks.md"],
    requiresFullSpec: true,
    requiresFullDesign: true,
    required_for_done: true,
    delegate: "stage-generator",
    noFile: false
  },
  {
    index: 6,
    key: "implementation",
    command: "matspec.implement",
    agentCommand: "/matspec.implement",
    label: "实现",
    name: "Implementation",
    objective: "Execute the confirmed tasks through task-executor and record task status.",
    inputs: ["tasks.md", "validation.md"],
    requiresFullSpec: false,
    requiresFullDesign: false,
    required_for_done: true,
    delegate: "task-executor",
    noFile: true
  },
  {
    index: 7,
    key: "review",
    file: "review.md",
    command: "matspec.review",
    agentCommand: "/matspec.review",
    label: "实现审查",
    name: "Implementation review",
    objective: "Review the implementation against the confirmed documents and decide Approved or Changes Required.",
    inputs: ["proposal.md", "delta-spec.md", "delta-design.md", "tasks.md", "validation.md"],
    requiresFullSpec: true,
    requiresFullDesign: true,
    required_for_done: true,
    delegate: "stage-generator",
    noFile: false
  }
];

export const CONFIG_YAML = `version: 1
profile: industrial
structure: matspec-dir
workflowPack: matspec
workflowProfile: light
paths:
  docs: matspec
  specs: matspec/specs
  changes: matspec/changes
  archives: matspec/changes/archives
  runtime: .matspec-cli
templates:
  preset: company-default
  language: zh-CN
change:
  id_prefix: AR
  naming: "{id}-{slug}"
  single_active_change: false
validation:
  require_validation_doc: true
  require_service_context: false
  fail_on_missing_required_sections: true
integrations:
  default: generic
  enabled: [generic]
generation:
  runner: opencode
  supported_runners:
    - opencode
    - opencode-serve
    - relay-serve
    - relay-pool
    - chrys
    - codegenie
    - codeagent
    - nga
  mode: module-first
  apply_requires_force_on_existing: true
extensions: {}
`;

export const RUNTIME_DIRS = [
  ".matspec-cli",
  ".matspec-cli/manifests",
  ".matspec-cli/manifests/integrations",
  ".matspec-cli/workflows",
  ".matspec-cli/workflow-commands",
  ".matspec-cli/presets",
  ".matspec-cli/integrations",
  ".matspec-cli/extensions",
  ".matspec-cli/runs",
  ".matspec-cli/cache",
  ".matspec-cli/tmp",
  ".matspec-cli/report-queue"
];

export const DOC_DIRS = [
  "matspec/specs",
  "matspec/changes",
  "matspec/changes/archives",
  "matspec/guidelines",
  "matspec/templates",
  "matspec/extensions"
];

export const VERSION = "0.4.1-beta.3";

export const FINALIZATION_FILES = [
  "matspec/specs/spec.md",
  "matspec/specs/design.md"
];
