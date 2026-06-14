import { useState, type Dispatch, type SetStateAction } from "react";
import { buildRoundDefinition } from "../data/gameContent";
import {
  HOST_SESSION_KEY,
  createDefaultDrafts,
  generateCode,
  normalizeTeam,
  toLegacyRoundPayload,
} from "../app/appHelpers";
import { supabase } from "../lib/supabase";
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

type UseGameActionsArgs = {
  room: Room | null;
  teams: Team[];
  rounds: RoundRecord[];
  activeRound: RoundRecord | null;
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

  async function createRoom() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const code = generateCode();
      const hostPin = generateCode(6);

      const { data: createdRoom, error: roomError } = await supabase
        .from("rooms")
        .insert({ code, host_pin: hostPin, status: "active" })
        .select()
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
        .select();

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
      const { data: foundRoom, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCodeInput.trim().toUpperCase())
        .single();

      if (roomError || !foundRoom) throw new Error("Room not found.");

      const { data: foundTeam, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("room_id", foundRoom.id)
        .eq("leader_code", teamCodeInput.trim().toUpperCase())
        .single();

      if (teamError || !foundTeam) throw new Error("Team code not found.");

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
      };

      const { error } = await supabase.from("rounds").insert(roundPayload);

      if (error) {
        const legacyPayload: Partial<typeof roundPayload> = { ...roundPayload };
        delete legacyPayload.timer_seconds;
        delete legacyPayload.answer_options;
        delete legacyPayload.correct_answer;
        const { error: retryError } = await supabase.from("rounds").insert(legacyPayload);

        if (retryError) {
          const { error: minimalRetryError } = await supabase
            .from("rounds")
            .insert(toLegacyRoundPayload(roundPayload));

          if (minimalRetryError) throw minimalRetryError;
        }
      }

      await supabase.from("rooms").update({ status: "active" }).eq("id", room.id);

      setSelectedRoundType(definition.type);
      setShowWinner(false);
      queueRoomRefresh(room.id, 0);
      sound.play("roundStart");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to start the round."
      );
    }
  }

  async function submitVote(targetTeamId: string) {
    if (!activeRound || !leaderTeam || targetTeamId === leaderTeam.id) return;

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
      return;
    }

    setVotes((current) => {
      const existing = current.find((vote) => vote.voter_team_id === leaderTeam.id);
      if (existing) {
        return current.map((vote) =>
          vote.voter_team_id === leaderTeam.id
            ? { ...vote, target_team_id: targetTeamId }
            : vote
        );
      }

      return [
        ...current,
        {
          id: `optimistic-${leaderTeam.id}`,
          round_id: activeRound.id,
          voter_team_id: leaderTeam.id,
          target_team_id: targetTeamId,
        },
      ];
    });
    if (room) queueRoomRefresh(room.id, 250);
    navigator.vibrate?.(40);
    sound.play("voteSubmit");
  }

  async function submitAnswer(answer: string) {
    if (!activeRound || !leaderTeam || !activeRound.correct_answer) return;

    const submittedAt = new Date().toISOString();
    const isCorrect = answer === activeRound.correct_answer;

    const { error } = await supabase.from("answer_submissions").upsert(
      {
        round_id: activeRound.id,
        team_id: leaderTeam.id,
        answer,
        is_correct: isCorrect,
        submitted_at: submittedAt,
      },
      { onConflict: "round_id,team_id" }
    );

    if (error) {
      setLoadError(error.message);
      return;
    }

    setAnswerSubmissions((current) => {
      const optimistic = {
        id: `optimistic-answer-${leaderTeam.id}`,
        round_id: activeRound.id,
        team_id: leaderTeam.id,
        answer,
        is_correct: isCorrect,
        submitted_at: submittedAt,
      };

      if (current.some((submission) => submission.team_id === leaderTeam.id)) {
        return current.map((submission) =>
          submission.team_id === leaderTeam.id ? optimistic : submission
        );
      }

      return [...current, optimistic];
    });

    if (room) queueRoomRefresh(room.id, 150);
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
    if (room) queueRoomRefresh(room.id, 120);
    sound.play("reveal");
  }

  async function applyScore(teamId: string, delta: number, reason: string) {
    if (!room) return;
    if (scoringTeamIds[teamId]) return;

    const team = teams.find((entry) => entry.id === teamId);
    if (!team) return;

    const multiplier = activeRound?.round_type === "final_double" ? 2 : 1;
    const finalDelta = delta * multiplier;

    setScoringTeamIds((current) => ({ ...current, [teamId]: true }));

    try {
      const { error: updateError } = await supabase
        .from("teams")
        .update({ score: team.score + finalDelta })
        .eq("id", teamId);

      if (updateError) {
        setLoadError(updateError.message);
        return;
      }

      setTeams((current) =>
        current.map((entry) =>
          entry.id === teamId ? { ...entry, score: entry.score + finalDelta } : entry
        )
      );

      const { error: eventError } = await supabase.from("score_events").insert({
        room_id: room.id,
        round_id: activeRound?.id ?? null,
        team_id: teamId,
        delta: finalDelta,
        reason,
      });

      if (eventError) {
        setLoadError(eventError.message);
        return;
      }

      queueRoomRefresh(room.id, 250);
      sound.play("score");
    } finally {
      setScoringTeamIds((current) => ({ ...current, [teamId]: false }));
    }
  }

  async function undoLastScore() {
    if (!latestScoreEvent) return;

    const team = teams.find((entry) => entry.id === latestScoreEvent.team_id);
    if (!team) return;

    const { error: teamError } = await supabase
      .from("teams")
      .update({ score: team.score - latestScoreEvent.delta })
      .eq("id", team.id);

    if (teamError) {
      setLoadError(teamError.message);
      return;
    }

    const { error: eventError } = await supabase
      .from("score_events")
      .update({ undone_at: new Date().toISOString() })
      .eq("id", latestScoreEvent.id);

    if (eventError) {
      setLoadError(eventError.message);
      return;
    }

    setTeams((current) =>
      current.map((entry) =>
        entry.id === team.id ? { ...entry, score: entry.score - latestScoreEvent.delta } : entry
      )
    );
    if (room) queueRoomRefresh(room.id, 250);
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
      if (room) queueRoomRefresh(room.id, 120);
      sound.play("winner");
      return;
    }

    await supabase.from("rooms").update({ status: "active" }).eq("id", activeRound.room_id);
    setActiveRound(null);
    if (room) queueRoomRefresh(room.id, 120);
  }

  async function revealWinner() {
    if (!room) return;
    setShowWinner(true);
    await supabase.from("rooms").update({ status: "winner" }).eq("id", room.id);
    setRoom((current) => (current ? { ...current, status: "winner" } : current));
    queueRoomRefresh(room.id, 120);
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
