import { useEffect, useMemo, useRef } from 'preact/hooks';
import { t } from '../../app/i18n';
import { profile } from '../../app/save';
import { goMap, goMenu, goShop, goForge, goSettings, openLevel, loadProgress, modal } from '../../app/game';
import { Btn, CoinChip, StarChip, BackBtn, Stars } from '../common';
import { IcoGear, IcoHammer, IcoShop, IcoMap, IcoChest, IcoInfinity, IcoLock, IcoSkull, IcoStarfall } from '../icons';
import { LEVEL_COUNT } from '../../levels/levels';
import { BOSSES, biomeFor } from '../../levels/generator';
import { Rng } from '../../sim/rng';
import { AD_CONFIG } from '../../ads/AdService';

const TIPS = ['tip_turtle', 'tip_hero', 'tip_wave', 'tip_shaman', 'tip_plot', 'tip_brute'];

export function Loading() {
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);
  return (
    <div class="screen loading">
      <div class="logo">{t('title')}<small>{t('subtitle')}</small></div>
      <div class="loadbar"><i style={{ width: `${Math.round(loadProgress.value * 100)}%` }} /></div>
      <div class="loadtip">{t('loading_tip')}{t(tip)}</div>
    </div>
  );
}

export function MainMenu() {
  const p = profile.value;
  const shopNotif = (AD_CONFIG.freeCoinsPerDay - p.daily.freeCoins > 0 ? 1 : 0) + (p.daily.chest ? 0 : 1);
  return (
    <div class="screen menu">
      <div class="topbar" style={{ width: '100%' }}>
        <CoinChip />
        <StarChip />
        <div class="grow" />
        <Btn class="round gray" onClick={goSettings}><IcoGear size={30} /></Btn>
      </div>
      <div class="logo">{t('title')}<small>{t('subtitle')}</small></div>
      <div class="menu-buttons">
        <Btn class="big pulse" onClick={() => openLevel(Math.min(p.unlocked, LEVEL_COUNT))}>
          {p.unlocked > 1 ? `${t('play')} · ${p.unlocked}` : t('play')}
        </Btn>
        <div class="menu-side">
          <Btn class="menu-tile blue" onClick={goMap}><IcoMap /><span>{t('map')}</span></Btn>
          <Btn class="menu-tile gold" onClick={() => goShop()}>
            <IcoShop /><span>{t('shop')}</span>
            {shopNotif > 0 && <i class="notif">{shopNotif}</i>}
          </Btn>
          <Btn class="menu-tile red" onClick={goForge}><IcoHammer /><span>{t('forge')}</span></Btn>
          {!p.daily.claimed
            ? <Btn class="menu-tile purple" onClick={() => (modal.value = { type: 'daily' })}><IcoChest /><span>{t('daily_title').split(' ')[0]}</span><i class="notif">!</i></Btn>
            : <Btn class="menu-tile purple" onClick={() => (modal.value = { type: 'wheel' })}><IcoStarfall /><span>{t('wheel').split(' ')[0]}</span>{!p.daily.spin && <i class="notif">!</i>}</Btn>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------
// Level map

const BIOME_BG: Record<string, [string, string]> = {
  meadow: ['#7fbf4a', '#4f8f2e'],
  canyon: ['#d8b27a', '#a77a48'],
  coast: ['#9fd36a', '#5fae8a'],
  snow: ['#e8f0f6', '#b8cad8'],
  ashlands: ['#6a5248', '#3a2a24'],
};

export function LevelMap() {
  const p = profile.value;
  const ref = useRef<HTMLDivElement>(null);
  const W = Math.min(innerWidth, 900);
  const step = Math.max(84, Math.min(118, W * 0.2));
  const H = step * (LEVEL_COUNT + 2) + 260;
  const layout = useMemo(() => {
    const rng = new Rng(77);
    const nodes: { x: number; y: number; id: number }[] = [];
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const y = H - 150 - (i - 1) * step;
      const x = W / 2 + Math.sin(i * 0.82) * W * 0.27 + rng.range(-W * 0.04, W * 0.04);
      nodes.push({ x, y, id: i });
    }
    // decorative props per biome
    const props: { x: number; y: number; kind: string; s: number }[] = [];
    for (let k = 0; k < 220; k++) {
      const y = rng.range(80, H - 60);
      const idx = Math.max(1, Math.min(LEVEL_COUNT, Math.round((H - 150 - y) / step) + 1));
      const b = biomeFor(idx);
      const x = rng.chance(0.5) ? rng.range(10, W * 0.2) : rng.range(W * 0.8, W - 10);
      const kind = b === 'meadow' ? 'tree' : b === 'canyon' ? (rng.chance(0.6) ? 'rock' : 'tree') : b === 'coast' ? (rng.chance(0.5) ? 'wave' : 'tree') : b === 'snow' ? (rng.chance(0.6) ? 'mount' : 'pine') : (rng.chance(0.6) ? 'rock' : 'lava');
      props.push({ x, y, kind, s: rng.range(0.7, 1.3) });
    }
    return { nodes, props };
  }, [W, H, step]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cur = layout.nodes[Math.min(p.unlocked, LEVEL_COUNT) - 1];
    el.scrollTop = Math.max(0, cur.y - el.clientHeight * 0.6);
  }, []);

  const bands = ['meadow', 'canyon', 'coast', 'snow', 'ashlands'].map((b, i) => {
    const y0 = H - 150 - (i * 20 - 0.5) * step + step * 0.5;
    const y1 = H - 150 - ((i + 1) * 20 - 0.5) * step + step * 0.5;
    return { b, top: i === 4 ? 0 : y1, bottom: i === 0 ? H : y0 };
  });
  const pathD = layout.nodes.map((n, i) => `${i ? 'L' : 'M'}${n.x.toFixed(1)} ${n.y.toFixed(1)}`).join(' ');

  return (
    <div class="screen map-screen">
      <div class="map-scroll" ref={ref}>
        <div class="map-canvas" style={{ width: `${W}px`, height: `${H}px` }}>
          <svg class="bg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              {bands.map(({ b }) => (
                <linearGradient key={b} id={'bg-' + b} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color={BIOME_BG[b][0]} /><stop offset="1" stop-color={BIOME_BG[b][1]} />
                </linearGradient>
              ))}
            </defs>
            {bands.map(({ b, top, bottom }) => <rect key={b} x="0" y={top} width={W} height={bottom - top} fill={`url(#bg-${b})`} />)}
            {bands.slice(1).map(({ b, bottom }) => (
              <path key={'edge' + b} d={`M0 ${bottom} Q${W * 0.25} ${bottom - 18} ${W * 0.5} ${bottom} T${W} ${bottom}`} stroke="rgba(40,20,10,0.35)" stroke-width="6" fill="none" />
            ))}
            {layout.props.map((pr, i) => <MapProp key={i} {...pr} />)}
            <path d={pathD} stroke="rgba(70,40,15,0.55)" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            <path d={pathD} stroke="#f3dca4" stroke-width="9" fill="none" stroke-dasharray="2 14" stroke-linecap="round" />
          </svg>
          {bands.map(({ b, bottom }) => (
            <div key={'lbl' + b} class="map-biome-label ribbon gold" style={{ top: `${bottom - step * 0.9}px` }}>{t('biome_' + b)}</div>
          ))}
          {layout.nodes.map((n) => {
            const locked = n.id > p.unlocked;
            const boss = !!BOSSES[n.id];
            const stars = p.stars[n.id] ?? 0;
            return (
              <button key={n.id} class={`map-node ${locked ? 'locked' : ''} ${n.id === p.unlocked ? 'current' : ''} ${boss ? 'boss' : ''}`}
                style={{ left: `${n.x}px`, top: `${n.y}px` }} onClick={() => !locked && openLevel(n.id)}>
                {locked ? <IcoLock size={26} /> : boss ? <IcoSkull size={34} /> : n.id}
                {!locked && stars > 0 && <span class="nstars"><Stars n={stars} size={18} /></span>}
              </button>
            );
          })}
        </div>
      </div>
      <div class="map-top">
        <div class="topbar">
          <BackBtn onClick={goMenu} />
          <div class="title-h">{t('map')}</div>
          <div class="grow" />
          <CoinChip />
          <StarChip />
        </div>
      </div>
      <div class="map-bottom">
        <Btn class="blue" disabled={p.unlocked <= 20} onClick={() => openLevel(0)}>
          <IcoInfinity size={30} />{t('endless')}
        </Btn>
        <Btn class="gold" onClick={() => goShop()}><IcoShop size={30} /></Btn>
        <Btn class="red" onClick={goForge}><IcoHammer size={30} /></Btn>
      </div>
    </div>
  );
}

