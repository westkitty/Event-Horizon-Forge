# EVENT HORIZON FORGE
## Master AI Build Contract — Formation, Confinement, Instability, and Collapse

**Artifact purpose:** This document is the authoritative implementation prompt for a capable coding agent. Build the project described here. Do not reduce it to a concept demo, static visualization, dashboard, or collection of disconnected mini-simulations.

**Working title:** Event Horizon Forge  
**Project slug:** `event-horizon-forge`  
**Primary delivery:** high-end browser-based interactive 3D simulation  
**Default implementation candidate:** vanilla TypeScript + Vite + Three.js with `WebGPURenderer`/TSL, with explicitly designed degraded paths  
**Canonical repository:** `https://github.com/westkitty/Event-Horizon-Forge`
**Canonical Git remote:** `https://github.com/westkitty/Event-Horizon-Forge.git`
**Canonical branch:** `main`

---

# 0. EXECUTOR CONTRACT

You are the implementation owner for Event Horizon Forge. Your job is to create a production-quality interactive simulation that unifies three previously separate fantasies into one continuous system:

1. **cosmic matter formation** — manipulate a cold molecular cloud, seed density, twist it, compress it, add turbulence and angular momentum, and allow it to collapse into protostars, disks, jets, clumps, and competing centers of formation;
2. **extreme plasma confinement and instability** — deploy and manipulate magnetic field structures around charged matter, directly shape plasma behavior, visualize field lines, and drive the system through stable, unstable, pinched, twisted, filamentary, reconnecting, and confinement-failure states;
3. **gravitational collapse and black-hole interaction** — create or load a black hole, vary mass and spin, send stars, gas clouds, compact objects, debris swarms, and plasma toward it, and visualize tidal disruption, accretion, relativistic brightness asymmetry, gravitational lensing, debris streams, and event-horizon-scale behavior.

These are **not three tabs or three games**. They share one matter model, one spatial universe, one interaction language, one camera system, one time system, one history/branching model, one save format, one renderer, and one visual language. Scenario presets may start the user at different points in that continuum, but the underlying systems must interoperate.

Do not ask the user to make routine implementation decisions that can be resolved from the repository, this document, official documentation, or bounded prototyping. Ask only for a genuine blocker such as missing credentials or an absent remote URL when a push is explicitly required.

Before coding:

1. inspect the project directory and Git state;
2. read any existing `OPERATIONAL_STATE.md`, project bible, README, design notes, or prior implementation artifacts;
3. determine whether this is a new repository or an existing implementation;
4. verify current stable package versions from official package sources and pin exact versions in the lockfile;
5. create `docs/technology-baseline.md` recording the versions actually used and the browser/device capabilities verified;
6. verify the canonical repository is `westkitty/Event-Horizon-Forge` and preserve the repository-preparation files already committed there;
7. run the prototype gate in this contract before committing to the complete architecture.

This repository is the project source of truth. Do not create a sibling repository, rename the project, or silently point `origin` elsewhere. If the working directory is not already a clone of the canonical repository, clone it or initialize it only through the safe Git procedure in Section 48.

Never claim a feature, performance level, browser path, scientific model, Git push, or test result that you did not actually verify.

---

# 1. PRODUCT THESIS

Event Horizon Forge is an **impossible observatory and cosmic manipulation sandbox**.

The user is allowed to touch physical processes normally hidden by scale, time, energy, and danger. They can gather diffuse matter, sculpt its motion, watch structure emerge, impose magnetic order on energized plasma, deliberately destabilize it, create compact gravitational objects, throw matter into those objects, and then rewind the entire causal chain.

The emotional sequence is:

**wonder → agency → control → instability → catastrophe → inspection → rewind → counterfactual**

The product must feel less like astronomy software and more like being handed direct control over forbidden-scale phenomena while still maintaining an honest distinction between physics, reduced-order approximation, and cinematic visualization.

The primary screen exists to show the phenomenon. It is **not** a dashboard. During normal observation and playback, the simulation should be able to occupy essentially the entire viewport with no persistent paragraph text, charts, numeric panels, menus, legends, or scientific prose.

The user should be able to understand the basic fantasy in seconds:

- touch matter;
- shape it;
- energize or confine it;
- let go;
- watch what happens;
- rewind;
- change one thing;
- compare.

---

# 2. NON-NEGOTIABLE DESIGN PRINCIPLES

## 2.1 The simulation is the interface

The default screen is 3D space, not UI chrome. Controls must appear through progressive disclosure: pointer movement, edge reveal, keyboard invocation, radial/tool palette, selected-object focus, or explicit science mode.

## 2.2 One universe, not three products

Formation, plasma control, and black-hole behavior must use shared entities and shared state. Matter created during formation must be usable later as plasma, stellar material, debris, or black-hole feedstock where physically and technically meaningful.

## 2.3 User-owned camera

The user may orbit, fly, zoom, focus, chase, inspect, detach, and rotate the camera at all times except during a deliberately chosen locked cinematic. Any automated director must surrender instantly on manual camera input.

## 2.4 Time is a first-class system

Pause, slow motion, acceleration, arbitrary seek, rewind, checkpoint restoration, branch creation, and replay are core features. Do not fake rewind by simply running particle velocities backward.

## 2.5 Spectacle must remain legible

Every major effect needs clear spatial causality. More particles are not automatically better. The user should be able to tell what changed, where energy moved, what became unstable, what collapsed, and why one branch differs from another.

## 2.6 Scientific truth and visual truth are separate layers

Every simulation subsystem must declare one of these statuses:

- **A — physically calculated:** equation-driven behavior with documented assumptions;
- **B — reduced-order / calibrated surrogate:** simplified dynamics intended to preserve important qualitative or semi-quantitative behavior;
- **C — illustrative visualization:** visual communication only; must not be described as a physical prediction.

The UI may hide these labels during cinematic play, but science mode must expose them.

## 2.7 Do not claim full GR or full MHD unless actually implemented

A browser application is not a general relativistic magnetohydrodynamics supercomputer. Do not imply otherwise. Black-hole light bending may use a geodesic/LUT model; plasma may use particle and field approximations; stellar collapse may use reduced-order self-gravity and state transitions. Those choices are acceptable when explicitly documented.

## 2.8 Preserve scale

A molecular cloud, a protostar, a field-confined plasma, an accretion disk, a star undergoing tidal disruption, and an event horizon cannot share one naïve float-coordinate world. Use hierarchical scale frames and camera-relative rendering.

## 2.9 The screen is the instrument

The user must not operate Event Horizon Forge primarily by operating menus. The **rendered universe is the control surface**. The user should be able to perform the core loop by touching, dragging, throwing, orbiting, focusing, pausing, scrubbing, and releasing objects or fields in the scene itself.

Hard rule: during ordinary immersive playback, the rendered scene may contain **zero persistent words, numbers, labels, charts, legends, toolbars, sliders, or panels**. An optional minimal cursor/reticle and accessibility indicator are the only exceptions.

A hidden UI is not sufficient if the user must repeatedly summon it to accomplish routine actions. Core actions must be directly available through spatial interaction and concise keyboard/gamepad gestures. UI exists for configuration, explanation, precision entry, accessibility, and infrequent mode changes—not as the primary way the simulation is driven.

## 2.10 Progressive disclosure must be reversible and momentary

Use three disclosure depths:

1. **Immersive:** no visible chrome; scene interaction only.
2. **Peek:** a press-and-hold, long-press, edge dwell, or context gesture reveals only the controls relevant to the current target; releasing the gesture hides them again.
3. **Inspect:** an explicitly pinned inspector/science/settings state may contain text, numbers, plots, and accessibility controls. It must never appear by default during active spectacle.

Do not use a permanently visible “minimal HUD” as a compromise. The default is no HUD.

## 2.11 Every invisible system needs visible physical feedback

When the user affects gravity, density, magnetic structure, time, velocity, heat, or another otherwise invisible variable, communicate the action through **temporary changes in the world itself**: deformation, motion, flow, field traces, ghost trajectories, pressure/energy shells, color-temperature changes, transient vector glyphs, or spatial previews. Do not make the user look away from the phenomenon to read a slider.

## 2.12 Camera, time, and selection are not modes the user should babysit

Infer sensible behavior from context. Orbit an object when the drag begins on or near a focused object; free-look/flight when manipulating empty space; manipulate matter when an active direct-manipulation gesture begins on matter. Explicit camera/tool modes remain available for power users, but ordinary exploration should not require constant mode switching.

## 2.13 No title-screen tax

On first load, after capability detection and essential asset readiness, enter a living scene immediately. Do not force the user through a conventional title screen, menu carousel, or “Start Simulation” page. Brand/title may appear briefly during loading and then leave the viewport. Returning users should resume into an explorable scene or last safe scenario unless they explicitly request the scenario browser.

---

# 3. CORE USER FANTASY AND VERBS

Keep the interaction language small and consistent. The principal verbs are:

- **Gather** — attract diffuse matter into a region.
- **Disperse** — push matter outward or reduce density.
- **Shape** — move, stretch, rotate, compress, or redirect matter.
- **Spin** — add or remove angular momentum.
- **Heat / Energize** — raise thermal or kinetic energy where the active model permits it.
- **Cool** — remove energy where supported.
- **Seed** — introduce a density center, protostar, plasma packet, star, debris body, compact object, or black hole.
- **Constrain** — deploy magnetic field geometry around charged plasma.
- **Twist** — rotate or deform a field structure.
- **Perturb** — inject instability, velocity, density, or field asymmetry.
- **Release** — stop actively controlling a system and let it evolve.
- **Feed** — send matter toward another object or accretion region.
- **Collapse** — drive or permit a system to cross a modeled threshold.
- **Trace** — reveal selected causal histories and field/matter provenance.
- **Rewind** — restore a prior simulation state.
- **Fork** — create a counterfactual branch from the current time.
- **Compare** — switch, wipe, or synchronize two branches.

Do not create dozens of unrelated tools when these verbs can cover the behavior.

---

# 4. PRIMARY EXPERIENCE LOOP

The complete product must support this continuous loop:

1. Begin in deep space with an empty or partially seeded volume.
2. Summon or reveal diffuse gas and dust.
3. Manipulate density, turbulence, temperature proxy, and angular momentum.
4. Allow one or more density centers to collapse into protostellar objects.
5. Observe accretion disks, fragmentation/clumping, competition between protostars, and bipolar outflows.
6. Deploy a **magnetic confinement lattice** around charged/ionized material.
7. Move, rotate, strengthen, weaken, and deform field nodes.
8. Observe plasma filaments, pinches, braided flow, turbulence, field-line topology, instability growth, and confinement loss.
9. Use the same field tools around stellar coronae, jets, or accretion plasma where physically meaningful; never allow magnetic fields to directly manipulate an event horizon or neutral gravitational mass.
10. Create or load a black hole with variable mass and spin.
11. Send a star, gas cloud, plasma stream, asteroid/debris swarm, or compact object toward it with user-controlled approach direction and velocity.
12. Observe orbit capture or escape, tidal distortion, disruption, debris streams, accretion, disk brightening, beaming, redshift, lensing, and the changing star field.
13. Pause at any point and detach the camera.
14. Enter slow motion and inspect the system from arbitrary angles and scales.
15. Rewind to any available checkpoint.
16. Fork a branch.
17. Change exactly one condition: cloud spin, field strength, field topology, black-hole spin, approach vector, object type, mass, or another modeled parameter.
18. Replay and compare the branches visually.

The application should reward repeated experimentation rather than completion of a linear tutorial.

---

# 5. ENVIRONMENTS AND STARTING STATES

Presets are **starting conditions**, not isolated modes.

Required starting states:

### 5.1 Empty Forge
Sparse star field, no major active matter. User creates everything.

### 5.2 Molecular Cloud
Cold diffuse cloud with editable density, turbulence, angular momentum, and one optional seed region.

### 5.3 Binary Nursery
Two competing high-density regions capable of becoming a binary protostellar system.

### 5.4 Magnetic Containment Chamber
A gigantic fictional experimental environment surrounding an energized plasma mass. Preserve the visual fantasy of an enormous chamber, field coils/nodes, luminous containment geometry, and catastrophic confinement failure. This is a preset of the same field solver, not a different engine.

### 5.5 Young Star + Disk
Protostar or young star with accretion disk and bipolar outflow ready for field manipulation.

### 5.6 Feeding Black Hole
Black hole with sparse accretion disk plus a selectable incoming body.

### 5.7 Tidal Disruption
Star already on a close encounter trajectory, seconds/minutes before the visually dramatic phase.

### 5.8 Accretion Laboratory
Black hole with charged gas/plasma streams and deployable field structures outside the horizon, intended to show that fields influence charged matter but do not negate the black hole’s gravity.

### 5.9 Full Lifecycle Showcase
A curated sequence that demonstrates formation → ionization/plasma control → stellar evolution bridge → compact collapse/black-hole interaction. The time compression must be explicitly labeled as accelerated/model-transition behavior, not literal continuous high-resolution simulation over stellar lifetimes.

---

# 6. UNIVERSAL SIMULATION DATA MODEL

Create a shared typed entity model. Do not build one code path for “nebula particles,” another incompatible path for “plasma particles,” and a third for “black-hole debris” if the same matter representation can transition between them.

At minimum model:

```ts
type MatterPhase =
  | 'dust'
  | 'neutralGas'
  | 'ionizedGas'
  | 'plasma'
  | 'condensedBody'
  | 'stellarFluidProxy'
  | 'debris'
  | 'accretionTracer';

type GravityClass =
  | 'tracer'
  | 'distributedMass'
  | 'body'
  | 'protostar'
  | 'star'
  | 'compactObject'
  | 'blackHole';

interface MatterState {
  id: string;
  phase: MatterPhase;
  gravityClass: GravityClass;
  mass: number;
  temperatureProxy: number;
  densityProxy: number;
  chargeFraction: number;
  compositionProfile: string;
  angularMomentum: [number, number, number];
  positionFrameId: string;
  position: [number, number, number];
  velocity: [number, number, number];
  seed: number;
  provenanceId: string;
  modelTags: string[];
}
```

The exact schema may change, but the design must preserve:

- mass and mass provenance;
- phase/state;
- temperature/density proxies;
- charge/ionization state;
- angular momentum;
- gravitational role;
- renderer ownership;
- branch identity;
- deterministic seed;
- transitions between solver domains.

Track **matter provenance** so a user can select debris near a black hole and determine whether it originated in a star, cloud, disk, or generated scenario.

---

# 7. MULTI-SCALE SPATIAL ARCHITECTURE

## 7.1 Do not use one raw coordinate space

The product spans orders of magnitude too large for one float32 GPU space. Implement a hierarchy of local reference frames.

Suggested hierarchy:

