import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChartNoAxesColumnIncreasing, Eye, Lock, Radio, Sparkles, Star, Trophy, Users } from "lucide-react";
import { ProjectorStage } from "../features/audience/ProjectorStage";
import {
  DEFAULT_ROUND_SECONDS,
  formatSyncState,
  getProjectorState,
  getRoundTimerSeconds,
  type SyncState,
} from "../features/gameflow/gamePhases";
import { HomeScreen } from "../features/home/HomeScreen";
import { HostScreen } from "../features/host/HostScreen";
import { LeaderScreen } from "../features/leader/LeaderScreen";
import {
  getAnswerForTeam,
  getCurrentQuestionIndex,
  getQuizSecondsLeft,
  isRapidQuizRound,
  shouldAutoStartQuizQuestion,
} from "../features/quiz/quizEngine";
import { AnimatedLeaderboard } from "../features/shared/AnimatedLeaderboard";
import { useGameActions } from "../hooks/useGameActions";
import { useQuizActions } from "../hooks/useQuizActions";
import { useRoomSession } from "../hooks/useRoomSession";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { getRoomCodeFromLocation } from "./appHelpers";
import type {
  AnswerSubmission,
  AppMode,
  Room,
  RoundRecord,
  RoundType,
  Team,
} from "../lib/types";
import "../App.css";

const WinnerReveal = lazy(async () => {
  const module = await import("../features/audience/WinnerReveal");
  return { default: module.WinnerReveal };
});

