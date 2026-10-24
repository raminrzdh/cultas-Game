/**
 * Calpurnio Game World & Entities Engine
 * Handles Desert Cacti, Tumbleweeds, Alien 37 UFO, Comic Explosions,
 * Bullet physics, Standoff Duels, and Existential Speech Bubbles.
 */

import { CharacterRig } from './rig';
import { HorseRig } from './horse';
import { boilEngine } from './boil';
import { sound } from './audio';
import { Language, translations } from './i18n';

export type SceneMode = 'DESERT' | 'DUEL' | 'ALIEN' | 'MABEL';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'SMOKE' | 'SPARK' | 'COMIC_TEXT' | 'HEART';
  text?: string;
  rot?: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  fromPlayer: boolean;
}

export interface Tumbleweed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rot: number;
  rotSpeed: number;
}

export interface Cactus {
  x: number;
  height: number;
  arms: Array<{ y: number; dir: number; len: number }>;
}

export interface ShootableBottle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  hitCount: number;
}

export class WorldManager {
  public scene: SceneMode = 'DESERT';
  public groundY: number = 480;
  public cameraX: number = 0;

  // Entities
  public player: CharacterRig;
  public horse: HorseRig;
  public isMounted: boolean = false;
  public outlaw: CharacterRig | null = null;
  public mabel: CharacterRig | null = null;

  // UFO & Alien 37
  public ufo: {
    x: number;
    y: number;
    targetY: number;
    vx: number;
    beamActive: boolean;
    beamProgress: number;
  } = {
    x: -200,
    y: 160,
    targetY: 160,
    vx: 80,
    beamActive: false,
    beamProgress: 0,
  };

  // Environment
  public cacti: Cactus[] = [];
  public tumbleweeds: Tumbleweed[] = [];
  public bottles: ShootableBottle[] = [];
  public particles: Particle[] = [];
  public bullets: Bullet[] = [];

  // Language support ('en' | 'fa')
  public language: Language = 'fa';

  // Western Duel State Machine
  public duelState: 'IDLE' | 'STANDOFF_WAIT' | 'DRAW_READY' | 'PLAYER_WON' | 'PLAYER_LOST' | 'FOUL' = 'IDLE';
  public duelTimer: number = 0;
  public duelSignalTime: number = 0;
  public reactionTimeMs: number = 0;
  public winStreak: number = 0;
  public bestReactionMs: number = 999;
  public duelMessage: string = '';

  // Existential Speech Bubble
  public currentQuote: string = '';
  public quoteTimer: number = 0;
  public showQuoteBubble: boolean = false;

  constructor(groundY: number = 480, lang: Language = 'fa') {
    this.groundY = groundY;
    this.language = lang;
    this.player = new CharacterRig('CUTTLAS', 100);
    this.player.y = groundY;
    this.player.x = 200;

    this.horse = new HorseRig(this.player.x + 100, groundY);
    this.currentQuote = translations[this.language].quotes[0];

    this.initEnvironment();
  }

  public toggleMount() {
    this.isMounted = !this.isMounted;
    if (this.isMounted) {
      this.horse.x = this.player.x;
      this.horse.y = this.player.y;
      this.horse.facing = this.player.facing;
      this.horse.rearUp();
      this.createComicBurst(
        this.horse.x + 30 * this.horse.facing,
        this.horse.y - 150,
        this.language === 'fa' ? 'شِیهه!' : '¡HIIIII!'
      );
    } else {
      this.player.x = this.horse.x - 36 * this.horse.facing;
      this.player.y = this.groundY;
      this.player.facing = this.horse.facing;
      this.player.setState('IDLE');
    }
  }

