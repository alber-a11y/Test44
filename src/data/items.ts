/** Spells (cooldown based, always available once unlocked) */
export interface SpellDef { id: string; cooldown: number; unlockLevel: number; radius: number; unique?: boolean }
export const SPELLS: Record<string, SpellDef> = {
  reinforce: { id: 'reinforce', cooldown: 20, unlockLevel: 1, radius: 1.5 },
  meteor: { id: 'meteor', cooldown: 45, unlockLevel: 3, radius: 2.6 },
  starfall: { id: 'starfall', cooldown: 60, unlockLevel: 1, radius: 0, unique: true },
};

/** Consumables bought with coins and used in battle */
export interface ConsumableDef { id: string; price: number; targeted: boolean; radius?: number }
export const CONSUMABLES: Record<string, ConsumableDef> = {
  freeze: { id: 'freeze', price: 120, targeted: true, radius: 4 },
  dynamite: { id: 'dynamite', price: 150, targeted: true, radius: 2.6 },
  goldrush: { id: 'goldrush', price: 100, targeted: false },
  repair: { id: 'repair', price: 140, targeted: false },
};
export const CONSUMABLE_ORDER = ['freeze', 'dynamite', 'goldrush', 'repair'];

/** Pre-level boosters, one level duration */
export interface BoosterDef { id: string; price: number }
export const BOOSTERS: Record<string, BoosterDef> = {
  purse: { id: 'purse', price: 90 },
  walls: { id: 'walls', price: 80 },
  sharp: { id: 'sharp', price: 120 },
};
export const BOOSTER_ORDER = ['purse', 'walls', 'sharp'];

/** Permanent forge upgrades */
export interface UpgradeDef { id: string; max: number; base: number; step: number; per: number; group: 'tower' | 'army' | 'kingdom' }
export const UPGRADES: UpgradeDef[] = [
  { id: 'archer', max: 5, base: 120, step: 1.6, per: 0.08, group: 'tower' },
  { id: 'ballista', max: 5, base: 140, step: 1.6, per: 0.08, group: 'tower' },
  { id: 'catapult', max: 5, base: 160, step: 1.6, per: 0.08, group: 'tower' },
  { id: 'mage', max: 5, base: 180, step: 1.6, per: 0.08, group: 'tower' },
  { id: 'brazier', max: 5, base: 180, step: 1.6, per: 0.08, group: 'tower' },
  { id: 'barracks', max: 5, base: 140, step: 1.6, per: 0.12, group: 'army' },
  { id: 'hero', max: 5, base: 150, step: 1.6, per: 0.1, group: 'army' },
  { id: 'spells', max: 5, base: 150, step: 1.6, per: 0.07, group: 'army' },
  { id: 'gold', max: 5, base: 120, step: 1.7, per: 25, group: 'kingdom' },
  { id: 'lives', max: 3, base: 200, step: 1.8, per: 2, group: 'kingdom' },
  { id: 'bounty', max: 5, base: 160, step: 1.7, per: 0.05, group: 'kingdom' },
  { id: 'magnet', max: 3, base: 100, step: 1.8, per: 0.25, group: 'kingdom' },
  { id: 'discount', max: 5, base: 220, step: 1.7, per: 0.03, group: 'kingdom' },
];
export function upgradeCost(u: UpgradeDef, lvl: number) { return Math.round(u.base * Math.pow(u.step, lvl) / 10) * 10; }

/** Unique rewards: each needs N rewarded views (progress persists). */
export interface UniqueDef { id: string; views: number; kind: 'tower' | 'hero' | 'spell' | 'relic' | 'pet' | 'skin' }
export const UNIQUES: UniqueDef[] = [
  { id: 'dragon', views: 3, kind: 'tower' },
  { id: 'jarl', views: 3, kind: 'hero' },
  { id: 'starfall', views: 3, kind: 'spell' },
  { id: 'phoenix', views: 3, kind: 'relic' },
  { id: 'hound', views: 3, kind: 'pet' },
  { id: 'goldskin', views: 3, kind: 'skin' },
];
