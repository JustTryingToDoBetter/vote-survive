import { motion } from "framer-motion";
import { TimerReset, Volume2, VolumeX } from "lucide-react";
import { roundTypeLabels } from "../../data/gameContent";
import type { AnswerSubmission, Room, RoundRecord, Team } from "../../lib/types";
import { getRoundTimerSeconds } from "../gameflow/gamePhases";
import { QuizLeaderPanel } from "../quiz/QuizLeaderPanel";
import { isRapidQuizRound } from "../quiz/quizEngine";
import { TeamAvatar } from "../shared/TeamAvatar";
import { TimerRing } from "../shared/TimerRing";
import { LeaderAnswerPanel } from "./LeaderAnswerPanel";
import { LeaderVotePanel } from "./LeaderVotePanel";
import { LeaderWaitingState } from "./LeaderWaitingState";

type LeaderScreenProps = {
  room: Room;
  teams: Team[];
  leaderTeam: Team;
  activeRound: RoundRecord | null;
  secondsLeft: number;
  leaderVoteTarget: Team | null;
  leaderAnswer: AnswerSubmission | null;
  soundEnabled: boolean;
  toggleSound: () => void;
  submitVote: (targetTeamId: string) => void;
  submitAnswer: (answer: string) => void;
  pendingVoteTargetId: string | null;
  pendingAnswerKey: string | null;
};

export function LeaderScreen(props: LeaderScreenProps) {
  const isVoteRound =
    props.activeRound?.round_type === "voting" ||
    props.activeRound?.round_type === "steal";
  const voteOpen = Boolean(
    props.activeRound &&
      isVoteRound &&
      props.activeRound.status === "voting"
  );
  const answerOpen = Boolean(
    props.activeRound?.answer_options?.length &&
      props.activeRound.correct_answer &&
      !isRapidQuizRound(props.activeRound)
  );
  const quizOpen = isRapidQuizRound(props.activeRound);

  return (
    <motion.main
      className="leader-shell"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ "--team-color": props.leaderTeam.color ?? "#14b8a6" } as React.CSSProperties}
    >
      <header className="mobile-top leader-identity">
        <TeamAvatar
          emoji={props.leaderTeam.avatar_emoji ?? "★"}
          image={props.leaderTeam.avatar_image ?? ""}
          name={props.leaderTeam.name}
        />
        <div>
          <p className="section-kicker">Room {props.room.code}</p>
          <h1>You are {props.leaderTeam.name}</h1>
          <p className="header-helper">{props.leaderTeam.animal ?? "Team"} leader phone</p>
        </div>

        <div className="header-actions">
          <button className="ghost-btn icon-btn" onClick={props.toggleSound} aria-label="Toggle sound">
            {props.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {(voteOpen || answerOpen || quizOpen) && props.activeRound && (
            <TimerRing
              secondsLeft={props.secondsLeft}
              duration={getRoundTimerSeconds(props.activeRound)}
              compact
            />
          )}
        </div>
      </header>

      {!props.activeRound && <LeaderWaitingState team={props.leaderTeam} />}

      {props.activeRound && (
        <section className="leader-stage leader-vote-card">
          <PlayerTaskPanel
            round={props.activeRound}
            voteOpen={voteOpen}
            answerOpen={answerOpen}
            quizOpen={quizOpen}
            secondsLeft={props.secondsLeft}
          />

          {quizOpen && props.activeRound ? (
            <QuizLeaderPanel
              round={props.activeRound}
              leaderAnswer={props.leaderAnswer}
              pendingAnswerKey={props.pendingAnswerKey}
              submitAnswer={props.submitAnswer}
            />
          ) : answerOpen ? (
            <LeaderAnswerPanel
              round={props.activeRound}
              leaderAnswer={props.leaderAnswer}
              submitAnswer={props.submitAnswer}
              pendingAnswerKey={props.pendingAnswerKey}
            />
          ) : voteOpen ? (
            <LeaderVotePanel
              round={props.activeRound}
              teams={props.teams}
              leaderTeam={props.leaderTeam}
              selectedTarget={props.leaderVoteTarget}
              submitVote={props.submitVote}
              pendingTargetId={props.pendingVoteTargetId}
            />
          ) : (
            <div className="challenge-preview">
              <p className="section-kicker">
                {props.activeRound.status === "scoring" ? "Host scoring" : "Task live"}
              </p>
              <h3>{props.activeRound.challenge}</h3>
              {props.leaderVoteTarget && <p>You voted for {props.leaderVoteTarget.name}.</p>}
            </div>
          )}
        </section>
      )}
    </motion.main>
  );
}

function PlayerTaskPanel({
  round,
  voteOpen,
  answerOpen,
  quizOpen,
  secondsLeft,
}: {
  round: RoundRecord;
  voteOpen: boolean;
  answerOpen?: boolean;
  quizOpen?: boolean;
  secondsLeft: number;
}) {
  return (
    <section className="player-task-panel">
      <div className="round-reveal-top">
        <div>
          <p className="section-kicker">{roundTypeLabels[round.round_type]}</p>
          <h2>{round.title}</h2>
        </div>
        {(voteOpen || answerOpen || quizOpen) && (
          <div className="round-mini-stat">
            <TimerReset size={16} />
            {secondsLeft}s left
          </div>
        )}
      </div>

      <h3>
        {quizOpen
          ? "Rapid-fire quiz"
          : answerOpen
          ? "Choose your answer"
          : voteOpen
          ? round.prompt
          : round.challenge}
      </h3>
      <p>
        {quizOpen
          ? "The next question appears as soon as the host advances."
          : answerOpen
          ? "Answer from your phone. Fastest correct answer can swing the scoring."
          : voteOpen
          ? "Vote for the team you want under pressure. You cannot vote for yourself."
          : round.prompt}
      </p>
      {round.twist && <strong className="player-task-twist">{round.twist}</strong>}
    </section>
  );
}
