# MatSpec SDD Optimization and E2E Experiment Design

## Purpose

This document defines how to strengthen MatSpec as a spec-driven development
methodology without changing the existing workflow stages or output artifacts.

The current artifact chain remains:

```text
proposal.md
-> delta-spec.md
-> delta-design.md
-> tasks.md
-> validation.md
```

The optimization is semantic, not structural: each artifact should reduce a
different category of delivery risk.

## First Principles

Spec-driven development is not primarily about producing more documents. It is
about controlling when the team commits to a problem, behavior, solution, and
implementation.

Premature commitment creates four recurring failures:

1. The user states a solution, and the agent implements it without discovering
   the real problem.
2. The boundary is unclear, so the change expands while still looking
   "specified".
3. The implementation approach is chosen before the required behavior is
   precise.
4. The implementation passes tests but diverges from the accepted spec.

MatSpec should treat every stage as a risk-reduction gate:

```text
proposal      reduces requirement misunderstanding risk
delta-spec    reduces ambiguous behavior risk
delta-design  reduces premature or wrong solution risk
tasks         reduces execution drift risk
validation    reduces premature implementation risk
```

Superpowers is a useful reference because it is stronger at early discovery,
brainstorming, and implementation discipline. It should not be copied directly.
MatSpec's advantage is the baseline-first brownfield model and CLI-owned state
machine. The goal is to combine MatSpec's state discipline with stronger
discovery, tradeoff, and readiness semantics.

## Optimized Stage Semantics

### 1. proposal.md: Discover the Real Need and Boundary

The proposal stage should no longer be treated as a change request form. It is
the discovery stage for the real requirement.

It must answer:

- What did the user originally ask for?
- Is the user's request a real problem or a proposed solution?
- What pain, workflow failure, business goal, or operational issue motivates
  the request?
- Who is affected?
- What observable outcome means the problem is solved?
- What is explicitly in scope?
- What is explicitly out of scope?
- Which decisions were confirmed by the user?
- Which decisions were inferred by the agent?
- Which open questions would affect spec or design if left unanswered?

Required strengthening:

```text
## 0. User Clarification Log
## 1. Requested Change vs Real Need
## 2. Problem Statement
## 3. User, Actor, and Scenario
## 4. Success Criteria
## 5. Scope Boundary
## 6. Non-Goals
## 7. Confirmed Decisions
## 8. Assumptions and Open Questions
## 9. Impact Preview
```

The most important addition is "Requested Change vs Real Need". The agent must
not blindly accept surface-level requests such as "add a button", "support
configuration", "make search faster", or "optimize validation". It must ask what
problem the requested solution is meant to solve.

Proposal gate:

```text
The user can confirm:
1. This is the real problem.
2. These are the correct boundaries.
3. These are the correct non-goals.
4. No unconfirmed assumption affects the next stage.
```

Forbidden in proposal.md:

- Technical implementation choices.
- Committing to detailed behavior before the real need is confirmed.
- Treating an agent inference as a user-confirmed requirement.
- Using vague words such as improve, optimize, flexible, simple, smart, support,
  or better without making them observable.

### 2. delta-spec.md: Define Verifiable Behavior

The spec stage should define the observable business behavior delta. It should
not describe architecture, files, services, APIs, database schema, or
implementation approach unless those are part of the externally visible
contract.

It must answer:

- What capability is added, modified, or removed?
- What triggers the behavior?
- What inputs, outputs, and state changes are expected?
- What are the normal paths?
- What are the exceptional paths?
- What are the boundary conditions?
- What permissions, data constraints, compatibility rules, or DFX requirements
  apply?
- How can each behavior be accepted?
- What behavior is explicitly prohibited?

Each requirement should include:

```text
- Requirement ID
- Source proposal item
- Behavior statement
- Trigger
- Input
- Output
- State change
- Normal path
- Exceptional path
- Boundary conditions
- Permissions and data constraints
- Acceptance criteria
- Prohibited behavior
```

