/**
 * Physics validation against closed-form reference cases (BUILD_SPEC 41.1:
 * "For scientific formulas, include reference cases derived from documented
 * sources or independently calculated fixtures").
 *
 * These tests exist to stop the build from claiming fidelity it does not have.
 * Each one checks a property that would silently break if the solver were
 * replaced by something that merely looks similar on screen.
 */

import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import {
  ASTRO,
  gravitationalRadius,
  schwarzschildRadius,
  SCALE_FRAMES,
  toRenderSpace,
  metresToUnits,
  unitsToMetres,
  frameById,
} from '../../src/core/scale';
import { totalFieldAt, traceFieldLine, currentProxyAt } from '../../src/simulation/field';
import { createPlasma, stepPlasma } from '../../src/simulation/plasma';
import { createBody, stepBody, launchBody, centreOfMass } from '../../src/simulation/body';
import {
  blackHoleAccel,
  circularSpeed,
  predictEncounter,
  redshiftFactor,
} from '../../src/simulation/gravity';
import { blackHoleRadii, tidalRadius, type BlackHoleState, type FieldNode, type Vec3 } from '../../src/simulation/state';
import { createCloud, applyBrush, totalAngularMomentum } from '../../src/simulation/cloud';

const SUN = ASTRO.SOLAR_MASS;

function makeBh(solarMasses: number): BlackHoleState {
  return {
    massKg: solarMasses * SUN,
    spin: 0,
    position: [0, 0, 0],
    axis: [0, 1, 0],
    diskBrightness: 0.3,
    diskInnerRg: 6,
    diskOuterRg: 30,
    accretedKg: 0,
  };
}

describe('scale frames', () => {
  it('round-trips metres through render units', () => {
    for (const f of SCALE_FRAMES) {
      const m = f.extent * 0.37;
      expect(unitsToMetres(metresToUnits(m, f), f)).toBeCloseTo(m, 4);
    }
  });

  it('floating origin keeps render coordinates small at astronomical distance', () => {
    // The whole point of 7.2: a 10^16 m absolute coordinate must not reach the
    // GPU. Subtracting the camera origin in float64 first is what prevents that.
    const frame = frameById('cosmic');
    const absolute: Vec3 = [1.2345e16, -8.9e15, 4.4e15];
    const origin: Vec3 = [1.2345e16 - 3e14, -8.9e15, 4.4e15];
    const out = new Float32Array(3);
    toRenderSpace(absolute, origin, frame, out);
    expect(Math.abs(out[0])).toBeLessThan(1000);
    expect(out[1]).toBe(0);
    // And the surviving precision is meaningful, not annihilated by cancellation.
    expect(out[0]).toBeGreaterThan(0);
  });

  it('reproduces textbook black-hole radii', () => {
    // Sgr A*-like: 4.1e6 Msun. r_s = 2GM/c^2 ~ 1.21e10 m (~0.08 AU).
    const rs = schwarzschildRadius(4.1e6 * SUN);
    expect(rs).toBeGreaterThan(1.1e10);
    expect(rs).toBeLessThan(1.3e10);
    // r_g is exactly half of r_s.
    expect(gravitationalRadius(4.1e6 * SUN) * 2).toBeCloseTo(rs, 0);
    // One solar mass: r_s ~ 2.95 km.
    expect(schwarzschildRadius(SUN)).toBeCloseTo(2953, -1);
  });

  it('places ISCO and the photon sphere at their Schwarzschild values', () => {
    const bh = makeBh(1e6);
    const { rg, isco, photonSphere, rs } = blackHoleRadii(bh);
    expect(isco / rg).toBeCloseTo(6, 6);
    expect(photonSphere / rg).toBeCloseTo(3, 6);
    expect(rs / rg).toBeCloseTo(2, 6);
  });
});

