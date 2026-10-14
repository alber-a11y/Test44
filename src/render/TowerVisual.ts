import * as THREE from 'three';
import { Assets } from './Assets';
import { makeBallista, makeBrazier, makeCrystal, makeDragon } from './props';
import type { Tower } from '../sim/World';

/** Visual representation of one tower; rebuilt whenever its level/branch changes. */
export class TowerVisual {
  group = new THREE.Group();
  key = '';
  /** part rotated towards the target */
  turret: THREE.Object3D | null = null;
  crystal: THREE.Mesh | null = null;
  dragon: THREE.Group | null = null;
  body: THREE.Object3D | null = null;
  /** local positions where little archers stand */
  archers: THREE.Vector3[] = [];
  topY = 3;
  fireY = 0;
  private bounce = 0;

  constructor(public tower: Tower, goldSkin: boolean) {
    this.group.position.set(tower.x, 0, tower.z);
    this.goldSkin = goldSkin;
    this.rebuild();
  }
  goldSkin: boolean;

  rebuild() {
    const t = this.tower;
    const key = `${t.def.id}-${t.level}-${t.branch}`;
    if (key === this.key) return;
    this.key = key;
    this.group.clear();
    this.turret = this.crystal = this.dragon = this.body = null;
    this.archers = [];
    this.fireY = 0;
    const lvl = t.level;
    const s = [1.8, 2.05, 2.3, 2.5][lvl];
    const add = (key: string, scale: number, y = 0) => {
      const m = Assets.model(key);
      m.scale.setScalar(scale);
      m.position.y = y;
      if (this.goldSkin) tintGold(m);
      this.group.add(m);
      this.body = m;
      return m;
    };
    const flag = (y: number, x = 0.55, z = -0.4, sc = 3) => {
      const f = Assets.model('flag_blue');
      f.scale.setScalar(sc);
      f.position.set(x, y, z);
      this.group.add(f);
    };
    switch (t.def.look) {
      case 'archer': {
        const base = add('tower_base', s);
        const h = 1.5 * s;
        this.topY = h;
        this.archers.push(new THREE.Vector3(0, h - 0.05, 0));
        if (lvl >= 1) flag(h - 0.1, 0.6, -0.45, 2.6 + lvl * 0.3);
        if (lvl >= 2) this.archers.push(new THREE.Vector3(0.45, h - 0.05, -0.35));
        if (lvl === 3 && t.branch === 1) this.archers.push(new THREE.Vector3(-0.45, h - 0.05, -0.35));
        if (lvl === 3 && t.branch === 0) { const tb = Assets.model('target'); tb.scale.setScalar(3); tb.position.set(-0.9, 0, 0.9); this.group.add(tb); }
        void base;
        break;
      }
      case 'ballista': {
        add('tower_base', s);
        const h = 1.5 * s;
        this.topY = h + 0.6;
        const b = makeBallista(0.85 + lvl * 0.12, lvl === 3 && t.branch === 1);
        b.position.y = h - 0.05;
        this.group.add(b);
        this.turret = b;
        if (lvl >= 2) flag(h - 0.1, 0.55, -0.55, 2.4);
        break;
      }
      case 'catapult': {
        add('tower_catapult', s * 1.05);
        this.topY = 2 * s;
        if (lvl === 3 && t.branch === 0) this.fireY = 1.96 * s * 1.05 - 0.2;
        if (lvl === 3 && t.branch === 1) { const st = Assets.model('stone'); st.scale.setScalar(2.5); st.position.set(1, 0, 0.8); this.group.add(st); }
        break;
      }
      case 'mage': {
        add('tower_b', s * 0.95);
        const h = 2.49 * s * 0.95;
        this.topY = h + 0.8;
        const color = lvl === 3 ? (t.branch === 0 ? 0xb07aff : 0x7ae8ff) : 0x5ab4ff;
        this.crystal = makeCrystal(color);
        this.crystal.position.y = h + 0.7;
        this.crystal.scale.setScalar(0.7 + lvl * 0.12);
        this.group.add(this.crystal);
        break;
      }
      case 'barracks': {
        add('barracks', s * 1.05);
        this.topY = 1.64 * s;
        flag(1.64 * s - 0.2, 0.8, -0.6, 3);
        if (lvl === 3) { const wr = Assets.model('weaponrack'); wr.scale.setScalar(3); wr.position.set(-1.1, 0, 0.9); this.group.add(wr); }
        break;
      }
      case 'brazier': {
        const b = makeBrazier();
        b.scale.setScalar(0.85 + lvl * 0.1);
        this.group.add(b);
        this.body = b;
        this.topY = 2.2 * (0.85 + lvl * 0.1);
        this.fireY = this.topY;
        break;
      }
      case 'bell': {
        add('church', s * 1.05);
        this.topY = 1.65 * s;
        if (lvl === 3) flag(1.65 * s, 0.7, -0.5, 3);
        break;
      }
      case 'dragon': {
        add('tower_base', 2);
        const d = makeDragon(this.goldSkin);
        d.scale.setScalar(0.9 + lvl * 0.15);
        d.position.y = 3;
        this.group.add(d);
        this.dragon = d;
        this.turret = d;
        this.topY = 4.4;
        break;
      }
    }
    this.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  kick() { this.bounce = 1; }

  update(dt: number, time: number) {
    const t = this.tower;
    if (this.turret) {
      const cur = this.turret.rotation.y;
      let diff = t.aim - cur;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.turret.rotation.y = cur + diff * Math.min(1, dt * 10);
    }
    if (this.crystal) {
      this.crystal.rotation.y += dt * 1.4;
      this.crystal.position.y = this.topY - 0.1 + Math.sin(time * 2) * 0.12;
    }
    if (this.dragon) {
      const wl = this.dragon.getObjectByName('wingL'), wr = this.dragon.getObjectByName('wingR');
      const flap = Math.sin(time * (t.shotT > 0 ? 9 : 2.2)) * (t.shotT > 0 ? 0.6 : 0.25);
      if (wl) wl.rotation.z = 0.3 + flap;
      if (wr) wr.rotation.z = -0.3 - flap;
      const head = this.dragon.getObjectByName('head');
      if (head) head.rotation.x = t.shotT > 0 ? -0.35 : Math.sin(time * 1.3) * 0.08;
    }
    if (this.bounce > 0 && this.body) {
      this.bounce = Math.max(0, this.bounce - dt * 5);
      const k = 1 + Math.sin(this.bounce * Math.PI) * 0.035;
      this.body.scale.y = this.body.scale.x * k;
    }
  }
}

const goldMat = new Map<THREE.Material, THREE.Material>();
function tintGold(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    let gm = goldMat.get(src);
    if (!gm) {
      const g = src.clone();
      g.color = new THREE.Color(1.25, 1.05, 0.55);
      g.metalness = 0.35;
      g.roughness = 0.45;
      gm = g;
      goldMat.set(src, gm);
    }
    m.material = gm;
  });
}
