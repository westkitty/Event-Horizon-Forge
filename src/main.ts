/**
 * Entry point. Boot straight into the living scene; the loader exists only
 * while renderer/simulation prerequisites are being prepared.
 */

import { App } from './app/App';
import { safePixelRatioForTier } from './app/CapabilityProbe';
import type { PersistentAction } from './ui/Overlay';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const overlayRoot = document.getElementById('overlay') as HTMLElement;
const boot = document.getElementById('boot') as HTMLElement;
const bootBar = document.getElementById('boot-bar') as HTMLElement;
const bootProgress = document.getElementById('boot-progress') as HTMLElement;
const bootWhy = document.getElementById('boot-why') as HTMLElement;

const debug = new URLSearchParams(location.search).has('debug');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const app = new App({
  canvas,
  overlayRoot,
  debug,
  onBootProgress: (fraction, note) => {
    const percent = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
    bootBar.style.width = `${percent}%`;
    bootProgress.setAttribute('aria-valuenow', String(percent));
    bootWhy.textContent = note;
  },
});

const PERSISTENT_ACTIONS: PersistentAction[] = [
  { id: 'pause', label: 'Pause', hint: 'Pause or resume simulation' },
  { id: 'rewind', label: 'Back', hint: 'Step backward through reconstructed time' },
  { id: 'fork', label: 'Fork', hint: 'Fork a counterfactual branch' },
  { id: 'swap', label: 'Swap', hint: 'Swap active and comparison branches', disabled: true },
  { id: 'clean', label: 'Clean', hint: 'Dismiss transient instruments' },
];

const ACTION_KEYS: Record<string, string> = {
  pause: 'KeyK',
  rewind: 'KeyJ',
  fork: 'KeyY',
  swap: 'KeyX',
  clean: 'KeyH',
};

declare global {
  interface WindowEventMap {
    'ehf:toggle-persistent-controls': CustomEvent<void>;
  }

  interface Window {
    __EHF__?: {
      app: App;
      chromeCount: () => number;
      perf: () => ReturnType<App['perfSummary']>;
      capabilities: () => unknown;
      tick: () => number;
      stepFrames: (n: number) => void;
      stepSim: (n: number) => void;
      capture: (w?: number, h?: number) => Promise<string>;
      ready: boolean;
    };
  }
}

function dismissBoot(): void {
  if (!boot.isConnected) return;
  if (reducedMotion.matches) {
    boot.remove();
    return;
  }
  boot.classList.add('gone');
  window.setTimeout(() => boot.remove(), 460);
}

function dispatchSceneKey(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
}

function refreshPersistentControls(): void {
  const overlay = app.overlayRef;
  overlay.updatePersistentControl('pause', {
    label: app.timeController.paused ? 'Play' : 'Pause',
    hint: app.timeController.paused ? 'Resume simulation' : 'Pause simulation',
    pressed: app.timeController.paused,
  });
  overlay.updatePersistentControl('swap', { disabled: !app.branchManager.compare });
}

function configurePersistentControls(enabled: boolean): void {
  app.overlayRef.setPersistentControls(enabled, PERSISTENT_ACTIONS, (id) => {
    const code = ACTION_KEYS[id];
    if (!code) return;
    dispatchSceneKey(code);
    refreshPersistentControls();
  });
  refreshPersistentControls();
}

function onPersistentToggle(): void {
  const disabling = app.overlayRef.prefs.persistentControls;
  const active = document.activeElement;
  const focusWasInStrip = active instanceof HTMLElement && Boolean(active.closest('.ehf-strip'));
  configurePersistentControls(!disabling);
  if (disabling && focusWasInStrip) canvas.focus({ preventScroll: true });
}

function onInputStateKey(event: KeyboardEvent): void {
  if (!app.overlayRef.prefs.persistentControls) return;
  if (['Space', 'KeyK', 'KeyY', 'KeyX'].includes(event.code)) {
    queueMicrotask(refreshPersistentControls);
  }
}

function syncReducedMotion(): void {
  app.cameraRef.reducedMotion = reducedMotion.matches;
}

/**
 * App applies this cap during initial renderer creation through the quality
 * budget's renderScale. Re-apply it after a viewport resize because a window
 * can move to a much larger/HiDPI display after boot.
 */
function syncSafeRenderResolution(): void {
  const tier = app.capabilities.tier;
  if (tier === 'unsupported') return;
  const ratio = safePixelRatioForTier(tier, innerWidth, innerHeight, devicePixelRatio);
  app.rendererRef.setPixelRatio(ratio);
  app.rendererRef.setSize(innerWidth, innerHeight, false);
}

app
  .init()
  .then(() => {
    syncReducedMotion();
    syncSafeRenderResolution();
    configurePersistentControls(app.overlayRef.prefs.persistentControls);
    window.addEventListener('ehf:toggle-persistent-controls', onPersistentToggle);
    window.addEventListener('keyup', onInputStateKey);
    window.addEventListener('resize', syncSafeRenderResolution);
    reducedMotion.addEventListener('change', syncReducedMotion);

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
        const px = await app.captureFrameForTest(w, h);
        let s = '';
        for (let i = 0; i < px.length; i += 8192) {
          s += String.fromCharCode(...px.subarray(i, i + 8192));
        }
        return btoa(s);
      },
      ready: true,
    };

    requestAnimationFrame(() => requestAnimationFrame(dismissBoot));

    if (debug) {
      const el = document.createElement('div');
      el.style.cssText =
        'position:fixed;top:8px;left:8px;z-index:50;font:11px ui-monospace,monospace;' +
        'color:#7dd3fc;background:rgba(0,0,0,.65);padding:6px 8px;border-radius:6px;' +
        'pointer-events:none;white-space:pre';
      document.body.appendChild(el);
      const timer = window.setInterval(() => {
        const p = app.perfSummary();
        const caps = app.capabilities;
        el.textContent = p
          ? `tier ${caps.tier}  median ${p.median.toFixed(1)}ms  p95 ${p.p95.toFixed(1)}ms\n` +
            `sim ${p.simMedian.toFixed(2)}ms  frames ${p.frames}  tick ${app.branchManager.active.state.tick}\n` +
            `chrome ${app.overlayRef.chromeCount()}`
          : 'sampling...';
      }, 500);
      window.addEventListener(
        'pagehide',
        (event) => { if (!event.persisted) window.clearInterval(timer); },
        { once: true },
      );
    }
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!app.overlayRef.hasBlockingError()) {
      app.overlayRef.showBlockingError(
        'Event Horizon Forge could not start',
        message || 'The simulation failed during startup.',
        () => location.reload(),
      );
    }
    console.error('[EHF] initialisation failed', error);
    dismissBoot();
  });

window.addEventListener(
  'pagehide',
  (event) => {
    // A page entering the back/forward cache is frozen rather than destroyed.
    // Keep page-lifetime listeners attached so they still work after restore.
    if (event.persisted) return;
    window.removeEventListener('ehf:toggle-persistent-controls', onPersistentToggle);
    window.removeEventListener('keyup', onInputStateKey);
    window.removeEventListener('resize', syncSafeRenderResolution);
    reducedMotion.removeEventListener('change', syncReducedMotion);
  },
  { once: true },
);
