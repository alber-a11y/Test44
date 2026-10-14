import * as THREE from 'three';
import { Assets } from '../render/Assets';
import { bakeCharacter, VatCrowd } from '../render/vat';

export async function runViewer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x88aacc);
  const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 500);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445533, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
  sun.shadow.camera.right = sun.shadow.camera.top = 30;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x6a9a40 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  await Assets.load();
  const mode = new URLSearchParams(location.search).get('viewer');
  if (mode === 'kit') {
    let i = 0;
    const keys = [...Assets.kit.keys()];
    const cols = Math.ceil(Math.sqrt(keys.length));
    for (const k of keys) {
      const m = Assets.model(k);
      m.position.set((i % cols) * 3 - cols * 1.5, 0, Math.floor(i / cols) * 3 - cols * 1.5);
      scene.add(m);
      i++;
    }
    cam.position.set(0, 35, 35);
    cam.lookAt(0, 0, 0);
    (window as any).kitKeys = keys;
    const out: string[] = [];
    for (const k of keys) { const b = new THREE.Box3().setFromObject(Assets.kit.get(k)!); const sz = b.getSize(new THREE.Vector3()); out.push(`${k}:${sz.x.toFixed(2)}x${sz.y.toFixed(2)}x${sz.z.toFixed(2)} y0=${b.min.y.toFixed(2)}`); }
    console.log(out.join(' | '));
  } else {
    const specs = [
      { key: 'k', char: 'knight', keep: ['1H_Sword', 'Round_Shield', 'Knight_Helmet', 'Knight_Cape'] },
      { key: 'b', char: 'barbarian', keep: ['2H_Axe', 'Barbarian_Hat', 'Barbarian_Cape'] },
      { key: 'm', char: 'mage', keep: ['2H_Staff', 'Mage_Hat', 'Mage_Cape'] },
      { key: 'r', char: 'rogue', keep: ['2H_Crossbow', 'Rogue_Cape'] },
      { key: 's', char: 'skel_warrior', keep: ['Skeleton_Warrior_Helmet'] },
      { key: 's2', char: 'skel_minion', keep: [] },
    ] as const;
    let x = -6;
    const crowds: VatCrowd[] = [];
    for (const s of specs) {
      const model = bakeCharacter({ ...s, keep: [...s.keep], clips: { walk: { name: s.char.startsWith('skel') ? 'Walking_D_Skeletons' : 'Walking_A', frames: 16, loop: true }, attack: { name: '1H_Melee_Attack_Chop', frames: 10, loop: true } } });
      const c = new VatCrowd(model, 4);
      scene.add(c.mesh);
      (c as any).x = x;
      x += 2.4;
      crowds.push(c);
      console.log(s.key, 'h', model.height.toFixed(2), 'r', model.radius.toFixed(2), 'verts', model.geometry.getAttribute('position').count);
    }
    cam.position.set(0, 6, 12);
    cam.lookAt(0, 1, 0);
    const t0 = performance.now();
    renderer.setAnimationLoop(() => {
      const t = (performance.now() - t0) / 1000;
      for (const c of crowds) {
        c.begin();
        c.push((c as any).x, 0, 0, 0, 1, 'walk', t);
        c.push((c as any).x, 0, 3, Math.PI, 1, 'attack', t);
        c.end();
      }
      renderer.render(scene, cam);
    });
    return;
  }
  renderer.setAnimationLoop(() => renderer.render(scene, cam));
}
