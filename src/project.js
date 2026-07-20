import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { CONFIG_YAML, DOC_DIRS, RUNTIME_DIRS } from "./constants.js";
import { ensureDir, rel, resolveRoot, writeFileIfNeeded } from "./util.js";
import { installIntegration } from "./integrations.js";
import { tr } from "./i18n.js";

const GITIGNORE_LINES = [".matspec-cli/runs/", ".matspec-cli/cache/", ".matspec-cli/tmp/", ".matspec-cli/report-queue/"];

export function initProject(targetPath, options = {}) {
  const root = path.resolve(targetPath || options.path || process.cwd());
  const created = [];
  const skipped = [];

  for (const dir of [...DOC_DIRS, ...RUNTIME_DIRS]) {
    ensureDir(path.join(root, dir), created, root);
  }

  writeConfig(root, options, created, skipped);

  const externalAgents = detectExternalAgents();
  updateGitignore(root, created, skipped);
  const templateSync = options.no_template_update ? { created: [], skipped: [] } : syncGlobalTemplates(options);

  let integrationResult = null;
  const integration = options.integration ?? "nga";
  if (integration !== "none") {
    integrationResult = installIntegration(root, integration, options);
  }

  const existingDocs = ["matspec/specs/spec.md", "matspec/specs/design.md"].filter((file) =>
    fs.existsSync(path.join(root, file))
  );

  return {
    ok: true,
    root,
    created,
    skipped,
    generation: {
      defaultRunner: resolveDefaultRunner(options),
      probeModels: {
        requested: Boolean(options.probe_models),
        status: options.probe_models ? "not_implemented" : "not_requested"
      },
      externalAgents
    },
    integration: integrationResult,
    templateSync,
    summary: {
      project: root,
      "default runner": resolveDefaultRunner(options),
      config: ".matspec-cli/config.yaml"
    },
    sections: [
      ...(created.length ? [{ title: tr(options, "Created", "已创建"), items: created }] : []),
      ...(skipped.length ? [{ title: tr(options, "Already exists", "已存在"), items: skipped }] : []),
      {
        title: tr(options, "Local generation tools", "本地生成工具"),
        items: agentSummaryItems(externalAgents, options).map((item) => item.trim())
      },
      ...(existingDocs.length ? [{ title: tr(options, "Existing authoritative docs", "已有权威文档"), items: existingDocs }] : [])
    ],
    items: [
      ...created.map((item) => tr(options, `Created: ${item}`, `已补齐：${item}`)),
      ...skipped.map((item) => tr(options, `Already exists: ${item}`, `已存在：${item}`)),
      tr(options, `Default runner: ${resolveDefaultRunner(options)}`, `默认生成工具：${resolveDefaultRunner(options)}`),
      tr(options, "Checked local agent tools:", "已检查本地 Agent 工具："),
      ...agentSummaryItems(externalAgents, options),
      ...existingDocs.map((item) => tr(options, `Existing full doc. Use matspec apply --force to overwrite: ${item}`, `已存在真实全量文档，如需覆盖请执行 matspec apply --force：${item}`))
    ],
    message: tr(options, `Checked MatSpec project: ${root}`, `已检查 matspec 项目：${root}`),
    next: existingDocs.length
      ? ["matspec start AR-feature-name"]
      : ["matspec generate", "matspec show", "matspec apply", ...(!options.no_codewiki ? ["matspec sync"] : [])]
  };
}

function writeConfig(root, options, created, skipped) {
  const file = path.join(root, ".matspec-cli/config.yaml");
  if (fs.existsSync(file) && !options.force) {
    skipped.push(rel(root, file));
    return;
  }
  let content = CONFIG_YAML;
  if (fs.existsSync(file) && options.force) {
    try {
      const existing = YAML.parse(fs.readFileSync(file, "utf8")) || {};
      const next = YAML.parse(CONFIG_YAML);
      next.extensions = existing.extensions || {};
      content = YAML.stringify(next);
    } catch {
      content = CONFIG_YAML;
    }
  }
  writeFileIfNeeded(file, content, { force: true, created, skipped, root });
}

