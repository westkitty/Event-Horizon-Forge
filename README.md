# Event Horizon Forge

Event Horizon Forge is a browser-first interactive cosmic simulation centred on
**formation, magnetic/plasma manipulation, instability, gravitational collapse,
and counterfactual replay**.

The project is designed so that **the universe itself is the interface**. Core
interaction happens directly in the 3D scene; information-heavy UI stays hidden
until explicitly summoned.

## Current state — Gate 0 prototype

The bounded Gate 0 representative prototype is implemented and runnable. Its
verdict is **INSUFFICIENT EVIDENCE**, recorded in
[`docs/prototype-gate.md`](docs/prototype-gate.md).

To be direct about what that means:

- The simulation, interaction, time/rewind/branch and capability systems are
  built and verified — 42 unit tests and a browser E2E suite pass.
- **No rendered frame has ever been observed, and no frame rate has been
  measured.** The automated environment cannot composite the WebGPU swap chain,
  cannot read back a render target, and throttles `requestAnimationFrame`. See
  [`docs/performance.md`](docs/performance.md) for the evidence.
- Nothing observed suggests the architecture cannot work. It simply has not been
  looked at yet, and the contract forbids claiming otherwise.

**The single most valuable next action is a human opening it in a real browser.**

## Quick start

```bash
bun install
bun run dev
```

Then open `http://127.0.0.1:5173/?debug` — the `?debug` flag adds a small
performance overlay (median/p95 frame time, sim time, tick, chrome count) that
is otherwise absent.

## Commands

| Command | Purpose |
|---|---|
| `bun run dev` | Dev server |
| `bun run build` | Production build (static, no backend) |
| `bun run preview` | Serve the production build |
| `bun run typecheck` | `tsc --noEmit`, strict |
| `bun run test` | Unit suite (Vitest) |
| `bun run test:e2e` | Browser suite (Playwright + Chromium) |
| `bun run gate` | Tests + typecheck + build |

## Requirements

- A WebGPU-capable browser over HTTPS or localhost (Chrome/Edge 113+, or Safari
  and Firefox where enabled). A WebGL 2 fallback tier exists but has **not** been
  tested.
- Verified on: Apple M1, macOS 26.5.2, Chromium 151, adapter `apple / metal-3`,
  selecting **Tier A**.

### Quality tiers

| Tier | Requires | Behaviour |
|---|---|---|
| A | WebGPU + compute + 3D storage textures + ≥64 MB storage buffers | Full particle/volume budgets, 160-step lensing |
| B | WebGPU + compute | Reduced counts and lensing steps |
| C | WebGL 2 | No compute (GPU tracers absent), smallest budgets |
| — | neither | Concise capability message; no broken scene is loaded |

## Controls

The short version: drag empty space to orbit, drag matter/field nodes/the star to
manipulate them, wheel to scale-dive, `WASD` to fly, tap `Space` to pause, hold
`I`/`T`/`C`/`B` to peek, `Y` to fork a branch, `H` to force a clean screen.

Full reference, including accessibility alternatives:
[`docs/controls.md`](docs/controls.md).

## Science disclaimer

This is a reduced-order simulation, not a research code. It is **not** general
relativity, **not** magnetohydrodynamics, and **not** radiation hydrodynamics.

Specifically: gravitational lensing integrates real Schwarzschild null geodesics,
but light bending uses the Schwarzschild solution **at every spin value** — spin
affects only the disk's inner edge and orbital sense, and this is never Kerr
rendering. Matter near the hole uses a pseudo-Newtonian potential. The plasma has
no current feedback into the magnetic field, so reconnection is an explicitly
labelled surrogate.

Every subsystem is classified A (calculated) / B (reduced-order surrogate) /
C (illustrative) in [`docs/model-fidelity.md`](docs/model-fidelity.md), and those
labels are surfaced in the in-app Science peek.

## Project structure

```
src/
  app/          App shell, capability probing, quality budgets
  core/         Deterministic RNG, scale frames, floating origin
  simulation/   Authoritative state: field, plasma, body, gravity, cloud,
                time, commands, checkpoints, branches
  render/       Starfield bake, black-hole lens, particles, field lines
  interaction/  Camera controller, input router
  ui/           Summoned-only overlay
tests/
  unit/         Determinism and physics validation (Vitest)
  e2e/          Browser behaviour (Playwright)
docs/           Governance, architecture, fidelity, research, performance
```

## Governance

- [`AGENTS.md`](AGENTS.md) — agent entry point and protected invariants
- [`OPERATIONAL_STATE.md`](OPERATIONAL_STATE.md) — verified / unverified / pending state
- [`BUILD_SPEC.md`](BUILD_SPEC.md) — build-contract entry point
- [`docs/master-build-contract.md`](docs/master-build-contract.md) — the full authoritative contract
- [`docs/experience-contract.md`](docs/experience-contract.md) — screen-first interaction law
- [`docs/research-benchmarks.md`](docs/research-benchmarks.md) — comparator research
