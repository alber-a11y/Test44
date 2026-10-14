import { ENEMIES } from '../data/enemies';
import { Path, type V2 } from '../sim/path';
import { Rng } from '../sim/rng';
import type { BiomeId, GroupDef, LevelDef, SlotDef, WaveDef } from '../sim/types';

export const LEVEL_COUNT = 100;

export function biomeFor(level: number): BiomeId {
  if (level <= 20) return 'meadow';
  if (level <= 40) return 'canyon';
  if (level <= 60) return 'coast';
  if (level <= 80) return 'snow';
  return 'ashlands';
}

export const BOSSES: Record<number, string> = {
  10: 'warlord', 20: 'mammoth', 30: 'ironclad', 40: 'warlord', 50: 'lich', 60: 'mammoth', 70: 'ironclad', 80: 'lich', 90: 'mammoth', 100: 'ashking',
};

const POOLS: Record<BiomeId, string[]> = {
  meadow: ['footman', 'runner', 'shield', 'crossbow', 'brute', 'shaman', 'elephant', 'rhino'],
  canyon: ['footman', 'runner', 'shield', 'crossbow', 'brute', 'shaman', 'elephant', 'rhino', 'berserker'],
  coast: ['footman', 'runner', 'shield', 'crossbow', 'brute', 'shaman', 'elephant', 'rhino', 'berserker', 'sk_minion', 'sk_rogue', 'sk_warrior', 'sk_mage'],
  snow: ['footman', 'runner', 'shield', 'crossbow', 'brute', 'berserker', 'rhino', 'elephant', 'sk_warrior'],
  ashlands: ['sk_minion', 'sk_rogue', 'sk_warrior', 'sk_mage', 'brute', 'berserker', 'elephant', 'rhino', 'shaman'],
};

export function difficulty(level: number) {
  const L = level - 1;
  const hpMul = 1 + 0.05 * L + 0.00045 * L * L;
  const bountyMul = Math.pow(hpMul, 0.62);
  return { hpMul, bountyMul };
}

export function enemyCost(id: string) {
  const d = ENEMIES[id];
  return (d.hp / 10) * (1 + d.armor * 0.8 + d.mres * 0.4) * Math.sqrt(d.speed / 1.5) * (d.healer || d.summoner ? 1.4 : 1);
}

/** Serpentine path from the bottom edge to the gate at the top. Points in world units. */
export function serpentine(rng: Rng, W: number, H: number, turns: number, startX?: number): V2[] {
  const hw = W / 2 - 3.2, hh = H / 2;
  const pts: V2[] = [];
  let x = startX ?? rng.range(-hw * 0.8, hw * 0.8);
  pts.push({ x, z: hh + 5 });
  pts.push({ x, z: hh - 2.5 });
  let side = x > 0 ? -1 : 1;
  const top = -hh + 5.5, bottom = hh - 6;
  for (let i = 0; i < turns; i++) {
    const z = bottom - ((i + 0.5) / turns) * (bottom - top);
    const nx = side * rng.range(hw * 0.55, hw);
    pts.push({ x: nx, z: z + rng.range(-1, 1) });
    side = -side;
  }
  pts.push({ x: rng.range(-2, 2), z: -hh + 3.2 });
  pts.push({ x: 0, z: -hh + 0.5 });
  pts.push({ x: 0, z: -hh - 4 });
  return pts;
}

