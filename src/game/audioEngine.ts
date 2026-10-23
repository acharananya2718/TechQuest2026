// ============================================================================
// TECH QUEST: ROUND 2 — PURE WEB AUDIO SYNTHESIZER
// ============================================================================
// Zero external mp3/wav files; 100% procedural Web Audio synthesis for:
// - Footsteps (synchronized with WASD)
// - Ambient claustrophobic drone & hum
// - Wooden drawer sliding friction
// - Paper note rustling
// - Metal unbolt clunks & clicks
// - Keypad beeps & error buzz
// - Electric sparks
// - Victory fanfare
// ============================================================================

class EscapeAudioEngine {
  private ctx: AudioContext | null = null;
  private ambientDroneGain: GainNode | null = null;
  private isMuted: boolean = false;
  private lastFootstepTime: number = 0;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientDroneGain && this.ctx) {
      this.ambientDroneGain.gain.setValueAtTime(muted ? 0 : 0.08, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // 1. Footstep sound (procedural low frequency noise thud)
  public playFootstep() {
    if (this.isMuted) return;
    const now = Date.now();
    if (now - this.lastFootstepTime < 320) return; // rate limit footsteps
    this.lastFootstepTime = now;

    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(90 + Math.random() * 20, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    } catch {}
  }

  // 2. Ambient Claustrophobic Drone
  public startAmbientDrone() {
    if (this.ambientDroneGain) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(58.5, this.ctx.currentTime); // dissonant beat freq

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, this.ctx.currentTime);

      gain.gain.setValueAtTime(this.isMuted ? 0 : 0.06, this.ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      this.ambientDroneGain = gain;
    } catch {}
  }

  public stopAmbientDrone() {
    if (this.ambientDroneGain && this.ctx) {
      try {
        this.ambientDroneGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {}
      this.ambientDroneGain = null;
    }
  }

  // 3. Wooden Drawer Slide Friction
  public playDrawerSlide() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.7));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.25);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch {}
  }

  // 4. Paper Rustle
  public playPaperRustle() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.18;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch {}
  }

  // 5. Metallic Unbolt / Latch Clunk
  public playUnboltClunk() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.36);
    } catch {}
  }

  // 6. Keypad Beep
  public playKeypadBeep(freq: number = 880) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }

  // 7. Error Buzz
  public playErrorBuzz() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.32);
    } catch {}
  }

  // 8. Electric Spark Crackle
  public playElectricSpark() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() > 0.85 ? Math.random() * 2 - 1 : 0;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      noise.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch {}
  }

  // 9. Victory Fanfare
  public playVaultDoorSwing() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // 1. Heavy mechanical unbolt clunk
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.6);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.61);

      // 2. High-pressure pneumatic hiss
      const bufferSize = this.ctx.sampleRate * 1.2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.45));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + 1.2);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // 3. Low resonant steel door swing groan
      const swingOsc = this.ctx.createOscillator();
      const swingGain = this.ctx.createGain();
      swingOsc.type = 'triangle';
      swingOsc.frequency.setValueAtTime(80, now + 0.3);
      swingOsc.frequency.linearRampToValueAtTime(120, now + 1.2);
      swingOsc.frequency.exponentialRampToValueAtTime(50, now + 2.5);
      swingGain.gain.setValueAtTime(0.001, now);
      swingGain.gain.linearRampToValueAtTime(0.18, now + 0.5);
      swingGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      swingOsc.connect(swingGain);
      swingGain.connect(this.ctx.destination);
      swingOsc.start(now + 0.3);
      swingOsc.stop(now + 2.51);
    } catch {}
  }

  // 9. Victory Fanfare (Short, celebratory multi-chord fanfare sequence)
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const startTime = this.ctx.currentTime + 0.05;

      // Chord 1: C Major (C4, E4, G4)
      const chord1 = [261.63, 329.63, 392.0];
      chord1.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });

      // Chord 2: F Major (F4, A4, C5)
      const chord2 = [349.23, 440.0, 523.25];
      chord2.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + 0.28);
        gain.gain.setValueAtTime(0.2, startTime + 0.28);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime + 0.28);
        osc.stop(startTime + 0.66);
      });

      // Chord 3: G Major (G4, B4, D5)
      const chord3 = [392.0, 493.88, 587.33];
      chord3.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + 0.58);
        gain.gain.setValueAtTime(0.22, startTime + 0.58);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.98);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime + 0.58);
        osc.stop(startTime + 0.99);
      });

      // Final Grand Triumphant Chord: C Major High (C4, G4, C5, E5, G5)
      const finalChord = [261.63, 392.0, 523.25, 659.25, 783.99];
      finalChord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2800, startTime + 0.92);

        osc.frequency.setValueAtTime(freq, startTime + 0.92);
        gain.gain.setValueAtTime(0.24, startTime + 0.92);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime + 0.92);
        osc.stop(startTime + 2.51);
      });

      // Shimmering High Chimes
      [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
        const chime = this.ctx!.createOscillator();
        const chimeGain = this.ctx!.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(freq, startTime + 1.1 + idx * 0.12);
        chimeGain.gain.setValueAtTime(0.12, startTime + 1.1 + idx * 0.12);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.6);
        chime.connect(chimeGain);
        chimeGain.connect(this.ctx!.destination);
        chime.start(startTime + 1.1 + idx * 0.12);
        chime.stop(startTime + 2.61);
      });
    } catch {}
  }

  // 10. Physical Object Impact Sound (Metal, Wood, Paper, Glass)
  public playImpact(material: 'metal' | 'wood' | 'paper' | 'glass' = 'metal', intensity: number = 0.5) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const clampedVol = Math.min(Math.max(intensity, 0.1), 0.8) * 0.35;
      if (material === 'metal') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600 + Math.random() * 200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(clampedVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.19);
      } else if (material === 'wood') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160 + Math.random() * 40, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(clampedVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.13);
      } else if (material === 'glass') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400 + Math.random() * 300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(clampedVol * 0.7, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.23);
      } else {
        this.playPaperRustle();
      }
    } catch {}
  }

  // 11. Throw Whoosh
  public playThrowWhoosh() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.21);
    } catch {}
  }

  // 12. Dial / Rotary Lock Click
  public playDialTick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.045);
    } catch {}
  }

  // 13. Grab / Pick-Up Object Sound
  public playGrab() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }

  // 14. Drop Object Sound
  public playDrop() {
    this.playImpact('wood', 0.4);
  }

  // 15. Flashlight / UV toggle
  public playFlashlightToggle() {
    this.playKeypadBeep(1200);
  }
}

export const escapeAudio = new EscapeAudioEngine();
