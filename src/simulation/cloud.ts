/**
 * Molecular-cloud formation domain (BUILD_SPEC 9).
 *
 * Fidelity class B. The mass-carrying clumps are integrated with direct
 * softened Newtonian self-gravity — genuinely O(N^2), which is affordable and
 * exact at this count, and avoids claiming a hierarchical solver that was never
 * built. Visual tracers (the ~10^5 dust particles the user actually sees) are a
 * separate, non-causal population reconstructed from `tracerSeed` and advected
 * by the clump field; they are explicitly not individually gravitating, which
 * is the two-level representation 9.2 asks for.
 *
 * Not modelled: pressure, cooling, radiative transfer, chemistry, magnetic
 * support of the neutral gas. The temperature/density proxies are proxies.
 */

import { Rng } from '../core/rng';
import { ASTRO, type CloudState, type Vec3 } from './state';

/** Softening length as a fraction of the cloud radius — prevents singular
 *  two-body encounters from injecting unbounded energy and breaking replay. */
const SOFTENING_FRAC = 0.035;

export function createCloud(
  count: number,
  centre: Vec3,
  radiusM: number,
  totalMassKg: number,
  seed: number,
): CloudState {
  const rng = new Rng(seed);
  const pos = new Float64Array(count * 3);
  const vel = new Float64Array(count * 3);
  const mass = new Float64Array(count);
  const p: Vec3 = [0, 0, 0];

  // Mild turbulent velocity field so the cloud is alive before the user touches
  // it, without being so energetic that it disperses on its own.
  const vTurb = Math.sqrt((ASTRO.G * totalMassKg) / radiusM) * 0.38;

  for (let i = 0; i < count; i++) {
    rng.inBall(p);
    const shape = Math.pow(rng.next(), 1 / 2.2);
    const norm = Math.hypot(p[0], p[1], p[2]) || 1;
    const r = radiusM * shape;
    pos[i * 3] = centre[0] + (p[0] / norm) * r;
    pos[i * 3 + 1] = centre[1] + (p[1] / norm) * r * 0.72; // slight oblateness
    pos[i * 3 + 2] = centre[2] + (p[2] / norm) * r;

    vel[i * 3] = rng.normal() * vTurb;
    vel[i * 3 + 1] = rng.normal() * vTurb * 0.6;
    vel[i * 3 + 2] = rng.normal() * vTurb;

    // Log-normal clump masses: a few dominant condensations, many small ones.
    mass[i] = (totalMassKg / count) * Math.exp(rng.normal() * 0.55);
  }

  return {
    count,
    pos,
    vel,
    mass,
    tracerSeed: seed ^ 0x9e3779b9,
    angularMomentum: [0, 0, 0],
  };
}

/**
 * Direct-summation self-gravity step. Symmetric force accumulation halves the
 * pair count and guarantees momentum conservation to round-off, which matters
 * because a drifting centre of mass would show up as the whole cloud sliding.
 */
export function stepCloud(cloud: CloudState, dt: number, radiusM: number): void {
  const { count, pos, vel, mass } = cloud;
  const eps = radiusM * SOFTENING_FRAC;
  const eps2 = eps * eps;

  const ax = new Float64Array(count);
  const ay = new Float64Array(count);
  const az = new Float64Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const xi = pos[i3], yi = pos[i3 + 1], zi = pos[i3 + 2];
    const mi = mass[i];

    for (let j = i + 1; j < count; j++) {
      const j3 = j * 3;
      const dx = pos[j3] - xi;
      const dy = pos[j3 + 1] - yi;
      const dz = pos[j3 + 2] - zi;
      const r2 = dx * dx + dy * dy + dz * dz + eps2;
      const invR = 1 / Math.sqrt(r2);
      const invR3 = invR * invR * invR;
      const g = ASTRO.G * invR3;

      const fj = g * mass[j];
      ax[i] += dx * fj;
      ay[i] += dy * fj;
      az[i] += dz * fj;

      const fi = g * mi;
      ax[j] -= dx * fi;
      ay[j] -= dy * fi;
      az[j] -= dz * fi;
    }
  }

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    vel[i3] += ax[i] * dt;
    vel[i3 + 1] += ay[i] * dt;
    vel[i3 + 2] += az[i] * dt;
    pos[i3] += vel[i3] * dt;
    pos[i3 + 1] += vel[i3 + 1] * dt;
    pos[i3 + 2] += vel[i3 + 2] * dt;
  }
}

export type CloudBrush = 'gather' | 'disperse' | 'spin' | 'energize';

