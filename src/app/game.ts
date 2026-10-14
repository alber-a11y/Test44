import { signal } from '@preact/signals';
import { Engine, detectQuality, type Quality } from '../render/Engine';
import { Assets } from '../render/Assets';
import { renderThumbnails } from '../render/Thumbs';
import { MenuScene } from '../render/MenuScene';
import { GameSession } from '../game/GameSession';
import type { World } from '../sim/World';
import { getLevel, LEVEL_COUNT } from '../levels/levels';
import { profile, updateProfile, rollDaily, persist } from './save';
import { lang, t } from './i18n';
import { Platform } from '../platform/Platform';
import { Audio, type MusicName } from '../audio/AudioManager';
import { AdService, AD_CONFIG } from '../ads/AdService';
import { TOWERS, TOWER_ORDER } from '../data/towers';
import { UNIQUES } from '../data/items';
import type { Loadout } from '../sim/types';

export type Screen = 'loading' | 'menu' | 'map' | 'shop' | 'forge' | 'settings' | 'battle';

export type Modal =
  | { type: 'prelevel'; level: number }
  | { type: 'victory'; level: number; stars: number; coins: number; kills: number; first: boolean; doubled: boolean; newTower?: string; endlessWaves?: number }
  | { type: 'defeat'; level: number; canRevive: boolean; coins: number; endlessWaves?: number }
  | { type: 'pause' }
  | { type: 'convoy'; gold: number }
  | { type: 'daily' }
  | { type: 'confirm'; text: string; onYes: () => void };

export const screen = signal<Screen>('loading');
export const modal = signal<Modal | null>(null);
export const loadProgress = signal(0);
export const toast = signal<string | null>(null);
export const adPlaying = signal(false);
export const shopTab = signal<'towers' | 'heroes' | 'items' | 'unique' | 'coins'>('towers');

let engine: Engine;
let menu: MenuScene | null = null;
let session: GameSession | null = null;
let textLayer: HTMLDivElement;
let menuOff: (() => void) | null = null;
let currentLevel = 1;
let usedRevive = false;

export function getSession() { return session; }

export function showToast(text: string, ms = 1800) {
  toast.value = text;
  setTimeout(() => { if (toast.value === text) toast.value = null; }, ms);
}

export function isUniqueOwned(id: string, p = profile.value) {
  const u = UNIQUES.find((x) => x.id === id);
  return !!u && (p.uniques[id] ?? 0) >= u.views;
}

export function towerAvailable(id: string, p = profile.value) {
  const def = TOWERS[id];
  if (def.unique) return isUniqueOwned(id, p);
  return p.towers.includes(id) || def.unlockLevel <= p.unlocked;
}

export function resolveQuality(): Quality {
  const q = profile.value.settings.quality;
  return q === 'auto' ? detectQuality() : q;
}

export function applySettings() {
  const s = profile.value.settings;
  lang.value = s.lang === 'auto' ? Platform.lang() : s.lang;
  document.documentElement.lang = lang.value;
  Audio.setVolumes(s.music, s.sfx);
  if (engine && engine.quality !== resolveQuality()) engine.setQuality(resolveQuality());
}

// -------------------------------------------------------------------------------------------------
// Boot

