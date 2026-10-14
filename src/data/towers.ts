export type DmgType = 'phys' | 'magic' | 'fire' | 'true';
export type ProjectileKind = 'arrow' | 'bolt' | 'boulder' | 'orb' | 'lightning' | 'flame' | 'firebolt' | 'none';

export interface TowerStats {
  cost: number;
  range: number;
  dmg: [number, number];
  /** attacks per second */
  rate: number;
  dmgType: DmgType;
  projectile: ProjectileKind;
  speed?: number;
  splash?: number;
  pierce?: number;
  multishot?: number;
  chain?: number;
  slow?: { amt: number; dur: number };
  burn?: { dps: number; dur: number };
  stun?: { chance: number; dur: number };
  crit?: { chance: number; mul: number };
  /** barracks */
  soldiers?: { count: number; hp: number; dmg: [number, number]; armor: number; respawn: number; vsLarge?: number; model: string };
  /** support aura */
  aura?: { rateMul?: number; dmgMul?: number; goldMul?: number; income?: number };
  /** continuous area damage (brazier) */
  pulse?: boolean;
}

export interface TowerBranch extends TowerStats { id: string }

export interface TowerDef {
  id: string;
  unlockLevel: number;
  /** model key in the kit + top decoration kind */
  look: 'archer' | 'ballista' | 'barracks' | 'catapult' | 'mage' | 'brazier' | 'bell' | 'dragon';
  levels: [TowerStats, TowerStats, TowerStats];
  branches: [TowerBranch, TowerBranch] | [];
  /** only obtainable through rewarded ads (3/3) */
  unique?: boolean;
  shopPrice?: number;
}

