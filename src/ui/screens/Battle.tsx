import { useEffect, useState } from 'preact/hooks';
import { hud, selection, targeting, tipQueue, bossBanner, waveBanner } from '../../game/hud';
import { getSession, openPause, refreshSpell, showToast, openConvoy } from '../../app/game';
import { t } from '../../app/i18n';
import { profile, updateProfile } from '../../app/save';
import { thumbs } from '../../render/Thumbs';
import { TOWERS, towerStats, type TowerStats } from '../../data/towers';
import { HEROES } from '../../data/heroes';
import { IcoCoin, IcoHeart, IcoSkull, IcoPause, IcoFast, IcoFlag, IcoAd, IcoClose, IcoLock, IcoChest, SPELL_ICONS } from '../icons';
import { Btn } from '../common';
import { Audio } from '../../audio/AudioManager';

const canHover = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches;

export function BattleHud() {
  const h = hud.value;
  const s = getSession();
  if (!h || !s) return null;
  const tg = targeting.value;
  return (
    <div class="hud">
      <div class="hud-top">
        <div class="chip"><IcoHeart />{Math.max(0, h.lives)}</div>
        <div class={'chip ' + (h.goldRush > 0 ? 'goldrush' : '')}><IcoCoin />{h.gold}</div>
        <div class="chip"><IcoSkull />{h.totalWaves ? t('wave_of', { n: Math.max(1, h.wave), m: h.totalWaves }) : t('wave_n', { n: Math.max(1, h.wave) })}</div>
        <div class="grow" />
        <Btn class={'round ' + (h.speed > 1 ? 'gold' : 'gray')} onClick={() => s.cycleSpeed()} sound>
          <span style={{ display: 'flex', alignItems: 'center' }}><IcoFast size={26} /><small style={{ fontSize: 'calc(var(--u)*2.6)' }}>{h.speed}</small></span>
        </Btn>
        <Btn class="round gray" onClick={openPause}><IcoPause size={28} /></Btn>
      </div>

      <WaveCalls />
      <ConvoyButton />
      <SelectionMenu />

      {tg && (
        <div class="hint-bar panel">
          {t('target_hint')}
          <Btn class="red small" onClick={() => { targeting.value = null; s.view.hideRange(); }}>{t('cancel')}</Btn>
        </div>
      )}

      <div class="hud-bottom">
        <HeroCard />
        <div class="grow" />
        <div class="col" style={{ alignItems: 'flex-end', gap: 'calc(var(--u) * 1.2)' }}>
          <div class="slot-group">
            {h.consumables.map((c, i) => {
              const Ico = SPELL_ICONS[c.id];
              const active = tg?.kind === 'consumable' && tg.id === c.id;
              return (
                <button key={c.id} class={'slot-btn ' + (c.count ? '' : 'empty ') + (active ? 'active' : '')} title={t('c_' + c.id) + ' — ' + t('cd_' + c.id)}
                  onClick={() => {
                    if (!c.count) { showToast(t('c_' + c.id) + ': 0'); Audio.sfx('error', { vol: 0.4 }); return; }
                    s.useConsumable(c.id);
                  }}>
                  <Ico />
                  <span class="count">{c.count}</span>
                  {canHover && <span class="key">{i + 4}</span>}
                </button>
              );
            })}
          </div>
          <div class="slot-group">
            {h.spells.map((sp, i) => <SpellButton key={sp.id} id={sp.id} cd={sp.cd} max={sp.max} hotkey={i + 1} />)}
          </div>
        </div>
      </div>

      <Tips />
      <TutorialArrow />
      <Banners />
    </div>
  );
}

function SpellButton({ id, cd, max, hotkey }: { id: string; cd: number; max: number; hotkey: number }) {
  const s = getSession()!;
  const Ico = SPELL_ICONS[id];
  const tg = targeting.value;
  const active = tg?.kind === 'spell' && tg.id === id;
  const ready = cd <= 0;
  return (
    <button class={'slot-btn ' + (active ? 'active ' : '') + (ready ? 'ready' : '')} title={t('s_' + id) + ' — ' + t('sd_' + id)}
      onClick={() => { if (ready) s.useSpell(id); else refreshSpell(id); }}>
      <Ico />
      {!ready && <span class="cd" style={{ '--p': `${(cd / max) * 100}%` } as any} />}
      {!ready && <span class="cdn" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><IcoAd size={18} />{Math.ceil(cd)}</span>}
      {canHover && <span class="key">{hotkey}</span>}
    </button>
  );
}

