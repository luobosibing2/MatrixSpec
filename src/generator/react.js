import fs from "node:fs";
import path from "node:path";
import { fakeCompletion } from "../llm.js";
import { ensureDir, rel, slugify, writeJson } from "../util.js";
import { createWorkspaceGuard, runRunnerTask } from "./external.js";
import { commonOutputRules, readFullTemplates, repositoryEvidence, specBlackBoxRules } from "./templates.js";
import { isZh } from "../i18n.js";

export function runReactGeneration({ paths, run, scan, plan, strategy, progress = null, options = {} }) {
  const modulesDir = path.join(run.dir, "modules");
  const modulePromptsDir = path.join(run.dir, "logs/prompts/modules");
  const promptsDir = path.join(run.dir, "logs/prompts");
  ensureDir(modulesDir);
  ensureDir(modulePromptsDir);

  const isFake = strategy.provider === "fake";
  const guard = isFake ? null : createWorkspaceGuard(paths, run);
  const moduleResults = [];
  const moduleFailures = [];
  for (const [index, module] of plan.modules.entries()) {
    const slug = `${slugify(module.path) || "project-root"}.md`;
    progress?.(`Module ${index + 1}/${plan.modules.length}: ${module.name} (${module.path})`);
    const result = runModuleWithFallbacks({
      paths,
      run,
      scan,
      module,
      strategy,
      isFake,
      modulePromptsDir,
      options
    });
    if (!result.ok && !result.text) {
      moduleFailures.push(moduleFailure(module, result));
      progress?.(`Module failed after fallbacks: ${module.name} (${module.path})`);
      continue;
    }

    const moduleFile = path.join(modulesDir, slug);
    fs.writeFileSync(moduleFile, result.text, "utf8");
    moduleResults.push({
      module,
      content: result.text,
      artifact: rel(run.dir, moduleFile),
      prompt: result.prompt,
      attempts: result.attempts,
      usage: result.usage,
      runnerLog: result.log
    });
  }
  if (!moduleResults.length) {
    return {
      ok: false,
      code: "REACT_MODULES_FAILED",
      message: "All module generation attempts failed.",
      moduleFailures
    };
  }

  progress?.("Composing design.md");
  const designPrompt = buildDesignPrompt(scan, plan, moduleResults, moduleFailures, options);
  const designPromptFile = path.join(promptsDir, "design.md");
  fs.writeFileSync(designPromptFile, designPrompt, "utf8");
  const designResult = isFake
    ? {
        text: fakeReactDesign(plan, moduleResults, strategy.model, options),
        usage: { input: estimateTokens(designPrompt), output: 0 }
      }
    : externalCompletion({ paths, run, strategy, task: "design", prompt: designPrompt });
  if (!designResult.ok && !designResult.text) return designResult;
  const design = designResult.text;

  progress?.("Deriving spec.md from design.md");
  const specPrompt = buildSpecPrompt(design, options);
  const specPromptFile = path.join(promptsDir, "spec.md");
  fs.writeFileSync(specPromptFile, specPrompt, "utf8");
  const specResult = isFake
    ? fakeCompletion({
        task: "spec",
        prompt: specPrompt,
        plan,
        design,
        model: strategy.model,
        options
      })
    : externalCompletion({ paths, run, strategy, task: "spec", prompt: specPrompt });
  if (!specResult.ok && !specResult.text) return specResult;

  const workspaceError = guard?.changed();
  if (workspaceError) return workspaceError;

  const tokens = {
    input:
      moduleResults.reduce((total, module) => total + module.usage.input, 0) +
      designResult.usage.input +
      specResult.usage.input,
    output:
      moduleResults.reduce((total, module) => total + module.usage.output, 0) +
      designResult.usage.output +
      specResult.usage.output
  };
  const reactLog = {
    runner: strategy.runner,
    provider: strategy.provider,
    model: strategy.model,
    reason: strategy.generationReason,
    modules: moduleResults.map((module) => ({
      name: module.module.name,
      path: module.module.path,
      artifact: module.artifact,
      prompt: module.prompt,
      attempts: module.attempts,
      usage: module.usage,
      runnerLog: module.runnerLog
    })),
    moduleFailures,
    prompts: {
      design: rel(run.dir, designPromptFile),
      spec: rel(run.dir, specPromptFile)
    },
    calls: [
      ...moduleResults.map((module) => module.runnerLog).filter(Boolean),
      designResult.log,
      specResult.log
    ].filter(Boolean),
    tokens
  };
  const reactLogFile = path.join(run.dir, "logs/react.json");
  writeJson(reactLogFile, reactLog);
  progress?.("Module-first generation complete");

  return {
    ok: true,
    design,
    spec: specResult.text,
    modules: moduleResults.map((module) => module.artifact),
    logs: {
      react: rel(run.dir, reactLogFile),
      prompts: {
        design: rel(run.dir, designPromptFile),
        spec: rel(run.dir, specPromptFile)
      }
    },
    tokens,
    provider: strategy.provider,
    model: strategy.model,
    reason: strategy.generationReason,
    moduleFailures
  };
}

