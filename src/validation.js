import fs from "node:fs";
import path from "node:path";
import { STAGES } from "./constants.js";
import { projectPaths } from "./project.js";
import { listChanges, loadState, stageStatus } from "./state.js";
import { tr } from "./i18n.js";

const finding = (level, code, filePath, message) => ({ level, code, path: filePath, message });

export function validateProject(options = {}, explicitChange) {
  const paths = projectPaths(options);
  const findings = [];
  if (!fs.existsSync(paths.matspec)) findings.push(finding("error", "CS001", "matspec", tr(options, "Missing matspec/ directory.", "缺少 matspec/ 目录。")));
  if (!fs.existsSync(paths.specs)) findings.push(finding("error", "CS002", "matspec/specs", tr(options, "Missing matspec/specs/ directory.", "缺少 matspec/specs/ 目录。")));
  if (!fs.existsSync(path.join(paths.specs, "spec.md"))) {
    findings.push(finding("warn", "CS003", "matspec/specs/spec.md", tr(options, "Missing matspec/specs/spec.md. Generate or import a real full spec.md.", "缺少 matspec/specs/spec.md；请生成或导入真实全量 spec.md。")));
  }
  if (!fs.existsSync(path.join(paths.specs, "design.md"))) {
    findings.push(finding("warn", "CS004", "matspec/specs/design.md", tr(options, "Missing matspec/specs/design.md. Generate or import a real full design.md.", "缺少 matspec/specs/design.md；请生成或导入真实全量 design.md。")));
  }
  if (!fs.existsSync(paths.changes)) findings.push(finding("error", "CS005", "matspec/changes", tr(options, "Missing matspec/changes/ directory.", "缺少 matspec/changes/ 目录。")));
  if (!fs.existsSync(paths.archives)) findings.push(finding("error", "CS006", "matspec/changes/archives", tr(options, "Missing matspec/changes/archives/ directory.", "缺少 matspec/changes/archives/ 目录。")));
  if (!fs.existsSync(path.join(paths.runtime, "config.yaml"))) {
    findings.push(finding("error", "CS007", ".matspec-cli/config.yaml", tr(options, "Missing .matspec-cli/config.yaml.", "缺少 .matspec-cli/config.yaml。")));
  }
  const dataDir = path.join(paths.matspec, "data");
  if (fs.existsSync(dataDir)) {
    const jsonFiles = fs.readdirSync(dataDir).filter((name) => name.endsWith(".json"));
    for (const name of jsonFiles) findings.push(finding("error", "CS008", `matspec/data/${name}`, tr(options, "JSON data files are not allowed as core spec assets.", "禁止把 JSON 数据文件作为核心规格资产。")));
  }

  const changes = explicitChange ? [explicitChange] : listChanges(options);
  for (const change of changes) validateChange(paths.root, change, findings, options);
  return findings;
}

export function doctor(options = {}) {
  const paths = projectPaths(options);
  const findings = validateProject(options);
  if (!fs.existsSync(path.join(paths.root, ".gitignore"))) {
    findings.push(finding("warn", "CSD001", ".gitignore", tr(options, "Missing .gitignore.", "缺少 .gitignore。")));
  }
  return findings;
}

function validateChange(root, change, findings, options) {
  const dir = path.join(root, "matspec/changes", change);
  if (!fs.existsSync(dir)) {
    findings.push(finding("error", "CS100", `matspec/changes/${change}`, tr(options, "The specified change directory does not exist.", "指定变更目录不存在。")));
    return;
  }
  const state = loadState(root, change);
  let previousConfirmed = true;
  for (const stage of STAGES) {
    const file = path.join(dir, stage.file);
    const exists = fs.existsSync(file);
    const status = stageStatus(root, change, state, stage);
    if (exists && !previousConfirmed) {
      findings.push(finding("warn", "CS102", `matspec/changes/${change}/${stage.file}`, tr(options, "A later stage file exists before previous stages are complete.", "后序阶段文件存在但前序阶段未完成。")));
    }
    if (exists && status !== "confirmed" && status !== "template") {
      findings.push(finding("warn", "CS103", `matspec/changes/${change}/${stage.file}`, tr(options, "The stage file has not been confirmed by the user.", "阶段文件未经过用户确认。")));
    }
    if (exists && stage.key === "proposal") validateProposal(file, change, findings, options);
    if (exists && stage.key === "delta-spec") validateDeltaSpec(file, change, findings, options);
    if (exists && stage.key === "tasks") validateTasks(file, change, findings, options);
    if (exists && stage.key === "validation") validateValidation(file, change, findings, options);
    previousConfirmed = status === "confirmed";
  }
}

