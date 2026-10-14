import type { GroupDef, LevelDef, WaveDef } from '../sim/types';
import type { V2 } from '../sim/path';
import { Rng } from '../sim/rng';
import { biomeFor, BOSSES, difficulty, generateLevel, LEVEL_COUNT, makeWaves, placeSlots } from './generator';

const W = 24, H = 40;

/** Hand-designed road shapes for the first 20 levels: [u, v] in -1..1 (v=1 bottom, v=-1 top). */
const SHAPES: Record<number, [number, number][]> = {
  1: [[0.3, 0.85], [0.35, 0.4], [-0.6, 0.15], [-0.55, -0.35], [0.1, -0.6]],
  2: [[-0.6, 0.85], [-0.55, 0.45], [0.7, 0.3], [0.65, -0.1], [-0.6, -0.25], [-0.4, -0.65]],
  3: [[0.7, 0.85], [0.6, 0.5], [-0.5, 0.55], [-0.75, 0.1], [0.4, -0.05], [0.6, -0.45], [-0.2, -0.65]],
  4: [[0, 0.85], [0, 0.55], [-0.8, 0.35], [-0.7, -0.05], [0.75, -0.15], [0.6, -0.55]],
  5: [[-0.8, 0.85], [-0.6, 0.55], [0.1, 0.5], [0.75, 0.2], [0.2, 0], [-0.75, -0.2], [-0.3, -0.55]],
  6: [[0.8, 0.85], [0.75, 0.3], [-0.2, 0.4], [-0.8, 0.1], [-0.3, -0.2], [0.7, -0.25], [0.3, -0.6]],
  7: [[-0.3, 0.85], [-0.75, 0.5], [0.0, 0.3], [0.8, 0.35], [0.7, -0.1], [-0.2, -0.05], [-0.8, -0.35], [-0.2, -0.65]],
  8: [[0.4, 0.85], [0.8, 0.55], [0.6, 0.15], [-0.7, 0.3], [-0.8, -0.1], [0.0, -0.25], [0.75, -0.5]],
  9: [[-0.75, 0.85], [-0.2, 0.6], [0.7, 0.6], [0.5, 0.15], [-0.7, 0.05], [-0.5, -0.35], [0.6, -0.4]],
  10: [[0, 0.85], [0.75, 0.6], [0.8, 0.15], [0, 0.0], [-0.8, 0.15], [-0.8, -0.35], [0, -0.55]],
  11: [[0.75, 0.85], [-0.3, 0.7], [-0.8, 0.35], [0.4, 0.2], [0.8, -0.15], [-0.4, -0.25], [-0.6, -0.6]],
  12: [[-0.5, 0.85], [-0.8, 0.45], [0.3, 0.45], [0.8, 0.05], [-0.1, -0.05], [-0.8, -0.3], [0.3, -0.55]],
  13: [[0.2, 0.85], [-0.7, 0.65], [-0.7, 0.25], [0.7, 0.35], [0.75, -0.05], [-0.6, -0.15], [-0.4, -0.55], [0.5, -0.6]],
  14: [[-0.8, 0.85], [0.6, 0.7], [0.75, 0.35], [-0.6, 0.25], [-0.75, -0.15], [0.6, -0.1], [0.5, -0.55]],
  15: [[0.8, 0.85], [0.2, 0.55], [-0.8, 0.6], [-0.75, 0.15], [0.75, 0.1], [0.75, -0.3], [-0.5, -0.35], [-0.2, -0.65]],
  16: [[0, 0.85], [-0.8, 0.55], [-0.2, 0.3], [0.8, 0.45], [0.75, -0.05], [-0.2, -0.1], [-0.8, -0.35], [0.1, -0.6]],
  17: [[-0.6, 0.85], [0.75, 0.75], [0.8, 0.4], [-0.5, 0.35], [-0.8, 0.0], [0.6, -0.05], [0.7, -0.4], [-0.4, -0.5]],
  18: [[0.7, 0.85], [0.6, 0.55], [-0.75, 0.6], [-0.75, 0.25], [0.5, 0.2], [0.8, -0.15], [-0.3, -0.2], [-0.75, -0.55]],
  19: [[-0.2, 0.85], [0.8, 0.65], [0.0, 0.4], [-0.8, 0.45], [-0.75, 0.0], [0.75, 0.0], [0.6, -0.4], [-0.5, -0.5]],
  20: [[0, 0.85], [-0.8, 0.7], [-0.75, 0.3], [0.8, 0.4], [0.75, 0.0], [-0.75, -0.05], [-0.7, -0.45], [0.4, -0.55]],
};

const g = (enemy: string, count: number, gap: number, delay: number, formation?: GroupDef['formation']): GroupDef => ({ enemy, count, gap, delay, formation });
const wave = (prep: number, ...groups: GroupDef[]): WaveDef => ({ prep, groups });

