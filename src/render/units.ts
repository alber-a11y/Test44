import * as THREE from 'three';
import { bakeCharacter, bakeProcedural, type CharVariantSpec, type ClipSpec, type Recolor, type VatModel } from './vat';
import type { CharKey } from './Assets';

/** Unit height in world units for scale 1 (KayKit characters are ~2.4 tall natively). */
export const CHAR_SCALE = 0.5;

const RED_FROM_GREEN: Recolor = { hues: [[120, 190]], to: 358, satMul: 1.1 };
const RED_FROM_BLUE: Recolor = { hues: [[185, 240]], to: 358, satMul: 1.6, lightMul: 1.05, minSat: 0.12 };
const RED_FROM_PURPLE: Recolor = { hues: [[240, 345]], to: 358, satMul: 1.05 };
const BLUE_FROM_RED: Recolor = { hues: [[330, 20]], to: 214, satMul: 1.0 };
const BLUE_FROM_GREEN: Recolor = { hues: [[120, 190]], to: 214, satMul: 1.0 };
const BLUE_FROM_PURPLE: Recolor = { hues: [[240, 345]], to: 214, satMul: 1.1 };
const BLUE_STRONG: Recolor = { hues: [[185, 240]], to: 212, satMul: 1.7, minSat: 0.12 };
const GOLD_FROM_BLUE: Recolor = { hues: [[185, 240]], to: 44, satMul: 2.4, lightMul: 1.25, minSat: 0.12 };
const DARK_FROM_RED: Recolor = { hues: [[330, 20]], to: 280, satMul: 0.6, lightMul: 0.45 };
const IRON_FROM_RED: Recolor = { hues: [[330, 20]], to: 25, satMul: 0.7, lightMul: 0.7 };

const W = (name: string, frames = 10): ClipSpec => ({ name, frames, loop: true });
const ONCE = (name: string, frames = 10): ClipSpec => ({ name, frames, loop: false });

function enemyClips(walk: string, attack: string): Record<string, ClipSpec> {
  return { walk: W(walk, 12), attack: W(attack, 8), death: ONCE('Death_A', 10), idle: W('Idle', 6) };
}
function allyClips(attack: string): Record<string, ClipSpec> {
  return { walk: W('Running_A', 10), attack: W(attack, 8), death: ONCE('Death_A', 10), idle: W('Idle', 6), cheer: W('Cheer', 8) };
}

type CharDef = Omit<CharVariantSpec, 'key'>;
const C = (char: CharKey, keep: string[], clips: Record<string, ClipSpec>, recolor?: Recolor, scaleParts?: Record<string, number>): CharDef => ({ char, keep, clips, recolor, scaleParts });

