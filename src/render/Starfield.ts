/**
 * Deep-space background as a navigation and lensing instrument (BUILD_SPEC 14).
 *
 * The star field is baked into a texture rather than drawn as sprites, because
 * 14.4 requires a representation the lensing pipeline can sample *directionally*:
 * given an outgoing geodesic direction, return what is there. A screen-space
 * bulge over sprite-drawn stars would be the prohibited "generic fisheye"
 * (11.7, 53).
 *
 * Storage is an equirectangular RGBA16F DataTexture:
 *
 *   - Equirectangular, not a cube map. A data-backed CubeTexture is the more
 *     natural fit and was implemented first; it was replaced because 2D
 *     DataTexture upload is the more heavily-exercised path in three's WebGPU
 *     backend and needs no per-face image wrapping. NOTE: the original switch
 *     was made while chasing an all-white frame that was later traced to a
 *     broken pixel-readback path in headless Chromium, not to the cube texture.
 *     The cube map may well have been fine. This is recorded so nobody treats
 *     "cube textures are broken" as an established fact — it is not.
 *   - Half-float, not RGBA8: real HDR, so the rare bright stars are not clipped.
 *     Those are exactly the sources that form followable arcs and Einstein rings
 *     when they pass behind the hole (14.2, and the acceptance criterion "at
 *     least one bright background source can be visually followed"). An 8-bit +
 *     shared-exponent encoding was tried first and is a trap on its own merits:
 *     the exponent has to live in the alpha channel, where canvas
 *     premultiplication and colour management can corrupt it.
 *
 * Equirectangular projection concentrates texels near the poles. That is
 * acceptable here because the content is procedural and splat radii are
 * corrected by 1/sin(theta), so stars stay round and there is no stretched image
 * to reveal a pole seam (14.2).
 *
 * Everything is a pure function of the seed, so a star keeps a stable identity
 * across reloads, rewinds and branches (14.2 "deterministic source IDs").
 */

import {
  ClampToEdgeWrapping,
  DataTexture,
  HalfFloatType,
  LinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
} from 'three/webgpu';
import { Rng } from '../core/rng';

export interface StarfieldOptions {
  /** Texture height; width is 2x this. */
  size: number;
  seed: number;
  /** Number of catalogue stars distributed over the whole sphere. */
  starCount: number;
  onProgress?: (fraction: number) => void;
}

export interface StarfieldResult {
  texture: DataTexture;
  width: number;
  height: number;
  /** Direction of the brightest star, so a reviewer can aim at a source that
   *  demonstrably lenses (Gate 0 human-review step). */
  brightestDirection: [number, number, number];
  starCount: number;
}

/**
 * Resolution at which the galactic band is evaluated, before bilinear upsample.
 *
 * The band is low-frequency — five octaves topping out near wavenumber 40 across
 * the sphere — so evaluating it per-texel at full resolution is pure waste.
 * Measured: direct per-texel evaluation over a 6x1024^2 cube cost ~11 s of
 * blocking main-thread work and made the tab unresponsive. A coarse grid plus
 * bilinear upsample is ~40x cheaper and visually identical, because all the
 * high-frequency detail comes from the star layer composited on top.
 */
const BAND_W = 256;
const BAND_H = 128;

/** Yields to the event loop so the boot progress surface can actually paint. */
const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

export async function buildStarfield(opts: StarfieldOptions): Promise<StarfieldResult> {
  const height = opts.size;
  const width = opts.size * 2;
  const hdr = new Float32Array(width * height * 3);

  // ---- Layer 3: galactic density band + dust lanes (14.1.3) ----------------
  await yieldToUi();
  paintGalacticBand(hdr, width, height, opts.seed);
  opts.onProgress?.(0.35);

  // ---- Layer 4: sparse distant galaxies (14.1.4) ---------------------------
  await yieldToUi();
  paintDistantGalaxies(hdr, width, height, opts.seed);
  opts.onProgress?.(0.5);

  // ---- Layer 1: the deterministic star catalogue (14.1.1) ------------------
  await yieldToUi();
  const brightest = paintStars(hdr, width, height, opts.seed, opts.starCount);
  opts.onProgress?.(0.85);
  await yieldToUi();

  // ---- Encode to RGBA16F ---------------------------------------------------
  const data = new Uint16Array(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++, p += 3) {
    const o = i * 4;
    data[o] = toHalf(hdr[p]);
    data[o + 1] = toHalf(hdr[p + 1]);
    data[o + 2] = toHalf(hdr[p + 2]);
    data[o + 3] = ONE_HALF;
  }
  opts.onProgress?.(1);

  const texture = new DataTexture(data, width, height, RGBAFormat, HalfFloatType);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  // Longitude wraps; latitude must clamp or the poles bleed across.
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  // Values are linear radiance; no transfer function must be applied.
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;

  return { texture, width, height, brightestDirection: brightest, starCount: opts.starCount };
}

/* -------------------------------------------------------------------------- */
/* Projection helpers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Equirectangular mapping, matching the shader side exactly:
 *   u = atan2(z, x) / 2pi + 0.5      (longitude, wraps)
 *   v = acos(y) / pi                 (latitude, 0 at +Y)
 */