- `CosmicFrame` — large-scale cloud/star separations;
- `SystemFrame` — protostar/binary/accretion-disk scale;
- `ObjectFrame` — local star/plasma/chamber scale;
- `RelativisticFrame` — black-hole vicinity, normalized to gravitational radius or Schwarzschild radius;
- `DetailFrame` — close inspection of field lines, tidal streams, or plasma structures.

Positions are stored in stable CPU-side coordinates appropriate to the frame. The renderer receives camera-relative positions in local normalized coordinates.

## 7.2 Floating origin

Continuously keep the active camera and focus object near the render origin. Rebase child frames rather than letting GPU coordinates grow without bound.

## 7.3 Scale-aware camera

Camera speed, near/far clipping, focus distance, point size, fog/volume step size, and interaction radius must adapt to the active scale frame.

Use reversed depth or logarithmic depth only after verifying renderer support and artifacts. Do not assume one setting fixes all scale problems.

## 7.4 Smooth semantic zoom

The user should be able to zoom from a wide molecular-cloud view toward an individual star, plasma knot, accretion disk, or black-hole shadow without an obvious loading-screen discontinuity. Internally, the application may hand off between representations using crossfade, LOD, and frame changes.

---

# 8. TIME ARCHITECTURE

## 8.1 One timeline, multiple physical regimes

Do not pretend the same fixed timestep can cover milliseconds near a black hole and millions of years of star formation.

Use a top-level `TimeController` that owns:

- current universal scenario time;
- active physical regime;
- playback direction request;
- playback rate;
- branch ID;
- checkpoint index;
- solver-specific substep configuration;
- event-transition records.

Each domain solver advances with its own appropriate timestep or event-based model.

## 8.2 Time scale

Support at least:

- frame-step;
- extreme slow motion;
- real-time-like playback for dramatic events;
- accelerated seconds/minutes/hours;
- accelerated years;
- accelerated thousands/millions of years for formation scenarios;
- event jump to “next meaningful transition.”

The UI should not expose absurd slider ranges as a permanent control. Use contextual logarithmic control in the summoned timeline.

## 8.3 Rewind

Required strategy:

1. all user commands are stored as timestamped deterministic commands;
2. CPU simulation state receives periodic snapshots;
3. GPU compute fields receive periodic checkpoints/readback or a reconstructable seed/command record, depending on cost;
4. seeking backward restores the nearest earlier checkpoint;
5. the simulation replays deterministically or semi-deterministically forward to the requested time;
6. purely illustrative particles may be regenerated from deterministic seeds when exact particle identity is not scientifically meaningful;
7. any subsystem that cannot guarantee cross-device deterministic replay must say so in the science/debug panel and rely on stored checkpoints rather than false determinism claims.

## 8.4 Branching

From any checkpoint, user can choose **Fork**. A branch stores:

- parent branch;
- fork time;
- changed command(s);
- new deterministic seed only when intentionally randomized;
- comparison metadata.

Support at least two live branches in the UI.

## 8.5 Compare

Provide:

- instant A/B switch;
- synchronized time playback;
- hold-to-peek previous branch;
- optional spatial wipe when camera poses match;
- optional ghost/overlay for large-scale morphology;
- numerical/science comparison only inside an opened inspector.

---

# 9. FORMATION SYSTEM — STARFORGE DOMAIN

This system preserves the complete star-formation fantasy while remaining buildable in a browser.

## 9.1 Required user controls

The user must be able to directly manipulate a molecular cloud by:

- grabbing and dragging matter;
- applying a radial compression brush;
- applying a dispersal brush;
- twisting a region to add angular momentum;
- injecting turbulence/vorticity;
- creating local density seeds;
- raising or lowering a temperature/pressure proxy;
- changing the global cloud mass and characteristic scale through an advanced inspector;
- enabling multiple competing collapse centers.

## 9.2 Simulation representation

Use two levels:

### Simulation particles / clumps
A bounded count of mass-carrying particles or clumps used for actual reduced-order dynamics.

### Visual tracers
A much larger GPU-driven population used to render density, dust, gas, shocks, and flow. Visual tracers must not be mistaken for individually gravitationally solved particles.

The agent must prototype at least two formation approaches and choose the one that meets visual and performance criteria:

- GPU particle attractor/density-field method;
- bounded Barnes-Hut or other hierarchical gravity for mass clumps plus GPU tracers;
- coarse particle-mesh field if proven performant and stable in the actual target browsers.

Do not implement an expensive full SPH or full radiation hydrodynamics solver merely because it sounds scientifically prestigious.

## 9.3 Collapse and fragmentation

Reduced-order collapse should account for:

- local density;
- mass concentration;
- angular momentum;
- pressure/temperature proxy;
- turbulence;
- competing gravitational centers.

When collapse criteria are met, create a protostellar sink object that can accrete nearby mass-carrying clumps. Preserve mass bookkeeping.

Allow multiple protostars and competition for surrounding material.

## 9.4 Accretion disk formation

Matter with nonzero angular momentum should preferentially settle into a rotating disk representation around a protostar. Use a stable surrogate that visibly distinguishes:

- radial infall;
- circularizing material;
- disk plane;
- inner hotter/brighter region;
- outer dusty region;
- spiral or turbulent structure.

## 9.5 Bipolar outflows

When the protostar reaches the appropriate scripted/reduced-order state, generate bipolar outflow aligned approximately with its spin axis. The outflow must:

- affect surrounding tracer matter;
- create visible cavities/bow-shock-like structures;
- carry away a modeled angular-momentum proxy;
- respond visually to magnetic field manipulation when ionized.

Treat the detailed jet-launch mechanism as reduced-order unless a stronger model is actually implemented.

## 9.6 Clumping and proto-planetary debris

Allow some disk material to form visually meaningful clumps or debris populations. Do not claim realistic planet formation unless implementing a validated model. The user should nevertheless see that rotating material can aggregate differently under changed conditions.

## 9.7 Multiple protostars

Required. A user must be able to create two or more collapse centers and observe:

- competition for mass;
- orbital motion at reduced order;
- disk distortion;
- outflow interaction;
- ejection or merger outcomes where the chosen model permits them.

## 9.8 Long-time playback

Formation mode must support apparent evolution over thousands to millions of years through accelerated integration and state transitions. The science panel must identify where continuous numerical integration ends and model-state transitions begin.

---

# 10. PLASMA AND MAGNETIC CONFINEMENT SYSTEM — PLASMA CAGE DOMAIN

This system must preserve the visceral fantasy of grabbing field structures and sculpting a violently luminous plasma.

## 10.1 Magnetic confinement lattice

The user can deploy field generators in any applicable environment:

- dipole node;
- ring/coil;
- solenoidal segment;
- toroidal loop;
- quadrupole pair;
- spline-defined coil/field guide;
- preset cage geometries.

These are interaction abstractions. They may be visualized as luminous nodes, rings, rails, or subtle field hardware depending on the environment.

## 10.2 Field evaluation

Prefer analytic magnetic-field contributions from field elements, summed per simulated charged particle or sampled onto a field grid when necessary.

Compute charged-particle motion with a bounded Lorentz-force approximation where appropriate:

- velocity response to electric/magnetic field proxy;
- configurable charge-to-mass proxy;
- damping/collisions as reduced-order terms;
- thermal spread;
- boundary interaction;
- optional density feedback.

Do not imply kinetic plasma accuracy beyond the implemented model.

## 10.3 Plasma representation

Use:

- GPU simulation particles for charged motion;
- density/temperature emissivity volume for visual body;
- tracer filaments for coherent flow structures;
- ribbon/line rendering for current-like or field-aligned structures;
- volumetric bloom/scattering for luminous density;
- sparse high-energy particles for ejected material.

## 10.4 Direct manipulation

The user must be able to:

- grab a field node and move it while simulation runs;
- rotate a coil/field structure;
- increase/decrease field strength;
- change polarity;
- resize a field element;
- create asymmetry;
- twist the confinement geometry;
- intentionally perturb the plasma;
- disable a field component instantaneously;
- restore the prior configuration through rewind.

## 10.5 Required visible plasma behaviors

The model and VFX together must support qualitatively distinct states:

- calm confinement;
- filamentation;
- pinch/constriction;
- braided/twisted flow;
- oscillation;
- edge turbulence;
- kink-like deformation;
- tearing/reconnection-like events;
- ejection;
- partial confinement loss;
- catastrophic confinement failure.

Some of these will be reduced-order or illustrative. Record their status explicitly.

## 10.6 Field-line view

A dedicated visual layer must seed and integrate field lines through the combined magnetic field. Field lines must update interactively as nodes move.

Requirements:

- selectable density;
- directional flow cues;
- color may encode strength or direction but never be the only semantic cue;
- lines fade by distance/importance;
- avoid turning the screen into spaghetti;
- field view may be combined with plasma or shown as a temporary analysis layer.

## 10.7 Reconnection surrogate

If true resistive MHD is not implemented, create a clearly labeled surrogate event triggered when field topology, shear, current-density proxy, and opposing field regions meet defined thresholds. The surrogate may release stored visual/particle energy, change connectivity, and eject material.

It must not be described as a quantitatively predictive reconnection solver.

## 10.8 Cosmic integration

The same field tools may operate around:

- ionized protostellar gas;
- stellar corona-like plasma;
- protostellar jets;
- charged accretion flows;
- laboratory-chamber plasma preset.

They may **not**:

- cancel gravity;
- magnetically hold an event horizon in place;
- directly push a neutral star as though it were one charged particle;
- override causal limits near or inside an event horizon.

---

# 11. BLACK HOLE AND RELATIVISTIC VISUAL SYSTEM — SINGULARITY DOMAIN

## 11.1 Black-hole parameters

Expose in the advanced inspector:

- mass;
- dimensionless spin parameter or a documented simplified spin control;
- orientation/spin axis;
- accretion-disk mass/brightness proxy;
- disk orientation;
- environment density;
- incoming-object trajectory.

The user should be able to create multiple presets ranging from stellar-mass to supermassive black-hole visual scales, but the active local frame must normalize the rendering to avoid precision loss.

## 11.2 Feedable objects

Required:

- star;
- protostar created by the user;
- gas cloud;
- ionized/plasma stream;
- asteroid/debris swarm;
- compact object proxy;
- disk clump;
- arbitrary saved matter selection where technically valid.

The user can position and launch the object with editable approach vector and speed.

## 11.3 Orbit outcomes

The model must visibly distinguish at least:

- flyby/deflection;
- bound orbit/capture;
- grazing encounter;
- tidal disruption;
- direct infall;
- disk intersection;
- partial stripping.

## 11.4 Matter dynamics near the hole

Do not default to full numerical GR. Prototype a physically motivated approximation suitable for interactive matter trajectories, for example:

- Newtonian gravity far from the hole;
- pseudo-Newtonian or post-Newtonian correction near the inner region;
- dedicated normalized relativistic local model for close approach;
- geodesic integration only for selected bodies/rays where computationally practical.

Document the exact boundary between these methods.

## 11.5 Tidal disruption

A star entering a strong differential-gravity region must visibly deform before disruption.

Recommended representation:

- one coherent star render while tides are weak;
- GPU particle/shell or deformable proxy for the stellar body;
- differential gravitational acceleration across particles or vertices;
- cohesion/pressure surrogate that weakens after the tidal threshold;
- progressive elongation;
- leading/trailing debris streams;
- fallback material entering eccentric orbits;
- some material joining the accretion flow;
- emission brightening as density/temperature proxy rises.

Do not simply scale the star mesh into a noodle and delete it.

## 11.6 Accretion disk

Render the disk as a dynamic turbulent structure, not a flat glowing texture.

Required visual behaviors:

- differential rotation;
- radial temperature/emissivity gradient;
- bright inner region;
- transient knots/lanes;
- material injection from disrupted objects;
- shearing of injected material;
- optional disk warp/precession if implemented;
- charged portions responding to magnetic-field tools outside the horizon.

## 11.7 Gravitational lensing

This is a flagship visual feature.

The lensing system must distort:

- background star field;
- Milky Way/nebula background where present;
- accretion-disk image;
- bright sources passing behind the black hole;
- nearby eligible objects where the chosen rendering technique permits depth-aware compositing.

Prototype a real ray-bending approach. Acceptable strategies include:

- precomputed ray-deflection lookup table indexed by impact parameter and camera geometry;
- shader integration of Schwarzschild null geodesics for a bounded region;
- a hybrid LUT + analytic approximation;
- later Kerr-specific extension for spin if Gate 0 proves it feasible.

A generic fisheye distortion is not acceptable as the final effect.

## 11.8 Relativistic brightness and color

Accretion-disk appearance should include a physically motivated approximation of:

- Doppler brightening/beaming on the approaching side;
- dimming on the receding side;
- gravitational redshift near the inner region;
- view-angle dependence;
- photon-ring/shadow-like appearance where supported by the lens model.

Science mode must identify whether these are calculated or stylized.

## 11.9 Spin

Spin is required as a user parameter. However, do not fake full Kerr rendering if only Schwarzschild lensing exists.

Implementation levels:

- Level 1: spin affects disk orientation, characteristic inner-radius proxy, rotational motion, and visual asymmetry, labeled reduced-order;
- Level 2: spin affects matter trajectories with a documented approximation;
- Level 3: Kerr light-ray integration and frame-dragging effects, only if the prototype proves them practical.

Never label Level 1 as full Kerr physics.

## 11.10 Camera near the black hole

The user must be able to:

- orbit above/below disk;
- move toward edge-on view;
- chase an incoming star;
- fly alongside a tidal stream;
- focus on the black-hole shadow;
- detach and freely orbit while time is paused;
- inspect the background warping from different angles;
- retreat rapidly to system scale.

The camera may approach the event horizon visually but the application must not claim a physically valid observer trajectory through or inside it unless a specific model supports that behavior.

---

# 12. CROSS-DOMAIN COUPLING

This section is what prevents the project from becoming three minigames.

## 12.1 Matter continuity

A cloud particle/clump may become:

`cloud → disk material → protostellar mass → stellar material → ionized ejecta/debris → accretion tracer`

Preserve provenance through these transformations.

## 12.2 Field continuity

The same magnetic-field infrastructure is used in:

- laboratory containment;
- ionized star-forming gas;
- protostellar jets;
- stellar plasma;
- charged accretion flow.

## 12.3 Gravity continuity

The same gravitational body registry owns:

- clump centers;
- protostars;
- stars;
- compact objects;
- black holes.

Different solvers may operate by scale, but entity identity must survive handoff.

## 12.4 Stellar evolution bridge

The experience may need to move from protostar to massive star to compact collapse without literally simulating millions of physical years at fine resolution.

Implement a documented event/state bridge:

- formation state;
- stable stellar state proxy;
- aging/evolution milestones;
- massive-star collapse eligibility;
- remnant selection;
- black-hole formation for qualifying presets.

