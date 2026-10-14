import { ENEMIES, type EnemyDef } from '../data/enemies';
import { HEROES, type HeroDef, type AbilityDef } from '../data/heroes';
import { TOWERS, towerStats, type TowerDef, type TowerStats, type DmgType, type ProjectileKind } from '../data/towers';
import { UPGRADES } from '../data/items';
import { Path } from './path';
import { Rng } from './rng';
import type { LevelDef, Loadout, GroupDef } from './types';

// -------------------------------------------------------------------------------------------------
// Entities

export interface Enemy {
  id: number;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  speed: number;
  path: number;
  d: number;
  lane: number;
  x: number;
  z: number;
  dx: number;
  dz: number;
  state: 'walk' | 'fight' | 'shoot' | 'dead';
  deadT: number;
  animT: number;
  attackAnim: number;
  slowMul: number;
  slowT: number;
  burnDps: number;
  burnT: number;
  stunT: number;
  frozen: boolean;
  blocker: number;
  atkCd: number;
  abilityCd: number;
  summonCd: number;
  chargeT: number;
  buffT: number;
  buffMul: number;
  hitFlash: number;
  bounty: number;
  shootTarget: number;
}

export interface Unit {
  id: number;
  kind: 'soldier' | 'hero' | 'militia';
  model: string;
  hp: number;
  maxHp: number;
  armor: number;
  dmg: [number, number];
  rate: number;
  range: number;
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  target: number;
  atkCd: number;
  state: 'idle' | 'move' | 'fight' | 'dead';
  respawnT: number;
  towerId: number;
  lifeT: number;
  vsLarge: number;
  animT: number;
  attackAnim: number;
  face: number;
  hitFlash: number;
  calmT: number;
}

export interface Hero extends Unit {
  def: HeroDef;
  moveX: number;
  moveZ: number;
  moving: boolean;
  abilityCd: [number, number];
  dmgMul: number;
}

export interface Tower {
  id: number;
  slot: number;
  def: TowerDef;
  level: number;
  branch: number;
  x: number;
  z: number;
  cd: number;
  aim: number;
  invested: number;
  stats: TowerStats;
  rateMul: number;
  dmgMul: number;
  goldMul: number;
  rallyX: number;
  rallyZ: number;
  soldiers: number[];
  respawn: number[];
  shotT: number;
  incomeT: number;
}

export interface Slot { x: number; z: number; price: number; open: boolean; tower: number }

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  x: number; y: number; z: number;
  sx: number; sy: number; sz: number;
  tx: number; ty: number; tz: number;
  vx: number; vz: number;
  target: number;
  t: number;
  dur: number;
  arc: number;
  dmg: number;
  dmgType: DmgType;
  splash: number;
  pierce: number;
  hit: number[];
  rangeLeft: number;
  slow?: { amt: number; dur: number };
  burn?: { dps: number; dur: number };
  stun?: { chance: number; dur: number };
  crit?: { chance: number; mul: number };
  towerId: number;
  fromHero: boolean;
  fromEnemy: boolean;
  dead: boolean;
}

export interface Coin { id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; value: number; age: number; magnet: boolean; dead: boolean }

export interface Convoy { x: number; z: number; vx: number; vz: number; life: number; claimed: boolean }

export type SimEvent =
  | { t: 'shoot'; kind: ProjectileKind; x: number; z: number; tower: number; hero?: boolean }
  | { t: 'hit'; kind: ProjectileKind; x: number; y: number; z: number; dmg: number; crit?: boolean }
  | { t: 'deflect'; x: number; z: number }
  | { t: 'explode'; x: number; z: number; r: number; fire?: boolean; big?: boolean }
  | { t: 'lightning'; pts: number[] }
  | { t: 'pulse'; x: number; z: number; r: number; tower: number }
  | { t: 'death'; x: number; z: number; enemy: string; large: boolean }
  | { t: 'spawn'; enemy: string; boss: boolean }
  | { t: 'leak'; lives: number }
  | { t: 'coin'; x: number; z: number; value: number }
  | { t: 'collect'; x: number; z: number; value: number }
  | { t: 'melee'; x: number; z: number }
  | { t: 'unitDeath'; x: number; z: number; hero: boolean }
  | { t: 'heal'; x: number; z: number }
  | { t: 'warcry'; x: number; z: number }
  | { t: 'summon'; x: number; z: number }
  | { t: 'waveStart'; wave: number }
  | { t: 'build'; x: number; z: number; tower: string }
  | { t: 'sell'; x: number; z: number; value: number }
  | { t: 'meteor'; x: number; z: number; delay: number }
  | { t: 'star'; x: number; z: number }
  | { t: 'freeze'; x: number; z: number; r: number }
  | { t: 'ability'; id: string; x: number; z: number; r: number }
  | { t: 'income'; x: number; z: number; value: number }
  | { t: 'phoenix' }
  | { t: 'convoy' }
  | { t: 'victory' }
  | { t: 'defeat' };

interface SpawnEntry { time: number; enemy: string; path: number; lane: number; dOff: number }
interface Delayed { time: number; fn: () => void }

const tmp = { x: 0, z: 0, dx: 0, dz: 0 };

// -------------------------------------------------------------------------------------------------

export class World {
  rng: Rng;
  paths: Path[];
  enemies: Enemy[] = [];
  units: Unit[] = [];
  hero: Hero | null = null;
  towers: Tower[] = [];
  slots: Slot[];
  projectiles: Projectile[] = [];
  coins: Coin[] = [];
  events: SimEvent[] = [];
  convoy: Convoy | null = null;

  time = 0;
  gold: number;
  lives: number;
  maxLives: number;
  wave = 0; // number of waves started
  waveTimer: number;
  waveSpawning = false;
  spawnQueue: SpawnEntry[] = [];
  waveStartTime = 0;
  result: 'none' | 'victory' | 'defeat' = 'none';
  kills = 0;
  goldEarned = 0;
  spellCd: Record<string, number> = {};
  consumables: Record<string, number>;
  goldRushT = 0;
  phoenixUsed = false;
  convoyCd = 70;
  waitingFirstWave = true;

  private nextId = 1;
  private delayed: Delayed[] = [];
  private upg: (id: string) => number;
  private sharp: boolean;

  constructor(public level: LevelDef, public loadout: Loadout) {
    this.rng = new Rng(level.seed * 7919 + 13);
    this.paths = level.paths.map((p) => new Path(p));
    this.slots = level.slots.map((s) => ({ x: s.x, z: s.z, price: s.price ?? 0, open: !s.price, tower: 0 }));
    this.upg = (id) => {
      const lvl = loadout.upgrades[id] ?? 0;
      const u = UPGRADES.find((x) => x.id === id);
      return u ? lvl * u.per : 0;
    };
    this.sharp = loadout.boosters.includes('sharp');
    this.gold = level.startGold + this.upg('gold') + (loadout.boosters.includes('purse') ? 150 : 0);
    this.lives = level.lives + this.upg('lives') + (loadout.boosters.includes('walls') ? 5 : 0);
    this.maxLives = this.lives;
    this.waveTimer = 0;
    this.consumables = { ...loadout.consumables };
    for (const s of loadout.spells) this.spellCd[s] = 0;
    this.spawnHero();
  }