  public spawnDust(x: number, y: number) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y - 2,
        vx: (Math.random() - 0.5) * 35 - this.horse.facing * 35,
        vy: -Math.random() * 25 - 8,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        size: 8 + Math.random() * 6,
        type: 'SMOKE',
      });
    }
  }

  public setLanguage(lang: Language) {
    this.language = lang;
    const quotes = translations[this.language].quotes;
    this.currentQuote = quotes[Math.floor(Math.random() * quotes.length)];
    if (this.duelState === 'STANDOFF_WAIT') {
      this.duelMessage = translations[this.language].duel.ready;
    } else if (this.duelState === 'DRAW_READY') {
      this.duelMessage = translations[this.language].duel.fire;
    }
  }

  public setScene(newScene: SceneMode) {
    this.scene = newScene;
    if (newScene === 'DUEL') {
      this.startDuelEncounter();
    } else {
      if (this.duelState !== 'IDLE') {
        this.duelState = 'IDLE';
      }
    }

    if (newScene === 'MABEL') {
      if (!this.mabel) {
        this.mabel = new CharacterRig('MABEL', 300);
      }
      this.mabel.x = this.player.x + 160;
      this.mabel.y = this.groundY;
      this.mabel.facing = -1;
      this.mabel.setState('IDLE');
    }

    if (newScene === 'ALIEN') {
      this.ufo.x = this.player.x - 100;
      this.ufo.y = 140;
      this.ufo.beamActive = true;
    } else {
      this.ufo.beamActive = false;
    }
  }

  public initEnvironment() {
    // Generate scattered Calpurnio cacti
    this.cacti = [];
    for (let i = -12; i <= 24; i++) {
      if (Math.abs(i) < 2) continue; // Leave central clearing
      const cx = i * 260 + (Math.sin(i * 13) * 60);
      const arms: Array<{ y: number; dir: number; len: number }> = [];
      if (Math.random() > 0.3) {
        arms.push({ y: 40 + Math.random() * 30, dir: -1, len: 30 + Math.random() * 20 });
      }
      if (Math.random() > 0.4) {
        arms.push({ y: 60 + Math.random() * 30, dir: 1, len: 30 + Math.random() * 20 });
      }
      this.cacti.push({
        x: cx,
        height: 90 + Math.abs(Math.sin(i * 7)) * 70,
        arms,
      });
    }

    // Tumbleweeds
    this.tumbleweeds = [
      { x: 400, y: this.groundY - 18, vx: -50, vy: 0, radius: 20, rot: 0, rotSpeed: -3 },
      { x: 800, y: this.groundY - 24, vx: -65, vy: 0, radius: 24, rot: 0, rotSpeed: -4 },
      { x: -300, y: this.groundY - 16, vx: -40, vy: 0, radius: 18, rot: 0, rotSpeed: -2.5 },
    ];

    // Cans / Bottles
    this.bottles = [
      { x: 340, y: this.groundY - 18, vx: 0, vy: 0, rot: 0, vRot: 0, hitCount: 0 },
      { x: 580, y: this.groundY - 18, vx: 0, vy: 0, rot: 0, vRot: 0, hitCount: 0 },
    ];
  }

  /**
   * Start Quick-Draw Duel
   */
  public startDuelEncounter() {
    this.duelState = 'STANDOFF_WAIT';
    this.duelTimer = 0;
    this.duelSignalTime = 2.0 + Math.random() * 2.2; // 2.0 to 4.2 seconds delay
    this.reactionTimeMs = 0;
    this.duelMessage = translations[this.language].duel.ready;

    // Position Outlaw across from Cuttlas
    if (!this.outlaw) {
      this.outlaw = new CharacterRig('OUTLAW', 200);
    }
    this.outlaw.x = this.player.x + 360;
    this.outlaw.y = this.groundY;
    this.outlaw.facing = -1;
    this.outlaw.setState('STANDOFF');
    this.outlaw.defeatRot = 0;

    this.player.setState('STANDOFF');
    sound.playWesternChord();
  }

  /**
   * Player fires revolver
   */
  public playerFire() {
    // If in duel wait phase: foul!
    if (this.duelState === 'STANDOFF_WAIT') {
      this.duelState = 'FOUL';
      this.duelMessage = translations[this.language].duel.foul;
      this.winStreak = 0;
      sound.playGunshot();
      this.createComicBurst(this.player.x + 20 * this.player.facing, this.player.y - 80, this.language === 'fa' ? 'خطا!' : 'FOUL!');
      return;
    }

    // If signal was ready: record reaction time!
    if (this.duelState === 'DRAW_READY') {
      this.reactionTimeMs = Math.round((this.duelTimer - this.duelSignalTime) * 1000);
      if (this.reactionTimeMs < this.bestReactionMs) {
        this.bestReactionMs = this.reactionTimeMs;
      }
      this.winStreak++;
      this.duelState = 'PLAYER_WON';
      this.duelMessage = translations[this.language].duel.won(this.reactionTimeMs);

      // Outlaw defeated
      if (this.outlaw) {
        this.outlaw.setState('DEFEAT');
        sound.playDefeat();
        this.createComicBurst(this.outlaw.x, this.outlaw.y - 90, this.language === 'fa' ? 'آخ!' : '¡AUGH!');
      }
    }

    // Normal player shot
    this.player.setState('SHOOT');
    this.player.shootRecoil = 1.0;
    sound.playGunshot();

    const activeX = this.isMounted ? this.horse.x : this.player.x;
    const activeY = this.isMounted ? this.horse.y - 40 : this.player.y;
    const activeFacing = this.isMounted ? this.horse.facing : this.player.facing;

    const spawnX = activeX + Math.cos(this.player.aimAngle) * 55 * activeFacing;
    const spawnY = activeY - 90 + Math.sin(this.player.aimAngle) * 55;
    const speed = 1200;

    this.bullets.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(this.player.aimAngle) * speed * activeFacing,
      vy: Math.sin(this.player.aimAngle) * speed,
      life: 0.9,
      fromPlayer: true,
    });

    // Muzzle flash particle
    this.particles.push({
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      life: 0.08,
      maxLife: 0.08,
      size: 26,
      type: 'SPARK',
    });

    // Comic "BANG!"
    const comicWords = ['BANG!', 'PUM!', 'POW!'];
    const word = comicWords[Math.floor(Math.random() * comicWords.length)];
    this.createComicBurst(spawnX + 25 * this.player.facing, spawnY - 20, word);

    // Smoke rings
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: spawnX,
        y: spawnY,
        vx: (Math.random() * 40 - 20) + this.player.facing * 30,
        vy: -Math.random() * 30 - 10,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 8 + Math.random() * 6,
        type: 'SMOKE',
      });
    }
  }

  public createComicBurst(x: number, y: number, text: string) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 15,
      vy: -35,
      life: 0.8,
      maxLife: 0.8,
      size: 22,
      type: 'COMIC_TEXT',
      text,
      rot: (Math.random() - 0.5) * 0.3,
    });
  }

  /**
   * Main Physics & Entities Update
   */
  public update(dt: number) {
    // 1. Update Characters
    this.player.update(dt);
    if (this.outlaw) this.outlaw.update(dt);
    if (this.mabel) this.mabel.update(dt);

    // 2. Camera follow active entity (horse or player) smoothly
    const activeX = this.isMounted ? this.horse.x : this.player.x;
    const targetCamX = activeX - 380;
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 6);

    // 3. Existential Quote Timer
    this.quoteTimer += dt;
    const isStopped = this.isMounted
      ? Math.abs(this.horse.vx) < 5
      : this.player.state === 'IDLE' && Math.abs(this.player.vx) < 5;

    if (isStopped) {
      if (this.quoteTimer > 6.5) {
        this.showQuoteBubble = true;
        if (this.quoteTimer > 12) {
          this.quoteTimer = 0;
          const quotes = translations[this.language].quotes;
          this.currentQuote = quotes[Math.floor(Math.random() * quotes.length)];
        }
      }
    } else {
      this.showQuoteBubble = false;
      if (this.quoteTimer > 10) this.quoteTimer = 4;
    }

    // 4. Duel State Logic
    if (this.duelState === 'STANDOFF_WAIT') {
      this.duelTimer += dt;
      if (this.duelTimer >= this.duelSignalTime) {
        this.duelState = 'DRAW_READY';
        this.duelMessage = translations[this.language].duel.fire;
        sound.playDrawCue();
      }
    } else if (this.duelState === 'DRAW_READY') {
      this.duelTimer += dt;
      // Outlaw reaction AI (triggers shot after ~400ms)
      if (this.duelTimer - this.duelSignalTime > 0.42 && this.duelState === 'DRAW_READY') {
        this.duelState = 'PLAYER_LOST';
        this.duelMessage = translations[this.language].duel.tooSlow;
        this.winStreak = 0;
        if (this.outlaw) {
          this.outlaw.setState('SHOOT');
          sound.playGunshot();
          this.createComicBurst(this.outlaw.x - 30, this.outlaw.y - 80, '¡BANG!');
        }
        this.player.setState('DEFEAT');
        sound.playDefeat();
      }
    }

    // 5. Update Bullets & Collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Check hit against Outlaw
      if (b.fromPlayer && this.outlaw && this.outlaw.state !== 'DEFEAT') {
        const dx = b.x - this.outlaw.x;
        const dy = b.y - (this.outlaw.y - 70);
        if (Math.abs(dx) < 25 && Math.abs(dy) < 70) {
          this.outlaw.setState('DEFEAT');
          sound.playDefeat();
          this.createComicBurst(this.outlaw.x, this.outlaw.y - 90, '¡POW!');
          b.life = 0;
        }
      }

      // Check hit against bottles
      for (const bottle of this.bottles) {
        const dx = b.x - bottle.x;
        const dy = b.y - bottle.y;
        if (Math.abs(dx) < 18 && Math.abs(dy) < 24) {
          bottle.vx = (b.vx > 0 ? 1 : -1) * (180 + Math.random() * 100);
          bottle.vy = -280 - Math.random() * 120;
          bottle.vRot = (Math.random() - 0.5) * 16;
          bottle.hitCount++;
          sound.playRicochet();
          this.createComicBurst(bottle.x, bottle.y - 20, '¡CLINK!');
          b.life = 0;
        }
      }

      // Check hit against tumbleweeds
      for (const tw of this.tumbleweeds) {
        const dx = b.x - tw.x;
        const dy = b.y - tw.y;
        if (Math.sqrt(dx * dx + dy * dy) < tw.radius) {
          tw.vx += (b.vx > 0 ? 1 : -1) * 160;
          tw.vy -= 140;
          sound.playRicochet();
          this.createComicBurst(tw.x, tw.y - 20, '¡SWISH!');
          b.life = 0;
        }
      }

      if (b.life <= 0 || b.y > this.groundY + 10) {
        this.bullets.splice(i, 1);
      }
    }

    // 6. Update Shootable Bottles
    for (const bottle of this.bottles) {
      bottle.x += bottle.vx * dt;
      bottle.y += bottle.vy * dt;
      bottle.rot += bottle.vRot * dt;
      bottle.vy += 800 * dt; // gravity

      if (bottle.y >= this.groundY - 14) {
        bottle.y = this.groundY - 14;
        bottle.vy = -bottle.vy * 0.45;
        bottle.vx *= 0.8;
        bottle.vRot *= 0.6;
        if (Math.abs(bottle.vy) < 30) bottle.vy = 0;
      }
    }

    // 7. Update Tumbleweeds
    for (const tw of this.tumbleweeds) {
      tw.x += tw.vx * dt;
      tw.y += tw.vy * dt;
      tw.rot += tw.rotSpeed * dt;

      // Ground bounce
      if (tw.y >= this.groundY - tw.radius) {
        tw.y = this.groundY - tw.radius;
        tw.vy = -Math.abs(tw.vx) * 0.15;
      } else {
        tw.vy += 500 * dt; // gravity
      }

      // Wrap around world
      if (tw.x < this.player.x - 1200) {
        tw.x = this.player.x + 1200;
      } else if (tw.x > this.player.x + 1200) {
        tw.x = this.player.x - 1200;
      }
    }

    // 8. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 9. Update UFO & Alien 37
    if (this.scene === 'ALIEN') {
      sound.setUFOSound(true, 0.4);
      this.ufo.x += this.ufo.vx * dt;
      this.ufo.y += Math.sin(this.ufo.x * 0.015) * 0.8;

      // Turn around if too far from player
      if (this.ufo.x > this.player.x + 600) {
        this.ufo.vx = -Math.abs(this.ufo.vx);
      } else if (this.ufo.x < this.player.x - 600) {
        this.ufo.vx = Math.abs(this.ufo.vx);
      }

      // Tractor beam lifts nearby tumbleweeds
      for (const tw of this.tumbleweeds) {
        const dx = Math.abs(tw.x - this.ufo.x);
        if (dx < 60 && tw.y > this.ufo.y + 40) {
          tw.vy = -120;
          tw.vx *= 0.9;
        }
      }
    } else {
      sound.setUFOSound(false);
    }
  }

  /**
   * Render World Background, Horizon, Scenery, and Entities
   */
  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();

    // 1. Scene Background Color
    let bgColor = '#F5C78E'; // Desert Ochre
    if (this.scene === 'DUEL') bgColor = '#B5C642'; // Duel Green
    if (this.scene === 'ALIEN') bgColor = '#1C4568'; // Deep Space Blue
    if (this.scene === 'MABEL') bgColor = '#DE8598'; // Romantic Pink

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Apply Camera Transform
    ctx.translate(-this.cameraX, 0);

    // 2. Parallax Backdrop Elements
    if (this.scene === 'ALIEN') {
      this.renderNightSky(ctx, width);
    } else {
      this.renderSunAndDistantMesa(ctx, width);
    }

    // 3. Ground Line (Thick black Calpurnio baseline)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    boilEngine.drawLine(
      ctx,
      this.cameraX - 100,
      this.groundY,
      this.cameraX + width + 100,
      this.groundY,
      999,
      true
    );

    // 4. Render Cacti
    this.renderCacti(ctx);

    // 5. Render Bottles
    this.renderBottles(ctx);

    // 6. Render Tumbleweeds
    this.renderTumbleweeds(ctx);

    // 7. Render UFO (if Alien Scene)
    if (this.scene === 'ALIEN') {
      this.renderUFO(ctx);
    }

    // 8. Render Mabel (if Mabel Scene)
    if (this.scene === 'MABEL' && this.mabel) {
      this.mabel.render(ctx);
    }

    // 9. Render Outlaw (if Duel Scene)
    if (this.scene === 'DUEL' && this.outlaw) {
      this.outlaw.render(ctx);
    }

    // 10. Render Horse and Player Cuttlas
    if (this.isMounted) {
      this.horse.render(ctx, true);
    } else {
      this.horse.render(ctx, false);
      this.player.render(ctx);
    }

    // 11. Render Bullets
    ctx.fillStyle = '#000000';
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Bullet trail line
      ctx.lineWidth = 2.5;
      boilEngine.drawLine(ctx, b.x, b.y, b.x - b.vx * 0.03, b.y - b.vy * 0.03, 1500, false);
    }

    // 12. Render Particles & Comic Bursts
    this.renderParticles(ctx);

    // 13. Render Existential Speech Bubble
    if (this.showQuoteBubble) {
      this.renderQuoteBubble(ctx);
    }

    ctx.restore();
  }

  private renderSunAndDistantMesa(ctx: CanvasRenderingContext2D, width: number) {
    // High noon sun
    const sunX = this.cameraX + width * 0.75;
    const sunY = 90;

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4.5;
    boilEngine.drawEllipse(ctx, sunX, sunY, 32, 32, 0, 777, true, true);

    // Sun rays
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x1 = sunX + Math.cos(a) * 44;
      const y1 = sunY + Math.sin(a) * 44;
      const x2 = sunX + Math.cos(a) * 60;
      const y2 = sunY + Math.sin(a) * 60;
      boilEngine.drawLine(ctx, x1, y1, x2, y2, 780 + i, false);
    }

    // Distant minimalist Western mesa line
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 3;
    const mesaStartX = this.cameraX - 100;
    boilEngine.drawLine(ctx, mesaStartX, this.groundY - 90, mesaStartX + 400, this.groundY - 90, 800, false);
    boilEngine.drawLine(ctx, mesaStartX + 400, this.groundY - 90, mesaStartX + 460, this.groundY, 801, false);
    ctx.restore();
  }

  private renderNightSky(ctx: CanvasRenderingContext2D, width: number) {
    ctx.save();
    // Minimalist stars
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 35; i++) {
      const sx = (this.cameraX * 0.1 + i * 85) % (width + 400) + this.cameraX - 200;
      const sy = 40 + ((i * 37) % 240);
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0) ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crescent Moon
    const mx = this.cameraX + width * 0.8;
    const my = 80;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';
    boilEngine.drawEllipse(ctx, mx, my, 28, 28, 0, 950, true, true);
    ctx.fillStyle = '#1C4568';
    boilEngine.drawEllipse(ctx, mx - 10, my - 6, 24, 24, 0, 951, true, false);
    ctx.restore();
  }

  private renderCacti(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 5;

    for (let i = 0; i < this.cacti.length; i++) {
      const c = this.cacti[i];
      if (c.x < this.cameraX - 200 || c.x > this.cameraX + 1200) continue;

      const topY = this.groundY - c.height;

      // Main trunk
      boilEngine.drawLine(ctx, c.x, this.groundY, c.x, topY + 12, 1000 + i * 10, false);
      // Top round dome
      boilEngine.drawEllipse(ctx, c.x, topY + 10, 8, 8, 0, 1001 + i * 10, true, true);

      // Saguaro arms
      for (let a = 0; a < c.arms.length; a++) {
        const arm = c.arms[a];
        const armBaseY = this.groundY - arm.y;
        const armTurnX = c.x + arm.dir * arm.len;
        const armTopY = armBaseY - 32;

        boilEngine.drawLine(ctx, c.x, armBaseY, armTurnX, armBaseY, 1002 + i * 10 + a * 2, false);
        boilEngine.drawLine(ctx, armTurnX, armBaseY, armTurnX, armTopY, 1003 + i * 10 + a * 2, false);
        boilEngine.drawEllipse(ctx, armTurnX, armTopY, 6, 6, 0, 1004 + i * 10 + a * 2, true, true);
      }
    }
  }

  private renderBottles(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 4;

    for (let i = 0; i < this.bottles.length; i++) {
      const b = this.bottles[i];
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);

      // Bottle body
      ctx.fillRect(-6, -16, 12, 16);
      ctx.strokeRect(-6, -16, 12, 16);
      // Neck
      ctx.fillRect(-3, -24, 6, 8);
      ctx.strokeRect(-3, -24, 6, 8);

      ctx.restore();
    }
  }

  private renderTumbleweeds(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;

    for (let i = 0; i < this.tumbleweeds.length; i++) {
      const tw = this.tumbleweeds[i];
      ctx.save();
      ctx.translate(tw.x, tw.y);
      ctx.rotate(tw.rot);

      // Outer scribble circle
      ctx.beginPath();
      ctx.arc(0, 0, tw.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner chaotic branches (Calpurnio scribble weed)
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        boilEngine.drawLine(
          ctx,
          0,
          0,
          Math.cos(a) * tw.radius * 0.9,
          Math.sin(a) * tw.radius * 0.9,
          2000 + i * 20 + j,
          false
        );
      }
      ctx.restore();
    }
  }

  /**
   * Render Alien 37 in UFO:
   * Classic red saucer UFO (#C8321E), light blue glass dome (#C5DBE6),
   * Alien 37 inside (white oval torso & head + single antenna with circle tip)
   */
  private renderUFO(ctx: CanvasRenderingContext2D) {
    const u = this.ufo;
    ctx.save();
    ctx.translate(u.x, u.y);

    // 1. Tractor Abduction Beam
    if (u.beamActive) {
      ctx.save();
      const beamGrad = ctx.createLinearGradient(0, 20, 0, this.groundY - u.y);
      beamGrad.addColorStop(0, 'rgba(80, 240, 140, 0.45)');
      beamGrad.addColorStop(1, 'rgba(80, 240, 140, 0.05)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-16, 20);
      ctx.lineTo(16, 20);
      ctx.lineTo(90, this.groundY - u.y);
      ctx.lineTo(-90, this.groundY - u.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000000';

    // 2. Landing Struts (3 stick legs)
    boilEngine.drawLine(ctx, -26, 12, -40, 32, 3001, false);
    boilEngine.drawLine(ctx, 26, 12, 40, 32, 3002, false);
    boilEngine.drawLine(ctx, 0, 14, 0, 35, 3003, false);

    // 3. Red Saucer Body (#C8321E)
    ctx.fillStyle = '#C8321E';
    boilEngine.drawEllipse(ctx, 0, 8, 62, 16, 0, 3004, true, true);

    // 4. Glass Dome (#C5DBE6)
    ctx.fillStyle = '#C5DBE6';
    boilEngine.drawEllipse(ctx, 0, -8, 30, 24, 0, 3005, true, true);

    // 5. Alien 37 (sitting inside cockpit)
    // Head & Torso
    ctx.fillStyle = '#FFFFFF';
    boilEngine.drawEllipse(ctx, 0, -10, 11, 15, 0, 3006, true, true);
    // Single antenna: line + circle tip
    boilEngine.drawLine(ctx, 0, -25, 0, -38, 3007, false);
    boilEngine.drawEllipse(ctx, 0, -41, 4, 4, 0, 3008, true, true);
    // Waving stick arm
    const waveArmX = Math.sin(Date.now() * 0.008) * 6;
    boilEngine.drawLine(ctx, 8, -8, 18 + waveArmX, -16, 3009, false);

    ctx.restore();
  }

  /**
   * Render Particles & Comic Pop words
   */
  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (p.type === 'SPARK') {
        // Geometric muzzle flash starburst
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = i % 2 === 0 ? p.size : p.size * 0.45;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'SMOKE') {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife + 0.5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'COMIC_TEXT' && p.text) {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.rot) ctx.rotate(p.rot);

        ctx.font = 'bold 22px "Balsamiq Sans", cursive, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Comic speech/sound bubble
        const textMetrics = ctx.measureText(p.text);
        const w = textMetrics.width + 20;
        const h = 32;

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.fillText(p.text, 0, 1);
        ctx.restore();
      }
    }
  }

  /**
   * Render Existential Comic Speech Bubble above Cuttlas
   */
  private renderQuoteBubble(ctx: CanvasRenderingContext2D) {
    const activeX = this.isMounted ? this.horse.x : this.player.x;
    const activeY = this.isMounted ? this.horse.y - 45 : this.player.y;
    const bubbleX = activeX + 30;
    const bubbleY = activeY - 200;

    ctx.save();
    const isFa = this.language === 'fa';
    ctx.font = isFa
      ? 'bold 15px "Vazirmatn", system-ui, sans-serif'
      : '16px "Balsamiq Sans", cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isFa) {
      ctx.direction = 'rtl';
    } else {
      ctx.direction = 'ltr';
    }

    const maxW = isFa ? 300 : 280;
    const words = this.currentQuote.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(testLine).width > maxW) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const pad = 14;
    const lineH = isFa ? 24 : 22;
    const bubbleW = maxW + pad * 2;
    const bubbleH = lines.length * lineH + pad * 2;

    // Bubble Background (solid white, thick black stroke)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.roundRect(bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 12);
    ctx.fill();
    ctx.stroke();

    // Bubble pointer down to Cuttlas's head
    ctx.beginPath();
    ctx.moveTo(bubbleX - 10, bubbleY + bubbleH / 2 - 2);
    ctx.lineTo(bubbleX - 25, bubbleY + bubbleH / 2 + 16);
    ctx.lineTo(bubbleX + 4, bubbleY + bubbleH / 2 - 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();

    // Line text
    ctx.fillStyle = '#000000';
    lines.forEach((line, idx) => {
      const ly = bubbleY - (lines.length - 1) * (lineH / 2) + idx * lineH;
      ctx.fillText(line, bubbleX, ly);
    });

    ctx.restore();
  }
}
