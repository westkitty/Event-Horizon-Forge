# Technology Baseline

Required by the master build contract §0.5: record the versions actually used
and the browser/device capabilities actually verified.

**Recorded:** 2026-08-12 · **Stage:** Gate 0 prototype

## Pinned dependencies

All versions are exact (no `^`/`~`) and reproduced by `bun.lock`. Each was the
current `latest` on npm at the time of pinning, verified with `npm view <pkg>
dist-tags` rather than assumed.

| Package | Version | Role |
|---|---|---|
| `three` | 0.185.1 | Renderer, TSL node materials, WebGPU + WebGL2 backends |
| `@types/three` | 0.185.4 | Type definitions |
| `typescript` | 7.0.2 | Strict typecheck (native compiler; `latest` at pin time) |
| `vite` | 8.2.1 | Dev server and production bundler |
| `vitest` | 4.1.10 | Deterministic unit tests |
| `@playwright/test` | 1.62.1 | Browser E2E (Chromium 151.0.7922.34) |

Runtime dependencies are `three` alone. Nothing else ships to the browser.

## Verified API surface

Confirmed present in the installed build before being relied on, rather than
assumed from documentation:

- `three/webgpu` — `WebGPURenderer`, `StorageInstancedBufferAttribute`,
  `StorageBufferNode`, `ComputeNode`, `Storage3DTexture`, `PostProcessing`,
  `NodeMaterial`, `SpriteNodeMaterial`, `PointsNodeMaterial`,
  `LineBasicNodeMaterial`, `RenderTarget`, `DataTexture`.
- `three/tsl` — `Fn`, `If`, `Loop`, `Break`, `instancedArray`, `instanceIndex`,
  `storage`, `uniform`, `attribute`, `texture`, `cubeTexture`, `atan`,
  `screenUV`, `cameraProjectionMatrixInverse`, `cameraWorldMatrix`, `hash`, plus
  the arithmetic/swizzle set.
- `bloom` lives in `three/addons/tsl/display/BloomNode.js`, not in `three/tsl`.

## Device actually tested

| Property | Value |
|---|---|
| Machine | Apple M1, arm64 |
| OS | macOS 26.5.2 |
| Browser | Chromium 151.0.7922.34 (Playwright headless shell) |
| WebGPU adapter | `apple / metal-3` |
| Selected tier | **A** |
| `maxStorageBufferBindingSize` | 4,294,967,292 bytes |
| `maxComputeInvocationsPerWorkgroup` | 1024 |
| `maxTextureDimension2D` | 16384 |
| 3D storage textures | available |
| WebGL 2 | available (Tier C fallback path present) |

Tier A is selected on this device: WebGPU present, compute limits usable, 3D
storage textures available, storage-buffer limit above the 64 MB Tier A target.

## Environment limitations found

These are properties of the *test harness*, not of the application, and they
bound what Gate 0 can claim. See `docs/prototype-gate.md`.

1. **No compositing of the WebGPU swap chain in headless Chromium.**
   `page.screenshot()` and `canvas.toDataURL()` both return blank images.
2. **`readRenderTargetPixelsAsync()` returns 0xFF for every pixel.** Verified by
   hiding the lens mesh and setting the clear colour to `0x8040c0`: the readback
   still returned `(255,255,255,255)` instead of `(128,64,192,255)`. Any capture
   from this path is meaningless.
3. **`requestAnimationFrame` is throttled** because the page is never visible;
   observed 1–4 callbacks per second, and *lowering* the resolution did not
   raise it. Frame-rate figures cannot be obtained here.
4. **Synchronous `render()` outside rAF exhausts the GPU device** after roughly
   50 frames — three recycles per-frame allocations on the animation-loop
   boundary. Browser tests therefore drive the simulation directly.
5. **A second page in the same browser process crashes the GPU process.** Each
   browser launch gets one page.
6. **WebGPU readback requires `bytesPerRow` to be a multiple of 256**, i.e. an
   RGBA8 capture width that is a multiple of 64. An 800 px capture kills the tab
   with no JS-visible error. `captureFrameForTest` snaps the width.

Consequence: rendered-image quality and real frame timing are **not verified**
and must be measured by a human in a real browser window.

## Reproducing

```bash
bun install          # exact versions from bun.lock
bun run typecheck    # tsc --noEmit
bun run test         # vitest unit suite
bun run test:e2e     # playwright browser suite
bun run build        # production bundle
```