Existing top-level headings should remain:

```text
## ADDED Requirements
## MODIFIED Requirements
## REMOVED Requirements
```

Spec gate:

```text
1. Every requirement is verifiable.
2. Every success criterion from proposal.md maps to one or more requirements.
3. Normal, exceptional, and boundary paths are covered where relevant.
4. No implementation detail is introduced.
5. No unconfirmed new requirement is introduced.
```

The key quality test is simple: if the agent cannot explain how a requirement
will be tested or manually accepted, it is not yet a spec.

### 3. delta-design.md: Compare Options and Choose Deliberately

The design stage should not begin by describing the implementation. It should
first explore the solution space, then make a defensible choice.

It must answer:

- What constraints from delta-spec.md shape the design?
- What are at least two plausible implementation options?
- What are the tradeoffs between those options?
- Which option is recommended and why?
- Which options are rejected and why?
- What final design decisions follow from the chosen option?
- What compatibility, migration, rollback, testing, and operational risks exist?

Required strengthening:

```text
## 1. Design Goal
## 2. Constraints from Spec
## 3. Option A: Minimal Change
## 4. Option B: Cleaner Architecture
## 5. Option C: Long-Term Extensible Approach
## 6. Tradeoff Matrix
## 7. Recommended Option
## 8. Rejected Options and Reasons
## 9. Final Design
## 10. Risks and Mitigations
## 11. Compatibility, Migration, and Rollback
## 12. Test Design Impact
```

Option C is optional for small changes, but at least two real options are
required. The options must not be fake variations of the same approach.

Tradeoff matrix:

```text
| Option | Scope Fit | Complexity | Risk | Testability | Compatibility | Future Cost | Recommendation |
|--------|-----------|------------|------|-------------|---------------|-------------|----------------|
```

Design gate:

```text
1. At least two realistic options were compared.
2. The recommended option has explicit reasoning.
3. Rejected options have explicit reasoning.
4. The final design covers every relevant delta-spec requirement.
5. The design does not add unconfirmed scope.
6. Risk, compatibility, migration, rollback, and test impact are addressed.
```

This is the most important change for raising MatSpec's SDD quality. A design
document that does not show alternatives is usually an implementation plan in
disguise.

### 4. tasks.md: Create a Traceable Execution Plan

The task stage should not be a generic checklist. It should be a traceability
plan from problem to behavior to design to implementation evidence.

Each task should map:

```text
proposal need -> spec requirement -> design decision -> files/modules -> tests -> verification
```

Recommended task format:

```text
### Task N: [behavior or capability name]

Spec Coverage:
- REQ-001
- REQ-002

Design Decision:
- DD-003

Files:
- Modify: src/...
- Test: test/...

Steps:
- [ ] Write failing test for ...
- [ ] Run command ... and confirm failure because ...
- [ ] Implement minimal change ...
- [ ] Run command ... and confirm pass.
- [ ] Run affected regression tests.
- [ ] Update docs or spec merge notes if needed.

Verification:
- Command:
- Expected result:
```

Tasks should prefer vertical slices over technical-layer batches. A vertical
slice proves one user-observable behavior. A technical-layer task often creates
intermediate work that cannot be validated until much later.

Task gate:

```text
1. Every delta-spec requirement is covered by one or more tasks.
2. Every task has a clear verification method.
3. Every task has a clear file or module boundary.
4. No task exists only because it is "nice to have".
5. No task contains vague instructions such as "implement related logic".
6. The order supports small-step verification.
```

### 5. validation.md: Perform Readiness Review

The validation stage should not be only a consistency check. It should answer:

```text
Is it safe to start implementation now?
```

It should validate the document chain and the implementation readiness.

Required strengthening:

