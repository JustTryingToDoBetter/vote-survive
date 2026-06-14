import { useState, type Dispatch, type SetStateAction } from "react";
import { toRoundRecord } from "../app/appHelpers";
import {
  getCurrentQuestionAnswers,
  getCurrentQuestionIndex,
  getFastestCorrect,
  isLastQuizQuestion,
} from "../features/quiz/quizEngine";
import { supabase } from "../lib/supabase";
import { roundColumns } from "../lib/supabaseQueries";
import type { AnswerSubmission, RoundRecord } from "../lib/types";

type UseQuizActionsArgs = {
  activeRound: RoundRecord | null;
  answerSubmissions: AnswerSubmission[];
  setRounds: Dispatch<SetStateAction<RoundRecord[]>>;
  setActiveRound: Dispatch<SetStateAction<RoundRecord | null>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  applyScore: (teamId: string, delta: number, reason: string) => Promise<void>;
};

export function useQuizActions({
  activeRound,
  answerSubmissions,
  setRounds,
  setActiveRound,
  setLoadError,
  applyScore,
}: UseQuizActionsArgs) {
  const [pendingQuizAction, setPendingQuizAction] = useState<string | null>(null);

  async function updateRound(patch: Partial<RoundRecord>, actionName: string) {
    if (!activeRound || pendingQuizAction) return;

    setPendingQuizAction(actionName);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("rounds")
        .update(patch)
        .eq("id", activeRound.id)
        .select(roundColumns)
        .single();

      if (error) throw error;

      const updatedRound = toRoundRecord(data as Record<string, unknown>);
      setActiveRound(updatedRound.status === "complete" ? null : updatedRound);
      setRounds((current) =>
        current.map((round) => (round.id === updatedRound.id ? updatedRound : round))
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to update quiz.");
    } finally {
      setPendingQuizAction(null);
    }
  }

  function startQuestion() {
    void updateRound(
      {
        question_status: "live",
        question_started_at: new Date().toISOString(),
      },
      "start"
    );
  }

  function lockQuestion() {
    void updateRound({ question_status: "locked" }, "lock");
  }

  function nextQuestion() {
    if (!activeRound || isLastQuizQuestion(activeRound)) return;
    void updateRound(
      {
        current_question_index: getCurrentQuestionIndex(activeRound) + 1,
        question_status: "waiting",
        question_started_at: null,
      },
      "next"
    );
  }

  function endQuizRound() {
    void updateRound({ question_status: "complete", status: "complete" }, "end");
  }

  async function awardFastestCorrect() {
    if (!activeRound || pendingQuizAction) return;
    const fastest = getFastestCorrect(answerSubmissions, activeRound);
    if (!fastest) return;
    setPendingQuizAction("score-fastest");
    try {
      await applyScore(fastest.team_id, 10, "Rapid quiz fastest correct");
    } finally {
      setPendingQuizAction(null);
    }
  }

  async function awardAllCorrect() {
    if (!activeRound || pendingQuizAction) return;
    const correctAnswers = getCurrentQuestionAnswers(answerSubmissions, activeRound).filter(
      (answer) => answer.is_correct
    );
    setPendingQuizAction("score-correct");
    try {
      for (const answer of correctAnswers) {
        await applyScore(answer.team_id, 5, "Rapid quiz correct answer");
      }
    } finally {
      setPendingQuizAction(null);
    }
  }

  return {
    pendingQuizAction,
    startQuestion,
    lockQuestion,
    nextQuestion,
    endQuizRound,
    awardFastestCorrect,
    awardAllCorrect,
  };
}
