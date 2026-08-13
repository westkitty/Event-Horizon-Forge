/**
 * Summoned-only interface (BUILD_SPEC 25, INV-001).
 *
 * This is a hard product contract, not a style preference. In `immersive` the
 * overlay renders ZERO elements — not hidden ones, not transparent ones, not a
 * "minimal HUD". `chromeCount()` exists so the Gate 0 harness and the Playwright
 * suite can assert that objectively (39.3: "persistent immersive chrome count:
 * must be zero information panels/toolbars/text labels in the clean state").
 *
 * The root is `pointer-events: none`; only currently-revealed controls opt back
 * in (25.3). Peek surfaces are created on press and destroyed on release, so no
 * stale control can survive a gesture (39.3: "hold-to-peek interactions leave no
 * stale controls after release").
 */

import type { PeekKey } from '../interaction/InputRouter';

export type UiDepth =
  | 'immersive'
  | 'peek'
  | 'inspect'
  | 'science'
  | 'settings'
  | 'accessibility'
  | 'capture';

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

const STYLE = `
.ehf-surface{
  position:absolute; pointer-events:auto;
  background:color-mix(in srgb, #05070c 82%, transparent);
  border:1px solid rgba(148,163,184,.16);
  border-radius:10px; padding:12px 14px;
  color:rgba(226,232,240,.92); font-size:12px; line-height:1.55;
  backdrop-filter:blur(14px) saturate(1.1);
  box-shadow:0 18px 48px -24px rgba(0,0,0,.9);
  animation:ehf-in 140ms ease-out;
  max-width:min(340px, 42vw);
}
@keyframes ehf-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.ehf-surface h4{
  margin:0 0 8px; font-size:10px; font-weight:600;
  letter-spacing:.16em; text-transform:uppercase; color:rgba(148,163,184,.78);
}
.ehf-row{display:flex; justify-content:space-between; gap:18px; white-space:nowrap;}
.ehf-row span:first-child{color:rgba(148,163,184,.82)}
.ehf-row span:last-child{font-variant-numeric:tabular-nums}
.ehf-fid{
  display:inline-block; margin-left:6px; padding:0 4px; border-radius:3px;
  font-size:9px; font-weight:700; letter-spacing:.05em; vertical-align:1px;
}
.ehf-fid[data-f="A"]{background:rgba(52,211,153,.16); color:#6ee7b7}
.ehf-fid[data-f="B"]{background:rgba(251,191,36,.16); color:#fcd34d}
.ehf-fid[data-f="C"]{background:rgba(148,163,184,.16); color:#cbd5e1}
.ehf-foot{margin-top:8px; font-size:11px; color:rgba(148,163,184,.6)}
.ehf-wheel{
  position:absolute; pointer-events:auto; transform:translate(-50%,-50%);
  display:grid; place-items:center; width:0; height:0;
}
.ehf-wheel button{
  position:absolute; width:56px; height:56px; border-radius:50%;
  border:1px solid rgba(148,163,184,.2); background:rgba(5,7,12,.86);
  color:rgba(226,232,240,.9); font-size:10px; letter-spacing:.04em;
  cursor:pointer; backdrop-filter:blur(10px);
  transition:transform 120ms ease, border-color 120ms ease, background 120ms ease;
}
.ehf-wheel button:hover,.ehf-wheel button:focus-visible{
  transform:scale(1.09); border-color:rgba(226,232,240,.55);
  background:rgba(15,23,42,.94); outline:none;
}
.ehf-strip{
  position:absolute; left:50%; bottom:18px; transform:translateX(-50%);
  display:flex; gap:6px; pointer-events:auto;
}
.ehf-strip button{
  min-width:44px; height:36px; padding:0 12px;
  border:1px solid rgba(148,163,184,.22); border-radius:8px;
  background:rgba(5,7,12,.86); color:rgba(226,232,240,.9);
  font-size:11px; cursor:pointer;
}
.ehf-strip button:focus-visible{outline:2px solid #93c5fd; outline-offset:2px}
.ehf-error{
  position:absolute; inset:0; display:grid; place-content:center; gap:10px;
  justify-items:center; text-align:center; background:rgba(2,4,8,.92);
  pointer-events:auto; padding:32px;
}
.ehf-error h3{margin:0; font-size:15px; font-weight:600}
.ehf-error p{margin:0; max-width:52ch; color:rgba(148,163,184,.82); font-size:12px}
.ehf-sr{
  position:absolute; width:1px; height:1px; overflow:hidden;
  clip:rect(0 0 0 0); white-space:nowrap;
}
@media (prefers-reduced-motion:reduce){
  .ehf-surface{animation:none}
  .ehf-wheel button{transition:none}
}
`;

