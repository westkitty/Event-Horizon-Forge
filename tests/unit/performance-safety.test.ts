import { describe, expect, it } from 'vitest';

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