function validateProposal(file, change, findings, options) {
  const content = fs.readFileSync(file, "utf8");
  const checks = [
    {
      code: "CS111",
      pattern: /requested change\s+vs\s+real need|real need|真实需求|真正需求|实际需求/i,
      message: tr(options, "proposal.md is missing Requested Change vs Real Need.", "proposal.md 缺少 Requested Change vs Real Need。")
    },
    {
      code: "CS112",
      pattern: /scope boundary|change scope|in scope|范围边界|范围|边界/i,
      message: tr(options, "proposal.md is missing a scope boundary.", "proposal.md 缺少范围边界。")
    },
    {
      code: "CS113",
      pattern: /non-goals|non goals|out of scope|非目标|不在范围/i,
      message: tr(options, "proposal.md is missing non-goals or out-of-scope items.", "proposal.md 缺少非目标或不在范围事项。")
    },
    {
      code: "CS114",
      pattern: /confirmed decisions|已确认.*决策|确认.*决策/i,
      message: tr(options, "proposal.md is missing confirmed decisions.", "proposal.md 缺少已确认决策。")
    },
    {
      code: "CS115",
      pattern: /open questions|assumptions|开放问题|待确认|假设/i,
      message: tr(options, "proposal.md is missing assumptions or open questions.", "proposal.md 缺少假设或开放问题。")
    },
    {
      code: "CS116",
      pattern: /decision ledger|决策账本|决策记录/i,
      message: tr(options, "proposal.md is missing a decision ledger.", "proposal.md 缺少决策账本。")
    }
  ];

  for (const check of checks) {
    if (!check.pattern.test(content)) {
      findings.push(finding("warn", check.code, `matspec/changes/${change}/proposal.md`, check.message));
    }
  }
}

function validateDeltaSpec(file, change, findings, options) {
  const content = fs.readFileSync(file, "utf8");
  for (const title of ["ADDED Requirements", "MODIFIED Requirements", "REMOVED Requirements"]) {
    if (!content.includes(title)) {
      findings.push(finding("warn", "CS201", `matspec/changes/${change}/delta-spec.md`, tr(options, `delta-spec.md is missing the ${title} heading.`, `delta-spec.md 缺少 ${title} 标题。`)));
    }
  }
}

function validateTasks(file, change, findings, options) {
  const content = fs.readFileSync(file, "utf8");
  if (!/测试|验证|test|validation/i.test(content)) {
    findings.push(finding("warn", "CS301", `matspec/changes/${change}/tasks.md`, tr(options, "tasks.md does not reference or include verification tasks.", "tasks.md 未引用或包含验证任务。")));
  }
  if (!/delta-spec\.md[\s\S]*matspec\/specs\/spec\.md|matspec\/specs\/spec\.md[\s\S]*delta-spec\.md/i.test(content)) {
    findings.push(finding("warn", "CS302", `matspec/changes/${change}/tasks.md`, tr(options, "tasks.md does not include done-stage refresh of matspec/specs/spec.md from delta-spec.md.", "tasks.md 未包含 done 阶段根据 delta-spec.md 刷新 matspec/specs/spec.md 的任务。")));
  }
  if (!/delta-design\.md[\s\S]*matspec\/specs\/design\.md|matspec\/specs\/design\.md[\s\S]*delta-design\.md/i.test(content)) {
    findings.push(finding("warn", "CS303", `matspec/changes/${change}/tasks.md`, tr(options, "tasks.md does not include done-stage refresh of matspec/specs/design.md from delta-design.md.", "tasks.md 未包含 done 阶段根据 delta-design.md 刷新 matspec/specs/design.md 的任务。")));
  }
}

function validateValidation(file, change, findings, options) {
  const content = fs.readFileSync(file, "utf8");
  if (!/允许进入实现|可进入实现|进入实现|implementation may start|may enter implementation|ready for implementation/i.test(content)) {
    findings.push(finding("warn", "CS401", `matspec/changes/${change}/validation.md`, tr(options, "validation.md is missing a conclusion about whether implementation may start.", "validation.md 缺少进入实现结论。")));
  }
}