This is **not** a full stellar evolution code. It is an explicit reduced-order transition system so the complete product can connect formation to black-hole states honestly.

## 12.5 User-created object preservation

The user should be able to save a formed star/protostar/plasma configuration and later use it as an incoming object in a black-hole encounter.

## 12.6 Magnetic limits near black holes

Fields may shape plasma outside the event horizon and influence charged accretion. They do not manipulate the black hole itself. Preserve that boundary in both code and copy.

---

# 13. RENDERING ARCHITECTURE

The visual bar is flagship-level interactive science fiction grounded in physical structure. Avoid generic neon-space wallpaper, noisy particle soup, cheap lens flares, permanently glowing everything, and demo-scene aesthetics.

## 13.1 Renderer decision

Default candidate:

- Three.js `WebGPURenderer`;
- Three.js Shading Language (TSL) for custom materials and compute;
- WebGPU compute for high-count particles, reductions, field/density updates, and selected volume operations;
- Three.js node-based post-processing;
- explicit reduced WebGL 2 path where feasible.

Important current constraint: `WebGPURenderer` is still described by Three.js as experimental, and WebGPU is not universally available. Therefore **Gate 0 must prove this renderer path before broad production implementation**.

Do not assume WebGPU compute automatically falls back to WebGL 2. Design separate lower-tier implementations for features that depend on storage buffers, compute shaders, or 3D storage textures.

## 13.2 GPU-first visual populations

Keep these primarily on the GPU:

- molecular-cloud tracers;
- dust;
- plasma particles;
- accretion tracers;
- sparks/high-energy ejecta;
- debris dust;
- field-line sampling helpers;
- stars in background field;
- volumetric density samples;
- flow vectors;
- ephemeral VFX.

Do not create one JavaScript object per visible particle.

Use storage buffers, instancing, points, linked-particle/ribbon methods, indirect-friendly batching where supported, and tightly packed typed data.

## 13.3 Procedural-first asset philosophy

Most of this experience should be procedural:

- nebula density;
- star field;
- accretion disk;
- plasma;
- field lines;
- tidal streams;
- black-hole lensing;
- jets;
- volumetric haze;
- shock-like shells;
- glow structures.

Use external 3D assets only for meaningful chamber hardware, optional scientific instruments, or scenario framing. Keep provenance/license records for any external asset.

---

# 14. STAR FIELD AND DEEP-SPACE BACKGROUND

The background is not wallpaper. It is a **navigation, scale, exposure, lensing, and orientation instrument**. The black-hole experience only works if the universe behind it contains stable, high-dynamic-range structure worth bending.

## 14.1 Layered star environment

Build the background from several deterministic layers rather than one sky texture:

1. **Inertial deep-star catalog layer** — procedurally seeded or data-backed spherical star distribution with stable identifiers, magnitude, color-temperature proxy, and direction.
2. **Near-field parallax layer** — a bounded population of spatially positioned bright stars/dust structures used when traveling large distances so the user perceives translation, not merely rotation inside a sky dome.
3. **Galactic-density layer** — restrained Milky-Way-like stellar density and dust lanes, preferably procedural/volumetric or high-resolution tiled representation, never a visibly static JPEG.
4. **Sparse distant-galaxy layer** — extremely subtle extended objects that become useful scale anchors and additional lensing targets.
5. **Scenario-local dust/nebular layer** — only where physically/contextually appropriate; do not paint every black background purple.

## 14.2 Optical requirements

- no random vacuum twinkling;
- stable temporal sampling with no shimmer when the camera is still;
- nonuniform brightness distribution with genuinely rare bright stars;
- physically plausible color range rather than rainbow confetti;
- HDR emission with exposure-aware point spread/glow;
- very distant sources remain visually stable while near-field anchors provide parallax;
- no cube-map seams or obvious spherical texture poles;
- enough angular detail that strong black-hole lensing produces arcs, duplicate images, compressed star fields, and ring-like alignments that can be visually followed;
- deterministic source IDs so a star can be selected before lensing and recognized after lensing.

## 14.3 Star field as a navigation instrument

The user should be able to orient by the sky without a compass HUD. Preserve inertial orientation through ordinary camera movement. During semantic scale transitions, crossfade/reproject layers so the star environment remains spatially coherent rather than visibly popping between skyboxes.

When moving quickly, use restrained motion/parallax cues and local dust rather than streaking every star like science-fiction hyperspace. Star streaks are allowed only as an explicitly stylized capture option.

## 14.4 Lensing integration

The star field must be available in a representation that the black-hole lensing pipeline can sample directionally. A radial post-process bulge is not sufficient. The lensed result must remain camera-angle dependent and spatially stable as the user orbits.

## 14.5 Exploration polish

- exposure adaptation should be gradual and bounded;
- approaching a bright protostar should dim the apparent deep field naturally rather than simply overlaying white bloom;
- moving behind dense molecular material should attenuate/redden appropriate background structure;
- optional “dark-adapted” accessibility/photo mode may lift faint objects without adding UI;
- clean-screen screenshots should look like intentional astronomical imagery at almost any camera angle.

---
# 15. NEBULA AND MOLECULAR-CLOUD VISUALS

The cloud should read simultaneously as volume and flow.

Required layers:

1. low-frequency volumetric density;
2. higher-frequency filament detail;
3. particulate dust/tracer motion;
4. local density/emission enhancement around collapse regions;
5. cavities/outflows carved by protostellar jets;
6. backlit scattering against stars/protostars;
7. extinction/occlusion where density is high enough.

Preferred implementation:

- 3D density texture or layered procedural field in WebGPU tier;
- raymarched volume with adaptive steps and temporal jitter;
- GPU particles embedded within the volume to reveal flow;
- reduced sliced volume / billboard cloud fallback in lower tier.

Do not let volume rendering consume the entire frame budget. Dynamically reduce ray steps with distance and during fast camera motion.

---

# 16. PROTOSTAR AND STAR RENDERING

Stars must not be simple emissive spheres.

Use layered rendering:

- photosphere/surface proxy;
- limb treatment;
- animated convection/noise at appropriate scale;
- corona/charged outer material where enabled;
- nearby dust illumination;
- optional prominence/flare structures when relevant to the active model;
- overexposure/bloom controlled enough that surface form remains visible when the camera approaches.

Protostars should look materially different from mature stars:

- obscuring envelope;
- hot central glow;
- rotating disk;
- bipolar cavities/outflows;
- variable accretion brightness.

Use physically motivated color/temperature mapping in science mode; cinematic mode may apply restrained exposure/tone mapping without inventing arbitrary neon colors.

---

# 17. PLASMA VISUALS

Plasma should have internal structure, not look like transparent fog with bloom.

Required visual cues:

- coherent streamlines/filaments;
- density knots;
- velocity shear;
- twisted rope-like regions;
- constriction/pinch;
- boundary turbulence;
- expelled particles;
- changing emissivity with energy/density proxy;
- magnetic field lines as optional analytical layer;
- rapid topology change during reconnection surrogate.

Use a hybrid of:

- compute particles;
- ribbons/linked particles;
- volumetric density emissivity;
- field-aligned sprites;
- sparse sparks/high-energy particles;
- postprocessed emission and volumetric light.

Avoid making all plasma opaque. Depth must remain readable.

---

# 18. BLACK-HOLE VISUAL PIPELINE

## 18.1 Render order

Use an offscreen/deferred structure that allows the black-hole region to bend background and disk imagery.

A viable architecture:

1. render distant environment/star field to a texture or directional representation;
2. render lensed celestial background through the black-hole ray mapping;
3. render accretion disk with lens-aware sampling/warping;
4. render lensed eligible near-field matter where practical;
5. composite foreground matter not affected by the lens pass;
6. apply restrained post-processing.

The exact implementation may vary after prototyping.

## 18.2 Black-hole shadow

The central object must not be represented as a black sphere with glow. The perceived shadow, distorted disk, photon-ring-like structures, and warped background must result from the rendering model.

## 18.3 View dependence

As the camera moves above, below, and edge-on to the disk, the image must change substantially. Edge-on views should show strong warping of disk imagery.

## 18.4 Background lensing

Stars moving behind the hole as the camera orbits should visibly distort. Bright sources may form arcs/ring-like structures when geometry aligns.

## 18.5 Exposure

The disk can be extremely bright while the hole remains readable. Use HDR rendering, filmic tone mapping, bloom thresholding, and adaptive exposure only if they preserve user control and do not create nausea/flicker.

---

# 19. TIDAL-DISRUPTION VISUAL SYSTEM

The tidal event should be one of the signature experiences.

Stages:

1. normal star approach;
2. subtle elongation;
3. asymmetric surface flow;
4. leading/trailing stretching;
5. material stripping;
6. coherent stream formation;
7. full disruption or surviving core;
8. fallback/debris orbital wrap;
9. disk interaction;
10. brightening and long-tail aftermath.

Requirements:

- user may pause at each stage;
- free camera remains available;
- matter should preserve provenance;
- debris density must thin naturally rather than disappear abruptly;
- emission should follow density/energy rules rather than random spark spam;
- camera director may offer dramatic viewpoints but cannot steal manual control;
- extreme close-up should reveal stream structure rather than billboard artifacts.

---

# 20. MAGNETIC FIELD VISUALIZATION

Magnetic fields are invisible physically; the visualization is an analytical overlay.

Provide three display modes:

- **minimal:** only selected field node and local directional hints;
- **flow:** sparse animated field lines around active plasma;
- **analysis:** denser field-line topology, strength/direction encodings, selected cross sections.

Field lines should be traced from deterministic seed points and advected/recomputed as field nodes move.

Do not draw thousands of equally bright lines. Apply importance sampling, depth fading, temporal coherence, and culling.

---

# 21. POST-PROCESSING AND CINEMATIC FINISH

Required but restrained:

- HDR tone mapping;
- emissive bloom with threshold;
- subtle volumetric light;
- depth of field only in optional cinematic/photo mode;
- motion blur only if stable and disableable;
- temporal anti-aliasing or best supported alternative if compatible;
- subtle chromatic effects only when physically motivated or clearly stylistic;
- optional filmic grain at extremely low intensity;
- no permanent vignette obscuring the scene;
- no heavy lens dirt.

Support **Reduced Effects** and **Reduced Motion** modes.

---

# 22. CAMERA SYSTEM — THE CAMERA IS PART OF THE SIMULATION

Camera quality is as important as the physical model. The user should feel that they are **inside an impossible observatory**, not steering a generic orbit-control widget.

## 22.1 Default camera behavior is contextual

Do not force a visible camera-mode selector for normal use. Infer the likely camera behavior from target and gesture:

- drag empty space: rotate/free-look around current scale anchor;
- drag around focused object: orbit it;
- wheel/pinch: exponential dolly/semantic zoom;
- double-click/double-tap object: focus and ease to a useful inspection distance;
- WASD/arrow/gamepad stick: free flight when not directly manipulating matter;
- hold the focus command while moving: maintain a tracked target;
- manual input always interrupts automatic framing.

Explicit camera presets remain available through a temporary camera wheel/shortcut, but should not be necessary for basic exploration.

## 22.2 Required camera capabilities

- **Context Orbit** — smooth orbit around selected/focused target.
- **Free Flight** — six-degree movement with scale-aware speed and optional pointer lock.
- **Focus / Reframe** — smoothly acquire selected matter, field, event, or compact object.
- **Chase** — follow an incoming star, compact object, debris stream, jet packet, or selected clump.
- **Disk Orbit** — maintain a controlled inspection orbit around protostellar or black-hole accretion disks.
- **Tidal Stream Ride** — move along a disruption stream while retaining user yaw/pitch freedom.
- **Field-Line Ride** — follow a selected field/flow line through the plasma volume.
- **Jet Ride** — travel with a protostellar or accretion-driven outflow surrogate.
- **Photon-Path View** — in science peek mode, follow or inspect representative bent light rays near a black hole.
- **Black-Hole Shadow** — maintain framing around the lensed central region while still permitting orbit and dolly.
- **Wide System** — instant but smooth reframe of the active simulation extent.
- **Event Return** — jump back to the most recent significant event after exploratory camera travel.
- **Director** — optional cinematic framing based on event importance.

## 22.3 Scale-aware travel

Use exponential motion speed, floating origin, and semantic scale anchors so the user can travel from wide molecular-cloud scale to disk scale to stellar surface proxy to near-horizon inspection without a loading screen or obvious coordinate reset.

Required qualities:

- wheel/pinch zoom never stalls at a fixed min/max because the next scale frame should take over;
- movement speed accelerates smoothly in empty space and slows near a focus target;
- transitions preserve apparent direction, focus and angular momentum where possible;
- no disorienting teleport caused by changing coordinate frames;
- give local particulate/parallax cues near otherwise featureless regions so motion remains legible;
- never use a permanent scale readout in immersive mode.

## 22.4 Manual camera sovereignty

Any pointer drag, wheel/pinch, flight input, focus selection, gamepad camera input, or touch camera gesture exits/suspends Director mode within the current interaction frame. Do not wait for a camera animation to finish.

## 22.5 Camera inertia and comfort

- use critically damped or similarly predictable easing;
- no involuntary camera shake;
- cinematic shake is opt-in and disabled by Reduced Motion;
- avoid horizon roll in lab/chamber presets unless explicitly requested;
- deep-space free flight may allow roll;
- prevent nausea-inducing acceleration spikes when scale speed changes;
- camera collision is only required around solid chamber geometry, not abstract field/particle volumes.

## 22.6 Camera memory

Maintain a short history of focus/event anchors so the user can move deep into a structure and return without navigating a list. Back/forward focus commands should traverse this history. Camera bookmarks may be saved with a scenario and branch.

## 22.7 Clean capture

Because immersive mode is already chrome-free, screenshots should require no “hide UI” cleanup pass. Provide optional deterministic camera-path capture and still bookmarks after the core experience is stable. Do not prioritize video export over simulation quality.

---

# 23. DIRECTOR AND EVENT-AWARE FRAMING

The Director is an **assistant camera**, never the owner of the experience.

## 23.1 Event detection

Maintain an event stream for meaningful transitions such as:

- collapse threshold crossed;
- first stable protostar;
- disk formation;
- jet burst/cavity opening;
- binary/competing protostar close pass;
- plasma pinch or filament merger;
- instability growth crossing a visual threshold;
- reconnection surrogate;
- confinement failure;
- black-hole capture/flyby boundary;
- tidal threshold crossing;
- first material stripping;
- debris stream wrap/fallback;
- accretion brightening;
- strong source alignment/lensing event.

Events automatically become rewind/checkpoint annotations even if the timeline is hidden.

## 23.2 Director behavior

