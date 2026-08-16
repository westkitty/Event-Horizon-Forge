/**
 * Centralised pointer/key/touch intent resolution (BUILD_SPEC 24, 24.8).
 *
 * All input flows through one router with an explicit priority chain:
 * pinnedUI > transientUI > activeManipulation > selectedHandle > sceneObject
 * > camera > idle. Gestures are cancelled without committing simulation changes
 * when input is interrupted.
 */

export type GestureTarget =
  | { kind: 'empty'; id?: never }
  | { kind: 'fieldNode'; id: string }
  | { kind: 'body'; id?: never }
  | { kind: 'cloud'; id?: never }
  | { kind: 'blackHole'; id?: never };

export type PeekKey = 'time' | 'inspect' | 'camera' | 'branch' | 'help' | 'trace' | 'lightPeel';

export interface InputHandlers {
  pick(x: number, y: number): GestureTarget;

  onOrbit(dx: number, dy: number): void;
  onDolly(delta: number): void;

  onManipulateStart(target: GestureTarget, x: number, y: number): void;
  onManipulateMove(x: number, y: number, dx: number, dy: number): void;
  onManipulateEnd(x: number, y: number): void;
  onManipulateWheel(delta: number): void;

  onSelect(target: GestureTarget): void;
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
  | { kind: 'pending'; pointerId: number; target: GestureTarget }
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

const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 420;

export class InputRouter {
  private phase: Phase = { kind: 'idle' };
  private pointers = new Map<number, { x: number; y: number }>();
  private lastX = 0;
  private lastY = 0;
  private downX = 0;
  private downY = 0;
  private longPressTimer: number | null = null;

  private spaceDown = false;
  private spaceDragged = false;
  private heldPeeks = new Set<PeekKey>();
  private keys = new Set<string>();

  /** Set by the UI layer when a blocking/pinned surface owns input. */
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
      type: K,
      fn: (event: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.disposers.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    const addWin = <K extends keyof WindowEventMap>(
      type: K,
      fn: (event: WindowEventMap[K]) => void,
    ) => {
      window.addEventListener(type, fn as EventListener);
      this.disposers.push(() => window.removeEventListener(type, fn as EventListener));
    };

    add('pointerdown', this.onPointerDown);
    add('pointermove', this.onPointerMove);
    add('pointerup', this.onPointerUp);
    add('pointercancel', this.onPointerCancel);
    add('wheel', this.onWheel, { passive: false });
    add('contextmenu', (event) => event.preventDefault());
    add('dblclick', this.onDoubleClick);

    addWin('keydown', this.onKeyDown);
    addWin('keyup', this.onKeyUp);
    addWin('blur', this.cancelAll);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.disposers.push(() => document.removeEventListener('visibilitychange', this.onVisibility));
  }

  private onVisibility = (): void => {
    if (document.hidden) this.cancelAll();
  };

  /* ------------------------------- pointer ------------------------------- */

  private onPointerDown = (event: PointerEvent): void => {
    if (this.pinnedUiActive) return;
    // Only primary and secondary mouse buttons own scene gestures. Middle and
    // auxiliary buttons retain their browser/device meaning and cannot mutate
    // simulation state accidentally.
    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2) return;

    this.handlers.onPointerActivity();
    this.element.focus({ preventScroll: true });
    this.element.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.downX = event.clientX;
    this.downY = event.clientY;

