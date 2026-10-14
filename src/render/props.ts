import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const WOOD = 0x8a5a33, WOOD_D = 0x5e3b20, METAL = 0x9aa1aa, METAL_D = 0x5d636b, BLUE = 0x2f6fd6, GOLD = 0xe8b84a;

/** Paint a whole geometry with one vertex colour (non-indexed, ready to merge). */
function paint(g: THREE.BufferGeometry, color: number, m?: THREE.Matrix4): THREE.BufferGeometry {
  const geo = (g.index ? g.toNonIndexed() : g);
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(k)) geo.deleteAttribute(k);
  if (m) geo.applyMatrix4(m);
  const c = new THREE.Color(color);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
const mul = (...ms: THREE.Matrix4[]) => ms.reduce((a, b) => a.multiply(b), new THREE.Matrix4());
const RX = (a: number) => new THREE.Matrix4().makeRotationX(a);
const RY = (a: number) => new THREE.Matrix4().makeRotationY(a);
const RZ = (a: number) => new THREE.Matrix4().makeRotationZ(a);
const S = (x: number, y: number, z: number) => new THREE.Matrix4().makeScale(x, y, z);

export const vcMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05 });

function mesh(parts: THREE.BufferGeometry[], mat: THREE.Material = vcMaterial) {
  const m = new THREE.Mesh(mergeGeometries(parts), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Big mounted crossbow, faces +Z. Returns group with `bolt` child. */
export function makeBallista(scale = 1, double = false): THREE.Group {
  const g = new THREE.Group();
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(new THREE.CylinderGeometry(0.35, 0.42, 0.25, 10), METAL_D, T(0, 0.12, 0)));
  parts.push(paint(new THREE.BoxGeometry(0.22, 0.35, 0.22), WOOD_D, T(0, 0.38, 0)));
  const offsets = double ? [-0.28, 0.28] : [0];
  for (const ox of offsets) {
    parts.push(paint(new THREE.BoxGeometry(0.2, 0.16, 1.7), WOOD, T(ox, 0.6, 0.1)));
    parts.push(paint(new THREE.BoxGeometry(0.24, 0.05, 1.72), METAL_D, T(ox, 0.69, 0.1)));
    // bow arms (curved)
    for (const s of [-1, 1]) {
      const arm = new THREE.TorusGeometry(0.75, 0.05, 6, 10, 1.2);
      parts.push(paint(arm, WOOD_D, mul(T(ox, 0.62, 0.55), RY(Math.PI), RZ(s > 0 ? -0.05 : Math.PI + 0.05), RX(Math.PI / 2), RZ(-0.6))));
    }
    // metal caps on arm ends + string
    parts.push(paint(new THREE.BoxGeometry(1.32, 0.02, 0.02), 0xe6dcc8, T(ox, 0.62, 0.05)));
    parts.push(paint(new THREE.BoxGeometry(0.36, 0.14, 0.1), BLUE, T(ox, 0.6, 0.75)));
    // bolt
    parts.push(paint(new THREE.CylinderGeometry(0.03, 0.03, 1.25, 6), WOOD, mul(T(ox, 0.72, 0.45), RX(Math.PI / 2))));
    parts.push(paint(new THREE.ConeGeometry(0.07, 0.22, 6), METAL, mul(T(ox, 0.72, 1.12), RX(Math.PI / 2))));
  }
  const m = mesh(parts);
  g.add(m);
  g.scale.setScalar(scale);
  return g;
}

export function makeCrystal(color: number): THREE.Mesh {
  const geo = new THREE.OctahedronGeometry(0.5, 0);
  geo.scale(0.75, 1.4, 0.75);
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.1, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

export function makeBrazier(): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(new THREE.CylinderGeometry(0.9, 1.1, 1.6, 10), 0x8c847a, T(0, 0.8, 0)));
  parts.push(paint(new THREE.CylinderGeometry(1.0, 1.0, 0.15, 10), 0x6a625a, T(0, 1.6, 0)));
  parts.push(paint(new THREE.CylinderGeometry(1.05, 0.55, 0.6, 12, 1, true), METAL_D, T(0, 1.95, 0)));
  parts.push(paint(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 12), 0x2a1a10, T(0, 2.1, 0)));
  for (let i = 0; i < 4; i++) parts.push(paint(new THREE.BoxGeometry(0.12, 1.7, 0.12), METAL_D, mul(RY((i * Math.PI) / 2 + 0.78), T(0.93, 0.85, 0))));
  parts.push(paint(new THREE.TorusGeometry(1.04, 0.06, 6, 16), GOLD, mul(T(0, 2.25, 0), RX(Math.PI / 2))));
  return mesh(parts);
}