- prefer continuous moves over gratuitous cuts;
- maintain spatial comprehension before spectacle;
- use shot templates tied to event type;
- avoid clipping through dense matter or bright disk surfaces;
- frame with the actual event geometry, not arbitrary cinematic shake;
- keep a subtle, nonverbal **event-return cue** at the edge only if the user has manually left a currently unfolding major event;
- surrender instantly to manual input;
- never summon panels or explanatory text during a Director shot.

## 23.3 Event Echo

When the user pauses shortly after a major event, allow a transient **Replay Event** action. It restores a recent checkpoint and replays the same event from the user’s current camera or a chosen alternative camera path without destroying the current branch. This is a viewing/replay convenience, not a second simulation timeline.

---

# 24. INTERACTION SYSTEM — THE WORLD IS THE CONTROL SURFACE

The dominant interaction model is **direct manipulation of rendered phenomena**. If an action can reasonably be performed by touching the thing being changed, do that instead of requiring a slider.

## 24.1 Pointer/mouse core grammar

The final mapping may change after usability testing, but preserve these interaction families:

- primary drag on manipulable matter: grab/shape according to active contextual verb;
- primary drag on a handle/field node: move the node in 3D with plane/depth inference;
- primary drag on empty space: camera orbit/free-look when no manipulation gesture is armed;
- secondary drag: explicit camera rotation/orbit fallback;
- wheel: scale-aware zoom when exploring;
- wheel while holding a grabbed parameter gesture: alter radius/strength/depth contextually with temporary spatial feedback;
- double-click: focus target;
- long press/right-click: summon a context tool wheel at the cursor/target;
- drag-and-release a physical body: impart trajectory from the release vector with a temporary prediction arc;
- hold `Space` while dragging horizontally: temporal scrub peek when not text-editing;
- hold `Space` while dragging vertically or wheel: coarse time-rate change with a temporary nonnumeric visual indicator; exact values belong in the inspector.

Do not require keyboard modifiers for the ordinary first interaction with a scene.

## 24.2 Touch

Support:

- one-finger object selection/direct manipulation;
- two-finger camera orbit/pan equivalent;
- pinch semantic zoom;
- long press context tool wheel;
- drag-and-release trajectory gesture;
- hold-and-drag temporal scrub gesture through an explicit transient time handle so it does not conflict with camera navigation;
- large temporary hit areas without permanently large UI;
- no hover-only functionality.

Use haptics/vibration only when supported, user-enabled, and subtle: successful grab, branch fork, checkpoint snap, or instability threshold. Never vibrate continuously with particle effects.

## 24.3 Keyboard

Keyboard shortcuts exist primarily to make hidden controls fast rather than to expose a HUD.

Recommended defaults:

- `Space` tap — play/pause;
- `Space` hold + horizontal drag — scrub time;
- `J` / `L` — step/seek backward/forward;
- `K` — pause;
- `F` — focus selection;
- `Backspace` / `Shift+Backspace` — previous/next focus anchor when safe;
- `D` — Director toggle;
- `R` — return camera to selected/recent event;
- hold `T` — time peek; releasing hides it;
- hold `I` — inspector/science peek at selection; releasing hides unless pinned;
- hold `C` — camera wheel/quick viewpoints;
- hold `B` — branch/compare peek;
- `Tab` — cycle major selectable entities while UI remains hidden;
- `?` — temporary controls map, dismissed on key release/click;
- `Esc` — dismiss transient UI/exit active tool;
- `H` — force immersive clean state immediately.

Document and make rebindable where practical.

## 24.4 Gamepad / controller

A controller is a natural fit for screen-first exploration. Support when practical:

- left stick: translation;
- right stick: look/orbit;
- triggers: grab/pull and push/energy strength depending on context;
- bumpers: cycle nearby targets/context verbs;
- face buttons: pause/focus/release/event-return;
- hold menu/shoulder chord: radial tool or time wheel;
- no persistent controller legend after onboarding.

Optional SpaceMouse/6DOF input may be added as a power-user feature if a maintained browser path is available; do not make it a dependency.

## 24.5 Contextual affordance language

The cursor/reticle itself may change minimally to communicate what touching the scene will do:

- open ring: camera/navigation target;
- soft bracket: focusable body;
- compression glyph: gatherable diffuse matter;
- field-node glyph: magnetic control point;
- trajectory arc ghost: throwable body;
- tiny time-chevron only while temporal gesture is armed.

Keep these abstract, small, transient, and color-independent. They should disappear while simply watching.

## 24.6 Physics-derived helpers, not floating control panels

During manipulation, show the meaning of the action in the world:

- Gather: material bends inward and the brush volume appears as a faint gravitational/density lens;
- Disperse: outward velocity wisps and expanding shell cue;
- Spin: curved flow ribbons indicate added angular momentum;
- Energize: emissivity/velocity distribution changes in the affected volume;
- Constrain: field lines and confinement surface briefly emerge around the manipulated node;
- Feed/throw: projected orbit/encounter arc appears and updates continuously;
- Time scrub: temporal ghosting/trails reveal nearby before/after states;
- Compare: alternate branch appears as a spectral spatial ghost or hold-to-crossfade before any numeric diff is shown.

These helpers fade on release unless the user explicitly enters analysis mode.

## 24.7 Selection without labels

Do not put nameplates over bodies during normal exploration. Selection is communicated with a restrained silhouette/rim response, nearby particle response, or focus reticle. Names and numbers appear only through Peek/Inspect states.

## 24.8 Interaction conflict resolver

Centralize pointer/touch intent rather than letting camera, scene, and DOM components fight for events. Use a priority/state model roughly equivalent to:

`pinnedUI > transientUI > activeManipulation > selectedHandle > sceneObject > camera > idle`

Record pointer capture explicitly. Do not duplicate listeners across mount/unmount. Cancel incomplete gestures on blur, visibility loss, pointer cancellation, capability loss, and scenario unload.

---

# 25. UI / UX — INVISIBLE UNTIL SUMMONED

This section is a **hard product contract**, not visual preference.

## 25.1 Immersive is the default application state

The normal running simulation contains no permanent UI chrome. The viewport is the product.

During ordinary playback do **not** permanently display:

- title/logo;
- navigation bar;
- FPS;
- scenario name;
- selected-object name;
- mass, temperature, velocity, spin, field strength or time numbers;
- timeline ticks;
- charts;
- object lists;
- “mode” badges;
- control hints;
- inspector cards;
- mini-map;
- help text;
- branch labels;
- settings icons;
- debug panels;
- sliders;
- a bottom control bar.

The default visible interface may be nothing more than the rendered scene and a tiny cursor/reticle that itself fades when the pointer is inactive.

## 25.2 Chrome budget

Treat screen coverage as an acceptance criterion:

- **Immersive:** 0 persistent information panels; 0 persistent text; no permanent toolbar.
- **Peek:** at most one compact transient control cluster or one spatial wheel at a time.
- **Inspect:** one deliberate panel/drawer is allowed, but must not automatically cover the active phenomenon and must be dismissible with one action.
- **Science:** overlays may become information-rich only because the user explicitly asked for analysis.

Do not satisfy this with transparent glass panels left on screen all the time. Transparent clutter is still clutter.

## 25.3 UI state machine

Implement explicit states rather than ad-hoc visibility flags:

```ts
type UiDepth =
  | 'immersive'
  | 'peek'
  | 'inspect'
  | 'science'
  | 'settings'
  | 'accessibility'
  | 'capture';
```

Rules:

- launch/resume into `immersive` when safe;
- any transient peek returns automatically to `immersive` on release/inactivity;
- opening a pinned inspector pauses neither camera nor simulation unless the user requested pause;
- `H`/clean action always returns to immersive except when a blocking error must be shown;
- changing scenario or branch never leaves stale overlays pinned by accident;
- DOM overlay root should default to `pointer-events: none`, with pointer events enabled only for currently revealed controls.

## 25.4 Edge reveal must require intent

Do not make controls flash whenever the cursor merely passes near an edge. Require a short edge dwell, explicit corner gesture, keyboard command, or touch pull. Reveal only the cluster relevant to the edge/context.

Suggested mapping:

- bottom edge: time/playback only;
- left edge: current manipulation/tool access;
- right edge: inspector/science access;
- top edge/corner: scenario/settings/capture, which are infrequent.

After inactivity, controls dissolve smoothly and stop accepting pointer events.

## 25.5 Hold-to-peek beats open-and-close

High-frequency information should often be available while a key/button is held:

- hold `I`: object/model facts near the selected target or cursor;
- hold `T`: time state and event markers;
- hold `C`: camera viewpoints;
- hold `B`: branch comparison/fork controls;
- hold `?`: current controls.

Release should return to the scene. Allow pinning when the user actually wants prolonged analysis.

## 25.6 Context tool wheel

The tool wheel appears **at the interaction locus**, not in a permanent corner palette. It should contain only verbs valid for the current target/state. Example: neutral diffuse gas may show Gather/Disperse/Spin/Energize, while an incoming star near a black hole may show Grab/Throw/Focus/Trace/Branch.

Requirements:

- 4–8 choices maximum per invocation;
- icon + temporary label while hovered/focused;
- drag/flick selection so experienced users can choose without waiting for labels;
- disappears on selection, release, escape or inactivity;
- keyboard/gamepad equivalents;
- no nested radial-menu maze.

## 25.7 Inspector / information lens

The inspector is the correct home for words and numbers, but opening it should feel like **looking through an instrument**, not switching to a dashboard.

Two forms:

1. **Peek Lens:** transient local card/lens near the cursor or selected target with only 2–4 high-value facts and model fidelity indicator.
2. **Pinned Inspector:** side sheet/drawer for detailed values, provenance, units, assumptions, uncertainty, branch differences and research notes.

The Pinned Inspector may contain:

- selected object/type;
- mass/scale/velocity/angular momentum;
- temperature/density/ionization proxies;
- black-hole mass/spin and characteristic radii;
- field parameters;
- current fidelity class A/B/C;
- branch differences;
- source/model notes;
- uncertainty/caveats;
- exact values for parameters that are manipulated spatially in immersive mode.

Close it with one action and restore full scene ownership.

## 25.8 Pause becomes an exploration laboratory

Pausing is not merely stopping animation. When paused:

- the user can freely fly/orbit/zoom without changing simulation state;
- direct object manipulation may create a **preview** without committing until release/confirm;
- temporary trajectory ghosts, field lines and light-ray paths can be requested;
- timeline scrub shows temporal ghosts while staying reversible;
- selecting an event may preview before/after state in-place;
- the scene remains visually alive only where animation is purely presentational and does not imply advancing physical state.

Do not automatically flood the pause screen with UI.

## 25.9 Time Lens — time without a timeline bar

The timeline exists, but it should not be the default way to feel time.

Primary immersive interactions:

- tap Space: pause/resume;
- hold Space and drag horizontally: scrub through nearby history;
- hold `T`: reveal the event/time lens and event markers;
- wheel/vertical gesture while Time Lens is active: change time scale;
- snap subtly to major event checkpoints without forcing the snap;
- release: hide time UI and continue watching.

While scrubbing, show **temporal echoes** in the scene: faint previous/future particle/body positions, changing stream geometry, and event boundaries. Avoid dense timestamps unless the inspector is open.

The full expanded timeline remains available for precise seeking, logarithmic time scales, branches, and long astrophysical jumps.

## 25.10 Branch Ghost — counterfactual comparison in the same space

Do not default to split screen. The most striking comparison is spatial:

- hold Compare to crossfade A ↔ B at synchronized time;
- optional spectral ghost of branch B rendered over A for bodies/major fields/streams with careful depth handling;
- trajectory divergence trails show where histories separate;
- a single transient branch glyph indicates which state is dominant;
- split/wipe mode exists only when the spatial overlay becomes ambiguous;
- numbers and delta tables remain inside the inspector.

The user should literally see **the alternate universe peel away from the current one**.

## 25.11 Causal Trace

For entities that preserve provenance, allow the user to hold Trace and reveal a fading causal filament backward through key transformations: cloud parcel → clump → protostar → stellar/plasma material → debris/accretion tracer, or field configuration → instability → ejected packet. This is a provenance visualization, not a claim that every particle can be tracked exactly across reduced-order model handoffs.

Use aggregated ancestry IDs where full particle lineage is impossible.

## 25.12 Photon Path Peek

Near a black hole, science peek can emit a small number of representative rays from the camera through selected image features. The paths should bend according to the same lensing approximation used for the image or a documented related approximation. Do not leave a permanent ray forest on screen.

## 25.13 Scenario browser without leaving the universe

Scenario selection is infrequent and may use a full overlay, but prefer a visual browser that opens over a dimmed/frozen live scene rather than navigating to a separate web page. Each starting state should be represented by a live/procedural preview or still derived from the actual renderer where feasible.

Closing it returns exactly to the prior scene/camera/time state.

## 25.14 First-run onboarding is behavior, not instructions

No modal tutorial wall.

First use should teach through the scene:

1. a manipulable cloud region subtly reacts to pointer proximity;
2. first touch/drag visibly compresses or moves matter;
3. release cue demonstrates that the physics continues after the user lets go;
4. after the first meaningful change, a tiny transient Space glyph teaches pause;
5. after pause, one short gesture teaches temporal scrub;
6. field tools reveal only when ionized/plasma material exists;
7. feed/trajectory behavior reveals only when a relevant massive/compact object exists;
8. after the user succeeds once, hints never become permanent chrome.

Allow onboarding to be reset or disabled.

## 25.15 Errors are the only legitimate interruptions

Blocking states—WebGPU initialization failure with no fallback, corrupted save, unrecoverable device loss—may present a centered readable message. Recoverable warnings should use a brief corner notice and then disappear. Do not turn routine quality adaptation or successful actions into toast spam.

## 25.16 Accessibility may intentionally increase UI

The visual-minimalism rule must never prevent access. Screen-reader mode, high-contrast controls, persistent captions, keyboard focus aids, reduced motion, or explicit persistent controls may be enabled by the user. Accessibility exceptions are intentional alternate presentation modes, not violations of the immersive default.

## 25.17 Signature interaction: Cosmic Hand

The default direct-manipulation metaphor is a **field of influence attached to the user’s pointer/gesture**, not a visible hand model and not a floating slider. Depending on context it can gather, disperse, torque, energize, cool, or redirect diffuse matter.

Requirements:

- the influenced volume is visible only while engaged;
- strength/radius are communicated by spatial deformation, motion and a transient boundary, not permanent numbers;
- the user can grab a dense clump and drag it while surrounding diffuse matter reacts coherently;
- releasing hands control back to the solver immediately;
- the same basic grab/release muscle memory carries into throwing a star or moving a field node.

## 25.18 Signature interaction: Magnetic Loom

Field control should feel like **weaving structure through plasma**.

