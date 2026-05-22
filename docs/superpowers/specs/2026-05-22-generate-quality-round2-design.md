# Generate Quality Round 2 Design

## Goal

Improve `matspec generate` document quality after the `mind-cluster` comparison. The next generated output should move from repository-level design notes toward component-level engineering documentation, while preserving the current local CLI runner architecture.

## Non-Goals

- Do not add OpenAI, Anthropic, or other LLM API providers.
- Do not replace Codex CLI / Claude Code CLI / opencode CLI generation.
- Do not make `matspec generate` write accepted `matspec/specs` documents directly.
- Do not build a full benchmark harness in this change.

## Weaknesses To Address

The comparison found that MatrixSpec now gives a usable high-level baseline, but still trails CodeWiki community in four areas:

1. Module planning is too conservative. `mind-cluster` generated a single `Project Root` module even though real code lives under `component/*`.
2. Prompts ask for design/spec structure but do not strongly require developer-operational content: build commands, validation commands, failure modes, and troubleshooting paths.
3. Source evidence is present as paths, but the output does not consistently name the important files, symbols, and line-level anchors that make claims easy to verify.
4. README/docs/build scripts are available to the prompt, but there is no dedicated runbook/debug evidence summary that tells the runner what operational inputs to use.

## Design

### 1. Component-Aware Planning

Extend the deterministic planner to recognize component-style repositories. When source-heavy directories exist under roots such as `component/`, `components/`, `services/`, `plugins/`, `modules/`, `cmd/`, or `tools/`, the planner should create modules from their direct children.

The planner should rank candidates by source file count and line count, keep a bounded number of modules, and avoid test/demo/example directories. For `mind-cluster`, this should produce modules such as `component/ascend-common`, `component/ascend-device-plugin`, and `component/ascend-for-volcano` instead of falling back to `Project Root`.

### 2. Operational Evidence Summary

Extend scanning with a small structured operational summary:

- build scripts: files under `build/`, shell scripts containing build-like names, Makefiles, Dockerfiles
- config and deployment files: YAML, INI, TOML, Docker-related files, service configs
- troubleshooting/docs: README and docs snippets already collected, plus filenames that suggest troubleshooting, deployment, install, build, or debug

The summary must be bounded and text-only so large repositories do not flood prompts.

### 3. Prompt Quality Upgrade

Update direct and module-first prompts to ask for:

- component entrypoints and responsibilities
- key source anchors: file path, symbol/function/class name when visible, and why it matters
- developer runbook: build, validate, deploy, rollback, and troubleshooting paths when evidence exists
- certainty boundaries: distinguish source-confirmed facts from inferred behavior
- module-level debugging guidance: symptom, likely source area, verification command or file to inspect

This should apply to both whole-project design prompts and react/module prompts.

### 4. Testing Strategy

Add tests before implementation:

- Planner should discover component child modules in a synthetic `component/*` repository.
- Planner should rank and bound component modules so large repos do not explode into every component.
- Scanner should return operational evidence from build scripts, config files, and docs.
- Generated prompts should include operational evidence and explicit runbook/debug/source-anchor requirements.

## Acceptance Criteria

- `mind-cluster`-style repositories no longer plan only `Project Root` when source-heavy `component/*` children exist.
- Prompts include operational evidence and instructions for runbook/debug sections.
- Existing local runner behavior remains intact.
- `npm test` passes.
