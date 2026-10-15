import * as THREE from 'three';
import { Assets } from './Assets';
import { Field, PATH_HALF } from './Field';
import { Rng } from '../sim/rng';
import { fbm } from './glsl';
import { makePineGeometry, makeBushGeometry, makeLeafyGeometry, foliageMaterial, leafMaterial } from './props';

export const KIT_SCALE = 2;

interface Inst { m: THREE.Matrix4; c?: THREE.Color }

/** Collects kit model placements and turns them into one InstancedMesh per model. */
export class KitBatch {
  private items = new Map<string, Inst[]>();
  add(key: string, x: number, y: number, z: number, rotY: number, scale: number, color?: THREE.Color) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(scale, scale, scale));
    if (!this.items.has(key)) this.items.set(key, []);
    this.items.get(key)!.push({ m, c: color });
  }
  build(castShadow = true, foliageShadows = true): THREE.Group {
    const g = new THREE.Group();
    for (const [key, list] of this.items) {
      const custom = customGeometry(key);
      const geo = custom ?? Assets.geometry(key);
      const im = new THREE.InstancedMesh(geo, custom ? (key.startsWith('oak') || key.startsWith('bush') ? leafMaterial : foliageMaterial) : Assets.kitMaterial, list.length);
      const white = new THREE.Color(1, 1, 1);
      list.forEach((it, i) => { im.setMatrixAt(i, it.m); im.setColorAt(i, it.c ?? white); });
      im.castShadow = castShadow && (foliageShadows || (!custom && !key.startsWith('rock') && !key.startsWith('tree')));
      im.receiveShadow = true;
      im.computeBoundingSphere();
      g.add(im);
    }
    return g;
  }
}

const customCache = new Map<string, THREE.BufferGeometry>();
/** Procedural foliage keys: pine0..3, spine0..3 (snowy), oak0..3 (broadleaf), bush0..2 */
function customGeometry(key: string): THREE.BufferGeometry | null {
  if (!/^(pine|spine|bush|oak)\d$/.test(key)) return null;
  let g = customCache.get(key);
  if (!g) {
    const v = +key.slice(-1);
    g = key.startsWith('bush') ? makeBushGeometry(v) : key.startsWith('oak') ? makeLeafyGeometry(v) : makePineGeometry(v, key.startsWith('spine'));
    customCache.set(key, g);
  }
  return g;
}

