# Event Horizon Forge — Research Benchmarks

**Research date:** 2026-08-12  
**Purpose:** Capture current interaction and visualization references that should inform Event Horizon Forge without copying proprietary code, assets, branding, or art.

## Benchmark principles

Event Horizon Forge should not become a clone of any existing simulator. These references prove useful interaction patterns and reveal gaps the project can exploit.

The synthesis target is:

- Universe Sandbox-level tactile consequence;
- NASA Eyes-level time/camera travel;
- SpaceEngine/OpenSpace-level scale continuity;
- 100,000 Stars-level visual primacy;
- substantially less persistent chrome than any conventional science simulator;
- direct manipulation, rewind, branch comparison, and causal inspection that remain inside the 3D scene.

## Universe Sandbox

Official sources:

- https://universesandbox.com/
- https://universesandbox.com/support/controls/

Observed strengths from current official material:

- physics-based gravity, climate, collision, and material interaction in one sandbox;
- create/destroy/interact fantasy rather than passive observation;
- fast play/pause and simulation-speed control;
- object movement/manipulation and collision control.

Event Horizon Forge should beat it by:

- making direct manipulation of diffuse matter, plasma fields, and encounter trajectories the default interaction surface;
- eliminating the need for a persistent bottom toolbar/telemetry surface during normal exploration;
- making rewind a checkpoint/reconstruction and counterfactual branching system rather than merely reversing velocities/time direction;
- letting the alternate outcome appear spatially in the same world through Branch Ghost/crossfade;
- providing scale-continuous travel from molecular-cloud-scale structures to near-horizon imagery.

## NASA Eyes

Official source:

- https://science.nasa.gov/eyes/

Observed strengths:

- browser-based immersive 3D;
- ride-along viewpoints;
- fast-forward and rewind in Eyes on the Solar System;
- current scientific/mission data integrated with explorable scenes.

Event Horizon Forge should beat it by:

- letting the user alter initial conditions rather than only navigate existing data;
- keeping data/info overlays summoned instead of visually defining the experience;
- making camera, time, manipulation, and explanation one coherent interaction grammar;
- adding deterministic replay, branch forks, causal provenance, and direct field/matter manipulation.

## SpaceEngine

Official sources:

- https://spaceengine.org/
- https://spaceengine.org/manual/user-manual-0980/

Observed strengths:

- huge perceived universe;
- procedural generation;
- seamless movement across enormous scales;
- game-like free navigation.

Current official manual also documents multiple persistent HUD regions showing selected-object information, camera binding, time, velocity/acceleration, and field of view.

Event Horizon Forge should beat it by:

- preserving the freedom and scale while defaulting to zero persistent telemetry;
- giving the user something meaningful to manipulate at every important scale;
- using semantic scale-frame handoffs that preserve camera/focus continuity;
- making the star field participate in navigation, occlusion, exposure, and black-hole lensing rather than functioning only as backdrop.

## OpenSpace

Official sources:

- https://www.openspaceproject.com/
- https://docs.openspaceproject.com/latest/about/index.html

Observed strengths:

- visualization of the known universe across all possible scales;
- interactive presentation of dynamic observations, simulations, and mission-planning data;
- high-end graphics/display architecture including large tiled displays and planetarium domes;
- extensible architecture.

Event Horizon Forge should beat it by:

- optimizing around one user's tactile agency rather than presentation/data navigation;
- making the screen itself the instrument;
- adding direct manipulation, event replay, causal traces, and counterfactual branches;
- preventing presenter/science UI from becoming the permanent user-facing surface.

## Google 100,000 Stars

Official source:

- https://experiments.withgoogle.com/100000-stars

Observed strengths:

- WebGL browser visualization whose imagery dominates the screen;
- immediate direct zoom/navigation through a large stellar neighborhood;
- sparse information disclosure rather than labeling everything;
- strong feeling of scale from mouse-driven travel.

Event Horizon Forge should beat it by:

- keeping the same visual primacy while making the scene dynamic and physically responsive;
- maintaining continuity through much larger semantic scale changes;
- making background stars active lensing sources and spatial anchors;
- keeping labels/details transient and selection-driven.

## Current browser/rendering implementation references

Three.js official:

- https://threejs.org/manual/en/webgpurenderer
- https://threejs.org/docs/TSL.html

Relevant current capabilities include WebGPU rendering plus a WebGL 2 renderer backend, TSL node materials, compute operations, and the newer node-based post-processing path. `WebGPURenderer` remains experimental enough that the exact production path must be prototype-gated rather than assumed universally safe.

Rapier official:

- https://rapier.rs/docs/user_guides/javascript/determinism/
- https://rapier.rs/docs/user_guides/javascript/serialization/

Rapier's JavaScript/WASM path provides deterministic physics behavior and whole-world snapshots useful for bounded rigid-body subsystems and replay checkpoints. GPU simulation state still requires Event Horizon Forge's own checkpoint/reconstruction strategy.

## Canvas UI opportunity scan

Canvas UI was reviewed as a possible source of signature WebGL/canvas effects. For this project, the primary experience is already a custom Three.js/WebGPU simulation and the critical interaction surface is the rendered universe itself. Installing an additional canvas-effects layer for primary interactions would add pointer/lifecycle/compatibility risk while contributing less than scene-native simulation effects.

Decision: **do not add Canvas UI to the critical path.** Reconsider only for a nonblocking outer-shell moment (for example a future landing/credits/about surface) if it clearly outperforms existing project primitives and preserves the immersive route.

## Product conclusion

The references collectively establish that scale, temporal travel, direct celestial manipulation, data-rich exploration, and visually dominant browser 3D are viable patterns. The opportunity is to combine them while making **persistent interface chrome the exception rather than the operating system of the experience**.

The build should be judged by a brutal question:

> Can somebody spend five minutes shaping matter, moving through scale, changing magnetic structure, throwing a star toward a black hole, pausing, rewinding, and comparing an alternate outcome while the universe—not a HUD—continues to own the screen?

If not, the interaction design is not finished.
