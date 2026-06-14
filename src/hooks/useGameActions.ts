import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { buildRoundDefinition } from "../data/gameContent";
import {
  HOST_SESSION_KEY,
  createDefaultDrafts,
  generateCode,
  normalizeTeam,
  toLegacyRoundPayload,
  toRoundRecord,
} from "../app/appHelpers";
import { getCurrentQuestion, getCurrentQuestionIndex } from "../features/quiz/quizEngine";
import { supabase } from "../lib/supabase";
import {
  fetchRoomByCode,
  fetchTeamByLeaderCode,
  roomColumns,
  roundColumns,
  teamColumns,
} from "../lib/supabaseQueries";
import type { SoundName } from "../lib/sound";
import type {
  AppMode,
  AnswerSubmission,
  Room,
  RoundRecord,
  RoundStatus,
  RoundType,
  ScoreEvent,
  Team,
  VoteRow,
} from "../lib/types";

type SoundEffects = {
  play: (name: SoundName) => void;
};

function votesForLeader(votes: VoteRow[], leaderTeamId: string) {
  return votes.find((vote) => vote.voter_team_id === leaderTeamId) ?? null;
}

type ScoreRpcRow = ScoreEvent & {
  new_score: number;
};

function toScoreEvent(row: ScoreRpcRow): ScoreEvent {
  return {
    id: row.id,
    room_id: row.room_id,
    round_id: row.round_id,
    team_id: row.team_id,
    delta: row.delta,
    reason: row.reason,
    created_at: row.created_at,
    undone_at: row.undone_at,
    dedupe_key: row.dedupe_key,
  };
}

type UseGameActionsArgs = {
  room: Room | null;
  teams: Team[];
  rounds: RoundRecord[];
  activeRound: RoundRecord | null;
  votes: VoteRow[];
  answerSubmissions: AnswerSubmission[];
  leaderTeam: Team | null;
  sortedVoteCounts: { team: Team; count: number }[];
  latestScoreEvent: ScoreEvent | null;
  roomCodeInput: string;
  teamCodeInput: string;
  timerDuration: number;
  customTimerInput: string;
  sound: SoundEffects;
  setMode: (mode: AppMode) => void;
  setRoom: Dispatch<SetStateAction<Room | null>>;
  setTeams: Dispatch<SetStateAction<Team[]>>;
  setRounds: Dispatch<SetStateAction<RoundRecord[]>>;
  setVotes: Dispatch<SetStateAction<VoteRow[]>>;
  setAnswerSubmissions: Dispatch<SetStateAction<AnswerSubmission[]>>;
  setScoreEvents: Dispatch<SetStateAction<ScoreEvent[]>>;
  setLeaderTeam: Dispatch<SetStateAction<Team | null>>;
  setActiveRound: Dispatch<SetStateAction<RoundRecord | null>>;
  setSelectedRoundType: (value: RoundType) => void;
  setShowWinner: Dispatch<SetStateAction<boolean>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  refreshRoomData: (roomId: string) => Promise<void>;
  queueRoomRefresh: (roomId: string, delay?: number) => void;
};

