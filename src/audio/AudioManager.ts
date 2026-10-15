const BASE = import.meta.env.BASE_URL + 'assets/audio/';

export const SFX = [
  'arrow', 'bolt', 'catapult', 'boom', 'boom_big', 'magic', 'zap', 'fire', 'hit', 'hit_metal', 'deflect', 'death', 'death2', 'death3', 'death4', 'death_big', 'death_big2',
  'coin', 'coins', 'build', 'upgrade', 'sell', 'click', 'open', 'error', 'wave', 'horn', 'boss', 'leak', 'victory', 'defeat',
  'heal', 'freeze', 'meteor', 'sword', 'roar', 'stars', 'reward', 'unlock', 'swish', 'step',
] as const;
export type SfxName = (typeof SFX)[number];

export const MUSIC = ['menu', 'meadow', 'canyon', 'coast', 'snow', 'ashlands', 'boss', 'battle_meadow', 'battle_canyon', 'battle_coast', 'battle_snow', 'battle_ashlands'] as const;
export type MusicName = (typeof MUSIC)[number];

interface PlayOpts { vol?: number; rate?: number; jitter?: number }

/**
 * Web Audio based mixer with separate music / sfx buses.
 * Everything is muted (context suspended) while any "pause reason" is active — ads, hidden tab, etc.
 */
class AudioManager {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private buffers = new Map<string, AudioBuffer | null>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private lastPlay = new Map<string, number>();
  private active = new Map<string, number>();
  private music: { name: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private wantedMusic: MusicName | null = null;
  private reasons = new Set<string>();
  musicVolume = 0.6;
  sfxVolume = 0.8;

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    // gentle bus compression keeps stacked explosions from clipping
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(comp);
    this.applyVolumes();
    // safety net: if the context ever starts running while something wants silence, stop it again
    this.ctx.addEventListener('statechange', () => this.sync());
    const unlock = () => {
      this.sync();
      if (this.wantedMusic && !this.music) this.playMusic(this.wantedMusic);
    };
    addEventListener('pointerdown', unlock, true);
    addEventListener('keydown', unlock, true);
    addEventListener('touchend', unlock, true);
    // preload the most common sounds
    for (const n of ['click', 'arrow', 'hit', 'coin', 'build', 'death', 'bolt', 'boom']) this.load(n);
  }

  setVolumes(music: number, sfx: number) { this.musicVolume = music; this.sfxVolume = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    this.musicBus.gain.value = this.musicVolume * 0.55;
    this.sfxBus.gain.value = this.sfxVolume;
  }

  private load(name: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(name)) return Promise.resolve(this.buffers.get(name)!);
    const pending = this.loading.get(name);
    if (pending) return pending;
    const p = fetch(BASE + name + '.mp3')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((ab) => this.ctx!.decodeAudioData(ab))
      .then((b) => { this.buffers.set(name, b); return b; })
      .catch(() => { this.buffers.set(name, null); return null; });
    this.loading.set(name, p);
    return p;
  }

  sfx(name: SfxName, o: PlayOpts = {}) {
    const ctx = this.ctx;
    if (!ctx || this.reasons.size || this.sfxVolume <= 0) return;
    const now = ctx.currentTime;
    // throttle identical sounds: avoids walls of noise from 20 archers firing at once
    const minGap = name === 'arrow' || name === 'hit' || name === 'coin' || name === 'step' ? 0.045 : 0.02;
    if (now - (this.lastPlay.get(name) ?? -1) < minGap) return;
    if ((this.active.get(name) ?? 0) >= 6) return;
    const buf = this.buffers.get(name);
    if (buf === undefined) { this.load(name); return; }
    if (!buf) return;
    this.lastPlay.set(name, now);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const j = o.jitter ?? 0.08;
    src.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * j);
    const g = ctx.createGain();
    g.gain.value = o.vol ?? 1;
    src.connect(g).connect(this.sfxBus);
    this.active.set(name, (this.active.get(name) ?? 0) + 1);
    src.onended = () => this.active.set(name, Math.max(0, (this.active.get(name) ?? 1) - 1));
    src.start();
  }

  get currentMusic() { return this.wantedMusic; }

  async playMusic(name: MusicName, fade = 1.2) {
    this.wantedMusic = name;
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.music?.name === name) return;
    const buf = await this.load('music_' + name);
    if (this.wantedMusic !== name || !buf) return;
    const old = this.music;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(g).connect(this.musicBus);
    src.start();
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + fade);
    this.music = { name, src, gain: g };
    if (old) {
      old.gain.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime);
      old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
      old.src.stop(ctx.currentTime + fade + 0.05);
    }
  }

  private amb: { name: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;

  /** Looping biome ambience on the sfx bus (wind, birds, surf…). */
  async playAmbience(name: string | null, vol = 0.35) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.amb?.name === name) return;
    const old = this.amb;
    this.amb = null;
    if (old) {
      old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime);
      old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      old.src.stop(ctx.currentTime + 1.05);
    }
    if (!name) return;
    const buf = await this.load('amb_' + name);
    if (!buf || this.amb) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(g).connect(this.sfxBus);
    src.start();
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
    this.amb = { name, src, gain: g };
  }

  stopMusic(fade = 0.8) {
    this.wantedMusic = null;
    if (!this.ctx || !this.music) return;
    const m = this.music;
    m.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fade);
    m.src.stop(this.ctx.currentTime + fade + 0.05);
    this.music = null;
  }

  /** Mute everything for a reason (e.g. 'ad', 'hidden'); resumes when all reasons are cleared. */
  suspend(reason: string) {
    this.reasons.add(reason);
    this.sync();
  }
  resume(reason: string) {
    this.reasons.delete(reason);
    this.sync();
  }

  /**
   * Bring the context to the wanted state. suspend()/resume() are async and `state` only changes when they
   * settle, so a quick hide→show→hide (e.g. restoring a minimized browser on another tab) used to leave a
   * pending resume running in a hidden tab. Re-check after every transition until it matches.
   */
  private syncing = false;
  private syncOp = 0;
  private sync() {
    const ctx = this.ctx;
    if (!ctx || this.syncing || ctx.state === 'closed') return;
    const silent = this.reasons.size > 0;
    let p: Promise<void> | null = null;
    if (silent && ctx.state === 'running') p = ctx.suspend();
    else if (!silent && ctx.state !== 'running') p = ctx.resume();
    if (!p) return;
    this.syncing = true;
    const op = ++this.syncOp;
    const done = () => { if (op !== this.syncOp) return; this.syncing = false; this.sync(); };
    p.then(done, done);
    // resume() can stay pending until a user gesture: stop waiting so a later suspend isn't blocked
    // (the statechange listener still catches it if that resume eventually goes through)
    setTimeout(() => { if (op === this.syncOp && this.syncing) { this.syncOp++; this.syncing = false; if (this.reasons.size) this.sync(); } }, 800);
  }
  get muted() { return this.reasons.size > 0; }
}

export const Audio = new AudioManager();
