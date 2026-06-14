import { useCallback, useEffect, useRef, useState } from "react";
import {
  HOST_SESSION_KEY,
  normalizeTeam,
  toRoundRecord,
} from "../app/appHelpers";
import { REALTIME_DEBOUNCE_MS, LIVE_SYNC_INTERVAL_MS } from "../lib/sessionConfig";
import { supabase } from "../lib/supabase";
import type {
  AppMode,
  AnswerSubmission,
  Room,
  RoundRecord,
  ScoreEvent,
  Team,
  VoteRow,
} from "../lib/types";
import type { SyncState } from "../features/gameflow/gamePhases";

type UseRoomSessionArgs = {
  initialPath: AppMode;
  initialRoomCode: string;
  setMode: (mode: AppMode) => void;
};

export function useRoomSession({
  initialPath,
  initialRoomCode,
  setMode,
}: UseRoomSessionArgs) {
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeRound, setActiveRound] = useState<RoundRecord | null>(null);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [answerSubmissions, setAnswerSubmissions] = useState<AnswerSubmission[]>([]);
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const [leaderTeam, setLeaderTeam] = useState<Team | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [teamCodeInput, setTeamCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncAt: null,
    latencyMs: null,
  });
  const refreshSequenceRef = useRef(0);
  const refreshTimerRef = useRef<number | null>(null);

  const refreshRoomData = useCallback(async (roomId: string) => {
    const requestId = refreshSequenceRef.current + 1;
    refreshSequenceRef.current = requestId;
    const startedAt = performance.now();

    try {
      setSyncState((current) => ({ ...current, isSyncing: true }));
      setLoadError(null);

      const [
        { data: roomRow, error: roomError },
        { data: teamRows, error: teamError },
        { data: roundRows, error: roundError },
      ] = await Promise.all([
        supabase.from("rooms").select("*").eq("id", roomId).single(),
        supabase.from("teams").select("*").eq("room_id", roomId),
        supabase
          .from("rounds")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false }),
      ]);

      if (roomError) throw roomError;
      if (teamError) throw teamError;
      if (roundError) throw roundError;
      if (requestId !== refreshSequenceRef.current) return;

      const normalizedTeams = (teamRows ?? []).map((team, index) =>
        normalizeTeam(team as Team, index)
      );
      const mappedRounds = (roundRows ?? []).map((row) =>
        toRoundRecord(row as Record<string, unknown>)
      );
      const currentRound =
        mappedRounds.find((round) => round.status !== "complete") ?? null;

      setRoom(roomRow as Room);
      setTeams(normalizedTeams);
      setRounds(mappedRounds);
      setActiveRound(currentRound);

      if (!currentRound) {
        setVotes([]);
        setAnswerSubmissions([]);
      } else {
        const [
          { data: voteRows, error: voteError },
          { data: answerRows, error: answerError },
        ] = await Promise.all([
          supabase.from("votes").select("*").eq("round_id", currentRound.id),
          supabase
            .from("answer_submissions")
            .select("*")
            .eq("round_id", currentRound.id)
            .order("submitted_at", { ascending: true }),
        ]);

        if (voteError) throw voteError;
        if (requestId !== refreshSequenceRef.current) return;
        setVotes((voteRows ?? []) as VoteRow[]);
        if (!answerError) {
          setAnswerSubmissions((answerRows ?? []) as AnswerSubmission[]);
        }
      }

      const { data: scoreRows, error: scoreError } = await supabase
        .from("score_events")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

      if (scoreError) {
        setScoreEvents([]);
      } else {
        if (requestId !== refreshSequenceRef.current) return;
        setScoreEvents((scoreRows ?? []) as ScoreEvent[]);
      }

      setSyncState({
        isSyncing: false,
        lastSyncAt: Date.now(),
        latencyMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      setSyncState((current) => ({ ...current, isSyncing: false }));
      setLoadError(
        error instanceof Error ? error.message : "Unable to refresh room right now."
      );
    }
  }, []);

  const queueRoomRefresh = useCallback(
    (roomId: string, delay = REALTIME_DEBOUNCE_MS) => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        void refreshRoomData(roomId);
      }, delay);
    },
    [refreshRoomData]
  );

  const loadRoomByCode = useCallback(
    async (code: string, nextMode: AppMode) => {
      const normalizedCode = code.trim().toUpperCase();
      if (!normalizedCode) return;

      setIsLoading(true);
      setLoadError(null);

      try {
        const { data: foundRoom, error } = await supabase
          .from("rooms")
          .select("*")
          .eq("code", normalizedCode)
          .single();

        if (error || !foundRoom) throw new Error("Room not found.");

        setRoom(foundRoom as Room);
        setRoomCodeInput((foundRoom as Room).code);
        setMode(nextMode);
        await refreshRoomData((foundRoom as Room).id);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load room.");
      } finally {
        setIsLoading(false);
      }
    },
    [refreshRoomData, setMode]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (initialPath === "game" || initialPath === "leaderboard") {
      window.setTimeout(() => void loadRoomByCode(initialRoomCode, initialPath), 0);
      return;
    }

    if (initialPath === "leader") return;

    const stored = window.localStorage.getItem(HOST_SESSION_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { roomCode?: string };
      if (parsed.roomCode) {
        window.setTimeout(() => void loadRoomByCode(parsed.roomCode ?? "", "host"), 0);
      }
    } catch {
      window.localStorage.removeItem(HOST_SESSION_KEY);
    }
  }, [initialPath, initialRoomCode, loadRoomByCode]);

  useEffect(() => {
    if (!room) return;

    queueRoomRefresh(room.id, 0);

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `room_id=eq.${room.id}` },
        () => queueRoomRefresh(room.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${room.id}` },
        () => queueRoomRefresh(room.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "score_events", filter: `room_id=eq.${room.id}` },
        () => queueRoomRefresh(room.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        () => queueRoomRefresh(room.id)
      )
      .subscribe();

    const pollTimer = window.setInterval(() => {
      queueRoomRefresh(room.id, 0);
    }, LIVE_SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [queueRoomRefresh, room]);

  useEffect(() => {
    if (!room || !activeRound?.id) return;

    const channel = supabase
      .channel(`votes-${activeRound.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `round_id=eq.${activeRound.id}` },
        () => queueRoomRefresh(room.id, 60)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answer_submissions",
          filter: `round_id=eq.${activeRound.id}`,
        },
        () => queueRoomRefresh(room.id, 60)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeRound?.id, queueRoomRefresh, room]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return {
    room,
    setRoom,
    teams,
    setTeams,
    activeRound,
    setActiveRound,
    rounds,
    setRounds,
    votes,
    setVotes,
    answerSubmissions,
    setAnswerSubmissions,
    scoreEvents,
    setScoreEvents,
    leaderTeam,
    setLeaderTeam,
    roomCodeInput,
    setRoomCodeInput,
    teamCodeInput,
    setTeamCodeInput,
    isLoading,
    setIsLoading,
    loadError,
    setLoadError,
    syncState,
    refreshRoomData,
    queueRoomRefresh,
    loadRoomByCode,
  };
}
