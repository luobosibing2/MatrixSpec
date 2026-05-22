# [REQ ID] Spec Delta

> This document describes incremental changes to spec.md. Use the exact top-level headings ADDED / MODIFIED / REMOVED.

## 0. User Clarification Log

### 0.1 Confirmed Rule Decisions

- [Rule decision 1: from proposal.md, user confirmation, existing spec.md, or repository facts]
- [Rule decision 2: from proposal.md, user confirmation, existing spec.md, or repository facts]

### 0.2 Open Questions

- [ ] [Question 1: affects business rules or acceptance criteria]
- [ ] [Question 2: write "None" when there are no open questions]

### 0.3 Decision Ledger

| Decision | Source | Status | Business / Acceptance Impact |
|----------|--------|--------|------------------------------|
| [Key decision 1] | [proposal.md/user/spec/code fact/agent inference] | [confirmed/needs-confirmation] | [impact] |
| [Key decision 2] | [source] | [status] | [impact] |

> If an unconfirmed decision changes business rules, acceptance criteria, exception paths, data constraints, or non-goal boundaries, do not continue to later stages.

## ADDED Requirements

> New business rules and capabilities. Write `None` if there are no added requirements.

### 5.X [New Capability Name]

#### 5.X.1 Business Rules

1. **Rule name**: [Detailed rule using must / must not / should.]
   - **Acceptance criteria**: [Trigger] -> [Expected behavior]
   - **Acceptance criteria**: [Trigger] -> [Expected behavior]

#### 5.X.2 Interaction Flow

[Describe the externally visible workflow.]

#### 5.X.3 Exception Scenarios

1. **Scenario: [name]**
   - **Trigger**: [condition]
   - **System behavior**: [behavior]
   - **User-visible result**: [message, status, or outcome]

## MODIFIED Requirements

> Existing business rules to modify. Write the full updated rule, not only the diff. Write `None` if there are no modified requirements.

### 5.Y [Existing Capability Name]

1. **Rule name**: [Updated complete rule.]
   - **Was**: [previous behavior if relevant]
   - **Acceptance criteria**: [Trigger] -> [Expected behavior]

## REMOVED Requirements

> Removed business rules or capabilities. Write `None` if there are no removed requirements.

### [Removed Capability or Rule]

- **Reason**: [why removal is acceptable]
- **Compatibility impact**: [users, APIs, data, or workflows affected]
- **Migration note**: [if required]
