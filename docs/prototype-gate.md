# Gate 0 — Prototype Gate Record

Required by master contract §39. **Date:** 2026-08-12

## Verdict

> ## INSUFFICIENT EVIDENCE
>
> The renderer/compute architecture, the simulation, the interaction model and
> the time/branch systems are implemented and — where observable — verified. The
> two axes the gate exists to settle for *rendering* could not be tested in the
> available environment: **no rendered image has ever been seen, and no frame
> rate has ever been measured.**

§39.4 is explicit that this verdict is for the case where "target devices/browsers
or required systems were not actually tested", and that the response is to gather
the missing evidence rather than pretend success. It is **not** a NO-GO: nothing
observed suggests the architecture cannot work. It is also **not** a GO, and the
full build must not begin on it.

The missing evidence is obtainable in minutes by a human — see *What is needed*.

## The gate question

> Can the chosen Three.js/WebGPU architecture render and interact with the
> representative combination of volumetric matter, GPU particles, field
> manipulation, black-hole lensing, camera travel, and rewind at acceptable
> frame time without unsustainable complexity?

Answerable today: **complexity is sustainable and the systems interoperate.**
Not answerable today: **frame time, and whether it looks right.**

## §39.1 — Gate scene contents

| # | Required element | Status | Evidence |
|---|---|---|---|
| 1 | Procedural star field | Built | `Starfield.ts`; layered catalogue + galactic band + distant galaxies, deterministic from seed |
| 2 | Editable volumetric/particle cloud | Built | 384 gravitating clumps + up to 240k GPU tracers |
| 3 | Direct matter manipulation tool | Built | Cosmic Hand brushes: gather/disperse/spin/energise, unit-tested |
| 4 | Energised plasma packet | Built | 12,288 Boris-pushed charged particles |
| 5 | ≥2 movable magnetic field nodes | Built | 3 elements (2 rings + solenoid) forming a real magnetic bottle |
| 6 | Live field-line visualisation | Built | RK4 integration of the same field the solver uses; re-traced on node move |
| 7 | Instability / confinement-failure transition | Built | 6 measured regimes; confinement loss unit-tested |
| 8 | Black-hole lensing distorting the background | Built (**never seen**) | Schwarzschild geodesic integration; correctness of the *image* unverified |
| 9 | Incoming star that visibly stretches | Built (**never seen**) | Disruption, stripping and two-stream morphology unit-tested at state level |
| 10 | Free camera, wide-to-close scale change | Built | 5 scale frames with hysteresis; camera pinned to render origin |
| 11 | Play / pause / slow motion | Built | Rate ladder 0–8x; pause verified in browser |
| 12 | ≥1 checkpoint and successful rewind | Built | Bit-identical replay unit-tested; browser rewind verified |
| 13 | Hidden UI that can disappear completely | Built | `chromeCount() === 0` asserted in browser |
| 14 | Capability tier detection | Built | Tier A selected on Apple M1 / metal-3; limits read, not just features |
| 15 | Debug-only performance instrumentation | Built | `?debug` overlay only |

All fifteen elements exist in one runnable scene, in one coordinate space, driven
by one tick counter.

## §39.3 — Gate metrics

### Rendering / performance

| Metric | Result |
|---|---|
| Median / p95 frame time | **NOT MEASURED** — rAF throttled in headless and unfocused-headed Chromium |
| CPU main-thread simulation | **3.29 ms/tick measured** (2.0 plasma + 1.17 body + 0.11 cloud amortised) |
| Particle counts | 12,288 plasma + 24,576 body + 384 clumps + up to 240,000 GPU tracers |
| Lens integration steps | 160 (Tier A) |
| Memory before/after reset | **NOT MEASURED** |
| Load time | **< 2 s to `ready`**, measured |
| Shader compilation stalls | **NOT MEASURED** |
| Artefacts at scale-frame changes | **NOT OBSERVED** (no image) |
| Uncaught errors / console errors | **Zero**, asserted in the browser suite |

### Interaction / experience

