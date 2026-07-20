import fs from "node:fs";
import path from "node:path";
import { projectPaths } from "./project.js";
import { listChanges, loadState, stageStatus, stagesOf, templateMarker } from "./state.js";
import { workflowDrift } from "./workflow.js";
import { tr } from "./i18n.js";

const finding = (level, code, filePath, message, extra = {}) => ({ level, code, path: filePath, message, ...extra });

export function validateProject(options = {}, explicitChange) {
  const paths = projectPaths(options);
  const findings = [];
  if (!fs.existsSync(paths.matspec)) findings.push(finding("error", "CS001", "matspec", tr(options, "Missing matspec/ directory.", "缺少 matspec/ 目录。")));
  if (!fs.existsSync(paths.specs)) findings.push(finding("error", "CS002", "matspec/specs", tr(options, "Missing matspec/specs/ directory.", "缺少 matspec/specs/ 目录。")));
  if (!fs.existsSync(path.join(paths.specs, "spec.md"))) findings.push(finding("warn", "CS003", "matspec/specs/spec.md", "缺少全量 spec.md。"));
  if (!fs.existsSync(path.join(paths.specs, "design.md"))) findings.push(finding("warn", "CS004", "matspec/specs/design.md", "缺少全量 design.md。"));
  if (!fs.existsSync(paths.changes)) findings.push(finding("error", "CS005", "matspec/changes", "缺少 matspec/changes/。"));
  if (!fs.existsSync(paths.archives)) findings.push(finding("error", "CS006", "matspec/changes/archives", "缺少 archives。"));
  if (!fs.existsSync(path.join(paths.runtime, "config.yaml"))) findings.push(finding("error", "CS007", ".matspec-cli/config.yaml", "缺少 config.yaml。"));
  const dataDir = path.join(paths.matspec, "data");
  if (fs.existsSync(dataDir)) {
    for (const name of fs.readdirSync(dataDir).filter((item) => item.endsWith(".json"))) {
      findings.push(finding("error", "CS008", `matspec/data/${name}`, "禁止把 JSON 数据文件作为核心规格资产。"));
    }
  }

  const changes = explicitChange ? [explicitChange] : listChanges(options);
  for (const change of changes) validateChange(paths.root, change, findings);
  return findings;
}

export function doctor(options = {}) {
  const paths = projectPaths(options);
  const findings = validateProject(options);
  if (!fs.existsSync(path.join(paths.root, ".gitignore"))) findings.push(finding("warn", "CSD001", ".gitignore", "缺少 .gitignore。"));
  return findings;
}

function validateChange(root, change, findings) {
  const dir = path.join(root, "matspec/changes", change);
  if (!fs.existsSync(dir)) {
    findings.push(finding("error", "CS100", `matspec/changes/${change}`, "指定变更目录不存在。"));
    return;
  }
  const state = loadState(root, change);
  if (!state) {
    findings.push(finding("error", "CS101", `matspec/changes/${change}/.matspec-state.json`, "change 缺少状态文件。"));
    return;
  }
  findings.push(...workflowDrift(root, state.workflow));
  let previousFileReady = true;
  for (const stage of stagesOf(state)) {
    if (stage.noFile) continue;
    const relative = `matspec/changes/${change}/${stage.file}`;
    const file = path.join(dir, stage.file);
    const exists = fs.existsSync(file);
    const status = stageStatus(root, change, state, stage);
    if (exists && !previousFileReady) findings.push(finding("warn", "CS102", relative, "后序阶段文件存在但前序文件未完成。"));
    if (exists && status !== "confirmed" && status !== "template") findings.push(finding("warn", "CS103", relative, "阶段文档未确认。"));
    if (exists) {
      const marker = templateMarker(fs.readFileSync(file, "utf8"), stage.file);
      if (marker && !marker.strong) findings.push(finding("warn", "STAGE_WEAK_PLACEHOLDER", relative, `阶段文档包含弱占位符：${marker.marker}`));
      validateChecks(file, relative, stage.checks || [], findings);
    }
    previousFileReady = exists && status !== "template";
  }
}

function validateChecks(file, relative, checks, findings) {
  const content = fs.readFileSync(file, "utf8");
  for (const check of checks) {
    let passed = true;
    if (check.type === "file_not_empty") passed = Boolean(content.trim());
    if (check.type === "must_contain_heading") {
      const expected = String(check.value).replace(/\s+/g, "").toLowerCase();
      passed = content.split(/\r?\n/).some((line) => /^#{1,6}\s+/.test(line) && line.replace(/\s+/g, "").toLowerCase().includes(expected.replace(/^#+/, "")));
    }
    if (check.type === "must_match_regex") passed = new RegExp(check.value, "i").test(content);
    if (!passed) findings.push(finding("warn", check.code || "WORKFLOW_CHECK", relative, check.message || `未满足检查：${check.type}`));
  }
}
