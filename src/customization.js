import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { projectPaths } from "./project.js";
import { loadWorkflow, validateWorkflow } from "./workflow.js";
import { sha256 } from "./util.js";

const STAGE_FILES = ["proposal.md", "delta-spec.md", "delta-design.md", "tasks.md", "validation.md", "review.md"];
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = {
  harmonyos: { stages: STAGE_FILES, full: ["DESIGN.md", "SPEC.md"] },
  ux: { stages: STAGE_FILES.filter((file) => file !== "review.md"), full: [] }
};

export function stagesCommand(options = {}, args = []) {
  const root = projectPaths(options).root;
  const action = args[0] || "list";
  const file = path.join(root, ".matspec-cli/workflows/project.yaml");
  if (action === "init") {
    if (fs.existsSync(file) && !options.force) return fail("PROJECT_WORKFLOW_EXISTS", "project.yaml 已存在；使用 --force 覆盖。");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `# MatSpec project workflow\nversion: 1\nextends: matspec\nstages: []\n`, "utf8");
    return { ok: true, file: relative(root, file) };
  }
  if (action === "list") {
    const workflow = loadWorkflow(root);
    return { ok: true, source: workflow.source, stages: workflow.stages.map(({ key, file, label, command, delegate, required_for_done, noFile }) => ({ key, file, label, command, delegate, required_for_done, noFile })) };
  }
  if (action === "validate") {
    try {
      const workflow = loadWorkflow(root);
      validateWorkflow(workflow, root);
      return { ok: true, message: "project workflow 有效。" };
    } catch (error) {
      return fail(error.code || "INVALID_WORKFLOW", error.message);
    }
  }
  if (action === "cleanup") return cleanupMigrated(root, options);
  if (action === "add") return addStage(root, args[1], options);
  if (action === "remove") return removeStage(root, args[1], options);
  return fail("STAGES_COMMAND_USAGE", "用法：matspec stages init|list|add|remove|validate|cleanup");
}

export function templateCommand(options = {}, args = []) {
  const root = projectPaths(options).root;
  const action = args[0] || "list";
  if (action === "list") {
    return { ok: true, templates: STAGE_FILES.map((file) => resolveInheritedTemplate(root, path.basename(file, ".md"))) };
  }
  if (action === "show") {
    const template = resolveInheritedTemplate(root, args[1]);
    return template ? { ok: template.ok !== false, ...template } : fail("TEMPLATE_NOT_FOUND", `模板不存在：${args[1]}`);
  }
  if (action === "copy") return copyTemplate(root, args[1], options);
  if (action === "sync") return syncTemplates(root, options);
  // Strict source compatibility: template validate is intentionally not implemented.
  return fail("TEMPLATE_COMMAND_USAGE", "用法：matspec template list|show|copy|sync");
}

export function extensionCommand(options = {}, args = []) {
  const root = projectPaths(options).root;
  const action = args[0] || "list";
  const name = args[1];
  if (action === "list") {
    const config = readConfig(root);
    return { ok: true, extensions: Object.keys(EXTENSIONS).map((key) => ({ name: key, installed: Boolean(config.extensions?.[key]?.enabled) })) };
  }
  if (!EXTENSIONS[name]) return fail("EXTENSION_NOT_FOUND", `未知扩展：${name}`);
  if (action === "install") return installExtension(root, name, options);
  if (action === "remove" || action === "uninstall") return removeExtension(root, name);
  return fail("EXTENSION_COMMAND_USAGE", "用法：matspec extension list|install|remove");
}

export function resolveInheritedTemplate(root, stage) {
  const info = templateInfo(root, stage);
  if (!info) return null;
  const content = fs.readFileSync(info.path, "utf8");
  const match = content.match(/<!--\s*extends:([A-Za-z0-9._-]+)\s*-->/i);
  if (!match) return { ...info, content, inheritanceChain: null, useFullContent: true };
  const globalBase = path.join(os.homedir(), ".matspec/templates", `${match[1]}.md`);
  if (info.source === "global" && match[1] !== stage && fs.existsSync(globalBase)) {
    return fail("GLOBAL_TEMPLATE_EXTENDS_GLOBAL", "全局模板不能继承另一个全局模板。");
  }
  const base = info.source === "project" && fs.existsSync(globalBase) ? globalBase : builtinTemplate(match[1]);
  if (!fs.existsSync(base)) return fail("BASE_TEMPLATE_NOT_FOUND", `基模板不存在：${match[1]}`);
  const append = content.match(/<!--\s*append-start\s*-->([\s\S]*?)<!--\s*append-end\s*-->/i)?.[1]?.trim() || "";
  const baseContent = fs.readFileSync(base, "utf8");
  return {
    ...info,
    content: `${baseContent.trimEnd()}${append ? `\n\n${append}\n` : "\n"}`,
    extends: { baseStage: match[1] },
    inheritanceChain: [
      { level: base === globalBase ? "global" : "builtin", path: base, appendContent: null },
      { level: info.source, path: info.path, appendContent: append }
    ],
    useFullContent: false
  };
}

