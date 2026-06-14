import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Crown,
  Eye,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  TimerReset,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Vote,
} from "lucide-react";
import { buildRoundDefinition, roundTypeLabels } from "../data/gameContent";
import {
  DEFAULT_TEAMS,
  TEAM_COLOR_OPTIONS,
} from "../data/teamPresets";
import {
  AnimatedVoteBar,
  ChallengeRevealCard,
  ProjectorStage,
} from "../features/audience/ProjectorStage";
import { WinnerReveal } from "../features/audience/WinnerReveal";
import {
  DEFAULT_ROUND_SECONDS,
  formatSyncState,
  getRoundTimerSeconds,
  scorePresets,
  type SyncState,
} from "../features/gameflow/gamePhases";
import { HostGameflow } from "../features/gameflow/HostGameflow";
import { LeaderScreen } from "../features/leader/LeaderScreen";
import { AnimatedLeaderboard } from "../features/shared/AnimatedLeaderboard";
import { TeamAvatar } from "../features/shared/TeamAvatar";
import { TimerRing } from "../features/shared/TimerRing";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { supabase } from "../lib/supabase";
import type {
  AppMode,
  AnswerSubmission,
  Room,
  RoundDefinition,
  RoundRecord,
  RoundStatus,
  RoundType,
  ScoreEvent,
  Team,
  VoteRow,
} from "../lib/types";
import "../App.css";

const HOST_SESSION_KEY = "vote-survive-host-session";
const LIVE_SYNC_INTERVAL_MS = 2500;
const REALTIME_DEBOUNCE_MS = 120;

function generateCode(length = 5) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

function createDefaultDrafts() {
  return DEFAULT_TEAMS.map((preset) => ({
    id: crypto.randomUUID(),
    name: preset.name,
    animal: preset.animal,
    avatarEmoji: preset.avatarEmoji,
    avatarImage: preset.avatarImage,
    color: preset.color,
    leaderCode: generateCode(4),
  }));
}

function toRoundRecord(row: Record<string, unknown>): RoundRecord {
  const roundType = (row.round_type as RoundType | undefined) ?? "voting";
  const challenge = String(row.challenge ?? "");
  const prompt = String(row.prompt ?? row.question ?? "");
  const title =
    String(row.title ?? "").trim() || roundTypeLabels[roundType] || "Round";

  return {
    id: String(row.id),
    room_id: String(row.room_id),
    round_number: (row.round_number as number | null | undefined) ?? null,
    round_type: roundType,
    title,
    prompt,
    challenge,
    scoring_guide: String(row.scoring_guide ?? "Score every team after the round."),
    twist: (row.twist as string | null | undefined) ?? null,
    instructions:
      (row.instructions as string | null | undefined) ??
      "Follow the host prompt and score every team.",
    status: (row.status as RoundStatus | undefined) ?? "lobby",
    target_team_id: (row.target_team_id as string | null | undefined) ?? null,
    is_final:
      (row.is_final as boolean | null | undefined) ??
      roundType === "final_double",
    timer_seconds: (row.timer_seconds as number | null | undefined) ?? null,
    answer_options: Array.isArray(row.answer_options)
      ? (row.answer_options as string[])
      : null,
    correct_answer: (row.correct_answer as string | null | undefined) ?? null,
    created_at: String(row.created_at),
  };
}

function toLegacyRoundPayload(payload: {
  room_id: string;
  title: string;
  prompt: string;
  question: string;
  challenge: string;
  status: RoundStatus;
  target_team_id?: string | null;
}) {
  return {
    room_id: payload.room_id,
    question: payload.question || payload.prompt || payload.title,
    challenge: payload.challenge,
    status: payload.status,
    target_team_id: payload.target_team_id ?? null,
  };
}

function normalizeTeam(team: Team, fallbackIndex: number): Team {
  const preset = DEFAULT_TEAMS[fallbackIndex % DEFAULT_TEAMS.length];

  return {
    ...team,
    animal: team.animal ?? preset.animal,
    avatar_emoji: team.avatar_emoji ?? preset.avatarEmoji,
    avatar_image: team.avatar_image ?? preset.avatarImage,
    color: team.color ?? preset.color,
  };
}

