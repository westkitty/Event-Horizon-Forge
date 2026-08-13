/**
 * Application shell: assembles simulation, rendering and interaction into the
 * single Gate 0 scene required by BUILD_SPEC 39.1.
 *
 * The frame order is deliberate and matches 28.3's separation of concerns:
 *
 *   input -> time -> simulation step -> derive render buffers -> draw
 *
 * Rendering never writes simulation state. Every renderer receives positions
 * that were converted to camera-relative render units by the camera controller,
 * so the floating origin is applied in exactly one place.
 */

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Line,
  LinearFilter,
  LineBasicNodeMaterial,
  RGBAFormat,
  RenderTarget,
  Scene,
  UnsignedByteType,
  Vector3,
  WebGPURenderer,
} from 'three/webgpu';
import { Fn, float, uniform, vec3, vec4 } from 'three/tsl';

import { probeCapabilities, TIER_BUDGETS, type Capabilities, type QualityBudget } from './CapabilityProbe';
import { Rng } from '../core/rng';
import { ASTRO, gravitationalRadius } from '../core/scale';
import { CameraController } from '../interaction/CameraController';
import { InputRouter, type GestureTarget, type PeekKey } from '../interaction/InputRouter';
import { Overlay } from '../ui/Overlay';
import { buildStarfield } from '../render/Starfield';
import { createBlackHoleLens, kerrIscoRg, type BlackHoleLens } from '../render/BlackHoleLens';
import { FieldLines } from '../render/FieldLines';
import { GpuTracers, SimPoints } from '../render/Particles';
import { BranchManager } from '../simulation/branches';
import { classifyRegime, meanSpeed } from '../simulation/plasma';
import { centroid, totalAngularMomentum } from '../simulation/cloud';
import { centreOfMass } from '../simulation/body';
import { integratePreview, predictEncounter } from '../simulation/gravity';
import {
  DEFAULT_WORLD_CONFIG,
  blackHoleRadii,
  tidalRadius,
  type Vec3,
  type WorldState,
} from '../simulation/state';
import { DOMAIN_SECONDS_PER_TICK, TimeController, formatScenarioTime } from '../simulation/time';
import { LAYOUT, createWorld } from '../simulation/world';

export interface AppOptions {
  canvas: HTMLCanvasElement;
  overlayRoot: HTMLElement;
  onBootProgress: (fraction: number, note: string) => void;
  debug: boolean;
}

interface PerfSample {
  frameMs: number;
  simMs: number;
  syncMs: number;
}

/** Active manipulation, if any. Only one can be live at a time (24.8). */
type Manipulation =
  | { kind: 'none' }
  | { kind: 'cloud'; brush: 'gather' | 'disperse' | 'spin' | 'energize'; radius: number; strength: number }
  | { kind: 'fieldNode'; id: string; depth: number }
  | { kind: 'body'; depth: number; lastPos: Vec3; velocity: Vec3 };

export class App {
  private renderer!: WebGPURenderer;
  private scene = new Scene();
  private camera!: CameraController;
  private overlay: Overlay;
  private input!: InputRouter;

  private caps!: Capabilities;
  private budget!: QualityBudget;

  private branches!: BranchManager;
  private time = new TimeController();
  private rng = new Rng(DEFAULT_WORLD_CONFIG.seed);

  private lens!: BlackHoleLens;
  private fieldLines!: FieldLines;
  private tracers: GpuTracers | null = null;
  private bodyPoints!: SimPoints;
  private plasmaPoints!: SimPoints;
  private clumpPoints!: SimPoints;
  private ghostPoints!: SimPoints;
  private trajectory!: TrajectoryPreview;

  private manipulation: Manipulation = { kind: 'none' };
  private selection: GestureTarget = { kind: 'empty' };
  private activePeeks = new Set<PeekKey>();
  private directorEnabled = false;
  private compareBlend = 0;
  private lastPointerAt = 0;
  private pointerX = 0;
  private pointerY = 0;

  private captureTarget: RenderTarget | null = null;
  private running = false;
  private disposed = false;
  private lastFrameTime = 0;
  private fieldDirty = true;
  private framesSinceFieldTrace = 0;

  readonly perf: PerfSample[] = [];
  private frameCount = 0;

  constructor(private readonly opts: AppOptions) {
    this.overlay = new Overlay(opts.overlayRoot);
  }

  /* ---------------------------------------------------------------------- */
  /* Boot                                                                    */
  /* ---------------------------------------------------------------------- */

  async init(): Promise<void> {
    const { onBootProgress } = this.opts;

    onBootProgress(0.05, 'Probing device capability');
    this.caps = await probeCapabilities();
    if (this.caps.tier === 'unsupported') {
      this.overlay.showBlockingError(
        'This device cannot run Event Horizon Forge',
        'Neither WebGPU nor WebGL 2 is available. A recent desktop version of ' +
          'Chrome, Edge, Firefox or Safari over HTTPS (or localhost) is required.',
      );
      throw new Error('unsupported device');
    }
    this.budget = { ...TIER_BUDGETS[this.caps.tier] };

    onBootProgress(0.15, 'Initialising renderer');
    this.renderer = new WebGPURenderer({
      canvas: this.opts.canvas,
      antialias: true,
      // Tier C explicitly asks for the WebGL 2 backend instead of silently
      // hoping compute degrades (33, 53).
      forceWebGL: this.caps.tier === 'C',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * this.budget.renderScale);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.setClearColor(new Color(0x000000), 1);
    await this.renderer.init();

    this.camera = new CameraController(innerWidth / innerHeight);
    this.camera.reducedMotion = this.overlay.prefs.reducedMotion;

    onBootProgress(0.3, 'Building star catalogue');
    const sky = await buildStarfield({
      size: this.budget.starfieldCubeSize,
      seed: DEFAULT_WORLD_CONFIG.seed,
      starCount: this.caps.tier === 'C' ? 26_000 : 52_000,
      onProgress: (f) => onBootProgress(0.3 + f * 0.3, 'Building star catalogue'),
    });

    onBootProgress(0.62, 'Compiling lensing shader');
    this.lens = createBlackHoleLens(sky.texture, this.budget.lensSteps);
    this.scene.add(this.lens.mesh);

    onBootProgress(0.72, 'Creating simulation');
    const world = createWorld({
      ...DEFAULT_WORLD_CONFIG,
      bodyCount: this.budget.bodyParticles,
      plasmaCount: this.budget.plasmaSprites,
    });
    this.branches = new BranchManager(world, DEFAULT_WORLD_CONFIG.seed);
    this.camera.setGravitationalRadius(gravitationalRadius(world.bh.massKg));

    onBootProgress(0.8, 'Allocating particle systems');
    this.buildRenderables();

    if (this.caps.tier !== 'C') {
      onBootProgress(0.88, 'Seeding GPU tracers');
      this.tracers = new GpuTracers({
        count: this.budget.cloudTracers,
        seed: world.cloud.tracerSeed,
        radiusUnits: 1,
        size: 0.9,
      });
      this.scene.add(this.tracers.mesh);
      await this.tracers.initialise(this.renderer);
    }

    onBootProgress(0.94, 'Binding controls');
    this.bindInput();
    this.frameCamera(world);

    addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onDeviceLost);

    onBootProgress(1, 'Ready');
  }

