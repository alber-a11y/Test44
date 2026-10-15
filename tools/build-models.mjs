// Builds compact runtime GLBs from the CC0 KayKit source packs (see tools/fetch-assets.sh).
//  - public/assets/models/kit.glb   : environment + buildings, one root node per model key
//  - public/assets/models/<char>.glb: characters with only the animations the game uses
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, mergeDocuments, unpartition, resample, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.env.ASSETS_SRC || '.assets-src';
const OUT = 'public/assets/models';
fs.mkdirSync(OUT, { recursive: true });

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const HEX = `${SRC}/hex/addons/kaykit_medieval_hexagon_pack/Assets/gltf`;

const KIT = {
  // towers & buildings (blue = player)
  tower_a: 'buildings/blue/building_tower_A_blue',
  tower_b: 'buildings/blue/building_tower_B_blue',
  tower_base: 'buildings/blue/building_tower_base_blue',
  tower_catapult: 'buildings/blue/building_tower_catapult_blue',
  barracks: 'buildings/blue/building_barracks_blue',
  archeryrange: 'buildings/blue/building_archeryrange_blue',
  castle: 'buildings/blue/building_castle_blue',
  church: 'buildings/blue/building_church_blue',
  windmill: 'buildings/blue/building_windmill_blue',
  home_a: 'buildings/blue/building_home_A_blue',
  home_b: 'buildings/blue/building_home_B_blue',
  blacksmith: 'buildings/blue/building_blacksmith_blue',
  tavern: 'buildings/blue/building_tavern_blue',
  market: 'buildings/blue/building_market_blue',
  well: 'buildings/blue/building_well_blue',
  lumbermill: 'buildings/blue/building_lumbermill_blue',
  watermill: 'buildings/blue/building_watermill_blue',
  mine: 'buildings/blue/building_mine_blue',
  tower_a_red: 'buildings/red/building_tower_A_red',
  castle_red: 'buildings/red/building_castle_red',
  barracks_red: 'buildings/red/building_barracks_red',
  // neutral
  wall: 'buildings/neutral/wall_straight',
  wall_gate: 'buildings/neutral/wall_straight_gate',
  fence_wood: 'buildings/neutral/fence_wood_straight',
  fence_stone: 'buildings/neutral/fence_stone_straight',
  bridge: 'buildings/neutral/building_bridge_A',
  ruin: 'buildings/neutral/building_destroyed',
  scaffolding: 'buildings/neutral/building_scaffolding',
  boulder: 'buildings/neutral/projectile_catapult',
  grain: 'buildings/neutral/building_grain',
  stage_a: 'buildings/neutral/building_stage_A',
  // nature
  tree_a: 'decoration/nature/tree_single_A',
  tree_b: 'decoration/nature/tree_single_B',
  trees_a_l: 'decoration/nature/trees_A_large',
  trees_a_m: 'decoration/nature/trees_A_medium',
  trees_a_s: 'decoration/nature/trees_A_small',
  trees_b_l: 'decoration/nature/trees_B_large',
  trees_b_m: 'decoration/nature/trees_B_medium',
  trees_b_s: 'decoration/nature/trees_B_small',
  tree_cut: 'decoration/nature/tree_single_A_cut',
  rock_a: 'decoration/nature/rock_single_A',
  rock_b: 'decoration/nature/rock_single_B',
  rock_c: 'decoration/nature/rock_single_C',
  rock_d: 'decoration/nature/rock_single_D',
  rock_e: 'decoration/nature/rock_single_E',
  mountain_a: 'decoration/nature/mountain_A_grass_trees',
  mountain_b: 'decoration/nature/mountain_B_grass_trees',
  mountain_c: 'decoration/nature/mountain_C_grass',
  mountain_a_bare: 'decoration/nature/mountain_A',
  hill_a: 'decoration/nature/hill_single_A',
  hills_trees: 'decoration/nature/hills_A_trees',
  cloud_big: 'decoration/nature/cloud_big',
  cloud_small: 'decoration/nature/cloud_small',
  waterlily: 'decoration/nature/waterlily_A',
  // props
  barrel: 'decoration/props/barrel',
  crate_a: 'decoration/props/crate_A_big',
  crate_b: 'decoration/props/crate_B_small',
  sack: 'decoration/props/sack',
  tent: 'decoration/props/tent',
  flag_blue: 'decoration/props/flag_blue',
  flag_red: 'decoration/props/flag_red',
  weaponrack: 'decoration/props/weaponrack',
  wheelbarrow: 'decoration/props/wheelbarrow',
  target: 'decoration/props/target',
  bucket_arrows: 'decoration/props/bucket_arrows',
  lumber: 'decoration/props/resource_lumber',
  stone: 'decoration/props/resource_stone',
};

