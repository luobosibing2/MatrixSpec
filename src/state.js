import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { FINALIZATION_FILES } from "./constants.js";
import { projectPaths } from "./project.js";
import { isZh, tr } from "./i18n.js";
import { assertNoLocalPackOverride, evaluateStageChecks, loadWorkflow, resolveStageTemplate, snapshotWorkflow, workflowDrift } from "./workflow.js";
import { loadTemplateForAgent } from "./customization.js";
import { parseStageVerdict } from "./stage-verdict.js";
import { nowStamp, readJson, rel, sha256, slugify, today, writeJson } from "./util.js";

export function normalizeChangeName(input) {
  const raw = String(input || "").trim();
  if (!raw) throw codedError("Missing change name.", "CHANGE_NAME_REQUIRED");
  const slug = slugify(raw);
  if (!slug) throw codedError("Invalid change name.", "CHANGE_NAME_INVALID");
  const name = /^[a-z]{2,}\d{6,}/i.test(raw)
    ? slug.replace(/^([a-z]+)(\d+)/, (_, prefix, digits) => `${prefix.toUpperCase()}${digits}`)
    : `AR${nowStamp()}-${slug}`;
  if (name.length > 200) throw codedError("Change name exceeds 200 characters.", "CHANGE_NAME_TOO_LONG");
  return name;
}

export function startChange(input, options = {}) {
  const paths = projectPaths(options);
  assertNoLocalPackOverride(paths.root);
  const workflow = loadWorkflow(paths.root, options.profile);
  const change = normalizeChangeName(input);
  const dir = path.join(paths.changes, change);
  if (fs.existsSync(dir)) throw codedError(tr(options, `Change already exists: ${change}`, `变更已存在：${change}`), "CHANGE_ALREADY_EXISTS");
  fs.mkdirSync(dir, { recursive: true });
  const state = initialState(change, workflow);
  writeJson(stateFile(paths.root, change), state);
  fs.writeFileSync(path.join(dir, "workflow.yaml"), YAML.stringify(workflowForFile(state.workflow)), "utf8");
  return {
    ok: true,
    change,
    flowId: state.flowId,
    profile: state.profile,
    path: rel(paths.root, dir),
    message: tr(options, `Created MatSpec change: ${change}`, `已创建 matspec 变更：${change}`),
    next: ["matspec go --json", tr(options, "Run /matspec in your coding agent", "在 Coding Agent 中执行 /matspec")]
  };
}

export function initialState(change, workflow = loadWorkflow(process.cwd())) {
  const frozen = snapshotWorkflow(process.cwd(), workflow);
  const stages = {};
  frozen.stages.forEach((stage, index) => {
    stages[stage.key] = {
      status: index === 0 ? "clarifying" : "pending",
      clarified: false,
      confirmed: false,
      ...(stage.file ? { file: stage.file } : {}),
      required: Boolean(stage.required_for_done)
    };
  });
  return {
    version: 1,
    change,
    flowId: crypto.randomBytes(4).toString("hex"),
    profile: frozen.profile || "custom",
    currentStage: frozen.stages[0]?.key || "completed",
    workflow: frozen,
    stages,
    deprecatedStages: {},
    subagentSession: null,
    history: [{ action: "create-change", stage: frozen.stages[0]?.key || null, timestamp: new Date().toISOString() }]
  };
}

export function stateFile(root, change) {
  return path.join(root, "matspec/changes", change, ".matspec-state.json");
}

export function listChanges(options = {}) {
  const paths = projectPaths(options);
  if (!fs.existsSync(paths.changes)) return [];
  return fs.readdirSync(paths.changes, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "archives")
    .map((entry) => entry.name)
    .sort();
}

export function resolveChange(options = {}, explicit) {
  if (explicit) return explicit;
  if (options.change) return options.change;
  const root = projectPaths(options).root;
  const changes = listChanges(options);
  const withState = changes.filter((change) => fs.existsSync(stateFile(root, change)));
  return withState.at(-1) || changes.at(-1) || null;
}

export function loadState(root, change) {
  const file = stateFile(root, change);
  if (!fs.existsSync(file)) return null;
  return readJson(file);
}

export function saveState(root, change, state) {
  writeJson(stateFile(root, change), state);
}

export function stagesOf(state) {
  return state?.workflow?.stages || [];
}

