/**
 * Capability detection and crash-safe quality selection (BUILD_SPEC 29.4, 32, 33).
 *
 * WebGPU feature presence tells us which renderer path is available; it does not
 * prove that an arbitrary visual workload is safe. Quality budgets therefore
 * stay deliberately conservative until real frame-time evidence promotes them.
 */

export type CapabilityTier = 'A' | 'B' | 'C' | 'unsupported';

export interface Capabilities {
  tier: CapabilityTier;
  webgpu: boolean;
  webgl2: boolean;
  /** True only when compute shaders are genuinely available. */
  compute: boolean;
  storage3D: boolean;
  maxStorageBufferBytes: number;
  maxComputeInvocations: number;
  maxTextureSize: number;
  adapterLabel: string;
  isSecureContext: boolean;
  deviceMemoryGb: number | null;
  hardwareConcurrency: number;
  /** Human-readable reason, shown only in Science/Settings, never on canvas. */
  notes: string[];
}

/** Minimum storage-buffer size for the Tier A particle populations. */
const MIN_STORAGE_BYTES = 64 * 1024 * 1024;

export async function probeCapabilities(): Promise<Capabilities> {
  const notes: string[] = [];
  const isSecureContext = globalThis.isSecureContext === true;
  const nav = navigator as Navigator & {
    gpu?: GPU;
    deviceMemory?: number;
  };

  const webgl2 = detectWebGL2();
  let maxTextureSize = webgl2.maxTextureSize;

  // WebGPU requires a secure context. localhost counts as secure, so dev works.
  if (!isSecureContext) {
    notes.push('Not a secure context; WebGPU is unavailable outside HTTPS/localhost.');
  }

  let webgpu = false;
  let compute = false;
  let storage3D = false;
  let maxStorageBufferBytes = 0;
  let maxComputeInvocations = 0;
  let adapterLabel = '';

  if (isSecureContext && nav.gpu) {
    try {
      const adapter = await nav.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (adapter) {
        webgpu = true;
        adapterLabel = describeAdapter(adapter);
        const limits = adapter.limits;
        maxStorageBufferBytes = Number(limits.maxStorageBufferBindingSize ?? 0);
        maxComputeInvocations = Number(limits.maxComputeInvocationsPerWorkgroup ?? 0);
        maxTextureSize = Math.max(maxTextureSize, Number(limits.maxTextureDimension2D ?? 0));

        // Compute is core to WebGPU, but the limits still have to be usable.
        compute = maxComputeInvocations >= 64 && maxStorageBufferBytes > 0;
        storage3D = Number(limits.maxTextureDimension3D ?? 0) >= 128;

        if (!compute) notes.push('WebGPU adapter reports unusable compute limits.');
        if (!storage3D) notes.push('3D storage textures unavailable; volumetric path disabled.');
        if (maxStorageBufferBytes < MIN_STORAGE_BYTES) {
          notes.push(
            `Storage buffer limit ${(maxStorageBufferBytes / 1048576) | 0} MB is below the ` +
              `${MIN_STORAGE_BYTES / 1048576} MB Tier A target; particle counts reduced.`,
          );
        }
      } else {
        notes.push('navigator.gpu present but no adapter was returned.');
      }
    } catch (err) {
      notes.push(`WebGPU adapter request failed: ${(err as Error).message}`);
    }
  } else if (!nav.gpu) {
    notes.push('navigator.gpu is not present in this browser.');
  }

  const tier = selectTier({ webgpu, webgl2: webgl2.ok, compute, storage3D, maxStorageBufferBytes });
  if (tier === 'C') notes.push('Running the WebGL 2 path: no compute, reduced particle counts.');
  if (tier === 'unsupported') notes.push('Neither WebGPU nor WebGL 2 is available.');
  if (tier !== 'unsupported') {
    notes.push(
      `Crash-safe rendering cap: ${(MAX_PHYSICAL_PIXELS[tier] / 1_000_000).toFixed(2)} megapixels.`,
    );
  }

  return {
    tier,
    webgpu,
    webgl2: webgl2.ok,
    compute,
    storage3D,
    maxStorageBufferBytes,
    maxComputeInvocations,
    maxTextureSize,
    adapterLabel,
    isSecureContext,
    deviceMemoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 4,
    notes,
  };
}

