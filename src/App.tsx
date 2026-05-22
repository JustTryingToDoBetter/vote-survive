import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import eagleWinnerVideo from "./assets/winners/eagle.mp4";
import lionWinnerVideo from "./assets/winners/lion.mp4";
import sheepWinnerVideo from "./assets/winners/sheep.mp4";
import tigerWinnerVideo from "./assets/winners/tiger.mp4";
import eagleLoserVideo from "./assets/losers/eagle_lose.mp4";
import lionLoserVideo from "./assets/losers/lion_lose.mp4";
import sheepLoserVideo from "./assets/losers/sheep_lose.mp4";
import tigerLoserVideo from "./assets/losers/Tiger_lose.mp4";
import {
  Check,
  Crown,
  Eye,
  Gamepad2,
  Music2,
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
import { buildRoundDefinition, roundTypeLabels } from "./data/gameContent";
import {
  DEFAULT_TEAMS,
  TEAM_COLOR_OPTIONS,
} from "./data/teamPresets";
import { useSoundEffects } from "./hooks/useSoundEffects";
import { supabase } from "./lib/supabase";
import type {
  AppMode,
  Room,
  RoundDefinition,
  RoundRecord,
  RoundStatus,
  RoundType,
  ScoreEvent,
  Team,
  VoteRow,
} from "./lib/types";
import "./App.css";

const DEFAULT_ROUND_SECONDS = 45;
const HOST_SESSION_KEY = "vote-survive-host-session";

const SCORE_PRESETS = [
  { label: "+2 Participation", delta: 2, reason: "Participation" },
  { label: "+5 Good effort", delta: 5, reason: "Good effort" },
  { label: "+7 Runner up", delta: 7, reason: "Runner up" },
  { label: "+10 Winner", delta: 10, reason: "Winner" },
  { label: "-3 Penalty", delta: -3, reason: "Penalty" },
] as const;

const winnerVideoByAnimal: Record<string, string> = {
  lions: lionWinnerVideo,
  lion: lionWinnerVideo,
  sheep: sheepWinnerVideo,
  tiger: tigerWinnerVideo,
  tigers: tigerWinnerVideo,
  eagle: eagleWinnerVideo,
  eagles: eagleWinnerVideo,
};

const loserVideoByAnimal: Record<string, string> = {
  lions: lionLoserVideo,
  lion: lionLoserVideo,
  sheep: sheepLoserVideo,
  tiger: tigerLoserVideo,
  tigers: tigerLoserVideo,
  eagle: eagleLoserVideo,
  eagles: eagleLoserVideo,
};

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
    created_at: String(row.created_at),
  };
}

