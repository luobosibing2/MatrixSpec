import fs from "node:fs";
import path from "node:path";

export function resolveGenerationStrategy(paths, options = {}, env = process.env, context = {}) {
  const runner = normalizeProvider(options.runner || readConfigDefaultRunner(paths) || "auto");
  const requestedMode = normalizeProvider(options.mode || env.MATSPEC_GENERATION_MODE || "auto");
  if (!["auto", "direct", "react"].includes(requestedMode)) {
    return {
      ok: false,
      code: "MODE_NOT_IMPLEMENTED",
      mode: requestedMode,
      message: `Mode is not implemented: ${requestedMode}. Use auto, direct, or react.`,
      next: ["matspec generate --mode auto"]
    };
  }

  if (runner === "opencode") {
    return {
      ok: false,
      code: "RUNNER_NOT_IMPLEMENTED",
      runner,
      message: "The opencode runner is not implemented yet.",
      next: ["matspec generate --runner auto", "matspec generate --runner codex", "matspec generate --runner claude"]
    };
  }
  if (!["auto", "codex", "claude"].includes(runner)) {
    return {
      ok: false,
      code: "RUNNER_NOT_IMPLEMENTED",
      runner,
      message: `Runner is not implemented: ${runner}.`,
      next: ["matspec generate --runner auto"]
    };
  }

  const provider = normalizeProvider(env.MATSPEC_LLM_PROVIDER || env.LLM_PROVIDER || readConfigProvider(paths));
  if (provider === "fake") {
    const selection = selectGenerationMode({ requestedMode });
    return {
      ok: true,
      generationMode: selection.generationMode,
      generationReason: selection.reason,
      runner: "auto",
      provider: "fake",
      model: options.model || env.MATSPEC_LLM_MODEL || env.LLM_MODEL || "fake-matspec-model"
    };
  }

  if (["openai", "anthropic"].includes(provider)) {
    const apiKey = env.MATSPEC_LLM_API_KEY || env.LLM_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        code: "LLM_NOT_CONFIGURED",
        provider,
        message: `Missing ${provider} LLM configuration. Set MATSPEC_LLM_API_KEY or use MATSPEC_LLM_PROVIDER=fake.`,
        next: ["unset MATSPEC_LLM_PROVIDER", "matspec generate --runner auto"]
      };
    }
  }

  if (provider && provider !== "stub") {
    return {
      ok: false,
      code: "LLM_PROVIDER_NOT_IMPLEMENTED",
      provider,
      message: `LLM provider is not implemented: ${provider}.`,
      next: ["unset MATSPEC_LLM_PROVIDER", "matspec generate --runner auto"]
    };
  }

  const selected = selectRunner(runner, env);
  if (!selected.ok) return selected;
  if (selected.runner === "stub") {
    return {
      ok: true,
      generationMode: "stub",
      generationReason: "no_local_runner",
      runner: "auto",
      provider: null,
      model: options.model || null
    };
  }

  const selection = selectGenerationMode({ requestedMode });
  return {
    ok: true,
    generationMode: selection.generationMode,
    generationReason: selection.reason,
    runner: selected.runner,
    provider: selected.runner,
    model: options.model || defaultExternalModel(selected.runner),
    fallbackModel: options.model ? null : fallbackExternalModel(selected.runner),
    executable: selected.executable
  };
}

function selectGenerationMode({ requestedMode }) {
  if (requestedMode === "direct") return { generationMode: "direct", reason: "forced_whole_project_direct" };
  if (requestedMode === "react") return { generationMode: "react", reason: "forced_module_first" };
  return { generationMode: "react", reason: "module_first_pipeline" };
}

function defaultExternalModel(runner) {
  if (runner === "codex") return "gpt-5.3-codex-spark";
  if (runner === "claude") return "claude-sonnet-4-6";
  return null;
}

function fallbackExternalModel(runner) {
  if (runner === "codex") return "gpt-5.5";
  return null;
}

function selectRunner(requestedRunner, env) {
  if (requestedRunner === "auto") {
    for (const candidate of ["codex", "claude"]) {
      const executable = findExecutable(candidate, env);
      if (executable) return { ok: true, runner: candidate, executable };
    }
    return { ok: true, runner: "stub" };
  }

  const executable = findExecutable(requestedRunner, env);
  if (!executable) {
    return {
      ok: false,
      code: "RUNNER_NOT_FOUND",
      runner: requestedRunner,
      message: `${requestedRunner} was not found. Install and authenticate the CLI, or use matspec generate --runner auto.`,
      next: ["matspec generate --runner auto", `Confirm ${requestedRunner} is installed and authenticated`]
    };
  }
  return { ok: true, runner: requestedRunner, executable };
}

