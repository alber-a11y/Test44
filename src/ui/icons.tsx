import type { JSX } from 'preact';

type P = { size?: number; class?: string };

const svg = (body: JSX.Element, { size = 28, class: cls }: P, vb = '0 0 64 64') => (
  <svg class={'ico ' + (cls ?? '')} width={size} height={size} viewBox={vb} aria-hidden="true">{body}</svg>
);

const Grad = ({ id, a, b }: { id: string; a: string; b: string }) => (
  <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color={a} /><stop offset="1" stop-color={b} /></linearGradient></defs>
);

export const IcoCoin = (p: P) => svg(<>
  <defs><radialGradient id="gc" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff6b8" /><stop offset="0.45" stop-color="#f6c531" /><stop offset="1" stop-color="#b8780e" /></radialGradient></defs>
  <circle cx="32" cy="32" r="27" fill="url(#gc)" stroke="#7a4b06" stroke-width="3" />
  <circle cx="32" cy="32" r="19" fill="none" stroke="#c28a18" stroke-width="3" />
  <path d="M22 38 L24 24 L29 31 L32 21 L35 31 L40 24 L42 38 Z" fill="#9a6210" />
</>, p);

export const IcoStar = (p: P & { off?: boolean }) => svg(<>
  <Grad id={p.off ? 'gs0' : 'gs'} a={p.off ? '#6b6b7a' : '#fff3a0'} b={p.off ? '#3b3b48' : '#f0a817'} />
  <path d="M32 4 L40.5 22.5 L60 24.5 L45 38 L49.5 58 L32 47.5 L14.5 58 L19 38 L4 24.5 L23.5 22.5 Z" fill={`url(#${p.off ? 'gs0' : 'gs'})`} stroke={p.off ? '#2a2a33' : '#8a5a06'} stroke-width="3" stroke-linejoin="round" />
</>, p);

export const IcoHeart = (p: P) => svg(<>
  <Grad id="gh" a="#ff8a8a" b="#c41a2a" />
  <path d="M32 56 C10 40 4 30 8 19 C12 9 26 8 32 19 C38 8 52 9 56 19 C60 30 54 40 32 56 Z" fill="url(#gh)" stroke="#6e0a14" stroke-width="3" />
  <ellipse cx="20" cy="21" rx="5" ry="3.5" fill="#ffd0d0" opacity="0.7" />
</>, p);

export const IcoSkull = (p: P) => svg(<>
  <path d="M32 6 C16 6 8 17 9 30 C10 38 15 41 17 42 L18 52 L46 52 L47 42 C49 41 54 38 55 30 C56 17 48 6 32 6 Z" fill="#f2ead8" stroke="#3a2a1a" stroke-width="3" />
  <circle cx="23" cy="30" r="6" fill="#3a2a1a" /><circle cx="41" cy="30" r="6" fill="#3a2a1a" />
  <path d="M32 36 L28 43 L36 43 Z" fill="#3a2a1a" />
  <path d="M24 52 V46 M32 52 V46 M40 52 V46" stroke="#3a2a1a" stroke-width="3" />
</>, p);