export function buildDecor(field: Field, occupied: { x: number; z: number; r: number }[], opts: { forest?: number; foliageShadows?: boolean } = {}) {
  const rng = new Rng(field.level.seed + 4242);
  const look = field.look;
  const lv = field.level;
  const batch = new KitBatch();
  const occ = [...occupied];
  const tint = new THREE.Color(look.treeTint);
  const isFree = (x: number, z: number, r: number) => !occ.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + r) ** 2);
  const take = (x: number, z: number, r: number) => occ.push({ x, z, r });

  for (const s of lv.slots) take(s.x, s.z, 1.9);
  take(lv.gate.x, lv.gate.z, 5);

  // ---- village around the gate (beyond the top edge)
  const gx = lv.gate.x, gz = lv.gate.z;
  const dirIn = { x: Math.sin(lv.gate.angle), z: Math.cos(lv.gate.angle) }; // direction into the play field
  const back = { x: -dirIn.x, z: -dirIn.z };
  const side = { x: dirIn.z, z: -dirIn.x };
  const castleX = gx + back.x * 5, castleZ = gz + back.z * 5;
  batch.add('castle', castleX, field.height(castleX, castleZ), castleZ, lv.gate.angle, KIT_SCALE * 1.25);
  take(castleX, castleZ, 4);
  // walls with a gate on the road
  const wallR = lv.gate.angle;
  batch.add('wall_gate', gx + back.x * 1.2, 0, gz + back.z * 1.2, wallR, KIT_SCALE);
  for (const sgn of [-1, 1]) {
    for (let k = 1; k <= 4; k++) {
      const wx = gx + back.x * 1.2 + side.x * sgn * k * 2 * KIT_SCALE * 0.98;
      const wz = gz + back.z * 1.2 + side.z * sgn * k * 2 * KIT_SCALE * 0.98;
      batch.add('wall', wx, field.height(wx, wz) * 0.3, wz, wallR, KIT_SCALE);
      take(wx, wz, 2);
    }
  }
  const houses = ['home_a', 'home_b', 'tavern', 'blacksmith', 'windmill', 'market', 'church', 'well', 'home_a', 'home_b', 'lumbermill', 'home_b'];
  for (let i = 0; i < houses.length; i++) {
    for (let t = 0; t < 30; t++) {
      const a = rng.range(-1.2, 1.2);
      const dist = rng.range(7, 16);
      const hx = castleX + back.x * Math.cos(a) * dist * 0.6 + side.x * Math.sin(a) * dist;
      const hz = castleZ + back.z * Math.cos(a) * dist * 0.6 + side.z * Math.sin(a) * dist;
      if (field.inPlay(hx, hz, -0.5) || !isFree(hx, hz, 2.2) || field.pathDist(hx, hz) < 3) continue;
      batch.add(houses[i], hx, field.height(hx, hz), hz, lv.gate.angle + rng.range(-0.5, 0.5), KIT_SCALE * rng.range(1.05, 1.25));
      take(hx, hz, 2.2);
      break;
    }
  }

  // ---- enemy camp at each path start
  for (const p of field.paths) {
    const sx = p.xs[0], sz = p.zs[0];
    const dx = p.xs[3] - sx, dz = p.zs[3] - sz;
    const l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l, nz = dx / l;
    for (let k = 0; k < 5; k++) {
      const s = k % 2 ? 1 : -1;
      const off = 3.4 + rng.range(0, 3);
      const along = rng.range(-2, 3);
      const tx = sx + nx * off * s - (dx / l) * along, tz = sz + nz * off * s - (dz / l) * along;
      if (field.inPlay(tx, tz, -1) || !isFree(tx, tz, 1)) continue;
      batch.add(k === 2 ? 'flag_red' : 'tent', tx, field.height(tx, tz), tz, rng.range(0, 6), KIT_SCALE * (k === 2 ? 3 : 2.4));
      take(tx, tz, 1.4);
    }
  }

  // ---- trees: sparse inside, dense around the field
  const treeKeys = look.trees;
  const inside = Math.round(lv.width * lv.height * 0.018);
  for (let i = 0, tries = 0; i < inside && tries < 800; tries++) {
    const x = rng.range(-field.hw + 1, field.hw - 1), z = rng.range(-field.hh + 1, field.hh - 1);
    if (field.pathDist(x, z) < PATH_HALF + 2.2 || !isFree(x, z, 1.1)) continue;
    batch.add(rng.pick(treeKeys), x, field.height(x, z), z, rng.range(0, 6.28), KIT_SCALE * rng.range(1.3, 2.0) * (treeKeys[0].includes('pine') ? 1.15 : 1), tint);
    take(x, z, 1.1);
    i++;
  }
  const ringCount = Math.round((look.border === 'canyon' || look.border === 'ash' ? 160 : look.border === 'coast' ? 220 : 420) * (opts.forest ?? 1));
  for (let i = 0, tries = 0; i < ringCount && tries < ringCount * 6; tries++) {
    const x = rng.range(field.minX + 6, -field.minX - 6), z = rng.range(field.minZ + 6, -field.minZ - 6);
    const out = field.outside(x, z);
    if (out < 0.3 || out > 26) continue;
    if (look.border === 'coast' && x < -field.hw) continue;
    const dens = fbm(x * 0.09, z * 0.09);
    if (dens < 0.38 && rng.chance(0.7)) continue;
    if (field.pathDist(x, z) < PATH_HALF + 1.5 || !isFree(x, z, 1.2)) continue;
    const y = field.height(x, z);
    const key = rng.pick(treeKeys);
    batch.add(key, x, y - 0.1, z, rng.range(0, 6.28), KIT_SCALE * rng.range(1.4, 2.4) * (key.includes('pine') ? 1.3 : key.startsWith('bush') ? 1.6 : key.startsWith('oak') ? 1.45 : 1.25), tint);
    take(x, z, 1.2);
    i++;
  }

  // ---- rocks
  const rockTint = new THREE.Color(look.rock).multiplyScalar(1.25);
  for (let i = 0, tries = 0; i < 70 && tries < 900; tries++) {
    const inF = rng.chance(0.45);
    const x = inF ? rng.range(-field.hw, field.hw) : rng.range(-field.hw - 14, field.hw + 14);
    const z = inF ? rng.range(-field.hh, field.hh) : rng.range(-field.hh - 14, field.hh + 14);
    if (field.pathDist(x, z) < PATH_HALF + 0.6 || !isFree(x, z, 0.6)) continue;
    const big = !inF && rng.chance(0.4);
    batch.add(rng.pick(['rock_a', 'rock_b', 'rock_c', 'rock_d', 'rock_e']), x, field.height(x, z) - 0.05, z, rng.range(0, 6.28), KIT_SCALE * (big ? rng.range(3, 6) : rng.range(1.0, 1.9)), rockTint);
    take(x, z, 0.6);
    i++;
  }

  // ---- distant mountains for snow/canyon
  if (look.border === 'snow' || look.border === 'canyon' || look.border === 'ash') {
    for (let i = 0; i < 26; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = Math.max(field.hw, field.hh) + rng.range(14, 26);
      const x = Math.cos(a) * r * 0.8, z = Math.sin(a) * r;
      if (z > field.hh + 8 || x < -field.hw - 8) continue; // keep both camera sides open
      batch.add(look.border === 'snow' ? 'mountain_a_bare' : rng.pick(['mountain_a', 'mountain_b', 'mountain_c']), x, field.height(x, z) - 1, z, rng.range(0, 6.28), KIT_SCALE * rng.range(4, 7), look.snow ? new THREE.Color(0xe8eef4) : new THREE.Color(look.border === 'ash' ? 0x8a7a70 : 0xc4c0a8));
    }
  }

  // ---- props near the village & slots
  for (let i = 0; i < 18; i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(4, 9);
    const x = castleX + Math.cos(a) * r, z = castleZ + Math.sin(a) * r;
    if (field.inPlay(x, z, -0.5) || !isFree(x, z, 0.4) || field.pathDist(x, z) < 2) continue;
    batch.add(rng.pick(['barrel', 'crate_a', 'crate_b', 'sack', 'lumber', 'stone', 'wheelbarrow', 'weaponrack']), x, field.height(x, z), z, rng.range(0, 6.28), KIT_SCALE * 1.6);
    take(x, z, 0.4);
  }

  return batch.build(true, opts.foliageShadows ?? true);
}
