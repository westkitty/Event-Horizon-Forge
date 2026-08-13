# Research Basis

Required by master contract §37. Sources consulted and, more importantly, **how
each one constrains the implementation**. Listing a source without a consequence
is not useful, so every entry names what it changed.

**Compiled:** 2026-08-12

## Rendering and compute

### Three.js WebGPURenderer and TSL
- `https://threejs.org/manual/en/webgpurenderer`
- `https://threejs.org/docs/TSL.html`

Rather than rely on documentation alone, the installed build (0.185.1) was
inspected directly and the exact API surface confirmed before use — see
`docs/technology-baseline.md`. Two findings changed the code:

- The documented compute-particle pattern is `instancedArray(count, 'vec3')` →
  `Fn(...)().compute(count)` → `material.positionNode = buffer.toAttribute()` →
  `renderer.computeAsync(node)`. `GpuTracers` follows exactly this.
- `bloom` is **not** exported from `three/tsl`; it lives in
  `three/addons/tsl/display/BloomNode.js`.

`WebGPURenderer` is still described as experimental, which is precisely why the
contract gates it. Tier C uses the same renderer with `forceWebGL: true` rather
than assuming compute degrades gracefully.

### MDN WebGPU
- `https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API`

Constrains `CapabilityProbe`: WebGPU requires a secure context (localhost
counts), and adapter **limits** must be read, not just feature presence. The
probe checks `maxStorageBufferBindingSize`, `maxComputeInvocationsPerWorkgroup`
and `maxTextureDimension3D` before selecting Tier A.

The 256-byte `bytesPerRow` alignment requirement for buffer readback is why
capture width must be a multiple of 64 — violating it kills the tab with no
JS-visible error.

## Black-hole physics and visuals

### NASA Scientific Visualization Studio — black-hole accretion visualisations (Jeremy Schnittman)
- `https://svs.gsfc.nasa.gov/` (black-hole accretion disk and lensing material)
- `https://science.nasa.gov/universe/black-holes/`

Constrains the visual target rather than supplying code or assets. The specific
features taken as required outcomes:

- The disk's far side is bent **over and under** the shadow, so an edge-on view
  shows the disk wrapping above and below rather than being occluded. This is
  why the lens pass accumulates *multiple* disk-plane crossings per ray instead
  of stopping at the first.
- Strong **brightness asymmetry** across the disk from Doppler beaming, with the
  approaching side both brighter and bluer.
- A **photon ring** just outside the shadow, and a shadow radius noticeably
  larger than the horizon itself (≈5.2 r_g for Schwarzschild).

Each of these had to emerge from the integration, which is the reason for
choosing geodesic integration over any screen-space approximation.

### Schwarzschild null geodesics
Standard result: `d²u/dφ² = −u + 3Mu²` with `u = 1/r` in geometric units.
Implemented directly in `BlackHoleLens.ts`. Velocity Verlet was chosen over RK4
because it needs one force evaluation per step instead of four, and being
symplectic it does not let a ray that orbits several times near the photon sphere
drift in or out through accumulated energy error.

### Paczyński & Wiita (1980) — pseudo-Newtonian potential
`Φ = −GM/(r − r_s)`. Adopted for matter trajectories because it reproduces the
ISCO at exactly `6 r_g` and the marginally-bound orbit at `4 r_g`, so capture,
plunge and the flyby/inspiral distinction fall out of the integrator instead of
being scripted. Verified in `tests/unit/physics.test.ts`: a circular orbit at
20 r_g stays circular, one at 4 r_g plunges.

### Bardeen, Press & Teukolsky (1972) — Kerr ISCO
Exact prograde ISCO expression, used so the spin control moves the disk's inner
edge correctly (9M at a=−1, 6M at a=0, 1M at a=1) rather than by an invented
factor. This is the *only* place spin acts physically; light bending remains
Schwarzschild, which is disclosed everywhere spin is shown.

### Shakura & Sunyaev (1973) — thin-disk emissivity
`T ∝ r^(−3/4)` ⇒ emissivity `∝ r^(−3)`, with the standard zero-torque inner
boundary taper `(1 − √(r_in/r))`. Gives a physically motivated radial brightness
profile instead of an arbitrary gradient.

### Relativistic radiative transfer
`I_ν/ν³` is Lorentz invariant, so observed intensity scales as `g³` where
`g = δ · √(1 − r_s/r)` combines Doppler and gravitational shifts. Implemented as
written; the exponent is 3 because the transfer is treated bolometrically at a
corresponding frequency, not spectrally.

## Star formation

- `https://science.nasa.gov/universe/stars/` — stars forming from collapsing
  clouds of gas and dust; protostellar disks; bipolar outflows.
- Recent Hubble/Webb imagery of star-forming regions.

Constrains the visual language of the cloud rather than the solver: filamentary
rather than uniform structure, dust extinction against background light, and
density concentrations that read as sites of collapse. It also sets what Gate 0
does **not** claim — protostar sinks, disks and jets are Phase 2 and are absent,
not faked.

## Plasma confinement

- `https://www.energy.gov/science/doe-explainsplasma-confinement`
- DOE / PPPL material on magnetic confinement, tokamaks, turbulence,
  tearing and kink instabilities, magnetic islands and confinement loss.

Constrains both the geometry and the honesty boundary:

- The default configuration is two opposed dipoles plus a solenoid, forming a
  genuine **magnetic bottle** with mirror points and a field null — the plasma is
  confined by field geometry, not by a boundary condition.
- Real pinch/kink/tearing behaviour is *collective* MHD. This build has no
  current feedback into B, so those behaviours are **field-geometry-driven
  analogues**, and the reconnection event is a labelled surrogate rather than a
  computed reconnection rate. Recorded in `docs/model-fidelity.md`.

### Boris (1970) — particle pusher
The standard scheme for charged-particle motion in a magnetic field. Chosen
specifically because the magnetic rotation is *exact*: the population neither
heats nor cools numerically over long runs, so "is the plasma gaining energy?"
means something. A naive Euler/RK integrator shows monotonic energy drift.
Verified by unit test: speed is conserved to 4 decimal places over 60 ticks.

## Experience benchmarks

Recorded in `docs/research-benchmarks.md` (Universe Sandbox, NASA Eyes,
SpaceEngine, OpenSpace, 100,000 Stars). The operative conclusion carried into
this build: every one of them makes persistent HUD telemetry the default, and
Event Horizon Forge's differentiator is that it does not.

## Licensing and provenance

No external code, imagery, dataset or asset has been copied into this project.
Every visual is procedural and generated from a seed. The star field is
**invented**, not an astronomical catalogue, and is labelled class C in the
fidelity ledger. The single runtime dependency is Three.js (MIT).