export const UNIT_SPECS: Record<string, CharDef | { procedural: 'elephant' | 'rhino' | 'mammoth' }> = {
  // ---- enemies
  footman_red: C('knight', ['1H_Sword', 'Round_Shield', 'Knight_Helmet', 'Knight_Cape'], enemyClips('Walking_A', '1H_Melee_Attack_Chop')),
  runner_red: C('rogue', ['Knife', 'Knife_Offhand', 'Rogue_Cape'], enemyClips('Running_A', '1H_Melee_Attack_Chop'), RED_FROM_GREEN),
  shield_red: C('knight', ['1H_Sword', 'Rectangle_Shield', 'Knight_Helmet', 'Knight_Cape'], enemyClips('Walking_A', '1H_Melee_Attack_Chop'), undefined, { Rectangle_Shield: 1.9 }),
  crossbow_red: C('rogue', ['2H_Crossbow', 'Rogue_Cape'], enemyClips('Walking_A', '2H_Ranged_Shoot'), RED_FROM_GREEN),
  brute_red: C('barbarian', ['2H_Axe', 'Barbarian_Hat', 'Barbarian_Cape'], enemyClips('Walking_A', '2H_Melee_Attack_Chop'), RED_FROM_BLUE),
  shaman_red: C('mage', ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], enemyClips('Walking_A', 'Spellcast_Shoot'), RED_FROM_PURPLE),
  berserker_red: C('barbarian', ['1H_Axe', '1H_Axe_Offhand', 'Barbarian_Cape'], enemyClips('Running_A', '1H_Melee_Attack_Chop'), RED_FROM_BLUE),
  sk_minion: C('skel_minion', [], enemyClips('Walking_D_Skeletons', '1H_Melee_Attack_Chop')),
  sk_warrior: C('skel_warrior', ['Skeleton_Warrior_Helmet'], enemyClips('Walking_D_Skeletons', '1H_Melee_Attack_Chop')),
  sk_rogue: C('skel_rogue', [], enemyClips('Running_A', '1H_Melee_Attack_Chop')),
  sk_mage: C('skel_mage', [], enemyClips('Walking_D_Skeletons', 'Spellcast_Shoot')),
  warlord: C('barbarian', ['2H_Axe', 'Barbarian_Hat', 'Barbarian_Cape'], enemyClips('Walking_A', '2H_Melee_Attack_Chop'), RED_FROM_BLUE),
  ironclad: C('knight', ['2H_Sword', 'Knight_Helmet', 'Knight_Cape', 'Rectangle_Shield'], enemyClips('Walking_A', '2H_Melee_Attack_Chop'), IRON_FROM_RED, { Rectangle_Shield: 1.6 }),
  lich: C('skel_mage', [], enemyClips('Walking_D_Skeletons', 'Spellcast_Shoot')),
  ashking: C('knight', ['2H_Sword', 'Knight_Helmet', 'Knight_Cape'], enemyClips('Walking_A', '2H_Melee_Attack_Chop'), DARK_FROM_RED),
  elephant: { procedural: 'elephant' },
  rhino: { procedural: 'rhino' },
  mammoth: { procedural: 'mammoth' },
  // ---- allies
  militia: C('knight', ['1H_Sword', 'Knight_Cape'], allyClips('1H_Melee_Attack_Chop'), BLUE_FROM_RED),
  footman_blue: C('knight', ['1H_Sword', 'Round_Shield', 'Knight_Helmet', 'Knight_Cape'], allyClips('1H_Melee_Attack_Chop'), BLUE_FROM_RED),
  knight_blue: C('knight', ['1H_Sword', 'Badge_Shield', 'Knight_Helmet', 'Knight_Cape'], allyClips('1H_Melee_Attack_Chop'), BLUE_FROM_RED, { Badge_Shield: 1.2 }),
  pikeman_blue: C('knight', ['2H_Sword', 'Knight_Helmet', 'Knight_Cape'], allyClips('2H_Melee_Attack_Chop'), BLUE_FROM_RED),
  hero_ranger: C('rogue', ['1H_Crossbow', 'Rogue_Cape'], { ...allyClips('1H_Ranged_Shoot'), shoot: W('1H_Ranged_Shoot', 8) }, BLUE_FROM_GREEN),
  hero_paladin: C('knight', ['1H_Sword', 'Badge_Shield', 'Knight_Helmet', 'Knight_Cape'], allyClips('1H_Melee_Attack_Chop'), { hues: [[330, 20]], to: 46, satMul: 1.3, lightMul: 1.15 }),
  hero_sorceress: C('mage', ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], { ...allyClips('Spellcast_Shoot'), cast: W('Spellcast_Shoot', 8) }, BLUE_FROM_PURPLE),
  hero_jarl: C('barbarian', ['2H_Axe', 'Barbarian_Hat', 'Barbarian_Cape'], allyClips('2H_Melee_Attack_Chop'), GOLD_FROM_BLUE),
  tower_archer: C('rogue', ['2H_Crossbow', 'Rogue_Cape'], { idle: W('Idle', 6), shoot: W('2H_Ranged_Shoot', 8) }, BLUE_FROM_GREEN),
  tower_mage: C('mage', ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], { idle: W('Idle', 6), shoot: W('Spellcast_Shoot', 8) }, BLUE_FROM_PURPLE),
  villager: C('barbarian', ['Mug'], { idle: W('Idle', 6), cheer: W('Cheer', 8), walk: W('Walking_A', 12) }, BLUE_STRONG),
};

const cache = new Map<string, VatModel>();

export function getUnitModel(key: string): VatModel {
  const hit = cache.get(key);
  if (hit) return hit;
  const spec = UNIT_SPECS[key];
  if (!spec) throw new Error('unknown unit model ' + key);
  let model: VatModel;
  if ('procedural' in spec) model = buildBeast(key, spec.procedural);
  else model = bakeCharacter({ key, ...spec });
  cache.set(key, model);
  return model;
}

// =================================================================================================
// Procedural beasts (low-poly, vertex coloured, baked into VAT like the characters)

