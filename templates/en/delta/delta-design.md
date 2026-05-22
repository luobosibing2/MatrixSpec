# [REQ ID] Design Delta

> This document describes incremental changes to design.md and must carry forward the accepted spec delta.

## 0. User Clarification Log

### 0.1 Confirmed Design Decisions

- [Design decision 1: from delta-spec.md, user confirmation, existing design.md, or repository facts]
- [Design decision 2: from delta-spec.md, user confirmation, existing design.md, or repository facts]

### 0.2 Open Questions

- [ ] [Question 1: affects interfaces, data, workflow, compatibility, or risk control]
- [ ] [Question 2: write "None" when there are no open questions]

### 0.3 Decision Ledger

| Decision | Source | Status | Design / Implementation Impact |
|----------|--------|--------|--------------------------------|
| [Key decision 1] | [delta-spec.md/user/design/code fact/agent inference] | [confirmed/needs-confirmation] | [impact] |
| [Key decision 2] | [source] | [status] | [impact] |

> If an unconfirmed decision changes architecture, interface contracts, data model, migration, compatibility, or verification strategy, do not continue to tasks.

## 1. Design Context

### 1.1 Design Goals

[Describe the technical goals for this change.]

### 1.2 Design Constraints

1. [Constraint 1]
2. [Constraint 2]

### 1.3 Non-Goals

- [Explicitly out of scope]
- [Deferred future work]

## 2. Design Decisions

### 2.1 [Decision Area]

**Decision**: [State the chosen design.]

**Context**: [Explain why the decision is needed.]

**Alternatives**

| Option | Pros | Cons |
|--------|------|------|
| Option A (chosen) | [pros] | [cons] |
| Option B | [pros] | [cons] |

**Rationale**

- [Reason 1]
- [Reason 2]

## 3. Data Model Changes

[Describe entity, schema, migration, compatibility, or data-quality changes. Write `None` if not applicable.]

## 4. Interface Changes

[Describe APIs, commands, UI entry points, validation, errors, or compatibility behavior. Write `None` if not applicable.]

## 5. Core Flow Changes

[Describe changed execution flows, key branches, and exception paths.]

## 6. DFX and Risk Controls

| Area | Design Response |
|------|-----------------|
| Performance | [response] |
| Reliability | [response] |
| Security | [response] |
| Compatibility | [response] |
| Observability | [response] |

## 7. Verification Strategy

- [Unit test or focused verification]
- [Integration or E2E verification]
- [Manual check if required]

## 8. Release and Migration Impact

- **Breaking change**: [yes/no]
- **Migration required**: [yes/no and details]
- **Rollback note**: [if applicable]