| Metric | Result |
|---|---|
| Persistent immersive chrome count | **0**, asserted programmatically |
| Peek reveals, release leaves no stale control | **Verified** in browser |
| `H` restores clean immersive state | **Verified** in browser |
| Pause allows camera movement without advancing state | **Verified** in browser |
| Rewind restores a valid earlier checkpoint | **Verified** in browser |
| Fork produces an identical-then-divergent branch | **Verified** (divergence = 0 at fork tick) |
| Director surrender latency | Implemented as same-frame (`manualInputThisFrame`); **not observed** |
| Core path completable without a pinned inspector | **NOT VERIFIED** — needs a human |
| Semantic zoom coherence across two frames | **NOT VERIFIED** — needs a human |
| Time Lens / Branch Ghost comprehension | **NOT VERIFIED** — needs a human |
| 5-minute Silent Watch coherence | **NOT VERIFIED** — needs a human |

### Human review

**Not performed.** §39.3 requires at least one human reviewer to complete the
gate path without being coached through a debug panel. This is outstanding and
is the largest single gap in the record.

## Why the rendering evidence is missing

Four independent limitations of the headless/automated environment, each
established by experiment rather than assumed:

1. **No swap-chain compositing.** `page.screenshot()` and `canvas.toDataURL()`
   both return blank images.
2. **Render-target readback is broken.** With the lens mesh hidden and the clear
   colour set to `0x8040c0`, `readRenderTargetPixelsAsync()` still returned
   `(255,255,255,255)`. Any image from this path is meaningless — an earlier
   all-white result from it was initially misread as a renderer bug and sent me
   down a wrong path; it was the harness.
3. **rAF throttling.** 1–4 callbacks/second; *lowering* resolution did not raise
   the rate, so this is a stall, not GPU load. Headed Chromium did not help
   because the window is never focused.
4. **Synchronous rendering exhausts the device** after ~50 frames.

Additional harness constraints found: a second page in the same browser crashes
the GPU process; WebGPU readback requires capture width to be a multiple of 64.

## What is needed to convert this to a verdict

Roughly 15 minutes of human time:

```bash
bun install
bun run dev          # then open http://127.0.0.1:5173/?debug
```

1. **Look at it.** Does the black hole show a shadow, a photon ring, a warped
   disk and lensed background stars — or a fisheye smear? Does the disk change
   substantially between face-on, edge-on and above? (§44 rejection criteria.)
2. **Read the debug overlay** for median/p95 frame time and sim time.
3. **Walk the §39.2 success path** — 17 steps, without opening a pinned panel.
4. **Confirm** that pressing `H` leaves a genuinely clean screen and that a
   UI-free screenshot looks intentional.

If the imagery holds up and frame time is within budget, this becomes
**CONDITIONAL GO** against the conditions below. If lensing is visually wrong or
frame time is far over budget, it is a **NO-GO** for the current renderer path
and §39.5 (bounded WebGL 2 comparison) applies.

## Conditions to carry regardless of verdict

These are known now and should be fixed before production expansion:

1. **CPU simulation is 2–3.5 ms/tick**, i.e. 4–7 ms/frame at 2 ticks/frame — a
   large share of a 16.7 ms budget before rendering. Move the plasma push to
   GPU compute, or reduce simulation-particle counts.
2. **Checkpoint memory is ~425 MB worst case per branch** (1.77 MB × 240),
   doubled with two live branches. Shorten the ring or delta-encode.
3. **Near-field matter is not lensed.** The star, debris and plasma composite on
   top of the lens pass; horizon occlusion is approximated by a shadow-radius
   fade. Either implement depth-aware lens compositing or keep it documented.
4. **Tier B/C paths are untested.** Only Tier A has been exercised. The WebGL 2
   path has never been run.
5. **Safari and Firefox untested.** §33 forbids generalising from Chrome.
6. **Reset/reload memory cycles never run** (§32.5, §42).
7. **Visual regression bookmarks (§41.4) cannot be captured** until a working
   capture path exists.

## What this gate *did* settle

- The three domains genuinely share one state object, one tick counter, one
  coordinate space and one interaction grammar — not three demos side by side.
- Rewind is checkpoint-and-replay and is bit-identical, proven by fingerprinting
  every causal float across a rewind/replay round trip.
- The physics is real where it claims to be: the field is divergence-free to
  second-order convergence, the Boris pusher conserves speed, the
  pseudo-Newtonian potential produces a correct ISCO stability boundary, and the
  stellar body holds equilibrium and then disrupts inside the tidal radius,
  forming both bound and unbound debris streams. 42 unit tests.
- The zero-chrome contract is objectively assertable and currently holds.
- Complexity is sustainable: ~6,000 lines, one runtime dependency.
