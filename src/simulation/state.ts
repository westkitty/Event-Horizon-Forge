/**
 * Authoritative simulation state (BUILD_SPEC 6, 28.3).
 *
 * Everything that carries causal weight lives here in float64 and is snapshot-
 * able, because rewind restores a checkpoint and replays commands forward
 * (BUILD_SPEC 8.3). Purely illustrative populations — the ~10^5-10^6 cloud
 * tracers — are deliberately NOT in this struct: they are reconstructed from a
 * deterministic seed, which is the explicitly permitted strategy in 8.3(6) and
 * keeps checkpoints small enough to take several times a second.
 *
 * Rendering never mutates this. It reads it and owns its own GPU buffers.
 */

import { ASTRO, gravitationalRadius, schwarzschildRadius } from '../core/scale';

export type Vec3 = [number, number, number];

export type MatterPhase =
  | 'dust'
  | 'neutralGas'
  | 'ionizedGas'
  | 'plasma'
  | 'condensedBody'
  | 'stellarFluidProxy'
  | 'debris'
  | 'accretionTracer';

export type GravityClass =
  | 'tracer'
  | 'distributedMass'
  | 'body'
  | 'protostar'
  | 'star'
  | 'compactObject'
  | 'blackHole';

/** Fidelity classes from BUILD_SPEC 2.6. Surfaced in Science peek, never faked. */
export type FidelityClass = 'A' | 'B' | 'C';

export type FieldElementKind = 'dipole' | 'ring' | 'solenoid';

export interface FieldNode {
  id: string;
  kind: FieldElementKind;
  position: Vec3;
  /** Magnetic moment direction * strength. Sign flip = polarity reversal. */
  moment: Vec3;
  /** Softening length in metres; also the drawn extent of a ring/solenoid. */
  radius: number;
  enabled: boolean;
  provenanceId: string;
}

/**
 * Plasma is stored as charged macro-particles pushed by an analytic field
 * (BUILD_SPEC 10.2). These are simulation particles, not visual tracers, and
 * their count is deliberately modest so the state stays snapshot-able.
 */
export interface PlasmaState {
  count: number;
  pos: Float64Array; // 3N metres
  vel: Float64Array; // 3N m/s
  /** 0 = escaped/lost, 1 = confined. Escaped particles keep drifting. */
  alive: Uint8Array;
  /** Charge-to-mass proxy, q/m. Uniform for the gate slice. */
  chargeToMass: number;
  /** Thermal velocity proxy in m/s; drives filamentation and edge turbulence. */
  thermalSpeed: number;
  /** Reduced-order collisional damping, per second. */
  damping: number;
  /** Centre of the containment volume. */
  centre: Vec3;
  /** Radius beyond which a particle counts as lost. */
  containmentRadius: number;
  /** Rolling confinement quality in [0,1]; classified into regimes. */
  confinement: number;
  /** Accumulated energy released by the reconnection surrogate this tick. */
  reconnectionImpulse: number;
  ticksSinceReconnection: number;
}

/**
 * A star represented as a self-gravitating particle body (BUILD_SPEC 11.5).
 * Deliberately not a mesh that gets stretched and deleted — elongation,
 * stripping and stream formation all emerge from per-particle differential
 * gravity against a cohesion term.
 */
export interface BodyState {
  count: number;
  pos: Float64Array; // 3N metres
  vel: Float64Array; // 3N m/s
  /** 1 while the particle is still bound to the stellar core. */
  bound: Uint8Array;
  /** Which side of the orbit the particle was stripped on: -1 lead, +1 trail. */
  stream: Int8Array;
  /**
   * Per-particle pressure support magnitude at the particle's *initial* radius,
   * i.e. G*m0_i/r0_i^2. Together with `r0` this defines a polytropic restoring
   * law. Immutable after creation, so checkpoint clones share the reference —
   * it is derived state, not causal state.
   */
  support: Float64Array;
  /** Initial (Lagrangian) radius of each particle about the body centre. */
  r0: Float64Array;
  massKg: number;
  radiusM: number;
  /** Cohesion multiplier in [0,1]; decays once inside the tidal radius. */
  cohesion: number;
  /** False until the user releases it; held bodies do not integrate. */
  launched: boolean;
  /** Set once the body has crossed its tidal radius at least one tick. */
  tidallyStressed: boolean;
  disrupted: boolean;
  provenanceId: string;
  /** Fraction of particles still bound; drives the disruption transition. */
  boundFraction: number;
}

/** Mass-carrying clumps for the formation domain (BUILD_SPEC 9.2). */
export interface CloudState {
  count: number;
  pos: Float64Array;
  vel: Float64Array;
  mass: Float64Array;
  /** Deterministic seed for reconstructing the visual tracer population. */
  tracerSeed: number;
  /** Bulk angular momentum the user has imparted, for the science peek. */
  angularMomentum: Vec3;
}

