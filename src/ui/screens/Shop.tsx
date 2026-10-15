import { t } from '../../app/i18n';
import { profile, updateProfile, resetProgress } from '../../app/save';
import {
  goBack, getSession, shopTab, spend, watchForUnique, watchForCoins, openDailyChest, isUniqueOwned, towerAvailable, applySettings, modal, showToast,
} from '../../app/game';
import { AdBtn, Btn, Price } from '../common';
import { ScreenHeader } from './Menus';
import { thumbs } from '../../render/Thumbs';
import { TOWERS, TOWER_ORDER } from '../../data/towers';
import { HEROES, HERO_ORDER } from '../../data/heroes';
import { CONSUMABLES, CONSUMABLE_ORDER, BOOSTERS, BOOSTER_ORDER, UNIQUES, UPGRADES, upgradeCost } from '../../data/items';
import { SPELL_ICONS, IcoCoin, IcoChest, IcoLock } from '../icons';
import { AD_CONFIG } from '../../ads/AdService';
import { AD_OFFERS, offerProgress, attachedOffer, PACK, type AdOffer } from '../../data/adOffers';
import { watchForOffer } from '../../app/game';
import { Audio } from '../../audio/AudioManager';
import { Platform } from '../../platform/Platform';

export function Shop() {
  const tab = shopTab.value;
  const p = profile.value;
  const freeLeft = AD_CONFIG.freeCoinsPerDay - p.daily.freeCoins;
  const tabs: [typeof tab, string, boolean][] = [
    ['towers', t('tab_towers'), false],
    ['heroes', t('tab_heroes'), false],
    ['items', t('tab_items'), false],
    ['unique', t('tab_unique'), UNIQUES.some((u) => !isUniqueOwned(u.id))],
    ['coins', t('tab_coins'), freeLeft > 0 || !p.daily.chest],
  ];
  return (
    <div class="screen">
      <ScreenHeader title={t('shop')} onBack={goBack} />
      <div class="tabs">
        {tabs.map(([id, label, dot]) => (
          <button key={id} class={'tab ' + (tab === id ? 'on' : '')} onClick={() => { Audio.sfx('click', { vol: 0.6 }); shopTab.value = id; }}>
            {label}{dot && <i class="dot" />}
          </button>
        ))}
      </div>
      <div class="scroll">
        {tab === 'towers' && <><AdOffers tab="towers" /><TowersTab /></>}
        {tab === 'heroes' && <><AdOffers tab="heroes" /><HeroesTab /></>}
        {tab === 'items' && <><AdOffers tab="items" /><ItemsTab /></>}
        {tab === 'unique' && <UniqueTab />}
        {tab === 'coins' && <><AdOffers tab="coins" /><CoinsTab /></>}
      </div>
    </div>
  );
}

