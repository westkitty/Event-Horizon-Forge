/**
 * Branching and counterfactual comparison (BUILD_SPEC 8.4, 8.5, 25.10).
 *
 * A branch is a complete, independently-steppable simulation lineage: its own
 * state, command log, checkpoint ring, and RNG stream. Forking snapshots the
 * parent at the fork tick and copies its command history up to that point, so
 * the two lineages are genuinely identical before the fork and diverge only
 * because of what the user changes afterwards. That is what makes the Branch
 * Ghost overlay meaningful — the visible divergence is caused by the one
 * changed decision, not by drift between two loosely-related runs.
 *
 * Two live branches are supported (8.4 minimum) and stepped in lockstep so
 * hold-to-compare crossfades at matched simulation time.
 */

import { Rng } from '../core/rng';
import { CommandLog, type Command } from './commands';
import { cloneWorld, type WorldState } from './state';
import { CheckpointStore, applyCommand, restoreTo, stepWorld } from './world';

export interface Branch {
  id: string;
  parentId: string | null;
  forkTick: number;
  state: WorldState;
  log: CommandLog;
  store: CheckpointStore;
  rng: Rng;
  /** Human-facing label, used only inside Inspect state. */
  label: string;
}

export class BranchManager {
  private branches = new Map<string, Branch>();
  /** The branch the user is driving. */
  activeId: string;
  /** The branch being compared against, if any. */
  compareId: string | null = null;
  private counter = 0;

  constructor(initial: WorldState, seed: number) {
    const rng = new Rng(seed ^ 0x1234567);
    const store = new CheckpointStore();
    const branch: Branch = {
      id: 'main',
      parentId: null,
      forkTick: 0,
      state: initial,
      log: new CommandLog(),
      store,
      rng,
      label: 'A',
    };
    store.capture(initial, rng);
    this.branches.set(branch.id, branch);
    this.activeId = branch.id;
  }

  get active(): Branch {
    const b = this.branches.get(this.activeId);
    if (!b) throw new Error(`Active branch ${this.activeId} missing`);
    return b;
  }

  get compare(): Branch | null {
    return this.compareId ? this.branches.get(this.compareId) ?? null : null;
  }

  get all(): Branch[] {
    return [...this.branches.values()];
  }

  /** Records a command against the active branch at its current tick. */
  submit(cmd: Command): void {
    const b = this.active;
    b.log.push(cmd);
    applyCommand(b.state, cmd);
  }

  /**
   * Steps the active branch, and the comparison branch alongside it when one
   * exists, so both timelines stay at the same tick for synchronised playback.
   */
  step(count: number): void {
    for (let i = 0; i < count; i++) {
      this.stepBranch(this.active);
      const cmp = this.compare;
      if (cmp && cmp.state.tick < this.active.state.tick) this.stepBranch(cmp);
    }
  }

  /**
   * Invariant: commands are applied exactly once per tick on each path.
   * Live play applies them in `submit` (and logs them at the same tick);
   * replay applies them in `restoreTo`. So stepping must NOT apply the log
   * again here, or a live tick would double-apply and diverge from its replay.
   */
  private stepBranch(b: Branch): void {
    stepWorld(b.state, b.rng);
    if (b.store.shouldCapture(b.state.tick)) b.store.capture(b.state, b.rng);
  }

  /** Seeks the active branch (and any comparison branch) to `tick`. */
  seek(tick: number): boolean {
    const b = this.active;
    const target = Math.max(b.store.earliestTick(), Math.max(0, tick));
    const restored = restoreTo(target, b.store, b.log, b.rng);
    if (!restored) return false;
    b.state = restored.state;

    const cmp = this.compare;
    if (cmp) {
      const cmpRestored = restoreTo(target, cmp.store, cmp.log, cmp.rng);
      if (cmpRestored) cmp.state = cmpRestored.state;
    }
    return true;
  }

  /**
   * Forks the active branch at its current tick.
   *
   * The new branch becomes active and the parent is retained as the comparison
   * target, so the very next thing the user does is already set up to be
   * compared against what would otherwise have happened.
   */
  fork(label?: string): Branch {
    const parent = this.active;
    const forkTick = parent.state.tick;
    this.counter++;

    const id = `branch-${this.counter}`;
    const rng = new Rng(parent.state.seed ^ (this.counter * 0x9e3779b9));
    rng.loadState(parent.rng.saveState());

    const store = new CheckpointStore(
      parent.store.intervalTicks,
      parent.store.capacity,
      parent.store.maxRetainedBytes,
    );
    const state = cloneWorld(parent.state);
    state.branchId = id;
    store.capture(state, rng);

    const branch: Branch = {
      id,
      parentId: parent.id,
      forkTick,
      state,
      log: parent.log.truncatedCopy(forkTick),
      store,
      rng,
      label: label ?? nextLabel(this.counter),
    };

    state.events.push({
      tick: forkTick,
      kind: 'branchFork',
      position: [...state.bh.position],
      weight: 0.4,
    });

    this.branches.set(id, branch);
    this.compareId = parent.id;
    this.activeId = id;

    // Only two live branches are kept (8.4). Retiring the oldest non-participant
    // bounds memory, which matters because each branch holds a checkpoint ring.
    this.retireExcess();
    return branch;
  }

  private retireExcess(): void {
    if (this.branches.size <= 2) return;
    const keep = new Set([this.activeId, this.compareId].filter(Boolean) as string[]);
    for (const [id, b] of this.branches) {
      if (keep.has(id)) continue;
      b.store.clear();
      this.branches.delete(id);
    }
  }

  /** Swaps which branch is being driven; the other becomes the comparison. */
  swap(): void {
    if (!this.compareId) return;
    const prevActive = this.activeId;
    this.activeId = this.compareId;
    this.compareId = prevActive;
  }

  clearComparison(): void {
    this.compareId = null;
  }

  /** Approximate divergence between the two branches, for the compare cue. */
  divergence(): number | null {
    const a = this.active;
    const b = this.compare;
    if (!b) return null;
    const ca = massCentre(a.state);
    const cb = massCentre(b.state);
    const d = Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
    return d / Math.max(1, a.state.body.radiusM);
  }

  disposeAll(): void {
    for (const b of this.branches.values()) b.store.clear();
    this.branches.clear();
  }
}

function massCentre(s: WorldState): [number, number, number] {
  const { pos, count, bound } = s.body;
  let cx = 0, cy = 0, cz = 0, n = 0;
  for (let i = 0; i < count; i++) {
    if (bound[i] === 2) continue;
    cx += pos[i * 3];
    cy += pos[i * 3 + 1];
    cz += pos[i * 3 + 2];
    n++;
  }
  return n ? [cx / n, cy / n, cz / n] : [0, 0, 0];
}

function nextLabel(n: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + (n % 26));
}
