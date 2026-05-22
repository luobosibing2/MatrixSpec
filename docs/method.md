# Method

MatSpec is designed for brownfield software work. It starts by recovering a full system baseline, then applies incremental changes against that baseline.

## Flow

```text
recover full spec/design
-> clarify requirement
-> write spec delta
-> write design delta
-> break down tasks
-> validate consistency
-> implement
-> verify
-> done finalization
-> archive
```

## First Principles

1. Implementation without a baseline is guesswork in an existing system.
2. A delta is meaningful only when it can be compared with the current full behavior.
3. Clarification must happen before documents are accepted, not after code is written.
4. Validation is a document-chain gate before implementation; it is not the end of the change.
5. `matspec done` belongs after implementation, verification, and done finalization pass.

## What Makes It Different

OpenSpec-style tools are strong at incremental change capture. MatSpec adds an earlier recovery layer: it asks the agent to reconstruct the current system's feature list and design before allowing deltas to become implementation instructions.

That makes MatSpec especially useful when the codebase already has years of behavior, implicit rules, and hidden constraints.