function MapProp({ x, y, kind, s }: { x: number; y: number; kind: string; s: number }) {
  const tr = `translate(${x} ${y}) scale(${s})`;
  switch (kind) {
    case 'tree': return <g transform={tr}><path d="M0 -26 L14 4 L-14 4 Z" fill="#2f6b2a" /><path d="M0 -40 L11 -12 L-11 -12 Z" fill="#3c8a34" /><rect x="-2.5" y="4" width="5" height="7" fill="#6b4a2a" /></g>;
    case 'pine': return <g transform={tr}><path d="M0 -36 L13 4 L-13 4 Z" fill="#3a6a4a" /><path d="M0 -36 L6 -20 L-6 -20 Z" fill="#fff" /><rect x="-2" y="4" width="4" height="6" fill="#5a3a2a" /></g>;
    case 'rock': return <g transform={tr}><path d="M-18 6 L-12 -10 L0 -16 L12 -8 L18 6 Z" fill="#9a8a7a" stroke="#5a4a3a" stroke-width="2" /></g>;
    case 'mount': return <g transform={tr}><path d="M-30 10 L0 -34 L30 10 Z" fill="#8a9aaa" /><path d="M0 -34 L10 -19 L4 -21 L-2 -15 L-9 -20 Z" fill="#fff" /></g>;
    case 'wave': return <g transform={tr}><path d="M-20 0 Q-10 -8 0 0 T20 0" stroke="#e8fbff" stroke-width="3" fill="none" opacity="0.8" /></g>;
    case 'lava': return <g transform={tr}><path d="M-16 0 Q-6 -6 0 2 T18 -2" stroke="#ff6a20" stroke-width="4" fill="none" /></g>;
    default: return null;
  }
}

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div class="topbar">
      <BackBtn onClick={onBack} />
      <div class="title-h">{title}</div>
      <div class="grow" />
      <CoinChip />
    </div>
  );
}

export { BIOME_BG };
