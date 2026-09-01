import { describe, expect, it } from "vitest";
import type { Team } from "../../lib/types";
import {
  challengeConfigForRoundType,
  chooseAutomaticRival,
  describeChallengeScoring,
  getEligibleRivals,
  requiresChallengeResolution,
} from "./challengeEngine";

function team(id: string, score: number): Team {
  return {
    id,
    room_id: "room-1",
    name: id,
    leader_code: id,
    score,
  };
}

describe("challengeEngine", () => {
  it("defines steal rounds as one atomic 5-point head-to-head steal", () => {
    const config = challengeConfigForRoundType("steal");

    expect(config.participantMode).toBe("head_to_head");
    expect(config.matchupRule).toBe("vote_runner_up");
    expect(config.scoringMode).toBe("steal");
    expect(config.stealAmount).toBe(5);
    expect(requiresChallengeResolution(config)).toBe(true);
  });

  it("uses the vote runner-up as the automatic rival", () => {
    const target = team("target", 4);
    const runnerUp = team("runner-up", 2);
    const leader = team("leader", 30);
    const config = challengeConfigForRoundType("voting");

    expect(
      chooseAutomaticRival({
        config,
        targetTeamId: target.id,
        teams: [target, runnerUp, leader],
        voteCounts: [
          { team: target, count: 4 },
          { team: runnerUp, count: 3 },
          { team: leader, count: 1 },
        ],
      })?.id
    ).toBe("runner-up");
  });

  it("falls back to the scoreboard leader when nobody else received a vote", () => {
    const target = team("target", 20);
    const second = team("second", 8);
    const leader = team("leader", 30);
    const config = challengeConfigForRoundType("steal");

    expect(
      chooseAutomaticRival({
        config,
        targetTeamId: target.id,
        teams: [target, second, leader],
        voteCounts: [
          { team: target, count: 4 },
          { team: second, count: 0 },
          { team: leader, count: 0 },
        ],
      })?.id
    ).toBe("leader");
  });

  it("never offers the pressure team as its own rival", () => {
    const target = team("target", 10);
    const rival = team("rival", 5);

    expect(getEligibleRivals([target, rival], target.id).map((entry) => entry.id)).toEqual([
      "rival",
    ]);
  });

  it("describes automatic winner and steal scoring without hidden bonuses", () => {
    expect(describeChallengeScoring(challengeConfigForRoundType("voting"))).toBe(
      "Winner +10; other matchup team +5."
    );
    expect(describeChallengeScoring(challengeConfigForRoundType("steal"))).toContain(
      "steals up to 5 points"
    );
  });
});
