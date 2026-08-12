# Event Horizon Forge — Authoritative Build Contract

**Canonical repository:** `https://github.com/westkitty/Event-Horizon-Forge.git`  
**Canonical branch:** `main`

This file is the repository entry point for the complete Event Horizon Forge implementation contract. The contract is intentionally split across five ordered Markdown files so coding agents can load it without truncating one large document.

## Highest-priority product invariant

> **The rendered universe is the interface.**

Normal immersive playback must not depend on a persistent dashboard, telemetry HUD, labels, toolbar, sliders, object browser, bottom bar, or explanatory panel. Core actions happen directly in the 3D scene through spatial manipulation, camera/time gestures, transient context controls, and hold-to-peek analytical layers. Detailed numbers and prose belong in explicitly summoned Inspector/Science states.

A build that needs production users to keep a developer panel, permanent HUD, or conventional dashboard open for the main loop fails this contract even if the graphics are excellent.

## Required reading order

Read every file below before substantive implementation. Together they are one controlling specification:

1. [`docs/spec/01-product-simulation.md`](docs/spec/01-product-simulation.md) — executor contract, product thesis, shared model, scale/time architecture, formation/plasma/black-hole systems.
2. [`docs/spec/02-rendering-space.md`](docs/spec/02-rendering-space.md) — renderer, star field, volumetrics, plasma, lensing, tidal rendering, post-processing.
3. [`docs/spec/03-experience-interaction.md`](docs/spec/03-experience-interaction.md) — camera, director, direct manipulation, invisible UI, Time Lens, Branch Ghost, Causal Trace, Cosmic Hand, Magnetic Loom, Scale Dive, Silent Watch, accessibility/audio.
4. [`docs/spec/04-architecture-gates.md`](docs/spec/04-architecture-gates.md) — application/GPU architecture, save/replay, capability tiers, responsive behavior, fidelity ledger, benchmarks, prototype gate.
5. [`docs/spec/05-implementation-qa-delivery.md`](docs/spec/05-implementation-qa-delivery.md) — phases, testing, Git workflow, documentation, deployment, acceptance criteria, prohibited shortcuts, failure limits, delivery and definition of done.

Also read before implementation:

- `AGENTS.md`
- `OPERATIONAL_STATE.md`
- `docs/research-benchmarks.md`

## Authority

The five ordered spec files are the authoritative implementation prompt. `BUILD_SPEC.md` is an index and invariant lock, not a substitute summary. If a later implementation document conflicts with them, follow the newest explicit user instruction first, then `OPERATIONAL_STATE.md`, then this contract.

## First engineering action

Do **not** begin by building the entire product. Execute the bounded prototype gate in Section 39 (`docs/spec/04-architecture-gates.md`). Its purpose is to falsify the risky assumptions—renderer/capability path, scene-native interaction, volumetrics/particles, black-hole lensing, checkpoint rewind, free camera and zero-chrome user path—before production architecture expands.

Do not mark production readiness from a pretty static scene or unmeasured desktop demo.
