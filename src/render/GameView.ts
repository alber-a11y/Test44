import * as THREE from 'three';
import type { Engine } from './Engine';
import { Field } from './Field';
import { BIOMES } from './biomes';
import { buildTerrain } from './Terrain';
import { buildGrass, type GrassLayer } from './Grass';
import { buildRidges } from './Ridges';
import { buildDecor, KIT_SCALE } from './Decor';
import { Particles } from './Particles';
import { CameraRig } from './CameraRig';
import { VatCrowd } from './vat';
import { CHAR_SCALE, getUnitModel, UNIT_SPECS } from './units';
import { TowerVisual } from './TowerVisual';
import { Assets } from './Assets';
import {
  makeArrowGeometry, makeCoinGeometry, coinMaterial, makePad, makePlotDecal, makeLabelSprite, makeRangeDisc, makeRing, makeGoldCart, vcMaterial,
} from './props';
import type { World, SimEvent, Enemy, Unit } from '../sim/World';
import { ENEMIES } from '../data/enemies';
import { TOWERS } from '../data/towers';
import { HEROES } from '../data/heroes';

const HPBAR_VS = /* glsl */ `
attribute float iFill;
attribute vec3 iCol;
varying vec2 vUv; varying float vFill; varying vec3 vCol;
void main() {
  vUv = uv; vFill = iFill; vCol = iCol;
  vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float w = length(instanceMatrix[0].xyz);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 p = c + right * position.x * w + up * position.y * 0.15;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const HPBAR_FS = /* glsl */ `
