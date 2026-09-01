import type { RoundStatus, RoundType, Team } from "../../lib/types";
import { roundRequiresVoting } from "./gamePhases";

export type VoteCount = {
  team: Team;
  count: number;
};

export type VoteOutcome =
  | { kind: "no_votes" }
  | { kind: "tie"; count: number; teams: Team[] }
  | { kind: "winner"; count: number; team: Team };

export type WinnerOutcome =
  | { kind: "no_teams" }
  | { kind: "tie"; score: number; teams: Team[] }
  | { kind: "winner"; score: number; team: Team };

export function getExpectedLiveStatus(roundType: RoundType): RoundStatus {
  return roundRequiresVoting(roundType) ? "voting" : "live";
}

export function canTransitionRound(
  from: RoundStatus,
  to: RoundStatus,
  roundType: RoundType
) {
  if (from === "reveal" || from === "lobby") {
    return to === getExpectedLiveStatus(roundType);
  }

  if (from === "voting" || from === "live") {
    return to === "locked";
  }

  if (from === "locked") {
    return to === "scoring";
  }

  if (from === "scoring") {
    return to === "complete";
  }

  return false;
}

export function getVoteOutcome(voteCounts: VoteCount[]): VoteOutcome {
  const highestCount = Math.max(0, ...voteCounts.map((entry) => entry.count));

  if (highestCount === 0) {
    return { kind: "no_votes" };
  }

  const leaders = voteCounts
    .filter((entry) => entry.count === highestCount)
    .map((entry) => entry.team);

  if (leaders.length > 1) {
    return {
      kind: "tie",
      count: highestCount,
      teams: leaders,
    };
  }

  return {
    kind: "winner",
    count: highestCount,
    team: leaders[0],
  };
}

export function getWinnerOutcome(teams: Team[]): WinnerOutcome {
  if (teams.length === 0) {
    return { kind: "no_teams" };
  }

  const topScore = Math.max(...teams.map((team) => team.score));
  const leaders = teams.filter((team) => team.score === topScore);

  if (leaders.length > 1) {
    return {
      kind: "tie",
      score: topScore,
      teams: leaders,
    };
  }

  return {
    kind: "winner",
    score: topScore,
    team: leaders[0],
  };
}

export function getEffectiveScoreDelta(roundType: RoundType | null | undefined, delta: number) {
  return roundType === "final_double" ? delta * 2 : delta;
}

export function getCappedStealAmount(requestedAmount: number, rivalScore: number) {
  if (!Number.isFinite(requestedAmount) || !Number.isFinite(rivalScore)) return 0;
  return Math.max(0, Math.min(requestedAmount, rivalScore));
}
