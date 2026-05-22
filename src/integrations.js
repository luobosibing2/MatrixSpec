import fs from "node:fs";
import path from "node:path";
import { sha256, writeJson } from "./util.js";
import { isZh } from "./i18n.js";

const INTEGRATIONS = {
  opencode: {
    path: ".opencode/command",
    description: "opencode repository commands"
  },
  "claude-code": {
    path: ".claude/commands + .claude/skills",
    description: "Claude Code project slash commands and skills"
  },
  codex: {
    path: ".agents/skills",
    description: "Codex repository skills"
  }
};

function opencodeFiles(options = {}) {
  return {
  "matspec.md": opencodeCommand("matspec", "MatSpec Main Flow", mainFlowBody(options)),
  "matspec.proposal.md": opencodeCommand("matspec.proposal", "MatSpec Requirement Clarification", stageCommandBody(stageDefinitions.proposal, options)),
  "matspec.delta-spec.md": opencodeCommand("matspec.delta-spec", "MatSpec Spec Delta", stageCommandBody(stageDefinitions["delta-spec"], options)),
  "matspec.delta-design.md": opencodeCommand("matspec.delta-design", "MatSpec Design Delta", stageCommandBody(stageDefinitions["delta-design"], options)),
  "matspec.tasks.md": opencodeCommand("matspec.tasks", "MatSpec Task Breakdown", stageCommandBody(stageDefinitions.tasks, options)),
  "matspec.validation.md": opencodeCommand("matspec.validation", "MatSpec Consistency Validation", stageCommandBody(stageDefinitions.validation, options))
  };
}

function commands(options = {}) {
  return [
  {
    id: "matspec",
    title: "MatSpec",
    description: "Inspect the current MatSpec change and route to the active stage.",
    body: mainFlowBody(options)
  },
  {
    id: "matspec-proposal",
    title: "MatSpec Proposal",
    description: "Write the proposal stage for a MatSpec change.",
    body: stageCommandBody(stageDefinitions.proposal, options)
  },
  {
    id: "matspec-delta-spec",
    title: "MatSpec Delta Spec",
    description: "Write business-rule delta specifications for a MatSpec change.",
    body: stageCommandBody(stageDefinitions["delta-spec"], options)
  },
  {
    id: "matspec-delta-design",
    title: "MatSpec Delta Design",
    description: "Write implementation delta design for a MatSpec change.",
    body: stageCommandBody(stageDefinitions["delta-design"], options)
  },
  {
    id: "matspec-tasks",
    title: "MatSpec Tasks",
    description: "Break a MatSpec change into executable implementation and verification tasks.",
    body: stageCommandBody(stageDefinitions.tasks, options)
  },
  {
    id: "matspec-validation",
    title: "MatSpec Validation",
    description: "Validate coverage from proposal to tasks before implementation.",
    body: stageCommandBody(stageDefinitions.validation, options)
  }
  ];
}

