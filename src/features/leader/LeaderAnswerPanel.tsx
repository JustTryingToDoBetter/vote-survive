import { motion } from "framer-motion";
import type { AnswerSubmission, RoundRecord } from "../../lib/types";

type LeaderAnswerPanelProps = {
  round: RoundRecord;
  leaderAnswer: AnswerSubmission | null;
  submitAnswer: (answer: string) => void;
};

export function LeaderAnswerPanel({
  round,
  leaderAnswer,
  submitAnswer,
}: LeaderAnswerPanelProps) {
  return (
    <>
      <div className="answer-option-grid">
        {(round.answer_options ?? []).map((option) => (
          <motion.button
            key={option}
            className={`answer-option ${leaderAnswer?.answer === option ? "is-selected" : ""}`}
            onClick={() => submitAnswer(option)}
            whileTap={{ scale: 0.97 }}
          >
            <strong>{option}</strong>
            {leaderAnswer?.answer === option && <span>Locked in</span>}
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
