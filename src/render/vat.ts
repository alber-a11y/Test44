import * as THREE from 'three';
import { Assets, type CharKey } from './Assets';

/**
 * Vertex Animation Textures.
 * Skeletal clips are baked once at load time into float textures (one row-block per frame).
 * Every unit type then renders as ONE InstancedMesh, each instance picking its own frame,
 * so hundreds of animated soldiers cost one draw call per unit type.
 */

export interface ClipSpec { name: string; frames: number; loop: boolean; fps?: number }
export interface BakedClip { start: number; count: number; loop: boolean; fps: number; duration: number }

export interface VatModel {
  key: string;
  geometry: THREE.BufferGeometry;
  posTex: THREE.DataTexture;
  nrmTex: THREE.DataTexture;
  width: number;
  rowsPerFrame: number;
  clips: Record<string, BakedClip>;
  height: number;
  radius: number;
  map: THREE.Texture | null;
}

export interface CharVariantSpec {
  key: string;
  char: CharKey;
  /** names of accessory meshes to keep (all non-skinned meshes not listed are hidden) */
  keep: string[];
  clips: Record<string, ClipSpec>;
  recolor?: Recolor;
  /** extra uniform scale applied to rigid accessories (e.g. a bigger tower shield) */
  scaleParts?: Record<string, number>;
}

export interface Recolor { hues: [number, number][]; to: number; minSat?: number; satMul?: number; lightMul?: number }

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _acc = new THREE.Matrix4();

function sameTexKey(t: THREE.Texture | null) { return t ? t.uuid : 'none'; }
const recolorCache = new Map<string, THREE.Texture>();

export function recolorTexture(src: THREE.Texture, rc: Recolor, cacheKey: string): THREE.Texture {
  const key = sameTexKey(src) + cacheKey;
  const hit = recolorCache.get(key);
  if (hit) return hit;
  const img = src.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const minSat = rc.minSat ?? 0.22;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    if (s < minSat) continue;
    let h = 0;
    if (max !== min) {
      if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / (max - min) + 2) * 60;
      else h = ((r - g) / (max - min) + 4) * 60;
    }
    if (!rc.hues.some(([a, z]) => (a <= z ? h >= a && h <= z : h >= a || h <= z))) continue;
    const [nr, ng, nb] = hsl2rgb(rc.to, Math.min(1, s * (rc.satMul ?? 1)), Math.min(1, l * (rc.lightMul ?? 1)));
    d[i] = nr * 255; d[i + 1] = ng * 255; d[i + 2] = nb * 255;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = src.flipY;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  recolorCache.set(key, tex);
  return tex;
}

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

interface PartRef { mesh: THREE.Mesh; skinned: boolean; offset: number; count: number }