export function ensureStageRecord(state, stage) {
  state.stages[stage.key] ??= {
    status: "pending",
    clarified: false,
    confirmed: false,
    ...(stage.file ? { file: stage.file } : {}),
    required: Boolean(stage.required_for_done)
  };
  return state.stages[stage.key];
}

export function stageStatus(root, change, state, stage) {
  const record = ensureStageRecord(state, stage);
  if (record.confirmed) return "confirmed";
  if (stage.noFile) return record.status === "in_progress" || record.status === "subagent-running" ? record.status : "pending";
  const file = path.join(root, "matspec/changes", change, stage.file);
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, "utf8");
    return templateMarker(content, stage.file)?.strong ? "template" : "draft";
  }
  const stages = stagesOf(state);
  const index = stages.findIndex((item) => item.key === stage.key);
  if (index <= 0) return "pending";
  const previous = stages[index - 1];
  if (previous.noFile) return "pending";
  const previousFile = path.join(root, "matspec/changes", change, previous.file);
  if (fs.existsSync(previousFile) && !templateMarker(fs.readFileSync(previousFile, "utf8"), previous.file)?.strong) return "pending";
  return "blocked";
}

export function getStatus(options = {}, explicit) {
  const paths = projectPaths(options);
  const change = resolveChange(options, explicit);
  if (!change) return { ok: false, code: "NO_ACTIVE_CHANGE", message: tr(options, "No active MatSpec change found.", "未发现活动的 matspec 变更。") };
  const state = loadState(paths.root, change);
  if (!state) return { ok: false, code: "CHANGE_STATE_MISSING", change, message: `缺少状态文件：matspec/changes/${change}/.matspec-state.json` };
  const drift = workflowDrift(paths.root, state.workflow);
  const stages = stagesOf(state).map((stage, index) => ({
    ...stage,
    index: index + 1,
    total: stagesOf(state).length,
    status: stageStatus(paths.root, change, state, stage),
    ...(stage.file ? { filePath: `matspec/changes/${change}/${stage.file}` } : {})
  }));
  return { ok: true, changes: listChanges(options), change, flowId: state.flowId, profile: state.profile || state.workflow?.profile || "custom", currentStage: state.currentStage, workflow: state.workflow, drift, stages };
}