- field nodes/loops are placed directly in 3D;
- dragging a node bends/reorients the field and plasma reacts during the gesture;
- twisting two nodes should visibly braid or shear field-aligned flow where the chosen reduced-order model supports it;
- a temporary field surface/line scaffold appears only near the active manipulation;
- field topology can be frozen and inspected while paused;
- exact current/strength/geometry values remain in the Inspector for precision users.

Do not pretend arbitrary hand-drawn field lines are physical magnetic fields. The visual scaffold must derive from the actual field representation used by the solver.

## 25.19 Signature interaction: Throw Into Darkness

Any supported condensed body/star/debris packet should be launchable by direct grab-and-release.

While held:

- display a predicted encounter/orbit ghost based on the current approximation;
- highlight periapsis/closest-approach region spatially without a permanent numeric label;
- allow wheel/pinch/depth gesture to alter launch energy or depth plane;
- update black-hole encounter classification preview—escape/flyby/capture/tidal-risk—through trajectory shape/color/pulse, with exact terminology and values only on peek.

On release, the preview disappears and the simulation owns the object.

## 25.20 Signature interaction: Scale Dive

The user should be able to pick something visually interesting and **fall through scale** without opening a hierarchy browser.

Examples:

- molecular cloud → dense filament → protostellar envelope → disk → local plasma/outflow structure;
- accretion stream → disk structure → near-shadow/lensed sky;
- wide binary nursery → individual protostar → jet knot.

At each scale, swap/add detail representations deliberately. Never imply that illustrative micro-detail is a literal continuation of a solver that does not resolve it. Preserve focus, orientation, and visual continuity through the handoff.

## 25.21 Signature interaction: Moment Marks

The simulation should quietly remember meaningful moments. Major event detections create invisible bookmarks. The user may also tap a bookmark command to capture the current time, camera and selected target without opening a naming dialog.

When the Time Lens is summoned, these moments appear as sparse event glyphs. Selecting one previews the event from the current camera; pinning/naming is optional and lives in Inspect state.

## 25.22 Signature interaction: Observer Shift

For relativistic scenes, allow the user to compare selected **viewpoint models**, not merely camera positions:

- distant/static-style observer approximation;
- camera following an infalling/encountering body when the implemented model supports it;
- ordinary free camera rendering.

This must be framed as a visualization/observer-mode feature with documented limits. Do not claim a fully rigorous relativistic local frame unless implemented. The value is experiential: the same encounter should look meaningfully different depending on where and how it is observed.

## 25.23 Signature interaction: Light Peel

In black-hole scenes, a press-and-hold science gesture can temporarily reduce selected foreground emission and reveal how the lensed star field and accretion imagery are being constructed. Combine:

- representative photon paths;
- unlensed/lensed hold-to-crossfade for the background;
- optional direct-image versus higher-order-image emphasis if the renderer models them;
- no permanent legend until the inspector is pinned.

This is a learning instrument embedded directly in the visual event.

## 25.24 Signature interaction: Silent Watch

The product needs a deliberately passive state. If the user stops interacting, **everything except the universe disappears**. Cursor fades. Chrome is absent. Hints stop. Director remains off unless explicitly enabled. The simulation continues and audio may settle into sparse sonification.

This is not an attract mode. It is the default proof that the project can stand on its imagery and simulation rather than on its interface.

## 25.25 Viewport-occupancy budget

Treat screen area as a scarce simulation resource.

- **Immersive:** 0% persistent informational chrome. The scene may own 100% of the viewport.
- **Peek:** target roughly 0–15% screen occupancy, or use target-anchored/radial affordances that do not cover the active phenomenon. Never expand a Peek into a full inspector automatically.
- **Inspect:** target no more than roughly one third of the viewport on desktop when practical. Choose the least information-dense side dynamically and keep the selected phenomenon visible.
- **Mobile Inspect:** overlays may temporarily occupy more space because of device constraints, but dismissal must restore the full scene in one gesture and the main loop must still be possible without pinning them.

These are design budgets, not excuses to shrink text below accessibility requirements. If information cannot fit without harming legibility, require an explicit Inspect state instead of polluting Immersive mode.

## 25.26 No accidental edge chrome

Do not reveal production controls merely because the cursor happens to approach a screen edge. Edge-hover interfaces create unwanted UI during camera exploration. A control surface may originate from an edge, but it requires intentional invocation: click/tap a dormant affordance, press-and-hold, keyboard command, long press, or accessibility preference.

The default pointer path across the viewport must never repeatedly wake toolbars.

## 25.27 World Whispers — teach affordance through response

Before showing a label or tooltip, let eligible matter/body/field geometry subtly acknowledge an exploratory pointer or touch:

- diffuse matter develops a tiny local drift or density shimmer near a valid Cosmic Hand grab;
- a movable field node reveals one brief field-line pulse;
- a throwable body produces a tiny trajectory hint only after press/drag begins;
- a focusable object may gain a restrained silhouette/rim response;
- a strong lensing region may reveal one representative bent light path after a deliberate hold.

These responses are not decorative hover effects. They are the onboarding language of the universe and must be quiet enough that passive observation remains clean.

## 25.28 Temporal Wake

While the Time Lens is actively scrubbing, optionally show a bounded temporal wake around selected/high-importance matter: several semi-transparent prior/future state samples, particle-flow ribbons, or trajectory envelopes derived from real checkpoint/replay data. This lets the user perceive *how the system is changing through time* without looking at a graph.

The wake disappears on release. Do not render arbitrary ghost positions that are not tied to actual reconstructed states.

## 25.29 Frozen Catastrophe inspection

Pause at the instant of a major event must preserve the event as an explorable spatial object rather than collapsing visual systems into an idle state. When technically feasible, freeze/interpolate volumetric density, debris positions, field traces, lensing state, outflow geometry, and transient emissive structures consistently enough that the camera can move around the moment.

This is a signature experience: the user should be able to stop an impossible event at peak violence and *move the camera through its structure*. Effects that are purely screen-space and cannot survive viewpoint change should be minimized for major phenomena.

## 25.30 Exploration must never be held hostage by onboarding

All tutorials, guided sequences, Director suggestions, and scenario recommendations are optional layers. A returning or confident user must be able to enter the universe immediately, dismiss all instruction in one action, and retain the entire manipulation/camera/time loop. Do not gate core controls behind completed tutorial steps.

---

# 26. ACCESSIBILITY

The minimal visual surface must not remove accessibility.

Requirements:

- semantic DOM controls for all primary UI actions;
- keyboard operation for play/pause, timeline, camera focus, branch switching, and tool selection;
- visible focus states when UI is revealed;
- screen-reader labels for icon buttons;
- screen-reader live-region summaries for major simulation events when enabled;
- no color-only meaning for field strength, state, warnings, or branch identity;
- reduced-motion mode;
- reduced-flash mode;
- option to reduce bloom/emissive intensity;
- captions/text equivalents for sonification cues;
- touch targets sized appropriately;
- high-contrast UI option;
- no forced camera shake.

Reduced Motion must suppress or soften rapid camera moves, auto-director cuts, excessive particle streaking, and nonessential transitions without stopping the simulation itself.

Add a **Persistent Controls** accessibility preference that intentionally keeps a compact semantic control strip visible. It is off by default but must be first-class and fully supported rather than forcing users who need explicit controls to fight the hidden-UI design.

---

# 27. AUDIO AND SONIFICATION

Space is not carrying audible sound to an observer. Do not present cinematic audio as literal vacuum acoustics.

Provide an **interpretive sonification layer** that maps simulation state to audio. Audio should reinforce scale and interaction without becoming a replacement HUD. At rest, allow substantial silence and low ambient texture; do not continuously announce every parameter change. Map:

- low-frequency mass/gravity presence;
- density/turbulence texture;
- plasma instability tension;
- field reconnection surrogate transient;
- accretion intensity;
- tidal threshold transition;
- branch compare cues.

Science mode should identify audio as sonification/interpretation.

Audio requirements:

- user-initiated browser unlock;
- master volume;
- effects/sonification separation;
- mute;
- reduced-intensity option;
- no mandatory audio for understanding state.

---

# 28. APPLICATION ARCHITECTURE

Prefer a small explicit architecture over framework sprawl.

## 28.1 Baseline stack

Candidate stack:

- TypeScript with strict mode;
- Vite or equivalent minimal modern bundler;
- Three.js;
- `WebGPURenderer` + TSL as the primary high-fidelity candidate after Gate 0;
- Three.js node post-processing;
- Web Workers for CPU-heavy non-render orchestration where profiling proves value;
- IndexedDB for local saves/checkpoints where needed;
- Playwright for browser smoke/end-to-end tests;
- Vitest or equivalent for deterministic unit tests;
- optional Rapier only for bounded rigid-body subproblems that benefit from it, not as a universal cosmic physics engine.

Do not add React solely to draw a hidden control dock. If an existing repository is already React-based, preserve the existing application architecture and keep high-frequency simulation state outside React render cycles.

## 28.2 Core modules

Use clear ownership boundaries similar to:

```text
src/
  app/
    App.ts
    AppState.ts
    CapabilityProbe.ts
    QualityManager.ts
  render/
    RendererHost.ts
    RenderGraph.ts
    ScaleFrameRenderer.ts
    StarfieldRenderer.ts
    NebulaRenderer.ts
    StellarRenderer.ts
    PlasmaRenderer.ts
    FieldLineRenderer.ts
    BlackHoleRenderer.ts
    AccretionRenderer.ts
    TidalDisruptionRenderer.ts
    PostFX.ts
  simulation/
    SimulationWorld.ts
    TimeController.ts
    CommandLog.ts
    CheckpointStore.ts
    BranchManager.ts
    MatterRegistry.ts
    GravitySystem.ts
    FormationSystem.ts
    AccretionSystem.ts
    PlasmaSystem.ts
    MagneticFieldSystem.ts
    TidalSystem.ts
    StellarEvolutionBridge.ts
    RelativisticMatterApproximation.ts
  interaction/
    InputRouter.ts
    ToolController.ts
    SelectionManager.ts
    CameraController.ts
    DirectorController.ts
  ui/
    EdgeDock.ts
    ToolWheel.ts
    Timeline.ts
    Inspector.ts
    ScienceLayer.ts
    AccessibilityAnnouncer.ts
  scenarios/
    presets.ts
    scenarioSchema.ts
  persistence/
    SaveCodec.ts
    ScenarioExport.ts
  workers/
    ...
  tests/
    ...
```

This is illustrative, not a mandate to create empty abstractions. Keep modules cohesive and avoid god classes.

## 28.3 Simulation/render separation

Rendering must not be the authoritative simulation state.

Simulation owns:

- object identity;
- branch/time state;
- mass bookkeeping;
- field parameters;
- user commands;
- checkpoint data;
- model transitions.

Rendering owns:

- GPU buffers/textures;
- interpolation;
- LOD;
- visual tracers;
- post-processing;
- camera-visible helpers.

## 28.4 Fixed-step and domain steps

For interactive regimes, use fixed or bounded deterministic stepping where possible. Render interpolation occurs independently.

Long-timescale formation should use larger adaptive/event steps behind the universal timeline; near-black-hole events may use smaller local substeps.

## 28.5 No global mutable soup

Avoid unrelated singleton state. Pass explicit simulation contexts or services. Dispose GPU resources deterministically when scenarios unload.

---

# 29. GPU COMPUTE STRATEGY

## 29.1 Candidate GPU workloads

Prototype WebGPU/TSL compute for:

- particle position/velocity integration;
- charged-particle response to magnetic fields;
- visual tracer advection;
- parallel reduction for density/center-of-mass statistics;
- density splatting/aggregation where supported;
- ping-pong scalar/vector textures;
- field-line seed integration if performant;
- high-count accretion/debris updates;
- selected volume simulation helpers.

Current Three.js examples demonstrate compute particle workloads, compute points, fluid particles, ping-pong textures, compute water, volumetric fire, volumetric clouds, and GPU reductions. Treat those as evidence that the primitives exist, not proof that this product automatically meets its performance requirements.

## 29.2 Storage textures

WebGPU-only storage 3D textures may be used for density/emissivity/field volumes. They require a deliberately separate fallback path.

## 29.3 GPU readback

Avoid frequent GPU→CPU readback. Read back only bounded aggregate state/checkpoints when required. Keep most visual data GPU-resident.

## 29.4 Adaptive particle counts

Quality manager controls particle count by subsystem and device tier.

Example starting targets to validate, not assumptions:

- High: 500k–1.5m total visual particles depending on scene;
- Medium: 200k–500k;
- Low: 50k–200k;
- simulation/mass particles remain much fewer than visual tracers.

The agent must measure actual frame time and tune these numbers. Do not ship a million particles because an isolated demo can draw them.

---

# 30. OPTIONAL RAPIER USE

Rapier is not the gravitational solver for this project.

Use Rapier only if a bounded scenario contains rigid objects whose collisions matter, such as:

- experimental chamber hardware fragments;
- detached containment structures;
- large debris pieces in a stylized chamber failure;
- optional physical props.

If used:

- pin exact package version;
- use fixed simulation steps;
- enable CCD only for fast objects that need it;
- use snapshots for rewindable rigid-body state;
- preserve deterministic object creation order;
- document any nondeterministic inputs outside Rapier.

Do not represent stars, gas clouds, or black holes as ordinary Rapier rigid bodies and call that astrophysics.

---

# 31. SAVE, EXPORT, AND REPLAY FORMAT

Provide versioned scenario persistence.

A save must include:

- schema version;
- build version;
- branch tree;
- scenario seed;
- universal timeline position;
- matter registry state;
- major object states;
- field-node definitions;
- user tool state if relevant;
- camera bookmark(s);
- fidelity/quality mode;
- command log since last full checkpoint;
- checkpoint references or compressed state where feasible.

Do not save millions of ephemeral visual particles when they can be reconstructed.

Support:

- local named saves;
- export/import JSON or compressed binary wrapper;
- deterministic scenario seed sharing where possible;
- optional shareable URL for compact presets, not giant runtime snapshots.

Reject incompatible save versions cleanly with migration or an explicit error.

---

# 32. PERFORMANCE BUDGETS

These are engineering targets to test, not pre-verified claims.

## 32.1 Desktop target

For the representative Gate 0 scene on a modern supported desktop browser/device:

- target 60 FPS during normal interaction;
- frame-time median near or below 16.7 ms;
- avoid repeated spikes above 33 ms during stable playback;
- camera interaction must remain responsive under heavy visual load;
- no unbounded GPU memory growth across scenario resets.

## 32.2 Laptop/integrated target

On a representative modern integrated-GPU or Apple-silicon laptop:

- target 45–60 FPS in Medium mode where possible;
- minimum acceptable sustained interactive rate: 30 FPS in reduced mode;
- no catastrophic thermal/performance decay during a 10-minute representative run.

Do not claim these targets are met until measured on real devices.

