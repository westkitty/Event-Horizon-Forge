/** Summoned-only interface for BUILD_SPEC 25 / INV-001. */
import type { PeekKey } from '../interaction/InputRouter';

export type UiDepth = 'immersive' | 'peek' | 'inspect' | 'science' | 'settings' | 'accessibility' | 'capture';
export interface AccessibilityPrefs {
  persistentControls: boolean;
  reducedMotion: boolean;
  reducedFlash: boolean;
  highContrast: boolean;
  screenReaderEvents: boolean;
}
export interface PeekContent {
  title: string;
  rows: Array<{ label: string; value: string; fidelity?: 'A' | 'B' | 'C' }>;
  footnote?: string;
}
export interface PersistentAction {
  id: string;
  label: string;
  hint: string;
  pressed?: boolean;
  disabled?: boolean;
}
export type PersistentControlState = Partial<Omit<PersistentAction, 'id'>>;

const STORAGE_KEY = 'ehf:persistent-controls';
let nextSurfaceId = 1;

const STYLE = `
.ehf-surface{position:absolute;pointer-events:auto;width:max-content;max-width:min(360px,calc(100vw - 32px));max-height:min(72vh,560px);overflow:auto;background:rgba(5,7,12,.88);background:color-mix(in srgb,#05070c 84%,transparent);border:1px solid rgba(148,163,184,.2);border-radius:12px;padding:12px 14px;color:rgba(226,232,240,.94);font-size:12px;line-height:1.5;backdrop-filter:blur(14px) saturate(1.08);box-shadow:0 18px 48px -24px rgba(0,0,0,.9);animation:ehf-in 140ms cubic-bezier(.2,.75,.2,1);scrollbar-width:thin}
@keyframes ehf-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.ehf-surface h4{margin:0 0 8px;font-size:10px;font-weight:650;letter-spacing:.16em;text-transform:uppercase;color:rgba(184,196,214,.82)}
.ehf-rows{display:grid;gap:4px;margin:0;padding:0}.ehf-row{display:grid;grid-template-columns:minmax(7.25rem,.8fr) minmax(0,1.2fr);gap:8px 18px;align-items:baseline}.ehf-row dt,.ehf-row dd{margin:0;min-width:0}.ehf-row dt{color:rgba(168,181,201,.86)}.ehf-row dd{text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.ehf-fid{display:inline-flex;align-items:center;justify-content:center;min-width:1.5em;margin-left:6px;padding:0 4px;border:1px solid currentColor;border-radius:3px;font-size:9px;font-style:normal;font-weight:750;letter-spacing:.05em;vertical-align:1px}.ehf-fid[data-f="A"]{background:rgba(52,211,153,.14);color:#8cf0ca}.ehf-fid[data-f="B"]{background:rgba(251,191,36,.14);color:#fbd56d}.ehf-fid[data-f="C"]{background:rgba(148,163,184,.14);color:#d4dce8}.ehf-foot{margin-top:9px;font-size:11px;color:rgba(168,181,201,.72);overflow-wrap:anywhere}
.ehf-wheel{--wheel-button:56px;position:absolute;pointer-events:auto;width:0;height:0;isolation:isolate}.ehf-wheel button{--wheel-scale:1;position:absolute;left:calc(var(--wheel-button)/-2);top:calc(var(--wheel-button)/-2);width:var(--wheel-button);height:var(--wheel-button);border-radius:50%;border:1px solid rgba(148,163,184,.28);background:rgba(5,7,12,.9);color:rgba(236,241,248,.96);font-size:10px;line-height:1.1;letter-spacing:.03em;cursor:pointer;backdrop-filter:blur(10px);transform:translate(var(--wheel-x),var(--wheel-y)) scale(var(--wheel-scale));transform-origin:center;transition:transform 120ms ease,border-color 120ms ease,background 120ms ease,box-shadow 120ms ease;touch-action:manipulation}.ehf-wheel button:hover,.ehf-wheel button:focus-visible{--wheel-scale:1.07;border-color:rgba(226,232,240,.7);background:rgba(15,23,42,.96);box-shadow:0 0 0 3px rgba(147,197,253,.16);outline:none;z-index:2}
.ehf-strip{position:absolute;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:6px;max-width:calc(100vw - max(24px,env(safe-area-inset-left)) - max(24px,env(safe-area-inset-right)));overflow-x:auto;overscroll-behavior:contain;padding:2px;pointer-events:auto;scrollbar-width:none}.ehf-strip::-webkit-scrollbar{display:none}.ehf-strip button,.ehf-error button{min-width:44px;min-height:44px;padding:0 13px;border:1px solid rgba(148,163,184,.28);border-radius:9px;background:rgba(5,7,12,.9);color:rgba(236,241,248,.96);font:600 11px/1 ui-sans-serif,-apple-system,"SF Pro Text",system-ui,sans-serif;cursor:pointer;touch-action:manipulation}.ehf-strip button[aria-pressed="true"]{border-color:rgba(147,197,253,.68);background:rgba(30,41,59,.96)}.ehf-strip button:disabled{opacity:.46;cursor:not-allowed}.ehf-strip button:focus-visible,.ehf-error button:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}
.ehf-error{position:absolute;inset:0;display:grid;place-content:center;gap:12px;justify-items:center;text-align:center;background:rgba(2,4,8,.94);pointer-events:auto;padding:max(32px,env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) max(32px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left))}.ehf-error:focus{outline:none}.ehf-error h3{margin:0;font-size:16px;font-weight:650}.ehf-error p{margin:0;max-width:54ch;color:rgba(184,196,214,.86);font-size:12px;line-height:1.55}.ehf-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
#overlay[data-high-contrast="true"] .ehf-surface,#overlay[data-high-contrast="true"] .ehf-wheel button,#overlay[data-high-contrast="true"] .ehf-strip button{background:#05070c;border-color:rgba(226,232,240,.72);backdrop-filter:none}
@media(max-width:520px){.ehf-surface{width:auto;max-width:calc(100vw - 24px);max-height:66vh;padding:11px 12px}.ehf-row{grid-template-columns:1fr;gap:1px}.ehf-row dd{text-align:left}.ehf-wheel{--wheel-button:52px}.ehf-strip button{padding-inline:11px}}
@media(prefers-reduced-motion:reduce){.ehf-surface{animation:none}.ehf-wheel button{transition:none}}#overlay[data-reduced-motion="true"] .ehf-surface{animation:none}#overlay[data-reduced-motion="true"] .ehf-wheel button{transition:none}
@media(forced-colors:active){.ehf-surface,.ehf-wheel button,.ehf-strip button,.ehf-error button{forced-color-adjust:auto;background:Canvas;color:CanvasText;border-color:ButtonText;backdrop-filter:none}.ehf-fid{background:Canvas;color:CanvasText}}
`;