export function acceptStage(options = {}, explicitChange, explicitStage) {
  const paths = projectPaths(options);
  const change = resolveChange(options, explicitChange);
  if (!change) throw codedError(tr(options, "No active MatSpec change found.", "未发现活动的 matspec 变更。"), "NO_ACTIVE_CHANGE");
  const state = loadState(paths.root, change);
  if (!state) throw codedError(`Missing state for change: ${change}`, "CHANGE_STATE_MISSING");
  const drift = workflowDrift(paths.root, state.workflow);
  if (drift.length) return { ok: false, code: "WORKFLOW_PACK_DRIFT", change, findings: drift, message: "冻结工作流引用已漂移，不能确认阶段。" };
  const stage = stagesOf(state).find((item) => item.key === (explicitStage || state.currentStage));
  if (!stage) throw codedError(`Unknown stage: ${explicitStage || state.currentStage}`, "UNKNOWN_STAGE");
  for (const previous of stagesOf(state).slice(0, stagesOf(state).indexOf(stage))) {
    if (!ensureStageRecord(state, previous).confirmed) {
      throw codedError(tr(options, `Previous stage is unconfirmed: ${previous.key}`, `前序阶段未确认：${previous.key}`), "PREVIOUS_STAGE_UNCONFIRMED");
    }
  }
  if (!stage.noFile) {
    const file = path.join(paths.root, "matspec/changes", change, stage.file);
    if (!fs.existsSync(file)) throw codedError(tr(options, `Missing stage file: ${stage.file}`, `缺少阶段文件：${stage.file}`), "STAGE_FILE_MISSING");
    const content = fs.readFileSync(file, "utf8");
    const marker = templateMarker(content, stage.file);
    if (marker?.strong) {
      throw codedError(tr(options, `Stage file still looks like a template: ${stage.file}`, `阶段文件仍像模板：${stage.file}`), "STAGE_FILE_LOOKS_TEMPLATE", marker);
    }
    if (state.workflow?.optimization?.enforceStageChecksOnAccept) {
      // Built-in checks predate acceptance gating and are intentionally
      // diagnostic: they detect weak structure without forcing every valid
      // artifact into the default template. Model-specific profiles opt
      // individual checks into the hard gate with enforceOnAccept.
      const acceptanceChecks = (stage.checks || []).filter((check) => check.enforceOnAccept === true);
      const findings = evaluateStageChecks(content, acceptanceChecks);
      if (findings.length) {
        return {
          ok: false,
          code: "STAGE_CHECKS_FAILED",
          change,
          stage: stage.key,
          findings,
          message: tr(options, `${stage.key} does not satisfy its frozen acceptance checks.`, `${stage.key} 未满足冻结的阶段验收检查。`),
          next: [tr(options, `Revise ${stage.file}, then run matspec accept again.`, `修订 ${stage.file} 后再次执行 matspec accept。`)]
        };
      }
    }
    const verdict = parseStageVerdict(stage.key, content);
    if (!verdict.ok) return { ...verdict, change, stage: stage.key };
    if (verdict.required && verdict.blocked) {
      const target = verdict.repairTarget;
      const stageIndex = stagesOf(state).indexOf(stage);
      const targetIndex = stagesOf(state).findIndex((item) => item.key === target);
      const canBack = targetIndex >= 0 && targetIndex < stageIndex;
      return {
        ok: false,
        code: "STAGE_VERDICT_BLOCKED",
        change,
        stage: stage.key,
        verdict: verdict.verdict,
        blockers: verdict.blockers,
        repairTarget: target,
        reviseStages: verdict.reviseStages,
        message: tr(options, `${stage.key} blocks progression until ${target} is repaired.`, `${stage.key} 阻止继续推进，必须先修订 ${target}。`),
        next: canBack
          ? [`matspec back --to ${target} --reason \"${stage.key} verdict requires revision\"`]
          : [tr(options, `Revise ${stage.file} and run matspec accept again.`, `修订 ${stage.file} 后再次执行 matspec accept。`)]
      };
    }
    confirmStageInState(state, stage, verdict.required ? verdict : null);
  } else {
    confirmStageInState(state, stage);
  }
  if (shouldCaptureBaseline(state, stage)) {
    state.implementationBaseline = captureFullDocumentBaseline(paths.root, state.workflow.finalization?.require_updated);
    state.history.push({ action: "capture-implementation-baseline", stage: stage.key, timestamp: new Date().toISOString(), documents: state.implementationBaseline.documents });
  }
  saveState(paths.root, change, state);
  const next = stagesOf(state).find((item) => item.key === state.currentStage) || null;
  const continueAfterAccept = Boolean(next && state.workflow?.optimization?.continueAfterAccept);
  const specDrivenImplementation = next?.key === "implementation" && state.workflow?.optimization?.implementationMode === "spec-driven";
  const requiresFullDocumentFinalization = (state.workflow?.finalization?.require_updated || []).length > 0;
  return {
    ok: true,
    change,
    flowId: state.flowId,
    acceptedStage: stage.key,
    acceptedLabel: stage.label || stage.name,
    nextStage: next,
    ...(continueAfterAccept ? {
      continuation: {
        enabled: true,
        nextAction: next.key === "review"
          ? "enter-review"
          : next.key === "implementation"
            ? specDrivenImplementation ? "implement-from-spec" : "execute-task-batch"
            : "draft-next-stage",
        stage: currentStagePayload(paths.root, change, state, next, options)
      }
    } : {}),
    completed: state.currentStage === "completed",
    waitForImplementation: next?.key === "implementation",
    message: next
      ? tr(options, `Accepted ${stage.key}; moving to ${next.label || next.name}.`, `已确认 ${stage.key}，进入 ${next.label || next.name}。`)
      : requiresFullDocumentFinalization
        ? tr(options, `Accepted ${stage.key}; run matspec done after finalization.`, `已确认 ${stage.key}；完成全量文档最终化后执行 matspec done。`)
        : tr(options, `Accepted ${stage.key}; run matspec done after verification and archive authorization.`, `已确认 ${stage.key}；验证通过并获得归档授权后执行 matspec done。`),
    next: next
      ? continueAfterAccept
        ? [next.key === "review"
            ? "matspec review --json"
            : next.key === "implementation"
              ? specDrivenImplementation
                ? "Implement from continuation.stage inputs; do not call matspec implement"
                : "matspec implement --run --json"
              : "Continue with continuation.stage without another matspec go"]
        : ["matspec go --json"]
      : requiresFullDocumentFinalization ? ["更新全量 spec/design", "matspec done"] : ["matspec done"]
  };
}

