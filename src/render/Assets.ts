import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const BASE = import.meta.env.BASE_URL + 'assets/models/';

export const CHAR_KEYS = ['knight', 'barbarian', 'mage', 'rogue', 'skel_warrior', 'skel_minion', 'skel_mage', 'skel_rogue'] as const;
export type CharKey = (typeof CHAR_KEYS)[number];

/** Central model registry. The environment kit is one GLB with a root node per model key. */
class AssetStore {
  private loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  kit = new Map<string, THREE.Object3D>();
  chars = new Map<CharKey, GLTF>();
  kitMaterial!: THREE.MeshStandardMaterial;
  private loaded = false;

  async load(onProgress?: (p: number) => void) {
    if (this.loaded) return;
    const files = ['kit', ...CHAR_KEYS];
    let done = 0;
    const tick = () => onProgress?.(++done / files.length);
    const kitP = this.loader.loadAsync(BASE + 'kit.glb').then((g) => { tick(); return g; });
    const charP = CHAR_KEYS.map((k) => this.loader.loadAsync(BASE + k + '.glb').then((g) => { tick(); this.chars.set(k, g); }));
    const kit = await kitP;
    await Promise.all(charP);

    const root = kit.scene.children[0]?.name === 'kit' ? kit.scene.children[0] : kit.scene;
    for (const child of [...root.children]) {
      child.position.set(0, 0, 0);
      this.kit.set(child.name, child);
    }
    // Share a single tuned material across the whole kit
    let mat: THREE.MeshStandardMaterial | undefined;
    kit.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        if (!mat) {
          mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.roughness = 0.78;
          mat.metalness = 0;
          if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
        }
        m.material = mat;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    this.kitMaterial = mat!;
    this.loaded = true;
  }

  /** Deep clone of a kit model (geometry/material shared). */
  model(key: string): THREE.Object3D {
    const src = this.kit.get(key);
    if (!src) throw new Error('Unknown kit model ' + key);
    return src.clone(true);
  }

  /** Flattened geometry of a kit model (all meshes merged, world-space relative to model root). */
  geometry(key: string): THREE.BufferGeometry {
    const cached = this.geoCache.get(key);
    if (cached) return cached;
    const src = this.kit.get(key)!;
    src.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(src.matrixWorld).invert();
    const parts: THREE.BufferGeometry[] = [];
    src.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry.clone();
      for (const name of Object.keys(g.attributes)) {
        if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      }
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      parts.push(dequantize(g));
    });
    const merged = mergeSimple(parts);
    this.geoCache.set(key, merged);
    return merged;
  }
  private geoCache = new Map<string, THREE.BufferGeometry>();
}

/** Converts (possibly quantized / interleaved) attributes to plain Float32 non-indexed-safe attributes. */
export function dequantize(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.getAttribute(name);
    if (!a) continue;
    const arr = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) {
      for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.getComponent(i, c);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  if (g.index) out.setIndex(Array.from(g.index.array as ArrayLike<number>));
  return out;
}

/** Merge geometries that all have position/normal/uv + index. */
export function mergeSimple(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vCount = 0, iCount = 0;
  for (const p of parts) {
    vCount += p.getAttribute('position').count;
    iCount += p.index ? p.index.count : p.getAttribute('position').count;
  }
  const pos = new Float32Array(vCount * 3), nrm = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  let vo = 0, io = 0;
  for (const p of parts) {
    const pa = p.getAttribute('position'), na = p.getAttribute('normal'), ua = p.getAttribute('uv');
    pos.set(pa.array as Float32Array, vo * 3);
    if (na) nrm.set(na.array as Float32Array, vo * 3);
    if (ua) uv.set(ua.array as Float32Array, vo * 2);
    if (p.index) {
      const ia = p.index.array;
      for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + vo;
      io += ia.length;
    } else {
      for (let i = 0; i < pa.count; i++) idx[io + i] = vo + i;
      io += pa.count;
    }
    vo += pa.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

export const Assets = new AssetStore();