```text
## 1. Requirement Readiness
- Is the real need confirmed?
- Are boundaries and non-goals confirmed?
- Are there unresolved assumptions that affect scope?

## 2. Spec Readiness
- Is every requirement verifiable?
- Are vague terms resolved?
- Are normal, exceptional, and boundary paths covered?

## 3. Design Readiness
- Were multiple options compared?
- Is the recommended option justified?
- Are risks and mitigations clear?
- Are compatibility, migration, and rollback addressed?

## 4. Task Readiness
- Does every spec requirement map to tasks?
- Is every task executable and verifiable?
- Is task order safe for small-step implementation?

## 5. Implementation Risk
- Worktree status.
- Test environment status.
- Data, migration, permission, concurrency, compatibility, and dependency risks.

## 6. Final Decision
- Implementation may start: yes/no
- Blocking issues
- Required return stage if blocked
```

Validation gate:

```text
1. If the real need is unclear, return to proposal.md.
2. If behavior is not verifiable, return to delta-spec.md.
3. If design lacks real tradeoff, return to delta-design.md.
4. If tasks are not executable, return to tasks.md.
5. Only approve implementation when the remaining risk is acceptable.
```

The most important output of validation is not "pass". It is a defensible
decision about whether implementation should begin.

## Agent Interaction Protocol

The templates alone are not enough. The agent instructions should require the
following behavior in every stage:

1. Read `matspec go --json` before acting.
2. Read the required input artifacts for the current stage.
3. Ask clarification questions before writing when any answer could change
   scope, behavior, data model, compatibility, risk, or acceptance.
4. Separate user-confirmed decisions from agent-inferred decisions.
5. Ask for generation approval before writing the current artifact.
6. Write only the current `allowedWritePath`.
7. Ask for user confirmation after writing.
8. Use `matspec accept --json` only after user confirmation.
9. Never modify implementation code during document stages.
10. Do not advance from validation to archive. Validation only permits
    implementation to start.

## Implementation Roadmap

### Phase 1: Template Strengthening

Update the existing templates without changing artifact names:

- `templates/delta/proposal.md`
- `templates/delta/delta-spec.md`
- `templates/delta/delta-design.md`
- `templates/delta/tasks.md`
- `templates/delta/validation.md`

Expected outcome: generated artifacts reflect the strengthened stage semantics.

### Phase 2: Agent Instruction Strengthening

Update generated integration instructions in `src/integrations.js`:

- Clarification guardrails should emphasize real-need discovery in proposal.
- Spec guardrails should prohibit implementation details.
- Design guardrails should require at least two real options.
- Task guardrails should require traceability from spec to verification.
- Validation guardrails should make "return to stage" explicit.

Expected outcome: agents follow the strengthened semantics even before templates
are fully internalized.

### Phase 3: CLI Validation Strengthening

Enhance `src/validation.js` with mechanical checks:

- `proposal.md` has real-need and non-goal sections.
- `delta-spec.md` has requirement IDs and acceptance criteria.
- `delta-design.md` has at least two options and a tradeoff matrix.
- `tasks.md` references spec IDs and verification commands.
- `validation.md` contains an implementation readiness decision and return-stage
  guidance when blocked.

Expected outcome: obvious weak artifacts are caught before implementation.

### Phase 4: E2E Evaluation

Run the experiment below to determine whether the methodology actually improves
SDD outcomes.

## E2E Experiment Design

### Objective

Determine whether optimized MatSpec improves end-to-end SDD quality compared
with current MatSpec and Superpowers.

The experiment should test the full chain:

```text
ambiguous user request
-> real need discovery
-> boundary confirmation
-> verifiable behavior spec
-> design tradeoff
-> executable task plan
-> readiness validation
-> implementation
-> test and evidence
```

### Variants

Run at least these variants:

```text
A. Current MatSpec
B. Optimized MatSpec
C. Superpowers
```

Optional baseline:

```text
D. Chat-only agent with no workflow
```

The primary comparison is current MatSpec vs optimized MatSpec vs
Superpowers.

### Case Categories

