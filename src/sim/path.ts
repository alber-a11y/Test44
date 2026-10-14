export interface V2 { x: number; z: number }

/** Smooth polyline built from Catmull-Rom control points; sampled by arc length. */
export class Path {
  xs: Float32Array;
  zs: Float32Array;
  ds: Float32Array;
  length: number;
  constructor(public control: V2[], step = 0.25) {
    const pts: V2[] = [];
    const n = control.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = control[Math.max(0, i - 1)], p1 = control[i], p2 = control[i + 1], p3 = control[Math.min(n - 1, i + 2)];
      const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      const steps = Math.max(2, Math.ceil(segLen / step));
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        pts.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
        });
      }
    }
    pts.push({ ...control[n - 1] });
    this.xs = new Float32Array(pts.length);
    this.zs = new Float32Array(pts.length);
    this.ds = new Float32Array(pts.length);
    let d = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      this.xs[i] = pts[i].x; this.zs[i] = pts[i].z; this.ds[i] = d;
    }
    this.length = d;
  }

  private seg(d: number): number {
    const ds = this.ds;
    let lo = 0, hi = ds.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ds[mid] <= d) lo = mid; else hi = mid; }
    return lo;
  }

  /** Writes position and unit tangent at arc length d (extrapolates beyond both ends). */
  sample(d: number, out: { x: number; z: number; dx: number; dz: number }) {
    const n = this.xs.length;
    let i: number;
    if (d <= 0) i = 0; else if (d >= this.length) i = n - 2; else i = Math.min(this.seg(d), n - 2);
    const x0 = this.xs[i], z0 = this.zs[i], x1 = this.xs[i + 1], z1 = this.zs[i + 1];
    const segLen = this.ds[i + 1] - this.ds[i] || 1e-6;
    const t = (d - this.ds[i]) / segLen;
    out.dx = (x1 - x0) / segLen;
    out.dz = (z1 - z0) / segLen;
    out.x = x0 + (x1 - x0) * t;
    out.z = z0 + (z1 - z0) * t;
    return out;
  }

  /** Closest arc length and distance to point. */
  closest(x: number, z: number): { d: number; dist: number; x: number; z: number } {
    let best = Infinity, bd = 0, bx = 0, bz = 0;
    for (let i = 0; i < this.xs.length - 1; i++) {
      const ax = this.xs[i], az = this.zs[i], ex = this.xs[i + 1] - ax, ez = this.zs[i + 1] - az;
      const l2 = ex * ex + ez * ez || 1e-6;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2));
      const px = ax + ex * t, pz = az + ez * t;
      const dd = (px - x) ** 2 + (pz - z) ** 2;
      if (dd < best) { best = dd; bd = this.ds[i] + Math.sqrt(l2) * t; bx = px; bz = pz; }
    }
    return { d: bd, dist: Math.sqrt(best), x: bx, z: bz };
  }
}