/** Small perched dragon: returns group with named children: body, wingL, wingR, head. Faces +Z. */
export function makeDragon(gold = false): THREE.Group {
  const red = gold ? 0xd9a531 : 0xb3261e, belly = 0xf0c060, dark = gold ? 0x8a6a1a : 0x6b120e, horn = 0xf3e7cf;
  const g = new THREE.Group();
  const bodyParts = [
    paint(new THREE.SphereGeometry(1, 10, 8), red, mul(T(0, 0.75, 0), S(0.45, 0.42, 0.7))),
    paint(new THREE.SphereGeometry(1, 8, 6), belly, mul(T(0, 0.62, 0.1), S(0.36, 0.3, 0.55))),
    paint(new THREE.ConeGeometry(0.22, 1.3, 7), red, mul(T(0, 0.65, -0.95), RX(-Math.PI / 2 - 0.25))),
    paint(new THREE.CylinderGeometry(0.14, 0.2, 0.55, 7), red, mul(T(-0.25, 0.3, 0.25), RX(0.3))),
    paint(new THREE.CylinderGeometry(0.14, 0.2, 0.55, 7), red, mul(T(0.25, 0.3, 0.25), RX(0.3))),
    paint(new THREE.CylinderGeometry(0.15, 0.22, 0.55, 7), red, T(-0.28, 0.3, -0.25)),
    paint(new THREE.CylinderGeometry(0.15, 0.22, 0.55, 7), red, T(0.28, 0.3, -0.25)),
    paint(new THREE.CylinderGeometry(0.15, 0.22, 0.75, 8), red, mul(T(0, 1.15, 0.5), RX(0.6))),
  ];
  for (let i = 0; i < 4; i++) bodyParts.push(paint(new THREE.ConeGeometry(0.07, 0.22, 4), dark, T(0, 1.13 - i * 0.03, 0.15 - i * 0.28)));
  const body = mesh(bodyParts);
  body.name = 'body';
  g.add(body);
  const head = new THREE.Group();
  head.position.set(0, 1.45, 0.72);
  head.name = 'head';
  head.add(mesh([
    paint(new THREE.BoxGeometry(0.36, 0.3, 0.42), red, T(0, 0, 0.05)),
    paint(new THREE.BoxGeometry(0.28, 0.18, 0.38), red, T(0, -0.04, 0.38)),
    paint(new THREE.BoxGeometry(0.26, 0.06, 0.34), belly, T(0, -0.14, 0.36)),
    paint(new THREE.ConeGeometry(0.05, 0.35, 5), horn, mul(T(-0.12, 0.2, -0.12), RX(-0.9))),
    paint(new THREE.ConeGeometry(0.05, 0.35, 5), horn, mul(T(0.12, 0.2, -0.12), RX(-0.9))),
    paint(new THREE.SphereGeometry(0.045, 5, 4), 0xffee55, T(-0.12, 0.07, 0.22)),
    paint(new THREE.SphereGeometry(0.045, 5, 4), 0xffee55, T(0.12, 0.07, 0.22)),
  ]));
  g.add(head);
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(1.3, 0.35); shape.lineTo(1.5, -0.1); shape.lineTo(1.1, -0.35); shape.lineTo(0.8, -0.15); shape.lineTo(0.5, -0.45); shape.lineTo(0.2, -0.3); shape.lineTo(0, -0.3);
    const wg = new THREE.ShapeGeometry(shape);
    wg.rotateX(-Math.PI / 2);
    if (s < 0) wg.scale(-1, 1, 1);
    const wing = new THREE.Mesh(paint(wg, dark), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }));
    wing.castShadow = true;
    const pivot = new THREE.Group();
    pivot.position.set(0.25 * s, 0.98, 0.15);
    pivot.add(wing);
    pivot.name = s < 0 ? 'wingL' : 'wingR';
    g.add(pivot);
  }
  return g;
}

/** Stone pad shown under towers / open build spots. */
export function makePad(): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(new THREE.CylinderGeometry(1.3, 1.42, 0.16, 12), 0x8a8377, T(0, 0.04, 0)));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    parts.push(paint(new THREE.BoxGeometry(0.5, 0.15, 0.34), i % 2 ? 0x7a7368 : 0x958e82, mul(T(Math.cos(a) * 1.22, 0.09, Math.sin(a) * 1.22), RY(-a))));
  }
  return mesh(parts);
}

