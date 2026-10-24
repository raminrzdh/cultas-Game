/**
 * HorseRig: Calpurnio Western Horse & Equestrian Engine
 * Faithfully reproduces the minimalist stick-figure horse from Calpurnio's El Bueno de Cuttlas
 * featuring galloping locomotion, rearing up on hind legs (شِیهه اسب), mane strokes, and Cuttlas rider.
 */

import { boilEngine } from './boil';
import { sound } from './audio';

export type HorseState = 'REARING' | 'GALLOP' | 'WALK' | 'IDLE';

export interface Vector2D {
  x: number;
  y: number;
}

export class HorseRig {
  public id: number = 8000;
  public x: number = 200;
  public y: number = 480;
  public vx: number = 0;
  public vy: number = 0;
  public facing: number = 1;
  public isGrounded: boolean = true;

  public state: HorseState = 'IDLE';
  public animTime: number = 0;
  public stateTimer: number = 0;
  public isRearing: boolean = false;
  public rearingAmount: number = 0; // 0 (flat) to 1 (full 45-degree rear up)

  // Audio timer
  private lastGallopSound: number = 0;
  private hasNeighedOnStop: boolean = false;

  // Dimensions
  public bodyLen: number = 120;
  public bodyHeight: number = 34;
  public neckLen: number = 96;
  public headLen: number = 42;
  public headWidth: number = 20;

  // Hat spring for rider
  public hatOffset: { x: number; y: number; rot: number } = { x: 0, y: 0, rot: 0 };

  constructor(x: number = 200, y: number = 480) {
    this.x = x;
    this.y = y;
  }

  public gallopDuration: number = 0;

  public rearUp() {
    this.isRearing = true;
    this.state = 'REARING';
    this.stateTimer = 0;
    this.gallopDuration = 0;
    sound.playHorseNeigh();
  }

  public update(dt: number, isMoving: boolean, moveDir: number, onSpawnDust?: (x: number, y: number) => void) {
    this.animTime += dt;
    this.stateTimer += dt;

    if (isMoving) {
      this.facing = moveDir;
      this.state = 'GALLOP';
      this.isRearing = false;
      this.gallopDuration += dt;

      // Gallop sound cadence
      const gallopInterval = 0.26;
      if (this.animTime - this.lastGallopSound > gallopInterval) {
        sound.playHorseGallop();
        this.lastGallopSound = this.animTime;
        if (onSpawnDust) {
          onSpawnDust(this.x - 30 * this.facing, this.y);
        }
      }
    } else {
      // Stopped: Only trigger automatic rear if we galloped at speed for at least 0.5s
      if (this.state === 'GALLOP') {
        if (this.gallopDuration > 0.5) {
          this.rearUp();
        } else {
          this.state = 'IDLE';
        }
        this.gallopDuration = 0;
      }
    }

    // --- REARING STATE & SMOOTH RETURN TO GROUND ---
    if (this.isRearing) {
      const rearDuration = 1.8; // 1.8s matches the authentic neigh audio clip
      if (this.stateTimer < 0.35) {
        // Fast rise up
        const p = this.stateTimer / 0.35;
        this.rearingAmount = Math.sin((p * Math.PI) / 2);
      } else if (this.stateTimer < 1.35) {
        // Hold at apex with subtle neigh tremor
        this.rearingAmount = 1.0 + Math.sin((this.stateTimer - 0.35) * 18) * 0.025;
      } else if (this.stateTimer < rearDuration) {
        // Smoothly settle back down to ground
        const p = (this.stateTimer - 1.35) / (rearDuration - 1.35);
        this.rearingAmount = Math.cos((p * Math.PI) / 2);
      } else {
        // Return to resting idle firmly on ground - NEVER stays up in air
        this.isRearing = false;
        this.rearingAmount = 0;
        this.state = 'IDLE';
        this.stateTimer = 0;
      }
    } else {
      // Smoothly ensure rearingAmount decays to 0 if cancelled early
      if (this.rearingAmount > 0.001) {
        this.rearingAmount = Math.max(0, this.rearingAmount - dt * 6.5);
      } else {
        this.rearingAmount = 0;
      }
    }

    // Rider hat bounce
    const rearBounce = Math.sin(this.animTime * 12) * (this.isRearing ? 3 : 1);
    this.hatOffset.y = -rearBounce;
    this.hatOffset.rot = this.rearingAmount * 0.15;
  }

