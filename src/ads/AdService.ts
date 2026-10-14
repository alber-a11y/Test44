import type { AdCallbacks } from '../platform/Platform';
import { StubAdProvider } from './StubAdProvider';

/** Ad pacing — "above average" aggressiveness, all in one place (could be fetched remotely later). */
export const AD_CONFIG = {
  /** min seconds between two fullscreen ads (most portals require ≥ 60) */
  interstitialCooldown: 60,
  /** no fullscreen ads during the first seconds of a session */
  firstInterstitialDelay: 75,
  /** fullscreen ads start from this level */
  fromLevel: 3,
  placements: {
    levelStart: true,
    levelEnd: true,
    restart: true,
    exitToMap: true,
    menuReturn: true,
    endlessEveryWaves: 5,
  },
  /** rewarded "free coins" per day in the shop */
  freeCoinsPerDay: 6,
  freeCoinsAmount: 120,
};

export interface AdProvider {
  name: string;
  showFullscreen(cb: AdCallbacks): void;
  showRewarded(cb: AdCallbacks): void;
}

type Hook = (playing: boolean) => void;

/**
 * Single entry point for ads. Every ad pauses the game, mutes audio and blocks input through the
 * hooks registered by the app; they are released on close/error no matter what.
 */
class AdServiceImpl {
  provider: AdProvider = new StubAdProvider();
  private lastInterstitial = 0;
  private sessionStart = performance.now();
  private hooks = new Set<Hook>();
  busy = false;

  onAd(fn: Hook) { this.hooks.add(fn); return () => this.hooks.delete(fn); }
  private set(playing: boolean) { for (const h of this.hooks) h(playing); }

  canShowInterstitial() {
    const now = performance.now();
    if (this.busy) return false;
    if ((now - this.sessionStart) / 1000 < AD_CONFIG.firstInterstitialDelay) return false;
    return (now - this.lastInterstitial) / 1000 >= AD_CONFIG.interstitialCooldown;
  }

  /** Resolves true if an ad was actually shown. */
  showInterstitial(placement: string, level = 99): Promise<boolean> {
    if (level < AD_CONFIG.fromLevel || !this.canShowInterstitial()) return Promise.resolve(false);
    return new Promise((resolve) => {
      this.busy = true;
      let opened = false;
      const done = (shown: boolean) => {
        if (!this.busy) return;
        this.busy = false;
        if (opened) this.set(false);
        if (shown) this.lastInterstitial = performance.now();
        resolve(shown);
      };
      console.info('[ads] fullscreen', placement);
      this.provider.showFullscreen({
        onOpen: () => { opened = true; this.set(true); },
        onClose: (wasShown) => done(wasShown),
        onError: () => done(false),
      });
    });
  }

  /** Resolves true only if the reward was earned. */
  showRewarded(placement: string): Promise<boolean> {
    if (this.busy) return Promise.resolve(false);
    return new Promise((resolve) => {
      this.busy = true;
      let opened = false, rewarded = false;
      const done = () => {
        if (!this.busy) return;
        this.busy = false;
        if (opened) this.set(false);
        // a rewarded ad also resets the fullscreen cooldown (don't stack two ads)
        this.lastInterstitial = performance.now();
        resolve(rewarded);
      };
      console.info('[ads] rewarded', placement);
      this.provider.showRewarded({
        onOpen: () => { opened = true; this.set(true); },
        onRewarded: () => { rewarded = true; },
        onClose: () => done(),
        onError: () => done(),
      });
    });
  }
}

export const AdService = new AdServiceImpl();
