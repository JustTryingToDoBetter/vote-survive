import { DEFAULT_ROUND_SECONDS } from "../gameflow/gamePhases";

type TimerRingProps = {
  secondsLeft: number;
  compact?: boolean;
  duration?: number;
};

export function TimerRing({
  secondsLeft,
  compact,
  duration = DEFAULT_ROUND_SECONDS,
}: TimerRingProps) {
  const percentage = (secondsLeft / duration) * 100;

  return (
    <div
      className={compact ? "timer-ring compact" : "timer-ring"}
      style={{ "--progress": `${percentage}%` } as React.CSSProperties}
    >
      <strong>{secondsLeft}</strong>
      {!compact && <span>sec</span>}
    </div>
  );
}