export interface BlackHoleState {
  massKg: number;
  /** Dimensionless spin a* in [0, 0.998]. Fidelity level disclosed as L1/L2. */
  spin: number;
  position: Vec3;
  /** Spin axis, also the accretion disk normal. */
  axis: Vec3;
  /** Disk emissivity proxy in [0,1]; rises when material is accreted. */
  diskBrightness: number;
  diskInnerRg: number;
  diskOuterRg: number;
  /** Mass swallowed this run, for the science peek and mass bookkeeping. */
  accretedKg: number;
}

export type EventKind =
  | 'tidalThreshold'
  | 'firstStripping'
  | 'disruption'
  | 'accretionBrighten'
  | 'confinementDegraded'
  | 'confinementLost'
  | 'reconnection'
  | 'plasmaPinch'
  | 'bodyLaunched'
  | 'captureBoundary'
  | 'branchFork';

export interface SimEvent {
  tick: number;
  kind: EventKind;
  /** Where the event happened, for Moment Marks and Director framing. */
  position: Vec3;
  /** 0..1 importance; Director and the Time Lens rank by this. */
  weight: number;
}

export interface WorldState {
  tick: number;
  /** Scenario seconds elapsed. Derived, but snapshotted to avoid drift. */
  scenarioTime: number;
  seed: number;
  branchId: string;
  bh: BlackHoleState;
  fieldNodes: FieldNode[];
  plasma: PlasmaState;
  body: BodyState;
  cloud: CloudState;
  events: SimEvent[];
  /** Bookkeeping so Science peek can show that mass is conserved. */
  massLedger: { initialKg: number; accretedKg: number; unboundKg: number };
}

export interface WorldConfig {
  seed: number;
  plasmaCount: number;
  bodyCount: number;
  cloudCount: number;
  blackHoleSolarMasses: number;
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  seed: 0x5eed1e,
  plasmaCount: 12288,
  bodyCount: 24576,
  cloudCount: 384,
  blackHoleSolarMasses: 4.1e6,
};

/** Deep copy for checkpointing. Explicit rather than structuredClone so the
 *  cost is visible and typed arrays are copied without a serialisation pass. */
export function cloneWorld(s: WorldState): WorldState {
  return {
    tick: s.tick,
    scenarioTime: s.scenarioTime,
    seed: s.seed,
    branchId: s.branchId,
    bh: { ...s.bh, position: [...s.bh.position], axis: [...s.bh.axis] },
    fieldNodes: s.fieldNodes.map((n) => ({
      ...n,
      position: [...n.position] as Vec3,
      moment: [...n.moment] as Vec3,
    })),
    plasma: {
      ...s.plasma,
      pos: s.plasma.pos.slice(),
      vel: s.plasma.vel.slice(),
      alive: s.plasma.alive.slice(),
      centre: [...s.plasma.centre] as Vec3,
    },
    body: {
      ...s.body,
      pos: s.body.pos.slice(),
      vel: s.body.vel.slice(),
      bound: s.body.bound.slice(),
      stream: s.body.stream.slice(),
      // `support`/`r0` are intentionally shared by reference: they never mutate.
      support: s.body.support,
      r0: s.body.r0,
    },
    cloud: {
      ...s.cloud,
      pos: s.cloud.pos.slice(),
      vel: s.cloud.vel.slice(),
      mass: s.cloud.mass.slice(),
      angularMomentum: [...s.cloud.angularMomentum] as Vec3,
    },
    events: s.events.map((e) => ({ ...e, position: [...e.position] as Vec3 })),
    massLedger: { ...s.massLedger },
  };
}

/** Approximate retained bytes of a checkpoint, for the debug budget readout. */
export function worldByteSize(s: WorldState): number {
  return (
    s.plasma.pos.byteLength +
    s.plasma.vel.byteLength +
    s.plasma.alive.byteLength +
    s.body.pos.byteLength +
    s.body.vel.byteLength +
    s.body.bound.byteLength +
    s.body.stream.byteLength +
    s.cloud.pos.byteLength +
    s.cloud.vel.byteLength +
    s.cloud.mass.byteLength +
    s.fieldNodes.length * 128 +
    s.events.length * 64
  );
}

export function blackHoleRadii(bh: BlackHoleState) {
  const rs = schwarzschildRadius(bh.massKg);
  const rg = gravitationalRadius(bh.massKg);
  // Schwarzschild ISCO. With spin this shifts, but the gate discloses spin as
  // Level 1/2 (BUILD_SPEC 11.9) rather than pretending to full Kerr geometry.
  const isco = 6 * rg;
  const photonSphere = 3 * rg;
  return { rs, rg, isco, photonSphere };
}

/** Tidal radius r_t = R_star (M_bh / M_star)^(1/3) (BUILD_SPEC 11.5). */
export function tidalRadius(bh: BlackHoleState, body: BodyState): number {
  return body.radiusM * Math.cbrt(bh.massKg / body.massKg);
}

export { ASTRO };
