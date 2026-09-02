import type {
  ChallengeConfig,
  RoundRecord,
  RoundType,
  Team,
} from "../../lib/types";

const DEFAULT_CONFIGS: Record<RoundType, ChallengeConfig> = {
  voting: {
    participantMode: "head_to_head",
    participantCount: 2,
    durationSeconds: 30,
    matchupRule: "vote_runner_up",
    winCondition: "The selected teams compete in one whole-team showdown; host declares the winner.",
    scoringMode: "winner_points",
    winnerPoints: 10,
    runnerUpPoints: 5,
  },
  all_play: {
    participantMode: "all_teams",
    participantCount: null,
    durationSeconds: null,
    matchupRule: "none",
    winCondition: "Every team participates; host judges the room-wide challenge using the round instructions.",
    scoringMode: "manual",
  },
  quiz_burst: {
    participantMode: "all_teams",
    participantCount: null,
    durationSeconds: null,
    matchupRule: "none",
    winCondition: "Correct answers are ranked by submission time.",
    scoringMode: "quiz",
  },
  bible_speed: {
    participantMode: "all_teams",
    participantCount: null,
    durationSeconds: null,
    matchupRule: "none",
    winCondition: "Correct answers are ranked by submission time.",
    scoringMode: "quiz",
  },
  dance_battle: {
    participantMode: "all_teams",
    participantCount: null,
    durationSeconds: null,
    matchupRule: "none",
    winCondition: "Host judges execution, creativity, and energy.",
    scoringMode: "manual",
  },
  steal: {
    participantMode: "head_to_head",
    participantCount: 2,
    durationSeconds: 30,
    matchupRule: "vote_runner_up",
    winCondition: "Pressure team and rival compete as whole teams. Pressure-team win steals 5 points; rival win blocks.",
    scoringMode: "steal",
    stealAmount: 5,
  },
  final_double: {
    participantMode: "all_teams",
    participantCount: null,
    durationSeconds: null,
    matchupRule: "none",
    winCondition: "Host judges the final challenge and scores each team manually.",
    scoringMode: "manual",
  },
};

export function challengeConfigForRoundType(roundType: RoundType): ChallengeConfig {
  return { ...DEFAULT_CONFIGS[roundType] };
}

export function getChallengeConfig(
  round: Pick<RoundRecord, "round_type" | "challenge_config">
): ChallengeConfig {
  return round.challenge_config ?? challengeConfigForRoundType(round.round_type);
}

export function requiresRival(config: ChallengeConfig) {
  return config.participantMode === "head_to_head";
}

export function requiresChallengeResolution(config: ChallengeConfig) {
  return (
    config.participantMode === "head_to_head" &&
    (config.scoringMode === "winner_points" || config.scoringMode === "steal")
  );
}

export function getEligibleRivals(teams: Team[], targetTeamId: string | null | undefined) {
  if (!targetTeamId) return [];
  return teams.filter((team) => team.id !== targetTeamId);
}

export function chooseAutomaticRival(args: {
  config: ChallengeConfig;
  targetTeamId: string;
  teams: Team[];
  voteCounts: { team: Team; count: number }[];
}): Team | null {
  const eligible = getEligibleRivals(args.teams, args.targetTeamId);
  if (eligible.length === 0) return null;

  if (args.config.matchupRule === "host_choice") return null;

  if (args.config.matchupRule === "vote_runner_up") {
    const votedRival = [...args.voteCounts]
      .filter(
        (entry) =>
          entry.team.id !== args.targetTeamId &&
          entry.count > 0 &&
          eligible.some((team) => team.id === entry.team.id)
      )
      .sort((a, b) => b.count - a.count || b.team.score - a.team.score)[0]?.team;

    if (votedRival) return votedRival;
  }

  if (
    args.config.matchupRule === "leaderboard_leader" ||
    args.config.matchupRule === "vote_runner_up"
  ) {
    return [...eligible].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))[0];
  }

  return null;
}

export function describeChallengeScoring(config: ChallengeConfig) {
  if (config.scoringMode === "winner_points") {
    return `Winner +${config.winnerPoints ?? 10}; other matchup team +${config.runnerUpPoints ?? 5}.`;
  }

  if (config.scoringMode === "steal") {
    return `Pressure-team win steals up to ${config.stealAmount ?? 5} points from the rival. Rival win blocks the steal.`;
  }

  if (config.scoringMode === "quiz") {
    return "Quiz scoring is handled by the question engine.";
  }

  return "Host scores this challenge manually.";
}