export function backStage(options = {}, explicitChange) {
  const paths = projectPaths(options);
  const change = resolveChange(options, explicitChange);
  if (!change) return { ok: false, code: "NO_ACTIVE_CHANGE", message: tr(options, "No active MatSpec change found.", "未发现活动的 matspec 变更。") };
  const state = loadState(paths.root, change);
  if (!state) return { ok: false, code: "CHANGE_STATE_MISSING", change, message: `缺少状态文件：matspec/changes/${change}/.matspec-state.json` };
  const reason = String(options.reason || "").trim();
  if (!reason) return { ok: false, code: "BACK_REASON_REQUIRED", change, message: "matspec back requires --reason for the audit history." };
  const targetKey = String(options.to || "").trim();
  if (!targetKey) return { ok: false, code: "BACK_TARGET_REQUIRED", change, message: "matspec back requires --to <stage>." };

  const stages = stagesOf(state);
  const targetIndex = stages.findIndex((stage) => stage.key === targetKey);
  if (targetIndex < 0) return { ok: false, code: "BACK_TARGET_INVALID", change, target: targetKey, message: `Unknown back target: ${targetKey}` };
  const currentIndex = state.currentStage === "completed"
    ? stages.length
    : stages.findIndex((stage) => stage.key === state.currentStage);
  if (currentIndex < 0) return { ok: false, code: "UNKNOWN_STAGE", change, stage: state.currentStage, message: `Unknown current stage: ${state.currentStage}` };
  if (targetIndex >= currentIndex) {
    return { ok: false, code: "BACK_TARGET_NOT_EARLIER", change, target: targetKey, currentStage: state.currentStage, message: "Back target must be earlier than the current stage." };
  }

  const invalidated = [];
  for (let index = targetIndex; index < stages.length; index += 1) {
    const stage = stages[index];
    const record = ensureStageRecord(state, stage);
    for (const field of ["confirmedAt", "verdict", "verdictSource", "blockers", "repairTarget", "reviseStages"]) delete record[field];
    Object.assign(record, {
      status: index === targetIndex ? "clarifying" : "pending",
      clarified: false,
      confirmed: false
    });
    invalidated.push(stage.key);
  }
  state.currentStage = targetKey;
  const implementationIndex = stages.findIndex((stage) => stage.key === "implementation");
  if (targetIndex < implementationIndex) delete state.implementationBaseline;
  const timestamp = new Date().toISOString();
  state.history.push({
    action: "backtrack",
    from: stages[currentIndex]?.key || "completed",
    to: targetKey,
    reason,
    invalidated,
    timestamp
  });
  saveState(paths.root, change, state);
  return {
    ok: true,
    change,
    from: stages[currentIndex]?.key || "completed",
    currentStage: targetKey,
    reason,
    invalidated,
    message: tr(options, `Moved workflow back to ${targetKey}.`, `工作流已回退到 ${targetKey}。`),
    next: ["matspec go --json"]
  };
}

export function enterReview(options = {}, explicitChange) {
  const paths = projectPaths(options);
  const change = resolveChange(options, explicitChange);
  if (!change) return { ok: false, code: "NO_ACTIVE_CHANGE", message: "未发现活动变更。" };
  const state = loadState(paths.root, change);
  const review = stagesOf(state).find((stage) => stage.key === "review");
  if (!review) return { ok: false, code: "REVIEW_STAGE_NOT_FOUND", message: "当前 workflow 没有 review 阶段。" };
  if (!state.stages.implementation?.confirmed) {
    const tasksFile = path.join(paths.changes, change, "tasks.md");
    const tasks = fs.existsSync(tasksFile) ? fs.readFileSync(tasksFile, "utf8") : "";
    if (!tasksAreTerminal(tasks)) {
      return { ok: false, code: "IMPLEMENTATION_NOT_COMPLETED", message: "implementation 任务尚未全部完成或阻塞。" };
    }
    return { ok: false, code: "IMPLEMENTATION_PENDING_CONFIRM", message: "implementation 尚未由用户确认。", next: ["matspec accept"] };
  }
  state.currentStage = "review";
  const record = ensureStageRecord(state, review);
  if (record.status === "pending") record.status = "clarifying";
  state.history.push({ action: "enter-review-stage", stage: "review", timestamp: new Date().toISOString() });
  saveState(paths.root, change, state);
  return { ok: true, change, stage: review, next: ["matspec go --json"] };
}