export function loadTemplateForAgent(root, stage) {
  const selected = templateInfo(root, stage);
  return selected ? { ...selected, content: fs.readFileSync(selected.path, "utf8") } : null;
}

function addStage(root, key, options) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(key || "")) return fail("INVALID_STAGE_KEY", `非法阶段 key：${key || ""}`);
  const file = path.join(root, ".matspec-cli/workflows/project.yaml");
  const config = readProjectWorkflow(file);
  if ((config.stages || []).some((stage) => stage.key === key)) return fail("STAGE_ALREADY_EXISTS", `阶段已存在：${key}`);
  const stage = {
    key,
    file: options.file || `${key}.md`,
    label: options.label || key,
    command: `project.${key}`,
    template: `matspec/templates/${options.file || `${key}.md`}`,
    objective: options.objective || "",
    required_for_done: Boolean(options.required),
    ...(options.delegate ? { delegate: options.delegate } : {}),
    after: options.after || "tasks"
  };
  config.stages ??= [];
  config.stages.push(stage);
  writeProjectWorkflow(file, config);
  const template = path.join(root, stage.template);
  const command = path.join(root, ".matspec-cli/workflow-commands", `${stage.command}.md`);
  fs.mkdirSync(path.dirname(template), { recursive: true });
  fs.mkdirSync(path.dirname(command), { recursive: true });
  if (!fs.existsSync(template)) fs.writeFileSync(template, `# ${stage.label}\n\n[待填：阶段内容]\n`, "utf8");
  if (!fs.existsSync(command)) fs.writeFileSync(command, `Run matspec go --json and write only ${stage.file}.\n`, "utf8");
  return { ok: true, stage, files: [relative(root, template), relative(root, command)] };
}

function removeStage(root, key, options) {
  const file = path.join(root, ".matspec-cli/workflows/project.yaml");
  const config = readProjectWorkflow(file);
  const stage = (config.stages || []).find((item) => item.key === key);
  const effective = loadWorkflow(root).stages.find((item) => item.key === key);
  if (!stage && !effective) return fail("UNKNOWN_STAGE", `阶段不存在：${key}`);
  if (effective?.required_for_done && !options.force) return fail("REQUIRED_STAGE_REMOVE_REQUIRES_FORCE", "删除必需阶段需要 --force。");
  config.stages = (config.stages || []).filter((item) => item.key !== key);
  if (!stage && effective) config.stages.push({ ...effective, required_for_done: false, noFile: true, file: undefined, template: undefined });
  writeProjectWorkflow(file, config);
  const removed = [];
  if (options.clean && stage) {
    for (const target of [stage.template && path.join(root, stage.template), path.join(root, ".matspec-cli/workflow-commands", `${stage.command}.md`)].filter(Boolean)) {
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
        removed.push(relative(root, target));
      }
    }
  }
  return { ok: true, stage: key, removed };
}

function cleanupMigrated(root, options) {
  const dir = path.join(root, ".matspec-cli");
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const removed = [];
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!/^stages\.yaml\.migrated\.\d+$/.test(name)) continue;
    const file = path.join(dir, name);
    if (options.force || fs.statSync(file).mtimeMs < cutoff) {
      fs.unlinkSync(file);
      removed.push(relative(root, file));
    }
  }
  return { ok: true, removed };
}

function templateInfo(root, stage) {
  if (!stage) return null;
  const config = readConfig(root);
  for (const name of Object.keys(config.extensions || {})) {
    if (!config.extensions[name]?.enabled) continue;
    const file = path.join(root, "matspec/extensions", name, `${stage}.md`);
    if (fs.existsSync(file)) return info("extension", file, { extension: name });
  }
  const project = path.join(root, "matspec/templates", `${stage}.md`);
  if (fs.existsSync(project)) return info("project", project);
  const global = path.join(os.homedir(), ".matspec/templates", `${stage}.md`);
  if (fs.existsSync(global)) return info("global", global);
  const builtin = builtinTemplate(stage);
  return fs.existsSync(builtin) ? info("builtin", builtin) : null;
}

