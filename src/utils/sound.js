// Web Audio API sound effects (zero external assets required)
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, delay = 0, gainVal = 0.12) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + delay;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Ignore audio errors when browser blocks autoplay
    }
  }

  playCoin() {
    this.playTone(987.77, 'sine', 0.12, 0, 0.1);
    this.playTone(1318.51, 'sine', 0.22, 0.07, 0.12);
  }

  playAction() {
    this.playTone(440, 'triangle', 0.14, 0, 0.12);
    this.playTone(554.37, 'triangle', 0.18, 0.08, 0.12);
  }

  playChallenge() {
    this.playTone(311.13, 'sawtooth', 0.18, 0, 0.15);
    this.playTone(277.18, 'sawtooth', 0.25, 0.12, 0.16);
    this.playTone(233.08, 'sawtooth', 0.35, 0.24, 0.18);
  }

  playBlock() {
    this.playTone(523.25, 'square', 0.12, 0, 0.1);
    this.playTone(659.25, 'square', 0.2, 0.09, 0.12);
  }

  playLoseCard() {
    this.playTone(220, 'sawtooth', 0.25, 0, 0.14);
    this.playTone(164.81, 'sawtooth', 0.4, 0.15, 0.15);
  }

  playYourTurn() {
    this.playTone(523.25, 'sine', 0.15, 0, 0.14);
    this.playTone(659.25, 'sine', 0.15, 0.1, 0.14);
    this.playTone(783.99, 'sine', 0.25, 0.2, 0.16);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 'triangle', 0.28, idx * 0.11, 0.16);
    });
  }
}

export const sound = new SoundManager();

