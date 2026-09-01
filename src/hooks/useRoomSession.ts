import { useCallback, useEffect, useRef, useState } from "react";
import { HOST_SESSION_KEY, LEADER_SESSION_KEY, normalizeTeam, toRoundRecord } from "../app/appHelpers";
import { LIVE_SYNC_INTERVAL_MS, REALTIME_DEBOUNCE_MS } from "../lib/sessionConfig";
import { supabase } from "../lib/supabase";
import {
  fetchAnswers,
  fetchBootstrapRoomState,
  fetchRoom,
  fetchRoomByCode,
  fetchRounds,
  fetchScores,
  fetchTeams,
  fetchVotes,
  getActiveRound,
  mapAnswerSubmission,
} from "../lib/supabaseQueries";
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

function sortRounds(rounds: RoundRecord[]) {
  return [...rounds].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const found = items.some((entry) => entry.id === item.id);
  return found ? items.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...items];
}

function upsertVote(items: VoteRow[], item: VoteRow) {
  const found = items.some(
    (entry) =>
      entry.round_id === item.round_id && entry.voter_team_id === item.voter_team_id
  );
  return found
    ? items.map((entry) =>
        entry.round_id === item.round_id && entry.voter_team_id === item.voter_team_id
          ? item
          : entry
      )
    : [...items, item];
}

