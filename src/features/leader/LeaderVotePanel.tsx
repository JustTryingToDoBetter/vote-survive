import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { RoundRecord, Team } from "../../lib/types";
import { TeamAvatar } from "../shared/TeamAvatar";

type LeaderVotePanelProps = {
  round: RoundRecord;
  teams: Team[];
  leaderTeam: Team;
  selectedTarget: Team | null;
  submitVote: (targetTeamId: string) => void;
  pendingTargetId: string | null;
};

export function LeaderVotePanel({
  round,
  teams,
  leaderTeam,
  selectedTarget,
  submitVote,
  pendingTargetId,
}: LeaderVotePanelProps) {
  return (
    <>
      <div className="vote-tile-grid">
        {teams
          .filter((team) => team.id !== leaderTeam.id)
          .map((team) => {
            const selected = selectedTarget?.id === team.id;
            const pending = pendingTargetId === team.id;

            return (
              <motion.button
                key={team.id}
                className={`vote-tile ${selected ? "is-selected" : ""}`}
                style={{ "--team-color": team.color ?? "#14b8a6" } as React.CSSProperties}
                onClick={() => submitVote(team.id)}
                disabled={Boolean(pendingTargetId)}
                aria-pressed={selected}
                whileTap={{ scale: 0.97 }}
              >
                <TeamAvatar
                  emoji={team.avatar_emoji ?? "⭐"}
                  image={team.avatar_image ?? ""}
                  name={team.name}
                />
                <strong>{team.name}</strong>
                <span>{team.animal ?? "Team"}</span>
                {selected && <b>Selected</b>}
                {pending && <b>Sending...</b>}
              </motion.button>
            );
          })}
      </div>

      {selectedTarget && (
        <div className="submitted-banner">
          <Sparkles size={18} />
          Vote locked — you chose {selectedTarget.name}.
        </div>
      )}

      <div className="leader-bottom-action">
        <strong>{selectedTarget ? "Vote locked" : "Who should your team face?"}</strong>
        <span>{round.prompt}</span>
      </div>
    </>
  );
}
