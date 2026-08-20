/**
 * Simulation orchestration: one universe, three domains (BUILD_SPEC 2.2, 12).
 *
 * The Gate 0 scenario places the formation cloud, the plasma containment
 * chamber, and the black hole in ONE coordinate space and ONE state object,
 * stepped by ONE tick counter. They are separated by distance, not by being
 * different applications — which is the specific failure mode 53 prohibits
 * ("three separate route pages pretending to be integration"). Scale frames
 * (core/scale.ts) are what make a single space spanning 10^5 m to 10^16 m
 * tractable.
 */

import { Rng } from '../core/rng';
import { ASTRO, gravitationalRadius } from '../core/scale';
import { applyBrush, createCloud, stepCloud } from './cloud';
import type { Command } from './commands';
import { CommandLog } from './commands';
import { createBody, launchBody, stepBody, translateBody } from './body';
import { createPlasma, stepPlasma } from './plasma';
import {
  cloneWorld,
  worldByteSize,
  type FieldNode,
  type SimEvent,
  type Vec3,
  type WorldConfig,
  type WorldState,
  DEFAULT_WORLD_CONFIG,
} from './state';
import { DOMAIN_SECONDS_PER_TICK } from './time';

/** Universal ticks between formation-domain steps. See stepWorld(). */
export const CLOUD_STRIDE = 8;

/** Spatial layout of the Gate 0 scenario, in absolute metres. */
export const LAYOUT = {
  blackHole: [0, 0, 0] as Vec3,
  /**
   * ~135 r_g out. Placed so that a tangential release at ~0.42 v_circular puts
   * periapsis near 13 r_g — inside the tidal radius (~18 r_g) but outside the
   * ISCO (6 r_g), i.e. the star is torn apart rather than swallowed whole.
   * Half an orbit is ~2000 ticks, so an encounter plays out in seconds of
   * wall time at rate 1. Verified in tests/unit/physics.test.ts.
   */
  bodyStart: [8.0e11, 2.0e11, 0] as Vec3,
  /** The fictional containment chamber (BUILD_SPEC 5.4), far from the hole. */
  plasmaCentre: [0, 2.0e14, 0] as Vec3,
  plasmaRadius: 5.0e4,
  /** ~0.1 pc molecular cloud. */
  cloudCentre: [-8.0e15, 1.5e15, -3.0e15] as Vec3,
  cloudRadius: 3.0e15,
  cloudMassKg: 500 * ASTRO.SOLAR_MASS,
} as const;

export function createWorld(config: WorldConfig = DEFAULT_WORLD_CONFIG): WorldState {
  const rng = new Rng(config.seed);
  const massKg = config.blackHoleSolarMasses * ASTRO.SOLAR_MASS;

  const plasma = createPlasma(
    config.plasmaCount,
    LAYOUT.plasmaCentre,
    LAYOUT.plasmaRadius,
    rng.fork('plasma').nextUint(),
  );

  const body = createBody(
    config.bodyCount,
    LAYOUT.bodyStart,
    ASTRO.SOLAR_MASS,
    ASTRO.SOLAR_RADIUS,
    rng.fork('body').nextUint(),
    'star:gate0-primary',
  );

  const cloud = createCloud(
    config.cloudCount,
    LAYOUT.cloudCentre,
    LAYOUT.cloudRadius,
    LAYOUT.cloudMassKg,
    rng.fork('cloud').nextUint(),
  );

  return {
    tick: 0,
    scenarioTime: 0,
    seed: config.seed,
    branchId: 'main',
    bh: {
      massKg,
      spin: 0.6,
      position: [...LAYOUT.blackHole] as Vec3,
      axis: normalise([0.18, 1, 0.06]),
      diskBrightness: 0.32,
      diskInnerRg: 6,
      diskOuterRg: 34,
      accretedKg: 0,
    },
    fieldNodes: defaultFieldNodes(),
    plasma,
    body,
    cloud,
    events: [],
    massLedger: {
      initialKg: ASTRO.SOLAR_MASS + LAYOUT.cloudMassKg,
      accretedKg: 0,
      unboundKg: 0,
    },
  };
}

/**
 * Two opposed dipoles plus a solenoid: the minimum configuration that produces
 * a genuine magnetic bottle (mirror points at each dipole, a field null between
 * them) so the plasma is really confined by geometry rather than by a boundary
 * condition. Gate 0 requires >= 2 movable elements (39.1.5).
 */
