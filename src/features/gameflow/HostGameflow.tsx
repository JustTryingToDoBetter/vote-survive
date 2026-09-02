import { motion } from "framer-motion";
import { Play, RotateCcw, Sparkles, Vote } from "lucide-react";
import type { Room, RoundRecord } from "../../lib/types";
import {
  getHostPhase,
  hostPhaseLabels,
  hostPhaseOrder,
  hostPrimaryActionLabels,
} from "./gamePhases";

type HostGameflowProps = {
  room: Room;
  activeRound: RoundRecord | null;
  showWinner: boolean;
  startRound: () => void;
  beginRound: () => void;
  lockVotes: () => void;
  openScoring: () => void;
  completeRound: () => void;
  revealWinner: () => void;
  resetGame: () => void;
};

export function HostGameflow({
  room,
  activeRound,
  showWinner,
  startRound,
  beginRound,
  lockVotes,
  openScoring,
  completeRound,
  revealWinner,
  resetGame,
}: HostGameflowProps) {
  const phase = getHostPhase(room, activeRound, showWinner);
  const phaseIndex = hostPhaseOrder.indexOf(phase);
  const primaryLabel =
    phase === "lobby"
      ? "Start random"
      : phase === "leaderboard"
      ? activeRound?.is_final
        ? "Reveal Winner"
        : "Start random"
      : phase === "voting"
      ? activeRound?.status === "voting"
        ? "Lock Votes"
        : "Lock Task"
      : phase === "final_reveal"
      ? activeRound?.status === "winner" || room.status === "winner"
        ? "Reset"
        : "View Final Results"
      : hostPrimaryActionLabels[phase];

  function runPrimaryAction() {
    if (phase === "round_reveal") {
      beginRound();
      return;
    }

    if (phase === "voting") {
      lockVotes();
      return;
    }

    if (phase === "locked") {
      openScoring();
      return;
    }

    if (phase === "scoring") {
      completeRound();
      return;
    }

    if (phase === "leaderboard" && activeRound?.is_final) {
      revealWinner();
      return;
    }

    if (phase === "final_reveal") {
      if (activeRound?.status === "winner" || room.status === "winner") {
        resetGame();
        return;
      }
      revealWinner();
      return;
    }

    if (phase === "lobby" || phase === "leaderboard") {
      startRound();
      return;
    }

    startRound();
  }

  return (
    <section className="host-gameflow">
      <div className="host-gameflow-copy">
        <p className="section-kicker">Run of show</p>
        <h2>{hostPhaseLabels[phase]}</h2>
        <span>
          {activeRound
            ? `${activeRound.title} is ${activeRound.status}. Keep the room moving.`
            : "The lobby is open. Start the first live moment when your teams are ready."}
        </span>
      </div>

      <div className="phase-rail" aria-label="Game phase">
        {hostPhaseOrder.map((item, index) => (
          <div
            key={item}
            className={`phase-lane ${index <= phaseIndex ? "is-live" : ""} ${
              item === phase ? "is-current" : ""
            }`}
          >
            <span>{index + 1}</span>
            <b>{hostPhaseLabels[item]}</b>
          </div>
        ))}
      </div>
      <p className="phase-mobile-summary">Step {phaseIndex + 1} of {hostPhaseOrder.length}</p>

      <motion.button
        className="primary-btn host-primary-action"
        onClick={runPrimaryAction}
        whileTap={{ scale: 0.96 }}
      >
        {phase === "voting" ? <Vote size={20} /> : phase === "final_reveal" ? <RotateCcw size={20} /> : <Play size={20} />}
        {primaryLabel}
        <Sparkles size={18} />
      </motion.button>
    </section>
  );
}
