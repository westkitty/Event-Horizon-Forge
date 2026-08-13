/**
 * Self-gravitating stellar body and tidal disruption (BUILD_SPEC 11.5, 19).
 *
 * Fidelity class B. The star is a particle body, never a mesh that gets
 * stretched and hidden (an explicitly prohibited shortcut, 53). Its structure is
 * maintained by two opposing radial terms:
 *
 *   self-gravity   a_g(r) = -G M_bound_enc(r) / r^2   (spherically averaged over
 *                                                      still-bound material,
 *                                                      recomputed every tick)
 *   pressure proxy a_p(r) = +G m0_i / r0_i^2 * (r0_i / r)^3
 *
 * The exponent 3 is not arbitrary. Under homologous compression by a factor L,
 * a polytrope of index gamma supports itself with a force scaling as
 * L^(2-3*gamma); for gamma = 5/3 that is L^-3, while gravity at fixed enclosed
 * mass scales only as L^-2. Pressure must therefore fall FASTER than gravity as
 * the body expands, or the equilibrium is unstable. An earlier revision of this
 * file used a constant per-particle support (exponent 0) and the star inflated
 * by a factor of ~3.4 on its own — the tests in tests/unit/physics.test.ts
 * ("holds together in equilibrium") exist to keep that from regressing.
 *
 * At t=0, m0_i is exactly the enclosed mass at r0_i, so the two terms cancel and
 * the body is in equilibrium. It is nevertheless genuinely elastic: disruption
 * happens because the hole's differential pull across the body exceeds what
 * self-gravity plus pressure can restore, which is the real physical criterion,
 * not a scripted threshold.
 *
 * Approximated: pressure is a polytropic radial law rather than a solved EOS,
 * and self-gravity is spherically averaged (a monopole in radial shells), so
 * non-radial modes are not resolved. Not modelled: stellar hydrodynamics,
 * shocks, radiative transfer, or nuclear energy release.
 */

import { Rng } from '../core/rng';
import { blackHoleAccel } from './gravity';
import {
  ASTRO,
  blackHoleRadii,
  tidalRadius,
  type BlackHoleState,
  type BodyState,
  type SimEvent,
  type Vec3,
} from './state';

/** Radial shells used for the spherically-averaged enclosed-mass profile. */
const SHELLS = 96;

export function createBody(
  count: number,
  centre: Vec3,
  massKg: number,
  radiusM: number,
  seed: number,
  provenanceId: string,
): BodyState {
  const rng = new Rng(seed);
  const pos = new Float64Array(count * 3);
  const vel = new Float64Array(count * 3);
  const bound = new Uint8Array(count).fill(1);
  const stream = new Int8Array(count);
  const p: Vec3 = [0, 0, 0];

  for (let i = 0; i < count; i++) {
    rng.inBall(p);
    // Centrally concentrated: r ~ u^(1/1.6) biases mass inward, giving the body
    // a dense core and a diffuse envelope that strips first, as a real star does.
    const shape = Math.pow(rng.next(), 1 / 1.6);
    const norm = Math.hypot(p[0], p[1], p[2]) || 1;
    pos[i * 3] = centre[0] + (p[0] / norm) * radiusM * shape;
    pos[i * 3 + 1] = centre[1] + (p[1] / norm) * radiusM * shape;
    pos[i * 3 + 2] = centre[2] + (p[2] / norm) * radiusM * shape;
  }

  const structure = buildSupport(count, pos, massKg, radiusM, centre);
  const body: BodyState = {
    count,
    pos,
    vel,
    bound,
    stream,
    support: structure.support,
    r0: structure.r0,
    massKg,
    radiusM,
    cohesion: 1,
    launched: false,
    tidallyStressed: false,
    disrupted: false,
    provenanceId,
    boundFraction: 1,
  };

  return body;
}

/**
 * Computes the per-particle Lagrangian structure (initial radius and the
 * support magnitude at that radius) that holds the initial configuration in
 * equilibrium. Called once, on the undisturbed body; the result is immutable
 * for the body's lifetime.
 */
