export const STAGES = [
  {
    index: 1,
    key: "proposal",
    file: "proposal.md",
    agentCommand: "/matspec.proposal",
    name: "Requirement clarification",
    objective: "Clarify the business goal, scope, constraints, non-goals, and acceptance criteria.",
    inputs: ["matspec/specs/spec.md", "matspec/specs/design.md", "matspec/service-context.md"],
    requiresFullSpec: false,
    requiresFullDesign: false
  },
  {
    index: 2,
    key: "delta-spec",
    file: "delta-spec.md",
    agentCommand: "/matspec.delta-spec",
    name: "Spec delta",
    objective: "Turn the requirement into verifiable business-rule deltas and mark added, modified, and removed behavior.",
    inputs: ["matspec/specs/spec.md", "proposal.md"],
    requiresFullSpec: true,
    requiresFullDesign: false
  },
  {
    index: 3,
    key: "delta-design",
    file: "delta-design.md",
    agentCommand: "/matspec.delta-design",
    name: "Design delta",
    objective: "Design the implementation approach across rules, APIs, data, flows, and risks.",
    inputs: ["matspec/specs/design.md", "proposal.md", "delta-spec.md"],
    requiresFullSpec: false,
    requiresFullDesign: true
  },
  {
    index: 4,
    key: "tasks",
    file: "tasks.md",
    agentCommand: "/matspec.tasks",
    name: "Task breakdown",
    objective: "Break the design into executable and verifiable tasks for developers or AI agents.",
    inputs: ["matspec/specs/spec.md", "matspec/specs/design.md", "delta-spec.md", "delta-design.md"],
    requiresFullSpec: true,
    requiresFullDesign: true
  },
  {
    index: 5,
    key: "validation",
    file: "validation.md",
    agentCommand: "/matspec.validation",
    name: "Consistency validation",
    objective: "Validate coverage across proposal, spec, design, and tasks, then decide whether implementation may start.",
    inputs: ["matspec/specs/spec.md", "matspec/specs/design.md", "proposal.md", "delta-spec.md", "delta-design.md", "tasks.md"],
    requiresFullSpec: true,
    requiresFullDesign: true
  }
];

export const CONFIG_YAML = `version: 1
profile: industrial
structure: matspec-dir
paths:
  docs: matspec
  specs: matspec/specs
  changes: matspec/changes
  archives: matspec/changes/archives
  runtime: .matspec-cli
change:
  id_prefix: REQ
  single_active_change: false
validation:
  require_validation_doc: true
`;

export const RUNTIME_DIRS = [
  ".matspec-cli",
  ".matspec-cli/manifests",
  ".matspec-cli/manifests/integrations",
  ".matspec-cli/workflows",
  ".matspec-cli/presets",
  ".matspec-cli/integrations",
  ".matspec-cli/extensions",
  ".matspec-cli/runs",
  ".matspec-cli/cache",
  ".matspec-cli/tmp"
];

export const DOC_DIRS = [
  "matspec/specs",
  "matspec/changes",
  "matspec/changes/archives",
  "matspec/guidelines"
];
