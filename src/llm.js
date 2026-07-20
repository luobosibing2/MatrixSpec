import fs from "node:fs";
import path from "node:path";
import { isZh } from "./i18n.js";

export function resolveGenerationStrategy(paths, options = {}, env = process.env, context = {}) {
  const runner = normalizeProvider(options.runner || readConfigDefaultRunner(paths) || "opencode");
  const rawMode = normalizeProvider(options.mode || env.MATSPEC_GENERATION_MODE || "module-first");
  const requestedMode = rawMode === "module-first" ? "auto" : rawMode;
  if (!["auto", "direct", "react"].includes(requestedMode)) {
    return {
      ok: false,
      code: "MODE_NOT_IMPLEMENTED",
      mode: requestedMode,
      message: `Mode is not implemented: ${requestedMode}. Use auto, direct, or react.`,
      next: ["matspec generate --mode auto"]
    };
  }

  if (!["auto", "opencode", "opencode-serve", "relay-serve", "relay-pool", "nga", "codegenie", "codeagent", "chrys", "codex", "claude"].includes(runner)) {
    return {
      ok: false,
      code: "RUNNER_NOT_IMPLEMENTED",
      runner,
      message: `Runner is not implemented: ${runner}.`,
      next: ["matspec generate --runner opencode"]
    };
  }

  const provider = normalizeProvider(env.MATSPEC_LLM_PROVIDER || env.LLM_PROVIDER || readConfigProvider(paths));
  if (provider === "fake") {
    const selection = selectGenerationMode({ requestedMode });
    return {
      ok: true,
      generationMode: selection.generationMode,
      generationReason: selection.reason,
      runner,
      provider: "fake",
      model: options.model || env.MATSPEC_LLM_MODEL || env.LLM_MODEL || "fake-matspec-model"
    };
  }

  if (provider && provider !== "stub") {
    return {
      ok: false,
      code: "LLM_PROVIDER_NOT_IMPLEMENTED",
      provider,
      message: `LLM provider is not supported: ${provider}. MatSpec generation uses local Codex, Claude Code, or opencode CLI runners.`,
      next: ["unset MATSPEC_LLM_PROVIDER", "matspec generate --runner opencode"]
    };
  }

  const selected = selectRunner(runner, env);
  if (!selected.ok) return selected;
  const selection = selectGenerationMode({ requestedMode });
  return {
    ok: true,
    generationMode: selection.generationMode,
    generationReason: selection.reason,
    runner: selected.runner,
    provider: selected.runner,
    model: options.model || defaultExternalModel(selected.runner),
    fallbackModel: options.model ? null : fallbackExternalModel(selected.runner),
    executable: selected.executable,
    serveUrl: options.serve_url || null,
    agent: options.agent || null
  };
}

function selectGenerationMode({ requestedMode }) {
  if (requestedMode === "direct") return { generationMode: "direct", reason: "forced_whole_project_direct" };
  if (requestedMode === "react") return { generationMode: "react", reason: "forced_module_first" };
  return { generationMode: "react", reason: "module_first_pipeline" };
}

function defaultExternalModel(runner) {
  if (runner === "codex") return "gpt-5.5";
  if (runner === "claude") return "claude-sonnet-4-6";
  return null;
}

function fallbackExternalModel(runner) {
  return null;
}

function selectRunner(requestedRunner, env) {
  if (requestedRunner === "auto") {
    for (const candidate of ["opencode", "nga", "codegenie", "codeagent", "chrys", "codex", "claude"]) {
      const executable = findExecutable(candidate, env);
      if (executable) return { ok: true, runner: candidate, executable };
    }
    return {
      ok: false,
      code: "RUNNER_NOT_FOUND",
      runner: "auto",
      message: "No supported MatSpec runner was found.",
      next: ["Install and authenticate opencode, nga, codegenie, codeagent, or chrys"]
    };
  }
  if (["opencode-serve", "relay-serve", "relay-pool"].includes(requestedRunner)) {
    return { ok: true, runner: requestedRunner, executable: process.execPath };
  }
  const executable = findExecutable(requestedRunner, env);
  if (!executable) {
    return {
      ok: false,
      code: "RUNNER_NOT_FOUND",
      runner: requestedRunner,
      message: `${requestedRunner} was not found. Install and authenticate the CLI, or use matspec generate --runner auto.`,
      next: [`Confirm ${requestedRunner} is installed and authenticated`]
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

export function fakeCompletion({ task, prompt, plan, design, model, options = {} }) {
  if (task === "module") {
    if (isZh(options)) {
      return {
        text: `# 模块设计：${plan.name}

<!-- generated by matspec fake react -->

路径：${plan.path}

## 1. 模块定位

${plan.path} 的 fake react 模块文档。

## 2. 核心流程

该模块文档在项目级 design 合成前生成。
`,
        usage: { input: estimateTokens(prompt), output: 0 }
      };
    }
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
    if (isZh(options)) {
      return {
        text: `# MatSpec 实现设计

<!-- generated by matspec fake direct -->

Provider: fake
Model: ${model}

## 1. 设计概述

### 1.1 设计目标

根据扫描和模块规划生成 fake direct 设计。

Project: ${plan.projectName}
Language: ${plan.language || "unknown"}
Primary extension: ${plan.primaryExtension || "unknown"}

### 1.2 设计约束

候选文档必须先写入 run 目录，再由 apply 发布。

## 2. 系统架构

### 2.1 架构概述

fake provider 使用确定性的本地实现。

### 2.2 模块职责

${modules}

### 2.3 技术栈

CLI: Node.js ESM。

## 3. 数据模型

run manifest 记录生成产物和状态。

## 4. 接口设计

用户入口包括 matspec generate、matspec show 和 matspec apply。

## 5. 核心流程设计

direct generator 先扫描仓库，再规划模块，然后生成该 design 产物。

## 6. 算法设计

不需要复杂算法。

## 7. 缓存设计

未使用显式缓存。

## 8. 异常处理设计

fake provider 不调用网络 API。

## 9. 监控与日志

生成产物在 apply 前隔离保存在 .matspec-cli/runs 下。

## 10. 安全设计

这是用于测试的 deterministic fake direct 输出。
`,
        usage: { input: estimateTokens(prompt), output: 0 }
      };
    }
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

  if (isZh(options)) {
    return {
      text: `# MatSpec 规格说明

<!-- generated by matspec fake direct -->

Derived from design.
Provider: fake
Model: ${model}

## 1. 组件定位

该 fake spec 从生成的 design 文档推导，不直接读取仓库源码。

## 2. 领域术语

- 设计推导规格：design.md 已存在后生成的 SPEC 产物。

## 3. 角色与边界

MatSpec CLI 负责产物写入和 apply 保护。

## 4. DFX 约束

生成文档在 apply 前暂存于 run 目录。

## 5. 核心能力

- 只在 design.md 生成后产出 spec.md。
- 保留 apply 覆盖保护。
- 保留 Derived from design 标记供测试使用。

## 6. 数据约束

- 候选文档必须包含 spec.md 和 design.md。
- 默认情况下，apply 不得覆盖已有权威文档。

Design summary:
${design.split(/\r?\n/).slice(0, 8).join("\n")}
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
  return generation.join("\n").match(/^  (?:runner|defaultRunner):\s*["']?([^"'\s]+)["']?\s*$/m)?.[1] || "";
}

function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}
