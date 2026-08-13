/**
 * Magnetic field evaluation (BUILD_SPEC 10.2).
 *
 * Fidelity class B: the field is an exact analytic superposition of ideal
 * dipole/loop contributions from the user's field elements. It is a real
 * magnetostatic field — divergence-free, correct 1/r^3 falloff, correct angular
 * structure — so field lines and particle motion are genuinely derived from it
 * rather than drawn by hand (10.6, 25.18). What it is NOT is a self-consistent
 * MHD field: the plasma's own currents do not feed back into B. That limit is
 * recorded in docs/model-fidelity.md and surfaced in Science peek.
 */

import type { FieldNode, Vec3 } from './state';

/** Vacuum permeability over 4π. */
const MU0_OVER_4PI = 1e-7;

/**
 * Inline 3D length. See the equivalent note in plasma.ts: Math.hypot's
 * overflow guarding makes it roughly an order of magnitude slower than sqrt,
 * and this function is evaluated per charged particle per field element.
 */
function len3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/* -------------------------------------------------------------------------- */
/* Packed field evaluation                                                     */
/* -------------------------------------------------------------------------- */

/** Stride of the packed layout: px py pz mx my mz radius kind. */
const STRIDE = 8;
const KIND_SOLENOID = 1;

/**
 * Flattened, enabled-only view of the field elements.
 *
 * Evaluating B straight off the FieldNode objects costs ~240 ns per charged
 * particle, dominated by property loads and JS-array indexing rather than
 * arithmetic. Packing into one Float64Array and reading it with scalar loads
 * removes that overhead entirely.
 *
 * Crucially this is the SINGLE field implementation: the plasma solver, the
 * field-line tracer and the reconnection probe all evaluate through
 * `FieldSet.evaluate`. BUILD_SPEC 25.18 requires that the visual scaffold derive
 * from the field the solver actually uses, so a separate "fast path" that could
 * drift from the display path would itself be a contract violation.
 */
export class FieldSet {
  private data = new Float64Array(0);
  private n = 0;

  /** Repacks from the authoritative node list. Cheap; call once per step. */
  update(nodes: readonly FieldNode[]): this {
    let count = 0;
    for (let i = 0; i < nodes.length; i++) if (nodes[i].enabled) count++;
    if (this.data.length < count * STRIDE) this.data = new Float64Array(count * STRIDE);

    let o = 0;
    for (let i = 0; i < nodes.length; i++) {
      const nd = nodes[i];
      if (!nd.enabled) continue;
      this.data[o] = nd.position[0];
      this.data[o + 1] = nd.position[1];
      this.data[o + 2] = nd.position[2];
      this.data[o + 3] = nd.moment[0];
      this.data[o + 4] = nd.moment[1];
      this.data[o + 5] = nd.moment[2];
      this.data[o + 6] = nd.radius;
      this.data[o + 7] = nd.kind === 'solenoid' ? KIND_SOLENOID : 0;
      o += STRIDE;
    }
    this.n = count;
    return this;
  }

  get count(): number {
    return this.n;
  }

  /** Total B at a point. Writes into `out` and returns it. */
  evaluate(x: number, y: number, z: number, out: Vec3): Vec3 {
    const d = this.data;
    let bx = 0, by = 0, bz = 0;

    for (let o = 0, k = 0; k < this.n; k++, o += STRIDE) {
      const dx = x - d[o];
      const dy = y - d[o + 1];
      const dz = z - d[o + 2];
      const mx = d[o + 3];
      const my = d[o + 4];
      const mz = d[o + 5];
      const eps = d[o + 6];

      const r2 = dx * dx + dy * dy + dz * dz + eps * eps;
      const r = Math.sqrt(r2);
      const invR3 = 1 / (r2 * r);
      const invR5 = invR3 / r2;
      const mDotR = mx * dx + my * dy + mz * dz;
      const t3 = 3 * mDotR * invR5;

      bx += MU0_OVER_4PI * (t3 * dx - mx * invR3);
      by += MU0_OVER_4PI * (t3 * dy - my * invR3);
      bz += MU0_OVER_4PI * (t3 * dz - mz * invR3);

      if (d[o + 7] === KIND_SOLENOID) {
        const mLen = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
        const ax = mx / mLen, ay = my / mLen, az = mz / mLen;
        const along = dx * ax + dy * ay + dz * az;
        const px = dx - along * ax;
        const py = dy - along * ay;
        const pz = dz - along * az;
        const rho = Math.sqrt(px * px + py * py + pz * pz);

        const radial = 1 - smoothstep(eps * 0.7, eps * 1.15, rho);
        const axial = 1 - smoothstep(eps * 1.6, eps * 2.6, Math.abs(along));
        const interior = radial * axial;
        const strength = (MU0_OVER_4PI * mLen) / (eps * eps * eps);

        bx += ax * strength * interior;
        by += ay * strength * interior;
        bz += az * strength * interior;
      }
    }

    out[0] = bx;
    out[1] = by;
    out[2] = bz;
    return out;
  }
}

/** Shared scratch set for callers that pass raw node arrays (tests, cold paths). */
const sharedSet = new FieldSet();

