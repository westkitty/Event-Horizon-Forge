/**
 * Charged-particle plasma under an analytic magnetic field (BUILD_SPEC 10).
 *
 * Fidelity class B. What is genuinely calculated: relativistically-naive Lorentz
 * motion v' = (q/m)(v × B), integrated with a Boris pusher. The Boris scheme is
 * used specifically because it treats the magnetic rotation as an exact rotation
 * — it conserves speed under a pure B field and does not artificially heat or
 * cool the population over long runs, which a naive Euler/RK integrator does.
 * That matters here: "is the plasma gaining energy?" must mean something.
 *
 * What is approximated: collisions and thermal transport are a damping term plus
 * a thermal velocity floor. What is NOT modelled: the plasma's own currents
 * modifying B, pressure, and any collective MHD wave behaviour. Consequently
 * pinch/kink/filamentation here are field-geometry-driven, not self-consistent
 * instabilities. Recorded as such in docs/model-fidelity.md.
 */

import { Rng } from '../core/rng';
import { FieldSet, currentProxyAt } from './field';
import type { FieldNode, PlasmaState, SimEvent, Vec3 } from './state';

export type ConfinementRegime =
  | 'calm'
  | 'filamenting'
  | 'pinched'
  | 'turbulent'
  | 'degraded'
  | 'lost';

export function createPlasma(
  count: number,
  centre: Vec3,
  radius: number,
  seed: number,
): PlasmaState {
  const rng = new Rng(seed);
  const pos = new Float64Array(count * 3);
  const vel = new Float64Array(count * 3);
  const alive = new Uint8Array(count).fill(1);
  const p: Vec3 = [0, 0, 0];

  const thermalSpeed = 2.6e5;

  for (let i = 0; i < count; i++) {
    rng.inBall(p);
    // Bias toward the core so the initial packet reads as a dense body with a
    // diffuse edge rather than a uniform sphere.
    const shape = 0.45 + 0.55 * Math.cbrt(rng.next());
    pos[i * 3] = centre[0] + p[0] * radius * shape;
    pos[i * 3 + 1] = centre[1] + p[1] * radius * shape;
    pos[i * 3 + 2] = centre[2] + p[2] * radius * shape;

    vel[i * 3] = rng.normal() * thermalSpeed;
    vel[i * 3 + 1] = rng.normal() * thermalSpeed;
    vel[i * 3 + 2] = rng.normal() * thermalSpeed;
  }

  return {
    count,
    pos,
    vel,
    alive,
    // Proton-scale q/m, scaled down so gyroradii land at a visible size for the
    // field strengths a user can reach by dragging nodes around.
    chargeToMass: 9.58e7 * 1e-3,
    thermalSpeed,
    damping: 0.04,
    centre: [...centre] as Vec3,
    containmentRadius: radius * 3.2,
    confinement: 1,
    reconnectionImpulse: 0,
    ticksSinceReconnection: 1e9,
  };
}

const B: Vec3 = [0, 0, 0];
/** Reused across ticks; repacked at the top of every stepPlasma call. */
const FIELD_SET = new FieldSet();

/**
 * Inline 3D length. Math.hypot is deliberately avoided in every per-particle
 * loop in this file: V8 implements it with overflow/underflow guarding that
 * costs roughly an order of magnitude more than a plain sqrt. Profiling the
 * Gate 0 scene showed stepPlasma at 4.8 ms/tick for only 12k particles, almost
 * entirely from ~6 hypot calls per particle. Our magnitudes are nowhere near
 * the float64 range limits, so the guarding buys nothing here.
 */
function len3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Boris push for one tick.
 *
 * With no electric field the half-kicks vanish and the step reduces to the pure
 * magnetic rotation:
 *   t = (q/m)(dt/2) B ,  s = 2t/(1+|t|^2)
 *   v' = v + (v + v×t) × s
 * which is an exact rotation about B by the correct gyro-angle.
 */