function runModuleWithFallbacks({ paths, run, scan, module, strategy, isFake, modulePromptsDir, options = {} }) {
  const baseSlug = slugify(module.path) || "project-root";
  const attempts = [
    { name: "standard", prompt: buildModulePrompt(scan, module, options) },
    { name: "compressed", prompt: buildCompressedModulePrompt(scan, module, options) },
    { name: "autonomous", prompt: buildAutonomousModulePrompt(module, options) }
  ];
  const attemptResults = [];

  for (const attempt of attempts) {
    const promptFile = path.join(modulePromptsDir, `${baseSlug}.${attempt.name}.md`);
    fs.writeFileSync(promptFile, attempt.prompt, "utf8");
    const result = isFake
      ? fakeCompletion({
          task: "module",
          prompt: attempt.prompt,
          plan: module,
          model: strategy.model,
          options
        })
      : externalCompletion({
          paths,
          run,
          strategy,
          task: `module-${baseSlug}-${attempt.name}`,
          prompt: attempt.prompt
        });
    const attemptLog = {
      name: attempt.name,
      prompt: rel(run.dir, promptFile),
      ok: Boolean(result.ok || result.text),
      code: result.code,
      message: result.message,
      runnerLog: result.log
    };
    attemptResults.push(attemptLog);
    if (result.ok || result.text) {
      return {
        ...result,
        ok: true,
        prompt: rel(run.dir, promptFile),
        attempts: attemptResults,
        usage: result.usage || { input: estimateTokens(attempt.prompt), output: estimateTokens(result.text) }
      };
    }
  }

  const last = attemptResults.at(-1) || {};
  return {
    ok: false,
    code: last.code || "MODULE_GENERATION_FAILED",
    message: last.message || `Module generation failed: ${module.path}`,
    attempts: attemptResults
  };
}

function moduleFailure(module, result) {
  return {
    name: module.name,
    path: module.path,
    code: result.code || "MODULE_GENERATION_FAILED",
    message: result.message || `Module generation failed: ${module.path}`,
    attempts: result.attempts || []
  };
}

function externalCompletion({ paths, run, strategy, task, prompt }) {
  const result = runRunnerTask({ paths, run, strategy, task, prompt });
  if (!result.ok) return result;
  return {
    ok: true,
    text: result.content,
    usage: {
      input: estimateTokens(prompt),
      output: estimateTokens(result.content)
    },
    log: result.log
  };
}