/** Bake a KayKit character into a VatModel. */
export function bakeCharacter(spec: CharVariantSpec): VatModel {
  const gltf = Assets.chars.get(spec.char)!;
  const root = gltf.scene;
  // Remember rest pose of every node so each clip starts clean.
  const rest = new Map<THREE.Object3D, [THREE.Vector3, THREE.Quaternion, THREE.Vector3]>();
  root.traverse((o) => rest.set(o, [o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
  const resetPose = () => rest.forEach(([p, q, s], o) => { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); });

  const parts: PartRef[] = [];
  let map: THREE.Texture | null = null;
  let vCount = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const skinned = (m as THREE.SkinnedMesh).isSkinnedMesh === true;
    if (!skinned && !spec.keep.includes(m.name)) return;
    const count = m.geometry.getAttribute('position').count;
    parts.push({ mesh: m, skinned, offset: vCount, count });
    vCount += count;
    if (!map) map = (m.material as THREE.MeshStandardMaterial).map;
  });

  // Base geometry (uv + index); positions filled with first frame later.
  const uv = new Float32Array(vCount * 2);
  const indices: number[] = [];
  for (const p of parts) {
    const g = p.mesh.geometry;
    const ua = g.getAttribute('uv');
    if (ua) for (let i = 0; i < p.count; i++) { uv[(p.offset + i) * 2] = ua.getX(i); uv[(p.offset + i) * 2 + 1] = ua.getY(i); }
    if (g.index) for (let i = 0; i < g.index.count; i++) indices.push(g.index.getX(i) + p.offset);
    else for (let i = 0; i < p.count; i++) indices.push(p.offset + i);
  }

  const clipNames = Object.keys(spec.clips);
  const totalFrames = clipNames.reduce((s, k) => s + spec.clips[k].frames, 0);
  const width = Math.min(vCount, 2048);
  const rowsPerFrame = Math.ceil(vCount / width);
  const texH = totalFrames * rowsPerFrame;
  const posData = new Float32Array(width * texH * 4);
  const nrmData = new Float32Array(width * texH * 4);

  const mixer = new THREE.AnimationMixer(root);
  const clips: Record<string, BakedClip> = {};
  let frameRow = 0;
  let minY = Infinity, maxY = -Infinity, maxR = 0;
  const restPos = new Float32Array(vCount * 3);
  const restNrm = new Float32Array(vCount * 3);

  for (const name of clipNames) {
    const cs = spec.clips[name];
    const clip = gltf.animations.find((a) => a.name === cs.name);
    if (!clip) throw new Error(`clip ${cs.name} missing on ${spec.char}`);
    mixer.stopAllAction();
    resetPose();
    const action = mixer.clipAction(clip);
    action.reset().play();
    const dur = clip.duration;
    clips[name] = { start: frameRow, count: cs.frames, loop: cs.loop, fps: cs.frames / dur, duration: dur };
    for (let f = 0; f < cs.frames; f++) {
      const t = cs.loop ? (f / cs.frames) * dur : (f / Math.max(1, cs.frames - 1)) * dur;
      action.time = Math.min(t, dur - 1e-4);
      mixer.update(0);
      root.updateMatrixWorld(true);
      for (const p of parts) writePart(p, frameRow + f);
    }
    frameRow += cs.frames;
    action.stop();
    mixer.uncacheAction(clip);
  }
  mixer.stopAllAction();
  resetPose();
  root.updateMatrixWorld(true);

  function writePart(p: PartRef, frame: number) {
    const g = p.mesh.geometry;
    const pa = g.getAttribute('position'), na = g.getAttribute('normal');
    if (p.skinned) {
      const sm = p.mesh as THREE.SkinnedMesh;
      const sk = sm.skeleton;
      const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
      const boneMats = sk.bones.map((b, i) => new THREE.Matrix4()
        .multiplyMatrices(sm.matrixWorld, sm.bindMatrixInverse)
        .multiply(b.matrixWorld).multiply(sk.boneInverses[i]).multiply(sm.bindMatrix));
      for (let i = 0; i < p.count; i++) {
        _acc.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        for (let k = 0; k < 4; k++) {
          const w = sw.getComponent(i, k);
          if (w === 0) continue;
          const bm = boneMats[si.getComponent(i, k)].elements;
          const e = _acc.elements;
          for (let j = 0; j < 16; j++) e[j] += bm[j] * w;
        }
        _v.fromBufferAttribute(pa, i).applyMatrix4(_acc);
        _n.fromBufferAttribute(na, i).transformDirection(_acc);
        put(p.offset + i, frame);
      }
    } else {
      _m.copy(p.mesh.matrixWorld);
      const ps = spec.scaleParts?.[p.mesh.name];
      if (ps) _m.multiply(new THREE.Matrix4().makeScale(ps, ps, ps));
      for (let i = 0; i < p.count; i++) {
        _v.fromBufferAttribute(pa, i).applyMatrix4(_m);
        _n.fromBufferAttribute(na, i).transformDirection(_m);
        put(p.offset + i, frame);
      }
    }
  }

  function put(vi: number, frame: number) {
    const col = vi % width, row = frame * rowsPerFrame + Math.floor(vi / width);
    const o = (row * width + col) * 4;
    posData[o] = _v.x; posData[o + 1] = _v.y; posData[o + 2] = _v.z; posData[o + 3] = 1;
    nrmData[o] = _n.x; nrmData[o + 1] = _n.y; nrmData[o + 2] = _n.z; nrmData[o + 3] = 0;
    if (frame === 0) {
      restPos[vi * 3] = _v.x; restPos[vi * 3 + 1] = _v.y; restPos[vi * 3 + 2] = _v.z;
      restNrm[vi * 3] = _n.x; restNrm[vi * 3 + 1] = _n.y; restNrm[vi * 3 + 2] = _n.z;
      minY = Math.min(minY, _v.y); maxY = Math.max(maxY, _v.y);
      maxR = Math.max(maxR, Math.hypot(_v.x, _v.z));
    }
  }
  let tex: THREE.Texture | null = map;
  if (map && spec.recolor) tex = recolorTexture(map, spec.recolor, JSON.stringify(spec.recolor));

  return finishModel(spec.key, restPos, restNrm, uv, indices, posData, nrmData, width, rowsPerFrame, texH, clips, maxY - Math.min(0, minY), maxR, tex);
}