## 32.3 Adaptive quality

Automatically or manually adjust:

- particle counts;
- volume resolution;
- raymarch steps;
- shadow quality;
- volumetric lighting;
- bloom resolution;
- field-line count;
- accretion-disk detail;
- debris density;
- depth-of-field/motion-blur availability;
- compute workgroup load where applicable.

Quality changes should preserve composition and causality rather than visibly deleting the core event.

## 32.4 Dynamic resolution

Permit controlled render-resolution scaling during expensive effects. Avoid visible oscillation; use hysteresis and stable thresholds.

## 32.5 Memory lifecycle

Every scenario unload must dispose:

- geometries;
- materials/nodes;
- render targets;
- storage buffers;
- textures;
- event listeners;
- workers;
- audio nodes;
- large typed arrays not reused.

Run repeated load/reset cycles and inspect memory.

---

# 33. BROWSER AND CAPABILITY STRATEGY

WebGPU remains capability-dependent. The app must probe and choose a defined tier.

## Tier A — Full WebGPU

Requirements:

- WebGPU available;
- required storage/compute limits verified;
- high-fidelity particle/volume systems enabled;
- full black-hole lensing candidate enabled if Gate 0 passed;
- 3D storage textures/compute volumes allowed.

## Tier B — Reduced WebGPU / compatibility constraints

Use lower particle counts, smaller volumes, fewer field lines, simpler post-processing, and no optional compute feature that exceeds device limits.

## Tier C — WebGL 2 fallback

Use explicit substitutes:

- smaller CPU/GPGPU particle systems;
- 2D/stacked volume approximations;
- precomputed or simplified lensing lookup;
- fewer dynamic field lines;
- no feature that silently depends on WebGPU storage textures.

The user may receive a subtle quality indicator in Settings/Science mode, not a giant error banner if the experience still works.

## Unsupported

If a browser/device cannot support a meaningful interactive experience, show a concise capability message and minimum requirements. Do not load a broken scene.

Required browser smoke testing must include current versions of the main target desktop browsers available to the development environment. Do not generalize Safari/Firefox behavior from Chrome.

---

# 34. RESPONSIVE AND MOBILE BEHAVIOR

Desktop is the flagship experience, but the layout must remain responsive.

Mobile strategy:

- preserve camera, selection, time control, and one or more manipulation tools;
- reduce simultaneous visual density;
- use simplified volumes/lensing if necessary;
- move hidden controls to thumb-reachable edge regions;
- avoid tiny field-node handles;
- prevent browser scroll/zoom conflicts while canvas is active;
- respect safe areas;
- show a clear degraded-quality notice only in settings/first launch when necessary.

Do not claim flagship mobile support without real-device testing.

---

# 35. VISUAL STYLE

The project should feel:

- vast;
- precise;
- physically consequential;
- dark without crushing detail;
- luminous where energy actually concentrates;
- editorial/cinematic rather than arcade-neon;
- elegant rather than overloaded;
- silent and intimidating in its default visual language.

Avoid:

- generic blue/purple sci-fi gradients everywhere;
- HUD rings around every object;
- permanent grid floors in deep space;
- random hexagons;
- cheap hologram panels;
- excessive bloom;
- star twinkle;
- fake film damage;
- UI that looks like a spaceship cockpit;
- red warning text covering the event;
- arbitrary particle fireworks unrelated to state.

The most beautiful frame should often have almost no UI at all.

---

# 36. SCIENTIFIC FIDELITY LEDGER

Create `docs/model-fidelity.md` and maintain it during implementation.

Minimum rows:

| System | Intended model | Fidelity class | What is calculated | What is approximated | What is illustrative | Validation source |
|---|---|---|---|---|---|---|
| Cloud formation | reduced-order gravity/turbulence | B | mass/clump integration | pressure/cooling, fragmentation | fine dust tracers | astrophysical references |
| Protostar disk | angular-momentum/accretion surrogate | B | mass transfer bookkeeping | disk viscosity/thermal state | microstructure | NASA/primary sources |
| Bipolar jet | reduced-order outflow | B/C | axis, mass/energy proxy | launch mechanics | fine shock detail | NASA/primary sources |
| Plasma | charged-particle + analytic field | B | Lorentz-like particle motion | collisions/MHD collective behavior | emissive volume detail | DOE/PPPL references |
| Instabilities | parameterized proxies | B/C | selected thresholds | nonlinear MHD | some topology VFX | DOE/PPPL references |
| Black-hole matter orbit | mixed gravity approximation | A/B | depending on solver | close-region corrections | fine debris | GR references |
| Lensing | geodesic/LUT candidate | A/B | ray deflection within model | spin if not Kerr | bloom/glare | NASA/GR references |
| Tidal disruption | differential-gravity surrogate | B | local differential acceleration | stellar hydrodynamics | micro-turbulence | astrophysical references |
| Accretion disk emission | relativistic visual approximation | B | view/velocity-based terms | radiative transfer | texture turbulence | NASA/GR references |
| Sonification | interpretive | C | state mapping only | N/A | all audible output | disclosed as sonification |

This table must reflect what was actually built. Do not copy the intended class if implementation differs.

---

# 37. CURRENT RESEARCH / IMPLEMENTATION BASIS TO VERIFY

Before implementation, consult current official/primary documentation and record the exact source/version/date in `docs/research-basis.md`.

At minimum verify:

## Rendering/compute

- Three.js WebGPURenderer manual and API documentation;
- Three.js TSL specification, especially compute and node post-processing;
- Three.js Storage3DTexture documentation;
- official Three.js WebGPU examples for compute particles, compute points, reduction, ping-pong textures, fluid particles, volumetric fire, volumetric clouds, volumetric lighting, caustics, and particle systems;
- MDN WebGPU API capability and secure-context requirements.

## Rewind/physics if Rapier is used

- Rapier JavaScript determinism documentation;
- Rapier world snapshot/serialization documentation;
- Rapier CCD documentation.

## Black-hole visuals

- NASA Scientific Visualization Studio black-hole accretion-disk visualizations by Jeremy Schnittman and related NASA explanations of gravitational lensing, disk warping, brightness asymmetry, and photon-ring/shadow appearance;
- newer NASA black-hole visualization material if available.

## Star formation

- NASA material on stars forming from collapsing gas/dust clouds;
- protostellar rotating disks;
- bipolar/protostellar jets and outflows;
- recent Hubble/Webb observations and NASA visualizations of star-forming regions.

## Plasma confinement

- U.S. Department of Energy explanations of plasma confinement and tokamaks;
- DOE/PPPL material on magnetic-field confinement, turbulence, tearing/kink-like instabilities, magnetic islands, confinement loss, and reconnection-related behavior.

Use these sources to set visual/behavioral constraints. Do not copy imagery or code without license/provenance review.

---


### Experience benchmark sources

Re-verify before major UX changes:

- Universe Sandbox controls/features: `https://universesandbox.com/` and `https://universesandbox.com/support/controls/`
- NASA Eyes: `https://science.nasa.gov/eyes/`
- SpaceEngine: `https://spaceengine.org/` and current official user manual
- OpenSpace: `https://www.openspaceproject.com/` and `https://docs.openspaceproject.com/latest/`
- Google 100,000 Stars: `https://experiments.withgoogle.com/100000-stars`

These are references for interaction principles, scale, navigation, and information disclosure—not code or asset sources.

---

# 38. EXPERIENCE BENCHMARKS — BORROW THE STRENGTH, BEAT THE INTERFACE

Before implementation and again before final UX sign-off, inspect the current versions of these projects from their official sources. The exact products may evolve; verify current behavior rather than relying on this document alone.

## 38.1 Universe Sandbox — direct manipulation and time are the benchmark to beat

Official: `https://universesandbox.com/`

What it demonstrates well:

- the fantasy of grabbing celestial bodies and immediately seeing physically consequential change;
- fast play/pause/time-speed control;
- creation/destruction rather than passive viewing;
- simulation settings that can intentionally bend normal physics;
- collisions, stellar evolution, material/composition and black-hole visuals in one sandbox.

What Event Horizon Forge must do better:

- make high-frequency actions happen **on the phenomenon**, not by repeatedly returning to a control surface;
- unify diffuse matter, plasma fields and relativistic encounter behavior instead of centering discrete celestial bodies;
- make rewind/branch comparison part of causal exploration, not merely time direction/speed;
- preserve a genuinely chrome-free observation state at all times;
- use in-world previews for trajectories/fields rather than requiring persistent parameter panels.

## 38.2 NASA Eyes — data-driven travel, ride-along viewpoints, and temporal navigation

Official: `https://science.nasa.gov/eyes/`

What it demonstrates well:

- web-based real-time 3D exploration;
- travel between targets and ride-along viewpoints;
- fast-forward/rewind in Eyes on the Solar System;
- authoritative source data and mission context;
- accessible discovery across desktop/mobile browsers.

What Event Horizon Forge must do better:

- users do not merely navigate existing objects—they change initial conditions and create new outcomes;
- information overlays must remain summoned rather than defining the default visual surface;
- camera travel, time, manipulation and explanation are one coherent interaction grammar;
- branch comparison and deterministic replay expose causality rather than only chronology.

## 38.3 SpaceEngine — seamless scale and free movement

Official: `https://spaceengine.org/`

What it demonstrates well:

- enormous perceived scale;
- seamless surface-to-galaxy-style movement;
- game-like free navigation;
- procedural generation to fill uncharted space.

Its documented Planetarium interface also demonstrates the tradeoff we are explicitly avoiding: multiple regions of persistent HUD text can show selected-object data, camera binding, time, velocity and field of view.

What Event Horizon Forge must do better:

- preserve the same sense of unconstrained movement while eliminating default telemetry HUDs;
- give every important scale something meaningful to **touch and change**, not merely visit;
- use semantic scale transitions to keep manipulation precision usable from cloud scale through near-horizon scale;
- make the sky itself an inertial/lensing instrument rather than scenic backdrop.

## 38.4 OpenSpace — scale, dynamic data and presentation-grade cosmic visualization

Official: `https://www.openspaceproject.com/`

What it demonstrates well:

- interactive visualization across all possible scales;
- dynamic observations/simulations;
- presentation-grade rendering and large-display/dome thinking;
- extensible architecture for very different astronomical content.

What Event Horizon Forge must do better:

- optimize for **one person directly manipulating phenomena** rather than primarily navigating/presenting data;
- use event-aware replay and branch ghosts to let the user reason through causal changes;
- keep core verbs consistent across scale/domain handoffs;
- preserve cinematic quality with no presenter-facing control surface visible to the user.

## 38.5 Google 100,000 Stars — visual primacy and direct scale navigation

Official: `https://experiments.withgoogle.com/100000-stars`

What it demonstrates well:

- the visualization itself dominates the browser;
- direct mouse-driven zoom makes scale feel immediate;
- only a subset of objects receive textual detail;
- WebGL can create a memorable “falling through the data” feeling without dashboard framing.

What Event Horizon Forge must do better:

- maintain that visual primacy while making the universe dynamic and physically responsive;
- preserve depth and continuity at far more extreme scale changes;
- let selection reveal information temporarily rather than turning every object into a label;
- make the star field participate in lensing, occlusion and orientation.

## 38.6 Benchmark synthesis — the target

The product target is **not** to clone any one reference. Combine:

- Universe Sandbox’s tactile agency;
- NASA Eyes’ temporal/camera travel;
- SpaceEngine/OpenSpace scale continuity;
- 100,000 Stars’ willingness to let the visualization own the browser;

then go beyond them with:

- zero-chrome immersive default;
- contextual world-as-control-surface manipulation;
- hold-to-peek UI rather than persistent dashboards;
- temporal echoes and direct scrub gestures;
- same-space counterfactual branch ghosts;
- causal provenance traces;
- field/light-path peeks derived from the simulation;
- event replay from arbitrary user camera positions;
- one interaction grammar spanning formation, plasma confinement and black-hole catastrophe.

Benchmarking is for interaction patterns and product quality. Do not copy protected assets, proprietary code, branding, or distinctive art wholesale.

---

# 39. PROTOTYPE GATE — DO THIS BEFORE FULL BUILD

The visual ambition is high enough that the renderer/compute architecture must be proven early.

Create a bounded prototype branch/slice that answers one decision:

> Can the chosen Three.js/WebGPU architecture render and interact with the representative combination of volumetric matter, GPU particles, field manipulation, black-hole lensing, camera travel, and rewind at acceptable frame time without unsustainable complexity?

## 39.1 Gate scene

The prototype must contain **all** of the following in one runnable scene:

1. procedural star field;
2. one editable volumetric/particle cloud;
3. at least one direct matter manipulation tool;
4. one energized plasma packet;
5. two or more movable magnetic field nodes;
6. live field-line visualization;
7. one visible instability/confinement-failure transition;
8. one black-hole lensing object distorting the background;
9. one incoming star/deformable matter proxy that can visibly stretch near the black hole;
10. free camera with wide-to-close scale changes;
11. play/pause/slow motion;
12. at least one checkpoint and successful rewind/restore;
13. hidden UI that can disappear completely;
14. capability tier detection;
15. performance instrumentation available only in debug mode.

## 39.2 Gate success path

A tester must be able to complete this path **without opening a pinned dashboard/inspector**:

1. launch directly into the live scene;
2. move the camera and semantic-zoom through at least two scale frames;
3. directly grab/manipulate cloud matter using the scene;
4. pause and inspect the changed matter from another angle;
5. select/engage plasma through a context gesture;
6. move a field node and see field/plasma behavior change while dragging;
7. trigger a visible instability or confinement-loss transition;
8. focus the black hole without opening an object browser;
9. grab/throw an incoming star or proxy and see a live trajectory/encounter preview;
10. see background lensing and visible stellar/tidal deformation;
11. pause during the event and orbit freely;
12. use the Time Lens/direct scrub to return to before launch;
13. fork a branch and change the trajectory;
14. replay the branch;
15. hold Compare to crossfade/ghost the two outcomes;
16. press the clean/immersive command and verify that **all persistent chrome is absent**;
17. manually move the camera during a Director shot and verify immediate control handoff.

If the only way to complete this path is through a debug panel, side sheet, permanent toolbar, or repeated numeric slider adjustment, Gate 0 fails even if rendering performance is excellent.

## 39.3 Gate metrics

The gate must test interaction architecture as aggressively as rendering. A gorgeous scene controlled by a debug panel is a gate failure.

Measure on actual available target hardware:

### Rendering/performance

- median and p95 frame time;
- CPU main-thread time;
- GPU frame time where tooling permits;
- particle counts;
- volume resolution/steps;
- memory before/after reset cycles;
- load time;
- shader compilation stalls;
- visible artifacts during scale-frame changes;
- uncaught errors/warnings.

### Interaction/experience