export function validateFullDocumentUpdatesForDone(options = {}, explicitChange) {
  const paths = projectPaths(options);
  const change = resolveChange(options, explicitChange);
  if (!change) return { ok: false, code: "NO_ACTIVE_CHANGE", message: "未发现活动变更。" };
  const state = loadState(paths.root, change);
  const baseline = state?.implementationBaseline;
  if (!baseline?.documents) {
    return { ok: false, code: "BASELINE_UPDATE_SNAPSHOT_MISSING", message: "缺少实现前 baseline 快照。" };
  }
  const current = captureFullDocumentBaseline(paths.root, Object.keys(baseline.documents));
  const notUpdated = [];
  for (const [filePath, before] of Object.entries(baseline.documents)) {
    const after = current.documents[filePath];
    if (!after?.exists) notUpdated.push({ path: filePath, reason: before.exists ? "missing-now" : "not-created-since-baseline" });
    else if (!before.exists) continue;
    else if (before.sha256 === after.sha256) notUpdated.push({ path: filePath, reason: "unchanged-since-baseline" });
  }
  if (notUpdated.length) {
    return { ok: false, code: "FULL_DOCS_NOT_UPDATED", message: "最终化证据不完整；baseline 后的全量文档必须更新。", notUpdated, notMerged: notUpdated };
  }
  const coverage = validateDeltaCoverage(paths.root, change, state.workflow.finalization?.coverage || []);
  if (!coverage.ok) return { ...coverage, change };
  return { ok: true, change };
}

export function archiveChange(options = {}, explicitChange) {
  const paths = projectPaths(options);
  const change = resolveChange(options, explicitChange);
  if (!change) throw codedError("No active MatSpec change found.", "NO_ACTIVE_CHANGE");
  const source = path.join(paths.changes, change);
  if (!fs.existsSync(source)) throw codedError(`Change directory does not exist: ${change}`, "CHANGE_NOT_FOUND");
  const state = loadState(paths.root, change);
  const drift = workflowDrift(paths.root, state?.workflow);
  if (drift.length) return { ok: false, code: "WORKFLOW_PACK_DRIFT", findings: drift, message: "冻结工作流引用已漂移，不能归档。" };
  if (!options.force) {
    for (const stage of stagesOf(state).filter((item) => item.required_for_done)) {
      if (!ensureStageRecord(state, stage).confirmed) throw codedError(`Change is not complete: ${stage.key}`, "STAGE_NOT_CONFIRMED");
      if (!stage.noFile && !fs.existsSync(path.join(source, stage.file))) throw codedError(`Missing stage file: ${stage.file}`, "STAGE_FILE_MISSING");
    }
    const fullDocs = validateFullDocumentUpdatesForDone(options, change);
    if (!fullDocs.ok) return fullDocs;
  }
  fs.mkdirSync(paths.archives, { recursive: true });
  const target = path.join(paths.archives, `${today()}-${change}`);
  if (fs.existsSync(target)) throw codedError(`Archive directory already exists: ${rel(paths.root, target)}`, "ARCHIVE_EXISTS");
  fs.renameSync(source, target);
  return { ok: true, change, archive: rel(paths.root, target), message: tr(options, `Archived change: ${change}`, `已归档变更：${change}`) };
}

