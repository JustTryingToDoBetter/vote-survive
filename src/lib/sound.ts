const toneProfiles = {
  roundStart: [440, 660],
  voteSubmit: [520, 780],
  countdown: [700],
  reveal: [330, 550, 880],
  score: [620, 820],
  winner: [523, 659, 784, 1046],
} as const;

export type SoundName = keyof typeof toneProfiles;

export class SoundManager {
  private enabled = true;

  setEnabled(nextValue: boolean) {
    this.enabled = nextValue;
  }

  isEnabled() {
    return this.enabled;
  }

  play(name: SoundName) {
    if (!this.enabled || typeof window === "undefined") return;

    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.38);
    gain.connect(context.destination);

    toneProfiles[name].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const start = context.currentTime + index * 0.08;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });

    window.setTimeout(() => void context.close(), 700);
  }
}

export const soundManager = new SoundManager();