export class Overlay {
  private readonly root: HTMLElement;
  private readonly styleEl: HTMLStyleElement;
  private readonly srRegion: HTMLElement;

  private peekEl: HTMLElement | null = null;
  private wheelEl: HTMLElement | null = null;
  private stripEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;

  depth: UiDepth = 'immersive';
  prefs: AccessibilityPrefs = {
    persistentControls: false,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    reducedFlash: false,
    highContrast: false,
    screenReaderEvents: false,
  };

  constructor(root: HTMLElement) {
    this.root = root;
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = STYLE;
    document.head.appendChild(this.styleEl);

    // Screen-reader live region. Visually hidden, so it never counts as chrome,
    // but it carries event summaries when the user enables them (26).
    this.srRegion = document.createElement('div');
    this.srRegion.className = 'ehf-sr';
    this.srRegion.setAttribute('role', 'status');
    this.srRegion.setAttribute('aria-live', 'polite');
    this.root.appendChild(this.srRegion);
  }

  /**
   * Number of visible interface elements. MUST be 0 in immersive mode unless
   * the user explicitly enabled Persistent Controls (25.16, 26).
   */
  chromeCount(): number {
    let n = 0;
    if (this.peekEl) n++;
    if (this.wheelEl) n++;
    if (this.stripEl) n++;
    if (this.errorEl) n++;
    return n;
  }

  /* ------------------------------- peek ---------------------------------- */

  showPeek(key: PeekKey, content: PeekContent, anchor?: { x: number; y: number }): void {
    // Only one transient cluster at a time (25.2 chrome budget).
    this.hidePeek();
    const el = document.createElement('div');
    el.className = 'ehf-surface';
    el.dataset.peek = key;

    const h = document.createElement('h4');
    h.textContent = content.title;
    el.appendChild(h);

    for (const row of content.rows) {
      const r = document.createElement('div');
      r.className = 'ehf-row';
      const l = document.createElement('span');
      l.textContent = row.label;
      const v = document.createElement('span');
      v.textContent = row.value;
      if (row.fidelity) {
        const f = document.createElement('i');
        f.className = 'ehf-fid';
        f.dataset.f = row.fidelity;
        f.textContent = row.fidelity;
        f.title = FIDELITY_TITLES[row.fidelity];
        v.appendChild(f);
      }
      r.append(l, v);
      el.appendChild(r);
    }

    if (content.footnote) {
      const f = document.createElement('div');
      f.className = 'ehf-foot';
      f.textContent = content.footnote;
      el.appendChild(f);
    }

    // Anchor near the interaction locus, clamped into the viewport, and never
    // centred over the phenomenon (25.25).
    if (anchor) {
      const x = Math.min(window.innerWidth - 360, Math.max(16, anchor.x + 22));
      const y = Math.min(window.innerHeight - 220, Math.max(16, anchor.y + 18));
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    } else {
      el.style.left = '22px';
      el.style.bottom = '22px';
    }

    this.root.appendChild(el);
    this.peekEl = el;
    this.depth = 'peek';
  }

