import * as THREE from 'three';
import type { Engine } from './Engine';
import { TowerVisual } from './TowerVisual';
import { TOWERS } from '../data/towers';
import { HEROES } from '../data/heroes';
import { ENEMIES } from '../data/enemies';
import { bakePortraitModel, disposeVatModel, CHAR_SCALE, UNIT_SPECS } from './units';
import { VatCrowd } from './vat';
import type { Tower } from '../sim/World';

/** Data-URL portraits rendered from the real game models (used by the UI). */
export const thumbs: Record<string, string> = {};

export function renderThumbnails(engine: Engine) {
  const size = 256;
  const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  const scene = new THREE.Scene();
  scene.environment = engine.envMap;
  scene.environmentIntensity = 0.5;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556644, 1.6));
  const sun = new THREE.DirectionalLight(0xfff3e0, 3.2);
  sun.position.set(-3, 6, 5);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const r = engine.renderer;
  const prevTM = r.toneMapping;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const pixels = new Uint8Array(size * size * 4);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);

  const shoot = (key: string, obj: THREE.Object3D, fit: { h: number; y: number; dist: number; yaw?: number }) => {
    scene.add(obj);
    obj.rotation.y = fit.yaw ?? -0.5;
    cam.position.set(0, fit.y + fit.dist * 0.45, fit.dist);
    cam.lookAt(0, fit.y, 0);
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, cam);
    r.readRenderTargetPixels(rt, 0, 0, size, size, pixels);
    r.setRenderTarget(null);
    for (let y = 0; y < size; y++) {
      const src = (size - 1 - y) * size * 4;
      img.data.set(pixels.subarray(src, src + size * 4), y * size * 4);
    }
    ctx.putImageData(img, 0, 0);
    thumbs[key] = canvas.toDataURL('image/png');
    scene.remove(obj);
  };

  // towers (level 1 look + level 3 look)
  for (const id of Object.keys(TOWERS)) {
    for (const lvl of [0, 2]) {
      const fake = { id: 0, def: TOWERS[id], level: lvl, branch: 0, x: 0, z: 0, aim: 0.6, shotT: 0 } as unknown as Tower;
      const tv = new TowerVisual(fake, false);
      tv.group.position.set(0, 0, 0);
      tv.update(0, 1);
      const box = new THREE.Box3().setFromObject(tv.group);
      const h = box.max.y;
      shoot(`tower_${id}${lvl ? '_3' : ''}`, tv.group, { h, y: h * 0.48, dist: h * 2.25 + 2 });
    }
  }
  // characters
  const unitShot = (key: string, model: string, scale: number, clip = 'idle') => {
    const vm = bakePortraitModel(model);
    const proc = 'procedural' in (UNIT_SPECS[model] as object);
    const c = new VatCrowd(vm, 1, proc ? 1 : CHAR_SCALE);
    c.begin(); c.push(0, 0, 0, 0, scale, vm.clips[clip] ? clip : 'walk', 0.3); c.end();
    const h = vm.height * (proc ? 1 : CHAR_SCALE) * scale;
    shoot(key, c.mesh, { h, y: h * 0.52, dist: h * 2.4 + (proc ? 2 : 0.6), yaw: proc ? -0.9 : -0.35 });
    c.mesh.geometry.dispose();
    disposeVatModel(vm);
  };
  for (const id of Object.keys(HEROES)) unitShot('hero_' + id, HEROES[id].model, 1);
  for (const id of Object.keys(ENEMIES)) unitShot('enemy_' + id, ENEMIES[id].model, 1);
  r.toneMapping = prevTM;
  rt.dispose();
}