export function templateMarker(content, fileName = "") {
  const text = String(content || "").trim();
  if (!text || text === `# ${fileName}`) return { strong: true, marker: text || "(empty)", line: 1, excerpt: text };
  const patterns = [
    /\[(?:待填|待定|占位|TODO|FIXME|TBD|待做|待实现|placeholder)[^\]\n]*]/i,
    /\[(?:EntityName|ServiceName|ControllerName|RepositoryName|TableName|FieldName)]/i,
    /\[(?:AR编号|REQ ID)]|F-01\s*\|\s*\[功能名]|US-01|方案A（采纳）/i,
    /\/api\/v1\/entities\b|src\/(?:domain|entities)\/Entity(?:Name)?\./i
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    return { strong: true, marker: match[0], line, excerpt: text.split(/\r?\n/)[line - 1] };
  }
  const weak = /\[[^\]\n]*(?:功能名|字段名|组件|服务|名称|描述|来源|目标|系统|角色|规则|接口|流程|对象|算法|路径|类型|优先级)[^\]\n]*]/i.exec(text);
  return weak ? { strong: false, marker: weak[0] } : null;
}

export function currentStagePayload(root, change, state, stage, options = {}) {
  const index = stagesOf(state).findIndex((item) => item.key === stage.key);
  const includeTemplate = Boolean(options.with_template || options.verbose);
  const template = includeTemplate ? (resolveStageTemplate(root, stage) || loadTemplateForAgent(root, stage.key)) : null;
  const filePath = stage.file ? `matspec/changes/${change}/${stage.file}` : null;
  const optimization = state.workflow?.optimization || null;
  const { stageContracts = null, ...profileOptimization } = optimization || {};
  const stageRecord = ensureStageRecord(state, stage);
  return {
    index: index + 1,
    total: stagesOf(state).length,
    key: stage.key,
    name: stage.label || stage.name,
    status: stageStatus(root, change, state, stage),
    ...(stage.file ? {
      file: filePath,
      filePath,
      allowedWritePath: filePath,
      artifact: documentEvidence(root, filePath, stageRecord)
    } : {}),
    command: stage.command,
    agentCommand: stage.agentCommand || `/${stage.command}`,
    entryCommand: "/matspec",
    template: stage.template,
    ...(!stage.noFile ? { templateCommand: `matspec go ${change} --with-template --json` } : {}),
    ...(template ? { templateContent: { source: template.source, path: template.path.replaceAll(path.sep, "/"), content: template.content } } : {}),
    objective: stage.objective,
    delegate: stage.delegate,
    noFile: stage.noFile,
    manualAccept: stage.manualAccept,
    requiresFullSpec: Boolean(stage.requiresFullSpec),
    requiresFullDesign: Boolean(stage.requiresFullDesign),
    requiresUserGenerationApproval: !stage.noFile && !optimization?.draftWithoutGenerationApproval,
    ...(optimization ? { optimization: profileOptimization } : {}),
    ...(stageContracts?.[stage.key] ? { stageContract: stageContracts[stage.key] } : {}),
    inputs: (stage.inputs || []).map((input) => {
      const inputPath = input.endsWith(".md") && !input.startsWith("matspec/")
        ? `matspec/changes/${change}/${input}`
        : input;
      const inputStage = stagesOf(state).find((item) => item.file && inputPath === `matspec/changes/${change}/${item.file}`);
      const inputRecord = inputStage ? ensureStageRecord(state, inputStage) : null;
      return {
        ...documentEvidence(root, inputPath, inputRecord),
        required: inputPath === "matspec/specs/spec.md"
          ? Boolean(stage.requiresFullSpec)
          : inputPath === "matspec/specs/design.md"
            ? Boolean(stage.requiresFullDesign)
            : inputPath !== "matspec/service-context.md"
      };
    })
  };
}

function documentEvidence(root, relativePath, record = null) {
  const absolute = path.join(root, relativePath);
  const exists = fs.existsSync(absolute);
  return {
    path: relativePath,
    exists,
    ...(exists ? {
      sha256: sha256(absolute),
      bytes: fs.statSync(absolute).size
    } : {}),
    ...(record?.confirmedAt ? {
      confirmed: Boolean(record.confirmed),
      confirmedAt: record.confirmedAt
    } : {})
  };
}