function getRoundTimerSeconds(round: RoundRecord | null) {
  return round?.timer_seconds ?? DEFAULT_ROUND_SECONDS;
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

function getWinnerVideo(team: Team) {
  const keys = [team.animal, team.name]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  for (const key of keys) {
    if (winnerVideoByAnimal[key]) return winnerVideoByAnimal[key];
  }

  return null;
}

function getLoserVideo(team: Team) {
  const keys = [team.animal, team.name]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  for (const key of keys) {
    if (loserVideoByAnimal[key]) return loserVideoByAnimal[key];
  }

  return null;
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
      : typeof window !== "undefined" && window.location.pathname.startsWith("/audience")
      ? "audience"
      : "home";

  const [mode, setMode] = useState<AppMode>(initialPath === "audience" ? "audience" : "home");
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeRound, setActiveRound] = useState<RoundRecord | null>(null);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const [leaderTeam, setLeaderTeam] = useState<Team | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [teamCodeInput, setTeamCodeInput] = useState("");
  const [selectedRoundType, setSelectedRoundType] = useState<RoundType>("voting");
  const [timerDuration, setTimerDuration] = useState(DEFAULT_ROUND_SECONDS);
  const [customTimerInput, setCustomTimerInput] = useState("");
  const [customScoreInputs, setCustomScoreInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const lastCountdownSoundRef = useRef<number | null>(null);
  const autoLockingRoundRef = useRef<string | null>(null);

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

  const leaderHasVoted = useMemo(() => {
    if (!leaderTeam || !activeRound) return false;
    return votes.some((vote) => vote.voter_team_id === leaderTeam.id);
  }, [activeRound, leaderTeam, votes]);

  const effectiveLeaderTeam = useMemo(() => {
    if (!leaderTeam) return null;
    return teams.find((team) => team.id === leaderTeam.id) ?? leaderTeam;
  }, [leaderTeam, teams]);

  const latestScoreEvent = useMemo(
    () => scoreEvents.find((event) => !event.undone_at) ?? null,
    [scoreEvents]
  );

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
    try {
      setLoadError(null);

      const [{ data: teamRows, error: teamError }, { data: roundRows, error: roundError }] =
        await Promise.all([
          supabase.from("teams").select("*").eq("room_id", roomId),
          supabase
            .from("rounds")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false }),
        ]);

      if (teamError) throw teamError;
      if (roundError) throw roundError;

      const normalizedTeams = (teamRows ?? []).map((team, index) =>
        normalizeTeam(team as Team, index)
      );
      const mappedRounds = (roundRows ?? []).map((row) =>
        toRoundRecord(row as Record<string, unknown>)
      );

      setTeams(normalizedTeams);
      setRounds(mappedRounds);
      setActiveRound(mappedRounds[0] ?? null);

      const latestRound = mappedRounds[0];

      if (!latestRound) {
        setVotes([]);
      } else {
        const { data: voteRows, error: voteError } = await supabase
          .from("votes")
          .select("*")
          .eq("round_id", latestRound.id);

        if (voteError) throw voteError;
        setVotes((voteRows ?? []) as VoteRow[]);
      }

      const { data: scoreRows, error: scoreError } = await supabase
        .from("score_events")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

      if (scoreError) {
        setScoreEvents([]);
      } else {
        setScoreEvents((scoreRows ?? []) as ScoreEvent[]);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to refresh room right now."
      );
    }
  }, []);

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

    if (initialPath === "audience") {
      window.setTimeout(() => void loadRoomByCode(initialRoomCode, "audience"), 0);
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

    const refreshTimer = window.setTimeout(() => {
      void refreshRoomData(room.id);
    }, 0);

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `room_id=eq.${room.id}` },
        () => void refreshRoomData(room.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${room.id}` },
        () => void refreshRoomData(room.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => void refreshRoomData(room.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "score_events", filter: `room_id=eq.${room.id}` },
        () => void refreshRoomData(room.id)
      )
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [refreshRoomData, room]);

  async function createRoom() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const code = generateCode();
      const hostPin = generateCode(6);

      const { data: createdRoom, error: roomError } = await supabase
        .from("rooms")
        .insert({ code, host_pin: hostPin, status: "lobby" })
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

      setRoom(foundRoom as Room);
      setLeaderTeam(normalizeTeam(foundTeam as Team, 0));
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
      };

      const { error } = await supabase.from("rounds").insert(roundPayload);

      if (error && error.message.toLowerCase().includes("timer_seconds")) {
        const legacyPayload: Partial<typeof roundPayload> = { ...roundPayload };
        delete legacyPayload.timer_seconds;
        const { error: retryError } = await supabase.from("rounds").insert(legacyPayload);
        if (retryError) throw retryError;
      } else if (error) {
        throw error;
      }

      await supabase.from("rooms").update({ status: "active" }).eq("id", room.id);

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

    sound.play("voteSubmit");
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

    sound.play("reveal");
  }, [activeRound, sortedVoteCounts, sound]);

  useEffect(() => {
    if (!activeRound || activeRound.status !== "voting" || secondsLeft > 0) return;
    if (autoLockingRoundRef.current === activeRound.id) return;

    autoLockingRoundRef.current = activeRound.id;
    void lockVotes();
  }, [activeRound, secondsLeft, lockVotes]);

  async function applyScore(teamId: string, delta: number, reason: string) {
    if (!room) return;

    const team = teams.find((entry) => entry.id === teamId);
    if (!team) return;

    const multiplier = activeRound?.round_type === "final_double" ? 2 : 1;
    const finalDelta = delta * multiplier;

    const { error: updateError } = await supabase
      .from("teams")
      .update({ score: team.score + finalDelta })
      .eq("id", teamId);

    if (updateError) {
      setLoadError(updateError.message);
      return;
    }

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

    sound.play("score");
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
    }
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
      sound.play("winner");
      return;
    }

    await supabase.from("rooms").update({ status: "lobby" }).eq("id", activeRound.room_id);
  }

  async function revealWinner() {
    if (!room) return;
    setShowWinner(true);
    await supabase.from("rooms").update({ status: "winner" }).eq("id", room.id);
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
      await supabase.from("rooms").update({ status: "lobby" }).eq("id", room.id);
      setShowWinner(false);
      setVotes([]);
      setRounds([]);
      setActiveRound(null);
      setScoreEvents([]);
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
          rounds={rounds}
          scoreEvents={scoreEvents}
          voteCounts={voteCounts}
          targetTeam={targetTeam}
          rivalTeam={rivalTeam}
          secondsLeft={secondsLeft}
          totalVotes={totalVotes}
          loadError={loadError}
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
          customScoreInputs={customScoreInputs}
          setCustomScoreInputs={setCustomScoreInputs}
          revealWinner={revealWinner}
          resetGame={resetGame}
          updateTeamContent={updateTeamContent}
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
          leaderHasVoted={leaderHasVoted}
          soundEnabled={sound.enabled}
          toggleSound={() => sound.setEnabled(!sound.enabled)}
          submitVote={submitVote}
        />
      )}

      {mode === "audience" && room && (
        <AudienceScreen
          room={room}
          teams={teams}
          sortedTeams={sortedTeams}
          activeRound={activeRound}
          voteCounts={voteCounts}
          targetTeam={targetTeam}
          rivalTeam={rivalTeam}
          secondsLeft={secondsLeft}
          totalVotes={totalVotes}
          showWinner={showWinner || room.status === "winner" || activeRound?.status === "winner"}
          winnerTeam={winnerTeam}
          reducedMotion={Boolean(reducedMotion)}
        />
      )}
    </AnimatePresence>
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
  rounds: RoundRecord[];
  scoreEvents: ScoreEvent[];
  voteCounts: { team: Team; count: number }[];
  targetTeam: Team | null;
  rivalTeam: Team | null;
  secondsLeft: number;
  totalVotes: number;
  loadError: string | null;
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
  customScoreInputs: Record<string, string>;
  setCustomScoreInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  revealWinner: () => void;
  resetGame: () => void;
  updateTeamContent: (teamId: string, patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>) => void;
  showWinner: boolean;
  winnerTeam: Team | null;
  reducedMotion: boolean;
}) {
  const maxVotes = Math.max(1, ...props.voteCounts.map((entry) => entry.count));
  const maxScore = Math.max(1, ...props.sortedTeams.map((team) => team.score));
  const joinedTeams = props.teams.length;
  const votingTeams = Math.max(0, props.teams.length);
  const voteProgress = votingTeams > 0 ? Math.round((props.totalVotes / votingTeams) * 100) : 0;
  const audienceUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/audience?room=${props.room.code}`;
  const roundStatusLabel = props.activeRound
    ? `${roundTypeLabels[props.activeRound.round_type]} - ${props.activeRound.status}`
    : "Lobby - waiting to start";
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
            Team leaders join with the room code and their team code.
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
          <a className="ghost-btn" href={audienceUrl} target="_blank" rel="noreferrer">
            <Eye size={18} />
            Audience
          </a>
        </div>
      </header>

      {props.loadError && <p className="error-banner">{props.loadError}</p>}

      <section className="host-grid">
        <div className="host-main-column">
          <div className="dashboard-grid">
            <HostStatCard label="Round status" value={roundStatusLabel} icon={<Settings size={18} />} />
            <HostStatCard label="Joined teams" value={`${joinedTeams} ready`} icon={<Users size={18} />} />
            <HostStatCard label="Voting progress" value={`${voteProgress}%`} icon={<Vote size={18} />} />
            <HostStatCard label="History" value={`${props.rounds.length} rounds`} icon={<Trophy size={18} />} />
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
              <p className="muted-text">
                Finish or complete the current round before starting another one.
              </p>
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
                    ? "Final round scoring is doubled automatically."
                    : "Quick scoring keeps the host flow moving fast."}
                </p>
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
            maxScore={maxScore}
            reducedMotion={Boolean(props.reducedMotion)}
          />
          )}
        </div>

        <div className="host-side-column">
          <div className="game-card">
            <div className="panel-topline">
              <div>
                <p className="section-kicker">Lobby join</p>
                <h3>Room code</h3>
              </div>
            </div>

            <div className="room-code-panel">
              <strong>{props.room.code}</strong>
              <p className="muted-text">Leaders enter this room code, then use their team code below.</p>
            </div>

            <div className="team-code-list">
              {props.teams.map((team, index) => (
                <TeamCodeRow key={team.id} team={team} index={index} />
              ))}
            </div>
          </div>

          <div className="game-card">
            <p className="section-kicker">Live leaderboard</p>
            <AnimatedLeaderboard teams={props.sortedTeams} maxScore={maxScore} />
            <button className="ghost-btn wide-btn" onClick={props.revealWinner}>
              <Crown size={18} />
              Final reveal
            </button>
            <button className="danger-btn wide-btn" onClick={props.resetGame}>
              <RotateCcw size={18} />
              Reset game
            </button>
          </div>

          <div className="game-card">
            <p className="section-kicker">Game history</p>
            <GameHistoryPanel
              rounds={props.rounds}
              scoreEvents={props.scoreEvents}
              teams={props.teams}
            />
          </div>

          <AdminContentEditor teams={props.teams} updateTeamContent={props.updateTeamContent} />
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