    if (this.pointers.size === 2 && event.pointerType === 'touch') {
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

    if (this.spaceDown) {
      this.phase = { kind: 'timeScrub', pointerId: event.pointerId };
      this.spaceDragged = true;
      return;
    }

    if (event.button === 2) {
      this.phase = { kind: 'camera', pointerId: event.pointerId };
      return;
    }

    const target = this.handlers.pick(event.clientX, event.clientY);
    // Do not mutate on pointer-down. The pointer must cross a small intent
    // threshold before camera/manipulation starts; a stationary long press is
    // reserved for the contextual tool wheel.
    this.phase = { kind: 'pending', pointerId: event.pointerId, target };

    if (target.kind !== 'empty') {
      this.longPressTimer = window.setTimeout(() => {
        this.longPressTimer = null;
        if (this.phase.kind !== 'pending' || this.phase.pointerId !== event.pointerId) return;
        const moved = Math.hypot(this.lastX - this.downX, this.lastY - this.downY);
        if (moved < DRAG_THRESHOLD) {
          this.handlers.onSelect(target);
          this.handlers.onToolWheel(target, this.downX, this.downY);
          this.phase = { kind: 'idle' };
        }
      }, LONG_PRESS_MS);
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    const record = this.pointers.get(event.pointerId);
    if (record) {
      record.x = event.clientX;
      record.y = event.clientY;
    }
    this.handlers.onPointerActivity();

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;

    if (this.phase.kind === 'touchCamera') {
      const a = this.pointers.get(this.phase.ids[0]);
      const b = this.pointers.get(this.phase.ids[1]);
      if (a && b) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        this.handlers.onDolly((this.phase.lastDist - dist) * 2.2);
        this.handlers.onOrbit(midX - this.phase.lastMidX, midY - this.phase.lastMidY);
        this.phase.lastDist = dist;
        this.phase.lastMidX = midX;
        this.phase.lastMidY = midY;
      }
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      return;
    }

    if (this.phase.kind === 'pending') {
      const movedX = event.clientX - this.downX;
      const movedY = event.clientY - this.downY;
      if (Math.hypot(movedX, movedY) >= DRAG_THRESHOLD) {
        this.clearLongPress();
        const target = this.phase.target;
        if (target.kind === 'empty') {
          this.phase = { kind: 'camera', pointerId: event.pointerId };
          this.handlers.onOrbit(movedX, movedY);
        } else {
          this.phase = { kind: 'manipulate', pointerId: event.pointerId, target };
          this.handlers.onManipulateStart(target, this.downX, this.downY);
          this.handlers.onManipulateMove(event.clientX, event.clientY, movedX, movedY);
        }
      }
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      return;
    }

    if (Math.hypot(event.clientX - this.downX, event.clientY - this.downY) > DRAG_THRESHOLD) {
      this.clearLongPress();
    }

    switch (this.phase.kind) {
      case 'camera':
        this.handlers.onOrbit(dx, dy);
        break;
      case 'manipulate':
        this.handlers.onManipulateMove(event.clientX, event.clientY, dx, dy);
        break;
      case 'timeScrub':
        this.handlers.onScrub(dx);
        break;
      case 'idle':
        break;
    }

    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.clearLongPress();
    this.pointers.delete(event.pointerId);
    this.releaseCapture(event.pointerId);

    if (this.phase.kind === 'manipulate' && this.phase.pointerId === event.pointerId) {
      this.handlers.onManipulateEnd(event.clientX, event.clientY);
    } else if (this.phase.kind === 'pending' && this.phase.pointerId === event.pointerId) {
      this.handlers.onSelect(this.phase.target);
    }
    if (this.pointers.size < 2) this.phase = { kind: 'idle' };
  };

  private onPointerCancel = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    this.releaseCapture(event.pointerId);
    this.cancelGesture();
  };

  private onDoubleClick = (event: MouseEvent): void => {
    if (this.pinnedUiActive) return;
    const target = this.handlers.pick(event.clientX, event.clientY);
    this.handlers.onFocus(target);
  };

  private onWheel = (event: WheelEvent): void => {
    if (this.pinnedUiActive) return;
    event.preventDefault();
    this.handlers.onPointerActivity();

    if (this.phase.kind === 'manipulate') {
      this.handlers.onManipulateWheel(event.deltaY);
      return;
    }
    if (this.spaceDown) {
      this.spaceDragged = true;
      this.handlers.onRateNudge(event.deltaY > 0 ? -1 : 1);
      return;
    }
    this.handlers.onDolly(event.deltaY);
  };

  /* -------------------------------- keys --------------------------------- */

  private onKeyDown = (event: KeyboardEvent): void => {
    if (isTextEntry(event.target)) return;

    // The accessibility toggle remains reachable even while focus is inside
    // Persistent Controls; all other UI-key input stays owned by that surface.
    if (event.code === 'KeyH' && event.shiftKey) {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent('ehf:toggle-persistent-controls'));
      return;
    }

