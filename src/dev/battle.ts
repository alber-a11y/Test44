import { Assets } from '../render/Assets';
import { Engine, detectQuality, type Quality } from '../render/Engine';
import { GameSession } from '../game/GameSession';
import { getLevel } from '../levels/levels';

export async function runBattleDev() {
  const params = new URLSearchParams(location.search);
  const levelId = +(params.get('level') ?? 1);
  await Assets.load();
  const engine = new Engine(document.getElementById('app')!);
  engine.setQuality((params.get('q') as Quality) || detectQuality());
  const text = document.createElement('div');
  text.className = 'text-layer';
  document.body.appendChild(text);
  const level = getLevel(levelId);
  const session = new GameSession(engine, level, {
    towers: ['archer', 'ballista', 'barracks', 'catapult', 'mage', 'brazier', 'bell', 'dragon'], hero: params.get('hero') ?? 'ranger',
    spells: ['reinforce', 'meteor'], consumables: { freeze: 2, dynamite: 2 }, boosters: [], upgrades: {}, phoenix: false, hound: false, goldSkin: false,
  }, text, { onEnd: (r) => console.log('END', r), onConvoy: () => {} });
  const w = session.world;
  w.gold = 99999;
  const kinds = ['ballista', 'archer', 'catapult', 'mage', 'barracks', 'brazier', 'dragon', 'bell'];
  w.slots.forEach((s, i) => { s.open = true; if (i % 3 !== 2) w.build(i, kinds[i % kinds.length]); });
  for (const t of w.towers) for (let k = 0; k < (t.id % 4); k++) w.upgrade(t.id, k % 2);
  session.callWave();
  const skip = +(params.get('t') ?? 12);
  for (let i = 0; i < skip * 60; i++) { w.step(1 / 60); if (i % 600 === 0 && !w.waveSpawning) w.startNextWave(); }
  w.events.length = 0;
  engine.start();
  (window as any).session = session;
  if (params.has('zoom')) {
    session.view.rig.zoom(+params.get('zoom')!);
    session.view.rig.focusOn(+(params.get('fx') ?? 0), +(params.get('fz') ?? 0));
    setTimeout(() => { const r = session.view.rig as any; console.log('rig', JSON.stringify({ d: r.dist, gd: r.goalDist, t: r.target, g: r.goal, min: r.minDist, max: r.maxDist, cam: engine.camera.position })); }, 1500);
  }
  document.getElementById('boot')?.remove();
}