function AudienceScreen(props: {
  room: Room;
  teams: Team[];
  sortedTeams: Team[];
  activeRound: RoundRecord | null;
  voteCounts: { team: Team; count: number }[];
  targetTeam: Team | null;
  rivalTeam: Team | null;
  secondsLeft: number;
  totalVotes: number;
  showWinner: boolean;
  winnerTeam: Team | null;
  reducedMotion: boolean;
}) {
  const maxVotes = Math.max(1, ...props.voteCounts.map((entry) => entry.count));
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
          <p className="section-kicker">Audience screen</p>
          <h1>{props.room.code}</h1>
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
          maxScore={maxScore}
          reducedMotion={props.reducedMotion}
        />
      ) : (
        <section className="audience-grid">
          <div className="audience-main">
            <p className="section-kicker">Big leaderboard</p>
            <AnimatedLeaderboard teams={props.sortedTeams} maxScore={maxScore} />
          </div>

          <div className="audience-side">
            <div className="game-card">
              <p className="section-kicker">Current matchup</p>
              {props.activeRound ? (
                <ChallengeRevealCard
                  round={props.activeRound}
                  targetTeam={props.targetTeam}
                  rivalTeam={props.rivalTeam}
                />
              ) : (
                <div className="empty-state">
                  <Sparkles size={42} />
                  <h2>Waiting for the host</h2>
                </div>
              )}
            </div>

            <div className="game-card">
              <div className="live-row">
                <div>
                  <p className="section-kicker">Live votes</p>
                  <h2>{props.totalVotes} in</h2>
                </div>
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
            </div>
          </div>
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

function AdminContentEditor(props: {
  teams: Team[];
  updateTeamContent: (teamId: string, patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>) => void;
}) {
  return (
    <div className="game-card admin-editor">
      <div>
        <p className="section-kicker">Content editor</p>
        <h3>Teams and media keys</h3>
        <p className="muted-text">
          Edit the names and animals used for join cards, scoreboards, and winner or loser media matching.
        </p>
      </div>

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

function LeaderScreen(props: {
  room: Room;
  teams: Team[];
  leaderTeam: Team;
  activeRound: RoundRecord | null;
  secondsLeft: number;
  leaderHasVoted: boolean;
  soundEnabled: boolean;
  toggleSound: () => void;
  submitVote: (targetTeamId: string) => void;
}) {
  const voteOpen =
    Boolean(
      props.activeRound &&
        (props.activeRound.round_type === "voting" ||
          props.activeRound.round_type === "steal") &&
        props.activeRound.status === "voting"
    );

  return (
    <motion.main
      className="leader-shell"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <header className="mobile-top">
        <div>
          <p className="section-kicker">Room {props.room.code}</p>
          <h1>{props.leaderTeam.name}</h1>
          <p className="header-helper">You joined as {props.leaderTeam.name}.</p>
        </div>

        <div className="header-actions">
          <button className="ghost-btn" onClick={props.toggleSound}>
            {props.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {voteOpen && (
            <TimerRing
              secondsLeft={props.secondsLeft}
              duration={getRoundTimerSeconds(props.activeRound)}
              compact
            />
          )}
        </div>
      </header>

      {!props.activeRound && (
        <div className="game-card waiting-card">
          <TeamAvatar
            emoji={props.leaderTeam.avatar_emoji ?? "★"}
            image={props.leaderTeam.avatar_image ?? ""}
            name={props.leaderTeam.name}
            className="waiting-avatar"
          />
          <Gamepad2 size={40} />
          <h2>Waiting room</h2>
          <p>You joined as {props.leaderTeam.name}. Host will start soon.</p>
        </div>
      )}

      {props.activeRound && (
        <section className="game-card leader-vote-card">
          <RoundReveal
            round={{
              type: props.activeRound.round_type,
              title: props.activeRound.title,
              prompt: props.activeRound.prompt,
              challenge: props.activeRound.challenge,
              instructions: props.activeRound.instructions ?? "",
              scoringGuide: props.activeRound.scoring_guide,
              twist: props.activeRound.twist ?? undefined,
              requiresVoting: voteOpen,
              isFinal: props.activeRound.is_final ?? false,
            }}
            secondsLeft={props.secondsLeft}
            activeStatus={props.activeRound.status}
            compact
          />

          {voteOpen ? (
            <>
              <p className="muted-text">
                Choose the team you want under pressure. You cannot vote for yourself.
              </p>

              <div className="vote-tile-grid">
                {props.teams
                  .filter((team) => team.id !== props.leaderTeam.id)
                  .map((team) => (
                    <motion.button
                      key={team.id}
                      className="vote-tile"
                      style={{ "--team-color": team.color ?? "#14b8a6" } as React.CSSProperties}
                      onClick={() => props.submitVote(team.id)}
                      whileTap={{ scale: 0.97 }}
                    >
                      <TeamAvatar
                        emoji={team.avatar_emoji ?? "⭐"}
                        image={team.avatar_image ?? ""}
                        name={team.name}
                      />
                      <strong>{team.name}</strong>
                      <span>{team.animal ?? "Team"}</span>
                    </motion.button>
                  ))}
              </div>

              {props.leaderHasVoted && (
                <div className="submitted-banner">
                  <Sparkles size={18} />
                  Vote sent. You can still change it before the lock.
                </div>
              )}
            </>
          ) : (
            <div className="challenge-preview">
              <p className="section-kicker">Stay ready</p>
              <h3>The host is running this round live. Watch the screen for scoring.</h3>
            </div>
          )}
        </section>
      )}
    </motion.main>
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

function TeamAvatar(props: {
  emoji: string;
  image: string;
  name: string;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`team-avatar ${props.className ?? ""}`}>
      {props.image && !imageFailed ? (
        <img
          src={props.image}
          alt={props.name}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{props.emoji}</span>
      )}
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

function TimerRing(props: { secondsLeft: number; compact?: boolean; duration?: number }) {
  const duration = props.duration ?? DEFAULT_ROUND_SECONDS;
  const percentage = (props.secondsLeft / duration) * 100;

  return (
    <div
      className={props.compact ? "timer-ring compact" : "timer-ring"}
      style={{ "--progress": `${percentage}%` } as React.CSSProperties}
    >
      <strong>{props.secondsLeft}</strong>
      {!props.compact && <span>sec</span>}
    </div>
  );
}

function EmptyHostState() {
  return (
    <div className="empty-state">
      <Sparkles size={42} />
      <h2>Ready to launch the room</h2>
      <p>Pick a round type or use random round when everybody is in.</p>
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

function AnimatedVoteBar(props: {
  team: Team;
  count: number;
  max: number;
  index: number;
}) {
  const width = `${Math.max(6, (props.count / props.max) * 100)}%`;

  return (
    <div
      className="vote-bar-wrap"
      style={{ "--team-color": props.team.color ?? TEAM_COLOR_OPTIONS[props.index] } as React.CSSProperties}
    >
      <div className="vote-bar-meta">
        <div className="vote-team-meta">
          <TeamAvatar
            emoji={props.team.avatar_emoji ?? "⭐"}
            image={props.team.avatar_image ?? ""}
            name={props.team.name}
          />
          <div>
            <strong>{props.team.name}</strong>
            <span>{props.team.animal ?? "Team"}</span>
          </div>
        </div>
        <b>{props.count}</b>
      </div>
      <div className="vote-bar-track">
        <motion.div
          className="vote-bar-fill"
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>
    </div>
  );
}

function ChallengeRevealCard(props: {
  round: RoundRecord;
  targetTeam: Team | null;
  rivalTeam: Team | null;
}) {
  return (
    <motion.div
      className="challenge-reveal"
      initial={{ rotateX: -12, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
    >
      <div className="arena-label">
        <Music2 size={16} />
        {props.round.round_type === "voting" || props.round.round_type === "steal"
          ? "Pressure team"
          : "All teams live"}
      </div>
      {props.targetTeam ? (
        <div className="pressure-team-banner">
          <TeamAvatar
            emoji={props.targetTeam.avatar_emoji ?? "⭐"}
            image={props.targetTeam.avatar_image ?? ""}
            name={props.targetTeam.name}
            className="pressure-avatar"
          />
          <div>
            <strong>{props.targetTeam.name}</strong>
            <span>{props.targetTeam.animal}</span>
          </div>
        </div>
      ) : (
        <p className="muted-on-dark">
          This round is all-play, so every team is in the spotlight.
        </p>
      )}
      {props.targetTeam && props.rivalTeam && (
        <div className="matchup-strip">
          <span>{props.targetTeam.name}</span>
          <b>vs</b>
          <span>{props.rivalTeam.name}</span>
        </div>
      )}
      <h3>{props.round.challenge}</h3>
      <p className="muted-on-dark">{props.round.scoring_guide}</p>
    </motion.div>
  );
}

function ScoreCard(props: {
  team: Team;
  rank: number;
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
      </div>

      <div className="score-preset-grid">
        {SCORE_PRESETS.map((preset) => (
          <button
            key={`${props.team.id}-${preset.label}`}
            className="score-chip"
            onClick={() => props.onPreset(preset.delta, preset.reason)}
          >
            {preset.label}
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
        <button className="ghost-btn" onClick={props.onApplyCustom}>
          Apply
        </button>
      </div>
    </div>
  );
}

function AnimatedLeaderboard(props: { teams: Team[]; maxScore: number }) {
  return (
    <div className="leaderboard">
      {props.teams.map((team, index) => {
        const width = `${Math.max(10, (Math.max(0, team.score) / props.maxScore) * 100)}%`;

        return (
          <motion.div
            key={team.id}
            layout
            className={`leaderboard-row ${index === 0 ? "is-first" : ""}`}
            style={{ "--team-color": team.color ?? "#14b8a6" } as React.CSSProperties}
          >
            <div className="leaderboard-row-top">
              <span className="rank">{index + 1}</span>
              <TeamAvatar
                emoji={team.avatar_emoji ?? "⭐"}
                image={team.avatar_image ?? ""}
                name={team.name}
              />
              <div className="leaderboard-team-copy">
                <strong>{team.name}</strong>
                <span>{team.animal ?? "Team identity"}</span>
              </div>
              <div className="score-cluster">
                <span className="score-number">{team.score}</span>
                <span className="score-label">pts</span>
              </div>
            </div>
            <div className="score-meter">
              <motion.div className="score-meter-fill" animate={{ width }} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function GameHistoryPanel(props: {
  rounds: RoundRecord[];
  scoreEvents: ScoreEvent[];
  teams: Team[];
}) {
  function getRoundWinners(roundId: string) {
    const totals = new Map<string, number>();

    props.scoreEvents
      .filter((event) => event.round_id === roundId && !event.undone_at)
      .forEach((event) => {
        totals.set(event.team_id, (totals.get(event.team_id) ?? 0) + event.delta);
      });

    const topScore = Math.max(0, ...totals.values());
    if (topScore <= 0) return [];

    return [...totals.entries()]
      .filter(([, total]) => total === topScore)
      .map(([teamId]) => props.teams.find((team) => team.id === teamId)?.name ?? "Team");
  }

  return (
    <div className="history-stack">
      {props.rounds.length === 0 && (
        <p className="muted-text">No rounds yet. Start one and the story builds here.</p>
      )}

      {props.rounds.map((round) => {
        const events = props.scoreEvents.filter((event) => event.round_id === round.id);
        const pressureTeam =
          props.teams.find((team) => team.id === round.target_team_id)?.name ?? "All teams";
        const winners = getRoundWinners(round.id);

        return (
          <article className="history-card" key={round.id}>
            <div className="history-card-top">
              <strong>
                Round {round.round_number ?? "?"}: {roundTypeLabels[round.round_type]}
              </strong>
              <span>{pressureTeam}</span>
            </div>
            <p>{round.challenge}</p>
            {winners.length > 0 && (
              <p className="history-winner-line">
                Winner{winners.length > 1 ? "s" : ""}: {winners.join(" & ")}
              </p>
            )}
            <div className="history-events">
              {events.slice(0, 4).map((event) => {
                const teamName =
                  props.teams.find((team) => team.id === event.team_id)?.name ?? "Team";
                return (
                  <span key={event.id}>
                    {teamName} {event.delta > 0 ? `+${event.delta}` : event.delta}
                  </span>
                );
              })}
              {events.length === 0 && <span>No score events yet</span>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function placeLabel(index: number, total: number) {
  if (index === total - 1) return "Last place";
  if (index === 0) return "1st place";
  if (index === 1) return "2nd place";
  if (index === 2) return "3rd place";
  return `${index + 1}th place`;
}

function WinnerReveal(props: {
  winner: Team;
  teams: Team[];
  maxScore: number;
  reducedMotion: boolean;
}) {
  const winnerVideo = getWinnerVideo(props.winner);
  const lastTeam = props.teams[props.teams.length - 1] ?? null;
  const loserVideo = lastTeam ? getLoserVideo(lastTeam) : null;
  const losingTeams = props.teams.filter((team) => team.id !== props.winner.id);

  return (
    <motion.section
      className="winner-panel"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <ConfettiBurst reducedMotion={props.reducedMotion} />
      <p className="section-kicker">Winner reveal</p>
      <div className="winner-hero">
        <TeamAvatar
          emoji={props.winner.avatar_emoji ?? "⭐"}
          image={props.winner.avatar_image ?? ""}
          name={props.winner.name}
          className="winner-avatar"
        />
        <div>
          <h2>{props.winner.name}</h2>
          <p>
            {props.winner.animal} take the room with {props.winner.score} points.
          </p>
        </div>
      </div>
      {winnerVideo && (
        <div className="winner-video-wrap">
          <video
            className="winner-video"
            src={winnerVideo}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      )}
      <div className="final-results-grid">
        {props.teams.map((team, index) => (
          <div
            className={`final-place-card ${index === 0 ? "is-winner" : ""} ${index === props.teams.length - 1 ? "is-last" : ""}`}
            key={team.id}
          >
            <span>{placeLabel(index, props.teams.length)}</span>
            <strong>{team.name}</strong>
            <b>{team.score} pts</b>
          </div>
        ))}
      </div>
      {lastTeam && loserVideo && (
        <div className="winner-video-wrap loser-feature-video">
          <p className="section-kicker">Loser video</p>
          <video
            className="winner-video"
            src={loserVideo}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      )}
      {losingTeams.length > 0 && (
        <div className="loser-grid">
          {losingTeams.map((team) => {
            const loserVideo = getLoserVideo(team);

            return (
              <div className="loser-card" key={team.id}>
                <div className="loser-card-top">
                  <TeamAvatar
                    emoji={team.avatar_emoji ?? "⭐"}
                    image={team.avatar_image ?? ""}
                    name={team.name}
                  />
                  <div>
                    <strong>{team.name}</strong>
                    <span>{team.animal}</span>
                  </div>
                </div>
                {loserVideo ? (
                  <video
                    className="loser-video"
                    src={loserVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <p className="muted-text">No loss clip loaded for this team yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <AnimatedLeaderboard teams={props.teams} maxScore={props.maxScore} />
    </motion.section>
  );
}

function ConfettiBurst(props: { reducedMotion: boolean }) {
  if (props.reducedMotion) return null;

  return (
    <div className="confetti-burst" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => (
        <span key={index} style={{ "--delay": `${index * 80}ms` } as React.CSSProperties} />
      ))}
    </div>
  );
}
