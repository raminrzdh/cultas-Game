/**
 * CharacterRig: Calpurnio Procedural 2D Skeletal Rigging Engine
 * Implements Forward & Inverse Kinematics (FK/IK), Spring Physics Hat Node,
 * Uniform Black Outlines, White Fills, and Animated Line Boil.
 */

import { boilEngine } from './boil';

export type RigType = 'CUTTLAS' | 'MABEL' | 'OUTLAW';
export type AnimState = 'IDLE' | 'WALK' | 'RUN' | 'JUMP' | 'STANDOFF' | 'SHOOT' | 'HAT_TIP' | 'DEFEAT';

export interface Vector2D {
  x: number;
  y: number;
}

/**
 * 2-Bone Analytical Inverse Kinematics (IK)
 */
export function solve2BoneIK(
  root: Vector2D,
  target: Vector2D,
  l1: number,
  l2: number,
  bendDir: number = 1 // 1 or -1
): { joint: Vector2D; end: Vector2D } {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  let dist = Math.sqrt(dx * dx + dy * dy);

  // Clamp distance to avoid hyperbolic triangle errors
  const maxReach = (l1 + l2) * 0.9999;
  const minReach = Math.abs(l1 - l2) * 1.0001;
  const clampedDist = Math.max(minReach, Math.min(maxReach, dist));

  const targetAngle = Math.atan2(dy, dx);

  // Law of Cosines for angle at root joint
  const cosAlpha = (l1 * l1 + clampedDist * clampedDist - l2 * l2) / (2 * l1 * clampedDist);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

  const angle1 = targetAngle + bendDir * alpha;
  const jx = root.x + Math.cos(angle1) * l1;
  const jy = root.y + Math.sin(angle1) * l1;

  // Actual end position
  const scale = dist > maxReach ? maxReach / dist : 1.0;
  const endX = root.x + dx * scale;
  const endY = root.y + dy * scale;

  return {
    joint: { x: jx, y: jy },
    end: { x: endX, y: endY },
  };
}

export class CharacterRig {
  public type: RigType;
  public id: number;

  // World Transform
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public facing: number = 1; // 1 = right, -1 = left
  public isGrounded: boolean = true;

  // State Machine
  public state: AnimState = 'IDLE';
  public animTime: number = 0;
  public stateTimer: number = 0;

  // Aiming (for shooting / mouse aim)
  public aimAngle: number = 0;
  public isAiming: boolean = false;
  public shootRecoil: number = 0;

