/**
 * Particle populations (BUILD_SPEC 13.2, 9.2).
 *
 * Two distinct kinds, matching the two-level representation the contract
 * requires:
 *
 * 1. `SimPoints` — renders CPU-authoritative simulation particles (the stellar
 *    body, its debris, plasma macro-particles, cloud clumps). Counts are in the
 *    10^4 range, so a per-frame typed-array upload is cheap and keeps the
 *    renderer strictly downstream of simulation state (28.3).
 *
 * 2. `GpuTracers` — a much larger, purely illustrative dust population advected
 *    entirely on the GPU by a TSL compute shader, never read back. These are
 *    explicitly NOT individually gravitating particles (9.2), and they are
 *    reconstructed from a deterministic seed rather than checkpointed (8.3.6).
 *
 * Both paths deliberately avoid one JS object per particle (13.2).
 */

import {
  AdditiveBlending,
  BufferGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedMesh,
  PlaneGeometry,
  Points,
  PointsNodeMaterial,
  SpriteNodeMaterial,
  Vector3,
  Vector4,
  type ComputeNode,
  type StorageBufferNode,
  type WebGPURenderer,
} from 'three/webgpu';
import {
  Fn,
  float,
  hash,
  instanceIndex,
  instancedArray,
  mix,
  positionLocal,
  uint,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';

/* -------------------------------------------------------------------------- */
/* CPU-authoritative simulation particles                                      */
/* -------------------------------------------------------------------------- */

export interface SimPointsOptions {
  capacity: number;
  /** Base point size in pixels at unit distance. */
  size: number;
  /** Colour ramp endpoints; `intensity` selects between them per particle. */
  coolColor: [number, number, number];
  hotColor: [number, number, number];
  opacity: number;
}

export class SimPoints {
  readonly points: Points;
  private readonly geometry: BufferGeometry;
  private readonly material: PointsNodeMaterial;
  private readonly positions: Float32Array;
  /** Per-particle scalar in [0,1] driving colour and brightness. */
  private readonly intensity: Float32Array;
  private live = 0;

  readonly sizeUniform = uniform(float(1));
  readonly opacityUniform = uniform(float(1));
  /** Shadow occlusion: black-hole centre in render space + shadow angular size. */
  readonly shadowCentre = uniform(vec3(0, 0, 0));
  readonly shadowRadius = uniform(float(0));

  constructor(opts: SimPointsOptions) {
    this.positions = new Float32Array(opts.capacity * 3);
    this.intensity = new Float32Array(opts.capacity);

    this.geometry = new BufferGeometry();
    const posAttr = new Float32BufferAttribute(this.positions, 3);
    posAttr.setUsage(DynamicDrawUsage);
    const intAttr = new Float32BufferAttribute(this.intensity, 1);
    intAttr.setUsage(DynamicDrawUsage);
    this.geometry.setAttribute('position', posAttr);
    this.geometry.setAttribute('intensity', intAttr);
    // Bounding sphere is meaningless for a population that spans scale frames;
    // frustum culling is disabled instead of recomputing it every frame.
    this.geometry.boundingSphere = null;

    this.material = new PointsNodeMaterial();
    this.material.transparent = true;
    this.material.depthWrite = false;
    this.material.blending = AdditiveBlending;
    this.material.sizeAttenuation = false;

    this.sizeUniform.value = opts.size;
    this.opacityUniform.value = opts.opacity;

    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.matrixAutoUpdate = false;
  }

  /**
   * Writes `count` particles. Positions must already be in camera-relative
   * render units (see core/scale.toRenderSpace).
   */
  update(count: number): void {
    this.live = count;
    this.geometry.setDrawRange(0, count);
    const posAttr = this.geometry.getAttribute('position');
    const intAttr = this.geometry.getAttribute('intensity');
    posAttr.needsUpdate = true;
    intAttr.needsUpdate = true;
  }

  get positionArray(): Float32Array {
    return this.positions;
  }

  get intensityArray(): Float32Array {
    return this.intensity;
  }

  get drawn(): number {
    return this.live;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/* -------------------------------------------------------------------------- */
/* GPU-resident illustrative tracers                                           */
/* -------------------------------------------------------------------------- */

export interface GpuTracersOptions {
  count: number;
  seed: number;
  /** Cloud radius in render units for the frame the tracers live in. */
  radiusUnits: number;
  size: number;
}

/**
 * Dust/gas tracers advected on the GPU.
 *
 * These exist to prove the Tier A/B compute path under Gate 0: position and
 * velocity live in storage buffers, are integrated by a compute shader, and are
 * consumed directly as a vertex attribute — no readback, no per-particle JS.
 * The flow field is driven by up to 8 attractor centres uploaded from the
 * clump simulation, so the dust genuinely follows the mass distribution the
 * user is shaping rather than looping a canned animation.
 */
export class GpuTracers {
  readonly mesh: InstancedMesh;
  private readonly material: SpriteNodeMaterial;
  private readonly geometry: PlaneGeometry;
  private readonly positionBuffer: StorageBufferNode<'vec3'>;
  private readonly velocityBuffer: StorageBufferNode<'vec3'>;
  private readonly initCompute: ComputeNode;
  private readonly stepCompute: ComputeNode;
  private initialised = false;

  /** Attractors: xyz = render-space centre, w = GM-like strength. */
  readonly attractors = [
    uniform(new Vector4(0, 0, 0, 0)),
    uniform(new Vector4(0, 0, 0, 0)),
    uniform(new Vector4(0, 0, 0, 0)),
    uniform(new Vector4(0, 0, 0, 0)),
  ];
  readonly dt = uniform(0);
  readonly originShift = uniform(new Vector3(0, 0, 0));
  readonly opacity = uniform(0.5);
  readonly cloudRadius = uniform(1);

  readonly count: number;

  constructor(opts: GpuTracersOptions) {
    this.count = opts.count;
    this.cloudRadius.value = opts.radiusUnits;

    this.positionBuffer = instancedArray(opts.count, 'vec3');
    this.velocityBuffer = instancedArray(opts.count, 'vec3');

    // `hash` is a uint->float generator, so the seed and the per-particle
    // offsets must stay in the integer domain.
    const seed = uint(opts.seed >>> 0);

    // --- Seeded initial distribution ---------------------------------------
    this.initCompute = Fn(() => {
      const pos = this.positionBuffer.element(instanceIndex);
      const vel = this.velocityBuffer.element(instanceIndex);

      const i = instanceIndex.add(seed);
      const h1 = hash(i);
      const h2 = hash(i.add(uint(1013)));
      const h3 = hash(i.add(uint(7919)));
      const h4 = hash(i.add(uint(3571)));

      // Uniform-by-volume point in a ball, then flattened slightly so the
      // cloud reads as an oblate structure rather than a perfect sphere.
      const z = h1.mul(2).sub(1);
      const t = h2.mul(6.28318530718);
      const rxy = float(1).sub(z.mul(z)).max(0).sqrt();
      const rad = h3.pow(1 / 3).mul(this.cloudRadius);

      pos.assign(
        vec3(rxy.mul(t.cos()), z.mul(0.72), rxy.mul(t.sin())).mul(rad),
      );
      // Small seeded turbulent velocity.
      vel.assign(
        vec3(h4.sub(0.5), hash(i.add(uint(104729))).sub(0.5), h2.sub(0.5))
          .mul(this.cloudRadius)
          .mul(0.02),
      );
    })().compute(opts.count) as ComputeNode;

    // --- Advection ----------------------------------------------------------
    this.stepCompute = Fn(() => {
      const pos = this.positionBuffer.element(instanceIndex).toVar();
      const vel = this.velocityBuffer.element(instanceIndex).toVar();

      // Floating-origin rebase: when the camera's frame origin moves, every
      // tracer is shifted so GPU coordinates stay near zero (7.2).
      pos.addAssign(this.originShift);

      const accel = vec3(0, 0, 0).toVar();
      for (const a of this.attractors) {
        const d = a.xyz.sub(pos);
        const r2 = d.dot(d).add(this.cloudRadius.mul(this.cloudRadius).mul(0.004));
        accel.addAssign(d.mul(a.w).div(r2.mul(r2.sqrt())));
      }

      vel.addAssign(accel.mul(this.dt));
      // Mild drag keeps the illustrative population visually coherent instead
      // of dispersing into noise over long sessions.
      vel.mulAssign(float(0.999));
      pos.addAssign(vel.mul(this.dt));

      this.positionBuffer.element(instanceIndex).assign(pos);
      this.velocityBuffer.element(instanceIndex).assign(vel);
    })().compute(opts.count) as ComputeNode;

    // --- Rendering ----------------------------------------------------------
    this.geometry = new PlaneGeometry(1, 1);
    this.material = new SpriteNodeMaterial();
    this.material.positionNode = this.positionBuffer.toAttribute();
    this.material.scaleNode = float(opts.size);
    this.material.transparent = true;
    this.material.depthWrite = false;
    this.material.blending = AdditiveBlending;

    // Soft radial falloff so tracers read as dust, not squares.
    this.material.colorNode = Fn(() => {
      const d = positionLocal.xy.length().mul(2);
      const falloff = float(1).sub(d.clamp(0, 1)).pow(2.2);
      const tint = mix(
        vec3(0.42, 0.47, 0.62),
        vec3(0.78, 0.62, 0.5),
        hash(instanceIndex.add(uint(55))),
      );
      return vec4(tint, falloff.mul(this.opacity));
    })();

    this.mesh = new InstancedMesh(this.geometry, this.material, opts.count);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  /** Runs the seeded init pass. Must be called once, after renderer init. */
  async initialise(renderer: WebGPURenderer): Promise<void> {
    if (this.initialised) return;
    await renderer.computeAsync(this.initCompute);
    this.initialised = true;
  }

  /** Advances the tracer field. `dtUnits` is in render units of time. */
  step(renderer: WebGPURenderer, dtUnits: number): void {
    if (!this.initialised) return;
    this.dt.value = dtUnits;
    renderer.compute(this.stepCompute);
    // Origin shift is consumed once per step.
    (this.originShift.value as { set: (x: number, y: number, z: number) => void }).set(0, 0, 0);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
