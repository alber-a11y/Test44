import * as THREE from 'three';
import { Field, PATH_HALF } from './Field';
import { Rng } from '../sim/rng';
import { vnoise } from './glsl';

/**
 * Low weathered stone ridges that line the roads in segments (as in the reference art).
 * Returns the mesh and the list of occupied points (so grass/trees avoid them).
 */
export function buildRidges(field: Field): { mesh: THREE.Mesh; occupied: { x: number; z: number; r: number }[] } {
  const rng = new Rng(field.level.seed + 991);
  const look = field.look;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const occupied: { x: number; z: number; r: number }[] = [];
  const rockA = new THREE.Color(look.rock), rockB = new THREE.Color(look.rockDark), moss = new THREE.Color(look.moss);
  const tmp = { x: 0, z: 0, dx: 0, dz: 0 };
  const slots = field.level.slots;
  const gate = field.level.gate;
  const RING = 9;

  const blocked = (x: number, z: number) => {
    if (!field.inPlay(x, z, 1.5)) return true;
    if (slots.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 2.3 * 2.3)) return true;
    if ((gate.x - x) ** 2 + (gate.z - z) ** 2 < 36) return true;
    if (field.pathDist(x, z) < PATH_HALF + 0.55) return true;
    return false;
  };

  for (const path of field.paths) {
    for (const side of [-1, 1]) {
      let d = rng.range(2, 5);
      while (d < path.length - 3) {
        const len = rng.range(3, 8);
        const pts: { x: number; z: number; w: number; h: number }[] = [];
        const wBase = rng.range(0.45, 0.75), hBase = rng.range(0.55, 1.15);
        const off0 = PATH_HALF + 0.85 + rng.range(-0.1, 0.35);
        for (let s = 0; s <= len; s += 0.35) {
          path.sample(d + s, tmp);
          const off = off0 + (vnoise((d + s) * 0.5, side * 3) - 0.5) * 0.5;
          const x = tmp.x - tmp.dz * off * side, z = tmp.z + tmp.dx * off * side;
          if (blocked(x, z)) break;
          const t = s / len;
          const taper = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.45);
          pts.push({ x, z, w: wBase * (0.7 + 0.3 * taper) * (0.85 + vnoise(x, z) * 0.3), h: hBase * taper * (0.8 + vnoise(x * 0.7, z * 0.7) * 0.4) });
        }
        if (pts.length >= 6) addRidge(pts);
        d += len + rng.range(2.5, 7);
      }
    }
  }

  function addRidge(pts: { x: number; z: number; w: number; h: number }[]) {
    const base = pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const nx = pts[Math.min(i + 1, pts.length - 1)], pv = pts[Math.max(i - 1, 0)];
      let tx = nx.x - pv.x, tz = nx.z - pv.z;
      const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const px = -tz, pz = tx;
      const y0 = field.height(p.x, p.z) - 0.15;
      occupied.push({ x: p.x, z: p.z, r: p.w + 0.35 });
      for (let k = 0; k < RING; k++) {
        const a = (k / (RING - 1)) * Math.PI;
        const jag = 0.75 + vnoise(p.x * 2.1 + k * 1.7, p.z * 2.1 - k) * 0.5;
        const cw = Math.cos(a) * p.w * (k === 0 || k === RING - 1 ? 1.25 : jag);
        const ch = Math.pow(Math.sin(a), 0.7) * (p.h + 0.15) * (0.8 + jag * 0.25);
        // flat-ish top with slight overhang/blockiness
        const x = p.x + px * cw + tx * (vnoise(k * 3.1, i * 0.7) - 0.5) * 0.18;
        const z = p.z + pz * cw + tz * (vnoise(i * 0.9, k * 2.3) - 0.5) * 0.18;
        pos.push(x, y0 + ch, z);
        const strata = 0.5 + 0.5 * Math.sin(ch * 9 + vnoise(x, z) * 3);
        const c = rockB.clone().lerp(rockA, 0.35 + strata * 0.45 + (ch / (p.h + 0.2)) * 0.2);
        const topness = Math.sin(a);
        if (topness > 0.85 && vnoise(x * 1.5, z * 1.5) > 0.45) c.lerp(moss, 0.55);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < RING - 1; k++) {
        const a = base + i * RING + k, b = a + RING;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    // end caps
    const capF = base, capL = base + (pts.length - 1) * RING;
    for (let k = 1; k < RING - 2; k++) { idx.push(capF, capF + k + 1, capF + k); idx.push(capL, capL + k, capL + k + 1); }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, occupied };
}