    if (isUiControl(event.target) && event.code !== 'Escape') return;

    if (event.code === 'Space') {
      event.preventDefault();
      if (!this.spaceDown) {
        this.spaceDown = true;
        this.spaceDragged = false;
      }
      return;
    }

    if (this.keys.has(event.code)) return;
    this.keys.add(event.code);

    const peek = PEEK_KEYS[event.code];
    if (peek) {
      event.preventDefault();
      // Peek is exclusive by design. A new held instrument cleanly replaces
      // the previous one so chorded keys cannot leave stale UI state.
      for (const held of this.heldPeeks) {
        if (held !== peek) this.handlers.onPeekEnd(held);
      }
      this.heldPeeks.clear();
      this.heldPeeks.add(peek);
      this.handlers.onPeekStart(peek);
      return;
    }

    switch (event.code) {
      case 'KeyF':
        this.handlers.onFocus(this.handlers.pick(this.lastX, this.lastY));
        break;
      case 'KeyK':
        this.handlers.onTogglePause();
        break;
      case 'KeyJ':
        this.handlers.onSeekStep(-1);
        break;
      case 'KeyL':
        this.handlers.onSeekStep(1);
        break;
      case 'KeyV':
        this.handlers.onDirectorToggle();
        break;
      case 'KeyR':
        this.handlers.onEventReturn();
        break;
      case 'KeyH':
        this.endHeldPeeks();
        this.handlers.onClean();
        break;
      case 'KeyY':
        this.handlers.onFork();
        break;
      case 'KeyX':
        this.handlers.onSwapBranch();
        break;
      case 'Tab':
        // With the opt-in accessibility strip visible, preserve native Tab so
        // keyboard users can enter it. Otherwise Tab keeps its scene-cycle role.
        if (document.querySelector('.ehf-strip')) break;
        event.preventDefault();
        this.handlers.onCycleSelection();
        break;
      case 'Escape':
        this.cancelGesture(false);
        this.endHeldPeeks();
        this.handlers.onEscape();
        break;
      case 'Backspace':
        event.preventDefault();
        this.handlers.onSeekStep(event.shiftKey ? 1 : -1);
        break;
      default:
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);

    if (event.code === 'Space' && this.spaceDown) {
      this.spaceDown = false;
      if (!this.spaceDragged) this.handlers.onTogglePause();
      this.spaceDragged = false;
      if (this.phase.kind === 'timeScrub') this.phase = { kind: 'idle' };
      return;
    }

    const peek = PEEK_KEYS[event.code];
    if (peek && this.heldPeeks.has(peek)) {
      this.heldPeeks.delete(peek);
      this.handlers.onPeekEnd(peek);
      return;
    }

    if (isTextEntry(event.target)) return;
  };

  /** Called once per frame so flight remains frame-rate independent. */
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

  private endHeldPeeks(): void {
    for (const peek of this.heldPeeks) this.handlers.onPeekEnd(peek);
    this.heldPeeks.clear();
  }

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private cancelGesture(resetApp = true): void {
    this.clearLongPress();
    if (resetApp && this.phase.kind === 'manipulate') this.handlers.onEscape();
    this.phase = { kind: 'idle' };
  }

  cancelAll = (): void => {
    this.cancelGesture();
    for (const pointerId of this.pointers.keys()) this.releaseCapture(pointerId);
    this.pointers.clear();
    this.keys.clear();
    this.spaceDown = false;
    this.spaceDragged = false;
    this.endHeldPeeks();
  };

  dispose(): void {
    this.cancelAll();
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
  }

  private releaseCapture(pointerId: number): void {
    if (this.element.hasPointerCapture(pointerId)) this.element.releasePointerCapture(pointerId);
  }
}

function isTextEntry(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

function isUiControl(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(el.closest('button, a[href], input, textarea, select, summary, [role="button"], [role="menuitem"], [role="toolbar"], [role="dialog"], [role="alertdialog"]'));
}
