/**
 * El Bueno de Cuttlas - Procedural Web Audio Engine
 * Zero external audio assets; 100% synthesized sound effects for Western comic aesthetics.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private ufoOsc: OscillatorNode | null = null;
  private ufoGain: GainNode | null = null;
  private horseNeighAudio: HTMLAudioElement | null = null;
  private horseNeighBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.horseNeighAudio = new Audio('/assets/aistudio/audio_167d994a73_96b49751.mp3');
        this.horseNeighAudio.preload = 'auto';
      } catch {
        // Fallback to synthesized audio
      }
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.loadHorseNeighBuffer();
  }

  private loadHorseNeighBuffer() {
    if (!this.ctx || this.horseNeighBuffer) return;
    fetch('/assets/aistudio/audio_167d994a73_96b49751.mp3')
      .then((res) => res.arrayBuffer())
      .then((data) => this.ctx?.decodeAudioData(data))
      .then((buffer) => {
        if (buffer) this.horseNeighBuffer = buffer;
      })
      .catch(() => {
        // Fallback cleanly
      });
  }

  public toggleMute(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled && this.ufoGain) {
      this.ufoGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    return this.enabled;
  }

  /**
   * Classic snappy Western revolver gunshot:
   * Punchy transient click + filtered white noise body + low resonant tail
   */
  public playGunshot() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Noise burst (muzzle explosion)
    const bufferSize = this.ctx.sampleRate * 0.35;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(3200, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(300, t + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    whiteNoise.start(t);

    // 2. Punchy transient thud
    const punchOsc = this.ctx.createOscillator();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(260, t);
    punchOsc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

    const punchGain = this.ctx.createGain();
    punchGain.gain.setValueAtTime(0.8, t);
    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    punchOsc.connect(punchGain);
    punchGain.connect(this.ctx.destination);
    punchOsc.start(t);
    punchOsc.stop(t + 0.16);

    // Random chance of comic ricochet after shot
    if (Math.random() < 0.4) {
      setTimeout(() => this.playRicochet(), 80 + Math.random() * 120);
    }
  }

  /**
   * Classic comic Western bullet ricochet ("Pweee-eww!")
   */
  public playRicochet() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = 1600 + Math.random() * 800;
    const endFreq = 400 + Math.random() * 300;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.28);

    // Add slight frequency wobble for that comic twang
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(30, t);
    lfoGain.gain.setValueAtTime(120, t);
    lfo.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + 0.3);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  /**
   * Cuttlas signature Hat Tip sound: jaunty comic squeak / wood slide
   */
  public playHatTip() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Footstep click/tap for jaunty Calpurnio stride
   */
  public playFootstep() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.04);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * Jump boing spring
   */
  public playJump() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.15);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Landing thud
   */
  public playLand() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Standoff draw cue chime ("DRAW!" / "¡FUEGO!")
   */
  public playDrawCue() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Dramatic high gong / bell
    const freqs = [587.33, 880, 1174.66]; // D5, A5, D6
    freqs.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 1.3);
    });
  }

  /**
   * Dramatic Western duel harmonic chord (Morricone style guitar/whistle note)
   */
  public playWesternChord() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // D minor chord arpeggiated
    const notes = [293.66, 349.23, 440, 587.33]; // D4, F4, A4, D5
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.06;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 1.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 1.7);
    });
  }

  /**
   * Comic defeat spin / hit
   */
  public playDefeat() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  /**
   * UFO theremin vibrato sound for Alien 37
   */
  public setUFOSound(active: boolean, intensity: number = 0.5) {
    if (!this.enabled) {
      if (this.ufoGain) this.ufoGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
      return;
    }
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (active) {
      if (!this.ufoOsc) {
        this.ufoOsc = this.ctx.createOscillator();
        this.ufoGain = this.ctx.createGain();
        this.ufoOsc.type = 'sine';
        this.ufoOsc.frequency.setValueAtTime(680, t);

        // Vibrato
        const vibrato = this.ctx.createOscillator();
        const vibGain = this.ctx.createGain();
        vibrato.frequency.setValueAtTime(5.5, t);
        vibGain.gain.setValueAtTime(35, t);
        vibrato.connect(this.ufoOsc.frequency);
        vibrato.start(t);

        this.ufoGain.gain.setValueAtTime(0, t);
        this.ufoOsc.connect(this.ufoGain);
        this.ufoGain.connect(this.ctx.destination);
        this.ufoOsc.start(t);
      }
      this.ufoGain?.gain.setTargetAtTime(Math.min(0.12, intensity * 0.12), t, 0.1);
    } else if (this.ufoGain) {
      this.ufoGain.gain.setTargetAtTime(0, t, 0.15);
    }
  }

  /**
   * Horse Hoof Gallop Sound ("Clop-clop")
   * Two quick resonant impacts mimicking wooden hooves on desert sand
   */
  public playHorseGallop() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // First hoof beat
    const playHoof = (time: number, freq: number, vol: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + 0.05);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.5, time);
      filter.Q.setValueAtTime(4.0, time);

      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.055);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(time);
      osc.stop(time + 0.06);
    };

    playHoof(t, 380, 0.28);
    playHoof(t + 0.065, 310, 0.22);
  }

  /**
   * Horse Whinny / Neigh Sound ("شِیهه اسب")
   * Plays the user's authentic equine audio recording (/assets/aistudio/audio_167d994a73_96b49751.mp3)
   * with procedural Web Audio synthesis fallback.
   */
  public playHorseNeigh() {
    if (!this.enabled) return;
    this.initCtx();

    // 1. Preferred: High-fidelity Web Audio Buffer
    if (this.ctx && this.horseNeighBuffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.horseNeighBuffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.95;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
        return;
      } catch {
        // Fall through to HTML Audio element
      }
    }

    // 2. HTML5 Audio Element playback
    if (this.horseNeighAudio) {
      try {
        this.horseNeighAudio.currentTime = 0;
        this.horseNeighAudio.volume = 0.95;
        const playPromise = this.horseNeighAudio.play();
        if (playPromise) {
          playPromise.catch(() => {
            this.playSynthesizedNeigh();
          });
          return;
        }
      } catch {
        // Fall through to synthesis
      }
    }

    // 3. Procedural Synthesis Fallback
    this.playSynthesizedNeigh();
  }

  private playSynthesizedNeigh() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // FM Vibrato for the characteristic equine flutter
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Pitch envelope: sweeps up from 650Hz to 1600Hz, then flutters down to 750Hz
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.85);

    // High speed vibrato (16 Hz)
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(16, t);
    lfoGain.gain.setValueAtTime(110, t);
    lfoGain.gain.linearRampToValueAtTime(180, t + 0.35);
    lfoGain.gain.exponentialRampToValueAtTime(10, t + 0.85);

    lfo.connect(osc.frequency);

    // Bandpass filter to give a nasal horse timbre
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.26, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(t);
    osc.start(t);

    lfo.stop(t + 0.92);
    osc.stop(t + 0.92);
  }
}

export const sound = new SoundEngine();