export default function App() {
  const reducedMotion = useReducedMotion();
  const sound = useSoundEffects();
  const initialRoomCode =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? ""
      : "";
  const initialPath =
    typeof window !== "undefined" && window.location.pathname.startsWith("/join")
      ? "leader"
      : typeof window !== "undefined" &&
          (window.location.pathname.startsWith("/game") ||
            window.location.pathname.startsWith("/audience"))
      ? "game"
      : typeof window !== "undefined" && window.location.pathname.startsWith("/leaderboard")
      ? "leaderboard"
      : "home";

  const [mode, setMode] = useState<AppMode>(
    initialPath === "game" || initialPath === "leaderboard" ? initialPath : "home"
  );
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
  const [selectedRoundType, setSelectedRoundType] = useState<RoundType>("voting");
  const [timerDuration, setTimerDuration] = useState(DEFAULT_ROUND_SECONDS);
  const [customTimerInput, setCustomTimerInput] = useState("");
  const [customScoreInputs, setCustomScoreInputs] = useState<Record<string, string>>({});
  const [scoringTeamIds, setScoringTeamIds] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncAt: null,
    latencyMs: null,
  });
  const lastCountdownSoundRef = useRef<number | null>(null);
  const autoLockingRoundRef = useRef<string | null>(null);
  const refreshSequenceRef = useRef(0);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => b.score - a.score),
    [teams]
  );

  const totalVotes = useMemo(
    () => votes.length,
    [votes]
  );

  const secondsLeft = useMemo(() => {
    if (!activeRound || activeRound.status !== "voting") return 0;

    const created = new Date(activeRound.created_at).getTime();
    const elapsed = Math.floor((now - created) / 1000);

    return Math.max(0, getRoundTimerSeconds(activeRound) - elapsed);
  }, [activeRound, now]);

  const voteCounts = useMemo(() => {
    return teams.map((team) => ({
      team,
      count: votes.filter((vote) => vote.target_team_id === team.id).length,
    }));
  }, [teams, votes]);

  const sortedVoteCounts = useMemo(
    () => [...voteCounts].sort((a, b) => b.count - a.count),
    [voteCounts]
  );

  const targetTeam = useMemo(() => {
    if (!activeRound?.target_team_id) return null;
    return teams.find((team) => team.id === activeRound.target_team_id) ?? null;
  }, [activeRound, teams]);

  const rivalTeam = useMemo(() => {
    if (!targetTeam) return null;

    return (
      sortedVoteCounts.find((entry) => entry.team.id !== targetTeam.id)?.team ??
      sortedTeams.find((team) => team.id !== targetTeam.id) ??
      null
    );
  }, [sortedTeams, sortedVoteCounts, targetTeam]);

  const leaderAnswer = useMemo(() => {
    if (!leaderTeam || !activeRound) return null;
    return (
      answerSubmissions.find((submission) => submission.team_id === leaderTeam.id) ??
      null
    );
  }, [activeRound, answerSubmissions, leaderTeam]);

  const leaderVoteTarget = useMemo(() => {
    if (!leaderTeam || !activeRound) return null;
    const vote = votes.find((entry) => entry.voter_team_id === leaderTeam.id);
    if (!vote) return null;
    return teams.find((team) => team.id === vote.target_team_id) ?? null;
  }, [activeRound, leaderTeam, teams, votes]);

  const sortedAnswerSubmissions = useMemo(
    () =>
      [...answerSubmissions].sort(
        (a, b) =>
          new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      ),
    [answerSubmissions]
  );

  const effectiveLeaderTeam = useMemo(() => {
    if (!leaderTeam) return null;
    return teams.find((team) => team.id === leaderTeam.id) ?? leaderTeam;
  }, [leaderTeam, teams]);

  const latestScoreEvent = useMemo(
    () => scoreEvents.find((event) => !event.undone_at) ?? null,
    [scoreEvents]
  );

  const activeRoundId = activeRound?.id ?? null;
  const winnerTeam = sortedTeams[0] ?? null;
  useEffect(() => {
    if (
      activeRound?.status === "voting" &&
      secondsLeft <= 5 &&
      secondsLeft > 0 &&
      lastCountdownSoundRef.current !== secondsLeft
    ) {
      sound.play("countdown");
      lastCountdownSoundRef.current = secondsLeft;
    }

    if (secondsLeft > 5 || secondsLeft === 0) {
      lastCountdownSoundRef.current = null;
    }
  }, [activeRound?.status, secondsLeft, sound]);

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
      ] =
        await Promise.all([
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

  const queueRoomRefresh = useCallback((roomId: string, delay = REALTIME_DEBOUNCE_MS) => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void refreshRoomData(roomId);
    }, delay);
  }, [refreshRoomData]);

  const loadRoomByCode = useCallback(async (code: string, nextMode: AppMode) => {
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
  }, [refreshRoomData]);

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
    if (!room || !activeRoundId) return;

    const channel = supabase
      .channel(`votes-${activeRoundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `round_id=eq.${activeRoundId}` },
        () => queueRoomRefresh(room.id, 60)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answer_submissions",
          filter: `round_id=eq.${activeRoundId}`,
        },
        () => queueRoomRefresh(room.id, 60)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeRoundId, queueRoomRefresh, room]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

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
      setLeaderTeam(normalizeTeam({ ...(foundTeam as Team), joined_at: new Date().toISOString() }, 0));
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

  const lockVotes = useCallback(async () => {
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
  }, [activeRound, queueRoomRefresh, room, sortedVoteCounts, sound]);

  useEffect(() => {
    if (!activeRound || activeRound.status !== "voting" || secondsLeft > 0) return;
    if (autoLockingRoundRef.current === activeRound.id) return;

    autoLockingRoundRef.current = activeRound.id;
    void lockVotes();
  }, [activeRound, secondsLeft, lockVotes]);

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

    const nextStatus: RoundStatus = activeRound.round_type === "final_double" ? "winner" : "complete";

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

  async function updateTeamContent(teamId: string, patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>) {
    const { error } = await supabase.from("teams").update(patch).eq("id", teamId);

    if (error) {
      setLoadError(error.message);
      return;
    }

    if (room) await refreshRoomData(room.id);
  }

  async function updateRoundContent(
    roundId: string,
    patch: Partial<Pick<RoundRecord, "title" | "prompt" | "challenge" | "instructions" | "scoring_guide" | "twist">>
  ) {
    const { error } = await supabase.from("rounds").update(patch).eq("id", roundId);

    if (error) {
      setLoadError(error.message);
      return;
    }

    if (room) await refreshRoomData(room.id);
  }

  const shouldShowJoinFocus = initialPath === "leader";

  return (
    <AnimatePresence mode="wait">
      {mode === "home" && (
        <HomeScreen
          isLoading={isLoading}
          loadError={loadError}
          roomCodeInput={roomCodeInput}
          teamCodeInput={teamCodeInput}
          setRoomCodeInput={setRoomCodeInput}
          setTeamCodeInput={setTeamCodeInput}
          joinAsLeader={joinAsLeader}
          createRoom={createRoom}
          shouldShowJoinFocus={shouldShowJoinFocus}
        />
      )}

      {mode === "host" && room && (
        <HostScreen
          room={room}
          teams={teams}
          sortedTeams={sortedTeams}
          activeRound={activeRound}
          answerSubmissions={sortedAnswerSubmissions}
          voteCounts={voteCounts}
          targetTeam={targetTeam}
          rivalTeam={rivalTeam}
          secondsLeft={secondsLeft}
          totalVotes={totalVotes}
          loadError={loadError}
          syncState={syncState}
          selectedRoundType={selectedRoundType}
          setSelectedRoundType={setSelectedRoundType}
          timerDuration={timerDuration}
          setTimerDuration={setTimerDuration}
          customTimerInput={customTimerInput}
          setCustomTimerInput={setCustomTimerInput}
          soundEnabled={sound.enabled}
          toggleSound={() => sound.setEnabled(!sound.enabled)}
          startRound={startRound}
          lockVotes={lockVotes}
          applyScore={applyScore}
          completeRound={completeRound}
          undoLastScore={undoLastScore}
          latestScoreEvent={latestScoreEvent}
          scoringTeamIds={scoringTeamIds}
          customScoreInputs={customScoreInputs}
          setCustomScoreInputs={setCustomScoreInputs}
          revealWinner={revealWinner}
          resetGame={resetGame}
          updateTeamContent={updateTeamContent}
          updateRoundContent={updateRoundContent}
          showWinner={showWinner}
          winnerTeam={winnerTeam}
          reducedMotion={Boolean(reducedMotion)}
        />
      )}

      {mode === "leader" && room && effectiveLeaderTeam && (
        <LeaderScreen
          room={room}
          teams={teams}
          leaderTeam={effectiveLeaderTeam}
          activeRound={activeRound}
          secondsLeft={secondsLeft}
          leaderVoteTarget={leaderVoteTarget}
          soundEnabled={sound.enabled}
          toggleSound={() => sound.setEnabled(!sound.enabled)}
          submitVote={submitVote}
          submitAnswer={submitAnswer}
          leaderAnswer={leaderAnswer}
        />
      )}

      {mode === "game" && room && (
        <GameScreen
          room={room}
          sortedTeams={sortedTeams}
          activeRound={activeRound}
          voteCounts={voteCounts}
          targetTeam={targetTeam}
          rivalTeam={rivalTeam}
          secondsLeft={secondsLeft}
          totalVotes={totalVotes}
          syncState={syncState}
          showWinner={showWinner || room.status === "winner" || activeRound?.status === "winner"}
          winnerTeam={winnerTeam}
          reducedMotion={Boolean(reducedMotion)}
        />
      )}

      {mode === "leaderboard" && room && (
        <LeaderboardScreen
          room={room}
          sortedTeams={sortedTeams}
          syncState={syncState}
          showWinner={showWinner || room.status === "winner" || activeRound?.status === "winner"}
          winnerTeam={winnerTeam}
          reducedMotion={Boolean(reducedMotion)}
        />
      )}

      {(mode === "game" || mode === "leaderboard") && !room && (
        <AudienceLoadingScreen
          label={mode === "game" ? "Projector stage" : "Leaderboard"}
          roomCode={roomCodeInput || initialRoomCode}
          loadError={loadError}
        />
      )}
    </AnimatePresence>
  );
}

function AudienceLoadingScreen(props: {
  label: string;
  roomCode: string;
  loadError: string | null;
}) {
  return (
    <motion.main
      className="audience-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <section className="projector-stage is-waiting">
        <Sparkles size={48} />
        <p className="section-kicker">{props.label}</p>
        <h2>{props.loadError ? "Room not ready" : "Finding room"}</h2>
        <p>
          {props.loadError
            ? props.loadError
            : `Looking for room ${props.roomCode || "code"} before the show goes live.`}
        </p>
      </section>
    </motion.main>
  );
}

function HomeScreen(props: {
  isLoading: boolean;
  loadError: string | null;
  roomCodeInput: string;
  teamCodeInput: string;
  setRoomCodeInput: (value: string) => void;
  setTeamCodeInput: (value: string) => void;
  joinAsLeader: () => void;
  createRoom: () => void;
  shouldShowJoinFocus: boolean;
}) {
  return (
    <motion.main
      className="landing-page"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">Live youth game platform</span>
          <h1>Bright, loud, phone-first fun for your next team night.</h1>
          <p>
            Create a room, launch voting or all-play rounds,
            score fast, and reveal a dramatic winner on the big screen.
          </p>

          <div className="hero-actions">
            <button className="primary-btn" onClick={props.createRoom} disabled={props.isLoading}>
              <Play size={18} />
              {props.isLoading ? "Creating..." : "Host a Game"}
            </button>
          </div>

          <div className="hero-highlights">
            <InfoChip icon={<Vote size={16} />} text="Realtime voting" />
            <InfoChip icon={<Trophy size={16} />} text="Live leaderboard" />
            <InfoChip icon={<Sparkles size={16} />} text="Final round reveal" />
          </div>
        </div>

        <div
          className={`join-card ${props.shouldShowJoinFocus ? "join-card-focus" : ""}`}
        >
          <p className="section-kicker">Leader Join</p>
          <h2>Join from your phone</h2>
          <p>Scan the QR from the host or enter your room and team code.</p>

          <div className="join-team-preview-grid">
            {DEFAULT_TEAMS.map((team) => (
              <div className="join-team-preview" key={team.name} style={{ "--team-color": team.color } as React.CSSProperties}>
                <TeamAvatar emoji={team.avatarEmoji} image={team.avatarImage} name={team.name} />
                <div>
                  <strong>{team.name}</strong>
                  <span>{team.animal}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="join-form">
            <input
              placeholder="Room code"
              value={props.roomCodeInput}
              onChange={(event) =>
                props.setRoomCodeInput(event.target.value.toUpperCase())
              }
            />
            <input
              placeholder="Team code"
              value={props.teamCodeInput}
              onChange={(event) =>
                props.setTeamCodeInput(event.target.value.toUpperCase())
              }
            />
            <button onClick={props.joinAsLeader} disabled={props.isLoading}>
              {props.isLoading ? "Joining..." : "Join team"}
            </button>
          </div>

          {props.loadError && <p className="error-banner">{props.loadError}</p>}
        </div>
      </section>
    </motion.main>
  );
}

function HostScreen(props: {
  room: Room;
  teams: Team[];
  sortedTeams: Team[];
  activeRound: RoundRecord | null;
  answerSubmissions: AnswerSubmission[];
  voteCounts: { team: Team; count: number }[];
  targetTeam: Team | null;
  rivalTeam: Team | null;
  secondsLeft: number;
  totalVotes: number;
  loadError: string | null;
  syncState: SyncState;
  selectedRoundType: RoundType;
  setSelectedRoundType: (value: RoundType) => void;
  timerDuration: number;
  setTimerDuration: (value: number) => void;
  customTimerInput: string;
  setCustomTimerInput: (value: string) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  startRound: (type?: RoundType) => void;
  lockVotes: () => void;
  applyScore: (teamId: string, delta: number, reason: string) => void;
  completeRound: () => void;
  undoLastScore: () => void;
  latestScoreEvent: ScoreEvent | null;
  scoringTeamIds: Record<string, boolean>;
  customScoreInputs: Record<string, string>;
  setCustomScoreInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  revealWinner: () => void;
  resetGame: () => void;
  updateTeamContent: (teamId: string, patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>) => void;
  updateRoundContent: (
    roundId: string,
    patch: Partial<Pick<RoundRecord, "title" | "prompt" | "challenge" | "instructions" | "scoring_guide" | "twist">>
  ) => void;
  showWinner: boolean;
  winnerTeam: Team | null;
  reducedMotion: boolean;
}) {
  const maxVotes = Math.max(1, ...props.voteCounts.map((entry) => entry.count));
  const maxScore = Math.max(1, ...props.sortedTeams.map((team) => team.score));
  const joinedTeams = props.teams.filter((team) => team.joined_at).length;
  const votingTeams = Math.max(0, props.teams.length);
  const voteProgress = votingTeams > 0 ? Math.round((props.totalVotes / votingTeams) * 100) : 0;
  const gameUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/game?room=${props.room.code}`;
  const leaderboardUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/leaderboard?room=${props.room.code}`;
  const roundStatusLabel = props.activeRound
    ? `${roundTypeLabels[props.activeRound.round_type]} - ${props.activeRound.status}`
    : "Live room - choose a round";
  const canStartRound =
    !props.activeRound ||
    props.activeRound.status === "complete" ||
    props.activeRound.status === "winner";
  const activeDefinition = props.activeRound
    ? {
        type: props.activeRound.round_type,
        title: props.activeRound.title,
        prompt: props.activeRound.prompt,
        challenge: props.activeRound.challenge,
        scoringGuide: props.activeRound.scoring_guide,
        instructions: props.activeRound.instructions ?? "",
        twist: props.activeRound.twist ?? undefined,
        requiresVoting:
          props.activeRound.round_type === "voting" ||
          props.activeRound.round_type === "steal",
        isFinal: props.activeRound.is_final ?? false,
        answerOptions: props.activeRound.answer_options ?? undefined,
        correctAnswer: props.activeRound.correct_answer ?? undefined,
      }
    : null;

  return (
    <motion.main
      className="game-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="game-header">
        <div>
          <p className="section-kicker">Host screen</p>
          <h1>{props.room.code}</h1>
          <p className="header-helper">
            The room is live. Leaders can join any time while you run rounds.
          </p>
        </div>

        <div className="header-actions">
          <button className="ghost-btn" onClick={props.toggleSound}>
            {props.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            {props.soundEnabled ? "Sound on" : "Sound off"}
          </button>
          <button className="primary-btn" onClick={() => props.startRound()} disabled={!canStartRound}>
            <Sparkles size={18} />
            Random round
          </button>
          <a className="ghost-btn" href={gameUrl} target="_blank" rel="noreferrer">
            <Eye size={18} />
            Game screen
          </a>
          <a className="ghost-btn" href={leaderboardUrl} target="_blank" rel="noreferrer">
            <Trophy size={18} />
            Scores
          </a>
        </div>
      </header>

      {props.loadError && <p className="error-banner">{props.loadError}</p>}

      <HostGameflow
        room={props.room}
        activeRound={props.activeRound}
        showWinner={props.showWinner}
        startRound={() => props.startRound()}
        lockVotes={props.lockVotes}
        completeRound={props.completeRound}
        revealWinner={props.revealWinner}
        resetGame={props.resetGame}
      />

      <section className="host-grid">
        <div className="host-main-column">
          <div className="dashboard-grid">
            <HostStatCard label="Round status" value={roundStatusLabel} icon={<Settings size={18} />} />
            <HostStatCard label="Joined teams" value={`${joinedTeams}/${props.teams.length} joined`} icon={<Users size={18} />} />
            <HostStatCard label="Voting progress" value={`${voteProgress}%`} icon={<Vote size={18} />} />
            <HostStatCard
              label="Sync"
              value={formatSyncState(props.syncState)}
              icon={<TimerReset size={18} />}
            />
          </div>

          <div className="game-card">
            <div className="round-toolbar">
              <div>
                <p className="section-kicker">Round control</p>
                <h2>Choose the next moment</h2>
              </div>

              <div className="round-controls">
                <select
                  value={props.selectedRoundType}
                  onChange={(event) =>
                    props.setSelectedRoundType(event.target.value as RoundType)
                  }
                >
                  {Object.entries(roundTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  className="primary-btn"
                  onClick={() => props.startRound(props.selectedRoundType)}
                  disabled={!canStartRound}
                >
                  <Play size={18} />
                  Start chosen round
                </button>
              </div>
            </div>
            {!canStartRound && (
              <div className="round-blocked-row">
                <p className="muted-text">
                  A round is still active. Close it to choose the next round.
                </p>
                <button className="ghost-btn" onClick={props.completeRound}>
                  <Check size={18} />
                  Close current round
                </button>
              </div>
            )}
            <TimerControls
              timerDuration={props.timerDuration}
              setTimerDuration={props.setTimerDuration}
              customTimerInput={props.customTimerInput}
              setCustomTimerInput={props.setCustomTimerInput}
            />
          </div>

          <div className={`game-card ${props.activeRound?.round_type === "final_double" ? "final-round-card" : ""}`}>
            {activeDefinition ? (
              <RoundReveal
                round={activeDefinition}
                secondsLeft={props.secondsLeft}
                activeStatus={props.activeRound?.status ?? "lobby"}
              />
            ) : (
              <EmptyHostState />
            )}

            {props.activeRound?.status === "voting" && (
              <div className="voting-panel">
                <div className="live-row">
                  <div className="live-pill">
                    <Vote size={16} />
                    {props.totalVotes} votes in
                  </div>
                  <TimerRing
                    secondsLeft={props.secondsLeft}
                    duration={getRoundTimerSeconds(props.activeRound)}
                  />
                </div>

                <div className="vote-bars">
                  {props.voteCounts.map((entry, index) => (
                    <AnimatedVoteBar
                      key={entry.team.id}
                      team={entry.team}
                      count={entry.count}
                      max={maxVotes}
                      index={index}
                    />
                  ))}
                </div>

                <button className="danger-btn" onClick={props.lockVotes}>
                  Lock votes and reveal pressure team
                </button>
              </div>
            )}

            {props.activeRound && props.activeRound.status !== "voting" && (
              <ChallengeRevealCard
                round={props.activeRound}
                targetTeam={props.targetTeam}
                rivalTeam={props.rivalTeam}
              />
            )}
          </div>

          {props.activeRound && props.activeRound.status !== "complete" && props.activeRound.status !== "winner" && (
            <AnswerRacePanel
              round={props.activeRound}
              submissions={props.answerSubmissions}
              teams={props.teams}
              applyScore={props.applyScore}
            />
          )}

          {props.activeRound && props.activeRound.status !== "complete" && props.activeRound.status !== "winner" && (
            <div className="game-card">
              <div className="score-panel-top">
                <div>
                  <p className="section-kicker">Host scoring</p>
                  <h2>Score every team fast</h2>
                </div>

                <button
                  className="ghost-btn"
                  onClick={props.undoLastScore}
                  disabled={!props.latestScoreEvent}
                >
                  <RotateCcw size={18} />
                  Undo last
                </button>
              </div>

              <div className="score-grid">
                {props.sortedTeams.map((team, index) => (
                  <ScoreCard
                    key={team.id}
                    team={team}
                    rank={index + 1}
                    isPending={Boolean(props.scoringTeamIds[team.id])}
                    latestDelta={
                      props.latestScoreEvent?.team_id === team.id
                        ? props.latestScoreEvent.delta
                        : null
                    }
                    customValue={props.customScoreInputs[team.id] ?? ""}
                    onCustomChange={(value) =>
                      props.setCustomScoreInputs((current) => ({
                        ...current,
                        [team.id]: value,
                      }))
                    }
                    onApplyCustom={() => {
                      const parsed = Number(props.customScoreInputs[team.id] ?? 0);
                      if (Number.isNaN(parsed) || parsed === 0) return;
                      void props.applyScore(team.id, parsed, "Custom score");
                      props.setCustomScoreInputs((current) => ({
                        ...current,
                        [team.id]: "",
                      }));
                    }}
                    onPreset={(delta, reason) => void props.applyScore(team.id, delta, reason)}
                  />
                ))}
              </div>

              <div className="score-footer">
                <p className="muted-text">
                  {props.activeRound.round_type === "final_double"
                    ? "Final round scoring is doubled automatically. Every tap hits twice."
                    : "Quick scoring keeps the host flow moving fast."}
                </p>
                {props.latestScoreEvent && (
                  <div className="latest-score-strip">
                    <strong>Latest score</strong>
                    <span>
                      {props.sortedTeams.find((team) => team.id === props.latestScoreEvent?.team_id)?.name ??
                        "Team"}{" "}
                      {props.latestScoreEvent.delta > 0 ? "+" : ""}
                      {props.latestScoreEvent.delta} for {props.latestScoreEvent.reason}
                    </span>
                  </div>
                )}
                <button className="primary-btn" onClick={props.completeRound}>
                  <Check size={18} />
                  {props.activeRound.round_type === "final_double"
                    ? "Finish final round"
                    : "Complete round"}
                </button>
              </div>
            </div>
          )}

          {(props.showWinner || props.activeRound?.status === "winner") && props.winnerTeam && (
          <WinnerReveal
            winner={props.winnerTeam}
            teams={props.sortedTeams}
            reducedMotion={Boolean(props.reducedMotion)}
          />
          )}
        </div>

        <div className="host-side-column">
          <div className="game-card">
            <div className="panel-topline">
              <div>
                <p className="section-kicker">Live join</p>
                <h3>Room code</h3>
              </div>
            </div>

            <div className="room-code-panel">
              <strong>{props.room.code}</strong>
              <p className="muted-text">Leaders can enter mid-game with this room code and their team code.</p>
            </div>

            <div className="team-code-list">
              {props.teams.map((team, index) => (
                <TeamCodeRow key={team.id} team={team} index={index} />
              ))}
            </div>
          </div>

          <div className="game-card">
            <p className="section-kicker">Score controls</p>
            <div className="mini-leaderboard">
              <AnimatedLeaderboard teams={props.sortedTeams} maxScore={maxScore} compact />
            </div>
            <a className="ghost-btn wide-btn" href={leaderboardUrl} target="_blank" rel="noreferrer">
              <Trophy size={18} />
              Show leaderboard
            </a>
            <button className="ghost-btn wide-btn" onClick={props.revealWinner}>
              <Crown size={18} />
              Final reveal
            </button>
            <button className="danger-btn wide-btn" onClick={props.resetGame}>
              <RotateCcw size={18} />
              Reset game
            </button>
          </div>

          <AdminContentEditor
            teams={props.teams}
            activeRound={props.activeRound}
            updateTeamContent={props.updateTeamContent}
            updateRoundContent={props.updateRoundContent}
          />
        </div>
      </section>
    </motion.main>
  );
}

function HostStatCard(props: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="host-stat-card">
      <div className="host-stat-icon">{props.icon}</div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function GameScreen(props: {
  room: Room;
  sortedTeams: Team[];
  activeRound: RoundRecord | null;
  voteCounts: { team: Team; count: number }[];
  targetTeam: Team | null;
  rivalTeam: Team | null;
  secondsLeft: number;
  totalVotes: number;
  syncState: SyncState;
  showWinner: boolean;
  winnerTeam: Team | null;
  reducedMotion: boolean;
}) {
  return (
    <motion.main
      className="audience-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="audience-header">
        <div>
          <p className="section-kicker">Game screen</p>
          <h1>{props.room.code}</h1>
          <p className="header-helper">Sync {formatSyncState(props.syncState)}</p>
        </div>
        {props.activeRound?.status === "voting" && (
          <TimerRing
            secondsLeft={props.secondsLeft}
            duration={getRoundTimerSeconds(props.activeRound)}
          />
        )}
      </header>

      {props.showWinner && props.winnerTeam ? (
        <WinnerReveal
          winner={props.winnerTeam}
          teams={props.sortedTeams}
          reducedMotion={props.reducedMotion}
        />
      ) : (
        <ProjectorStage
          room={props.room}
          activeRound={props.activeRound}
          voteCounts={props.voteCounts}
          targetTeam={props.targetTeam}
          rivalTeam={props.rivalTeam}
          secondsLeft={props.secondsLeft}
          totalVotes={props.totalVotes}
        />
      )}
    </motion.main>
  );
}

function LeaderboardScreen(props: {
  room: Room;
  sortedTeams: Team[];
  syncState: SyncState;
  showWinner: boolean;
  winnerTeam: Team | null;
  reducedMotion: boolean;
}) {
  const maxScore = Math.max(1, ...props.sortedTeams.map((team) => team.score));

  return (
    <motion.main
      className="audience-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="audience-header">
        <div>
          <p className="section-kicker">Leaderboard</p>
          <h1>{props.room.code}</h1>
          <p className="header-helper">Sync {formatSyncState(props.syncState)}</p>
        </div>
      </header>

      {props.showWinner && props.winnerTeam ? (
        <WinnerReveal
          winner={props.winnerTeam}
          teams={props.sortedTeams}
          reducedMotion={props.reducedMotion}
        />
      ) : (
        <section className="audience-main leaderboard-screen-panel">
          <AnimatedLeaderboard teams={props.sortedTeams} maxScore={maxScore} />
        </section>
      )}
    </motion.main>
  );
}

function TimerControls(props: {
  timerDuration: number;
  setTimerDuration: (value: number) => void;
  customTimerInput: string;
  setCustomTimerInput: (value: string) => void;
}) {
  const options = [30, 45, 60];

  return (
    <div className="timer-control-panel">
      <div>
        <p className="section-kicker">Round timer</p>
        <span className="muted-text">Voting locks automatically when the countdown ends.</span>
      </div>
      <div className="timer-option-row">
        {options.map((seconds) => (
          <button
            key={seconds}
            className={`ghost-btn ${props.timerDuration === seconds && !props.customTimerInput ? "active-pill" : ""}`}
            onClick={() => {
              props.setTimerDuration(seconds);
              props.setCustomTimerInput("");
            }}
          >
            {seconds}s
          </button>
        ))}
        <input
          className="timer-custom-input"
          placeholder="Custom seconds"
          inputMode="numeric"
          value={props.customTimerInput}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, "").slice(0, 3);
            props.setCustomTimerInput(next);
            if (Number(next) > 0) props.setTimerDuration(Number(next));
          }}
        />
      </div>
    </div>
  );
}

function AnswerRacePanel(props: {
  round: RoundRecord;
  submissions: AnswerSubmission[];
  teams: Team[];
  applyScore: (teamId: string, delta: number, reason: string) => void;
}) {
  if (!props.round.correct_answer || !props.round.answer_options?.length) return null;

  const correctSubmissions = props.submissions.filter((submission) => submission.is_correct);
  const fastestCorrect = correctSubmissions[0] ?? null;

  return (
    <div className="game-card answer-race-panel">
      <div className="score-panel-top">
        <div>
          <p className="section-kicker">Answer race</p>
          <h2>Fastest correct wins</h2>
        </div>
        {fastestCorrect && (
          <button
            className="primary-btn"
            onClick={() =>
              props.applyScore(fastestCorrect.team_id, 10, "Fastest correct answer")
            }
          >
            <Trophy size={18} />
            Award fastest +10
          </button>
        )}
      </div>

      <div className="answer-race-list">
        {props.submissions.length === 0 && (
          <p className="muted-text">No answers submitted yet.</p>
        )}
        {props.submissions.map((submission, index) => {
          const team = props.teams.find((entry) => entry.id === submission.team_id);
          return (
            <div
              className={`answer-race-row ${submission.is_correct ? "is-correct" : "is-wrong"}`}
              key={submission.id}
            >
              <span>#{index + 1}</span>
              <strong>{team?.name ?? "Team"}</strong>
              <b>{submission.answer}</b>
              <em>{submission.is_correct ? "Correct" : "Wrong"}</em>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminContentEditor(props: {
  teams: Team[];
  activeRound: RoundRecord | null;
  updateTeamContent: (teamId: string, patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>) => void;
  updateRoundContent: (
    roundId: string,
    patch: Partial<Pick<RoundRecord, "title" | "prompt" | "challenge" | "instructions" | "scoring_guide" | "twist">>
  ) => void;
}) {
  return (
    <div className="game-card admin-editor">
      <div>
        <p className="section-kicker">Content editor</p>
        <h3>Live content</h3>
        <p className="muted-text">
          Edit the active round and team labels without touching code.
        </p>
      </div>

      {props.activeRound ? (
        <AdminRoundEditorRow
          key={props.activeRound.id}
          round={props.activeRound}
          updateRoundContent={props.updateRoundContent}
        />
      ) : (
        <div className="admin-empty-round">
          <strong>No active round yet</strong>
          <span>Start a round, then edit its title, prompt, and challenge here.</span>
        </div>
      )}

      <div className="admin-editor-stack">
        {props.teams.map((team) => (
          <AdminTeamEditorRow
            key={`${team.id}-${team.name}-${team.animal ?? ""}`}
            team={team}
            updateTeamContent={props.updateTeamContent}
          />
        ))}
      </div>
    </div>
  );
}

function AdminTeamEditorRow(props: {
  team: Team;
  updateTeamContent: (teamId: string, patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>) => void;
}) {
  const [name, setName] = useState(props.team.name);
  const [animal, setAnimal] = useState(props.team.animal ?? "");

  return (
    <div className="admin-editor-row">
      <TeamAvatar
        emoji={props.team.avatar_emoji ?? "★"}
        image={props.team.avatar_image ?? ""}
        name={props.team.name}
      />
      <input
        aria-label={`${props.team.name} name`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== props.team.name) {
            props.updateTeamContent(props.team.id, { name: trimmed });
          }
        }}
      />
      <input
        aria-label={`${props.team.name} animal`}
        value={animal}
        onChange={(event) => setAnimal(event.target.value)}
        onBlur={() => {
          const trimmed = animal.trim();
          if (trimmed !== (props.team.animal ?? "")) {
            props.updateTeamContent(props.team.id, { animal: trimmed });
          }
        }}
      />
    </div>
  );
}

function AdminRoundEditorRow(props: {
  round: RoundRecord;
  updateRoundContent: (
    roundId: string,
    patch: Partial<Pick<RoundRecord, "title" | "prompt" | "challenge" | "instructions" | "scoring_guide" | "twist">>
  ) => void;
}) {
  const [title, setTitle] = useState(props.round.title);
  const [prompt, setPrompt] = useState(props.round.prompt);
  const [challenge, setChallenge] = useState(props.round.challenge);

  return (
    <div className="admin-round-editor">
      <input
        aria-label="Round title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <textarea
        aria-label="Round prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <textarea
        aria-label="Round challenge"
        value={challenge}
        onChange={(event) => setChallenge(event.target.value)}
      />
      <button
        className="ghost-btn"
        onClick={() =>
          props.updateRoundContent(props.round.id, {
            title: title.trim() || props.round.title,
            prompt: prompt.trim() || props.round.prompt,
            challenge: challenge.trim() || props.round.challenge,
          })
        }
      >
        Save round content
      </button>
    </div>
  );
}

function InfoChip(props: { icon: React.ReactNode; text: string }) {
  return (
    <div className="info-chip">
      {props.icon}
      <span>{props.text}</span>
    </div>
  );
}

function TeamCodeRow(props: { team: Team; index: number }) {
  return (
    <div
      className="team-code-card"
      style={{ "--team-color": props.team.color ?? TEAM_COLOR_OPTIONS[props.index] } as React.CSSProperties}
    >
      <TeamAvatar
        emoji={props.team.avatar_emoji ?? "⭐"}
        image={props.team.avatar_image ?? ""}
        name={props.team.name}
      />
      <div>
        <strong>{props.team.name}</strong>
        <span>{props.team.leader_code}</span>
      </div>
    </div>
  );
}

function EmptyHostState() {
  return (
    <div className="empty-state">
      <Sparkles size={42} />
      <h2>Live room open</h2>
      <p>Pick a round type or use random round whenever you are ready.</p>
    </div>
  );
}

function RoundReveal(props: {
  round: RoundDefinition;
  secondsLeft: number;
  activeStatus: RoundStatus;
  compact?: boolean;
}) {
  return (
    <motion.section
      className={`round-reveal ${props.round.isFinal ? "round-reveal-final" : ""} ${props.compact ? "round-reveal-compact" : ""}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="round-reveal-top">
        <div>
          <p className="section-kicker">{roundTypeLabels[props.round.type]}</p>
          <h2>{props.round.title}</h2>
        </div>
        {props.activeStatus === "voting" && !props.compact && (
          <div className="round-mini-stat">
            <TimerReset size={16} />
            {props.secondsLeft}s left
          </div>
        )}
      </div>

      <h3>{props.round.prompt}</h3>
      <p>{props.round.challenge}</p>

      <div className="round-meta-grid">
        <div>
          <span>Instructions</span>
          <strong>{props.round.instructions}</strong>
        </div>
        <div>
          <span>Scoring guide</span>
          <strong>{props.round.scoringGuide}</strong>
        </div>
        {props.round.twist && (
          <div>
            <span>Twist</span>
            <strong>{props.round.twist}</strong>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function ScoreCard(props: {
  team: Team;
  rank: number;
  isPending: boolean;
  latestDelta: number | null;
  customValue: string;
  onCustomChange: (value: string) => void;
  onApplyCustom: () => void;
  onPreset: (delta: number, reason: string) => void;
}) {
  return (
    <div
      className="score-card"
      style={{ "--team-color": props.team.color ?? "#14b8a6" } as React.CSSProperties}
    >
      <div className="score-card-top">
        <div className="score-team-wrap">
          <TeamAvatar
            emoji={props.team.avatar_emoji ?? "⭐"}
            image={props.team.avatar_image ?? ""}
            name={props.team.name}
          />
          <div>
            <strong>{props.team.name}</strong>
            <span>
              #{props.rank} • {props.team.score} pts
            </span>
          </div>
        </div>
        {props.latestDelta !== null && (
          <motion.b
            className="score-delta-pop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {props.latestDelta > 0 ? "+" : ""}
            {props.latestDelta}
          </motion.b>
        )}
      </div>

      <div className="score-preset-grid">
        {scorePresets.map((preset) => (
          <button
            key={`${props.team.id}-${preset.label}`}
            className="score-chip"
            disabled={props.isPending}
            onClick={() => props.onPreset(preset.delta, preset.reason)}
          >
            {props.isPending ? "Scoring..." : preset.label}
          </button>
        ))}
      </div>

      <div className="custom-score-row">
        <input
          placeholder="Custom"
          inputMode="numeric"
          value={props.customValue}
          onChange={(event) => props.onCustomChange(event.target.value)}
        />
        <button className="ghost-btn" onClick={props.onApplyCustom} disabled={props.isPending}>
          {props.isPending ? "Applying" : "Apply"}
        </button>
      </div>
    </div>
  );
}