function buildModulePrompt(scan, module, options = {}) {
  const moduleFiles = scan.includedFiles.filter((file) => module.path === "." || file === module.path || file.startsWith(`${module.path}/`));
  const moduleTree = buildTree(moduleFiles);
  return `You are the MatSpec module documentation runner.
Task: generate an intermediate module design document for later design.md synthesis.

${commonOutputRules(options)}

Module document requirements:
1. Module docs are white-box intermediate material and may include files, classes, frameworks, and tables.
2. Explain module purpose, directory structure, core components, core flows, interfaces/data structures, and key constraints.
3. Base the content on the given module path and read-only repository analysis. Do not invent files.

Module: ${module.name}
Path: ${module.path}
Description: ${module.description}

Module files:
${moduleFiles.slice(0, 40).map((file) => `- ${file}`).join("\n") || "- none"}

Module tree:
${moduleTree || "(empty)"}

Repository evidence:
${repositoryEvidence(scan, module)}

${module.largeFile ? `Large-file module guidance:
This module has few files but many source lines. Split the analysis into functional regions with exact line ranges, core functions, interactions, and risks.` : ""}
`;
}

function buildCompressedModulePrompt(scan, module, options = {}) {
  const moduleFiles = scan.includedFiles.filter((file) => module.path === "." || file === module.path || file.startsWith(`${module.path}/`));
  return `You are the MatSpec module documentation runner.
Task: generate an intermediate module design document for later design.md synthesis.

${commonOutputRules(options)}

This is a compressed retry prompt. Analyze the repository yourself as needed instead of relying on large pasted context.

Module: ${module.name}
Path: ${module.path}
Description: ${module.description}
Source files: ${module.sourceFiles || moduleFiles.length || "unknown"}
Source lines: ${module.sourceLines || "unknown"}

Key module files:
${moduleFiles.slice(0, 30).map((file) => `- ${file}`).join("\n") || "- none"}

Requirements:
1. Explain module purpose, structure, core classes/functions, flows, interfaces, and constraints.
2. Prefer source-grounded claims with file paths and symbols.
3. If details are unclear, mark them as uncertain instead of inventing behavior.
`;
}

function buildAutonomousModulePrompt(module, options = {}) {
  return `You are the MatSpec autonomous module analysis runner.
Task: inspect the repository yourself and output a focused Markdown module document.

${commonOutputRules(options)}

Module: ${module.name}
Path: ${module.path}

Use your own read/search loop to inspect the module path and nearby call sites. Keep the workspace read-only. Do not modify files.

Output requirements:
1. Markdown only.
2. Cover purpose, directory structure, core components, core flows, interfaces/data structures, operational notes, and uncertainty boundaries.
3. Include concrete source anchors using file paths and symbols.
4. Do not invent files, commands, or behavior that you cannot ground in the source.
`;
}

function buildDesignPrompt(scan, plan, moduleResults, moduleFailures = [], options = {}) {
  const templates = readFullTemplates(options);
  return `You are the MatSpec design.md generation runner.
Task: synthesize a project-level implementation design document from module documents.

${commonOutputRules(options)}

Template requirements:
1. Strictly use the main section structure and headings from the DESIGN template below.
2. Preserve section meaning, but replace placeholders with real project content.
3. Do not delete non-applicable sections; write "No explicit design" or "To be confirmed" and explain the basis.
4. design.md is a white-box implementation design and may include technology stack, modules, APIs, data model, deployment, security, and observability.

DESIGN template:
${templates.design}

Project: ${plan.projectName}
Language: ${plan.language || "unknown"}
Modules:
${moduleResults.map((module) => `- ${module.module.name}: ${module.module.path}`).join("\n")}

Module documents:
${moduleResults.map((module) => module.content).join("\n\n")}

Failed modules:
${moduleFailures.length ? moduleFailures.map((failure) => `- ${failure.name}: ${failure.path} (${failure.code}) ${failure.message}`).join("\n") : "- none"}

Project README/docs evidence:
${repositoryEvidence(scan)}
`;
}