  hidePeek(): void {
    this.peekEl?.remove();
    this.peekEl = null;
    if (!this.wheelEl && !this.errorEl) this.depth = 'immersive';
  }

  /* ---------------------------- tool wheel -------------------------------- */

  showToolWheel(
    x: number,
    y: number,
    options: Array<{ id: string; label: string }>,
    onPick: (id: string) => void,
  ): void {
    this.hideToolWheel();
    // 4-8 choices maximum per invocation (25.6).
    const opts = options.slice(0, 8);
    const el = document.createElement('div');
    el.className = 'ehf-wheel';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.setAttribute('role', 'menu');

    const radius = 78;
    opts.forEach((o, i) => {
      const angle = (i / opts.length) * Math.PI * 2 - Math.PI / 2;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.label;
      b.setAttribute('role', 'menuitem');
      b.style.transform = `translate(${Math.cos(angle) * radius - 28}px, ${Math.sin(angle) * radius - 28}px)`;
      b.addEventListener('click', () => {
        onPick(o.id);
        this.hideToolWheel();
      });
      el.appendChild(b);
    });

    this.root.appendChild(el);
    this.wheelEl = el;
    this.depth = 'peek';
    (el.querySelector('button') as HTMLButtonElement | null)?.focus();
  }

  hideToolWheel(): void {
    this.wheelEl?.remove();
    this.wheelEl = null;
    if (!this.peekEl && !this.errorEl) this.depth = 'immersive';
  }

  /* --------------------- persistent controls (opt-in) --------------------- */

  /**
   * Accessibility alternative (26, 25.16). Off by default and first-class when
   * enabled: it is a deliberate alternate presentation, not a violation of the
   * immersive default.
   */
  setPersistentControls(
    on: boolean,
    actions: Array<{ id: string; label: string; hint: string }>,
    onAction: (id: string) => void,
  ): void {
    this.prefs.persistentControls = on;
    this.stripEl?.remove();
    this.stripEl = null;
    if (!on) return;

    const el = document.createElement('div');
    el.className = 'ehf-strip';
    el.setAttribute('role', 'toolbar');
    el.setAttribute('aria-label', 'Simulation controls');
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.label;
      b.title = a.hint;
      b.setAttribute('aria-label', a.hint);
      b.addEventListener('click', () => onAction(a.id));
      el.appendChild(b);
    }
    this.root.appendChild(el);
    this.stripEl = el;
  }

  /* -------------------------------- errors -------------------------------- */

  /** The only legitimate interruption (25.15). */
  showBlockingError(title: string, message: string, retry?: () => void): void {
    this.clearError();
    const el = document.createElement('div');
    el.className = 'ehf-error';
    el.setAttribute('role', 'alertdialog');
    const h = document.createElement('h3');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = message;
    el.append(h, p);
    if (retry) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Retry in reduced mode';
      b.addEventListener('click', retry);
      el.appendChild(b);
    }
    this.root.appendChild(el);
    this.errorEl = el;
  }

  clearError(): void {
    this.errorEl?.remove();
    this.errorEl = null;
  }

  /* ------------------------------- a11y ----------------------------------- */

  announce(message: string): void {
    if (!this.prefs.screenReaderEvents) return;
    this.srRegion.textContent = message;
  }

  /** Force-clears every transient surface (the `H` clean action, 25.3). */
  clean(): void {
    this.hidePeek();
    this.hideToolWheel();
    this.depth = 'immersive';
  }

  dispose(): void {
    this.clean();
    this.clearError();
    this.stripEl?.remove();
    this.srRegion.remove();
    this.styleEl.remove();
  }
}

const FIDELITY_TITLES: Record<'A' | 'B' | 'C', string> = {
  A: 'Physically calculated from equations with documented assumptions',
  B: 'Reduced-order or calibrated surrogate',
  C: 'Illustrative visualisation only — not a physical prediction',
};
