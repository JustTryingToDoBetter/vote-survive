import type { Room, RoundRecord, RoundStatus, RoundType } from "../../lib/types";

export const DEFAULT_ROUND_SECONDS = 45;

export type SyncState = {
  isSyncing: boolean;
  lastSyncAt: number | null;
  latencyMs: number | null;
};

export type HostPhase =
  | "lobby"
  | "round_reveal"
  | "voting"
  | "locked"
  | "scoring"
  | "leaderboard"
  | "final_reveal";

export const hostPhaseOrder: HostPhase[] = [
  "lobby",
  "round_reveal",
  "voting",
  "locked",
  "scoring",
  "leaderboard",
  "final_reveal",
];

export const hostPhaseLabels: Record<HostPhase, string> = {
  lobby: "Lobby",
  round_reveal: "Round Reveal",
  voting: "Voting / Task Live",
  locked: "Locked",
  scoring: "Scoring",
  leaderboard: "Leaderboard",
  final_reveal: "Final Reveal",
};

export const hostPrimaryActionLabels: Record<HostPhase, string> = {
  lobby: "Start Round",
  round_reveal: "Start Round",
  voting: "Lock Round",
  locked: "Open Scoring",
  scoring: "Complete Round",
  leaderboard: "Start Next Round",
  final_reveal: "View Final Results",
};

export const scorePresets = [
  { label: "+2 Participation", delta: 2, reason: "Participation" },
  { label: "+5 Good effort", delta: 5, reason: "Good effort" },
  { label: "+7 Runner up", delta: 7, reason: "Runner up" },
  { label: "+10 Winner", delta: 10, reason: "Winner" },
  { label: "-3 Penalty", delta: -3, reason: "Penalty" },
] as const;

export function getRoundTimerSeconds(round: RoundRecord | null) {
  return round?.timer_seconds ?? DEFAULT_ROUND_SECONDS;
}

export function roundRequiresVoting(roundType: RoundType) {
  return roundType === "voting" || roundType === "steal";
}

export function getHostPhase(
  room: Room | null,
  activeRound: RoundRecord | null,
  showWinner: boolean
): HostPhase {
  if (showWinner || room?.status === "winner" || activeRound?.status === "winner") {
    return "final_reveal";
  }

  if (!activeRound) return "lobby";

  if (activeRound.status === "reveal" || activeRound.status === "lobby") return "round_reveal";
  if (activeRound.status === "voting" || activeRound.status === "live") return "voting";
  if (activeRound.status === "locked") return "locked";
  if (activeRound.status === "scoring") return "scoring";
  if (activeRound.status === "complete") return "leaderboard";

  return "round_reveal";
}

export function getProjectorState(
  room: Room | null,
  activeRound: RoundRecord | null,
  showWinner: boolean
) {
  if (showWinner || room?.status === "winner" || activeRound?.status === "winner") {
    return "Winner reveal";
  }
  if (!activeRound) return "Waiting for host";
  if (activeRound.status === "reveal" || activeRound.status === "lobby") return "Round reveal";
  if (activeRound.status === "voting") return "Voting open";
  if (activeRound.status === "live") return "Task live";
  if (activeRound.status === "locked") return "Votes locked";
  if (
    activeRound.status === "scoring" &&
    (activeRound.round_type === "voting" || activeRound.round_type === "steal") &&
    !activeRound.challenge_resolved_at
  ) {
    return activeRound.round_type === "steal" ? "Steal live" : "Showdown live";
  }
  if (activeRound.status === "scoring") return "Scoring";
  if (activeRound.status === "complete") return "Leaderboard";
  return "Round starting";
}

export function formatSyncState(syncState: SyncState) {
  if (syncState.isSyncing && syncState.latencyMs === null) return "syncing";
  if (syncState.latencyMs === null) return "not synced";
  return `${syncState.latencyMs}ms`;
}

export function toRoundStatusLabel(status: RoundStatus) {
  return status.replace("_", " ");
}
