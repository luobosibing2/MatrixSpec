import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isZh, tr } from "../i18n.js";

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(SRC_DIR, "../..");
const FULL_TEMPLATE_DIR = path.join(PACKAGE_ROOT, "templates", "full");
const EN_FULL_TEMPLATE_DIR = path.join(PACKAGE_ROOT, "templates", "en", "full");

export function readFullTemplates(options = {}) {
  const templateDir = isZh(options) ? FULL_TEMPLATE_DIR : EN_FULL_TEMPLATE_DIR;
  return {
    design: readTemplate(templateDir, "DESIGN.md"),
    spec: readTemplate(templateDir, "SPEC.md"),
    specAnnotated: readTemplate(templateDir, "SPEC-annotated.md")
  };
}

export function requiredSpecSections(options = {}) {
  return isZh(options)
    ? [["组件定位", "Component Purpose"], ["领域术语", "Domain Terminology"], ["角色与边界", "Actors and Boundaries"], ["DFX 约束", "DFX Constraints"], ["核心能力", "Core Capabilities"], ["数据约束", "Data Constraints"]]
    : [["Component Purpose", "组件定位"], ["Domain Terminology", "领域术语"], ["Actors and Boundaries", "角色与边界"], ["DFX Constraints", "DFX 约束"], ["Core Capabilities", "核心能力"], ["Data Constraints", "数据约束"]];
}

export function requiredDesignSections(options = {}) {
  return isZh(options)
    ? [["设计概述", "Design overview"], ["系统架构", "System architecture"], ["数据模型", "Data model"], ["接口设计", "Interface design"], ["核心流程设计", "Core flow design"], ["算法设计", "Algorithm design"], ["缓存设计", "Caching design"], ["异常处理设计", "Error handling design"], ["监控与日志", "Observability"], ["安全设计", "Security design"]]
    : [["Design overview", "设计概述"], ["System architecture", "系统架构"], ["Data model", "数据模型"], ["Interface design", "接口设计"], ["Core flow design", "核心流程设计"], ["Algorithm design", "算法设计"], ["Caching design", "缓存设计"], ["Error handling design", "异常处理设计"], ["Observability", "监控与日志"], ["Security design", "安全设计"]];
}

export function commonOutputRules(options = {}) {
  return tr(
    options,
    `Hard output rules:
1. Output only the final Markdown body. Do not add explanations, prefaces, or afterwords.
2. Do not wrap the whole document in \`\`\`md or any other code fence.
3. Do not mention sandbox, filesystem, read-only mode, inability to write files, or "copy into your repo" environment details.
4. Write in English by default.
5. Do not claim that files have been written; the MatSpec CLI saves artifacts.`,
    `硬性输出规则：
1. 只输出最终 Markdown 正文，不要添加解释、前言或后记。
2. 不要用 \`\`\`md 或其他代码围栏包裹整篇文档。
3. 不要提及 sandbox、filesystem、read-only mode、无法写文件或“复制到仓库”等运行环境说明。
4. 默认使用中文输出。
5. 不要声称文件已经写入；MatSpec CLI 会保存产物。`
  );
}

export function specBlackBoxRules(options = {}) {
  return tr(
    options,
    `SPEC writing boundary:
1. SPEC answers "what the system does" for product, QA, business stakeholders, and AI agents.
2. Derive externally visible behavior and business rules from the generated design.md.
3. Do not include implementation details: file paths, class names, function names, table names, field types, indexes, framework internals, cache implementation, or source package names.
4. Abstract technical facts into user-visible capabilities, constraints, rules, or acceptance criteria.
5. Mark business intent that cannot be inferred from design.md as "to be confirmed"; do not invent it.`,
    `SPEC 写作边界：
1. SPEC 面向产品、测试、业务干系人和 coding agent，回答“系统做什么”。
2. 从生成的 design.md 中提炼外部可见行为和业务规则。
3. 不要包含实现细节：文件路径、类名、函数名、表名、字段类型、索引、框架内部、缓存实现或源码包名。
4. 将技术事实抽象成用户可见能力、约束、规则或验收条件。
5. design.md 无法推导出的业务意图必须标记为“待确认”，不要编造。`
  );
}

export function repositoryEvidence(scan, module = null) {
  const sourceExcerpts = module
    ? (scan.sourceExcerpts || []).filter((item) => module.path === "." || item.path === module.path || item.path.startsWith(`${module.path}/`))
    : scan.sourceExcerpts || [];
  const coreStats = (scan.coreDirStats || []).map((item) => `- ${item.path}/: ${item.files} files, ${item.lines} lines`).join("\n") || "- none";
  const readmeContext = (scan.readmeFiles || []).map((file) => `--- ${file.path}${file.truncated ? " (truncated)" : ""} ---\n${file.content}`).join("\n\n") || "(none)";
  const docsContext = (scan.docsFiles || []).map((file) => `--- ${file.path}${file.truncated ? " (truncated)" : ""} ---\n${file.content}`).join("\n\n") || "(none)";
  const opsContext = formatOperationalEvidence(scan.operationalEvidence);
  const excerptContext =
    sourceExcerpts
      .slice(0, module ? 12 : 24)
      .map((item) => `--- ${item.path}${item.truncated ? " (truncated)" : ""} ---\n${item.content}`)
      .join("\n\n") || "(none)";
  return `Directory Source File Stats:
${scan.dirStats || "(none)"}

Core Directory Coverage:
${coreStats}

README context:
${readmeContext}

Docs context:
${docsContext}

Operational evidence:
${opsContext}

Source excerpts with line numbers:
${excerptContext}

Developer documentation requirements:
- Include source anchors for important claims: file path, visible symbol/function/class name when available, and why the anchor matters.
- Include a runbook when operational evidence exists: build, validation, deployment, rollback, and failure-mode notes.
- Include debugging guidance for each major module: symptom, likely source area, and command or file to inspect.
- State certainty boundaries: mark source-confirmed facts separately from inferred behavior or missing evidence.`;
}

function formatOperationalEvidence(operationalEvidence = {}) {
  const sections = [
    ["Build evidence", operationalEvidence.build || []],
    ["Config/deploy evidence", operationalEvidence.config || []],
    ["Troubleshooting evidence", operationalEvidence.troubleshooting || []]
  ];
  return sections
    .map(([title, items]) => {
      const body = items.length
        ? items.map((item) => `--- ${item.path} ---\n${item.content}`).join("\n\n")
        : "(none)";
      return `${title}:\n${body}`;
    })
    .join("\n\n");
}

function readTemplate(templateDir, name) {
  return fs.readFileSync(path.join(templateDir, name), "utf8").trim();
}
