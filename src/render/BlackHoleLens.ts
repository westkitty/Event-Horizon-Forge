/**
 * Gravitational lensing by null-geodesic integration (BUILD_SPEC 11.7, 18).
 *
 * For every pixel this integrates the Schwarzschild photon orbit equation
 *
 *     d^2u/dphi^2 = -u + 3 M u^2        (u = 1/r, geometric units, r_s = 2M)
 *
 * backwards from the camera until the ray either falls through the horizon
 * (that pixel is inside the shadow), escapes to infinity (sample the star field in
 * the *outgoing* direction), or crosses the accretion disk plane.
 *
 * This is what produces the shadow, the photon ring, Einstein rings, multiple
 * images of the same star, and the disk's top-and-bottom wrap-around — all as
 * consequences of the integration rather than as authored effects. A radial
 * screen-space distortion is explicitly rejected by 11.7 and listed among the
 * prohibited shortcuts in 53.
 *
 * Integrator: velocity Verlet in phi. Chosen over RK4 because it needs one
 * force evaluation per step instead of four (the dominant per-pixel cost) and
 * is symplectic, so a grazing ray that orbits several times near the photon
 * sphere does not spiral in or out through accumulated energy error.
 *
 * FIDELITY. Light bending is Schwarzschild: exact for a non-spinning hole, and
 * used for all spins. Spin therefore acts at "Level 1/2" in the sense of 11.9 —
 * it moves the inner disk edge via the exact Kerr ISCO expression and sets the
 * orbital sense, but there is no frame dragging in the ray paths and no Kerr
 * photon ring asymmetry. This is disclosed in Science peek and in
 * docs/model-fidelity.md, and must not be described as full Kerr rendering.
 */