function findExecutable(command, env = process.env) {
  const extensions = process.platform === "win32" ? [".cmd", ".exe", ".bat", ".com", ".ps1", ""] : [""];
  for (const dir of (env.PATH || env.Path || env.path || "").split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(dir, `${command}${extension}`);
      if (isFile(candidate)) return candidate;
    }
  }
  return null;
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

export function fakeCompletion({ task, prompt, plan, design, model }) {
  if (task === "module") {
    return {
      text: `# Module Design: ${plan.name}

<!-- generated by matspec fake react -->

Path: ${plan.path}

## 1. Module Purpose

Fake react module document for ${plan.path}.

## 2. Core Flow

This module document is generated before project-level design synthesis.
`,
      usage: { input: estimateTokens(prompt), output: 0 }
    };
  }

  if (task === "design") {
    const modules = plan.modules
      .map((module) => `- ${module.name}: ${module.path} - ${module.description}`)
      .join("\n");
    return {
      text: `# MatSpec Implementation Design

<!-- generated by matspec fake direct -->

Provider: fake
Model: ${model}

## 1. Design Overview

### 1.1 Design Goals

Fake direct design generated from scan and plan.

Project: ${plan.projectName}
Language: ${plan.language || "unknown"}
Primary extension: ${plan.primaryExtension || "unknown"}

### 1.2 Design Constraints

Candidate documents must be written to a run directory before apply.

## 2. System Architecture

### 2.1 Architecture Overview

Fake provider uses a deterministic local implementation.

### 2.2 Module Responsibilities

${modules}

### 2.3 Technology Stack

CLI: Node.js ESM.

## 3. Data Model

Run manifest records generated artifacts and status.

## 4. Interface Design

User entry points are matspec generate, matspec show, and matspec apply.

## 5. Core Flow Design

The direct generator first scans the repository, then plans modules, then produces this design artifact.

## 6. Algorithm Design

No complex algorithm is required.

## 7. Caching Design

No explicit cache is used.

## 8. Error Handling Design

Fake provider does not call a network API.

## 9. Observability

Generation artifacts remain isolated under .matspec-cli/runs before apply.

## 10. Security Design

This is deterministic fake direct output for tests.
`,
      usage: { input: estimateTokens(prompt), output: 0 }
    };
  }

  return {
    text: `# MatSpec SPEC

<!-- generated by matspec fake direct -->

Derived from design.
Provider: fake
Model: ${model}

## 1. Component Purpose

This fake spec is derived from the generated design document, not directly from repository source files.

## 2. Domain Terminology

- Design-derived specification: a SPEC artifact generated after design.md exists.

## 3. Actors and Boundaries

MatSpec CLI owns artifact writing and apply protection.

## 4. DFX Constraints

Generated documents are staged in a run directory before apply.

## 5. Core Capabilities

- Produce spec.md only after design.md generation.
- Preserve apply overwrite protection.
- Derived from design marker is retained for tests.

## 6. Data Constraints

- Candidate documents must include spec.md and design.md.
- apply must not overwrite existing authoritative documents by default.

Design summary:
${design.split(/\r?\n/).slice(0, 8).join("\n")}
`,
    usage: { input: estimateTokens(prompt), output: 0 }
  };
}

function normalizeProvider(provider) {
  return String(provider || "").trim().toLowerCase();
}

function readConfigProvider(paths) {
  const file = path.join(paths.runtime, "config.yaml");
  if (!fs.existsSync(file)) return "";
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line === "generation:");
  if (start === -1) return "";
  const generation = [];
  for (const line of lines.slice(start + 1)) {
    if (line && !line.startsWith(" ")) break;
    generation.push(line);
  }
  return generation.join("\n").match(/^  provider:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1] || "";
}

function readConfigDefaultRunner(paths) {
  const file = path.join(paths.runtime, "config.yaml");
  if (!fs.existsSync(file)) return "";
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line === "generation:");
  if (start === -1) return "";
  const generation = [];
  for (const line of lines.slice(start + 1)) {
    if (line && !line.startsWith(" ")) break;
    generation.push(line);
  }
  return generation.join("\n").match(/^  defaultRunner:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1] || "";
}

function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}
