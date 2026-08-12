# Event Horizon Forge — Agent Entry Point

This repository is governed by `BUILD_SPEC.md` and `OPERATIONAL_STATE.md`.

Before substantive implementation:

1. Read `OPERATIONAL_STATE.md` completely.
2. Read `BUILD_SPEC.md` completely.
3. Read `docs/research-benchmarks.md`.
4. Inspect the repository before creating or changing architecture.
5. Run the prototype gate in `BUILD_SPEC.md` before expanding into the full production build.
6. Preserve existing verified behavior and update operational state only from actual evidence.

## Highest-priority product invariant

**The rendered universe is the interface.**

Normal immersive playback must contain no persistent dashboard, telemetry HUD, labels, bottom bar, sliders, object list, or explanatory panel. Core actions must happen through direct scene interaction, camera/time gestures, and temporary press-and-hold/context controls. Detailed numbers and prose belong in summoned Inspector/Science states.

A build that is visually spectacular but requires a developer panel or permanent HUD for the main loop fails the product contract.

## Canonical repository

- Repository: `westkitty/Event-Horizon-Forge`
- Remote: `https://github.com/westkitty/Event-Horizon-Forge.git`
- Branch: `main`

Do not create a replacement repository or silently change `origin`.

## Evidence rules

Do not claim a feature, test, performance threshold, browser path, scientific fidelity level, commit, or push that was not actually observed.

Use the acceptance criteria and failure limits in `BUILD_SPEC.md`. Stop when those criteria pass; do not broaden scope with unrelated refactors or optional features.
