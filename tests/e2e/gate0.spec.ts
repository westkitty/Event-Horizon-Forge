/**
 * Gate 0 browser checks (BUILD_SPEC 41.3, 39.3).
 *
 * Scope is deliberately limited to what a headless browser can prove
 * *honestly*. Three things this environment cannot do, established by
 * experiment rather than assumption:
 *
 *   1. Composite the WebGPU swap chain, so page.screenshot() and
 *      canvas.toDataURL() both return blank images.
 *   2. Read back a render target: readRenderTargetPixelsAsync() returns 0xFF
 *      for every pixel even when the clear colour is set to a known value and
 *      the scene is empty.
 *   3. Run requestAnimationFrame at a useful rate — the window is never
 *      visible, so rAF is throttled to a few callbacks per second. Frames are
 *      therefore driven explicitly through the stepFrames test seam, and NO
 *      timing here may be reported as performance evidence (32.1).
 *
 * So this file asserts boot, capability tiering, the zero-chrome contract, and
 * the time/rewind/branch behaviour — all of which are observable from state.
 * Rendered-image quality (44) and real frame time remain unverified and are
 * recorded as such in docs/prototype-gate.md.
 *
 * All assertions share ONE page: a second page in the same browser reliably
 * crashes the GPU process on this machine.
 */

import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

/**
 * Drives frames in small batches.
 *
 * A large synchronous stepFrames() call stalls the WebGPU queue — the renderer
 * submits work with no opportunity to drain between frames and the page stops
 * responding (observed reliably at 60+ frames, intermittently above ~30).
 * Chunking with an await between batches lets the queue drain.
 */
async function stepFrames(page: Page, total: number, chunk = 10): Promise<void> {
  for (let done = 0; done < total; done += chunk) {
    await page.evaluate((n) => window.__EHF__!.stepFrames(n), Math.min(chunk, total - done));
    await page.waitForTimeout(16);
  }
}

test('Gate 0: boot, zero chrome, time, rewind, branch', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__EHF__?.ready === true, null, { timeout: 90_000 });

  // --- capability detection (39.1.14) -------------------------------------
  const caps = (await page.evaluate(() => window.__EHF__!.capabilities())) as {
    tier: string;
    webgpu: boolean;
    webgl2: boolean;
    compute: boolean;
  };
  expect(['A', 'B', 'C']).toContain(caps.tier);
  // Tier A/B must genuinely have compute; the contract forbids implying a
  // WebGL fallback for compute-only features (53).
  if (caps.tier === 'A' || caps.tier === 'B') expect(caps.compute).toBe(true);

  // --- no title-screen tax (2.13) -----------------------------------------
  // The boot surface must remove itself once the scene owns the viewport.
  await expect
    .poll(() => page.evaluate(() => !document.getElementById('boot')), { timeout: 15_000 })
    .toBe(true);

  // --- zero-chrome immersive default (25.1, INV-001) -----------------------
  expect(await page.evaluate(() => window.__EHF__!.chromeCount())).toBe(0);
  // And nothing in the overlay renders text by default.
  expect((await page.locator('#overlay').innerText()).trim()).toBe('');

  // --- the simulation actually advances ------------------------------------
  // A handful of real rendered frames, to prove the render path runs at all.
  await stepFrames(page, 8);
  const t0 = await page.evaluate(() => window.__EHF__!.tick());
  await page.evaluate(() => window.__EHF__!.stepSim(60));
  const t1 = await page.evaluate(() => window.__EHF__!.tick());
  expect(t1).toBeGreaterThan(t0);

  // --- pause holds simulation state (52 "Time", 25.8) ----------------------
  await page.evaluate(() => {
    window.__EHF__!.app.timeController.paused = true;
  });
  const paused0 = await page.evaluate(() => window.__EHF__!.tick());
  await stepFrames(page, 6);
  const paused1 = await page.evaluate(() => window.__EHF__!.tick());
  expect(paused1).toBe(paused0);

  // Camera must still move freely while paused.
  const moved = await page.evaluate(() => {
    const c = window.__EHF__!.app.cameraRef;
    const before = [...c.originAbs] as number[];
    c.orbit(60, 20);
    for (let i = 0; i < 20; i++) c.update(1 / 60);
    const after = [...c.originAbs] as number[];
    return Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
  });
  expect(moved).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__EHF__!.tick())).toBe(paused0);

  await page.evaluate(() => {
    window.__EHF__!.app.timeController.paused = false;
  });

  // --- rewind restores a real earlier state (8.3, 52 "Time") ---------------
  await page.evaluate(() => window.__EHF__!.stepSim(90));
  const rewind = await page.evaluate(() => {
    const bm = window.__EHF__!.app.branchManager;
    const before = bm.active.state.tick;
    const target = Math.max(bm.active.store.earliestTick(), before - 40);
    const ok = bm.seek(target);
    return { ok, before, after: bm.active.state.tick, target };
  });
  expect(rewind.ok).toBe(true);
  expect(rewind.after).toBe(rewind.target);
  expect(rewind.after).toBeLessThan(rewind.before);

  // --- fork produces an independent, initially-identical branch (8.4) ------
  const fork = await page.evaluate(() => {
    const bm = window.__EHF__!.app.branchManager;
    const parentId = bm.active.id;
    const b = bm.fork();
    return {
      newId: b.id,
      parentId,
      comparing: bm.compareId,
      forkTick: b.forkTick,
      divergence: bm.divergence(),
      branchCount: bm.all.length,
    };
  });
  expect(fork.newId).not.toBe(fork.parentId);
  // The parent is retained for comparison, so Branch Ghost has something to show.
  expect(fork.comparing).toBe(fork.parentId);
  // Identical at the fork instant: divergence must start at zero.
  expect(fork.divergence).toBeCloseTo(0, 6);
  // Only two live branches are kept, bounding checkpoint memory (8.4).
  expect(fork.branchCount).toBeLessThanOrEqual(2);

  // --- peek reveals, release restores zero chrome (25.5, 39.3) ------------
  await page.keyboard.down('KeyI');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBeGreaterThan(0);
  await page.keyboard.up('KeyI');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBe(0);

  // --- H forces the clean immersive state (25.3) --------------------------
  await page.keyboard.down('KeyT');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBeGreaterThan(0);
  await page.keyboard.press('KeyH');
  await page.keyboard.up('KeyT');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBe(0);

  // --- runtime error gate (41.5) -------------------------------------------
  expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});
