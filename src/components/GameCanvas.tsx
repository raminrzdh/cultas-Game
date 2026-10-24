/**
 * GameCanvas Component
 * Manages 60 FPS animation loop, canvas resizing, continuous and edge-triggered inputs,
 * mouse aiming, and isolated rendering to prevent React re-renders from choking the canvas.
 */

import React, { useEffect, useRef } from 'react';
import { WorldManager, SceneMode } from '../engine/world';
import { boilEngine } from '../engine/boil';
import { sound } from '../engine/audio';
import { Language } from '../engine/i18n';

interface GameCanvasProps {
  scene: SceneMode;
  onSceneChange: (scene: SceneMode) => void;
  language: Language;
  onDuelUpdate: (duel: {
    state: string;
    message: string;
    reactionMs: number;
    bestMs: number;
    streak: number;
  }) => void;
  onQuoteUpdate: (quote: string) => void;
  boilIntensity: number;
  showSkeletonDebug: boolean;
  isPaused: boolean;
  soundEnabled: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  scene,
  onSceneChange,
  language,
  onDuelUpdate,
  onQuoteUpdate,
  boilIntensity,
  showSkeletonDebug,
  isPaused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<WorldManager | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const lastTimeRef = useRef<number>(performance.now());
  const sceneRef = useRef<SceneMode>(scene);

  sceneRef.current = scene;

  // Sync boil intensity
  useEffect(() => {
    boilEngine.intensity = boilIntensity;
  }, [boilIntensity]);

  // Sync language change
  useEffect(() => {
    if (worldRef.current && worldRef.current.language !== language) {
      worldRef.current.setLanguage(language);
    }
  }, [language]);

  // Sync scene change from props
  useEffect(() => {
    if (worldRef.current && worldRef.current.scene !== scene) {
      worldRef.current.setScene(scene);
    }
  }, [scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize World Manager
    const world = new WorldManager(canvas.height - 110, language);
    worldRef.current = world;
    world.setScene(sceneRef.current);

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      world.groundY = canvas.height - 100;
      world.player.y = world.groundY;
      if (world.outlaw) world.outlaw.y = world.groundY;
      if (world.mabel) world.mabel.y = world.groundY;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Continuous & Edge Input Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid scrolling on space/arrows
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      keysRef.current[e.code] = true;

      // Edge triggers
      if (e.code === 'KeyH') {
        // Signature Hat Tip
        world.player.setState('HAT_TIP');
        sound.playHatTip();
      } else if (e.code === 'KeyQ') {
        // Toggle Quick-Draw Stance or Horse Rear
        if (world.isMounted) {
          world.horse.rearUp();
          world.createComicBurst(
            world.horse.x + 30 * world.horse.facing,
            world.horse.y - 150,
            world.language === 'fa' ? 'شِیهه!' : '¡HIIIII!'
          );
        } else {
          if (world.player.state === 'STANDOFF') {
            world.player.setState('IDLE');
          } else {
            world.player.setState('STANDOFF');
            sound.playWesternChord();
          }
        }
      } else if (e.code === 'KeyR') {
        // Mount / Dismount Horse
        world.toggleMount();
      } else if (e.code === 'KeyJ') {
        // Shoot
        world.playerFire();
      } else if (e.code === 'Digit1') {
        onSceneChange('DESERT');
      } else if (e.code === 'Digit2') {
        onSceneChange('DUEL');
      } else if (e.code === 'Digit3') {
        onSceneChange('ALIEN');
      } else if (e.code === 'Digit4') {
        onSceneChange('MABEL');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleBlur = () => {
      keysRef.current = {};
    };

    // Mouse Aim & Fire
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + world.cameraX;
      const mouseY = e.clientY - rect.top;

      const playerGunX = world.isMounted ? world.horse.x : world.player.x;
      const playerGunY = world.isMounted ? world.horse.y - 100 : world.player.y - 80;

      const dx = mouseX - playerGunX;
      const dy = mouseY - playerGunY;

      // Aim angle
      let angle = Math.atan2(dy, dx);
      const activeFacing = world.isMounted ? world.horse.facing : world.player.facing;
      if (activeFacing === -1) {
        angle = Math.atan2(dy, -dx);
      }
      world.player.aimAngle = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, angle));
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        world.playerFire();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);

    let animId: number;

    // Main 60 FPS Game Loop
    const loop = (timestamp: number) => {
      animId = requestAnimationFrame(loop);

      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 0.05); // Clamped delta time

