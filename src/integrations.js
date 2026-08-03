import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sha256, writeJson } from "./util.js";
import { isZh } from "./i18n.js";
import { assertNoLocalPackOverride, loadWorkflow } from "./workflow.js";

const INTEGRATIONS = {
  opencode: {
    path: ".opencode/command",
    description: "opencode repository commands"
  },
  codex: {
    path: ".agents/skills",
    description: "Codex repository skills"
  },
  chrys: {
    path: ".agents/skills/matspec",
    description: "Chrys repository skill"
  },
  "claude-code": {
    path: ".claude/commands + .claude/skills",
    description: "Claude Code project slash commands and skills"
  },
  nga: {
    path: ".opencode/command",
    description: "NGA repository commands and subagents"
  },
  codeagent: {
    path: "~/.cac/command",
    description: "CodeAgent global commands and skill"
  },
  codegenie: {
    path: ".codegenie/command",
    description: "CodeGenie repository commands and subagents"
  }
};

function opencodeFiles(options = {}) {
  return {
  "matspec.md": opencodeCommand("matspec", "MatSpec Main Flow", mainFlowBody(options)),
  "matspec.proposal.md": opencodeCommand("matspec.proposal", "MatSpec Requirement Clarification", stageCommandBody(stageDefinitions.proposal, options)),
  "matspec.delta-spec.md": opencodeCommand("matspec.delta-spec", "MatSpec Spec Delta", stageCommandBody(stageDefinitions["delta-spec"], options)),
  "matspec.delta-design.md": opencodeCommand("matspec.delta-design", "MatSpec Design Delta", stageCommandBody(stageDefinitions["delta-design"], options)),
  "matspec.lean-spec.md": opencodeCommand("matspec.lean-spec", "MatSpec Lean Delta Spec", leanSpecBody()),
  "matspec.lean-implement.md": opencodeCommand("matspec.lean-implement", "MatSpec Lean Implementation", leanImplementBody()),
  "matspec.tasks.md": opencodeCommand("matspec.tasks", "MatSpec Task Breakdown", stageCommandBody(stageDefinitions.tasks, options)),
  "matspec.validation.md": opencodeCommand("matspec.validation", "MatSpec Consistency Validation", stageCommandBody(stageDefinitions.validation, options))
  ,"matspec.implement.md": opencodeCommand("matspec.implement", "MatSpec Implementation", "Run `matspec implement --run --json`, execute one returned task at a time, and report DONE, DONE_WITH_CONCERNS, BLOCKED, or NEEDS_CONTEXT."),
  "matspec.review.md": opencodeCommand("matspec.review", "MatSpec Review", reviewCommandBody()),
  "matspec.audit.md": opencodeCommand("matspec.audit", "MatSpec Audit", "Run `matspec validate --json` and report findings without changing files."),
  "matspec.back.md": opencodeCommand("matspec.back", "MatSpec Back", backCommandBody())
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
  },
  {
    id: "matspec-implement",
    title: "MatSpec Implement",
    description: "Execute confirmed MatSpec tasks through task-executor.",
    body: "Run `matspec implement --run --json`, then request and execute one Task at a time."
  },
  {
    id: "matspec-review",
    title: "MatSpec Review",
    description: "Review a completed MatSpec implementation.",
    body: reviewCommandBody()
  },
  {
    id: "matspec-audit",
    title: "MatSpec Audit",
    description: "Audit the active MatSpec change.",
    body: "Run `matspec validate --json` and report findings without changing files."
  },
  {
    id: "matspec-back",
    title: "MatSpec Back",
    description: "Move the workflow back to an earlier stage with an audited reason.",
    body: backCommandBody()
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
    artifactRule: "Write only business rules. Use the exact top-level headings `## ADDED Requirements`, `## MODIFIED Requirements`, and `## REMOVED Requirements` even when a section says `None`. Give every added or modified requirement a stable unique `REQ-*` ID and decidable acceptance criteria.",
    contextRule: "Read the profile returned by matspec go. In light profile, a missing full spec is an accepted no-baseline mode: derive current behavior from repository evidence, record that evidence and the missing-baseline risk, and continue without creating full docs yet. In standard/full, a missing required full spec blocks the stage until the user generates or imports it.",
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
    objective: "Turn the confirmed rules into an executable file-level implementation plan and tasks.",
    inputs: ["full spec.md", "full design.md", "delta-spec.md", "optional delta-design.md in full profile", "existing tasks.md if present"],
    nextName: "Consistency validation",
    artifactRule: "Include an Implementation Approach covering file boundaries, architecture reuse, data flow, risks, and verification. Split executable tasks by file/responsibility and include tests plus finalization of full spec/design. In light and standard profiles tasks.md owns the necessary file-level design; in full profile carry delta-design decisions forward.",
    contextRule: "Read stage.inputs.required. In light profile, missing optional full docs are the normal no-baseline path: inspect the repository, distinguish code facts from decisions, record the risk, and continue. In standard/full, block on missing required full docs. Never invent context.",
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
    objective: "Validate the change delta chain: proposal, delta-spec, optional delta-design, and tasks. Use full baseline docs only to detect real conflicts or regressions.",
    inputs: ["full spec.md", "full design.md", "proposal.md", "delta-spec.md", "optional delta-design.md in full profile", "tasks.md"],
    nextName: "Implementation",
    artifactRule: "Check proposal -> delta-spec -> optional delta-design (or the tasks Implementation Approach in standard profile) -> tasks coverage, missing scenarios, DFX constraints, and executable verification. Treat delta artifacts as the source of truth for this change. Use the full baseline only for compatibility: a new requirement being absent from the pre-change baseline is expected and MUST NOT be reported as a blocker. Begin with YAML front matter containing matspec.stage=validation, matspec.verdict=allow|revise, blockers, repairTarget, and reviseStages. Use allow when the delta chain is consistent and implementable; otherwise use revise, list blockers, and route repair.",
    contextRule: "Read stage.inputs.required. Missing required full docs in standard/full still blocks because compatibility cannot be checked; when full docs exist, treat them as the pre-change baseline. Do not require them to already contain the delta. Baseline refresh belongs to done finalization after implementation; validation MUST NOT require it before implementation. Block only on a real baseline conflict/regression or an inconsistent, incomplete, ambiguous, or non-executable delta chain. Do not invent context.",
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

function reviewCommandBody() {
  return "Run `matspec review --json`, then `matspec go --json`; independently review implementation evidence and write only review.md. Preserve YAML front matter. In light no-baseline mode, missing optional full docs are not a blocker. For `light-gpt56`, turn stage.stageContract.riskSurfaces into a checklist, follow stageContract.evidenceOrder and optimization.verificationLadder, and expand only for an unresolved item. Approve only when every applicable item has diff and verification evidence; otherwise use `changes-required`, list blockers, and set `repairTarget`.";
}

function backCommandBody() {
  return "Run `matspec status --json`, explain which confirmed stages will be invalidated, obtain the user's reason, then run `matspec back --to <stage> --reason \"<reason>\" --json`. Never edit `.matspec-state.json` directly.";
}

function strongModelFastPath() {
  return `Strong-model fast path (only when matspec go returns profile=light-gpt56):
Use stageContract and optimization; load no other stage skill. Ask one questionPacket, reuse input hashes, bound search, map risks to oracles, and draft if approval=false. After accept, continue from continuation.stage without go. Follow taskBatch and verificationLadder; preserve confirmation, review, repair, verification, and done guards.`;
}

function strongModelStageRule() {
  return "For light-gpt56, obey go.stageContract. Batch product questions; reuse hashes; bound search; map risks to oracles; draft if approval=false.";
}

function leanFlowPath() {
  return `Lean two-stage path (only when matspec go returns profile=lean; this overrides the generic document, implementation, review, and finalization steps below):
1. At delta-spec, inspect only enough repository evidence to distinguish changed behavior, preserved behavior, and real integration seams. Ask one comprehensive batch of at most stage.optimization.questionPacket.maxQuestions questions, and include only decisions whose answers can change the product contract.
2. Draft immediately without a pre-generation handshake. Write only the high-density delta-spec required by stage.stageContract. Use stable REQ-* IDs and observable oracles; do not prescribe file paths, helper names, or a patch. The user must still explicitly confirm the completed delta-spec before matspec accept.
3. At implementation, do not call matspec implement and do not create proposal, design, tasks, validation, review, or full-spec artifacts. The implementation session receives only the confirmed delta-spec and current repository as workflow context. Execute directly in that session; do not spawn another agent solely to recreate the handoff. Read the spec once, derive a compact REQ-* checklist, and reopen it only after a requirement change or a blocking ambiguity.
4. Verify each applicable oracle and the smallest relevant regression suite. Accept implementation only after explicit user acceptance. With explicit archive authorization, call matspec done; Lean has no full-document finalization.`;
}

function leanSpecBody() {
  return `Execute only the Lean delta-spec stage.

1. Call \`matspec go --json\`; require profile=lean and stage.key=delta-spec.
2. Follow stage.stageContract and stage.optimization.questionPacket. Inspect only enough code to separate changed behavior, preserved behavior, and real integration seams. Ask one comprehensive batch containing only decision-changing product questions.
3. Fetch stage.templateCommand when ready, then write only stage.allowedWritePath. Every changed behavior needs a stable REQ-* ID and decidable observable oracle. Cover scope, changed and preserved behavior, input/default/order/precedence rules, failure/fallback, propagation, public contract, acceptance examples, and non-goals.
4. Do not prescribe file paths, helper names, or a patch. Do not create proposal, design, tasks, validation, or review artifacts.
5. Ask the user to review the complete artifact. Run \`matspec accept --json\` only after explicit confirmation.`;
}

function leanImplementBody() {
  return `Execute only the Lean implementation stage.

1. Call \`matspec go --json\`; require profile=lean and stage.key=implementation. Do not call \`matspec implement\`; Lean has no tasks.md.
2. Read the one confirmed delta-spec input once, derive a compact REQ-* checklist, and implement directly in the current repository. Reopen the spec only after a requirement change or when an unresolved ambiguity blocks implementation.
3. Do not create proposal, design, tasks, validation, review, or full-spec artifacts. Modify only product code and tests required by the confirmed contract.
4. Verify every applicable REQ-* oracle and run the smallest relevant regression suite. Report concrete commands and outcomes.
5. After explicit acceptance, call \`matspec accept --json\`. Call \`matspec done --json\` only after explicit archive authorization.`;
}

function mainFlowBody(options = {}) {
  return `Use MatSpec as the workflow authority.

${languagePolicy(options)}

${strongModelFastPath()}

${leanFlowPath()}

1. Call \`matspec go --json\` first. Obey its frozen profile, current stage, inputs, nextAction, and allowedWritePath. Show the returned \`items\` verbatim when status is useful; the CLI owns fixed UI.
2. For a document stage, read required inputs and fetch the template with stage.templateCommand only when needed. For ordinary profiles, ask up to three questions that can change scope, behavior, data, compatibility, failure handling, or acceptance; for light-gpt56, follow the fast path above. If no blocker remains, list confirmed versus inferred decisions. Request explicit "generate" authorization only when stage.requiresUserGenerationApproval is true; otherwise draft immediately.
3. Write only allowedWritePath, remove placeholders, and do not edit implementation code or .matspec-state.json. Explicit "confirm/next" accepts only the displayed artifact; then call \`matspec accept --json\`.
4. A validation \`revise\` or review \`changes-required\` verdict must route repair with \`matspec back --to ... --reason ... --json\`. Never bypass a structured blocker.
5. At implementation, follow tasks.md, change code/tests, run verification, and confirm implementation before review. At review, independently test observable behavior and use the required structured verdict.
6. Before \`matspec done\`, update both full spec/design, creating them from repository facts, confirmed change artifacts, and final code when light mode started without them. Preserve every delta \`REQ-*\` ID in the full spec. Archive only after verification and explicit user authorization.

Do not invent missing baseline facts or create change directories manually. Missing inputs block only when \`stage.inputs[].required\` is true; light profile intentionally treats absent full docs as optional until done finalization. Stop only for clarification, artifact confirmation, archive authorization, or a decision only the user can make.`;
}

function stageCommandBody(stage, options = {}) {
  return `Execute only the MatSpec \`${stage.key}\` stage.

${languagePolicy(options)}

${strongModelStageRule()}

1. Call \`matspec go --json\`. If stage.key is not \`${stage.key}\`, stop. Obey stage.inputs and stage.allowedWritePath; never infer a change directory.
2. Read required inputs and call stage.templateCommand only when ready to draft. For ordinary profiles, ask up to three high-value clarification questions; for light-gpt56, ask only unresolved product decisions. Otherwise list confirmed and inferred decisions. Require a fresh explicit "generate" reply only when stage.requiresUserGenerationApproval is true; when false, draft immediately.
3. Objective: ${stage.objective}
4. Artifact rule: ${stage.artifactRule}
5. Baseline rule: ${stage.contextRule}
6. Write only the allowed artifact, with no placeholders. Do not change code or .matspec-state.json. Report the path and ask for review.
7. On explicit confirmation call \`matspec accept --json\`. Never bypass a validation blocker or call done from a document stage.

Focus clarification on ${stage.clarificationFocus}. Completion review covers ${stage.completionFocus}.`;
}

function sharedClarificationGate(stage = null) {
  let stageSpecific = "";
  if (stage?.key === "proposal") {
    stageSpecific = `\nProposal-specific rules:\n1. Treat surface requests such as add a field, add a button, support search, optimize, improve, or make faster as proposed solutions until the user confirms the workflow problem, affected actor, success signal, scope boundary, and non-goals.\n2. Do not write implementation choices in proposal.md. Proposal owns why, what, boundaries, confirmation status, and impact preview only.\n3. The user can confirm proposal.md only when the real problem, boundaries, non-goals, and assumptions/open questions are explicit.`;
  }
  if (stage?.key === "validation") {
    stageSpecific = `\nValidation-specific rules:\n1. Validate the change chain: proposal -> delta-spec -> delta-design when present (otherwise the tasks Implementation Approach) -> tasks. Check it for coverage, consistency, unconfirmed decisions, agent-inferred decisions, pending questions, and executable verification.\n2. Delta artifacts are the source of truth for the requested change. Full spec/design are pre-change compatibility references. The delta's new requirements being absent from full baseline documents is expected and MUST NOT be reported as a blocker.\n3. Baseline refresh belongs to done finalization after implementation. A task that plans that refresh is sufficient at validation time; validation MUST NOT require the full baseline to be refreshed before implementation.\n4. Begin validation.md with a matspec YAML object containing stage: validation, verdict: allow|revise, blockers, repairTarget, and reviseStages. Set verdict to allow when the delta chain is consistent, compatible, and implementable. Otherwise use revise, list concrete blockers, and route to the earliest delta stage that must change.\n5. If any unconfirmed decision affects scope, business rules, data model, migration, compatibility, or test executability, the conclusion must be "needs revision before implementation", not "implementation may start".\n6. Check whether the current worktree has unrelated dirty files. Record it as a pre-implementation risk and block only when it makes the planned implementation unsafe.`;
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
  assertNoLocalPackOverride(root);
  const configFile = path.join(root, ".matspec-cli/config.yaml");
  const legacyWorkflow = path.join(root, ".matspec-cli/workflows/default.yaml");
  if (fs.existsSync(legacyWorkflow) && (!fs.existsSync(configFile) || !/^\s*workflowPack\s*:/m.test(fs.readFileSync(configFile, "utf8")))) {
    throw Object.assign(new Error("Legacy workflow requires an explicit workflowPack before installing integrations."), {
      code: "WORKFLOW_PACK_REQUIRED"
    });
  }
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
  if (name === "nga") return installCommandIntegration(root, "nga", ".opencode/command", ".opencode/agents", options);
  if (name === "codegenie") return installCommandIntegration(root, "codegenie", ".codegenie/command", ".codegenie/agents", options);
  if (name === "codeagent") return installCodeagent(root, options);
  if (name === "chrys") return installChrys(root, options);
  if (name === "claude-code") return installClaudeCode(root, options);
  if (name === "codex") return installCodex(root, options);
  throw new Error(`Unsupported integration: ${name}`);
}

function installOpencode(root, options = {}) {
  return installCommandIntegration(root, "opencode", ".opencode/command", ".opencode/agents", options);
}

function installCommandIntegration(root, integration, commandPath, agentPath, options = {}) {
  const files = [];
  for (const [fileName, content] of Object.entries(effectiveOpencodeFiles(root, options))) {
    writeTrackedFile(path.join(root, commandPath, fileName), content, files, root, options);
  }
  writeTrackedFile(path.join(root, agentPath, "stage-generator.md"), stageGeneratorAsset(), files, root, options);
  writeTrackedFile(path.join(root, agentPath, "task-executor.md"), taskExecutorAsset(), files, root, options);
  writeManifest(root, integration, files);
  return { ok: true, integration, files };
}

function installCodeagent(root, options = {}) {
  const files = [];
  const home = os.homedir();
  for (const [fileName, content] of Object.entries(effectiveOpencodeFiles(root, options))) {
    writeTrackedFile(path.join(home, ".cac/command", fileName), content, files, root, options, true);
  }
  writeTrackedFile(path.join(home, ".cac/skills/matspec/SKILL.md"), skillMarkdown(effectiveCommands(root, options)[0], "codeagent"), files, root, options, true);
  writeManifest(root, "codeagent", files);
  return { ok: true, integration: "codeagent", files };
}

function installChrys(root, options = {}) {
  const files = [];
  const base = path.join(root, ".agents/skills/matspec");
  writeTrackedFile(path.join(base, "SKILL.md"), skillMarkdown(effectiveCommands(root, options)[0], "chrys"), files, root, options);
  for (const [fileName, content] of Object.entries(effectiveOpencodeFiles(root, options))) {
    writeTrackedFile(path.join(base, "references", `command.${fileName}`), content, files, root, options);
  }
  writeManifest(root, "chrys", files);
  return { ok: true, integration: "chrys", files };
}

function effectiveOpencodeFiles(root, options) {
  const files = opencodeFiles(options);
  const workflow = loadWorkflow(root);
  for (const stage of workflow.stages) {
    const fileName = `${stage.command}.md`;
    if (files[fileName]) continue;
    const reference = stage.commandRef;
    const source = reference?.projectPath ? path.join(root, reference.projectPath) : null;
    files[fileName] = source && fs.existsSync(source)
      ? fs.readFileSync(source, "utf8")
      : opencodeCommand(stage.command, stage.label || stage.key, `Run \`matspec go --json\` and execute only the ${stage.key} stage.`);
  }
  return files;
}

function effectiveCommands(root, options) {
  const result = commands(options);
  const known = new Set(result.map((command) => command.id));
  const files = effectiveOpencodeFiles(root, options);
  for (const stage of loadWorkflow(root).stages) {
    if (stage.command.startsWith("matspec.") || known.has(stage.command)) continue;
    result.push({
      id: stage.command,
      title: `MatSpec ${stage.label || stage.key}`,
      description: stage.objective || `Execute the ${stage.key} workflow stage.`,
      body: files[`${stage.command}.md`]
    });
    known.add(stage.command);
  }
  return result;
}

function installClaudeCode(root, options = {}) {
  const files = [];
  const commandDir = path.join(root, ".claude/commands");
  fs.mkdirSync(commandDir, { recursive: true });
  for (const command of effectiveCommands(root, options)) {
    writeTrackedFile(path.join(commandDir, `${command.id}.md`), claudeCommand(command), files, root, options);
  }

  const skillsDir = path.join(root, ".claude/skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  for (const command of effectiveCommands(root, options)) {
    writeTrackedFile(path.join(skillsDir, command.id, "SKILL.md"), skillMarkdown(command, "claude"), files, root, options);
  }

  writeManifest(root, "claude-code", files);
  return { ok: true, integration: "claude-code", files };
}

function installCodex(root, options = {}) {
  const files = [];
  for (const command of effectiveCommands(root, options)) {
    writeTrackedFile(path.join(root, ".agents/skills", command.id, "SKILL.md"), skillMarkdown(command, "codex"), files, root, options);
  }
  writeManifest(root, "codex", files);
  return { ok: true, integration: "codex", files };
}

function writeTrackedFile(file, content, files, root, options, isGlobal = false) {
  if (fs.existsSync(file) && !options.force) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  files.push({
    path: path.relative(isGlobal ? os.homedir() : root, file).replaceAll(path.sep, "/"),
    sha256: sha256(file),
    managed: "file",
    isGlobal
  });
}

function writeManifest(root, integration, files) {
  writeJson(path.join(root, `.matspec-cli/manifests/integrations/${integration}.json`), {
    integration,
    version: "0.4.1-beta.3",
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
    const file = path.join(entry.isGlobal ? os.homedir() : root, entry.path);
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
  for (const dir of [...new Set(removed.map((file) => path.dirname(path.join(root, file))))].sort((a, b) => b.length - a.length)) {
    try { if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir); } catch {}
  }
  return { ok: true, integration: name, removed, kept, message: `Removed ${name} integration.` };
}

function stageGeneratorAsset() {
  return `# MatSpec stage-generator

Explore the repository independently, read all confirmed MatSpec documents, and write only the delegated validation or review artifact. Never confirm for the user.
`;
}

function taskExecutorAsset() {
  return `# MatSpec task-executor

When \`matspec implement --run --json\` returns taskBatch, execute that batch in dependency order in the same session and record each task with the returned completion or blocking command. Otherwise execute exactly one Task returned by \`matspec implement --task N --json\`. Verify every task and report DONE, DONE_WITH_CONCERNS, BLOCKED, or NEEDS_CONTEXT.
`;
}
