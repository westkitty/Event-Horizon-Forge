/**
 * Gate 0 browser checks (BUILD_SPEC 41.3, 39.3).
 *
 * Scope stays limited to what headless Chromium can prove honestly. WebGPU
 * visual fidelity and real performance remain outside this suite; the existing
 * test seams drive bounded frames only for functional state verification.
 */

import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function stepFrames(page: Page, total: number, chunk = 10): Promise<void> {
  for (let done = 0; done < total; done += chunk) {
    await page.evaluate((n) => window.__EHF__!.stepFrames(n), Math.min(chunk, total - done));
    await page.waitForTimeout(16);
  }
}

test('Gate 0: boot, zero chrome, time, rewind, branch, and interaction quality', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__EHF__?.ready === true, null, { timeout: 90_000 });

  const caps = (await page.evaluate(() => window.__EHF__!.capabilities())) as {
    tier: string;
    webgpu: boolean;
    webgl2: boolean;
    compute: boolean;
  };
  expect(['A', 'B', 'C']).toContain(caps.tier);
  if (caps.tier === 'A' || caps.tier === 'B') expect(caps.compute).toBe(true);

  await expect.poll(() => page.evaluate(() => !document.getElementById('boot')), { timeout: 15_000 }).toBe(true);
  expect(await page.evaluate(() => window.__EHF__!.chromeCount())).toBe(0);
  expect((await page.locator('#overlay').innerText()).trim()).toBe('');

  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport ?? '').not.toContain('user-scalable=no');
  await expect(page.locator('#scene')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('#scene')).toHaveAttribute('aria-label', /Interactive Event Horizon Forge/);
  const touchActions = await page.evaluate(() => ({
    body: getComputedStyle(document.body).touchAction,
    canvas: getComputedStyle(document.getElementById('scene')!).touchAction,
  }));
  expect(touchActions.canvas).toBe('none');
  expect(touchActions.body).not.toBe('none');

  await stepFrames(page, 8);
  const t0 = await page.evaluate(() => window.__EHF__!.tick());
  await page.evaluate(() => window.__EHF__!.stepSim(60));
  const t1 = await page.evaluate(() => window.__EHF__!.tick());
  expect(t1).toBeGreaterThan(t0);

  await page.evaluate(() => { window.__EHF__!.app.timeController.paused = true; });
  const paused0 = await page.evaluate(() => window.__EHF__!.tick());
  await stepFrames(page, 6);
  const paused1 = await page.evaluate(() => window.__EHF__!.tick());
  expect(paused1).toBe(paused0);

  const moved = await page.evaluate(() => {
    const camera = window.__EHF__!.app.cameraRef;
    const before = [...camera.originAbs] as number[];
    camera.orbit(60, 20);
    for (let i = 0; i < 20; i++) camera.update(1 / 60);
    const after = [...camera.originAbs] as number[];
    return Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
  });
  expect(moved).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__EHF__!.tick())).toBe(paused0);
  await page.evaluate(() => { window.__EHF__!.app.timeController.paused = false; });

  await page.evaluate(() => window.__EHF__!.stepSim(90));
  const rewind = await page.evaluate(() => {
    const manager = window.__EHF__!.app.branchManager;
    const before = manager.active.state.tick;
    const target = Math.max(manager.active.store.earliestTick(), before - 40);
    const ok = manager.seek(target);
    return { ok, before, after: manager.active.state.tick, target };
  });
  expect(rewind.ok).toBe(true);
  expect(rewind.after).toBe(rewind.target);
  expect(rewind.after).toBeLessThan(rewind.before);

  const fork = await page.evaluate(() => {
    const manager = window.__EHF__!.app.branchManager;
    const parentId = manager.active.id;
    const branch = manager.fork();
    return {
      newId: branch.id,
      parentId,
      comparing: manager.compareId,
      forkTick: branch.forkTick,
      divergence: manager.divergence(),
      branchCount: manager.all.length,
    };
  });
  expect(fork.newId).not.toBe(fork.parentId);
  expect(fork.comparing).toBe(fork.parentId);
  expect(fork.divergence).toBeCloseTo(0, 6);
  expect(fork.branchCount).toBeLessThanOrEqual(2);

  await page.keyboard.down('KeyI');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBe(1);
  await expect(page.locator('.ehf-surface[role="region"]')).toHaveCount(1);
  await expect(page.locator('.ehf-surface dl')).toHaveCount(1);
  await page.keyboard.down('KeyT');
  await expect(page.locator('.ehf-surface')).toHaveAttribute('data-peek', 'time');
  expect(await page.evaluate(() => window.__EHF__!.chromeCount())).toBe(1);
  await page.keyboard.up('KeyI');
  await expect(page.locator('.ehf-surface')).toHaveAttribute('data-peek', 'time');
  await page.keyboard.up('KeyT');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBe(0);

  await page.keyboard.down('KeyC');
  const wheel = page.locator('.ehf-wheel[role="menu"]');
  await expect(wheel).toHaveCount(1);
  const wheelButtons = wheel.locator('button[role="menuitem"]');
  await expect(wheelButtons.first()).toBeFocused();
  const radialOffset = await wheelButtons.first().evaluate((button) => {
    const matrix = new DOMMatrix(getComputedStyle(button).transform);
    return Math.hypot(matrix.e, matrix.f);
  });
  expect(radialOffset).toBeGreaterThan(20);
  await page.keyboard.press('ArrowRight');
  await expect(wheelButtons.nth(1)).toBeFocused();
  await page.keyboard.up('KeyC');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBe(0);

  await page.evaluate(() => {
    const app = window.__EHF__!.app as unknown as { selection: { kind: 'fieldNode'; id: string } };
    app.selection = { kind: 'fieldNode', id: 'node-c' };
  });
  await page.keyboard.down('KeyI');
  const kindRow = page.locator('.ehf-row').filter({ hasText: 'Kind' });
  await expect(kindRow.locator('dd')).toContainText('solenoid');
  await page.keyboard.up('KeyI');

  await page.locator('#scene').focus();
  await page.keyboard.press('Shift+KeyH');
  const toolbar = page.locator('.ehf-strip[role="toolbar"]');
  await expect(toolbar).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('ehf:persistent-controls'))).toBe('true');
  await page.keyboard.press('Tab');
  await expect(toolbar.locator('button').first()).toBeFocused();
  const minButtonSize = await toolbar.locator('button').evaluateAll((buttons) =>
    Math.min(...buttons.flatMap((button) => {
      const rect = button.getBoundingClientRect();
      return [rect.width, rect.height];
    })),
  );
  expect(minButtonSize).toBeGreaterThanOrEqual(44);

  const pause = toolbar.locator('button[data-action="pause"]');
  await pause.click();
  await expect(pause).toHaveText('Play');
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await pause.click();
  await expect(pause).toHaveText('Pause');
  await expect(pause).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Shift+KeyH');
  await expect(toolbar).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ehf:persistent-controls'))).toBe('false');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBe(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => window.__EHF__!.app.overlayRef.prefs.reducedMotion)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__EHF__!.app.cameraRef.reducedMotion)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.evaluate(() => {
    window.__EHF__!.app.overlayRef.showBlockingError('Test failure', 'Recovery copy', () => {});
  });
  const dialog = page.locator('[role="alertdialog"]');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.locator('button')).toBeFocused();
  await page.evaluate(() => window.__EHF__!.app.overlayRef.clearError());
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBe(0);

  await page.keyboard.down('KeyT');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBeGreaterThan(0);
  await page.keyboard.press('KeyH');
  await page.keyboard.up('KeyT');
  await expect.poll(() => page.evaluate(() => window.__EHF__!.chromeCount())).toBe(0);

  expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});
