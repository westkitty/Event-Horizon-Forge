/**
 * Determinism is the foundation of the rewind/branch contract (BUILD_SPEC 8.3,
 * 8.4). If replay does not reproduce the original bit-for-bit, then "rewind"
 * silently becomes "run something similar again", and the Branch Ghost overlay
 * would be comparing drift rather than the user's one changed decision.
 */

import { describe, expect, it } from 'vitest';
import { Rng, hashString } from '../../src/core/rng';
import { CommandLog } from '../../src/simulation/commands';
import { createWorld } from '../../src/simulation/world';
import { CheckpointStore, restoreTo, stepWorld } from '../../src/simulation/world';
import type { WorldState } from '../../src/simulation/state';
import { DEFAULT_WORLD_CONFIG } from '../../src/simulation/state';

/** Order-sensitive fingerprint of every causal float in the world. */
function fingerprint(s: WorldState): string {
  let h = 0x811c9dc5;
  const mix = (v: number) => {
    // Hash the exact bit pattern, so a 1-ulp difference is caught.
    const buf = new Float64Array([v]);
    const words = new Uint32Array(buf.buffer);
    h ^= words[0]; h = Math.imul(h, 0x01000193);
    h ^= words[1]; h = Math.imul(h, 0x01000193);
  };
  mix(s.tick);
  mix(s.scenarioTime);
  mix(s.bh.massKg);
  mix(s.bh.diskBrightness);
  for (let i = 0; i < s.plasma.pos.length; i++) mix(s.plasma.pos[i]);
  for (let i = 0; i < s.plasma.vel.length; i++) mix(s.plasma.vel[i]);
  for (let i = 0; i < s.body.pos.length; i++) mix(s.body.pos[i]);
  for (let i = 0; i < s.body.vel.length; i++) mix(s.body.vel[i]);
  for (let i = 0; i < s.body.bound.length; i++) { h ^= s.body.bound[i]; h = Math.imul(h, 0x01000193); }
  for (let i = 0; i < s.cloud.pos.length; i++) mix(s.cloud.pos[i]);
  return (h >>> 0).toString(16);
}

// Smaller populations keep the suite fast; determinism is size-independent.
const TEST_CONFIG = {
  ...DEFAULT_WORLD_CONFIG,
  plasmaCount: 512,
  bodyCount: 1024,
  cloudCount: 64,
};

describe('Rng', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const seqA = Array.from({ length: 500 }, () => a.next());
    const seqB = Array.from({ length: 500 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('save/load restores the exact stream position', () => {
    const rng = new Rng('restore-me');
    for (let i = 0; i < 37; i++) rng.next();
    const saved = rng.saveState();
    const expected = Array.from({ length: 20 }, () => rng.next());

    rng.loadState(saved);
    const actual = Array.from({ length: 20 }, () => rng.next());
    expect(actual).toEqual(expected);
  });

  it('forked streams are independent of the parent draw count', () => {
    // A fork must not shift because another subsystem drew a different number
    // of samples first — otherwise adding a particle to one system would
    // silently change another system's reconstruction.
    const parent = new Rng('root');
    const forkA = parent.fork('cloud');
    const parent2 = new Rng('root');
    const forkA2 = parent2.fork('cloud');
    expect(forkA.next()).toBe(forkA2.next());
  });

  it('normal() consumes a fixed number of draws per call', () => {
    // Box-Muller with a cached second variate would consume 2 draws on odd
    // calls and 0 on even, making stream position parity-dependent.
    const a = new Rng(7);
    a.normal();
    const afterOne = a.saveState();
    const b = new Rng(7);
    b.next();
    b.next();
    expect(b.saveState()).toEqual(afterOne);
  });

  it('hashString is stable', () => {
    expect(hashString('event-horizon-forge')).toBe(hashString('event-horizon-forge'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

describe('replay determinism', () => {
  it('reproduces an identical world when stepped twice from the same seed', () => {
    const w1 = createWorld(TEST_CONFIG);
    const r1 = new Rng(TEST_CONFIG.seed);
    const w2 = createWorld(TEST_CONFIG);
    const r2 = new Rng(TEST_CONFIG.seed);

    for (let i = 0; i < 120; i++) {
      stepWorld(w1, r1);
      stepWorld(w2, r2);
    }
    expect(fingerprint(w1)).toBe(fingerprint(w2));
  });

  it('rewind + replay lands on a bit-identical state', () => {
    const world = createWorld(TEST_CONFIG);
    const rng = new Rng(TEST_CONFIG.seed);
    const store = new CheckpointStore(20, 64);
    const log = new CommandLog();

    store.capture(world, rng);
    for (let i = 0; i < 200; i++) {
      stepWorld(world, rng);
      if (store.shouldCapture(world.tick)) store.capture(world, rng);
    }
    const truth = fingerprint(world);
    expect(world.tick).toBe(200);

    // Seek backwards, then replay forward to the same tick.
    const back = restoreTo(140, store, log, rng);
    expect(back).not.toBeNull();
    const replayed = restoreTo(200, store, log, rng);
    expect(replayed).not.toBeNull();
    expect(replayed!.state.tick).toBe(200);
    expect(fingerprint(replayed!.state)).toBe(truth);
  });

  it('restores from the nearest earlier checkpoint, not an arbitrary one', () => {
    const world = createWorld(TEST_CONFIG);
    const rng = new Rng(TEST_CONFIG.seed);
    const store = new CheckpointStore(20, 64);
    store.capture(world, rng);
    for (let i = 0; i < 100; i++) {
      stepWorld(world, rng);
      if (store.shouldCapture(world.tick)) store.capture(world, rng);
    }
    const cp = store.nearestBefore(75);
    expect(cp).not.toBeNull();
    expect(cp!.tick).toBe(60);
  });

  it('returns null when the target predates every retained checkpoint', () => {
    const store = new CheckpointStore(10, 3);
    const world = createWorld(TEST_CONFIG);
    const rng = new Rng(1);
    for (let t = 0; t < 5; t++) {
      for (let i = 0; i < 10; i++) stepWorld(world, rng);
      store.capture(world, rng);
    }
    // Ring holds only the last 3 captures (ticks 30, 40, 50).
    expect(store.nearestBefore(5)).toBeNull();
  });
});

describe('CommandLog', () => {
  it('rejects out-of-order commands', () => {
    const log = new CommandLog();
    log.push({ kind: 'bodyGrab', tick: 10 });
    expect(() => log.push({ kind: 'bodyGrab', tick: 5 })).toThrow(/out-of-order/);
  });

  it('truncatedCopy deep-copies vector payloads', () => {
    const log = new CommandLog();
    log.push({ kind: 'bodyLaunch', tick: 3, velocity: [1, 2, 3] });
    const copy = log.truncatedCopy(3);
    const original = log.toJSON()[0] as { velocity: number[] };
    const copied = copy.toJSON()[0] as { velocity: number[] };
    copied.velocity[0] = 999;
    expect(original.velocity[0]).toBe(1);
  });

  it('selects only commands at an exact tick', () => {
    const log = new CommandLog();
    log.push({ kind: 'bodyGrab', tick: 1 });
    log.push({ kind: 'bodyGrab', tick: 2 });
    log.push({ kind: 'bodyGrab', tick: 2 });
    expect(log.at(2)).toHaveLength(2);
    expect(log.at(3)).toHaveLength(0);
  });
});