/**
 * The Cosmic Hand (BUILD_SPEC 25.17) applied to the clump field.
 *
 * Every brush is an impulse on velocity, never a teleport of position — so the
 * solver keeps ownership of the matter and the effect continues to evolve after
 * the user releases, which is the behaviour 25.17 requires ("releasing hands
 * control back to the solver immediately").
 *
 * `strength` is in metres/second of imparted speed at the brush centre; falloff
 * is a smooth cubic so there is no visible edge to the influence volume.
 */
export function applyBrush(
  cloud: CloudState,
  brush: CloudBrush,
  centre: Vec3,
  radiusM: number,
  strength: number,
  axis: Vec3,
  dt: number,
): void {
  const { count, pos, vel } = cloud;
  const r2max = radiusM * radiusM;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const dx = pos[i3] - centre[0];
    const dy = pos[i3 + 1] - centre[1];
    const dz = pos[i3 + 2] - centre[2];
    const r2 = dx * dx + dy * dy + dz * dz;
    if (r2 > r2max) continue;

    const r = Math.sqrt(r2) || 1e-9;
    const t = 1 - r / radiusM;
    const falloff = t * t * (3 - 2 * t); // smoothstep
    const k = strength * falloff * dt;

    switch (brush) {
      case 'gather': {
        vel[i3] -= (dx / r) * k;
        vel[i3 + 1] -= (dy / r) * k;
        vel[i3 + 2] -= (dz / r) * k;
        break;
      }
      case 'disperse': {
        vel[i3] += (dx / r) * k;
        vel[i3 + 1] += (dy / r) * k;
        vel[i3 + 2] += (dz / r) * k;
        break;
      }
      case 'spin': {
        // v += omega x r, imparting genuine angular momentum about `axis`.
        const ox = axis[0] * k, oy = axis[1] * k, oz = axis[2] * k;
        vel[i3] += oy * dz - oz * dy;
        vel[i3 + 1] += oz * dx - ox * dz;
        vel[i3 + 2] += ox * dy - oy * dx;
        break;
      }
      case 'energize': {
        // Isotropic speed increase: raises the velocity-dispersion proxy
        // (a temperature analogue) without a preferred direction.
        const s = 1 + falloff * strength * dt * 1e-4;
        vel[i3] *= s;
        vel[i3 + 1] *= s;
        vel[i3 + 2] *= s;
        break;
      }
    }
  }

  if (brush === 'spin') {
    cloud.angularMomentum[0] += axis[0] * strength * dt;
    cloud.angularMomentum[1] += axis[1] * strength * dt;
    cloud.angularMomentum[2] += axis[2] * strength * dt;
  }
}

/** Total specific angular momentum, for the Science peek. */
export function totalAngularMomentum(cloud: CloudState): Vec3 {
  const { count, pos, vel, mass } = cloud;
  const c = centroid(cloud);
  let lx = 0, ly = 0, lz = 0;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const dx = pos[i3] - c[0];
    const dy = pos[i3 + 1] - c[1];
    const dz = pos[i3 + 2] - c[2];
    const m = mass[i];
    lx += m * (dy * vel[i3 + 2] - dz * vel[i3 + 1]);
    ly += m * (dz * vel[i3] - dx * vel[i3 + 2]);
    lz += m * (dx * vel[i3 + 1] - dy * vel[i3]);
  }
  return [lx, ly, lz];
}

export function centroid(cloud: CloudState): Vec3 {
  const { count, pos, mass } = cloud;
  let cx = 0, cy = 0, cz = 0, m = 0;
  for (let i = 0; i < count; i++) {
    const w = mass[i];
    cx += pos[i * 3] * w;
    cy += pos[i * 3 + 1] * w;
    cz += pos[i * 3 + 2] * w;
    m += w;
  }
  if (m <= 0) return [0, 0, 0];
  return [cx / m, cy / m, cz / m];
}

/** Peak local density proxy, used to show the user that gathering worked. */
export function peakDensityProxy(cloud: CloudState, sampleRadius: number): number {
  const { count, pos, mass } = cloud;
  const r2 = sampleRadius * sampleRadius;
  let peak = 0;
  // Sparse stride: this feeds a Science readout, not the solver.
  const stride = Math.max(1, Math.floor(count / 96));
  for (let i = 0; i < count; i += stride) {
    let m = 0;
    for (let j = 0; j < count; j++) {
      const dx = pos[j * 3] - pos[i * 3];
      const dy = pos[j * 3 + 1] - pos[i * 3 + 1];
      const dz = pos[j * 3 + 2] - pos[i * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < r2) m += mass[j];
    }
    if (m > peak) peak = m;
  }
  const volume = (4 / 3) * Math.PI * sampleRadius * sampleRadius * sampleRadius;
  return peak / volume;
}