  private buildRenderables(): void {
    this.bodyPoints = new SimPoints({
      capacity: this.budget.bodyParticles,
      size: 1.7,
      coolColor: [1, 0.55, 0.25],
      hotColor: [1, 0.95, 0.85],
      opacity: 0.9,
    });
    this.plasmaPoints = new SimPoints({
      capacity: this.budget.plasmaSprites,
      size: 1.5,
      coolColor: [0.3, 0.6, 1],
      hotColor: [0.9, 0.96, 1],
      opacity: 0.75,
    });
    this.clumpPoints = new SimPoints({
      capacity: DEFAULT_WORLD_CONFIG.cloudCount,
      size: 3.2,
      coolColor: [0.4, 0.45, 0.6],
      hotColor: [0.95, 0.8, 0.6],
      opacity: 0.85,
    });
    // Branch Ghost: the comparison branch rendered spectrally in the SAME space
    // rather than in a split screen (25.10).
    this.ghostPoints = new SimPoints({
      capacity: this.budget.bodyParticles,
      size: 1.6,
      coolColor: [0.45, 0.85, 0.95],
      hotColor: [0.75, 0.95, 1],
      opacity: 0.5,
    });
    this.ghostPoints.points.visible = false;

    this.fieldLines = new FieldLines({
      maxLines: this.budget.fieldLines,
      maxSteps: this.budget.fieldLineSteps,
    });
    this.trajectory = new TrajectoryPreview(512);

    this.scene.add(
      this.bodyPoints.points,
      this.plasmaPoints.points,
      this.clumpPoints.points,
      this.ghostPoints.points,
      this.fieldLines.lines,
      this.trajectory.line,
    );
  }

  private frameCamera(world: WorldState): void {
    // Open on the black hole at an angle that shows disk warping immediately —
    // no title screen, straight into a living scene (2.13).
    const { rg } = blackHoleRadii(world.bh);
    this.camera.target = [...world.bh.position] as Vec3;
    this.camera.distance = rg * 90;
    this.camera.yaw = 0.9;
    this.camera.pitch = 0.22;
    this.camera.update(0.016);
  }

