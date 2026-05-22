# [REQ ID] Requirement Clarification

## 0. User Clarification Log

### 0.1 Confirmed Decisions

- [Decision 1: confirmed by the user, existing spec/design, or repository facts]
- [Decision 2: confirmed by the user, existing spec/design, or repository facts]

### 0.2 Open Questions

- [ ] [Question 1: must be answered before later stages]
- [ ] [Question 2: write "None" when there are no open questions]

### 0.3 Decision Ledger

| Decision | Source | Status | Impact |
|----------|--------|--------|--------|
| [Key decision 1] | [user/spec/design/code fact/agent inference] | [confirmed/needs-confirmation] | [scope, acceptance, or implementation impact] |
| [Key decision 2] | [source] | [status] | [impact] |

> Any agent inference that affects business scope, data model, migration, compatibility, permissions, testability, or acceptance criteria must be confirmed before the next stage.

## 1. Requested Change vs Real Need

### 1.1 Requested Change

[Restate what the user asked for in their own terms.]

### 1.2 Real Need

[Describe the pain, workflow failure, business goal, or operational issue the requested change is meant to solve.]

### 1.3 Solution-vs-Problem Check

- **Surface request**: [feature/UI/API/configuration/performance request]
- **Confirmed real problem**: [yes/no; if no, list the blocking question]

## 2. Problem Statement

[State the problem in observable terms. Avoid vague words such as improve, optimize, flexible, simple, smart, support, or better unless the expected outcome is measurable.]

## 3. User, Actor, and Scenario

| Item | Description |
|------|-------------|
| Primary actor | [Who experiences the problem or uses the capability] |
| Scenario | [When and why the actor needs the change] |
| Current behavior | [Relevant existing behavior to preserve or modify] |
| Desired outcome | [Observable end state] |

## 4. Success Criteria

- [ ] [Criterion 1: observable and testable]
- [ ] [Criterion 2: observable and testable]

## 5. Scope Boundary

### 5.1 In Scope

- [Required behavior or capability]

### 5.2 Existing Behavior to Preserve

- [Compatibility rule, existing workflow, API behavior, data behavior, or user-facing behavior]

### 5.3 Input and Interaction Semantics

For new search, filter, sort, form input, API parameter, or configuration changes, record:

- **Combination with existing inputs**: [AND / OR / priority / mutual exclusion / not applicable]
- **Empty value behavior**: [preserve existing behavior or define new behavior]
- **No-result behavior**: [preserve existing behavior or define new behavior]
- **Match semantics**: [exact / partial / fuzzy / range / not applicable]
- **Format normalization**: [case, whitespace, punctuation, locale, units, or not applicable]
- **Compatibility**: [existing users, links, APIs, data, or workflows that must not change]

## 6. Non-Goals

- [Explicitly excluded capability]
- [Deferred capability]

## 7. Confirmed Decisions

| Decision | Confirmed By | Notes |
|----------|--------------|-------|
| [Decision] | [user/spec/design/code fact] | [Notes] |

## 8. Assumptions and Open Questions

### 8.1 Assumptions

- [Assumption and why it is safe, or write "None"]

### 8.2 Open Questions

- [ ] [Question that would affect spec, design, implementation boundaries, or acceptance, or write "None"]

## 9. Impact Preview

| Area | Expected Impact | Notes |
|------|-----------------|-------|
| Spec behavior | [added/modified/removed/none] | [Notes] |
| Design areas | [UI/API/data/model/workflow/none] | [Notes] |
| DFX constraints | [performance/reliability/security/compatibility/none] | [Notes] |
| Breaking changes | [yes/no/unknown] | [Impact and migration note] |
