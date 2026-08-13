/**
 * Deterministic command log (BUILD_SPEC 8.3, 8.4).
 *
 * Every user action that changes causal state is recorded as a timestamped,
 * serialisable command rather than being applied directly. This is what makes
 * rewind honest: seeking backward restores the nearest earlier checkpoint and
 * replays the commands forward, so the reconstructed history is the *same*
 * history rather than an approximation. It is also what makes Fork cheap — a
 * branch is the parent's command list truncated at the fork tick, plus whatever
 * the user does next.
 */

import type { CloudBrush } from './cloud';
import type { FieldElementKind, Vec3 } from './state';

export type Command =
  | { kind: 'cloudBrush'; tick: number; brush: CloudBrush; centre: Vec3; radius: number; strength: number; axis: Vec3 }
  | { kind: 'fieldNodeMove'; tick: number; id: string; position: Vec3 }
  | { kind: 'fieldNodeMoment'; tick: number; id: string; moment: Vec3 }
  | { kind: 'fieldNodeToggle'; tick: number; id: string; enabled: boolean }
  | { kind: 'fieldNodeAdd'; tick: number; id: string; nodeKind: FieldElementKind; position: Vec3; moment: Vec3; radius: number }
  | { kind: 'bodyGrab'; tick: number }
  | { kind: 'bodyMove'; tick: number; position: Vec3 }
  | { kind: 'bodyLaunch'; tick: number; velocity: Vec3 }
  | { kind: 'blackHoleMass'; tick: number; massKg: number }
  | { kind: 'blackHoleSpin'; tick: number; spin: number };

export type CommandKind = Command['kind'];

export class CommandLog {
  private commands: Command[] = [];

  /** Commands must be appended in non-decreasing tick order. */
  push(cmd: Command): void {
    const last = this.commands[this.commands.length - 1];
    if (last && cmd.tick < last.tick) {
      throw new Error(
        `CommandLog: out-of-order command (${cmd.tick} < ${last.tick}). ` +
          `Replay determinism depends on monotonic ordering.`,
      );
    }
    this.commands.push(cmd);
  }

  /** All commands scheduled for exactly this tick. */
  at(tick: number): Command[] {
    // Linear scan is fine: the log is small and this runs once per replayed tick.
    const result: Command[] = [];
    for (let i = 0; i < this.commands.length; i++) {
      const c = this.commands[i];
      if (c.tick === tick) result.push(c);
      else if (c.tick > tick) break;
    }
    return result;
  }

  /** Commands in [from, to). Used to replay a span in one pass. */
  between(from: number, to: number): Command[] {
    return this.commands.filter((c) => c.tick >= from && c.tick < to);
  }

  /** Copy truncated at `tick` — the basis of a fork. */
  truncatedCopy(tick: number): CommandLog {
    const log = new CommandLog();
    log.commands = this.commands.filter((c) => c.tick <= tick).map(cloneCommand);
    return log;
  }

  /** Drops everything after `tick`. Used when the user edits a rewound branch. */
  truncateInPlace(tick: number): void {
    this.commands = this.commands.filter((c) => c.tick <= tick);
  }

  get size(): number {
    return this.commands.length;
  }

  lastTick(): number {
    const last = this.commands[this.commands.length - 1];
    return last ? last.tick : 0;
  }

  toJSON(): Command[] {
    return this.commands.map(cloneCommand);
  }

  static fromJSON(data: Command[]): CommandLog {
    const log = new CommandLog();
    log.commands = data.map(cloneCommand);
    return log;
  }
}

function cloneCommand(c: Command): Command {
  // Commands carry only primitives and Vec3 tuples, so a shallow copy plus
  // explicit tuple copies is a complete deep copy.
  const copy = { ...c } as Record<string, unknown>;
  for (const key of ['centre', 'axis', 'position', 'moment', 'velocity']) {
    const v = copy[key];
    if (Array.isArray(v)) copy[key] = [...v];
  }
  return copy as Command;
}