/** Hand-written waves for the tutorial stretch. */
const WAVES: Record<number, WaveDef[]> = {
  1: [wave(0, g('footman', 4, 1.6, 0)), wave(14, g('footman', 6, 1.3, 0)), wave(14, g('footman', 8, 1.1, 0, 'column')), wave(14, g('footman', 6, 1.2, 0), g('footman', 6, 0.9, 8)), wave(14, g('footman', 14, 0.9, 0, 'column'))],
  2: [wave(0, g('footman', 6, 1.3, 0)), wave(14, g('runner', 6, 0.6, 0, 'pack')), wave(14, g('footman', 8, 1, 0), g('runner', 6, 0.5, 6, 'pack')), wave(14, g('runner', 12, 0.5, 0, 'pack')), wave(14, g('footman', 10, 0.9, 0, 'column'), g('runner', 10, 0.45, 9, 'pack')), wave(14, g('footman', 14, 0.8, 0), g('runner', 12, 0.4, 6, 'pack'))],
  3: [wave(0, g('footman', 8, 1.1, 0)), wave(14, g('shield', 4, 1, 0, 'turtle')), wave(14, g('runner', 8, 0.5, 0, 'pack'), g('shield', 6, 1, 5, 'turtle')), wave(14, g('footman', 10, 0.8, 0, 'column'), g('shield', 8, 1, 8, 'turtle')), wave(14, g('shield', 12, 1, 0, 'turtle'), g('runner', 10, 0.4, 6, 'pack')), wave(14, g('footman', 12, 0.7, 0), g('shield', 12, 1, 5, 'turtle'), g('runner', 12, 0.4, 12, 'pack'))],
  4: [wave(0, g('footman', 10, 1, 0)), wave(14, g('runner', 10, 0.5, 0, 'pack'), g('footman', 6, 1, 5)), wave(14, g('shield', 8, 1, 0, 'turtle'), g('footman', 8, 0.9, 6)), wave(14, g('runner', 16, 0.35, 0, 'pack')), wave(14, g('footman', 12, 0.7, 0, 'column'), g('shield', 8, 1, 7, 'turtle')), wave(14, g('shield', 12, 1, 0, 'turtle'), g('runner', 14, 0.35, 5, 'pack'), g('footman', 12, 0.7, 12))],
  5: [wave(0, g('footman', 8, 1, 0)), wave(14, g('crossbow', 5, 1.2, 0)), wave(14, g('footman', 8, 0.9, 0), g('crossbow', 6, 1, 4)), wave(14, g('shield', 8, 1, 0, 'turtle'), g('crossbow', 6, 1, 6)), wave(14, g('runner', 14, 0.4, 0, 'pack'), g('crossbow', 8, 0.9, 6)), wave(14, g('footman', 12, 0.7, 0, 'column'), g('shield', 8, 1, 6, 'turtle'), g('crossbow', 8, 0.9, 12)), wave(14, g('shield', 12, 1, 0, 'turtle'), g('crossbow', 10, 0.8, 5), g('runner', 14, 0.35, 12, 'pack'))],
  6: [wave(0, g('footman', 10, 0.9, 0)), wave(14, g('shield', 8, 1, 0, 'turtle')), wave(14, g('crossbow', 8, 1, 0), g('runner', 10, 0.4, 6, 'pack')), wave(14, g('shield', 12, 1, 0, 'turtle'), g('footman', 8, 0.8, 5)), wave(14, g('footman', 16, 0.6, 0, 'column'), g('crossbow', 8, 0.9, 8)), wave(14, g('shield', 16, 1, 0, 'turtle'), g('runner', 16, 0.3, 6, 'pack')), wave(14, g('footman', 14, 0.6, 0), g('shield', 12, 1, 6, 'turtle'), g('crossbow', 10, 0.8, 12))],
  7: [wave(0, g('footman', 10, 0.9, 0)), wave(14, g('brute', 1, 1, 0), g('footman', 6, 1, 3)), wave(14, g('shield', 8, 1, 0, 'turtle'), g('brute', 2, 3, 6)), wave(14, g('runner', 14, 0.35, 0, 'pack'), g('crossbow', 8, 0.9, 5)), wave(14, g('brute', 3, 3, 0), g('footman', 12, 0.7, 4, 'column')), wave(14, g('shield', 12, 1, 0, 'turtle'), g('brute', 3, 3, 6), g('crossbow', 10, 0.8, 10)), wave(14, g('brute', 4, 2.5, 0), g('runner', 18, 0.3, 6, 'pack'), g('shield', 12, 1, 12, 'turtle'))],
  8: [wave(0, g('footman', 12, 0.9, 0)), wave(14, g('shaman', 2, 2, 0), g('footman', 10, 0.9, 1)), wave(14, g('shield', 12, 1, 0, 'turtle'), g('shaman', 2, 2, 3)), wave(14, g('brute', 3, 3, 0), g('shaman', 2, 2, 2)), wave(14, g('runner', 18, 0.3, 0, 'pack'), g('crossbow', 10, 0.8, 6)), wave(14, g('footman', 16, 0.6, 0, 'column'), g('shaman', 3, 2, 5), g('brute', 3, 3, 9)), wave(14, g('shield', 16, 1, 0, 'turtle'), g('shaman', 3, 2, 4), g('brute', 4, 2.5, 10), g('runner', 16, 0.3, 16, 'pack'))],
  9: [wave(0, g('footman', 12, 0.8, 0)), wave(14, g('shield', 12, 1, 0, 'turtle'), g('shaman', 2, 2, 4)), wave(14, g('brute', 4, 2.5, 0), g('crossbow', 8, 0.9, 5)), wave(14, g('runner', 20, 0.3, 0, 'pack'), g('shield', 8, 1, 6, 'turtle')), wave(14, g('brute', 5, 2.5, 0), g('shaman', 3, 2, 3)), wave(14, g('footman', 18, 0.5, 0, 'column'), g('crossbow', 12, 0.7, 6), g('brute', 4, 2.5, 12)), wave(14, g('shield', 16, 1, 0, 'turtle'), g('shaman', 4, 2, 4), g('brute', 5, 2.5, 10), g('runner', 18, 0.3, 18, 'pack'))],
  10: [wave(0, g('footman', 12, 0.9, 0)), wave(14, g('shield', 8, 1, 0, 'turtle'), g('runner', 10, 0.45, 6, 'pack')), wave(14, g('brute', 3, 3, 0), g('shaman', 2, 2, 3)), wave(14, g('crossbow', 8, 0.9, 0), g('shield', 8, 1, 6, 'turtle')), wave(14, g('runner', 14, 0.4, 0, 'pack'), g('brute', 3, 3, 6)), wave(16, g('footman', 14, 0.6, 0, 'column'), g('shaman', 2, 2, 6)), wave(20, g('warlord', 1, 1, 0), g('footman', 8, 0.9, 4), g('shield', 8, 1, 12, 'turtle'))],
};

