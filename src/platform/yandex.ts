import type { AdProvider } from '../ads/AdService';
import type { AdCallbacks } from './Platform';

/**
 * Yandex Games adapter (template). It activates ONLY when the portal's SDK script is present
 * (window.YaGames, injected via <script src="/sdk.js"> on the platform). Without it the game
 * keeps using the local stubs, so nothing here is required for other portals.
 */
export interface YandexSdk {
  adv: { showFullscreenAdv(o: { callbacks: AdCallbacks }): void; showRewardedVideo(o: { callbacks: AdCallbacks }): void };
  features?: { LoadingAPI?: { ready(): void }; GameplayAPI?: { start(): void; stop(): void } };
  environment?: { i18n?: { lang?: string } };
  getPlayer?(o?: { scopes?: boolean }): Promise<{ getData(keys?: string[]): Promise<Record<string, unknown>>; setData(d: Record<string, unknown>, flush?: boolean): Promise<void> }>;
}

export async function initYandex(): Promise<YandexSdk | null> {
  const Y = (window as any).YaGames;
  if (!Y?.init) return null;
  try {
    return (await Y.init()) as YandexSdk;
  } catch (e) {
    console.warn('[yandex] init failed', e);
    return null;
  }
}

export class YandexAdProvider implements AdProvider {
  name = 'yandex';
  constructor(private sdk: YandexSdk) {}
  showFullscreen(cb: AdCallbacks) {
    this.sdk.adv.showFullscreenAdv({ callbacks: { onOpen: cb.onOpen, onClose: cb.onClose, onError: cb.onError } });
  }
  showRewarded(cb: AdCallbacks) {
    this.sdk.adv.showRewardedVideo({ callbacks: { onOpen: cb.onOpen, onRewarded: cb.onRewarded, onClose: () => cb.onClose?.(true), onError: cb.onError } });
  }
}