const FIDELITY_TITLES: Record<'A' | 'B' | 'C', string> = {
  A: 'Physically calculated from equations with documented assumptions',
  B: 'Reduced-order or calibrated surrogate',
  C: 'Illustrative visualisation only, not a physical prediction',
};

export class Overlay {
  private readonly styleEl = document.createElement('style');
  private readonly srRegion = document.createElement('div');
  private readonly motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly contrastMedia = matchMedia('(prefers-contrast: more)');
  private readonly forcedColorsMedia = matchMedia('(forced-colors: active)');
  private readonly mediaDisposers: Array<() => void> = [];
  private peekEl: HTMLElement | null = null;
  private wheelEl: HTMLElement | null = null;
  private stripEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private returnFocus: HTMLElement | null = null;
  private persistentButtons = new Map<string, HTMLButtonElement>();
  private announceTimer: number | null = null;

  depth: UiDepth = 'immersive';
  prefs: AccessibilityPrefs;

  constructor(private readonly root: HTMLElement) {
    this.prefs = {
      persistentControls: readBooleanPreference(STORAGE_KEY),
      reducedMotion: this.motionMedia.matches,
      reducedFlash: false,
      highContrast: this.contrastMedia.matches || this.forcedColorsMedia.matches,
      screenReaderEvents: false,
    };
    this.styleEl.textContent = STYLE;
    document.head.appendChild(this.styleEl);
    this.srRegion.className = 'ehf-sr';
    this.srRegion.setAttribute('role', 'status');
    this.srRegion.setAttribute('aria-live', 'polite');
    this.srRegion.setAttribute('aria-atomic', 'true');
    this.root.appendChild(this.srRegion);
    this.applyMediaPreferences();
    this.watchMedia(this.motionMedia, () => {
      this.prefs.reducedMotion = this.motionMedia.matches;
      this.applyMediaPreferences();
    });
    const onContrast = () => {
      this.prefs.highContrast = this.contrastMedia.matches || this.forcedColorsMedia.matches;
      this.applyMediaPreferences();
    };
    this.watchMedia(this.contrastMedia, onContrast);
    this.watchMedia(this.forcedColorsMedia, onContrast);
  }

