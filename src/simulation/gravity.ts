/**
 * Gravity near the black hole (BUILD_SPEC 11.4).
 *
 * Fidelity class A/B. Matter trajectories use the Paczynski-Wiita
 * pseudo-Newtonian potential:
 *
 *   Phi(r) = -GM / (r - r_s)      =>   a(r) = -GM / (r - r_s)^2
 *
 * This is chosen over plain Newtonian gravity because it reproduces the two
 * features that make a black-hole encounter *look* and *behave* like one rather
 * than like a heavy star: it places the innermost stable circular orbit at
 * exactly 6 r_g and the marginally bound orbit at 4 r_g, so plunging orbits,
 * capture, and the qualitative distinction between a flyby and an inspiral all
 * come out of the integrator rather than being scripted.
 *
 * What it is not: a solution of the geodesic equation. There is no frame
 * dragging, no spin dependence in the matter trajectories, and no relativistic
 * precession beyond what the potential incidentally produces. Spin is therefore
 * disclosed at Level 1 for matter (BUILD_SPEC 11.9) and only affects disk
 * geometry and the inner-radius proxy. Recorded in docs/model-fidelity.md.
 */

import { ASTRO, blackHoleRadii, type BlackHoleState, type Vec3 } from './state';

export interface AccelResult {
  ax: number;
  ay: number;
  az: number;
  /** Distance from the hole in metres, reused by callers to avoid recomputing. */
  r: number;
}

const out: AccelResult = { ax: 0, ay: 0, az: 0, r: 0 };

/**
 * Acceleration from the hole at an absolute position.
 *
 * Inside r_s the Paczynski-Wiita denominator changes sign, which is physically
 * meaningless — nothing inside the horizon influences the exterior solution and
 * such particles are removed by the accretion test before they get here. The
 * clamp exists purely so a numerical excursion cannot produce a repulsive
 * impulse and corrupt the branch.
 */
export function blackHoleAccel(
  bh: BlackHoleState,
  x: number,
  y: number,
  z: number,
): AccelResult {
  // r_s inlined rather than destructured from blackHoleRadii(): that helper
  // allocates a result object, and this function runs once per body particle
  // per tick (~25k allocations/tick in the Gate 0 scene). Likewise Math.hypot
  // is avoided here — see the note in plasma.ts.
  const rs = (2 * ASTRO.G * bh.massKg) / (ASTRO.C * ASTRO.C);
  const dx = bh.position[0] - x;
  const dy = bh.position[1] - y;
  const dz = bh.position[2] - z;
  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const denom = Math.max(r - rs, rs * 0.05);
  const a = (ASTRO.G * bh.massKg) / (denom * denom);
  const invR = r > 0 ? 1 / r : 0;

  out.ax = a * dx * invR;
  out.ay = a * dy * invR;
  out.az = a * dz * invR;
  out.r = r;
  return out;
}

export type EncounterClass =
  | 'escape'
  | 'flyby'
  | 'capture'
  | 'tidalDisruption'
  | 'directInfall';

export interface EncounterPrediction {
  kind: EncounterClass;
  /** Closest approach in metres, from the Newtonian two-body conic. */
  periapsis: number;
  periapsisRg: number;
  /** Specific orbital energy; negative = bound. */
  energy: number;
  bound: boolean;
}

/**
 * Predicts the outcome of releasing a body at (pos, vel).
 *
 * Drives the in-world trajectory preview for Throw Into Darkness (25.19), which
 * must classify escape/flyby/capture/tidal-risk *while the user is still
 * aiming*. The conic solution is used rather than integrating the pseudo-
 * Newtonian orbit because it is closed-form and stable at aim time; the
 * committed trajectory is then integrated with the real solver, so the preview
 * is honest about being an approximation near the hole and the classification
 * boundaries are drawn conservatively.
 */
