import { World, type SimEvent } from '../sim/World';
import type { LevelDef, Loadout } from '../sim/types';
import { GameView } from '../render/GameView';
import type { Engine } from '../render/Engine';
import { Input } from './Input';
import { hud, selection, targeting, tipQueue, bossBanner, waveBanner, type HudSnapshot } from './hud';
import { Audio, type SfxName, type MusicName } from '../audio/AudioManager';
import { SPELLS, CONSUMABLE_ORDER, CONSUMABLES } from '../data/items';
import { HEROES } from '../data/heroes';
import { profile } from '../app/save';
import { Platform } from '../platform/Platform';

const STEP = 1 / 60;

export interface SessionCallbacks {
  onEnd(result: 'victory' | 'defeat', world: World): void;
  onConvoy(): void;
  onConvoyAppear?(): void;
}

/** One battle: simulation + view + input + HUD bridge. */
export class GameSession {
  world: World;
  view: GameView;
  input: Input;
  speed = 1;
  private acc = 0;
  private pauseReasons = new Set<string>();
  private keys = new Set<string>();
  private offUpdate: () => void;
  private hudT = 0;
  private ended = false;
  private bossAnnounced = false;
  private calmT = 0;

  constructor(public engine: Engine, public level: LevelDef, loadout: Loadout, textLayer: HTMLDivElement, private cb: SessionCallbacks) {
    this.world = new World(level, loadout);
    this.view = new GameView(engine, this.world, textLayer);
    engine.setScene(this.view.scene);
    engine.onResize = () => this.view.onResize();
    this.input = new Input(engine.canvas, {
      tap: (x, y) => this.tap(x, y),
      pan: (dx, dy) => this.panScreen(dx, dy),
      zoom: (f, x, y) => {
        const p = this.view.screenToGround(x, y);
        this.view.rig.zoom(f, p ?? undefined);
        this.closeMenus();
      },
      key: (code, down) => this.key(code, down),
    });
    this.offUpdate = engine.onUpdate((dt) => this.frame(dt));
    if (level.tips?.length) tipQueue.value = [...level.tips];
    this.publishHud();
  }

  // -----------------------------------------------------------------------------------------

  get paused() { return this.pauseReasons.size > 0; }
  pause(reason: string) { this.pauseReasons.add(reason); this.publishHud(); }
  resume(reason: string) { this.pauseReasons.delete(reason); this.publishHud(); }
  togglePause() { if (this.pauseReasons.has('user')) this.resume('user'); else this.pause('user'); }
  setSpeed(s: number) { this.speed = s; this.publishHud(); }
  cycleSpeed() { this.setSpeed(this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1); }

