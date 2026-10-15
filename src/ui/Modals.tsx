import { useState } from 'preact/hooks';
import {
  modal, startLevel, closePause, openFromPause, adBooster, restartLevel, exitToMap, continueAfterVictory, doubleReward, reviveWithAd, claimConvoy, claimDaily, dailyReward, spend,
} from '../app/game';
import { t } from '../app/i18n';
import { profile, updateProfile } from '../app/save';
import { getLevel } from '../levels/levels';
import { ENEMIES } from '../data/enemies';
import { BOOSTERS, BOOSTER_ORDER } from '../data/items';
import { HERO_ORDER } from '../data/heroes';
import { ACHIEVEMENTS } from '../data/achievements';
import { thumbs } from '../render/Thumbs';
import { AdBtn, Btn, ModalFrame, Price, Stars } from './common';
import { IcoCoin, IcoStar, SPELL_ICONS, IcoTrophy, IcoShop, IcoGear, IcoAd } from './icons';
import { Audio } from '../audio/AudioManager';
import { WheelModal } from './Wheel';

export function Modals() {
  const m = modal.value;
  if (!m) return null;
  switch (m.type) {
    case 'prelevel': return <PreLevel level={m.level} />;
    case 'wheel': return <WheelModal />;
    case 'achievements': return <Achievements />;
    case 'victory': return <Victory m={m} />;
    case 'defeat': return <Defeat m={m} />;
    case 'pause': return (
      <ModalFrame title={t('pause')} color="blue" onClose={closePause}>
        <div class="col" style={{ padding: 'calc(var(--u) * 2) calc(var(--u) * 4)' }}>
          <Btn class="big" onClick={closePause}>{t('resume')}</Btn>
          <div class="row" style={{ flexWrap: 'nowrap' }}>
            <Btn class="blue" style={{ flex: 1 }} onClick={() => openFromPause('shop')}><IcoShop size={26} />{t('shop')}</Btn>
            <Btn class="gray" style={{ flex: 1 }} onClick={() => openFromPause('settings')}><IcoGear size={26} />{t('settings')}</Btn>
          </div>
          <Btn class="gold" onClick={restartLevel}>{t('restart')}</Btn>
          <Btn class="red" onClick={exitToMap}>{t('exit')}</Btn>
        </div>
      </ModalFrame>
    );
    case 'convoy': return (
      <ModalFrame title={t('convoy')} color="gold" onClose={() => claimConvoy(false)}>
        <div class="col" style={{ alignItems: 'center' }}>
          <div class="row mid-t"><IcoCoin size={56} /><span style={{ font: '400 calc(var(--u)*7) var(--font-head)', color: '#ffe066' }}>+{m.gold}</span></div>
          <p class="mid-t">{t('convoy_desc', { n: m.gold })}</p>
          <AdBtn class="big pulse" onClick={() => claimConvoy(true)}>{t('take')}</AdBtn>
          <Btn class="gray small" onClick={() => claimConvoy(false)}>{t('close')}</Btn>
        </div>
      </ModalFrame>
    );
    case 'daily': {
      const p = profile.value;
      const amount = dailyReward(p.daily.streak);
      return (
        <ModalFrame title={t('daily_title')} color="gold" onClose={() => claimDaily(false)}>
          <div class="row" style={{ gap: 'calc(var(--u) * 1)', margin: 'calc(var(--u) * 2) 0' }}>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} class="panel" style={{ padding: 'calc(var(--u) * 1)', opacity: i < Math.min(6, p.daily.streak) ? 0.5 : 1, outline: i === Math.min(6, p.daily.streak) ? '3px solid #ffe066' : 'none', minWidth: 'calc(var(--u) * 9)' }}>
                <div class="small-t">{t('daily_day', { n: i + 1 })}</div>
                <IcoCoin size={26} />
                <div class="small-t">{dailyReward(i)}</div>
              </div>
            ))}
          </div>
          <div class="row">
            <Btn class="gold" onClick={() => claimDaily(false)}>{t('claim')} <Price value={amount} /></Btn>
            <AdBtn class="pulse" onClick={() => claimDaily(true)}>x2 <Price value={amount * 2} /></AdBtn>
          </div>
        </ModalFrame>
      );
    }
    case 'confirm': return (
      <ModalFrame title="?" color="" onClose={() => (modal.value = null)}>
        <p class="mid-t">{m.text}</p>
        <div class="row">
          <Btn class="red" onClick={() => { modal.value = null; m.onYes(); }}>{t('yes')}</Btn>
          <Btn class="gray" onClick={() => (modal.value = null)}>{t('no')}</Btn>
        </div>
      </ModalFrame>
    );
  }
}

