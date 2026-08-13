/**
 * Centralised pointer/key/touch intent resolution (BUILD_SPEC 24, 24.8).
 *
 * All input flows through one router with an explicit priority chain
 *
 *   pinnedUI > transientUI > activeManipulation > selectedHandle > sceneObject
 *            > camera > idle
 *
 * rather than letting the camera, the scene and DOM components each attach
 * their own listeners and fight over events (24.8). Pointer capture is explicit,
 * and every in-flight gesture is cancelled on blur, visibility loss, pointer
 * cancellation and scenario unload, so a gesture can never be left half-applied.
 */

export type GestureTarget =
  | { kind: 'empty' }
  | { kind: 'fieldNode'; id: string }
  | { kind: 'body' }
  | { kind: 'cloud' }
  | { kind: 'blackHole' };

export type PeekKey = 'time' | 'inspect' | 'camera' | 'branch' | 'help' | 'trace' | 'lightPeel';

export interface InputHandlers {
  /** Hit-test at screen coordinates; the router does not know about the scene. */
  pick(x: number, y: number): GestureTarget;

  onOrbit(dx: number, dy: number): void;
  onDolly(delta: number): void;

  onManipulateStart(target: GestureTarget, x: number, y: number): void;
  onManipulateMove(x: number, y: number, dx: number, dy: number): void;
  onManipulateEnd(x: number, y: number): void;
  /** Wheel during an active manipulation changes radius/strength/depth (24.1). */
  onManipulateWheel(delta: number): void;

  onFocus(target: GestureTarget): void;
  onToolWheel(target: GestureTarget, x: number, y: number): void;

  onTogglePause(): void;
  onScrub(deltaTicks: number): void;
  onRateNudge(direction: 1 | -1): void;
  onSeekStep(direction: -1 | 1): void;

  onPeekStart(key: PeekKey): void;
  onPeekEnd(key: PeekKey): void;

  onFork(): void;
  onSwapBranch(): void;
  onDirectorToggle(): void;
  onEventReturn(): void;
  onCycleSelection(): void;
  onClean(): void;
  onEscape(): void;
  onFlyAxis(axis: [number, number, number], boost: boolean): void;
  onPointerActivity(): void;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'camera'; pointerId: number }
  | { kind: 'manipulate'; pointerId: number; target: GestureTarget }
  | { kind: 'timeScrub'; pointerId: number }
  | { kind: 'touchCamera'; ids: [number, number]; lastDist: number; lastMidX: number; lastMidY: number };

const PEEK_KEYS: Record<string, PeekKey> = {
  KeyT: 'time',
  KeyI: 'inspect',
  KeyC: 'camera',
  KeyB: 'branch',
  KeyG: 'trace',
  KeyP: 'lightPeel',
  Slash: 'help',
};

export class InputRouter {
  private phase: Phase = { kind: 'idle' };
  private pointers = new Map<number, { x: number; y: number }>();
  private lastX = 0;
  private lastY = 0;
  private downX = 0;
  private downY = 0;
  private downTime = 0;
  private longPressTimer: number | null = null;

  private spaceDown = false;
  private spaceDragged = false;
  private heldPeeks = new Set<PeekKey>();
  private keys = new Set<string>();

  /** Set by the UI layer when a pinned surface owns input (24.8 top priority). */
  pinnedUiActive = false;

  private disposers: Array<() => void> = [];

  constructor(
    private readonly element: HTMLElement,
    private readonly handlers: InputHandlers,
  ) {
    this.attach();
  }