export const TOWERS: Record<string, TowerDef> = {
  archer: {
    id: 'archer', unlockLevel: 1, look: 'archer', shopPrice: 0,
    levels: [
      { cost: 70, range: 7, dmg: [5, 8], rate: 1.4, dmgType: 'phys', projectile: 'arrow', speed: 16 },
      { cost: 110, range: 7.6, dmg: [9, 13], rate: 1.5, dmgType: 'phys', projectile: 'arrow', speed: 17 },
      { cost: 160, range: 8.4, dmg: [14, 20], rate: 1.65, dmgType: 'phys', projectile: 'arrow', speed: 18 },
    ],
    branches: [
      { id: 'marksman', cost: 240, range: 11, dmg: [42, 60], rate: 0.85, dmgType: 'phys', projectile: 'arrow', speed: 26, crit: { chance: 0.22, mul: 3 } },
      { id: 'volley', cost: 240, range: 8.6, dmg: [15, 21], rate: 1.8, dmgType: 'phys', projectile: 'arrow', speed: 18, multishot: 3 },
    ],
  },
  ballista: {
    id: 'ballista', unlockLevel: 2, look: 'ballista', shopPrice: 300,
    levels: [
      { cost: 100, range: 9, dmg: [20, 30], rate: 0.45, dmgType: 'phys', projectile: 'bolt', speed: 30, pierce: 3 },
      { cost: 150, range: 9.6, dmg: [34, 48], rate: 0.5, dmgType: 'phys', projectile: 'bolt', speed: 32, pierce: 4 },
      { cost: 210, range: 10.2, dmg: [52, 72], rate: 0.55, dmgType: 'phys', projectile: 'bolt', speed: 34, pierce: 5 },
    ],
    branches: [
      { id: 'siege', cost: 280, range: 11, dmg: [130, 170], rate: 0.42, dmgType: 'phys', projectile: 'bolt', speed: 36, pierce: 9, stun: { chance: 0.5, dur: 0.6 } },
      { id: 'repeater', cost: 280, range: 10, dmg: [38, 52], rate: 1.6, dmgType: 'phys', projectile: 'bolt', speed: 34, pierce: 2 },
    ],
  },
  barracks: {
    id: 'barracks', unlockLevel: 4, look: 'barracks', shopPrice: 400,
    levels: [
      { cost: 90, range: 5, dmg: [3, 5], rate: 1, dmgType: 'phys', projectile: 'none', soldiers: { count: 3, hp: 55, dmg: [3, 5], armor: 0, respawn: 10, model: 'militia' } },
      { cost: 140, range: 5.5, dmg: [6, 9], rate: 1, dmgType: 'phys', projectile: 'none', soldiers: { count: 3, hp: 95, dmg: [6, 9], armor: 0.15, respawn: 10, model: 'footman_blue' } },
      { cost: 200, range: 6, dmg: [10, 14], rate: 1, dmgType: 'phys', projectile: 'none', soldiers: { count: 3, hp: 150, dmg: [10, 14], armor: 0.3, respawn: 9, model: 'footman_blue' } },
    ],
    branches: [
      { id: 'knights', cost: 260, range: 6, dmg: [20, 28], rate: 1, dmgType: 'phys', projectile: 'none', soldiers: { count: 3, hp: 320, dmg: [20, 28], armor: 0.5, respawn: 12, model: 'knight_blue' } },
      { id: 'pikemen', cost: 260, range: 6.5, dmg: [14, 20], rate: 1, dmgType: 'phys', projectile: 'none', soldiers: { count: 4, hp: 200, dmg: [14, 20], armor: 0.3, respawn: 10, vsLarge: 3, model: 'pikeman_blue' } },
    ],
  },
  catapult: {
    id: 'catapult', unlockLevel: 6, look: 'catapult', shopPrice: 500,
    levels: [
      { cost: 120, range: 9, dmg: [18, 30], rate: 0.33, dmgType: 'phys', projectile: 'boulder', speed: 11, splash: 2.2 },
      { cost: 180, range: 10, dmg: [30, 50], rate: 0.36, dmgType: 'phys', projectile: 'boulder', speed: 11, splash: 2.4 },
      { cost: 250, range: 11, dmg: [50, 80], rate: 0.4, dmgType: 'phys', projectile: 'boulder', speed: 12, splash: 2.6 },
    ],
    branches: [
      { id: 'firepots', cost: 300, range: 11, dmg: [60, 90], rate: 0.42, dmgType: 'fire', projectile: 'boulder', speed: 12, splash: 3.1, burn: { dps: 18, dur: 4 } },
      { id: 'quake', cost: 300, range: 11.5, dmg: [120, 180], rate: 0.36, dmgType: 'phys', projectile: 'boulder', speed: 12, splash: 2.8, stun: { chance: 1, dur: 1 } },
    ],
  },
  mage: {
    id: 'mage', unlockLevel: 9, look: 'mage', shopPrice: 650,
    levels: [
      { cost: 110, range: 7.5, dmg: [14, 24], rate: 0.7, dmgType: 'magic', projectile: 'orb', speed: 13 },
      { cost: 170, range: 8, dmg: [26, 42], rate: 0.75, dmgType: 'magic', projectile: 'orb', speed: 14 },
      { cost: 240, range: 8.6, dmg: [44, 70], rate: 0.8, dmgType: 'magic', projectile: 'orb', speed: 15 },
    ],
    branches: [
      { id: 'storm', cost: 300, range: 9, dmg: [60, 90], rate: 0.75, dmgType: 'magic', projectile: 'lightning', chain: 4 },
      { id: 'frost', cost: 300, range: 9, dmg: [40, 62], rate: 0.85, dmgType: 'magic', projectile: 'orb', speed: 15, splash: 1.6, slow: { amt: 0.5, dur: 2 } },
    ],
  },
  brazier: {
    id: 'brazier', unlockLevel: 12, look: 'brazier', shopPrice: 750,
    levels: [
      { cost: 100, range: 4.5, dmg: [10, 10], rate: 2, dmgType: 'fire', projectile: 'flame', pulse: true },
      { cost: 150, range: 5, dmg: [18, 18], rate: 2, dmgType: 'fire', projectile: 'flame', pulse: true },
      { cost: 220, range: 5.5, dmg: [30, 30], rate: 2, dmgType: 'fire', projectile: 'flame', pulse: true },
    ],
    branches: [
      { id: 'inferno', cost: 280, range: 6.2, dmg: [55, 55], rate: 2, dmgType: 'fire', projectile: 'flame', pulse: true },
      { id: 'oil', cost: 280, range: 6, dmg: [36, 36], rate: 2, dmgType: 'fire', projectile: 'flame', pulse: true, slow: { amt: 0.35, dur: 0.8 } },
    ],
  },
  bell: {
    id: 'bell', unlockLevel: 15, look: 'bell', shopPrice: 900,
    levels: [
      { cost: 130, range: 6, dmg: [0, 0], rate: 0, dmgType: 'phys', projectile: 'none', aura: { rateMul: 1.1 } },
      { cost: 200, range: 6.5, dmg: [0, 0], rate: 0, dmgType: 'phys', projectile: 'none', aura: { rateMul: 1.15 } },
      { cost: 280, range: 7, dmg: [0, 0], rate: 0, dmgType: 'phys', projectile: 'none', aura: { rateMul: 1.2 } },
    ],
    branches: [
      { id: 'drums', cost: 300, range: 7.5, dmg: [0, 0], rate: 0, dmgType: 'phys', projectile: 'none', aura: { rateMul: 1.2, dmgMul: 1.3 } },
      { id: 'treasury', cost: 300, range: 7.5, dmg: [0, 0], rate: 0, dmgType: 'phys', projectile: 'none', aura: { rateMul: 1.2, goldMul: 1.5, income: 3 } },
    ],
  },
  dragon: {
    id: 'dragon', unlockLevel: 1, look: 'dragon', unique: true,
    levels: [
      { cost: 260, range: 7.5, dmg: [30, 40], rate: 1.1, dmgType: 'fire', projectile: 'firebolt', speed: 18, splash: 1.6, burn: { dps: 14, dur: 3 } },
      { cost: 360, range: 8.5, dmg: [55, 70], rate: 1.2, dmgType: 'fire', projectile: 'firebolt', speed: 19, splash: 1.9, burn: { dps: 24, dur: 3 } },
      { cost: 480, range: 9.5, dmg: [90, 120], rate: 1.3, dmgType: 'fire', projectile: 'firebolt', speed: 20, splash: 2.2, burn: { dps: 40, dur: 3 } },
    ],
    branches: [],
  },
};

export const TOWER_ORDER = ['archer', 'ballista', 'barracks', 'catapult', 'mage', 'brazier', 'bell', 'dragon'];

/** Stats for a tower at level index 0..3 (3 = specialization). */
export function towerStats(def: TowerDef, level: number, branch: number): TowerStats {
  if (level >= 3 && def.branches.length) return def.branches[branch];
  return def.levels[Math.min(level, 2)];
}
