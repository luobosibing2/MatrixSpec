# [REQ ID] Task Breakdown

> This document turns the accepted spec and design deltas into executable implementation tasks.

## 1. Data and Migration

- [ ] [Create or update migration file.]
- [ ] [Update seed, fixture, or compatibility data if needed.]

## 2. Domain and Application Logic

- [ ] [Update domain rule or service behavior.]
- [ ] [Map each task to a delta-spec rule.]

## 3. Infrastructure

- [ ] [Update repository, gateway, external client, or configuration.]

## 4. Interface Layer

- [ ] [Update controller, route, handler, command, or UI entry point.]
- [ ] [Update validation and error reporting.]

## 5. Tests

- [ ] [Unit test for positive path.]
- [ ] [Unit or integration test for negative and boundary paths.]
- [ ] [Regression test for compatibility or migration behavior.]

## 6. Done Finalization

- [ ] After implementation and verification, refresh matspec/specs/spec.md from delta-spec.md.
- [ ] After implementation and verification, refresh matspec/specs/design.md from delta-design.md.
- [ ] Keep implementation notes traceable to accepted decisions.

## 7. Verification

- [ ] Run the required project tests: `[command]`.
- [ ] Run any manual or E2E checks: `[command or steps]`.
- [ ] Record the result in validation or implementation notes.

## Dependency Order

```text
data/migration -> domain/application -> infrastructure -> interface -> tests -> verification -> done finalization
```

## Agent Execution Rules

1. Implement only tasks backed by delta-spec.md or delta-design.md.
2. Follow the existing project architecture and style.
3. Add tests for every changed business rule.
4. Do not run `matspec generate` to evolve an accepted change; generate/apply is for baseline recovery.
5. Do not run `matspec done` until implementation, verification, and done finalization full spec/design refresh are complete.