varying vec2 vUv; varying float vFill; varying vec3 vCol;
void main() {
  vec2 b = min(vUv, 1.0 - vUv);
  float border = step(min(b.x * 6.0, b.y), 0.12);
  vec3 col = vUv.x < vFill ? vCol * (0.75 + 0.35 * vUv.y) : vec3(0.12, 0.08, 0.06);
  gl_FragColor = vec4(mix(col, vec3(0.05), border), 0.95);
}`;

interface FloatText { el: HTMLDivElement; x: number; y: number; z: number; t: number; life: number }

export class GameView {
  scene = new THREE.Scene();
  field: Field;
  rig: CameraRig;
  particles: Particles;
  private grass: GrassLayer;
  private terrainUniforms: any;
  private crowds = new Map<string, VatCrowd>();
  private towerViews = new Map<number, TowerVisual>();
  private slotViews: { pad: THREE.Object3D; plot: THREE.Object3D | null; label: THREE.Sprite | null; ring: THREE.Mesh }[] = [];
  private arrows: THREE.InstancedMesh;
  private bolts: THREE.InstancedMesh;
  private boulders: THREE.InstancedMesh;
  private orbs: THREE.InstancedMesh;
  private coins: THREE.InstancedMesh;
  private hpBars: THREE.InstancedMesh;
  private hpFill: THREE.InstancedBufferAttribute;
  private hpCol: THREE.InstancedBufferAttribute;
  private prevPos = new Map<number, THREE.Vector3>();
  private lightnings: { line: THREE.Line; t: number }[] = [];
  private unitDeath = new Map<number, number>();
  rangeDisc: THREE.Mesh;
  private heroRing: THREE.Mesh;
  private moveMarker: THREE.Mesh;
  private moveMarkerT = 0;
  private cart: THREE.Group;
  sun: THREE.DirectionalLight;
  private texts: FloatText[] = [];
  private textLayer: HTMLDivElement;
  time = 0;
  private convoyGlow = 0;

  constructor(public engine: Engine, public world: World, textLayer: HTMLDivElement) {
    const level = world.level;
    const look = BIOMES[level.biome];
    this.textLayer = textLayer;
    this.field = new Field(level, look);
    const scene = this.scene;
    scene.background = new THREE.Color(look.sky);
    scene.fog = new THREE.Fog(look.fog, look.fogNear, look.fogFar);

    // ---- lights
    const hemi = new THREE.HemisphereLight(look.hemiSky, look.hemiGround, look.hemiIntensity);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(look.sun, look.sunIntensity);
    sun.position.set(-16, 30, 12);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = engine.profile.shadows;
    const sh = sun.shadow;
    sh.mapSize.set(engine.profile.shadowSize, engine.profile.shadowSize);
    const ext = Math.max(level.width, level.height) * 0.5 + 10;
    sh.camera.left = -ext; sh.camera.right = ext; sh.camera.top = ext; sh.camera.bottom = -ext;
    sh.camera.near = 1; sh.camera.far = 90;
    sh.bias = -0.0004;
    sh.normalBias = 0.03;
    sh.radius = 3;
    scene.add(sun, sun.target);
    this.sun = sun;

    // ---- static world
    const terrain = buildTerrain(this.field);
    this.terrainUniforms = (terrain.userData as any).uniforms;
    scene.add(terrain);
    const ridges = buildRidges(this.field);
    scene.add(ridges.mesh);
    const avoid = [...ridges.occupied, ...level.slots.map((s) => ({ x: s.x, z: s.z, r: 1.7 }))];
    scene.add(buildDecor(this.field, ridges.occupied));
    this.grass = buildGrass(this.field, engine.profile.grass, avoid);
    scene.add(this.grass.group);
    if (look.water !== undefined) scene.add(this.buildWater(look.water));

    // ---- slots
    world.slots.forEach((s) => {
      const pad = makePad();
      pad.position.set(s.x, 0, s.z);
      scene.add(pad);
      const ring = makeRing(1.0, 1.25, 0xfff3c0, 0.0);
      ring.position.set(s.x, 0.22, s.z);
      scene.add(ring);
      let plot: THREE.Object3D | null = null, label: THREE.Sprite | null = null;
      if (!s.open) {
        plot = makePlotDecal(3.2);
        plot.position.set(s.x, 0.07, s.z);
        scene.add(plot);
        label = makeLabelSprite(String(s.price));
        label.position.set(s.x, 0.9, s.z);
        scene.add(label);
        pad.visible = false;
      }
      this.slotViews.push({ pad, plot, label, ring });
    });

    // ---- dynamic pools
    const arrowGeo = makeArrowGeometry(0.75, 0.025);
    this.arrows = new THREE.InstancedMesh(arrowGeo, vcMaterial, 256);
    this.bolts = new THREE.InstancedMesh(makeArrowGeometry(1.5, 0.05), vcMaterial, 64);
    const boulderGeo = Assets.geometry('boulder');
    this.boulders = new THREE.InstancedMesh(boulderGeo, Assets.kitMaterial, 32);
    this.orbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 96);
    this.orbs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(96 * 3), 3);
    this.coins = new THREE.InstancedMesh(makeCoinGeometry(), coinMaterial, 400);
    for (const m of [this.arrows, this.bolts, this.boulders, this.orbs, this.coins]) {
      m.count = 0; m.frustumCulled = false; m.castShadow = m !== this.orbs; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(m);
    }
    const hpGeo = new THREE.PlaneGeometry(1, 1);
    this.hpFill = new THREE.InstancedBufferAttribute(new Float32Array(400), 1);
    this.hpCol = new THREE.InstancedBufferAttribute(new Float32Array(400 * 3), 3);
    hpGeo.setAttribute('iFill', this.hpFill);
    hpGeo.setAttribute('iCol', this.hpCol);
    this.hpBars = new THREE.InstancedMesh(hpGeo, new THREE.ShaderMaterial({ vertexShader: HPBAR_VS, fragmentShader: HPBAR_FS, transparent: true, depthTest: false }), 400);
    this.hpBars.frustumCulled = false;
    this.hpBars.renderOrder = 50;
    this.hpBars.count = 0;
    scene.add(this.hpBars);

    this.particles = new Particles(Math.round(5000 * engine.profile.particles));
    this.particles.density = engine.profile.particles;
    scene.add(this.particles.group);

    this.rangeDisc = makeRangeDisc(0x9fe0ff);
    this.rangeDisc.visible = false;
    scene.add(this.rangeDisc);
    this.heroRing = makeRing(0.5, 0.62, 0x6fc3ff, 0.75);
    scene.add(this.heroRing);
    this.moveMarker = makeRing(0.25, 0.42, 0xffffff, 0.9);
    this.moveMarker.visible = false;
    scene.add(this.moveMarker);
    this.cart = makeGoldCart();
    this.cart.visible = false;
    scene.add(this.cart);

    // ---- crowds: pre-bake models used by this level
    const keys = new Set<string>(['militia', HEROES[world.loadout.hero]?.model ?? 'hero_ranger', 'tower_archer']);
    for (const w of level.waves) for (const g of w.groups) {
      keys.add(ENEMIES[g.enemy].model);
      const sm = ENEMIES[g.enemy].summoner?.enemy;
      if (sm) keys.add(ENEMIES[sm].model);
    }
    for (const t of world.loadout.towers) {
      const td = TOWERS[t];
      for (const l of [...td.levels, ...td.branches]) if (l.soldiers) keys.add(l.soldiers.model);
    }
    for (const k of keys) this.crowd(k);

    // ---- camera
    this.rig = new CameraRig(engine.camera);
    this.rig.frame(level.width + 1, level.height + 1);
    engine.camera.far = 220;
    engine.camera.updateProjectionMatrix();
    this.particles.setViewport(engine.renderer.domElement.height, engine.camera);
  }

  private crowd(key: string): VatCrowd {
    let c = this.crowds.get(key);
    if (!c) {
      const spec = UNIT_SPECS[key];
      const proc = spec && 'procedural' in spec;
      const cap = key.startsWith('hero') ? 2 : proc ? 24 : 160;
      c = new VatCrowd(getUnitModel(key), cap, proc ? 1 : CHAR_SCALE);
      this.crowds.set(key, c);
      this.scene.add(c.mesh);
    }
    return c;
  }

  onResize() {
    this.rig.refit();
    this.particles.setViewport(this.engine.renderer.domElement.height, this.engine.camera);
  }

  private buildWater(color: number) {
    const geo = new THREE.PlaneGeometry(200, 300, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 });
    const u = { uTime: this.terrainUniforms.uTime };
    mat.onBeforeCompile = (s) => {
      s.uniforms.uTime = u.uTime;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position,1.0)).xyz;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uTime;')
        .replace('#include <map_fragment>', `float w = sin(vWP.x * 1.3 + uTime * 1.2) * sin(vWP.z * 1.1 - uTime * 0.9);
          float foam = smoothstep(0.82, 1.0, w) * 0.5;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.95, 1.0), foam);`);
    };
    const m = new THREE.Mesh(geo, mat);
    m.position.set(-100 - this.field.hw + 0.5, -0.55, 0);
    m.receiveShadow = true;
    return m;
  }

  // -----------------------------------------------------------------------------------------
  // Picking

  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  screenToGround(sx: number, sy: number): THREE.Vector2 | null {
    const ndc = new THREE.Vector2((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.engine.camera);
    const p = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.plane, p)) return null;
    return new THREE.Vector2(p.x, p.z);
  }
  worldToScreen(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
    const v = new THREE.Vector3(x, y, z).project(this.engine.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, visible: v.z < 1 };
  }

  showRange(x: number, z: number, r: number, color = 0x9fe0ff) {
    this.rangeDisc.visible = r > 0;
    this.rangeDisc.position.set(x, 0.12, z);
    this.rangeDisc.scale.setScalar(r);
    ((this.rangeDisc.material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color).set(color);
  }
  hideRange() { this.rangeDisc.visible = false; }
  markMove(x: number, z: number) {
    this.moveMarker.visible = true;
    this.moveMarker.position.set(x, 0.1, z);
    this.moveMarkerT = 0.8;
  }
  highlightSlot(idx: number) {
    this.slotViews.forEach((s, i) => { (s.ring.material as THREE.MeshBasicMaterial).opacity = i === idx ? 0.8 : 0; });
  }

  // -----------------------------------------------------------------------------------------
  // Events → effects

  handle(e: SimEvent) {
    const P = this.particles;
    switch (e.t) {
      case 'hit':
        if (e.kind === 'orb') P.magicBurst(e.x, e.y, e.z, 0x8fd0ff);
        else if (e.kind === 'firebolt') P.explosion(e.x, e.z, 0.8, true);
        else { P.hit(e.x, e.y, e.z); P.blood(e.x, e.y, e.z); }
        if (e.crit) this.text(e.x, 1.6, e.z, Math.round(e.dmg) + '!', 'ft-crit');
        break;
      case 'deflect': P.deflect(e.x, e.z); break;
      case 'explode':
        P.explosion(e.x, e.z, e.r, !!e.fire, e.big);
        this.rig.shake(e.big ? 0.5 : 0.18);
        break;
      case 'lightning': this.lightning(e.pts); break;
      case 'pulse': P.flames(e.x, e.z, e.r * 0.8); break;
      case 'death': P.death(e.x, e.z, e.large); if (e.large) this.rig.shake(0.25); break;
      case 'coin': P.coinBurst(e.x, e.z); break;
      case 'collect': this.text(e.x, 1.2, e.z, '+' + e.value, 'ft-gold'); break;
      case 'income': this.text(e.x, 3, e.z, '+' + e.value, 'ft-gold'); break;
      case 'melee': P.hit(e.x, 0.8, e.z, 0xffffff); break;
      case 'heal': P.heal(e.x, e.z); break;
      case 'warcry': P.warcry(e.x, e.z); this.rig.shake(0.2); break;
      case 'summon': P.magicBurst(e.x, 0.5, e.z, 0x9cff7a); break;
      case 'build': P.build(e.x, e.z); break;
      case 'sell': P.dust(e.x, e.z, 20); this.text(e.x, 2, e.z, '+' + e.value, 'ft-gold'); break;
      case 'freeze': P.freeze(e.x, e.z, e.r); break;
      case 'star': P.magicBurst(e.x, 6, e.z, 0xfff3a0); break;
      case 'meteor': this.meteor(e.x, e.z, e.delay); break;
      case 'ability':
        if (e.id === 'volley') this.volley(e.x, e.z, e.r);
        else if (e.id === 'caltrops') P.dust(e.x, e.z, 30, 0x8a8a8a);
        else if (e.id === 'slam' || e.id === 'whirlwind') { P.dust(e.x, e.z, 30); this.rig.shake(0.25); }
        else if (e.id === 'blessing' || e.id === 'warhorn') P.heal(e.x, e.z);
        else if (e.id === 'frostnova') P.freeze(e.x, e.z, e.r);
        else if (e.id === 'reinforce') P.build(e.x, e.z);
        break;
      case 'unitDeath': P.dust(e.x, e.z, 8); break;
      case 'phoenix': this.text(this.world.level.gate.x, 4, this.world.level.gate.z, '🔥', 'ft-big'); P.explosion(this.world.level.gate.x, this.world.level.gate.z, 4, true, true); break;
      case 'shoot': {
        const tv = this.towerViews.get(e.tower);
        if (tv) tv.kick();
        if (e.kind === 'boulder') P.dust(e.x, e.z, 4);
        break;
      }
    }
  }

  private meteor(x: number, z: number, delay: number) {
    // a falling glowing rock with a fire trail
    const start = new THREE.Vector3(x - 6, 16, z - 4);
    const end = new THREE.Vector3(x, 0.3, z);
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: 0x5a3020, emissive: 0xff5a10, emissiveIntensity: 2, flatShading: true }));
    this.scene.add(rock);
    let t = 0;
    const off = this.engine.onUpdate((dt) => {
      t += dt * this.speedK;
      const k = Math.min(1, t / delay);
      rock.position.lerpVectors(start, end, k);
      rock.rotation.x += dt * 5;
      this.particles.fireTrail(rock.position.x, rock.position.y, rock.position.z);
      this.particles.smokeTrail(rock.position.x, rock.position.y, rock.position.z);
      if (k >= 1) { this.scene.remove(rock); off(); }
    });
  }
  speedK = 1;

  private volley(x: number, z: number, r: number) {
    for (let i = 0; i < 24; i++) {
      setTimeout(() => {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
        this.particles.hit(x + Math.cos(a) * d, 0.2, z + Math.sin(a) * d);
        this.particles.dust(x + Math.cos(a) * d, z + Math.sin(a) * d, 2);
      }, 250 + i * 70);
    }
  }

  private lightning(pts: number[]) {
    const verts: number[] = [];
    for (let i = 0; i < pts.length / 3 - 1; i++) {
      const ax = pts[i * 3], ay = pts[i * 3 + 1], az = pts[i * 3 + 2];
      const bx = pts[i * 3 + 3], by = pts[i * 3 + 4], bz = pts[i * 3 + 5];
      const n = 7;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const j = k === 0 || k === n ? 0 : 0.35;
        verts.push(ax + (bx - ax) * t + (Math.random() - 0.5) * j, ay + (by - ay) * t + (Math.random() - 0.5) * j, az + (bz - az) * t + (Math.random() - 0.5) * j);
      }
      this.particles.magicBurst(bx, by, bz, 0xb8a0ff);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xd8ccff, transparent: true, toneMapped: false }));
    this.scene.add(line);
    this.lightnings.push({ line, t: 0.22 });
  }

  text(x: number, y: number, z: number, s: string, cls: string) {
    if (this.texts.length > 40) { const old = this.texts.shift()!; old.el.remove(); }
    const el = document.createElement('div');
    el.className = 'ft ' + cls;
    el.textContent = s;
    this.textLayer.appendChild(el);
    this.texts.push({ el, x, y, z, t: 0, life: cls === 'ft-big' ? 1.6 : 0.9 });
  }

  // -----------------------------------------------------------------------------------------
  // Per-frame sync

  private _m = new THREE.Matrix4();
  private _q = new THREE.Quaternion();
  private _v = new THREE.Vector3();
  private _s = new THREE.Vector3();
  private _dir = new THREE.Vector3();
  private _fwd = new THREE.Vector3(0, 0, 1);

  update(dt: number, simDt: number) {
    const w = this.world;
    this.time += dt;
    this.terrainUniforms.uTime.value = this.time;
    this.grass.uniforms.uTime.value = this.time;
    this.rig.update(dt);
    const fog = this.scene.fog as THREE.Fog;
    fog.near = this.rig.dist * 1.25;
    fog.far = this.rig.dist * 3.2;
    this.particles.update(simDt);
    const look = this.field.look;
    if (look.particles) this.particles.ambient(look.particles, this.rig.target.x, this.rig.target.y, w.level.width + 8, w.level.height + 8, simDt);

    for (const c of this.crowds.values()) c.begin();

    // ---- enemies
    let hb = 0;
    const pushBar = (x: number, y: number, z: number, width: number, fill: number, r: number, g: number, b: number) => {
      if (hb >= 400) return;
      this._m.compose(this._v.set(x, y, z), this._q.identity(), this._s.set(width, 1, 1));
      this.hpBars.setMatrixAt(hb, this._m);
      this.hpFill.setX(hb, fill);
      this.hpCol.setXYZ(hb, r, g, b);
      hb++;
    };
    for (const e of w.enemies) this.drawEnemy(e, pushBar);

    // ---- units
    for (const u of w.units) this.drawUnit(u, pushBar);
    const h = w.hero;
    if (h) {
      this.drawUnit(h, pushBar);
      this.heroRing.visible = h.state !== 'dead';
      this.heroRing.position.set(h.x, 0.08, h.z);
    }
    if (this.moveMarkerT > 0) {
      this.moveMarkerT -= dt;
      this.moveMarker.scale.setScalar(1 + (0.8 - this.moveMarkerT));
      (this.moveMarker.material as THREE.MeshBasicMaterial).opacity = Math.max(0, this.moveMarkerT);
      if (this.moveMarkerT <= 0) this.moveMarker.visible = false;
    }

    // ---- towers
    const seen = new Set<number>();
    for (const t of w.towers) {
      seen.add(t.id);
      let tv = this.towerViews.get(t.id);
      if (!tv) {
        tv = new TowerVisual(t, w.loadout.goldSkin);
        this.towerViews.set(t.id, tv);
        this.scene.add(tv.group);
      }
      tv.rebuild();
      tv.update(simDt, this.time);
      for (const a of tv.archers) {
        this.crowd('tower_archer').push(t.x + a.x, a.y, t.z + a.z, t.aim, 0.9, t.shotT > 0 ? 'shoot' : 'idle', t.shotT > 0 ? 0.35 - t.shotT : this.time + t.id);
      }
      if (tv.fireY > 0 && Math.random() < simDt * 30) this.particles.torch(t.x, tv.fireY, t.z, t.def.look === 'brazier' ? 1.4 : 0.8);
      if (tv.crystal && Math.random() < simDt * 8) this.particles.magicTrail(t.x + (Math.random() - 0.5) * 0.6, tv.crystal.position.y, t.z + (Math.random() - 0.5) * 0.6, t.level === 3 && t.branch === 0 ? 0xc8a0ff : 0x8fd8ff);
    }
    for (const [id, tv] of this.towerViews) {
      if (!seen.has(id)) { this.scene.remove(tv.group); this.towerViews.delete(id); }
    }
    w.slots.forEach((s, i) => {
      const v = this.slotViews[i];
      v.pad.visible = s.open;
      if (v.plot) v.plot.visible = !s.open;
      if (v.label) v.label.visible = !s.open;
    });

    // ---- projectiles
    let na = 0, nb = 0, nr = 0, no = 0;
    const alive = new Set<number>();
    for (const p of w.projectiles) {
      alive.add(p.id);
      let prev = this.prevPos.get(p.id);
      if (!prev) { prev = new THREE.Vector3(p.sx, p.sy, p.sz); this.prevPos.set(p.id, prev); }
      this._dir.set(p.x - prev.x, p.y - prev.y, p.z - prev.z);
      if (this._dir.lengthSq() > 1e-6) this._q.setFromUnitVectors(this._fwd, this._dir.normalize());
      else if (p.kind === 'bolt') this._q.setFromUnitVectors(this._fwd, this._dir.set(p.vx, 0, p.vz).normalize());
      prev.set(p.x, p.y, p.z);
      if (p.kind === 'arrow' && na < 256) {
        this._m.compose(this._v.set(p.x, p.y, p.z), this._q, this._s.set(1, 1, 1));
        this.arrows.setMatrixAt(na++, this._m);
      } else if (p.kind === 'bolt' && nb < 64) {
        this._m.compose(this._v.set(p.x, p.y, p.z), this._q, this._s.set(1, 1, 1));
        this.bolts.setMatrixAt(nb++, this._m);
      } else if (p.kind === 'boulder' && nr < 32) {
        this._q.setFromEuler(new THREE.Euler(this.time * 6 + p.id, this.time * 4, 0));
        const fire = p.dmgType === 'fire';
        this._m.compose(this._v.set(p.x, p.y, p.z), this._q, this._s.setScalar(KIT_SCALE * 1.8));
        this.boulders.setMatrixAt(nr++, this._m);
        if (fire) this.particles.fireTrail(p.x, p.y, p.z); else if (Math.random() < 0.5) this.particles.smokeTrail(p.x, p.y, p.z);
      } else if ((p.kind === 'orb' || p.kind === 'firebolt') && no < 96) {
        const fire = p.kind === 'firebolt';
        this._m.compose(this._v.set(p.x, p.y, p.z), this._q.identity(), this._s.setScalar(fire ? 1.3 : 1));
        this.orbs.setMatrixAt(no, this._m);
        this.orbs.setColorAt(no, new THREE.Color(fire ? 0xffa040 : p.fromEnemy ? 0x9cff7a : 0x9fd8ff).multiplyScalar(2.2));
        no++;
        if (fire) this.particles.fireTrail(p.x, p.y, p.z); else this.particles.magicTrail(p.x, p.y, p.z, p.fromEnemy ? 0x9cff7a : 0x8fd0ff);
      }
    }
    for (const id of this.prevPos.keys()) if (!alive.has(id)) this.prevPos.delete(id);
    this.arrows.count = na; this.bolts.count = nb; this.boulders.count = nr; this.orbs.count = no;
    for (const m of [this.arrows, this.bolts, this.boulders, this.orbs]) m.instanceMatrix.needsUpdate = true;
    if (this.orbs.instanceColor) this.orbs.instanceColor.needsUpdate = true;

    // ---- coins
    let nc = 0;
    for (const c of w.coins) {
      if (nc >= 400) break;
      this._q.setFromEuler(new THREE.Euler(0, this.time * 4 + c.id, 0));
      const bob = c.magnet ? 0 : Math.sin(this.time * 5 + c.id) * 0.05 + 0.15;
      this._m.compose(this._v.set(c.x, c.y + bob, c.z), this._q, this._s.setScalar(1.2));
      this.coins.setMatrixAt(nc++, this._m);
      if (Math.random() < simDt * 1.5) this.particles.emit(c.x, c.y + 0.3, c.z, { count: 1, velRand: 0.2, up: 0.6, life: [0.3, 0.5], size: [0.35, 0.05], color: 0xffe680, alpha: [1, 0], sprite: 3, additive: true });
    }
    this.coins.count = nc;
    this.coins.instanceMatrix.needsUpdate = true;

    // ---- convoy cart
    if (w.convoy) {
      const c = w.convoy;
      this.cart.visible = true;
      this.cart.position.set(c.x, 0, c.z);
      this.cart.rotation.y = Math.atan2(c.vx, c.vz);
      this.convoyGlow += dt;
      if (!c.claimed && Math.random() < dt * 12) this.particles.emit(c.x, 1.6, c.z, { count: 1, spread: 0.6, velRand: 0.4, up: 1.2, life: [0.5, 0.9], size: [0.6, 0.05], color: 0xffe066, alpha: [1, 0], sprite: 3, additive: true });
      this.crowd('militia').push(c.x + c.vx * 1.2, 0, c.z, Math.atan2(c.vx, c.vz), 1, 'walk', this.time);
    } else this.cart.visible = false;

    for (const c of this.crowds.values()) c.end();
    this.hpBars.count = hb;
    this.hpBars.instanceMatrix.needsUpdate = true;
    this.hpFill.needsUpdate = true;
    this.hpCol.needsUpdate = true;

    // lightning fade
    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      const l = this.lightnings[i];
      l.t -= dt;
      (l.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, l.t / 0.22);
      if (l.t <= 0) { this.scene.remove(l.line); l.line.geometry.dispose(); this.lightnings.splice(i, 1); }
    }
    (this.rangeDisc.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time;

    // floating texts
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const ft = this.texts[i];
      ft.t += dt;
      if (ft.t >= ft.life) { ft.el.remove(); this.texts.splice(i, 1); continue; }
      const s = this.worldToScreen(ft.x, ft.y + ft.t * 1.2, ft.z);
      ft.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%) scale(${1 + Math.min(0.3, ft.t * 2) - ft.t * 0.2})`;
      ft.el.style.opacity = String(1 - Math.max(0, (ft.t - ft.life * 0.6) / (ft.life * 0.4)));
    }
  }

  private drawEnemy(e: Enemy, bar: (x: number, y: number, z: number, w: number, f: number, r: number, g: number, b: number) => void) {
    const def = e.def;
    const c = this.crowd(def.model);
    let clip = 'walk', t = e.animT, y = 0;
    let face = Math.atan2(e.dx, e.dz);
    if (e.state === 'dead') {
      clip = 'death'; t = e.deadT;
      if (e.deadT > 1.4) y = -(e.deadT - 1.4) * 0.9;
    } else if (e.stunT > 0) {
      clip = e.frozen ? 'walk' : 'idle';
      t = e.frozen ? e.animT : this.time;
    } else if (e.state === 'fight' || e.state === 'shoot') {
      clip = 'attack';
      const tgt = e.state === 'fight' ? this.world.unitById(e.blocker) : this.world.unitById(e.shootTarget);
      if (tgt) face = Math.atan2(tgt.x - e.x, tgt.z - e.z);
    }
    let r = 1, g = 1, b = 1;
    if (e.frozen) { r = 0.55; g = 0.85; b = 1.8; }
    else if (e.burnT > 0) { r = 1.35; g = 0.75; b = 0.55; }
    else if (e.slowT > 0) { r = 0.8; g = 0.92; b = 1.3; }
    if (e.buffT > 0) { r *= 1.3; g *= 0.85; b *= 0.85; }
    if (e.hitFlash > 0) { r = g = b = 2.4; }
    c.push(e.x, y, e.z, face, def.scale, clip, t, r, g, b);
    if (e.state !== 'dead' && (e.hp < e.maxHp || def.boss)) {
      const height = (c.model.height * (c.baseScale) * def.scale) + 0.3;
      bar(e.x, height, e.z, def.boss ? 2.4 : def.large ? 1.4 : 0.8, e.hp / e.maxHp, 0.86, 0.15, 0.12);
    }
    if (e.burnT > 0 && Math.random() < 0.3) this.particles.torch(e.x, 0.8 * def.scale, e.z, 0.6);
  }

  private drawUnit(u: Unit, bar: (x: number, y: number, z: number, w: number, f: number, r: number, g: number, b: number) => void) {
    const c = this.crowd(u.model);
    let clip = 'idle', t = u.animT;
    if (u.state === 'dead') {
      if (!this.unitDeath.has(u.id)) this.unitDeath.set(u.id, this.time);
      const dt = this.time - this.unitDeath.get(u.id)!;
      if (dt > 2.5) return;
      clip = 'death'; t = dt;
    } else {
      this.unitDeath.delete(u.id);
      if (u.state === 'move') clip = 'walk';
      else if (u.state === 'fight') {
        if (u.kind === 'hero') {
          const hd = HEROES[(u as any).def.id];
          clip = hd.attackClip in c.model.clips ? hd.attackClip : 'attack';
          t = u.attackAnim > 0 ? 0.45 - u.attackAnim : 0;
        } else clip = 'attack';
      }
    }
    const fl = u.hitFlash > 0 ? 2 : 1;
    c.push(u.x, 0, u.z, u.face, u.kind === 'hero' ? 1.15 : 1, clip, t, fl, fl, fl);
    if (u.state !== 'dead' && (u.hp < u.maxHp || u.kind === 'hero')) {
      bar(u.x, c.model.height * c.baseScale * (u.kind === 'hero' ? 1.15 : 1) + 0.3, u.z, u.kind === 'hero' ? 1.1 : 0.7, u.hp / u.maxHp, 0.25, 0.8, 0.3);
    }
  }

  dispose() {
    for (const t of this.texts) t.el.remove();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !Assets.kit.has(m.name)) m.geometry.dispose?.();
    });
  }
}