  get totalWaves() { return this.level.endless ? Infinity : this.level.waves.length; }

  private id() { return this.nextId++; }

  emit(e: SimEvent) { this.events.push(e); }

  after(delay: number, fn: () => void) { this.delayed.push({ time: this.time + delay, fn }); }

  // ---------------------------------------------------------------------------------------------
  // Player actions

  towerCost(defId: string, level: number, branch = 0) {
    const def = TOWERS[defId];
    const base = towerStats(def, level, branch).cost;
    return Math.round(base * (1 - this.upg('discount')));
  }

  build(slotIdx: number, defId: string): boolean {
    const slot = this.slots[slotIdx];
    if (!slot || !slot.open || slot.tower) return false;
    const cost = this.towerCost(defId, 0);
    if (this.gold < cost) return false;
    this.gold -= cost;
    const def = TOWERS[defId];
    const t: Tower = {
      id: this.id(), slot: slotIdx, def, level: 0, branch: 0, x: slot.x, z: slot.z, cd: 0.3, aim: Math.PI, invested: cost,
      stats: def.levels[0], rateMul: 1, dmgMul: 1, goldMul: 1, rallyX: slot.x, rallyZ: slot.z, soldiers: [], respawn: [], shotT: 0, incomeT: 0,
    };
    // aim initially towards the nearest path point
    let best = Infinity;
    for (const p of this.paths) {
      const c = p.closest(t.x, t.z);
      if (c.dist < best) { best = c.dist; t.aim = Math.atan2(c.x - t.x, c.z - t.z); t.rallyX = c.x; t.rallyZ = c.z; }
    }
    this.towers.push(t);
    slot.tower = t.id;
    this.emit({ t: 'build', x: t.x, z: t.z, tower: defId });
    if (t.stats.soldiers) this.syncSoldiers(t, true);
    return true;
  }

  upgradeCost(t: Tower, branch = 0): number | null {
    if (t.level >= 3 || (t.level === 2 && !t.def.branches.length)) return null;
    return this.towerCost(t.def.id, t.level + 1, branch);
  }

  upgrade(towerId: number, branch = 0): boolean {
    const t = this.towers.find((x) => x.id === towerId);
    if (!t) return false;
    const cost = this.upgradeCost(t, branch);
    if (cost === null || this.gold < cost) return false;
    this.gold -= cost;
    t.invested += cost;
    t.level++;
    if (t.level === 3) t.branch = branch;
    t.stats = towerStats(t.def, t.level, t.branch);
    this.emit({ t: 'build', x: t.x, z: t.z, tower: t.def.id });
    if (t.stats.soldiers) this.syncSoldiers(t, false);
    return true;
  }

  sellValue(t: Tower) { return Math.floor(t.invested * (this.wave === 0 ? 1 : 0.6)); }

  sell(towerId: number) {
    const i = this.towers.findIndex((x) => x.id === towerId);
    if (i < 0) return;
    const t = this.towers[i];
    const v = this.sellValue(t);
    this.gold += v;
    this.slots[t.slot].tower = 0;
    for (const sid of t.soldiers) this.removeUnit(sid);
    this.towers.splice(i, 1);
    this.emit({ t: 'sell', x: t.x, z: t.z, value: v });
  }

  openSlot(slotIdx: number) {
    const s = this.slots[slotIdx];
    if (!s || s.open || this.gold < s.price) return false;
    this.gold -= s.price;
    s.open = true;
    this.emit({ t: 'build', x: s.x, z: s.z, tower: 'slot' });
    return true;
  }

  setRally(towerId: number, x: number, z: number) {
    const t = this.towers.find((tt) => tt.id === towerId);
    if (!t || !t.stats.soldiers) return false;
    if (Math.hypot(x - t.x, z - t.z) > t.stats.range) return false;
    t.rallyX = x; t.rallyZ = z;
    this.syncSoldiers(t, false);
    return true;
  }

  moveHero(x: number, z: number) {
    const h = this.hero;
    if (!h || h.state === 'dead') return;
    const hw = this.level.width / 2 - 0.5, hh = this.level.height / 2 - 0.5;
    h.moveX = Math.max(-hw, Math.min(hw, x));
    h.moveZ = Math.max(-hh, Math.min(hh, z));
    h.moving = true;
    if (h.target) this.releaseTarget(h);
  }

  startNextWave() {
    if (this.result !== 'none') return 0;
    if (this.level.endless === undefined && this.wave >= this.level.waves.length) return 0;
    let bonus = 0;
    if (!this.waitingFirstWave && this.waveTimer > 0) {
      bonus = Math.ceil(this.waveTimer * (1.5 + this.level.id * 0.04));
      this.gold += bonus;
    }
    this.waitingFirstWave = false;
    this.beginWave();
    return bonus;
  }

  castSpell(id: string, x: number, z: number): boolean {
    if (!(id in this.spellCd) || this.spellCd[id] > 0) return false;
    const mul = 1 + this.upg('spells');
    const scale = Math.sqrt(this.level.hpMul);
    if (id === 'reinforce') {
      for (let i = 0; i < 2; i++) {
        const u = this.makeUnit('militia', 'militia', 90 * scale * mul, 0.1, [6 * scale, 10 * scale], 1, x + (i ? 0.6 : -0.6), z);
        u.lifeT = 20;
        this.units.push(u);
      }
      this.emit({ t: 'ability', id, x, z, r: 1.5 });
    } else if (id === 'meteor') {
      this.emit({ t: 'meteor', x, z, delay: 0.8 });
      this.after(0.8, () => {
        this.areaDamage(x, z, 2.6, 130 * scale * mul, 'fire', { burn: { dps: 16 * scale, dur: 3 } });
        this.emit({ t: 'explode', x, z, r: 2.6, fire: true, big: true });
      });
    } else if (id === 'starfall') {
      for (let i = 0; i < 12; i++) {
        this.after(0.15 * i, () => {
          const alive = this.enemies.filter((e) => e.state !== 'dead');
          if (!alive.length) return;
          const e = this.rng.pick(alive);
          this.emit({ t: 'star', x: e.x, z: e.z });
          this.after(0.35, () => {
            this.areaDamage(e.x, e.z, 1.3, 100 * scale * mul, 'magic', {});
            this.emit({ t: 'explode', x: e.x, z: e.z, r: 1.3 });
          });
        });
      }
    } else return false;
    const cdMul = 1 - this.upg('spells');
    const cds: Record<string, number> = { reinforce: 20, meteor: 45, starfall: 60 };
    this.spellCd[id] = (cds[id] ?? 30) * cdMul;
    return true;
  }

  resetSpellCooldown(id: string) { if (id in this.spellCd) this.spellCd[id] = 0; }