let dashedTex: THREE.Texture | null = null;
/** Dashed square plot outline (like the reference "buy spot"). */
export function makePlotDecal(size = 2.6): THREE.Mesh {
  if (!dashedTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(20,40,10,0.35)';
    ctx.fillRect(16, 16, 224, 224);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 12;
    ctx.setLineDash([34, 20]);
    ctx.strokeRect(16, 16, 224, 224);
    ctx.setLineDash([]);
    ctx.lineWidth = 14;
    ctx.beginPath();
    for (const [x, y, dx, dy] of [[16, 16, 1, 1], [240, 16, -1, 1], [16, 240, 1, -1], [240, 240, -1, -1]]) {
      ctx.moveTo(x + dx * 40, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * 40);
    }
    ctx.stroke();
    dashedTex = new THREE.CanvasTexture(c);
    dashedTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: dashedTex, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.06;
  m.renderOrder = 2;
  return m;
}

export function makeLabelSprite(text: string, icon = true): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.font = '900 76px "Russo One", Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  const cx = icon ? 128 - 30 : 128;
  ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeText(text, cx, 66);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, 66);
  if (icon) {
    const x = cx + w / 2 + 34, y = 64;
    const gr = ctx.createRadialGradient(x - 8, y - 8, 2, x, y, 28);
    gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.5, '#f2c230'); gr.addColorStop(1, '#b07a10');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#8a5a08'; ctx.stroke();
    ctx.fillStyle = '#b07a10'; ctx.font = '900 30px Rubik, sans-serif'; ctx.fillText('♛', x, y + 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, toneMapped: false }));
  sp.scale.set(2.2, 1.1, 1);
  sp.renderOrder = 30;
  return sp;
}

export function makeCoinGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14);
  g.rotateX(Math.PI / 2);
  return g;
}
export const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc33, emissive: 0x7a4a00, emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.3 });

export function makeArrowGeometry(len = 0.75, r = 0.025): THREE.BufferGeometry {
  const parts = [
    paint(new THREE.CylinderGeometry(r, r, len, 5), WOOD, RX(Math.PI / 2)),
    paint(new THREE.ConeGeometry(r * 2.4, len * 0.18, 5), METAL, mul(T(0, 0, len / 2), RX(Math.PI / 2))),
    paint(new THREE.BoxGeometry(r * 5, 0.005, len * 0.18), 0xf4f0e6, T(0, 0, -len / 2 + 0.06)),
    paint(new THREE.BoxGeometry(0.005, r * 5, len * 0.18), 0xf4f0e6, T(0, 0, -len / 2 + 0.06)),
  ];
  return mergeGeometries(parts);
}

export function makeRing(inner: number, outer: number, color: number, opacity = 0.5): THREE.Mesh {
  const geo = new THREE.RingGeometry(inner, outer, 64);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false }));
  m.renderOrder = 3;
  return m;
}

/** Soft filled disc with bright rim (range indicator). */
export function makeRangeDisc(color: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(1, 72);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
      void main(){ float r = length(vUv); float rim = smoothstep(0.93, 0.985, r) * (1.0 - smoothstep(0.985, 1.0, r));
        float fill = 0.16 + 0.06 * sin(r * 18.0 - uTime * 3.0);
        gl_FragColor = vec4(uColor, fill * (1.0 - smoothstep(0.98, 1.0, r)) + rim * 0.85); }`,
    transparent: true, depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 4;
  return m;
}

export function makeGoldCart(): THREE.Group {
  const g = new THREE.Group();
  const parts = [
    paint(new THREE.BoxGeometry(1.2, 0.5, 1.8), WOOD, T(0, 0.65, 0)),
    paint(new THREE.BoxGeometry(1.3, 0.08, 1.9), WOOD_D, T(0, 0.92, 0)),
    paint(new THREE.BoxGeometry(0.9, 0.5, 0.7), 0xb07a2a, T(0, 1.2, 0.2)),
    paint(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 10, 1, false, 0, Math.PI), 0xc48a30, mul(T(0, 1.45, 0.2), RZ(Math.PI / 2), RY(Math.PI / 2))),
    paint(new THREE.BoxGeometry(0.95, 0.1, 0.12), GOLD, T(0, 1.2, 0.56)),
    paint(new THREE.BoxGeometry(0.1, 0.1, 1.6), WOOD_D, T(0, 0.5, 1.6)),
    paint(new THREE.BoxGeometry(0.6, 0.6, 0.08), BLUE, T(0, 1.9, -0.7)),
    paint(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), WOOD_D, T(0, 1.4, -0.75)),
  ];
  for (const [x, z] of [[-0.68, -0.55], [0.68, -0.55], [-0.68, 0.55], [0.68, 0.55]]) parts.push(paint(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 12), WOOD_D, mul(T(x, 0.34, z), RZ(Math.PI / 2))));
  g.add(mesh(parts));
  // heap of gold
  const gold = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), coinMaterial);
  gold.scale.set(0.9, 0.5, 1.1);
  gold.position.set(0, 0.92, -0.35);
  g.add(gold);
  return g;
}