function copyTemplate(root, stage, options) {
  const source = path.join(os.homedir(), ".matspec/templates", `${stage}.md`);
  const from = fs.existsSync(source) ? source : builtinTemplate(stage);
  if (!fs.existsSync(from)) return fail("TEMPLATE_NOT_FOUND", `模板不存在：${stage}`);
  const target = path.join(root, "matspec/templates", `${stage}.md`);
  if (fs.existsSync(target) && !options.force) return fail("TEMPLATE_OVERWRITE_REQUIRED", "项目模板已存在；使用 --force 覆盖。");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(from, target);
  return { ok: true, source: from, path: relative(root, target) };
}

function syncTemplates(root, options) {
  const updated = [];
  for (const [relative, targetName] of [
    ...STAGE_FILES.map((file) => [`delta/${file}`, file]),
    ["full/SPEC.md", "full/SPEC.md"],
    ["full/DESIGN.md", "full/DESIGN.md"]
  ]) {
    const from = path.join(packageRoot, "templates", relative);
    const target = path.join(os.homedir(), ".matspec/templates", targetName);
    if (!fs.existsSync(from)) continue;
    if (!fs.existsSync(target) || options.force || sha256(from) !== sha256(target)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(from, target);
      updated.push(target.replaceAll(path.sep, "/"));
    }
  }
  return { ok: true, updated, action: updated.length ? "updated" : "no-diff" };
}

function installExtension(root, name, options) {
  const config = readConfig(root);
  if (config.extensions?.[name]?.enabled && !options.force) return fail("EXTENSION_ALREADY_INSTALLED", `扩展已安装：${name}`);
  for (const [other, record] of Object.entries(config.extensions || {})) {
    if (!record.enabled || other === name) continue;
    const conflict = EXTENSIONS[name].stages.find((file) => EXTENSIONS[other]?.stages.includes(file));
    if (conflict && !options.force) return fail("TEMPLATE_CONFLICT", `${name} 与 ${other} 的 ${conflict} 冲突。`);
  }
  const dir = path.join(root, "matspec/extensions", name);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of EXTENSIONS[name].stages) {
    const source = path.join(packageRoot, "templates/delta", file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dir, file));
  }
  for (const file of EXTENSIONS[name].full) {
    const source = path.join(packageRoot, "templates/full", file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dir, `full-${file.toLowerCase()}`));
  }
  config.extensions ??= {};
  config.extensions[name] = { enabled: true, installedAt: new Date().toISOString(), templates: EXTENSIONS[name].stages, generationTemplates: EXTENSIONS[name].full };
  writeConfig(root, config);
  return { ok: true, extension: name, path: relative(root, dir) };
}

function removeExtension(root, name) {
  const config = readConfig(root);
  if (!config.extensions?.[name]?.enabled) return fail("EXTENSION_NOT_INSTALLED", `扩展未安装：${name}`);
  fs.rmSync(path.join(root, "matspec/extensions", name), { recursive: true, force: true });
  delete config.extensions[name];
  writeConfig(root, config);
  return { ok: true, extension: name };
}

function readProjectWorkflow(file) {
  if (!fs.existsSync(file)) return { version: 1, extends: "matspec", stages: [] };
  return YAML.parse(fs.readFileSync(file, "utf8")) || { version: 1, extends: "matspec", stages: [] };
}

function writeProjectWorkflow(file, config) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, YAML.stringify(config), "utf8");
}

function readConfig(root) {
  const file = path.join(root, ".matspec-cli/config.yaml");
  try { return YAML.parse(fs.readFileSync(file, "utf8")) || {}; } catch { return {}; }
}

function writeConfig(root, config) {
  fs.writeFileSync(path.join(root, ".matspec-cli/config.yaml"), YAML.stringify(config), "utf8");
}

function builtinTemplate(stage) {
  return path.join(packageRoot, "workflow-packs/matspec/templates/delta", `${stage}.md`);
}

function info(source, file, extra = {}) {
  return { source, path: file.replaceAll(path.sep, "/"), sha256: sha256(file), ...extra };
}

function relative(root, file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function fail(code, message) {
  return { ok: false, code, message };
}
