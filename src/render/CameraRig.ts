import * as THREE from 'three';

/** Tilted perspective camera that frames the level; supports pan / zoom / shake. */
export class CameraRig {
  target = new THREE.Vector2();
  dist = 40;
  minDist = 14;
  maxDist = 60;
  pitch = THREE.MathUtils.degToRad(56);
  /** 0 = looking north (portrait); -PI/2 = looking east (landscape, long map axis horizontal) */
  yaw = 0;
  private goal = new THREE.Vector2();
  private goalDist = 40;
  private shakeT = 0;
  private shakeAmp = 0;
  bounds = { w: 24, h: 40 };

  constructor(public camera: THREE.PerspectiveCamera) {}

  /** Distance that fits the w×h rectangle on screen. */
  fitDistance(w: number, h: number, margin = 1.04) {
    const cam = this.camera;
    const test = new THREE.PerspectiveCamera(cam.fov, cam.aspect, 0.5, 500);
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]];
    const v = new THREE.Vector3();
    const fits = (d: number) => {
      this.place(test, 0, 0, d);
      test.updateMatrixWorld();
      for (const [x, z] of corners) {
        v.set(x, 0, z).project(test);
        if (Math.abs(v.x) > 1 / margin || Math.abs(v.y) > 1 / margin) return false;
      }
      return true;
    };
    let lo = 5, hi = 200;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    return hi;
  }

  frame(w: number, h: number) {
    this.autoYaw();
    this.bounds = { w, h };
    const full = this.fitDistance(w, h);
    // allow seeing the whole level, but default to a slightly closer view on tall screens
    this.maxDist = full;
    this.minDist = Math.max(10, full * 0.38);
    this.goalDist = this.dist = full;
    this.goal.set(0, 0);
    this.target.set(0, 0);
    this.apply();
  }

  /** Re-fit after a resize, keeping relative zoom. */
  refit() {
    this.autoYaw();
    const rel = (this.goalDist - this.minDist) / Math.max(1e-3, this.maxDist - this.minDist);
    const full = this.fitDistance(this.bounds.w, this.bounds.h);
    this.maxDist = full;
    this.minDist = Math.max(10, full * 0.38);
    this.goalDist = this.dist = this.minDist + rel * (this.maxDist - this.minDist);
    this.clampGoal();
    this.apply();
  }

  private place(cam: THREE.PerspectiveCamera, tx: number, tz: number, d: number) {
    const hd = Math.cos(this.pitch) * d;
    cam.position.set(tx + Math.sin(this.yaw) * hd, Math.sin(this.pitch) * d, tz + Math.cos(this.yaw) * hd);
    cam.lookAt(tx, 0, tz);
  }

  /** Choose orientation from the viewport aspect. Returns true if it changed. */
  autoYaw(): boolean {
    const want = innerWidth > innerHeight * 1.1 ? -Math.PI / 2 : 0;
    if (want === this.yaw) return false;
    this.yaw = want;
    return true;
  }

  pan(dx: number, dz: number) { this.goal.x += dx; this.goal.y += dz; this.clampGoal(); }

  /** Pan by a screen-space drag (pixels). */
  panScreen(dxPx: number, dyPx: number) {
    const cam = this.camera;
    const k = (2 * Math.tan((cam.fov * Math.PI) / 360) * this.dist) / innerHeight;
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const ux = -Math.sin(this.yaw), uz = -Math.cos(this.yaw);
    const a = -dxPx * k, b = (dyPx * k) / Math.sin(this.pitch);
    this.pan(rx * a + ux * b, rz * a + uz * b);
  }
  zoom(factor: number, focus?: THREE.Vector2) {
    const before = this.goalDist;
    this.goalDist = THREE.MathUtils.clamp(this.goalDist * factor, this.minDist, this.maxDist);
    if (focus) {
      const k = 1 - this.goalDist / before;
      this.goal.x += (focus.x - this.goal.x) * k;
      this.goal.y += (focus.y - this.goal.y) * k;
    }
    this.clampGoal();
  }
  focusOn(x: number, z: number) { this.goal.set(x, z); this.clampGoal(); }
  shake(amount: number) { this.shakeAmp = Math.max(this.shakeAmp, amount); this.shakeT = 0.35; }

  private clampGoal() {
    // the closer we are, the more we can pan
    const zoomK = 1 - (this.goalDist - this.minDist) / Math.max(1e-3, this.maxDist - this.minDist);
    const hx = (this.bounds.w / 2) * zoomK * 0.95, hz = (this.bounds.h / 2) * zoomK * 0.95;
    this.goal.x = THREE.MathUtils.clamp(this.goal.x, -hx, hx);
    this.goal.y = THREE.MathUtils.clamp(this.goal.y, -hz, hz);
  }

  update(dt: number) {
    const k = 1 - Math.exp(-dt * 10);
    this.target.lerp(this.goal, k);
    this.dist += (this.goalDist - this.dist) * k;
    this.apply();
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmp * Math.max(0, this.shakeT / 0.35);
      this.camera.position.x += (Math.random() - 0.5) * a;
      this.camera.position.y += (Math.random() - 0.5) * a;
      if (this.shakeT <= 0) this.shakeAmp = 0;
    }
  }

  private apply() { this.place(this.camera, this.target.x, this.target.y, this.dist); this.camera.updateMatrixWorld(); }
}
