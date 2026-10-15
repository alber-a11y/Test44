// Smoke test: every level (incl. endless = 0) generates and simulates without errors or NaNs.
import { World } from '../../src/sim/World';
import { getLevel, LEVEL_COUNT } from '../../src/levels/levels';
import { TOWER_ORDER, TOWERS } from '../../src/data/towers';
import { HERO_ORDER } from '../../src/data/heroes';

let failures = 0;
for (let id = 0; id <= LEVEL_COUNT; id++) {
  try {
    const level = getLevel(id);
    if (!level.paths.length || level.slots.length < 5 || !level.waves.length) throw new Error('bad level layout');
    const w = new World(level, {
      towers: TOWER_ORDER, hero: HERO_ORDER[id % HERO_ORDER.length], spells: ['reinforce', 'meteor', 'starfall'],
      consumables: { freeze: 2, dynamite: 2, goldrush: 1, repair: 1 }, boosters: ['purse'], upgrades: { archer: 2, hero: 1 },
      phoenix: id % 2 === 0, hound: id % 3 === 0, goldSkin: false,
    });
    w.gold = 100000;
    w.slots.forEach((s, i) => { s.open = true; w.build(i, TOWER_ORDER[(i + id) % TOWER_ORDER.length]); });
    for (const t of w.towers) for (let k = 0; k < 3; k++) w.upgrade(t.id, (t.id + k) % 2);
    w.startNextWave();
    for (let i = 0; i < 20 * 150 && w.result === 'none'; i++) {
      w.step(1 / 20);
      if (i % 200 === 0) {
        w.castSpell('meteor', 0, 0); w.useConsumable('freeze', 0, 0); w.heroAbility(0, 0, 0); w.heroAbility(1, 0, 0);
        if (!w.waveSpawning) w.startNextWave();
      }
      w.events.length = 0;
    }
    for (const e of w.enemies) if (!Number.isFinite(e.x + e.z + e.hp)) throw new Error('NaN enemy ' + e.def.id);
    for (const u of w.allUnits()) if (!Number.isFinite(u.x + u.z + u.hp)) throw new Error('NaN unit');
    if (!Number.isFinite(w.gold)) throw new Error('NaN gold');
    void TOWERS;
  } catch (e) {
    failures++;
    console.error(`level ${id}: ${(e as Error).stack}`);
  }
}
console.log(failures ? `FAILED ${failures}` : `OK: ${LEVEL_COUNT + 1} levels`);
process.exit(failures ? 1 : 0);
