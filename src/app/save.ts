import { signal } from '@preact/signals';
import { Platform } from '../platform/Platform';

export type QualitySetting = 'auto' | 'low' | 'medium' | 'high';

export interface SaveData {
  v: number;
  coins: number;
  stars: Record<number, number>;
  unlocked: number;
  towers: string[];
  heroes: string[];
  hero: string;
  upgrades: Record<string, number>;
  consumables: Record<string, number>;
  boosters: Record<string, number>;
  uniques: Record<string, number>;
  settings: { music: number; sfx: number; quality: QualitySetting; lang: 'ru' | 'en' | 'auto'; vibration: boolean };
  daily: { day: string; streak: number; claimed: boolean; freeCoins: number; spin: boolean; chest: boolean; adSpins?: number };
  stats: { kills: number; played: number; won: number; ads: number };
  endlessBest: number;
  tipsSeen: string[];
  created: number;
}

const KEY = 'hearthguard.save.v1';

export function defaultSave(): SaveData {
  return {
    v: 1,
    coins: 150,
    stars: {},
    unlocked: 1,
    towers: ['archer'],
    heroes: ['ranger'],
    hero: 'ranger',
    upgrades: {},
    consumables: { freeze: 1, dynamite: 1, goldrush: 0, repair: 0 },
    boosters: {},
    uniques: {},
    settings: { music: 0.6, sfx: 0.85, quality: 'auto', lang: 'auto', vibration: true },
    daily: { day: '', streak: 0, claimed: false, freeCoins: 0, spin: false, chest: false },
    stats: { kills: 0, played: 0, won: 0, ads: 0 },
    endlessBest: 0,
    tipsSeen: [],
    created: Date.now(),
  };
}

function load(): SaveData {
  const base = defaultSave();
  const raw = Platform.loadLocal(KEY);
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...base, ...d,
      settings: { ...base.settings, ...(d.settings ?? {}) },
      daily: { ...base.daily, ...(d.daily ?? {}) },
      stats: { ...base.stats, ...(d.stats ?? {}) },
      consumables: { ...base.consumables, ...(d.consumables ?? {}) },
    };
  } catch {
    return base;
  }
}

export const profile = signal<SaveData>(load());

let saveTimer = 0;
/** Mutate the profile immutably and persist (debounced). */
export function updateProfile(fn: (d: SaveData) => void) {
  const next: SaveData = structuredClone(profile.value);
  fn(next);
  profile.value = next;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => persist(), 250);
}

export function persist() {
  const json = JSON.stringify(profile.value);
  Platform.saveLocal(KEY, json);
  Platform.saveCloud(profile.value);
}

export function resetProgress() {
  const s = profile.value.settings;
  const fresh = defaultSave();
  fresh.settings = s;
  profile.value = fresh;
  persist();
}

export function totalStars(d = profile.value) { return Object.values(d.stars).reduce((a, b) => a + b, 0); }

export function today() {
  const n = new Date();
  return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`;
}

/** Roll the daily state over when the date changes. */
export function rollDaily() {
  const d = today();
  if (profile.value.daily.day === d) return;
  updateProfile((p) => {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
    p.daily.streak = p.daily.day === yesterday && p.daily.claimed ? p.daily.streak + 1 : 0;
    p.daily = { ...p.daily, day: d, claimed: false, freeCoins: 0, spin: false, chest: false, adSpins: 0 };
  });
}
