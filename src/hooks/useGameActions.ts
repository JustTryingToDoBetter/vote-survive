import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { buildRoundDefinition } from "../data/gameContent";
import {
  HOST_SESSION_KEY,
  LEADER_SESSION_KEY,
  createDefaultDrafts,
  generateCode,
  toLegacyRoundPayload,
  toRoundRecord,
} from "../app/appHelpers";
import {
  getCurrentQuestion,
  getCurrentQuestionIndex,
  isRapidQuizRound,
  toPublicQuizQuestion,
} from "../features/quiz/quizEngine";
import { roundRequiresVoting } from "../features/gameflow/gamePhases";
import {
  getEffectiveScoreDelta,
  getVoteOutcome,
  getWinnerOutcome,
} from "../features/gameflow/gameRules";
import {
  challengeConfigForRoundType,
  chooseAutomaticRival,
  getChallengeConfig,
  requiresChallengeResolution,
  requiresRival,
} from "../features/challenge/challengeEngine";
import { createHostSupabase, getHostSupabase, supabase } from "../lib/supabase";
import {
  fetchBootstrapRoomState,
  roomColumns,
  roundColumns,
} from "../lib/supabaseQueries";
import type { SoundName } from "../lib/sound";
import type {
  AppMode,
  AnswerSubmission,
  Room,
  RoundRecord,
  RoundDefinition,
  RoundStatus,
  RoundType,
  ScoreEvent,
  Team,
  VoteRow,
} from "../lib/types";

type SoundEffects = {
  play: (name: SoundName) => void;
};
function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
function votesForLeader(votes: VoteRow[], leaderTeamId: string) {
  return votes.find((vote) => vote.voter_team_id === leaderTeamId) ?? null;
}

