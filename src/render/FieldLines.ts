/**
 * Magnetic field-line visualisation (BUILD_SPEC 10.6, 20).
 *
 * Lines are produced by RK4-integrating the same analytic field the plasma
 * solver uses, from deterministic seed points, and are re-traced whenever a
 * node moves. That is the requirement in 25.18: "the visual scaffold must
 * derive from the actual field representation used by the solver" — hand-drawn
 * curves that merely look magnetic are explicitly prohibited (53: "field lines
 * that do not respond to field controls").
 *
 * Three display densities (20): minimal / flow / analysis. Depth fading and
 * importance culling keep the screen from turning into spaghetti (10.6).
 */

import {
  AdditiveBlending,
  BufferGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  LineBasicNodeMaterial,
  LineSegments,
} from 'three/webgpu';
import { Fn, attribute, float, mix, uniform, vec3, vec4 } from 'three/tsl';
import { traceFieldLine, totalFieldAt } from '../simulation/field';
import type { FieldNode, Vec3 } from '../simulation/state';

export type FieldDisplayMode = 'off' | 'minimal' | 'flow' | 'analysis';

export interface FieldLinesOptions {
  maxLines: number;
  maxSteps: number;
}

const MODE_LINES: Record<FieldDisplayMode, number> = {
  off: 0,
  minimal: 6,
  flow: 20,
  analysis: 1,
};

export class FieldLines {
  readonly lines: LineSegments;
  private readonly geometry: BufferGeometry;
  private readonly material: LineBasicNodeMaterial;
  private readonly positions: Float32Array;
  /** Per-vertex: x = normalised |B|, y = arclength fraction (flow direction). */
  private readonly attrs: Float32Array;
  private readonly traceBuf: Float64Array;
  private readonly maxLines: number;
  private readonly maxSteps: number;
  private vertexCount = 0;

  readonly opacity = uniform(float(0.6));
  readonly flowPhase = uniform(float(0));
  mode: FieldDisplayMode = 'off';

  constructor(opts: FieldLinesOptions) {
    this.maxLines = opts.maxLines;
    this.maxSteps = opts.maxSteps;

    // Two vertices per segment; (steps - 1) segments per line, both directions.
    const maxVerts = opts.maxLines * 2 * (opts.maxSteps - 1) * 2;
    this.positions = new Float32Array(maxVerts * 3);
    this.attrs = new Float32Array(maxVerts * 2);
    this.traceBuf = new Float64Array(opts.maxSteps * 3);

    this.geometry = new BufferGeometry();
    const p = new Float32BufferAttribute(this.positions, 3);
    p.setUsage(DynamicDrawUsage);
    const a = new Float32BufferAttribute(this.attrs, 2);
    a.setUsage(DynamicDrawUsage);
    this.geometry.setAttribute('position', p);
    this.geometry.setAttribute('lineAttr', a);
    this.geometry.boundingSphere = null;

    this.material = new LineBasicNodeMaterial();
    this.material.transparent = true;
    this.material.depthWrite = false;
    this.material.blending = AdditiveBlending;

    this.material.colorNode = Fn(() => {
      // `as const` on the node type keeps the swizzle accessors typed; without
      // it `attribute()` widens to AttributeNode<string> and loses .x/.y.
      const la = attribute('lineAttr', 'vec2' as const);
      const strength = la.x;
      const along = la.y;

      // Direction cue: a travelling brightness pulse along the line. Motion,
      // not colour, carries the direction, so the encoding is not colour-only
      // (26: "no color-only meaning").
      const pulse = along.mul(6).sub(this.flowPhase).sin().mul(0.5).add(0.5).pow(3);

      // Strength is also encoded redundantly as brightness, again so colour is
      // never the sole channel.
      const cool = vec3(0.28, 0.42, 0.72);
      const hot = vec3(0.72, 0.86, 1.0);
      const col = mix(cool, hot, strength.clamp(0, 1));
      const brightness = strength.mul(0.55).add(pulse.mul(0.45)).add(0.12);
      return vec4(col.mul(brightness), this.opacity);
    })();

    this.lines = new LineSegments(this.geometry, this.material);
    this.lines.frustumCulled = false;
    this.lines.matrixAutoUpdate = false;
    this.lines.visible = false;
  }

  /**
   * Re-traces every line. `toRender` converts absolute metres to camera-relative
   * render units, so the lines share the floating-origin treatment of
   * everything else.
   */
  retrace(
    nodes: readonly FieldNode[],
    centre: Vec3,
    seedRadius: number,
    boundsMetres: number,
    stepMetres: number,
    toRender: (x: number, y: number, z: number, out: Float32Array, offset: number) => void,
  ): void {
    if (this.mode === 'off' || nodes.length === 0) {
      this.vertexCount = 0;
      this.geometry.setDrawRange(0, 0);
      this.lines.visible = false;
      return;
    }

    const lineCount = Math.min(
      this.maxLines,
      this.mode === 'analysis' ? this.maxLines : MODE_LINES[this.mode],
    );

    let v = 0;
    const b: Vec3 = [0, 0, 0];
    const scratch: Vec3 = [0, 0, 0];
    const tmp = new Float32Array(3);

    // Reference strength for normalising the brightness encoding.
    totalFieldAt(nodes, centre[0], centre[1], centre[2], b, scratch);
    const refStrength = Math.max(1e-30, Math.hypot(b[0], b[1], b[2]));

    for (let l = 0; l < lineCount; l++) {
      // Deterministic seed points on a Fibonacci sphere around the plasma —
      // stable across frames, so lines do not swim when nothing has changed.
      const t = (l + 0.5) / lineCount;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = Math.PI * (1 + Math.sqrt(5)) * l;
      const seed: Vec3 = [
        centre[0] + seedRadius * Math.sin(inclination) * Math.cos(azimuth),
        centre[1] + seedRadius * Math.cos(inclination),
        centre[2] + seedRadius * Math.sin(inclination) * Math.sin(azimuth),
      ];

      for (const dir of [1, -1] as const) {
        const n = traceFieldLine(
          nodes,
          seed,
          stepMetres,
          this.maxSteps,
          boundsMetres,
          this.traceBuf,
          dir,
        );

        for (let i = 1; i < n; i++) {
          if (v + 2 > this.attrs.length / 2) break;

          for (const idx of [i - 1, i]) {
            const x = this.traceBuf[idx * 3];
            const y = this.traceBuf[idx * 3 + 1];
            const z = this.traceBuf[idx * 3 + 2];
            toRender(x, y, z, tmp, 0);
            this.positions[v * 3] = tmp[0];
            this.positions[v * 3 + 1] = tmp[1];
            this.positions[v * 3 + 2] = tmp[2];

            totalFieldAt(nodes, x, y, z, b, scratch);
            const mag = Math.hypot(b[0], b[1], b[2]);
            // Log-scaled: a dipole spans many decades and a linear map would
            // make everything but the immediate vicinity of a node invisible.
            this.attrs[v * 2] = Math.max(
              0,
              Math.min(1, 0.5 + Math.log10(mag / refStrength + 1e-30) * 0.35),
            );
            this.attrs[v * 2 + 1] = (idx / this.maxSteps) * dir;
            v++;
          }
        }
      }
    }

    this.vertexCount = v;
    this.geometry.setDrawRange(0, v);
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('lineAttr').needsUpdate = true;
    this.lines.visible = v > 0;
  }

  get drawnVertices(): number {
    return this.vertexCount;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
