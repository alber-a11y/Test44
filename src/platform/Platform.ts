/**
 * Platform layer modelled on the Yandex Games SDK lifecycle (LoadingAPI.ready, GameplayAPI start/stop,
 * fullscreen & rewarded ads with open/close/error callbacks, i18n, player data) but implemented locally.
 * Swapping in a real SDK later means re-implementing only this file + the ad provider.
 */
export interface AdCallbacks {
  onOpen?: () => void;
  onClose?: (wasShown: boolean) => void;
  onError?: (e: unknown) => void;
  onRewarded?: () => void;
}

import { initYandex, YandexAdProvider, type YandexSdk } from './yandex';
import { AdService } from '../ads/AdService';

class PlatformImpl {
  name = 'web';
  private sdk: YandexSdk | null = null;
  private player: Awaited<ReturnType<NonNullable<YandexSdk['getPlayer']>>> | null = null;

  /** Connect a portal SDK if one is present on the page (no-op otherwise). */
  async connectSdk() {
    this.sdk = await initYandex();
    if (!this.sdk) return;
    this.name = 'yandex';
    AdService.provider = new YandexAdProvider(this.sdk);
    try { this.player = (await this.sdk.getPlayer?.({ scopes: false })) ?? null; } catch { this.player = null; }
  }

  /** Cloud save (player data) — returns null when unavailable. */
  async loadCloud(): Promise<unknown | null> {
    if (!this.player) return null;
    try { const d = await this.player.getData(['save']); return d.save ?? null; } catch { return null; }
  }
  private gameplay = false;
  private listeners = new Set<(hidden: boolean) => void>();

  init() {
    // ---- input / browser chrome hardening (portal requirements)
    const stop = (e: Event) => { e.preventDefault(); return false; };
    document.addEventListener('contextmenu', stop, { capture: true });
    document.addEventListener('selectstart', stop, { capture: true });
    document.addEventListener('dragstart', stop, { capture: true });
    // block right/middle mouse
    document.addEventListener('mousedown', (e) => { if (e.button !== 0) e.preventDefault(); }, { capture: true });
    document.addEventListener('auxclick', stop, { capture: true });
    // block browser zoom (pinch / ctrl+wheel / ctrl +/-) and double-tap zoom
    document.addEventListener('gesturestart', stop as any, { passive: false } as any);
    document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0', 's', 'p'].includes(e.key)) e.preventDefault();
    });
    document.addEventListener('touchmove', (e) => { if ((e as TouchEvent).touches.length > 1) e.preventDefault(); }, { passive: false });
    // pause & mute when hidden
    document.addEventListener('visibilitychange', () => this.emitHidden(document.hidden));
    addEventListener('blur', () => this.emitHidden(true));
    addEventListener('focus', () => this.emitHidden(document.hidden));
    addEventListener('pagehide', () => this.emitHidden(true));
  }

  private emitHidden(h: boolean) { for (const l of this.listeners) l(h); }
  onVisibility(fn: (hidden: boolean) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Equivalent of ysdk.features.LoadingAPI.ready() */
  ready() { this.sdk?.features?.LoadingAPI?.ready(); console.info('[platform] ready'); }
  /** Equivalent of GameplayAPI.start()/stop() */
  gameplayStart() { if (!this.gameplay) { this.gameplay = true; this.sdk?.features?.GameplayAPI?.start(); console.info('[platform] gameplay start'); } }
  gameplayStop() { if (this.gameplay) { this.gameplay = false; this.sdk?.features?.GameplayAPI?.stop(); console.info('[platform] gameplay stop'); } }

  lang(): 'ru' | 'en' {
    const l = (this.sdk?.environment?.i18n?.lang || navigator.languages?.[0] || navigator.language || 'ru').toLowerCase();
    return /^(ru|be|uk|kk|uz|ky|tg|hy|az|ka)/.test(l) ? 'ru' : 'en';
  }

  loadLocal(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
  saveLocal(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* storage full / disabled */ } }
  /** Cloud save hook (player.setData on Yandex). */
  private cloudTimer = 0;
  saveCloud(data: unknown) {
    if (!this.player) return;
    clearTimeout(this.cloudTimer);
    this.cloudTimer = window.setTimeout(() => { this.player?.setData({ save: data }).catch(() => {}); }, 3000);
  }

  isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(innerWidth, innerHeight) < 900); }

  vibrate(ms: number) { try { navigator.vibrate?.(ms); } catch { /* ignore */ } }
}

export const Platform = new PlatformImpl();
