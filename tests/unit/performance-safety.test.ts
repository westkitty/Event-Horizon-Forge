import { describe, expect, it } from 'vitest';

import { AdaptiveResolutionController } from '../../src/app/AdaptiveResolution';
import { Rng } from '../../src/core/rng';
import {
  TIER_BUDGETS,
  safePixelRatioForTier,
  type CapabilityTier,
} from '../../src/app/CapabilityProbe';
import { createWorld, CheckpointStore } from '../../src/simulation/world';
import { DEFAULT_WORLD_CONFIG, worldByteSize } from '../../src/simulation/state';
import { TimeController } from '../../src/simulation/time';

const TIERS: Array<Exclude<CapabilityTier, 'unsupported'>> = ['A', 'B', 'C'];

describe('crash-safety budgets', () => {
  it('hard-caps the physical framebuffer on HiDPI and large viewports', () => {
    const cases = [
      { width: 1512, height: 982, dpr: 2 },
      { width: 2560, height: 1440, dpr: 2 },
      { width: 3840, height: 2160, dpr: 1 },
    ];

    for (const tier of TIERS) {
      for (const sample of cases) {
        const ratio = safePixelRatioForTier(tier, sample.width, sample.height, sample.dpr);
        const physicalPixels = sample.width * sample.height * ratio * ratio;
        expect(physicalPixels).toBeLessThanOrEqual(TIER_BUDGETS[tier].maxPhysicalPixels + 1);
      }
    }
  });

  it('keeps expensive launch populations and geodesic work bounded', () => {
    expect(TIER_BUDGETS.A.lensSteps).toBeLessThanOrEqual(28);
    expect(TIER_BUDGETS.A.cloudTracers).toBeLessThanOrEqual(50_000);
    expect(TIER_BUDGETS.A.plasmaSprites).toBeLessThanOrEqual(3_072);
    expect(TIER_BUDGETS.A.bodyParticles).toBeLessThanOrEqual(6_144);

    expect(TIER_BUDGETS.B.lensSteps).toBeLessThan(TIER_BUDGETS.A.lensSteps);
    expect(TIER_BUDGETS.C.lensSteps).toBeLessThan(TIER_BUDGETS.B.lensSteps);
    expect(TIER_BUDGETS.C.cloudTracers).toBe(0);
  });

  it('caps retained checkpoint state by bytes, not only checkpoint count', () => {
    const world = createWorld({
      ...DEFAULT_WORLD_CONFIG,
      plasmaCount: 128,
      bodyCount: 256,
      cloudCount: 32,
    });
    const rng = new Rng(world.seed);
    const oneCheckpointBytes = worldByteSize(world);
    const byteCap = oneCheckpointBytes * 2 + 128;
    const store = new CheckpointStore(1, 100, byteCap);

    for (let tick = 0; tick < 5; tick++) {
      world.tick = tick;
      store.capture(world, rng);
    }

    expect(store.count).toBe(2);
    expect(store.retainedBytes).toBeLessThanOrEqual(byteCap);
    expect(store.earliestTick()).toBe(3);
    expect(store.nearestBefore(4)?.tick).toBe(4);
  });

  it('limits stalled-frame catch-up without collapsing healthy fast-forward', () => {
    const normal = new TimeController();
    expect(normal.advance(0.25)).toBe(4);

    const fast = new TimeController();
    fast.rate = 8;
    // At 60 FPS rate 8 requests 16 ticks/frame, so the safety cap still allows
    // the intended fast-forward throughput on a healthy renderer.
    expect(fast.advance(0.25)).toBe(16);
  });
});

describe('adaptive framebuffer quality', () => {
  it('drops immediately on critical throughput and never below its safety floor', () => {
    const q = new AdaptiveResolutionController(1, 1, { recoverSamples: 2 });
    const first = q.sample(10);
    expect(first.changed).toBe(true);
    expect(first.reason).toBe('critical');
    expect(q.ratio).toBeLessThan(1);

    for (let i = 0; i < 20; i++) q.sample(5);
    expect(q.ratio).toBeGreaterThanOrEqual(q.floorRatio);
    expect(q.ratio).toBeCloseTo(q.floorRatio, 8);
  });

  it('requires sustained slow samples before a normal downgrade', () => {
    const q = new AdaptiveResolutionController(0.8);
    expect(q.sample(24).changed).toBe(false);
    const second = q.sample(24);
    expect(second.changed).toBe(true);
    expect(second.reason).toBe('sustained-slow');
    expect(q.ratio).toBeLessThan(0.8);
  });

  it('recovers cautiously but can never exceed the hard crash-safe ceiling', () => {
    const q = new AdaptiveResolutionController(0.8, 0.5, { recoverSamples: 2, upscaleFactor: 1.5 });
    expect(q.sample(60).changed).toBe(false);
    expect(q.sample(60).reason).toBe('recovery');
    expect(q.ratio).toBeGreaterThan(0.5);

    for (let i = 0; i < 20; i++) q.sample(60);
    expect(q.ratio).toBeLessThanOrEqual(0.8);
    expect(q.ratio).toBeCloseTo(0.8, 8);
  });

  it('clamps immediately when a resize lowers the hard ceiling but does not auto-upscale when it rises', () => {
    const q = new AdaptiveResolutionController(1, 0.7);
    const lower = q.updateCeiling(0.5);
    expect(lower.changed).toBe(true);
    expect(q.ratio).toBe(0.5);

    const higher = q.updateCeiling(1.5);
    expect(higher.changed).toBe(false);
    expect(q.ratio).toBe(0.5);
    expect(q.ceilingRatio).toBe(1.5);
  });
});