export default function App() {
  const reducedMotion = useReducedMotion();
  const sound = useSoundEffects();
  const initialRoomCode =
    typeof window !== "undefined"
      ? getRoomCodeFromLocation(window.location.pathname, window.location.search)
      : "";
  const initialPath: AppMode =
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
  const [selectedRoundType, setSelectedRoundType] = useState<RoundType>("all_play");
  const [timerDuration, setTimerDuration] = useState(DEFAULT_ROUND_SECONDS);
  const [customTimerInput, setCustomTimerInput] = useState("");
  const [customScoreInputs, setCustomScoreInputs] = useState<Record<string, string>>({});
  const [now, setNow] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const lastCountdownSoundRef = useRef<number | null>(null);
  const autoLockingRoundRef = useRef<string | null>(null);
  const autoLockingQuizRef = useRef<string | null>(null);
  const autoStartingQuizRef = useRef<string | null>(null);

  const session = useRoomSession({ initialPath, initialRoomCode, setMode });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedTeams = useMemo(
    () => [...session.teams].sort((a, b) => b.score - a.score),
    [session.teams]
  );

  const totalVotes = useMemo(() => session.votes.length, [session.votes]);

  const secondsLeft = useMemo(() => {
    if (!session.activeRound) return 0;

    if (
      session.activeRound.status === "live" &&
      isRapidQuizRound(session.activeRound) &&
      session.activeRound.question_status === "live"
    ) {
      return getQuizSecondsLeft(session.activeRound, now);
    }

    if (session.activeRound.status !== "voting") return 0;

    const startedAt = session.activeRound.started_at ?? session.activeRound.created_at;
    const created = new Date(startedAt).getTime();
    const elapsed = Math.floor((now - created) / 1000);

    return Math.max(0, getRoundTimerSeconds(session.activeRound) - elapsed);
  }, [session.activeRound, now]);

  const voteCounts = useMemo(() => {
    const countsByTargetId = new Map<string, number>();
    for (const vote of session.votes) {
      countsByTargetId.set(
        vote.target_team_id,
        (countsByTargetId.get(vote.target_team_id) ?? 0) + 1
      );
    }

    return session.teams.map((team) => ({
      team,
      count: countsByTargetId.get(team.id) ?? 0,
    }));
  }, [session.teams, session.votes]);

  const sortedVoteCounts = useMemo(
    () => [...voteCounts].sort((a, b) => b.count - a.count),
    [voteCounts]
  );

  const targetTeam = useMemo(() => {
    if (!session.activeRound?.target_team_id) return null;
    return session.teams.find((team) => team.id === session.activeRound?.target_team_id) ?? null;
  }, [session.activeRound?.target_team_id, session.teams]);

  const rivalTeam = useMemo(() => {
    if (!targetTeam) return null;

    return (
      sortedVoteCounts.find((entry) => entry.team.id !== targetTeam.id)?.team ??
      sortedTeams.find((team) => team.id !== targetTeam.id) ??
      null
    );
  }, [sortedTeams, sortedVoteCounts, targetTeam]);

  const leaderAnswer = useMemo(() => {
    if (!session.leaderTeam || !session.activeRound) return null;
    if (isRapidQuizRound(session.activeRound)) {
      return getAnswerForTeam(
        session.answerSubmissions,
        session.activeRound,
        session.leaderTeam.id
      );
    }
    return (
      session.answerSubmissions.find(
        (submission) => submission.team_id === session.leaderTeam?.id
      ) ?? null
    );
  }, [session.activeRound, session.answerSubmissions, session.leaderTeam]);

  const leaderVoteTarget = useMemo(() => {
    if (!session.leaderTeam || !session.activeRound) return null;
    const vote = session.votes.find((entry) => entry.voter_team_id === session.leaderTeam?.id);
    if (!vote) return null;
    return session.teams.find((team) => team.id === vote.target_team_id) ?? null;
  }, [session.activeRound, session.leaderTeam, session.teams, session.votes]);

  const sortedAnswerSubmissions = useMemo(
    () =>
      [...session.answerSubmissions].sort(
        (a, b) =>
          new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      ),
    [session.answerSubmissions]
  );

  const effectiveLeaderTeam = useMemo(() => {
    if (!session.leaderTeam) return null;
    return session.teams.find((team) => team.id === session.leaderTeam?.id) ?? session.leaderTeam;
  }, [session.leaderTeam, session.teams]);

  const latestScoreEvent = useMemo(
    () => session.scoreEvents.find((event) => !event.undone_at) ?? null,
    [session.scoreEvents]
  );

  const winnerTeam = sortedTeams[0] ?? null;

  const actions = useGameActions({
    room: session.room,
    teams: session.teams,
    rounds: session.rounds,
    activeRound: session.activeRound,
    votes: session.votes,
    answerSubmissions: session.answerSubmissions,
    leaderTeam: session.leaderTeam,
    sortedVoteCounts,
    latestScoreEvent,
    roomCodeInput: session.roomCodeInput,
    teamCodeInput: session.teamCodeInput,
    timerDuration,
    customTimerInput,
    sound,
    setMode,
    setRoom: session.setRoom,
    setTeams: session.setTeams,
    setRounds: session.setRounds,
    setVotes: session.setVotes,
    setAnswerSubmissions: session.setAnswerSubmissions,
    setScoreEvents: session.setScoreEvents,
    setLeaderTeam: session.setLeaderTeam,
    setActiveRound: session.setActiveRound,
    setSelectedRoundType,
    setShowWinner,
    setIsLoading: session.setIsLoading,
    setLoadError: session.setLoadError,
    refreshRoomData: session.refreshRoomData,
    queueRoomRefresh: session.queueRoomRefresh,
  });

  const quizActions = useQuizActions({
    activeRound: session.activeRound,
    answerSubmissions: session.answerSubmissions,
    setRounds: session.setRounds,
    setActiveRound: session.setActiveRound,
    setLoadError: session.setLoadError,
    applyScore: actions.applyScore,
  });

  useEffect(() => {
    const quizCountdownActive = Boolean(
      session.activeRound &&
        isRapidQuizRound(session.activeRound) &&
        session.activeRound.status === "live" &&
        session.activeRound.question_status === "live"
    );
    if (
      (session.activeRound?.status === "voting" || quizCountdownActive) &&
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
  }, [session.activeRound, session.activeRound?.status, secondsLeft, sound]);

  useEffect(() => {
    if (mode !== "host") return;
    if (
    !session.activeRound ||
    session.activeRound.status !== "voting" ||
    secondsLeft > 0
  ) {
    return;
  }

  if (
    autoLockingRoundRef.current ===
    session.activeRound.id
  ) {
    return;
  }

  autoLockingRoundRef.current =
    session.activeRound.id;

  void actions.lockVotes();
}, [
  actions,
  mode,
  secondsLeft,
  session.activeRound,
]);

  useEffect(() => {
    if (mode !== "host") return;
    const round = session.activeRound;
    if (
      !round ||
      !shouldAutoStartQuizQuestion(round)
    ) {
      return;
    }

    const key = `${round.id}:${getCurrentQuestionIndex(round)}`;
    if (autoStartingQuizRef.current === key) return;

    autoStartingQuizRef.current = key;
    void quizActions.startQuestion().then((started) => {
      if (!started && autoStartingQuizRef.current === key) {
        autoStartingQuizRef.current = null;
      }
    });
  }, [mode, quizActions, session.activeRound]);

  useEffect(() => {
    if (mode !== "host") return;
    const round = session.activeRound;
    if (
      !round ||
      round.status !== "live" ||
      !isRapidQuizRound(round) ||
      round.question_status !== "live" ||
      !round.question_started_at ||
      secondsLeft > 0
    ) {
      return;
    }

    const key = `${round.id}:${getCurrentQuestionIndex(round)}`;
    if (autoLockingQuizRef.current === key) return;

    autoLockingQuizRef.current = key;
    void quizActions.lockQuestion().then((locked) => {
      if (!locked && autoLockingQuizRef.current === key) {
        autoLockingQuizRef.current = null;
      }
    });
  }, [mode, quizActions, secondsLeft, session.activeRound]);

  useEffect(() => {
    const round = session.activeRound;
    if (!round || round.question_status !== "waiting") {
      autoStartingQuizRef.current = null;
    }
    if (!round || round.question_status !== "live") {
      autoLockingQuizRef.current = null;
    }
  }, [session.activeRound]);

  const shouldShowJoinFocus = initialPath === "leader";

  return (
    <AnimatePresence mode="wait">
      {mode === "home" && (
        <HomeScreen
          isLoading={session.isLoading}
          loadError={session.loadError}
          roomCodeInput={session.roomCodeInput}
          teamCodeInput={session.teamCodeInput}
          setRoomCodeInput={session.setRoomCodeInput}
          setTeamCodeInput={session.setTeamCodeInput}
          joinAsLeader={actions.joinAsLeader}
          createRoom={actions.createRoom}
          shouldShowJoinFocus={shouldShowJoinFocus}
        />
      )}

      {mode === "host" && session.room && (
        <HostScreen
          room={session.room}
          teams={session.teams}
          sortedTeams={sortedTeams}
          activeRound={session.activeRound}
          answerSubmissions={sortedAnswerSubmissions}
          votes={session.votes}
          voteCounts={voteCounts}
          targetTeam={targetTeam}
          rivalTeam={rivalTeam}
          secondsLeft={secondsLeft}
          totalVotes={totalVotes}
          loadError={session.loadError}
          syncState={session.syncState}
          selectedRoundType={selectedRoundType}
          setSelectedRoundType={setSelectedRoundType}
          timerDuration={timerDuration}
          setTimerDuration={setTimerDuration}
          customTimerInput={customTimerInput}
          setCustomTimerInput={setCustomTimerInput}
          soundEnabled={sound.enabled}
          toggleSound={() => sound.setEnabled(!sound.enabled)}
          startRound={actions.startRound}
          beginRound={actions.beginRound}
          lockVotes={actions.lockVotes}
          openScoring={actions.openScoring}
          setRivalTeam={actions.setRivalTeam}
          resolveChallenge={actions.resolveChallenge}
          pendingChallengeAction={actions.pendingChallengeAction}
          applyScore={actions.applyScore}
          completeRound={actions.completeRound}
          undoLastScore={actions.undoLastScore}
          latestScoreEvent={latestScoreEvent}
          scoringTeamIds={actions.scoringTeamIds}
          customScoreInputs={customScoreInputs}
          setCustomScoreInputs={setCustomScoreInputs}
          revealWinner={actions.revealWinner}
          resetGame={actions.resetGame}
          quizActions={quizActions}
          updateTeamContent={actions.updateTeamContent}
          updateRoundContent={actions.updateRoundContent}
          showWinner={showWinner}
          winnerTeam={winnerTeam}
          reducedMotion={Boolean(reducedMotion)}
        />
      )}

      {mode === "leader" && session.room && effectiveLeaderTeam && (
        <LeaderScreen
          room={session.room}
          teams={session.teams}
          leaderTeam={effectiveLeaderTeam}
          activeRound={session.activeRound}
          secondsLeft={secondsLeft}
          leaderVoteTarget={leaderVoteTarget}
          soundEnabled={sound.enabled}
          toggleSound={() => sound.setEnabled(!sound.enabled)}
          submitVote={actions.submitVote}
          submitAnswer={actions.submitAnswer}
          leaderAnswer={leaderAnswer}
          pendingVoteTargetId={actions.pendingVoteTargetId}
          pendingAnswerKey={actions.pendingAnswerKey}
        />
      )}

      {mode === "game" && session.room && (
        <GameScreen
          room={session.room}
          sortedTeams={sortedTeams}
          activeRound={session.activeRound}
          voteCounts={voteCounts}
          targetTeam={targetTeam}
          rivalTeam={rivalTeam}
          secondsLeft={secondsLeft}
          totalVotes={totalVotes}
          answerSubmissions={sortedAnswerSubmissions}
          syncState={session.syncState}
          showWinner={
            showWinner ||
            session.room.status === "winner" ||
            session.activeRound?.status === "winner"
          }
          winnerTeam={winnerTeam}
          reducedMotion={Boolean(reducedMotion)}
        />
      )}

      {mode === "leaderboard" && session.room && (
        <LeaderboardScreen
          room={session.room}
          sortedTeams={sortedTeams}
          syncState={session.syncState}
          showWinner={
            showWinner ||
            session.room.status === "winner" ||
            session.activeRound?.status === "winner"
          }
          winnerTeam={winnerTeam}
          reducedMotion={Boolean(reducedMotion)}
        />
      )}

      {(mode === "game" || mode === "leaderboard") && !session.room && (
        <AudienceLoadingScreen
          label={mode === "game" ? "Projector stage" : "Leaderboard"}
          roomCode={session.roomCodeInput || initialRoomCode}
          loadError={session.loadError}
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

function GameScreen(props: {
  room: Room;
  sortedTeams: Team[];
  activeRound: RoundRecord | null;
  voteCounts: { team: Team; count: number }[];
  targetTeam: Team | null;
  rivalTeam: Team | null;
  secondsLeft: number;
  totalVotes: number;
  answerSubmissions: AnswerSubmission[];
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
          <p className="header-helper">Live game</p>
        </div>
        <GamePhaseTracker room={props.room} activeRound={props.activeRound} showWinner={props.showWinner} />
      </header>

      {props.showWinner && props.winnerTeam ? (
        <Suspense fallback={<section className="projector-stage is-waiting" aria-live="polite">Preparing the final reveal…</section>}>
          <WinnerReveal winner={props.winnerTeam} teams={props.sortedTeams} reducedMotion={props.reducedMotion} />
        </Suspense>
      ) : (
        <ProjectorStage
          room={props.room}
          activeRound={props.activeRound}
          voteCounts={props.voteCounts}
          targetTeam={props.targetTeam}
          rivalTeam={props.rivalTeam}
          secondsLeft={props.secondsLeft}
          totalVotes={props.totalVotes}
          answerSubmissions={props.answerSubmissions}
          sortedTeams={props.sortedTeams}
        />
      )}
    </motion.main>
  );
}

function GamePhaseTracker(props: { room: Room; activeRound: RoundRecord | null; showWinner: boolean }) {
  const currentState = getProjectorState(props.room, props.activeRound, props.showWinner);
  const phases = [
    { label: "Lobby", state: "Waiting for host", icon: Users },
    { label: "Reveal", state: "Round reveal", icon: Eye },
    { label: "Live", state: "Voting open", alternate: "Task live", icon: Radio },
    { label: "Locked", state: "Votes locked", icon: Lock },
    { label: "Scoring", state: "Scoring", icon: ChartNoAxesColumnIncreasing },
    { label: "Leaderboard", state: "Leaderboard", icon: Trophy },
    { label: "Final", state: "Winner reveal", icon: Star },
  ];
  const activeIndex = Math.max(0, phases.findIndex((phase) => phase.state === currentState || phase.alternate === currentState));

  return <div className="game-phase-tracker" aria-label={`Current game phase: ${phases[activeIndex]?.label ?? "Lobby"}`}>{phases.map((phase, index) => { const Icon = phase.icon; return <div key={phase.label} className={`game-phase-step ${index < activeIndex ? "is-complete" : ""} ${index === activeIndex ? "is-current" : ""}`}><Icon size={17} /><span>{phase.label}</span></div>; })}</div>;
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
        <Suspense fallback={<section className="projector-stage is-waiting" aria-live="polite">Preparing the final reveal…</section>}>
          <WinnerReveal winner={props.winnerTeam} teams={props.sortedTeams} reducedMotion={props.reducedMotion} />
        </Suspense>
      ) : (
        <section className="audience-main leaderboard-screen-panel">
          <AnimatedLeaderboard teams={props.sortedTeams} maxScore={maxScore} />
        </section>
      )}
    </motion.main>
  );
}