function PreLevel({ level }: { level: number }) {
  const def = getLevel(level);
  const p = profile.value;
  const [chosen, setChosen] = useState<string[]>([]);
  const enemies = [...new Set(def.waves.slice(0, 60).flatMap((w) => w.groups.map((g) => g.enemy)))].sort((a, b) => ENEMIES[a].intro - ENEMIES[b].intro);
  const toggle = (id: string) => {
    if (chosen.includes(id)) { setChosen(chosen.filter((x) => x !== id)); return; }
    if ((p.boosters[id] ?? 0) > 0) { setChosen([...chosen, id]); Audio.sfx('click'); return; }
    const price = BOOSTERS[id].price;
    if (p.coins < price) { adBooster(id).then((ok) => ok && setChosen((c) => [...c, id])); return; }
    if (spend(price)) { updateProfile((d) => (d.boosters[id] = (d.boosters[id] ?? 0) + 1)); setChosen([...chosen, id]); }
  };
  const title = level === 0 ? t('endless') : t('level_n', { n: level });
  return (
    <ModalFrame title={title} color={def.boss ? '' : 'blue'} onClose={() => (modal.value = null)}>
      {level === 0 ? <p class="mid-t">{t('endless_desc', { n: p.endlessBest })}</p> : (
        <div class="row" style={{ marginBottom: 'calc(var(--u) * 1)' }}><Stars n={p.stars[level] ?? 0} size={34} /></div>
      )}
      <div class="small-t muted">{t('biome_' + def.biome)} · {t('waves_count', { n: def.endless ? '∞' : def.waves.length })}</div>
      <div class="row" style={{ margin: 'calc(var(--u) * 2) 0', gap: 'calc(var(--u) * 1)' }}>
        {enemies.map((id) => (
          <div key={id} title={t('e_' + id)} style={{ width: 'calc(var(--u) * 11)', height: 'calc(var(--u) * 11)', borderRadius: '50%', background: ENEMIES[id].boss ? 'radial-gradient(#ff8a7a,#6e0f0a)' : 'radial-gradient(#6a5a80,#2b2338)', border: '3px solid #1a1222', overflow: 'hidden' }}>
            <img src={thumbs['enemy_' + id]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>
      <div class="section-h" style={{ marginTop: 'calc(var(--u) * 1)' }}>{t('tab_heroes')}</div>
      <div class="row" style={{ gap: 'calc(var(--u) * 1.5)' }}>
        {HERO_ORDER.filter((id) => p.heroes.includes(id)).map((id) => (
          <button key={id} class={'slot-btn ' + (p.hero === id ? 'active' : '')} title={t('h_' + id)} style={{ width: 'calc(var(--u) * 12)', height: 'calc(var(--u) * 12)', overflow: 'hidden' }}
            onClick={() => { Audio.sfx('click'); updateProfile((d) => (d.hero = id)); }}>
            <img src={thumbs['hero_' + id]} style={{ width: '120%', height: '120%', objectFit: 'cover', marginTop: '10%' }} />
          </button>
        ))}
      </div>
      <div class="small-t muted">{t('h_' + p.hero)}</div>
      <div class="section-h" style={{ marginTop: 'calc(var(--u) * 1)' }}>{t('boosters')}</div>
      <div class="row" style={{ marginBottom: 'calc(var(--u) * 3)' }}>
        {BOOSTER_ORDER.map((id) => {
          const Ico = SPELL_ICONS[id];
          const have = p.boosters[id] ?? 0;
          const on = chosen.includes(id);
          return (
            <button key={id} class={'slot-btn ' + (on ? 'active' : '')} style={{ width: 'calc(var(--u) * 13)', height: 'calc(var(--u) * 13)' }} title={t('bod_' + id)} onClick={() => toggle(id)}>
              <Ico />
              <span class="count">{on ? '✓' : have > 0 ? have : p.coins >= BOOSTERS[id].price ? <span style={{ display: 'flex', alignItems: 'center' }}><IcoCoin size={14} />{BOOSTERS[id].price}</span> : <IcoAd size={16} />}</span>
            </button>
          );
        })}
      </div>
      <Btn class="big pulse" onClick={() => startLevel(level, chosen)}>{t('start')}</Btn>
    </ModalFrame>
  );
}

function Victory({ m }: { m: Extract<NonNullable<typeof modal.value>, { type: 'victory' }> }) {
  return (
    <ModalFrame title={t('victory')} color="gold">
      <div class="stars-row" style={{ margin: 'calc(var(--u) * 2) 0' }}>
        {[0, 1, 2].map((i) => <span key={i} class="star-pop" style={{ animationDelay: `${0.2 + i * 0.25}s` }}><IcoStar off={i >= m.stars} /></span>)}
      </div>
      <div class="mid-t">{t('kills')}: {m.kills}</div>
      <div class="row" style={{ margin: 'calc(var(--u) * 2) 0' }}>
        <IcoCoin size={48} /><span style={{ font: '400 calc(var(--u)*7) var(--font-head)', color: '#ffe066' }}>+{m.coins}</span>
      </div>
      {m.newTower && (
        <div class="panel parch row" style={{ marginBottom: 'calc(var(--u) * 2)' }}>
          <img src={thumbs['tower_' + m.newTower]} style={{ width: 'calc(var(--u) * 14)' }} />
          <b class="mid-t">{t('tower_unlocked', { n: t('t_' + m.newTower) })}</b>
        </div>
      )}
      <div class="col" style={{ alignItems: 'center' }}>
        {!m.doubled && <AdBtn class="big pulse" onClick={doubleReward}>{t('ad_x2')}</AdBtn>}
        <div class="row">
          <Btn class="gray" onClick={() => continueAfterVictory(false)}>{t('to_map')}</Btn>
          <Btn onClick={() => continueAfterVictory(true)}>{t('next_level')}</Btn>
        </div>
      </div>
    </ModalFrame>
  );
}

function Defeat({ m }: { m: Extract<NonNullable<typeof modal.value>, { type: 'defeat' }> }) {
  const endless = m.endlessWaves !== undefined;
  return (
    <ModalFrame title={endless ? t('endless') : t('defeat')} color={endless ? 'blue' : ''}>
      {endless && <div class="row"><IcoTrophy size={64} /><span style={{ font: '400 calc(var(--u)*7) var(--font-head)' }}>{m.endlessWaves}</span></div>}
      {m.canRevive && (
        <div class="panel parch" style={{ margin: 'calc(var(--u) * 2) 0' }}>
          <div class="mid-t" style={{ marginBottom: 'calc(var(--u) * 1.5)' }}>{t('revive_desc')}</div>
          <AdBtn class="big pulse" onClick={reviveWithAd}>{t('revive')}</AdBtn>
        </div>
      )}
      <div class="row" style={{ margin: 'calc(var(--u) * 2) 0' }}><IcoCoin size={40} /><span class="mid-t">+{m.coins}</span></div>
      <div class="row">
        <Btn class="gray" onClick={exitToMap}>{t('to_map')}</Btn>
        <Btn class="gold" onClick={restartLevel}>{t('retry')}</Btn>
      </div>
    </ModalFrame>
  );
}


function Achievements() {
  const p = profile.value;
  const done = p.achievements ?? [];
  return (
    <ModalFrame title={t('achievements')} color="gold" onClose={() => (modal.value = null)}>
      <div class="col" style={{ maxHeight: '62vh', overflowY: 'auto', touchAction: 'pan-y', textAlign: 'left' }}>
        {ACHIEVEMENTS.map((a) => {
          const v = Math.min(a.goal, a.value(p));
          const claimed = done.includes(a.id);
          const ready = !claimed && v >= a.goal;
          return (
            <div key={a.id} class="panel forge-row" style={{ opacity: claimed ? 0.6 : 1 }}>
              <div class="ico-wrap"><IcoTrophy /></div>
              <div class="info">
                <h3>{t('ach_' + a.id)}</h3>
                <p>{t('achd_' + a.id)}</p>
                <div style={{ height: 'calc(var(--u)*1.8)', borderRadius: '6px', background: '#1a1222', overflow: 'hidden' }}>
                  <div style={{ width: `${(v / a.goal) * 100}%`, height: '100%', background: 'linear-gradient(180deg,#ffe066,#e09a10)' }} />
                </div>
                <div class="small-t muted">{v}/{a.goal}</div>
              </div>
              {claimed ? <Btn class="gray small" disabled>✓</Btn> : (
                <Btn class={ready ? 'gold small pulse' : 'gray small'} disabled={!ready} onClick={() => { updateProfile((d) => { d.achievements = [...(d.achievements ?? []), a.id]; d.coins += a.reward; }); Audio.sfx('reward'); }}>
                  <Price value={a.reward} />
                </Btn>
              )}
            </div>
          );
        })}
      </div>
    </ModalFrame>
  );
}