function buildSupport(
  count: number,
  pos: Float64Array,
  massKg: number,
  radiusM: number,
  centre: Vec3,
): { support: Float64Array; r0: Float64Array } {
  const radii = new Float64Array(count);
  const shellMass = new Float64Array(SHELLS + 1);
  const perParticle = massKg / count;
  const maxR = radiusM * 1.2;

  for (let i = 0; i < count; i++) {
    const dx = pos[i * 3] - centre[0];
    const dy = pos[i * 3 + 1] - centre[1];
    const dz = pos[i * 3 + 2] - centre[2];
    const r = Math.hypot(dx, dy, dz);
    radii[i] = r;
    const bin = Math.min(SHELLS, Math.floor((r / maxR) * SHELLS));
    shellMass[bin] += perParticle;
  }

  // Prefix sum -> enclosed mass at each shell boundary.
  for (let s = 1; s <= SHELLS; s++) shellMass[s] += shellMass[s - 1];

  const support = new Float64Array(count);
  // Softening floor: one shell width. Prevents an unbounded support term for
  // the handful of particles that land essentially at the centre.
  const rFloor = maxR / SHELLS;

  const r0 = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const r = Math.max(radii[i], rFloor);
    const bin = Math.min(SHELLS, Math.floor((radii[i] / maxR) * SHELLS));
    const mEnc = shellMass[bin];
    support[i] = (ASTRO.G * mEnc) / (r * r);
    r0[i] = r;
  }
  return { support, r0 };
}

const shellScratch = new Float64Array(SHELLS + 1);

export interface BodyStepResult {
  accretedKg: number;
  comPos: Vec3;
  comVel: Vec3;
}

const result: BodyStepResult = {
  accretedKg: 0,
  comPos: [0, 0, 0],
  comVel: [0, 0, 0],
};

/**
 * Advances the body one tick under self-gravity + pressure support + the black
 * hole's field. Returns mass accreted this tick so the caller can update the
 * hole and the mass ledger.
 */
