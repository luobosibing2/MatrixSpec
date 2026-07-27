import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { FINALIZATION_FILES, STAGES } from "./constants.js";
import { sha256, writeJson } from "./util.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CHECK_TYPES = new Set(["must_contain_heading", "must_match_regex", "file_not_empty"]);

const DEFAULT_CHECKS = {
  proposal: [
    ["CS111", "must_match_regex", "用户请求|请求变更|requested change", "proposal.md 缺少用户请求与真实需求。"],
    ["CS112", "must_match_regex", "范围|边界|scope", "proposal.md 缺少范围边界。"],
    ["CS113", "must_match_regex", "非目标|不在范围|non-goals|out of scope", "proposal.md 缺少非目标。"],
    ["CS114", "must_match_regex", "已确认决策|confirmed decisions", "proposal.md 缺少已确认决策。"],
    ["CS115", "must_match_regex", "假设|开放问题|待确认|open questions", "proposal.md 缺少假设或开放问题。"],
    ["CS116", "must_match_regex", "决策账本|决策记录|decision ledger", "proposal.md 缺少决策账本。"]
  ],
  "delta-spec": [
    ["CS201", "must_match_regex", "(ADDED Requirements[\\s\\S]*MODIFIED Requirements[\\s\\S]*REMOVED Requirements)|(无基线草稿说明[\\s\\S]*候选业务规则[\\s\\S]*验收条件[\\s\\S]*待补全基线后确认的问题[\\s\\S]*代码事实依据)", "delta-spec.md 缺少标准增量结构。"]
  ],
  tasks: [
    ["CS301", "must_match_regex", "validation\\.md|一致性验证|验证", "tasks.md 缺少验证引用。"],
    ["CS302", "must_contain_heading", "## Context", "tasks.md 缺少 Context。"],
    ["CS303", "must_match_regex", "\\*\\*Files:\\*\\*", "Task 缺少 Files。"],
    ["CS304", "must_match_regex", "\\*\\*Context:\\*\\*", "Task 缺少 Context。"],
    ["CS305", "must_match_regex", "\\*\\*Do:\\*\\*", "Task 缺少 Do。"],
    ["CS306", "must_match_regex", "\\*\\*Verify:\\*\\*", "Task 缺少 Verify。"],
    ["CS307", "must_match_regex", "\\*\\*Verify:\\*\\*[\\s\\S]*- \\[ \\]", "Verify 缺少未完成复选框。"],
    ["CS308", "must_match_regex", "依赖关系图|dependency graph", "tasks.md 缺少依赖关系图。"],
    ["CS309", "must_match_regex", "DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED|DONE", "tasks.md 缺少任务报告状态。"],
    ["CS310", "must_match_regex", "输入物[\\s\\S]*输出物|inputs?[\\s\\S]*outputs?", "Context 缺少输入物和输出物。"],
    ["CS311", "must_match_regex", "规格合规[\\s\\S]*串连验证|spec compliance[\\s\\S]*integration", "Verify 缺少规格合规和串连验证。"],
    ["CS312", "must_match_regex", "实现方案|implementation approach", "tasks.md 缺少文件级实现方案。"]
  ],
  validation: [
    ["CS401", "must_match_regex", "允许进入实现|可进入实现|总体结论|验证结论|implementation may start", "validation.md 缺少进入实现结论。"]
  ],
  review: [
    ["CS501", "must_match_regex", "Decision:\\s*(Approved|Changes Required)|审查决策|结论", "review.md 缺少审查结论。"]
  ]
};

export function builtinWorkflow(profile = "light") {
  return loadPack("matspec", profile);
}

