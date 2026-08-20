/**
 * Slow adaptive quality controller for the full-screen lens framebuffer.
 *
 * The crash-safe tier pixel limit remains the hard ceiling. This controller can
 * only move downward from that ceiling when sustained rendered frame throughput
 * says the current machine is struggling, then recover cautiously after a long
 * stable period. It never owns a frame loop; main.ts samples it from a low-rate
 * timer using App's existing rendered-frame counter.
 */

export type ResolutionChangeReason = 'critical' | 'sustained-slow' | 'recovery' | 'ceiling-change' | 'none';

export interface ResolutionDecision {
  ratio: number;
  changed: boolean;
  reason: ResolutionChangeReason;
}

export interface AdaptiveResolutionOptions {
  /** FPS below this triggers an immediate large reduction. */
  criticalFps: number;
  /** FPS below this accumulates a slow-sample downgrade. */
  slowFps: number;
  /** FPS at/above this accumulates cautious recovery credit. */
  recoverFps: number;
  /** Consecutive slow samples required before reducing. */
  slowSamples: number;
  /** Consecutive fast samples required before increasing. */
  recoverSamples: number;
  /** Ratio multiplier for a normal downgrade. */
  downscaleFactor: number;
  /** Ratio multiplier for a critical downgrade. */
  criticalFactor: number;
  /** Ratio multiplier for a recovery step. */
  upscaleFactor: number;
  /** Minimum fraction of the current hard ceiling. */
  floorFraction: number;
  /** Absolute lower bound, even if a very large viewport produces a tiny ceiling. */
  absoluteFloor: number;
}

const DEFAULTS: AdaptiveResolutionOptions = {
  criticalFps: 18,
  slowFps: 28,
  recoverFps: 52,
  slowSamples: 2,
  recoverSamples: 10,
  downscaleFactor: 0.82,
  criticalFactor: 0.7,
  upscaleFactor: 1.06,
  floorFraction: 0.55,
  absoluteFloor: 0.2,
};

export class AdaptiveResolutionController {
  private ceiling: number;
  private floorBasis: number;
  private current: number;
  private slowCount = 0;
  private fastCount = 0;
  private readonly opts: AdaptiveResolutionOptions;

  constructor(ceilingRatio: number, initialRatio = ceilingRatio, options: Partial<AdaptiveResolutionOptions> = {}) {
    this.opts = { ...DEFAULTS, ...options };
    this.ceiling = sanitiseRatio(ceilingRatio);
    this.floorBasis = this.ceiling;
    this.current = clamp(initialRatio, this.floor, this.ceiling);
  }

  get ratio(): number {
    return this.current;
  }

  get ceilingRatio(): number {
    return this.ceiling;
  }

  get floorRatio(): number {
    return this.floor;
  }

  /**
   * Applies a new crash-safe hard ceiling, normally after viewport/DPR change.
   * A larger ceiling never raises quality automatically: recovery still has to
   * earn that through sustained healthy frame throughput.
   */
  updateCeiling(nextCeiling: number): ResolutionDecision {
    const before = this.current;
    this.ceiling = sanitiseRatio(nextCeiling);
    // Never raise the adaptive floor just because a smaller viewport permits a
    // larger hard ceiling. Quality recovery must still be earned by frame data.
    this.floorBasis = Math.min(this.floorBasis, this.ceiling);
    this.current = Math.min(this.current, this.ceiling);
    this.slowCount = 0;
    this.fastCount = 0;
    return decision(this.current, this.current !== before, 'ceiling-change');
  }

  /** Observe one low-rate rendered-FPS sample. */
  sample(fps: number): ResolutionDecision {
    if (!Number.isFinite(fps) || fps <= 0) return decision(this.current, false, 'none');

    if (fps < this.opts.criticalFps) {
      this.slowCount = 0;
      this.fastCount = 0;
      return this.reduce(this.opts.criticalFactor, 'critical');
    }

    if (fps < this.opts.slowFps) {
      this.fastCount = 0;
      this.slowCount++;
      if (this.slowCount >= this.opts.slowSamples) {
        this.slowCount = 0;
        return this.reduce(this.opts.downscaleFactor, 'sustained-slow');
      }
      return decision(this.current, false, 'none');
    }

    if (fps >= this.opts.recoverFps) {
      this.slowCount = 0;
      this.fastCount++;
      if (this.fastCount >= this.opts.recoverSamples) {
        this.fastCount = 0;
        const next = Math.min(this.ceiling, this.current * this.opts.upscaleFactor);
        const changed = next > this.current + 1e-6;
        this.current = next;
        return decision(this.current, changed, changed ? 'recovery' : 'none');
      }
      return decision(this.current, false, 'none');
    }

    // Neutral band: neither punish one mediocre sample nor keep stale recovery
    // credit that could cause an upscale while the machine is only marginal.
    this.slowCount = 0;
    this.fastCount = 0;
    return decision(this.current, false, 'none');
  }

  private reduce(factor: number, reason: 'critical' | 'sustained-slow'): ResolutionDecision {
    const next = Math.max(this.floor, this.current * factor);
    const changed = next < this.current - 1e-6;
    this.current = next;
    return decision(this.current, changed, changed ? reason : 'none');
  }

  private get floor(): number {
    return Math.min(
      this.ceiling,
      Math.max(this.opts.absoluteFloor, this.floorBasis * this.opts.floorFraction),
    );
  }
}

function sanitiseRatio(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0.05, value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, sanitiseRatio(value)));
}

function decision(ratio: number, changed: boolean, reason: ResolutionChangeReason): ResolutionDecision {
  return { ratio, changed, reason };
}