export function selectTier(c: {
  webgpu: boolean;
  webgl2: boolean;
  compute: boolean;
  storage3D: boolean;
  maxStorageBufferBytes: number;
}): CapabilityTier {
  if (c.webgpu && c.compute && c.storage3D && c.maxStorageBufferBytes >= MIN_STORAGE_BYTES) {
    return 'A';
  }
  if (c.webgpu && c.compute) return 'B';
  if (c.webgl2) return 'C';
  return 'unsupported';
}

function describeAdapter(adapter: GPUAdapter): string {
  const withInfo = adapter as GPUAdapter & { info?: GPUAdapterInfo };
  const info = withInfo.info;
  if (!info) return 'unknown adapter';
  return [info.vendor, info.architecture, info.device, info.description]
    .filter(Boolean)
    .join(' / ') || 'unknown adapter';
}

function detectWebGL2(): { ok: boolean; maxTextureSize: number } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return { ok: false, maxTextureSize: 0 };
    const size = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    // Release the context immediately; probing must not hold a GPU context open.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { ok: true, maxTextureSize: size };
  } catch {
    return { ok: false, maxTextureSize: 0 };
  }
}

/** Per-tier population budgets. These are safety defaults, not measured maxima. */
export interface QualityBudget {
  cloudTracers: number;
  plasmaSprites: number;
  bodyParticles: number;
  fieldLines: number;
  fieldLineSteps: number;
  /** Geodesic integration steps in the lensing shader — the dominant pixel cost. */
  lensSteps: number;
  starfieldCubeSize: number;
  /** Multiplier consumed by App's existing DPR calculation. */
  renderScale: number;
  /** Hard startup/resizing target for the physical drawing buffer. */
  maxPhysicalPixels: number;
  bloom: boolean;
}

const MAX_PHYSICAL_PIXELS: Record<Exclude<CapabilityTier, 'unsupported'>, number> = {
  A: 650_000,
  B: 450_000,
  C: 300_000,
};

/**
 * Returns a device-pixel ratio that cannot exceed the tier's physical pixel
 * budget for the supplied viewport. This keeps a Retina/HiDPI display from
 * multiplying an already-expensive full-screen geodesic shader by four.
 */
export function safePixelRatioForTier(
  tier: Exclude<CapabilityTier, 'unsupported'>,
  width = typeof innerWidth === 'number' ? innerWidth : 1920,
  height = typeof innerHeight === 'number' ? innerHeight : 1080,
  dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1,
): number {
  const cssPixels = Math.max(1, width) * Math.max(1, height);
  const requested = Math.max(0.1, Math.min(2, Number.isFinite(dpr) ? dpr : 1));
  const pixelBound = Math.sqrt(MAX_PHYSICAL_PIXELS[tier] / cssPixels);
  return Math.min(requested, pixelBound);
}

/** App multiplies min(DPR, 2) by renderScale, so convert the hard pixel-ratio
 * target back into the scale it already expects. */
function initialRenderScale(tier: Exclude<CapabilityTier, 'unsupported'>): number {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const clampedDpr = Math.max(0.1, Math.min(2, Number.isFinite(dpr) ? dpr : 1));
  return safePixelRatioForTier(tier) / clampedDpr;
}

export const TIER_BUDGETS: Record<Exclude<CapabilityTier, 'unsupported'>, QualityBudget> = {
  A: {
    cloudTracers: 50_000,
    plasmaSprites: 3_072,
    bodyParticles: 6_144,
    fieldLines: 20,
    fieldLineSteps: 120,
    lensSteps: 28,
    starfieldCubeSize: 768,
    get renderScale() { return initialRenderScale('A'); },
    maxPhysicalPixels: MAX_PHYSICAL_PIXELS.A,
    bloom: false,
  },
  B: {
    cloudTracers: 25_000,
    plasmaSprites: 2_048,
    bodyParticles: 4_096,
    fieldLines: 16,
    fieldLineSteps: 96,
    lensSteps: 20,
    starfieldCubeSize: 640,
    get renderScale() { return initialRenderScale('B'); },
    maxPhysicalPixels: MAX_PHYSICAL_PIXELS.B,
    bloom: false,
  },
  C: {
    // App deliberately skips compute tracers on Tier C.
    cloudTracers: 0,
    plasmaSprites: 1_536,
    bodyParticles: 3_072,
    fieldLines: 10,
    fieldLineSteps: 64,
    lensSteps: 14,
    starfieldCubeSize: 512,
    get renderScale() { return initialRenderScale('C'); },
    maxPhysicalPixels: MAX_PHYSICAL_PIXELS.C,
    bloom: false,
  },
};