export function loadPack(packKey = "matspec", requestedProfile) {
  if (!KEY.test(packKey)) throw workflowError(`Invalid workflow pack key: ${packKey}`);
  const packRoot = safePackagePath(`workflow-packs/${packKey}`);
  const manifestFile = path.join(packRoot, "pack.yaml");
  if (!fs.existsSync(manifestFile)) throw workflowError(`Workflow pack not found: ${packKey}`);
  const manifest = YAML.parse(fs.readFileSync(manifestFile, "utf8")) || {};
  if (manifest.key !== packKey || (!manifest.workflow && !manifest.profiles) || !manifest.templatesRoot || !manifest.commandsRoot) {
    throw workflowError(`Invalid workflow pack manifest: ${packKey}`);
  }
  const profile = selectProfile(manifest, requestedProfile);
  const workflowFile = safePackPath(packRoot, profile.workflow);
  const templatesRoot = safePackPath(packRoot, manifest.templatesRoot);
  const commandsRoot = safePackPath(packRoot, manifest.commandsRoot);
  if (!fs.statSync(workflowFile).isFile() || !fs.statSync(templatesRoot).isDirectory() || !fs.statSync(commandsRoot).isDirectory()) {
    throw workflowError(`Invalid workflow pack resources: ${packKey}`);
  }
  const parsed = YAML.parse(fs.readFileSync(workflowFile, "utf8")) || {};
  const stages = (parsed.stages || []).map((raw) => {
    const defaults = STAGES.find((stage) => stage.key === raw.key) || {};
    const stage = normalizeStage({
      ...defaults,
      ...raw,
      checks: raw.checks || (DEFAULT_CHECKS[raw.key] || []).map(([code, type, value, message]) => ({ code, type, value, message }))
    });
    if (!stage.noFile) {
      const template = safePackPath(packRoot, stage.template);
      if (!fs.statSync(template).isFile()) throw workflowError(`Workflow pack template is not a file: ${stage.template}`);
      stage.templateRef = fileRef(packRoot, template);
    }
    const command = safePackPath(commandsRoot, `${stage.command}.md`);
    if (!fs.statSync(command).isFile()) throw workflowError(`Workflow pack command is not a file: ${stage.command}`);
    stage.commandRef = fileRef(packRoot, command);
    return stage;
  });
  const utilities = new Set();
  for (const commandName of manifest.utilityCommands || []) {
    if (!KEY.test(commandName) || utilities.has(commandName)) throw workflowError(`Invalid utility command: ${commandName}`);
    utilities.add(commandName);
    const command = safePackPath(commandsRoot, `${commandName}.md`);
    if (!fs.statSync(command).isFile()) throw workflowError(`Workflow pack utility command is not a file: ${commandName}`);
  }
  const workflow = {
    version: parsed.version || 1,
    source: "builtin",
    profile: profile.key,
    pack: { key: manifest.key, name: manifest.name, description: manifest.description, utilityCommands: [...utilities] },
    extends: null,
    stages,
    finalization: parsed.finalization || { require_updated: [...FINALIZATION_FILES] }
  };
  validateWorkflow(workflow);
  return workflow;
}

export function loadWorkflow(root, requestedProfile) {
  const projectFile = path.join(root, ".matspec-cli/workflows/project.yaml");
  const migrated = migrateLegacyWorkflow(root, projectFile);
  if (!fs.existsSync(projectFile)) {
    const config = readProjectConfig(root);
    const profile = requestedProfile || config.workflowProfile;
    if (config.workflowPack) return attachRefs(root, loadPack(config.workflowPack, profile));
    const legacyDefault = path.join(root, ".matspec-cli/workflows/default.yaml");
    if (fs.existsSync(legacyDefault)) {
      const parsed = YAML.parse(fs.readFileSync(legacyDefault, "utf8")) || {};
      const workflow = {
        version: parsed.version || 1,
        source: "project",
        profile: "custom",
        pack: null,
        extends: null,
        stages: (parsed.stages || []).map(normalizeStage),
        finalization: parsed.finalization || { require_updated: [] }
      };
      validateWorkflow(workflow, root);
      return attachRefs(root, workflow);
    }
    return attachRefs(root, builtinWorkflow(profile));
  }
  const parsed = YAML.parse(fs.readFileSync(projectFile, "utf8")) || {};
  const profile = requestedProfile || parsed.profile || readProjectConfig(root).workflowProfile;
  const base = parsed.extends ? loadPack(parsed.extends, profile) : { version: 1, profile: "custom", stages: [], finalization: { require_updated: [] } };
  const stages = [...base.stages];
  for (const raw of parsed.stages || []) {
    const stage = normalizeStage(raw);
    const existing = stages.findIndex((item) => item.key === stage.key);
    if (existing >= 0) stages[existing] = stage;
    else {
      const after = stages.findIndex((item) => item.key === raw.after);
      stages.splice(after >= 0 ? after + 1 : stages.length, 0, stage);
    }
  }
  const workflow = {
    version: parsed.version || 1,
    source: migrated ? "project-migrated" : parsed.extends ? "pack-extended" : "project",
    profile: parsed.extends ? base.profile : "custom",
    pack: parsed.extends ? base.pack : null,
    extends: parsed.extends || null,
    stages,
    finalization: parsed.finalization || base.finalization
  };
  validateWorkflow(workflow, root);
  return attachRefs(root, workflow);
}

