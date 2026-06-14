import { motion } from "framer-motion";
import type { AnswerSubmission, RoundRecord } from "../../lib/types";

type LeaderAnswerPanelProps = {
  round: RoundRecord;
  leaderAnswer: AnswerSubmission | null;
  submitAnswer: (answer: string) => void;
  pendingAnswerKey: string | null;
};

export function LeaderAnswerPanel({
  round,
  leaderAnswer,
  submitAnswer,
  pendingAnswerKey,
}: LeaderAnswerPanelProps) {
  return (
    <>
      <div className="answer-option-grid">
        {(round.answer_options ?? []).map((option) => (
          <motion.button
            key={option}
            className={`answer-option ${leaderAnswer?.answer === option ? "is-selected" : ""}`}
            onClick={() => submitAnswer(option)}
            disabled={Boolean(pendingAnswerKey)}
            whileTap={{ scale: 0.97 }}
          >
            <strong>{option}</strong>
            {leaderAnswer?.answer === option && <span>Locked in</span>}
            {pendingAnswerKey?.endsWith(`:${option}`) && <span>Sending...</span>}
          </motion.button>
        ))}
      </div>

      <div className="leader-bottom-action">
        <strong>{leaderAnswer ? `Answer locked: ${leaderAnswer.answer}` : "Pick your answer"}</strong>
        <span>The host sees answer order and correctness for scoring.</span>
      </div>
    </>
  );
}