function HeroCard() {
  const h = hud.value!;
  const s = getSession()!;
  const hero = h.hero;
  if (!hero) return null;
  const def = HEROES[hero.id];
  const tg = targeting.value;
  const hpPct = (hero.hp / hero.maxHp) * 100;
  return (
    <div class="hero-card">
      <button class="hero-portrait" onClick={() => { const w = s.world.hero; if (w) s.view.rig.focusOn(w.x, w.z); }} style={{ padding: 0 }}>
        <img src={thumbs['hero_' + hero.id]} />
        <span class="hpring" style={{ '--hp': `${hpPct}%` } as any} />
        {hero.dead && <span class="dead">{Math.ceil(hero.respawn)}</span>}
      </button>
      {([0, 1] as const).map((i) => {
        const ab = def.abilities[i];
        const Ico = SPELL_ICONS[ab.id];
        const cd = hero.cds[i];
        const active = tg?.kind === 'ability' && tg.idx === i;
        return (
          <button key={i} class={'slot-btn ' + (active ? 'active ' : '') + (cd <= 0 && !hero.dead ? 'ready' : '')} style={{ width: 'calc(var(--u)*9.5)', height: 'calc(var(--u)*9.5)' }} onClick={() => s.useAbility(i)}>
            {Ico && <Ico />}
            {cd > 0 && <span class="cd" style={{ '--p': `${(cd / hero.maxCds[i]) * 100}%` } as any} />}
            {cd > 0 && <span class="cdn">{Math.ceil(cd)}</span>}
            {canHover && <span class="key">{i ? 'E' : 'Q'}</span>}
          </button>
        );
      })}
    </div>
  );
}

function WaveCalls() {
  const h = hud.value!;
  const s = getSession()!;
  const show = h.waitingFirstWave || (!h.waveSpawning && (h.totalWaves === 0 || h.wave < h.totalWaves));
  if (!show) return null;
  const prep = s.world.waveDef(s.world.wave).prep ?? 16;
  const p = h.waitingFirstWave ? 100 : Math.max(0, Math.min(100, (h.waveTimer / Math.max(1, prep)) * 100));
  return (
    <>
      {h.spawnMarkers.map((m, i) => (
        <button key={i} class="wave-call" style={{ left: `${m.x}px`, top: `${m.y}px` }} onClick={() => { Audio.sfx('click'); s.callWave(); }}>
          <span class="flagbtn" style={{ position: 'relative' }}>
            {!h.waitingFirstWave && <span class="wave-timer" style={{ '--p': `${p}%` } as any} />}
            <IcoFlag />
          </span>
          <span class="lbl">{h.waitingFirstWave ? t('first_wave') : t('call_bonus', { n: h.callBonus })}</span>
        </button>
      ))}
    </>
  );
}

function ConvoyButton() {
  const h = hud.value!;
  if (!h.convoy) return null;
  return (
    <button class="convoy-btn btn purple small pulse" style={{ left: `${h.convoy.x}px`, top: `${h.convoy.y}px` }} onClick={(e) => { e.stopPropagation(); openConvoy(); }}>
      <IcoChest size={24} /><IcoAd size={20} />
    </button>
  );
}

// ---------------------------------------------------------------------------------------------------
// Radial build / upgrade menu

interface Opt {
  key: string;
  img?: string;
  icon?: preact.JSX.Element;
  price?: number;
  label: string;
  cls?: string;
  info?: { title: string; text: string; stats?: TowerStats };
  range?: number;
  action: () => void;
}

/** JS mirror of the CSS --u unit. */
function uPx() {
  const land = innerWidth > innerHeight;
  return land ? Math.min(innerWidth * 0.0062, innerHeight * 0.01, 7) : Math.min(innerWidth * 0.01, innerHeight * 0.0062, 7);
}