function migrateLegacyWorkflow(root, projectFile) {
  const legacy = path.join(root, ".matspec-cli/stages.yaml");
  if (!fs.existsSync(legacy) || fs.existsSync(projectFile)) return false;
  const parsed = YAML.parse(fs.readFileSync(legacy, "utf8")) || {};
  const stages = (parsed.stages || []).map((stage) => ({
    key: stage.key,
    ...(stage.file ? { file: stage.file } : {}),
    label: stage.label || stage.name || stage.key,
    command: String(stage.command || `project.${stage.key}`).replace(/^\/matspec\./, "project."),
    ...(stage.template ? { template: stage.template } : {}),
    objective: stage.objective || "",
    required_for_done: stage.required_for_done ?? stage.required ?? false,
    ...(stage.delegate ? { delegate: stage.delegate } : {}),
    noFile: Boolean(stage.noFile),
    checks: [
      ...((stage.validationRules?.requiredSections || []).map((value, index) => ({
        code: `MIG${index + 1}`,
        type: "must_contain_heading",
        value,
        message: `缺少章节：${value}`
      }))),
      ...((stage.customChecks || []).map((check, index) => ({
        code: check.code || `MIGR${index + 1}`,
        type: "must_match_regex",
        value: check.pattern || check.regex || String(check),
        message: check.message || "自定义检查失败。"
      })))
    ]
  }));
  fs.mkdirSync(path.dirname(projectFile), { recursive: true });
  fs.writeFileSync(projectFile, YAML.stringify({ version: 1, extends: "matspec", stages }), "utf8");
  for (const stage of stages) {
    const command = path.join(root, ".matspec-cli/workflow-commands", `${stage.command}.md`);
    fs.mkdirSync(path.dirname(command), { recursive: true });
    if (!fs.existsSync(command)) fs.writeFileSync(command, `Run matspec go --json and execute stage ${stage.key}.\n`, "utf8");
  }
  fs.renameSync(legacy, `${legacy}.migrated.${Date.now()}`);
  return true;
}

export function assertNoLocalPackOverride(root) {
  if (path.resolve(root) === packageRoot) return;
  for (const relative of ["workflow-packs", ".matspec-cli/workflow-packs"]) {
    if (!fs.existsSync(path.join(root, relative))) continue;
    throw Object.assign(new Error(`Local workflow pack overrides are not allowed: ${relative}`), {
      code: "LOCAL_WORKFLOW_PACK_OVERRIDE",
      path: relative
    });
  }
}

export function validateWorkflow(workflow, root = process.cwd()) {
  if (!Array.isArray(workflow.stages) || !workflow.stages.length) throw workflowError("Workflow must contain stages.");
  const keys = new Set();
  const files = new Set();
  const commands = new Set();
  for (const stage of workflow.stages) {
    if (!KEY.test(stage.key)) throw workflowError(`Invalid stage key: ${stage.key}`);
    if (keys.has(stage.key)) throw workflowError(`Duplicate stage key: ${stage.key}`);
    keys.add(stage.key);
    if (!stage.noFile) {
      if (!stage.file || path.basename(stage.file) !== stage.file) throw workflowError(`Stage file must be a single file name: ${stage.file || stage.key}`);
      const lower = stage.file.toLowerCase();
      if (files.has(lower)) throw workflowError(`Duplicate stage file: ${stage.file}`);
      files.add(lower);
      if (stage.template && (path.isAbsolute(stage.template) || stage.template.split(/[\\/]/).includes(".."))) {
        throw workflowError(`Unsafe stage template path: ${stage.template}`);
      }
    }
    if (!KEY.test(stage.command || "") || stage.command === "matspec") throw workflowError(`Invalid stage command: ${stage.command || stage.key}`);
    if (commands.has(stage.command)) throw workflowError(`Duplicate stage command: ${stage.command}`);
    commands.add(stage.command);
    for (const check of stage.checks || []) {
      if (!CHECK_TYPES.has(check.type)) throw workflowError(`Unsupported stage check: ${check.type}`);
      if (check.type === "must_match_regex") {
        try { new RegExp(check.value, "i"); } catch { throw workflowError(`Invalid stage regex: ${check.value}`); }
      }
    }
  }
  for (const target of workflow.finalization?.require_updated || []) safeProjectPath(root, target);
  for (const rule of workflow.finalization?.coverage || []) {
    safeProjectPath(root, rule.delta);
    safeProjectPath(root, rule.full);
  }
  return workflow;
}