/** Choose build slots along the path(s): good coverage, spaced apart, off the road. */
export function placeSlots(paths: V2[][], W: number, H: number, count: number, rng: Rng, lockedEvery = 0, lockPrice = 60): SlotDef[] {
  const ps = paths.map((p) => new Path(p, 0.5));
  const hw = W / 2 - 1.8, hh = H / 2 - 1.8;
  const cands: { x: number; z: number; score: number }[] = [];
  for (let x = -hw; x <= hw; x += 0.75) {
    for (let z = -hh + 4.5; z <= hh - 1; z += 0.75) {
      let minD = Infinity;
      for (const p of ps) minD = Math.min(minD, p.closest(x, z).dist);
      if (minD < 3.2 || minD > 4.6) continue;
      let cover = 0;
      for (const p of ps) for (let i = 0; i < p.xs.length; i += 2) {
        if (Math.abs(p.zs[i]) > H / 2 + 1) continue;
        if ((p.xs[i] - x) ** 2 + (p.zs[i] - z) ** 2 < 49) cover++;
      }
      cands.push({ x, z, score: cover + rng.range(0, 4) });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const out: SlotDef[] = [];
  for (const c of cands) {
    if (out.length >= count) break;
    if (out.some((s) => (s.x - c.x) ** 2 + (s.z - c.z) ** 2 < 4.1 * 4.1)) continue;
    out.push({ x: +c.x.toFixed(2), z: +c.z.toFixed(2) });
  }
  // lock a few of the weaker spots behind a price (the "buy a plot" mechanic)
  if (lockedEvery > 0) {
    for (let i = out.length - 1, k = 0; i >= 0; i--, k++) if (k % lockedEvery === 0) out[i].price = lockPrice;
  }
  return out;
}

function pickWeighted<T>(rng: Rng, items: { v: T; w: number }[]): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = rng.next() * total;
  for (const i of items) { r -= i.w; if (r <= 0) return i.v; }
  return items[items.length - 1].v;
}

/** Budget based wave composition. */
export function makeWaves(level: number, biome: BiomeId, rng: Rng, nWaves: number, paths: number, opts: { boss?: string; budgetMul?: number; maxIntro?: number } = {}): WaveDef[] {
  const maxIntro = opts.maxIntro ?? level;
  const pool = POOLS[biome].filter((id) => ENEMIES[id].intro <= maxIntro);
  if (!pool.length) pool.push('footman');
  const waves: WaveDef[] = [];
  const base = (34 + level * 4.2) * (opts.budgetMul ?? 1);
  for (let w = 0; w < nWaves; w++) {
    let budget = base * (1 + w * 0.42) * (w === nWaves - 1 ? 1.25 : 1);
    const groups: GroupDef[] = [];
    let delay = 0;
    const nGroups = Math.min(4, 1 + Math.floor(w / 2) + (level > 20 ? 1 : 0));
    for (let g = 0; g < nGroups && budget > 3; g++) {
      const items = pool.map((id) => {
        const d = ENEMIES[id];
        let wgt = 1;
        if (d.intro === maxIntro) wgt = w >= 1 ? 4 : 0.5;
        if (d.large) wgt *= w < 2 ? 0.1 : 0.6;
        if (id === 'footman') wgt *= level < 10 ? 2 : 1;
        return { v: id, w: wgt };
      });
      const id = pickWeighted(rng, items);
      const cost = enemyCost(id);
      const share = g === nGroups - 1 ? budget : budget * rng.range(0.35, 0.6);
      let count = Math.max(1, Math.round(share / cost));
      if (ENEMIES[id].large) count = Math.min(count, 2 + Math.floor(level / 15));
      count = Math.min(count, 24);
      budget -= count * cost;
      const formation = id === 'shield' || id === 'sk_warrior' ? (count >= 4 ? 'turtle' : undefined) : id === 'runner' || id === 'sk_rogue' || id === 'sk_minion' ? 'pack' : id === 'footman' && rng.chance(0.4) ? 'column' : undefined;
      const gap = ENEMIES[id].large ? 3.2 : formation === 'pack' ? 0.5 : 0.95;
      groups.push({ enemy: id, count, gap, delay, path: paths > 1 ? (g + w) % paths : 0, formation });
      delay += count * gap * (formation === 'turtle' ? 0.2 : 0.7) + rng.range(1.5, 4);
    }
    waves.push({ groups, prep: w === 0 ? 0 : 14 + Math.min(8, level * 0.1) });
  }
  if (opts.boss) {
    const last = waves[waves.length - 1];
    last.groups.push({ enemy: opts.boss, count: 1, gap: 1, delay: 6, path: 0 });
  }
  return waves;
}

export function generateLevel(level: number, endless = false): LevelDef {
  const rng = new Rng(level * 1013 + 7);
  const biome = biomeFor(level);
  const W = level > 50 ? 26 : 24, H = level > 50 ? 42 : 40;
  const twoPaths = level >= 25 && rng.chance(0.4 + Math.min(0.3, level / 300));
  const turns = 2 + Math.min(4, Math.floor(rng.range(0, 3) + level / 25));
  const paths: V2[][] = [];
  if (twoPaths) {
    const a = serpentine(rng, W, H, turns, -W / 2 + 5);
    // second path joins the first one around its middle
    const join = a[Math.floor(a.length / 2)];
    const sx = W / 2 - 5;
    const b: V2[] = [{ x: sx, z: H / 2 + 5 }, { x: sx, z: H / 2 - 2.5 }, { x: sx * 0.6 + join.x * 0.4, z: (H / 2 - 2.5 + join.z) / 2 + rng.range(-2, 2) }, ...a.slice(Math.floor(a.length / 2))];
    paths.push(a, b);
  } else paths.push(serpentine(rng, W, H, turns));
  const nSlots = 9 + Math.min(5, Math.floor(level / 12)) + (twoPaths ? 2 : 0);
  const slots = placeSlots(paths, W, H, nSlots, rng, level >= 3 ? 4 : 0, 40 + level * 2);
  const { hpMul, bountyMul } = difficulty(level);
  const boss = endless ? undefined : BOSSES[level];
  const nWaves = endless ? 150 : Math.min(15, 6 + Math.floor(level / 7));
  return {
    id: level, biome, seed: level * 31 + 5, width: W, height: H, paths, slots,
    gate: { x: 0, z: -H / 2 + 0.5, angle: 0 },
    waves: makeWaves(level, biome, rng, nWaves, paths.length, { boss, budgetMul: endless ? 0.9 : 1 }),
    startGold: Math.round(240 + level * 6),
    lives: 20,
    hpMul, bountyMul, boss, endless: endless || undefined,
  };
}