function syncGlobalTemplates(options = {}) {
  const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../templates");
  const target = path.join(os.homedir(), ".matspec/templates");
  const result = { created: [], skipped: [] };
  for (const relative of [
    "delta/proposal.md",
    "delta/delta-spec.md",
    "delta/delta-design.md",
    "delta/tasks.md",
    "delta/validation.md",
    "delta/review.md",
    "full/SPEC.md",
    "full/DESIGN.md"
  ]) {
    const from = path.join(source, relative);
    const to = path.join(target, relative.replace(/^delta\//, ""));
    if (!fs.existsSync(from)) continue;
    if (fs.existsSync(to) && !options.force) {
      result.skipped.push(to.replaceAll(path.sep, "/"));
      continue;
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    result.created.push(to.replaceAll(path.sep, "/"));
  }
  return result;
}

function updateGitignore(root, created, skipped) {
  const file = path.join(root, ".gitignore");
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const lines = current.split(/\r?\n/).filter(Boolean);
  let changed = false;
  for (const line of GITIGNORE_LINES) {
    if (!lines.includes(line)) {
      lines.push(line);
      changed = true;
    }
  }
  if (changed || !fs.existsSync(file)) {
    fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
    created.push(rel(root, file));
  } else {
    skipped.push(rel(root, file));
  }
}

export function projectPaths(options = {}) {
  const root = resolveRoot(options);
  return {
    root,
    matspec: path.join(root, "matspec"),
    specs: path.join(root, "matspec/specs"),
    changes: path.join(root, "matspec/changes"),
    archives: path.join(root, "matspec/changes/archives"),
    runtime: path.join(root, ".matspec-cli")
  };
}

export function detectExternalAgents(env = process.env) {
  return {
    opencode: agentInfo("opencode", { env }),
    nga: agentInfo("nga", { env }),
    codegenie: agentInfo("codegenie", { env }),
    codeagent: agentInfo("codeagent", { env }),
    chrys: agentInfo("chrys", { env })
  };
}

function agentInfo(command, metadata) {
  const executablePath = findExecutable(command, metadata.env);
  return {
    available: Boolean(executablePath),
    command,
    ...(executablePath ? { path: executablePath.replaceAll(path.sep, "/") } : {}),
    ...(executablePath ? { version: readVersion(executablePath, metadata.env) } : {}),
    ...(metadata.recommendedModel ? { recommendedModel: metadata.recommendedModel } : {}),
    ...(metadata.fallbackModel ? { fallbackModel: metadata.fallbackModel } : {})
  };
}

function findExecutable(command, env = process.env) {
  const pathValue = env.PATH || env.Path || env.path || "";
  const extensions =
    process.platform === "win32"
      ? [".cmd", ".exe", ".bat", ".com", ".ps1", ""]
      : [""];
  for (const dir of pathValue.split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(dir, `${command}${extension}`);
      if (isExecutableFile(candidate)) return candidate;
    }
  }
  return null;
}

function isExecutableFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function readVersion(executablePath, env) {
  const result = spawnVersion(executablePath, env);
  const text = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return result.status === 0 && text ? text.split(/\r?\n/)[0] : null;
}

function spawnVersion(executablePath, env) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(executablePath)) {
    return spawnSync(executablePath, ["--version"], {
      env,
      encoding: "utf8",
      shell: true,
      windowsHide: true,
      timeout: 1500
    });
  }
  return spawnSync(executablePath, ["--version"], {
    env,
    encoding: "utf8",
    windowsHide: true,
    timeout: 1500
  });
}

function mergeGenerationConfig(root, externalAgents, options) {
  const file = path.join(root, ".matspec-cli/config.yaml");
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : CONFIG_YAML;
  fs.writeFileSync(file, mergeGenerationYaml(current, externalAgents, options), "utf8");
}

