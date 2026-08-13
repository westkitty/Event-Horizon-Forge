# Scientific Fidelity Ledger

Required by master contract §36. **This table reflects what is actually built in
the Gate 0 prototype**, not what is intended later. Where implementation differs
from the contract's suggested class, the implemented class is recorded.

Classes (§2.6):
- **A** — physically calculated: equation-driven, documented assumptions.
- **B** — reduced-order / calibrated surrogate: simplified dynamics preserving
  important qualitative or semi-quantitative behaviour.
- **C** — illustrative visualisation only; never a physical prediction.

| System | Model as built | Class | What is calculated | What is approximated | What is illustrative | Basis |
|---|---|---|---|---|---|---|
| Black-hole geometry | Schwarzschild radii, ISCO, photon sphere | A | `r_s = 2GM/c²`, `r_g = GM/c²`, ISCO `6 r_g`, photon sphere `3 r_g` | — | — | Standard GR; unit-tested against closed form |
| Kerr ISCO (disk inner edge) | Bardeen–Press–Teukolsky prograde ISCO | A | Exact `r_isco(a*)`; 9M at a=−1, 6M at 0, 1M at 1 | — | — | Bardeen, Press & Teukolsky 1972 |
| Gravitational lensing | Null-geodesic integration `d²u/dφ² = −u + 3Mu²`, velocity Verlet | A | Ray deflection, shadow, photon ring, Einstein rings, multiple images, disk wrap-around | Step budget (64–160) truncates extreme multi-orbit rays | Bloom/glare | Schwarzschild null geodesics |
| Lensing under spin | **Schwarzschild bending used at all spins** | B | — | Spin does *not* bend light in this build | — | Disclosed; see "Spin" below |
| Matter trajectories near hole | Paczyński–Wiita pseudo-Newtonian, `a = −GM/(r−r_s)²` | A/B | Orbits, capture, plunge; correct ISCO at 6 r_g and marginally-bound at 4 r_g | Not a geodesic solution; no precession beyond what the potential gives | — | Paczyński & Wiita 1980; unit-tested for ISCO stability boundary |
| Gravitational redshift | `sqrt(1 − r_s/r)` | A | Exact Schwarzschild factor | — | — | Unit-tested at r = 2 r_s |
| Doppler beaming | `δ = 1/(γ(1 + β·t̂))`, `I_obs = g³ I_emit` | B | Relativistic beaming/dimming from Keplerian `β = 1/√r`, combined with gravitational redshift | Bolometric exponent 3 (from `I_ν/ν³` invariance) rather than a spectral transfer | Colour ramp | Standard relativistic radiative transfer |
| Accretion-disk emissivity | Shakura–Sunyaev-like `T ∝ r^(−3/4)` ⇒ emissivity `∝ r^(−3)`, zero-torque taper `(1 − √(r_in/r))` | B | Radial profile and inner taper | No radiative transfer, no vertical structure, no real MHD turbulence | Knot/lane pattern is procedural noise sheared by the local Keplerian rate | Shakura & Sunyaev 1973 |
| Tidal disruption | Particle body: spherically-averaged self-gravity + polytropic (γ=5/3) pressure support, per-particle external field | B | Differential acceleration across the body, elongation, stripping, unbinding test against escape speed, leading/trailing stream split by specific orbital energy | Pressure is a radial `r^(−3)` law, not a solved EOS; self-gravity is a monopole in radial shells (no non-radial modes) | — | Tidal radius `R★(M_bh/M★)^(1/3)`; unit-tested for equilibrium, disruption and two-stream morphology |
| Magnetic field | Analytic superposition of ideal dipole / current-loop / solenoid elements | B | Exact magnetostatic field: correct `1/r³` falloff, correct 2:1 axis/equator ratio, divergence-free | Solenoid interior is a tapered analytic term, not a solved coil integral | — | Unit-tested: 1/r³, 2:1 ratio, ∇·B → 0 at 2nd-order convergence |
| Field lines | RK4 integration along B̂ from deterministic seeds | A | Genuine integral curves of the same field the solver uses | — | Depth fade, flow pulse | Unit-tested for tangency to B |
| Plasma motion | Boris pusher, `v' = (q/m)(v × B)` | B | Lorentz motion; magnetic rotation is exact, so the population neither heats nor cools numerically | Collisions/thermal transport are a damping term; `q/m` is a documented proxy, not a real species | — | Boris 1970; unit-tested for speed conservation |
| Plasma collective behaviour | **Not modelled** | — | — | — | — | Plasma currents do **not** feed back into B. This is not MHD. Pinch/filamentation here are field-geometry-driven, not self-consistent instabilities |
| Reconnection | Labelled surrogate triggered on `|∇×B|` proxy + field-reversal shear | C | Trigger thresholds from real field derivatives | — | The energy release itself (radial impulse) | Explicitly a surrogate; not a predictive reconnection rate |
| Confinement regimes | Measured confinement fraction + perpendicular/parallel aspect ratio | B | Classification derived from measured particle state, not from a selected mode | Regime boundaries are chosen thresholds | — | — |
| Cloud dynamics | Direct-summation softened Newtonian N-body over mass clumps | B | Exact pairwise gravity at this N; momentum conserved to round-off | Softening length 3.5% of cloud radius | Dust tracers (GPU) are advected, not gravitating | — |
| Cloud manipulation | Velocity impulses (gather/disperse/spin/energise) | B | Angular momentum genuinely imparted by `v += ω × r` | "Energise" is an isotropic speed scale, a temperature *proxy* | — | Unit-tested: brushes never teleport matter |
| Visual dust tracers | GPU-advected by clump attractors | C | — | — | All of it — not individually gravitating particles | §9.2 two-level representation |
| Star field | Procedural catalogue, power-law flux, blackbody colour ramp | C | Blackbody colour approximation is physically motivated | — | Positions, counts and galactic band are invented | Not an astronomical catalogue |
| Sonification | **Not implemented** in Gate 0 | — | — | — | — | — |

## Spin — implemented level

Per §11.9, the implemented level is stated explicitly:

- **Level 1 (implemented):** spin sets the accretion-disk inner radius via the
  exact Kerr ISCO expression, and sets the orbital sense.
- **Level 2 (not implemented):** spin does not affect matter trajectories.
- **Level 3 (not implemented):** no Kerr ray tracing, no frame dragging, no
  spin-dependent photon-ring asymmetry.

**Light bending is Schwarzschild at every spin value.** This must never be
described as Kerr rendering.

## Claims explicitly NOT made

- Not full general relativity. Matter uses a pseudo-Newtonian potential.
- Not full MHD. There is no current feedback, no pressure, no collective waves.
- Not radiation hydrodynamics. No cooling, chemistry or radiative transfer.
- Not stellar evolution. No nuclear physics; the evolution bridge is unbuilt.
- Not planet formation.
- Cross-device deterministic replay is not claimed (see `docs/architecture.md`).

## Where this is surfaced to the user

Science peek (`hold I`) tags each row A/B/C with a tooltip, and carries a
footnote naming the principal limitation of the selected subsystem — e.g. the
black-hole panel states that light bending is Schwarzschild for all spins.
