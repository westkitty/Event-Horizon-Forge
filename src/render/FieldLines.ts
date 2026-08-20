/**
 * Magnetic field-line visualisation (BUILD_SPEC 10.6, 20).
 *
 * Lines are produced by RK4-integrating the same analytic field the plasma
 * solver uses, from deterministic seed points. The expensive physical topology
 * is cached until field nodes or display density change; camera motion only
 * reprojects the cached absolute vertices into render space.
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
import { FieldSet, traceFieldLine } from '../simulation/field';
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
  /** Absolute traced positions in metres; retained until topology changes. */
  private readonly absolutePositions: Float64Array;
  /** Per-vertex: x = normalised |B|, y = arclength fraction (flow direction). */
  private readonly attrs: Float32Array;
  private readonly traceBuf: Float64Array;
  private readonly maxLines: number;
  private readonly maxSteps: number;
  private readonly fieldSet = new FieldSet();
  private readonly b: Vec3 = [0, 0, 0];
  private readonly renderTmp = new Float32Array(3);
  private readonly seed: Vec3 = [0, 0, 0];
  private topologyKey = '';
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
    this.absolutePositions = new Float64Array(maxVerts * 3);
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
      const la = attribute('lineAttr', 'vec2' as const);
      const strength = la.x;
      const along = la.y;

      const pulse = along.mul(6).sub(this.flowPhase).sin().mul(0.5).add(0.5).pow(3);
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
   * Refreshes line rendering. Physical RK4 tracing and per-vertex field-strength
   * evaluation run only when the actual field topology/display density changes.
   * Camera movement simply reprojects cached absolute vertices.
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
      this.topologyKey = '';
      this.geometry.setDrawRange(0, 0);
      this.lines.visible = false;
      return;
    }

    const key = makeTopologyKey(this.mode, nodes, centre, seedRadius, boundsMetres, stepMetres);
    const topologyChanged = key !== this.topologyKey;
    if (topologyChanged) {
      this.rebuildTopology(nodes, centre, seedRadius, boundsMetres, stepMetres);
      this.topologyKey = key;
      this.geometry.getAttribute('lineAttr').needsUpdate = true;
    }

    const tmp = this.renderTmp;
    for (let v = 0; v < this.vertexCount; v++) {
      const o = v * 3;
      toRender(
        this.absolutePositions[o],
        this.absolutePositions[o + 1],
        this.absolutePositions[o + 2],
        tmp,
        0,
      );
      this.positions[o] = tmp[0];
      this.positions[o + 1] = tmp[1];
      this.positions[o + 2] = tmp[2];
    }

    this.geometry.setDrawRange(0, this.vertexCount);
    this.geometry.getAttribute('position').needsUpdate = true;
    this.lines.visible = this.vertexCount > 0;
  }

  private rebuildTopology(
    nodes: readonly FieldNode[],
    centre: Vec3,
    seedRadius: number,
    boundsMetres: number,
    stepMetres: number,
  ): void {
    const lineCount = Math.min(
      this.maxLines,
      this.mode === 'analysis' ? this.maxLines : MODE_LINES[this.mode],
    );

    const set = this.fieldSet.update(nodes);
    const b = this.b;
    set.evaluate(centre[0], centre[1], centre[2], b);
    const refStrength = Math.max(1e-30, len3(b[0], b[1], b[2]));

    let v = 0;
    for (let l = 0; l < lineCount; l++) {
      // Deterministic seed points on a Fibonacci sphere around the plasma.
      const t = (l + 0.5) / lineCount;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = Math.PI * (1 + Math.sqrt(5)) * l;
      this.seed[0] = centre[0] + seedRadius * Math.sin(inclination) * Math.cos(azimuth);
      this.seed[1] = centre[1] + seedRadius * Math.cos(inclination);
      this.seed[2] = centre[2] + seedRadius * Math.sin(inclination) * Math.sin(azimuth);

      for (const dir of [1, -1] as const) {
        const n = traceFieldLine(
          set,
          this.seed,
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
            const o = v * 3;
            this.absolutePositions[o] = x;
            this.absolutePositions[o + 1] = y;
            this.absolutePositions[o + 2] = z;

            set.evaluate(x, y, z, b);
            const mag = len3(b[0], b[1], b[2]);
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
  }

  get drawnVertices(): number {
    return this.vertexCount;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

function makeTopologyKey(
  mode: FieldDisplayMode,
  nodes: readonly FieldNode[],
  centre: Vec3,
  seedRadius: number,
  boundsMetres: number,
  stepMetres: number,
): string {
  let key = `${mode}|${centre[0]},${centre[1]},${centre[2]}|${seedRadius}|${boundsMetres}|${stepMetres}`;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    key += `|${n.id}:${n.kind}:${n.enabled ? 1 : 0}:${n.position[0]},${n.position[1]},${n.position[2]}:${n.moment[0]},${n.moment[1]},${n.moment[2]}:${n.radius}`;
  }
  return key;
}

function len3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}