function upsertAnswer(items: AnswerSubmission[], item: AnswerSubmission) {
  const found = items.some(
    (entry) =>
      entry.round_id === item.round_id &&
      entry.team_id === item.team_id &&
      entry.question_index === item.question_index
  );
  return found
    ? items.map((entry) =>
        entry.round_id === item.round_id &&
        entry.team_id === item.team_id &&
        entry.question_index === item.question_index
          ? item
          : entry
      )
    : [...items, item];
}

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

  const markSynced = useCallback((startedAt: number) => {
    setSyncState({
      isSyncing: false,
      lastSyncAt: Date.now(),
      latencyMs: Math.round(performance.now() - startedAt),
    });
  }, []);

  const refreshRoom = useCallback(
    async (roomId: string) => {
      const startedAt = performance.now();
      setRoom(await fetchRoom(roomId));
      markSynced(startedAt);
    },
    [markSynced]
  );

  const refreshTeams = useCallback(
    async (roomId: string) => {
      const startedAt = performance.now();
      setTeams(await fetchTeams(roomId));
      markSynced(startedAt);
    },
    [markSynced]
  );

  const refreshRounds = useCallback(
    async (roomId: string) => {
      const startedAt = performance.now();
      const nextRounds = await fetchRounds(roomId);
      setRounds(nextRounds);
      setActiveRound(getActiveRound(nextRounds));
      markSynced(startedAt);
      return nextRounds;
    },
    [markSynced]
  );

  const refreshActiveRound = useCallback(
    async (roomId: string) => {
      const nextRounds = await refreshRounds(roomId);
      return getActiveRound(nextRounds);
    },
    [refreshRounds]
  );

  const refreshVotes = useCallback(
    async (roundId?: string) => {
      const nextRoundId = roundId ?? activeRound?.id;
      if (!nextRoundId) {
        setVotes([]);
        return;
      }

      const startedAt = performance.now();
      setVotes(await fetchVotes(nextRoundId));
      markSynced(startedAt);
    },
    [activeRound?.id, markSynced]
  );

  const refreshAnswers = useCallback(
    async (roundId?: string) => {
      const nextRoundId = roundId ?? activeRound?.id;
      if (!nextRoundId) {
        setAnswerSubmissions([]);
        return;
      }

      const startedAt = performance.now();
      setAnswerSubmissions(await fetchAnswers(nextRoundId));
      markSynced(startedAt);
    },
    [activeRound?.id, markSynced]
  );

  const refreshScores = useCallback(
    async (roomId: string) => {
      const startedAt = performance.now();
      setScoreEvents(await fetchScores(roomId));
      markSynced(startedAt);
    },
    [markSynced]
  );

  const refreshRoomData = useCallback(
    async (roomId: string) => {
      const requestId = refreshSequenceRef.current + 1;
      refreshSequenceRef.current = requestId;
      const startedAt = performance.now();

      try {
        setSyncState((current) => ({ ...current, isSyncing: true }));
        setLoadError(null);

        const bootstrap = await fetchBootstrapRoomState(roomId).catch(() => null);

        if (requestId !== refreshSequenceRef.current) return;

        if (bootstrap) {
          setRoom(bootstrap.room ?? null);
          setTeams(bootstrap.teams);
          setRounds(bootstrap.rounds);
          setActiveRound(bootstrap.activeRound);
          setVotes(bootstrap.votes);
          setAnswerSubmissions(bootstrap.answers);
          setScoreEvents([]);
          markSynced(startedAt);
          return;
        }

        const [roomRow, teamRows, roundRows] = await Promise.all([
          fetchRoom(roomId),
          fetchTeams(roomId),
          fetchRounds(roomId),
        ]);

        const currentRound = getActiveRound(roundRows);
        const [voteRows, answerRows] = currentRound
          ? await Promise.all([fetchVotes(currentRound.id), fetchAnswers(currentRound.id)])
          : [[], []];

        if (requestId !== refreshSequenceRef.current) return;

        setRoom(roomRow);
        setTeams(teamRows);
        setRounds(roundRows);
        setActiveRound(currentRound);
        setVotes(voteRows);
        setAnswerSubmissions(answerRows);
        setScoreEvents([]);
        markSynced(startedAt);
      } catch (error) {
        setSyncState((current) => ({ ...current, isSyncing: false }));
        setLoadError(
          error instanceof Error ? error.message : "Unable to refresh room right now."
        );
      }
    },
    [markSynced]
  );

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
        const foundRoom = await fetchRoomByCode(normalizedCode);

        setRoom(foundRoom);
        setRoomCodeInput(foundRoom.code);
        setMode(nextMode);
        await refreshRoomData(foundRoom.id);
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

    if (initialPath === "leader") {
      const storedLeader = window.localStorage.getItem(LEADER_SESSION_KEY);
      if (!storedLeader) return;

      try {
        const parsed = JSON.parse(storedLeader) as {
          roomCode?: string;
          sessionToken?: string;
        };
        const storedRoomCode = parsed.roomCode?.trim().toUpperCase() ?? "";
        const storedSessionToken = parsed.sessionToken?.trim() ?? "";

        if (!storedRoomCode || !storedSessionToken) {
          window.localStorage.removeItem(LEADER_SESSION_KEY);
          return;
        }

        if (initialRoomCode && storedRoomCode !== initialRoomCode) return;

        window.setTimeout(() => {
          void (async () => {
            try {
              setIsLoading(true);
              const { data: sessionData, error: sessionError } = await supabase
                .rpc("restore_team_session", {
                  p_session_token: storedSessionToken,
                })
                .single();

              if (sessionError || !sessionData) {
                throw sessionError ?? new Error("Leader session is invalid or expired.");
              }

              const restoredSession = sessionData as {
                room_id: string;
                team_id: string;
                joined_at: string | null;
                expires_at: string;
              };
              const foundRoom = await fetchRoom(restoredSession.room_id);
              const roomTeams = await fetchTeams(foundRoom.id);
              const foundTeam = roomTeams.find(
                (team: Team) => team.id === restoredSession.team_id
              );

              if (!foundTeam) {
                throw new Error("Leader team could not be restored.");
              }

              setRoom(foundRoom);
              setTeams(roomTeams);
              setRoomCodeInput(foundRoom.code);
              setTeamCodeInput("");
              setLeaderTeam({
                ...foundTeam,
                joined_at: restoredSession.joined_at ?? foundTeam.joined_at,
              });
              setMode("leader");
              await refreshRoomData(foundRoom.id);
            } catch {
              window.localStorage.removeItem(LEADER_SESSION_KEY);
              setLeaderTeam(null);
            } finally {
              setIsLoading(false);
            }
          })();
        }, 0);
      } catch {
        window.localStorage.removeItem(LEADER_SESSION_KEY);
      }
      return;
    }

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
  }, [initialPath, initialRoomCode, loadRoomByCode, refreshRoomData, setMode]);

  useEffect(() => {
    if (!room?.id) return;
    const roomId = room.id;

    supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `room_id=eq.${roomId}` },
        (payload: { eventType?: string; old?: { id?: string }; new?: Record<string, unknown> }) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string };
            setTeams((current) => current.filter((team) => team.id !== oldRow.id));
            return;
          }

          const team = normalizeTeam(payload.new as Team, 0);
          setTeams((current) => upsertById(current, team));
          setLeaderTeam((current) => (current?.id === team.id ? team : current));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` },
        (payload: { eventType?: string; old?: { id?: string }; new?: Record<string, unknown> }) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string };
            setRounds((current) => current.filter((round) => round.id !== oldRow.id));
            setActiveRound((current) => (current?.id === oldRow.id ? null : current));
            return;
          }

          const round = toRoundRecord(payload.new as Record<string, unknown>);
          setRounds((current) => sortRounds(upsertById(current, round)));
          setActiveRound((current) => {
            if (!current || current.id === round.id) return round;

            const currentCreatedAt = new Date(current.created_at).getTime();
            const nextCreatedAt = new Date(round.created_at).getTime();
            return nextCreatedAt >= currentCreatedAt ? round : current;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "score_events", filter: `room_id=eq.${roomId}` },
        (payload: { eventType?: string; old?: { id?: string }; new?: Record<string, unknown> }) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string };
            setScoreEvents((current) => current.filter((event) => event.id !== oldRow.id));
            return;
          }

          setScoreEvents((current) =>
            upsertById(current, payload.new as ScoreEvent).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload: { eventType?: string; new?: Record<string, unknown> }) => {
          if (payload.eventType !== "DELETE") setRoom(payload.new as Room);
        }
      )
      .subscribe(
  (
    status:
      | "SUBSCRIBED"
      | "TIMED_OUT"
      | "CLOSED"
      | "CHANNEL_ERROR"
  ) => {
    if (status === "SUBSCRIBED") {
      queueRoomRefresh(roomId, 0);
      return;
    }

    if (
      status === "CHANNEL_ERROR" ||
      status === "TIMED_OUT"
    ) {
      setSyncState((current) => ({
        ...current,
        isSyncing: false,
      }));

      window.setTimeout(() => {
        queueRoomRefresh(roomId, 0);
      }, 1000);
    }
  }
);

    const pollTimer = window.setInterval(() => {
  if (!navigator.onLine) return;

  if (
    document.visibilityState !== "visible"
  ) {
    return;
  }

  queueRoomRefresh(roomId, 0);
}, LIVE_SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(pollTimer);
    };
  }, [queueRoomRefresh, refreshRoomData, room?.id]);

  useEffect(() => {
    if (!activeRound?.id) return;

    window.setTimeout(() => {
      void refreshVotes(activeRound.id);
      void refreshAnswers(activeRound.id);
    }, 0);

    const channel = supabase
      .channel(`round-live-${activeRound.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `round_id=eq.${activeRound.id}` },
        (payload: { eventType?: string; old?: { id?: string }; new?: Record<string, unknown> }) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string };
            setVotes((current) => current.filter((vote) => vote.id !== oldRow.id));
            return;
          }

          setVotes((current) => upsertVote(current, payload.new as VoteRow));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answer_submissions",
          filter: `round_id=eq.${activeRound.id}`,
        },
        (payload: { eventType?: string; old?: { id?: string }; new?: Record<string, unknown> }) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string };
            setAnswerSubmissions((current) =>
              current.filter((submission) => submission.id !== oldRow.id)
            );
            return;
          }

          const submission = mapAnswerSubmission(payload.new as Record<string, unknown>);
          setAnswerSubmissions((current) =>
            upsertAnswer(current, submission).sort(
              (a, b) =>
                new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
            )
          );
        }
      )
      .subscribe(
        (
          status:
            | "SUBSCRIBED"
            | "TIMED_OUT"
            | "CLOSED"
            | "CHANNEL_ERROR"
        ) => {
          if (status === "SUBSCRIBED") {
            void refreshVotes(activeRound.id);
            void refreshAnswers(activeRound.id);
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            window.setTimeout(() => {
              void refreshVotes(activeRound.id);
              void refreshAnswers(activeRound.id);
            }, 1000);
          }
        }
      );

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeRound?.id, refreshAnswers, refreshVotes]);

  useEffect(() => {
  if (!room?.id) return;

  const roomId = room.id;

  function recoverSession() {
    queueRoomRefresh(roomId, 0);
  }

  function handleOnline() {
    recoverSession();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      recoverSession();
    }
  }

  window.addEventListener("online", handleOnline);
  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );

  return () => {
    window.removeEventListener(
      "online",
      handleOnline
    );

    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
  };
}, [queueRoomRefresh, room?.id]);
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
    refreshRoom,
    refreshTeams,
    refreshRounds,
    refreshActiveRound,
    refreshVotes,
    refreshAnswers,
    refreshScores,
    refreshRoomData,
    queueRoomRefresh,
    loadRoomByCode,
  };
}
