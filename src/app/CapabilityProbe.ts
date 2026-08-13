/**
 * Capability detection and tier selection (BUILD_SPEC 33).
 *
 * The contract is explicit that WebGPU compute must not be assumed to fall back
 * to WebGL 2 (13.1, 33, and the prohibited-shortcut "claiming WebGL fallback for
 * compute-only features that were never implemented there"). So this probe does
 * not merely ask "is WebGPU present" — it reads the adapter's actual limits and
 * feature set, and the tier it returns is what the quality manager and the
 * renderers branch on.
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

/** Per-tier population budgets (BUILD_SPEC 29.4). Measured, then tuned. */
export interface QualityBudget {
  cloudTracers: number;
  plasmaSprites: number;
  bodyParticles: number;
  fieldLines: number;
  fieldLineSteps: number;
  /** Geodesic integration steps in the lensing shader — the dominant cost. */
  lensSteps: number;
  starfieldCubeSize: number;
  renderScale: number;
  bloom: boolean;
}

export const TIER_BUDGETS: Record<Exclude<CapabilityTier, 'unsupported'>, QualityBudget> = {
  A: {
    cloudTracers: 240_000,
    plasmaSprites: 12_288,
    bodyParticles: 24_576,
    fieldLines: 48,
    fieldLineSteps: 320,
    lensSteps: 160,
    starfieldCubeSize: 1024,
    renderScale: 1,
    bloom: true,
  },
  B: {
    cloudTracers: 120_000,
    plasmaSprites: 8_192,
    bodyParticles: 16_384,
    fieldLines: 32,
    fieldLineSteps: 220,
    lensSteps: 110,
    starfieldCubeSize: 768,
    renderScale: 0.85,
    bloom: true,
  },
  C: {
    cloudTracers: 48_000,
    plasmaSprites: 4_096,
    bodyParticles: 8_192,
    fieldLines: 20,
    fieldLineSteps: 140,
    lensSteps: 64,
    starfieldCubeSize: 512,
    renderScale: 0.75,
    bloom: false,
  },
};
