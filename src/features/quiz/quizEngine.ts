import type { AnswerSubmission, QuizQuestion, RoundRecord } from "../../lib/types";

export function isRapidQuizRound(round: RoundRecord | null | undefined) {
  return Boolean(
    round?.question_set?.length &&
      (round.round_type === "quiz_burst" || round.round_type === "bible_speed")
  );
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

export function isLastQuizQuestion(round: RoundRecord) {
  return (round.current_question_index ?? 0) >= (round.question_set?.length ?? 1) - 1;
}
