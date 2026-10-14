import type { LevelDef } from '../sim/types';
import { Path } from '../sim/path';
import { fbm, vnoise } from './glsl';
import type { BiomeLook } from './biomes';

export const PATH_HALF = 1.45;
export const MARGIN = 34;

/**
 * Spatial description of a level used by every visual layer: distance to the nearest path,
 * the ground mask texture (dirt roads, plazas, dry patches) and the terrain height function.
 */
export class Field {
  minX: number; minZ: number; sizeX: number; sizeZ: number;
  paths: Path[];
  /** coarse distance-to-path grid */
  private cell = 0.5;
  private gw: number; private gh: number;
  private dist: Float32Array;
  mask: HTMLCanvasElement;
  private maskData: Uint8ClampedArray;
  hw: number; hh: number;

  constructor(public level: LevelDef, public look: BiomeLook) {
    this.hw = level.width / 2;
    this.hh = level.height / 2;
    this.minX = -this.hw - MARGIN;
    this.minZ = -this.hh - MARGIN;
    this.sizeX = level.width + MARGIN * 2;
    this.sizeZ = level.height + MARGIN * 2;
    this.paths = level.paths.map((p) => new Path(p, 0.4));
    this.gw = Math.ceil(this.sizeX / this.cell) + 1;
    this.gh = Math.ceil(this.sizeZ / this.cell) + 1;
    this.dist = new Float32Array(this.gw * this.gh).fill(999);
    this.buildDistance();
    this.mask = document.createElement('canvas');
    const pxPerUnit = 12;
    this.mask.width = Math.round(this.sizeX * pxPerUnit);
    this.mask.height = Math.round(this.sizeZ * pxPerUnit);
    this.drawMask(pxPerUnit);
    this.maskData = this.mask.getContext('2d')!.getImageData(0, 0, this.mask.width, this.mask.height).data;
  }

  private buildDistance() {
    // brute force distance to sampled path points within a radius (cheap enough at load)
    const R = 9;
    for (const p of this.paths) {
      for (let i = 0; i < p.xs.length; i++) {
        const px = p.xs[i], pz = p.zs[i];
        const gx0 = Math.max(0, Math.floor((px - R - this.minX) / this.cell)), gx1 = Math.min(this.gw - 1, Math.ceil((px + R - this.minX) / this.cell));
        const gz0 = Math.max(0, Math.floor((pz - R - this.minZ) / this.cell)), gz1 = Math.min(this.gh - 1, Math.ceil((pz + R - this.minZ) / this.cell));
        for (let gz = gz0; gz <= gz1; gz++) {
          const wz = this.minZ + gz * this.cell;
          for (let gx = gx0; gx <= gx1; gx++) {
            const wx = this.minX + gx * this.cell;
            const d = Math.hypot(wx - px, wz - pz);
            const k = gz * this.gw + gx;
            if (d < this.dist[k]) this.dist[k] = d;
          }
        }
      }
    }
  }

  /** Distance to nearest path centre line (bilinear on coarse grid). */
  pathDist(x: number, z: number): number {
    const fx = (x - this.minX) / this.cell, fz = (z - this.minZ) / this.cell;
    const ix = Math.max(0, Math.min(this.gw - 2, Math.floor(fx))), iz = Math.max(0, Math.min(this.gh - 2, Math.floor(fz)));
    const tx = Math.min(1, Math.max(0, fx - ix)), tz = Math.min(1, Math.max(0, fz - iz));
    const d = this.dist;
    const a = d[iz * this.gw + ix], b = d[iz * this.gw + ix + 1], c = d[(iz + 1) * this.gw + ix], e = d[(iz + 1) * this.gw + ix + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + e * tx) * tz;
  }

  inPlay(x: number, z: number, pad = 0) { return Math.abs(x) <= this.hw + pad && Math.abs(z) <= this.hh + pad; }

  /** Distance outside the playable rectangle (0 inside). */
  outside(x: number, z: number) {
    const dx = Math.max(0, Math.abs(x) - this.hw), dz = Math.max(0, Math.abs(z) - this.hh);
    return Math.hypot(dx, dz);
  }

