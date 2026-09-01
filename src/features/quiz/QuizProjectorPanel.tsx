import { motion } from "framer-motion";
import { TimerReset } from "lucide-react";
import type { AnswerSubmission, RoundRecord, Team } from "../../lib/types";
import {
  formatQuizCategory,
  getCurrentQuestion,
  getCurrentQuestionAnswers,
  getCurrentQuestionIndex,
  getFastestCorrect,
} from "./quizEngine";

type QuizProjectorPanelProps = {
  round: RoundRecord;
  teams: Team[];
  submissions: AnswerSubmission[];
  secondsLeft: number;
};

export function QuizProjectorPanel({
  round,
  teams,
  submissions,
  secondsLeft,
}: QuizProjectorPanelProps) {
  const question = getCurrentQuestion(round);
  const questionIndex = getCurrentQuestionIndex(round);
  const answers = getCurrentQuestionAnswers(submissions, round);
  const fastestCorrect = getFastestCorrect(submissions, round);
  const status = round.question_status ?? "waiting";
  const fastestTeam = fastestCorrect
    ? teams.find((team) => team.id === fastestCorrect.team_id)
    : null;
  const revealed = status === "revealed" || status === "scored";

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
        <p className="muted-on-dark">
          {formatQuizCategory(question.category)} · {question.difficulty ?? "medium"}
        </p>
        <h3>{question.prompt}</h3>
        {status === "live" && (
          <div className="round-mini-stat">
            <TimerReset size={18} />
            {secondsLeft}s left
          </div>
        )}
        <div className="quiz-projector-options">
          {question.options.map((option) => (
            <span
              key={option}
              className={revealed && option === round.correct_answer ? "is-correct" : ""}
            >
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
            <strong>{revealed ? fastestTeam?.name ?? "None" : "Hidden"}</strong>
          </div>
        </div>
        {revealed && (
          <div className="latest-score-strip">
            <strong>Correct answer: {round.correct_answer ?? "Unavailable"}</strong>
            <span>Fastest correct earns +10 total. Other correct teams earn +5.</span>
          </div>
        )}
      </motion.div>
    </section>
  );
}
