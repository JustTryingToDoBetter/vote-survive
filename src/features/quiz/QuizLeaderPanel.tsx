import { motion } from "framer-motion";
import { TimerReset } from "lucide-react";
import type { AnswerSubmission, RoundRecord } from "../../lib/types";
import {
  formatQuizCategory,
  getCurrentQuestion,
  getCurrentQuestionIndex,
} from "./quizEngine";

type QuizLeaderPanelProps = {
  round: RoundRecord;
  secondsLeft: number;
  leaderAnswer: AnswerSubmission | null;
  pendingAnswerKey: string | null;
  submitAnswer: (answer: string) => void;
};

export function QuizLeaderPanel({
  round,
  secondsLeft,
  leaderAnswer,
  pendingAnswerKey,
  submitAnswer,
}: QuizLeaderPanelProps) {
  const question = getCurrentQuestion(round);
  const questionIndex = getCurrentQuestionIndex(round);
  const status = round.question_status ?? "waiting";
  const answerLocked = Boolean(leaderAnswer);
  const canAnswer = status === "live" && !answerLocked;
  const revealed = status === "revealed" || status === "scored";

  if (!question) return null;

  return (
    <>
      <section className="player-task-panel">
        <div className="round-reveal-top">
          <div>
            <p className="section-kicker">
              Question {questionIndex + 1}/{round.question_set?.length ?? 1}
            </p>
            <h2>{round.title}</h2>
            <p className="muted-text">
              {formatQuizCategory(question.category)} · {question.difficulty ?? "medium"}
            </p>
          </div>
          <div className="round-mini-stat">
            {status === "live" ? (
              <>
                <TimerReset size={16} />
                {secondsLeft}s
              </>
            ) : (
              status
            )}
          </div>
        </div>
        <h3>{question.prompt}</h3>
        <p>
          {status === "live"
            ? "Tap once. Your answer locks for this question."
            : status === "locked"
            ? "Question locked. Wait for the host to move on."
            : revealed
            ? `Correct answer: ${round.correct_answer ?? "Unavailable"}`
            : "Get ready. The host will start the next question."}
        </p>
      </section>

      <div className="answer-option-grid">
        {question.options.map((option, optionIndex) => {
          const selected = leaderAnswer?.answer === option;
          const pending = pendingAnswerKey === `${round.id}:${questionIndex}:${option}`;
          const correct = revealed && option === round.correct_answer;
          const selectedWrong = revealed && selected && !correct;
          return (
            <motion.button
              key={option}
              className={`answer-option ${selected ? "is-selected" : ""} ${
                correct ? "is-correct" : ""
              } ${selectedWrong ? "is-wrong" : ""}`}
              onClick={() => canAnswer && submitAnswer(option)}
              disabled={!canAnswer || Boolean(pendingAnswerKey)}
              whileTap={{ scale: canAnswer ? 0.97 : 1 }}
            >
              <b className="leader-answer-key" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</b>
              <strong>{option}</strong>
              {selected && !revealed && <span>Locked in</span>}
              {correct && <span>Correct answer</span>}
              {selectedWrong && <span>Your answer</span>}
              {pending && <span>Sending...</span>}
            </motion.button>
          );
        })}
      </div>

      <div className="leader-bottom-action">
        <strong>
          {leaderAnswer
            ? revealed
              ? leaderAnswer.is_correct
                ? `Correct: ${leaderAnswer.answer}`
                : `Your answer: ${leaderAnswer.answer}`
              : `Answer locked: ${leaderAnswer.answer}`
            : status === "live"
            ? "Choose fast"
            : revealed
            ? `Correct answer: ${round.correct_answer ?? "Unavailable"}`
            : "Waiting for host"}
        </strong>
        <span>{revealed ? "Wait for the host to advance." : "One answer per question."}</span>
      </div>
    </>
  );
}