function getStoredLeaderSessionToken() {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(LEADER_SESSION_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as { sessionToken?: string };
    return parsed.sessionToken?.trim() || null;
  } catch {
    return null;
  }
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
  const [pendingChallengeAction, setPendingChallengeAction] = useState<string | null>(null);
  const scoringLocksRef = useRef<Record<string, boolean>>({});

  async function createRoom() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const code = generateCode();
      const hostPin = generateCode(6);
      const hostSupabase = createHostSupabase(hostPin);

      const { data: createdRoom, error: roomError } = await hostSupabase
        .from("rooms")
        .insert({ code, host_pin: hostPin, status: "active" })
        .select(roomColumns)
        .single();

      if (roomError || !createdRoom) throw roomError ?? new Error("Room creation failed.");

      const { error: teamsError } = await hostSupabase
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
        );

      if (teamsError) throw teamsError;

      const { data: createdTeams, error: teamListError } = await hostSupabase.rpc(
        "host_list_teams",
        { p_room_id: createdRoom.id }
      );

      if (teamListError) throw teamListError;

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
      const normalizedRoomCode = roomCodeInput.trim().toUpperCase();
      const normalizedLeaderCode = teamCodeInput.trim().toUpperCase();

      const { data: sessionData, error: joinedError } = await supabase
        .rpc("join_team_session", {
          p_room_code: normalizedRoomCode,
          p_leader_code: normalizedLeaderCode,
        })
        .single();

      if (joinedError || !sessionData) {
        throw joinedError ?? new Error("Unable to create leader session.");
      }

      const joinedSession = sessionData as {
        room_id: string;
        team_id: string;
        session_token: string;
        joined_at: string;
        expires_at: string;
      };
      if (typeof window !== "undefined") {
        // Persist the server-issued session before the recovery read so a
        // transient bootstrap failure never loses a valid leader session.
        window.localStorage.setItem(
          LEADER_SESSION_KEY,
          JSON.stringify({
            roomCode: normalizedRoomCode,
            sessionToken: joinedSession.session_token,
            expiresAt: joinedSession.expires_at,
          })
        );
      }

      const bootstrapStartedAt = performance.now();
      const bootstrap = await fetchBootstrapRoomState(joinedSession.room_id);
      const foundRoom = bootstrap.room;
      const foundTeam = bootstrap.teams.find((team: Team) => team.id === joinedSession.team_id);

      if (!foundRoom || !foundTeam) {
        throw new Error("Leader team could not be restored.");
      }

      setRoom(foundRoom);
      setTeams(bootstrap.teams);
      setRounds(bootstrap.rounds);
      setActiveRound(bootstrap.activeRound);
      setVotes(bootstrap.votes);
      setAnswerSubmissions(bootstrap.answers);
      setLeaderTeam({ ...foundTeam, joined_at: joinedSession.joined_at });
      setMode("leader");
      if (import.meta.env.DEV) {
        console.info(`[perf] leader join: ${Math.round(performance.now() - bootstrapStartedAt)}ms`);
      }
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.pathname = "/join";
        url.searchParams.set("room", foundRoom.code);
        window.history.replaceState({}, "", url.toString());
      }
    } catch (error) {
  console.error("Leader join failed:", error);

  setLoadError(
    getErrorMessage(
      error,
      "Unable to join room."
    )
  );
} finally {
      setIsLoading(false);
    }
  }

  async function startRound(roundType?: RoundType, plannedDefinition?: RoundDefinition) {
    if (!room) return false;

    setLoadError(null);

    try {
      const definition = plannedDefinition ?? buildRoundDefinition(roundType);
      const nextRoundNumber = (rounds[0]?.round_number ?? 0) + 1;
      const hostSupabase = getHostSupabase();
      const quizQuestionSet = definition.questionSet ?? null;
      // Question rounds have no useful reveal-only waiting step: starting the
      // round means starting question one. The idempotent question RPC handles
      // the immediate live transition after this insert is authoritative.
      // A host choosing an all-team Challenge or Final has already made the
      // meaningful decision. Put it live immediately; only match-up rounds
      // retain a reveal beat before voting opens.
      const status: RoundStatus =
        quizQuestionSet?.length || !definition.requiresVoting ? "live" : "reveal";
      const publicQuestionSet = quizQuestionSet?.map(toPublicQuizQuestion) ?? null;
      const challengeConfig =
        definition.challengeConfig ?? challengeConfigForRoundType(definition.type);
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
        rival_team_id: null,
        challenge_config: challengeConfig,
        challenge_winner_team_id: null,
        challenge_resolved_at: null,
        is_final: definition.isFinal ?? false,
        timer_seconds: definition.requiresVoting ? selectedTimer : null,
        answer_options: definition.answerOptions ?? null,
        correct_answer: quizQuestionSet?.length ? null : definition.correctAnswer ?? null,
        question_set: publicQuestionSet,
        current_question_index: definition.currentQuestionIndex ?? 0,
        question_status: definition.questionStatus ?? "waiting",
        question_started_at: null,
        started_at: null,
      };

      const { data: insertedRound, error } = await hostSupabase
        .from("rounds")
        .insert(roundPayload)
        .select(roundColumns)
        .single();

      if (error) {
        if (quizQuestionSet?.length) {
          throw error;
        }

        const legacyPayload: Partial<typeof roundPayload> = { ...roundPayload };
        delete legacyPayload.timer_seconds;
        delete legacyPayload.answer_options;
        delete legacyPayload.correct_answer;
        delete legacyPayload.question_set;
        delete legacyPayload.current_question_index;
        delete legacyPayload.question_status;
        delete legacyPayload.question_started_at;
        delete legacyPayload.started_at;
        delete legacyPayload.rival_team_id;
        delete legacyPayload.challenge_config;
        delete legacyPayload.challenge_winner_team_id;
        delete legacyPayload.challenge_resolved_at;
        const { error: retryError } = await hostSupabase
          .from("rounds")
          .insert(legacyPayload);

        if (retryError) {
          const { error: minimalRetryError } = await hostSupabase
            .from("rounds")
            .insert(toLegacyRoundPayload(roundPayload));

          if (minimalRetryError) throw minimalRetryError;
        }
        queueRoomRefresh(room.id, 0);
      } else if (insertedRound) {
        const mappedRound = toRoundRecord(insertedRound as Record<string, unknown>);

        if (quizQuestionSet?.length) {
          const keys = quizQuestionSet.map((question, questionIndex) => {
            if (!question.correctAnswer) {
              throw new Error(`Quiz question ${questionIndex + 1} is missing its answer key.`);
            }
            return {
              questionIndex,
              correctAnswer: question.correctAnswer,
            };
          });

          const { error: keyError } = await hostSupabase.rpc(
            "host_set_quiz_answer_keys",
            { p_round_id: mappedRound.id, p_keys: keys }
          );

          if (keyError) {
            await hostSupabase.from("rounds").delete().eq("id", mappedRound.id);
            throw keyError;
          }
        }

        setRounds((current) => [mappedRound, ...current]);
        setActiveRound(mappedRound);
      }

      await hostSupabase.from("rooms").update({ status: "active" }).eq("id", room.id);
      setRoom((current) => (current ? { ...current, status: "active" } : current));

      setSelectedRoundType(definition.type);
      setShowWinner(false);
      sound.play("roundStart");
      return true;
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to start the round."
      );
      return false;
    }
  }

  async function beginRound() {
    if (!activeRound) return;
    if (activeRound.status !== "reveal" && activeRound.status !== "lobby") return;

    const nextStatus: RoundStatus = roundRequiresVoting(activeRound.round_type)
      ? "voting"
      : "live";
    const startedAt = new Date().toISOString();
    const hostSupabase = getHostSupabase();

    const { error } = await hostSupabase
      .from("rounds")
      .update({ status: nextStatus, started_at: startedAt })
      .eq("id", activeRound.id);

    if (error) {
      setLoadError(error.message);
      return;
    }

    const patch = { status: nextStatus, started_at: startedAt };
    setActiveRound((current) =>
      current?.id === activeRound.id ? { ...current, ...patch } : current
    );
    setRounds((current) =>
      current.map((round) =>
        round.id === activeRound.id ? { ...round, ...patch } : round
      )
    );
    sound.play("roundStart");
  }

  async function submitVote(targetTeamId: string) {
    if (!activeRound || !leaderTeam || targetTeamId === leaderTeam.id) return;
    if (
      activeRound.status !== "voting" ||
      (activeRound.round_type !== "voting" && activeRound.round_type !== "steal")
    ) {
      return;
    }
    if (pendingVoteTargetId) return;

    const sessionToken = getStoredLeaderSessionToken();
    if (!sessionToken) {
      setLoadError("Leader session has expired. Rejoin with your team code.");
      return;
    }

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

    const { error } = await supabase.rpc("submit_team_vote", {
      p_session_token: sessionToken,
      p_round_id: activeRound.id,
      p_target_team_id: targetTeamId,
    });

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

    const rapidQuiz = isRapidQuizRound(activeRound);
    if (rapidQuiz && activeRound.question_status !== "live") return;

    const currentQuestion = getCurrentQuestion(activeRound);
    const correctAnswer = currentQuestion?.correctAnswer ?? activeRound.correct_answer;
    if (!rapidQuiz && !correctAnswer) return;

    const questionIndex = getCurrentQuestionIndex(activeRound);
    const answerKey = `${activeRound.id}:${questionIndex}:${answer}`;
    if (pendingAnswerKey) return;

    const sessionToken = getStoredLeaderSessionToken();
    if (!sessionToken) {
      setLoadError("Leader session has expired. Rejoin with your team code.");
      return;
    }

    const submittedAt = new Date().toISOString();
    const isCorrect = rapidQuiz ? false : answer === correctAnswer;
    const previousSubmission =
      answerSubmissions.find(
        (submission) =>
          submission.team_id === leaderTeam.id &&
          submission.round_id === activeRound.id &&
          submission.question_index === questionIndex
      ) ?? null;
    if (previousSubmission) return;

    const optimistic = {
      id: `optimistic-answer-${leaderTeam.id}-${questionIndex}`,
      round_id: activeRound.id,
      team_id: leaderTeam.id,
      question_index: questionIndex,
      answer,
      is_correct: isCorrect,
      submitted_at: submittedAt,
    };

    setPendingAnswerKey(answerKey);
    setAnswerSubmissions((current) => [...current, optimistic]);

    const { error } = await supabase.rpc("submit_team_answer", {
      p_session_token: sessionToken,
      p_round_id: activeRound.id,
      p_answer: answer,
    });

    if (error) {
      setLoadError(error.message);
      setAnswerSubmissions((current) =>
        current.filter(
          (submission) =>
            !(
              submission.team_id === leaderTeam.id &&
              submission.round_id === activeRound.id &&
              submission.question_index === questionIndex
            )
        )
      );
      setPendingAnswerKey(null);
      return;
    }

    setPendingAnswerKey(null);
    navigator.vibrate?.(40);
    sound.play(isCorrect ? "score" : "voteSubmit");
  }

  async function lockVotes(): Promise<
  "locked" | "blocked" | "retry"
