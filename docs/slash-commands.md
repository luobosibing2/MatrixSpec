# Agent Commands

MatSpec can install repository-level instructions for Codex, Claude Code, and opencode.

```bash
matspec init --integration codex
matspec init --integration claude
matspec init --integration opencode
```

The installed command teaches the agent to:

1. Read `matspec/specs/spec.md` and `matspec/specs/design.md`.
2. Keep one active change under `matspec/changes/<REQ>/`.
3. Clarify first when the requirement is ambiguous.
4. Generate exactly one stage artifact at a time.
5. Ask for user confirmation before advancing stages.
6. Treat validation as permission to implement, not permission to archive.
7. Treat `matspec generate && matspec apply` as baseline recovery, not accepted-change evolution.
8. After implementation and verification, perform done finalization by updating `matspec/specs/spec.md` and `matspec/specs/design.md` before calling `matspec done`.

## Language

The default CLI, agent instruction surface, and generated artifacts are Chinese. Use `--lang en` or `MATSPEC_LANG=en` for English CLI output and English generated artifacts.
