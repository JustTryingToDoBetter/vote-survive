
import { useState, type Dispatch, type SetStateAction } from "react";
import { toRoundRecord } from "../app/appHelpers";
import {
  getCurrentQuestionIndex,
  getQuizAwardPlan,
  isLastQuizQuestion,
} from "../features/quiz/quizEngine";
import { getHostSupabase } from "../lib/supabase";
import { roundColumns } from "../lib/supabaseQueries";
import type { AnswerSubmission, RoundRecord } from "../lib/types";

type UseQuizActionsArgs = {
  activeRound: RoundRecord | null;
  answerSubmissions: AnswerSubmission[];
  setRounds: Dispatch<SetStateAction<RoundRecord[]>>;
  setActiveRound: Dispatch<SetStateAction<RoundRecord | null>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  applyScore: (
    teamId: string,
    delta: number,
    reason: string,
    dedupeKey?: string
  ) => Promise<void>;
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
    if (!activeRound || pendingQuizAction) return false;

    setPendingQuizAction(actionName);
    setLoadError(null);

    try {
      const hostSupabase = getHostSupabase();
      const { data, error } = await hostSupabase
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
      return true;
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to update quiz.");
      return false;
    } finally {
      setPendingQuizAction(null);
    }
  }

  function startQuestion() {
    if (!activeRound || (activeRound.question_status ?? "waiting") !== "waiting") return;
    void updateRound(
      {
        question_status: "live",
        correct_answer: null,
        question_started_at: new Date().toISOString(),
      },
      "start"
    );
  }

  async function lockQuestion() {
    if (!activeRound || activeRound.question_status !== "live") return false;
    return updateRound({ question_status: "locked" }, "lock");
  }

  async function revealAnswer() {
    if (
      !activeRound ||
      activeRound.question_status !== "locked" ||
      pendingQuizAction
    ) {
      return;
    }

    setPendingQuizAction("reveal");
    setLoadError(null);

    try {
      const hostSupabase = getHostSupabase();
      const { error: revealError } = await hostSupabase.rpc(
        "host_reveal_quiz_answer",
        { p_round_id: activeRound.id }
      );
      if (revealError) throw revealError;

      const { data, error } = await hostSupabase
        .from("rounds")
        .select(roundColumns)
        .eq("id", activeRound.id)
        .single();
      if (error) throw error;

      const updatedRound = toRoundRecord(data as Record<string, unknown>);
      setActiveRound(updatedRound);
      setRounds((current) =>
        current.map((round) => (round.id === updatedRound.id ? updatedRound : round))
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to reveal quiz answer.");
    } finally {
      setPendingQuizAction(null);
    }
  }

  function nextQuestion() {
    if (
      !activeRound ||
      activeRound.question_status !== "scored" ||
      isLastQuizQuestion(activeRound)
    ) {
      return;
    }
    void updateRound(
      {
        current_question_index: getCurrentQuestionIndex(activeRound) + 1,
        question_status: "waiting",
        correct_answer: null,
        question_started_at: null,
      },
      "next"
    );
  }

  function endQuizRound() {
    if (!activeRound || activeRound.question_status !== "scored") return;
    void updateRound({ question_status: "complete", status: "locked" }, "end");
  }

  async function awardQuestionScores() {
    if (
      !activeRound ||
      activeRound.question_status !== "revealed" ||
      pendingQuizAction
    ) {
      return;
    }

    const questionIndex = getCurrentQuestionIndex(activeRound);
    const awards = getQuizAwardPlan(answerSubmissions, activeRound);

    setPendingQuizAction("score-results");
    setLoadError(null);
    try {
      for (const award of awards) {
        await applyScore(
          award.teamId,
          award.points,
          award.role === "fastest"
            ? "Rapid quiz fastest correct"
            : "Rapid quiz correct answer",
          `quiz:${activeRound.id}:${questionIndex}:${award.teamId}:result`
        );
      }

      const hostSupabase = getHostSupabase();
      const { data, error } = await hostSupabase
        .from("rounds")
        .update({ question_status: "scored" })
        .eq("id", activeRound.id)
        .select(roundColumns)
        .single();
      if (error) throw error;

      const updatedRound = toRoundRecord(data as Record<string, unknown>);
      setActiveRound(updatedRound);
      setRounds((current) =>
        current.map((round) => (round.id === updatedRound.id ? updatedRound : round))
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to score quiz question.");
    } finally {
      setPendingQuizAction(null);
    }
  }

  return {
    pendingQuizAction,
    startQuestion,
    lockQuestion,
    revealAnswer,
    nextQuestion,
    endQuizRound,
    awardQuestionScores,
  };
}