/**
 * Total B from every enabled element.
 *
 * Convenience wrapper that repacks on every call — correct but not for hot
 * loops. Per-particle code should hold its own FieldSet and call `evaluate`.
 */
export function totalFieldAt(
  nodes: readonly FieldNode[],
  x: number,
  y: number,
  z: number,
  out: Vec3,
  _scratch: Vec3 = [0, 0, 0],
): Vec3 {
  return sharedSet.update(nodes).evaluate(x, y, z, out);
}

/**
 * Traces one field line by RK4 integration along B̂ (BUILD_SPEC 10.6, 20).
 *
 * Returns the number of points written. Integrating the direction field — not
 * drawing a decorative curve — is what makes the visualisation update correctly
 * the moment a node moves, and is why line topology changes when the user
 * reverses a polarity.
 */
export function traceFieldLine(
  nodes: readonly FieldNode[] | FieldSet,
  start: Vec3,
  stepMetres: number,
  maxPoints: number,
  bounds: number,
  out: Float64Array,
  direction: 1 | -1 = 1,
): number {
  const set = nodes instanceof FieldSet ? nodes : new FieldSet().update(nodes);
  const k1: Vec3 = [0, 0, 0];
  const k2: Vec3 = [0, 0, 0];
  const k3: Vec3 = [0, 0, 0];
  const k4: Vec3 = [0, 0, 0];
  let x = start[0];
  let y = start[1];
  let z = start[2];
  let n = 0;

  for (; n < maxPoints; n++) {
    out[n * 3] = x;
    out[n * 3 + 1] = y;
    out[n * 3 + 2] = z;

    if (!unitField(set, x, y, z, k1, direction)) break;
    const h = stepMetres;
    if (!unitField(set, x + (h / 2) * k1[0], y + (h / 2) * k1[1], z + (h / 2) * k1[2], k2, direction)) break;
    if (!unitField(set, x + (h / 2) * k2[0], y + (h / 2) * k2[1], z + (h / 2) * k2[2], k3, direction)) break;
    if (!unitField(set, x + h * k3[0], y + h * k3[1], z + h * k3[2], k4, direction)) break;

    x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    z += (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);

    if (len3(x, y, z) > bounds) {
      n++;
      break;
    }
  }
  return n;
}

function unitField(
  set: FieldSet,
  x: number,
  y: number,
  z: number,
  out: Vec3,
  direction: number,
): boolean {
  set.evaluate(x, y, z, out);
  const m = len3(out[0], out[1], out[2]);
  // A null point: the line genuinely terminates rather than wandering on noise.
  if (!(m > 1e-30)) return false;
  const s = direction / m;
  out[0] *= s;
  out[1] *= s;
  out[2] *= s;
  return true;
}

/**
 * Current-density-like proxy |∇ × B| by central differences, plus a measure of
 * how strongly opposing the field is across the sample point.
 *
 * The reconnection surrogate (BUILD_SPEC 10.7) fires on these two quantities.
 * It is explicitly a surrogate: a real resistive-MHD reconnection rate is not
 * computed, and the Science peek says so.
 */
export function currentProxyAt(
  nodes: readonly FieldNode[],
  x: number,
  y: number,
  z: number,
  h: number,
): { curl: number; shear: number; magnitude: number } {
  const s: Vec3 = [0, 0, 0];
  const px: Vec3 = [0, 0, 0];
  const nx: Vec3 = [0, 0, 0];
  const py: Vec3 = [0, 0, 0];
  const ny: Vec3 = [0, 0, 0];
  const pz: Vec3 = [0, 0, 0];
  const nz: Vec3 = [0, 0, 0];

  totalFieldAt(nodes, x + h, y, z, px, s);
  totalFieldAt(nodes, x - h, y, z, nx, s);
  totalFieldAt(nodes, x, y + h, z, py, s);
  totalFieldAt(nodes, x, y - h, z, ny, s);
  totalFieldAt(nodes, x, y, z + h, pz, s);
  totalFieldAt(nodes, x, y, z - h, nz, s);

  const inv2h = 1 / (2 * h);
  const curlX = (py[2] - ny[2]) * inv2h - (pz[1] - nz[1]) * inv2h;
  const curlY = (pz[0] - nz[0]) * inv2h - (px[2] - nx[2]) * inv2h;
  const curlZ = (px[1] - nx[1]) * inv2h - (py[0] - ny[0]) * inv2h;

  const centre: Vec3 = [0, 0, 0];
  totalFieldAt(nodes, x, y, z, centre, s);
  const magnitude = len3(centre[0], centre[1], centre[2]);

  // Anti-alignment across the stencil: ~1 where field reverses direction.
  const dotXY = dotNorm(px, nx);
  const dotYZ = dotNorm(py, ny);
  const dotZX = dotNorm(pz, nz);
  const shear = Math.max(0, 1 - Math.min(dotXY, dotYZ, dotZX)) * 0.5;

  return { curl: Math.hypot(curlX, curlY, curlZ), shear, magnitude };
}

function dotNorm(a: Vec3, b: Vec3): number {
  const la = len3(a[0], a[1], a[2]);
  const lb = len3(b[0], b[1], b[2]);
  if (la < 1e-30 || lb < 1e-30) return 1;
  return (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1e-30)));
  return t * t * (3 - 2 * t);
}