const stageDefinitions = {
  proposal: {
    key: "proposal",
    index: 1,
    total: 5,
    name: "Requirement clarification",
    file: "proposal.md",
    command: "/matspec.proposal",
    objective: "Discover the real need behind the requested change, then clarify actor/workflow, success criteria, scope boundary, non-goals, confirmed decisions, and impact.",
    inputs: ["full spec.md if present", "full design.md if present", "service-context.md if present", "existing documents in the current change"],
    nextName: "Spec delta",
    artifactRule: "Write proposal.md as a real-need discovery artifact. It must distinguish `Requested Change vs Real Need`, define problem statement, actor/scenario, success criteria, scope boundary, non-goals, confirmed decisions, assumptions/open questions, and impact preview. Do not include implementation details.",
    contextRule: "If full spec.md/design.md is missing, clarification may continue, but proposal.md must record the missing-baseline risk.",
    clarificationFocus: "the real workflow problem, actor, success signal, scope boundary, non-goals, existing behavior to preserve, input interaction semantics, acceptance criteria, impact, and DFX constraints",
    generationFocus: "the proposal points to generate",
    completionFocus: "real need, scope boundary, non-goals, confirmed decisions, acceptance criteria, open questions, and breaking changes"
  },
  "delta-spec": {
    key: "delta-spec",
    index: 2,
    total: 5,
    name: "Spec delta",
    file: "delta-spec.md",
    command: "/matspec.delta-spec",
    objective: "Convert proposal.md into verifiable business-rule deltas.",
    inputs: ["full matspec/specs/spec.md", "proposal.md", "existing delta-spec.md if present"],
    nextName: "Design delta",
    artifactRule: "Write only business rules. Use the exact top-level headings `## ADDED Requirements`, `## MODIFIED Requirements`, and `## REMOVED Requirements` even when a section says `None`. Every rule must have decidable acceptance criteria.",
    contextRule: "If the full spec.md is missing, do not invent it. Ask the user to run matspec generate && matspec apply, or import a real spec.md.",
    clarificationFocus: "business rules, acceptance criteria, state transitions, permissions, data constraints, exception paths, and DFX constraints",
    generationFocus: "the business-rule deltas to generate",
    completionFocus: "ADDED/MODIFIED/REMOVED coverage, acceptance criteria, and conflicts with the full spec.md"
  },
  "delta-design": {
    key: "delta-design",
    index: 3,
    total: 5,
    name: "Design delta",
    file: "delta-design.md",
    command: "/matspec.delta-design",
    objective: "Design an implementation approach for the business rules in delta-spec.md.",
    inputs: ["full matspec/specs/design.md", "proposal.md", "delta-spec.md", "existing delta-design.md if present"],
    nextName: "Task breakdown",
    artifactRule: "The design must carry delta-spec forward and cover decisions, alternatives, risks, compatibility, data model, interfaces, and release impact.",
    contextRule: "If the full design.md is missing, do not invent it. Ask the user to run matspec generate && matspec apply, or import a real design.md.",
    clarificationFocus: "architecture impact, API contracts, data model, compatibility, migration, rollout, risk, and verification strategy",
    generationFocus: "the design decisions to generate",
    completionFocus: "spec coverage, tradeoffs, risk mitigation, and whether tasks can be split cleanly"
  },
  tasks: {
    key: "tasks",
    index: 4,
    total: 5,
    name: "Task breakdown",
    file: "tasks.md",
    command: "/matspec.tasks",
    objective: "Break the design into executable and verifiable development tasks.",
    inputs: ["full spec.md", "full design.md", "delta-spec.md", "delta-design.md", "existing tasks.md if present"],
    nextName: "Consistency validation",
    artifactRule: "Tasks must be executable by a developer or coding agent, split by module/file/responsibility boundary, and include tests plus explicit done-finalization tasks: refresh matspec/specs/spec.md from delta-spec.md and refresh matspec/specs/design.md from delta-design.md. Do not use matspec generate/apply for accepted-change evolution.",
    contextRule: "If full spec.md or design.md is missing, block task breakdown or mark it as high risk. Do not invent context.",
    clarificationFocus: "task boundaries, file scope, dependency order, parallelism, test strategy, and acceptance method",
    generationFocus: "the task scope to break down",
    completionFocus: "task size, dependencies, test coverage, and documentation updates"
  },
  validation: {
    key: "validation",
    index: 5,
    total: 5,
    name: "Consistency validation",
    file: "validation.md",
    command: "/matspec.validation",
    objective: "Check coverage and conflicts across proposal, delta-spec, delta-design, tasks, and the full baseline docs.",
    inputs: ["full spec.md", "full design.md", "proposal.md", "delta-spec.md", "delta-design.md", "tasks.md"],
    nextName: "Implementation",
    artifactRule: "Check document-chain coverage, conflicts, missing scenarios, DFX constraints, and test tasks. End with a conclusion on whether implementation may start.",
    contextRule: "If full spec.md or design.md is missing, block validation or mark it as high risk. Do not invent context.",
    clarificationFocus: "coverage, conflict criteria, missing scenarios, verification standard, and whether implementation may start",
    generationFocus: "the validation checks and expected conclusion standard",
    completionFocus: "coverage conclusion, conflicts, blockers, and whether implementation may start"
  }
};

function opencodeCommand(command, title, body) {
  return `# /${command}

# ${title}

${body}
`;
}