const TIPS: Record<number, string[]> = {
  1: ['tip_build', 'tip_wave', 'tip_hero', 'tip_upgrade'],
  2: ['tip_runner', 'tip_ballista'],
  3: ['tip_turtle', 'tip_plot', 'tip_meteor'],
  4: ['tip_barracks'],
  5: ['tip_crossbow'],
  6: ['tip_catapult'],
  7: ['tip_brute'],
  8: ['tip_shaman'],
  9: ['tip_mage'],
  10: ['tip_boss'],
  11: ['tip_elephant'],
  12: ['tip_brazier'],
  14: ['tip_rhino'],
  15: ['tip_bell'],
};

function shapeToPath(shape: [number, number][]): V2[] {
  const hw = W / 2 - 3.2, hh = H / 2;
  const pts: V2[] = shape.map(([u, v]) => ({ x: u * hw, z: v * hh }));
  return [{ x: pts[0].x, z: hh + 5 }, ...pts, { x: 0, z: -hh + 3.2 }, { x: 0, z: -hh + 0.5 }, { x: 0, z: -hh - 4 }];
}

const cache = new Map<number, LevelDef>();

export function getLevel(id: number): LevelDef {
  if (id === 0) return getEndless();
  const hit = cache.get(id);
  if (hit) return hit;
  let lvl: LevelDef;
  if (SHAPES[id]) {
    const rng = new Rng(id * 977 + 3);
    const paths = [shapeToPath(SHAPES[id])];
    const { hpMul, bountyMul } = difficulty(id);
    const nSlots = id <= 2 ? 7 : id <= 6 ? 9 : 10 + Math.floor(id / 8);
    const slots = placeSlots(paths, W, H, nSlots, rng, id >= 3 ? 4 : 0, 30 + id * 3);
    const waves = WAVES[id] ?? makeWaves(id, biomeFor(id), rng, Math.min(12, 7 + Math.floor((id - 10) / 3)), 1, { boss: BOSSES[id], maxIntro: id, budgetMul: BOSSES[id] ? 0.8 : 0.95 });
    lvl = {
      id, biome: biomeFor(id), seed: id * 31 + 5, width: W, height: H, paths, slots,
      gate: { x: 0, z: -H / 2 + 0.5, angle: 0 }, waves,
      startGold: id === 1 ? 240 : 250 + id * 8, lives: 20, hpMul: id <= 10 ? 1 + (id - 1) * 0.04 : hpMul, bountyMul: id <= 10 ? 1 : bountyMul,
      boss: BOSSES[id], tips: TIPS[id],
    };
  } else {
    lvl = generateLevel(id);
    lvl.tips = TIPS[id];
  }
  cache.set(id, lvl);
  return lvl;
}

/** Endless mode: a generated map with an unbounded stream of waves. */
export function getEndless(): LevelDef {
  const hit = cache.get(0);
  if (hit) return hit;
  const lvl = generateLevel(35, true);
  lvl.id = 0;
  lvl.endless = true;
  lvl.hpMul = 1.3;
  lvl.bountyMul = 1.1;
  lvl.startGold = 420;
  cache.set(0, lvl);
  return lvl;
}

export { LEVEL_COUNT };
