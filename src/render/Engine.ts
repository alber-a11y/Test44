import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, TiltShiftEffect, VignetteEffect, ToneMappingEffect,
  ToneMappingMode, HueSaturationEffect, BrightnessContrastEffect, SMAAEffect, KernelSize,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Quality = 'low' | 'medium' | 'high';

export interface QualityProfile {
  dpr: number;
  shadows: boolean;
  shadowSize: number;
  ao: boolean;
  bloom: boolean;
  tiltShift: boolean;
  grass: number;
  msaa: number;
  particles: number;
}

export const QUALITY: Record<Quality, QualityProfile> = {
  low: { dpr: 1, shadows: true, shadowSize: 1024, ao: false, bloom: false, tiltShift: false, grass: 0.2, msaa: 0, particles: 0.5 },
  medium: { dpr: 1.5, shadows: true, shadowSize: 2048, ao: false, bloom: true, tiltShift: true, grass: 0.55, msaa: 0, particles: 0.8 },
  high: { dpr: 2, shadows: true, shadowSize: 4096, ao: true, bloom: true, tiltShift: true, grass: 1, msaa: 4, particles: 1 },
};

export function detectQuality(): Quality {
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1100);
  const cores = navigator.hardwareConcurrency || 4;
  if (mobile) return cores >= 8 ? 'medium' : 'low';
  return 'high';
}

/** Owns the WebGL renderer, the post-processing chain and the main loop. */
export class Engine {
  renderer: THREE.WebGLRenderer;
  composer!: EffectComposer;
  scene: THREE.Scene | null = null;
  camera: THREE.PerspectiveCamera;
  quality: Quality = 'medium';
  profile: QualityProfile = QUALITY.medium;
  canvas: HTMLCanvasElement;
  envMap: THREE.Texture;
  private updaters = new Set<(dt: number, t: number) => void>();
  private last = 0;
  private running = false;
  private aoPass: any = null;
  private tilt: TiltShiftEffect | null = null;
  paused = false;
  fps = 60;
  private fpsAcc = 0;
  private fpsN = 0;

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false, depth: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.id = 'game-canvas';
    parent.appendChild(this.canvas);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    addEventListener('resize', () => this.resize());
    // mobile browsers may drop the GL context when backgrounded: recover with a reload
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.paused = true; }, false);
    this.canvas.addEventListener('webglcontextrestored', () => location.reload(), false);
  }

  setQuality(q: Quality) {
    this.quality = q;
    this.profile = QUALITY[q];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.profile.dpr));
    this.renderer.shadowMap.enabled = this.profile.shadows;
    this.buildComposer();
    this.resize();
  }

  setScene(scene: THREE.Scene) {
    this.scene = scene;
    scene.environment = this.envMap;
    scene.environmentIntensity = 0.35;
    this.buildComposer();
    this.resize();
  }

  private buildComposer() {
    if (!this.scene) return;
    this.composer?.dispose();
    const p = this.profile;
    const composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: p.msaa });
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.aoPass = null;
    if (p.ao) {
      const ao = new N8AOPostPass(this.scene, this.camera, 1, 1);
      ao.configuration.aoRadius = 1.6;
      ao.configuration.distanceFalloff = 0.6;
      ao.configuration.intensity = 2.2;
      ao.configuration.halfRes = true;
      ao.configuration.aoSamples = 12;
      ao.configuration.denoiseSamples = 6;
      ao.configuration.gammaCorrection = false;
      composer.addPass(ao);
      this.aoPass = ao;
    }
    const effects: any[] = [];
    if (p.bloom) effects.push(new BloomEffect({ intensity: 0.9, luminanceThreshold: 0.82, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.6 } as any));
    this.tilt = null;
    if (p.tiltShift) {
      this.tilt = new TiltShiftEffect({ offset: 0.0, rotation: 0, focusArea: 0.78, feather: 0.22, kernelSize: KernelSize.SMALL });
      effects.push(this.tilt);
    }
    effects.push(new HueSaturationEffect({ saturation: 0.04 }));
    effects.push(new BrightnessContrastEffect({ contrast: 0.06, brightness: 0.0 }));
    effects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
    effects.push(new VignetteEffect({ offset: 0.3, darkness: 0.45 }));
    if (!p.msaa) effects.push(new SMAAEffect());
    composer.addPass(new EffectPass(this.camera, ...effects));
    this.composer = composer;
  }

  setTiltFocus(area: number) { if (this.tilt) this.tilt.focusArea = area; }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    this.aoPass?.setSize?.(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
    this.onResize?.();
  }
  onResize?: () => void;

  onUpdate(fn: (dt: number, t: number) => void) { this.updaters.add(fn); return () => this.updaters.delete(fn); }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000));
      this.last = now;
      this.fpsAcc += dt; this.fpsN++;
      if (this.fpsAcc > 1) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; }
      if (this.paused) return;
      for (const fn of this.updaters) fn(dt, now / 1000);
      if (this.scene && this.composer) this.composer.render(dt);
    };
    requestAnimationFrame(loop);
  }

  /** Render once immediately (used when paused to refresh after resize). */
  renderOnce() { if (this.scene && this.composer) this.composer.render(0); }
}