import {
  BackSide,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  NodeMaterial,
  Vector3,
  type DataTexture,
  type Node,
} from 'three/webgpu';
import {
  Break,
  Fn,
  If,
  Loop,
  atan,
  cameraProjectionMatrixInverse,
  cameraWorldMatrix,
  float,
  mix,
  screenUV,
  texture,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

/**
 * Uniforms are built by a factory so their precise TSL node types are inferred
 * rather than widened. Vector3/number values are passed directly (not wrapped
 * in vec3()/float()) so `.value` stays a concrete Vector3/number and can be
 * written from the frame loop without casts.
 */
function createLensUniforms() {
  return {
    /** Camera position relative to the hole, in gravitational radii. */
    camPosRg: uniform(new Vector3(0, 0, 200)),
    diskInnerRg: uniform(6),
    diskOuterRg: uniform(34),
    diskBrightness: uniform(0.35),
    /** Unit spin axis = disk normal, in world space. */
    spinAxis: uniform(new Vector3(0, 1, 0)),
    /** Orbital sense: +1 prograde about spinAxis, -1 retrograde. */
    orbitSense: uniform(1),
    exposure: uniform(1),
    /** Animates disk turbulence; scenario time, so it freezes when paused. */
    diskTime: uniform(0),
    /** 0 disables the disk entirely (Light Peel analysis gesture, 25.23). */
    diskOpacity: uniform(1),
    /** Crossfades the lensed background against the unlensed one (Light Peel). */
    lensMix: uniform(1),
  };
}

export type LensUniforms = ReturnType<typeof createLensUniforms>;

export interface BlackHoleLens {
  mesh: Mesh;
  uniforms: LensUniforms;
  dispose(): void;
}

/**
 * Exact Kerr prograde ISCO (Bardeen, Press & Teukolsky 1972), in units of M.
 * Used so the spin control moves the inner disk edge correctly (9 M at a=-1,
 * 6 M at a=0, 1 M at a=1) instead of by an invented fudge factor.
 */
export function kerrIscoRg(spin: number): number {
  const a = Math.max(-0.998, Math.min(0.998, spin));
  const z1 =
    1 +
    Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
  const z2 = Math.sqrt(3 * a * a + z1 * z1);
  const sign = a >= 0 ? -1 : 1;
  return 3 + z2 + sign * Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
}

export function createBlackHoleLens(
  starfield: DataTexture,
  steps: number,
): BlackHoleLens {
  const uniforms = createLensUniforms();

  // General node types: `ReturnType<typeof vec3>` resolves to a specific
  // VarNode/JoinNode instantiation and will not accept other vec3-typed nodes.
  type V3 = Node<'vec3'>;
  type F1 = Node<'float'>;

  /**
   * Samples the equirectangular sky in a world direction. Must stay in exact
   * agreement with dirToUv() in Starfield.ts:
   *   u = atan2(z, x) / 2pi + 0.5,  v = acos(y) / pi
   *
   * A plain node-building closure rather than a TSL Fn: it is called twice and
   * inlining keeps the graph simpler than a shader function call.
   */
  const sampleSky = (dir: V3) => {
    const u = atan(dir.z, dir.x).div(Math.PI * 2).add(0.5);
    const v = dir.y.clamp(-1, 1).acos().div(Math.PI);
    return texture(starfield, vec2(u, v)).rgb;
  };

  /**
   * Disk surface brightness at radius r (in M), before relativistic transfer.
   * Shakura-Sunyaev-like: T ~ r^-3/4 so emissivity ~ r^-3, with the standard
   * zero-torque inner boundary taper (1 - sqrt(r_in/r)).
   */
  const diskEmissivity = (r: F1, phi: F1) => {
    const rin = uniforms.diskInnerRg;
    const norm = rin.div(r.max(rin));
    const taper = float(1).sub(norm.sqrt()).max(0);
    const radial = norm.pow(3).mul(taper);

    // Transient knots and shearing lanes (18/11.6: "not a flat glowing
    // texture"). Sheared by the local Keplerian rate so structure winds up
    // differentially, the way real disk turbulence does.
    const shear = uniforms.diskTime.mul(r.pow(-1.5)).mul(8);
    const s1 = phi.mul(7).add(shear.mul(3)).sin();
    const s2 = phi.mul(13).sub(shear.mul(5)).sin();
    const s3 = r.mul(0.9).add(shear.mul(2)).sin();
    const knots = s1.mul(s2).mul(0.22).add(s3.mul(0.12)).add(1);

    // Fade the outer edge so the disk does not end in a hard ring.
    const outerFade = float(1).sub(
      r.sub(uniforms.diskOuterRg.mul(0.72))
        .div(uniforms.diskOuterRg.mul(0.28))
        .clamp(0, 1),
    );
    return radial.mul(knots.max(0.15)).mul(outerFade);
  };

  const shade = Fn(() => {
    // --- Reconstruct the world-space camera ray for this pixel --------------
    const ndc = screenUV.mul(2).sub(1);
    const clip = vec4(ndc.x, ndc.y, float(-1), float(1));
    const viewH = cameraProjectionMatrixInverse.mul(clip);
    const viewDir = viewH.xyz.div(viewH.w);
    const rayDir = cameraWorldMatrix.mul(vec4(viewDir, float(0))).xyz.normalize().toVar();

    // --- Set up the photon's orbital plane ---------------------------------
    const camPos = uniforms.camPosRg;
    const r0 = camPos.length().max(2.02).toVar();
    const e1 = camPos.div(r0).toVar();

    const dPar = rayDir.dot(e1).toVar();
    const perpVec = rayDir.sub(e1.mul(dPar)).toVar();
    const perpLen = perpVec.length().max(1e-6).toVar();
    const e2 = perpVec.div(perpLen).toVar();

    // u = 1/r ; du/dphi at the camera follows from the ray's radial/tangential
    // split: r'(0)/r0 = dPar/perpLen  =>  u'(0) = -(1/r0)(dPar/perpLen).
    const u = float(1).div(r0).toVar();
    const du = dPar.div(perpLen).div(r0).negate().toVar();
    const phi = float(0).toVar();

    const escapeR = float(4000);
    const dphi = float(Math.PI * 3).div(float(steps));

    const captured = float(0).toVar();
    const escaped = float(0).toVar();
    const diskAccum = vec3(0, 0, 0).toVar();
    const diskAlpha = float(0).toVar();

    const prevPos = e1.mul(r0).toVar();
    const prevSide = prevPos.dot(uniforms.spinAxis).toVar();
    const exitDir = rayDir.toVar();

    Loop(steps, () => {
      const a0 = u.negate().add(u.mul(u).mul(3));
      const uNext = u.add(du.mul(dphi)).add(a0.mul(dphi).mul(dphi).mul(0.5));
      const a1 = uNext.negate().add(uNext.mul(uNext).mul(3));
      du.addAssign(a0.add(a1).mul(dphi).mul(0.5));
      u.assign(uNext);
      phi.addAssign(dphi);

      // Horizon: r <= 2M. Nothing that crosses it comes back.
      If(u.greaterThan(0.5), () => {
        captured.assign(1);
        Break();
      });

      const r = float(1).div(u.max(1e-6));
      const cp = phi.cos();
      const sp = phi.sin();
      const pos = e1.mul(cp).add(e2.mul(sp)).mul(r);

      // Outgoing tangent, up to a positive scale factor (see file header).
      const tangent = e1
        .mul(du.negate().mul(cp).sub(u.mul(sp)))
        .add(e2.mul(du.negate().mul(sp).add(u.mul(cp))))
        .normalize();

      // --- Accretion disk crossing ----------------------------------------
      const side = pos.dot(uniforms.spinAxis);
      If(side.mul(prevSide).lessThan(0), () => {
        // Linear interpolation to the plane crossing.
        const t = prevSide.div(prevSide.sub(side).abs().max(1e-9));
        const hit = mix(prevPos, pos, t.abs().clamp(0, 1));
        const rHit = hit.length();

        If(
          rHit.greaterThan(uniforms.diskInnerRg).and(rHit.lessThan(uniforms.diskOuterRg)),
          () => {
            // Azimuth within the disk plane, for the turbulence pattern.
            const radial = hit.sub(uniforms.spinAxis.mul(hit.dot(uniforms.spinAxis))).normalize();
            const ref = e1.sub(uniforms.spinAxis.mul(e1.dot(uniforms.spinAxis))).normalize();
            const cosA = radial.dot(ref).clamp(-1, 1);
            const azim = cosA.acos();

            const emis = diskEmissivity(rHit, azim);

            // --- Relativistic transfer (11.8) -----------------------------
            // Keplerian orbital speed in units of c: beta = 1/sqrt(r).
            const beta = float(1).div(rHit.sqrt()).min(0.92);
            const gamma = float(1).div(float(1).sub(beta.mul(beta)).sqrt());
            const vHat = uniforms.spinAxis.cross(radial).mul(uniforms.orbitSense).normalize();

            // We integrate outward from the camera, so the physical photon
            // travels along -tangent; the source-to-observer direction is
            // therefore -tangent, giving delta = 1/(gamma (1 + beta.t)).
            const dopplerDenom = gamma.mul(float(1).add(vHat.dot(tangent).mul(beta)));
            const delta = float(1).div(dopplerDenom.max(0.05));

            // Gravitational redshift, exact Schwarzschild: sqrt(1 - r_s/r).
            const grav = float(1).sub(float(2).div(rHit)).max(0).sqrt();
            const g = delta.mul(grav);

            // I_obs = g^3 I_emit follows from invariance of I_nu / nu^3.
            const boost = g.mul(g).mul(g);

            // Colour: hotter (bluer) inward, and shifted by g so the
            // approaching side genuinely blueshifts rather than just brightening.
            const hot = vec3(0.62, 0.76, 1.0);
            const warm = vec3(1.0, 0.58, 0.22);
            const radialMix = uniforms.diskInnerRg.div(rHit.max(uniforms.diskInnerRg)).pow(0.7);
            const baseCol = mix(warm, hot, radialMix.clamp(0, 1));
            const shifted = mix(baseCol, hot, g.sub(1).clamp(0, 1).mul(0.8));

            const contribution = shifted
              .mul(emis)
              .mul(boost)
              .mul(uniforms.diskBrightness)
              .mul(uniforms.diskOpacity);

            // Later crossings are attenuated by what was already accumulated,
            // so the near face of the disk occludes the far face.
            diskAccum.addAssign(contribution.mul(float(1).sub(diskAlpha.clamp(0, 1))));
            diskAlpha.addAssign(emis.mul(0.85));
          },
        );
      });

      prevSide.assign(side);
      prevPos.assign(pos);
      exitDir.assign(tangent);

      If(r.greaterThan(escapeR), () => {
        escaped.assign(1);
        Break();
      });
    });

    // --- Composite ---------------------------------------------------------
    // A ray that neither escaped nor crossed the horizon within the step budget
    // is asymptotically bound near the photon sphere; treat it as shadow.
    const skyLensed = sampleSky(exitDir).mul(escaped);
    const skyDirect = sampleSky(rayDir);
    const sky = mix(skyDirect, skyLensed, uniforms.lensMix).mul(float(1).sub(captured));

    return vec4(sky.add(diskAccum).mul(uniforms.exposure), float(1));
  });

  // A cube rendered from the inside acts as a fullscreen surface that is always
  // present regardless of camera orientation, without depending on a particular
  // fullscreen-triangle convention.
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(CUBE_POSITIONS, 3));

  const material = new NodeMaterial();
  material.fragmentNode = shade();
  material.side = BackSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.transparent = false;
  material.toneMapped = true;

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  // Drawn before everything else; matter composites on top (18.1 step 5).
  mesh.renderOrder = -1000;
  // Keeps the box centred on the camera so it never clips.
  mesh.onBeforeRender = (_r, _s, camera) => {
    mesh.position.copy(camera.position);
    mesh.updateMatrixWorld();
  };

  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Unit cube, 12 triangles, scaled large enough to never intersect near plane. */
const S = 1;
const CUBE_POSITIONS: number[] = buildCube(S);

function buildCube(s: number): number[] {
  const v = [
    [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
    [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s],
  ];
  const faces = [
    [0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7],
    [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0],
  ];
  const out: number[] = [];
  for (const f of faces) {
    const [a, b, c, d] = f;
    out.push(...v[a], ...v[b], ...v[c]);
    out.push(...v[a], ...v[c], ...v[d]);
  }
  return out;
}
