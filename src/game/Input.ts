/** Pointer / touch / keyboard handling for the battle screen: tap, drag-pan, pinch & wheel zoom. */
export interface InputHandlers {
  tap(x: number, y: number): void;
  pan(dx: number, dy: number): void;
  zoom(factor: number, x: number, y: number): void;
  key(code: string, down: boolean): void;
}

export class Input {
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>();
  private dragging = false;
  private pinchDist = 0;
  private disposed = false;
  enabled = true;

  constructor(private el: HTMLElement, private h: InputHandlers) {
    el.addEventListener('pointerdown', this.down);
    addEventListener('pointermove', this.move);
    addEventListener('pointerup', this.up);
    addEventListener('pointercancel', this.up);
    el.addEventListener('wheel', this.wheel, { passive: false });
    addEventListener('keydown', this.kd);
    addEventListener('keyup', this.ku);
  }

  private down = (e: PointerEvent) => {
    if (!this.enabled || e.button !== 0) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.dragging = true;
    }
  };

  private move = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p || !this.enabled) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0 && d > 0) this.h.zoom(this.pinchDist / d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      this.pinchDist = d;
      this.h.pan(dx / 2, dy / 2);
      return;
    }
    if (!this.dragging && Math.hypot(p.x - p.sx, p.y - p.sy) > 10) this.dragging = true;
    if (this.dragging) this.h.pan(dx, dy);
  };

  private up = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (!this.dragging && this.enabled && performance.now() - p.t < 600) this.h.tap(e.clientX, e.clientY);
    if (this.pointers.size === 0) { this.dragging = false; this.pinchDist = 0; }
  };

  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!this.enabled) return;
    this.h.zoom(Math.exp(e.deltaY * 0.0012), e.clientX, e.clientY);
  };

  private kd = (e: KeyboardEvent) => {
    if (!this.enabled || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) this.h.key(e.code, true);
  };
  private ku = (e: KeyboardEvent) => { if (!this.disposed) this.h.key(e.code, false); };

  dispose() {
    this.disposed = true;
    this.el.removeEventListener('pointerdown', this.down);
    removeEventListener('pointermove', this.move);
    removeEventListener('pointerup', this.up);
    removeEventListener('pointercancel', this.up);
    this.el.removeEventListener('wheel', this.wheel);
    removeEventListener('keydown', this.kd);
    removeEventListener('keyup', this.ku);
  }
}