function buildOptions(): { opts: Opt[]; center: { x: number; z: number }; isUp: boolean } | null {
  const sel = selection.value;
  const s = getSession();
  if (!sel || !s) return null;
  const w = s.world;
  const opts: Opt[] = [];
  const nope = () => { Audio.sfx('error', { vol: 0.6 }); showToast(t('not_enough')); };
  if (sel.kind === 'slot') {
    const slot = w.slots[sel.index];
    if (!slot) return null;
    if (!slot.open) {
      opts.push({
        key: 'plot', icon: <IcoLock />, price: slot.price, label: t('buy'), cls: 'special',
        action: () => { if (w.openSlot(sel.index)) { Audio.sfx('build'); s.closeMenus(); } else nope(); },
      });
    } else {
      for (const id of w.loadout.towers) {
        const def = TOWERS[id];
        const st = def.levels[0];
        opts.push({
          key: id, img: thumbs['tower_' + id], price: w.towerCost(id, 0), label: t('t_' + id), cls: def.unique ? 'special' : '',
          info: { title: t('t_' + id), text: t('td_' + id), stats: st }, range: st.range,
          action: () => { if (w.build(sel.index, id)) { s.closeMenus(); markTip('tip_build'); } else nope(); },
        });
      }
    }
    return { opts, center: slot, isUp: false };
  }
  const tw = w.towers.find((x) => x.id === sel.index);
  if (!tw) return null;
  if (tw.level === 2 && tw.def.branches.length === 2) {
    tw.def.branches.forEach((b, bi) => {
      opts.push({
        key: 'br' + bi, img: thumbs[`tower_${tw.def.id}_3`], price: w.towerCost(tw.def.id, 3, bi), label: t('b_' + b.id), cls: 'special',
        info: { title: t('b_' + b.id), text: t('bd_' + b.id), stats: b }, range: b.range,
        action: () => { if (w.upgrade(tw.id, bi)) { Audio.sfx('upgrade'); s.closeMenus(); } else nope(); },
      });
    });
  } else {
    const cost = w.upgradeCost(tw);
    if (cost !== null) {
      const next = towerStats(tw.def, tw.level + 1, 0);
      opts.push({
        key: 'up', img: thumbs[tw.level >= 1 ? `tower_${tw.def.id}_3` : `tower_${tw.def.id}`], price: cost, label: t('upgrade'),
        info: { title: `${t('t_' + tw.def.id)} ${tw.level + 2}`, text: t('td_' + tw.def.id), stats: next }, range: next.range,
        action: () => { if (w.upgrade(tw.id)) { Audio.sfx('upgrade'); s.closeMenus(); markTip('tip_upgrade'); } else nope(); },
      });
    }
  }
  if (tw.stats.soldiers) {
    opts.push({ key: 'rally', icon: <IcoFlag />, label: t('rally'), action: () => s.startTargeting({ kind: 'rally', tower: tw.id, radius: tw.stats.range }) });
  }
  opts.push({ key: 'sell', icon: <IcoCoin />, price: w.sellValue(tw), label: t('sell'), cls: 'sell', action: () => { w.sell(tw.id); s.closeMenus(); } });
  return { opts, center: tw, isUp: true };
}

function SelectionMenu() {
  const sel = selection.value;
  const h = hud.value!;
  const s = getSession()!;
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => { setPending(null); setHover(null); }, [sel?.kind, sel?.index]);
  const data = buildOptions();
  const focus = hover ?? pending;
  const focusOpt = data?.opts.find((o) => o.key === focus);
  useEffect(() => {
    if (!sel || !data) return;
    const w = s.world;
    if (focusOpt?.range) s.view.showRange(data.center.x, data.center.z, focusOpt.range, sel.kind === 'tower' ? 0xa0ff9a : 0x9fe0ff);
    else if (sel.kind === 'slot') s.view.hideRange();
    else { const tw = w.towers.find((x) => x.id === sel.index); if (tw) s.view.showRange(tw.x, tw.z, tw.stats.range, tw.stats.soldiers ? 0xffe08a : 0x9fe0ff); }
  }, [focus, sel?.index, sel?.kind]);
  if (!sel || !data) return null;
  const { opts, isUp } = data;
  const u = uPx();
  const R = (opts.length <= 2 ? 13 : 16.5) * u;
  // keep the menu on screen
  const pad = R + 8 * u;
  const cx = Math.min(innerWidth - pad, Math.max(pad, sel.sx));
  const cy = Math.min(innerHeight - pad - 10 * u, Math.max(pad + 6 * u, sel.sy));
  return (
    <div class="build-menu" style={{ left: `${cx}px`, top: `${cy}px` }}>
      <div class="ring-bg" />
      {opts.map((o, i) => {
        const a = isUp && opts.length <= 3 ? ([-Math.PI / 2, Math.PI / 2, Math.PI][i] ?? 0) : -Math.PI / 2 + (i / opts.length) * Math.PI * 2;
        const afford = o.price === undefined || o.key === 'sell' || h.gold >= o.price;
        return (
          <div key={o.key} class="bm-item" style={{ left: `${(Math.cos(a) * R).toFixed(1)}px`, top: `${(Math.sin(a) * R).toFixed(1)}px`, animationDelay: `${i * 0.03}s` }}>
            <button
              class={`bm-btn ${o.cls ?? ''} ${afford ? '' : 'disabled'}`}
              onMouseEnter={() => canHover && setHover(o.key)}
              onMouseLeave={() => canHover && setHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (!canHover && o.info && pending !== o.key) { setPending(o.key); Audio.sfx('click', { vol: 0.5 }); return; }
                o.action();
              }}
            >
              {o.img ? <img src={o.img} /> : o.icon}
            </button>
            {o.price !== undefined && <div class={'bm-price ' + (afford ? '' : 'no')}><IcoCoin />{o.price}</div>}
            {!canHover && pending === o.key && <div class="bm-label" style={{ color: '#9fff8a' }}>✓</div>}
          </div>
        );
      })}
      {focusOpt?.info && (
        <div class="bm-info panel" style={{ top: `${R + 9 * u}px` }}>
          <b>{focusOpt.info.title}</b>
          {focusOpt.info.text}
          {focusOpt.info.stats && <StatLine st={focusOpt.info.stats} />}
        </div>
      )}
      <button class="bm-btn" style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%,-50%)', width: 'calc(var(--u)*7)', height: 'calc(var(--u)*7)', opacity: 0.85 }}
        onClick={(e) => { e.stopPropagation(); s.closeMenus(); }}><IcoClose /></button>
    </div>
  );
}

