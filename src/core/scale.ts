/**
 * Multi-scale spatial architecture (BUILD_SPEC 7).
 *
 * The product spans molecular-cloud separations down to gravitational radii —
 * far too many orders of magnitude for one float32 GPU space. Simulation state
 * is stored in float64 metres inside a named frame; the renderer only ever sees
 * camera-relative positions divided by the frame's render unit, which keeps GPU
 * coordinates inside a well-conditioned range regardless of absolute scale.
 */

export type ScaleFrameId =
  | 'cosmic'
  | 'system'
  | 'object'
  | 'relativistic'
  | 'detail';

export interface ScaleFrame {
  readonly id: ScaleFrameId;
  /** Metres per render unit. Positions are divided by this before upload. */
  readonly metresPerUnit: number;
  /** Characteristic extent of the frame in metres; drives handoff thresholds. */
  readonly extent: number;
  readonly near: number;
  readonly far: number;
  /** Base camera translation speed in render units/second. */
  readonly travelSpeed: number;
}

const AU = 1.495978707e11;
const PC = 3.0856775814913673e16;

/**
 * Frames are ordered coarse -> fine. Each frame's render unit is chosen so the
 * interesting structure at that scale lands in roughly the 1-1000 unit band.
 */
export const SCALE_FRAMES: readonly ScaleFrame[] = [
  {
    id: 'cosmic',
    metresPerUnit: 0.05 * PC,
    extent: 12 * PC,
    near: 0.05,
    far: 6.0e5,
    travelSpeed: 12,
  },
  {
    id: 'system',
    metresPerUnit: 40 * AU,
    extent: 4000 * AU,
    near: 0.02,
    far: 2.0e5,
    travelSpeed: 6,
  },
  {
    id: 'object',
    metresPerUnit: 0.25 * AU,
    extent: 80 * AU,
    near: 0.01,
    far: 1.0e5,
    travelSpeed: 3,
  },
  {
    id: 'relativistic',
    // Normalised to gravitational radii at runtime; see relativisticFrameFor().
    metresPerUnit: 1.0,
    extent: 200,
    near: 0.004,
    far: 4.0e4,
    travelSpeed: 2,
  },
  {
    id: 'detail',
    metresPerUnit: 1.0,
    extent: 20,
    near: 0.001,
    far: 1.0e4,
    travelSpeed: 0.6,
  },
];

export function frameById(id: ScaleFrameId): ScaleFrame {
  const f = SCALE_FRAMES.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown scale frame: ${id}`);
  return f;
}

/**
 * Near a black hole the natural unit is the gravitational radius, so this frame
 * is rebuilt from the active hole's mass rather than using a fixed constant.
 * Rendering at r_g = 1 unit keeps the lensing shader's impact-parameter maths in
 * a numerically comfortable range for any hole mass.
 */
export function relativisticFrameFor(gravitationalRadiusMetres: number): ScaleFrame {
  const base = frameById('relativistic');
  return { ...base, metresPerUnit: gravitationalRadiusMetres };
}

export function detailFrameFor(gravitationalRadiusMetres: number): ScaleFrame {
  const base = frameById('detail');
  return { ...base, metresPerUnit: gravitationalRadiusMetres * 0.1 };
}

/**
 * Converts an absolute float64 position (metres) into camera-relative render
 * units. This is the floating-origin step (BUILD_SPEC 7.2): the subtraction
 * happens in float64 on the CPU, so the float32 value the GPU receives is small
 * and precise even when the absolute coordinate is astronomically large.
 */
export function toRenderSpace(
  absolute: readonly [number, number, number],
  origin: readonly [number, number, number],
  frame: ScaleFrame,
  out: Float32Array,
  offset = 0,
): void {
  const inv = 1 / frame.metresPerUnit;
  out[offset] = (absolute[0] - origin[0]) * inv;
  out[offset + 1] = (absolute[1] - origin[1]) * inv;
  out[offset + 2] = (absolute[2] - origin[2]) * inv;
}

export function metresToUnits(metres: number, frame: ScaleFrame): number {
  return metres / frame.metresPerUnit;
}

export function unitsToMetres(units: number, frame: ScaleFrame): number {
  return units * frame.metresPerUnit;
}

/**
 * Chooses the frame whose extent best matches how far the camera is from its
 * focus. Hysteresis is applied by the caller (ScaleFrameController) so the
 * selection cannot oscillate on a boundary.
 */
export function selectFrameForDistance(
  distanceMetres: number,
  frames: readonly ScaleFrame[] = SCALE_FRAMES,
): ScaleFrame {
  for (let i = frames.length - 1; i >= 0; i--) {
    const f = frames[i];
    if (distanceMetres <= f.extent) return f;
  }
  return frames[0];
}

export const ASTRO = {
  AU,
  PC,
  /** Gravitational constant, CODATA. */
  G: 6.6743e-11,
  C: 299792458,
  SOLAR_MASS: 1.98892e30,
  SOLAR_RADIUS: 6.957e8,
} as const;

/** Schwarzschild radius r_s = 2GM/c^2. */
export function schwarzschildRadius(massKg: number): number {
  return (2 * ASTRO.G * massKg) / (ASTRO.C * ASTRO.C);
}

/** Gravitational radius r_g = GM/c^2 = r_s / 2. */
export function gravitationalRadius(massKg: number): number {
  return (ASTRO.G * massKg) / (ASTRO.C * ASTRO.C);
}