describe('magnetic field', () => {
  const node: FieldNode = {
    id: 'n', kind: 'dipole', position: [0, 0, 0],
    moment: [0, 1e18, 0], radius: 10, enabled: true, provenanceId: 'p',
  };

  it('falls off as 1/r^3 on the dipole axis', () => {
    const b1: Vec3 = [0, 0, 0];
    const b2: Vec3 = [0, 0, 0];
    totalFieldAt([node], 0, 1000, 0, b1);
    totalFieldAt([node], 0, 2000, 0, b2);
    const ratio = Math.hypot(b1[0], b1[1], b1[2]) / Math.hypot(b2[0], b2[1], b2[2]);
    expect(ratio).toBeCloseTo(8, 1); // doubling r divides |B| by 2^3
  });

  it('is twice as strong on-axis as at the same radius on the equator', () => {
    // Exact dipole identity: |B_axis| / |B_equator| = 2.
    const axis: Vec3 = [0, 0, 0];
    const equator: Vec3 = [0, 0, 0];
    totalFieldAt([node], 0, 5000, 0, axis);
    totalFieldAt([node], 5000, 0, 0, equator);
    const ratio = Math.hypot(...axis) / Math.hypot(...equator);
    expect(ratio).toBeCloseTo(2, 2);
  });

  it('is divergence-free', () => {
    // div B = 0 is the defining property of a physical magnetic field. A field
    // assembled from hand-drawn curves would fail this.
    //
    // Any finite-difference estimate carries O(h^2) truncation error, so a bare
    // threshold would only be testing the step size. Instead assert SECOND-ORDER
    // CONVERGENCE: halving h must cut the residual by ~4x. That is true only if
    // the underlying divergence is genuinely zero — a field with real divergence
    // would converge to a nonzero constant instead.
    const p: Vec3 = [800, 1300, -600];
    const relativeDiv = (h: number) => {
      const px: Vec3 = [0, 0, 0], nx: Vec3 = [0, 0, 0];
      const py: Vec3 = [0, 0, 0], ny: Vec3 = [0, 0, 0];
      const pz: Vec3 = [0, 0, 0], nz: Vec3 = [0, 0, 0];
      totalFieldAt([node], p[0] + h, p[1], p[2], px);
      totalFieldAt([node], p[0] - h, p[1], p[2], nx);
      totalFieldAt([node], p[0], p[1] + h, p[2], py);
      totalFieldAt([node], p[0], p[1] - h, p[2], ny);
      totalFieldAt([node], p[0], p[1], p[2] + h, pz);
      totalFieldAt([node], p[0], p[1], p[2] - h, nz);
      const div = (px[0] - nx[0] + py[1] - ny[1] + pz[2] - nz[2]) / (2 * h);
      const centre: Vec3 = [0, 0, 0];
      totalFieldAt([node], p[0], p[1], p[2], centre);
      // Normalise by |B|/r, the natural scale of a derivative of this field.
      return Math.abs(div) * Math.hypot(...p) / Math.hypot(...centre);
    };

    const coarse = relativeDiv(50);
    const fine = relativeDiv(25);
    expect(fine).toBeLessThan(coarse);
    expect(coarse / fine).toBeGreaterThan(3.5); // ~4x for 2nd-order convergence
    expect(fine).toBeLessThan(5e-3);
  });

  it('reverses direction when polarity flips', () => {
    const a: Vec3 = [0, 0, 0];
    const b: Vec3 = [0, 0, 0];
    totalFieldAt([node], 300, 400, 0, a);
    totalFieldAt([{ ...node, moment: [0, -1e18, 0] }], 300, 400, 0, b);
    expect(a[0]).toBeCloseTo(-b[0], 12);
    expect(a[1]).toBeCloseTo(-b[1], 12);
  });

  it('contributes nothing when disabled', () => {
    const out: Vec3 = [0, 0, 0];
    totalFieldAt([{ ...node, enabled: false }], 100, 100, 100, out);
    expect(out).toEqual([0, 0, 0]);
  });

  it('traces field lines that follow the field direction', () => {
    // Start well outside the softening core with a step ~1% of the radius. A
    // dipole field line from the equator curves back to the poles and dives
    // into the origin, where the softened field is no longer a true dipole, so
    // tangency is only checked over the early, well-resolved portion.
    const buf = new Float64Array(400 * 3);
    const n = traceFieldLine([node], [1000, 0, 0], 10, 400, 50_000, buf);
    expect(n).toBeGreaterThan(20);

    // Every segment must be parallel to B at its midpoint.
    const b: Vec3 = [0, 0, 0];
    for (let i = 1; i < Math.min(n, 40); i++) {
      const dx = buf[i * 3] - buf[(i - 1) * 3];
      const dy = buf[i * 3 + 1] - buf[(i - 1) * 3 + 1];
      const dz = buf[i * 3 + 2] - buf[(i - 1) * 3 + 2];
      const mx = (buf[i * 3] + buf[(i - 1) * 3]) / 2;
      const my = (buf[i * 3 + 1] + buf[(i - 1) * 3 + 1]) / 2;
      const mz = (buf[i * 3 + 2] + buf[(i - 1) * 3 + 2]) / 2;
      totalFieldAt([node], mx, my, mz, b);
      const dl = Math.hypot(dx, dy, dz);
      const bl = Math.hypot(...b);
      if (dl < 1e-9 || bl < 1e-30) continue;
      const cos = (dx * b[0] + dy * b[1] + dz * b[2]) / (dl * bl);
      expect(cos).toBeGreaterThan(0.99);
    }
  });

  it('detects field reversal as shear for the reconnection surrogate', () => {
    const opposed: FieldNode[] = [
      { ...node, id: 'a', position: [-500, 0, 0], moment: [0, 1e18, 0] },
      { ...node, id: 'b', position: [500, 0, 0], moment: [0, -1e18, 0] },
    ];
    const between = currentProxyAt(opposed, 0, 0, 0, 50);
    const outside = currentProxyAt(opposed, 0, 6000, 0, 50);
    expect(between.shear).toBeGreaterThan(outside.shear);
  });
});

