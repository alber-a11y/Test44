import * as THREE from 'three';
import type { Field } from './Field';
import { NOISE_GLSL } from './glsl';

export function buildTerrain(field: Field): THREE.Mesh {
  const look = field.look;
  // denser grid inside the play field, coarser outside
  const segX = Math.round(field.sizeX * 1.6), segZ = Math.round(field.sizeZ * 1.6);
  const geo = new THREE.PlaneGeometry(field.sizeX, field.sizeZ, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(field.minX + field.sizeX / 2, 0, field.minZ + field.sizeZ / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, field.height(x, z));
  }
  geo.computeVertexNormals();

  const maskTex = new THREE.CanvasTexture(field.mask);
  maskTex.flipY = false;
  maskTex.colorSpace = THREE.NoColorSpace;
  maskTex.minFilter = THREE.LinearMipMapLinearFilter;
  maskTex.magFilter = THREE.LinearFilter;

  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const c = (h: number) => new THREE.Color(h);
  const uniforms = {
    uMask: { value: maskTex },
    uMaskRect: { value: new THREE.Vector4(field.minX, field.minZ, field.sizeX, field.sizeZ) },
    uGrassA: { value: c(look.grassA) }, uGrassB: { value: c(look.grassB) }, uGrassDry: { value: c(look.grassDry) },
    uDirt: { value: c(look.dirt) }, uDirtDark: { value: c(look.dirtDark) },
    uRock: { value: c(look.rock) }, uRockDark: { value: c(look.rockDark) }, uMoss: { value: c(look.moss) },
    uLava: { value: look.lava ? 1 : 0 },
    uTime: { value: 0 },
  };
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvWNrm = normal;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos; varying vec3 vWNrm;
uniform sampler2D uMask; uniform vec4 uMaskRect;
uniform vec3 uGrassA, uGrassB, uGrassDry, uDirt, uDirtDark, uRock, uRockDark, uMoss;
uniform float uLava; uniform float uTime;
${NOISE_GLSL}`)
      .replace('#include <map_fragment>', `
vec2 muv = (vWPos.xz - uMaskRect.xy) / uMaskRect.zw;
vec4 m = texture2D(uMask, muv);
vec2 wp = vWPos.xz;
float n1 = fbm(wp * 0.12);
float n2 = vnoise(wp * 1.7);
float n3 = vnoise(wp * 7.0);
vec3 grass = mix(uGrassA, uGrassB, smoothstep(0.32, 0.72, n1));
grass = mix(grass, uGrassDry, m.b * 0.55);
grass *= 0.86 + 0.22 * n2;
grass *= 0.94 + 0.08 * n3;
vec3 dirt = mix(uDirtDark, uDirt, smoothstep(0.2, 0.8, n2 * 0.7 + n1 * 0.5));
dirt *= 0.92 + 0.1 * n3;
float pebble = smoothstep(0.78, 0.86, vnoise(wp * 5.3 + 11.0));
dirt = mix(dirt, uDirtDark * 0.85, pebble * 0.5);
float edgeN = (vnoise(wp * 2.4) - 0.5) * 0.45 + (n3 - 0.5) * 0.15;
float road = smoothstep(0.42, 0.62, m.r + edgeN);
float plaza = smoothstep(0.45, 0.7, m.g + edgeN * 0.8) * 0.85;
float dirtAmt = max(road, plaza);
// wheel ruts along roads
dirt *= 1.0 - 0.08 * smoothstep(0.75, 1.0, m.r) * smoothstep(0.4, 0.6, vnoise(wp * 3.1));
vec3 col = mix(grass, dirt, dirtAmt);
// darker grass fringe next to the road
col *= 1.0 - 0.12 * smoothstep(0.15, 0.4, m.r) * (1.0 - road);
// rock on slopes with strata + moss on top
float slope = 1.0 - clamp(vWNrm.y, 0.0, 1.0);
float strata = 0.5 + 0.5 * sin(vWPos.y * 5.0 + n2 * 4.0);
vec3 rock = mix(uRockDark, uRock, strata * 0.6 + n2 * 0.4);
float rockAmt = smoothstep(0.28, 0.48, slope + (n1 - 0.5) * 0.3);
float mossAmt = smoothstep(0.2, 0.0, slope) * smoothstep(0.5, 1.5, vWPos.y);
col = mix(col, rock, rockAmt);
col = mix(col, uMoss, mossAmt * 0.35 * (1.0 - rockAmt));
vec4 diffuseColor2 = vec4(col, 1.0);
diffuseColor.rgb = diffuseColor2.rgb;
`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (uLava > 0.5) {
  float crack = smoothstep(0.035, 0.0, abs(vnoise(wp * 0.55) - 0.5)) * (1.0 - dirtAmt) * (1.0 - rockAmt);
  totalEmissiveRadiance += vec3(1.6, 0.45, 0.08) * crack * (0.7 + 0.3 * sin(uTime * 2.0 + wp.x));
}`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  (mesh.userData as any).uniforms = uniforms;
  return mesh;
}