export function snapshotWorkflow(root, workflow = loadWorkflow(root)) {
  return JSON.parse(JSON.stringify(workflow));
}

export function workflowDrift(root, snapshot) {
  const findings = [];
  for (const stage of snapshot?.stages || []) {
    for (const [kind, ref] of [["template", stage.templateRef], ["command", stage.commandRef]]) {
      if (!ref) continue;
      let file;
      try {
        file = ref.projectPath ? safeProjectPath(root, ref.projectPath) : safePackagePath(ref.packagePath);
      } catch (error) {
        findings.push({ level: "error", code: "WORKFLOW_PACK_DRIFT", stage: stage.key, kind, path: ref.projectPath || ref.packagePath, message: error.message });
        continue;
      }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile() || sha256(file) !== ref.sha256) {
        findings.push({
          level: ref.projectPath ? "warn" : "error",
          code: "WORKFLOW_PACK_DRIFT",
          stage: stage.key,
          kind,
          path: ref.projectPath || ref.packagePath,
          message: `Frozen workflow ${kind} changed: ${ref.projectPath || ref.packagePath}`
        });
      }
    }
  }
  return findings;
}

export function refreshWorkflowSnapshot(root, change, confirmation) {
  if (!String(confirmation || "").trim()) {
    return { ok: false, code: "WORKFLOW_REFRESH_CONFIRMATION_REQUIRED", message: "缺少兼容性确认说明。" };
  }
  const stateFile = path.join(root, "matspec/changes", change, ".matspec-state.json");
  if (!fs.existsSync(stateFile)) return { ok: false, code: "CHANGE_NOT_FOUND", message: `变更不存在：${change}` };
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const before = workflowDrift(root, state.workflow);
  for (const stage of state.workflow?.stages || []) {
    for (const ref of [stage.templateRef, stage.commandRef]) {
      if (!ref) continue;
      const file = ref.projectPath ? safeProjectPath(root, ref.projectPath) : safePackagePath(ref.packagePath);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return { ok: false, code: "WORKFLOW_PACK_REF_MISSING", path: ref.projectPath || ref.packagePath, message: "工作流引用缺失。" };
      }
      ref.sha256 = sha256(file);
    }
  }
  const audit = {
    maintainer: process.env.USERNAME || process.env.USER || "unknown",
    timestamp: new Date().toISOString(),
    confirmation: String(confirmation),
    changes: before.map((item) => ({ stage: item.stage, kind: item.kind, path: item.path }))
  };
  state.workflowDriftAudit ??= [];
  state.workflowDriftAudit.push(audit);
  state.history ??= [];
  state.history.push({ action: "refresh-workflow-snapshot", timestamp: audit.timestamp, confirmation: audit.confirmation });
  writeJson(stateFile, state);
  return { ok: true, change, audit };
}

export function resolveStageTemplate(root, stage) {
  const project = stage.file && path.join(root, "matspec/templates", stage.file);
  if (project && fs.existsSync(project)) return { source: "project", path: project, content: fs.readFileSync(project, "utf8") };
  if (stage.templateRef) {
    const file = stage.templateRef.projectPath ? safeProjectPath(root, stage.templateRef.projectPath) : safePackagePath(stage.templateRef.packagePath);
    if (fs.existsSync(file)) return { source: stage.templateRef.projectPath ? "project" : "builtin", path: file, content: fs.readFileSync(file, "utf8") };
  }
  return null;
}

function normalizeStage(stage) {
  return {
    key: stage.key,
    ...(stage.file ? { file: stage.file } : {}),
    label: stage.label || stage.name || stage.key,
    name: stage.name || stage.label || stage.key,
    command: stage.command || `project.${stage.key}`,
    agentCommand: stage.agentCommand || `/${stage.command || `project.${stage.key}`}`,
    ...(stage.template ? { template: stage.template } : {}),
    objective: stage.objective || "",
    required_for_done: stage.required_for_done ?? stage.required ?? false,
    ...(stage.delegate ? { delegate: stage.delegate } : {}),
    noFile: Boolean(stage.noFile),
    checks: stage.checks || [],
    inputs: stage.inputs || [],
    requiresFullSpec: Boolean(stage.requiresFullSpec),
    requiresFullDesign: Boolean(stage.requiresFullDesign)
  };
}