function TowersTab() {
  const p = profile.value;
  return (
    <div class="grid">
      {TOWER_ORDER.filter((id) => !TOWERS[id].unique).map((id) => {
        const def = TOWERS[id];
        const have = towerAvailable(id, p);
        const price = def.shopPrice ?? 0;
        return (
          <div key={id} class="card panel">
            <img class="thumb" src={thumbs[`tower_${id}_3`] ?? thumbs[`tower_${id}`]} />
            <h3>{t('t_' + id)}</h3>
            <p>{t('td_' + id)}</p>
            {have ? <Btn class="gray small" disabled>{t('owned')}</Btn> : (
              <>
                <div class="small-t muted">{t('unlock_at', { n: def.unlockLevel })}</div>
                <div class="row" style={{ gap: 'calc(var(--u) * 1.4)', alignItems: 'flex-end' }}>
                  <Btn class="gold small" onClick={() => { if (spend(price)) updateProfile((d) => d.towers.push(id)); }}><Price value={price} ok={p.coins >= price} /></Btn>
                  <OfferButton attach={'tower:' + id} />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeroesTab() {
  const p = profile.value;
  return (
    <div class="grid">
      {HERO_ORDER.map((id) => {
        const def = HEROES[id];
        const owned = p.heroes.includes(id) || (def.unique && isUniqueOwned(id, p));
        const selected = p.hero === id;
        return (
          <div key={id} class={'card panel ' + (def.unique ? 'unique' : '')}>
            <img class="thumb" src={thumbs['hero_' + id]} />
            <h3>{t('h_' + id)}</h3>
            <p>{t('hd_' + id)}</p>
            {owned ? (
              <Btn class={selected ? 'gray small' : 'blue small'} disabled={selected} onClick={() => updateProfile((d) => { d.hero = id; if (!d.heroes.includes(id)) d.heroes.push(id); })}>
                {selected ? t('equipped') : t('equip')}
              </Btn>
            ) : def.unique ? (
              <Btn class="purple small" onClick={() => (shopTab.value = 'unique')}>{t('tab_unique')}</Btn>
            ) : (
              <div class="row" style={{ gap: 'calc(var(--u) * 1.4)', alignItems: 'flex-end' }}>
                <Btn class="gold small" onClick={() => { if (spend(def.price)) updateProfile((d) => { d.heroes.push(id); d.hero = id; }); }}><Price value={def.price} ok={p.coins >= def.price} /></Btn>
                <OfferButton attach={'hero:' + id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemsTab() {
  const p = profile.value;
  return (
    <>
      <div class="section-h">{t('in_battle')}</div>
      <div class="grid">
        {CONSUMABLE_ORDER.map((id) => {
          const Ico = SPELL_ICONS[id];
          const c = CONSUMABLES[id];
          return (
            <div key={id} class="card panel">
              <div class="ico-big"><Ico /></div>
              <h3>{t('c_' + id)}</h3>
              <p>{t('cd_' + id)}</p>
              <div class="cnt">x{p.consumables[id] ?? 0}</div>
              <div class="row" style={{ gap: 'calc(var(--u) * 1.4)', alignItems: 'flex-end' }}>
                <Btn class="gold small" onClick={() => { if (spend(c.price)) { updateProfile((d) => (d.consumables[id] = (d.consumables[id] ?? 0) + 1)); const ss = getSession(); if (ss && ss.world.result === 'none') ss.world.consumables[id] = (ss.world.consumables[id] ?? 0) + 1; } }}>+1 <Price value={c.price} ok={p.coins >= c.price} /></Btn>
                <OfferButton attach={'item:' + id} label={'+' + PACK[id]} />
              </div>
            </div>
          );
        })}
      </div>
      <div class="section-h">{t('boosters')} · <span class="small-t">{t('boosters_hint')}</span></div>
      <div class="grid">
        {BOOSTER_ORDER.map((id) => {
          const Ico = SPELL_ICONS[id];
          const b = BOOSTERS[id];
          return (
            <div key={id} class="card panel">
              <div class="ico-big"><Ico /></div>
              <h3>{t('bo_' + id)}</h3>
              <p>{t('bod_' + id)}</p>
              <div class="cnt">x{p.boosters[id] ?? 0}</div>
              <div class="row" style={{ gap: 'calc(var(--u) * 1.4)', alignItems: 'flex-end' }}>
                <Btn class="gold small" onClick={() => { if (spend(b.price)) updateProfile((d) => (d.boosters[id] = (d.boosters[id] ?? 0) + 1)); }}>+1 <Price value={b.price} ok={p.coins >= b.price} /></Btn>
                <OfferButton attach={'booster:' + id} label={'+' + PACK[id]} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function UniqueTab() {
  const p = profile.value;
  return (
    <>
      <div class="panel parch mid-t" style={{ marginBottom: 'calc(var(--u) * 2)', textAlign: 'center' }}>{t('unique_hint')}</div>
      <div class="grid">
        {UNIQUES.map((u) => {
          const views = p.uniques[u.id] ?? 0;
          const owned = views >= u.views;
          const img = u.kind === 'tower' ? thumbs['tower_dragon_3'] : u.kind === 'hero' ? thumbs['hero_' + u.id] : null;
          const Ico = SPELL_ICONS[u.id];
          return (
            <div key={u.id} class="card panel unique">
              {img ? <img class="thumb" src={img} /> : <div class="ico-big">{Ico && <Ico />}</div>}
              <h3>{t('u_' + u.id)}</h3>
              <p>{t('ud_' + u.id)}</p>
              <div class="progress3">{Array.from({ length: u.views }, (_, i) => <i key={i} class={i < views ? 'on' : ''} />)}</div>
              {owned ? <Btn class="gray small" disabled>{t('unique_owned')}</Btn> : (
                <AdBtn class="small pulse" onClick={() => watchForUnique(u.id)}>{views}/{u.views}</AdBtn>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function CoinsTab() {
  const p = profile.value;
  const freeLeft = AD_CONFIG.freeCoinsPerDay - p.daily.freeCoins;
  const amount = AD_CONFIG.freeCoinsAmount + p.unlocked * 4;
  return (
    <div class="grid">
      <div class="card panel">
        <div class="ico-big"><IcoCoin /></div>
        <h3>{t('free_coins')}</h3>
        <p>+{amount} · {t('free_coins_left', { n: freeLeft })}</p>
        <AdBtn class={freeLeft > 0 ? 'pulse' : ''} disabled={freeLeft <= 0} onClick={watchForCoins}>+{amount}</AdBtn>
      </div>
      <div class="card panel">
        <div class="ico-big"><SPELL_ICONS.starfall /></div>
        <h3>{t('wheel')}</h3>
        <p>{t('spins_left', { n: Math.max(0, 3 - (p.daily.adSpins ?? 0)) })}</p>
        <Btn class="gold" onClick={() => (modal.value = { type: 'wheel' })}>{t('spin')}</Btn>
      </div>
      <div class="card panel">
        <div class="ico-big"><IcoChest /></div>
        <h3>{t('daily_chest')}</h3>
        <p>{t('daily_chest_desc')}</p>
        {p.daily.chest ? <Btn class="gray small" disabled>{t('come_back')}</Btn> : <AdBtn class="pulse" onClick={openDailyChest}>{t('open_chest')}</AdBtn>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------

export function Forge() {
  const p = profile.value;
  const groups: ('tower' | 'army' | 'kingdom')[] = ['tower', 'army', 'kingdom'];
  return (
    <div class="screen">
      <ScreenHeader title={t('forge_title')} onBack={goBack} />
      <div class="small-t muted" style={{ textAlign: 'center', margin: 'calc(var(--u) * 1.5) 0' }}>{t('forge_hint')}</div>
      <div class="scroll">
        {groups.map((g) => (
          <div key={g}>
            <div class="section-h">{t('g_' + g)}</div>
            <div class="col">
              {UPGRADES.filter((u) => u.group === g).map((u) => {
                const lvl = p.upgrades[u.id] ?? 0;
                const maxed = lvl >= u.max;
                const cost = upgradeCost(u, lvl);
                const towerLocked = g === 'tower' && !towerAvailable(u.id, p);
                const img = g === 'tower' ? thumbs['tower_' + u.id] : u.id === 'hero' ? thumbs['hero_' + p.hero] : u.id === 'barracks' ? thumbs['tower_barracks'] : null;
                const Ico = u.id === 'spells' ? SPELL_ICONS.meteor : u.id === 'gold' ? SPELL_ICONS.purse : u.id === 'lives' ? SPELL_ICONS.walls : u.id === 'bounty' ? SPELL_ICONS.goldrush : u.id === 'magnet' ? SPELL_ICONS.hound : u.id === 'discount' ? SPELL_ICONS.repair : null;
                return (
                  <div key={u.id} class="panel forge-row">
                    <div class="ico-wrap">{img ? <img src={img} /> : Ico ? <Ico /> : null}</div>
                    <div class="info">
                      <h3>{t('up_' + u.id)}</h3>
                      <p>{t('upd_' + u.id)}</p>
                      <div class="lvl-pips">{Array.from({ length: u.max }, (_, i) => <i key={i} class={i < lvl ? 'on' : ''} />)}</div>
                    </div>
                    {towerLocked ? <Btn class="gray small" disabled><IcoLock size={22} /></Btn> : maxed ? <Btn class="gray small" disabled>{t('max')}</Btn> : (
                      <Btn class="gold small" onClick={() => { if (spend(cost)) updateProfile((d) => (d.upgrades[u.id] = lvl + 1)); }}><Price value={cost} ok={p.coins >= cost} /></Btn>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------

export function Settings() {
  const s = profile.value.settings;
  const set = (fn: (d: typeof s) => void) => { updateProfile((p) => fn(p.settings)); applySettings(); };
  const seg = <T extends string>(value: T, opts: [T, string][], on: (v: T) => void) => (
    <div class="seg">{opts.map(([v, l]) => <button key={v} class={value === v ? 'on' : ''} onClick={() => { Audio.sfx('click', { vol: 0.6 }); on(v); }}>{l}</button>)}</div>
  );
  return (
    <div class="screen">
      <ScreenHeader title={t('settings')} onBack={goBack} />
      <div class="scroll" style={{ maxWidth: 'calc(var(--u) * 100)', margin: '0 auto', width: '100%' }}>
        <div class="panel col" style={{ marginTop: 'calc(var(--u) * 2)' }}>
          <div class="set-row">{t('music')}<input class="slider" type="range" min="0" max="1" step="0.05" value={s.music} onInput={(e) => set((d) => (d.music = +(e.target as HTMLInputElement).value))} /></div>
          <div class="set-row">{t('sfx')}<input class="slider" type="range" min="0" max="1" step="0.05" value={s.sfx} onChange={() => Audio.sfx('coin')} onInput={(e) => set((d) => (d.sfx = +(e.target as HTMLInputElement).value))} /></div>
          <div class="set-row">{t('quality')}{seg(s.quality, [['auto', t('q_auto')], ['low', t('q_low')], ['medium', t('q_medium')], ['high', t('q_high')]], (v) => set((d) => (d.quality = v)))}</div>
          <div class="set-row">{t('language')}{seg(s.lang, [['auto', t('lang_auto')], ['ru', 'RU'], ['en', 'EN']], (v) => set((d) => (d.lang = v)))}</div>
          {Platform.isMobile() && <div class="set-row">{t('vibration')}{seg(s.vibration ? 'on' : 'off', [['on', t('on')], ['off', t('off')]], (v) => set((d) => (d.vibration = v === 'on')))}</div>}
        </div>
        <div class="panel parch" style={{ marginTop: 'calc(var(--u) * 3)' }}>
          <div class="section-h" style={{ color: 'var(--ink)', textShadow: 'none', marginTop: 0 }}>{t('controls')}</div>
          <p class="small-t">{t('controls_pc')}</p>
          <p class="small-t">{t('controls_mobile')}</p>
        </div>
        <div class="row" style={{ marginTop: 'calc(var(--u) * 3)' }}>
          <Btn class="red small" onClick={() => (modal.value = { type: 'confirm', text: t('reset_confirm'), onYes: () => { resetProgress(); applySettings(); showToast('OK'); } })}>{t('reset')}</Btn>
        </div>
        <p class="small-t muted" style={{ textAlign: 'center', marginTop: 'calc(var(--u) * 3)' }}>{t('credits')}</p>
      </div>
    </div>
  );
}

function offerDesc(o: AdOffer) {
  if (o.id.startsWith('unlock_')) return t(o.tab === 'heroes' ? 'ofd_hero' : 'ofd_unlock');
  if (o.id.startsWith('mastery_')) return t('ofd_mastery');
  if (o.id.startsWith('coins_')) return t('ofd_coins');
  return t('ofd_' + o.id);
}

/** Section with rewarded 3/3 offers for a shop tab. */
function AdOffers({ tab }: { tab: AdOffer['tab'] }) {
  const p = profile.value;
  const list = AD_OFFERS.filter((o) => o.tab === tab && !o.attach && !(p.adOffersDone ?? []).includes(o.id) && o.available(p));
  if (!list.length) return null;
  return (
    <>
      <div class="section-h">{t('ad_offers')}</div>
      <div class="grid" style={{ marginBottom: 'calc(var(--u) * 2)' }}>
        {list.map((o) => {
          const n = offerProgress(p, o.id);
          const Ico = o.icon.spell ? SPELL_ICONS[o.icon.spell] : o.icon.coin ? IcoCoin : o.id === 'mastery_spells' ? SPELL_ICONS.meteor : null;
          const img = o.icon.thumb ? (o.icon.thumb === 'hero_ranger' ? thumbs['hero_' + p.hero] : thumbs[o.icon.thumb]) : null;
          return (
            <div key={o.id} class="card panel unique">
              {img ? <img class="thumb" src={img} /> : <div class="ico-big">{Ico && <Ico />}</div>}
              <h3>{t('of_' + o.id)}</h3>
              <p>{offerDesc(o)}</p>
              <div class="progress3">{Array.from({ length: o.views }, (_, i) => <i key={i} class={i < n ? 'on' : ''} />)}</div>
              <AdBtn class="small pulse" onClick={() => watchForOffer(o.id)}>{n}/{o.views}</AdBtn>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** "Watch 3 ads" button for a card that also has a coin price. */
function OfferButton({ attach, label }: { attach: string; label?: string }) {
  const p = profile.value;
  const o = attachedOffer(p, attach);
  if (!o) return null;
  const n = offerProgress(p, o.id);
  return (
    <div class="col" style={{ alignItems: 'center', gap: 'calc(var(--u) * 0.6)' }}>
      <div class="progress3">{Array.from({ length: o.views }, (_, i) => <i key={i} class={i < n ? 'on' : ''} />)}</div>
      <AdBtn class="small" onClick={() => watchForOffer(o.id)}>{label ? label + ' · ' : ''}{n}/{o.views}</AdBtn>
    </div>
  );
}
