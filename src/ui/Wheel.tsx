import { useState } from 'preact/hooks';
import { modal, spinWheel, WHEEL, WHEEL_AD_SPINS, showToast } from '../app/game';
import { profile } from '../app/save';
import { t } from '../app/i18n';
import { AdBtn, Btn, ModalFrame } from './common';
import { IcoCoin, SPELL_ICONS, IcoCrown } from './icons';
import { Audio } from '../audio/AudioManager';

const COLORS = ['#e8473a', '#3f8df0', '#f4b42a', '#4cbb3a', '#9b5cf0', '#e8473a', '#3f8df0', '#f4b42a'];

export function WheelModal() {
  const p = profile.value;
  const [angle, setAngle] = useState(0);
  const [busy, setBusy] = useState(false);
  const n = WHEEL.length;
  const seg = 360 / n;
  const adLeft = WHEEL_AD_SPINS - (p.daily.adSpins ?? 0);

  const spin = async (ad: boolean) => {
    if (busy) return;
    setBusy(true);
    const idx = await spinWheel(ad);
    if (idx === null) { setBusy(false); return; }
    Audio.sfx('swish');
    // land the chosen segment under the pointer at the top
    const target = 360 * 6 + (360 - (idx * seg + seg / 2));
    setAngle((a) => a - (a % 360) + target);
    setTimeout(() => {
      const pr = WHEEL[idx];
      Audio.sfx(pr.kind === 'unique' || pr.amount >= 600 ? 'unlock' : 'reward');
      showToast(prizeLabel(idx), 2400);
      setBusy(false);
    }, 4200);
  };

  const r = 120;
  return (
    <ModalFrame title={t('wheel')} color="gold" onClose={() => !busy && (modal.value = null)}>
      <div style={{ position: 'relative', width: 'min(70vw, 300px)', aspectRatio: '1', margin: '0 auto' }}>
        <svg viewBox="-130 -130 260 260" style={{ width: '100%', height: '100%', transform: `rotate(${angle}deg)`, transition: busy ? 'transform 4s cubic-bezier(.15,.85,.25,1)' : 'none' }}>
          <circle r="128" fill="#2a1d12" />
          {WHEEL.map((_, i) => {
            const a0 = ((i * seg - 90) * Math.PI) / 180, a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
            const d = `M0 0 L${Math.cos(a0) * r} ${Math.sin(a0) * r} A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`;
            return <path key={i} d={d} fill={COLORS[i]} stroke="#2a1d12" stroke-width="3" />;
          })}
          {WHEEL.map((w, i) => {
            const a = i * seg + seg / 2;
            return (
              <g key={'l' + i} transform={`rotate(${a}) translate(0 -82)`}>
                <text text-anchor="middle" y="44" font-size="17" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke" font-family="Russo One, sans-serif">{w.kind === 'unique' ? '★' : w.amount > 2 ? w.amount : 'x' + w.amount}</text>
              </g>
            );
          })}
          <circle r="22" fill="#f4b42a" stroke="#2a1d12" stroke-width="4" />
        </svg>
        <div style={{ position: 'absolute', left: '50%', top: '-6px', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '26px solid #fff', filter: 'drop-shadow(0 2px 2px #000)' }} />
        {WHEEL.map((w, i) => {
          const a = ((i * seg + seg / 2 + angle) * Math.PI) / 180;
          const Ico = w.kind === 'coins' ? IcoCoin : w.kind === 'unique' ? IcoCrown : SPELL_ICONS[w.id];
          return (
            <div key={'i' + i} style={{ position: 'absolute', left: `${50 + Math.sin(a) * 35}%`, top: `${50 - Math.cos(a) * 35}%`, transform: 'translate(-50%,-50%)', transition: busy ? 'left 4s cubic-bezier(.15,.85,.25,1), top 4s cubic-bezier(.15,.85,.25,1)' : 'none', pointerEvents: 'none' }}>
              <Ico size={30} />
            </div>
          );
        })}
      </div>
      <div class="row" style={{ marginTop: 'calc(var(--u) * 3)' }}>
        {!p.daily.spin ? <Btn class="big pulse" disabled={busy} onClick={() => spin(false)}>{t('spin_free')}</Btn> : (
          <AdBtn class="big" disabled={busy || adLeft <= 0} onClick={() => spin(true)}>{t('spin')}</AdBtn>
        )}
      </div>
      <div class="small-t muted" style={{ marginTop: 'calc(var(--u) * 1.5)' }}>{t('spins_left', { n: Math.max(0, adLeft) })}</div>
    </ModalFrame>
  );
}

function prizeLabel(idx: number) {
  const w = WHEEL[idx];
  if (w.kind === 'coins') return `${t('prize')}: +${w.amount}`;
  if (w.kind === 'unique') return `${t('prize')}: ${t('unique_step')}`;
  if (w.kind === 'booster') return `${t('prize')}: ${t('bo_' + w.id)} x${w.amount}`;
  return `${t('prize')}: ${t('c_' + w.id)} x${w.amount}`;
}
