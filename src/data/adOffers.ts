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
  /** shown as a second button on an existing shop card instead of its own card */
  attach?: string;
}

const upgradeOffer = (id: string, tab: AdOffer['tab'], thumb: string): AdOffer => ({
  id: 'mastery_' + id, tab, views: 3, once: false, icon: { thumb },
  available: (p) => (p.upgrades[id] ?? 0) < (UPGRADES.find((u) => u.id === id)?.max ?? 5),
  apply: (p) => { p.upgrades[id] = (p.upgrades[id] ?? 0) + 1; },
});

const towerUnlock = (id: string): AdOffer => ({
  id: 'unlock_' + id, tab: 'towers', views: 3, once: true, icon: { thumb: 'tower_' + id + '_3' }, attach: 'tower:' + id,
  available: (p) => !p.towers.includes(id) && TOWERS[id].unlockLevel > p.unlocked,
  apply: (p) => { if (!p.towers.includes(id)) p.towers.push(id); },
});

const heroUnlock = (id: string): AdOffer => ({
  id: 'unlock_' + id, tab: 'heroes', views: 3, once: true, icon: { thumb: 'hero_' + id }, attach: 'hero:' + id,
  available: (p) => !p.heroes.includes(id),
  apply: (p) => { if (!p.heroes.includes(id)) p.heroes.push(id); },
});

/** amount granted by a 3-ad pack */
export const PACK: Record<string, number> = { freeze: 5, dynamite: 5, goldrush: 3, repair: 3, purse: 3, walls: 3, sharp: 3 };

export const AD_OFFERS: AdOffer[] = [
  // towers
  towerUnlock('barracks'), towerUnlock('catapult'), towerUnlock('mage'), towerUnlock('brazier'), towerUnlock('bell'),
  upgradeOffer('archer', 'towers', 'tower_archer'), upgradeOffer('ballista', 'towers', 'tower_ballista'), upgradeOffer('catapult', 'towers', 'tower_catapult'),
  upgradeOffer('mage', 'towers', 'tower_mage'),
  // heroes
  heroUnlock('paladin'), heroUnlock('sorceress'),
  upgradeOffer('hero', 'heroes', 'hero_ranger'), upgradeOffer('barracks', 'heroes', 'tower_barracks'), upgradeOffer('spells', 'heroes', ''),
  // items: each supply / booster card gets a "3 ads → a pack" button
  ...(['freeze', 'dynamite', 'goldrush', 'repair'] as const).map((id): AdOffer => ({
    id: 'pack_' + id, tab: 'items', views: 3, once: false, icon: { spell: id }, attach: 'item:' + id, available: () => true,
    apply: (p) => { p.consumables[id] = (p.consumables[id] ?? 0) + PACK[id]; },
  })),
  ...(['purse', 'walls', 'sharp'] as const).map((id): AdOffer => ({
    id: 'pack_' + id, tab: 'items', views: 3, once: false, icon: { spell: id }, attach: 'booster:' + id, available: () => true,
    apply: (p) => { p.boosters[id] = (p.boosters[id] ?? 0) + 3; },
  })),
  // coins
  { id: 'coins_sack', tab: 'coins', views: 3, once: false, icon: { coin: true }, available: () => true, apply: (p) => { p.coins += 900 + p.unlocked * 10; } },
  { id: 'coins_chest', tab: 'coins', views: 3, once: false, icon: { spell: 'goldrush' }, available: () => true, apply: (p) => { p.coins += 1600 + p.unlocked * 20; } },
  { id: 'coins_treasury', tab: 'coins', views: 3, once: false, icon: { spell: 'purse' }, available: () => true, apply: (p) => { p.coins += 600; p.consumables.goldrush = (p.consumables.goldrush ?? 0) + 2; } },
];

export function offerProgress(p: SaveData, id: string) { return p.adOffers?.[id] ?? 0; }

export function attachedOffer(p: SaveData, attach: string) {
  return AD_OFFERS.find((o) => o.attach === attach && !(p.adOffersDone ?? []).includes(o.id) && o.available(p)) ?? null;
}