  chromeCount(): number {
    return Number(Boolean(this.peekEl)) + Number(Boolean(this.wheelEl)) + Number(Boolean(this.stripEl)) + Number(Boolean(this.errorEl));
  }
  hasBlockingError(): boolean { return this.errorEl !== null; }

  showPeek(key: PeekKey, content: PeekContent, anchor?: { x: number; y: number }): void {
    this.beginTransient();
    this.removePeek(false);
    this.removeWheel(false);
    const el = document.createElement('section');
    const titleId = `ehf-surface-${nextSurfaceId++}`;
    el.className = 'ehf-surface';
    el.dataset.peek = key;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-labelledby', titleId);
    const h = document.createElement('h4');
    h.id = titleId;
    h.textContent = content.title;
    const rows = document.createElement('dl');
    rows.className = 'ehf-rows';
    for (const row of content.rows) {
      const r = document.createElement('div'); r.className = 'ehf-row';
      const dt = document.createElement('dt'); dt.textContent = row.label;
      const dd = document.createElement('dd'); dd.textContent = row.value;
      if (row.fidelity) {
        const badge = document.createElement('span');
        badge.className = 'ehf-fid'; badge.dataset.f = row.fidelity; badge.textContent = row.fidelity;
        badge.title = FIDELITY_TITLES[row.fidelity];
        badge.setAttribute('aria-label', `Fidelity ${row.fidelity}: ${FIDELITY_TITLES[row.fidelity]}`);
        dd.appendChild(badge);
      }
      r.append(dt, dd); rows.appendChild(r);
    }
    el.append(h, rows);
    if (content.footnote) {
      const foot = document.createElement('div'); foot.className = 'ehf-foot'; foot.textContent = content.footnote; el.appendChild(foot);
    }
    this.root.appendChild(el);
    this.peekEl = el;
    this.positionSurface(el, anchor);
    this.depth = 'peek';
  }

  hidePeek(): void { this.removePeek(true); }
  private removePeek(restore: boolean): void { this.peekEl?.remove(); this.peekEl = null; this.finishTransient(restore); }

  private positionSurface(el: HTMLElement, anchor?: { x: number; y: number }): void {
    el.style.cssText += ';visibility:hidden;left:0;top:0';
    const rect = el.getBoundingClientRect();
    const vv = window.visualViewport;
    const vx = vv?.offsetLeft ?? 0, vy = vv?.offsetTop ?? 0;
    const vw = vv?.width ?? innerWidth, vh = vv?.height ?? innerHeight, pad = 16;
    const maxX = Math.max(vx + pad, vx + vw - rect.width - pad);
    const maxY = Math.max(vy + pad, vy + vh - rect.height - pad);
    const x = clamp(anchor ? anchor.x + 22 : vx + pad, vx + pad, maxX);
    const y = clamp(anchor ? anchor.y + 18 : vy + vh - rect.height - pad, vy + pad, maxY);
    el.style.left = `${Math.round(x)}px`; el.style.top = `${Math.round(y)}px`; el.style.visibility = '';
  }

