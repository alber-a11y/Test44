import type { AdCallbacks } from '../platform/Platform';
import type { AdProvider } from './AdService';
import { t } from '../app/i18n';

/**
 * Placeholder ad network: a fullscreen overlay with a countdown.
 * Dev switches (URL): ?ads=fail → every ad errors, ?ads=fast → 1s ads.
 */
export class StubAdProvider implements AdProvider {
  name = 'stub';
  private mode = new URLSearchParams(location.search).get('ads');

  private overlay(kind: 'fullscreen' | 'rewarded', cb: AdCallbacks) {
    if (this.mode === 'fail') { setTimeout(() => cb.onError?.(new Error('no fill')), 200); return; }
    const total = this.mode === 'fast' ? 1 : kind === 'rewarded' ? 5 : 3;
    const el = document.createElement('div');
    el.className = 'ad-stub';
    el.innerHTML = `
      <div class="ad-stub-box">
        <div class="ad-stub-tag">${t('ad_label')}</div>
        <div class="ad-stub-title">${kind === 'rewarded' ? t('ad_rewarded') : t('ad_fullscreen')}</div>
        <div class="ad-stub-sub">${t('ad_stub_note')}</div>
        <div class="ad-stub-bar"><i></i></div>
        <div class="ad-stub-count"></div>
        <button class="ad-stub-close" disabled>✕</button>
      </div>`;
    document.body.appendChild(el);
    const bar = el.querySelector('.ad-stub-bar i') as HTMLElement;
    const count = el.querySelector('.ad-stub-count') as HTMLElement;
    const close = el.querySelector('.ad-stub-close') as HTMLButtonElement;
    cb.onOpen?.();
    const start = performance.now();
    let finished = false;
    let raf = 0;
    const tick = () => {
      const s = (performance.now() - start) / 1000;
      const k = Math.min(1, s / total);
      bar.style.width = k * 100 + '%';
      count.textContent = k < 1 ? String(Math.ceil(total - s)) : '';
      if (k >= 1 && !finished) {
        finished = true;
        if (kind === 'rewarded') cb.onRewarded?.();
        close.disabled = false;
        close.classList.add('ready');
        if (kind === 'rewarded') count.textContent = t('ad_reward_ok');
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // rewarded can be skipped early (no reward), fullscreen only after the timer
    if (kind === 'rewarded') {
      close.disabled = false;
      close.title = t('ad_skip');
    }
    close.addEventListener('click', () => {
      if (close.disabled) return;
      cancelAnimationFrame(raf);
      el.remove();
      cb.onClose?.(true);
    });
  }

  showFullscreen(cb: AdCallbacks) { this.overlay('fullscreen', cb); }
  showRewarded(cb: AdCallbacks) { this.overlay('rewarded', cb); }
}
