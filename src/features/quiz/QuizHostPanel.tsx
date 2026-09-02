import { Check, Eye, FastForward, Lock, TimerReset, Trophy } from "lucide-react";
import type { AnswerSubmission, RoundRecord, Team } from "../../lib/types";
import {
  formatQuizCategory,
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
  secondsLeft: number;
  lockQuestion: () => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  endQuizRound: () => void;
  awardQuestionScores: () => void;
  pendingQuizAction: string | null;
};

export function QuizHostPanel(props: QuizHostPanelProps) {
  const question = getCurrentQuestion(props.round);
  const questionIndex = getCurrentQuestionIndex(props.round);
  const answers = getCurrentQuestionAnswers(props.submissions, props.round);
  const fastestCorrect = getFastestCorrect(props.submissions, props.round);
  const correctAnswers = answers.filter((answer) => answer.is_correct);
  const answeredTeamIds = new Set(answers.map((answer) => answer.team_id));
  const waitingTeams = props.teams.filter((team) => !answeredTeamIds.has(team.id));
  const status = props.round.question_status ?? "waiting";
  const scoringPending = props.pendingQuizAction === "score-results";
  const revealed = status === "revealed" || status === "scored";

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
          <p className="muted-text">
            {formatQuizCategory(question.category)} · {question.difficulty ?? "medium"} ·{" "}
            {question.timeLimitSeconds}s
          </p>
          {status === "live" && (
            <div className="round-mini-stat">
              <TimerReset size={16} />
              {props.secondsLeft}s left
            </div>
          )}
        </div>
        <div className="quiz-command-row">
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
            onClick={props.revealAnswer}
            disabled={status !== "locked"}
          >
            <Eye size={18} />
            Reveal Answer
          </button>
          <button
            className="ghost-btn"
            onClick={props.nextQuestion}
            disabled={status !== "scored" || isLastQuizQuestion(props.round)}
          >
            <FastForward size={18} />
            Next Question
          </button>
          <button
            className="ghost-btn"
            onClick={props.endQuizRound}
            disabled={status !== "scored"}
          >
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
            {revealed && fastestCorrect
              ? props.teams.find((team) => team.id === fastestCorrect.team_id)?.name ?? "Team"
              : revealed
              ? "None"
              : "Hidden"}
          </strong>
        </div>
        <div className="status-strip">
          <span>Waiting</span>
          <strong>{waitingTeams.length}</strong>
        </div>
      </div>

      {status === "revealed" && (
        <div className="quiz-command-row">
          <button
            className="primary-btn"
            onClick={props.awardQuestionScores}
            disabled={scoringPending}
          >
            <Trophy size={18} />
            {scoringPending
              ? "Awarding results..."
              : correctAnswers.length === 0
              ? "Record result: no correct answers"
              : "Award results: fastest +10, other correct +5"}
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
              <b>{status === "locked" || revealed ? submission.answer : "Answered"}</b>
              <em>
                {revealed
                  ? submission.is_correct
                    ? "Correct"
                    : "Wrong"
                  : status === "locked"
                  ? "Locked"
                  : "Hidden"}
              </em>
            </div>
          );
        })}
      </div>
    </div>
  );
}
