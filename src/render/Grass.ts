import * as THREE from 'three';
import type { Field } from './Field';
import { Rng } from '../sim/rng';

function clumpGeometry(rng: Rng, blades: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let b = 0; b < blades; b++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(0, 0.12);
    const ox = Math.cos(a) * r, oz = Math.sin(a) * r;
    const yaw = rng.range(0, Math.PI);
    const w = rng.range(0.07, 0.11);
    const h = rng.range(0.65, 1.0);
    const bend = rng.range(0.05, 0.22);
    const cx = Math.cos(yaw), cz = Math.sin(yaw);
    const bx = -cz * bend, bz = cx * bend;
    const base = pos.length / 3;
    const pts: [number, number, number, number][] = [
      [-w, 0, 0, 0], [w, 0, 0, 0], [-w * 0.6, h * 0.55, 0.3, 0.55], [w * 0.6, h * 0.55, 0.3, 0.55], [0, h, 1, 1],
    ];
    for (const [lx, ly, k, v] of pts) {
      pos.push(ox + cx * lx + bx * k * k, ly, oz + cz * lx + bz * k * k);
      uv.push(0.5, v);
    }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const n = new Float32Array(pos.length);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.setIndex(idx);
  return g;
}

function flowerGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const s = 0.07;
  const pos = [-s, 0.18, 0, s, 0.18, 0, s, 0.3, 0, -s, 0.3, 0, 0, 0.18, -s, 0, 0.18, s, 0, 0.3, s, 0, 0.3, -s, -s, 0.24, -s, s, 0.24, -s, s, 0.24, s, -s, 0.24, s];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(24).fill(1), 2));
  const n = new Float32Array(pos.length);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11]);
  return g;
}

export interface GrassLayer { group: THREE.Group; uniforms: { uTime: { value: number } } }

export function buildGrass(field: Field, density: number, avoid: { x: number; z: number; r: number }[]): GrassLayer {
  const rng = new Rng(field.level.seed + 77);
  const look = field.look;
  const uniforms = { uTime: { value: 0 } };
  const group = new THREE.Group();
  const pad = 5;
  const areaW = field.level.width + pad * 2, areaH = field.level.height + pad * 2;
  const count = Math.round(areaW * areaH * 11 * density);
  const geo = clumpGeometry(rng, 4);
  // vertex color gradient root -> tip
  // low contrast against the ground keeps distant grass from shimmering
  const root = new THREE.Color(look.grassA).lerp(new THREE.Color(look.bladeRoot), 0.2), tip = new THREE.Color(look.bladeTip).lerp(new THREE.Color(look.grassB), 0.5);
  const uvA = geo.getAttribute('uv');
  const cols = new Float32Array(uvA.count * 3);
  const tmpC = new THREE.Color();
  for (let i = 0; i < uvA.count; i++) {
    tmpC.copy(root).lerp(tip, Math.pow(uvA.getY(i), 0.8));
    cols[i * 3] = tmpC.r; cols[i * 3 + 1] = tmpC.g; cols[i * 3 + 2] = tmpC.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const windPatch = (s: THREE.WebGLProgramParametersWithUniforms) => {
    s.uniforms.uTime = uniforms.uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
vec3 ip = vec3(0.0);
#endif
float wv = sin(uTime * 1.05 + ip.x * 0.22 + ip.z * 0.15) * 0.7 + sin(uTime * 1.9 + ip.x * 0.6) * 0.15;
float k = uv.y * uv.y;
transformed.x += wv * k * 0.05;
transformed.z += wv * k * 0.025;`);
    // both faces of a blade share the upward normal: no dark back faces (the source of the shimmer)
    s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  mat.onBeforeCompile = windPatch;

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const dry = new THREE.Color(look.grassDry);
  let n = 0;
  const flowerPts: [number, number][] = [];
  for (let tries = 0; tries < count * 3 && n < count; tries++) {
    const x = rng.range(-areaW / 2, areaW / 2), z = rng.range(-areaH / 2, areaH / 2);
    const [r, g, b] = field.maskAt(x, z);
    if (r > 0.22 || g > 0.4) continue;
    if (avoid.some((a) => (a.x - x) ** 2 + (a.z - z) ** 2 < a.r * a.r)) continue;
    const y = field.height(x, z);
    if (Math.abs(y) > 1.2) continue;
    // thin out near road edges
    if (r > 0.08 && rng.chance(0.6)) continue;
    const h = rng.range(0.32, 0.6) * (1 - r * 1.5) * (1 + b * 0.2);
    q.setFromAxisAngle(up, rng.range(0, Math.PI * 2));
    m.compose(p.set(x, y - 0.02, z), q, sc.set(h * 1.2, h, h * 1.2));
    mesh.setMatrixAt(n, m);
    tmpC.setRGB(1, 1, 1).multiplyScalar(rng.range(0.93, 1.05)).lerp(dry, b * 0.25);
    mesh.setColorAt(n, tmpC);
    n++;
    if (rng.chance(0.06 * (0.4 + b))) flowerPts.push([x, z]);
  }
  mesh.count = n;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  group.add(mesh);

  if (look.flowers.length && flowerPts.length && density > 0.3) {
    const fgeo = flowerGeometry();
    const fmat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, emissive: 0x222222 });
    fmat.onBeforeCompile = windPatch;
    const fm = new THREE.InstancedMesh(fgeo, fmat, flowerPts.length);
    flowerPts.forEach(([x, z], i) => {
      q.setFromAxisAngle(up, rng.range(0, Math.PI));
      const s = rng.range(0.7, 1.3);
      m.compose(p.set(x, field.height(x, z), z), q, sc.set(s, s, s));
      fm.setMatrixAt(i, m);
      fm.setColorAt(i, tmpC.set(rng.pick(look.flowers)));
    });
    fm.receiveShadow = true;
    fm.frustumCulled = false;
    group.add(fm);
  }
  return { group, uniforms };
}