  private drawMask(ppu: number) {
    const ctx = this.mask.getContext('2d')!;
    const W = this.mask.width, H = this.mask.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const toPx = (x: number, z: number): [number, number] => [(x - this.minX) * ppu, (z - this.minZ) * ppu];
    // B channel: dry / flower patches from noise (low-res then upscaled for softness)
    const small = document.createElement('canvas');
    small.width = Math.ceil(W / 8); small.height = Math.ceil(H / 8);
    const sctx = small.getContext('2d')!;
    const img = sctx.createImageData(small.width, small.height);
    for (let y = 0; y < small.height; y++) {
      for (let x = 0; x < small.width; x++) {
        const wx = this.minX + (x * 8) / ppu, wz = this.minZ + (y * 8) / ppu;
        const n = fbm(wx * 0.11 + 3.1, wz * 0.11 - 7.7);
        const v = Math.max(0, Math.min(1, (n - 0.5) * 3.2));
        const o = (y * small.width + x) * 4;
        img.data[o] = 0; img.data[o + 1] = 0; img.data[o + 2] = v * 255; img.data[o + 3] = 255;
      }
    }
    sctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    // R channel: roads — layered soft strokes for a worn, irregular edge
    for (const p of this.paths) {
      for (const [w, a] of [[PATH_HALF * 2.5, 0.35], [PATH_HALF * 2.05, 0.55], [PATH_HALF * 1.6, 0.6]] as const) {
        ctx.strokeStyle = `rgba(255,0,0,${a})`;
        ctx.lineWidth = w * ppu;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < p.xs.length; i += 2) {
          const wob = (vnoise(p.xs[i] * 0.4, p.zs[i] * 0.4) - 0.5) * 0.5;
          const [px, pz] = toPx(p.xs[i] + wob, p.zs[i] - wob);
          if (i === 0) ctx.moveTo(px, pz); else ctx.lineTo(px, pz);
        }
        ctx.stroke();
      }
    }
    // G channel: plazas (build slots + gate)
    const blob = (x: number, z: number, r: number, a: number) => {
      const [px, pz] = toPx(x, z);
      const g = ctx.createRadialGradient(px, pz, 0, px, pz, r * ppu);
      g.addColorStop(0, `rgba(0,255,0,${a})`);
      g.addColorStop(0.6, `rgba(0,255,0,${a * 0.7})`);
      g.addColorStop(1, 'rgba(0,255,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, pz, r * ppu, 0, Math.PI * 2); ctx.fill();
    };
    for (const s of this.level.slots) blob(s.x, s.z, 2.2, 0.55);
    blob(this.level.gate.x, this.level.gate.z, 5, 0.9);
    ctx.globalCompositeOperation = 'source-over';
  }

  /** 0..1 road amount at a world position (CPU read of the mask). */
  maskAt(x: number, z: number): [number, number, number] {
    const px = Math.floor(((x - this.minX) / this.sizeX) * this.mask.width);
    const py = Math.floor(((z - this.minZ) / this.sizeZ) * this.mask.height);
    if (px < 0 || py < 0 || px >= this.mask.width || py >= this.mask.height) return [0, 0, 0];
    const o = (py * this.mask.width + px) * 4;
    return [this.maskData[o] / 255, this.maskData[o + 1] / 255, this.maskData[o + 2] / 255];
  }

  /** Terrain height. Play field is flat; the border rises into hills / cliffs / mountains. */
  height(x: number, z: number): number {
    const out = this.outside(x, z);
    const pd = this.pathDist(x, z);
    const flatten = 1 - smooth(PATH_HALF + 0.6, PATH_HALF + 4.5, pd);
    let h = 0;
    const n = fbm(x * 0.07, z * 0.07);
    const b = this.look.border;
    if (b === 'forest') h = smooth(0, 14, out) * (2.5 + n * 5) + Math.max(0, out - 14) * 0.35;
    else if (b === 'canyon' || b === 'ash') h = smooth(0.5, 5, out) * (6 + n * 6) + smooth(6, 20, out) * 6;
    else if (b === 'snow') h = smooth(0, 10, out) * (4 + n * 7) + Math.max(0, out - 10) * 0.6;
    else if (b === 'coast') {
      if (x < -this.hw + 1) h = -smooth(0, 4, -this.hw + 1 - x) * 3.2;
      else h = smooth(0, 14, out) * (2 + n * 4);
    }
    // gentle undulation inside the field
    if (out === 0 && b !== 'coast') h += (n - 0.5) * 0.25 * smooth(3, 6, pd);
    // keep the road (and its continuation outside) at ground level
    h *= 1 - flatten;
    return h;
  }
}

export function smooth(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
