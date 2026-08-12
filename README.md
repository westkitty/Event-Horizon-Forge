# Event Horizon Forge

Event Horizon Forge is a browser-first interactive cosmic simulation centered on **formation, magnetic/plasma manipulation, instability, gravitational collapse, and counterfactual replay**.

The project is intentionally designed so that **the universe itself is the interface**. Core interaction happens directly in the 3D scene; information-heavy UI is hidden until explicitly summoned.

## Start here

- `AGENTS.md` — implementation-agent entry point and protected invariants.
- `OPERATIONAL_STATE.md` — current verified/unverified/broken/pending project state.
- `BUILD_SPEC.md` — repository build-contract entry point and prototype-gate rules.
- `docs/experience-contract.md` — screen-first interaction law: direct manipulation, hidden UI, camera/time/branch experience.
- `docs/research-benchmarks.md` — current comparator research and what Event Horizon Forge should outperform.

The complete **Event Horizon Forge — Master AI Build Contract** is supplied to the implementation agent as the build task. The agent must persist that contract into the repository before substantive coding, as directed by `BUILD_SPEC.md`, so the project remains restartable without chat history.

## Current state

Repository bootstrap/specification stage. No runtime implementation is claimed complete yet.

The first engineering milestone is the bounded Gate 0 representative prototype. Dependency versions and renderer architecture are intentionally not pre-locked until that gate inspects current official tooling and proves the risky browser/graphics assumptions.