export function stepBody(
  body: BodyState,
  bh: BlackHoleState,
  dt: number,
  tick: number,
  events: SimEvent[],
): BodyStepResult {
  result.accretedKg = 0;

  if (!body.launched) {
    result.comPos = centreOfMass(body);
    result.comVel = [0, 0, 0];
    return result;
  }

  const { count, pos, vel, bound, stream, support, r0, massKg, radiusM } = body;
  const { rs } = blackHoleRadii(bh);
  const perParticle = massKg / count;
  const maxR = radiusM * 1.2;

  // --- Pass 1: centre of mass of still-bound material -----------------------
  let cx = 0, cy = 0, cz = 0, cvx = 0, cvy = 0, cvz = 0, boundCount = 0;
  for (let i = 0; i < count; i++) {
    if (bound[i] !== 1) continue;
    const i3 = i * 3;
    cx += pos[i3]; cy += pos[i3 + 1]; cz += pos[i3 + 2];
    cvx += vel[i3]; cvy += vel[i3 + 1]; cvz += vel[i3 + 2];
    boundCount++;
  }
  if (boundCount > 0) {
    cx /= boundCount; cy /= boundCount; cz /= boundCount;
    cvx /= boundCount; cvy /= boundCount; cvz /= boundCount;
  }

  // --- Pass 2: spherically-averaged enclosed mass about the current COM ------
  shellScratch.fill(0);
  for (let i = 0; i < count; i++) {
    if (bound[i] !== 1) continue;
    const i3 = i * 3;
    const bx = pos[i3] - cx, by = pos[i3 + 1] - cy, bz = pos[i3 + 2] - cz;
    const r = Math.sqrt(bx * bx + by * by + bz * bz);
    const bin = Math.min(SHELLS, Math.floor((r / maxR) * SHELLS));
    shellScratch[bin] += perParticle;
  }
  for (let s = 1; s <= SHELLS; s++) shellScratch[s] += shellScratch[s - 1];

  const boundMass = boundCount * perParticle;
  const rFloor = maxR / SHELLS;

  // Specific energy of the COM w.r.t. the hole. Debris with lower energy than
  // this becomes the bound/leading stream, higher becomes the unbound/trailing
  // stream — the real mechanism behind the two-armed TDE morphology.
  const comR = Math.hypot(cx - bh.position[0], cy - bh.position[1], cz - bh.position[2]);
  const comEnergy =
    (cvx * cvx + cvy * cvy + cvz * cvz) / 2 - (ASTRO.G * bh.massKg) / Math.max(comR, rs);

  const rTidal = tidalRadius(bh, body);
  if (!body.tidallyStressed && comR < rTidal) {
    body.tidallyStressed = true;
    events.push({ tick, kind: 'tidalThreshold', position: [cx, cy, cz], weight: 0.9 });
  }

  let stillBound = 0;
  let firstStrip = false;

  for (let i = 0; i < count; i++) {
    if (bound[i] === 2) continue; // already accreted
    const i3 = i * 3;
    const x = pos[i3], y = pos[i3 + 1], z = pos[i3 + 2];

    // External field from the hole. Evaluating this per particle — rather than
    // at the COM plus a linearised tidal tensor — is what makes strong-field
    // stretching correct even when the body is comparable to its distance.
    const ext = blackHoleAccel(bh, x, y, z);
    let ax = ext.ax, ay = ext.ay, az = ext.az;

    if (ext.r <= rs * 1.05) {
      bound[i] = 2;
      result.accretedKg += perParticle;
      continue;
    }

    if (bound[i] === 1 && boundCount > 0) {
      const dx = x - cx, dy = y - cy, dz = z - cz;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const rSafe = Math.max(r, rFloor);
      const bin = Math.min(SHELLS, Math.floor((r / maxR) * SHELLS));
      const mEnc = shellScratch[bin];

      // Self-gravity from currently-bound material only: as the star is
      // stripped, what remains genuinely holds on more weakly.
      const selfG = (ASTRO.G * mEnc) / (rSafe * rSafe);

      // Polytropic (gamma = 5/3) pressure support: falls as r^-3, i.e. faster
      // than gravity's r^-2, which is what makes the equilibrium stable rather
      // than runaway. See the file header.
      const ratio = r0[i] / rSafe;
      const press = support[i] * ratio * ratio * ratio;

      const net = press - selfG;
      const invR = 1 / rSafe;
      ax += net * dx * invR;
      ay += net * dy * invR;
      az += net * dz * invR;
    }

    let vx = vel[i3] + ax * dt;
    let vy = vel[i3 + 1] + ay * dt;
    let vz = vel[i3 + 2] + az * dt;

    pos[i3] = x + vx * dt;
    pos[i3 + 1] = y + vy * dt;
    pos[i3 + 2] = z + vz * dt;
    vel[i3] = vx;
    vel[i3 + 1] = vy;
    vel[i3 + 2] = vz;

    if (bound[i] === 1) {
      // Unbinding test against the escape speed of the remaining bound mass.
      const dx = pos[i3] - cx, dy = pos[i3 + 1] - cy, dz = pos[i3 + 2] - cz;
      const r = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), rFloor);
      const rvx = vx - cvx, rvy = vy - cvy, rvz = vz - cvz;
      const relSpeed2 = rvx * rvx + rvy * rvy + rvz * rvz;
      const escape2 = (2 * ASTRO.G * boundMass) / r;

      if (relSpeed2 > escape2 && r > radiusM * 0.85) {
        bound[i] = 0;
        const px = pos[i3] - bh.position[0];
        const py = pos[i3 + 1] - bh.position[1];
        const pz = pos[i3 + 2] - bh.position[2];
        const pr = Math.sqrt(px * px + py * py + pz * pz);
        const e = relSpeed2 / 2 - (ASTRO.G * bh.massKg) / Math.max(pr, rs);
        stream[i] = e < comEnergy ? -1 : 1;
        firstStrip = true;
      } else {
        stillBound++;
      }
    }
  }

  const prevFraction = body.boundFraction;
  body.boundFraction = stillBound / count;

  if (firstStrip && prevFraction > 0.985 && body.boundFraction <= 0.985) {
    events.push({ tick, kind: 'firstStripping', position: [cx, cy, cz], weight: 0.85 });
  }
  if (!body.disrupted && body.boundFraction < 0.5) {
    body.disrupted = true;
    events.push({ tick, kind: 'disruption', position: [cx, cy, cz], weight: 1.0 });
  }

  body.cohesion = body.boundFraction;
  result.comPos = [cx, cy, cz];
  result.comVel = [cvx, cvy, cvz];
  return result;
}

export function centreOfMass(body: BodyState): Vec3 {
  const { count, pos, bound } = body;
  let cx = 0, cy = 0, cz = 0, n = 0;
  for (let i = 0; i < count; i++) {
    if (bound[i] === 2) continue;
    cx += pos[i * 3];
    cy += pos[i * 3 + 1];
    cz += pos[i * 3 + 2];
    n++;
  }
  if (n === 0) return [0, 0, 0];
  return [cx / n, cy / n, cz / n];
}

/** Moves a held (unlaunched) body rigidly, for the grab-and-aim gesture. */
export function translateBody(body: BodyState, delta: Vec3): void {
  const { count, pos } = body;
  for (let i = 0; i < count; i++) {
    pos[i * 3] += delta[0];
    pos[i * 3 + 1] += delta[1];
    pos[i * 3 + 2] += delta[2];
  }
}

/** Commits a launch: every particle inherits the released bulk velocity. */
export function launchBody(body: BodyState, velocity: Vec3): void {
  const { count, vel } = body;
  for (let i = 0; i < count; i++) {
    vel[i * 3] = velocity[0];
    vel[i * 3 + 1] = velocity[1];
    vel[i * 3 + 2] = velocity[2];
  }
  body.launched = true;
}