- **persistent immersive chrome count:** must be zero information panels/toolbars/text labels in the clean state;
- time from manual camera input to Director surrender: must be effectively immediate/current frame;
- whether matter grab, field-node manipulation, body throw and camera orbit are distinguishable without persistent instructions;
- whether the core path can be completed without opening Pinned Inspector;
- whether edge controls reveal only through intentional dwell/gesture and reliably disappear;
- whether hold-to-peek interactions leave no stale controls after release;
- whether semantic zoom keeps target/orientation coherent through two representative scale-frame handoffs;
- rewind restore time and visible state discontinuity;
- Time Lens scrub comprehension in a short human pass;
- Branch Ghost/crossfade comprehension in a short human pass;
- ability to return to a recent event without opening an object browser;
- whether a five-minute passive Silent Watch period remains visually coherent with no UI intervention.

### Human review

At least one human reviewer must perform the gate path without being coached through a developer/debug panel. Record where they hesitate, whether hidden interactions are discoverable, and whether any feature requires UI to remain visible merely so the user remembers it exists. A hidden interface that is impossible to discover is also a failure.

## 39.4 Gate verdict

Use only:

- **GO** — representative slice meets the required experience and performance target;
- **CONDITIONAL GO** — core approach works but named bounded conditions must be addressed before expansion;
- **NO-GO** — renderer/architecture cannot support the representative slice at an acceptable cost;
- **INSUFFICIENT EVIDENCE** — target devices/browsers or required systems were not actually tested.

Do not begin the full build on a `NO-GO`. On `INSUFFICIENT EVIDENCE`, gather the missing evidence rather than pretending success.

## 39.5 Renderer fallback decision

If `WebGPURenderer`/TSL fails Gate 0 because of missing required features, instability, or unacceptable target support:

- test a bounded WebGLRenderer/WebGL 2 implementation for the same success path;
- compare visual and engineering compromises;
- document the decision;
- do not restart the whole project with another engine without a separate decision record.

---

# 40. IMPLEMENTATION PHASES

After Gate 0 returns GO or approved CONDITIONAL GO, build in these bounded phases.

## Phase 1 — Core shell

Deliver:

- renderer initialization;
- capability probing;
- deep-space camera;
- star field;
- scale-frame system;
- universal time controller;
- branch/command data structures;
- hidden DOM UI shell;
- debug instrumentation;
- deterministic seed service.

Acceptance:

- stable launch/reset;
- camera can travel across multiple scale frames;
- no persistent UI required;
- branch seed reloads same initial star field and scene layout.

## Phase 2 — Formation

Deliver:

- molecular cloud;
- gather/disperse/spin/turbulence tools;
- mass/clump simulation;
- protostar sink creation;
- multiple protostars;
- accretion disk;
- outflow/jet surrogate;
- long-timescale playback;
- cloud rewind checkpoints.

## Phase 3 — Plasma confinement

Deliver:

- field elements;
- charged-particle motion;
- plasma density/emissivity;
- field lines;
- live node manipulation;
- pinch/twist/turbulence states;
- reconnection surrogate;
- confinement failure;
- chamber preset;
- cosmic integration with ionized formation matter.

## Phase 4 — Black hole

Deliver:

- black-hole object;
- mass/spin controls;
- lensing MVP;
- accretion disk;
- incoming object launcher;
- star deformation/tidal disruption;
- debris streams;
- relativistic brightness approximation;
- camera modes;
- science labels.

## Phase 5 — Cross-domain continuity

Deliver:

- matter provenance across domains;
- saved user-created stars/plasma;
- stellar evolution bridge;
- field tools around charged accretion/outflow matter;
- full lifecycle showcase;
- cross-domain rewind.

## Phase 6 — Branch/compare

Deliver:

- arbitrary branch creation at checkpoints;
- synchronized A/B playback;
- visual branch switch/peek/wipe;
- inspector differences;
- branch export/import.

## Phase 7 — Polish and performance

Deliver:

- adaptive quality;
- final post-processing;
- Director;
- sonification;
- accessibility modes;
- responsive/touch behavior;
- performance tuning;
- memory/lifecycle hardening;
- browser/device matrix;
- final documentation and release build.

Do not begin optional polish before the affected core path is working.

---

# 41. TEST PLAN

Testing must target actual user-visible behavior, not only source presence.

## 41.1 Unit tests

Cover:

- scale-frame conversions;
- timeline conversion and playback-rate logic;
- deterministic seed generation;
- command serialization;
- checkpoint indexing;
- branch fork ancestry;
- mass bookkeeping across phase transitions;
- field-element parameter validation;
- approximate gravity/orbit functions;
- tidal-threshold calculations used by the implementation;
- save schema migration;
- capability-tier selection.

For scientific formulas, include reference cases derived from documented sources or independently calculated fixtures.

## 41.2 Integration tests

Required flows:

### Formation flow

- load Molecular Cloud preset;
- manipulate density;
- add angular momentum;
- run until protostar transition;
- verify disk/outflow state exists;
- rewind before transition;
- change angular momentum;
- verify resulting state differs and branch remains valid.

### Plasma flow

- load chamber or ionized-matter preset;
- move field node;
- verify field geometry changes;
- verify charged-particle/plasma response changes;
- trigger confinement loss;
- rewind;
- restore prior stable state.

### Black-hole flow

- load black-hole scenario;
- launch a star;
- verify trajectory state changes;
- cross tidal threshold;
- verify deformation/disruption state;
- verify lensing is visible against background;
- pause and move camera;
- rewind to pre-launch;
- alter trajectory and replay.

### Cross-domain flow

- create or load a protostar/star from formation state;
- persist it;
- use it as an incoming object in black-hole scenario;
- preserve provenance ID;
- inspect provenance after disruption.

## 41.3 Browser E2E tests

Automate where possible:

- initial load;
- capability detection;
- UI reveal/hide;
- play/pause;
- camera focus;
- timeline open/close;
- branch creation;
- inspector open/close;
- save/export/import;
- reduced-motion setting;
- fallback mode launch.

Canvas visuals need image/perceptual review in addition to DOM assertions.

## 41.4 Visual regression

Capture deterministic camera bookmarks for:

- star field;
- molecular cloud;
- protostar disk;
- bipolar jet;
- stable plasma;
- unstable plasma;
- field lines;
- chamber failure;
- black-hole face-on view;
- black-hole edge-on view;
- lensed background star;
- early tidal stretch;
- debris stream;
- branch comparison.

Pixel-perfect tests may be inappropriate across GPU/browser vendors. Use tolerant/perceptual comparison plus human review and retain reference metadata.

## 41.5 Runtime error gate

No completion with:

- uncaught exceptions;
- repeating console errors;
- lost WebGPU device without recovery/clear failure handling;
- leaked listeners/workers after reset;
- runaway allocation;
- broken input after scenario switch;
- rewind producing invalid branch state.

---

# 42. PERFORMANCE AND LIFECYCLE QA

Run a repeatable representative sequence:

1. load Molecular Cloud;
2. manipulate for 30 seconds;
3. accelerate to protostar state;
4. switch to plasma manipulation;
5. trigger instability;
6. load/transition to black-hole scenario;
7. run tidal disruption;
8. rewind;
9. fork branch;
10. replay;
11. reset to start;
12. repeat multiple times.

Measure:

- FPS/frame time;
- main-thread long tasks;
- GPU memory where observable;
- JS heap;
- texture/buffer counts;
- shader compilation behavior;
- reset/reload memory baseline;
- responsiveness of camera and tools.

If memory grows materially after every cycle, do not call the build complete.

---

# 43. SCIENCE QA

Create a review checklist that verifies:

- a magnetic field never directly moves the black hole;
- vacuum audio is described as sonification;
- black-hole lensing is not a generic fisheye by the final milestone;
- spin is labeled according to the level actually implemented;
- star formation is not called full radiation hydrodynamics;
- plasma is not called full MHD unless it actually is;
- reconnection surrogate is labeled as such;
- protostellar jets/outflows are not represented as arbitrary symmetrical lasers;
- a black-hole accretion disk changes appearance with view angle;
- approaching/receding disk brightness asymmetry is implemented only to the fidelity actually documented;
- matter crossing the event horizon is not shown re-emerging unless a deliberately fictional mode is enabled and clearly separated from science mode;
- not every formed star automatically becomes a black hole;
- the stellar-evolution bridge makes black-hole formation conditional on preset/model eligibility;
- all numeric outputs in science mode specify whether they are calculated, approximated, or visual proxies.

---

# 44. VISUAL QA

A human reviewer must inspect the actual running application.

Reject the build if:

- the star field looks like evenly random white dots;
- nebula looks like smoke sprites;
- plasma is just a glowing ball;
- field lines overwhelm the scene;
- the black hole is a black sphere surrounded by bloom;
- tidal disruption is a stretched mesh followed by deletion;
- UI permanently occupies significant screen area;
- camera cannot smoothly move between macro and close scale;
- particles visibly pop in/out during LOD changes;
- Director fights the user;
- rewind visibly reconstructs a different macro-event without disclosing nondeterministic replay;
- comparisons are primarily tables rather than visual outcomes;
- effects obscure the actual causal event.

The project should be capable of producing striking screenshots with UI fully hidden.

---

# 45. UX STATE COVERAGE

Implement the relevant state for each user-facing control/system:

- default;
- hover;
- focus;
- active;
- selected;
- disabled;
- loading/compiling;
- unsupported capability;
- simulation paused;
- seeking;
- restoring checkpoint;
- branch comparison active;
- save success;
- save failure;
- import incompatible;
- WebGPU device loss;
- degraded visual mode;
- reduced-motion mode.

Do not strand users behind a blank canvas while shaders compile. Show a restrained loading state.

---

# 46. ERROR HANDLING

## WebGPU/device loss

Attempt bounded recovery. If recovery fails:

- pause simulation;
- preserve recoverable scenario state;
- show a concise overlay;
- offer reload/restart in a lower tier if possible;
- do not continue rendering corrupt output.

## Save/import failure

Do not overwrite the current state. Show the reason and preserve the existing simulation.

## Unsupported feature

Disable only the affected feature where a meaningful fallback exists. If the core experience cannot run, stop cleanly.

## Solver instability

If a numerical solver produces NaN/Infinity or escapes expected bounds:

- pause that domain;
- preserve prior checkpoint;
- log the first offending subsystem in debug mode;
- restore from checkpoint if safe;
- never let invalid state propagate silently through every renderer.

---

# 47. SECURITY, PRIVACY, AND NETWORKING

Base product should require no backend.

Rules:

- no telemetry by default;
- no external runtime calls after initial static asset load unless explicitly documented;
- no secrets in client code;
- local saves stay local unless the user explicitly exports/shares them;
- external assets must have provenance/license records;
- use HTTPS for deployed WebGPU experience;
- sanitize imported scenario metadata before displaying it as text;
- impose size limits on imported save files.

---

# 48. GIT AND CANONICAL REPOSITORY WORKFLOW

The canonical project repository is:

- Web: `https://github.com/westkitty/Event-Horizon-Forge`
- Git: `https://github.com/westkitty/Event-Horizon-Forge.git`
- Branch: `main`

The repository is expected to contain this build contract and project-governance bootstrap files before implementation starts. Preserve them.

## 48.1 Preferred start path: clone/open the canonical repository

If the agent does not already have the repository locally:

```bash
git clone https://github.com/westkitty/Event-Horizon-Forge.git
cd Event-Horizon-Forge
```

Then inspect:

```bash
pwd
git status --short --branch
git remote -v
git log --oneline -n 10
ls -la
```

Read, in this order when present:

1. `AGENTS.md`
2. `OPERATIONAL_STATE.md`
3. `BUILD_SPEC.md`
4. `docs/experience-contract.md`
5. `docs/research-benchmarks.md`
6. `README.md`
7. existing architecture/research/prototype docs
8. package/config/source only after the governing files are understood.

When this master build contract is supplied as the coding-agent task and `docs/master-build-contract.md` is absent, persist a semantically complete Markdown copy of this contract there **before substantive implementation**. The repository must remain restartable without relying on chat history. Do not replace the master contract with a short summary.

Do not recreate or replace the prepared governance files with generic boilerplate.

## 48.2 Fallback if the environment supplied a non-Git working tree

Only when `.git` is genuinely absent and cloning is not the active path:

```bash
git init
git branch -M main
git remote add origin https://github.com/westkitty/Event-Horizon-Forge.git
git fetch origin main
```

Before combining local files with the fetched branch, inspect both sides. Do not overwrite the prepared remote bootstrap or unrelated local work. Use a safe merge/rebase/adoption strategy based on actual state. If histories conflict ambiguously, stop and report the conflict rather than force-resetting either side.

If `origin` already exists but points somewhere else, do **not** overwrite it silently. Report the mismatch.

## 48.3 Repository-preparation files are protected inputs

Treat these as governing artifacts unless a later explicit user instruction supersedes them:

- `AGENTS.md`
- `BUILD_SPEC.md`
- `OPERATIONAL_STATE.md`
- `README.md`
- `.gitignore`
- `docs/research-benchmarks.md` when present;
- `docs/experience-contract.md` when present;
- `docs/master-build-contract.md` after this master contract has been persisted by the implementing agent.

You may update documentation to reflect verified implementation state, but do not delete the governing build contract or rewrite the product purpose into generic Three.js boilerplate.

## 48.4 Commits

Use coherent commits tied to verified work units. Recommended milestones:

- project scaffold + Gate 0 instrumentation;
- Gate 0 result / renderer decision;
- formation system;
- plasma/field system;
- black-hole/lensing/tidal system;
- scale/time/branch integration;
- invisible-UI interaction pass;
- performance/accessibility/final QA.

Do not create checkpoint spam merely because the list exists.

Before each commit:

```bash
git status --short
git diff --check
git diff --staged
```

Stage only intended files. Never commit secrets, local caches, generated heavy captures, browser profiles, benchmark dumps that do not belong in source control, or unrelated user work.

## 48.5 Push

The user has selected this repository as the project remote. When credentials/permissions are available and required validation for the current work unit passes:

```bash
git push -u origin main
```

Do not force-push. Do not create a new remote repository. Do not silently switch to a fork. If branch protection or authentication prevents direct push, report the exact blocker and use the repository’s permitted branch/PR flow rather than claiming success.

After pushing, verify that `origin/main` resolves to the intended commit.

---
# 49. REQUIRED DOCUMENTATION

The final repository must include and maintain the bootstrap governance artifacts already prepared for the project. The implementing agent must update evidence/state as work becomes real rather than deleting these files.

Required root files:

- `AGENTS.md` — agent entry-point and non-regression rules;
- `BUILD_SPEC.md` — this authoritative build contract;
- `OPERATIONAL_STATE.md` — current evidence/state;
- `README.md` — human entry point;
- `.gitignore`.