  private frame(dt: number) {
    const paused = this.paused;
    let simDt = 0;
    if (!paused) {
      this.heroKeys();
      this.acc += dt * this.speed;
      let steps = 0;
      while (this.acc >= STEP && steps < 12) {
        this.world.step(STEP);
        this.acc -= STEP;
        simDt += STEP;
        steps++;
      }
      if (steps >= 12) this.acc = 0;
      for (const e of this.world.events) this.onEvent(e);
      this.world.events.length = 0;
    }
    this.view.speedK = paused ? 0 : this.speed;
    // back to the calm theme once a wave is fully cleared
    const w = this.world;
    if (!paused && !w.waveSpawning && !w.waitingFirstWave && w.result === 'none' && (Audio.currentMusic?.startsWith('battle_') || Audio.currentMusic === 'boss')) {
      if (w.enemies.every((e) => e.state === 'dead')) {
        this.calmT += dt;
        if (this.calmT > 3) Audio.playMusic(this.level.biome as MusicName, 2.5);
      } else this.calmT = 0;
    }
    this.view.update(dt, simDt);
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.1; this.publishHud(); }
    const sel = selection.value;
    if (sel) {
      const pos = sel.kind === 'slot' ? this.world.slots[sel.index] : this.world.towers.find((t) => t.id === sel.index);
      if (pos) {
        const s = this.view.worldToScreen(pos.x, 2.5, pos.z);
        if (Math.abs(s.x - sel.sx) > 0.5 || Math.abs(s.y - sel.sy) > 0.5) selection.value = { ...sel, sx: s.x, sy: s.y };
      }
    }
  }

  private onEvent(e: SimEvent) {
    this.view.handle(e);
    const sfx = (n: SfxName, vol = 1, rate = 1) => Audio.sfx(n, { vol, rate });
    switch (e.t) {
      case 'shoot':
        if (e.kind === 'arrow') sfx('arrow', e.hero ? 0.6 : 0.45);
        else if (e.kind === 'bolt') sfx('bolt', 0.7);
        else if (e.kind === 'boulder') sfx('catapult', 0.8);
        else if (e.kind === 'orb') sfx('magic', 0.5);
        else if (e.kind === 'firebolt') sfx('fire', 0.6);
        break;
      case 'hit': sfx(e.kind === 'orb' ? 'magic' : 'hit', 0.35, e.kind === 'orb' ? 1.4 : 1); break;
      case 'deflect': sfx('deflect', 0.5); break;
      case 'explode': sfx(e.big ? 'boom_big' : 'boom', e.big ? 1 : 0.7); break;
      case 'lightning': sfx('zap', 0.6); break;
      case 'pulse': sfx('fire', 0.25); break;
      case 'death': sfx(e.large ? 'death_big' : 'death', e.large ? 0.9 : 0.35); break;
      case 'collect': sfx('coin', 0.4); break;
      case 'melee': sfx('sword', 0.25); break;
      case 'heal': sfx('heal', 0.5); break;
      case 'warcry': sfx('roar', 0.9); break;
      case 'build': sfx('build', 0.8); break;
      case 'sell': sfx('sell', 0.8); break;
      case 'freeze': sfx('freeze', 0.9); break;
      case 'meteor': sfx('meteor', 0.9); break;
      case 'star': sfx('stars', 0.4); break;
      case 'leak': sfx('leak', 0.9); this.view.rig.shake(0.15); this.vibrate(60); break;
      case 'waveStart':
        sfx('horn', 0.8);
        // switch from the calm build-up theme to the battle theme
        if (Audio.currentMusic !== 'boss') Audio.playMusic(('battle_' + this.level.biome) as MusicName, 0.8);
        this.calmT = 0;
        waveBanner.value = e.wave;
        break;
      case 'spawn':
        if (e.boss && !this.bossAnnounced) {
          this.bossAnnounced = true;
          bossBanner.value = e.enemy;
          this.vibrate(200);
          sfx('boss', 1);
          Audio.playMusic('boss');
          setTimeout(() => (bossBanner.value = null), 3500);
        }
        break;
      case 'convoy': sfx('coins', 0.6); this.cb.onConvoyAppear?.(); break;
      case 'phoenix': sfx('roar', 1); break;
      case 'unitDeath': if (e.hero) sfx('death_big', 0.6); break;
      case 'victory':
      case 'defeat':
        if (!this.ended) {
          this.ended = true;
          const res = e.t;
          // real-time delay (not frame based) so slow devices don't stall the result screen
          setTimeout(() => { if (this.ended && this.world.result === res) this.cb.onEnd(res, this.world); }, res === 'victory' ? 1800 : 1200);
          sfx(e.t, 1);
          this.closeMenus();
        }
        break;
    }
  }

  vibrate(ms: number) { if (profile.value.settings.vibration) Platform.vibrate(ms); }

  /** Resume after a "second chance". */
  revive() {
    this.world.revive();
    this.ended = false;
  }

  // -----------------------------------------------------------------------------------------
  // Input

  private panScreen(dx: number, dy: number) {
    this.view.rig.panScreen(dx, dy);
    if (selection.value) this.closeMenus();
  }

  closeMenus() {
    selection.value = null;
    this.view.hideRange();
    this.view.highlightSlot(-1);
  }

  private tap(sx: number, sy: number) {
    if (this.world.result !== 'none') return;
    const p = this.view.screenToGround(sx, sy);
    if (!p) return;
    const w = this.world;
    const tg = targeting.value;
    if (tg) {
      this.applyTargeting(p.x, p.y);
      return;
    }
    // convoy cart
    if (w.convoy && !w.convoy.claimed && Math.hypot(w.convoy.x - p.x, w.convoy.z - p.y) < 2) {
      this.cb.onConvoy();
      return;
    }
    // towers
    for (const t of w.towers) {
      if (Math.hypot(t.x - p.x, t.z - p.y) < 1.5) {
        Audio.sfx('open', { vol: 0.5 });
        const s = this.view.worldToScreen(t.x, 2.5, t.z);
        selection.value = { kind: 'tower', index: t.id, sx: s.x, sy: s.y };
        this.view.showRange(t.x, t.z, t.stats.range, t.stats.soldiers ? 0xffe08a : 0x9fe0ff);
        this.view.highlightSlot(-1);
        return;
      }
    }
    // slots
    for (let i = 0; i < w.slots.length; i++) {
      const s = w.slots[i];
      if (!s.tower && Math.hypot(s.x - p.x, s.z - p.y) < 1.6) {
        Audio.sfx('open', { vol: 0.5 });
        const sc = this.view.worldToScreen(s.x, 2.5, s.z);
        selection.value = { kind: 'slot', index: i, sx: sc.x, sy: sc.y };
        this.view.highlightSlot(i);
        this.view.hideRange();
        return;
      }
    }
    if (selection.value) { this.closeMenus(); return; }
    // move hero
    if (w.hero && w.hero.state !== 'dead') {
      w.moveHero(p.x, p.y);
      this.view.markMove(p.x, p.y);
      Audio.sfx('step', { vol: 0.4 });
    }
  }

  private applyTargeting(x: number, z: number) {
    const tg = targeting.value!;
    const w = this.world;
    let ok = false;
    if (tg.kind === 'spell') ok = w.castSpell(tg.id, x, z);
    else if (tg.kind === 'consumable') ok = w.useConsumable(tg.id, x, z);
    else if (tg.kind === 'ability') ok = w.heroAbility(tg.idx, x, z);
    else if (tg.kind === 'rally') ok = w.setRally(tg.tower, x, z);
    if (!ok) Audio.sfx('error', { vol: 0.5 });
    targeting.value = null;
    this.view.hideRange();
    this.publishHud();
  }

  startTargeting(t: NonNullable<typeof targeting.value>) {
    this.closeMenus();
    targeting.value = t;
    if (t.kind === 'rally') {
      const tw = this.world.towers.find((x) => x.id === t.tower);
      if (tw) this.view.showRange(tw.x, tw.z, tw.stats.range, 0xffe08a);
    }
    Audio.sfx('click', { vol: 0.5 });
  }

  useSpell(id: string) {
    if ((this.world.spellCd[id] ?? 1) > 0) { Audio.sfx('error', { vol: 0.4 }); return; }
    if (id === 'starfall') { this.world.castSpell(id, 0, 0); return; }
    this.startTargeting({ kind: 'spell', id, radius: SPELLS[id].radius });
  }
  useConsumable(id: string) {
    const c = CONSUMABLES[id];
    if (!this.world.consumables[id]) { Audio.sfx('error', { vol: 0.4 }); return; }
    if (c.targeted) this.startTargeting({ kind: 'consumable', id, radius: c.radius ?? 2 });
    else { this.world.useConsumable(id, 0, 0); Audio.sfx(id === 'goldrush' ? 'coins' : 'heal', { vol: 0.8 }); }
  }
  useAbility(idx: 0 | 1) {
    const h = this.world.hero;
    if (!h || h.state === 'dead' || h.abilityCd[idx] > 0) { Audio.sfx('error', { vol: 0.4 }); return; }
    const ab = h.def.abilities[idx];
    if (ab.targeted) this.startTargeting({ kind: 'ability', idx, radius: ab.radius ?? 2 });
    else this.world.heroAbility(idx, h.x, h.z);
  }

  callWave() {
    const bonus = this.world.startNextWave();
    if (bonus > 0) {
      const g = this.world.level.gate;
      this.view.text(g.x, 3, g.z + 4, '+' + bonus, 'ft-gold');
      Audio.sfx('coins', { vol: 0.6 });
    }
    this.publishHud();
  }

  private key(code: string, down: boolean) {
    if (down) this.keys.add(code); else this.keys.delete(code);
    if (!down) return;
    if (code === 'Escape') {
      if (targeting.value) { targeting.value = null; this.view.hideRange(); return; }
      if (selection.value) { this.closeMenus(); return; }
      this.togglePause();
      return;
    }
    if (this.paused && code !== 'Space' && code !== 'KeyP') return;
    switch (code) {
      case 'Space': case 'KeyP': this.togglePause(); break;
      case 'KeyF': this.cycleSpeed(); break;
      case 'KeyN': case 'Enter': this.callWave(); break;
      case 'KeyQ': this.useAbility(0); break;
      case 'KeyE': this.useAbility(1); break;
      case 'Digit1': case 'Digit2': case 'Digit3': {
        const ids = Object.keys(this.world.spellCd);
        const id = ids[+code.slice(-1) - 1];
        if (id) this.useSpell(id);
        break;
      }
      case 'Digit4': case 'Digit5': case 'Digit6': case 'Digit7': {
        const id = CONSUMABLE_ORDER[+code.slice(-1) - 4];
        if (id) this.useConsumable(id);
        break;
      }
    }
  }

  private heroKeys() {
    const h = this.world.hero;
    if (!h || h.state === 'dead') return;
    let dx = 0, dz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;
    if (dx || dz) {
      const l = Math.hypot(dx, dz);
      this.world.moveHero(h.x + (dx / l) * 1.2, h.z + (dz / l) * 1.2);
    }
  }

  // -----------------------------------------------------------------------------------------

  publishHud() {
    const w = this.world;
    const h = w.hero;
    const spawnMarkers: { x: number; y: number }[] = [];
    if (w.waitingFirstWave || (!w.waveSpawning && w.wave < w.totalWaves)) {
      for (const p of w.paths) {
        const tmp = { x: 0, z: 0, dx: 0, dz: 0 };
        p.sample(Math.min(4, p.length), tmp);
        const hh = w.level.height / 2 - 1.5;
        const s = this.view.worldToScreen(tmp.x, 1.5, Math.min(tmp.z, hh));
        spawnMarkers.push({ x: s.x, y: s.y });
      }
    }
    const snap: HudSnapshot = {
      gold: w.gold,
      lives: w.lives,
      maxLives: w.maxLives,
      wave: w.wave,
      totalWaves: w.level.endless ? 0 : w.level.waves.length,
      waveTimer: w.waveTimer,
      waitingFirstWave: w.waitingFirstWave,
      waveSpawning: w.waveSpawning,
      callBonus: w.waitingFirstWave ? 0 : Math.ceil(w.waveTimer * (1.5 + (w.level.id || 35) * 0.04)),
      spells: Object.keys(w.spellCd).map((id) => ({ id, cd: w.spellCd[id], max: SPELLS[id]?.cooldown ?? 30 })),
      consumables: CONSUMABLE_ORDER.map((id) => ({ id, count: w.consumables[id] ?? 0 })),
      hero: h ? { id: h.def.id, hp: h.hp, maxHp: h.maxHp, dead: h.state === 'dead', respawn: h.respawnT, cds: [h.abilityCd[0], h.abilityCd[1]], maxCds: [HEROES[h.def.id].abilities[0].cooldown, HEROES[h.def.id].abilities[1].cooldown] } : null,
      speed: this.speed,
      paused: this.pauseReasons.has('user'),
      convoy: w.convoy && !w.convoy.claimed ? (() => { const s = this.view.worldToScreen(w.convoy!.x, 2.6, w.convoy!.z); return { x: s.x, y: s.y }; })() : null,
      goldRush: w.goldRushT,
      kills: w.kills,
      spawnMarkers,
    };
    hud.value = snap;
  }

  /** Screen position for a world position (HUD helpers). */
  project(x: number, y: number, z: number) { return this.view.worldToScreen(x, y, z); }

  dispose() {
    this.offUpdate();
    this.engine.onResize = undefined;
    this.input.dispose();
    this.view.dispose();
    hud.value = null;
    selection.value = null;
    targeting.value = null;
    bossBanner.value = null;
  }
}
