# Performance

**Measured:** 2026-08-12 · **Stage:** Gate 0 prototype

## Honest summary first

**Frame rate has NOT been measured.** Everything below is CPU-side simulation
cost, which was measurable. GPU frame time and end-to-end FPS could not be
obtained in this environment and remain **unverified**. The contract's desktop
targets (§32.1: 60 FPS, median ≤16.7 ms) are therefore **not** claimed as met.

## Why frame rate could not be measured here

All four were established by experiment, not assumed:

1. **`requestAnimationFrame` is throttled** in headless Chromium (page never
   visible): 1–4 callbacks/second. Reducing the pixel ratio from 1.0 → 0.5 →
   0.25 *lowered* the observed rate rather than raising it, confirming the loop
   is stalled rather than GPU-bound.
2. Running Chromium **headed** did not help — the window is not focused, so rAF
   stays throttled, and `page.screenshot()` still times out.
3. **`readRenderTargetPixelsAsync()` returns 0xFF for every pixel.** Verified by
   hiding the lens mesh and setting the clear colour to `0x8040c0`; the readback
   returned `(255,255,255,255)` instead of `(128,64,192,255)`.
4. **Driving `render()` synchronously exhausts the WebGPU device** after roughly
   50 frames, because three recycles per-frame GPU allocations on the
   animation-loop boundary.

Getting real numbers requires a human running the app in a visible browser
window with `?debug` (which prints median/p95 frame time, sim time and tick).

## CPU simulation cost — measured

Apple M1, arm64, macOS 26.5.2, Bun 1.3.13 (same V8-class JIT as the browser).
300 iterations after 30 warm-up iterations, default Tier A populations.

| System | Cost | Population |
|---|---|---|
| Plasma (Boris push + field eval) | 2.013 ms/tick | 12,288 particles |
| Stellar body (self-gravity + pressure + external field) | 1.166 ms/tick | 24,576 particles |
| Cloud (direct-summation N-body) | 0.855 ms/step, every 8th tick → **0.107 ms** amortised | 384 clumps |
| **Total** | **3.29 ms per universal tick** | |
| Checkpoint clone | 0.188 ms | 1.77 MB per checkpoint |

Run-to-run variance is real: an earlier run of the same benchmark measured
2.06 ms/tick total. Treat 2–3.5 ms/tick as the range.

At 120 ticks/s and 60 FPS the loop consumes 2 ticks/frame, i.e. **~4–7 ms of the
16.7 ms budget on CPU simulation alone**, before any rendering. That is a large
share and is the single most likely source of a Gate 0 conditional.

### Optimisation history (measured, not guessed)

Profiling drove three changes, each verified by re-measurement:

| Change | Plasma cost | Total/tick |
|---|---|---|
| Baseline | 4.79 ms | ~7.8 ms |
| Replace `Math.hypot` with inline `sqrt` in per-particle loops | 2.94 ms | 3.80 ms |
| Pack field elements into a flat `Float64Array` (`FieldSet`) | 1.22 ms | 2.06 ms |

`Math.hypot` carries overflow/underflow guarding that costs roughly an order of
magnitude more than a plain `sqrt`; our magnitudes are nowhere near the float64
range limits. Field evaluation was dominated by object property loads rather
than arithmetic. The cloud solver was additionally moved to an 8-tick stride
because it advances ~10 yr/tick against a ~2.2e4 yr free-fall time.

All 42 unit tests — including the divergence-free field check and Boris speed
conservation — still pass after these changes, which is what makes them safe.

## Boot cost — measured

| Phase | Cost |
|---|---|
| Capability probe + renderer init | fast |
| Star-field bake (galactic band + 52k stars + encode) | ~0.5 s |
| Total to `ready` | **< 2 s** |

The star-field bake originally took **11 s** of blocking main-thread work and
made the tab unresponsive: the galactic band was evaluated per-texel across a
6×1024² cube. It is now evaluated on a 256×128 grid and bilinearly upsampled —
the band is low-frequency, so the result is visually equivalent. Measured
directly: 11,015 ms → 251 ms for the noise field.

## Quality budgets by tier

| | Tier A | Tier B | Tier C (WebGL 2) |
|---|---|---|---|
| Cloud tracers (GPU) | 240,000 | 120,000 | 48,000 (none — no compute) |
| Plasma particles | 12,288 | 8,192 | 4,096 |
| Body particles | 24,576 | 16,384 | 8,192 |
| Field lines / steps | 48 / 320 | 32 / 220 | 20 / 140 |
| Lensing integration steps | 160 | 110 | 64 |
| Star-field resolution | 2048×1024 | 1536×768 | 1024×512 |
| Render scale | 1.0 | 0.85 | 0.75 |

These are starting targets to validate, exactly as §29.4 requires — they have
**not** been tuned against measured frame time, because frame time could not be
measured.

## Memory

- Checkpoint: 1.77 MB, ring capacity 240 → ~425 MB worst case per branch.
  **This is too high** and should be reduced (shorter ring, or delta encoding)
  before production. Recorded as a Gate 0 condition.
- Two live branches maximum, so worst case is doubled.
- Visual tracers are never checkpointed (reconstructed from seed).

Repeated scenario load/reset cycles (§32.5, §42) have **not** been run.

## Not measured

- Frame time, FPS, GPU time, shader compilation stalls
- Laptop/integrated-GPU targets (§32.2)
- Thermal behaviour over a 10-minute run
- Memory growth across reset cycles
- Any browser other than Chromium; Safari and Firefox untested
- Mobile/touch devices