describe('plasma (Boris pusher)', () => {
  it('conserves speed under a pure magnetic field', () => {
    // The defining property of the Boris scheme: magnetic rotation is exact, so
    // the population neither heats nor cools numerically over long runs. An
    // Euler or RK integrator would show monotonic energy drift here.
    const centre: Vec3 = [0, 0, 0];
    const plasma = createPlasma(256, centre, 5e4, 42);
    plasma.damping = 0;
    plasma.ticksSinceReconnection = 0; // suppress the surrogate for this test

    const nodes: FieldNode[] = [
      { id: 'a', kind: 'ring', position: [0, -9.5e4, 0], moment: [0, 6.25e18, 0], radius: 2.1e4, enabled: true, provenanceId: 'a' },
      { id: 'b', kind: 'ring', position: [0, 9.5e4, 0], moment: [0, -6.25e18, 0], radius: 2.1e4, enabled: true, provenanceId: 'b' },
    ];

    const speedOf = (i: number) =>
      Math.hypot(plasma.vel[i * 3], plasma.vel[i * 3 + 1], plasma.vel[i * 3 + 2]);
    const before = Array.from({ length: 64 }, (_, i) => speedOf(i));

    const rng = new Rng(1);
    for (let t = 0; t < 60; t++) {
      stepPlasma(plasma, nodes, 0.002, t, [], rng);
    }

    for (let i = 0; i < 64; i++) {
      expect(speedOf(i)).toBeCloseTo(before[i], 4);
    }
  });

  it('damping removes energy monotonically', () => {
    const plasma = createPlasma(128, [0, 0, 0], 5e4, 7);
    plasma.damping = 2.0;
    plasma.ticksSinceReconnection = 0;
    const energy = () => {
      let e = 0;
      for (let i = 0; i < plasma.count; i++) {
        const i3 = i * 3;
        e += plasma.vel[i3] ** 2 + plasma.vel[i3 + 1] ** 2 + plasma.vel[i3 + 2] ** 2;
      }
      return e;
    };
    const e0 = energy();
    const rng = new Rng(2);
    for (let t = 0; t < 40; t++) stepPlasma(plasma, [], 0.002, t, [], rng);
    expect(energy()).toBeLessThan(e0);
  });

  it('loses confinement when every field element is disabled', () => {
    // With no field the particles stream ballistically out of the containment
    // volume, which is the physically correct "confinement failure".
    const plasma = createPlasma(512, [0, 0, 0], 5e4, 11);
    plasma.ticksSinceReconnection = 0;
    const rng = new Rng(3);
    for (let t = 0; t < 400; t++) stepPlasma(plasma, [], 0.002, t, [], rng);
    expect(plasma.confinement).toBeLessThan(0.5);
  });
});

