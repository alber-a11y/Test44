// Headless balance check: a greedy bot plays every level.
// Build & run: npm run balance -- [from] [to]
import { World } from '../../src/sim/World';
import { getLevel } from '../../src/levels/levels';
import { TOWERS, TOWER_ORDER } from '../../src/data/towers';
import type { Loadout } from '../../src/sim/types';

const args = process.argv.slice(2).map(Number);
const from = args[0] || 1, to = args[1] || 100;
const skill = Number(process.env.SKILL ?? 1);

function loadoutFor(level: number): Loadout {
  const towers = TOWER_ORDER.filter((id) => !TOWERS[id].unique && TOWERS[id].unlockLevel <= level);
  // assume the player invested coins into the forge proportionally to progress
  const u = Math.min(5, Math.floor(level / 10));
  const upgrades: Record<string, number> = {};
  for (const k of ['archer', 'ballista', 'catapult', 'mage', 'brazier', 'barracks', 'hero', 'spells', 'gold', 'bounty']) upgrades[k] = u;
  upgrades.lives = Math.min(3, Math.floor(level / 20));
  return { towers, hero: level > 30 ? 'paladin' : 'ranger', spells: level >= 3 ? ['reinforce', 'meteor'] : ['reinforce'], consumables: {}, boosters: [], upgrades, phoenix: false, hound: false, goldSkin: false };
}

function slotScore(w: World, i: number) {
  const s = w.slots[i];
  let c = 0;
  for (const p of w.paths) for (let k = 0; k < p.xs.length; k += 2) if ((p.xs[k] - s.x) ** 2 + (p.zs[k] - s.z) ** 2 < 49) c++;
  return c;
}

function play(levelId: number) {
  const level = getLevel(levelId);
  const w = new World(level, loadoutFor(levelId));
  const order = w.slots.map((_, i) => i).sort((a, b) => slotScore(w, b) - slotScore(w, a));
  const available = w.loadout.towers;
  const plan = (n: number) => {
    // tower mix: damage dealers with some barracks and splash
    const pref = ['ballista', 'archer', 'barracks', 'catapult', 'mage', 'ballista', 'brazier', 'archer', 'catapult', 'mage', 'bell', 'barracks'];
    const list = pref.filter((t) => available.includes(t));
    return list[n % list.length];
  };
  let built = 0;
  const leaks = new Map<string, number>();
  const leakTypes = new Map<string, number>();
  w.startNextWave();
  const dt = 1 / 30;
  let thinkT = 0;
  for (let step = 0; step < 30 * 60 * 25 && w.result === 'none'; step++) {
    w.step(dt);
    for (const ev of w.events) if (ev.t === 'leak') leaks.set('x', (leaks.get('x') ?? 0) + 1);
    w.events.length = 0;
    for (const e of w.enemies) if (e.d >= w.paths[e.path].length - 0.3 && e.state !== 'dead') leakTypes.set(e.def.id, (leakTypes.get(e.def.id) ?? 0) + 1);
    thinkT -= dt;
    if (thinkT > 0) continue;
    thinkT = 1.0 / skill;
    // spells on the densest enemy cluster
    for (const id of Object.keys(w.spellCd)) {
      if (w.spellCd[id] > 0) continue;
      let best = null as null | { x: number; z: number; n: number };
      for (const e of w.enemies) {
        if (e.state === 'dead') continue;
        const n = w.enemies.filter((o) => o.state !== 'dead' && Math.hypot(o.x - e.x, o.z - e.z) < 2.5).length;
        if (!best || n > best.n) best = { x: e.x, z: e.z, n };
      }
      if (best && best.n >= 4) w.castSpell(id, best.x, best.z);
    }
    // spend gold: build on free slots first, then upgrade weakest tower
    for (let guard = 0; guard < 4; guard++) {
      const free = order.find((i) => w.slots[i].open && !w.slots[i].tower);
      const locked = order.find((i) => !w.slots[i].open);
      if (free !== undefined) {
        const id = plan(built);
        if (w.gold >= w.towerCost(id, 0)) { w.build(free, id); built++; continue; }
        break;
      }
      const cand = [...w.towers].filter((t) => w.upgradeCost(t) !== null).sort((a, b) => a.level - b.level);
      const t = cand[0];
      if (t) {
        const br = t.level === 2 ? (t.id % 2) : 0;
        const cost = w.upgradeCost(t, br)!;
        if (w.gold >= cost) { w.upgrade(t.id, br); continue; }
      }
      if (locked !== undefined && w.gold >= w.slots[locked].price && (!t || w.gold > 400)) { w.openSlot(locked); continue; }
      break;
    }
  }
  return { result: w.result, lives: w.lives, max: w.maxLives, stars: w.result === 'victory' ? w.stars() : 0, waves: `${w.wave}/${level.waves.length}`, time: Math.round(w.time), towers: w.towers.length, gold: Math.round(w.gold), leak: [...leakTypes.entries()].map(([k, v]) => k + ':' + v).join(',') };
}

let wins = 0;
const rows: string[] = [];
for (let l = from; l <= to; l++) {
  const r = play(l);
  if (r.result === 'victory') wins++;
  rows.push(`${String(l).padStart(3)} ${r.result.padEnd(8)} ★${r.stars} lives ${r.lives}/${r.max} waves ${r.waves} t=${r.time}s towers=${r.towers} gold=${r.gold} ${process.env.LEAKS ? r.leak : ''}`);
  console.log(rows[rows.length - 1]);
}
console.log(`wins ${wins}/${to - from + 1}`);
