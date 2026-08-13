/**
 * Camera system (BUILD_SPEC 22).
 *
 * The camera is held at the render-space origin permanently and the world is
 * translated around it. That is the strongest possible form of the floating
 * origin required by 7.2: the float64 subtraction (absolute - cameraAbsolute)
 * happens on the CPU, so the float32 coordinates the GPU sees are always small
 * and well-conditioned no matter whether the user is looking at a 10^16 m
 * molecular cloud or a 10^10 m event horizon.
 *
 * Motion uses critically damped springs (22.5) so there is no overshoot, no
 * oscillation, and no involuntary shake; speed is exponential in distance
 * (22.3) so travel never stalls at a fixed zoom limit and slows naturally as
 * the user approaches a focus target.
 */

import { PerspectiveCamera, Quaternion, Vector3 } from 'three/webgpu';
import {
  SCALE_FRAMES,
  detailFrameFor,
  relativisticFrameFor,
  type ScaleFrame,
} from '../core/scale';
import type { Vec3 } from '../simulation/state';

export type CameraIntent = 'idle' | 'orbit' | 'fly' | 'focus' | 'chase';

export interface FocusAnchor {
  label: string;
  target: Vec3;
  distance: number;
  yaw: number;
  pitch: number;
}

/** Critically damped spring: no overshoot, frame-rate independent. */
function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

export class CameraController {
  readonly camera: PerspectiveCamera;

  /** Focus point in absolute metres. The camera orbits this. */
  target: Vec3 = [0, 0, 0];
  /** Smoothed focus point actually used for rendering. */
  private smoothTarget: Vec3 = [0, 0, 0];

  /** Orbit distance in metres. */
  distance = 4e11;
  private smoothDistance = 4e11;

  yaw = 0.6;
  pitch = 0.28;
  private smoothYaw = 0.6;
  private smoothPitch = 0.28;

  /** Absolute camera position in metres; the render-space origin. */
  readonly originAbs: Vec3 = [0, 0, 0];

  intent: CameraIntent = 'idle';
  /** Set by any manual input; the Director must yield the same frame (22.4). */
  manualInputThisFrame = false;

  private frame: ScaleFrame = SCALE_FRAMES[0];
  private gravitationalRadius = 1;

  /** Recent focus anchors for back/forward traversal (22.6). */
  private history: FocusAnchor[] = [];
  private historyCursor = -1;

  /** Free-flight velocity in metres/second of scenario-independent real time. */
  private flyVelocity: Vec3 = [0, 0, 0];

