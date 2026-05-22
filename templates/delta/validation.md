# [REQ ID] Consistency Validation

> This document checks coverage and conflicts across proposal, delta-spec, delta-design, tasks, and the full documents before implementation.

## 1. Validation Summary

| Area | Status | Issues | Conclusion |
|------|--------|--------|------------|
| Proposal <-> Delta-Spec | [pass/warn/fail] | [count] | [summary] |
| Delta-Spec <-> Delta-Design | [pass/warn/fail] | [count] | [summary] |
| Delta-Design <-> Tasks | [pass/warn/fail] | [count] | [summary] |
| Delta <-> Full Documents | [pass/warn/fail] | [count] | [summary] |
| Planned Done Finalization | [pass/warn/fail] | [count] | [spec.md/design.md refresh tasks] |
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
| Done-stage spec.md refresh task | [yes/no/partial] | [notes] |
| Done-stage design.md refresh task | [yes/no/partial] | [notes] |

## 7. Issues and Fixes

### 7.1 Must Fix

- [Issue]: [fix]

### 7.2 Should Fix

- [Issue]: [fix]

## 8. Final Conclusion

- **Implementation may start**: [yes/no]
- **Blocking issues**: [none/list]
- **Validator role**: [name or role]
- **Validation date**: [YYYY-MM-DD]
