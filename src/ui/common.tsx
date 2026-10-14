import type { ComponentChildren, JSX } from 'preact';
import { profile } from '../app/save';
import { Audio } from '../audio/AudioManager';
import { IcoAd, IcoBack, IcoCoin, IcoStar } from './icons';
import { totalStars } from '../app/save';

export function Btn(props: { onClick?: () => void; class?: string; disabled?: boolean; children?: ComponentChildren; title?: string; sound?: boolean; style?: JSX.CSSProperties }) {
  return (
    <button
      class={'btn ' + (props.class ?? '')}
      disabled={props.disabled}
      title={props.title}
      style={props.style}
      onClick={(e) => {
        e.stopPropagation();
        if (props.sound !== false) Audio.sfx('click', { vol: 0.7 });
        props.onClick?.();
      }}
    >
      {props.children}
    </button>
  );
}

export function AdBtn(props: { onClick: () => void; children?: ComponentChildren; class?: string; disabled?: boolean }) {
  return (
    <Btn class={'purple ' + (props.class ?? '')} onClick={props.onClick} disabled={props.disabled}>
      <span class="badge-ad"><IcoAd size={24} /></span>
      {props.children}
    </Btn>
  );
}

export function Price({ value, ok = true }: { value: number; ok?: boolean }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: ok ? undefined : '#ff8a7a' }}><IcoCoin size={22} />{value}</span>;
}

export function CoinChip() {
  return <div class="chip"><IcoCoin />{profile.value.coins}</div>;
}
export function StarChip() {
  return <div class="chip"><IcoStar />{totalStars()}</div>;
}

export function BackBtn({ onClick }: { onClick: () => void }) {
  return <Btn class="round gray" onClick={onClick}><IcoBack size={30} /></Btn>;
}

export function Stars({ n, size = 22, max = 3 }: { n: number; size?: number; max?: number }) {
  return <span style={{ display: 'inline-flex' }}>{Array.from({ length: max }, (_, i) => <IcoStar key={i} size={size} off={i >= n} />)}</span>;
}

export function ModalFrame({ title, children, color, onClose }: { title?: string; children: ComponentChildren; color?: string; onClose?: () => void }) {
  return (
    <div class="modal-back" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div class="modal panel">
        {title && <div class={'ribbon ' + (color ?? '')}>{title}</div>}
        {children}
      </div>
    </div>
  );
}
