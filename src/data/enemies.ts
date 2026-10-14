export interface EnemyDef {
  id: string;
  model: string;
  scale: number;
  hp: number;
  armor: number;
  mres: number;
  speed: number;
  lives: number;
  bounty: number;
  radius: number;
  melee?: { dmg: [number, number]; rate: number };
  ranged?: { dmg: [number, number]; rate: number; range: number };
  /** cannot be blocked by soldiers; damages them on contact */
  trample?: boolean;
  large?: boolean;
  /** reduces damage of arrows/bolts coming from the front */
  shieldFront?: boolean;
  healer?: { amount: number; radius: number; every: number };
  summoner?: { enemy: string; count: number; every: number };
  charge?: { speedMul: number; every: number; dur: number };
  rage?: { below: number; speedMul: number };
  warcry?: { radius: number; every: number; speedMul: number; dur: number };
  boss?: boolean;
  /** first level where it appears – used by the generator & bestiary */
  intro: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  footman: { id: 'footman', model: 'footman_red', scale: 1, hp: 60, armor: 0.1, mres: 0, speed: 1.6, lives: 1, bounty: 6, radius: 0.35, melee: { dmg: [3, 6], rate: 1 }, intro: 1 },
  runner: { id: 'runner', model: 'runner_red', scale: 0.95, hp: 34, armor: 0, mres: 0, speed: 2.8, lives: 1, bounty: 5, radius: 0.3, melee: { dmg: [2, 4], rate: 1.3 }, intro: 2 },
  shield: { id: 'shield', model: 'shield_red', scale: 1.05, hp: 110, armor: 0.3, mres: 0, speed: 1.3, lives: 1, bounty: 9, radius: 0.38, melee: { dmg: [4, 7], rate: 0.9 }, shieldFront: true, intro: 3 },
  crossbow: { id: 'crossbow', model: 'crossbow_red', scale: 0.95, hp: 50, armor: 0, mres: 0, speed: 1.5, lives: 1, bounty: 8, radius: 0.32, ranged: { dmg: [6, 10], rate: 0.7, range: 5 }, intro: 5 },
  brute: { id: 'brute', model: 'brute_red', scale: 1.55, hp: 360, armor: 0.4, mres: 0, speed: 1.1, lives: 3, bounty: 28, radius: 0.6, melee: { dmg: [14, 22], rate: 0.7 }, large: true, intro: 7 },
  shaman: { id: 'shaman', model: 'shaman_red', scale: 1, hp: 90, armor: 0, mres: 0.6, speed: 1.4, lives: 1, bounty: 14, radius: 0.35, melee: { dmg: [3, 5], rate: 1 }, healer: { amount: 10, radius: 3, every: 2.2 }, intro: 8 },
  elephant: { id: 'elephant', model: 'elephant', scale: 1, hp: 1300, armor: 0.3, mres: 0.1, speed: 0.9, lives: 5, bounty: 80, radius: 1.1, trample: true, large: true, intro: 11 },
  rhino: { id: 'rhino', model: 'rhino', scale: 1, hp: 700, armor: 0.55, mres: 0, speed: 1.25, lives: 3, bounty: 45, radius: 0.8, trample: true, large: true, charge: { speedMul: 3.2, every: 6, dur: 1.3 }, intro: 14 },
  berserker: { id: 'berserker', model: 'berserker_red', scale: 1.1, hp: 220, armor: 0.1, mres: 0, speed: 1.8, lives: 2, bounty: 18, radius: 0.4, melee: { dmg: [10, 16], rate: 1.2 }, rage: { below: 0.5, speedMul: 1.6 }, intro: 22 },
  sk_minion: { id: 'sk_minion', model: 'sk_minion', scale: 1, hp: 45, armor: 0, mres: 0, speed: 1.75, lives: 1, bounty: 3, radius: 0.32, melee: { dmg: [3, 5], rate: 1 }, intro: 41 },
  sk_warrior: { id: 'sk_warrior', model: 'sk_warrior', scale: 1.05, hp: 170, armor: 0.45, mres: 0, speed: 1.4, lives: 1, bounty: 12, radius: 0.4, melee: { dmg: [8, 12], rate: 0.9 }, shieldFront: true, intro: 44 },
  sk_rogue: { id: 'sk_rogue', model: 'sk_rogue', scale: 0.95, hp: 70, armor: 0, mres: 0.2, speed: 2.7, lives: 1, bounty: 6, radius: 0.3, melee: { dmg: [4, 6], rate: 1.4 }, intro: 42 },
  sk_mage: { id: 'sk_mage', model: 'sk_mage', scale: 1, hp: 130, armor: 0, mres: 0.7, speed: 1.3, lives: 2, bounty: 16, radius: 0.36, ranged: { dmg: [8, 12], rate: 0.6, range: 5 }, summoner: { enemy: 'sk_minion', count: 2, every: 7 }, intro: 46 },
  // ---- bosses
  warlord: { id: 'warlord', model: 'warlord', scale: 2.5, hp: 3000, armor: 0.3, mres: 0.2, speed: 0.8, lives: 12, bounty: 400, radius: 1, melee: { dmg: [40, 60], rate: 0.6 }, large: true, boss: true, warcry: { radius: 6, every: 9, speedMul: 1.6, dur: 4 }, intro: 10 },
  mammoth: { id: 'mammoth', model: 'mammoth', scale: 1.6, hp: 6000, armor: 0.3, mres: 0.2, speed: 0.6, lives: 12, bounty: 700, radius: 1.8, trample: true, large: true, boss: true, summoner: { enemy: 'crossbow', count: 3, every: 8 }, intro: 20 },
  ironclad: { id: 'ironclad', model: 'ironclad', scale: 2.4, hp: 9000, armor: 0.6, mres: 0, speed: 0.7, lives: 12, bounty: 800, radius: 1, melee: { dmg: [60, 80], rate: 0.6 }, large: true, boss: true, shieldFront: true, intro: 30 },
  lich: { id: 'lich', model: 'lich', scale: 2.4, hp: 11000, armor: 0.1, mres: 0.6, speed: 0.75, lives: 12, bounty: 900, radius: 1, ranged: { dmg: [30, 40], rate: 0.6, range: 6 }, large: true, boss: true, summoner: { enemy: 'sk_warrior', count: 3, every: 7 }, intro: 50 },
  ashking: { id: 'ashking', model: 'ashking', scale: 2.8, hp: 16000, armor: 0.45, mres: 0.45, speed: 0.7, lives: 15, bounty: 1500, radius: 1.1, melee: { dmg: [80, 120], rate: 0.6 }, large: true, boss: true, warcry: { radius: 7, every: 8, speedMul: 1.7, dur: 4 }, summoner: { enemy: 'berserker', count: 2, every: 9 }, intro: 100 },
};