  reducedMotion = false;

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(58, aspect, 0.01, 1e6);
    this.camera.position.set(0, 0, 0);
    this.camera.matrixAutoUpdate = false;
  }

  setGravitationalRadius(rg: number): void {
    this.gravitationalRadius = Math.max(1, rg);
  }

  get activeFrame(): ScaleFrame {
    return this.frame;
  }

  /* ---------------------------------------------------------------------- */
  /* Input                                                                   */
  /* ---------------------------------------------------------------------- */

  orbit(dx: number, dy: number): void {
    this.manualInputThisFrame = true;
    this.intent = 'orbit';
    this.yaw -= dx * 0.0042;
    this.pitch -= dy * 0.0042;
    const lim = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  /**
   * Exponential dolly. Never clamps to a hard min/max — the scale-frame handoff
   * takes over instead (22.3: "zoom never stalls at a fixed min/max").
   */
  dolly(delta: number): void {
    this.manualInputThisFrame = true;
    this.distance *= Math.exp(delta * 0.0016);
    // Bounds are the physical extremes of the scenario, not a UI limit.
    this.distance = Math.max(this.gravitationalRadius * 1.6, Math.min(4e17, this.distance));
  }

  /** Free flight. `axis` is right/up/forward in [-1,1]; speed scales with frame. */
  fly(axis: Vec3, dt: number, boost: number): void {
    if (axis[0] === 0 && axis[1] === 0 && axis[2] === 0) {
      // Damp residual velocity so releasing the key coasts to a stop.
      const k = Math.exp(-6 * dt);
      this.flyVelocity[0] *= k;
      this.flyVelocity[1] *= k;
      this.flyVelocity[2] *= k;
    } else {
      this.manualInputThisFrame = true;
      this.intent = 'fly';
    }

    // Speed is proportional to the current viewing distance, which is what
    // makes travel feel identical at every scale.
    const speed = this.smoothDistance * 0.9 * boost;
    const q = this.camera.quaternion;
    const right = new Vector3(1, 0, 0).applyQuaternion(q);
    const up = new Vector3(0, 1, 0).applyQuaternion(q);
    const fwd = new Vector3(0, 0, -1).applyQuaternion(q);

    const ax = right.x * axis[0] + up.x * axis[1] + fwd.x * axis[2];
    const ay = right.y * axis[0] + up.y * axis[1] + fwd.y * axis[2];
    const az = right.z * axis[0] + up.z * axis[1] + fwd.z * axis[2];

    const accel = speed * 4;
    this.flyVelocity[0] += ax * accel * dt;
    this.flyVelocity[1] += ay * accel * dt;
    this.flyVelocity[2] += az * accel * dt;

    const vmax = speed;
    const v = Math.hypot(...this.flyVelocity);
    if (v > vmax) {
      const s = vmax / v;
      this.flyVelocity[0] *= s;
      this.flyVelocity[1] *= s;
      this.flyVelocity[2] *= s;
    }

    // Flight moves the focus point; the camera keeps its orbit offset, so
    // orientation and apparent direction survive the transition (22.3).
    this.target[0] += this.flyVelocity[0] * dt;
    this.target[1] += this.flyVelocity[1] * dt;
    this.target[2] += this.flyVelocity[2] * dt;
  }

  /** Smoothly acquire a new target (22.2 Focus/Reframe). */
  focusOn(target: Vec3, distance: number, label = 'focus'): void {
    this.pushHistory(label);
    this.target = [...target] as Vec3;
    this.distance = distance;
    this.intent = 'focus';
    this.flyVelocity = [0, 0, 0];
  }

  /** Keeps a moving target framed without stealing orientation control (22.2). */
  chase(target: Vec3): void {
    this.target = [...target] as Vec3;
    this.intent = 'chase';
  }

  private pushHistory(label: string): void {
    this.history = this.history.slice(0, this.historyCursor + 1);
    this.history.push({
      label,
      target: [...this.target] as Vec3,
      distance: this.distance,
      yaw: this.yaw,
      pitch: this.pitch,
    });
    if (this.history.length > 24) this.history.shift();
    this.historyCursor = this.history.length - 1;
  }

  /** Back/forward through focus anchors without opening an object browser. */
  stepHistory(direction: -1 | 1): FocusAnchor | null {
    const next = this.historyCursor + direction;
    if (next < 0 || next >= this.history.length) return null;
    this.historyCursor = next;
    const a = this.history[next];
    this.target = [...a.target] as Vec3;
    this.distance = a.distance;
    this.yaw = a.yaw;
    this.pitch = a.pitch;
    this.manualInputThisFrame = true;
    return a;
  }

  /* ---------------------------------------------------------------------- */
  /* Update                                                                  */
  /* ---------------------------------------------------------------------- */

  update(dt: number): void {
    // Reduced Motion softens easing rather than disabling movement (26).
    const lambda = this.reducedMotion ? 26 : 11;

    this.smoothYaw = dampAngle(this.smoothYaw, this.yaw, lambda, dt);
    this.smoothPitch = dampAngle(this.smoothPitch, this.pitch, lambda, dt);
    // Distance is damped in log space so a 1000x zoom feels as smooth as a 2x.
    this.smoothDistance = Math.exp(
      damp(Math.log(this.smoothDistance), Math.log(this.distance), lambda, dt),
    );
    for (let i = 0; i < 3; i++) {
      this.smoothTarget[i] = damp(this.smoothTarget[i], this.target[i], lambda, dt);
    }

    this.frame = this.selectFrame(this.smoothDistance);

    const cp = Math.cos(this.smoothPitch);
    const offX = Math.sin(this.smoothYaw) * cp * this.smoothDistance;
    const offY = Math.sin(this.smoothPitch) * this.smoothDistance;
    const offZ = Math.cos(this.smoothYaw) * cp * this.smoothDistance;

    this.originAbs[0] = this.smoothTarget[0] + offX;
    this.originAbs[1] = this.smoothTarget[1] + offY;
    this.originAbs[2] = this.smoothTarget[2] + offZ;

    // The camera sits at the render origin looking back at the focus point,
    // which in render space is simply -offset / metresPerUnit.
    const inv = 1 / this.frame.metresPerUnit;
    const look = new Vector3(-offX * inv, -offY * inv, -offZ * inv);

    this.camera.position.set(0, 0, 0);
    const q = new Quaternion();
    const m = lookRotation(look);
    q.setFromRotationMatrix(m);
    this.camera.quaternion.copy(q);

    this.camera.near = this.frame.near;
    this.camera.far = this.frame.far;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }

  /**
   * Picks the scale frame whose render unit keeps the current view distance in
   * a well-conditioned range. Hysteresis (the 0.6/1.8 band) prevents the frame
   * from oscillating when the user hovers on a boundary, which would show up as
   * visible popping (22.3: "no disorienting teleport caused by changing frames").
   */
  private selectFrame(distanceMetres: number): ScaleFrame {
    const frames: ScaleFrame[] = [
      SCALE_FRAMES[0],
      SCALE_FRAMES[1],
      SCALE_FRAMES[2],
      relativisticFrameFor(this.gravitationalRadius),
      detailFrameFor(this.gravitationalRadius),
    ];

    const currentIdx = frames.findIndex((f) => f.id === this.frame.id);
    const idealUnits = 60;

    let best = frames[0];
    let bestErr = Infinity;
    for (const f of frames) {
      const units = distanceMetres / f.metresPerUnit;
      const err = Math.abs(Math.log(units / idealUnits));
      if (err < bestErr) {
        bestErr = err;
        best = f;
      }
    }

    if (currentIdx >= 0) {
      const cur = frames[currentIdx];
      const curUnits = distanceMetres / cur.metresPerUnit;
      // Stay put while the current frame remains usable.
      if (curUnits > idealUnits * 0.14 && curUnits < idealUnits * 7) return cur;
    }
    return best;
  }

  /** Converts absolute metres to camera-relative render units. */
  toRender(x: number, y: number, z: number, out: Float32Array, offset: number): void {
    const inv = 1 / this.frame.metresPerUnit;
    out[offset] = (x - this.originAbs[0]) * inv;
    out[offset + 1] = (y - this.originAbs[1]) * inv;
    out[offset + 2] = (z - this.originAbs[2]) * inv;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Distance from the camera to an absolute point, in metres. */
  distanceTo(p: Vec3): number {
    return Math.hypot(
      p[0] - this.originAbs[0],
      p[1] - this.originAbs[1],
      p[2] - this.originAbs[2],
    );
  }
}

import { Matrix4 } from 'three/webgpu';

const UP = new Vector3(0, 1, 0);
const ALT_UP = new Vector3(0, 0, 1);
const scratchM = new Matrix4();

function lookRotation(forward: Vector3): Matrix4 {
  const f = forward.clone().normalize();
  // Avoid a degenerate basis when looking straight up or down.
  const up = Math.abs(f.dot(UP)) > 0.999 ? ALT_UP : UP;
  return scratchM.lookAt(new Vector3(0, 0, 0), f, up);
}
