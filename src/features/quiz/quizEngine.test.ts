import { describe, expect, it } from "vitest";
import type { AnswerSubmission, QuizQuestion, RoundRecord } from "../../lib/types";
import {
  getCurrentQuestion,
  getCurrentQuestionAnswers,
  getCurrentQuestionIndex,
  getFastestCorrect,
  getQuizAwardPlan,
  getQuizSecondsLeft,
  isLastQuizQuestion,
  isQuizTimerExpired,
  toPublicQuizQuestion,
} from "./quizEngine";

const questions: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "First question?",
    options: ["A", "B"],
    correctAnswer: "A",
    category: "bible_knowledge",
    difficulty: "easy",
    timeLimitSeconds: 15,
    points: 5,
  },
  {
    id: "q2",
    prompt: "Second question?",
    options: ["C", "D"],
    correctAnswer: "D",
    category: "bible_knowledge",
    difficulty: "medium",
    timeLimitSeconds: 15,
    points: 5,
  },
];

function makeRound(patch: Partial<RoundRecord> = {}): RoundRecord {
  return {
    id: "round-1",
    room_id: "room-1",
    round_number: 1,
    round_type: "quiz_burst",
    title: "Quiz",
    prompt: "Prompt",
    challenge: "Challenge",
    scoring_guide: "Score it",
    instructions: "Answer fast",
    status: "scoring",
    target_team_id: null,
    question_set: questions,
    current_question_index: 0,
    question_status: "live",
    question_started_at: "2026-06-15T00:00:00.000Z",
    created_at: "2026-06-15T00:00:00.000Z",
    ...patch,
  };
}

function makeAnswer(patch: Partial<AnswerSubmission>): AnswerSubmission {
  return {
    id: patch.id ?? crypto.randomUUID(),
    round_id: "round-1",
    team_id: "team-1",
    question_index: 0,
    answer: "A",
    is_correct: true,
    submitted_at: "2026-06-15T00:00:01.000Z",
    ...patch,
  };
}

describe("quizEngine", () => {
  it("returns the current question and clamps out-of-range indexes", () => {
    expect(getCurrentQuestion(makeRound({ current_question_index: 1 }))?.id).toBe("q2");
    expect(getCurrentQuestionIndex(makeRound({ current_question_index: 99 }))).toBe(1);
    expect(getCurrentQuestion(makeRound({ current_question_index: -3 }))?.id).toBe("q1");
  });

  it("returns safe defaults when a round has no question set", () => {
    const round = makeRound({ question_set: null, current_question_index: 4 });

    expect(getCurrentQuestion(round)).toBeNull();
    expect(getCurrentQuestionIndex(round)).toBe(0);
  });

  it("filters answers to the active question only", () => {
    const round = makeRound({ current_question_index: 1 });
    const answers = [
      makeAnswer({ id: "old", team_id: "team-1", question_index: 0 }),
      makeAnswer({ id: "current", team_id: "team-2", question_index: 1 }),
    ];

    expect(getCurrentQuestionAnswers(answers, round).map((answer) => answer.id)).toEqual([
      "current",
    ]);
  });

  it("finds the fastest correct answer for the active question", () => {
    const round = makeRound({ current_question_index: 1 });
    const answers = [
      makeAnswer({
        id: "wrong-fast",
        team_id: "team-1",
        question_index: 1,
        is_correct: false,
        submitted_at: "2026-06-15T00:00:01.000Z",
      }),
      makeAnswer({
        id: "correct-slow",
        team_id: "team-2",
        question_index: 1,
        is_correct: true,
        submitted_at: "2026-06-15T00:00:03.000Z",
      }),
      makeAnswer({
        id: "correct-fast",
        team_id: "team-3",
        question_index: 1,
        is_correct: true,
        submitted_at: "2026-06-15T00:00:02.000Z",
      }),
    ];

    expect(getFastestCorrect(answers, round)?.id).toBe("correct-fast");
  });

  it("removes answer keys from public quiz question payloads", () => {
    const publicQuestion = toPublicQuizQuestion(questions[0]);

    expect(publicQuestion).not.toHaveProperty("correctAnswer");
    expect(publicQuestion.prompt).toBe("First question?");
  });

  it("counts down from the active question time limit", () => {
    const round = makeRound();

    expect(getQuizSecondsLeft(round, Date.parse("2026-06-15T00:00:05.000Z"))).toBe(10);
    expect(getQuizSecondsLeft(round, Date.parse("2026-06-15T00:00:15.000Z"))).toBe(0);
    expect(isQuizTimerExpired(round, Date.parse("2026-06-15T00:00:15.000Z"))).toBe(true);
  });

  it("does not run the timer before or after a live question", () => {
    expect(getQuizSecondsLeft(makeRound({ question_status: "waiting" }))).toBe(0);
    expect(getQuizSecondsLeft(makeRound({ question_status: "locked" }))).toBe(0);
    expect(
      getQuizSecondsLeft(makeRound({ question_status: "live", question_started_at: null }))
    ).toBe(0);
  });

  it("awards +10 total to fastest correct and +5 to other correct teams", () => {
    const answers = [
      makeAnswer({
        id: "wrong",
        team_id: "team-wrong",
        is_correct: false,
        submitted_at: "2026-06-15T00:00:01.000Z",
      }),
      makeAnswer({
        id: "second",
        team_id: "team-second",
        is_correct: true,
        submitted_at: "2026-06-15T00:00:03.000Z",
      }),
      makeAnswer({
        id: "fastest",
        team_id: "team-fastest",
        is_correct: true,
        submitted_at: "2026-06-15T00:00:02.000Z",
      }),
    ];

    expect(getQuizAwardPlan(answers, makeRound())).toEqual([
      { teamId: "team-fastest", points: 10, role: "fastest" },
      { teamId: "team-second", points: 5, role: "correct" },
    ]);
  });

  it("detects the final quiz question", () => {
    expect(isLastQuizQuestion(makeRound({ current_question_index: 0 }))).toBe(false);
    expect(isLastQuizQuestion(makeRound({ current_question_index: 1 }))).toBe(true);
  });
});