function mergeGenerationYaml(yaml, externalAgents, options) {
  const lines = yaml.split(/\r?\n/);
  const generationIndex = lines.findIndex((line) => line === "generation:");
  if (generationIndex === -1) {
    return `${yaml.trimEnd()}\n${generationYaml(externalAgents, options)}`;
  }

  const output = [];
  output.push(...lines.slice(0, generationIndex + 1));

  let endIndex = lines.length;
  for (let index = generationIndex + 1; index < lines.length; index += 1) {
    if (lines[index] && !lines[index].startsWith(" ")) {
      endIndex = index;
      break;
    }
  }

  const blockNames = ["probeModels", "externalAgents"];
  if (options.default_runner) blockNames.push("defaultRunner");
  const generationBody = removeGenerationChildBlocks(lines.slice(generationIndex + 1, endIndex), blockNames);
  if (options.default_runner || !generationBody.some((line) => /^  defaultRunner:/.test(line))) {
    output.push(`  defaultRunner: ${resolveDefaultRunner(options)}`);
  }
  output.push(...generationBody.filter((line) => line !== ""));
  output.push(probeModelsYaml(options));
  output.push("  externalAgents:");
  output.push(...Object.entries(externalAgents).flatMap(([name, agent]) => agentYamlLines(name, agent)));
  output.push(...lines.slice(endIndex));

  return `${output.join("\n").trimEnd()}\n`;
}

function removeGenerationChildBlocks(lines, blockNames) {
  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const scalarMatch = lines[index].match(/^  ([A-Za-z0-9_-]+):\s*.+$/);
    if (scalarMatch && blockNames.includes(scalarMatch[1])) {
      continue;
    }
    const match = lines[index].match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (match && blockNames.includes(match[1])) {
      index += 1;
      while (index < lines.length && (lines[index] === "" || !/^  \S/.test(lines[index]))) {
        index += 1;
      }
      index -= 1;
      continue;
    }
    output.push(lines[index]);
  }
  return output;
}

function generationYaml(externalAgents, options) {
  return `generation:
  defaultRunner: ${resolveDefaultRunner(options)}
${probeModelsYaml(options)}
  externalAgents:
${Object.entries(externalAgents)
  .map(([name, agent]) => agentYaml(name, agent))
  .join("")}`;
}

function resolveDefaultRunner(options) {
  return options.runner || options.default_runner || "opencode";
}

function probeModelsYaml(options) {
  return `  probeModels:
    requested: ${Boolean(options.probe_models)}
    status: ${options.probe_models ? "not_implemented" : "not_requested"}`;
}

function agentYaml(name, agent) {
  return `${agentYamlLines(name, agent).join("\n")}\n`;
}

function agentYamlLines(name, agent) {
  const lines = [
    `    ${name}:`,
    `      available: ${agent.available}`,
    `      command: ${agent.command}`
  ];
  if (agent.path) lines.push(`      path: ${quoteYaml(agent.path)}`);
  if (agent.version) lines.push(`      version: ${quoteYaml(agent.version)}`);
  if (agent.recommendedModel) lines.push(`      recommendedModel: ${agent.recommendedModel}`);
  if (agent.fallbackModel) lines.push(`      fallbackModel: ${agent.fallbackModel}`);
  return lines;
}

function quoteYaml(value) {
  return JSON.stringify(value);
}

function agentSummaryItems(externalAgents, options = {}) {
  return Object.entries(externalAgents).map(([name, agent]) => {
    if (!agent.available) return tr(options, `  ${name}: not found`, `  ${name}: 未发现`);
    const model = agent.recommendedModel
      ? tr(options, `, recommended model ${agent.recommendedModel}`, `，推荐模型 ${agent.recommendedModel}`)
      : "";
    return tr(options, `  ${name}: available${model}`, `  ${name}: 可用${model}`);
  });
}