  /**
   * Render Calpurnio Horse and Rider
   */
  public render(ctx: CanvasRenderingContext2D, isRiderMounted: boolean = true) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    // Base Style
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Render Drop Shadow
    this.drawHorseAndRider(ctx, true, isRiderMounted);

    // 2. Render Main Horse and Rider
    this.drawHorseAndRider(ctx, false, isRiderMounted);

    ctx.restore();
  }

  private drawHorseAndRider(ctx: CanvasRenderingContext2D, isShadow: boolean, isRiderMounted: boolean) {
    ctx.save();

    if (isShadow) {
      ctx.translate(7, 5);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    } else {
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#FFFFFF';
    }

    const t = this.animTime;
    const rear = Math.max(0, Math.min(1, this.rearingAmount)); // 0 (flat on ground) to 1 (full rear)

    // Body tilt angle: rearing tilts up ~46 degrees (0.8 rad)
    let bodyAngle = -rear * 0.78;
    let bodyCenterY = -58 - rear * 22;

    if (this.state === 'GALLOP') {
      // Galloping body surge
      const gallopPhase = t * 13;
      bodyAngle = Math.sin(gallopPhase) * 0.14 - 0.04;
      bodyCenterY += Math.abs(Math.sin(gallopPhase)) * 8 - 4;
    }

    const bodyCenterX = 0;
    const halfLen = this.bodyLen * 0.5;

    // Rear and Front body anchor points
    const rearX = bodyCenterX - Math.cos(bodyAngle) * halfLen;
    const rearY = bodyCenterY - Math.sin(bodyAngle) * halfLen;
    const frontX = bodyCenterX + Math.cos(bodyAngle) * halfLen;
    const frontY = bodyCenterY + Math.sin(bodyAngle) * halfLen;

    // --- 1. TAIL ---
    const tailEndX = rearX - Math.cos(bodyAngle - 0.3) * 36;
    const tailEndY = rearY - Math.sin(bodyAngle - 0.3) * 36 + 10;
    boilEngine.drawLine(ctx, rearX, rearY + 6, tailEndX, tailEndY, this.id + 1, false);

    // --- 2. HIND LEGS (2-segment stick legs) ---
    // When rearing: both hind legs plant firmly on ground supporting body
    const hindHip = { x: rearX + 10, y: rearY + 6 };

    if (this.state === 'GALLOP') {
      const gPhase = t * 13;
      const hPhase1 = gPhase;
      const hPhase2 = gPhase + 0.5;

      const drawGallopLeg = (hip: Vector2D, phase: number, idOff: number) => {
        const u = Math.sin(phase);
        const kx = hip.x + u * 24 - 10;
        const ky = hip.y + 34 - Math.max(0, -u) * 14;
        const fx = kx + u * 20;
        const fy = Math.min(0, ky + 34);
        boilEngine.drawLine(ctx, hip.x, hip.y, kx, ky, this.id + idOff, false);
        boilEngine.drawLine(ctx, kx, ky, fx, fy, this.id + idOff + 1, false);
      };

      drawGallopLeg(hindHip, hPhase1, 14);
      drawGallopLeg(hindHip, hPhase2, 16);
    } else {
      // Smoothly blend between standing legs and rearing stance based on `rear`
      // Back hind leg (knee bent forward, firmly on ground y = 0)
      const bk1 = { x: hindHip.x - 6 - rear * 2, y: hindHip.y + 36 };
      const bk2 = { x: hindHip.x - 6 + rear * 2, y: 0 };
      boilEngine.drawLine(ctx, hindHip.x - 3, hindHip.y, bk1.x, bk1.y, this.id + 10, false);
      boilEngine.drawLine(ctx, bk1.x, bk1.y, bk2.x, bk2.y, this.id + 11, false);

      // Front hind leg (knee bent forward, firmly on ground y = 0)
      const fk1 = { x: hindHip.x + 8 + rear * 2, y: hindHip.y + 36 };
      const fk2 = { x: hindHip.x + 8 + rear * 4, y: 0 };
      boilEngine.drawLine(ctx, hindHip.x + 6, hindHip.y, fk1.x, fk1.y, this.id + 12, false);
      boilEngine.drawLine(ctx, fk1.x, fk1.y, fk2.x, fk2.y, this.id + 13, false);
    }

    // --- 3. HORSE BODY OVAL ---
    if (!isShadow) {
      ctx.fillStyle = '#FFF9E8'; // Classic Calpurnio cream-white horse coat
      ctx.strokeStyle = '#000000';
    }
    boilEngine.drawEllipse(
      ctx,
      bodyCenterX,
      bodyCenterY,
      this.bodyLen * 0.5,
      this.bodyHeight * 0.5,
      bodyAngle,
      this.id + 30,
      true,
      true
    );

    // --- 4. FRONT LEGS ---
    const frontHip = { x: frontX - 10, y: frontY + 6 };

    if (this.state === 'GALLOP') {
      const gPhase = t * 13 + Math.PI;
      const fPhase1 = gPhase;
      const fPhase2 = gPhase + 0.5;

      const drawFrontGallopLeg = (hip: Vector2D, phase: number, idOff: number) => {
        const u = Math.sin(phase);
        const kx = hip.x + u * 28 + 12;
        const ky = hip.y + 32 - Math.max(0, u) * 16;
        const fx = kx + u * 24;
        const fy = Math.min(0, ky + 34);
        boilEngine.drawLine(ctx, hip.x, hip.y, kx, ky, this.id + idOff, false);
        boilEngine.drawLine(ctx, kx, ky, fx, fy, this.id + idOff + 1, false);
      };

      drawFrontGallopLeg(frontHip, fPhase1, 44);
      drawFrontGallopLeg(frontHip, fPhase2, 46);
    } else {
      // Smoothly interpolate between standing on ground (rear = 0) and lifted high in air (rear = 1)
      // Leg 1 (Left front leg)
      const gKnee1 = { x: frontHip.x + 6, y: frontHip.y + 34 };
      const gHoof1 = { x: frontHip.x + 8, y: 0 };
      const rKnee1 = { x: frontHip.x + 36, y: frontHip.y - 14 };
      const rHoof1 = { x: rKnee1.x + 8, y: rKnee1.y + 44 };

      const knee1X = gKnee1.x + (rKnee1.x - gKnee1.x) * rear;
      const knee1Y = gKnee1.y + (rKnee1.y - gKnee1.y) * rear;
      const hoof1X = gHoof1.x + (rHoof1.x - gHoof1.x) * rear;
      const hoof1Y = gHoof1.y + (rHoof1.y - gHoof1.y) * rear;

      boilEngine.drawLine(ctx, frontHip.x, frontHip.y, knee1X, knee1Y, this.id + 40, false);
      boilEngine.drawLine(ctx, knee1X, knee1Y, hoof1X, hoof1Y, this.id + 41, false);

      // Leg 2 (Right front leg)
      const gKnee2 = { x: frontHip.x + 16, y: frontHip.y + 34 };
      const gHoof2 = { x: frontHip.x + 18, y: 0 };
      const rKnee2 = { x: frontHip.x + 50, y: frontHip.y + 8 };
      const rHoof2 = { x: rKnee2.x + 22, y: rKnee2.y + 46 };

      const knee2X = gKnee2.x + (rKnee2.x - gKnee2.x) * rear;
      const knee2Y = gKnee2.y + (rKnee2.y - gKnee2.y) * rear;
      const hoof2X = gHoof2.x + (rHoof2.x - gHoof2.x) * rear;
      const hoof2Y = gHoof2.y + (rHoof2.y - gHoof2.y) * rear;

      boilEngine.drawLine(ctx, frontHip.x + 10, frontHip.y, knee2X, knee2Y, this.id + 42, false);
      boilEngine.drawLine(ctx, knee2X, knee2Y, hoof2X, hoof2Y, this.id + 43, false);
    }

    // --- 5. NECK, MANE & HEAD ---
    // Neck angle extends up-forward from front of body oval
    const neckBaseAngle = bodyAngle - 1.15; // steep upright angle
    const neckBase = { x: frontX - 4, y: frontY - 4 };
    const neckTop = {
      x: neckBase.x + Math.cos(neckBaseAngle) * this.neckLen,
      y: neckBase.y + Math.sin(neckBaseAngle) * this.neckLen,
    };

    // Neck line
    boilEngine.drawLine(ctx, neckBase.x, neckBase.y, neckTop.x, neckTop.y, this.id + 60, false);

    // Mane: 7-9 short perpendicular strokes along back of neck
    const numMane = 8;
    for (let m = 0; m < numMane; m++) {
      const u = (m + 1) / (numMane + 1);
      const mx = neckBase.x + (neckTop.x - neckBase.x) * u;
      const my = neckBase.y + (neckTop.y - neckBase.y) * u;
      // Perpendicular vector pointing backward
      const maneLen = 14;
      const nx = -Math.sin(neckBaseAngle) * maneLen;
      const ny = Math.cos(neckBaseAngle) * maneLen;
      boilEngine.drawLine(ctx, mx, my, mx - nx, my - ny, this.id + 65 + m, false);
    }

    // Horse Head: Oval capsule pointing forward-down from top of neck
    const headAngle = neckBaseAngle + 0.85;
    const headCenter = {
      x: neckTop.x + Math.cos(headAngle) * (this.headLen * 0.45),
      y: neckTop.y + Math.sin(headAngle) * (this.headLen * 0.45),
    };

    if (!isShadow) {
      ctx.fillStyle = '#FFF9E8';
      ctx.strokeStyle = '#000000';
    }
    boilEngine.drawEllipse(
      ctx,
      headCenter.x,
      headCenter.y,
      this.headLen * 0.5,
      this.headWidth * 0.5,
      headAngle,
      this.id + 80,
      true,
      true
    );

    // Horse Ears
    const ear1 = {
      x: neckTop.x - Math.sin(headAngle) * 8,
      y: neckTop.y + Math.cos(headAngle) * 8,
    };
    boilEngine.drawLine(ctx, neckTop.x, neckTop.y, ear1.x, ear1.y, this.id + 82, false);

    const horseMouth: Vector2D = {
      x: headCenter.x + Math.cos(headAngle) * (this.headLen * 0.45),
      y: headCenter.y + Math.sin(headAngle) * (this.headLen * 0.45),
    };

    // --- 6. CUTTLAS RIDER (if mounted) ---
    if (isRiderMounted) {
      this.drawRiderCuttlas(ctx, bodyCenterX, bodyCenterY, bodyAngle, horseMouth, isShadow);
    }

    ctx.restore();
  }

  /**
   * Draw Cuttlas perched atop the horse in authentic Calpurnio equestrian posture
   * Faithfully matching user drawing image_87b93356.png:
   * - Rider torso tilted backward in rear / perched upright
   * - Rider back (left) arm: elbow bends DOWN-LEFT towards waist, forearm shoots UP-LEFT into the air with 3 open stick fingers
   * - Smooth return to relaxed hip posture after rearing (never stuck up)
   * - Rider front (right) arm: reaches forward from shoulder to rein hand, taut reins connect directly to horse mouth
   * - Rider leg: thigh extends straight down across horse body oval below belly, knee bends sharply UP-FORWARD forming stirrup hook
   */
  private drawRiderCuttlas(
    ctx: CanvasRenderingContext2D,
    bodyX: number,
    bodyY: number,
    bodyAngle: number,
    horseMouth: Vector2D,
    isShadow: boolean
  ) {
    const rear = Math.max(0, Math.min(1, this.rearingAmount));
    const horseCos = Math.cos(bodyAngle);
    const horseSin = Math.sin(bodyAngle);

    // Saddle: located on top edge of horse back (-8 along spine from body center, 20 up along normal)
    const saddlePos: Vector2D = {
      x: bodyX - horseCos * 8 + horseSin * 20,
      y: bodyY - horseSin * 8 - horseCos * 20,
    };

    // Torso Frame & Orientations
    // In rearing: tilts backward with the horse (matching authentic Calpurnio silhouette)
    const riderTorsoAngle = bodyAngle * (0.92 + rear * 0.12) - 0.08;
    const torsoLen = 76;
    const torsoDirX = Math.sin(riderTorsoAngle);
    const torsoDirY = -Math.cos(riderTorsoAngle);

    const torsoTop: Vector2D = {
      x: saddlePos.x + torsoDirX * torsoLen,
      y: saddlePos.y + torsoDirY * torsoLen,
    };
    const torsoMid: Vector2D = {
      x: (saddlePos.x + torsoTop.x) * 0.5,
      y: (saddlePos.y + torsoTop.y) * 0.5,
    };

    // =========================================================================
    // 1. BACK ARM (Left arm - behind the body / "پشت بدنش")
    // =========================================================================
    // Drawn BEFORE the torso oval so the torso cleanly covers its root!
    const backShoulder: Vector2D = {
      x: torsoTop.x - horseCos * 2,
      y: torsoTop.y + 4,
    };

    // Cowboy wave in rear, relaxed on hip/saddle in idle/gallop
    // In rearing (matches image_87b93356.png):
    // Back Shoulder -> Elbow goes DOWN and to the LEFT (elbow at waist level, out to left)
    // Elbow -> Hand goes UP and to the LEFT into the air with 3 open stick fingers
    const waveElbow: Vector2D = {
      x: torsoMid.x - Math.cos(riderTorsoAngle) * 22,
      y: torsoMid.y - Math.sin(riderTorsoAngle) * 22,
    };
    const waveHand: Vector2D = {
      x: waveElbow.x - 24,
      y: waveElbow.y - 28,
    };

    // Normal resting posture in idle / gallop
    const restElbow: Vector2D = {
      x: torsoMid.x - 14,
      y: torsoMid.y + 10,
    };
    const restHand: Vector2D = {
      x: saddlePos.x - 6,
      y: saddlePos.y - 4,
    };

    // Blend smoothly based on rearingAmount so after rearing it always returns to rest posture
    const currentElbow: Vector2D = {
      x: restElbow.x + (waveElbow.x - restElbow.x) * rear,
      y: restElbow.y + (waveElbow.y - restElbow.y) * rear,
    };
    const currentHand: Vector2D = {
      x: restHand.x + (waveHand.x - restHand.x) * rear,
      y: restHand.y + (waveHand.y - restHand.y) * rear,
    };

    boilEngine.drawLine(ctx, backShoulder.x, backShoulder.y, currentElbow.x, currentElbow.y, this.id + 115, false);
    boilEngine.drawLine(ctx, currentElbow.x, currentElbow.y, currentHand.x, currentHand.y, this.id + 116, false);

    // 3 stick fingers fanning out in classic Calpurnio triumphant wave (active when rearing)
    if (rear > 0.05) {
      const armAngle = Math.atan2(currentHand.y - currentElbow.y, currentHand.x - currentElbow.x);
      const fLen = 14 * Math.min(1, rear * 1.5);
      boilEngine.drawLine(ctx, currentHand.x, currentHand.y, currentHand.x + Math.cos(armAngle) * fLen, currentHand.y + Math.sin(armAngle) * fLen, this.id + 117, false);
      boilEngine.drawLine(ctx, currentHand.x, currentHand.y, currentHand.x + Math.cos(armAngle - 0.45) * fLen, currentHand.y + Math.sin(armAngle - 0.45) * fLen, this.id + 118, false);
      boilEngine.drawLine(ctx, currentHand.x, currentHand.y, currentHand.x + Math.cos(armAngle + 0.45) * fLen, currentHand.y + Math.sin(armAngle + 0.45) * fLen, this.id + 119, false);
    }

    // =========================================================================
    // 2. RIDER LEG (crossing horse flank, extending well below belly)
    // =========================================================================
    // Thigh extends from saddle straight down across horse body, past the lower belly
    const riderKnee: Vector2D = {
      x: saddlePos.x - horseSin * 54 + horseCos * 8,
      y: saddlePos.y + horseCos * 54 + horseSin * 8,
    };

    // Lower leg / stirrup hook: bends sharply from knee UP and FORWARD, parallel to horse belly line
    const riderFoot: Vector2D = {
      x: riderKnee.x + horseCos * 26 + horseSin * 10,
      y: riderKnee.y + horseSin * 26 - horseCos * 10,
    };

    boilEngine.drawLine(ctx, saddlePos.x, saddlePos.y, riderKnee.x, riderKnee.y, this.id + 100, false);
    boilEngine.drawLine(ctx, riderKnee.x, riderKnee.y, riderFoot.x, riderFoot.y, this.id + 101, false);

    // =========================================================================
    // 3. TORSO OVAL (covers back arm and leg root with opaque white fill)
    // =========================================================================
    if (!isShadow) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
    }
    boilEngine.drawEllipse(
      ctx,
      torsoMid.x,
      torsoMid.y,
      13,
      torsoLen * 0.5,
      riderTorsoAngle,
      this.id + 102,
      true,
      true
    );

    // =========================================================================
    // 4. HEAD & HAT
    // =========================================================================
    const riderHeadCenter: Vector2D = {
      x: torsoTop.x + torsoDirX * 18,
      y: torsoTop.y + torsoDirY * 18,
    };

    if (!isShadow) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
    }
    boilEngine.drawEllipse(
      ctx,
      riderHeadCenter.x,
      riderHeadCenter.y,
      13,
      19,
      riderTorsoAngle,
      this.id + 103,
      true,
      true
    );

    // Hat Node atop head
    const hatBaseX = riderHeadCenter.x + torsoDirX * 17 + this.hatOffset.x;
    const hatBaseY = riderHeadCenter.y + torsoDirY * 17 + this.hatOffset.y;
    ctx.save();
    ctx.translate(hatBaseX, hatBaseY);
    ctx.rotate(riderTorsoAngle + this.hatOffset.rot);

    if (!isShadow) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
    }
    // Crown
    boilEngine.drawEllipse(ctx, 0, -16, 12, 17, 0, this.id + 104, true, true);
    // Brim
    boilEngine.drawLine(ctx, -26, 0, 26, 0, this.id + 105, true);
    ctx.restore();

    // =========================================================================
    // 5. FRONT ARM (Right arm - in front on the body / "روی بدنش" holding reins)
    // =========================================================================
    const frontShoulder: Vector2D = {
      x: torsoTop.x + horseCos * 2,
      y: torsoTop.y + 4,
    };

    // Right arm: reaches forward holding the reins near horse withers / neck
    const reinHand: Vector2D = {
      x: saddlePos.x + horseCos * 26 + horseSin * 10,
      y: saddlePos.y + horseSin * 26 - horseCos * 10,
    };
    if (this.state === 'GALLOP') {
      reinHand.y += Math.sin(this.animTime * 13) * 2;
    }

    const rightElbow: Vector2D = {
      x: (frontShoulder.x + reinHand.x) * 0.5 + horseCos * 4,
      y: (frontShoulder.y + reinHand.y) * 0.5 + 6,
    };

    boilEngine.drawLine(ctx, frontShoulder.x, frontShoulder.y, rightElbow.x, rightElbow.y, this.id + 110, false);
    boilEngine.drawLine(ctx, rightElbow.x, rightElbow.y, reinHand.x, reinHand.y, this.id + 111, false);

    // Reins line connecting hand to horse's mouth
    boilEngine.drawLine(ctx, reinHand.x, reinHand.y, horseMouth.x, horseMouth.y, this.id + 112, false);
  }
}
