/**
 * Entry point. No title screen, no "Start Simulation" gate (BUILD_SPEC 2.13):
 * boot straight into a living scene as soon as the renderer and the essential
 * assets are ready, and remove the boot surface from the viewport entirely.
 */

import { App } from './app/App';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const overlayRoot = document.getElementById('overlay') as HTMLElement;
const boot = document.getElementById('boot') as HTMLElement;
const bootBar = document.getElementById('boot-bar') as HTMLElement;
const bootWhy = document.getElementById('boot-why') as HTMLElement;

const debug = new URLSearchParams(location.search).has('debug');

const app = new App({
  canvas,
  overlayRoot,
  debug,
  onBootProgress: (fraction, note) => {
    bootBar.style.width = `${Math.round(fraction * 100)}%`;
    bootWhy.textContent = note;
  },
});

// Exposed for the Playwright suite and for the Gate 0 evidence capture. This is
// a test/debug seam, not production UI: nothing here draws to the screen.
declare global {
  interface Window {
    __EHF__?: {
      app: App;
      chromeCount: () => number;
      perf: () => ReturnType<App['perfSummary']>;
      capabilities: () => unknown;
      tick: () => number;
      /** Test seam: drives frames explicitly (headless rAF is throttled). */
      stepFrames: (n: number) => void;
      /** Test seam: advances simulation only, no rendering. */
      stepSim: (n: number) => void;
      /** Test seam: offscreen render + pixel readback for visual QA. */
      capture: (w?: number, h?: number) => Promise<string>;
      ready: boolean;
    };
  }
}

app
  .init()
  .then(() => {
    app.start();

    window.__EHF__ = {
      app,
      chromeCount: () => app.overlayRef.chromeCount(),
      perf: () => app.perfSummary(),
      capabilities: () => app.capabilities,
      tick: () => app.branchManager.active.state.tick,
      stepFrames: (n: number) => app.stepFramesForTest(n),
      stepSim: (n: number) => app.stepSimForTest(n),
      capture: async (w?: number, h?: number) => {
        // Base64, not a number[]: a 800x500 readback is 1.6M entries and
        // serialising that over CDP as JSON crashes the page.
        const px = await app.captureFrameForTest(w, h);
        let s = '';
        for (let i = 0; i < px.length; i += 8192) {
          s += String.fromCharCode(...px.subarray(i, i + 8192));
        }
        return btoa(s);
      },
      ready: true,
    };

    // Let one frame land before dissolving the boot surface, so the user never
    // sees a black gap between the loader and the scene.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        boot.classList.add('gone');
        setTimeout(() => boot.remove(), 1000);
      });
    });

    if (debug) {
      // Debug instrumentation is available only behind the flag (39.1.15).
      const el = document.createElement('div');
      el.style.cssText =
        'position:fixed;top:8px;left:8px;z-index:50;font:11px ui-monospace,monospace;' +
        'color:#7dd3fc;background:rgba(0,0,0,.65);padding:6px 8px;border-radius:6px;' +
        'pointer-events:none;white-space:pre';
      document.body.appendChild(el);
      setInterval(() => {
        const p = app.perfSummary();
        const caps = app.capabilities;
        el.textContent = p
          ? `tier ${caps.tier}  median ${p.median.toFixed(1)}ms  p95 ${p.p95.toFixed(1)}ms\n` +
            `sim ${p.simMedian.toFixed(2)}ms  frames ${p.frames}  tick ${app.branchManager.active.state.tick}\n` +
            `chrome ${app.overlayRef.chromeCount()}`
          : 'sampling…';
      }, 500);
    }
  })
  .catch((err) => {
    // Never strand the user behind a blank canvas (25.15, 45).
    boot.classList.remove('gone');
    bootBar.style.width = '100%';
    bootWhy.textContent = String(err?.message ?? err);
    console.error('[EHF] initialisation failed', err);
  });
