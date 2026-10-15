import type { SaveData } from '../app/save';
import { TOWERS } from './towers';
import { UPGRADES } from './items';

/**
 * Shop offers paid with rewarded ads (3 views each). Progress persists in SaveData.adOffers.
 * `once` offers disappear after completion; the others can be repeated.
 */
export interface AdOffer {
  id: string;
  tab: 'towers' | 'heroes' | 'items' | 'coins';
  views: number;
  once: boolean;
  /** visible in the shop right now */
  available: (p: SaveData) => boolean;
  apply: (p: SaveData) => void;
  icon: { thumb?: string; spell?: string; coin?: boolean };
}

const upgradeOffer = (id: string, tab: AdOffer['tab'], thumb: string): AdOffer => ({
  id: 'mastery_' + id, tab, views: 3, once: false, icon: { thumb },
  available: (p) => (p.upgrades[id] ?? 0) < (UPGRADES.find((u) => u.id === id)?.max ?? 5),
  apply: (p) => { p.upgrades[id] = (p.upgrades[id] ?? 0) + 1; },
});

const towerUnlock = (id: string): AdOffer => ({
  id: 'unlock_' + id, tab: 'towers', views: 3, once: true, icon: { thumb: 'tower_' + id + '_3' },
  available: (p) => !p.towers.includes(id) && TOWERS[id].unlockLevel > p.unlocked,
  apply: (p) => { if (!p.towers.includes(id)) p.towers.push(id); },
});

const heroUnlock = (id: string): AdOffer => ({
  id: 'unlock_' + id, tab: 'heroes', views: 3, once: true, icon: { thumb: 'hero_' + id },
  available: (p) => !p.heroes.includes(id),
  apply: (p) => { if (!p.heroes.includes(id)) p.heroes.push(id); },
});

export const AD_OFFERS: AdOffer[] = [
  // towers
  towerUnlock('barracks'), towerUnlock('catapult'), towerUnlock('mage'), towerUnlock('brazier'), towerUnlock('bell'),
  upgradeOffer('archer', 'towers', 'tower_archer'), upgradeOffer('ballista', 'towers', 'tower_ballista'), upgradeOffer('catapult', 'towers', 'tower_catapult'),
  upgradeOffer('mage', 'towers', 'tower_mage'),
  // heroes
  heroUnlock('paladin'), heroUnlock('sorceress'),
  upgradeOffer('hero', 'heroes', 'hero_ranger'), upgradeOffer('barracks', 'heroes', 'tower_barracks'), upgradeOffer('spells', 'heroes', ''),
  // items (repeatable bundles)
  { id: 'bundle_ice', tab: 'items', views: 3, once: false, icon: { spell: 'freeze' }, available: () => true, apply: (p) => { p.consumables.freeze = (p.consumables.freeze ?? 0) + 5; } },
  { id: 'bundle_blast', tab: 'items', views: 3, once: false, icon: { spell: 'dynamite' }, available: () => true, apply: (p) => { p.consumables.dynamite = (p.consumables.dynamite ?? 0) + 5; } },
  { id: 'bundle_royal', tab: 'items', views: 3, once: false, icon: { spell: 'goldrush' }, available: () => true, apply: (p) => { p.consumables.goldrush = (p.consumables.goldrush ?? 0) + 3; p.consumables.repair = (p.consumables.repair ?? 0) + 3; } },
  { id: 'bundle_boost', tab: 'items', views: 3, once: false, icon: { spell: 'purse' }, available: () => true, apply: (p) => { for (const b of ['purse', 'walls', 'sharp']) p.boosters[b] = (p.boosters[b] ?? 0) + 2; } },
  // coins
  { id: 'coins_sack', tab: 'coins', views: 3, once: false, icon: { coin: true }, available: () => true, apply: (p) => { p.coins += 900 + p.unlocked * 10; } },
  { id: 'coins_chest', tab: 'coins', views: 3, once: false, icon: { spell: 'goldrush' }, available: () => true, apply: (p) => { p.coins += 1600 + p.unlocked * 20; } },
  { id: 'coins_treasury', tab: 'coins', views: 3, once: false, icon: { spell: 'purse' }, available: () => true, apply: (p) => { p.coins += 600; p.consumables.goldrush = (p.consumables.goldrush ?? 0) + 2; } },
];

export function offerProgress(p: SaveData, id: string) { return p.adOffers?.[id] ?? 0; }