export async function boot() {
  Platform.init();
  applySettings();
  Audio.init();
  const app = document.getElementById('app')!;
  engine = new Engine(document.body);
  document.body.insertBefore(engine.canvas, app);
  engine.setQuality(resolveQuality());
  textLayer = document.createElement('div');
  textLayer.className = 'text-layer';
  document.body.insertBefore(textLayer, app);

  // ad hooks: pause everything while an ad plays
  AdService.onAd((playing) => {
    adPlaying.value = playing;
    if (playing) { Audio.suspend('ad'); session?.pause('ad'); engine.paused = true; }
    else { Audio.resume('ad'); session?.resume('ad'); engine.paused = false; }
  });
  Platform.onVisibility((hidden) => {
    if (hidden) {
      Audio.suspend('hidden');
      if (session) { session.pause('hidden'); if (!modal.value && session.world.result === 'none') openPause(); }
    } else {
      Audio.resume('hidden');
      session?.resume('hidden');
    }
  });

  await Assets.load((p) => (loadProgress.value = p * 0.75));
  await nextFrame();
  renderThumbnails(engine);
  loadProgress.value = 0.85;
  await nextFrame();
  menu = new MenuScene(engine);
  loadProgress.value = 1;
  await nextFrame();
  engine.start();
  Platform.ready();
  rollDaily();
  goMenu();
  document.getElementById('boot')?.remove();
  // FPS watchdog for "auto" quality: step down if the device struggles
  let lowFor = 0;
  setInterval(() => {
    if (profile.value.settings.quality !== 'auto' || engine.paused) return;
    if (engine.fps < 34) lowFor++; else lowFor = 0;
    if (lowFor >= 4 && engine.quality !== 'low') {
      engine.setQuality(engine.quality === 'high' ? 'medium' : 'low');
      lowFor = 0;
    }
  }, 1000);
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// -------------------------------------------------------------------------------------------------
// Navigation

function enterMenuScene() {
  if (!menu) return;
  menu.activate();
  menuOff?.();
  menuOff = engine.onUpdate((dt) => menu!.update(dt));
}

export function goMenu() {
  leaveBattle();
  enterMenuScene();
  screen.value = 'menu';
  Audio.playMusic('menu');
  const d = profile.value.daily;
  if (!d.claimed) modal.value = { type: 'daily' };
}

export function goMap() { if (!session) enterMenuScene(); screen.value = 'map'; Audio.playMusic('menu'); }
export function goShop(tab?: typeof shopTab.value) { if (tab) shopTab.value = tab; screen.value = 'shop'; }
export function goForge() { screen.value = 'forge'; }
export function goSettings() { screen.value = 'settings'; }

export function openLevel(level: number) {
  if (level > profile.value.unlocked && level !== 0) return;
  Audio.sfx('click');
  modal.value = { type: 'prelevel', level };
}

function leaveBattle() {
  if (!session) return;
  session.dispose();
  session = null;
  Platform.gameplayStop();
}

export function buildLoadout(boosters: string[]): Loadout {
  const p = profile.value;
  const towers = TOWER_ORDER.filter((id) => towerAvailable(id, p));
  const spells = ['reinforce'];
  if (p.unlocked >= 3 || currentLevel >= 3) spells.push('meteor');
  if (isUniqueOwned('starfall', p)) spells.push('starfall');
  return {
    towers, hero: p.hero, spells, consumables: { ...p.consumables }, boosters, upgrades: { ...p.upgrades },
    phoenix: isUniqueOwned('phoenix', p), hound: isUniqueOwned('hound', p), goldSkin: isUniqueOwned('goldskin', p),
  };
}

export async function startLevel(level: number, boosters: string[]) {
  modal.value = null;
  // a fullscreen ad before the battle (natural pause)
  if (AD_CONFIG.placements.levelStart) await AdService.showInterstitial('level_start', level || 99);
  // consume boosters
  updateProfile((p) => { for (const b of boosters) p.boosters[b] = Math.max(0, (p.boosters[b] ?? 0) - 1); p.stats.played++; });
  currentLevel = level;
  usedRevive = false;
  menuOff?.(); menuOff = null;
  leaveBattle();
  const def = getLevel(level);
  session = new GameSession(engine, def, buildLoadout(boosters), textLayer, {
    onEnd: (r, w) => onBattleEnd(r, w),
    onConvoy: () => openConvoy(),
  });
  screen.value = 'battle';
  Audio.playMusic(def.biome as MusicName);
  Platform.gameplayStart();
  // endless: periodic interstitials during wave breaks
  if (def.endless) {
    let lastAdWave = 0;
    const iv = setInterval(() => {
      const s = session;
      if (!s || s.level !== def) { clearInterval(iv); return; }
      const w = s.world;
      if (!w.waveSpawning && w.wave - lastAdWave >= AD_CONFIG.placements.endlessEveryWaves && w.enemies.length === 0) {
        lastAdWave = w.wave;
        AdService.showInterstitial('endless_break', 99);
      }
    }, 1000);
  }
}

function coinsFor(level: number, stars: number, first: boolean) {
  const base = 40 + level * 6;
  const mul = stars === 3 ? 1 : stars === 2 ? 0.8 : 0.6;
  return Math.round(base * mul * (first ? 1.5 : 0.5));
}

function onBattleEnd(result: 'victory' | 'defeat', w: World) {
  const level = currentLevel;
  Platform.gameplayStop();
  syncConsumables(w);
  if (level === 0) {
    const waves = Math.max(0, w.wave - (result === 'defeat' ? 1 : 0));
    const coins = 20 + waves * 12;
    const best = profile.value.endlessBest;
    updateProfile((p) => { p.coins += coins; p.endlessBest = Math.max(p.endlessBest, waves); p.stats.kills += w.kills; });
    modal.value = { type: 'defeat', level, canRevive: !usedRevive, coins, endlessWaves: waves };
    if (waves > best) showToast(t('new_record'));
    return;
  }
  if (result === 'victory') {
    const stars = w.stars();
    const prev = profile.value.stars[level] ?? 0;
    const first = prev === 0;
    const coins = coinsFor(level, stars, first);
    let newTower: string | undefined;
    const before = profile.value.unlocked;
    updateProfile((p) => {
      p.stars[level] = Math.max(prev, stars);
      p.coins += coins;
      p.unlocked = Math.min(LEVEL_COUNT, Math.max(p.unlocked, level + 1));
      p.stats.won++;
      p.stats.kills += w.kills;
    });
    if (profile.value.unlocked > before) {
      newTower = TOWER_ORDER.find((id) => !TOWERS[id].unique && TOWERS[id].unlockLevel === profile.value.unlocked && !profile.value.towers.includes(id));
    }
    modal.value = { type: 'victory', level, stars, coins, kills: w.kills, first, doubled: false, newTower };
  } else {
    const coins = Math.round(10 + level * 2);
    updateProfile((p) => { p.coins += coins; p.stats.kills += w.kills; });
    modal.value = { type: 'defeat', level, canRevive: !usedRevive, coins };
  }
}

function syncConsumables(w: World) {
  updateProfile((p) => { for (const k of Object.keys(w.consumables)) p.consumables[k] = w.consumables[k]; });
}

// -------------------------------------------------------------------------------------------------
// Battle actions

export function openPause() {
  if (!session || modal.value) return;
  session.pause('menu');
  modal.value = { type: 'pause' };
}
export function closePause() {
  modal.value = null;
  session?.resume('menu');
}

export async function restartLevel() {
  if (session) syncConsumables(session.world);
  modal.value = null;
  if (AD_CONFIG.placements.restart) await AdService.showInterstitial('restart', currentLevel || 99);
  startLevel(currentLevel, []);
}

export async function exitToMap() {
  if (session && session.world.result === 'none') syncConsumables(session.world);
  modal.value = null;
  leaveBattle();
  enterMenuScene();
  screen.value = 'map';
  Audio.playMusic('menu');
  if (AD_CONFIG.placements.exitToMap) await AdService.showInterstitial('exit_to_map', currentLevel || 99);
}

export async function continueAfterVictory(next: boolean) {
  const lvl = currentLevel;
  modal.value = null;
  leaveBattle();
  enterMenuScene();
  screen.value = 'map';
  Audio.playMusic('menu');
  if (AD_CONFIG.placements.levelEnd) await AdService.showInterstitial('level_end', lvl);
  if (next && lvl < LEVEL_COUNT) openLevel(lvl + 1);
}

export async function doubleReward() {
  const m = modal.value;
  if (!m || m.type !== 'victory' || m.doubled) return;
  const ok = await AdService.showRewarded('victory_x2');
  if (!ok) { showToast(t('ad_unavailable')); return; }
  updateProfile((p) => { p.coins += m.coins; p.stats.ads++; });
  Audio.sfx('reward');
  modal.value = { ...m, doubled: true, coins: m.coins * 2 };
}

export async function reviveWithAd() {
  const m = modal.value;
  if (!m || m.type !== 'defeat' || !m.canRevive || !session) return;
  const ok = await AdService.showRewarded('revive');
  if (!ok) { showToast(t('ad_unavailable')); return; }
  usedRevive = true;
  updateProfile((p) => { p.coins -= m.coins; p.stats.ads++; });
  modal.value = null;
  session.revive();
  Platform.gameplayStart();
  Audio.sfx('heal');
}

export function openConvoy() {
  if (!session || modal.value) return;
  session.pause('convoy');
  modal.value = { type: 'convoy', gold: Math.round(160 + (session.level.id || 35) * 12) };
}
export async function claimConvoy(watch: boolean) {
  modal.value = null;
  if (watch && session) {
    const ok = await AdService.showRewarded('convoy');
    if (ok) { session.world.claimConvoy(); Audio.sfx('coins'); updateProfile((p) => p.stats.ads++); }
    else showToast(t('ad_unavailable'));
  }
  session?.resume('convoy');
}

/** Rewarded spell refresh from the HUD. */
export async function refreshSpell(id: string) {
  if (!session) return;
  const ok = await AdService.showRewarded('spell_refresh');
  if (ok) { session.world.resetSpellCooldown(id); updateProfile((p) => p.stats.ads++); }
}

// -------------------------------------------------------------------------------------------------
// Shop / meta actions

export function spend(cost: number): boolean {
  if (profile.value.coins < cost) { Audio.sfx('error'); showToast(t('not_enough').replace(t('gold').toLowerCase(), t('coins').toLowerCase())); return false; }
  updateProfile((p) => (p.coins -= cost));
  Audio.sfx('upgrade');
  return true;
}

export async function watchForUnique(id: string) {
  const ok = await AdService.showRewarded('unique_' + id);
  if (!ok) { showToast(t('ad_unavailable')); return; }
  const u = UNIQUES.find((x) => x.id === id)!;
  updateProfile((p) => {
    p.uniques[id] = Math.min(u.views, (p.uniques[id] ?? 0) + 1);
    p.stats.ads++;
    if (p.uniques[id] >= u.views && u.kind === 'hero' && !p.heroes.includes(id)) p.heroes.push(id);
  });
  Audio.sfx(isUniqueOwned(id) ? 'unlock' : 'reward');
  if (isUniqueOwned(id)) showToast(t('unique_owned'));
}

export async function watchForCoins() {
  const d = profile.value.daily;
  if (d.freeCoins >= AD_CONFIG.freeCoinsPerDay) return;
  const ok = await AdService.showRewarded('free_coins');
  if (!ok) { showToast(t('ad_unavailable')); return; }
  const amount = AD_CONFIG.freeCoinsAmount + profile.value.unlocked * 4;
  updateProfile((p) => { p.coins += amount; p.daily.freeCoins++; p.stats.ads++; });
  Audio.sfx('coins');
  showToast('+' + amount);
}

export async function openDailyChest() {
  if (profile.value.daily.chest) return;
  const ok = await AdService.showRewarded('daily_chest');
  if (!ok) { showToast(t('ad_unavailable')); return; }
  const coins = 150 + profile.value.unlocked * 6;
  const item = ['freeze', 'dynamite', 'goldrush', 'repair'][Math.floor(Math.random() * 4)];
  updateProfile((p) => { p.coins += coins; p.consumables[item] = (p.consumables[item] ?? 0) + 2; p.daily.chest = true; p.stats.ads++; });
  Audio.sfx('reward');
  showToast(`+${coins} · ${t('c_' + item)} x2`);
}

export function dailyReward(streak: number) { return 60 + Math.min(6, streak) * 30; }

export async function claimDaily(x2: boolean) {
  const p = profile.value;
  if (p.daily.claimed) { modal.value = null; return; }
  let amount = dailyReward(p.daily.streak);
  if (x2) {
    const ok = await AdService.showRewarded('daily_x2');
    if (ok) amount *= 2; else showToast(t('ad_unavailable'));
  }
  updateProfile((d) => { d.coins += amount; d.daily.claimed = true; if (x2) d.stats.ads++; });
  Audio.sfx('coins');
  showToast('+' + amount);
  modal.value = null;
}

addEventListener('beforeunload', () => persist());