export function finishModel(
  key: string, restPos: Float32Array, restNrm: Float32Array, uv: Float32Array, indices: number[],
  posData: Float32Array, nrmData: Float32Array, width: number, rowsPerFrame: number, texH: number,
  clips: Record<string, BakedClip>, height: number, radius: number, map: THREE.Texture | null,
): VatModel {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(restPos, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(restNrm, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const mk = (d: Float32Array) => {
    const half = new Uint16Array(d.length);
    for (let i = 0; i < d.length; i++) half[i] = THREE.DataUtils.toHalfFloat(d[i]);
    const t = new THREE.DataTexture(half, width, texH, THREE.RGBAFormat, THREE.HalfFloatType);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  };
  return { key, geometry, posTex: mk(posData), nrmTex: mk(nrmData), width, rowsPerFrame, clips, height, radius, map };
}

/** Procedural bake: caller supplies a function producing (positions, normals) per clip time. */
export function bakeProcedural(
  key: string,
  base: { uv: Float32Array; indices: number[]; vertexCount: number; colors?: Float32Array },
  clipSpecs: Record<string, { frames: number; loop: boolean; duration: number }>,
  sample: (clip: string, t01: number, outPos: Float32Array, outNrm: Float32Array) => void,
  map: THREE.Texture | null,
): VatModel {
  const vCount = base.vertexCount;
  const names = Object.keys(clipSpecs);
  const total = names.reduce((s, k) => s + clipSpecs[k].frames, 0);
  const width = Math.min(vCount, 2048);
  const rowsPerFrame = Math.ceil(vCount / width);
  const texH = total * rowsPerFrame;
  const posData = new Float32Array(width * texH * 4);
  const nrmData = new Float32Array(width * texH * 4);
  const p = new Float32Array(vCount * 3), n = new Float32Array(vCount * 3);
  const restPos = new Float32Array(vCount * 3), restNrm = new Float32Array(vCount * 3);
  const clips: Record<string, BakedClip> = {};
  let row = 0, maxY = 0, maxR = 0;
  for (const name of names) {
    const cs = clipSpecs[name];
    clips[name] = { start: row, count: cs.frames, loop: cs.loop, fps: cs.frames / cs.duration, duration: cs.duration };
    for (let f = 0; f < cs.frames; f++) {
      const t01 = cs.loop ? f / cs.frames : f / Math.max(1, cs.frames - 1);
      sample(name, t01, p, n);
      for (let vi = 0; vi < vCount; vi++) {
        const col = vi % width, r = (row + f) * rowsPerFrame + Math.floor(vi / width);
        const o = (r * width + col) * 4;
        posData[o] = p[vi * 3]; posData[o + 1] = p[vi * 3 + 1]; posData[o + 2] = p[vi * 3 + 2]; posData[o + 3] = 1;
        nrmData[o] = n[vi * 3]; nrmData[o + 1] = n[vi * 3 + 1]; nrmData[o + 2] = n[vi * 3 + 2];
      }
      if (row === 0 && f === 0) {
        restPos.set(p); restNrm.set(n);
        for (let vi = 0; vi < vCount; vi++) {
          maxY = Math.max(maxY, p[vi * 3 + 1]);
          maxR = Math.max(maxR, Math.hypot(p[vi * 3], p[vi * 3 + 2]));
        }
      }
    }
    row += cs.frames;
  }
  const model = finishModel(key, restPos, restNrm, base.uv, base.indices, posData, nrmData, width, rowsPerFrame, texH, clips, maxY, maxR, map);
  if (base.colors) model.geometry.setAttribute('color', new THREE.BufferAttribute(base.colors, 3));
  return model;
}

// ---------------------------------------------------------------------------------------------
// Rendering

const VAT_DECL = /* glsl */ `
uniform highp sampler2D vatPos;
uniform highp sampler2D vatNrm;
uniform int vatW;
uniform int vatRows;
attribute vec3 aAnim;
vec4 vatFetch(highp sampler2D tex, float frame) {
  int vid = gl_VertexID;
  ivec2 c = ivec2(vid % vatW, int(frame) * vatRows + vid / vatW);
  return texelFetch(tex, c, 0);
}
`;

function patchVat(shader: THREE.WebGLProgramParametersWithUniforms, model: VatModel, withNormals: boolean) {
  shader.uniforms.vatPos = { value: model.posTex };
  shader.uniforms.vatNrm = { value: model.nrmTex };
  shader.uniforms.vatW = { value: model.width };
  shader.uniforms.vatRows = { value: model.rowsPerFrame };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + VAT_DECL)
    .replace('#include <begin_vertex>', 'vec3 transformed = mix(vatFetch(vatPos, aAnim.x).xyz, vatFetch(vatPos, aAnim.y).xyz, aAnim.z);');
  if (withNormals) {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      'vec3 objectNormal = normalize(mix(vatFetch(vatNrm, aAnim.x).xyz, vatFetch(vatNrm, aAnim.y).xyz, aAnim.z));',
    );
  }
}

