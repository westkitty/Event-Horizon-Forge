# Performance and crash-safety status

**Last updated:** 2026-08-20  
**Stage:** Gate 0 representative prototype

## Current verdict

A real visible-browser run was reported to crash the browser and make the host
computer effectively unusable while Event Horizon Forge was trying to run. That
is a release-blocking failure. The previous Gate 0 quality defaults are rejected
as unsafe assumptions.

The source contained two independent resource-pressure designs capable of
producing that class of failure:

1. **Full-screen geodesic lensing scaled with raw HiDPI resolution.** Tier A used
   up to 2x device pixel ratio and 160 null-geodesic integration steps for every
   pixel of the full-screen black-hole lens, while also running 240,000 compute
   tracers and the CPU simulation.
2. **Checkpoint retention was bounded by count, not bytes.** The measured Gate 0
   checkpoint size was about 1.77 MB. A 240-checkpoint ring therefore retained
   about 425 MB per branch; two live branches could approach 850 MB before the
   active simulation, renderer, browser, and GPU resources were counted.

The August 20 repair keeps the same physical/simulation architecture but makes
resource safety a hard constraint instead of an afterthought.

## Crash-safe defaults

These are conservative **safety defaults pending real-device measurement**, not
claims about the maximum workload the project can eventually support.

| Budget | Tier A | Tier B | Tier C |
|---|---:|---:|---:|
| Maximum physical drawing-buffer pixels | 650,000 | 450,000 | 300,000 |
| Geodesic lens steps per pixel | 28 | 20 | 14 |
| GPU cloud tracers | 50,000 | 25,000 | 0 |
| Plasma simulation/render particles | 3,072 | 2,048 | 1,536 |
| Stellar-body simulation/render particles | 6,144 | 4,096 | 3,072 |
| Field lines / steps | 20 / 120 | 16 / 96 | 10 / 64 |
| Star-field resolution | 768 | 640 | 512 |

The physical-pixel cap is derived from viewport area and device pixel ratio, so
Retina/HiDPI displays cannot silently multiply the full-screen shader workload by
four. The cap is also re-applied when the viewport moves or resizes.

The lens remains the real null-geodesic integration path. This repair reduces
sampling work; it does **not** replace lensing with a radial distortion, static
image, or authored fake.

## Rewind and branch memory

Checkpoint retention now has a hard approximate memory ceiling:

- default capture interval: **120 universal ticks** (about once per real second
  at normal playback);
- count ceiling: 120 checkpoints;
- byte ceiling: **32 MiB per branch**;
- two live branches therefore target at most about **64 MiB of checkpoint
  snapshots**, plus their active states and small command/event metadata;
- if one unusually large checkpoint itself exceeds 32 MiB, one anchor is kept so
  deterministic rewind is not silently disabled.

Oldest checkpoints are evicted first. Rewind still restores a real checkpoint
and deterministically replays forward; velocities are never simply reversed.

## Stall recovery

The universal clock still targets 120 simulation ticks per real second at normal
speed. Normal playback may consume at most **four** catch-up ticks per frame,
which preserves the full tick rate down to 30 FPS. Intentional fast-forward gets
the ticks required at a healthy 60 FPS (up to 16 ticks/frame at rate 8), but a
stalled frame cannot accumulate an unbounded CPU burst. This prevents a slow
render frame from recursively making the next frame even slower without silently
collapsing the healthy fast-forward ladder.

## Historical CPU evidence

The August 12 measurements remain useful only as historical context for the old
populations:

| System | Historical cost | Historical population |
|---|---:|---:|
| Plasma (Boris push + field eval) | 2.013 ms/tick | 12,288 particles |
| Stellar body | 1.166 ms/tick | 24,576 particles |
| Cloud amortized | 0.107 ms/tick | 384 clumps |
| Total | 2-3.5 ms/tick | old Tier A |

Those results did **not** include real frame time or GPU time and must not be used
to claim the repaired build meets performance targets.

## What is still unverified

This environment cannot truthfully certify the user's real-device failure as
resolved. The repaired build still requires a matched visible-browser run.

Required acceptance evidence:

1. Load the normal Gate 0 scene on the machine/browser that previously became
   unusable. The browser and operating system must remain responsive during boot.
2. Leave the scene running for at least ten minutes and exercise camera movement,
   time controls, rewind, one fork, branch comparison, plasma view, cloud view,
   and the black-hole close view.
3. Record median, p95, p99, and maximum frame time rather than only average FPS.
4. Confirm no repeated stable-playback spikes above 33 ms where the target device
   is expected to sustain the normal quality tier.
5. Confirm checkpoint retained bytes remain bounded and do not grow without
   limit after the ring reaches its ceiling or after a branch is created.
6. Confirm camera/input stays responsive during the most expensive black-hole
   view and that no GPU/device-loss or browser-crash event occurs.

Until that run passes, the correct status is **implemented but unverified on the
reported failing machine**, not “performance fixed.”