  useConsumable(id: string, x: number, z: number): boolean {
    if (!this.consumables[id]) return false;
    const scale = Math.sqrt(this.level.hpMul);
    if (id === 'freeze') {
      for (const e of this.enemies) {
        if (e.state === 'dead' || Math.hypot(e.x - x, e.z - z) > 4) continue;
        e.stunT = Math.max(e.stunT, e.def.boss ? 1.5 : 4);
        e.frozen = true;
      }
      this.emit({ t: 'freeze', x, z, r: 4 });
    } else if (id === 'dynamite') {
      this.emit({ t: 'meteor', x, z, delay: 0.6 });
      this.after(0.6, () => {
        this.areaDamage(x, z, 2.6, 380 * scale, 'true', {});
        this.emit({ t: 'explode', x, z, r: 2.6, big: true });
      });
    } else if (id === 'goldrush') {
      this.goldRushT = 30;
    } else if (id === 'repair') {
      this.lives += 5;
    } else return false;
    this.consumables[id]--;
    return true;
  }

  claimConvoy(): number {
    if (!this.convoy || this.convoy.claimed) return 0;
    this.convoy.claimed = true;
    const v = Math.round(160 + this.level.id * 12);
    this.gold += v;
    this.emit({ t: 'collect', x: this.convoy.x, z: this.convoy.z, value: v });
    this.convoy.life = Math.min(this.convoy.life, 0.6);
    return v;
  }

