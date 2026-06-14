import { motion } from "framer-motion";
import type { AnswerSubmission, RoundRecord, Team } from "../../lib/types";
import {
  getCurrentQuestion,
  getCurrentQuestionAnswers,
  getCurrentQuestionIndex,
  getFastestCorrect,
} from "./quizEngine";

type QuizProjectorPanelProps = {
  round: RoundRecord;
  teams: Team[];
  submissions: AnswerSubmission[];
};

export function QuizProjectorPanel({ round, teams, submissions }: QuizProjectorPanelProps) {
  const question = getCurrentQuestion(round);
  const questionIndex = getCurrentQuestionIndex(round);
  const answers = getCurrentQuestionAnswers(submissions, round);
  const fastestCorrect = getFastestCorrect(submissions, round);
  const status = round.question_status ?? "waiting";
  const fastestTeam = fastestCorrect
    ? teams.find((team) => team.id === fastestCorrect.team_id)
    : null;

  if (!question) return null;

  return (
    <section className={`projector-stage projector-${round.status}`}>
      <div className="projector-state-strip">
        <span>Rapid quiz</span>
        <b>{status}</b>
      </div>
      <motion.div
        className="projector-main-call quiz-projector"
        key={`${round.id}-${questionIndex}-${status}`}
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 130, damping: 22 }}
      >
        <p className="section-kicker">
          Question {questionIndex + 1}/{round.question_set?.length ?? 1}
        </p>
        <h2>{round.title}</h2>
        <h3>{question.prompt}</h3>
        <div className="quiz-projector-options">
          {question.options.map((option) => (
            <span key={option} className={status === "locked" && option === question.correctAnswer ? "is-correct" : ""}>
              {option}
            </span>
          ))}
        </div>
        <div className="quiz-answer-grid">
          <div className="status-strip">
            <span>Answers in</span>
            <strong>{answers.length}/{teams.length}</strong>
          </div>
          <div className="status-strip">
            <span>Fastest correct</span>
            <strong>{status === "locked" ? fastestTeam?.name ?? "None" : "Hidden"}</strong>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
