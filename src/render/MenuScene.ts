import * as THREE from 'three';
import type { Engine } from './Engine';
import { Field } from './Field';
import { BIOMES } from './biomes';
import { buildTerrain } from './Terrain';
import { buildGrass } from './Grass';
import { KitBatch, KIT_SCALE } from './Decor';
import { Particles } from './Particles';
import { VatCrowd } from './vat';
import { getUnitModel, CHAR_SCALE } from './units';
import { Path } from '../sim/path';
import type { LevelDef } from '../sim/types';
import { Rng } from '../sim/rng';

/** Animated village diorama behind the main menu. */
export class MenuScene {
  scene = new THREE.Scene();
  private uniforms: any;
  private grassU: { uTime: { value: number } };
  private walkers: { crowd: VatCrowd; path: Path; d: number; speed: number; lane: number; dir: number }[] = [];
  private crowds: VatCrowd[] = [];
  private particles: Particles;
  private time = 0;
  private chimneys: THREE.Vector3[] = [];

  constructor(private engine: Engine) {
    const R = 9.5;
    const ring: { x: number; z: number }[] = [];
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; ring.push({ x: Math.cos(a) * R, z: Math.sin(a) * R * 0.92 }); }
    ring.push(ring[1]);
    const road = [{ x: 2, z: 30 }, { x: 1, z: 16 }, { x: 0, z: R * 0.92 }];
    const pier = [{ x: -10, z: -R }, { x: -13, z: -15 }, { x: -14, z: -19 }];
    const level = {
      id: -1, biome: 'coast', seed: 3, width: 34, height: 30, paths: [ring, road, pier], slots: [], gate: { x: 0, z: -40, angle: 0 }, waves: [],
      startGold: 0, lives: 0, hpMul: 1, bountyMul: 1, seaTop: true,
    } as unknown as LevelDef;
    const look = { ...BIOMES.coast, border: 'coast' as const, treeTint: 0xa0bb8a, grassA: 0x4f8f2a, grassB: 0x7db23a };
    const field = new Field(level, look);
    const scene = this.scene;
    scene.background = new THREE.Color(0xbcd6e2);
    scene.fog = new THREE.Fog(0xcfe4ea, 45, 110);
    scene.add(new THREE.HemisphereLight(0xdcefff, 0x6b7a3a, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0d0, 3.3);
    sun.position.set(-14, 26, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(engine.profile.shadowSize, engine.profile.shadowSize);
    const e = 26;
    Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 80 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    scene.add(sun);
    const terrain = buildTerrain(field);
    this.uniforms = (terrain.userData as any).uniforms;
    scene.add(terrain);

    // sea
    const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 80), new THREE.MeshStandardMaterial({ color: 0x2f9fb8, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.6, -15 - 40);
    scene.add(water);

    const batch = new KitBatch();
    const rng = new Rng(9);
    const occupied: { x: number; z: number; r: number }[] = [];
    const place = (key: string, x: number, z: number, rot: number, s = KIT_SCALE * 1.15, r = 2) => {
      batch.add(key, x, field.height(x, z), z, rot, s);
      occupied.push({ x, z, r });
    };
    // center: blue tower like a town hall
    place('tower_b', 0, 0, 0.3, KIT_SCALE * 1.5, 2.5);
    place('flag_blue', 1.4, 1.2, 0.4, KIT_SCALE * 2.5, 0.5);
    place('well', 2.8, 3.2, 0, KIT_SCALE * 1.3, 0.8);
    const houses = ['home_a', 'tavern', 'home_b', 'blacksmith', 'home_a', 'market', 'home_b', 'church', 'home_a', 'home_b'];
    houses.forEach((h, i) => {
      const a = (i / houses.length) * Math.PI * 2 + 0.3;
      const rr = i % 2 ? R + 3.6 : R - 4.2;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.92;
      if (z < -R - 1 && Math.abs(x) < 6) return;
      place(h, x, z, -a + Math.PI / 2, KIT_SCALE * rng.range(1.15, 1.35), 2.2);
      if (h.startsWith('home') || h === 'tavern' || h === 'blacksmith') this.chimneys.push(new THREE.Vector3(x + 0.3, 2.6, z));
    });
    place('windmill', -13, -6, 0.6, KIT_SCALE * 1.5, 2.5);
    place('lumbermill', 15, -4, -0.4, KIT_SCALE * 1.4, 2.5);
    place('tower_a', 14, 8, 0, KIT_SCALE * 1.2, 1.5);
    place('tower_a', -12, 10, 0, KIT_SCALE * 1.2, 1.5);
    place('bridge', -13.5, -17, 0.1, KIT_SCALE * 1.6, 2);
    place('grain', -18, 3, 0.2, KIT_SCALE * 1.3, 3);
    place('grain', -19, 8, 0.1, KIT_SCALE * 1.3, 3);
    // palisade arc at the front
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * 0.18 + (i / 17) * Math.PI * 0.64;
      const x = Math.cos(a) * (R + 9), z = Math.sin(a) * (R + 9);
      if (Math.abs(x) < 2.6) continue;
      batch.add('fence_wood', x, field.height(x, z), z, -a, KIT_SCALE * 1.8);
    }
    for (let i = 0; i < 40; i++) {
      const x = rng.range(-14, 14), z = rng.range(-12, 14);
      if (occupied.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < o.r * o.r) || field.pathDist(x, z) < 2) continue;
      batch.add(rng.pick(['barrel', 'crate_a', 'sack', 'lumber', 'crate_b']), x, field.height(x, z), z, rng.range(0, 6), KIT_SCALE * 1.5);
    }
    // forest ring
    for (let i = 0, t = 0; i < 260 && t < 4000; t++) {
      const x = rng.range(-50, 50), z = rng.range(-14, 50);
      const d = Math.hypot(x, z * 1.1);
      if (d < 20 || field.pathDist(x, z) < 2.5) continue;
      batch.add(rng.pick(look.trees), x, field.height(x, z) - 0.1, z, rng.range(0, 6), KIT_SCALE * rng.range(1.3, 2), new THREE.Color(look.treeTint));
      i++;
    }
    for (let i = 0; i < 26; i++) {
      const x = rng.range(-20, 20), z = rng.range(-14, 18);
      if (Math.hypot(x, z) < R + 5 || field.pathDist(x, z) < 2 || occupied.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 1) ** 2)) continue;
      batch.add(rng.pick(['tree_a', 'tree_b']), x, field.height(x, z), z, rng.range(0, 6), KIT_SCALE * rng.range(1.3, 1.7), new THREE.Color(look.treeTint));
      occupied.push({ x, z, r: 1 });
    }
    scene.add(batch.build());
    const grass = buildGrass(field, engine.profile.grass * 0.8, occupied);
    this.grassU = grass.uniforms;
    scene.add(grass.group);
    this.particles = new Particles(800);
    scene.add(this.particles.group);

    // villagers & guards walking the ring road
    const ringPath = new Path(ring);
    const kinds = ['villager', 'footman_blue', 'villager', 'militia'];
    for (const k of kinds) {
      const c = new VatCrowd(getUnitModel(k), 6, CHAR_SCALE);
      scene.add(c.mesh);
      this.crowds.push(c);
    }
    for (let i = 0; i < 9; i++) {
      this.walkers.push({ crowd: this.crowds[i % this.crowds.length], path: ringPath, d: rng.range(0, ringPath.length), speed: rng.range(0.9, 1.4), lane: rng.range(-0.7, 0.7), dir: rng.chance(0.5) ? 1 : -1 });
    }
  }

  activate() {
    this.engine.setScene(this.scene);
    this.engine.camera.fov = 34;
    this.engine.camera.far = 200;
    this.engine.camera.updateProjectionMatrix();
    this.particles.setViewport(this.engine.renderer.domElement.height, this.engine.camera);
  }

  update(dt: number) {
    this.time += dt;
    this.uniforms.uTime.value = this.time;
    this.grassU.uTime.value = this.time;
    const cam = this.engine.camera;
    const portrait = innerHeight > innerWidth;
    const a = Math.sin(this.time * 0.05) * 0.35;
    const dist = portrait ? 64 : 58;
    cam.position.set(Math.sin(a) * dist * 0.55, dist * 0.82, Math.cos(a) * dist * 0.62 + 4);
    cam.lookAt(0, 0, portrait ? 2 : 0);
    for (const c of this.crowds) c.begin();
    const tmp = { x: 0, z: 0, dx: 0, dz: 0 };
    for (const w of this.walkers) {
      w.d = (w.d + w.speed * w.dir * dt + w.path.length) % w.path.length;
      w.path.sample(w.d, tmp);
      const x = tmp.x - tmp.dz * w.lane, z = tmp.z + tmp.dx * w.lane;
      w.crowd.push(x, 0, z, Math.atan2(tmp.dx * w.dir, tmp.dz * w.dir), 1, 'walk', this.time * w.speed);
    }
    for (const c of this.crowds) c.end();
    for (const ch of this.chimneys) if (Math.random() < dt * 3) this.particles.emit(ch.x, ch.y, ch.z, { count: 1, velRand: 0.15, vel: [0.3, 0.8, 0], life: [2, 3.5], size: [0.5, 2.2], color: 0xe8e4dc, alpha: [0.5, 0], sprite: 1 });
    this.particles.ambient('pollen', 0, 0, 40, 30, dt);
    this.particles.update(dt);
  }
}
