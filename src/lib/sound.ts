const soundFiles = {
  roundStart: "/sounds/round-start.mp3",
  voteSubmit: "/sounds/vote-submit.mp3",
  countdown: "/sounds/countdown.mp3",
  reveal: "/sounds/reveal.mp3",
  score: "/sounds/score.mp3",
  winner: "/sounds/winner.mp3",
} as const;

export type SoundName = keyof typeof soundFiles;

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

    const file = soundFiles[name];
    const audio = new Audio(file);

    void audio.play().catch(() => {
      // Missing files or autoplay restrictions should fail quietly.
    });
  }
}

export const soundManager = new SoundManager();
