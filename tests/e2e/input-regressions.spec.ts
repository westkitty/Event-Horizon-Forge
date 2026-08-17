import { expect, test } from '@playwright/test';

test('UI/input regressions: persistent controls, repeat guards, BFCache, and touch escalation', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__EHF__?.ready === true, null, { timeout: 90_000 });

  const scene = page.locator('#scene');
  await scene.focus();

  // Shift+H is an edge-triggered accessibility toggle. OS key-repeat must not
  // oscillate the persistent toolbar while the user holds the shortcut.
  await scene.dispatchEvent('keydown', { code: 'KeyH', shiftKey: true, repeat: false });
  await scene.dispatchEvent('keydown', { code: 'KeyH', shiftKey: true, repeat: true });
  await scene.dispatchEvent('keyup', { code: 'KeyH', shiftKey: true });
  const toolbar = page.locator('.ehf-strip[role="toolbar"]');
  await expect(toolbar).toHaveCount(1);

  // A page entering the back/forward cache is frozen, not destroyed. The
  // page-lifetime accessibility listeners must still work after restoration.
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  });
  await scene.dispatchEvent('keydown', { code: 'KeyH', shiftKey: true, repeat: false });
  await scene.dispatchEvent('keyup', { code: 'KeyH', shiftKey: true });
  await expect(toolbar).toHaveCount(0);

  // Persistent Controls intentionally route through the same keyboard grammar.
  // Synthetic events target Window, so the router's UI-target checks must be
  // type-safe rather than assuming EventTarget has Element.closest().
  const pauseTransition = await page.evaluate(() => {
    const before = window.__EHF__!.app.timeController.paused;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyK', bubbles: true }));
    const after = window.__EHF__!.app.timeController.paused;
    return { before, after };
  });
  expect(pauseTransition.after).toBe(!pauseTransition.before);

  // Exercise the router directly so a one-finger scene manipulation escalating
  // to a two-finger camera gesture cannot leave App manipulation state stale.
  const touchLog = await page.evaluate(async () => {
    const moduleUrl = '/src/interaction/InputRouter.ts';
    const { InputRouter } = await import(/* @vite-ignore */ moduleUrl);
    const target = document.createElement('div');
    document.body.appendChild(target);
    Object.defineProperty(target, 'setPointerCapture', { value: () => {} });
    Object.defineProperty(target, 'releasePointerCapture', { value: () => {} });
    Object.defineProperty(target, 'hasPointerCapture', { value: () => false });

    const log: string[] = [];
    const router = new InputRouter(target, {
      pick: () => ({ kind: 'body' }),
      onOrbit: () => {},
      onDolly: () => {},
      onManipulateStart: () => log.push('start'),
      onManipulateMove: () => log.push('move'),
      onManipulateEnd: () => log.push('end'),
      onManipulateWheel: () => {},
      onSelect: () => {},
      onFocus: () => {},
      onToolWheel: () => {},
      onTogglePause: () => {},
      onScrub: () => {},
      onRateNudge: () => {},
      onSeekStep: () => {},
      onPeekStart: () => {},
      onPeekEnd: () => {},
      onFork: () => {},
      onSwapBranch: () => {},
      onDirectorToggle: () => {},
      onEventReturn: () => {},
      onCycleSelection: () => {},
      onClean: () => {},
      onEscape: () => log.push('escape'),
      onFlyAxis: () => {},
      onPointerActivity: () => {},
    });

    const fire = (type: string, init: PointerEventInit) => {
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, ...init }));
    };
    fire('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 });
    fire('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 110, clientY: 100 });
    fire('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 100 });
    router.dispose();
    target.remove();
    return log;
  });
  expect(touchLog).toContain('start');
  expect(touchLog).toContain('escape');
  expect(touchLog).not.toContain('end');

  expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
});