export function makeVatMaterial(model: VatModel, opts: { emissiveTint?: boolean } = {}) {
  const mat = new THREE.MeshStandardMaterial({ map: model.map, roughness: 0.72, metalness: 0.05 });
  mat.vertexColors = !!model.geometry.getAttribute('color');
  mat.onBeforeCompile = (s) => {
    patchVat(s, model, true);
    if (opts.emissiveTint) {
      // instanceColor > 1 means "flash": push excess into emissive so hits read clearly
      s.fragmentShader = s.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += max(vColor - 1.0, 0.0) * 0.6;\n#endif',
      );
    }
  };
  mat.customProgramCacheKey = () => 'vat-' + model.key;
  return mat;
}

export function makeVatDepthMaterial(model: VatModel) {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = (s) => patchVat(s, model, false);
  mat.customProgramCacheKey = () => 'vatd-' + model.key;
  return mat;
}

const _mat = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _col = new THREE.Color();

/** One InstancedMesh per VatModel; fill it every frame with begin/push/end. */
export class VatCrowd {
  mesh: THREE.InstancedMesh;
  private anim: THREE.InstancedBufferAttribute;
  private n = 0;
  constructor(public model: VatModel, public capacity: number, scale = 1) {
    const geo = model.geometry.clone();
    this.anim = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.anim.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aAnim', this.anim);
    this.mesh = new THREE.InstancedMesh(geo, makeVatMaterial(model, { emissiveTint: true }), capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.customDepthMaterial = makeVatDepthMaterial(model);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.baseScale = scale;
  }
  baseScale: number;
  begin() { this.n = 0; }
  push(x: number, y: number, z: number, rotY: number, scale: number, clip: string, t: number, r = 1, g = 1, b = 1) {
    if (this.n >= this.capacity) return;
    const c = this.model.clips[clip];
    let fa = 0, fb = 0, fr = 0;
    if (c) {
      let f = t * c.fps;
      if (c.loop) {
        f = ((f % c.count) + c.count) % c.count;
        fa = Math.floor(f); fb = (fa + 1) % c.count; fr = f - fa;
      } else {
        f = Math.min(Math.max(f, 0), c.count - 1);
        fa = Math.floor(f); fb = Math.min(fa + 1, c.count - 1); fr = f - fa;
      }
      fa += c.start; fb += c.start;
    }
    const i = this.n++;
    const s = scale * this.baseScale;
    _q.setFromAxisAngle(_up, rotY);
    _mat.compose(_pos.set(x, y, z), _q, _scl.set(s, s, s));
    this.mesh.setMatrixAt(i, _mat);
    this.anim.setXYZ(i, fa, fb, fr);
    this.mesh.setColorAt(i, _col.setRGB(r, g, b));
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.anim.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
