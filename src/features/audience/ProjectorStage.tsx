import { motion } from "framer-motion";
import { Check, Lock, Radio, Sparkles, TimerReset, Trophy, Vote } from "lucide-react";
import type React from "react";
import { roundTypeLabels } from "../../data/gameContent";
import { TEAM_COLOR_OPTIONS } from "../../data/teamPresets";
import type { AnswerSubmission, Room, RoundRecord, Team } from "../../lib/types";
import { getProjectorState, getRoundTimerSeconds } from "../gameflow/gamePhases";
import { TeamAvatar } from "../shared/TeamAvatar";
import { TimerRing } from "../shared/TimerRing";
import { getCurrentQuestion, getCurrentQuestionIndex, isRapidQuizRound } from "../quiz/quizEngine";

type VoteCount = { team: Team; count: number };
type ProjectorStageProps = { room: Room; activeRound: RoundRecord | null; voteCounts: VoteCount[]; targetTeam: Team | null; rivalTeam: Team | null; secondsLeft: number; totalVotes: number; answerSubmissions: AnswerSubmission[]; sortedTeams: Team[] };

export function ProjectorStage(props: ProjectorStageProps) {
  const { activeRound } = props;
  if (!activeRound) return <LobbyStage room={props.room} teams={props.sortedTeams} />;
  if (activeRound.status === "complete") return <LeaderboardStage teams={props.sortedTeams} />;
  if (isRapidQuizRound(activeRound) && activeRound.status !== "reveal" && activeRound.status !== "lobby") return <QuizShowStage {...props} round={activeRound} />;
  if (activeRound.status === "reveal" || activeRound.status === "lobby") return <RoundRevealStage round={activeRound} />;
  if (activeRound.status === "locked") return <LockedStage round={activeRound} targetTeam={props.targetTeam} rivalTeam={props.rivalTeam} />;
  if (activeRound.status === "scoring") return <ScoringStage />;
  return <LiveRoundStage {...props} round={activeRound} />;
}

function ShowFrame({ children, state, className = "" }: { children: React.ReactNode; state: string; className?: string }) {
  return <section className={`projector-stage show-stage ${className}`}><div className="show-stage-wing show-stage-wing-left" aria-hidden="true" /><div className="show-stage-wing show-stage-wing-right" aria-hidden="true" /><div className="show-stage-content">{children}</div><p className="show-stage-state">{state}</p></section>;
}

function LobbyStage({ room, teams }: { room: Room; teams: Team[] }) {
  const joined = teams.filter((team) => team.joined_at).length;
  return <ShowFrame state="Waiting for host" className="show-stage-lobby"><motion.div className="show-stage-centered" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}><Radio className="broadcast-mark" size={54} /><p className="show-badge"><Sparkles size={16} /> Waiting for host</p><h2>Room <em>{room.code}</em> is live</h2><p>Teams are joining now.<br />The next round begins soon.</p><span className="ready-count">{joined} / {teams.length} teams ready</span></motion.div></ShowFrame>;
}

function RoundRevealStage({ round }: { round: RoundRecord }) {
  return <ShowFrame state="Round reveal" className="show-stage-reveal"><motion.div className="show-stage-centered round-reveal-show" key={round.id} initial={{ opacity: 0, scale: .96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .35 }}><p className="show-badge"><Sparkles size={16} /> Next round</p><p className="show-round-number">Round {round.round_number ?? ""}</p><h2>{roundTypeLabels[round.round_type]}</h2><h3>{round.title}</h3><p>{round.round_type === "voting" || round.round_type === "steal" ? "Teams choose the pressure matchup." : "All teams are in for this one."}</p></motion.div></ShowFrame>;
}