  /** Second chance after defeat (rewarded ad). */
  revive() {
    if (this.result !== 'defeat') return;
    this.result = 'none';
    this.lives = 10;
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      if (this.paths[e.path].length - e.d < 12) { e.hp = 0; this.kill(e, false); }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Simulation

  step(dt: number) {
    if (this.result !== 'none') return;
    this.time += dt;
    for (let i = this.delayed.length - 1; i >= 0; i--) {
      if (this.delayed[i].time <= this.time) { const d = this.delayed[i]; this.delayed.splice(i, 1); d.fn(); }
    }
    for (const k in this.spellCd) this.spellCd[k] = Math.max(0, this.spellCd[k] - dt);
    if (this.goldRushT > 0) this.goldRushT -= dt;

    this.updateWaves(dt);
    this.updateAuras();
    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateUnits(dt);
    this.updateHero(dt);
    this.updateProjectiles(dt);
    this.updateCoins(dt);
    this.updateConvoy(dt);
    this.checkEnd();
  }

  private beginWave() {
    const def = this.waveDef(this.wave);
    this.wave++;
    this.waveSpawning = true;
    this.waveStartTime = this.time;
    this.spawnQueue = this.buildSchedule(def.groups);
    this.emit({ t: 'waveStart', wave: this.wave });
  }

  waveDef(i: number) {
    const w = this.level.waves;
    if (i < w.length) return w[i];
    return w[w.length - 1];
  }

  private buildSchedule(groups: GroupDef[]): SpawnEntry[] {
    const out: SpawnEntry[] = [];
    for (const g of groups) {
      const path = (g.path ?? 0) % this.paths.length;
      if (g.formation === 'turtle') {
        const cols = Math.min(4, g.count);
        for (let i = 0; i < g.count; i++) {
          const row = Math.floor(i / cols), col = i % cols;
          out.push({ time: g.delay, enemy: g.enemy, path, lane: (col - (cols - 1) / 2) * 0.55, dOff: -row * 0.75 });
        }
      } else if (g.formation === 'column') {
        for (let i = 0; i < g.count; i++) {
          out.push({ time: g.delay + Math.floor(i / 2) * g.gap, enemy: g.enemy, path, lane: i % 2 ? 0.35 : -0.35, dOff: 0 });
        }
      } else {
        for (let i = 0; i < g.count; i++) {
          const pack = g.formation === 'pack';
          out.push({ time: g.delay + i * g.gap * (pack ? this.rng.range(0.3, 0.9) : 1), enemy: g.enemy, path, lane: this.rng.range(-0.85, 0.85), dOff: 0 });
        }
      }
    }
    out.sort((a, b) => a.time - b.time);
    return out;
  }

  private updateWaves(dt: number) {
    if (this.waitingFirstWave) return;
    if (this.waveSpawning) {
      const t = this.time - this.waveStartTime;
      while (this.spawnQueue.length && this.spawnQueue[0].time <= t) {
        const s = this.spawnQueue.shift()!;
        this.spawnEnemy(s.enemy, s.path, s.lane, s.dOff);
      }
      if (!this.spawnQueue.length) {
        this.waveSpawning = false;
        if (this.wave < this.totalWaves) this.waveTimer = this.waveDef(this.wave).prep ?? 16;
      }
    } else if (this.wave < this.totalWaves) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) { this.waveTimer = 0; this.beginWave(); }
    }
  }

  spawnEnemy(id: string, path: number, lane: number, dOff: number, atD?: number): Enemy {
    const def = ENEMIES[id];
    const hp = Math.round(def.hp * this.level.hpMul);
    const e: Enemy = {
      id: this.id(), def, hp, maxHp: hp, speed: def.speed * this.rng.range(0.95, 1.05), path, d: (atD ?? -1.5) + dOff, lane,
      x: 0, z: 0, dx: 0, dz: 1, state: 'walk', deadT: 0, animT: this.rng.range(0, 2), attackAnim: 0, slowMul: 1, slowT: 0, burnDps: 0, burnT: 0,
      stunT: 0, frozen: false, blocker: 0, atkCd: 0, abilityCd: def.warcry?.every ?? def.healer?.every ?? 0, summonCd: def.summoner?.every ?? 0,
      chargeT: 0, buffT: 0, buffMul: 1, hitFlash: 0, bounty: def.bounty * this.level.bountyMul * (1 + this.upg('bounty')), shootTarget: 0,
    };
    this.placeEnemy(e);
    this.enemies.push(e);
    this.emit({ t: 'spawn', enemy: id, boss: !!def.boss });
    return e;
  }

  private placeEnemy(e: Enemy) {
    this.paths[e.path].sample(e.d, tmp);
    // narrow lanes at the very start/end so units funnel through gates
    e.x = tmp.x - tmp.dz * e.lane;
    e.z = tmp.z + tmp.dx * e.lane;
    e.dx = tmp.dx; e.dz = tmp.dz;
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.state === 'dead') {
        e.deadT += dt;
        if (e.deadT > 2.4) this.enemies.splice(i, 1);
        continue;
      }
      // statuses
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.applyDamage(e, e.burnDps * dt, 'fire', null, true);
        if ((e.state as string) === 'dead') continue;
      }
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowMul = 1; }
      if (e.buffT > 0) { e.buffT -= dt; if (e.buffT <= 0) e.buffMul = 1; }
      if (e.stunT > 0) {
        e.stunT -= dt;
        if (e.stunT <= 0) e.frozen = false;
        continue;
      }
      e.animT += dt;
      e.attackAnim = Math.max(0, e.attackAnim - dt);
      const def = e.def;

      // abilities
      if (def.healer) {
        e.abilityCd -= dt;
        if (e.abilityCd <= 0) {
          e.abilityCd = def.healer.every;
          let healed = false;
          for (const o of this.enemies) {
            if (o.state === 'dead' || o.hp >= o.maxHp) continue;
            if (Math.hypot(o.x - e.x, o.z - e.z) <= def.healer.radius) { o.hp = Math.min(o.maxHp, o.hp + def.healer.amount * this.level.hpMul); healed = true; }
          }
          if (healed) { this.emit({ t: 'heal', x: e.x, z: e.z }); e.attackAnim = 0.6; }
        }
      }
      if (def.warcry) {
        e.abilityCd -= dt;
        if (e.abilityCd <= 0) {
          e.abilityCd = def.warcry.every;
          for (const o of this.enemies) {
            if (o.state === 'dead' || Math.hypot(o.x - e.x, o.z - e.z) > def.warcry.radius) continue;
            o.buffMul = def.warcry.speedMul; o.buffT = def.warcry.dur;
          }
          this.emit({ t: 'warcry', x: e.x, z: e.z });
        }
      }
      if (def.summoner) {
        e.summonCd -= dt;
        if (e.summonCd <= 0) {
          e.summonCd = def.summoner.every;
          for (let k = 0; k < def.summoner.count; k++) {
            this.spawnEnemy(def.summoner.enemy, e.path, this.rng.range(-0.8, 0.8), 0, Math.max(0, e.d - 0.8 - k * 0.5));
          }
          this.emit({ t: 'summon', x: e.x, z: e.z });
          e.attackAnim = 0.8;
        }
      }
      let speedMul = e.slowMul * e.buffMul;
      if (def.charge) {
        e.abilityCd -= dt;
        if (e.chargeT > 0) { e.chargeT -= dt; speedMul *= def.charge.speedMul; }
        else if (e.abilityCd <= 0) { e.abilityCd = def.charge.every; e.chargeT = def.charge.dur; }
      }
      if (def.rage && e.hp < e.maxHp * def.rage.below) speedMul *= def.rage.speedMul;

      // blocked by a soldier/hero
      if (e.blocker) {
        const u = this.unitById(e.blocker);
        if (!u || u.state === 'dead' || Math.hypot(u.x - e.x, u.z - e.z) > 2.5) {
          e.blocker = 0;
          e.state = 'walk';
        } else {
          e.state = 'fight';
          if (Math.hypot(u.x - e.x, u.z - e.z) < 1.1) {
            e.atkCd -= dt;
            if (e.atkCd <= 0 && def.melee) {
              e.atkCd = 1 / def.melee.rate;
              e.attackAnim = 0.5;
              this.hurtUnit(u, this.rng.range(def.melee.dmg[0], def.melee.dmg[1]) * Math.sqrt(this.level.hpMul));
              this.emit({ t: 'melee', x: (u.x + e.x) / 2, z: (u.z + e.z) / 2 });
            }
          }
          continue;
        }
      }

      // ranged attackers stop and shoot units in range
      if (def.ranged) {
        e.atkCd -= dt;
        const tgt = this.nearestUnit(e.x, e.z, def.ranged.range);
        if (tgt) {
          e.state = 'shoot';
          e.shootTarget = tgt.id;
          if (e.atkCd <= 0) {
            e.atkCd = 1 / def.ranged.rate;
            e.attackAnim = 0.6;
            this.fireAtUnit(e, tgt);
          }
          continue;
        } else e.state = 'walk';
      }

      // trample: damage units in contact
      if (def.trample) {
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          e.atkCd = 1;
          for (const u of this.allUnits()) {
            if (u.state === 'dead') continue;
            if (Math.hypot(u.x - e.x, u.z - e.z) < def.radius + 0.6) {
              this.hurtUnit(u, 25 * Math.sqrt(this.level.hpMul) * (def.boss ? 3 : 1));
              this.emit({ t: 'melee', x: u.x, z: u.z });
            }
          }
        }
      }

      e.state = 'walk';
      e.d += e.speed * speedMul * dt;
      this.placeEnemy(e);
      if (e.d >= this.paths[e.path].length) {
        this.leak(e);
        this.enemies.splice(i, 1);
      }
    }
  }

  private leak(e: Enemy) {
    this.lives -= e.def.lives;
    this.emit({ t: 'leak', lives: e.def.lives });
    if (e.blocker) e.blocker = 0;
    if (this.lives <= 0) {
      if (this.loadout.phoenix && !this.phoenixUsed) {
        this.phoenixUsed = true;
        this.lives = 10;
        this.emit({ t: 'phoenix' });
      } else {
        this.lives = 0;
      }
    }
  }

  private checkEnd() {
    if (this.result !== 'none') return;
    if (this.lives <= 0) {
      this.result = 'defeat';
      this.emit({ t: 'defeat' });
      return;
    }
    if (!this.level.endless && this.wave >= this.level.waves.length && !this.waveSpawning && !this.enemies.some((e) => e.state !== 'dead')) {
      this.result = 'victory';
      this.emit({ t: 'victory' });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Damage

  applyDamage(e: Enemy, amount: number, type: DmgType, from: { x: number; z: number; kind: ProjectileKind } | null, silent = false): number {
    if (e.state === 'dead') return 0;
    let a = amount;
    if (type === 'phys') a *= 1 - e.def.armor;
    else if (type === 'magic') a *= 1 - e.def.mres;
    else if (type === 'fire') a *= 1 - e.def.armor * 0.4;
    if (from && e.def.shieldFront && (from.kind === 'arrow' || from.kind === 'bolt')) {
      const vx = from.x - e.x, vz = from.z - e.z;
      const l = Math.hypot(vx, vz) || 1;
      if ((vx * e.dx + vz * e.dz) / l > 0.3) {
        a *= 0.15;
        this.emit({ t: 'deflect', x: e.x, z: e.z });
      }
    }
    e.hp -= a;
    if (!silent) e.hitFlash = 0.12;
    if (e.hp <= 0) this.kill(e, true);
    return a;
  }

  private kill(e: Enemy, reward: boolean) {
    e.state = 'dead';
    e.deadT = 0;
    e.hp = 0;
    if (e.blocker) {
      const u = this.unitById(e.blocker);
      if (u && u.target === e.id) u.target = 0;
      e.blocker = 0;
    }
    for (const u of this.allUnits()) if (u.target === e.id) { u.target = 0; if (u.state === 'fight') u.state = 'idle'; }
    this.emit({ t: 'death', x: e.x, z: e.z, enemy: e.def.id, large: !!e.def.large });
    if (!reward) return;
    this.kills++;
    let mul = this.goldRushT > 0 ? 2 : 1;
    for (const t of this.towers) {
      if (t.stats.aura?.goldMul && Math.hypot(t.x - e.x, t.z - e.z) <= t.stats.range) mul *= t.stats.aura.goldMul;
    }
    const value = Math.max(1, Math.round(e.bounty * mul));
    const n = Math.min(6, Math.max(1, Math.round(value / 6)));
    let rest = value;
    for (let k = 0; k < n; k++) {
      const v = k === n - 1 ? rest : Math.floor(value / n);
      rest -= v;
      const a = this.rng.range(0, Math.PI * 2), s = this.rng.range(0.6, 1.6);
      this.coins.push({ id: this.id(), x: e.x, y: 0.6, z: e.z, vx: Math.cos(a) * s, vy: this.rng.range(3.5, 5.5), vz: Math.sin(a) * s, value: v, age: 0, magnet: false, dead: false });
    }
    this.emit({ t: 'coin', x: e.x, z: e.z, value });
  }

  areaDamage(x: number, z: number, r: number, dmg: number, type: DmgType, opts: { burn?: { dps: number; dur: number }; slow?: { amt: number; dur: number }; stun?: { chance: number; dur: number } }, exclude?: number) {
    for (const e of this.enemies) {
      if (e.state === 'dead' || e.id === exclude) continue;
      const dist = Math.hypot(e.x - x, e.z - z);
      if (dist > r + e.def.radius * 0.5) continue;
      const fall = 1 - 0.4 * Math.min(1, dist / r);
      this.applyDamage(e, dmg * fall, type, null);
      this.applyEffects(e, opts);
    }
  }

  private applyEffects(e: Enemy, o: { burn?: { dps: number; dur: number }; slow?: { amt: number; dur: number }; stun?: { chance: number; dur: number } }) {
    if (e.state === 'dead') return;
    if (o.burn) { e.burnDps = Math.max(e.burnDps * (e.burnT > 0 ? 1 : 0), o.burn.dps); e.burnT = Math.max(e.burnT, o.burn.dur); }
    if (o.slow && !e.def.boss) { e.slowMul = Math.min(e.slowMul, 1 - o.slow.amt); e.slowT = Math.max(e.slowT, o.slow.dur); }
    else if (o.slow) { e.slowMul = Math.min(e.slowMul, 1 - o.slow.amt * 0.4); e.slowT = Math.max(e.slowT, o.slow.dur); }
    if (o.stun && this.rng.chance(o.stun.chance)) e.stunT = Math.max(e.stunT, e.def.boss ? o.stun.dur * 0.3 : o.stun.dur);
  }

  // ---------------------------------------------------------------------------------------------
  // Towers

  private updateAuras() {
    for (const t of this.towers) { t.rateMul = 1; t.dmgMul = this.towerDmgUpgrade(t.def.id) * (this.sharp ? 1.15 : 1); }
    for (const b of this.towers) {
      const a = b.stats.aura;
      if (!a) continue;
      for (const t of this.towers) {
        if (t === b || Math.hypot(t.x - b.x, t.z - b.z) > b.stats.range) continue;
        if (a.rateMul) t.rateMul = Math.max(t.rateMul, a.rateMul);
        if (a.dmgMul) t.dmgMul *= a.dmgMul;
      }
    }
  }

  private towerDmgUpgrade(id: string) { return 1 + this.upg(id); }

  private targetFor(t: Tower, range: number, exclude: number[] = []): Enemy | null {
    let best: Enemy | null = null, bestRemain = Infinity;
    for (const e of this.enemies) {
      if (e.state === 'dead' || e.d < 0 || exclude.includes(e.id)) continue;
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 > range * range) continue;
      const remain = this.paths[e.path].length - e.d;
      if (remain < bestRemain) { bestRemain = remain; best = e; }
    }
    return best;
  }

  private updateTowers(dt: number) {
    for (const t of this.towers) {
      t.shotT = Math.max(0, t.shotT - dt);
      const s = t.stats;
      if (s.soldiers) { this.updateBarracks(t, dt); continue; }
      if (s.aura) {
        if (s.aura.income) {
          t.incomeT += dt;
          if (t.incomeT >= 2 && !this.waitingFirstWave) { t.incomeT = 0; this.gold += s.aura.income; this.emit({ t: 'income', x: t.x, z: t.z, value: s.aura.income }); }
        }
        continue;
      }
      t.cd -= dt * t.rateMul;
      if (t.cd > 0) continue;
      if (s.pulse) {
        let any = false;
        for (const e of this.enemies) {
          if (e.state === 'dead' || Math.hypot(e.x - t.x, e.z - t.z) > s.range) continue;
          any = true;
          this.applyDamage(e, (s.dmg[0] / s.rate) * t.dmgMul * Math.sqrt(this.level.hpMul), s.dmgType, null);
          if (s.slow) this.applyEffects(e, { slow: s.slow });
        }
        t.cd = 1 / s.rate;
        if (any) { this.emit({ t: 'pulse', x: t.x, z: t.z, r: s.range, tower: t.id }); t.shotT = 0.5; }
        continue;
      }
      const target = this.targetFor(t, s.range);
      if (!target) continue;
      t.cd = 1 / s.rate;
      t.aim = Math.atan2(target.x - t.x, target.z - t.z);
      t.shotT = 0.35;
      const shots = s.multishot ?? 1;
      const targets = [target];
      for (let k = 1; k < shots; k++) {
        const more = this.targetFor(t, s.range, targets.map((x) => x.id));
        if (more) targets.push(more);
      }
      for (const tg of targets) this.fire(t, tg);
    }
  }

  private towerTop(t: Tower) {
    const h: Record<string, number> = { archer: 3.6, ballista: 3.4, catapult: 3.2, mage: 4.6, dragon: 4.6 };
    return h[t.def.look] ?? 3;
  }

  private rollDmg(s: { dmg: [number, number] }) { return this.rng.range(s.dmg[0], s.dmg[1]); }

  private fire(t: Tower, e: Enemy) {
    const s = t.stats;
    const scale = Math.sqrt(this.level.hpMul) * 0.5 + 0.5;
    const dmg = this.rollDmg(s) * t.dmgMul * scale;
    const sy = this.towerTop(t);
    this.emit({ t: 'shoot', kind: s.projectile, x: t.x, z: t.z, tower: t.id });
    if (s.projectile === 'lightning') {
      const pts = [t.x, sy, t.z];
      let cur: Enemy | null = e;
      const hitIds: number[] = [];
      let d = dmg;
      for (let k = 0; k < (s.chain ?? 1) && cur; k++) {
        pts.push(cur.x, 0.9, cur.z);
        this.applyDamage(cur, d, s.dmgType, null);
        hitIds.push(cur.id);
        d *= 0.8;
        let next: Enemy | null = null, bd = 3.5;
        for (const o of this.enemies) {
          if (o.state === 'dead' || hitIds.includes(o.id)) continue;
          const dist = Math.hypot(o.x - cur.x, o.z - cur.z);
          if (dist < bd) { bd = dist; next = o; }
        }
        cur = next;
      }
      this.emit({ t: 'lightning', pts });
      return;
    }
    const p = this.newProjectile(s.projectile, t.x, sy, t.z, dmg, s.dmgType);
    p.towerId = t.id;
    p.splash = s.splash ?? 0;
    p.pierce = s.pierce ?? 1;
    p.slow = s.slow; p.burn = s.burn; p.stun = s.stun; p.crit = s.crit;
    const speed = s.speed ?? 15;
    if (s.projectile === 'bolt') {
      const dist = Math.hypot(e.x - t.x, e.z - t.z);
      const lead = dist / speed;
      this.paths[e.path].sample(e.d + e.speed * e.slowMul * lead, tmp);
      const px = tmp.x - tmp.dz * e.lane, pz = tmp.z + tmp.dx * e.lane;
      const l = Math.hypot(px - t.x, pz - t.z) || 1;
      p.vx = ((px - t.x) / l) * speed; p.vz = ((pz - t.z) / l) * speed;
      p.rangeLeft = s.range + 3;
      p.sy = p.y = 2.2;
      p.ty = 0.7;
      p.dur = l / speed;
    } else if (s.projectile === 'boulder') {
      const dist = Math.hypot(e.x - t.x, e.z - t.z);
      const flight = 0.6 + dist / speed;
      this.paths[e.path].sample(e.d + (e.stunT > 0 || e.blocker ? 0 : e.speed * e.slowMul * flight), tmp);
      p.tx = tmp.x - tmp.dz * e.lane; p.tz = tmp.z + tmp.dx * e.lane; p.ty = 0;
      p.dur = flight;
      p.arc = 3 + dist * 0.35;
      p.target = 0;
    } else {
      p.target = e.id;
      p.tx = e.x; p.tz = e.z; p.ty = 0.8;
      const dist = Math.hypot(e.x - t.x, e.z - t.z);
      p.dur = Math.max(0.15, dist / speed);
      p.arc = s.projectile === 'arrow' ? 0.6 + dist * 0.12 : s.projectile === 'firebolt' ? 0.8 : 0.3;
    }
    this.projectiles.push(p);
  }

  private newProjectile(kind: ProjectileKind, x: number, y: number, z: number, dmg: number, dmgType: DmgType): Projectile {
    return {
      id: this.id(), kind, x, y, z, sx: x, sy: y, sz: z, tx: x, ty: y, tz: z, vx: 0, vz: 0, target: 0, t: 0, dur: 1, arc: 0,
      dmg, dmgType, splash: 0, pierce: 1, hit: [], rangeLeft: 0, towerId: 0, fromHero: false, fromEnemy: false, dead: false,
    };
  }

  private fireAtUnit(e: Enemy, u: Unit) {
    const p = this.newProjectile(e.def.id === 'sk_mage' || e.def.id === 'lich' ? 'orb' : 'arrow', e.x, 1.1, e.z, this.rollDmg(e.def.ranged!) * Math.sqrt(this.level.hpMul), 'phys');
    p.fromEnemy = true;
    p.target = u.id;
    p.tx = u.x; p.tz = u.z; p.ty = 0.8;
    const dist = Math.hypot(u.x - e.x, u.z - e.z);
    p.dur = Math.max(0.15, dist / 14);
    p.arc = 0.4 + dist * 0.1;
    this.projectiles.push(p);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.dead) { this.projectiles.splice(i, 1); continue; }
      if (p.kind === 'bolt') {
        p.x += p.vx * dt; p.z += p.vz * dt;
        p.t += dt;
        p.y = p.sy + (p.ty - p.sy) * Math.min(1, p.t / Math.max(0.05, p.dur));
        p.rangeLeft -= Math.hypot(p.vx, p.vz) * dt;
        for (const e of this.enemies) {
          if (e.state === 'dead' || p.hit.includes(e.id)) continue;
          if (Math.hypot(e.x - p.x, e.z - p.z) < e.def.radius + 0.35) {
            p.hit.push(e.id);
            this.applyDamage(e, p.dmg, p.dmgType, { x: p.sx, z: p.sz, kind: 'bolt' });
            this.applyEffects(e, p);
            this.emit({ t: 'hit', kind: 'bolt', x: e.x, y: 0.8, z: e.z, dmg: p.dmg });
            p.dmg *= 0.85;
            if (--p.pierce <= 0) { p.dead = true; break; }
          }
        }
        if (p.rangeLeft <= 0) p.dead = true;
        continue;
      }
      p.t += dt;
      // homing for arrow/orb/firebolt
      if (p.target) {
        if (p.fromEnemy) {
          const u = this.unitById(p.target);
          if (u && u.state !== 'dead') { p.tx = u.x; p.tz = u.z; }
        } else {
          const e = this.enemyById(p.target);
          if (e && e.state !== 'dead') { p.tx = e.x; p.tz = e.z; }
        }
      }
      const k = Math.min(1, p.t / p.dur);
      p.x = p.sx + (p.tx - p.sx) * k;
      p.z = p.sz + (p.tz - p.sz) * k;
      p.y = p.sy + (p.ty - p.sy) * k + p.arc * 4 * k * (1 - k);
      if (k < 1) continue;
      p.dead = true;
      if (p.fromEnemy) {
        const u = this.unitById(p.target);
        if (u && u.state !== 'dead') this.hurtUnit(u, p.dmg);
        continue;
      }
      if (p.kind === 'boulder' || p.splash > 0) {
        const fire = p.dmgType === 'fire';
        this.areaDamage(p.tx, p.tz, p.splash || 1.5, p.dmg, p.dmgType, p);
        this.emit({ t: 'explode', x: p.tx, z: p.tz, r: p.splash || 1.5, fire });
        continue;
      }
      const e = this.enemyById(p.target);
      if (e && e.state !== 'dead') {
        let dmg = p.dmg;
        let crit = false;
        if (p.crit && this.rng.chance(p.crit.chance)) { dmg *= p.crit.mul; crit = true; }
        const dealt = this.applyDamage(e, dmg, p.dmgType, { x: p.sx, z: p.sz, kind: p.kind });
        this.applyEffects(e, p);
        this.emit({ t: 'hit', kind: p.kind, x: p.tx, y: p.ty, z: p.tz, dmg: dealt, crit });
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Units (soldiers, militia, hero)

  private makeUnit(kind: Unit['kind'], model: string, hp: number, armor: number, dmg: [number, number], rate: number, x: number, z: number): Unit {
    return {
      id: this.id(), kind, model, hp, maxHp: hp, armor, dmg, rate, range: 0.9, x, z, homeX: x, homeZ: z, target: 0, atkCd: 0,
      state: 'idle', respawnT: 0, towerId: 0, lifeT: Infinity, vsLarge: 1, animT: this.rng.range(0, 2), attackAnim: 0, face: Math.PI, hitFlash: 0, calmT: 0,
    };
  }

  private syncSoldiers(t: Tower, initial: boolean) {
    const s = t.stats.soldiers!;
    const hpMul = 1 + this.upg('barracks');
    // upgrade existing soldiers in place
    for (const sid of t.soldiers) {
      const u = this.unitById(sid);
      if (!u) continue;
      u.maxHp = s.hp * hpMul; u.hp = u.maxHp; u.armor = s.armor; u.dmg = s.dmg; u.model = s.model; u.vsLarge = s.vsLarge ?? 1;
    }
    while (t.soldiers.length < s.count) {
      const u = this.makeUnit('soldier', s.model, s.hp * hpMul, s.armor, s.dmg, 1, t.x, t.z);
      u.towerId = t.id;
      u.vsLarge = s.vsLarge ?? 1;
      this.units.push(u);
      t.soldiers.push(u.id);
      t.respawn.push(0);
    }
    // formation around rally point
    t.soldiers.forEach((sid, k) => {
      const u = this.unitById(sid);
      if (!u) return;
      const a = (k / t.soldiers.length) * Math.PI * 2 + 0.5;
      u.homeX = t.rallyX + Math.cos(a) * 0.65;
      u.homeZ = t.rallyZ + Math.sin(a) * 0.65;
      if (initial) { u.x = t.x; u.z = t.z; }
      if (u.target) this.releaseTarget(u);
      u.state = 'move';
    });
  }

  private updateBarracks(t: Tower, dt: number) {
    const s = t.stats.soldiers!;
    t.soldiers.forEach((sid, k) => {
      const u = this.unitById(sid);
      if (!u) return;
      if (u.state === 'dead') {
        t.respawn[k] -= dt;
        if (t.respawn[k] <= 0) {
          u.state = 'move'; u.hp = u.maxHp; u.x = t.x; u.z = t.z; u.target = 0;
        }
      } else t.respawn[k] = s.respawn;
    });
  }

  private engageRadius(u: Unit) {
    if (u.kind === 'hero') return (u as Hero).def.range > 2 ? (u as Hero).def.range : 3.2;
    return u.kind === 'militia' ? 3 : 2.4;
  }

  private releaseTarget(u: Unit) {
    const e = this.enemyById(u.target);
    if (e && e.blocker === u.id) { e.blocker = 0; e.state = 'walk'; }
    u.target = 0;
  }

  private findTargetFor(u: Unit): Enemy | null {
    const r = this.engageRadius(u);
    let best: Enemy | null = null, bd = Infinity;
    // prefer unblocked enemies near the home point
    for (const e of this.enemies) {
      if (e.state === 'dead' || e.d < 0) continue;
      const dist = Math.hypot(e.x - u.homeX, e.z - u.homeZ);
      if (dist > r) continue;
      const score = dist + (e.blocker ? 3 : 0) + (e.def.trample ? 1.5 : 0);
      if (score < bd) { bd = score; best = e; }
    }
    return best;
  }

  private updateUnits(dt: number) {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      u.hitFlash = Math.max(0, u.hitFlash - dt);
      u.attackAnim = Math.max(0, u.attackAnim - dt);
      if (u.state === 'dead') continue;
      u.animT += dt;
      if (u.kind === 'militia') {
        u.lifeT -= dt;
        if (u.lifeT <= 0) { this.releaseTarget(u); this.units.splice(i, 1); continue; }
      }
      this.updateMelee(u, dt, 2.6);
    }
  }

  /** Shared melee logic for soldiers / militia / melee hero. */
  private updateMelee(u: Unit, dt: number, speed: number) {
    let e = u.target ? this.enemyById(u.target) : null;
    if (e && (e.state === 'dead' || Math.hypot(e.x - u.homeX, e.z - u.homeZ) > this.engageRadius(u) + 1.5)) {
      this.releaseTarget(u);
      e = null;
    }
    if (!e) {
      e = this.findTargetFor(u);
      if (e) {
        u.target = e.id;
        if (!e.blocker && !e.def.trample) { e.blocker = u.id; }
      }
    }
    if (e) {
      const dist = Math.hypot(e.x - u.x, e.z - u.z);
      u.face = Math.atan2(e.x - u.x, e.z - u.z);
      const reach = e.def.radius + 0.55;
      if (dist > reach) {
        u.state = 'move';
        const step = Math.min(dist - reach * 0.9, speed * dt);
        u.x += ((e.x - u.x) / dist) * step;
        u.z += ((e.z - u.z) / dist) * step;
      } else {
        u.state = 'fight';
        u.calmT = 0;
        u.atkCd -= dt;
        if (u.atkCd <= 0) {
          u.atkCd = 1 / u.rate;
          u.attackAnim = 0.5;
          let dmg = this.rng.range(u.dmg[0], u.dmg[1]);
          if (e.def.large) dmg *= u.vsLarge;
          if (u.kind === 'hero') dmg *= (u as Hero).dmgMul;
          this.applyDamage(e, dmg, 'phys', null);
          this.emit({ t: 'melee', x: (u.x + e.x) / 2, z: (u.z + e.z) / 2 });
        }
      }
      return;
    }
    // walk home & regenerate
    const dh = Math.hypot(u.homeX - u.x, u.homeZ - u.z);
    u.calmT += dt;
    if (u.calmT > 2.5) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.08 * dt);
    if (dh > 0.08) {
      u.state = 'move';
      const step = Math.min(dh, speed * dt);
      u.face = Math.atan2(u.homeX - u.x, u.homeZ - u.z);
      u.x += ((u.homeX - u.x) / dh) * step;
      u.z += ((u.homeZ - u.z) / dh) * step;
    } else u.state = 'idle';
  }

  hurtUnit(u: Unit, dmg: number) {
    if (u.state === 'dead') return;
    u.hp -= dmg * (1 - u.armor);
    u.hitFlash = 0.12;
    u.calmT = 0;
    if (u.hp <= 0) {
      u.hp = 0;
      u.state = 'dead';
      this.releaseTarget(u);
      for (const e of this.enemies) if (e.blocker === u.id) { e.blocker = 0; e.state = 'walk'; }
      this.emit({ t: 'unitDeath', x: u.x, z: u.z, hero: u.kind === 'hero' });
      if (u.kind === 'hero') u.respawnT = 12;
      if (u.kind === 'militia') { const i = this.units.indexOf(u); if (i >= 0) this.units.splice(i, 1); }
    }
  }

  private removeUnit(id: number) {
    const i = this.units.findIndex((u) => u.id === id);
    if (i < 0) return;
    this.releaseTarget(this.units[i]);
    for (const e of this.enemies) if (e.blocker === id) { e.blocker = 0; e.state = 'walk'; }
    this.units.splice(i, 1);
  }

  private spawnHero() {
    const def = HEROES[this.loadout.hero] ?? HEROES.ranger;
    const g = this.level.gate;
    const hp = def.hp * (1 + this.upg('hero'));
    const hx = g.x * 0.85, hz = g.z * 0.85 + 2.5;
    const base = this.makeUnit('hero', def.model, hp, def.armor, def.dmg, def.rate, hx, hz);
    this.hero = { ...base, def, moveX: hx, moveZ: hz, moving: false, abilityCd: [0, 0], dmgMul: 1 + this.upg('hero'), range: def.range };
  }

  heroAbility(idx: 0 | 1, x: number, z: number): boolean {
    const h = this.hero;
    if (!h || h.state === 'dead' || h.abilityCd[idx] > 0) return false;
    const ab: AbilityDef = h.def.abilities[idx];
    const scale = Math.sqrt(this.level.hpMul) * h.dmgMul;
    const cx = ab.targeted ? x : h.x, cz = ab.targeted ? z : h.z;
    const r = ab.radius ?? 2;
    h.abilityCd[idx] = ab.cooldown;
    h.attackAnim = 0.8;
    this.emit({ t: 'ability', id: ab.id, x: cx, z: cz, r });
    if (ab.heal) {
      for (const u of this.allUnits()) {
        if (u.state !== 'dead' && Math.hypot(u.x - cx, u.z - cz) <= r) u.hp = Math.min(u.maxHp, u.hp + ab.heal);
      }
      this.emit({ t: 'heal', x: cx, z: cz });
    }
    if (ab.dmg) {
      const ticks = ab.ticks ?? 1;
      for (let k = 0; k < ticks; k++) {
        this.after(0.25 + k * 0.3, () => {
          const fx = ab.targeted ? cx : h.x, fz = ab.targeted ? cz : h.z;
          this.areaDamage(fx, fz, r, ab.dmg! * scale, ab.dmgType ?? 'phys', { slow: ab.slow, stun: ab.stun ? { chance: 1, dur: ab.stun } : undefined });
          if (ab.id === 'fireball') this.emit({ t: 'explode', x: fx, z: fz, r, fire: true, big: true });
        });
      }
    } else if (ab.slow) {
      this.areaDamage(cx, cz, r, 0, 'phys', { slow: ab.slow });
    }
    if (ab.stun && !ab.dmg) this.areaDamage(cx, cz, r, 0, 'phys', { stun: { chance: 1, dur: ab.stun } });
    if (ab.id === 'frostnova') {
      for (const e of this.enemies) if (e.state !== 'dead' && Math.hypot(e.x - cx, e.z - cz) <= r) e.frozen = true;
    }
    return true;
  }

  private updateHero(dt: number) {
    const h = this.hero;
    if (!h) return;
    h.hitFlash = Math.max(0, h.hitFlash - dt);
    h.attackAnim = Math.max(0, h.attackAnim - dt);
    h.abilityCd[0] = Math.max(0, h.abilityCd[0] - dt);
    h.abilityCd[1] = Math.max(0, h.abilityCd[1] - dt);
    if (h.state === 'dead') {
      h.respawnT -= dt;
      if (h.respawnT <= 0) {
        const g = this.level.gate;
        h.state = 'idle'; h.hp = h.maxHp; h.x = g.x * 0.85; h.z = g.z * 0.85 + 2.5; h.moving = false;
        h.homeX = h.x; h.homeZ = h.z;
      }
      return;
    }
    h.animT += dt;
    if (h.moving) {
      const dx = h.moveX - h.x, dz = h.moveZ - h.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.1) {
        h.moving = false;
        h.homeX = h.x; h.homeZ = h.z;
      } else {
        const step = Math.min(dist, h.def.speed * dt);
        h.x += (dx / dist) * step; h.z += (dz / dist) * step;
        h.face = Math.atan2(dx, dz);
        h.state = 'move';
      }
      h.calmT += dt;
      if (h.calmT > 3) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.04 * dt);
      return;
    }
    if (h.def.projectile === 'none') {
      this.updateMelee(h, dt, h.def.speed);
      return;
    }
    // ranged hero: block one nearby enemy, shoot the nearest one in range
    for (const e of this.enemies) {
      if (e.state !== 'walk' || e.blocker || e.def.trample || e.def.boss) continue;
      if (Math.hypot(e.x - h.x, e.z - h.z) < 1.0) { e.blocker = h.id; break; }
    }
    let target: Enemy | null = null, bd = h.def.range;
    for (const e of this.enemies) {
      if (e.state === 'dead' || e.d < 0) continue;
      const dist = Math.hypot(e.x - h.x, e.z - h.z);
      if (dist < bd) { bd = dist; target = e; }
    }
    h.atkCd -= dt;
    if (target) {
      h.face = Math.atan2(target.x - h.x, target.z - h.z);
      h.state = 'fight';
      h.calmT = 0;
      if (h.atkCd <= 0) {
        h.atkCd = 1 / h.def.rate;
        h.attackAnim = 0.45;
        const dmg = this.rng.range(h.def.dmg[0], h.def.dmg[1]) * h.dmgMul * Math.sqrt(Math.sqrt(this.level.hpMul));
        const p = this.newProjectile(h.def.projectile, h.x, 1.2, h.z, dmg, h.def.dmgType);
        p.fromHero = true;
        p.target = target.id;
        p.tx = target.x; p.tz = target.z; p.ty = 0.8;
        p.dur = Math.max(0.12, bd / 18);
        p.arc = 0.3 + bd * 0.08;
        this.projectiles.push(p);
        this.emit({ t: 'shoot', kind: h.def.projectile, x: h.x, z: h.z, tower: 0, hero: true });
      }
    } else {
      h.state = 'idle';
      h.calmT += dt;
      if (h.calmT > 3) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.04 * dt);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Coins & convoy

  magnetRadius() { return 3.2 * (1 + this.upg('magnet')); }

  private updateCoins(dt: number) {
    const h = this.hero && this.hero.state !== 'dead' ? this.hero : null;
    const mr = this.magnetRadius();
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.age += dt;
      if (!c.magnet) {
        if (c.y > 0.08 || c.vy > 0) {
          c.vy -= 18 * dt;
          c.x += c.vx * dt; c.z += c.vz * dt; c.y += c.vy * dt;
          if (c.y < 0.08) { c.y = 0.08; c.vy = c.vy < -2 ? -c.vy * 0.35 : 0; c.vx *= 0.5; c.vz *= 0.5; }
        }
        if (h && Math.hypot(h.x - c.x, h.z - c.z) < mr && c.age > 0.25) c.magnet = true;
        if (this.loadout.hound && c.age > 0.6) c.magnet = true;
        if (c.age > 4.5) c.magnet = true;
      } else {
        // fly towards hero (or straight up to the treasury if no hero nearby)
        const toHero = h && Math.hypot(h.x - c.x, h.z - c.z) < mr * 1.5;
        const tx = toHero ? h!.x : c.x, tz = toHero ? h!.z : c.z, ty = toHero ? 1 : 6;
        const dx = tx - c.x, dy = ty - c.y, dz = tz - c.z;
        const dist = Math.hypot(dx, dy, dz);
        const sp = 9 + c.age * 4;
        if (dist < 0.35) {
          const bonus = toHero ? 1.25 : 1;
          const v = Math.round(c.value * bonus);
          this.gold += v;
          this.goldEarned += v;
          this.emit({ t: 'collect', x: c.x, z: c.z, value: v });
          this.coins.splice(i, 1);
          continue;
        }
        c.x += (dx / dist) * sp * dt; c.y += (dy / dist) * sp * dt; c.z += (dz / dist) * sp * dt;
      }
    }
  }

  private updateConvoy(dt: number) {
    if (this.convoy) {
      const c = this.convoy;
      c.life -= dt;
      c.x += c.vx * dt; c.z += c.vz * dt;
      if (c.life <= 0) this.convoy = null;
      return;
    }
    if (this.waitingFirstWave || this.level.id < 3) return;
    this.convoyCd -= dt;
    if (this.convoyCd <= 0) {
      this.convoyCd = this.rng.range(80, 120);
      const w = this.level.width / 2 - 2, hh = this.level.height / 2;
      const left = this.rng.chance(0.5);
      const z = this.rng.range(-hh * 0.4, hh * 0.4);
      this.convoy = { x: left ? -w : w, z, vx: left ? 1.1 : -1.1, vz: 0, life: 14, claimed: false };
      this.emit({ t: 'convoy' });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Queries

  enemyById(id: number) { return this.enemies.find((e) => e.id === id) ?? null; }
  unitById(id: number): Unit | null {
    if (this.hero && this.hero.id === id) return this.hero;
    return this.units.find((u) => u.id === id) ?? null;
  }
  allUnits(): Unit[] { return this.hero ? [...this.units, this.hero] : this.units; }
  private nearestUnit(x: number, z: number, r: number): Unit | null {
    let best: Unit | null = null, bd = r;
    for (const u of this.allUnits()) {
      if (u.state === 'dead') continue;
      const d = Math.hypot(u.x - x, u.z - z);
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }

  stars(): number {
    const ratio = this.lives / this.maxLives;
    return ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1;
  }
}
