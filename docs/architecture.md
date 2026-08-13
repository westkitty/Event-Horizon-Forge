# Architecture

Scope: the Gate 0 representative prototype. Structures described here exist in
the tree; anything not yet built is called out as such.

## Simulation / render separation

Rendering is strictly downstream. `WorldState` (`src/simulation/state.ts`) is the
only authority for object identity, mass, field parameters, branch/time position
and checkpoint data. Renderers own GPU buffers, interpolation and LOD, and never
write simulation state.

The frame order in `App.frame()` is fixed:

```
input  ->  time  ->  simulation step  ->  derive render buffers  ->  draw
```

`syncRenderState()` is the single place that reads simulation state and writes
GPU-facing arrays. It is also the single place the floating origin is applied.

## Scale frames and the floating origin

`src/core/scale.ts` defines five frames (cosmic / system / object /
relativistic / detail). Simulation positions are float64 **metres** in one shared
coordinate space. The renderer only ever receives
`(absolute - cameraOrigin) / metresPerUnit` as float32.

The camera is pinned to the render-space origin permanently: `camera.position` is
always `(0,0,0)` and the world translates around it. This is the strongest form
of the floating origin — the float64 subtraction happens on the CPU, so GPU
coordinates stay small and well-conditioned whether the user is looking at a
10^16 m molecular cloud or a 10^10 m horizon.

Frame selection is distance-driven with hysteresis (`selectFrameForDistance` plus
the 0.14x–7x retention band in `CameraController.selectFrame`) so the active frame
cannot oscillate on a boundary and produce visible popping. The relativistic and
detail frames are rebuilt from the active hole's gravitational radius, so
near-horizon rendering is normalised to `r_g = 1 unit` for any mass.

## Time

One integer tick counter drives everything. Each domain converts a tick into its
own physical timestep (`DOMAIN_SECONDS_PER_TICK`), because a plasma gyro-period
and a cloud free-fall time differ by ~18 orders of magnitude:

| Domain | Seconds per tick | Chosen against |
|---|---|---|
| relativistic | 20 | stellar internal dynamical time ~1.6e3 s; periapsis orbit ~1e4 s |
| plasma | 0.002 | gyro-period ~0.12 s at operating field, giving omega·dt ≈ 0.1 |
| formation | 3.15e8 (~10 yr) | cloud free-fall ~2.2e4 yr |

The formation solver runs once every `CLOUD_STRIDE` (8) ticks with a
correspondingly larger dt — it is O(N²) and advancing it at the full tick rate
spent most of the CPU budget resolving a timescale that does not need it. Keyed
on the tick counter, so replay is unaffected.

Science peek exposes all three clocks so the scene is never misread as one
synchronised timeline.

## Rewind and branching

Rewind is checkpoint + replay, never velocity negation:

1. Every causal user action becomes a timestamped `Command` (`commands.ts`).
2. `CheckpointStore` keeps a bounded ring of full `WorldState` clones (default
   every 30 ticks, capacity 240 → ~1.8 MB each, measured).
3. Seeking restores the nearest earlier checkpoint and replays commands forward
   through the same solver that produced the original.

The invariant that makes this correct: **commands are applied exactly once per
tick on each path** — live play applies them in `BranchManager.submit`, replay
applies them in `restoreTo`. Stepping must not apply the log again.

A `Branch` is a complete lineage (state + command log + checkpoint ring + RNG
stream). Forking clones the parent at the fork tick and copies its history, so
the two lineages are provably identical before the fork and diverge only from
what the user changes. Two live branches are retained, bounding memory.

Visual tracers are deliberately **not** checkpointed. They are reconstructed from
`tracerSeed`, which the contract explicitly permits for populations whose
individual particle identity is not scientifically meaningful.

### Determinism

Replay is bit-identical within a session, asserted in
`tests/unit/determinism.test.ts` by fingerprinting every causal float after a
rewind-and-replay round trip. Cross-device determinism is **not** claimed:
`Math.sin/cos/exp/pow` are not guaranteed bit-identical across JS engines. This
is why rewind relies on stored checkpoints rather than pure command replay from
t=0.

## Domain solvers

| Module | Model | Fidelity |
|---|---|---|
| `field.ts` | Analytic dipole/loop/solenoid superposition, packed into a flat array | B |
| `plasma.ts` | Boris pusher for `v' = (q/m)(v × B)` + damping | B |
| `body.ts` | Particle body: spherically-averaged self-gravity + polytropic (γ=5/3) pressure support | B |
| `gravity.ts` | Paczyński–Wiita pseudo-Newtonian potential | A/B |
| `cloud.ts` | Direct-summation softened N-body over mass clumps | B |

See `docs/model-fidelity.md` for what each does and does not calculate.

`FieldSet` is the single field implementation. The plasma solver, the field-line
tracer and the reconnection probe all evaluate through it, because §25.18
requires the visual scaffold to derive from the field the solver actually uses —
a separate "fast path" that could drift from the display path would itself be a
contract violation.

## GPU compute ownership

Two levels of particle population, matching §9.2:

- **Simulation particles** (CPU-authoritative, snapshot-able): stellar body
  ~24.5k, plasma ~12.3k, cloud clumps 384. Uploaded per frame as typed arrays.
- **Visual tracers** (GPU-resident, never read back): up to 240k dust particles
  advected by a TSL compute shader in `GpuTracers`, driven by the four heaviest
  clumps as attractors so the dust follows the mass distribution the user is
  shaping.

Tier C has no compute, so `GpuTracers` is simply not created there. There is no
pretence that a compute-only feature falls back to WebGL.

## Rendering

`BlackHoleLens` is a full-viewport pass drawn first (`renderOrder -1000`, depth
test off). Per pixel it integrates the Schwarzschild photon orbit equation
`d²u/dφ² = -u + 3Mu²` with velocity Verlet, terminating on horizon crossing
(shadow), escape (sample the sky in the outgoing direction), or accretion-disk
plane crossings. Matter composites on top.

The star field is baked to an equirectangular RGBA16F `DataTexture` precisely so
the lens can sample it **directionally** — a screen-space radial distortion over
sprite-drawn stars is the prohibited "generic fisheye".

Known compositing limit: near-field matter (star, debris, plasma) is drawn after
the lens pass and is therefore **not itself lensed**. Occlusion by the horizon is
approximated with a shadow-radius fade rather than a depth-aware lens composite.
Recorded as deferred, not claimed as working.

## Interaction

`InputRouter` centralises all pointer/key/touch intent behind one priority chain
(`pinnedUI > transientUI > activeManipulation > selectedHandle > sceneObject >
camera > idle`) rather than letting camera, scene and DOM fight over events.
Pointer capture is explicit and every in-flight gesture is cancelled on blur,
visibility loss, pointer cancel and unload.

`Overlay` renders **zero** elements in the immersive state. `chromeCount()` makes
that objectively assertable and is checked in the browser suite.

## Capability tiers

`CapabilityProbe` reads adapter limits, not just feature presence, and selects:

- **A** — WebGPU + compute + 3D storage textures + ≥64 MB storage buffers
- **B** — WebGPU + compute, reduced budgets
- **C** — WebGL 2 backend (`forceWebGL`), no compute, reduced counts
- **unsupported** — concise blocking message, no broken scene

Budgets per tier live in `TIER_BUDGETS`.

## Not yet built

Phases 2–7 of the contract are out of Gate 0 scope: protostar formation and
sinks, accretion-disk matter transfer, jets/outflows, the stellar-evolution
bridge, cross-domain provenance transfer, save/export, sonification, Director
shot templates beyond the minimal event-follow, and the full scenario browser.
