import { Check, FastForward, Lock, Play, Trophy } from "lucide-react";
import type { AnswerSubmission, RoundRecord, Team } from "../../lib/types";
import {
  getCurrentQuestion,
  getCurrentQuestionAnswers,
  getCurrentQuestionIndex,
  getFastestCorrect,
  isLastQuizQuestion,
} from "./quizEngine";

type QuizHostPanelProps = {
  round: RoundRecord;
  teams: Team[];
  submissions: AnswerSubmission[];
  startQuestion: () => void;
  lockQuestion: () => void;
  nextQuestion: () => void;
  endQuizRound: () => void;
  awardFastestCorrect: () => void;
  awardAllCorrect: () => void;
};

export function QuizHostPanel(props: QuizHostPanelProps) {
  const question = getCurrentQuestion(props.round);
  const questionIndex = getCurrentQuestionIndex(props.round);
  const answers = getCurrentQuestionAnswers(props.submissions, props.round);
  const fastestCorrect = getFastestCorrect(props.submissions, props.round);
  const answeredTeamIds = new Set(answers.map((answer) => answer.team_id));
  const waitingTeams = props.teams.filter((team) => !answeredTeamIds.has(team.id));
  const status = props.round.question_status ?? "waiting";

  if (!question) return null;

  return (
    <div className="stage-block quiz-host-panel">
      <div className="score-panel-top">
        <div>
          <p className="section-kicker">
            Question {questionIndex + 1}/{props.round.question_set?.length ?? 1}
          </p>
          <h2>{question.prompt}</h2>
          <p className="muted-text">Status: {status}</p>
        </div>
        <div className="quiz-command-row">
          <button
            className="primary-btn"
            onClick={props.startQuestion}
            disabled={status === "live"}
          >
            <Play size={18} />
            Start Question
          </button>
          <button
            className="ghost-btn"
            onClick={props.lockQuestion}
            disabled={status !== "live"}
          >
            <Lock size={18} />
            Lock Question
          </button>
          <button
            className="ghost-btn"
            onClick={props.nextQuestion}
            disabled={!isLastQuizQuestion(props.round) ? status === "live" : true}
          >
            <FastForward size={18} />
            Next Question
          </button>
          <button className="ghost-btn" onClick={props.endQuizRound}>
            <Check size={18} />
            End Quiz
          </button>
        </div>
      </div>

      <div className="quiz-answer-grid">
        <div className="status-strip">
          <span>Answered</span>
          <strong>{answers.length}/{props.teams.length}</strong>
        </div>
        <div className="status-strip">
          <span>Fastest correct</span>
          <strong>
            {fastestCorrect
              ? props.teams.find((team) => team.id === fastestCorrect.team_id)?.name ?? "Team"
              : "None yet"}
          </strong>
        </div>
        <div className="status-strip">
          <span>Waiting</span>
          <strong>{waitingTeams.length}</strong>
        </div>
      </div>

      {status === "locked" && (
        <div className="quiz-command-row">
          <button className="primary-btn" onClick={props.awardFastestCorrect} disabled={!fastestCorrect}>
            <Trophy size={18} />
            Award fastest +10
          </button>
          <button className="ghost-btn" onClick={props.awardAllCorrect}>
            Award all correct +5
          </button>
        </div>
      )}

      <div className="answer-race-list">
        {answers.length === 0 && <p className="muted-text">No answers on this question yet.</p>}
        {answers.map((submission, index) => {
          const team = props.teams.find((entry) => entry.id === submission.team_id);
          return (
            <div
              className={`answer-race-row ${submission.is_correct ? "is-correct" : "is-wrong"}`}
              key={submission.id}
            >
              <span>#{index + 1}</span>
              <strong>{team?.name ?? "Team"}</strong>
              <b>{status === "locked" ? submission.answer : "Answered"}</b>
              <em>{status === "locked" ? (submission.is_correct ? "Correct" : "Wrong") : "Hidden"}</em>
            </div>
          );
        })}
      </div>
    </div>
  );
}