function mainFlowBody(options = {}) {
  return `You are working in a repository that uses MatSpec. /matspec is the user's main entry point; do not make the user bounce between terminal and agent.

${languagePolicy(options)}

Workflow:
1. First call \`matspec go --json\` and read change, stage, artifact path, nextAction, stage.inputs, and stage.allowedWritePath.
2. If nextAction is \`implementation\`, show the implementation card, read \`tasks.md\`, \`delta-spec.md\`, \`delta-design.md\`, and \`validation.md\`, then implement and test. Do not generate new stage documents and do not call \`matspec done\` until done finalization refreshes the full baseline docs.
3. Render stage status from the JSON. Show the full MatSpec SDD panel on first entry, stage switches, user status questions, or CLI errors; use a compact status bar during normal conversation.
4. Work according to the current stage: requirement clarification, spec delta, design delta, task breakdown, or consistency validation.
5. Before writing an artifact for a newly entered stage, complete at least one user-facing clarification or generation-approval turn. If information is insufficient, ask questions. If information is sufficient, list the proposed output points and ask the user to reply "generate".
6. After writing a stage artifact, ask the user to confirm it. Keep editing the current stage until the user confirms.
7. When the user explicitly replies "confirm", "next", or equivalent, immediately call \`matspec accept --json\`; do not ask the user to run the command in a terminal.
8. If \`matspec accept --json\` returns nextStage, immediately enter that stage: show a stage-switch card, read context, then ask clarification questions or request generation approval.
9. If all document stages are confirmed, do not rush to \`matspec done --json\`. First implement according to \`tasks.md\` and run verification. When implementation is complete, perform done finalization: refresh \`matspec/specs/spec.md\` from \`delta-spec.md\` and refresh \`matspec/specs/design.md\` from \`delta-design.md\`. Only after implementation, done finalization, and verification pass should you ask whether to archive and call \`matspec done --json\`.

Progression rules:
- "confirm/next" for a stage only confirms the current artifact and advances the document workflow. Confirming validation means the document chain may enter implementation; it does not mean implementation is complete or ready to archive.
- Before first writing a stage artifact, there must be explicit user authorization in the current stage conversation, such as "generate", "confirm generation", or "generate this".
- Stop only when waiting for clarification, waiting for artifact confirmation, waiting for archive authorization, or blocked by a decision only the user can make.

${sharedClarificationGate()}

${sharedDisplayRules()}

${sharedPathRules()}

Missing full-document handling:
- proposal: clarification may continue, but proposal.md must record missing-baseline risk.
- delta-spec: if full spec.md is missing, ask the user to run \`matspec generate && matspec apply\` or import a real spec.md.
- delta-design: if full design.md is missing, ask the user to run \`matspec generate && matspec apply\` or import a real design.md.
- tasks / validation: if full spec.md or design.md is missing, block or clearly mark high risk. Do not invent context.

Constraints:
1. Do not modify implementation code during document stages.
2. Do not edit \`.matspec-state.json\` directly.
3. Only the CLI may advance stage state.
4. Preserve user-written content unless the user explicitly asks for a rewrite.
5. Stage artifacts must not keep template placeholders.
6. Do not write empty template documents under \`matspec/\`.
7. Do not create new \`matspec/changes/*\` directories; change directories must be created only by \`matspec start\`.
`;
}