  // Spring Physics Hat Node
  public hatOffset: { x: number; y: number; vx: number; vy: number; rot: number; vrot: number } = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    vrot: 0,
  };
  public hatInHand: boolean = false;
  public hatEquipped: boolean = true;

  // Anatomy Dimensions (Authentic Calpurnio Proportions)
  public torsoWidth: number = 32;
  public torsoHeight: number = 104;
  public headRadiusX: number = 15;
  public headRadiusY: number = 23;
  public upperArmLen: number = 42;
  public lowerArmLen: number = 40;
  public thighLen: number = 48;
  public calfLen: number = 52;
  public footLen: number = 24;

  // Holsters bounce
  public holsterBounce: number = 0;

  // Mabel dress physics
  public dressWave: number = 0;

  // Death / Defeat rotation
  public defeatRot: number = 0;

  constructor(type: RigType = 'CUTTLAS', id: number = 100) {
    this.type = type;
    this.id = id;
    if (type === 'MABEL') {
      this.thighLen = 42;
      this.calfLen = 46;
      this.headRadiusX = 14;
      this.headRadiusY = 21;
    }
  }

  public setState(newState: AnimState) {
    if (this.state === newState) return;
    this.state = newState;
    this.stateTimer = 0;
    if (newState === 'HAT_TIP') {
      this.hatInHand = true;
    } else {
      this.hatInHand = false;
    }
  }

  /**
   * Update Physics and Procedural Rig Keyframes
   */
  public update(dt: number) {
    this.animTime += dt;
    this.stateTimer += dt;

    // Decay recoil
    if (this.shootRecoil > 0) {
      this.shootRecoil = Math.max(0, this.shootRecoil - dt * 5);
    }

    // Hat Spring Physics (Damped Harmonic Oscillator)
    if (!this.hatInHand && this.hatEquipped) {
      const k = 140; // Spring stiffness
      const damping = 12; // Damping factor

      // External forces: inertia from vertical velocity
      const targetY = this.isGrounded ? 0 : Math.min(18, -this.vy * 0.04);
      const targetRot = (this.vx * 0.003) * this.facing;

      const fy = -k * (this.hatOffset.y - targetY) - damping * this.hatOffset.vy;
      const frot = -k * (this.hatOffset.rot - targetRot) - damping * this.hatOffset.vrot;

      this.hatOffset.vy += fy * dt;
      this.hatOffset.y += this.hatOffset.vy * dt;

      this.hatOffset.vrot += frot * dt;
      this.hatOffset.rot += this.hatOffset.vrot * dt;
    }

    // Holster inertia
    this.holsterBounce = Math.sin(this.animTime * 14) * (Math.abs(this.vx) > 10 ? 3 : 0.8);

    // Mabel dress wave
    if (this.type === 'MABEL') {
      this.dressWave = Math.sin(this.animTime * 6) * 6 + (this.vx * -0.05);
    }

    // State timeouts / auto-transitions
    if (this.state === 'SHOOT' && this.stateTimer > 0.35) {
      this.setState(Math.abs(this.vx) > 10 ? 'WALK' : 'IDLE');
    }

    if (this.state === 'HAT_TIP' && this.stateTimer > 1.8) {
      this.hatInHand = false;
      this.setState('IDLE');
    }

    if (this.state === 'DEFEAT') {
      this.defeatRot = Math.min(Math.PI * 0.5, this.defeatRot + dt * 4);
    }
  }

  /**
   * Render Character with Drop Shadow, Rig Anatomy, and Line Boil
   */
  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Apply death/defeat rotation if active
    if (this.defeatRot > 0) {
      ctx.translate(0, -10);
      ctx.rotate(this.defeatRot * this.facing);
      ctx.translate(0, 10);
    }

    // Face direction
    ctx.scale(this.facing, 1);

    // Base Style
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';

    // 1. Render Drop Shadow (authentic subtle flat shadow as seen in series)
    this.renderRig(ctx, true);

    // 2. Render Main Character Rig
    this.renderRig(ctx, false);

    // 3. Render Tension Lines if in Standoff
    if (this.state === 'STANDOFF') {
      this.renderTensionLines(ctx);
    }

    ctx.restore();
  }

  /**
   * Internal Rig Hierarchy Render (Shadow or Main)
   */
  private renderRig(ctx: CanvasRenderingContext2D, isShadow: boolean) {
    ctx.save();

    if (isShadow) {
      ctx.translate(7, 5);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    } else {
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = this.type === 'MABEL' ? '#536895' : '#FFFFFF';
    }

    // Procedural Joint Coordinates calculation based on animation state
    const t = this.animTime;
    let pelvisY = - (this.thighLen + this.calfLen);
    let pelvisX = 0;
    let torsoLean = 0;
    let headTilt = 0;

    let leftLegAngle = 0;
    let rightLegAngle = 0;
    let leftKneeAngle = 0;
    let rightKneeAngle = 0;

    let leftArmTarget: Vector2D | null = null;
    let rightArmTarget: Vector2D | null = null;

    // Breathing scale for idle
    const breath = Math.sin(t * 3.5) * 1.5;

    // --- ANIMATION KINEMATICS ---
    let leftLegIK: { joint: Vector2D; end: Vector2D };
    let rightLegIK: { joint: Vector2D; end: Vector2D };
    let leftFootEnd: Vector2D;
    let rightFootEnd: Vector2D;

    let leftElbow: Vector2D;
    let leftHand: Vector2D;
    let rightElbow: Vector2D;
    let rightHand: Vector2D;

    // Pelvis baseline height when standing
    const standingPelvisY = -(this.thighLen + this.calfLen) * 0.98;
    pelvisY = standingPelvisY;

    if (this.state === 'IDLE') {
      pelvisY += breath * 0.8;
      torsoLean = 0.02 * Math.sin(t * 1.5);
      headTilt = 0.03 * Math.cos(t * 1.5);

      // Standing hips
      const leftHip: Vector2D = { x: pelvisX - 5, y: pelvisY };
      const rightHip: Vector2D = { x: pelvisX + 5, y: pelvisY };

      // Feet planted at ground level (y = 0), splayed outwards like Calpurnio reference drawing
      const leftAnkle: Vector2D = { x: leftHip.x - 7, y: 0 };
      const rightAnkle: Vector2D = { x: rightHip.x + 7, y: 0 };

      leftLegIK = solve2BoneIK(leftHip, leftAnkle, this.thighLen, this.calfLen, 1);
      rightLegIK = solve2BoneIK(rightHip, rightAnkle, this.thighLen, this.calfLen, -1);

      // Left foot points left/outward, Right foot points right/outward
      leftFootEnd = { x: leftAnkle.x - this.footLen, y: leftAnkle.y };
      rightFootEnd = { x: rightAnkle.x + this.footLen, y: rightAnkle.y };
    } else if (this.state === 'WALK' || this.state === 'RUN') {
      const walkFreq = this.state === 'RUN' ? 10.5 : 6.8;
      const stride = this.state === 'RUN' ? 34 : 22;
      const stepH = this.state === 'RUN' ? 18 : 12;
      const gaitPhase = (t * walkFreq) % (Math.PI * 2);

      // Calpurnio jaunty body bob (peaks when passing, dips at double support)
      pelvisY += Math.cos(gaitPhase * 2) * (this.state === 'RUN' ? 4.5 : 2.8);
      torsoLean = this.state === 'RUN' ? 0.14 : 0.08;
      headTilt = -torsoLean * 0.3 + Math.sin(gaitPhase * 2) * 0.025;

      // Hips
      const leftHip: Vector2D = { x: pelvisX - 5, y: pelvisY };
      const rightHip: Vector2D = { x: pelvisX + 5, y: pelvisY };

      // Calculate gait for Left (Back) and Right (Front) legs
      const calcWalkLeg = (hip: Vector2D, phaseOffset: number) => {
        const p = (gaitPhase + phaseOffset) % (Math.PI * 2);
        let footX = hip.x;
        let footY = 0;
        let footAngle = 0;

        if (p < Math.PI) {
          // Stance Phase (planted on ground, smooth cosine progression from +stride to -stride)
          const u = p / Math.PI;
          const cosU = Math.cos(u * Math.PI);
          footX = hip.x + stride * cosU;
          footY = 0;

          // Toe push-off at end of stance
          if (u > 0.75) {
            const push = (u - 0.75) / 0.25;
            footAngle = push * 0.35;
          }
        } else {
          // Swing Phase (lifting off ground, moving forward in smooth parabolic arc)
          const u = (p - Math.PI) / Math.PI;
          const cosU = -Math.cos(u * Math.PI);
          footX = hip.x + stride * cosU;
          footY = -Math.sin(u * Math.PI) * stepH;
          // Toe drops slightly mid-swing then levels for landing
          footAngle = -Math.sin(u * Math.PI) * 0.22;
        }

        // Analytical IK with forward knee bend (bendDir = -1)
        const ik = solve2BoneIK(hip, { x: footX, y: footY }, this.thighLen, this.calfLen, -1);
        // Both feet point forward in walking direction
        const footEnd: Vector2D = {
          x: ik.end.x + this.footLen * Math.cos(footAngle),
          y: ik.end.y + this.footLen * Math.sin(footAngle),
        };

        return { ik, footEnd };
      };

      // Right leg phase offset = 0, Left leg phase offset = Math.PI
      const rightResult = calcWalkLeg(rightHip, 0);
      const leftResult = calcWalkLeg(leftHip, Math.PI);

      leftLegIK = leftResult.ik;
      leftFootEnd = leftResult.footEnd;
      rightLegIK = rightResult.ik;
      rightFootEnd = rightResult.footEnd;
    } else if (this.state === 'JUMP') {
      pelvisY = standingPelvisY - 16;
      torsoLean = -0.05;
      headTilt = 0.05;

      const leftHip: Vector2D = { x: pelvisX - 5, y: pelvisY };
      const rightHip: Vector2D = { x: pelvisX + 5, y: pelvisY };

      // Tucked trailing legs
      const leftAnkle: Vector2D = { x: leftHip.x - 14, y: pelvisY + 76 };
      const rightAnkle: Vector2D = { x: rightHip.x + 8, y: pelvisY + 70 };

      leftLegIK = solve2BoneIK(leftHip, leftAnkle, this.thighLen, this.calfLen, 1);
      rightLegIK = solve2BoneIK(rightHip, rightAnkle, this.thighLen, this.calfLen, 1);

      leftFootEnd = { x: leftAnkle.x + this.footLen * 0.8, y: leftAnkle.y + 8 };
      rightFootEnd = { x: rightAnkle.x + this.footLen * 0.9, y: rightAnkle.y + 6 };
    } else if (this.state === 'STANDOFF') {
      // Wide A-stance for Western Duel
      pelvisY = standingPelvisY + 12; // deep crouch
      torsoLean = 0;
      headTilt = 0;

      const leftHip: Vector2D = { x: pelvisX - 6, y: pelvisY };
      const rightHip: Vector2D = { x: pelvisX + 6, y: pelvisY };

      const leftAnkle: Vector2D = { x: leftHip.x - 26, y: 0 };
      const rightAnkle: Vector2D = { x: rightHip.x + 26, y: 0 };

      leftLegIK = solve2BoneIK(leftHip, leftAnkle, this.thighLen, this.calfLen, -1);
      rightLegIK = solve2BoneIK(rightHip, rightAnkle, this.thighLen, this.calfLen, 1);

      leftFootEnd = { x: leftAnkle.x - this.footLen, y: leftAnkle.y };
      rightFootEnd = { x: rightAnkle.x + this.footLen, y: rightAnkle.y };
    } else {
      // SHOOT / DEFAULT
      pelvisY = standingPelvisY + 4;
      torsoLean = -0.12 - this.shootRecoil * 0.1;
      headTilt = 0.05;

      const leftHip: Vector2D = { x: pelvisX - 5, y: pelvisY };
      const rightHip: Vector2D = { x: pelvisX + 5, y: pelvisY };

      const leftAnkle: Vector2D = { x: leftHip.x - 14, y: 0 };
      const rightAnkle: Vector2D = { x: rightHip.x + 12, y: 0 };

      leftLegIK = solve2BoneIK(leftHip, leftAnkle, this.thighLen, this.calfLen, 1);
      rightLegIK = solve2BoneIK(rightHip, rightAnkle, this.thighLen, this.calfLen, 1);

      leftFootEnd = { x: leftAnkle.x + this.footLen * 0.7, y: leftAnkle.y };
      rightFootEnd = { x: rightAnkle.x + this.footLen, y: rightAnkle.y };
    }

    // Pelvis root position
    const pelvis: Vector2D = { x: pelvisX, y: pelvisY };

    // Torso Center and Top
    const torsoTop: Vector2D = {
      x: pelvis.x + Math.sin(torsoLean) * this.torsoHeight,
      y: pelvis.y - Math.cos(torsoLean) * this.torsoHeight,
    };
    const torsoMid: Vector2D = {
      x: (pelvis.x + torsoTop.x) * 0.5,
      y: (pelvis.y + torsoTop.y) * 0.5,
    };

    // Shoulder Origin (at top of torso oval)
    const shoulders: Vector2D = {
      x: torsoTop.x,
      y: torsoTop.y + 6,
    };

    // Head Center
    const neckLen = 14;
    const headCenter: Vector2D = {
      x: torsoTop.x + Math.sin(torsoLean + headTilt) * (this.headRadiusY + neckLen),
      y: torsoTop.y - Math.cos(torsoLean + headTilt) * (this.headRadiusY + neckLen),
    };

    // --- ARMS CALCULATION ---
    const hatRestPos: Vector2D = {
      x: headCenter.x + this.hatOffset.x,
      y: headCenter.y - this.headRadiusY - 4 + this.hatOffset.y,
    };

    if (this.state === 'HAT_TIP') {
      // Procedural Hat Tip: left arm reaches up, grabs hat brim, lifts hat high above head!
      const progress = Math.min(1, this.stateTimer / 1.8);
      let liftHeight = 0;
      let leftHandTarget: Vector2D;

      if (progress < 0.3) {
        const reachP = progress / 0.3;
        leftHandTarget = {
          x: hatRestPos.x - 18,
          y: hatRestPos.y + 10 - reachP * 10,
        };
      } else if (progress < 0.55) {
        const liftP = (progress - 0.3) / 0.25;
        liftHeight = liftP * 34;
        this.hatOffset.y = -liftHeight;
        this.hatOffset.rot = liftP * 0.25;
        leftHandTarget = {
          x: hatRestPos.x - 16,
          y: hatRestPos.y - liftHeight,
        };
      } else if (progress < 0.75) {
        liftHeight = 34;
        this.hatOffset.y = -liftHeight;
        this.hatOffset.rot = 0.25;
        leftHandTarget = {
          x: hatRestPos.x - 16,
          y: hatRestPos.y - liftHeight,
        };
      } else {
        const returnP = (progress - 0.75) / 0.25;
        liftHeight = 34 * (1 - returnP);
        this.hatOffset.y = -liftHeight;
        this.hatOffset.rot = 0.25 * (1 - returnP);
        leftHandTarget = {
          x: hatRestPos.x - 16,
          y: hatRestPos.y - liftHeight,
        };
      }

      const leftArmIK = solve2BoneIK(shoulders, leftHandTarget, this.upperArmLen, this.lowerArmLen, -1);
      leftElbow = leftArmIK.joint;
      leftHand = leftArmIK.end;

      // Right arm rests relaxed
      const rightArmIK = solve2BoneIK(
        shoulders,
        { x: shoulders.x + 20, y: shoulders.y + 54 },
        this.upperArmLen,
        this.lowerArmLen,
        1
      );
      rightElbow = rightArmIK.joint;
      rightHand = rightArmIK.end;
    } else if (this.state === 'STANDOFF') {
      // Arms flared outward, elbows bent out, 3-finger hands hovering tense over holsters
      const tenseJitter = Math.sin(t * 30) * 1.5;
      const leftTarget = { x: pelvis.x - 26, y: pelvis.y - 10 + tenseJitter };
      const rightTarget = { x: pelvis.x + 28, y: pelvis.y - 10 - tenseJitter };

      const leftArmIK = solve2BoneIK(shoulders, leftTarget, this.upperArmLen, this.lowerArmLen, -1);
      const rightArmIK = solve2BoneIK(shoulders, rightTarget, this.upperArmLen, this.lowerArmLen, 1);
      leftElbow = leftArmIK.joint;
      leftHand = leftArmIK.end;
      rightElbow = rightArmIK.joint;
      rightHand = rightArmIK.end;
    } else if (this.state === 'SHOOT') {
      // Right arm aims revolver
      const armDist = this.upperArmLen + this.lowerArmLen - 4;
      const angle = this.aimAngle;
      const rightTarget = {
        x: shoulders.x + Math.cos(angle) * armDist - this.shootRecoil * 12,
        y: shoulders.y + Math.sin(angle) * armDist - this.shootRecoil * 6,
      };
      const rightArmIK = solve2BoneIK(shoulders, rightTarget, this.upperArmLen, this.lowerArmLen, 1);
      rightElbow = rightArmIK.joint;
      rightHand = rightArmIK.end;

      // Left arm balance
      const leftTarget = { x: shoulders.x - 22, y: shoulders.y + 48 };
      const leftArmIK = solve2BoneIK(shoulders, leftTarget, this.upperArmLen, this.lowerArmLen, -1);
      leftElbow = leftArmIK.joint;
      leftHand = leftArmIK.end;
    } else if (this.state === 'WALK' || this.state === 'RUN') {
      // Natural pendulum arm swing in opposition to legs:
      // Contralateral arm swing (in exact opposition to legs)
      // When Right leg is forward, Right arm is backward and Left arm is forward!
      const walkFreq = this.state === 'RUN' ? 10.5 : 6.8;
      const swingAmp = this.state === 'RUN' ? 0.60 : 0.40;
      const gaitPhase = (t * walkFreq) % (Math.PI * 2);

      // Swing angles (positive = forward, negative = backward)
      const rightSwing = -Math.cos(gaitPhase) * swingAmp;
      const leftSwing = Math.cos(gaitPhase) * swingAmp;

      // Calculate arm joints with natural elbow flexion
      const calcArmJoints = (swing: number) => {
        // Shoulder angle (downward is 0, forward is +swing)
        const upperAngle = swing;
        const elbow: Vector2D = {
          x: shoulders.x + Math.sin(upperAngle) * this.upperArmLen,
          y: shoulders.y + Math.cos(upperAngle) * this.upperArmLen,
        };

        // Natural elbow bend: forward swing flexes elbow forward/upward, backward swing stays relaxed
        const elbowFlex = swing > 0 ? 0.25 + swing * 0.75 : 0.10;
        const forearmAngle = upperAngle + elbowFlex;

        const hand: Vector2D = {
          x: elbow.x + Math.sin(forearmAngle) * this.lowerArmLen,
          y: elbow.y + Math.cos(forearmAngle) * this.lowerArmLen,
        };

        return { elbow, hand };
      };

      const leftArm = calcArmJoints(leftSwing);
      const rightArm = calcArmJoints(rightSwing);
      leftElbow = leftArm.elbow;
      leftHand = leftArm.hand;
      rightElbow = rightArm.elbow;
      rightHand = rightArm.hand;
    } else {
      // IDLE: relaxed arms hanging at sides with subtle breathing
      const leftAngle = -0.32 + Math.sin(t * 1.5) * 0.02;
      const rightAngle = 0.32 - Math.sin(t * 1.5) * 0.02;

      leftElbow = {
        x: shoulders.x + Math.sin(leftAngle) * this.upperArmLen,
        y: shoulders.y + Math.cos(leftAngle) * this.upperArmLen,
      };
      leftHand = {
        x: leftElbow.x + Math.sin(leftAngle - 0.1) * this.lowerArmLen,
        y: leftElbow.y + Math.cos(leftAngle - 0.1) * this.lowerArmLen,
      };

      rightElbow = {
        x: shoulders.x + Math.sin(rightAngle) * this.upperArmLen,
        y: shoulders.y + Math.cos(rightAngle) * this.upperArmLen,
      };
      rightHand = {
        x: rightElbow.x + Math.sin(rightAngle + 0.1) * this.lowerArmLen,
        y: rightElbow.y + Math.cos(rightAngle + 0.1) * this.lowerArmLen,
      };
    }

    // Draw Back Leg (Left Leg)
    const leftHip: Vector2D = { x: pelvis.x - 5, y: pelvis.y };
    this.renderLeg(ctx, leftHip, leftLegIK.joint, leftLegIK.end, leftFootEnd, this.id + 1);

    // Draw Back Arm (Left Arm)
    this.renderArm(ctx, shoulders, leftElbow, leftHand, this.id + 2, false);

    // --- TORSO (Egg / Vertical Oval or Mabel Dress) ---
    if (this.type === 'MABEL') {
      this.renderMabelDress(ctx, torsoTop, pelvis, isShadow);
    } else {
      // Cuttlas / Outlaw Torso: Long vertical white oval with black outline
      if (!isShadow) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
      }
      boilEngine.drawEllipse(
        ctx,
        torsoMid.x,
        torsoMid.y,
        this.torsoWidth * 0.5,
        this.torsoHeight * 0.5,
        torsoLean,
        this.id + 3,
        true,
        true
      );
    }

    // --- DUAL HOLSTERS (L-shaped angular holsters on hips) ---
    if (this.type !== 'MABEL') {
      this.renderHolsters(ctx, pelvis, isShadow);
    }

    // --- HEAD ---
    if (!isShadow) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
    }
    boilEngine.drawEllipse(
      ctx,
      headCenter.x,
      headCenter.y,
      this.headRadiusX,
      this.headRadiusY,
      torsoLean + headTilt,
      this.id + 4,
      true,
      true
    );

    // Mabel floating wavy hair lines
    if (this.type === 'MABEL') {
      this.renderMabelHair(ctx, headCenter, t);
    }

    // Outlaw eye mask
    if (this.type === 'OUTLAW' && !isShadow) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(headCenter.x - 12, headCenter.y - 4, 24, 6);
    }

    // --- HAT NODE (Independent Transform with Spring Physics) ---
    if (this.hatEquipped && this.type !== 'MABEL') {
      this.renderHat(ctx, headCenter, torsoLean + headTilt, isShadow);
    }

    // --- FRONT LEG (Right Leg) ---
    const rightHip: Vector2D = { x: pelvis.x + 5, y: pelvis.y };
    this.renderLeg(ctx, rightHip, rightLegIK.joint, rightLegIK.end, rightFootEnd, this.id + 5);

    // --- FRONT ARM & REVOLVER (Right Arm) ---
    const isHoldingRevolver = this.state === 'SHOOT' || (this.state === 'STANDOFF' && this.stateTimer > 0.8);
    this.renderArm(ctx, shoulders, rightElbow, rightHand, this.id + 6, isHoldingRevolver);

    ctx.restore();
  }

  /**
   * Render 2-segment stick leg + horizontal foot
   */
  private renderLeg(
    ctx: CanvasRenderingContext2D,
    hip: Vector2D,
    knee: Vector2D,
    ankle: Vector2D,
    foot: Vector2D,
    id: number
  ) {
    // Thigh
    boilEngine.drawLine(ctx, hip.x, hip.y, knee.x, knee.y, id, false);
    // Calf
    boilEngine.drawLine(ctx, knee.x, knee.y, ankle.x, ankle.y, id + 1, false);
    // Foot: horizontal segment
    boilEngine.drawLine(ctx, ankle.x, ankle.y, foot.x, foot.y, id + 2, false);
  }

  /**
   * Render 2-segment stick arm + 3 stick fingers or revolver
   */
  private renderArm(
    ctx: CanvasRenderingContext2D,
    shoulder: Vector2D,
    elbow: Vector2D,
    hand: Vector2D,
    id: number,
    holdingRevolver: boolean
  ) {
    // Upper arm
    boilEngine.drawLine(ctx, shoulder.x, shoulder.y, elbow.x, elbow.y, id, false);
    // Forearm
    boilEngine.drawLine(ctx, elbow.x, elbow.y, hand.x, hand.y, id + 1, false);

    if (holdingRevolver) {
      // Draw Western Revolver in hand
      this.renderRevolver(ctx, hand, this.aimAngle);
    } else {
      // 3 stick fingers open (Calpurnio hand style: arrow-like 3 fingers)
      const armAngle = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
      const fingerLen = 14;

      // Center finger
      const f1x = hand.x + Math.cos(armAngle) * fingerLen;
      const f1y = hand.y + Math.sin(armAngle) * fingerLen;
      boilEngine.drawLine(ctx, hand.x, hand.y, f1x, f1y, id + 3, false);

      // Left finger
      const f2x = hand.x + Math.cos(armAngle - 0.45) * (fingerLen * 0.9);
      const f2y = hand.y + Math.sin(armAngle - 0.45) * (fingerLen * 0.9);
      boilEngine.drawLine(ctx, hand.x, hand.y, f2x, f2y, id + 4, false);

      // Right finger
      const f3x = hand.x + Math.cos(armAngle + 0.45) * (fingerLen * 0.9);
      const f3y = hand.y + Math.sin(armAngle + 0.45) * (fingerLen * 0.9);
      boilEngine.drawLine(ctx, hand.x, hand.y, f3x, f3y, id + 5, false);
    }
  }

  /**
   * Render Angular L-shaped Holsters on hips
   */
  private renderHolsters(ctx: CanvasRenderingContext2D, pelvis: Vector2D, isShadow: boolean) {
    const bounce = this.holsterBounce;

    // Right Holster (Front) - prominent L-shape
    const hx = pelvis.x + 10;
    const hy = pelvis.y - 12 + bounce;

    const holsterPts = [
      { x: hx, y: hy },
      { x: hx + 18, y: hy + 4 },
      { x: hx + 14, y: hy + 26 },
      { x: hx + 2, y: hy + 24 },
      { x: hx + 4, y: hy + 12 },
      { x: hx - 2, y: hy + 8 },
    ];

    if (!isShadow) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
    }
    boilEngine.drawPoly(ctx, holsterPts, this.id + 8, true, true, true);

    // Gun grip handle sticking out if not shooting
    if (this.state !== 'SHOOT' && !isShadow) {
      boilEngine.drawLine(ctx, hx + 4, hy + 2, hx + 14, hy - 8, this.id + 9, false);
    }
  }

  /**
   * Render Hat (Brim line + rounded crown with spring physics)
   */
  private renderHat(
    ctx: CanvasRenderingContext2D,
    headCenter: Vector2D,
    baseTilt: number,
    isShadow: boolean
  ) {
    ctx.save();
    // Hat anchor sits right atop head oval
    const hatBaseY = headCenter.y - this.headRadiusY + 3;
    ctx.translate(headCenter.x + this.hatOffset.x, hatBaseY + this.hatOffset.y);
    ctx.rotate(baseTilt + this.hatOffset.rot);

    if (!isShadow) {
      ctx.fillStyle = this.type === 'OUTLAW' ? '#222222' : '#FFFFFF';
      ctx.strokeStyle = '#000000';
    }

    const brimWidth = 56;
    const crownWidth = 26;
    const crownHeight = 22;

    // 1. Rounded Crown (semi-oval dome)
    boilEngine.drawEllipse(
      ctx,
      0,
      -crownHeight * 0.7,
      crownWidth * 0.5,
      crownHeight * 0.7,
      0,
      this.id + 10,
      true,
      true
    );

    // 2. Flat Brim Line (prominent horizontal segment)
    boilEngine.drawLine(ctx, -brimWidth * 0.5, 0, brimWidth * 0.5, 0, this.id + 11, true);

    ctx.restore();
  }

  /**
   * Render Mabel's classic blue dress with harmonic cloth wave
   */
  private renderMabelDress(
    ctx: CanvasRenderingContext2D,
    torsoTop: Vector2D,
    pelvis: Vector2D,
    isShadow: boolean
  ) {
    const wave = this.dressWave;
    const topW = 14;
    const botW = 46;
    const hemY = pelvis.y + 12;

    const dressPts = [
      { x: torsoTop.x - topW * 0.5, y: torsoTop.y + 2 },
      { x: torsoTop.x + topW * 0.5, y: torsoTop.y + 2 },
      { x: pelvis.x + botW * 0.5 + wave * 0.5, y: hemY },
      { x: pelvis.x + botW * 0.15 + wave * 0.8, y: hemY + 3 },
      { x: pelvis.x - botW * 0.15 + wave * 0.8, y: hemY + 2 },
      { x: pelvis.x - botW * 0.5 + wave * 0.5, y: hemY },
    ];

    if (!isShadow) {
      ctx.fillStyle = '#536895'; // Mabel signature blue-purple dress
      ctx.strokeStyle = '#000000';
    }
    boilEngine.drawPoly(ctx, dressPts, this.id + 14, true, true, true);
  }

  /**
   * Render Mabel's floating wavy hair lines on head
   */
  private renderMabelHair(ctx: CanvasRenderingContext2D, head: Vector2D, t: number) {
    for (let i = 0; i < 4; i++) {
      const startX = head.x - 8 + i * 5;
      const startY = head.y - this.headRadiusY + 2;
      const hx = startX + Math.sin(t * 4 + i * 1.2) * 5;
      const hy = startY - 14 - i * 3;
      boilEngine.drawLine(ctx, startX, startY, hx, hy, this.id + 20 + i, true);
    }
  }

  /**
   * Render Geometric Western Revolver
   */
  private renderRevolver(ctx: CanvasRenderingContext2D, hand: Vector2D, angle: number) {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle);

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;

    // Barrel
    ctx.fillRect(0, -3, 22, 6);
    ctx.strokeRect(0, -3, 22, 6);

    // Grip
    ctx.beginPath();
    ctx.moveTo(2, 3);
    ctx.lineTo(-4, 15);
    ctx.lineTo(4, 16);
    ctx.lineTo(8, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render tension radial ink lines around body during Western Standoff
   */
  private renderTensionLines(ctx: CanvasRenderingContext2D) {
    const t = this.animTime;
    const numLines = 8;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;

    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2 + Math.sin(t * 12) * 0.1;
      const rInner = 68 + (i % 2) * 10 + Math.sin(t * 25 + i) * 6;
      const rOuter = rInner + 18 + Math.cos(t * 20 + i) * 8;

      const x1 = Math.cos(angle) * rInner;
      const y1 = - (this.thighLen + this.calfLen + this.torsoHeight * 0.5) + Math.sin(angle) * rInner;
      const x2 = Math.cos(angle) * rOuter;
      const y2 = - (this.thighLen + this.calfLen + this.torsoHeight * 0.5) + Math.sin(angle) * rOuter;

      boilEngine.drawLine(ctx, x1, y1, x2, y2, this.id + 50 + i, false);
    }
  }
}