  showToolWheel(x: number, y: number, options: Array<{ id: string; label: string }>, onPick: (id: string) => void): void {
    if (!options.length) return;
    this.beginTransient(); this.removePeek(false); this.removeWheel(false);
    const opts = options.slice(0, 8);
    const radius = clamp(Math.min(innerWidth, innerHeight) * .105, 60, 82);
    const button = innerWidth <= 520 ? 52 : 56, margin = radius + button / 2 + 12;
    const vv = window.visualViewport;
    const vx = vv?.offsetLeft ?? 0, vy = vv?.offsetTop ?? 0;
    const vw = vv?.width ?? innerWidth, vh = vv?.height ?? innerHeight;
    const el = document.createElement('div');
    el.className = 'ehf-wheel';
    el.style.left = `${Math.round(clamp(x, vx + margin, vx + vw - margin))}px`;
    el.style.top = `${Math.round(clamp(y, vy + margin, vy + vh - margin))}px`;
    el.setAttribute('role', 'menu'); el.setAttribute('aria-label', 'Context actions');
    const buttons: HTMLButtonElement[] = [];
    opts.forEach((option, i) => {
      const angle = (i / opts.length) * Math.PI * 2 - Math.PI / 2;
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = option.label; b.setAttribute('role', 'menuitem'); b.setAttribute('aria-label', option.label);
      b.tabIndex = i === 0 ? 0 : -1;
      b.style.setProperty('--wheel-x', `${Math.cos(angle) * radius}px`); b.style.setProperty('--wheel-y', `${Math.sin(angle) * radius}px`);
      b.addEventListener('focus', () => this.setRovingIndex(buttons, i));
      b.addEventListener('click', () => { onPick(option.id); this.hideToolWheel(); });
      buttons.push(b); el.appendChild(b);
    });
    el.addEventListener('keydown', (event) => {
      const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
      let next = current;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % buttons.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.hideToolWheel(); return; }
      else return;
      event.preventDefault(); event.stopPropagation(); this.setRovingIndex(buttons, next); buttons[next].focus({ preventScroll: true });
    });
    this.root.appendChild(el); this.wheelEl = el; this.depth = 'peek'; buttons[0]?.focus({ preventScroll: true });
  }

  hideToolWheel(): void { this.removeWheel(true); }
  private removeWheel(restore: boolean): void { this.wheelEl?.remove(); this.wheelEl = null; this.finishTransient(restore); }
  private setRovingIndex(buttons: HTMLButtonElement[], active: number): void { buttons.forEach((button, i) => { button.tabIndex = i === active ? 0 : -1; }); }

  setPersistentControls(on: boolean, actions: PersistentAction[], onAction: (id: string) => void): void {
    this.prefs.persistentControls = on; writeBooleanPreference(STORAGE_KEY, on);
    this.stripEl?.remove(); this.stripEl = null; this.persistentButtons.clear();
    if (!on) return;
    const el = document.createElement('div'); el.className = 'ehf-strip'; el.setAttribute('role', 'toolbar'); el.setAttribute('aria-label', 'Persistent simulation controls');
    for (const action of actions) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.action = action.id; this.applyPersistentState(b, action);
      b.addEventListener('click', () => onAction(action.id)); this.persistentButtons.set(action.id, b); el.appendChild(b);
    }
    this.root.appendChild(el); this.stripEl = el;
  }

  updatePersistentControl(id: string, state: PersistentControlState): void { const button = this.persistentButtons.get(id); if (button) this.applyPersistentState(button, state); }
  private applyPersistentState(button: HTMLButtonElement, state: PersistentControlState): void {
    if (state.label !== undefined) button.textContent = state.label;
    if (state.hint !== undefined) { button.title = state.hint; button.setAttribute('aria-label', state.hint); }
    if (state.pressed !== undefined) button.setAttribute('aria-pressed', String(state.pressed));
    button.disabled = state.disabled ?? false;
  }

  showBlockingError(title: string, message: string, retry?: () => void): void {
    this.beginTransient(); this.removePeek(false); this.removeWheel(false); this.clearError(false);
    const el = document.createElement('div');
    const titleId = `ehf-error-title-${nextSurfaceId++}`, descId = `ehf-error-desc-${nextSurfaceId++}`;
    el.className = 'ehf-error'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', titleId); el.setAttribute('aria-describedby', descId); el.tabIndex = -1;
    const h = document.createElement('h3'); h.id = titleId; h.textContent = title;
    const p = document.createElement('p'); p.id = descId; p.textContent = message; el.append(h, p);
    let retryButton: HTMLButtonElement | null = null;
    if (retry) { retryButton = document.createElement('button'); retryButton.type = 'button'; retryButton.textContent = 'Retry'; retryButton.setAttribute('aria-label', 'Retry Event Horizon Forge'); retryButton.addEventListener('click', retry); el.appendChild(retryButton); }
    el.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const focusables = Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]'));
      if (!focusables.length) { event.preventDefault(); el.focus(); return; }
      const current = focusables.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (current - 1 + focusables.length) % focusables.length : (current + 1) % focusables.length;
      event.preventDefault(); focusables[next].focus();
    });
    this.root.appendChild(el); this.errorEl = el; this.depth = 'accessibility'; (retryButton ?? el).focus({ preventScroll: true });
  }

  clearError(restore = true): void { this.errorEl?.remove(); this.errorEl = null; this.finishTransient(restore); }
  announce(message: string): void {
    if (!this.prefs.screenReaderEvents) return;
    if (this.announceTimer !== null) clearTimeout(this.announceTimer);
    this.srRegion.textContent = '';
    this.announceTimer = window.setTimeout(() => { this.srRegion.textContent = message; this.announceTimer = null; }, 20);
  }

  clean(): void {
    const hadTransient = Boolean(this.peekEl || this.wheelEl);
    this.removePeek(false); this.removeWheel(false);
    if (hadTransient) this.restoreFocus();
    if (!this.errorEl) this.depth = 'immersive';
  }

  dispose(): void {
    this.clean(); this.clearError(false); this.stripEl?.remove(); this.srRegion.remove(); this.styleEl.remove();
    if (this.announceTimer !== null) clearTimeout(this.announceTimer);
    for (const dispose of this.mediaDisposers) dispose();
  }

  private beginTransient(): void {
    if (this.returnFocus) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) this.returnFocus = active;
  }
  private finishTransient(restore: boolean): void { if (!this.peekEl && !this.wheelEl && !this.errorEl) { this.depth = 'immersive'; if (restore) this.restoreFocus(); } }
  private restoreFocus(): void { const target = this.returnFocus; this.returnFocus = null; if (target?.isConnected) target.focus({ preventScroll: true }); }
  private applyMediaPreferences(): void { this.root.dataset.reducedMotion = String(this.prefs.reducedMotion); this.root.dataset.highContrast = String(this.prefs.highContrast); }
  private watchMedia(media: MediaQueryList, listener: () => void): void { media.addEventListener('change', listener); this.mediaDisposers.push(() => media.removeEventListener('change', listener)); }
}

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function readBooleanPreference(key: string): boolean { try { return localStorage.getItem(key) === 'true'; } catch { return false; } }
function writeBooleanPreference(key: string, value: boolean): void { try { localStorage.setItem(key, String(value)); } catch { /* Session-only fallback. */ } }
