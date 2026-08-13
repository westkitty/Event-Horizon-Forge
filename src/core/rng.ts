/**
 * Deterministic seeded RNG.
 *
 * Rewind in Event Horizon Forge is checkpoint + replay (BUILD_SPEC 8.3), and
 * purely illustrative particle populations are reconstructed from seeds rather
 * than snapshotted. Both require a generator that is bit-identical for a given
 * seed and call sequence, and that can be cheaply forked into independent
 * streams so one subsystem drawing a different number of samples cannot shift
 * another subsystem's sequence.
 *
 * Implementation: SplitMix64-derived 32-bit stream. Integer math is kept in
 * uint32 lanes via Math.imul so results are exact on every JS engine, unlike
 * float transcendentals.
 */

export class Rng {
  private s0: number;
  private s1: number;

  constructor(seed: number | string) {
    const h = typeof seed === 'string' ? hashString(seed) : (seed >>> 0);
    // Avoid the all-zero state, which is a fixed point for xorshift-class steps.
    this.s0 = (h ^ 0x9e3779b9) >>> 0 || 0x6d2b79f5;
    this.s1 = (Math.imul(h, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0 || 0x1b873593;
  }

  /** Raw 32-bit unsigned draw. */
  nextUint(): number {
    let x = this.s0;
    const y = this.s1;
    this.s0 = y;
    x ^= (x << 23) >>> 0;
    x = (x ^ (x >>> 17) ^ y ^ (y >>> 26)) >>> 0;
    this.s1 = x;
    return (x + y) >>> 0;
  }

  /** Uniform in [0, 1). 24 bits of mantissa — ample for particle seeding. */
  next(): number {
    return (this.nextUint() >>> 8) / 0x1000000;
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /**
   * Standard normal via Box-Muller. Draws two uniforms per call (no caching of
   * the second variate) so the consumed-sample count stays a pure function of
   * the call count — caching would make the stream position depend on parity.
   */
  normal(): number {
    // Clamp away from exactly 0 so log() stays finite.
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Point uniformly distributed on the unit sphere. */
  onSphere(out: [number, number, number] = [0, 0, 0]): [number, number, number] {
    const z = this.range(-1, 1);
    const t = this.range(0, 2 * Math.PI);
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    out[0] = r * Math.cos(t);
    out[1] = r * Math.sin(t);
    out[2] = z;
    return out;
  }

  /** Point uniformly distributed inside the unit ball (uniform by volume). */
  inBall(out: [number, number, number] = [0, 0, 0]): [number, number, number] {
    this.onSphere(out);
    const r = Math.cbrt(this.next());
    out[0] *= r;
    out[1] *= r;
    out[2] *= r;
    return out;
  }

  /**
   * Derive an independent stream. Used so each subsystem (cloud, plasma,
   * stellar body, starfield) owns a private sequence keyed by a stable label,
   * making reconstruction order-independent across subsystems.
   */
  fork(label: string): Rng {
    const child = new Rng(hashString(label) ^ this.nextUint());
    return child;
  }

  /** Snapshot/restore for checkpointing generators that carry causal weight. */
  saveState(): [number, number] {
    return [this.s0, this.s1];
  }

  loadState(state: readonly [number, number]): void {
    this.s0 = state[0] >>> 0;
    this.s1 = state[1] >>> 0;
  }
}

/** FNV-1a. Stable across engines; used to turn labels into seeds. */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