function defaultFieldNodes(): FieldNode[] {
  const c = LAYOUT.plasmaCentre;
  const d = LAYOUT.plasmaRadius * 1.9;
  const moment = 6.25e18;
  return [
    {
      id: 'node-a',
      kind: 'ring',
      position: [c[0], c[1] - d, c[2]],
      moment: [0, moment, 0],
      radius: LAYOUT.plasmaRadius * 0.42,
      enabled: true,
      provenanceId: 'field:gate0-a',
    },
    {
      id: 'node-b',
      kind: 'ring',
      position: [c[0], c[1] + d, c[2]],
      moment: [0, -moment, 0],
      radius: LAYOUT.plasmaRadius * 0.42,
      enabled: true,
      provenanceId: 'field:gate0-b',
    },
    {
      id: 'node-c',
      kind: 'solenoid',
      position: [c[0] + d * 0.85, c[1], c[2]],
      moment: [-moment * 0.55, 0, 0],
      radius: LAYOUT.plasmaRadius * 0.55,
      enabled: true,
      provenanceId: 'field:gate0-c',
    },
  ];
}

/**
 * Applies one command to the state. Pure with respect to the tick: calling this
 * during live play and during replay must produce identical results, which is
 * why nothing here reads wall-clock time or unseeded randomness.
 */
export function applyCommand(state: WorldState, cmd: Command): void {
  switch (cmd.kind) {
    case 'cloudBrush':
      applyBrush(
        state.cloud,
        cmd.brush,
        cmd.centre,
        cmd.radius,
        cmd.strength,
        cmd.axis,
        DOMAIN_SECONDS_PER_TICK.formation,
      );
      break;

    case 'fieldNodeMove': {
      const n = state.fieldNodes.find((x) => x.id === cmd.id);
      if (n) n.position = [...cmd.position] as Vec3;
      break;
    }
    case 'fieldNodeMoment': {
      const n = state.fieldNodes.find((x) => x.id === cmd.id);
      if (n) n.moment = [...cmd.moment] as Vec3;
      break;
    }
    case 'fieldNodeToggle': {
      const n = state.fieldNodes.find((x) => x.id === cmd.id);
      if (n) n.enabled = cmd.enabled;
      break;
    }
    case 'fieldNodeAdd':
      state.fieldNodes.push({
        id: cmd.id,
        kind: cmd.nodeKind,
        position: [...cmd.position] as Vec3,
        moment: [...cmd.moment] as Vec3,
        radius: cmd.radius,
        enabled: true,
        provenanceId: `field:${cmd.id}`,
      });
      break;

    case 'bodyGrab':
      state.body.launched = false;
      break;

    case 'bodyMove': {
      const com = bodyCentre(state);
      translateBody(state.body, [
        cmd.position[0] - com[0],
        cmd.position[1] - com[1],
        cmd.position[2] - com[2],
      ]);
      break;
    }

    case 'bodyLaunch':
      launchBody(state.body, cmd.velocity);
      state.events.push({
        tick: cmd.tick,
        kind: 'bodyLaunched',
        position: bodyCentre(state),
        weight: 0.6,
      });
      break;

    case 'blackHoleMass':
      state.bh.massKg = cmd.massKg;
      break;

    case 'blackHoleSpin':
      state.bh.spin = Math.min(0.998, Math.max(0, cmd.spin));
      break;
  }
}