export const IcoPause = (p: P) => svg(<><rect x="16" y="12" width="11" height="40" rx="3" fill="currentColor" /><rect x="37" y="12" width="11" height="40" rx="3" fill="currentColor" /></>, p);
export const IcoPlay = (p: P) => svg(<path d="M20 10 L52 32 L20 54 Z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />, p);
export const IcoFast = (p: P & { n?: number }) => svg(<>
  <path d="M8 14 L30 32 L8 50 Z M32 14 L54 32 L32 50 Z" fill="currentColor" />
</>, p);
export const IcoGear = (p: P) => svg(<>
  <path d="M27 4 h10 l2 8 a20 20 0 0 1 6 3 l8-3 5 9-6 6 a20 20 0 0 1 0 7 l6 6-5 9-8-3 a20 20 0 0 1-6 3 l-2 8 h-10 l-2-8 a20 20 0 0 1-6-3 l-8 3-5-9 6-6 a20 20 0 0 1 0-7 l-6-6 5-9 8 3 a20 20 0 0 1 6-3 Z" fill="currentColor" />
  <circle cx="32" cy="32" r="9" fill="#2b2338" />
</>, p);
export const IcoBack = (p: P) => svg(<path d="M40 10 L18 32 L40 54" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />, p);
export const IcoClose = (p: P) => svg(<path d="M14 14 L50 50 M50 14 L14 50" stroke="currentColor" stroke-width="9" stroke-linecap="round" />, p);
export const IcoLock = (p: P) => svg(<>
  <path d="M20 28 V20 a12 12 0 0 1 24 0 V28" fill="none" stroke="#c9c2b3" stroke-width="6" />
  <rect x="12" y="27" width="40" height="30" rx="5" fill="#a07a3a" stroke="#4a3416" stroke-width="3" />
  <circle cx="32" cy="40" r="4" fill="#3a2a10" /><rect x="30" y="41" width="4" height="9" fill="#3a2a10" />
</>, p);
export const IcoAd = (p: P) => svg(<>
  <rect x="4" y="12" width="56" height="40" rx="9" fill="#ffffff" opacity="0.18" />
  <path d="M25 20 L45 32 L25 44 Z" fill="currentColor" />
</>, p);
export const IcoSword = (p: P) => svg(<>
  <path d="M46 6 L58 6 L58 18 L28 48 L16 36 Z" fill="#dfe6ee" stroke="#4b5560" stroke-width="3" />
  <path d="M12 32 L32 52" stroke="#a87a2a" stroke-width="7" stroke-linecap="round" />
  <path d="M10 54 L18 46" stroke="#6b4a1a" stroke-width="8" stroke-linecap="round" />
</>, p);
export const IcoFlag = (p: P) => svg(<>
  <path d="M14 6 V60" stroke="#6b4a1a" stroke-width="5" stroke-linecap="round" />
  <path d="M16 8 H52 L44 20 L52 32 H16 Z" fill="#d6322a" stroke="#6e0f0a" stroke-width="3" stroke-linejoin="round" />
  <path d="M26 14 L30 22 L34 14" fill="none" stroke="#ffd36a" stroke-width="3" />
</>, p);
export const IcoHammer = (p: P) => svg(<>
  <path d="M30 26 L12 56" stroke="#8a5a2a" stroke-width="7" stroke-linecap="round" />
  <path d="M22 10 L46 4 L54 22 L30 30 Z" fill="#aab3bd" stroke="#3e4650" stroke-width="3" stroke-linejoin="round" />
</>, p);
export const IcoShop = (p: P) => svg(<>
  <path d="M8 24 L14 8 H50 L56 24 Z" fill="#d6322a" stroke="#6e0f0a" stroke-width="3" />
  <path d="M14 24 V56 H50 V24" fill="#e9d2a0" stroke="#6b4a1a" stroke-width="3" />
  <rect x="26" y="36" width="12" height="20" fill="#8a5a2a" />
  <path d="M8 24 Q14 30 20 24 Q26 30 32 24 Q38 30 44 24 Q50 30 56 24" fill="#ffffff" stroke="#6e0f0a" stroke-width="2" />
</>, p);
export const IcoMap = (p: P) => svg(<>
  <path d="M6 14 L22 8 L42 14 L58 8 V50 L42 56 L22 50 L6 56 Z" fill="#e9d2a0" stroke="#6b4a1a" stroke-width="3" stroke-linejoin="round" />
  <path d="M22 8 V50 M42 14 V56" stroke="#b89a60" stroke-width="2" />
  <path d="M14 40 Q22 30 30 34 T48 24" fill="none" stroke="#d6322a" stroke-width="3" stroke-dasharray="4 3" />
  <path d="M44 20 l6 6 m0 -6 l-6 6" stroke="#d6322a" stroke-width="3" />
</>, p);
export const IcoChest = (p: P) => svg(<>
  <path d="M8 28 Q8 10 32 10 Q56 10 56 28 Z" fill="#a8642a" stroke="#4a2a10" stroke-width="3" />
  <rect x="8" y="28" width="48" height="26" rx="3" fill="#8a4f1e" stroke="#4a2a10" stroke-width="3" />
  <path d="M8 28 H56 M20 12 V54 M44 12 V54" stroke="#f0c040" stroke-width="4" />
  <rect x="27" y="26" width="10" height="12" rx="2" fill="#f0c040" stroke="#7a5408" stroke-width="2" />
</>, p);
export const IcoCrown = (p: P) => svg(<>
  <Grad id="gcr" a="#fff2a0" b="#e09a10" />
  <path d="M8 48 L4 18 L20 30 L32 10 L44 30 L60 18 L56 48 Z" fill="url(#gcr)" stroke="#7a4b06" stroke-width="3" stroke-linejoin="round" />
  <rect x="8" y="48" width="48" height="8" rx="2" fill="#e09a10" stroke="#7a4b06" stroke-width="3" />
  <circle cx="32" cy="38" r="4" fill="#d6322a" />
</>, p);

// spells / consumables / boosters
export const IcoMeteor = (p: P) => svg(<>
  <defs><radialGradient id="gm" cx="0.6" cy="0.6" r="0.6"><stop offset="0" stop-color="#fff2a0" /><stop offset="0.5" stop-color="#ff7a1a" /><stop offset="1" stop-color="#a1200a" /></radialGradient></defs>
  <path d="M6 6 L34 26 L26 34 Z" fill="#ffb347" opacity="0.8" /><path d="M18 4 L40 24 L36 28 Z" fill="#ff7a1a" opacity="0.7" /><path d="M4 20 L26 38 L22 42 Z" fill="#ff7a1a" opacity="0.7" />
  <circle cx="40" cy="40" r="16" fill="url(#gm)" stroke="#5a1a0a" stroke-width="3" />
</>, p);
export const IcoReinforce = (p: P) => svg(<>
  <path d="M12 12 H36 V34 Q36 48 24 54 Q12 48 12 34 Z" fill="#2f6fd6" stroke="#0e2a5a" stroke-width="3" />
  <path d="M28 18 H52 V40 Q52 54 40 60 Q28 54 28 40 Z" fill="#4a8ef0" stroke="#0e2a5a" stroke-width="3" />
  <path d="M40 26 V48 M32 34 H48" stroke="#ffe08a" stroke-width="4" />
</>, p);
export const IcoStarfall = (p: P) => svg(<>
  <path d="M44 4 l4 10 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1z" fill="#fff2a0" stroke="#a07a10" stroke-width="2" />
  <path d="M18 24 l3 7 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" fill="#ffe066" stroke="#a07a10" stroke-width="2" />
  <path d="M38 40 l3 7 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" fill="#ffd040" stroke="#a07a10" stroke-width="2" />
</>, p);
export const IcoFreeze = (p: P) => svg(<>
  <circle cx="32" cy="36" r="20" fill="#9fe2ff" stroke="#1a5a8a" stroke-width="3" />
  <path d="M32 20 V52 M18 28 L46 44 M46 28 L18 44" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
  <path d="M28 6 H36 V16 H28 Z" fill="#6a7480" />
</>, p);
export const IcoDynamite = (p: P) => svg(<>
  <rect x="12" y="24" width="12" height="34" rx="3" fill="#d6322a" stroke="#5a0a0a" stroke-width="3" />
  <rect x="26" y="24" width="12" height="34" rx="3" fill="#e84a3a" stroke="#5a0a0a" stroke-width="3" />
  <rect x="40" y="24" width="12" height="34" rx="3" fill="#d6322a" stroke="#5a0a0a" stroke-width="3" />
  <path d="M32 24 Q32 14 40 10" fill="none" stroke="#3a2a1a" stroke-width="3" />
  <circle cx="42" cy="8" r="5" fill="#ffd040" />
</>, p);
export const IcoGoldrush = (p: P) => svg(<>
  <IcoCoinInner x={20} y={36} />
  <IcoCoinInner x={40} y={36} />
  <IcoCoinInner x={30} y={20} />
</>, p);
function IcoCoinInner({ x, y }: { x: number; y: number }) {
  return <><circle cx={x} cy={y} r="14" fill="#f6c531" stroke="#7a4b06" stroke-width="3" /><circle cx={x} cy={y} r="8" fill="none" stroke="#c28a18" stroke-width="2.5" /></>;
}
export const IcoRepair = (p: P) => svg(<>
  <path d="M8 56 V22 H16 V14 H24 V22 H28 V14 H36 V22 H40 V14 H48 V22 H56 V56 Z" fill="#a9a29a" stroke="#4a443e" stroke-width="3" />
  <path d="M26 56 V42 a6 6 0 0 1 12 0 V56" fill="#6b4a1a" />
  <circle cx="46" cy="40" r="12" fill="#5ac85a" stroke="#1a5a1a" stroke-width="3" />
  <path d="M46 33 V47 M39 40 H53" stroke="#fff" stroke-width="4" />
</>, p);
export const IcoPurse = (p: P) => svg(<>
  <path d="M18 18 Q32 8 46 18 L42 24 H22 Z" fill="#8a5a2a" stroke="#3a2410" stroke-width="3" />
  <path d="M22 24 Q6 36 14 52 Q32 62 50 52 Q58 36 42 24 Z" fill="#b07a3a" stroke="#3a2410" stroke-width="3" />
  <circle cx="32" cy="42" r="8" fill="#f6c531" stroke="#7a4b06" stroke-width="2.5" />
</>, p);
export const IcoWalls = (p: P) => svg(<>
  <path d="M6 58 V24 H14 V16 H22 V24 H28 V16 H36 V24 H42 V16 H50 V24 H58 V58 Z" fill="#b8b0a6" stroke="#4a443e" stroke-width="3" />
  <path d="M6 36 H58 M6 48 H58 M20 36 V48 M36 24 V36 M44 48 V58 M28 48 V58" stroke="#7a736a" stroke-width="2" />
</>, p);
export const IcoSharp = (p: P) => svg(<>
  <path d="M8 56 L44 20" stroke="#8a5a2a" stroke-width="5" stroke-linecap="round" />
  <path d="M38 14 L58 6 L50 26 Z" fill="#dfe6ee" stroke="#3e4650" stroke-width="3" stroke-linejoin="round" />
  <path d="M8 56 L4 46 M8 56 L18 60" stroke="#f0f0e6" stroke-width="4" />
  <path d="M52 34 l3 7 7 1-5 5" fill="none" stroke="#ffe066" stroke-width="3" />
</>, p);
export const IcoPhoenix = (p: P) => svg(<>
  <Grad id="gp" a="#ffe066" b="#ff3a10" />
  <path d="M32 58 C22 48 20 38 26 28 C16 30 8 24 4 12 C16 18 22 18 28 14 C26 8 30 4 32 2 C34 4 38 8 36 14 C42 18 48 18 60 12 C56 24 48 30 38 28 C44 38 42 48 32 58 Z" fill="url(#gp)" stroke="#7a1a06" stroke-width="2.5" />
</>, p);
export const IcoHound = (p: P) => svg(<>
  <path d="M10 44 Q8 30 18 26 L22 14 L28 24 H42 Q52 24 54 34 L58 36 L54 42 L48 42 L46 54 H40 L38 44 H24 L22 54 H16 Z" fill="#e8b23a" stroke="#6a4a0a" stroke-width="3" stroke-linejoin="round" />
  <circle cx="22" cy="30" r="2.5" fill="#2a1a0a" />
</>, p);
export const IcoPalette = (p: P) => svg(<>
  <path d="M10 50 L18 16 H46 L54 50 Z" fill="#f6c531" stroke="#7a4b06" stroke-width="3" />
  <path d="M24 16 V8 H40 V16" fill="#f6c531" stroke="#7a4b06" stroke-width="3" />
  <path d="M14 40 H50" stroke="#fff5c0" stroke-width="3" />
</>, p);
export const IcoTrophy = (p: P) => svg(<>
  <Grad id="gt" a="#fff2a0" b="#e09a10" />
  <path d="M18 8 H46 V24 Q46 40 32 42 Q18 40 18 24 Z" fill="url(#gt)" stroke="#7a4b06" stroke-width="3" />
  <path d="M18 14 H8 Q8 28 20 30 M46 14 H56 Q56 28 44 30" fill="none" stroke="#7a4b06" stroke-width="3" />
  <path d="M28 42 H36 V50 H28 Z M20 50 H44 V58 H20 Z" fill="#a8642a" stroke="#4a2a10" stroke-width="3" />
</>, p);
export const IcoInfinity = (p: P) => svg(<path d="M32 32 C24 20 8 20 8 32 C8 44 24 44 32 32 C40 20 56 20 56 32 C56 44 40 44 32 32 Z" fill="none" stroke="currentColor" stroke-width="7" />, p);
export const IcoVolley = (p: P) => svg(<>
  {[14, 30, 46].map((x) => <g key={x}><path d={`M${x} 6 L${x} 46`} stroke="#8a5a2a" stroke-width="4" /><path d={`M${x - 6} 44 L${x} 58 L${x + 6} 44 Z`} fill="#dfe6ee" stroke="#3e4650" stroke-width="2" /></g>)}
</>, p);
export const IcoCaltrops = (p: P) => svg(<>
  <path d="M32 8 L38 30 L58 36 L38 40 L32 58 L26 40 L6 36 L26 30 Z" fill="#9aa1aa" stroke="#3e4650" stroke-width="3" stroke-linejoin="round" />
</>, p);
export const IcoSlam = (p: P) => svg(<>
  <path d="M8 52 Q32 36 56 52" fill="none" stroke="#ffe066" stroke-width="4" />
  <path d="M30 30 L22 52" stroke="#8a5a2a" stroke-width="6" stroke-linecap="round" />
  <path d="M18 10 L44 4 L50 22 L26 28 Z" fill="#aab3bd" stroke="#3e4650" stroke-width="3" />
</>, p);
export const IcoBless = (p: P) => svg(<>
  <circle cx="32" cy="32" r="24" fill="#fff7c0" opacity="0.5" />
  <path d="M28 12 H36 V28 H52 V36 H36 V52 H28 V36 H12 V28 H28 Z" fill="#ffe066" stroke="#8a6a06" stroke-width="3" />
</>, p);
export const IcoFireball = (p: P) => svg(<>
  <defs><radialGradient id="gfb" cx="0.5" cy="0.6" r="0.6"><stop offset="0" stop-color="#fff2a0" /><stop offset="0.5" stop-color="#ff7a1a" /><stop offset="1" stop-color="#c0200a" /></radialGradient></defs>
  <path d="M32 58 C14 58 10 40 18 28 C20 36 26 36 26 30 C24 18 32 10 40 6 C38 16 50 22 50 38 C50 50 42 58 32 58 Z" fill="url(#gfb)" stroke="#6a1006" stroke-width="3" />
</>, p);
export const IcoNova = (p: P) => svg(<>
  <circle cx="32" cy="32" r="12" fill="#c8f0ff" stroke="#1a5a8a" stroke-width="3" />
  {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M32 4 L36 16 H28 Z" fill="#9fe2ff" stroke="#1a5a8a" stroke-width="2" transform={`rotate(${a} 32 32)`} />)}
</>, p);
export const IcoWhirl = (p: P) => svg(<>
  <path d="M32 32 m-20 0 a20 20 0 1 1 20 20" fill="none" stroke="#e8c070" stroke-width="5" />
  <path d="M32 32 m-11 0 a11 11 0 1 1 11 11" fill="none" stroke="#f6e0a0" stroke-width="5" />
  <path d="M8 26 L12 40 L18 30 Z" fill="#e8c070" />
</>, p);
export const IcoHorn = (p: P) => svg(<>
  <path d="M8 40 Q20 36 40 14 L54 22 Q44 44 14 52 Z" fill="#e9d2a0" stroke="#6b4a1a" stroke-width="3" />
  <path d="M40 14 L54 22" stroke="#c28a18" stroke-width="6" />
  <path d="M20 46 L16 40" stroke="#c28a18" stroke-width="4" />
</>, p);

export const SPELL_ICONS: Record<string, (p: P) => JSX.Element> = {
  reinforce: IcoReinforce, meteor: IcoMeteor, starfall: IcoStarfall,
  freeze: IcoFreeze, dynamite: IcoDynamite, goldrush: IcoGoldrush, repair: IcoRepair,
  purse: IcoPurse, walls: IcoWalls, sharp: IcoSharp,
  phoenix: IcoPhoenix, hound: IcoHound, goldskin: IcoPalette,
  volley: IcoVolley, caltrops: IcoCaltrops, slam: IcoSlam, blessing: IcoBless, fireball: IcoFireball, frostnova: IcoNova, whirlwind: IcoWhirl, warhorn: IcoHorn,
};