export function useGameActions({
  room,
  teams,
  rounds,
  activeRound,
  votes,
  answerSubmissions,
  leaderTeam,
  sortedVoteCounts,
  latestScoreEvent,
  roomCodeInput,
  teamCodeInput,
  timerDuration,
  customTimerInput,
  sound,
  setMode,
  setRoom,
  setTeams,
  setRounds,
  setVotes,
  setAnswerSubmissions,
  setScoreEvents,
  setLeaderTeam,
  setActiveRound,
  setSelectedRoundType,
  setShowWinner,
  setIsLoading,
  setLoadError,
  refreshRoomData,
  queueRoomRefresh,
}: UseGameActionsArgs) {
  const [scoringTeamIds, setScoringTeamIds] = useState<Record<string, boolean>>({});
  const [pendingVoteTargetId, setPendingVoteTargetId] = useState<string | null>(null);
  const [pendingAnswerKey, setPendingAnswerKey] = useState<string | null>(null);
  const scoringLocksRef = useRef<Record<string, boolean>>({});

  async function createRoom() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const code = generateCode();
      const hostPin = generateCode(6);

      const { data: createdRoom, error: roomError } = await supabase
        .from("rooms")
        .insert({ code, host_pin: hostPin, status: "active" })
        .select(roomColumns)
        .single();

      if (roomError || !createdRoom) throw roomError ?? new Error("Room creation failed.");

      const { data: createdTeams, error: teamsError } = await supabase
        .from("teams")
        .insert(
          createDefaultDrafts().map((team) => ({
            room_id: createdRoom.id,
            name: team.name,
            leader_code: team.leaderCode,
            score: 0,
            animal: team.animal,
            avatar_emoji: team.avatarEmoji,
            avatar_image: team.avatarImage,
            color: team.color,
          }))
        )
        .select(teamColumns);

      if (teamsError) throw teamsError;

      setRoom(createdRoom as Room);
      setTeams((createdTeams ?? []) as Team[]);
      setMode("host");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          HOST_SESSION_KEY,
          JSON.stringify({ roomCode: (createdRoom as Room).code, hostPin })
        );
      }
      sound.play("roundStart");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to create room right now."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function joinAsLeader() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const foundRoom = await fetchRoomByCode(roomCodeInput.trim().toUpperCase());
      const foundTeam = await fetchTeamByLeaderCode(
        foundRoom.id,
        teamCodeInput.trim().toUpperCase()
      );

      const { error: joinedError } = await supabase
        .from("teams")
        .update({ joined_at: new Date().toISOString() })
        .eq("id", foundTeam.id);

      if (joinedError && !joinedError.message.toLowerCase().includes("joined_at")) {
        throw joinedError;
      }

      setRoom(foundRoom as Room);
      setLeaderTeam(
        normalizeTeam(
          { ...(foundTeam as Team), joined_at: new Date().toISOString() },
          0
        )
      );
      setMode("leader");
      queueRoomRefresh(foundRoom.id, 0);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.pathname = "/join";
        url.searchParams.set("room", foundRoom.code);
        window.history.replaceState({}, "", url.toString());
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to join room.");
    } finally {
      setIsLoading(false);
    }
  }

  async function startRound(roundType?: RoundType) {
    if (!room) return;

    setLoadError(null);

    try {
      const definition = buildRoundDefinition(roundType);
      const nextRoundNumber = (rounds[0]?.round_number ?? 0) + 1;
      const status: RoundStatus = definition.requiresVoting ? "voting" : "scoring";
      const selectedTimer =
        Number(customTimerInput) > 0 ? Number(customTimerInput) : timerDuration;

      const roundPayload = {
        room_id: room.id,
        round_number: nextRoundNumber,
        round_type: definition.type,
        title: definition.title,
        prompt: definition.prompt,
        question: definition.prompt,
        challenge: definition.challenge,
        scoring_guide: definition.scoringGuide,
        instructions: definition.instructions,
        twist: definition.twist ?? null,
        status,
        is_final: definition.isFinal ?? false,
        timer_seconds: definition.requiresVoting ? selectedTimer : null,
        answer_options: definition.answerOptions ?? null,
        correct_answer: definition.correctAnswer ?? null,
        question_set: definition.questionSet ?? null,
        current_question_index: definition.currentQuestionIndex ?? 0,
        question_status: definition.questionStatus ?? "waiting",
        question_started_at: null,
      };

      const { data: insertedRound, error } = await supabase
        .from("rounds")
        .insert(roundPayload)
        .select(roundColumns)
        .single();

      if (error) {
        const legacyPayload: Partial<typeof roundPayload> = { ...roundPayload };
        delete legacyPayload.timer_seconds;
        delete legacyPayload.answer_options;
        delete legacyPayload.correct_answer;
        delete legacyPayload.question_set;
        delete legacyPayload.current_question_index;
        delete legacyPayload.question_status;
        delete legacyPayload.question_started_at;
        const { error: retryError } = await supabase
          .from("rounds")
          .insert(legacyPayload);

        if (retryError) {
          const { error: minimalRetryError } = await supabase
            .from("rounds")
            .insert(toLegacyRoundPayload(roundPayload));

          if (minimalRetryError) throw minimalRetryError;
        }
        queueRoomRefresh(room.id, 0);
      } else if (insertedRound) {
        const mappedRound = toRoundRecord(insertedRound as Record<string, unknown>);
        setRounds((current) => [mappedRound, ...current]);
        setActiveRound(mappedRound);
      }

      await supabase.from("rooms").update({ status: "active" }).eq("id", room.id);
      setRoom((current) => (current ? { ...current, status: "active" } : current));

      setSelectedRoundType(definition.type);
      setShowWinner(false);
      sound.play("roundStart");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to start the round."
      );
    }
  }

  async function submitVote(targetTeamId: string) {
    if (!activeRound || !leaderTeam || targetTeamId === leaderTeam.id) return;
    if (pendingVoteTargetId) return;

    const previousVotes = votesForLeader(votes, leaderTeam.id);
    setPendingVoteTargetId(targetTeamId);
    setVotes((current) => {
      const optimisticVote = {
        id: previousVotes?.id ?? `optimistic-${leaderTeam.id}`,
        round_id: activeRound.id,
        voter_team_id: leaderTeam.id,
        target_team_id: targetTeamId,
      };

      if (current.some((vote) => vote.voter_team_id === leaderTeam.id)) {
        return current.map((vote) =>
          vote.voter_team_id === leaderTeam.id ? optimisticVote : vote
        );
      }

      return [...current, optimisticVote];
    });

    const { error } = await supabase.from("votes").upsert(
      {
        round_id: activeRound.id,
        voter_team_id: leaderTeam.id,
        target_team_id: targetTeamId,
      },
      { onConflict: "round_id,voter_team_id" }
    );

    if (error) {
      setLoadError(error.message);
      setVotes((current) => {
        if (previousVotes) {
          return current.map((vote) =>
            vote.voter_team_id === leaderTeam.id ? previousVotes : vote
          );
        }
        return current.filter((vote) => vote.voter_team_id !== leaderTeam.id);
      });
      setPendingVoteTargetId(null);
      return;
    }

    setPendingVoteTargetId(null);
    navigator.vibrate?.(40);
    sound.play("voteSubmit");
  }

  async function submitAnswer(answer: string) {
    if (!activeRound || !leaderTeam) return;

    const currentQuestion = getCurrentQuestion(activeRound);
    const correctAnswer = currentQuestion?.correctAnswer ?? activeRound.correct_answer;
    if (!correctAnswer) return;

    const questionIndex = getCurrentQuestionIndex(activeRound);
    const answerKey = `${activeRound.id}:${questionIndex}:${answer}`;
    if (pendingAnswerKey) return;

    const submittedAt = new Date().toISOString();
    const isCorrect = answer === correctAnswer;
    const previousSubmission =
      answerSubmissions.find(
        (submission) =>
          submission.team_id === leaderTeam.id &&
          submission.round_id === activeRound.id &&
          submission.question_index === questionIndex
      ) ?? null;
    const optimistic = {
      id: previousSubmission?.id ?? `optimistic-answer-${leaderTeam.id}-${questionIndex}`,
      round_id: activeRound.id,
      team_id: leaderTeam.id,
      question_index: questionIndex,
      answer,
      is_correct: isCorrect,
      submitted_at: submittedAt,
    };

    setPendingAnswerKey(answerKey);
    setAnswerSubmissions((current) => {
      if (
        current.some(
          (submission) =>
            submission.team_id === leaderTeam.id &&
            submission.round_id === activeRound.id &&
            submission.question_index === questionIndex
        )
      ) {
        return current.map((submission) =>
          submission.team_id === leaderTeam.id &&
          submission.round_id === activeRound.id &&
          submission.question_index === questionIndex
            ? optimistic
            : submission
        );
      }

      return [...current, optimistic];
    });

    const { error } = await supabase.from("answer_submissions").upsert(
      {
        round_id: activeRound.id,
        team_id: leaderTeam.id,
        question_index: questionIndex,
        answer,
        is_correct: isCorrect,
        submitted_at: submittedAt,
      },
      { onConflict: "round_id,team_id,question_index" }
    );

    if (error) {
      setLoadError(error.message);
      setAnswerSubmissions((current) => {
        if (previousSubmission) {
          return current.map((submission) =>
            submission.team_id === leaderTeam.id &&
            submission.round_id === activeRound.id &&
            submission.question_index === questionIndex
              ? previousSubmission
              : submission
          );
        }
        return current.filter(
          (submission) =>
            !(
              submission.team_id === leaderTeam.id &&
              submission.round_id === activeRound.id &&
              submission.question_index === questionIndex
            )
        );
      });
      setPendingAnswerKey(null);
      return;
    }

    setPendingAnswerKey(null);
    navigator.vibrate?.(40);
    sound.play(isCorrect ? "score" : "voteSubmit");
  }

  async function lockVotes() {
    if (!activeRound) return;

    const winner = sortedVoteCounts[0];

    const { error } = await supabase
      .from("rounds")
      .update({
        status: "scoring",
        target_team_id: winner?.team.id ?? null,
      })
      .eq("id", activeRound.id);

    if (error) {
      setLoadError(error.message);
      return;
    }

      setActiveRound((current) =>
        current?.id === activeRound.id
          ? { ...current, status: "scoring", target_team_id: winner?.team.id ?? null }
          : current
      );
    setRounds((current) =>
      current.map((round) =>
        round.id === activeRound.id
          ? { ...round, status: "scoring", target_team_id: winner?.team.id ?? null }
          : round
      )
    );
    sound.play("reveal");
  }

  async function applyScore(teamId: string, delta: number, reason: string) {
    if (!room) return;
    if (scoringLocksRef.current[teamId]) return;

    const team = teams.find((entry) => entry.id === teamId);
    if (!team) return;

    const multiplier = activeRound?.round_type === "final_double" ? 2 : 1;
    const finalDelta = delta * multiplier;

    scoringLocksRef.current[teamId] = true;
    setScoringTeamIds((current) => ({ ...current, [teamId]: true }));

    try {
      const dedupeKey = [
        "score",
        room.id,
        activeRound?.id ?? "room",
        teamId,
        finalDelta,
        reason,
        crypto.randomUUID(),
      ].join(":");

      const { data, error } = await supabase
        .rpc("apply_score_event", {
          p_room_id: room.id,
          p_team_id: teamId,
          p_delta: finalDelta,
          p_reason: reason,
          p_round_id: activeRound?.id ?? null,
          p_dedupe_key: dedupeKey,
        })
        .single();

      if (error || !data) {
        setLoadError(error?.message ?? "Unable to score team.");
        return;
      }

      const scoreRow = data as ScoreRpcRow;
      setTeams((current) =>
        current.map((entry) =>
          entry.id === teamId ? { ...entry, score: scoreRow.new_score } : entry
        )
      );
      setScoreEvents((current) => [toScoreEvent(scoreRow), ...current]);
      sound.play("score");
    } finally {
      scoringLocksRef.current[teamId] = false;
      setScoringTeamIds((current) => ({ ...current, [teamId]: false }));
    }
  }

  async function undoLastScore() {
    if (!latestScoreEvent) return;

    const team = teams.find((entry) => entry.id === latestScoreEvent.team_id);
    if (!team) return;

    const { data, error } = await supabase
      .rpc("undo_score_event", {
        p_score_event_id: latestScoreEvent.id,
      })
      .single();

    if (error || !data) {
      setLoadError(error?.message ?? "Unable to undo score.");
      return;
    }

    const scoreRow = data as ScoreRpcRow;
    setTeams((current) =>
      current.map((entry) =>
        entry.id === team.id ? { ...entry, score: scoreRow.new_score } : entry
      )
    );
    setScoreEvents((current) =>
      current.map((event) =>
        event.id === latestScoreEvent.id ? toScoreEvent(scoreRow) : event
      )
    );
  }

  async function completeRound() {
    if (!activeRound) return;

    const nextStatus: RoundStatus =
      activeRound.round_type === "final_double" ? "winner" : "complete";

    const { error } = await supabase
      .from("rounds")
      .update({ status: nextStatus })
      .eq("id", activeRound.id);

    if (error) {
      setLoadError(error.message);
      return;
    }

    if (activeRound.round_type === "final_double") {
      setShowWinner(true);
      setActiveRound((current) =>
        current?.id === activeRound.id ? { ...current, status: "winner" } : current
      );
      setRounds((current) =>
        current.map((round) =>
          round.id === activeRound.id ? { ...round, status: "winner" } : round
        )
      );
      sound.play("winner");
      return;
    }

    await supabase.from("rooms").update({ status: "active" }).eq("id", activeRound.room_id);
    setActiveRound(null);
    setRounds((current) =>
      current.map((round) =>
        round.id === activeRound.id ? { ...round, status: "complete" } : round
      )
    );
  }

  async function revealWinner() {
    if (!room) return;
    setShowWinner(true);
    await supabase.from("rooms").update({ status: "winner" }).eq("id", room.id);
    setRoom((current) => (current ? { ...current, status: "winner" } : current));
    sound.play("winner");
  }

  async function resetGame() {
    if (!room) return;

    setLoadError(null);

    try {
      const roundIds = rounds.map((round) => round.id);

      if (roundIds.length > 0) {
        await supabase.from("votes").delete().in("round_id", roundIds);
      }

      await supabase.from("score_events").delete().eq("room_id", room.id);
      await supabase.from("rounds").delete().eq("room_id", room.id);
      await Promise.all(
        teams.map((team) => supabase.from("teams").update({ score: 0 }).eq("id", team.id))
      );
      await supabase.from("rooms").update({ status: "active" }).eq("id", room.id);
      setShowWinner(false);
      setVotes([]);
      setRounds([]);
      setActiveRound(null);
      setScoreEvents([]);
      setRoom((current) => (current ? { ...current, status: "active" } : current));
      queueRoomRefresh(room.id, 120);
      sound.play("reveal");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to reset game.");
    }
  }

  async function updateTeamContent(
    teamId: string,
    patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>
  ) {
    const { error } = await supabase.from("teams").update(patch).eq("id", teamId);

    if (error) {
      setLoadError(error.message);
      return;
    }

    if (room) await refreshRoomData(room.id);
  }

  async function updateRoundContent(
    roundId: string,
    patch: Partial<
      Pick<
        RoundRecord,
        "title" | "prompt" | "challenge" | "instructions" | "scoring_guide" | "twist"
      >
    >
  ) {
    const { error } = await supabase.from("rounds").update(patch).eq("id", roundId);

    if (error) {
      setLoadError(error.message);
      return;
    }

    if (room) await refreshRoomData(room.id);
  }

  return {
    scoringTeamIds,
    pendingVoteTargetId,
    pendingAnswerKey,
    createRoom,
    joinAsLeader,
    startRound,
    submitVote,
    submitAnswer,
    lockVotes,
    applyScore,
    undoLastScore,
    completeRound,
    revealWinner,
    resetGame,
    updateTeamContent,
    updateRoundContent,
  };
}