export function predictEncounter(
  bh: BlackHoleState,
  pos: readonly [number, number, number],
  vel: readonly [number, number, number],
  tidalRadiusM: number,
): EncounterPrediction {
  const { rs, rg, isco } = blackHoleRadii(bh);
  const mu = ASTRO.G * bh.massKg;

  const dx = pos[0] - bh.position[0];
  const dy = pos[1] - bh.position[1];
  const dz = pos[2] - bh.position[2];
  const r = Math.hypot(dx, dy, dz) || 1;
  const v2 = vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2];

  const energy = v2 / 2 - mu / r;

  // Specific angular momentum h = r x v
  const hx = dy * vel[2] - dz * vel[1];
  const hy = dz * vel[0] - dx * vel[2];
  const hz = dx * vel[1] - dy * vel[0];
  const h2 = hx * hx + hy * hy + hz * hz;

  // e^2 = 1 + 2 E h^2 / mu^2 ; p = h^2/mu ; q = p / (1 + e)
  const ecc = Math.sqrt(Math.max(0, 1 + (2 * energy * h2) / (mu * mu)));
  const p = h2 / mu;
  const periapsis = p / (1 + ecc);

  const bound = energy < 0;
  let kind: EncounterClass;

  if (periapsis <= rs * 1.02) {
    kind = 'directInfall';
  } else if (periapsis <= tidalRadiusM) {
    kind = 'tidalDisruption';
  } else if (periapsis <= isco) {
    // Inside the ISCO there is no stable orbit; the pseudo-Newtonian solver
    // will plunge even though the Newtonian conic says otherwise.
    kind = 'directInfall';
  } else if (bound) {
    kind = 'capture';
  } else if (periapsis < 60 * rg) {
    kind = 'flyby';
  } else {
    kind = 'escape';
  }

  return { kind, periapsis, periapsisRg: periapsis / rg, energy, bound };
}

/**
 * Integrates a preview trajectory with the same pseudo-Newtonian solver the
 * simulation uses, so the arc the user aims with matches what actually happens
 * on release. Returns the number of points written into `out` (xyz triples).
 */
export function integratePreview(
  bh: BlackHoleState,
  pos: readonly [number, number, number],
  vel: readonly [number, number, number],
  dt: number,
  maxPoints: number,
  out: Float64Array,
): number {
  const { rs } = blackHoleRadii(bh);
  let x = pos[0];
  let y = pos[1];
  let z = pos[2];
  let vx = vel[0];
  let vy = vel[1];
  let vz = vel[2];

  let n = 0;
  const maxR = Math.hypot(x - bh.position[0], y - bh.position[1], z - bh.position[2]) * 6;

  for (; n < maxPoints; n++) {
    out[n * 3] = x;
    out[n * 3 + 1] = y;
    out[n * 3 + 2] = z;

    // Velocity Verlet keeps the previewed conic from spiralling numerically.
    const a0 = blackHoleAccel(bh, x, y, z);
    const ax0 = a0.ax, ay0 = a0.ay, az0 = a0.az;

    x += vx * dt + 0.5 * ax0 * dt * dt;
    y += vy * dt + 0.5 * ay0 * dt * dt;
    z += vz * dt + 0.5 * az0 * dt * dt;

    const a1 = blackHoleAccel(bh, x, y, z);
    vx += 0.5 * (ax0 + a1.ax) * dt;
    vy += 0.5 * (ay0 + a1.ay) * dt;
    vz += 0.5 * (az0 + a1.az) * dt;

    if (a1.r <= rs * 1.05) {
      n++;
      break;
    }
    if (a1.r > maxR) {
      n++;
      break;
    }
  }
  return n;
}

/** Circular orbital speed at radius r under the pseudo-Newtonian potential. */
export function circularSpeed(bh: BlackHoleState, r: number): number {
  const { rs } = blackHoleRadii(bh);
  const denom = Math.max(r - rs, rs * 0.05);
  return Math.sqrt((ASTRO.G * bh.massKg * r) / (denom * denom));
}

/**
 * Gravitational redshift factor sqrt(1 - r_s/r), used by the disk shader for
 * the inner-region dimming (BUILD_SPEC 11.8). Real Schwarzschild expression.
 */
export function redshiftFactor(bh: BlackHoleState, r: number): number {
  const { rs } = blackHoleRadii(bh);
  return Math.sqrt(Math.max(0, 1 - rs / Math.max(r, rs * 1.0001)));
}

export function vecTo(a: Vec3, b: Vec3): Vec3 {
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
}