  private attach(): void {
    const el = this.element;
    const add = <K extends keyof HTMLElementEventMap>(
      t: K,
      fn: (e: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      el.addEventListener(t, fn as EventListener, opts);
      this.disposers.push(() => el.removeEventListener(t, fn as EventListener, opts));
    };
    const addWin = <K extends keyof WindowEventMap>(
      t: K,
      fn: (e: WindowEventMap[K]) => void,
    ) => {
      window.addEventListener(t, fn as EventListener);
      this.disposers.push(() => window.removeEventListener(t, fn as EventListener));
    };

    add('pointerdown', this.onPointerDown);
    add('pointermove', this.onPointerMove);
    add('pointerup', this.onPointerUp);
    add('pointercancel', this.onPointerCancel);
    add('wheel', this.onWheel, { passive: false });
    add('contextmenu', (e) => e.preventDefault());
    add('dblclick', this.onDoubleClick);

    addWin('keydown', this.onKeyDown);
    addWin('keyup', this.onKeyUp);
    // Any of these can strand a gesture; cancel explicitly (24.8).
    addWin('blur', this.cancelAll);
    addWin('contextmenu', () => {});
    document.addEventListener('visibilitychange', this.onVisibility);
    this.disposers.push(() =>
      document.removeEventListener('visibilitychange', this.onVisibility),
    );
  }

  private onVisibility = (): void => {
    if (document.hidden) this.cancelAll();
  };

  /* ------------------------------- pointer ------------------------------- */

  private onPointerDown = (e: PointerEvent): void => {
    if (this.pinnedUiActive) return;
    this.handlers.onPointerActivity();
    this.element.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downTime = performance.now();

    // Two touches: camera orbit/pinch, matching 24.2.
    if (this.pointers.size === 2 && e.pointerType === 'touch') {
      this.clearLongPress();
      const [a, b] = [...this.pointers.entries()];
      this.phase = {
        kind: 'touchCamera',
        ids: [a[0], b[0]],
        lastDist: Math.hypot(a[1].x - b[1].x, a[1].y - b[1].y),
        lastMidX: (a[1].x + b[1].x) / 2,
        lastMidY: (a[1].y + b[1].y) / 2,
      };
      return;
    }
    if (this.pointers.size > 1) return;

    // Space + drag = temporal scrub, and must not also orbit the camera (24.1).
    if (this.spaceDown) {
      this.phase = { kind: 'timeScrub', pointerId: e.pointerId };
      this.spaceDragged = true;
      return;
    }

    // Secondary button is the explicit camera-orbit fallback (24.1).
    if (e.button === 2) {
      this.phase = { kind: 'camera', pointerId: e.pointerId };
      return;
    }

    const target = this.handlers.pick(e.clientX, e.clientY);
    if (target.kind === 'empty') {
      this.phase = { kind: 'camera', pointerId: e.pointerId };
    } else {
      this.phase = { kind: 'manipulate', pointerId: e.pointerId, target };
      this.handlers.onManipulateStart(target, e.clientX, e.clientY);
    }

    // Long press summons the context tool wheel at the interaction locus (25.6).
    this.longPressTimer = window.setTimeout(() => {
      this.longPressTimer = null;
      if (this.phase.kind === 'manipulate' || this.phase.kind === 'camera') {
        const moved = Math.hypot(this.lastX - this.downX, this.lastY - this.downY);
        if (moved < 6) {
          this.handlers.onToolWheel(target, this.downX, this.downY);
          this.cancelGesture();
        }
      }
    }, 420);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rec = this.pointers.get(e.pointerId);
    if (rec) {
      rec.x = e.clientX;
      rec.y = e.clientY;
    }
    this.handlers.onPointerActivity();

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;

    if (this.phase.kind === 'touchCamera') {
      const a = this.pointers.get(this.phase.ids[0]);
      const b = this.pointers.get(this.phase.ids[1]);
      if (a && b) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        // Pinch is semantic zoom; two-finger drag is orbit (24.2).
        this.handlers.onDolly((this.phase.lastDist - dist) * 2.2);
        this.handlers.onOrbit(midX - this.phase.lastMidX, midY - this.phase.lastMidY);
        this.phase.lastDist = dist;
        this.phase.lastMidX = midX;
        this.phase.lastMidY = midY;
      }
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      return;
    }

    if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 6) {
      this.clearLongPress();
    }