      if (!isPaused) {
        // Update Line Boil Engine (~10 FPS ink perturbance)
        boilEngine.update(timestamp);

        // Process Continuous Movement
        const keys = keysRef.current;
        const player = world.player;

        if (world.isMounted) {
          // --- HORSE RIDING MOVEMENT & PHYSICS ---
          const horse = world.horse;
          let moveDir = 0;
          if (keys['KeyA'] || keys['ArrowLeft']) moveDir -= 1;
          if (keys['KeyD'] || keys['ArrowRight']) moveDir += 1;

          if (moveDir !== 0) {
            horse.facing = moveDir;
            const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 460 : 340;
            horse.vx = moveDir * speed;
            horse.update(dt, true, moveDir, (dx, dy) => world.spawnDust(dx, dy));
          } else {
            horse.vx = 0;
            horse.update(dt, false, horse.facing);
          }

          // Jump or Rearing up on space
          if ((keys['KeyW'] || keys['Space'] || keys['ArrowUp']) && horse.isGrounded) {
            if (moveDir !== 0) {
              horse.vy = -540;
              horse.isGrounded = false;
              sound.playJump();
            } else if (!horse.isRearing) {
              horse.rearUp();
              world.createComicBurst(
                horse.x + 30 * horse.facing,
                horse.y - 150,
                world.language === 'fa' ? 'شِیهه!' : '¡HIIIII!'
              );
            }
          }

          // Horse gravity
          horse.x += horse.vx * dt;
          horse.y += horse.vy * dt;

          if (!horse.isGrounded) {
            horse.vy += 1200 * dt;
            if (horse.y >= world.groundY) {
              horse.y = world.groundY;
              horse.vy = 0;
              horse.isGrounded = true;
              sound.playLand();
            }
          }

          // Sync player position with horse
          player.x = horse.x;
          player.y = horse.y;
          player.facing = horse.facing;
        } else {
          // --- ON-FOOT WALKING MOVEMENT & PHYSICS ---
          if (player.state !== 'HAT_TIP' && player.state !== 'DEFEAT') {
            let moveDir = 0;
            if (keys['KeyA'] || keys['ArrowLeft']) moveDir -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) moveDir += 1;

            if (moveDir !== 0) {
              player.facing = moveDir;
              const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 280 : 180;
              player.vx = moveDir * speed;
              if (player.state !== 'STANDOFF' && player.state !== 'SHOOT') {
                player.setState(Math.abs(player.vx) > 200 ? 'RUN' : 'WALK');
              }

              // Footstep audio synchronized with exact foot plant
              const walkFreq = keys['ShiftLeft'] || keys['ShiftRight'] ? 10.5 : 6.8;
              const gaitPhase = (player.animTime * walkFreq) % Math.PI;
              if (gaitPhase < dt * walkFreq) {
                sound.playFootstep();
              }
            } else {
              player.vx = 0;
              if (player.state === 'WALK' || player.state === 'RUN') {
                player.setState('IDLE');
              }
            }

            // Jump
            if ((keys['KeyW'] || keys['Space'] || keys['ArrowUp']) && player.isGrounded) {
              player.vy = -540;
              player.isGrounded = false;
              player.setState('JUMP');
              sound.playJump();
            }
          }

          // Apply Player Gravity
          player.x += player.vx * dt;
          player.y += player.vy * dt;

          if (!player.isGrounded) {
            player.vy += 1200 * dt; // gravity
            if (player.y >= world.groundY) {
              player.y = world.groundY;
              player.vy = 0;
              player.isGrounded = true;
              sound.playLand();
              if (player.state === 'JUMP') {
                player.setState(player.vx !== 0 ? 'WALK' : 'IDLE');
              }
            }
          }
        }

        // Update World & Entities
        world.update(dt);

        // Emit callbacks to UI
        onDuelUpdate({
          state: world.duelState,
          message: world.duelMessage,
          reactionMs: world.reactionTimeMs,
          bestMs: world.bestReactionMs === 999 ? 0 : world.bestReactionMs,
          streak: world.winStreak,
        });

        if (world.showQuoteBubble) {
          onQuoteUpdate(world.currentQuote);
        }
      }

      // Render World to Canvas
      world.render(ctx, canvas.width, canvas.height);

      // Skeleton Debug Overlay if enabled
      if (showSkeletonDebug) {
        ctx.save();
        ctx.fillStyle = '#FF0000';
        ctx.font = '12px monospace';
        ctx.fillText(`Player State: ${world.player.state}`, 20, 30);
        ctx.fillText(`Hat Y: ${world.player.hatOffset.y.toFixed(1)} | Rot: ${world.player.hatOffset.rot.toFixed(2)}`, 20, 50);
        ctx.fillText(`Aim Angle: ${(world.player.aimAngle * 57.3).toFixed(1)}°`, 20, 70);
        ctx.fillText(`Boil Seed: ${boilEngine.boilSeed}`, 20, 90);
        ctx.restore();
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isPaused, onDuelUpdate, onQuoteUpdate, onSceneChange, showSkeletonDebug]);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-3 md:p-6">
      {/* Authentic Comic Panel Outer Border */}
      <div className="relative w-full h-full max-w-[1440px] max-h-[820px] rounded-xl overflow-hidden border-[6px] border-black bg-stone-900 shadow-2xl flex flex-col">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair block"
        />
      </div>
    </div>
  );
};
