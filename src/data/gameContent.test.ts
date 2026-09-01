import { describe, expect, it } from "vitest";
import { buildQuizQuestionSet } from "./gameContent";
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
});
