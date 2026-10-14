import type { V2 } from './path';

export type BiomeId = 'meadow' | 'canyon' | 'coast' | 'snow' | 'ashlands';

export interface GroupDef {
  enemy: string;
  count: number;
  /** seconds between spawns */
  gap: number;
  /** seconds after wave start */
  delay: number;
  path?: number;
  formation?: 'turtle' | 'pack' | 'column';
}

export interface WaveDef {
  groups: GroupDef[];
  /** seconds of preparation before this wave auto-starts (after previous finished spawning) */
  prep?: number;
}

export interface SlotDef extends V2 { price?: number }

export interface LevelDef {
  id: number;
  biome: BiomeId;
  seed: number;
  width: number;
  height: number;
  paths: V2[][];
  slots: SlotDef[];
  gate: V2 & { angle: number };
  waves: WaveDef[];
  startGold: number;
  lives: number;
  hpMul: number;
  bountyMul: number;
  boss?: string;
  endless?: boolean;
  /** tutorial hint keys shown in order */
  tips?: string[];
}

export interface Loadout {
  towers: string[];
  hero: string;
  spells: string[];
  consumables: Record<string, number>;
  boosters: string[];
  upgrades: Record<string, number>;
  phoenix: boolean;
  hound: boolean;
  goldSkin: boolean;
}