function dirToUv(d: readonly [number, number, number]): { u: number; v: number } {
  return {
    u: Math.atan2(d[2], d[0]) / (2 * Math.PI) + 0.5,
    v: Math.acos(Math.max(-1, Math.min(1, d[1]))) / Math.PI,
  };
}

function uvToDir(u: number, v: number, out: [number, number, number]): void {
  const theta = v * Math.PI;
  const phi = (u - 0.5) * 2 * Math.PI;
  const st = Math.sin(theta);
  out[0] = st * Math.cos(phi);
  out[1] = Math.cos(theta);
  out[2] = st * Math.sin(phi);
}

/**
 * Additive Gaussian splat in equirectangular space.
 *
 * The horizontal radius is divided by sin(theta) so a star stays circular on the
 * sphere instead of being squashed toward the poles, which is what keeps the
 * projection from becoming visible (14.2).
 */
function addSplat(
  hdr: Float32Array,
  width: number,
  height: number,
  dir: readonly [number, number, number],
  r: number,
  g: number,
  b: number,
  radiusTexels: number,
): void {
  const { u, v } = dirToUv(dir);
  const cx = u * width - 0.5;
  const cy = v * height - 0.5;

  const sinTheta = Math.max(Math.sin(v * Math.PI), 1e-3);
  const radY = Math.max(0.6, radiusTexels);
  const radX = Math.min(width * 0.25, radY / sinTheta);

  const extX = Math.ceil(radX * 2.2);
  const extY = Math.ceil(radY * 2.2);
  const invX = 1 / (2 * radX * radX);
  const invY = 1 / (2 * radY * radY);

  const baseX = Math.round(cx);
  const baseY = Math.round(cy);

  for (let dy = -extY; dy <= extY; dy++) {
    const py = baseY + dy;
    if (py < 0 || py >= height) continue;
    const ddy = py - cy;
    for (let dx = -extX; dx <= extX; dx++) {
      const ddx = baseX + dx - cx;
      const w = Math.exp(-(ddx * ddx * invX + ddy * ddy * invY));
      if (w < 1e-4) continue;
      // Wrap longitude so a star sitting on the seam is not clipped.
      const px = (((baseX + dx) % width) + width) % width;
      const o = (py * width + px) * 3;
      hdr[o] += r * w;
      hdr[o + 1] += g * w;
      hdr[o + 2] += b * w;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Layers                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Star catalogue. Magnitudes follow a power law so genuinely bright stars are
 * rare (14.2 "nonuniform brightness distribution with genuinely rare bright
 * stars"), and colours come from a blackbody temperature ramp rather than random
 * hues (14.2 "physically plausible colour range").
 */
function paintStars(
  hdr: Float32Array,
  width: number,
  height: number,
  seed: number,
  count: number,
): [number, number, number] {
  const rng = new Rng(seed ^ 0x5741125);
  const dir: [number, number, number] = [0, 0, 0];
  let brightest: [number, number, number] = [0, 0, 1];
  let brightestFlux = 0;
  const scale = height / 1024;

  for (let i = 0; i < count; i++) {
    rng.onSphere(dir);

    // Concentrate a fraction toward the galactic plane (y ~ 0) so the sky has
    // structure rather than uniform scatter.
    if (rng.next() < 0.55) {
      dir[1] *= 0.16;
      const inv = 1 / (Math.hypot(dir[0], dir[1], dir[2]) || 1);
      dir[0] *= inv; dir[1] *= inv; dir[2] *= inv;
    }

    // Power-law flux: most stars faint, a handful very bright.
    const u = rng.next();
    const flux = 0.0004 * Math.pow(1 - u, -1.35);
    const temp = 2600 + Math.pow(rng.next(), 2.1) * 24000;
    const [r, g, b] = blackbodyRgb(temp);

    // Brighter stars get a wider point-spread, mimicking instrument response.
    const radius = (0.7 + Math.min(2.4, Math.log2(1 + flux * 900) * 0.5)) * scale;
    addSplat(hdr, width, height, dir, r * flux, g * flux, b * flux, radius);

    if (flux > brightestFlux) {
      brightestFlux = flux;
      brightest = [dir[0], dir[1], dir[2]];
    }
  }
  return brightest;
}

/** Restrained Milky-Way-like band with dust extinction (14.1.3). */
function paintGalacticBand(
  hdr: Float32Array,
  width: number,
  height: number,
  seed: number,
): void {
  const rng = new Rng(seed ^ 0xba5eba11);
  const oct = 5;
  const offsets: number[] = [];
  for (let o = 0; o < oct; o++) offsets.push(rng.range(0, 1000));

  // --- coarse evaluation ---
  const coarse = new Float32Array(BAND_W * BAND_H);
  const dir: [number, number, number] = [0, 0, 0];
  for (let y = 0; y < BAND_H; y++) {
    for (let x = 0; x < BAND_W; x++) {
      uvToDir((x + 0.5) / BAND_W, (y + 0.5) / BAND_H, dir);

      // Latitude off the galactic plane, which we place near y = 0.
      const lat = Math.abs(dir[1]);
      const band = Math.exp(-(lat * lat) / (2 * 0.055));
      if (band < 0.004) continue;

      let n = 0, amp = 0.5, freq = 2.4;
      for (let o = 0; o < oct; o++) {
        n += amp * valueNoise3(dir[0] * freq + offsets[o], dir[1] * freq, dir[2] * freq);
        amp *= 0.52;
        freq *= 2.03;
      }
      n = n * 0.5 + 0.5;

      // Dust lanes: a second, sharper noise that subtracts.
      const dust = Math.max(
        0,
        valueNoise3(dir[0] * 7.3, dir[1] * 9.1 + 31.7, dir[2] * 7.3) * 0.5 + 0.5,
      );
      coarse[y * BAND_W + x] = band * n * 0.02 * (1 - 0.82 * Math.pow(dust, 2.2));
    }
  }

  // --- bilinear upsample, wrapping in longitude ---
  for (let y = 0; y < height; y++) {
    const sy = ((y + 0.5) / height) * BAND_H - 0.5;
    const y0 = Math.max(0, Math.min(BAND_H - 1, Math.floor(sy)));
    const y1 = Math.max(0, Math.min(BAND_H - 1, y0 + 1));
    const fy = Math.max(0, Math.min(1, sy - y0));

    for (let x = 0; x < width; x++) {
      const sx = ((x + 0.5) / width) * BAND_W - 0.5;
      const x0f = Math.floor(sx);
      const fx = sx - x0f;
      const x0 = ((x0f % BAND_W) + BAND_W) % BAND_W;
      const x1 = (x0 + 1) % BAND_W;

      const c00 = coarse[y0 * BAND_W + x0];
      const c10 = coarse[y0 * BAND_W + x1];
      const c01 = coarse[y1 * BAND_W + x0];
      const c11 = coarse[y1 * BAND_W + x1];
      const glow =
        (c00 * (1 - fx) + c10 * fx) * (1 - fy) + (c01 * (1 - fx) + c11 * fx) * fy;
      if (glow <= 0) continue;

      const o = (y * width + x) * 3;
      // Slightly warm core, cooler outskirts — restrained, not neon.
      hdr[o] += glow;
      hdr[o + 1] += glow * 0.93;
      hdr[o + 2] += glow * 0.86;
    }
  }
}

/** Extremely subtle extended sources; extra scale anchors and lens targets. */
function paintDistantGalaxies(
  hdr: Float32Array,
  width: number,
  height: number,
  seed: number,
): void {
  const rng = new Rng(seed ^ 0x9a1a24);
  const dir: [number, number, number] = [0, 0, 0];
  const scale = height / 1024;
  for (let i = 0; i < 28; i++) {
    rng.onSphere(dir);
    // Avoid the galactic plane, where they would be hidden anyway.
    if (Math.abs(dir[1]) < 0.25) continue;
    const flux = rng.range(0.0015, 0.006);
    const radius = rng.range(3, 8) * scale;
    const tint = rng.range(0.82, 1.0);
    addSplat(hdr, width, height, dir, flux * tint, flux * 0.9, flux * 0.78, radius);
  }
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                   */
/* -------------------------------------------------------------------------- */

/** Cheap deterministic value noise; smooth and seamless in direction space. */
function valueNoise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const h = (a: number, b: number, c: number) => {
    let n = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (((n ^ (n >>> 16)) >>> 0) / 4294967295) * 2 - 1;
  };

  return lerp(
    lerp(
      lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u),
      lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u),
      v,
    ),
    lerp(
      lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u),
      lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u),
      v,
    ),
    w,
  );
}