describe('pseudo-Newtonian gravity', () => {
  it('recovers Newtonian acceleration far from the hole', () => {
    const bh = makeBh(1e6);
    const r = 1e5 * gravitationalRadius(bh.massKg);
    const a = blackHoleAccel(bh, r, 0, 0);
    const newtonian = (ASTRO.G * bh.massKg) / (r * r);
    // At 10^5 r_g the r_s correction is ~4e-5 relative.
    expect(Math.abs(a.ax) / newtonian).toBeCloseTo(1, 3);
  });

  it('exceeds Newtonian gravity near the horizon', () => {
    // This divergence is the whole reason for using Paczynski-Wiita: it is what
    // produces plunging orbits and an ISCO instead of ordinary Kepler ellipses.
    const bh = makeBh(1e6);
    const { rg } = blackHoleRadii(bh);
    const r = 8 * rg;
    const a = blackHoleAccel(bh, r, 0, 0);
    const newtonian = (ASTRO.G * bh.massKg) / (r * r);
    expect(Math.abs(a.ax)).toBeGreaterThan(newtonian * 1.3);
  });

  it('keeps a circular orbit outside the ISCO but plunges inside it', () => {
    const bh = makeBh(1e6);
    const { rg, rs } = blackHoleRadii(bh);

    const run = (radiusRg: number) => {
      const r0 = radiusRg * rg;
      let x = r0, y = 0, vx = 0, vy = circularSpeed(bh, r0);
      const dt = 0.4;
      let minR = r0, maxR = r0;
      for (let i = 0; i < 400_000; i++) {
        const a = blackHoleAccel(bh, x, y, 0);
        vx += a.ax * dt; vy += a.ay * dt;
        x += vx * dt; y += vy * dt;
        const r = Math.hypot(x, y);
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        if (r <= rs) return { plunged: true, minR, maxR };
      }
      return { plunged: false, minR, maxR };
    };

    const stable = run(20);
    expect(stable.plunged).toBe(false);
    // Stays close to circular: excursion under ~10% of the radius.
    expect((stable.maxR - stable.minR) / (20 * rg)).toBeLessThan(0.1);

    const inside = run(4);
    expect(inside.plunged).toBe(true);
  });

  it('gravitational redshift matches sqrt(1 - r_s/r)', () => {
    const bh = makeBh(1e6);
    const { rs } = blackHoleRadii(bh);
    expect(redshiftFactor(bh, 2 * rs)).toBeCloseTo(Math.SQRT1_2, 6);
    expect(redshiftFactor(bh, 1e6 * rs)).toBeCloseTo(1, 5);
  });
});