  /* ---------------------------------------------------------------------- */
  /* Frame loop                                                              */
  /* ---------------------------------------------------------------------- */

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.renderer.setAnimationLoop(this.frame);
  }

  stop(): void {
    this.running = false;
    this.renderer?.setAnimationLoop(null);
  }

  /**
   * Renders exactly `count` frames synchronously, with a fixed simulated
   * wall-clock delta.
   *
   * Test seam only. Headless Chromium throttles requestAnimationFrame when it
   * is not compositing, so an E2E suite that relied on the normal animation
   * loop would observe a frozen simulation. Driving frames explicitly also
   * makes the browser tests deterministic. Frame timings collected this way are
   * NOT valid performance evidence — see playwright.config.ts.
   */
  stepFramesForTest(count: number, dtSeconds = 1 / 60): void {
    for (let i = 0; i < count; i++) {
      this.lastFrameTime = performance.now() - dtSeconds * 1000;
      this.frame();
    }
  }

  /**
   * Advances the simulation only — no rendering.
   *
   * Test seam. Rendering many frames synchronously (outside requestAnimationFrame)
   * exhausts the WebGPU device: three recycles per-frame GPU allocations on the
   * animation-loop boundary, and driving render() in a tight loop never reaches
   * it, so the page dies after roughly 50 frames. Assertions about time, rewind
   * and branching are simulation-level and do not need any frames at all, so
   * they use this instead.
   */
  stepSimForTest(ticks: number): void {
    if (ticks <= 0) return;
    this.branches.step(ticks);
    this.time.onTicked(ticks);
  }

  /**
   * Renders one frame into an offscreen target and reads the pixels back.
   *
   * Test seam intended for visual QA and the visual-regression bookmarks (41.4).
   *
   * WARNING - NOT CURRENTLY TRUSTWORTHY. In headless Chromium on this machine
   * every readback comes back as 0xFF regardless of what was rendered: with the
   * lens hidden and the clear colour set to 0x8040c0 this still returns
   * (255,255,255,255). Playwright's own screenshot and canvas.toDataURL() are
   * equally unusable there (no compositing of the WebGPU swap chain). Treat a
   * uniform-white result as "capture unavailable", NOT as evidence about the
   * rendered image. Visual verification currently requires a human running the
   * app in a real browser window.
   */
  async captureFrameForTest(widthRequest = 640, height = 400): Promise<Uint8Array> {
    // WebGPU requires the readback bytesPerRow to be a multiple of 256. With
    // RGBA8 that means the width must be a multiple of 64; anything else kills
    // the renderer process with no JS-visible error (an 800px capture crashes
    // the tab outright). Snap rather than fail.
    const width = Math.max(64, Math.round(widthRequest / 64) * 64);
    // One reusable target: allocating and disposing a render target per capture
    // destabilises the WebGPU device.
    if (!this.captureTarget) {
      this.captureTarget = new RenderTarget(width, height, {
        format: RGBAFormat,
        type: UnsignedByteType,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: true,
      });
    } else if (this.captureTarget.width !== width || this.captureTarget.height !== height) {
      this.captureTarget.setSize(width, height);
    }
    const rt = this.captureTarget;
    const prevAspect = this.camera.camera.aspect;
    this.camera.setAspect(width / height);

    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.scene, this.camera.camera);
    this.renderer.setRenderTarget(null);

    const pixels = (await this.renderer.readRenderTargetPixelsAsync(
      rt,
      0,
      0,
      width,
      height,
    )) as Uint8Array;

    this.camera.setAspect(prevAspect);
    return pixels;
  }

  get rendererRef(): WebGPURenderer {
    return this.renderer;
  }

  get cameraRef(): CameraController {
    return this.camera;
  }

  get lensRef(): BlackHoleLens {
    return this.lens;
  }

  private frame = (): void => {
    if (this.disposed) return;
    const t0 = performance.now();
    const dt = Math.min(0.1, (t0 - this.lastFrameTime) / 1000);
    this.lastFrameTime = t0;

    this.camera.manualInputThisFrame = false;
    this.input.pumpFlight();

    // --- simulation ------------------------------------------------------
    const tSim = performance.now();
    const steps = this.time.advance(dt);
    if (steps > 0) {
      this.branches.step(steps);
      this.time.onTicked(steps);
    }
    const simMs = performance.now() - tSim;

    const world = this.branches.active.state;

    // --- director (yields instantly to manual input, 22.4 / 23.2) ---------
    if (this.directorEnabled && !this.camera.manualInputThisFrame) {
      this.applyDirector(world);
    }

    this.camera.update(dt);

    // --- render sync -----------------------------------------------------
    const tSync = performance.now();
    this.syncRenderState(world, dt);
    const syncMs = performance.now() - tSync;

    this.renderer.render(this.scene, this.camera.camera);

    // Silent Watch: after inactivity everything transient disappears (25.24).
    if (t0 - this.lastPointerAt > 3200 && this.activePeeks.size === 0) {
      this.opts.canvas.style.cursor = 'none';
    }

    const frameMs = performance.now() - t0;
    this.frameCount++;
    if (this.opts.debug || this.perf.length < 2000) {
      this.perf.push({ frameMs, simMs, syncMs });
      if (this.perf.length > 4000) this.perf.shift();
    }
  };

  /** Copies simulation state into GPU-facing buffers. Read-only on the sim. */
  private syncRenderState(world: WorldState, dt: number): void {
    const cam = this.camera;
    const { rg, rs } = blackHoleRadii(world.bh);
    cam.setGravitationalRadius(rg);

    // ---- lensing uniforms ----
    const camRel: Vec3 = [
      cam.originAbs[0] - world.bh.position[0],
      cam.originAbs[1] - world.bh.position[1],
      cam.originAbs[2] - world.bh.position[2],
    ];
    (this.lens.uniforms.camPosRg.value as Vector3).set(
      camRel[0] / rg,
      camRel[1] / rg,
      camRel[2] / rg,
    );
    // Spin moves the inner disk edge via the exact Kerr ISCO (Level 1, 11.9).
    this.lens.uniforms.diskInnerRg.value = kerrIscoRg(world.bh.spin);
    this.lens.uniforms.diskOuterRg.value = world.bh.diskOuterRg;
    this.lens.uniforms.diskBrightness.value = world.bh.diskBrightness;
    (this.lens.uniforms.spinAxis.value as Vector3).set(...world.bh.axis).normalize();
    this.lens.uniforms.orbitSense.value = world.bh.spin >= 0 ? 1 : -1;
    this.lens.uniforms.diskTime.value = world.scenarioTime / 3600;

    // ---- stellar body + debris ----
    const bodyPos = this.bodyPoints.positionArray;
    const bodyInt = this.bodyPoints.intensityArray;
    const b = world.body;
    let n = 0;
    for (let i = 0; i < b.count && n < this.budget.bodyParticles; i++) {
      if (b.bound[i] === 2) continue; // accreted: gone
      cam.toRender(b.pos[i * 3], b.pos[i * 3 + 1], b.pos[i * 3 + 2], bodyPos, n * 3);
      // Bound core reads hot and dense; stripped debris cools by stream side.
      bodyInt[n] = b.bound[i] === 1 ? 1 : b.stream[i] < 0 ? 0.55 : 0.3;
      n++;
    }
    this.bodyPoints.update(n);

    // ---- plasma ----
    const pPos = this.plasmaPoints.positionArray;
    const pInt = this.plasmaPoints.intensityArray;
    const p = world.plasma;
    let m = 0;
    for (let i = 0; i < p.count && m < this.budget.plasmaSprites; i++) {
      cam.toRender(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2], pPos, m * 3);
      const sp = Math.hypot(p.vel[i * 3], p.vel[i * 3 + 1], p.vel[i * 3 + 2]);
      pInt[m] = Math.min(1, sp / (p.thermalSpeed * 3)) * (p.alive[i] ? 1 : 0.35);
      m++;
    }
    this.plasmaPoints.update(m);

    // ---- cloud clumps ----
    const cPos = this.clumpPoints.positionArray;
    const cInt = this.clumpPoints.intensityArray;
    const c = world.cloud;
    let maxMass = 0;
    for (let i = 0; i < c.count; i++) maxMass = Math.max(maxMass, c.mass[i]);
    for (let i = 0; i < c.count; i++) {
      cam.toRender(c.pos[i * 3], c.pos[i * 3 + 1], c.pos[i * 3 + 2], cPos, i * 3);
      cInt[i] = maxMass > 0 ? c.mass[i] / maxMass : 0;
    }
    this.clumpPoints.update(c.count);

    // ---- branch ghost ----
    const cmp = this.branches.compare;
    if (cmp && this.compareBlend > 0.01) {
      const gPos = this.ghostPoints.positionArray;
      const gInt = this.ghostPoints.intensityArray;
      const gb = cmp.state.body;
      let k = 0;
      for (let i = 0; i < gb.count && k < this.budget.bodyParticles; i++) {
        if (gb.bound[i] === 2) continue;
        cam.toRender(gb.pos[i * 3], gb.pos[i * 3 + 1], gb.pos[i * 3 + 2], gPos, k * 3);
        gInt[k] = 1;
        k++;
      }
      this.ghostPoints.update(k);
      this.ghostPoints.opacityUniform.value = this.compareBlend * 0.55;
      this.ghostPoints.points.visible = true;
    } else {
      this.ghostPoints.points.visible = false;
    }

    // ---- field lines ----
    this.framesSinceFieldTrace++;
    if (this.fieldLines.mode !== 'off' && (this.fieldDirty || this.framesSinceFieldTrace > 6)) {
      this.fieldLines.retrace(
        world.fieldNodes,
        world.plasma.centre,
        LAYOUT.plasmaRadius * 0.85,
        LAYOUT.plasmaRadius * 14,
        LAYOUT.plasmaRadius * 0.06,
        (x, y, z, out, off) => cam.toRender(x, y, z, out, off),
      );
      this.fieldDirty = false;
      this.framesSinceFieldTrace = 0;
    }
    this.fieldLines.flowPhase.value = (world.scenarioTime % 1000) * 0.02;

    // ---- GPU tracers ----
    if (this.tracers) {
      const frame = cam.activeFrame;
      this.tracers.cloudRadius.value = LAYOUT.cloudRadius / frame.metresPerUnit;
      // Feed the four heaviest clumps as attractors so the dust follows the
      // mass distribution the user is actually shaping.
      const heaviest = topClumps(world, 4);
      for (let i = 0; i < 4; i++) {
        const u = this.tracers.attractors[i].value as { set: (x: number, y: number, z: number, w: number) => void };
        const h = heaviest[i];
        if (h) {
          const tmp = new Float32Array(3);
          cam.toRender(h.x, h.y, h.z, tmp, 0);
          u.set(tmp[0], tmp[1], tmp[2], (ASTRO.G * h.mass) / (frame.metresPerUnit ** 3) * 1e-6);
        } else {
          u.set(0, 0, 0, 0);
        }
      }
      this.tracers.opacity.value = 0.35;
      this.tracers.step(this.renderer, Math.min(dt, 0.05));
    }

    // Occlusion cue: matter behind the horizon should not draw over the shadow.
    const bhTmp = new Float32Array(3);
    cam.toRender(world.bh.position[0], world.bh.position[1], world.bh.position[2], bhTmp, 0);
    for (const pts of [this.bodyPoints, this.plasmaPoints, this.ghostPoints]) {
      (pts.shadowCentre.value as Vector3).set(bhTmp[0], bhTmp[1], bhTmp[2]);
      pts.shadowRadius.value = (rs * 2.6) / cam.activeFrame.metresPerUnit;
    }

    // Trajectory preview while a body is held (25.19).
    if (this.manipulation.kind === 'body') {
      this.updateTrajectoryPreview(world);
    } else {
      this.trajectory.hide();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Director                                                                */
  /* ---------------------------------------------------------------------- */

  private applyDirector(world: WorldState): void {
    const recent = world.events[world.events.length - 1];
    if (!recent) return;
    // Prefer continuous motion over cuts (23.2): nudge the existing framing
    // toward the event rather than snapping to a new pose.
    const dist = this.camera.distance;
    for (let i = 0; i < 3; i++) {
      this.camera.target[i] += (recent.position[i] - this.camera.target[i]) * 0.02;
    }
    const desired = Math.max(blackHoleRadii(world.bh).rg * 25, dist * 0.98);
    this.camera.distance += (desired - dist) * 0.02;
  }

  /* ---------------------------------------------------------------------- */
  /* Input handling                                                          */
  /* ---------------------------------------------------------------------- */

  private bindInput(): void {
    this.input = new InputRouter(this.opts.canvas, {
      pick: (x, y) => this.pick(x, y),
      onPointerActivity: () => {
        this.lastPointerAt = performance.now();
        this.opts.canvas.style.cursor = 'crosshair';
      },
      onOrbit: (dx, dy) => this.camera.orbit(dx, dy),
      onDolly: (d) => this.camera.dolly(d),
      onManipulateStart: (t, x, y) => this.beginManipulation(t, x, y),
      onManipulateMove: (x, y, dx, dy) => this.moveManipulation(x, y, dx, dy),
      onManipulateEnd: () => this.endManipulation(),
      onManipulateWheel: (d) => this.wheelManipulation(d),
      onFocus: (t) => this.focusTarget(t),
      onToolWheel: (t, x, y) => this.openToolWheel(t, x, y),
      onTogglePause: () => this.time.togglePause(),
      onScrub: (dx) => this.scrub(dx),
      onRateNudge: (dir) => { this.time.nudgeRate(dir); },
      onSeekStep: (dir) => this.seekStep(dir),
      onPeekStart: (k) => this.startPeek(k),
      onPeekEnd: (k) => this.endPeek(k),
      onFork: () => this.fork(),
      onSwapBranch: () => this.branches.swap(),
      onDirectorToggle: () => { this.directorEnabled = !this.directorEnabled; },
      onEventReturn: () => this.returnToEvent(),
      onCycleSelection: () => this.cycleSelection(),
      onClean: () => { this.overlay.clean(); this.activePeeks.clear(); this.fieldLines.mode = 'off'; },
      onEscape: () => { this.overlay.clean(); this.manipulation = { kind: 'none' }; },
      onFlyAxis: (axis, boost) => this.camera.fly(axis, 1 / 60, boost ? 3 : 1),
    });
  }

  /** Screen-space hit test against the small set of manipulable entities. */
  private pick(x: number, y: number): GestureTarget {
    this.pointerX = x;
    this.pointerY = y;
    const world = this.branches.active.state;
    const candidates: Array<{ t: GestureTarget; p: Vec3; slop: number }> = [];

    for (const nd of world.fieldNodes) {
      candidates.push({ t: { kind: 'fieldNode', id: nd.id }, p: nd.position, slop: 46 });
    }
    candidates.push({ t: { kind: 'body' }, p: centreOfMass(world.body), slop: 54 });
    candidates.push({ t: { kind: 'cloud' }, p: centroid(world.cloud), slop: 90 });
    candidates.push({ t: { kind: 'blackHole' }, p: world.bh.position, slop: 60 });

    let best: GestureTarget = { kind: 'empty' };
    let bestD = Infinity;
    for (const c of candidates) {
      const s = this.project(c.p);
      if (!s) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < c.slop && d < bestD) {
        bestD = d;
        best = c.t;
      }
    }
    return best;
  }

  private project(abs: Vec3): { x: number; y: number; depth: number } | null {
    const tmp = new Float32Array(3);
    this.camera.toRender(abs[0], abs[1], abs[2], tmp, 0);
    const v = new Vector3(tmp[0], tmp[1], tmp[2]);
    v.project(this.camera.camera);
    if (v.z > 1 || v.z < -1) return null;
    return {
      x: ((v.x + 1) / 2) * innerWidth,
      y: ((1 - v.y) / 2) * innerHeight,
      depth: v.z,
    };
  }

  /** Converts a screen position into an absolute point on the plane at `depth`. */
  private screenToWorld(x: number, y: number, distanceMetres: number): Vec3 {
    const ndcX = (x / innerWidth) * 2 - 1;
    const ndcY = 1 - (y / innerHeight) * 2;
    const dir = new Vector3(ndcX, ndcY, 0.5)
      .unproject(this.camera.camera)
      .normalize();
    return [
      this.camera.originAbs[0] + dir.x * distanceMetres,
      this.camera.originAbs[1] + dir.y * distanceMetres,
      this.camera.originAbs[2] + dir.z * distanceMetres,
    ];
  }

  private beginManipulation(t: GestureTarget, x: number, y: number): void {
    const world = this.branches.active.state;
    switch (t.kind) {
      case 'cloud':
        this.manipulation = {
          kind: 'cloud',
          brush: 'gather',
          radius: LAYOUT.cloudRadius * 0.4,
          strength: 2.4e-6,
        };
        break;
      case 'fieldNode': {
        const nd = world.fieldNodes.find((n) => n.id === t.id);
        if (!nd) return;
        this.manipulation = {
          kind: 'fieldNode',
          id: t.id,
          depth: this.camera.distanceTo(nd.position),
        };
        break;
      }
      case 'body': {
        const com = centreOfMass(world.body);
        this.branches.submit({ kind: 'bodyGrab', tick: world.tick });
        this.manipulation = {
          kind: 'body',
          depth: this.camera.distanceTo(com),
          lastPos: com,
          velocity: [0, 0, 0],
        };
        break;
      }
      default:
        this.manipulation = { kind: 'none' };
    }
    this.selection = t;
    void x;
    void y;
  }

  private moveManipulation(x: number, y: number, dx: number, dy: number): void {
    const world = this.branches.active.state;
    const man = this.manipulation;

    switch (man.kind) {
      case 'cloud': {
        const centre = this.screenToWorld(x, y, this.camera.distanceTo(centroid(world.cloud)));
        this.branches.submit({
          kind: 'cloudBrush',
          tick: world.tick,
          brush: man.brush,
          centre,
          radius: man.radius,
          strength: man.strength,
          axis: [0, 1, 0],
        });
        break;
      }
      case 'fieldNode': {
        const pos = this.screenToWorld(x, y, man.depth);
        this.branches.submit({ kind: 'fieldNodeMove', tick: world.tick, id: man.id, position: pos });
        this.fieldDirty = true;
        // Reveal the field scaffold only near the active manipulation (25.18).
        if (this.fieldLines.mode === 'off') this.fieldLines.mode = 'minimal';
        break;
      }
      case 'body': {
        const pos = this.screenToWorld(x, y, man.depth);
        // Release velocity comes from the gesture, giving a physical throw.
        man.velocity = [
          (pos[0] - man.lastPos[0]) * 26,
          (pos[1] - man.lastPos[1]) * 26,
          (pos[2] - man.lastPos[2]) * 26,
        ];
        man.lastPos = pos;
        this.branches.submit({ kind: 'bodyMove', tick: world.tick, position: pos });
        break;
      }
      case 'none':
        break;
    }
    void dx;
    void dy;
  }

  private wheelManipulation(delta: number): void {
    const man = this.manipulation;
    if (man.kind === 'cloud') {
      man.radius *= Math.exp(-delta * 0.0012);
      man.radius = Math.max(LAYOUT.cloudRadius * 0.05, Math.min(LAYOUT.cloudRadius * 1.4, man.radius));
    } else if (man.kind === 'body') {
      // Depth plane change while aiming (25.19).
      man.depth *= Math.exp(delta * 0.0012);
    } else if (man.kind === 'fieldNode') {
      man.depth *= Math.exp(delta * 0.0012);
    }
  }

  private endManipulation(): void {
    const man = this.manipulation;
    const world = this.branches.active.state;
    if (man.kind === 'body') {
      this.branches.submit({ kind: 'bodyLaunch', tick: world.tick, velocity: man.velocity });
    }
    this.manipulation = { kind: 'none' };
    this.trajectory.hide();
  }

  private updateTrajectoryPreview(world: WorldState): void {
    const man = this.manipulation;
    if (man.kind !== 'body') return;
    const com = centreOfMass(world.body);
    const buf = new Float64Array(512 * 3);
    const n = integratePreview(world.bh, com, man.velocity, 40, 512, buf);
    this.trajectory.set(buf, n, (x, y, z, out, off) => this.camera.toRender(x, y, z, out, off));

    const pred = predictEncounter(world.bh, com, man.velocity, tidalRadius(world.bh, world.body));
    // Classification is carried by trajectory colour AND shape, never by text
    // on canvas (25.19: "exact terminology and values only on peek").
    this.trajectory.setClass(pred.kind);
  }

  private focusTarget(t: GestureTarget): void {
    const world = this.branches.active.state;
    const { rg } = blackHoleRadii(world.bh);
    switch (t.kind) {
      case 'blackHole':
        this.camera.focusOn(world.bh.position, rg * 60, 'black hole');
        break;
      case 'body':
        this.camera.focusOn(centreOfMass(world.body), world.body.radiusM * 40, 'star');
        break;
      case 'cloud':
        this.camera.focusOn(centroid(world.cloud), LAYOUT.cloudRadius * 3.4, 'cloud');
        break;
      case 'fieldNode': {
        const nd = world.fieldNodes.find((n) => n.id === t.id);
        if (nd) this.camera.focusOn(nd.position, LAYOUT.plasmaRadius * 5, 'field node');
        this.fieldLines.mode = 'flow';
        break;
      }
      case 'empty':
        break;
    }
    this.selection = t;
  }

  private cycleSelection(): void {
    const world = this.branches.active.state;
    const order: GestureTarget[] = [
      { kind: 'blackHole' },
      { kind: 'body' },
      { kind: 'cloud' },
      ...world.fieldNodes.map((n) => ({ kind: 'fieldNode', id: n.id }) as GestureTarget),
    ];
    const idx = order.findIndex((o) => JSON.stringify(o) === JSON.stringify(this.selection));
    this.selection = order[(idx + 1) % order.length];
    this.focusTarget(this.selection);
  }

  /* ---------------------------------------------------------------------- */
  /* Time, branches, peeks                                                   */
  /* ---------------------------------------------------------------------- */

  private scrub(dxPixels: number): void {
    const target = Math.max(0, this.time.tick + Math.round(dxPixels * 1.4));
    if (this.branches.seek(target)) this.time.seekTo(this.branches.active.state.tick);
  }

  private seekStep(direction: -1 | 1): void {
    const target = Math.max(0, this.time.tick + direction * 30);
    if (this.branches.seek(target)) this.time.seekTo(this.branches.active.state.tick);
  }

  private fork(): void {
    const b = this.branches.fork();
    this.compareBlend = 1;
    this.overlay.announce(`Forked branch ${b.label}`);
  }

  private returnToEvent(): void {
    const events = this.branches.active.state.events;
    let best = null as null | (typeof events)[number];
    for (const e of events) if (!best || e.weight >= best.weight) best = e;
    if (best) this.camera.focusOn(best.position, this.camera.distance, best.kind);
  }

  private startPeek(key: PeekKey): void {
    this.activePeeks.add(key);
    const world = this.branches.active.state;
    switch (key) {
      case 'inspect':
        this.overlay.showPeek(key, this.inspectContent(world), { x: this.pointerX, y: this.pointerY });
        break;
      case 'time':
        this.overlay.showPeek(key, this.timeContent(world));
        break;
      case 'camera':
        this.overlay.showToolWheel(innerWidth / 2, innerHeight / 2, CAMERA_VIEWS, (id) =>
          this.applyCameraView(id),
        );
        break;
      case 'branch':
        this.compareBlend = 1;
        this.overlay.showPeek(key, this.branchContent());
        break;
      case 'trace':
        this.overlay.showPeek(key, this.traceContent(world));
        break;
      case 'lightPeel':
        // Light Peel: crossfade lensed vs unlensed background and drop the disk
        // so the construction of the image is visible (25.23).
        this.lens.uniforms.lensMix.value = 0.15;
        this.lens.uniforms.diskOpacity.value = 0.25;
        this.overlay.showPeek(key, this.lightPeelContent(world));
        break;
      case 'help':
        this.overlay.showPeek(key, HELP_CONTENT);
        break;
    }
  }

  private endPeek(key: PeekKey): void {
    this.activePeeks.delete(key);
    if (key === 'lightPeel') {
      this.lens.uniforms.lensMix.value = 1;
      this.lens.uniforms.diskOpacity.value = 1;
    }
    if (key === 'branch') this.compareBlend = 0;
    if (key === 'camera') this.overlay.hideToolWheel();
    else this.overlay.hidePeek();
  }

  private applyCameraView(id: string): void {
    const world = this.branches.active.state;
    const { rg } = blackHoleRadii(world.bh);
    switch (id) {
      case 'shadow': this.camera.focusOn(world.bh.position, rg * 26, 'shadow'); break;
      case 'edge': this.camera.pitch = 0.02; this.camera.focusOn(world.bh.position, rg * 60, 'edge-on'); break;
      case 'above': this.camera.pitch = 1.35; this.camera.focusOn(world.bh.position, rg * 70, 'above'); break;
      case 'chase': this.camera.chase(centreOfMass(world.body)); break;
      case 'plasma': this.camera.focusOn(world.plasma.centre, LAYOUT.plasmaRadius * 6, 'plasma'); break;
      case 'cloud': this.camera.focusOn(centroid(world.cloud), LAYOUT.cloudRadius * 3.2, 'cloud'); break;
      case 'wide': this.camera.focusOn(world.bh.position, rg * 900, 'wide'); break;
    }
    this.overlay.hideToolWheel();
  }

  private openToolWheel(t: GestureTarget, x: number, y: number): void {
    const opts = TOOL_WHEELS[t.kind] ?? [];
    this.overlay.showToolWheel(x, y, opts, (id) => this.applyTool(t, id));
  }

  private applyTool(t: GestureTarget, id: string): void {
    const world = this.branches.active.state;
    if (t.kind === 'cloud' && ['gather', 'disperse', 'spin', 'energize'].includes(id)) {
      this.manipulation = {
        kind: 'cloud',
        brush: id as 'gather',
        radius: LAYOUT.cloudRadius * 0.4,
        strength: 2.4e-6,
      };
      return;
    }
    if (t.kind === 'fieldNode') {
      const nd = world.fieldNodes.find((n) => n.id === t.id);
      if (!nd) return;
      if (id === 'flip') {
        this.branches.submit({
          kind: 'fieldNodeMoment',
          tick: world.tick,
          id: nd.id,
          moment: [-nd.moment[0], -nd.moment[1], -nd.moment[2]],
        });
      } else if (id === 'stronger' || id === 'weaker') {
        const s = id === 'stronger' ? 1.45 : 1 / 1.45;
        this.branches.submit({
          kind: 'fieldNodeMoment',
          tick: world.tick,
          id: nd.id,
          moment: [nd.moment[0] * s, nd.moment[1] * s, nd.moment[2] * s],
        });
      } else if (id === 'disable') {
        this.branches.submit({ kind: 'fieldNodeToggle', tick: world.tick, id: nd.id, enabled: !nd.enabled });
      } else if (id === 'lines') {
        this.fieldLines.mode = this.fieldLines.mode === 'analysis' ? 'flow' : 'analysis';
      }
      this.fieldDirty = true;
      return;
    }
    if (id === 'focus') this.focusTarget(t);
    if (id === 'fork') this.fork();
  }

  /* --------------------------- peek content ------------------------------ */

  private inspectContent(world: WorldState) {
    const { rg, rs, isco } = blackHoleRadii(world.bh);
    switch (this.selection.kind) {
      case 'blackHole':
        return {
          title: 'Black hole',
          rows: [
            { label: 'Mass', value: `${(world.bh.massKg / ASTRO.SOLAR_MASS).toExponential(2)} M☉`, fidelity: 'A' as const },
            { label: 'Spin a*', value: world.bh.spin.toFixed(3), fidelity: 'B' as const },
            { label: 'r_s', value: `${rs.toExponential(2)} m`, fidelity: 'A' as const },
            { label: 'ISCO', value: `${(isco / rg).toFixed(1)} r_g`, fidelity: 'A' as const },
            { label: 'Disk inner', value: `${kerrIscoRg(world.bh.spin).toFixed(2)} r_g`, fidelity: 'A' as const },
            { label: 'Accreted', value: `${(world.bh.accretedKg / ASTRO.SOLAR_MASS).toExponential(2)} M☉`, fidelity: 'A' as const },
          ],
          footnote:
            'Light bending is Schwarzschild for all spins. Spin sets the disk inner edge ' +
            '(exact Kerr ISCO) and orbital sense only — not frame dragging in ray paths.',
        };
      case 'body': {
        const rt = tidalRadius(world.bh, world.body);
        const com = centreOfMass(world.body);
        const r = Math.hypot(com[0] - world.bh.position[0], com[1] - world.bh.position[1], com[2] - world.bh.position[2]);
        return {
          title: 'Stellar body',
          rows: [
            { label: 'Mass', value: `${(world.body.massKg / ASTRO.SOLAR_MASS).toFixed(2)} M☉`, fidelity: 'A' as const },
            { label: 'Distance', value: `${(r / rg).toFixed(1)} r_g`, fidelity: 'A' as const },
            { label: 'Tidal radius', value: `${(rt / rg).toFixed(1)} r_g`, fidelity: 'B' as const },
            { label: 'Bound fraction', value: `${(world.body.boundFraction * 100).toFixed(1)} %`, fidelity: 'B' as const },
            { label: 'Provenance', value: world.body.provenanceId, fidelity: 'A' as const },
          ],
          footnote: 'Self-gravity is spherically averaged; pressure is a polytropic (γ=5/3) proxy. No stellar hydrodynamics.',
        };
      }
      case 'fieldNode': {
        const nd = world.fieldNodes.find((n) => n.id === this.selection.kind === true ? '' : (this.selection as { id: string }).id);
        return {
          title: 'Field element',
          rows: [
            { label: 'Kind', value: nd?.kind ?? '—', fidelity: 'B' as const },
            { label: 'Moment', value: nd ? `${Math.hypot(...nd.moment).toExponential(2)} A·m²` : '—', fidelity: 'B' as const },
            { label: 'Enabled', value: nd?.enabled ? 'yes' : 'no' },
            { label: 'Regime', value: classifyRegime(world.plasma), fidelity: 'B' as const },
          ],
          footnote: 'Analytic dipole/loop superposition. Plasma currents do not feed back into B — not MHD.',
        };
      }
      default:
        return {
          title: 'Plasma',
          rows: [
            { label: 'Regime', value: classifyRegime(world.plasma), fidelity: 'B' as const },
            { label: 'Confinement', value: `${(world.plasma.confinement * 100).toFixed(0)} %`, fidelity: 'B' as const },
            { label: 'Mean speed', value: `${meanSpeed(world.plasma).toExponential(2)} m/s`, fidelity: 'A' as const },
            { label: 'Cloud L', value: `${Math.hypot(...totalAngularMomentum(world.cloud)).toExponential(2)}`, fidelity: 'B' as const },
          ],
          footnote: 'Boris-pushed charged particles in an analytic field. Reconnection is a labelled surrogate.',
        };
    }
  }

  private timeContent(world: WorldState) {
    return {
      title: 'Time',
      rows: [
        { label: 'State', value: this.time.rateGlyph() },
        { label: 'Tick', value: String(world.tick) },
        { label: 'Encounter clock', value: formatScenarioTime(world.scenarioTime), fidelity: 'A' as const },
        { label: 'Plasma clock', value: formatScenarioTime(world.tick * DOMAIN_SECONDS_PER_TICK.plasma), fidelity: 'A' as const },
        { label: 'Formation clock', value: `${((world.tick * DOMAIN_SECONDS_PER_TICK.formation) / 3.156e7).toExponential(2)} yr`, fidelity: 'B' as const },
        { label: 'Checkpoints', value: String(this.branches.active.store.count) },
        { label: 'Events', value: String(world.events.length) },
      ],
      footnote:
        'Domains advance on separate physical clocks (a plasma gyro-period and a cloud ' +
        'free-fall time differ by ~10^18). One tick counter drives all three.',
    };
  }

  private branchContent() {
    const a = this.branches.active;
    const b = this.branches.compare;
    const div = this.branches.divergence();
    return {
      title: 'Branches',
      rows: [
        { label: 'Active', value: a.label },
        { label: 'Compare', value: b?.label ?? '—' },
        { label: 'Fork tick', value: b ? String(a.forkTick) : '—' },
        { label: 'Divergence', value: div === null ? '—' : `${div.toFixed(2)} R★`, fidelity: 'A' as const },
        { label: 'Commands', value: String(a.log.size) },
      ],
      footnote: 'Y forks · X swaps · hold B to ghost the alternate branch in the same space.',
    };
  }

  private traceContent(world: WorldState) {
    const b = world.body;
    let lead = 0, trail = 0, accreted = 0;
    for (let i = 0; i < b.count; i++) {
      if (b.bound[i] === 2) accreted++;
      else if (b.bound[i] === 0) (b.stream[i] < 0 ? lead++ : trail++);
    }
    return {
      title: 'Causal trace',
      rows: [
        { label: 'Origin', value: b.provenanceId, fidelity: 'A' as const },
        { label: 'Still bound', value: `${(b.boundFraction * 100).toFixed(1)} %`, fidelity: 'B' as const },
        { label: 'Leading stream', value: String(lead), fidelity: 'B' as const },
        { label: 'Trailing stream', value: String(trail), fidelity: 'B' as const },
        { label: 'Accreted', value: String(accreted), fidelity: 'A' as const },
      ],
      footnote: 'Stream side is assigned from specific orbital energy relative to the body centre of mass.',
    };
  }

  private lightPeelContent(world: WorldState) {
    const { rg } = blackHoleRadii(world.bh);
    return {
      title: 'Light peel',
      rows: [
        { label: 'Photon sphere', value: '3.0 r_g', fidelity: 'A' as const },
        { label: 'Shadow radius', value: '≈5.2 r_g', fidelity: 'A' as const },
        { label: 'Integration steps', value: String(this.budget.lensSteps) },
        { label: 'Camera r', value: `${(this.camera.distanceTo(world.bh.position) / rg).toFixed(1)} r_g`, fidelity: 'A' as const },
      ],
      footnote:
        'Background is crossfaded to its unlensed state while held, so the deflection ' +
        'itself becomes visible. Rays are integrated, not screen-warped.',
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Lifecycle                                                               */
  /* ---------------------------------------------------------------------- */

  private onResize = (): void => {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.setAspect(innerWidth / innerHeight);
  };

  private onDeviceLost = (): void => {
    this.stop();
    this.overlay.showBlockingError(
      'Graphics device lost',
      'The GPU device was lost and could not be recovered. Simulation state up to ' +
        'the last checkpoint is preserved in memory; reload to continue.',
      () => location.reload(),
    );
  };

  /** Aggregate frame statistics for docs/performance.md and the Gate verdict. */
  perfSummary(): { median: number; p95: number; frames: number; simMedian: number } | null {
    if (this.perf.length < 30) return null;
    const f = this.perf.map((p) => p.frameMs).sort((a, b) => a - b);
    const s = this.perf.map((p) => p.simMs).sort((a, b) => a - b);
    return {
      median: f[Math.floor(f.length * 0.5)],
      p95: f[Math.floor(f.length * 0.95)],
      frames: this.frameCount,
      simMedian: s[Math.floor(s.length * 0.5)],
    };
  }

  get capabilities(): Capabilities { return this.caps; }
  get qualityBudget(): QualityBudget { return this.budget; }
  get overlayRef(): Overlay { return this.overlay; }
  get branchManager(): BranchManager { return this.branches; }
  get timeController(): TimeController { return this.time; }
  get fieldLineLayer(): FieldLines { return this.fieldLines; }

  dispose(): void {
    this.disposed = true;
    this.stop();
    removeEventListener('resize', this.onResize);
    this.input?.dispose();
    this.overlay.dispose();
    this.lens?.dispose();
    this.fieldLines?.dispose();
    this.tracers?.dispose();
    this.bodyPoints?.dispose();
    this.plasmaPoints?.dispose();
    this.clumpPoints?.dispose();
    this.ghostPoints?.dispose();
    this.trajectory?.dispose();
    this.captureTarget?.dispose();
    this.branches?.disposeAll();
    this.renderer?.dispose();
  }
}

/* -------------------------------------------------------------------------- */
/* Trajectory preview                                                          */
/* -------------------------------------------------------------------------- */

/**
 * In-world encounter arc shown while aiming (25.19). Classification is carried
 * by colour AND by a dash/pulse pattern so it is never colour-only (26).
 */
class TrajectoryPreview {
  readonly line: Line;
  private readonly geometry: BufferGeometry;
  private readonly material: LineBasicNodeMaterial;
  private readonly positions: Float32Array;
  readonly tint = uniform(vec3(0.6, 0.8, 1));
  readonly dashRate = uniform(float(1));

  constructor(private readonly capacity: number) {
    this.positions = new Float32Array(capacity * 3);
    this.geometry = new BufferGeometry();
    const p = new Float32BufferAttribute(this.positions, 3);
    p.setUsage(DynamicDrawUsage);
    this.geometry.setAttribute('position', p);
    this.geometry.boundingSphere = null;

    this.material = new LineBasicNodeMaterial();
    this.material.transparent = true;
    this.material.depthWrite = false;
    this.material.blending = AdditiveBlending;
    this.material.colorNode = Fn(() => vec4(this.tint, float(0.85)))();

    this.line = new Line(this.geometry, this.material);
    this.line.frustumCulled = false;
    this.line.visible = false;
    this.line.matrixAutoUpdate = false;
  }

  set(
    buf: Float64Array,
    count: number,
    toRender: (x: number, y: number, z: number, out: Float32Array, off: number) => void,
  ): void {
    const n = Math.min(count, this.capacity);
    for (let i = 0; i < n; i++) {
      toRender(buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2], this.positions, i * 3);
    }
    this.geometry.setDrawRange(0, n);
    this.geometry.getAttribute('position').needsUpdate = true;
    this.line.visible = n > 1;
  }

  setClass(kind: string): void {
    const t = this.tint.value as Vector3;
    switch (kind) {
      case 'escape': t.set(0.55, 0.78, 1.0); this.dashRate.value = 1; break;
      case 'flyby': t.set(0.6, 0.95, 0.8); this.dashRate.value = 2; break;
      case 'capture': t.set(1.0, 0.85, 0.45); this.dashRate.value = 4; break;
      case 'tidalDisruption': t.set(1.0, 0.55, 0.35); this.dashRate.value = 8; break;
      case 'directInfall': t.set(1.0, 0.32, 0.3); this.dashRate.value = 12; break;
      default: t.set(0.7, 0.7, 0.8); this.dashRate.value = 1;
    }
  }

  hide(): void {
    this.line.visible = false;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/* -------------------------------------------------------------------------- */

function topClumps(world: WorldState, n: number): Array<{ x: number; y: number; z: number; mass: number }> {
  const c = world.cloud;
  const idx = Array.from({ length: c.count }, (_, i) => i)
    .sort((a, b) => c.mass[b] - c.mass[a])
    .slice(0, n);
  return idx.map((i) => ({
    x: c.pos[i * 3],
    y: c.pos[i * 3 + 1],
    z: c.pos[i * 3 + 2],
    mass: c.mass[i],
  }));
}

const CAMERA_VIEWS = [
  { id: 'shadow', label: 'Shadow' },
  { id: 'edge', label: 'Edge-on' },
  { id: 'above', label: 'Above' },
  { id: 'chase', label: 'Chase' },
  { id: 'plasma', label: 'Plasma' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'wide', label: 'Wide' },
];

const TOOL_WHEELS: Record<string, Array<{ id: string; label: string }>> = {
  cloud: [
    { id: 'gather', label: 'Gather' },
    { id: 'disperse', label: 'Disperse' },
    { id: 'spin', label: 'Spin' },
    { id: 'energize', label: 'Energise' },
    { id: 'focus', label: 'Focus' },
  ],
  fieldNode: [
    { id: 'stronger', label: 'Stronger' },
    { id: 'weaker', label: 'Weaker' },
    { id: 'flip', label: 'Flip' },
    { id: 'disable', label: 'Toggle' },
    { id: 'lines', label: 'Lines' },
    { id: 'focus', label: 'Focus' },
  ],
  body: [
    { id: 'focus', label: 'Focus' },
    { id: 'fork', label: 'Fork' },
  ],
  blackHole: [
    { id: 'focus', label: 'Focus' },
    { id: 'fork', label: 'Fork' },
  ],
};

const HELP_CONTENT = {
  title: 'Controls',
  rows: [
    { label: 'Drag empty / right-drag', value: 'orbit' },
    { label: 'Drag matter, node, star', value: 'manipulate' },
    { label: 'Wheel / pinch', value: 'scale dive' },
    { label: 'W A S D Q E', value: 'fly' },
    { label: 'Space tap / drag', value: 'pause / scrub' },
    { label: 'Long press', value: 'tool wheel' },
    { label: 'Hold I T C B G P', value: 'peek' },
    { label: 'F · Tab · R · V', value: 'focus · cycle · event · director' },
    { label: 'Y · X', value: 'fork · swap branch' },
    { label: 'H · Esc', value: 'clean · dismiss' },
  ],
};
