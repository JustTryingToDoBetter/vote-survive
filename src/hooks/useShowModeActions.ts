import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { buildRoundDefinition } from "../data/gameContent";
import { supabase } from "../lib/supabase";
import { roomColumns } from "../lib/supabaseQueries";
import type { PlannedRound, Room, RoundDefinition, RoundRecord, RoundType } from "../lib/types";

type UseShowModeActionsArgs = {
  room: Room | null;
  activeRound: RoundRecord | null;
  setRoom: Dispatch<SetStateAction<Room | null>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  startRound: (type?: RoundType, definition?: RoundDefinition) => Promise<boolean>;
};

function toRoundDefinition(plannedRound: PlannedRound): RoundDefinition {
  return {
    type: plannedRound.type,
    title: plannedRound.title,
    prompt: plannedRound.prompt,
    challenge: plannedRound.challenge,
    instructions: plannedRound.instructions,
    scoringGuide: plannedRound.scoringGuide,
    twist: plannedRound.twist,
    requiresVoting: plannedRound.requiresVoting,
    isFinal: plannedRound.isFinal,
    answerOptions: plannedRound.answerOptions,
    correctAnswer: plannedRound.correctAnswer,
    questionSet: plannedRound.questionSet,
    currentQuestionIndex: plannedRound.currentQuestionIndex,
    questionStatus: plannedRound.questionStatus,
  };
}

function moveItem(items: PlannedRound[], itemId: string, direction: -1 | 1) {
  const index = items.findIndex((item) => item.id === itemId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export function useShowModeActions({
  room,
  activeRound,
  setRoom,
  setLoadError,
  startRound,
}: UseShowModeActionsArgs) {
  const [pendingShowAction, setPendingShowAction] = useState<string | null>(null);
  const plannedRounds = useMemo(
    () => room?.planned_round_queue ?? [],
    [room?.planned_round_queue]
  );
  const canStartPlannedRound = Boolean(
    room &&
      plannedRounds.length > 0 &&
      (!activeRound || activeRound.status === "complete" || activeRound.status === "winner")
  );

  async function saveQueue(nextQueue: PlannedRound[], actionName: string) {
    if (!room || pendingShowAction) return false;

    const previousQueue = plannedRounds;
    setPendingShowAction(actionName);
    setLoadError(null);
    setRoom((current) =>
      current ? { ...current, planned_round_queue: nextQueue } : current
    );

    try {
      const { data, error } = await supabase
        .from("rooms")
        .update({ planned_round_queue: nextQueue })
        .eq("id", room.id)
        .select(roomColumns)
        .single();

      if (error || !data) throw error ?? new Error("Unable to update show queue.");

      setRoom(data as Room);
      return true;
    } catch (error) {
      setRoom((current) =>
        current ? { ...current, planned_round_queue: previousQueue } : current
      );
      setLoadError(
        error instanceof Error ? error.message : "Unable to update show queue."
      );
      return false;
    } finally {
      setPendingShowAction(null);
    }
  }

  function addPlannedRound(roundType: RoundType) {
    const definition = buildRoundDefinition(roundType);
    const plannedRound: PlannedRound = {
      ...definition,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    void saveQueue([...plannedRounds, plannedRound], "add");
  }

  function skipPlannedRound(itemId = plannedRounds[0]?.id) {
    if (!itemId) return;
    void saveQueue(
      plannedRounds.filter((item) => item.id !== itemId),
      "skip"
    );
  }

  function movePlannedRound(itemId: string, direction: -1 | 1) {
    void saveQueue(moveItem(plannedRounds, itemId, direction), "move");
  }

  async function startNextPlannedRound() {
    const nextRound = plannedRounds[0];
    if (!nextRound || !canStartPlannedRound || pendingShowAction) return;

    setPendingShowAction("start");
    const didStart = await startRound(nextRound.type, toRoundDefinition(nextRound));
    setPendingShowAction(null);

    if (didStart) {
      void saveQueue(plannedRounds.filter((item) => item.id !== nextRound.id), "consume");
    }
  }

  return {
    plannedRounds,
    pendingShowAction,
    canStartPlannedRound,
    addPlannedRound,
    skipPlannedRound,
    movePlannedRound,
    startNextPlannedRound,
  };
}