function attachRefs(root, workflow) {
  for (const stage of workflow.stages) {
    if (!stage.noFile) {
      const projectTemplate = stage.template?.startsWith("matspec/") ? safeProjectPath(root, stage.template) : null;
      const packageTemplate = projectTemplate || path.join(
        packageRoot,
        stage.template?.startsWith("workflow-packs/")
          ? stage.template
          : `workflow-packs/${workflow.pack?.key || "matspec"}/${stage.template || `templates/delta/${stage.file}`}`
      );
      if (fs.existsSync(packageTemplate)) {
        stage.templateRef = projectTemplate
          ? { projectPath: path.relative(root, packageTemplate).replaceAll(path.sep, "/"), sha256: sha256(packageTemplate) }
          : { packagePath: path.relative(packageRoot, packageTemplate).replaceAll(path.sep, "/"), sha256: sha256(packageTemplate) };
      }
    }
    const projectCommand = path.join(root, ".matspec-cli/workflow-commands", `${stage.command}.md`);
    const packageCommand = path.join(packageRoot, `workflow-packs/${workflow.pack?.key || "matspec"}/commands`, `${stage.command}.md`);
    if (fs.existsSync(projectCommand)) {
      stage.commandRef = { projectPath: path.relative(root, projectCommand).replaceAll(path.sep, "/"), sha256: sha256(projectCommand) };
    } else if (fs.existsSync(packageCommand)) {
      stage.commandRef = { packagePath: path.relative(packageRoot, packageCommand).replaceAll(path.sep, "/"), sha256: sha256(packageCommand) };
    }
  }
  validateWorkflow(workflow, root);
  return workflow;
}

function safeProjectPath(root, relative) {
  if (!relative || path.isAbsolute(relative)) throw workflowError(`Unsafe project path: ${relative}`);
  const target = path.resolve(root, relative);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw workflowError(`Unsafe project path: ${relative}`);
  return target;
}

function safePackagePath(relative) {
  if (!relative || path.isAbsolute(relative)) throw workflowError(`Unsafe package path: ${relative}`);
  const target = path.resolve(packageRoot, relative);
  const rel = path.relative(packageRoot, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw workflowError(`Unsafe package path: ${relative}`);
  return target;
}

function safePackPath(packRoot, relative) {
  if (!relative || path.isAbsolute(relative)) throw workflowError(`Unsafe workflow pack path: ${relative}`);
  const target = path.resolve(packRoot, relative);
  const rel = path.relative(packRoot, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw workflowError(`Unsafe workflow pack path: ${relative}`);
  if (!fs.existsSync(target)) throw workflowError(`Workflow pack resource missing: ${relative}`);
  return target;
}

function fileRef(packRoot, file) {
  return {
    packPath: path.relative(packRoot, file).replaceAll(path.sep, "/"),
    packagePath: path.relative(packageRoot, file).replaceAll(path.sep, "/"),
    sha256: sha256(file)
  };
}

function readProjectConfig(root) {
  try {
    return YAML.parse(fs.readFileSync(path.join(root, ".matspec-cli/config.yaml"), "utf8")) || {};
  } catch {
    return {};
  }
}

function selectProfile(manifest, requestedProfile) {
  if (!manifest.profiles) {
    if (requestedProfile && requestedProfile !== "default") {
      throw workflowError(`Workflow pack ${manifest.key} does not define profile: ${requestedProfile}`, "WORKFLOW_PROFILE_INVALID");
    }
    return { key: "default", workflow: manifest.workflow };
  }
  const key = requestedProfile || manifest.defaultProfile || "light";
  const workflow = manifest.profiles[key];
  if (!workflow) {
    throw workflowError(`Unknown workflow profile: ${key}. Available: ${Object.keys(manifest.profiles).join(", ")}`, "WORKFLOW_PROFILE_INVALID");
  }
  return { key, workflow };
}

function workflowError(message, code = "INVALID_WORKFLOW") {
  return Object.assign(new Error(message), { code });
}
