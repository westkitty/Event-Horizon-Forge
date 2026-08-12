# Event Horizon Forge — Build Contract Entry Point

**Canonical repository:** `https://github.com/westkitty/Event-Horizon-Forge.git`  
**Canonical branch:** `main`

This repository is intentionally prepared at the **governance/specification stage**, before package scaffolding and renderer architecture are locked. The full, executable Event Horizon Forge master build contract is supplied to the implementation agent as the task prompt/artifact. When that master contract is supplied, it governs implementation together with `OPERATIONAL_STATE.md`.

## Highest-priority product invariant

> **The rendered universe is the interface.**

Normal immersive playback must not depend on a persistent dashboard, telemetry HUD, labels, toolbar, sliders, object browser, bottom bar, or explanatory panel. Core actions happen directly in the 3D scene through spatial manipulation, camera/time gestures, transient context controls, and hold-to-peek analytical layers. Detailed numbers and prose belong in explicitly summoned Inspector/Science states.

A build that needs production users to keep a developer panel, permanent HUD, or conventional dashboard open for the main loop fails this contract even if the graphics are excellent.

## Required reading order before implementation

1. `AGENTS.md`
2. `OPERATIONAL_STATE.md`
3. this file
4. `docs/experience-contract.md`
5. `docs/research-benchmarks.md`
6. the supplied **Event Horizon Forge — Master AI Build Contract**
7. only then inspect/create package, renderer, simulation, and source architecture.

If the supplied task includes the full master build contract and `docs/master-build-contract.md` does not yet exist, persist an exact or semantically lossless Markdown copy there **before substantive implementation** so the repository remains restartable without chat history. Do not replace it later with a short summary.

## Prototype gate first

Do **not** begin by building the entire product. The first implementation milestone is the bounded Gate 0 representative slice defined by the master build contract. It must falsify the risky assumptions before production expansion, including:

- renderer/capability path;
- scene-native direct manipulation;
- high-count particles/volumetric matter;
- plasma + movable magnetic structures;
- black-hole lensing and incoming-body deformation;
- free camera and semantic scale travel;
- checkpoint/rewind;
- hidden-UI/zero-chrome success path;
- resource lifecycle and representative performance.

A spinning model, static black-hole shader, shader gallery, or dashboard-controlled demo is insufficient evidence.

## Repository protections

Preserve unless a later explicit user instruction supersedes them:

- `AGENTS.md`
- `BUILD_SPEC.md`
- `OPERATIONAL_STATE.md`
- `docs/experience-contract.md`
- `docs/research-benchmarks.md`
- canonical `origin` = `https://github.com/westkitty/Event-Horizon-Forge.git`
- canonical branch = `main`

Do not force-push, silently replace `origin`, create a replacement repository, or mark runtime features verified from source-code presence alone.