function buildSpecPrompt(design, options = {}) {
  const templates = readFullTemplates(options);
  return `You are the MatSpec spec.md generation runner.
Task: derive the SPEC only from the generated design.md.

${commonOutputRules(options)}

${specBlackBoxRules(options)}

Template requirements:
1. Strictly use the main section structure and headings from the SPEC template below.
2. Preserve these sections: Component Purpose, Domain Terminology, Actors and Boundaries, DFX Constraints, Core Capabilities, Data Constraints.
3. Replace placeholders with business language; do not keep placeholder text such as "[Component Name]" or "[Capability Name]".
4. Do not output guidance from SPEC-annotated; output only the final SPEC body.

SPEC template:
${templates.spec}

SPEC methodology reference:
${templates.specAnnotated}

Generated design.md:
${design}
`;
}

function buildTree(files) {
  const tree = {};
  for (const file of files) {
    let cursor = tree;
    for (const part of file.split("/")) {
      cursor[part] ??= {};
      cursor = cursor[part];
    }
  }
  const lines = [];
  renderTree(tree, 0, lines);
  return lines.join("\n");
}

function renderTree(node, depth, lines) {
  for (const name of Object.keys(node).sort((a, b) => a.localeCompare(b))) {
    const isDirectory = Object.keys(node[name]).length > 0;
    lines.push(`${"  ".repeat(depth)}${name}${isDirectory ? "/" : ""}`);
    if (isDirectory) renderTree(node[name], depth + 1, lines);
  }
}

function fakeReactDesign(plan, moduleResults, model, options = {}) {
  if (isZh(options)) {
    return `# MatSpec 实现设计

<!-- generated by matspec fake react -->

Provider: fake
Model: ${model}

## 1. 设计概述

根据模块文档合成的 fake react 设计。

## 2. 系统架构

Project: ${plan.projectName}

### 2.1 架构概述

模块优先模式会先生成模块文档，再合成项目级设计。

### 2.2 模块职责

${moduleResults.map((module) => `- ${module.module.name}: ${module.module.path}`).join("\n")}

### 2.3 技术栈

fake provider 不推断真实技术栈。

## 3. 数据模型

run manifest 存储产物路径和生成元数据。

## 4. 接口设计

用户入口包括 matspec generate、matspec show 和 matspec apply。

## 5. 核心流程设计

react 模式先生成模块文档，再合成 design.md，最后从 design.md 反推 spec.md。

## 6. 算法设计

不需要复杂算法。

## 7. 缓存设计

未使用显式缓存。

## 8. 异常处理设计

fake react provider 不调用网络 API。

## 9. 监控与日志

生成产物在 apply 前隔离保存在 .matspec-cli/runs 下。

## 10. 安全设计

这是用于测试的 deterministic fake react 输出。
`;
  }
  return `# MatSpec Implementation Design

<!-- generated by matspec fake react -->

Provider: fake
Model: ${model}

## 1. Design Overview

Fake react design synthesized from module documents.

## 2. System Architecture

Project: ${plan.projectName}

### 2.1 Architecture Overview

Module-first mode generates module documents before project-level synthesis.

### 2.2 Module Responsibilities

${moduleResults.map((module) => `- ${module.module.name}: ${module.module.path}`).join("\n")}

### 2.3 Technology Stack

Fake provider does not infer real technology stack.

## 3. Data Model

Run manifest stores artifact paths and generation metadata.

## 4. Interface Design

User entry points are matspec generate, matspec show, and matspec apply.

## 5. Core Flow Design

React mode generates module documents first, synthesizes design.md, then derives spec.md from design.md.

## 6. Algorithm Design

No complex algorithm is required.

## 7. Caching Design

No explicit cache is used.

## 8. Error Handling Design

Fake react provider does not call a network API.

## 9. Observability

Generation artifacts remain isolated under .matspec-cli/runs before apply.

## 10. Security Design

This is deterministic fake react output for tests.
`;
}

function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}