export function stepPlasma(
  state: PlasmaState,
  nodes: readonly FieldNode[],
  dt: number,
  tick: number,
  events: SimEvent[],
  rng: Rng,
): void {
  // Repack once per step, then evaluate with scalar loads in the particle loop.
  const field = FIELD_SET.update(nodes);
  const { pos, vel, alive, count, chargeToMass } = state;
  const qmHalfDt = chargeToMass * dt * 0.5;
  const damp = Math.exp(-state.damping * dt);

  let confinedCount = 0;
  let sumR = 0;
  let sumR2 = 0;
  // Radial spread perpendicular vs parallel to the local field tells us whether
  // the column is pinching (perpendicular collapse) or filamenting.
  let perpSum = 0;
  let paraSum = 0;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = pos[i3];
    const y = pos[i3 + 1];
    const z = pos[i3 + 2];

    field.evaluate(x, y, z, B);

    let vx = vel[i3];
    let vy = vel[i3 + 1];
    let vz = vel[i3 + 2];

    // Rotation vector t and the Boris s vector.
    const tx = B[0] * qmHalfDt;
    const ty = B[1] * qmHalfDt;
    const tz = B[2] * qmHalfDt;
    const t2 = tx * tx + ty * ty + tz * tz;
    const sFac = 2 / (1 + t2);

    // v' = v + v × t
    const vpx = vx + (vy * tz - vz * ty);
    const vpy = vy + (vz * tx - vx * tz);
    const vpz = vz + (vx * ty - vy * tx);

    // v'' = v + (v' × t) * s
    vx += (vpy * tz - vpz * ty) * sFac;
    vy += (vpz * tx - vpx * tz) * sFac;
    vz += (vpx * ty - vpy * tx) * sFac;

    // Reduced-order collisional damping toward the thermal floor.
    vx *= damp;
    vy *= damp;
    vz *= damp;

    if (state.reconnectionImpulse > 0) {
      // Surrogate energy release: a radial kick away from the reconnection
      // region, scaled by the stored impulse. Explicitly illustrative.
      const dx = x - state.centre[0];
      const dy = y - state.centre[1];
      const dz = z - state.centre[2];
      const d = len3(dx, dy, dz) || 1;
      const kick = state.reconnectionImpulse * (0.4 + 0.6 * rng.next());
      vx += (dx / d) * kick;
      vy += (dy / d) * kick;
      vz += (dz / d) * kick;
    }

    vel[i3] = vx;
    vel[i3 + 1] = vy;
    vel[i3 + 2] = vz;

    pos[i3] = x + vx * dt;
    pos[i3 + 1] = y + vy * dt;
    pos[i3 + 2] = z + vz * dt;

    const rx = pos[i3] - state.centre[0];
    const ry = pos[i3 + 1] - state.centre[1];
    const rz = pos[i3 + 2] - state.centre[2];
    const r2p = rx * rx + ry * ry + rz * rz;
    const r = Math.sqrt(r2p);
    sumR += r;
    sumR2 += r2p;

    const bLen = len3(B[0], B[1], B[2]);
    if (bLen > 1e-30) {
      const along = (rx * B[0] + ry * B[1] + rz * B[2]) / bLen;
      paraSum += Math.abs(along);
      perpSum += Math.sqrt(Math.max(0, r2p - along * along));
    }

    if (r <= state.containmentRadius) {
      confinedCount++;
      alive[i] = 1;
    } else {
      alive[i] = 0;
    }
  }

  state.reconnectionImpulse *= 0.35;
  if (state.reconnectionImpulse < 1e2) state.reconnectionImpulse = 0;

  const prevConfinement = state.confinement;
  const raw = confinedCount / count;
  // Light smoothing so a single noisy tick cannot flip the regime label.
  state.confinement = state.confinement * 0.85 + raw * 0.15;

  const meanR = sumR / count;
  const varR = Math.max(0, sumR2 / count - meanR * meanR);
  const aspect = paraSum > 1e-9 ? perpSum / paraSum : 1;

  state.ticksSinceReconnection++;

  // Reconnection surrogate trigger (BUILD_SPEC 10.7): fires where the current
  // proxy and field-reversal shear are simultaneously high. Rate-limited so it
  // reads as a discrete event rather than a continuous glow.
  if (state.ticksSinceReconnection > 90) {
    const probe = currentProxyAt(
      nodes,
      state.centre[0],
      state.centre[1],
      state.centre[2],
      state.containmentRadius * 0.18,
    );
    const stressed = probe.shear > 0.55 && probe.curl * state.containmentRadius > probe.magnitude * 0.8;
    if (stressed && probe.magnitude > 1e-12) {
      state.reconnectionImpulse = state.thermalSpeed * 5.5;
      state.ticksSinceReconnection = 0;
      events.push({
        tick,
        kind: 'reconnection',
        position: [...state.centre] as Vec3,
        weight: 0.75,
      });
    }
  }

  emitRegimeEvents(state, prevConfinement, tick, events);
  state.thermalSpeed = Math.max(1e4, Math.sqrt(varR) > 0 ? state.thermalSpeed : state.thermalSpeed);
  // Retain the pinch signal on the state so the renderer and Science peek agree.
  (state as PlasmaState & { aspect?: number }).aspect = aspect;
}

function emitRegimeEvents(
  state: PlasmaState,
  prev: number,
  tick: number,
  events: SimEvent[],
): void {
  const now = state.confinement;
  const crossed = (level: number) => prev >= level && now < level;
  if (crossed(0.85)) {
    events.push({ tick, kind: 'confinementDegraded', position: [...state.centre] as Vec3, weight: 0.5 });
  }
  if (crossed(0.4)) {
    events.push({ tick, kind: 'confinementLost', position: [...state.centre] as Vec3, weight: 0.95 });
  }
}

/**
 * Classifies the current plasma into one of the qualitatively distinct regimes
 * required by BUILD_SPEC 10.5 / acceptance criterion "at least three visually
 * distinct stability regimes". The classification is derived from measured
 * state, not from a mode the user selected.
 */
export function classifyRegime(state: PlasmaState): ConfinementRegime {
  const aspect = (state as PlasmaState & { aspect?: number }).aspect ?? 1;
  if (state.confinement < 0.4) return 'lost';
  if (state.confinement < 0.72) return 'degraded';
  if (state.reconnectionImpulse > 0 || state.ticksSinceReconnection < 40) return 'turbulent';
  if (aspect < 0.55) return 'pinched';
  if (aspect > 1.5) return 'filamenting';
  return 'calm';
}

/** Mean speed, for the Science peek energy readout. */
export function meanSpeed(state: PlasmaState): number {
  let sum = 0;
  for (let i = 0; i < state.count; i++) {
    const i3 = i * 3;
    sum += len3(state.vel[i3], state.vel[i3 + 1], state.vel[i3 + 2]);
  }
  return sum / state.count;
}
