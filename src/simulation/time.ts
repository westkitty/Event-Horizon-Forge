/**
 * Universal timeline over multiple physical regimes (BUILD_SPEC 8.1, 8.2).
 *
 * One tick counter drives everything, but each domain converts a tick into its
 * own physical timestep. This is a deliberate design response to the fact that
 * a plasma gyro-period and a molecular-cloud free-fall time differ by ~18 orders
 * of magnitude: pretending one dt covers both would either make the plasma
 * explode or make formation take geological wall-clock time.
 *
 * The per-domain factors below are physical statements, not cosmetic knobs, and
 * are surfaced in Science peek so the user is never misled into reading the
 * scene as a single synchronised clock.
 */

export type Regime = 'relativistic' | 'plasma' | 'formation';

/**
 * Seconds of that domain's own physical time per universal tick.
 *
 * - relativistic: 20 s. The stellar body's internal dynamical time is ~1.6e3 s
 *   and the periapsis orbital time ~1e4 s, so 20 s resolves both (~80 steps per
 *   internal dynamical time) while still advancing an encounter at a watchable
 *   pace.
 * - plasma: 0.002 s. Chosen against the gyro-period at the chamber's operating
 *   field (~0.12 s), giving omega*dt ~ 0.1 — well inside the Boris pusher's
 *   accurate range, so the population neither heats nor cools numerically.
 * - formation: 3.15e8 s (~10 yr). The cloud's free-fall time is ~2.2e4 yr, so
 *   collapse resolves over ~2000 ticks. This is explicitly accelerated
 *   integration across a real physical process, disclosed as such.
 */
export const DOMAIN_SECONDS_PER_TICK: Record<Regime, number> = {
  relativistic: 20,
  plasma: 0.002,
  formation: 3.15e8,
};

export type PlaybackRate =
  | 0
  | 0.05
  | 0.25
  | 1
  | 2
  | 4
  | 8;

export const RATE_LADDER: readonly PlaybackRate[] = [0, 0.05, 0.25, 1, 2, 4, 8];

export class TimeController {
  /** Integer universal tick. The single authority for "when". */
  tick = 0;
  /** Relativistic-domain seconds elapsed; the timeline the user perceives. */
  scenarioTime = 0;
  paused = false;
  rate: PlaybackRate = 1;

  /** Ticks consumed per real second at rate 1. Drives the wall-clock pace. */
  readonly ticksPerSecond = 120;

  private accumulator = 0;
  /**
   * Default playback may catch up only far enough to preserve 120 ticks/s at
   * 30 FPS. Intentional fast-forward gets the ticks it needs at a healthy 60
   * FPS, but a stalled frame still cannot accumulate an arbitrarily large burst.
   */
  private maxTicksForCurrentRate(): number {
    return Math.max(4, Math.ceil(2 * this.rate));
  }

  /**
   * Converts elapsed real time into whole ticks. Returns how many to step.
   * Fractional remainder is carried, so playback speed is frame-rate
   * independent and replay at a different frame rate lands on the same ticks.
   */
  advance(realDeltaSeconds: number): number {
    if (this.paused || this.rate === 0) return 0;
    const clamped = Math.min(realDeltaSeconds, 0.25);
    this.accumulator += clamped * this.ticksPerSecond * this.rate;
    let steps = Math.floor(this.accumulator);
    if (steps <= 0) return 0;
    const maxTicksPerFrame = this.maxTicksForCurrentRate();
    if (steps > maxTicksPerFrame) {
      // Drop the backlog rather than trying to catch up; catching up would make
      // input/render recovery harder and would not match a replay of wall time.
      steps = maxTicksPerFrame;
      this.accumulator = 0;
    } else {
      this.accumulator -= steps;
    }
    return steps;
  }

  onTicked(count: number): void {
    this.tick += count;
    this.scenarioTime += count * DOMAIN_SECONDS_PER_TICK.relativistic;
  }

  seekTo(tick: number): void {
    this.tick = tick;
    this.scenarioTime = tick * DOMAIN_SECONDS_PER_TICK.relativistic;
    this.accumulator = 0;
  }

  togglePause(): void {
    this.paused = !this.paused;
    this.accumulator = 0;
  }

  /** Steps the rate along the ladder; used by the Time Lens wheel gesture. */
  nudgeRate(direction: 1 | -1): PlaybackRate {
    const idx = RATE_LADDER.indexOf(this.rate);
    const next = Math.min(RATE_LADDER.length - 1, Math.max(0, idx + direction));
    this.rate = RATE_LADDER[next];
    return this.rate;
  }

  /** Non-numeric descriptor for the transient Time Lens cue (25.9, 24.1). */
  rateGlyph(): string {
    if (this.paused || this.rate === 0) return 'paused';
    if (this.rate < 1) return 'slow';
    if (this.rate === 1) return 'normal';
    return 'fast';
  }
}

/** Formats scenario time for the Inspector only — never for immersive mode. */
export function formatScenarioTime(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < 90) return `${seconds.toFixed(1)} s`;
  if (abs < 5400) return `${(seconds / 60).toFixed(1)} min`;
  if (abs < 172800) return `${(seconds / 3600).toFixed(2)} h`;
  return `${(seconds / 86400).toFixed(2)} d`;
}