Use brownfield repositories, not empty projects. Each case should contain real
existing behavior, tests, and at least one hidden constraint.

Recommended categories:

1. User states a solution instead of the real need.
   - Example: "Add an export button."
   - Hidden real need: support weekly failed-order reporting for operations.

2. Scope can easily expand.
   - Example: "Support team collaboration."
   - Hidden boundary: owner can invite members only; no RBAC, audit, billing, or
     team analytics.

3. Behavior has important edge cases.
   - Example: "Improve phone validation."
   - Hidden rules: country code, blank values, historical data compatibility,
     import API consistency, and error message behavior.

4. Design requires real tradeoff.
   - Example: "Make search faster."
   - Candidate options: database index, cache, async precompute, frontend
     debounce. Correct choice depends on observed bottleneck.

5. Baseline has implicit constraints.
   - Existing code has undocumented business behavior. The workflow must recover
     or preserve it instead of overwriting it.

6. Non-functional requirements are central.
   - Example: "Allow larger file uploads."
   - Hidden concerns: size limit, timeout, memory, retry, security scanning,
     failure recovery, and error reporting.

For a minimum viable experiment, run three cases:

```text
1. User states a solution instead of the real need.
2. Design requires real tradeoff.
3. Baseline has implicit constraints.
```

### Hidden Oracle

Each case should include hidden oracle material that is not shown to the agent:

```text
oracle/
  real-need.md
  required-behaviors.md
  accepted-boundaries.md
  forbidden-scope.md
  acceptable-design-options.md
  expected-tests.md
  scoring-rubric.md
```

The oracle is used only by evaluators and automated checks.

### Scripted User Simulator

Use a repeatable scripted user simulator instead of free-form human
interaction. Each case should define answers that are only revealed if the agent
asks the right kind of question.

Example:

```text
Initial user request:
"Add an export button to the orders page."

If asked why:
"Support needs to send failed-order reports to suppliers every week."

If asked scope:
"Only failed orders are needed. CSV is enough. No PDF. No new permission system."

If asked success criteria:
"Users can choose a date range and export order ID, supplier, failure reason,
and failure time."
```

This measures whether the workflow discovers the real need instead of
implementing the surface request.

### Run Protocol

For each case and variant:

```text
1. Reset repository to the same baseline.
2. Install or enable the workflow variant.
3. Provide the same initial user prompt.
4. Let the scripted user simulator answer only when asked.
5. Run the complete workflow through validation.
6. If validation permits implementation, implement the tasks.
7. Run project tests and hidden oracle tests.
8. Capture artifacts, transcript, diff, test output, and score.
```

Recommended repetitions:

```text
minimum: 3 cases * 3 variants * 2 runs = 18 runs
stronger: 6 cases * 3 variants * 3 runs = 54 runs
```

### Run Artifacts

Store every run in a comparable directory structure:

```text
runs/
  case-01/
    current-matspec/run-1/
      transcript.jsonl
      proposal.md
      delta-spec.md
      delta-design.md
      tasks.md
      validation.md
      diff.patch
      test-output.txt
      hidden-test-output.txt
      score.json
    optimized-matspec/run-1/
    superpowers/run-1/
```

### Scoring Rubric

Score each dimension from 0 to 5.

#### 1. Real Need Discovery

- Did the workflow identify the problem behind the user's surface request?
- Did it distinguish requested solution from real need?
- Did it ask questions about purpose, user, workflow, and success?

#### 2. Boundary Quality

- Did it define in-scope and out-of-scope clearly?
- Did it prevent scope creep?
- Did it separate user-confirmed facts from agent inference?

#### 3. Spec Quality

- Are requirements verifiable?
- Are normal, exceptional, and boundary paths covered?
- Are implementation details avoided?
- Does each rule have acceptance criteria?

#### 4. Design Quality

- Are at least two real options compared?
- Are tradeoffs substantive rather than cosmetic?
- Is the recommendation justified by current constraints?
- Are rejected options recorded?

