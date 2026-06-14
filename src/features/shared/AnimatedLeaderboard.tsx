import { motion } from "framer-motion";
import type { Team } from "../../lib/types";
import { TeamAvatar } from "./TeamAvatar";

type AnimatedLeaderboardProps = {
  teams: Team[];
  maxScore: number;
  compact?: boolean;
};

export function AnimatedLeaderboard({
  teams,
  maxScore,
  compact,
}: AnimatedLeaderboardProps) {
  return (
    <div className={compact ? "leaderboard leaderboard-compact" : "leaderboard"}>
      {teams.map((team, index) => {
        const width = `${Math.max(10, (Math.max(0, team.score) / maxScore) * 100)}%`;

        return (
          <motion.div
            key={team.id}
            layout
            className={`leaderboard-row ${index === 0 ? "is-first" : ""}`}
            style={{ "--team-color": team.color ?? "#14b8a6" } as React.CSSProperties}
          >
            <div className="leaderboard-row-top">
              <span className="rank">{index + 1}</span>
              <TeamAvatar
                emoji={team.avatar_emoji ?? "⭐"}
                image={team.avatar_image ?? ""}
                name={team.name}
              />
              <div className="leaderboard-team-copy">
                <strong>{team.name}</strong>
                <span>{team.animal ?? "Team identity"}</span>
              </div>
              <div className="score-cluster">
                <span className="score-number">{team.score}</span>
                <span className="score-label">pts</span>
              </div>
            </div>
            <div className="score-meter">
              <motion.div
                className="score-meter-fill"
                initial={{ width: "10%" }}
                animate={{ width }}
                transition={{ type: "spring", stiffness: 140, damping: 24 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
