import type {
  AnswerSubmission,
  QuizCategory,
  QuizQuestion,
  RoundRecord,
} from "../../lib/types";

export type QuizAward = { teamId: string; points: number; role: "fastest" | "correct" };

export function toPublicQuizQuestion(question: QuizQuestion): QuizQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    options: question.options,
    category: question.category,
    difficulty: question.difficulty,
    timeLimitSeconds: question.timeLimitSeconds,
    points: question.points,
  };
}

export function isRapidQuizRound(round: RoundRecord | null | undefined) {
  // Question sets are a capability. Legacy quiz types remain readable, while
  // a normal Challenge can now use the same secure quiz lifecycle.
  return Boolean(round?.question_set?.length);
}

export function getCurrentQuestion(round: RoundRecord | null | undefined): QuizQuestion | null {
  if (!round?.question_set?.length) return null;
  const index = Math.min(
    Math.max(round.current_question_index ?? 0, 0),
    round.question_set.length - 1
  );
  return round.question_set[index] ?? null;
}

export function getCurrentQuestionIndex(round: RoundRecord | null | undefined) {
  if (!round?.question_set?.length) return 0;
  return Math.min(
    Math.max(round.current_question_index ?? 0, 0),
    round.question_set.length - 1
  );
}

export function getCurrentQuestionAnswers(
  answers: AnswerSubmission[],
  round: RoundRecord | null | undefined
) {
  const questionIndex = getCurrentQuestionIndex(round);
  return answers.filter((answer) => answer.question_index === questionIndex);
}

export function getAnswerForTeam(
  answers: AnswerSubmission[],
  round: RoundRecord | null | undefined,
  teamId: string
) {
  return getCurrentQuestionAnswers(answers, round).find((answer) => answer.team_id === teamId) ?? null;
}

export function getFastestCorrect(
  answers: AnswerSubmission[],
  round: RoundRecord | null | undefined
) {
  return (
    getCurrentQuestionAnswers(answers, round)
      .filter((answer) => answer.is_correct)
      .sort(
        (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      )[0] ?? null
  );
}

export function getQuizSecondsLeft(
  round: RoundRecord | null | undefined,
  nowMs = Date.now()
) {
  if (
    !isRapidQuizRound(round) ||
    round?.question_status !== "live" ||
    !round.question_started_at
  ) {
    return 0;
  }

  const question = getCurrentQuestion(round);
  if (!question) return 0;

  const startedAt = new Date(round.question_started_at).getTime();
  if (!Number.isFinite(startedAt)) return question.timeLimitSeconds;

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  return Math.max(0, question.timeLimitSeconds - elapsedSeconds);
}

export function isQuizTimerExpired(
  round: RoundRecord | null | undefined,
  nowMs = Date.now()
) {
  return Boolean(
    isRapidQuizRound(round) &&
      round?.question_status === "live" &&
      round.question_started_at &&
      getQuizSecondsLeft(round, nowMs) <= 0
  );
}

export function getQuizAwardPlan(
  answers: AnswerSubmission[],
  round: RoundRecord | null | undefined
): QuizAward[] {
  const question = getCurrentQuestion(round);
  if (!question) return [];

  return getCurrentQuestionAnswers(answers, round)
    .filter((answer) => answer.is_correct)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
    .map((answer, index) => ({
      teamId: answer.team_id,
      points: index === 0 ? question.points * 2 : question.points,
      role: index === 0 ? "fastest" : "correct",
    }));
}

export function formatQuizCategory(category: QuizCategory | undefined) {
  if (category === "bible_reference") return "Bible references";
  if (category === "bible_knowledge") return "Bible knowledge";
  return "Quiz";
}

export function isLastQuizQuestion(round: RoundRecord) {
  return (round.current_question_index ?? 0) >= (round.question_set?.length ?? 1) - 1;
}

/** True only for the persisted recovery/creation state that should enter live play. */
export function shouldAutoStartQuizQuestion(round: RoundRecord | null | undefined) {
  return Boolean(
    isRapidQuizRound(round) &&
      round?.status === "live" &&
      round.question_status === "waiting" &&
      getCurrentQuestion(round)
  );
}