function confirmStageInState(state, stage, verdict = null) {
  const record = ensureStageRecord(state, stage);
  const timestamp = new Date().toISOString();
  Object.assign(record, { status: "confirmed", clarified: true, confirmed: true, confirmedAt: timestamp });
  if (verdict) {
    Object.assign(record, {
      verdict: verdict.verdict,
      verdictSource: verdict.source,
      blockers: verdict.blockers,
      repairTarget: verdict.repairTarget,
      reviseStages: verdict.reviseStages
    });
  }
  state.history.push({ action: "confirm-stage", stage: stage.key, timestamp });
  const stages = stagesOf(state);
  let index = stages.indexOf(stage) + 1;
  while (index < stages.length && stages[index].noFile && !stages[index].delegate && !stages[index].manualAccept) {
    const auto = ensureStageRecord(state, stages[index]);
    Object.assign(auto, { status: "confirmed", clarified: true, confirmed: true, confirmedAt: timestamp });
    state.history.push({ action: "auto-confirm-stage", stage: stages[index].key, timestamp });
    index += 1;
  }
  if (index < stages.length) {
    state.currentStage = stages[index].key;
    const next = ensureStageRecord(state, stages[index]);
    if (next.status === "pending") next.status = "clarifying";
  } else {
    state.currentStage = "completed";
  }
}

function shouldCaptureBaseline(state, confirmedStage) {
  if (state.implementationBaseline) return false;
  const stages = stagesOf(state);
  const next = stages[stages.indexOf(confirmedStage) + 1];
  return next?.key === "implementation";
}

function captureFullDocumentBaseline(root, files = FINALIZATION_FILES) {
  const documents = {};
  for (const filePath of files || []) {
    const absolute = path.join(root, filePath);
    documents[filePath] = fs.existsSync(absolute)
      ? { exists: true, sha256: sha256(absolute), path: rel(root, absolute) }
      : { exists: false, sha256: null, path: filePath };
  }
  return { capturedAt: new Date().toISOString(), documents };
}

function validateDeltaCoverage(root, change, rules) {
  for (const rule of rules) {
    const deltaPath = rule.delta.replace("{change}", change);
    const fullPath = rule.full.replace("{change}", change);
    const deltaFile = path.join(root, deltaPath);
    const fullFile = path.join(root, fullPath);
    if (!fs.existsSync(deltaFile) || !fs.existsSync(fullFile)) {
      return { ok: false, code: "DELTA_COVERAGE_INPUT_MISSING", message: "无法验证增量覆盖：delta 或全量文档缺失。", delta: deltaPath, full: fullPath };
    }
    const delta = fs.readFileSync(deltaFile, "utf8");
    const full = fs.readFileSync(fullFile, "utf8");
    const ids = [...new Set([...delta.matchAll(/\bREQ-[A-Z0-9][A-Z0-9._-]*\b/gi)].map((match) => match[0].toUpperCase()))];
    if (!ids.length) {
      return { ok: false, code: "DELTA_COVERAGE_IDS_MISSING", message: "delta-spec 必须为每条增量需求提供稳定的 REQ-* 标识，才能验证最终化覆盖。", delta: deltaPath };
    }
    const fullUpper = full.toUpperCase();
    const missing = ids.filter((id) => !fullUpper.includes(id));
    if (missing.length) {
      return { ok: false, code: "DELTA_COVERAGE_MISSING", message: "全量规格尚未覆盖所有 delta requirement 标识。", delta: deltaPath, full: fullPath, missing };
    }
  }
  return { ok: true };
}

function workflowForFile(workflow) {
  return {
    version: workflow.version,
    ...(workflow.profile ? { profile: workflow.profile } : {}),
    ...(workflow.optimization ? { optimization: workflow.optimization } : {}),
    ...(workflow.extends ? { extends: workflow.extends } : {}),
    stages: workflow.stages.map(({ templateRef, commandRef, ...stage }) => ({ ...stage, templateRef, commandRef })),
    finalization: workflow.finalization
  };
}

function tasksAreTerminal(content) {
  if (/(^|\n)### Task \d+[：:]/.test(content)) {
    const blocks = content.split(/(?=^### Task \d+[：:])/m).filter((block) => /^### Task \d+[：:]/.test(block));
    return blocks.length > 0 && blocks.every((block) => {
      const markers = [...block.matchAll(/^- \[([ →✓⚠xX])]\s*$/gm)];
      return ["✓", "⚠", "x", "X"].includes(markers.at(-1)?.[1]);
    });
  }
  const markers = [...content.matchAll(/^- \[([ →✓⚠xX])]\s+.+$/gm)];
  return markers.length > 0 && markers.every((match) => ["✓", "⚠", "x", "X"].includes(match[1]));
}

function codedError(message, code, fields = {}) {
  return Object.assign(new Error(message), { code, ...fields });
}
