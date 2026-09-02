import { motion } from "framer-motion";
import { Eye, Sparkles, Trophy, Volume2, VolumeX } from "lucide-react";
import type React from "react";
import { HostGameflow } from "../gameflow/HostGameflow";
import { WinnerReveal } from "../audience/WinnerReveal";
import { HostCommandPanel } from "./HostCommandPanel";
import { HostScorePanel } from "./HostScorePanel";
import { HostSetupPanel } from "./HostSetupPanel";
import type { SyncState } from "../gameflow/gamePhases";
import type {
  AnswerSubmission,
  PlannedRound,
  Room,
  RoundDefinition,
  RoundRecord,
  RoundType,
  ScoreEvent,
  Team,
  VoteRow,
} from "../../lib/types";

export type HostScreenProps = {
  room: Room;
  teams: Team[];
  sortedTeams: Team[];
  activeRound: RoundRecord | null;
  answerSubmissions: AnswerSubmission[];
  votes: VoteRow[];
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
  startRound: (type?: RoundType, definition?: RoundDefinition) => Promise<boolean>;
  beginRound: () => void;
  lockVotes: () => void;
  openScoring: () => void;
  setRivalTeam: (teamId: string) => void;
  resolveChallenge: (winnerTeamId: string) => void;
  pendingChallengeAction: string | null;
  applyScore: (teamId: string, delta: number, reason: string) => void;
  completeRound: () => void;
  undoLastScore: () => void;
  latestScoreEvent: ScoreEvent | null;
  scoringTeamIds: Record<string, boolean>;
  customScoreInputs: Record<string, string>;
  setCustomScoreInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  revealWinner: () => void;
  resetGame: () => void;
  quizActions: {
    pendingQuizAction: string | null;
    startQuestion: () => void;
    lockQuestion: () => void;
    revealAnswer: () => void;
    nextQuestion: () => void;
    endQuizRound: () => void;
    awardQuestionScores: () => void;
  };
  showModeActions: {
    plannedRounds: PlannedRound[];
    pendingShowAction: string | null;
    canStartPlannedRound: boolean;
    addPlannedRound: (roundType: RoundType) => void;
    skipPlannedRound: (itemId?: string) => void;
    movePlannedRound: (itemId: string, direction: -1 | 1) => void;
    startNextPlannedRound: () => void;
  };
  updateTeamContent: (
    teamId: string,
    patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>
  ) => void;
  updateRoundContent: (
    roundId: string,
    patch: Partial<
      Pick<
        RoundRecord,
        "title" | "prompt" | "challenge" | "instructions" | "scoring_guide" | "twist"
      >
    >
  ) => void;
  showWinner: boolean;
  winnerTeam: Team | null;
  reducedMotion: boolean;
};

export function HostScreen(props: HostScreenProps) {
  const gameUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/game?room=${props.room.code}`;
  const leaderboardUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/leaderboard?room=${props.room.code}`;
  const canStartRound =
    !props.activeRound ||
    props.activeRound.status === "complete" ||
    props.activeRound.status === "winner";
  const isScoringRound = props.activeRound?.status === "scoring";

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
            Start random
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
        beginRound={props.beginRound}
        lockVotes={props.lockVotes}
        openScoring={props.openScoring}
        completeRound={props.completeRound}
        revealWinner={props.revealWinner}
        resetGame={props.resetGame}
      />

      <section className="host-grid">
        <div className="host-main-column">
          <HostCommandPanel
            teams={props.teams}
            activeRound={props.activeRound}
            answerSubmissions={props.answerSubmissions}
            votes={props.votes}
            voteCounts={props.voteCounts}
            targetTeam={props.targetTeam}
            rivalTeam={props.rivalTeam}
            secondsLeft={props.secondsLeft}
            totalVotes={props.totalVotes}
            syncState={props.syncState}
            selectedRoundType={props.selectedRoundType}
            setSelectedRoundType={props.setSelectedRoundType}
            timerDuration={props.timerDuration}
            setTimerDuration={props.setTimerDuration}
            customTimerInput={props.customTimerInput}
            setCustomTimerInput={props.setCustomTimerInput}
            startRound={props.startRound}
            lockVotes={props.lockVotes}
            setRivalTeam={props.setRivalTeam}
            resolveChallenge={props.resolveChallenge}
            pendingChallengeAction={props.pendingChallengeAction}
            completeRound={props.completeRound}
            applyScore={props.applyScore}
            quizActions={props.quizActions}
            showModeActions={props.showModeActions}
          />

          {isScoringRound && props.activeRound && (
            <HostScorePanel
              activeRound={props.activeRound}
              sortedTeams={props.sortedTeams}
              latestScoreEvent={props.latestScoreEvent}
              scoringTeamIds={props.scoringTeamIds}
              customScoreInputs={props.customScoreInputs}
              setCustomScoreInputs={props.setCustomScoreInputs}
              applyScore={props.applyScore}
              undoLastScore={props.undoLastScore}
              completeRound={props.completeRound}
            />
          )}

          {(props.showWinner || props.activeRound?.status === "winner") && props.winnerTeam && (
            <WinnerReveal
              winner={props.winnerTeam}
              teams={props.sortedTeams}
              reducedMotion={Boolean(props.reducedMotion)}
            />
          )}
        </div>

        <HostSetupPanel
          roomCode={props.room.code}
          teams={props.teams}
          sortedTeams={props.sortedTeams}
          leaderboardUrl={leaderboardUrl}
          revealWinner={props.revealWinner}
          resetGame={props.resetGame}
          updateTeamContent={props.updateTeamContent}
          activeRound={props.activeRound}
          updateRoundContent={props.updateRoundContent}
        />
      </section>
    </motion.main>
  );
}