#### 5. Task Quality

- Do tasks map to spec requirements and design decisions?
- Is each task executable and verifiable?
- Are tests explicit?
- Are vague implementation tasks avoided?

#### 6. Implementation Correctness

- Does the implementation satisfy required oracle behaviors?
- Does it avoid forbidden scope?
- Does it preserve baseline behavior?
- Do project and hidden tests pass?

#### 7. Evidence and Validation

- Did validation make a real readiness decision?
- Did it identify risks and return stages when needed?
- Did completion include test commands and results?

Suggested weighting:

```text
Real Need Discovery        20%
Boundary Quality           15%
Spec Quality               15%
Design Quality             15%
Task Quality               10%
Implementation Correctness 20%
Evidence and Validation     5%
```

### Mechanical Checks

Add automated checks before human scoring:

- All required artifacts exist.
- `proposal.md` distinguishes requested change from real need.
- `proposal.md` includes non-goals.
- `delta-spec.md` includes requirement IDs and acceptance criteria.
- `delta-design.md` includes at least two options and a tradeoff matrix.
- `tasks.md` references spec IDs and verification commands.
- `validation.md` states whether implementation may start.
- No artifact contains unresolved placeholders.
- No artifact uses vague terms without definition.

### Hidden Test Checks

Each case should include hidden tests or evaluator scripts to check:

- Required behaviors.
- Forbidden scope.
- Baseline compatibility.
- Error and boundary behavior.
- Regression risk.

### Blind Review

At least one human or judge agent should score artifacts without knowing which
variant produced them. Blind review should focus on discovery quality, boundary
quality, and design tradeoff quality, because these are difficult to evaluate
with mechanical checks alone.

### Failure Taxonomy

Record every failure using one or more categories:

```text
F1: Accepted the user's surface solution without discovering the real need.
F2: Scope boundary unclear or expanded.
F3: Spec not verifiable.
F4: Design lacks real tradeoff.
F5: Tasks are not executable.
F6: Validation approved an unsafe state.
F7: Implementation diverged from spec.
F8: Tests passed but business behavior was wrong.
F9: Existing baseline behavior was broken.
```

This taxonomy is more actionable than the total score. It should drive the next
template and instruction iteration.

### Success Criteria

Optimized MatSpec reaches Superpowers-level SDD quality if:

```text
1. Overall score is at least 95% of Superpowers average score.
2. Implementation correctness is not lower than Superpowers.
3. Real need discovery is not lower than Superpowers.
4. Forbidden-scope violation rate is below 10%.
5. Validation correctly blocks unsafe implementation starts.
```

Optimized MatSpec exceeds Superpowers if:

```text
1. Overall score is higher than Superpowers.
2. Baseline compatibility is better than Superpowers.
3. Traceability from need -> spec -> design -> task -> implementation is better.
4. Archive and full spec/design update quality is better.
```

MatSpec should be expected to win on brownfield traceability and baseline
preservation. It does not need to beat Superpowers by copying its style; it
should beat it by combining discovery quality with stronger state and artifact
discipline.

## Expected Outcome

After the optimization, the stage meanings should be:

```text
proposal.md
Confirms why the change exists, who it serves, where it starts and stops, and
what must not be included.

delta-spec.md
Defines how externally observable behavior changes and how each behavior can be
accepted.

delta-design.md
Compares real solution options, records tradeoffs, and selects a defensible
implementation approach.

tasks.md
Maps accepted behavior and design decisions into small, verifiable execution
steps.

validation.md
Decides whether implementation may safely begin and identifies the exact return
stage when it may not.
```

The methodology becomes stronger because every stage answers a different
question:

```text
proposal      Are we solving the right problem?
delta-spec    Do we know the required behavior?
delta-design  Have we chosen the right approach?
tasks         Can this be executed without drift?
validation    Is it safe to start implementation?
```