> {
  if (!activeRound) {
    return "blocked";
  }

  if (
    activeRound.status !== "voting" &&
    activeRound.status !== "live"
  ) {
    return "blocked";
  }

  let targetTeamId = activeRound.target_team_id;
  let rivalTeamId =
    activeRound.rival_team_id ?? null;

  if (activeRound.status === "voting") {
    const voteOutcome =
      getVoteOutcome(sortedVoteCounts);

    if (voteOutcome.kind === "no_votes") {
      setLoadError(
        "No votes were submitted. Keep voting open or choose another round."
      );

      return "blocked";
    }

    if (voteOutcome.kind === "tie") {
      const names = voteOutcome.teams
        .map((team) => team.name)
        .join(", ");

      setLoadError(
        `Vote tied at ${voteOutcome.count} between ${names}. Keep voting open and run a revote or sudden-death tiebreak.`
      );

      return "blocked";
    }

    targetTeamId = voteOutcome.team.id;
    setLoadError(null);
  }

  const config =
    getChallengeConfig(activeRound);

  if (
    targetTeamId &&
    requiresRival(config)
  ) {
    rivalTeamId =
      chooseAutomaticRival({
        config,
        targetTeamId,
        teams,
        voteCounts: sortedVoteCounts,
      })?.id ?? null;
  }

  try {
    const hostSupabase =
      getHostSupabase();

    const { error } = await hostSupabase
      .from("rounds")
      .update({
        status: "locked",
        target_team_id: targetTeamId,
        rival_team_id: rivalTeamId,
      })
      .eq("id", activeRound.id);

    if (error) {
      setLoadError(error.message);
      return "retry";
    }

    const patch = {
      status: "locked" as const,
      target_team_id: targetTeamId,
      rival_team_id: rivalTeamId,
    };

    setActiveRound((current) =>
      current?.id === activeRound.id
        ? { ...current, ...patch }
        : current
    );

    setRounds((current) =>
      current.map((round) =>
        round.id === activeRound.id
          ? { ...round, ...patch }
          : round
      )
    );

    sound.play("reveal");

    return "locked";
  } catch (error) {
    setLoadError(
      getErrorMessage(
        error,
        "Unable to lock the round."
      )
    );

    return "retry";
  }
}

  async function openScoring() {
    if (!activeRound || activeRound.status !== "locked") return;

    if (roundRequiresVoting(activeRound.round_type) && !activeRound.target_team_id) {
      setLoadError("Choose a pressure team before opening scoring.");
      return;
    }

    const config = getChallengeConfig(activeRound);
    if (requiresRival(config) && !activeRound.rival_team_id) {
      setLoadError("Choose a rival before opening scoring.");
      return;
    }

    const hostSupabase = getHostSupabase();
    const { error } = await hostSupabase
      .from("rounds")
      .update({ status: "scoring" })
      .eq("id", activeRound.id);

    if (error) {
      setLoadError(error.message);
      return;
    }

    setActiveRound((current) =>
      current?.id === activeRound.id ? { ...current, status: "scoring" } : current
    );
    setRounds((current) =>
      current.map((round) =>
        round.id === activeRound.id ? { ...round, status: "scoring" } : round
      )
    );
  }

  async function setRivalTeam(rivalTeamId: string) {
    if (
      !activeRound ||
      !activeRound.target_team_id ||
      activeRound.challenge_resolved_at ||
      pendingChallengeAction
    ) {
      return;
    }

    setPendingChallengeAction("set-rival");
    setLoadError(null);

    try {
      const hostSupabase = getHostSupabase();
      const { error } = await hostSupabase.rpc("host_set_round_rival", {
        p_round_id: activeRound.id,
        p_rival_team_id: rivalTeamId,
      });

      if (error) throw error;

      setActiveRound((current) =>
        current?.id === activeRound.id ? { ...current, rival_team_id: rivalTeamId } : current
      );
      setRounds((current) =>
        current.map((round) =>
          round.id === activeRound.id ? { ...round, rival_team_id: rivalTeamId } : round
        )
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to set rival.");
    } finally {
      setPendingChallengeAction(null);
    }
  }

  async function resolveChallenge(winnerTeamId: string) {
    if (
      !room ||
      !activeRound ||
      activeRound.status !== "scoring" ||
      activeRound.challenge_resolved_at ||
      pendingChallengeAction
    ) {
      return;
    }

    setPendingChallengeAction(`resolve:${winnerTeamId}`);
    setLoadError(null);

    try {
      const hostSupabase = getHostSupabase();
      const { error } = await hostSupabase.rpc("host_resolve_challenge", {
        p_round_id: activeRound.id,
        p_winner_team_id: winnerTeamId,
      });

      if (error) throw error;

      await refreshRoomData(room.id);
      sound.play("score");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to resolve challenge."
      );
    } finally {
      setPendingChallengeAction(null);
    }
  }

  async function applyScore(
    teamId: string,
    delta: number,
    reason: string,
    dedupeKeyOverride?: string
  ) {
    if (!room) return;
    if (scoringLocksRef.current[teamId]) return;

    const team = teams.find((entry) => entry.id === teamId);
    if (!team) return;

    const finalDelta = getEffectiveScoreDelta(activeRound?.round_type, delta);

    scoringLocksRef.current[teamId] = true;
    setScoringTeamIds((current) => ({ ...current, [teamId]: true }));

    try {
      const dedupeKey =
        dedupeKeyOverride ??
        [
          "score",
          room.id,
          activeRound?.id ?? "room",
          teamId,
          finalDelta,
          reason,
          crypto.randomUUID(),
        ].join(":");

      const hostSupabase = getHostSupabase();
      const { data, error } = await hostSupabase
        .rpc("host_apply_score_event", {
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
      setScoreEvents((current) => {
        const nextEvent = toScoreEvent(scoreRow);
        return current.some((event) => event.id === nextEvent.id)
          ? current.map((event) => (event.id === nextEvent.id ? nextEvent : event))
          : [nextEvent, ...current];
      });
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

    const hostSupabase = getHostSupabase();
    const { data, error } = await hostSupabase
      .rpc("host_undo_score_event", {
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

  async function transferScore(
    fromTeamId: string,
    toTeamId: string,
    amount: number,
    reason: string
  ) {
    if (!room || amount <= 0 || fromTeamId === toTeamId) return;

    const hostSupabase = getHostSupabase();
    const { error } = await hostSupabase.rpc("host_transfer_score", {
      p_room_id: room.id,
      p_from_team_id: fromTeamId,
      p_to_team_id: toTeamId,
      p_amount: amount,
      p_reason: reason,
      p_round_id: activeRound?.id ?? null,
      p_dedupe_key: [
        "transfer",
        room.id,
        activeRound?.id ?? "room",
        fromTeamId,
        toTeamId,
        amount,
        crypto.randomUUID(),
      ].join(":"),
    });

    if (error) {
      setLoadError(error.message);
      return;
    }

    await refreshRoomData(room.id);
    sound.play("score");
  }

  async function completeRound() {
    if (!activeRound) return;
    if (activeRound.status !== "scoring") return;

    const config = getChallengeConfig(activeRound);
    if (requiresChallengeResolution(config) && !activeRound.challenge_resolved_at) {
      setLoadError("Record the challenge winner before completing this round.");
      return;
    }

    const hostSupabase = getHostSupabase();
    const { error } = await hostSupabase
      .from("rounds")
      .update({ status: "complete" })
      .eq("id", activeRound.id);

    if (error) {
      setLoadError(error.message);
      return;
    }

    await hostSupabase
      .from("rooms")
      .update({ status: "active" })
      .eq("id", activeRound.room_id);
    setActiveRound((current) =>
      current?.id === activeRound.id ? { ...current, status: "complete" } : current
    );
    setRounds((current) =>
      current.map((round) =>
        round.id === activeRound.id ? { ...round, status: "complete" } : round
      )
    );
  }

  async function revealWinner() {
    if (!room) return;
    const outcome = getWinnerOutcome(teams);

    if (outcome.kind === "no_teams") {
      setLoadError("Cannot reveal a winner without teams.");
      return;
    }

    if (outcome.kind === "tie") {
      const names = outcome.teams.map((team) => team.name).join(", ");
      setLoadError(
        `Final score is tied between ${names}. Run a tiebreak round before revealing the winner.`
      );
      return;
    }

    setLoadError(null);
    const hostSupabase = getHostSupabase();
    const { error } = await hostSupabase
      .from("rooms")
      .update({ status: "winner" })
      .eq("id", room.id);
    if (error) {
      setLoadError(error.message);
      return;
    }

    setShowWinner(true);
    setRoom((current) => (current ? { ...current, status: "winner" } : current));
    sound.play("winner");
  }

  async function resetGame() {
    if (!room) return;

    setLoadError(null);

    try {
      const hostSupabase = getHostSupabase();
      const roundIds = rounds.map((round) => round.id);

      if (roundIds.length > 0) {
        await hostSupabase.from("votes").delete().in("round_id", roundIds);
        await hostSupabase.from("answer_submissions").delete().in("round_id", roundIds);
      }

      await hostSupabase.from("score_events").delete().eq("room_id", room.id);
      await hostSupabase.from("rounds").delete().eq("room_id", room.id);
      await Promise.all(
        teams.map((team) => hostSupabase.from("teams").update({ score: 0 }).eq("id", team.id))
      );
      await hostSupabase.from("rooms").update({ status: "active" }).eq("id", room.id);
      setShowWinner(false);
      setVotes([]);
      setAnswerSubmissions([]);
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
    const hostSupabase = getHostSupabase();
    const { error } = await hostSupabase.from("teams").update(patch).eq("id", teamId);

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
    const hostSupabase = getHostSupabase();
    const { error } = await hostSupabase.from("rounds").update(patch).eq("id", roundId);

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
    pendingChallengeAction,
    createRoom,
    joinAsLeader,
    startRound,
    beginRound,
    submitVote,
    submitAnswer,
    lockVotes,
    openScoring,
    setRivalTeam,
    resolveChallenge,
    applyScore,
    transferScore,
    undoLastScore,
    completeRound,
    revealWinner,
    resetGame,
    updateTeamContent,
    updateRoundContent,
  };
}