function StatLine({ st }: { st: TowerStats }) {
  if (st.aura) return <div class="stats"><span>+{Math.round(((st.aura.rateMul ?? 1) - 1) * 100)}% ⚡</span>{st.aura.dmgMul && <span>+{Math.round((st.aura.dmgMul - 1) * 100)}% ⚔</span>}<span>◎ {st.range}</span></div>;
  if (st.soldiers) return <div class="stats"><span>♥ {st.soldiers.hp}</span><span>⚔ {st.soldiers.dmg[0]}-{st.soldiers.dmg[1]}</span><span>x{st.soldiers.count}</span></div>;
  return <div class="stats"><span>⚔ {st.dmg[0]}{st.dmg[1] !== st.dmg[0] ? '-' + st.dmg[1] : ''}</span><span>⚡ {st.rate}/s</span><span>◎ {st.range}</span></div>;
}

function markTip(id: string) {
  if (tipQueue.value[0] === id) tipQueue.value = tipQueue.value.slice(1);
}

/** Bouncing arrow that points at what the current tutorial tip talks about. */
function TutorialArrow() {
  const h = hud.value;
  const s = getSession();
  const seen = profile.value.tipsSeen;
  const tip = tipQueue.value.find((x) => !seen.includes(x));
  if (!h || !s || !tip || selection.value || targeting.value) return null;
  const w = s.world;
  let pos: { x: number; y: number } | null = null;
  if (tip === 'tip_build' && w.towers.length === 0) {
    // the open slot closest to the start of the road
    const p0 = w.paths[0];
    let best = -1, bd = Infinity;
    w.slots.forEach((sl, i) => {
      if (!sl.open || sl.tower) return;
      const sp = s.project(sl.x, 1.2, sl.z);
      // must be clearly visible (not under the tip box or the HUD)
      if (sp.y > innerHeight * 0.66 || sp.y < innerHeight * 0.14 || sp.x < 40 || sp.x > innerWidth - 40) return;
      const c = p0.closest(sl.x, sl.z);
      const score = c.d + c.dist * 2;
      if (score < bd) { bd = score; best = i; }
    });
    if (best >= 0) { const sl = w.slots[best]; pos = s.project(sl.x, 1.2, sl.z); }
  } else if ((tip === 'tip_wave' || tip === 'tip_build') && h.spawnMarkers.length && (h.waitingFirstWave || !h.waveSpawning)) {
    const m = h.spawnMarkers[0];
    pos = { x: m.x, y: m.y - uPx() * 13 };
  } else if (tip === 'tip_hero' && w.hero && w.hero.state !== 'dead') {
    pos = s.project(w.hero.x, 2.4, w.hero.z);
  } else if (tip === 'tip_upgrade' && w.towers.length) {
    const tw = w.towers[0];
    pos = s.project(tw.x, 4.2, tw.z);
  }
  if (!pos) return null;
  return <div class="tut-arrow no-pe" style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>▼</div>;
}

function Tips() {
  const q = tipQueue.value;
  const seen = profile.value.tipsSeen;
  const tip = q.find((x) => !seen.includes(x));
  if (!tip) return null;
  return (
    <div class="tip-box panel parch">
      <p>{t(tip)}</p>
      <Btn class="small" onClick={() => { updateProfile((p) => p.tipsSeen.push(tip)); tipQueue.value = q.filter((x) => x !== tip); }}>{t('got_it')}</Btn>
    </div>
  );
}

function Banners() {
  const [wave, setWave] = useState(0);
  useEffect(() => {
    if (!waveBanner.value) return;
    setWave(waveBanner.value);
    const id = setTimeout(() => setWave(0), 2200);
    return () => clearTimeout(id);
  }, [waveBanner.value]);
  const boss = bossBanner.value;
  return (
    <>
      {wave > 0 && !boss && <div class="banner" key={'w' + wave}>{t('wave_n', { n: wave })}</div>}
      {boss && <div class="banner boss" key={'b' + boss}>{t('boss_incoming')}<small>{t('e_' + boss)}</small></div>}
    </>
  );
}
