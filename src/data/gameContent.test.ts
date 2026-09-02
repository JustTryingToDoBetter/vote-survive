import { describe, expect, it } from "vitest";
import {
  buildQuizQuestionSet,
  buildRoundDefinition,
  playableRoundTypes,
  roundTypeLabels,
} from "./gameContent";
import { teamChallenges } from "./teamChallenges";
import { LIVE_SYNC_INTERVAL_MS } from "../lib/sessionConfig";

describe("buildQuizQuestionSet", () => {
  it("adds quiz metadata and 15 second limits to quiz burst questions", () => {
    const questions = buildQuizQuestionSet("quiz_burst", 5);

    expect(questions).toHaveLength(5);
    for (const question of questions) {
      expect(question.category).toBe("bible_knowledge");
      expect(["easy", "medium", "hard"]).toContain(question.difficulty);
      expect(question.timeLimitSeconds).toBe(15);
      expect(question.points).toBe(5);
    }
  });

  it("adds Bible-reference metadata and 20 second limits to Bible speed questions", () => {
    const questions = buildQuizQuestionSet("bible_speed", 5);

    expect(questions).toHaveLength(5);
    for (const question of questions) {
      expect(question.category).toBe("bible_reference");
      expect(["easy", "medium", "hard"]).toContain(question.difficulty);
      expect(question.timeLimitSeconds).toBe(20);
      expect(question.points).toBe(5);
    }
  });

  it("uses a slower polling fallback so realtime handles most sync traffic", () => {
    expect(LIVE_SYNC_INTERVAL_MS).toBe(20000);
  });

  it("exposes only the four simple host-facing game concepts", () => {
    expect([...playableRoundTypes]).toEqual([
      "all_play",
      "voting",
      "steal",
      "final_double",
    ]);
    expect(playableRoundTypes.map((type) => roundTypeLabels[type])).toEqual([
      "Challenge",
      "Showdown",
      "Steal",
      "Final",
    ]);
  });

  it("ships a whole-team challenge deck", () => {
    expect(teamChallenges).toHaveLength(13);
    expect(teamChallenges.some((challenge) => challenge.id === "bible-hunt-relay")).toBe(true);
    expect(
      teamChallenges.every(
        (challenge) =>
          challenge.id.trim().length > 0 &&
          challenge.title.trim().length > 0 &&
          challenge.category.trim().length > 0 &&
          challenge.description.trim().length > 0 &&
          challenge.instructions.trim().length > 0
      )
    ).toBe(true);
  });

  it("builds Challenge rounds directly from the whole-team deck", () => {
    const round = buildRoundDefinition("all_play");
    const matchingChallenge = teamChallenges.find((challenge) => challenge.title === round.title);

    expect(matchingChallenge?.description).toBe(round.challenge);
    expect(round.instructions).toBe(matchingChallenge?.instructions);
    expect(round.prompt).toBe("All teams are in.");
    expect(round.scoringGuide).toBe("Host scores teams using the standard score controls.");
    expect(round.requiresVoting).toBe(false);
  });

  it("keeps Showdown, Steal, and Final mechanics clear and supported", () => {
    const showdown = buildRoundDefinition("voting");
    const steal = buildRoundDefinition("steal");
    const final = buildRoundDefinition("final_double");

    expect(showdown.prompt).toBe("Two whole teams. One winner.");
    expect(showdown.scoringGuide).toBe("Winner +10. Other team +5.");
    expect(showdown.instructions).toMatch(/both teams|each team|all teams|every team|team at a time/i);
    expect(steal.prompt).toBe("Win and take 5.");
    expect(steal.scoringGuide).toContain("up to 5 points");
    expect(steal.scoringGuide).toContain("Rival win blocks");
    expect(final.prompt).toBe("Everyone plays. Every point counts double.");
    expect(final.scoringGuide).toBe(
      "Use normal host scoring. All score changes are doubled automatically."
    );
    expect(final.requiresVoting).toBe(false);
  });

  it("does not generate removed legacy round types or unsupported active mechanics", () => {
    const activeRounds = Array.from({ length: 50 }, () => buildRoundDefinition());
    expect(activeRounds.every((round) => ["all_play", "voting", "steal"].includes(round.type))).toBe(
      true
    );

    const activeCopy = [
      ...teamChallenges.flatMap((challenge) => [challenge.description, challenge.instructions]),
      ...activeRounds.flatMap((round) => [
        round.title,
        round.prompt,
        round.challenge,
        round.instructions,
        round.scoringGuide,
      ]),
      buildRoundDefinition("final_double").challenge,
    ].join(" ").toLowerCase();

    for (const unsupportedTerm of [
      "wager",
      "auction",
      "sit out",
      "steal 10",
      "steal 8",
      "pay half",
      "random bonus",
      "double if",
    ]) {
      expect(activeCopy).not.toContain(unsupportedTerm);
    }
  });
});