    switch (this.phase.kind) {
      case 'camera':
        this.handlers.onOrbit(dx, dy);
        break;
      case 'manipulate':
        this.handlers.onManipulateMove(e.clientX, e.clientY, dx, dy);
        break;
      case 'timeScrub':
        this.handlers.onScrub(dx);
        break;
      case 'idle':
        break;
    }

    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.clearLongPress();
    this.pointers.delete(e.pointerId);
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }

    if (this.phase.kind === 'manipulate') {
      this.handlers.onManipulateEnd(e.clientX, e.clientY);
    }
    if (this.pointers.size < 2) this.phase = { kind: 'idle' };
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.cancelGesture();
  };

  private onDoubleClick = (e: MouseEvent): void => {
    if (this.pinnedUiActive) return;
    const target = this.handlers.pick(e.clientX, e.clientY);
    this.handlers.onFocus(target);
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.pinnedUiActive) return;
    e.preventDefault();
    this.handlers.onPointerActivity();

    // Wheel while a manipulation is armed alters that gesture, not the camera.
    if (this.phase.kind === 'manipulate') {
      this.handlers.onManipulateWheel(e.deltaY);
      return;
    }
    // Wheel while Space is held is a coarse time-rate change (24.1).
    if (this.spaceDown) {
      this.spaceDragged = true;
      this.handlers.onRateNudge(e.deltaY > 0 ? -1 : 1);
      return;
    }
    this.handlers.onDolly(e.deltaY);
  };

  /* -------------------------------- keys --------------------------------- */

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTextEntry(e.target)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.spaceDown) {
        this.spaceDown = true;
        this.spaceDragged = false;
      }
      return;
    }

    if (this.keys.has(e.code)) return;
    this.keys.add(e.code);

    const peek = PEEK_KEYS[e.code];
    if (peek) {
      e.preventDefault();
      if (!this.heldPeeks.has(peek)) {
        this.heldPeeks.add(peek);
        this.handlers.onPeekStart(peek);
      }
      return;
    }

    switch (e.code) {
      case 'KeyF': this.handlers.onFocus(this.handlers.pick(this.lastX, this.lastY)); break;
      case 'KeyK': this.handlers.onTogglePause(); break;
      case 'KeyJ': this.handlers.onSeekStep(-1); break;
      case 'KeyL': this.handlers.onSeekStep(1); break;
      // BUILD_SPEC 24.3 recommends `D` for Director, but 22.1 recommends WASD
      // for free flight — a direct conflict in the contract's own defaults.
      // Flight is the far higher-frequency action, so it keeps `D` and the
      // Director moves to `V`. Recorded in docs/controls.md.
      case 'KeyV': this.handlers.onDirectorToggle(); break;
      case 'KeyR': this.handlers.onEventReturn(); break;
      case 'KeyH': this.handlers.onClean(); break;
      case 'KeyY': this.handlers.onFork(); break;
      case 'KeyX': this.handlers.onSwapBranch(); break;
      case 'Tab': e.preventDefault(); this.handlers.onCycleSelection(); break;
      case 'Escape': this.handlers.onEscape(); break;
      case 'Backspace':
        e.preventDefault();
        this.handlers.onSeekStep(e.shiftKey ? 1 : -1);
        break;
      default: break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (isTextEntry(e.target)) return;
    this.keys.delete(e.code);

    if (e.code === 'Space') {
      this.spaceDown = false;
      // A tap (no drag, no wheel) is play/pause; a drag was a scrub (24.1).
      if (!this.spaceDragged) this.handlers.onTogglePause();
      this.spaceDragged = false;
      if (this.phase.kind === 'timeScrub') this.phase = { kind: 'idle' };
      return;
    }

    const peek = PEEK_KEYS[e.code];
    if (peek && this.heldPeeks.has(peek)) {
      this.heldPeeks.delete(peek);
      this.handlers.onPeekEnd(peek);
    }
  };

  /** Called once per frame so flight is frame-rate independent. */
  pumpFlight(): void {
    const axis: [number, number, number] = [0, 0, 0];
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) axis[0] -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) axis[0] += 1;
    if (this.keys.has('KeyQ')) axis[1] -= 1;
    if (this.keys.has('KeyE')) axis[1] += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) axis[2] += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) axis[2] -= 1;
    this.handlers.onFlyAxis(axis, this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
  }

  /* ------------------------------ lifecycle ------------------------------ */

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private cancelGesture(): void {
    this.clearLongPress();
    if (this.phase.kind === 'manipulate') {
      this.handlers.onManipulateEnd(this.lastX, this.lastY);
    }
    this.phase = { kind: 'idle' };
  }

  cancelAll = (): void => {
    this.cancelGesture();
    this.pointers.clear();
    this.keys.clear();
    this.spaceDown = false;
    this.spaceDragged = false;
    for (const p of this.heldPeeks) this.handlers.onPeekEnd(p);
    this.heldPeeks.clear();
  };

  dispose(): void {
    this.cancelAll();
    for (const d of this.disposers) d();
    this.disposers = [];
  }
}

function isTextEntry(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable === true;
}
