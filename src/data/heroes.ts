import type { DmgType } from './towers';

export interface AbilityDef {
  id: string;
  cooldown: number;
  /** needs a target point on the map */
  targeted: boolean;
  radius?: number;
  dmg?: number;
  dmgType?: DmgType;
  stun?: number;
  slow?: { amt: number; dur: number };
  heal?: number;
  ticks?: number;
}

export interface HeroDef {
  id: string;
  model: string;
  hp: number;
  armor: number;
  speed: number;
  range: number;
  dmg: [number, number];
  rate: number;
  dmgType: DmgType;
  projectile: 'arrow' | 'orb' | 'none';
  abilities: [AbilityDef, AbilityDef];
  price: number;
  unique?: boolean;
  /** clip names in the VAT model */
  attackClip: string;
}

export const HEROES: Record<string, HeroDef> = {
  ranger: {
    id: 'ranger', model: 'hero_ranger', hp: 320, armor: 0.15, speed: 4.2, range: 6.5, dmg: [12, 18], rate: 1.2, dmgType: 'phys', projectile: 'arrow', price: 0, attackClip: 'shoot',
    abilities: [
      { id: 'volley', cooldown: 14, targeted: true, radius: 2.6, dmg: 22, dmgType: 'phys', ticks: 6 },
      { id: 'caltrops', cooldown: 18, targeted: true, radius: 2.4, slow: { amt: 0.55, dur: 5 }, dmg: 8, dmgType: 'phys' },
    ],
  },
  paladin: {
    id: 'paladin', model: 'hero_paladin', hp: 700, armor: 0.45, speed: 3.6, range: 1.6, dmg: [24, 34], rate: 1, dmgType: 'phys', projectile: 'none', price: 1800, attackClip: 'attack',
    abilities: [
      { id: 'slam', cooldown: 12, targeted: false, radius: 2.4, dmg: 60, dmgType: 'phys', stun: 1.5 },
      { id: 'blessing', cooldown: 20, targeted: false, radius: 5, heal: 200 },
    ],
  },
  sorceress: {
    id: 'sorceress', model: 'hero_sorceress', hp: 260, armor: 0, speed: 3.9, range: 7, dmg: [24, 34], rate: 0.85, dmgType: 'magic', projectile: 'orb', price: 2600, attackClip: 'cast',
    abilities: [
      { id: 'fireball', cooldown: 13, targeted: true, radius: 2.4, dmg: 160, dmgType: 'fire' },
      { id: 'frostnova', cooldown: 18, targeted: false, radius: 3.4, dmg: 40, dmgType: 'magic', stun: 2.5 },
    ],
  },
  jarl: {
    id: 'jarl', model: 'hero_jarl', hp: 900, armor: 0.35, speed: 4, range: 1.8, dmg: [40, 55], rate: 1.1, dmgType: 'phys', projectile: 'none', price: 0, unique: true, attackClip: 'attack',
    abilities: [
      { id: 'whirlwind', cooldown: 10, targeted: false, radius: 2.8, dmg: 45, dmgType: 'phys', ticks: 5 },
      { id: 'warhorn', cooldown: 22, targeted: false, radius: 8, heal: 250 },
    ],
  },
};

export const HERO_ORDER = ['ranger', 'paladin', 'sorceress', 'jarl'];
