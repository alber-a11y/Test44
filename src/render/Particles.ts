import * as THREE from 'three';

/** Sprite atlas (2x2): 0 glow, 1 smoke, 2 spark, 3 star */
function makeAtlas(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const cell = 128;
  // glow
  let g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, cell, cell);
  // smoke: several soft blobs
  for (let i = 0; i < 9; i++) {
    const x = cell + 64 + Math.cos(i * 2.4) * 22 * (i % 3) / 2, y = 64 + Math.sin(i * 2.4) * 22 * (i % 3) / 2;
    g = ctx.createRadialGradient(x, y, 0, x, y, 40);
    g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fill();
  }
  // spark: tight core
  g = ctx.createRadialGradient(64, cell + 64, 0, 64, cell + 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, cell, cell, cell);
  // star
  ctx.save();
  ctx.translate(cell + 64, cell + 64);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  for (let k = 0; k < 4; k++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(7, 0); ctx.lineTo(0, 60); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const VS = /* glsl */ `
attribute float aSize;
attribute vec4 aColor;
attribute float aSprite;
varying vec4 vColor;
varying float vSprite;
uniform float uScale;
#include <fog_pars_vertex>
void main() {
  vColor = aColor;
  vSprite = aSprite;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FS = /* glsl */ `
uniform sampler2D uMap;
varying vec4 vColor;
varying float vSprite;
#include <fog_pars_fragment>
void main() {
  vec2 cell = vec2(mod(vSprite, 2.0), floor(vSprite / 2.0)) * 0.5;
  vec2 uv = cell + vec2(gl_PointCoord.x, gl_PointCoord.y) * 0.5;
  vec4 tex = texture2D(uMap, uv);
  gl_FragColor = vec4(vColor.rgb * tex.rgb, vColor.a * tex.a);
  if (gl_FragColor.a < 0.004) discard;
  #include <fog_fragment>
}`;

interface P {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  life: number; max: number; s0: number; s1: number;
  r0: number; g0: number; b0: number; a0: number; r1: number; g1: number; b1: number; a1: number;
  grav: number; drag: number; sprite: number;
}

class Pool {
  points: THREE.Points;
  list: P[] = [];
  private pos: Float32Array; private col: Float32Array; private size: Float32Array; private spr: Float32Array;
  private geo: THREE.BufferGeometry;
  constructor(public max: number, atlas: THREE.Texture, additive: boolean, scaleU: { value: number }) {
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max); this.spr = new Float32Array(max);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSprite', new THREE.BufferAttribute(this.spr, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: atlas }, uScale: scaleU }]),
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    mat.uniforms.uMap.value = atlas;
    mat.uniforms.uScale = scaleU;
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 20 : 10;
  }
  update(dt: number) {
    const L = this.list;
    let n = 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.max) { L[i] = L[L.length - 1]; L.pop(); continue; }
      const dr = Math.max(0, 1 - p.drag * dt);
      p.vx *= dr; p.vy = p.vy * dr - p.grav * dt; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02 && p.grav > 0) { p.y = 0.02; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
    }
    for (const p of L) {
      if (n >= this.max) break;
      const k = p.life / p.max;
      this.pos[n * 3] = p.x; this.pos[n * 3 + 1] = p.y; this.pos[n * 3 + 2] = p.z;
      const fadeIn = Math.min(1, p.life / 0.06);
      this.col[n * 4] = p.r0 + (p.r1 - p.r0) * k;
      this.col[n * 4 + 1] = p.g0 + (p.g1 - p.g0) * k;
      this.col[n * 4 + 2] = p.b0 + (p.b1 - p.b0) * k;
      this.col[n * 4 + 3] = (p.a0 + (p.a1 - p.a0) * k) * fadeIn;
      this.size[n] = p.s0 + (p.s1 - p.s0) * k;
      this.spr[n] = p.sprite;
      n++;
    }
    this.geo.setDrawRange(0, n);
    for (const name of ['position', 'aColor', 'aSize', 'aSprite']) (this.geo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
  }
}

export interface EmitOpts {
  count?: number;
  spread?: number;
  spreadY?: number;
  vel?: [number, number, number];
  velRand?: number;
  up?: number;
  life?: [number, number];
  size?: [number, number];
  color?: number;
  color1?: number;
  alpha?: [number, number];
  grav?: number;
  drag?: number;
  sprite?: number;
  additive?: boolean;
}

const _c0 = new THREE.Color(), _c1 = new THREE.Color();

export class Particles {
  group = new THREE.Group();
  add: Pool;
  alpha: Pool;
  scaleU = { value: 600 };
  density = 1;
  constructor(max = 4000) {
    const atlas = makeAtlas();
    this.add = new Pool(max, atlas, true, this.scaleU);
    this.alpha = new Pool(Math.floor(max * 0.7), atlas, false, this.scaleU);
    this.group.add(this.alpha.points, this.add.points);
  }
  setViewport(heightPx: number, camera: THREE.PerspectiveCamera) {
    this.scaleU.value = heightPx * camera.projectionMatrix.elements[5] * 0.5;
  }
  emit(x: number, y: number, z: number, o: EmitOpts) {
    const pool = o.additive ? this.add : this.alpha;
    const count = Math.max(1, Math.round((o.count ?? 1) * this.density));
    _c0.set(o.color ?? 0xffffff);
    _c1.set(o.color1 ?? o.color ?? 0xffffff);
    const sp = o.spread ?? 0, spy = o.spreadY ?? sp, vr = o.velRand ?? 0;
    for (let i = 0; i < count; i++) {
      if (pool.list.length >= pool.max) pool.list.shift();
      const life = o.life ? o.life[0] + Math.random() * (o.life[1] - o.life[0]) : 1;
      pool.list.push({
        x: x + (Math.random() * 2 - 1) * sp, y: y + (Math.random() * 2 - 1) * spy, z: z + (Math.random() * 2 - 1) * sp,
        vx: (o.vel?.[0] ?? 0) + (Math.random() * 2 - 1) * vr,
        vy: (o.vel?.[1] ?? 0) + (Math.random() * 2 - 1) * vr * 0.5 + (o.up ?? 0) * Math.random(),
        vz: (o.vel?.[2] ?? 0) + (Math.random() * 2 - 1) * vr,
        life: 0, max: life,
        s0: o.size?.[0] ?? 1, s1: o.size?.[1] ?? o.size?.[0] ?? 1,
        r0: _c0.r, g0: _c0.g, b0: _c0.b, a0: o.alpha?.[0] ?? 1,
        r1: _c1.r, g1: _c1.g, b1: _c1.b, a1: o.alpha?.[1] ?? 0,
        grav: o.grav ?? 0, drag: o.drag ?? 0, sprite: o.sprite ?? 0,
      });
    }
  }
  update(dt: number) { this.add.update(dt); this.alpha.update(dt); }

  // ---- presets ---------------------------------------------------------------------------
  dust(x: number, z: number, n = 6, color = 0xcdb38a) {
    this.emit(x, 0.15, z, { count: n, spread: 0.3, spreadY: 0.05, velRand: 1.2, up: 0.8, life: [0.5, 1.1], size: [0.5, 1.4], color, alpha: [0.5, 0], drag: 2.5, sprite: 1 });
  }
  hit(x: number, y: number, z: number, color = 0xffe2a0) {
    this.emit(x, y, z, { count: 6, spread: 0.05, velRand: 3.5, up: 2, life: [0.12, 0.3], size: [0.35, 0.05], color, alpha: [1, 0], drag: 4, sprite: 2, additive: true, grav: 6 });
  }
  blood(x: number, y: number, z: number) {
    this.emit(x, y, z, { count: 4, spread: 0.08, velRand: 1.6, up: 1.5, life: [0.25, 0.45], size: [0.22, 0.1], color: 0xb02020, color1: 0x601010, alpha: [0.9, 0], grav: 9, sprite: 0 });
  }
  deflect(x: number, z: number) {
    this.emit(x, 0.9, z, { count: 8, spread: 0.1, velRand: 4, up: 2, life: [0.1, 0.25], size: [0.3, 0.05], color: 0xfff6c0, alpha: [1, 0], drag: 3, sprite: 2, additive: true, grav: 5 });
  }
  explosion(x: number, z: number, r: number, fire: boolean, big = false) {
    const k = big ? 1.6 : 1;
    if (fire) {
      this.emit(x, 0.5, z, { count: 26 * k, spread: r * 0.35, spreadY: 0.3, velRand: 2.5, up: 4, life: [0.35, 0.8], size: [1.6 * k, 0.4], color: 0xffd27a, color1: 0xff4a10, alpha: [1, 0], drag: 2.5, sprite: 0, additive: true });
      this.emit(x, 0.3, z, { count: 14 * k, spread: r * 0.3, velRand: 6, up: 6, life: [0.4, 0.9], size: [0.25, 0.05], color: 0xffe08a, alpha: [1, 0], grav: 12, sprite: 2, additive: true });
    } else {
      this.emit(x, 0.3, z, { count: 10 * k, spread: r * 0.25, velRand: 5, up: 5, life: [0.4, 0.8], size: [0.25, 0.15], color: 0x8a7457, alpha: [1, 0.6], grav: 14, sprite: 0 });
      this.emit(x, 0.4, z, { count: 6 * k, spread: 0.2, velRand: 2, up: 2, life: [0.12, 0.3], size: [2.2 * k, 0.4], color: 0xfff1c8, alpha: [0.9, 0], sprite: 0, additive: true });
    }
    this.emit(x, 0.3, z, { count: 18 * k, spread: r * 0.45, spreadY: 0.1, velRand: 2.2, up: 1.6, life: [0.8, 1.8], size: [1.2 * k, 3.2 * k], color: fire ? 0x5a4a40 : 0xc0a882, color1: 0x8a8070, alpha: [0.55, 0], drag: 2, sprite: 1 });
  }
  fireTrail(x: number, y: number, z: number) {
    this.emit(x, y, z, { count: 2, spread: 0.08, velRand: 0.4, up: 0.6, life: [0.2, 0.4], size: [0.7, 0.1], color: 0xffc860, color1: 0xff3a00, alpha: [0.9, 0], sprite: 0, additive: true });
  }
  smokeTrail(x: number, y: number, z: number) {
    this.emit(x, y, z, { count: 1, spread: 0.05, velRand: 0.2, up: 0.4, life: [0.4, 0.7], size: [0.3, 0.9], color: 0xb8ab9a, alpha: [0.35, 0], sprite: 1 });
  }
  magicTrail(x: number, y: number, z: number, color = 0x8fd0ff) {
    this.emit(x, y, z, { count: 2, spread: 0.06, velRand: 0.3, life: [0.2, 0.45], size: [0.55, 0.05], color, alpha: [1, 0], sprite: 0, additive: true });
  }
  magicBurst(x: number, y: number, z: number, color = 0x8fd0ff) {
    this.emit(x, y, z, { count: 14, spread: 0.1, velRand: 3, up: 1.5, life: [0.25, 0.55], size: [0.6, 0.05], color, alpha: [1, 0], drag: 3, sprite: 3, additive: true });
  }
  flames(x: number, z: number, r: number) {
    this.emit(x, 0.3, z, { count: 18, spread: r * 0.55, spreadY: 0.1, velRand: 0.5, up: 2.5, life: [0.35, 0.7], size: [1.1, 0.2], color: 0xffc860, color1: 0xff3000, alpha: [0.85, 0], sprite: 0, additive: true });
  }
  torch(x: number, y: number, z: number, s = 1) {
    this.emit(x, y, z, { count: 1, spread: 0.08 * s, velRand: 0.15, up: 1.4 * s, life: [0.25, 0.5], size: [0.9 * s, 0.1], color: 0xffd070, color1: 0xff4400, alpha: [0.9, 0], sprite: 0, additive: true });
  }
  coinBurst(x: number, z: number) {
    this.emit(x, 0.6, z, { count: 6, spread: 0.2, velRand: 1.5, up: 2, life: [0.3, 0.6], size: [0.5, 0.05], color: 0xffe066, alpha: [1, 0], sprite: 3, additive: true });
  }
  heal(x: number, z: number) {
    this.emit(x, 0.4, z, { count: 14, spread: 0.7, velRand: 0.2, up: 2, life: [0.6, 1.1], size: [0.45, 0.1], color: 0x8dff9a, alpha: [1, 0], sprite: 3, additive: true });
  }
  freeze(x: number, z: number, r: number) {
    this.emit(x, 0.4, z, { count: 60, spread: r * 0.7, spreadY: 0.2, velRand: 1, up: 2.5, life: [0.6, 1.2], size: [0.7, 0.1], color: 0xc8f0ff, alpha: [1, 0], sprite: 3, additive: true });
    this.emit(x, 0.2, z, { count: 20, spread: r * 0.6, velRand: 1.5, life: [0.8, 1.6], size: [1.5, 3], color: 0xe0f6ff, alpha: [0.5, 0], sprite: 1 });
  }
  death(x: number, z: number, large: boolean) {
    this.dust(x, z, large ? 18 : 6, 0xbfae90);
  }
  build(x: number, z: number) {
    this.dust(x, z, 26, 0xd8c7a0);
    this.emit(x, 1.5, z, { count: 16, spread: 1.2, velRand: 1, up: 2, life: [0.5, 1], size: [0.4, 0.05], color: 0xfff2b0, alpha: [1, 0], sprite: 3, additive: true });
  }
  warcry(x: number, z: number) {
    this.emit(x, 0.3, z, { count: 40, spread: 0.4, velRand: 6, life: [0.4, 0.7], size: [0.8, 0.2], color: 0xff5040, alpha: [0.8, 0], drag: 2, sprite: 0, additive: true });
  }
  ambient(kind: 'snow' | 'ash' | 'pollen', cx: number, cz: number, w: number, h: number, dt: number) {
    const rate = kind === 'snow' ? 60 : kind === 'ash' ? 30 : 6;
    const n = rate * dt * this.density;
    for (let i = 0; i < n || Math.random() < n - i; i++) {
      const x = cx + (Math.random() - 0.5) * w, z = cz + (Math.random() - 0.5) * h;
      if (kind === 'snow') this.emit(x, 9, z, { count: 1, velRand: 0.4, vel: [0.3, -1.4, 0], life: [5, 7], size: [0.22, 0.22], color: 0xffffff, alpha: [0.9, 0.7], sprite: 0 });
      else if (kind === 'ash') this.emit(x, Math.random() * 3, z, { count: 1, velRand: 0.3, vel: [0.2, 0.5, 0], life: [3, 5], size: [0.18, 0.1], color: 0xff8a40, alpha: [1, 0], sprite: 0, additive: true });
      else this.emit(x, 0.5 + Math.random() * 2, z, { count: 1, velRand: 0.25, vel: [0.25, 0.05, 0.1], life: [3, 6], size: [0.12, 0.12], color: 0xfff8d0, alpha: [0.8, 0], sprite: 0, additive: true });
      if (i > 50) break;
    }
  }
}
