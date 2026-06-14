import { motion } from "framer-motion";
import { Music2, Sparkles, TimerReset, Vote } from "lucide-react";
import { roundTypeLabels } from "../../data/gameContent";
import { TEAM_COLOR_OPTIONS } from "../../data/teamPresets";
import type { Room, RoundRecord, Team } from "../../lib/types";
import {
  getProjectorState,
  getRoundTimerSeconds,
} from "../gameflow/gamePhases";
import { TeamAvatar } from "../shared/TeamAvatar";
import { TimerRing } from "../shared/TimerRing";

type VoteCount = { team: Team; count: number };

type ProjectorStageProps = {
  room: Room;
  activeRound: RoundRecord | null;
  voteCounts: VoteCount[];
  targetTeam: Team | null;
  rivalTeam: Team | null;
  secondsLeft: number;
  totalVotes: number;
};

export function ProjectorStage({
  room,
  activeRound,
  voteCounts,
  targetTeam,
  rivalTeam,
  secondsLeft,
  totalVotes,
}: ProjectorStageProps) {
  const maxVotes = Math.max(1, ...voteCounts.map((entry) => entry.count));
  const stageState = getProjectorState(room, activeRound, false);

  if (!activeRound) {
    return (
      <section className="projector-stage is-waiting">
        <Sparkles size={48} />
        <p className="section-kicker">Waiting for host</p>
        <h2>Room {room.code} is live</h2>
        <p>Round content appears here when the host launches the next moment.</p>
      </section>
    );
  }

  const voting = activeRound.status === "voting";

  return (
    <section className={`projector-stage projector-${activeRound.status}`}>
      <div className="projector-state-strip">
        <span>{stageState}</span>
        <b>{roundTypeLabels[activeRound.round_type]}</b>
      </div>

      <div className="projector-stage-grid">
        <motion.div
          className="projector-main-call"
          key={`${activeRound.id}-${activeRound.status}`}
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 130, damping: 22 }}
        >
          <p className="section-kicker">Round {activeRound.round_number ?? ""}</p>
          <h2>{activeRound.title}</h2>
          <h3>{voting ? activeRound.prompt : activeRound.challenge}</h3>
          {activeRound.twist && <strong>{activeRound.twist}</strong>}
        </motion.div>

        {voting ? (
          <div className="projector-live-rail">
            <motion.div
              className="countdown-pulse"
              animate={{ scale: secondsLeft <= 5 && secondsLeft > 0 ? [1, 1.08, 1] : 1 }}
              transition={{ repeat: secondsLeft <= 5 && secondsLeft > 0 ? Infinity : 0, duration: 0.8 }}
            >
              <TimerRing
                secondsLeft={secondsLeft}
                duration={getRoundTimerSeconds(activeRound)}
              />
            </motion.div>
            <div className="live-pill">
              <Vote size={16} />
              {totalVotes} votes in
            </div>
            <div className="vote-bars">
              {voteCounts.map((entry, index) => (
                <AnimatedVoteBar
                  key={entry.team.id}
                  team={entry.team}
                  count={entry.count}
                  max={maxVotes}
                  index={index}
                />
              ))}
            </div>
          </div>
        ) : (
          <ChallengeRevealCard
            round={activeRound}
            targetTeam={targetTeam}
            rivalTeam={rivalTeam}
          />
        )}
      </div>
    </section>
  );
}

export function AnimatedVoteBar({
  team,
  count,
  max,
  index,
}: {
  team: Team;
  count: number;
  max: number;
  index: number;
}) {
  const width = `${Math.max(6, (count / max) * 100)}%`;

  return (
    <div
      className="vote-bar-wrap"
      style={{ "--team-color": team.color ?? TEAM_COLOR_OPTIONS[index] } as React.CSSProperties}
    >
      <div className="vote-bar-meta">
        <div className="vote-team-meta">
          <TeamAvatar
            emoji={team.avatar_emoji ?? "⭐"}
            image={team.avatar_image ?? ""}
            name={team.name}
          />
          <div>
            <strong>{team.name}</strong>
            <span>{team.animal ?? "Team"}</span>
          </div>
        </div>
        <b>{count}</b>
      </div>
      <div className="vote-bar-track">
        <motion.div
          className="vote-bar-fill"
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>
    </div>
  );
}

export function ChallengeRevealCard({
  round,
  targetTeam,
  rivalTeam,
}: {
  round: RoundRecord;
  targetTeam: Team | null;
  rivalTeam: Team | null;
}) {
  return (
    <motion.div
      className="challenge-reveal"
      initial={{ rotateX: -12, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
    >
      <div className="arena-label">
        <Music2 size={16} />
        {round.round_type === "voting" || round.round_type === "steal"
          ? "Pressure team"
          : "All teams live"}
      </div>
      {targetTeam ? (
        <motion.div
          className="pressure-team-banner"
          initial={{ scale: 0.94 }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.3, repeat: Infinity }}
        >
          <TeamAvatar
            emoji={targetTeam.avatar_emoji ?? "⭐"}
            image={targetTeam.avatar_image ?? ""}
            name={targetTeam.name}
            className="pressure-avatar"
          />
          <div>
            <strong>{targetTeam.name}</strong>
            <span>{targetTeam.animal}</span>
          </div>
        </motion.div>
      ) : (
        <p className="muted-on-dark">
          This round is all-play, so every team is in the spotlight.
        </p>
      )}
      {targetTeam && rivalTeam && (
        <div className="matchup-strip">
          <span>{targetTeam.name}</span>
          <b>vs</b>
          <span>{rivalTeam.name}</span>
        </div>
      )}
      <h3>{round.challenge}</h3>
      <p className="muted-on-dark">{round.prompt}</p>
      {round.status === "locked" && (
        <div className="round-mini-stat">
          <TimerReset size={16} />
          Votes locked
        </div>
      )}
    </motion.div>
  );
}
