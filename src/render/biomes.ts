import type { BiomeId } from '../sim/types';

export interface BiomeLook {
  grassA: number;
  grassB: number;
  grassDry: number;
  dirt: number;
  dirtDark: number;
  rock: number;
  rockDark: number;
  moss: number;
  sky: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  sun: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  bladeTip: number;
  bladeRoot: number;
  flowers: number[];
  trees: string[];
  treeTint: number;
  /** what surrounds the play field */
  border: 'forest' | 'canyon' | 'coast' | 'snow' | 'ash';
  water?: number;
  snow?: boolean;
  lava?: boolean;
  particles?: 'snow' | 'ash' | 'pollen';
}

export const BIOMES: Record<BiomeId, BiomeLook> = {
  meadow: {
    grassA: 0x4a8726, grassB: 0x78aa35, grassDry: 0xb0a64e, dirt: 0xc9a46a, dirtDark: 0x9b7a4a, rock: 0xb3a597, rockDark: 0x7b6e63, moss: 0x7d9a3a,
    sky: 0xbfd9e8, fog: 0xcfe0d8, fogNear: 60, fogFar: 150, sun: 0xfff1d6, sunIntensity: 3.2, hemiSky: 0xd8ecff, hemiGround: 0x6b7a3a, hemiIntensity: 1.25,
    bladeTip: 0x98c444, bladeRoot: 0x356b1d, flowers: [0xffffff, 0xfff27a, 0xf6f0ff], trees: ['pine0', 'pine1', 'pine2', 'oak0', 'oak1', 'pine3', 'oak2', 'bush0'], treeTint: 0xffffff,
    border: 'forest', particles: 'pollen',
  },
  canyon: {
    grassA: 0x6e9a34, grassB: 0x9cb948, grassDry: 0xc3b465, dirt: 0xd2ab73, dirtDark: 0xa27f52, rock: 0xc9b39a, rockDark: 0x8d7563, moss: 0x86a03e,
    sky: 0xd5e2ea, fog: 0xe3dccd, fogNear: 60, fogFar: 150, sun: 0xffe7c4, sunIntensity: 3.4, hemiSky: 0xe8f0ff, hemiGround: 0x7d6a48, hemiIntensity: 1.2,
    bladeTip: 0xb4d257, bladeRoot: 0x4c7d26, flowers: [0xffffff, 0xffe066], trees: ['pine0', 'pine2', 'oak3', 'pine3', 'bush1'], treeTint: 0xf0ecd8,
    border: 'canyon', particles: 'pollen',
  },
  coast: {
    grassA: 0x5aa03a, grassB: 0x88c24a, grassDry: 0xc8c37a, dirt: 0xdcc08a, dirtDark: 0xab9363, rock: 0xb8b2a8, rockDark: 0x7c7770, moss: 0x7aa54a,
    sky: 0xc4e3f2, fog: 0xd4e8ee, fogNear: 60, fogFar: 160, sun: 0xfff5e0, sunIntensity: 3.3, hemiSky: 0xd6f0ff, hemiGround: 0x5f8a4a, hemiIntensity: 1.3,
    bladeTip: 0xa6d65a, bladeRoot: 0x3c7f2a, flowers: [0xffffff, 0xffd3e8, 0xfff27a], trees: ['oak0', 'pine1', 'oak2', 'bush0', 'bush2', 'pine0', 'oak1'], treeTint: 0xffffff,
    border: 'coast', water: 0x2f9fb8, particles: 'pollen',
  },
  snow: {
    grassA: 0xdfe8ee, grassB: 0xf4f8fb, grassDry: 0xc9d5dc, dirt: 0x9f907e, dirtDark: 0x75695d, rock: 0x9aa2aa, rockDark: 0x667079, moss: 0xd8e2ea,
    sky: 0xc8d8e6, fog: 0xdbe6ef, fogNear: 45, fogFar: 130, sun: 0xfff7ee, sunIntensity: 2.9, hemiSky: 0xe8f2ff, hemiGround: 0x9aa6b4, hemiIntensity: 1.45,
    bladeTip: 0xc6d6c0, bladeRoot: 0x7f9a7a, flowers: [0xffffff], trees: ['spine0', 'spine1', 'spine2', 'spine3'], treeTint: 0xffffff,
    border: 'snow', snow: true, particles: 'snow',
  },
  ashlands: {
    grassA: 0x4d4338, grassB: 0x6b5a48, grassDry: 0x7a6650, dirt: 0x8a6e55, dirtDark: 0x5b4636, rock: 0x5e5550, rockDark: 0x2f2a28, moss: 0x5d4f3c,
    sky: 0x8a6f63, fog: 0x7d655a, fogNear: 40, fogFar: 120, sun: 0xffc9a0, sunIntensity: 2.8, hemiSky: 0xffb48a, hemiGround: 0x3a2a24, hemiIntensity: 1.1,
    bladeTip: 0x8c7a52, bladeRoot: 0x3f3324, flowers: [0xff7a3a], trees: ['tree_cut', 'tree_a'], treeTint: 0x6a5a4a,
    border: 'ash', lava: true, particles: 'ash',
  },
};