function stageCommandBody(stage, options = {}) {
  return `Current stage: ${stage.index}/${stage.total} ${stage.key} / ${stage.name}

${languagePolicy(options)}

Required flow:
1. First call \`matspec go --json\` and read the active change, stage.key, stage.file, stage.allowedWritePath, and stage.inputs.
2. If the current stage is not \`${stage.key}\`, stop and tell the user to return to the \`/matspec\` main flow.
3. Write only to stage.allowedWritePath returned by \`matspec go --json\`; do not infer or create \`matspec/changes/{change}\`.
4. Show the stage panel first.
5. Before writing, complete at least one user interaction for this stage. Even if context looks sufficient, list ${stage.generationFocus} and ask the user to reply "generate".
6. A previous-stage "confirm/next" only enters this stage; it does not authorize generating \`${stage.file}\`.
7. Do not generate the document before the user explicitly replies "generate", "confirm generation", "generate this", or equivalent.
8. After writing \`${stage.file}\`, state the relative path and give a clear confirmation instruction.
9. After user confirmation, call \`matspec accept --json\`; do not ask the user to run the command in a terminal.
10. If confirming \`validation.md\` returns completed/readyForImplementation, do not call \`matspec done\`; say the document chain may enter implementation and return to the \`/matspec\` main flow for implementation.

Stage objective:
${stage.objective}

Stage inputs:
${stage.inputs.map((input) => `- ${input}`).join("\n")}

Artifact:
- ${stage.file}

Execution rules:
1. ${stage.artifactRule}
2. ${stage.contextRule}
3. Clarification questions must affect ${stage.clarificationFocus}. If there are no high-value questions, use generation approval instead.
4. Ask at most 3 clarification questions per turn, and explain why each affects the current artifact.
5. After the user replies, explain how the answer changes \`${stage.file}\`.
6. Do not modify implementation code.
7. Do not edit \`.matspec-state.json\` directly.
8. Do not write empty template documents.

${sharedClarificationGate(stage)}

After completion, ask the user to review:
- ${stage.completionFocus}

${sharedDisplayRules()}

${sharedPathRules()}
`;
}

function sharedClarificationGate(stage = null) {
  let stageSpecific = "";
  if (stage?.key === "proposal") {
    stageSpecific = `\nProposal-specific rules:\n1. Treat surface requests such as add a field, add a button, support search, optimize, improve, or make faster as proposed solutions until the user confirms the workflow problem, affected actor, success signal, scope boundary, and non-goals.\n2. Do not write implementation choices in proposal.md. Proposal owns why, what, boundaries, confirmation status, and impact preview only.\n3. The user can confirm proposal.md only when the real problem, boundaries, non-goals, and assumptions/open questions are explicit.`;
  }
  if (stage?.key === "validation") {
    stageSpecific = `\nValidation-specific rules:\n1. Check proposal, delta-spec, delta-design, and tasks for unconfirmed decisions, agent-inferred decisions, or pending questions.\n2. If any unconfirmed decision affects scope, business rules, data model, migration, compatibility, or test executability, the conclusion must be "needs revision before implementation", not "implementation may start".\n3. Check whether the current worktree has unrelated dirty files. If it does, record it as a pre-implementation risk and state whether it blocks implementation.`;
  }

  return `Clarification guardrails:
1. If the requirement or stage inputs contain vague language such as improve, optimize, clean up, better, support, convenient, simple, flexible, smart, automatic, configurable, compatible, refactor, or faster, ask at least one clarification question before generation approval.
2. At proposal stage, treat a surface solution request as unconfirmed until the real workflow problem, affected actor, success signal, scope boundary, and non-goals are clear.
3. Explicitly clarify or obtain user confirmation for high-impact decisions: business-rule boundaries, failure behavior, data model/schema, migration, roles and permissions, external APIs, compatibility, concurrency/consistency, test environment, acceptance criteria, and non-goals.
4. For new search, filter, sort, form input, API parameter, or configuration behavior, explicitly clarify how it interacts with existing inputs: AND/OR semantics, priority, mutual exclusion, empty value behavior, no-result behavior, exact vs partial matching, format normalization, and compatibility with existing behavior.
5. Generation approval must list "confirmed decisions" and "agent-inferred/proposed decisions". If an agent inference affects implementation boundaries, ask the user to confirm it before writing the artifact.
6. Stage artifacts must include or preserve a decision ledger. Mark each key decision source: user-confirmed, existing spec/design, code fact, or agent inference.
7. Do not write pending questions as "none" unless you checked vague language, high-impact decisions, input interaction semantics, full baseline docs, and current change docs.
8. If the user only says "confirm/next", that confirms the displayed artifact only; it does not confirm new agent assumptions.
9. If there are more than 3 questions, ask the 1-3 questions most likely to change scope or data model first, then continue clarification in another turn.${stageSpecific}`;
}