interface Part {
  geo: THREE.BufferGeometry;
  color: THREE.Color;
  /** local transform of the part at time t (0..1) of a clip */
  pose: (clip: string, t: number, m: THREE.Matrix4) => void;
}

function colored(geo: THREE.BufferGeometry, color: number | THREE.Color, jitter = 0.06): { geo: THREE.BufferGeometry; color: THREE.Color } {
  const g = geo.index ? geo.toNonIndexed() : geo;
  return { geo: g, color: new THREE.Color(color as any).multiplyScalar(1 - jitter / 2) };
}

function buildBeast(key: string, kind: 'elephant' | 'rhino' | 'mammoth'): VatModel {
  const parts: Part[] = [];
  const isRhino = kind === 'rhino';
  const isMammoth = kind === 'mammoth';
  const skin = isRhino ? 0x8f8478 : isMammoth ? 0x6b4a32 : 0x8c8a8a;
  const skinDark = isRhino ? 0x6f665c : isMammoth ? 0x4f3524 : 0x6e6c6e;
  const cloth = 0xb3242a, clothTrim = 0xe0b24a, wood = 0x7a5232, metal = 0xa9adb3, ivory = 0xf1e8d4;

  const L = isRhino ? 1.0 : 1.2; // body half length
  const bodyH = isRhino ? 1.05 : 1.45;
  const legH = isRhino ? 0.65 : 1.0;
  const legR = isRhino ? 0.2 : 0.27;

  const walk = (clip: string, t: number) => (clip === 'walk' ? t * Math.PI * 2 : 0);
  const deathTilt = (clip: string, t: number) => (clip === 'death' ? Math.min(1, t * 1.4) : 0);
  const bodyMat = (clip: string, t: number, m: THREE.Matrix4) => {
    const ph = walk(clip, t);
    const d = deathTilt(clip, t);
    const bob = clip === 'walk' ? Math.abs(Math.sin(ph)) * 0.06 : 0;
    m.makeRotationZ(d * 1.35).premultiply(new THREE.Matrix4().makeTranslation(0, bob - d * 0.55, 0));
    m.multiply(new THREE.Matrix4().makeRotationX(clip === 'walk' ? Math.sin(ph * 2) * 0.015 : 0));
  };
  const add = (geo: THREE.BufferGeometry, color: number, local: THREE.Matrix4, anim?: (clip: string, t: number, m: THREE.Matrix4) => void) => {
    const { geo: g, color: c } = colored(geo, color);
    g.applyMatrix4(local);
    parts.push({
      geo: g, color: c,
      pose: (clip, t, m) => {
        bodyMat(clip, t, m);
        if (anim) { const a = new THREE.Matrix4(); anim(clip, t, a); m.multiply(a); }
      },
    });
  };
  const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
  const S = (x: number, y: number, z: number) => new THREE.Matrix4().makeScale(x, y, z);
  const RX = (a: number) => new THREE.Matrix4().makeRotationX(a);
  const RZ = (a: number) => new THREE.Matrix4().makeRotationZ(a);
  const RY = (a: number) => new THREE.Matrix4().makeRotationY(a);
  const mul = (...ms: THREE.Matrix4[]) => ms.reduce((a, b) => a.multiply(b), new THREE.Matrix4());

  // body (front is +Z)
  const body = new THREE.SphereGeometry(1, 14, 10);
  add(body, skin, mul(T(0, legH + bodyH * 0.38, 0), S(isRhino ? 0.62 : 0.78, bodyH * 0.45, L)));
  // belly darker
  add(new THREE.SphereGeometry(1, 10, 6), skinDark, mul(T(0, legH + bodyH * 0.22, 0), S(isRhino ? 0.55 : 0.7, bodyH * 0.3, L * 0.85)));
  // legs: hip pivot rotation
  const legPos: [number, number, number][] = [[-0.38, 0, L * 0.6], [0.38, 0, L * 0.6], [-0.38, 0, -L * 0.6], [0.38, 0, -L * 0.6]];
  if (isRhino) legPos.forEach((p) => (p[0] *= 0.8));
  legPos.forEach(([x, , z], i) => {
    const leg = new THREE.CylinderGeometry(legR, legR * 1.12, legH + 0.3, 8);
    leg.translate(0, -(legH + 0.3) / 2, 0);
    const hipY = legH + 0.25;
    const phase = i === 0 || i === 3 ? 0 : Math.PI;
    add(leg, skinDark, new THREE.Matrix4(), (clip, t, m) => {
      const sw = clip === 'walk' ? Math.sin(t * Math.PI * 2 + phase) * 0.42 : clip === 'death' ? Math.min(1, t * 1.4) * 0.3 * (i % 2 ? 1 : -1) : 0;
      m.copy(mul(T(x, hipY, z), RX(sw)));
    });
    // foot nails
    const foot = new THREE.CylinderGeometry(legR * 1.15, legR * 1.2, 0.12, 8);
    foot.translate(0, -(legH + 0.3) + 0.06, 0);
    add(foot, ivory, new THREE.Matrix4(), (clip, t, m) => {
      const sw = clip === 'walk' ? Math.sin(t * Math.PI * 2 + phase) * 0.42 : clip === 'death' ? Math.min(1, t * 1.4) * 0.3 * (i % 2 ? 1 : -1) : 0;
      m.copy(mul(T(x, hipY, z), RX(sw)));
    });
  });
  // head
  const headY = legH + bodyH * (isRhino ? 0.32 : 0.58);
  const headZ = L * (isRhino ? 1.0 : 0.95);
  const headAnim = (clip: string, t: number, m: THREE.Matrix4) => {
    const nod = clip === 'walk' ? Math.sin(t * Math.PI * 4) * 0.05 : 0;
    m.copy(mul(T(0, headY, headZ), RX(nod + (isRhino ? 0.25 : 0))));
  };
  add(new THREE.SphereGeometry(1, 12, 9), skin, S(isRhino ? 0.42 : 0.55, isRhino ? 0.38 : 0.55, isRhino ? 0.6 : 0.5), headAnim);
  if (isRhino) {
    // snout + horns
    add(new THREE.SphereGeometry(1, 10, 8), skin, mul(T(0, -0.08, 0.5), S(0.3, 0.26, 0.38)), headAnim);
    add(new THREE.ConeGeometry(0.13, 0.62, 8), ivory, mul(T(0, 0.28, 0.72), RX(0.35)), headAnim);
    add(new THREE.ConeGeometry(0.08, 0.3, 7), ivory, mul(T(0, 0.3, 0.38), RX(0.2)), headAnim);
    // ears
    for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.09, 0.22, 6), skinDark, mul(T(0.2 * s, 0.34, -0.25), RZ(-0.4 * s)), headAnim);
    // armour plates
    add(new THREE.CylinderGeometry(0.75, 0.75, 1.3, 10, 1, true, -Math.PI / 2 - 0.9, 1.8), metal, mul(T(0, legH + bodyH * 0.45, 0.1), RX(Math.PI / 2), S(0.9, 1, 0.85)));
    add(new THREE.BoxGeometry(1.0, 0.08, 0.9), cloth, T(0, legH + bodyH * 0.84, -0.2));
  } else {
    // ears
    for (const s of [-1, 1]) {
      const ear = new THREE.CircleGeometry(0.55, 10);
      add(ear, skinDark, mul(T(0.42 * s, 0.1, -0.12), RY(s * 1.2), S(0.85, 1, 1)), (clip, t, m) => {
        headAnim(clip, t, m);
        const flap = clip === 'walk' ? Math.sin(t * Math.PI * 2) * 0.15 * s : 0;
        m.multiply(RY(flap));
      });
      add(new THREE.CircleGeometry(0.55, 10), skinDark, mul(T(0.42 * s, 0.1, -0.12), RY(s * 1.2 + Math.PI), S(0.85, 1, 1)), headAnim);
    }
    // tusks
    for (const s of [-1, 1]) {
      const tusk = new THREE.ConeGeometry(0.07, isMammoth ? 1.2 : 0.75, 7);
      tusk.translate(0, (isMammoth ? 0.6 : 0.37), 0);
      add(tusk, ivory, mul(T(0.22 * s, -0.25, 0.3), RX(isMammoth ? 1.2 : 1.55), RZ(0.15 * s)), headAnim);
    }
    // trunk: segments with sway
    const segs = 5;
    for (let k = 0; k < segs; k++) {
      const r0 = 0.17 - k * 0.022;
      const seg = new THREE.CylinderGeometry(r0 * 0.9, r0, 0.3, 8);
      seg.translate(0, -0.15, 0);
      add(seg, skin, new THREE.Matrix4(), (clip, t, m) => {
        headAnim(clip, t, m);
        m.multiply(T(0, -0.15, 0.42));
        const sway = clip === 'walk' ? Math.sin(t * Math.PI * 2 + 1) * 0.12 : 0.05;
        for (let j = 0; j <= k; j++) {
          m.multiply(RX(0.18 + j * 0.06)).multiply(RZ(sway));
          if (j < k) m.multiply(T(0, -0.28, 0));
        }
      });
    }
    // war saddle + howdah
    const backY = legH + bodyH * 0.8;
    add(new THREE.BoxGeometry(1.45, 0.12, 1.5), cloth, T(0, backY, -0.05));
    add(new THREE.BoxGeometry(1.5, 0.06, 1.55), clothTrim, T(0, backY - 0.05, -0.05));
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.75, 1.3), cloth, T(0.72 * s, backY - 0.4, -0.05));
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.07, 0.1, 1.32), clothTrim, T(0.73 * s, backY - 0.76, -0.05));
    if (!isMammoth) {
      add(new THREE.BoxGeometry(0.95, 0.5, 0.95), wood, T(0, backY + 0.3, -0.15));
      add(new THREE.BoxGeometry(1.05, 0.08, 1.05), clothTrim, T(0, backY + 0.56, -0.15));
      for (const [x, z] of [[-0.45, -0.6], [0.45, -0.6], [-0.45, 0.3], [0.45, 0.3]]) add(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), wood, T(x, backY + 0.85, z));
      add(new THREE.ConeGeometry(0.85, 0.5, 4), cloth, mul(T(0, backY + 1.4, -0.15), RY(Math.PI / 4)));
      // head armour
      add(new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), metal, mul(S(0.5, 0.35, 0.5), T(0, 0.6, 0.15)), headAnim);
    } else {
      // fur hump
      add(new THREE.SphereGeometry(1, 10, 8), skinDark, mul(T(0, legH + bodyH * 0.95, 0.5), S(0.6, 0.45, 0.6)));
    }
  }
  // tail
  add(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 5), skinDark, new THREE.Matrix4(), (clip, t, m) => {
    m.copy(mul(T(0, legH + bodyH * 0.55, -L * 0.98), RX(-2.6 + (clip === 'walk' ? Math.sin(t * Math.PI * 4) * 0.25 : 0)), T(0, 0.3, 0)));
  });

  // assemble
  let vCount = 0;
  for (const p of parts) vCount += p.geo.getAttribute('position').count;
  const uv = new Float32Array(vCount * 2);
  const colors = new Float32Array(vCount * 3);
  const indices: number[] = [];
  let o = 0;
  const tmpC = new THREE.Color();
  for (const p of parts) {
    const n = p.geo.getAttribute('position').count;
    for (let i = 0; i < n; i++) {
      tmpC.copy(p.color).multiplyScalar(0.94 + ((i * 7919) % 13) / 13 * 0.12);
      colors[(o + i) * 3] = tmpC.r; colors[(o + i) * 3 + 1] = tmpC.g; colors[(o + i) * 3 + 2] = tmpC.b;
      indices.push(o + i);
    }
    o += n;
  }
  const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  const scale = isMammoth ? 1.25 : 1;
  const model = bakeProcedural(
    key,
    { uv, indices, vertexCount: vCount, colors },
    { walk: { frames: 12, loop: true, duration: 1.4 }, death: { frames: 10, loop: false, duration: 1.2 }, idle: { frames: 1, loop: true, duration: 1 }, attack: { frames: 1, loop: true, duration: 1 } },
    (clip, t, outP, outN) => {
      let off = 0;
      for (const p of parts) {
        m.identity();
        p.pose(clip === 'idle' || clip === 'attack' ? 'walk' : clip, clip === 'idle' || clip === 'attack' ? 0 : t, m);
        m.premultiply(new THREE.Matrix4().makeScale(scale, scale, scale));
        nm.getNormalMatrix(m);
        const pa = p.geo.getAttribute('position'), na = p.geo.getAttribute('normal');
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(m);
          outP[(off + i) * 3] = v.x; outP[(off + i) * 3 + 1] = v.y; outP[(off + i) * 3 + 2] = v.z;
          v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
          outN[(off + i) * 3] = v.x; outN[(off + i) * 3 + 1] = v.y; outN[(off + i) * 3 + 2] = v.z;
        }
        off += pa.count;
      }
    },
    null,
  );
  return model;
}
