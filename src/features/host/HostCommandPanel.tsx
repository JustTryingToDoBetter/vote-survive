import { motion } from "framer-motion";
import { Check, Play, Settings, Sparkles, TimerReset, Trophy, Users, Vote } from "lucide-react";
import type React from "react";
import { roundTypeLabels } from "../../data/gameContent";
import {
  formatSyncState,
  getRoundTimerSeconds,
  type SyncState,
} from "../gameflow/gamePhases";
import { AnimatedVoteBar, ChallengeRevealCard } from "../audience/ProjectorStage";
import { TimerRing } from "../shared/TimerRing";
import type {
  AnswerSubmission,
  RoundDefinition,
  RoundRecord,
  RoundStatus,
  RoundType,
  Team,
} from "../../lib/types";

type HostCommandPanelProps = {
  teams: Team[];
  activeRound: RoundRecord | null;
  answerSubmissions: AnswerSubmission[];
  voteCounts: { team: Team; count: number }[];
  targetTeam: Team | null;
  rivalTeam: Team | null;
  secondsLeft: number;
  totalVotes: number;
  syncState: SyncState;
  selectedRoundType: RoundType;
  setSelectedRoundType: (value: RoundType) => void;
  timerDuration: number;
  setTimerDuration: (value: number) => void;
  customTimerInput: string;
  setCustomTimerInput: (value: string) => void;
  startRound: (type?: RoundType) => void;
  lockVotes: () => void;
  completeRound: () => void;
  applyScore: (teamId: string, delta: number, reason: string) => void;
};

export function HostCommandPanel(props: HostCommandPanelProps) {
  const maxVotes = Math.max(1, ...props.voteCounts.map((entry) => entry.count));
  const joinedTeams = props.teams.filter((team) => team.joined_at).length;
  const votingTeams = Math.max(0, props.teams.length);
  const voteProgress =
    votingTeams > 0 ? Math.round((props.totalVotes / votingTeams) * 100) : 0;
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
    <section className="host-panel host-run-game">
      <div className="dashboard-grid">
        <StatusStrip label="Round status" value={roundStatusLabel} icon={<Settings size={18} />} />
        <StatusStrip label="Joined teams" value={`${joinedTeams}/${props.teams.length} joined`} icon={<Users size={18} />} />
        <StatusStrip label="Voting progress" value={`${voteProgress}%`} icon={<Vote size={18} />} />
        <StatusStrip label="Sync" value={formatSyncState(props.syncState)} icon={<TimerReset size={18} />} />
      </div>

      <div className="stage-block">
        <div className="round-toolbar">
          <div>
            <p className="section-kicker">Run Game</p>
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

      <div className={`stage-block ${props.activeRound?.round_type === "final_double" ? "final-round-card" : ""}`}>
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
              <div className="live-signal">
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

      {props.activeRound &&
        props.activeRound.status !== "complete" &&
        props.activeRound.status !== "winner" && (
          <AnswerRacePanel
            round={props.activeRound}
            submissions={props.answerSubmissions}
            teams={props.teams}
            applyScore={props.applyScore}
          />
        )}
    </section>
  );
}

function StatusStrip(props: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="status-strip">
      <div className="status-strip-icon">{props.icon}</div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
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
    <div className="stage-block answer-race-panel">
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