describe('encounter prediction', () => {
  const bh = makeBh(4.1e6);
  const { rg } = blackHoleRadii(bh);
  const rTidal = 1.11e11;

  it('classifies a radial drop as direct infall', () => {
    const p = predictEncounter(bh, [500 * rg, 0, 0], [-1e5, 0, 0], rTidal);
    expect(p.kind).toBe('directInfall');
  });

  it('classifies a distant fast pass as escape', () => {
    const r = 5000 * rg;
    const vEsc = Math.sqrt((2 * ASTRO.G * bh.massKg) / r);
    const p = predictEncounter(bh, [r, 0, 0], [0, vEsc * 1.6, 0], rTidal);
    expect(p.bound).toBe(false);
    expect(p.kind).toBe('escape');
  });

  it('classifies a grazing periapsis as tidal disruption', () => {
    // Aim so the conic periapsis lands just inside the tidal radius.
    const r = 3e12;
    const vCirc = Math.sqrt((ASTRO.G * bh.massKg) / r);
    // A mostly-tangential but sub-circular velocity drops periapsis inward.
    const p = predictEncounter(bh, [r, 0, 0], [0, vCirc * 0.26, 0], rTidal);
    expect(p.periapsis).toBeLessThan(rTidal);
    expect(p.kind).toBe('tidalDisruption');
  });

  it('reports bound orbits as bound', () => {
    const r = 800 * rg;
    const vCirc = Math.sqrt((ASTRO.G * bh.massKg) / r);
    const p = predictEncounter(bh, [r, 0, 0], [0, vCirc, 0], rTidal);
    expect(p.bound).toBe(true);
  });
});

describe('stellar body', () => {
  it('holds together in equilibrium when tides are negligible', () => {
    // Far from the hole the external field is nearly uniform, so self-gravity
    // and the pressure support must cancel and the star must NOT collapse or
    // puff up. A body that boiled here would make disruption meaningless.
    const bh = makeBh(4.1e6);
    const start: Vec3 = [4e14, 0, 0]; // ~66000 r_g: tidal force negligible
    const body = createBody(2048, start, SUN, ASTRO.SOLAR_RADIUS, 5, 'test');
    launchBody(body, [0, 0, 0]);

    const rms = () => {
      const c = centreOfMass(body);
      let s = 0, n = 0;
      for (let i = 0; i < body.count; i++) {
        if (body.bound[i] === 2) continue;
        s += (body.pos[i * 3] - c[0]) ** 2 + (body.pos[i * 3 + 1] - c[1]) ** 2 + (body.pos[i * 3 + 2] - c[2]) ** 2;
        n++;
      }
      return Math.sqrt(s / n);
    };

    const r0 = rms();
    for (let t = 0; t < 300; t++) stepBody(body, bh, 20, t, []);
    const r1 = rms();

    expect(r1 / r0).toBeGreaterThan(0.9);
    expect(r1 / r0).toBeLessThan(1.1);
    expect(body.boundFraction).toBeGreaterThan(0.98);
    expect(body.disrupted).toBe(false);
  });

  /**
   * Tangential launch from apoapsis r0 with speed f * v_circular gives, for a
   * Kepler conic, e = 1 - f^2 and periapsis = r0 f^2 / (2 - f^2).
   * With r0 = 8e11 and f = 0.42 that is ~7.8e10 m — comfortably inside the
   * tidal radius (1.11e11) but outside the ISCO (6 r_g = 3.6e10), so the star
   * is torn apart rather than swallowed whole. Half the orbital period is
   * ~2050 ticks at dt = 20 s, so 5000 ticks carries it through periapsis.
   */
  const APO = 8e11;
  const F = 0.42;

  it('disrupts when it passes inside the tidal radius', () => {
    const bh = makeBh(4.1e6);
    const body = createBody(2048, [APO, 0, 0], SUN, ASTRO.SOLAR_RADIUS, 9, 'test');
    const rt = tidalRadius(bh, body);
    // Sanity: for these masses the tidal radius must sit outside the horizon,
    // otherwise the star would be swallowed whole and there is nothing to see.
    expect(rt).toBeGreaterThan(blackHoleRadii(bh).rs);

    const vCirc = Math.sqrt((ASTRO.G * bh.massKg) / APO);
    launchBody(body, [0, vCirc * F, 0]);

    const events: import('../../src/simulation/state').SimEvent[] = [];
    for (let t = 0; t < 5000; t++) stepBody(body, bh, 20, t, events);

    expect(body.tidallyStressed).toBe(true);
    expect(body.boundFraction).toBeLessThan(0.9);
    expect(events.some((e) => e.kind === 'tidalThreshold')).toBe(true);
  });

  it('splits debris into leading and trailing streams', () => {
    const bh = makeBh(4.1e6);
    const body = createBody(4096, [APO, 0, 0], SUN, ASTRO.SOLAR_RADIUS, 21, 'test');
    const vCirc = Math.sqrt((ASTRO.G * bh.massKg) / APO);
    launchBody(body, [0, vCirc * F, 0]);
    for (let t = 0; t < 5000; t++) stepBody(body, bh, 20, t, []);

    let lead = 0, trail = 0;
    for (let i = 0; i < body.count; i++) {
      if (body.bound[i] !== 0) continue;
      if (body.stream[i] < 0) lead++;
      else if (body.stream[i] > 0) trail++;
    }
    // The energy spread across the star produces both a bound (fallback) and an
    // unbound arm — the signature two-armed TDE morphology.
    expect(lead).toBeGreaterThan(0);
    expect(trail).toBeGreaterThan(0);
  });

  it('conserves particle count across accretion', () => {
    const bh = makeBh(4.1e6);
    const body = createBody(1024, [2e11, 0, 0], SUN, ASTRO.SOLAR_RADIUS, 33, 'test');
    launchBody(body, [-3e6, 0, 0]);
    let accreted = 0;
    for (let t = 0; t < 3000; t++) accreted += stepBody(body, bh, 20, t, []).accretedKg;

    let counted = 0;
    for (let i = 0; i < body.count; i++) if (body.bound[i] === 2) counted++;
    expect(accreted).toBeGreaterThan(0);
    expect(counted).toBeGreaterThan(0);
    // Mass bookkeeping: accreted mass equals swallowed particles * per-particle.
    // Compared relatively — these are ~1e30 kg, so an absolute tolerance would
    // be testing float64 accumulation order, not the bookkeeping.
    const expected = (counted * SUN) / 1024;
    expect(Math.abs(accreted - expected) / expected).toBeLessThan(1e-12);
  });
});

