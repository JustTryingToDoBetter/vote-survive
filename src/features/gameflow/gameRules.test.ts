import { describe, expect, it } from "vitest";
import type { RoundStatus, RoundType, Team } from "../../lib/types";
import {
  canTransitionRound,
  getCappedStealAmount,
  getEffectiveScoreDelta,
  getExpectedLiveStatus,
  getVoteOutcome,
  getWinnerOutcome,
} from "./gameRules";

function team(id: string, score = 0): Team {
  return {
    id,
    room_id: "room-1",
    name: id,
    leader_code: `code-${id}`,
    score,
  };
}

describe("gameRules", () => {
  describe("state machine", () => {
    it.each([
      ["voting", "voting"],
      ["steal", "voting"],
      ["all_play", "live"],
      ["quiz_burst", "live"],
      ["bible_speed", "live"],
      ["dance_battle", "live"],
      ["final_double", "live"],
    ] satisfies [RoundType, RoundStatus][])(
      "starts %s rounds in %s",
      (roundType, expected) => {
        expect(getExpectedLiveStatus(roundType)).toBe(expected);
      }
    );

    it("allows the normal voting lifecycle", () => {
      expect(canTransitionRound("reveal", "voting", "voting")).toBe(true);
      expect(canTransitionRound("voting", "locked", "voting")).toBe(true);
      expect(canTransitionRound("locked", "scoring", "voting")).toBe(true);
      expect(canTransitionRound("scoring", "complete", "voting")).toBe(true);
    });

    it("allows the normal non-voting lifecycle", () => {
      expect(canTransitionRound("reveal", "live", "all_play")).toBe(true);
      expect(canTransitionRound("live", "locked", "all_play")).toBe(true);
      expect(canTransitionRound("locked", "scoring", "all_play")).toBe(true);
      expect(canTransitionRound("scoring", "complete", "all_play")).toBe(true);
    });

    it.each([
      ["reveal", "locked", "voting"],
      ["reveal", "live", "voting"],
      ["reveal", "voting", "all_play"],
      ["voting", "scoring", "voting"],
      ["locked", "complete", "voting"],
      ["scoring", "winner", "voting"],
      ["complete", "scoring", "voting"],
      ["winner", "reveal", "voting"],
    ] satisfies [RoundStatus, RoundStatus, RoundType][])(
      "rejects invalid transition %s -> %s",
      (from, to, roundType) => {
        expect(canTransitionRound(from, to, roundType)).toBe(false);
      }
    );
  });

  describe("voting", () => {
    it("blocks a round with zero votes", () => {
      expect(
        getVoteOutcome([
          { team: team("a"), count: 0 },
          { team: team("b"), count: 0 },
        ])
      ).toEqual({ kind: "no_votes" });
    });

    it("selects the single highest vote winner", () => {
      expect(
        getVoteOutcome([
          { team: team("a"), count: 4 },
          { team: team("b"), count: 2 },
          { team: team("c"), count: 1 },
        ])
      ).toMatchObject({
        kind: "winner",
        count: 4,
        team: { id: "a" },
      });
    });

    it("returns an explicit tie instead of choosing by array or random order", () => {
      const outcome = getVoteOutcome([
        { team: team("a"), count: 3 },
        { team: team("b"), count: 3 },
        { team: team("c"), count: 1 },
      ]);

      expect(outcome.kind).toBe("tie");
      if (outcome.kind !== "tie") throw new Error("Expected tie outcome");
      expect(outcome.count).toBe(3);
      expect(outcome.teams.map((entry) => entry.id)).toEqual(["a", "b"]);
    });
  });

  describe("final winner", () => {
    it("returns the only top-scoring team", () => {
      expect(getWinnerOutcome([team("a", 20), team("b", 12)])).toMatchObject({
        kind: "winner",
        score: 20,
        team: { id: "a" },
      });
    });

    it("blocks winner selection when final scores are tied", () => {
      const outcome = getWinnerOutcome([
        team("a", 20),
        team("b", 20),
        team("c", 4),
      ]);

      expect(outcome.kind).toBe("tie");
      if (outcome.kind !== "tie") throw new Error("Expected tie outcome");
      expect(outcome.teams.map((entry) => entry.id)).toEqual(["a", "b"]);
    });

    it("does not invent a winner when there are no teams", () => {
      expect(getWinnerOutcome([])).toEqual({ kind: "no_teams" });
    });
  });

  describe("scoring", () => {
    it("leaves normal round scores unchanged", () => {
      expect(getEffectiveScoreDelta("voting", 10)).toBe(10);
      expect(getEffectiveScoreDelta("voting", -3)).toBe(-3);
    });

    it("doubles both positive and negative final-round deltas", () => {
      expect(getEffectiveScoreDelta("final_double", 10)).toBe(20);
      expect(getEffectiveScoreDelta("final_double", -3)).toBe(-6);
    });

    it("caps steals at the rival's available balance", () => {
      expect(getCappedStealAmount(5, 12)).toBe(5);
      expect(getCappedStealAmount(5, 3)).toBe(3);
      expect(getCappedStealAmount(5, 0)).toBe(0);
    });

    it("never produces a negative steal", () => {
      expect(getCappedStealAmount(5, -10)).toBe(0);
      expect(getCappedStealAmount(-5, 10)).toBe(0);
    });
  });
});
