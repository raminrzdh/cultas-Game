/**
 * Hand-Drawn Line Boil & Jitter Engine ("Calpurnio Engine")
 * Perturbs vector vertices at ~10-12 FPS (every ~90-100ms) while rendering at 60 FPS
 * to faithfully reproduce traditional Spanish 2D hand-inked comic animation.
 */

export class LineBoilEngine {
  private lastBoilTime: number = 0;
  public boilSeed: number = 0;
  public boilInterval: number = 95; // ~10.5 FPS ink animation feel
  public intensity: number = 1.4; // pixel perturbance amplitude (1 to 2.5px)

  public update(timeMs: number) {
    if (timeMs - this.lastBoilTime >= this.boilInterval) {
      this.boilSeed = (this.boilSeed + 1) % 10000;
      this.lastBoilTime = timeMs;
    }
  }

  /**
   * Deterministic fast pseudo-random offset based on an identifier and current boilSeed
   */
  public getOffset(id: number, offsetIndex: number = 0, scaleMultiplier: number = 1): { x: number; y: number } {
    // Fast integer hash
    const h = ((id * 374761393) ^ ((this.boilSeed + offsetIndex * 17) * 668265263)) >>> 0;
    const normX = ((h & 0xffff) / 32767.5) - 1.0;
    const normY = (((h >>> 16) & 0xffff) / 32767.5) - 1.0;
    const amp = this.intensity * scaleMultiplier;
    return {
      x: normX * amp,
      y: normY * amp,
    };
  }

  /**
   * Draw a hand-drawn line with subtle middle inflection
   */
  public drawLine(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    id: number,
    subdivide: boolean = true
  ) {
    const o1 = this.getOffset(id, 0);
    const o2 = this.getOffset(id, 1);

    const px1 = x1 + o1.x;
    const py1 = y1 + o1.y;
    const px2 = x2 + o2.x;
    const py2 = y2 + o2.y;

    ctx.beginPath();
    ctx.moveTo(px1, py1);

    if (subdivide) {
      // Subtle mid-point ink bowing
      const mx = (px1 + px2) * 0.5;
      const my = (py1 + py2) * 0.5;
      const om = this.getOffset(id, 2, 1.2);
      ctx.quadraticCurveTo(mx + om.x, my + om.y, px2, py2);
    } else {
      ctx.lineTo(px2, py2);
    }
    ctx.stroke();
  }

  /**
   * Draw a hand-drawn ellipse (for Cuttlas's egg head, long oval torso, etc.)
   */
  public drawEllipse(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rot: number = 0,
    id: number = 0,
    fill: boolean = true,
    stroke: boolean = true
  ) {
    ctx.save();
    ctx.translate(cx, cy);
    if (rot !== 0) ctx.rotate(rot);

    // 4 bezier quadrants with perturbed control points
    const kappa = 0.5522847498307935;
    const ox = rx * kappa;
    const oy = ry * kappa;

    const jTop = this.getOffset(id, 0);
    const jRight = this.getOffset(id, 1);
    const jBottom = this.getOffset(id, 2);
    const jLeft = this.getOffset(id, 3);
    const jCp = this.getOffset(id, 4, 0.8);

    ctx.beginPath();
    // Top
    ctx.moveTo(0 + jTop.x, -ry + jTop.y);
    // Quadrant 1: Top to Right
    ctx.bezierCurveTo(
      ox + jCp.x, -ry + jTop.y,
      rx + jRight.x, -oy + jCp.y,
      rx + jRight.x, 0 + jRight.y
    );
    // Quadrant 2: Right to Bottom
    ctx.bezierCurveTo(
      rx + jRight.x, oy - jCp.y,
      ox - jCp.x, ry + jBottom.y,
      0 + jBottom.x, ry + jBottom.y
    );
    // Quadrant 3: Bottom to Left
    ctx.bezierCurveTo(
      -ox + jCp.x, ry + jBottom.y,
      -rx + jLeft.x, oy + jCp.y,
      -rx + jLeft.x, 0 + jLeft.y
    );
    // Quadrant 4: Left to Top
    ctx.bezierCurveTo(
      -rx + jLeft.x, -oy - jCp.y,
      -ox - jCp.x, -ry + jTop.y,
      0 + jTop.x, -ry + jTop.y
    );
    ctx.closePath();

    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw a hand-drawn polygon/path with jittered vertices
   */
  public drawPoly(
    ctx: CanvasRenderingContext2D,
    points: Array<{ x: number; y: number }>,
    id: number,
    fill: boolean = true,
    stroke: boolean = true,
    closed: boolean = true
  ) {
    if (points.length < 2) return;
    ctx.beginPath();

    const first = points[0];
    const o0 = this.getOffset(id, 0);
    ctx.moveTo(first.x + o0.x, first.y + o0.y);

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const oi = this.getOffset(id, i);
      ctx.lineTo(p.x + oi.x, p.y + oi.y);
    }

    if (closed) {
      ctx.closePath();
    }
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}

export const boilEngine = new LineBoilEngine();