function sharedDisplayRules() {
  return `Display formats:

Full stage panel:
\`\`\`text
MatSpec SDD · {change}
Mode: clarification first · user confirmed · CLI driven

Flow:
[1 Clarification {mark1}] -> [2 Spec delta {mark2}] -> [3 Design delta {mark3}] -> [4 Tasks {mark4}] -> [5 Validation {mark5}]

Current stage: {index}/{total} {key} / {name}
Status: {status}
Objective: {objective}
Artifact: matspec/changes/{change}/{file}
Done when: artifact is not a template and the user explicitly confirms it
\`\`\`

Compact status bar:
\`\`\`text
matspec [{index}/{total} {key} · {name} · {status}]
\`\`\`

Stage switch card:
\`\`\`text
Accepted {previous_file}; state advanced.

MatSpec SDD · {change}
[✓ Clarification] -> [● Spec delta] -> [○ Design delta] -> [○ Tasks] -> [○ Validation]

Confirmed stage:
[✓] {previous_index}/{total} {previous_name} {previous_file}

Entering:
[●] {index}/{total} {name} {file}

Stage objective:
{objective}

Next I will:
1. Read the stage input documents
2. Check for issues that affect acceptance or design
3. Ask clarification questions, or request generation approval if the inputs are sufficient
\`\`\`

Implementation card:
\`\`\`text
The document chain is validated. Implementation may start.

MatSpec SDD · {change}
[✓ Clarification] -> [✓ Spec delta] -> [✓ Design delta] -> [✓ Tasks] -> [✓ Validation] -> [● Implementation]

Next I will:
1. Implement tasks from tasks.md
2. Modify necessary code and tests
3. Run verification commands and report results
4. Perform done finalization by refreshing matspec/specs/spec.md from delta-spec.md
5. Refresh matspec/specs/design.md from delta-design.md

Only after implementation, done finalization, and verification pass will I ask whether to archive and call matspec done.
\`\`\`

Clarification question card:
\`\`\`text
matspec [{index}/{total} {key} · clarifying]

Q{n}. {question}

Recommended: {recommended_option} - {reason}

Why this matters:
{impact}

Reply with an option, "recommended", or a short answer. I will update the stage draft and, if there are no new blockers, ask you to approve generating {file}.
\`\`\`

Generation approval:
\`\`\`text
matspec [{index}/{total} {key} · generation approval]

I found no blocking questions. I am ready to generate {file} with these points:
- {point_1}
- {point_2}
- {point_3}

I will not write:
- Implementation details unrelated to this stage
- Unconfirmed new scope
- Empty templates or placeholders

Reply "generate" to continue, or tell me what to adjust.
\`\`\`

Post-write confirmation:
\`\`\`text
Generated: matspec/changes/{change}/{file}

Please confirm whether {file} matches your intent.

Next options:
- Reply "confirm" or "next": I will accept this stage and move to the next one.
- Describe changes: I will stay in this stage and revise {file}.
\`\`\``;
}

function sharedPathRules() {
  return `Path constraints:
1. Treat change, stage.key, stage.file, and stage.allowedWritePath from \`matspec go --json\` as the only authority.
2. Write only to stage.allowedWritePath returned by \`matspec go --json\`.
3. Do not infer \`matspec/changes/{change}\` from the requirement title, feature name, slug, or natural language.
4. Do not run \`mkdir matspec/changes/...\`, \`New-Item matspec/changes/...\`, or any command that creates/renames change directories.
5. If \`matspec go --json\` returns no active change, stop and tell the user to run \`matspec start REQ202604270001-feature-name\`.
6. If you find extra change directories without \`.matspec-state.json\`, stop and ask the user to run \`matspec doctor\`; do not write into those directories.`;
}

function languagePolicy(options = {}) {
  return isZh(options)
    ? `Language policy:
1. User-facing replies should be Chinese unless the user explicitly asks otherwise.
2. Stage artifacts and generated output documents must be written in Chinese.
3. Keep fixed file names, command names, code identifiers, and required MatSpec headings exactly as specified.`
    : `Language policy:
1. User-facing replies should be English unless the user explicitly asks otherwise.
2. Stage artifacts and generated output documents must be written in English.
3. Keep fixed file names, command names, code identifiers, and required MatSpec headings exactly as specified.`;
}

export function listIntegrations() {
  return Object.entries(INTEGRATIONS).map(([name, value]) => ({ name, ...value }));
}

