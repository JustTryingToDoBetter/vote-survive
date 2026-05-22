import { useEffect, useMemo, useState } from "react";
import { soundManager } from "../lib/sound";

const STORAGE_KEY = "vote-survive-sound-enabled";

export function useSoundEffects() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? stored === "true" : true;
  });

  useEffect(() => {
    soundManager.setEnabled(enabled);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  }, [enabled]);

  return useMemo(
    () => ({
      enabled,
      setEnabled,
      play: soundManager.play.bind(soundManager),
    }),
    [enabled]
  );
}
