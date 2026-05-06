import fs from "node:fs";
import path from "node:path";
import { fakeCompletion } from "../llm.js";
import { ensureDir, rel, slugify, writeJson } from "../util.js";
import { createWorkspaceGuard, runRunnerTask } from "./external.js";
import { commonOutputRules, readFullTemplates, specBlackBoxRules } from "./templates.js";

export function runReactGeneration({ paths, run, scan, plan, strategy, progress = null }) {
  const modulesDir = path.join(run.dir, "modules");
  const modulePromptsDir = path.join(run.dir, "logs/prompts/modules");
  const promptsDir = path.join(run.dir, "logs/prompts");
  ensureDir(modulesDir);
  ensureDir(modulePromptsDir);

  const isFake = strategy.provider === "fake";
  const guard = isFake ? null : createWorkspaceGuard(paths, run);
  const moduleResults = [];
  for (const [index, module] of plan.modules.entries()) {
    const slug = `${slugify(module.path) || "project-root"}.md`;
    progress?.(`Module ${index + 1}/${plan.modules.length}: ${module.name} (${module.path})`);
    const prompt = buildModulePrompt(scan, module);
    const promptFile = path.join(modulePromptsDir, slug);
    fs.writeFileSync(promptFile, prompt, "utf8");

    const result = isFake
      ? fakeCompletion({
          task: "module",
          prompt,
          plan: module,
          model: strategy.model
        })
      : externalCompletion({
          paths,
          run,
          strategy,
          task: `module-${slugify(module.path) || "project-root"}`,
          prompt
        });
    if (!result.ok && !result.text) return result;

    const moduleFile = path.join(modulesDir, slug);
    fs.writeFileSync(moduleFile, result.text, "utf8");
    moduleResults.push({
      module,
      content: result.text,
      artifact: rel(run.dir, moduleFile),
      prompt: rel(run.dir, promptFile),
      usage: result.usage,
      runnerLog: result.log
    });
  }

  progress?.("Composing design.md");
  const designPrompt = buildDesignPrompt(plan, moduleResults);
  const designPromptFile = path.join(promptsDir, "design.md");
  fs.writeFileSync(designPromptFile, designPrompt, "utf8");
  const designResult = isFake
    ? {
        text: fakeReactDesign(plan, moduleResults, strategy.model),
        usage: { input: estimateTokens(designPrompt), output: 0 }
      }
    : externalCompletion({ paths, run, strategy, task: "design", prompt: designPrompt });
  if (!designResult.ok && !designResult.text) return designResult;
  const design = designResult.text;

  progress?.("Deriving spec.md from design.md");
  const specPrompt = buildSpecPrompt(design);
  const specPromptFile = path.join(promptsDir, "spec.md");
  fs.writeFileSync(specPromptFile, specPrompt, "utf8");
  const specResult = isFake
    ? fakeCompletion({
        task: "spec",
        prompt: specPrompt,
        plan,
        design,
        model: strategy.model
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
      usage: module.usage,
      runnerLog: module.runnerLog
    })),
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
    reason: strategy.generationReason
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

function buildModulePrompt(scan, module) {
  const moduleFiles = scan.includedFiles.filter((file) => module.path === "." || file === module.path || file.startsWith(`${module.path}/`));
  const moduleTree = buildTree(moduleFiles);
  const readmeContext = scan.readmeFiles.map((file) => `--- ${file.path}${file.truncated ? " (truncated)" : ""} ---\n${file.content}`).join("\n\n");
  const docsContext = scan.docsFiles.map((file) => `--- ${file.path}${file.truncated ? " (truncated)" : ""} ---\n${file.content}`).join("\n\n");
  return `You are the MatSpec module documentation runner.
Task: generate an intermediate module design document for later design.md synthesis.

${commonOutputRules()}

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

README context:
${readmeContext || "(none)"}

Docs context:
${docsContext || "(none)"}
`;
}

function buildDesignPrompt(plan, moduleResults) {
  const templates = readFullTemplates();
  return `You are the MatSpec design.md generation runner.
Task: synthesize a project-level implementation design document from module documents.

${commonOutputRules()}

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
`;
}

function buildSpecPrompt(design) {
  const templates = readFullTemplates();
  return `You are the MatSpec spec.md generation runner.
Task: derive the SPEC only from the generated design.md.

${commonOutputRules()}

${specBlackBoxRules()}

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

function fakeReactDesign(plan, moduleResults, model) {
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