export function installIntegration(root, name, options = {}) {
  if (name === "all") {
    const results = Object.keys(INTEGRATIONS).map((integration) => installIntegration(root, integration, options));
    return {
      ok: true,
      integration: "all",
      results,
      files: results.flatMap((result) => result.files),
      message: "Installed all agent integrations."
    };
  }
  if (name === "opencode") return installOpencode(root, options);
  if (name === "claude-code") return installClaudeCode(root, options);
  if (name === "codex") return installCodex(root, options);
  throw new Error(`Unsupported integration: ${name}`);
}

function installOpencode(root, options = {}) {
  const dir = path.join(root, INTEGRATIONS.opencode.path);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const [fileName, content] of Object.entries(opencodeFiles(options))) {
    const file = path.join(dir, fileName);
    writeTrackedFile(file, content, files, root, options);
  }
  writeManifest(root, "opencode", files);
  return { ok: true, integration: "opencode", files };
}

function installClaudeCode(root, options = {}) {
  const files = [];
  const commandDir = path.join(root, ".claude/commands");
  fs.mkdirSync(commandDir, { recursive: true });
  for (const command of commands(options)) {
    writeTrackedFile(path.join(commandDir, `${command.id}.md`), claudeCommand(command), files, root, options);
  }

  const skillsDir = path.join(root, ".claude/skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  for (const command of commands(options)) {
    writeTrackedFile(path.join(skillsDir, command.id, "SKILL.md"), skillMarkdown(command, "claude"), files, root, options);
  }

  writeManifest(root, "claude-code", files);
  return { ok: true, integration: "claude-code", files };
}

function installCodex(root, options = {}) {
  const files = [];
  const skillsDir = path.join(root, ".agents/skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  for (const command of commands(options)) {
    writeTrackedFile(path.join(skillsDir, command.id, "SKILL.md"), skillMarkdown(command, "codex"), files, root, options);
  }

  writeManifest(root, "codex", files);
  return { ok: true, integration: "codex", files };
}

function writeTrackedFile(file, content, files, root, options) {
  if (!fs.existsSync(file) || options.force) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
  }
  files.push({ path: path.relative(root, file).replaceAll(path.sep, "/"), sha256: sha256(file) });
}

function writeManifest(root, integration, files) {
  writeJson(path.join(root, `.matspec-cli/manifests/integrations/${integration}.json`), {
    integration,
    installedAt: new Date().toISOString(),
    files
  });
}

function claudeCommand(command) {
  return `---
description: ${command.description}
---

# ${command.title}

${command.body}

$ARGUMENTS
`;
}

function skillMarkdown(command, provider) {
  const providerLine =
    provider === "codex"
      ? "This repository skill is discovered by Codex from `.agents/skills`."
      : "This project skill is discovered by Claude Code from `.claude/skills`.";
  return `---
name: ${command.id}
description: ${command.description}
---

# ${command.title}

${providerLine}

${command.body}
`;
}

export function removeIntegration(root, name, options = {}) {
  if (name === "all") {
    const results = Object.keys(INTEGRATIONS).map((integration) => removeIntegration(root, integration, options));
    return {
      ok: true,
      integration: "all",
      removed: results.flatMap((result) => result.removed),
      kept: results.flatMap((result) => result.kept),
      message: "Removed all agent integrations."
    };
  }
  if (!INTEGRATIONS[name]) throw new Error(`Unsupported integration: ${name}`);
  const manifestFile = path.join(root, `.matspec-cli/manifests/integrations/${name}.json`);
  if (!fs.existsSync(manifestFile)) {
    return { ok: true, integration: name, removed: [], kept: [], message: `No ${name} integration manifest found.` };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const removed = [];
  const kept = [];
  for (const entry of manifest.files || []) {
    const file = path.join(root, entry.path);
    if (!fs.existsSync(file)) continue;
    const modified = sha256(file) !== entry.sha256;
    if (modified && !options.force) {
      kept.push(entry.path);
      continue;
    }
    fs.unlinkSync(file);
    removed.push(entry.path);
  }
  fs.unlinkSync(manifestFile);
  return { ok: true, integration: name, removed, kept, message: `Removed ${name} integration.` };
}
