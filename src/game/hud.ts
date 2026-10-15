import { signal } from '@preact/signals';

export type Targeting =
  | { kind: 'spell'; id: string; radius: number }
  | { kind: 'consumable'; id: string; radius: number }
  | { kind: 'ability'; idx: 0 | 1; radius: number }
  | { kind: 'rally'; tower: number; radius: number };

export interface HudSnapshot {
  gold: number;
  lives: number;
  maxLives: number;
  wave: number;
  totalWaves: number;
  waveTimer: number;
  waitingFirstWave: boolean;
  waveSpawning: boolean;
  callBonus: number;
  spells: { id: string; cd: number; max: number }[];
  consumables: { id: string; count: number; free: number }[];
  hero: { id: string; hp: number; maxHp: number; dead: boolean; respawn: number; cds: [number, number]; maxCds: [number, number] } | null;
  speed: number;
  paused: boolean;
  convoy: { x: number; y: number } | null;
  goldRush: number;
  kills: number;
  /** screen position of the "call wave" flag(s) */
  spawnMarkers: { x: number; y: number }[];
}

export interface Selection {
  kind: 'slot' | 'tower';
  index: number; // slot index or tower id
  sx: number;
  sy: number;
}

export const hud = signal<HudSnapshot | null>(null);
export const selection = signal<Selection | null>(null);
export const targeting = signal<Targeting | null>(null);
export const tipQueue = signal<string[]>([]);
export const bossBanner = signal<string | null>(null);
export const waveBanner = signal<number>(0);