function bodyCentre(state: WorldState): Vec3 {
  const { pos, count, bound } = state.body;
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

/**
 * Advances every domain by exactly one universal tick.
 *
 * `rng` must be the world's replay RNG, advanced in lockstep with the tick
 * count, so a replayed tick draws the same numbers as the live one.
 */
export function stepWorld(state: WorldState, rng: Rng): void {
  const events: SimEvent[] = state.events;

  stepPlasma(state.plasma, state.fieldNodes, DOMAIN_SECONDS_PER_TICK.plasma, state.tick, events, rng);

  const bodyResult = stepBody(
    state.body,
    state.bh,
    DOMAIN_SECONDS_PER_TICK.relativistic,
    state.tick,
    events,
  );

  if (bodyResult.accretedKg > 0) {
    state.bh.accretedKg += bodyResult.accretedKg;
    state.massLedger.accretedKg += bodyResult.accretedKg;
    state.bh.massKg += bodyResult.accretedKg;
    // Accretion brightens the disk; decays back toward the quiescent level.
    const bump = Math.min(0.5, bodyResult.accretedKg / (state.body.massKg * 0.02));
    if (bump > 0.05 && state.bh.diskBrightness < 0.9) {
      events.push({
        tick: state.tick,
        kind: 'accretionBrighten',
        position: [...state.bh.position] as Vec3,
        weight: 0.7,
      });
    }
    state.bh.diskBrightness = Math.min(1.6, state.bh.diskBrightness + bump);
  }
  state.bh.diskBrightness += (0.32 - state.bh.diskBrightness) * 0.004;

  // The formation domain is stepped once every CLOUD_STRIDE universal ticks
  // with a correspondingly larger dt. Its direct-summation solver is O(N^2) and
  // it advances ~10 yr per tick against a ~2.2e4 yr free-fall time, so running
  // it at the full tick rate spent most of the CPU budget resolving a timescale
  // that does not need it. Keyed on the tick counter, so replay is unaffected.
  if (state.tick % CLOUD_STRIDE === 0) {
    stepCloud(state.cloud, DOMAIN_SECONDS_PER_TICK.formation * CLOUD_STRIDE, LAYOUT.cloudRadius);
  }

  state.tick++;
  state.scenarioTime += DOMAIN_SECONDS_PER_TICK.relativistic;

  // Bound the event list; Moment Marks only needs recent, high-weight entries.
  if (events.length > 512) events.splice(0, events.length - 512);
}

function normalise(v: Vec3): Vec3 {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

/* -------------------------------------------------------------------------- */
/* Checkpoints                                                                 */
/* -------------------------------------------------------------------------- */

export const DEFAULT_CHECKPOINT_INTERVAL_TICKS = 120;
export const DEFAULT_CHECKPOINT_CAPACITY = 120;
export const DEFAULT_CHECKPOINT_MEMORY_BYTES = 32 * 1024 * 1024;

export interface Checkpoint {
  tick: number;
  state: WorldState;
  rngState: [number, number];
  /** Approximate retained bytes of the deep-copied causal state. */
  bytes: number;
}

/**
 * Periodic full snapshots for deterministic rewind (BUILD_SPEC 8.3.2).
 *
 * The old Gate 0 defaults retained up to 240 ~1.77 MB snapshots PER BRANCH,
 * around 425 MB, and two live branches could double that. A count bound is not
 * a meaningful memory bound when snapshot size varies with quality tier.
 *
 * This store therefore applies three limits:
 * - one snapshot per second at the normal 120 tick/s rate by default;
 * - a generous count ceiling for small worlds;
 * - a hard approximate byte ceiling, keeping at least one checkpoint so rewind
 *   never loses its reconstruction anchor entirely.
 */
export class CheckpointStore {
  private ring: Checkpoint[] = [];
  private retainedBytesTotal = 0;

  constructor(
    readonly intervalTicks = DEFAULT_CHECKPOINT_INTERVAL_TICKS,
    readonly capacity = DEFAULT_CHECKPOINT_CAPACITY,
    readonly maxRetainedBytes = DEFAULT_CHECKPOINT_MEMORY_BYTES,
  ) {}

  shouldCapture(tick: number): boolean {
    return tick % this.intervalTicks === 0;
  }

  capture(state: WorldState, rng: Rng): void {
    const snapshot = cloneWorld(state);
    const cp: Checkpoint = {
      tick: state.tick,
      state: snapshot,
      rngState: rng.saveState(),
      bytes: worldByteSize(snapshot),
    };

    this.ring.push(cp);
    this.retainedBytesTotal += cp.bytes;

    // Oldest-first eviction keeps time ordering obvious and ensures memory is
    // actually released when the byte budget is reached.
    while (
      this.ring.length > 1 &&
      (this.ring.length > this.capacity || this.retainedBytesTotal > this.maxRetainedBytes)
    ) {
      const removed = this.ring.shift();
      if (removed) this.retainedBytesTotal -= removed.bytes;
    }
  }

  /** Nearest checkpoint at or before `tick`, or null if none is retained. */
  nearestBefore(tick: number): Checkpoint | null {
    let best: Checkpoint | null = null;
    for (const cp of this.ring) {
      if (cp.tick <= tick && (!best || cp.tick > best.tick)) best = cp;
    }
    return best;
  }

  earliestTick(): number {
    return this.ring.length ? this.ring[0].tick : 0;
  }

  /** Discards checkpoints after `tick`; used when a branch diverges. */
  truncateAfter(tick: number): void {
    this.ring = this.ring.filter((cp) => cp.tick <= tick);
    this.retainedBytesTotal = this.ring.reduce((sum, cp) => sum + cp.bytes, 0);
  }

  get count(): number {
    return this.ring.length;
  }

  get retainedBytes(): number {
    return this.retainedBytesTotal;
  }

  clear(): void {
    this.ring = [];
    this.retainedBytesTotal = 0;
  }
}

/**
 * Restores to `targetTick` by rewinding to a checkpoint and replaying commands.
 *
 * This is the mechanism that lets the build claim rewind honestly: no velocity
 * negation (explicitly prohibited, 53), and the reconstructed state is produced
 * by the same solver that produced the original.
 *
 * Returns the number of ticks replayed, or -1 if no checkpoint covers the target.
 */
export function restoreTo(
  targetTick: number,
  store: CheckpointStore,
  log: CommandLog,
  rng: Rng,
): { state: WorldState; replayed: number } | null {
  const cp = store.nearestBefore(targetTick);
  if (!cp) return null;

  const state = cloneWorld(cp.state);
  rng.loadState(cp.rngState);

  let replayed = 0;
  while (state.tick < targetTick) {
    for (const cmd of log.at(state.tick)) applyCommand(state, cmd);
    stepWorld(state, rng);
    replayed++;
  }
  return { state, replayed };
}