Additional final documentation must include:

## `README.md`

Explain:

- what Event Horizon Forge is;
- how to install;
- how to run dev mode;
- how to build;
- controls;
- browser requirements;
- quality tiers;
- science/fidelity disclaimer;
- test commands;
- project structure.

## `docs/architecture.md`

Document:

- simulation/render separation;
- scale frames;
- time/rewind;
- GPU compute ownership;
- domain solver boundaries;
- cross-domain entity transitions;
- capability fallbacks.

## `docs/model-fidelity.md`

Maintain the scientific fidelity ledger described above.

## `docs/research-basis.md`

List official/primary sources consulted and how they constrain the model/visuals.

## `docs/performance.md`

Record:

- tested hardware;
- browser versions;
- quality tier;
- representative scenario;
- particle counts;
- volume resolution;
- measured frame time;
- known bottlenecks;
- degraded-mode behavior.

## `docs/prototype-gate.md`

Record Gate 0 requirements, evidence, and verdict.

## `docs/controls.md`

Record mouse/touch/keyboard controls and accessibility alternatives.

---

# 50. BUILD AND DEPLOYMENT

The base deliverable should be a static deployable web application.

Requirements:

- reproducible install via lockfile;
- production build command;
- no dev-only asset path assumptions;
- hashed/static assets;
- lazy-load noncritical scenario assets;
- WebGPU served from a secure context in production;
- capability check before expensive initialization;
- graceful 404/base-path handling if deployed under a subpath where supported.

Do not add a server unless the product genuinely requires one.

---

# 51. RELEASE QUALITY BAR

The build is not complete because “all buttons exist.”

A release candidate must prove that the core fantasy works:

> The user can create and shape matter, produce a stellar/protostellar structure, manipulate charged plasma with magnetic fields, cause visible instability, interact with a black hole using matter from the shared system, inspect a convincing lensed/tidal event, pause, freely move the camera, rewind, fork a branch, change a condition, and see a materially different replay — while the primary screen remains focused on the phenomenon rather than a dashboard.

---

# 52. MANDATORY ACCEPTANCE CRITERIA

Do not declare completion unless every mandatory item below is directly verified or explicitly marked blocked.

## Product integration

- [ ] Formation, plasma confinement, and black-hole interaction run inside one application and shared simulation architecture.
- [ ] Scenario presets are starting conditions, not isolated mini-games with incompatible state.
- [ ] Matter/entity provenance can survive at least one cross-domain transition.

## Formation

- [ ] User can manipulate a molecular cloud spatially.
- [ ] User can add/remove angular momentum/turbulence or equivalent formation-driving conditions.
- [ ] At least one protostar can form through the implemented reduced-order model.
- [ ] Multiple competing protostar centers are supported.
- [ ] A rotating disk is visibly distinct from radial infall.
- [ ] Bipolar outflow/jet behavior exists and affects surrounding visual matter.
- [ ] Long-timescale acceleration and rewind work in a formation scenario.

## Plasma

- [ ] User can create/select energized plasma.
- [ ] User can deploy at least two field elements.
- [ ] User can move/rotate/change strength during playback.
- [ ] Charged matter visibly responds.
- [ ] Field-line analysis updates with the field.
- [ ] At least three visually distinct stability regimes exist, including stable confinement and catastrophic loss.
- [ ] A reconnection-like event is either implemented as a documented surrogate or explicitly omitted rather than faked.
- [ ] Magnetic controls do not directly manipulate a black hole.

## Black hole

- [ ] Black-hole mass is adjustable.
- [ ] Spin is adjustable and its implemented fidelity level is disclosed.
- [ ] Background star field is visibly lensed by a nontrivial ray-bending method.
- [ ] Accretion-disk appearance changes with camera angle.
- [ ] Approaching/receding brightness asymmetry exists if supported by the chosen relativistic visual approximation.
- [ ] User can launch a star toward the black hole.
- [ ] User can launch gas/plasma/debris or another supported feedstock.
- [ ] At least flyby, capture/infall, and tidal-disruption-style outcomes are distinguishable.
- [ ] Stellar tidal deformation progresses spatially before full disruption.
- [ ] Disrupted material forms persistent leading/trailing debris behavior rather than simply disappearing.

## Camera

- [ ] Free orbit works.
- [ ] Free flight works.
- [ ] Wide-to-close zoom is stable across scale-frame changes.
- [ ] User can chase/focus an incoming object.
- [ ] User can orbit the black hole from above, below, and edge-on.
- [ ] User can pause and move the camera without altering simulation state.
- [ ] Director immediately yields to manual input.
- [ ] Semantic zoom crosses at least two coordinate/scale frames without a visible teleport or loading-screen interruption.
- [ ] Camera focus history/event-return lets the user leave an event and recover it without opening an object browser.

## Time

- [ ] Play/pause works.
- [ ] Slow motion works.
- [ ] Fast-forward works across at least two physical regimes.
- [ ] Rewind restores a valid prior checkpoint.
- [ ] Rewind is checkpoint/reconstruction-based, not simply negative particle velocity.
- [ ] User can fork a branch.
- [ ] Two branches can play in synchronized comparison.

## UI/UX and scene-first interaction

- [ ] Immersive playback contains no persistent text, numeric readouts, labels, toolbar, timeline, scenario title, object list, or bottom control bar.
- [ ] The primary formation → confinement → black-hole encounter loop can be completed without opening a pinned inspector/settings panel.
- [ ] Core manipulation happens directly on scene matter, field nodes, trajectories, or spatial helpers rather than primarily through sliders.
- [ ] Edge UI requires intentional reveal and disappears after inactivity.
- [ ] Hold-to-peek works for at least time, inspector/science, camera viewpoints, and branch/compare.
- [ ] Only one transient Peek cluster/wheel is visible at a time.
- [ ] The context tool wheel appears at the interaction locus and contains only valid actions.
- [ ] Pausing allows free camera inspection without advancing simulation state.
- [ ] Time can be scrubbed through a direct gesture and produces in-scene temporal feedback.
- [ ] Branch A/B can be compared by hold-to-crossfade and/or same-space ghosting before opening numeric differences.
- [ ] A causal/provenance trace can be summoned for at least one cross-domain entity path.
- [ ] Near the black hole, representative photon/light paths can be temporarily inspected or the feature is explicitly documented as deferred rather than faked.
- [ ] Director and any cinematic camera immediately yield to manual input.
- [ ] `H` or equivalent immediately restores a clean immersive view.
- [ ] Inspector contains detailed numbers/words instead of placing them permanently on canvas.
- [ ] Science mode exposes model status and analytical overlays only when summoned.
- [ ] Keyboard-accessible equivalents exist for primary controls.
- [ ] A user-selectable Persistent Controls accessibility mode exists without changing the immersive default.
- [ ] Reduced Motion, reduced flash/bloom intensity, and reduced visual-intensity options work.

## Rendering

- [ ] Star field has brightness/color/depth variation and no vacuum twinkle.
- [ ] Molecular cloud has volumetric depth plus flow cues.
- [ ] Plasma has coherent internal structures rather than only glow/fog.
- [ ] Black hole is not represented as a simple black sphere.
- [ ] Lensing remains visually coherent while camera moves.
- [ ] Tidal debris remains readable at close and wide scales.
- [ ] UI-free screenshots look intentionally composed rather than like a debug demo.
- [ ] Star field remains temporally stable while the camera is still and provides parallax/depth cues during large translations.
- [ ] At least one bright background source can be visually followed through changing black-hole lensing as the camera moves.

## Engineering

- [ ] Capability tier is detected.
- [ ] Full WebGPU path has been tested on real supported hardware.
- [ ] WebGL 2/reduced or unsupported behavior is explicit and tested where claimed.
- [ ] Scenario unload/reload does not show unbounded resource growth.
- [ ] Production build succeeds.
- [ ] Automated unit/integration/browser tests required by this contract pass.
- [ ] No repeating console errors in supported paths.
- [ ] Documentation is current.
- [ ] Git status is clean except for intentionally uncommitted user work.
- [ ] If a valid remote was supplied and push was authorized, the final intended commit is verified on the remote.

---

# 53. PROHIBITED SHORTCUTS

Do not satisfy this contract with any of the following:

- three separate route pages pretending to be integration;
- static pre-rendered black-hole video;
- image/video background instead of interactive lensing;
- random particle attraction called star formation;
- a flat sphere called a protostar with no disk/outflow behavior;
- plasma as one Perlin-noise blob;
- field lines that do not respond to field controls;
- black-hole lensing implemented only as a radial screen distortion/fisheye;
- tidal disruption implemented only by stretching a mesh and hiding it;
- negative time implemented by multiplying all velocities by `-1`;
- permanent dat.GUI/Tweakpane-style development controls as production UI;
- a “minimal HUD” that still leaves object names, time, telemetry, toolbar icons, or numeric values permanently onscreen;
- hiding a conventional dashboard behind one click while still requiring it for every meaningful action;
- transparent glass panels used as permanent chrome;
- toolbars that reveal merely because the cursor passes near an edge;
- permanent object nameplates or labels floating over the simulation;
- interaction systems where the user must tune formation/plasma/trajectory primarily by slider rather than direct spatial manipulation;
- split-screen as the only branch-comparison technique when same-space crossfade/ghosting is feasible;
- automated cinematic cameras that ignore or delay manual override;
- fake scientific units attached to arbitrary shader values;
- hidden “quality” reduction that removes core behavior without telling the user;
- claiming WebGL fallback for compute-only features that were never implemented there;
- full repository rewrite after one subsystem becomes difficult;
- broad dependency installation without evidence it is needed;
- force pushes;
- silently changing an existing Git remote;
- completion claims based only on source code presence.

---

# 54. OPTIONAL POST-MVP FEATURES

These are additive only after the core experience and invisible-UI acceptance criteria pass. Do not pull them into the critical path merely because they are spectacular.

Potential expansions:

- true Kerr geodesic renderer with stronger spin-dependent lensing/frame-dragging;
- binary black holes with mutual lensing and interacting accretion structures;
- neutron-star / black-hole encounters;
- magnetar preset and stronger magnetic-environment visuals;
- binary-star mass transfer into a black hole, preserving the shared matter model;
- more sophisticated stellar evolution and collapse bridge;
- more rigorous offline-calibrated MHD lookup datasets or solver improvements;
- relativistic jet presets explicitly labeled as reduced-order/illustrative unless the model improves;
- observer-mode comparisons around compact objects;
- XR/VR inspection behind its own real-device prototype gate;
- SpaceMouse/6DOF power-user navigation;
- shareable hosted branch galleries;
- deterministic recorded cinematic export assembled from replay state;
- photo-mode exposure/focal controls;
- educational guided sequences that remain optional overlays on the same simulation;
- real astronomical catalog backgrounds;
- collaborative multi-user manipulation only after deterministic state synchronization is proven;
- additional causal-trace layers showing energy/mass provenance through model transitions.

Do not expand feature count at the expense of the core “touch the universe, release it, watch it change” interaction quality.

---

# 55. FAILURE LIMITS AND STOP CONDITIONS

The implementing agent gets one primary implementation pass per bounded phase and one bounded repair pass after failed validation before escalating the unresolved blocker.

Stop and report rather than bluff when:

- required WebGPU functionality is unavailable on the actual test target;
- lensing prototype cannot meet visual/performance criteria;
- the intended GPU particle/volume architecture causes unacceptable instability or memory growth;
- a scientific model cannot be implemented honestly within scope;
- authentication/branch protection prevents the required push to the known canonical repository and no permitted branch/PR path is available;
- a destructive repository operation would be necessary without explicit authorization;
- build/test infrastructure is broken outside the task scope and prevents proof.

A partial working implementation with a precise blocker is better than a fake “complete” product.

---

# 56. FINAL DELIVERY PACKAGE

The implementation is complete only when the agent returns/produces:

1. runnable repository;
2. production build;
3. source code;
4. lockfile;
5. `README.md`;
6. `docs/architecture.md`;
7. `docs/model-fidelity.md`;
8. `docs/research-basis.md`;
9. `docs/performance.md`;
10. `docs/prototype-gate.md`;
11. `docs/controls.md`;
12. automated tests;
13. representative visual QA screenshots or captured frames where tooling permits;
14. save/export schema documentation;
15. clean Git history for the work performed;
16. verified final push to `westkitty/Event-Horizon-Forge` when repository credentials permit; otherwise an exact authentication/branch-protection blocker report.

---

# 57. FINAL REPORT FORMAT

Return a concise evidence-based report:

```markdown
# Event Horizon Forge — Build Report

## Result
GO / CONDITIONAL GO / NOT COMPLETE

## What was built
- ...

## Core user path verified
- Formation: PASS/FAIL — evidence
- Plasma confinement: PASS/FAIL — evidence
- Black-hole interaction: PASS/FAIL — evidence
- Rewind/branch compare: PASS/FAIL — evidence
- Camera/scale travel: PASS/FAIL — evidence

## Renderer/capability result
- Three.js version:
- Renderer:
- WebGPU path:
- WebGL/reduced path:
- Browsers/devices actually tested:

## Performance evidence
- Representative scenario:
- Particle counts:
- Volume resolution:
- Median/p95 frame time:
- Memory/reset result:

## Scientific fidelity
- A-class systems:
- B-class systems:
- C-class systems:
- Important limitations:

## Tests
- Unit:
- Integration:
- Browser/E2E:
- Visual QA:

## Git
- Branch:
- Final commit:
- Remote:
- Push verified: yes/no/not applicable

## Remaining blockers
- none / exact blocker

## Files changed
- ...
```

Do not include hidden chain-of-thought or a transcript of every tool call.

---

# 58. DEFINITION OF DONE

Event Horizon Forge is done when it no longer feels like three impressive demos standing beside each other.

It must feel like **one manipulable cosmic system** in which:

- matter can gather into structure;
- structure can become energized and magnetically shaped;
- stability can be deliberately broken;
- matter can become stellar or compact;
- user-created bodies can be thrown into extreme gravity;
- light itself visibly responds to that gravity;
- the user can stop time at the most violent moment;
- freely move through the scene;
- rewind causality;
- change one decision;
- and watch the universe take a different path.

The phenomenon remains visually dominant. The science remains honest. The implementation remains measurable. The user remains in control.

Final experiential proof: record or directly demonstrate a continuous five-minute session in which the user explores, manipulates matter, changes a field, navigates scale, pauses, scrubs/rewinds, throws/feeds a body into the compact-object scenario, explores the resulting lensing/tidal event, forks and compares an alternate outcome, and returns to passive observation **without a persistent dashboard or telemetry HUD ever becoming necessary**.

If the build looks impressive only when the user stops interacting, or works only while a developer panel is open, it is not done.

**Build the universe as the interface.**
