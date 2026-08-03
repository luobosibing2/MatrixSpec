---
matspec:
  stage: validation
  verdict: revise
  blockers:
    - REPLACE_WITH_A_CONCRETE_BLOCKER_OR_EMPTY_THE_LIST
  repairTarget: delta-spec
  reviseStages:
    - delta-spec
---

# [REQ ID] Consistency Validation

> This document checks consistency across proposal, delta-spec, delta-design, and tasks before implementation, using the full documents as the pre-change compatibility baseline.
>
> Delta documents are the source of truth for this change. New requirements being absent from the pre-change full documents is expected and non-blocking; refreshing the full documents belongs to post-implementation done finalization.

## 1. Validation Summary

| Area | Status | Issues | Conclusion |
|------|--------|--------|------------|
| Proposal <-> Delta-Spec | [pass/warn/fail] | [count] | [summary] |
| Delta-Spec <-> Delta-Design | [pass/warn/fail] | [count] | [summary] |
| Delta-Design <-> Tasks | [pass/warn/fail] | [count] | [summary] |
| Delta vs Pre-Change Baseline Compatibility | [pass/warn/fail] | [count] | [real conflicts or regressions only] |
| Post-Implementation Baseline Refresh Plan (Non-Blocking) | [planned/missing] | [count] | [spec.md/design.md done-finalization tasks] |
| Decision Clarification Gate | [pass/warn/fail] | [count] | [unconfirmed decisions] |
| Pre-Implementation Risk Gate | [pass/warn/fail] | [count] | [worktree, tests, migration, compatibility, concurrency] |

**Overall conclusion**: [implementation may start / revise before implementation]

## 1.1 Decision Clarification Gate

| Document | Unconfirmed Decisions | Agent Inferences | Blocking | Notes |
|----------|-----------------------|------------------|----------|-------|
| proposal.md | [count/none] | [count/none] | [yes/no] | [notes] |
| delta-spec.md | [count/none] | [count/none] | [yes/no] | [notes] |
| delta-design.md | [count/none] | [count/none] | [yes/no] | [notes] |
| tasks.md | [count/none] | [count/none] | [yes/no] | [notes] |

> If an unconfirmed decision affects scope, business rules, data model, migration, compatibility, testability, or acceptance criteria, the conclusion must be "revise before implementation".

## 1.2 Pre-Implementation Risk Gate

| Risk Type | Status | Blocking | Notes |
|-----------|--------|----------|-------|
| Unrelated dirty worktree | [pass/warn/fail] | [yes/no] | [notes] |
| Test environment runnable | [pass/warn/fail] | [yes/no] | [notes] |
| Migration and historic data compatibility | [pass/warn/fail] | [yes/no] | [notes] |
| Concurrency and consistency risk | [pass/warn/fail] | [yes/no] | [notes] |
| Scope expansion beyond non-goals | [pass/warn/fail] | [yes/no] | [notes] |

## 2. Proposal <-> Delta-Spec Coverage

| Proposal Item | Delta-Spec Rule | Status | Notes |
|---------------|-----------------|--------|-------|
| [item] | [rule] | [pass/missing/partial] | [notes] |

## 3. Delta-Spec <-> Delta-Design Coverage

| Business Rule | Design Item | Status | Notes |
|---------------|-------------|--------|-------|
| [rule] | [design section] | [pass/missing/partial] | [notes] |

## 4. Delta-Design <-> Tasks Coverage

| Design Item | Task | Status | Notes |
|-------------|------|--------|-------|
| [design item] | [task] | [pass/missing/partial] | [notes] |

## 5. Full Document Compatibility

> Check only whether the delta conflicts with existing constraints or causes an unhandled regression. Do not fail because the full documents do not yet contain the added or modified requirements, and do not require baseline refresh before implementation.

### 5.1 spec.md

| Check | Status | Notes |
|-------|--------|-------|
| Business rule conflict | [pass/fail] | [notes] |
| Data constraint conflict | [pass/fail] | [notes] |
| Terminology conflict | [pass/fail] | [notes] |

### 5.2 design.md

| Check | Status | Notes |
|-------|--------|-------|
| Architecture conflict | [pass/fail] | [notes] |
| Interface compatibility conflict | [pass/fail] | [notes] |
| Data model conflict | [pass/fail] | [notes] |

## 6. Missing Coverage

| Type | Covered | Notes |
|------|---------|-------|
| Error scenarios | [yes/no/partial] | [notes] |
| Boundary conditions | [yes/no/partial] | [notes] |
| DFX constraints | [yes/no/partial] | [notes] |
| Tests and verification | [yes/no/partial] | [notes] |
| Post-implementation done-stage spec.md refresh task | [yes/no/partial] | [add to tasks if missing; never require an early baseline refresh] |
| Post-implementation done-stage design.md refresh task | [yes/no/partial] | [add to tasks if missing; never require an early baseline refresh] |

## 7. Issues and Fixes

### 7.1 Must Fix

- [Issue]: [fix]

> Valid blockers are limited to an inconsistent delta chain, missing requirement/design/task coverage, unconfirmed key decisions, non-executable verification, or a real conflict/regression against the baseline. "The baseline does not yet contain the delta" is not a valid blocker.

### 7.2 Should Fix

- [Issue]: [fix]

## 8. Final Conclusion

- **Implementation may start**: [yes/no]
- **Blocking issues**: [none/list]
- **Repair target stage**: [none, or proposal/delta-spec/delta-design/tasks]
- **Validator role**: [name or role]
- **Validation date**: [YYYY-MM-DD]