function LiveRoundStage(props: ProjectorStageProps & { round: RoundRecord }) {
  const { round } = props;
  const voting = round.status === "voting";
  const maxVotes = Math.max(1, ...props.voteCounts.map((entry) => entry.count));
  return <ShowFrame state={getProjectorState(props.room, round, false)} className="show-stage-live"><motion.div className="show-round-heading" key={`${round.id}-${round.status}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28 }}><p className="show-badge"><Radio size={16} /> {voting ? "Voting live" : "Challenge live"}</p><p className="show-round-type">{roundTypeLabels[round.round_type]}</p><h2>{round.title}</h2><p>{voting ? round.prompt : round.challenge}</p></motion.div>{voting ? <div className="show-live-body show-voting-body"><p className="show-question">{round.prompt}</p><div className="show-timer-row"><StageTimer round={round} secondsLeft={props.secondsLeft} /><span><Vote size={18} /> {props.totalVotes} votes in</span></div><div className="show-vote-bars">{props.voteCounts.map((entry, index) => <AnimatedVoteBar key={entry.team.id} team={entry.team} count={entry.count} max={maxVotes} index={index} />)}</div></div> : <div className="show-live-body show-challenge-body"><p className="show-question">{round.challenge}</p>{round.instructions && <p className="show-instructions">{round.instructions}</p>}<Matchup targetTeam={props.targetTeam} rivalTeam={props.rivalTeam} allTeamsText="All teams compete together." />{round.timer_seconds ? <StageTimer round={round} secondsLeft={props.secondsLeft} /> : <p className="show-host-run-note">Host runs this challenge — score it when the result is clear.</p>}</div>}</ShowFrame>;
}

function LockedStage({ round, targetTeam, rivalTeam }: { round: RoundRecord; targetTeam: Team | null; rivalTeam: Team | null }) {
  return <ShowFrame state="Locked" className="show-stage-locked"><motion.div className="show-stage-centered" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }}><p className="show-badge"><Lock size={16} /> Answers locked</p><h2>Time&apos;s up</h2><p>{round.round_type === "voting" || round.round_type === "steal" ? "The matchup is being set." : "Waiting for the host."}</p><Matchup targetTeam={targetTeam} rivalTeam={rivalTeam} allTeamsText={round.challenge} /></motion.div></ShowFrame>;
}

function ScoringStage() { return <ShowFrame state="Scoring" className="show-stage-scoring"><div className="show-stage-centered"><p className="show-badge"><Trophy size={16} /> Scoring</p><h2>Points are being awarded</h2><p>Leaderboard coming up<span className="scoring-dots" aria-hidden="true">...</span></p></div></ShowFrame>; }

function LeaderboardStage({ teams }: { teams: Team[] }) {
  return <ShowFrame state="Leaderboard" className="show-stage-leaderboard"><div className="leaderboard-show-heading"><p className="show-badge"><Trophy size={16} /> Leaderboard</p><h2>Current standings</h2></div><div className="show-leaderboard-list">{teams.map((team, index) => <motion.div className={`show-leaderboard-row ${index === 0 ? "is-leading" : ""}`} key={team.id} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .07 }} style={{ "--team-color": team.color ?? TEAM_COLOR_OPTIONS[index] } as React.CSSProperties}><b>{index + 1}</b><TeamAvatar emoji={team.avatar_emoji ?? "⭐"} image={team.avatar_image ?? ""} name={team.name} /><strong>{team.name}</strong><span>{team.score}</span></motion.div>)}</div></ShowFrame>;
}

function QuizShowStage(props: ProjectorStageProps & { round: RoundRecord }) {
  const question = getCurrentQuestion(props.round);
  const index = getCurrentQuestionIndex(props.round);
  const status = props.round.question_status ?? "waiting";
  if (!question) return <LockedStage round={props.round} targetTeam={null} rivalTeam={null} />;
  const revealed = status === "revealed" || status === "scored";
  const labels = ["A", "B", "C", "D"];
  return <ShowFrame state={status === "live" ? "Question live" : status === "locked" ? "Answers locked" : "Answer reveal"} className={`show-stage-quiz ${revealed ? "is-revealed" : ""}`}><div className="show-round-heading"><p className="show-badge">{status === "live" ? <><Radio size={16} /> Question live</> : <><Lock size={16} /> {status === "locked" ? "Answers locked" : "Correct answer"}</>}</p><p className="show-round-type">{props.round.title}</p><span>Question {index + 1} of {props.round.question_set?.length ?? 1}</span></div><p className="show-question quiz-question">{question.prompt}</p><div className="show-answer-grid">{question.options.map((option, optionIndex) => <div key={option} className={`show-answer-option ${revealed && option === props.round.correct_answer ? "is-correct" : ""}`}><b>{labels[optionIndex] ?? optionIndex + 1}</b><span>{option}</span>{revealed && option === props.round.correct_answer && <Check size={28} />}</div>)}</div>{status === "live" ? <StageTimer round={props.round} secondsLeft={props.secondsLeft} /> : <p className="show-lock-note">{revealed ? `Correct answer: ${props.round.correct_answer ?? ""}` : "Waiting for host"}</p>}</ShowFrame>;
}

function StageTimer({ round, secondsLeft }: { round: RoundRecord; secondsLeft: number }) {
  const duration = getCurrentQuestion(round)?.timeLimitSeconds ?? getRoundTimerSeconds(round);
  return <div className={`show-timer ${secondsLeft <= 10 ? "is-urgent" : ""}`}><TimerRing secondsLeft={secondsLeft} duration={duration} /></div>;
}
function Matchup({ targetTeam, rivalTeam, allTeamsText }: { targetTeam: Team | null; rivalTeam: Team | null; allTeamsText: string }) { if (!targetTeam) return <p className="show-matchup show-all-teams">{allTeamsText}</p>; return <div className="show-matchup"><strong>{targetTeam.name}</strong>{rivalTeam && <><b>vs</b><strong>{rivalTeam.name}</strong></>}</div>; }

export function AnimatedVoteBar({ team, count, max, index }: { team: Team; count: number; max: number; index: number }) {
  const width = `${Math.max(6, (count / max) * 100)}%`;
  return <div className="vote-bar-wrap" style={{ "--team-color": team.color ?? TEAM_COLOR_OPTIONS[index] } as React.CSSProperties}><div className="vote-bar-meta"><div className="vote-team-meta"><TeamAvatar emoji={team.avatar_emoji ?? "⭐"} image={team.avatar_image ?? ""} name={team.name} /><strong>{team.name}</strong></div><b>{count}</b></div><div className="vote-bar-track"><motion.div className="vote-bar-fill" initial={{ width: 0 }} animate={{ width }} transition={{ type: "spring", stiffness: 120, damping: 24 }} /></div></div>;
}

export function ChallengeRevealCard({ round, targetTeam, rivalTeam }: { round: RoundRecord; targetTeam: Team | null; rivalTeam: Team | null }) {
  return <motion.div className="challenge-reveal" initial={{ rotateX: -12, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }}><div className="arena-label">{round.round_type === "voting" || round.round_type === "steal" ? "Pressure team" : "All teams live"}</div><Matchup targetTeam={targetTeam} rivalTeam={rivalTeam} allTeamsText="Every team is in the spotlight." /><h3>{round.challenge}</h3>{round.status === "locked" && <div className="round-mini-stat"><TimerReset size={16} /> Votes locked</div>}</motion.div>;
}