async function buildKit() {
  const doc = await io.read(`${HEX}/${KIT.tower_a}.gltf`);
  doc.getRoot().listScenes().forEach((s) => s.dispose());
  doc.getRoot().listNodes().forEach((n) => n.dispose());
  doc.getRoot().listMeshes().forEach((m) => m.dispose());
  const scene = doc.createScene('kit');
  for (const [key, rel] of Object.entries(KIT)) {
    const other = await io.read(`${HEX}/${rel}.gltf`);
    const map = mergeDocuments(doc, other);
    const srcScene = other.getRoot().listScenes()[0];
    const merged = map.get(srcScene);
    const root = doc.createNode(key);
    for (const child of merged.listChildren()) root.addChild(child);
    scene.addChild(root);
    merged.dispose();
  }
  doc.getRoot().setDefaultScene(scene);
  await doc.transform(dedup(), prune(), unpartition(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(`${OUT}/kit.glb`, doc);
  console.log('kit.glb', (fs.statSync(`${OUT}/kit.glb`).size / 1024).toFixed(0), 'KB');
}

const ADV = `${SRC}/adv/addons/kaykit_character_pack_adventures/Characters/gltf`;
const SKEL = `${SRC}/skel/addons/kaykit_character_pack_skeletons/Characters/gltf`;
const ANIMS = [
  'Idle', 'Walking_A', 'Walking_D_Skeletons', 'Running_A',
  '1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop', '1H_Ranged_Shoot', '2H_Ranged_Shoot',
  'Spellcast_Shoot', 'Death_A', 'Cheer', 'Blocking', 'Sit_Chair_Idle',
];
const CHARS = {
  knight: `${ADV}/Knight.glb`,
  barbarian: `${ADV}/Barbarian.glb`,
  mage: `${ADV}/Mage.glb`,
  rogue: `${ADV}/Rogue_Hooded.glb`,
  skel_warrior: `${SKEL}/Skeleton_Warrior.glb`,
  skel_minion: `${SKEL}/Skeleton_Minion.glb`,
  skel_mage: `${SKEL}/Skeleton_Mage.glb`,
  skel_rogue: `${SKEL}/Skeleton_Rogue.glb`,
};

function disposeSampler(sampler) {
  const accs = [sampler.getInput(), sampler.getOutput()];
  sampler.dispose();
  for (const acc of accs) {
    if (acc && acc.listParents().every((p) => p.propertyType === 'Root')) acc.dispose();
  }
}

function disposeAnimation(anim) {
  const samplers = anim.listSamplers();
  anim.listChannels().forEach((c) => c.dispose());
  anim.dispose();
  samplers.forEach(disposeSampler);
}

// Removes animation channels for node/path pairs that never leave the rest pose in ANY kept clip.
// KayKit rigs animate every bone in every clip, which bloats the glTF with thousands of accessors.
function stripStaticChannels(doc) {
  const restOf = (node, path) => path === 'translation' ? node.getTranslation() : path === 'rotation' ? node.getRotation() : path === 'scale' ? node.getScale() : null;
  const moving = new Set();
  const all = [];
  for (const anim of doc.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const node = ch.getTargetNode();
      const path = ch.getTargetPath();
      const rest = restOf(node, path);
      if (!rest) continue;
      const key = node.getName() + '|' + path;
      all.push([ch, key]);
      const out = ch.getSampler().getOutput().getArray();
      for (let i = 0; i < out.length; i++) {
        if (Math.abs(out[i] - rest[i % rest.length]) > 1e-4) { moving.add(key); break; }
      }
    }
  }
  for (const [ch, key] of all) {
    if (moving.has(key)) continue;
    const sampler = ch.getSampler();
    ch.dispose();
    disposeSampler(sampler);
  }
}

async function buildChars() {
  for (const [key, file] of Object.entries(CHARS)) {
    const doc = await io.read(file);
    for (const a of doc.getRoot().listAnimations()) {
      // the riding pose is only needed by hero characters (mounted on the horse)
      if (!ANIMS.includes(a.getName()) || (key.startsWith('skel') && a.getName().startsWith('Sit_'))) disposeAnimation(a);
    }
    stripStaticChannels(doc);
    await doc.transform(resample({ tolerance: 1e-3 }), dedup(), prune(), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await io.write(`${OUT}/${key}.glb`, doc);
    console.log(`${key}.glb`, (fs.statSync(`${OUT}/${key}.glb`).size / 1024).toFixed(0), 'KB');
  }
}

await buildKit();
await buildChars();
fs.writeFileSync(path.join(OUT, 'LICENSE.txt'),
  'Models: KayKit Medieval Hexagon Pack, KayKit Character Pack Adventures & Skeletons\n' +
  'by Kay Lousberg (www.kaylousberg.com) — CC0 1.0 Universal\n');