describe('cloud brushes', () => {
  it('gather increases central concentration', () => {
    const centre: Vec3 = [0, 0, 0];
    const cloud = createCloud(200, centre, 3e15, 500 * SUN, 4);
    const meanR = () => {
      let s = 0;
      for (let i = 0; i < cloud.count; i++) {
        s += Math.hypot(cloud.pos[i * 3], cloud.pos[i * 3 + 1], cloud.pos[i * 3 + 2]);
      }
      return s / cloud.count;
    };
    const before = meanR();
    // strength is m/s of imparted speed per second, so strength*dt is the
    // velocity kick. Sized here to give ~1 km/s per application, comparable to
    // the cloud's own turbulent velocities.
    const dt = 3.15e8;
    for (let i = 0; i < 60; i++) {
      applyBrush(cloud, 'gather', centre, 3e15, 3e-6, [0, 1, 0], dt);
      for (let k = 0; k < cloud.count * 3; k++) cloud.pos[k] += cloud.vel[k] * dt;
    }
    expect(meanR()).toBeLessThan(before);
  });

  it('spin imparts angular momentum about the requested axis', () => {
    const centre: Vec3 = [0, 0, 0];
    const cloud = createCloud(200, centre, 3e15, 500 * SUN, 6);
    const before = totalAngularMomentum(cloud);
    applyBrush(cloud, 'spin', centre, 4e15, 3e-9, [0, 1, 0], 3.15e8);
    const after = totalAngularMomentum(cloud);
    expect(after[1]).toBeGreaterThan(before[1]);
  });

  it('brushes act on velocity, never teleporting matter', () => {
    // 25.17: releasing must hand control back to the solver, which is only true
    // if the brush applied an impulse rather than moving particles directly.
    const cloud = createCloud(64, [0, 0, 0], 3e15, 500 * SUN, 8);
    const posBefore = cloud.pos.slice();
    applyBrush(cloud, 'gather', [0, 0, 0], 4e15, 1e5, [0, 1, 0], 3.15e8);
    expect(Array.from(cloud.pos)).toEqual(Array.from(posBefore));
    expect(cloud.vel.some((v, i) => v !== 0 || i < 0)).toBe(true);
  });
});