/**
 * Approximate blackbody colour (normalised). Keeps stellar colours in the real
 * cool-red to hot-blue range instead of arbitrary hues.
 */
export function blackbodyRgb(kelvin: number): [number, number, number] {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  let r: number, g: number, b: number;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;

  const cl = (v: number) => Math.min(1, Math.max(0, v / 255));
  return [cl(r), cl(g), cl(b)];
}

/* --- float32 -> float16 --------------------------------------------------- */

const f32 = new Float32Array(1);
const i32 = new Int32Array(f32.buffer);
const ONE_HALF = 0x3c00; // 1.0 in IEEE half

/** IEEE 754 binary32 -> binary16, with flush-to-zero for subnormals. */
function toHalf(value: number): number {
  f32[0] = value;
  const x = i32[0];
  const sign = (x >>> 16) & 0x8000;
  let exp = (x >>> 23) & 0xff;
  let mant = x & 0x7fffff;

  if (exp === 255) return sign | 0x7c00 | (mant ? 0x200 : 0); // Inf / NaN
  exp = exp - 127 + 15;
  if (exp >= 31) return sign | 0x7c00; // overflow -> Inf
  if (exp <= 0) return sign; // underflow -> signed zero
  // Round to nearest even.
  mant += 0x1000;
  if (mant & 0x800000) {
    mant = 0;
    exp++;
    if (exp >= 31) return sign | 0x7c00;
  }
  return sign | (exp << 10) | (mant >>> 13);
}
