import { motion } from "framer-motion";
import type { AnswerSubmission, RoundRecord } from "../../lib/types";
import { getCurrentQuestion, getCurrentQuestionIndex } from "./quizEngine";

type QuizLeaderPanelProps = {
  round: RoundRecord;
  leaderAnswer: AnswerSubmission | null;
  pendingAnswerKey: string | null;
  submitAnswer: (answer: string) => void;
};

export function QuizLeaderPanel({
  round,
  leaderAnswer,
  pendingAnswerKey,
  submitAnswer,
}: QuizLeaderPanelProps) {
  const question = getCurrentQuestion(round);
  const questionIndex = getCurrentQuestionIndex(round);
  const status = round.question_status ?? "waiting";
  const answerLocked = Boolean(leaderAnswer);
  const canAnswer = status === "live" && !answerLocked;

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
          </div>
          <div className="round-mini-stat">{status}</div>
        </div>
        <h3>{question.prompt}</h3>
        <p>
          {status === "live"
            ? "Tap once. Your answer locks for this question."
            : status === "locked"
            ? "Question locked. Wait for the host to move on."
            : "Get ready. The host will start the next question."}
        </p>
      </section>

      <div className="answer-option-grid">
        {question.options.map((option) => {
          const selected = leaderAnswer?.answer === option;
          const pending = pendingAnswerKey === `${round.id}:${questionIndex}:${option}`;
          return (
            <motion.button
              key={option}
              className={`answer-option ${selected ? "is-selected" : ""}`}
              onClick={() => canAnswer && submitAnswer(option)}
              disabled={!canAnswer || Boolean(pendingAnswerKey)}
              whileTap={{ scale: canAnswer ? 0.97 : 1 }}
            >
              <strong>{option}</strong>
              {selected && <span>Locked in</span>}
              {pending && <span>Sending...</span>}
            </motion.button>
          );
        })}
      </div>

      <div className="leader-bottom-action">
        <strong>
          {leaderAnswer
            ? `Answer locked: ${leaderAnswer.answer}`
            : status === "live"
            ? "Choose fast"
            : "Waiting for host"}
        </strong>
        <span>Next question appears automatically.</span>
      </div>
    </>
  );
}
