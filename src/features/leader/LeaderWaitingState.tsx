import { Gamepad2 } from "lucide-react";
import type { Team } from "../../lib/types";
import { TeamAvatar } from "../shared/TeamAvatar";

type LeaderWaitingStateProps = {
  team: Team;
};

export function LeaderWaitingState({ team }: LeaderWaitingStateProps) {
  return (
    <div className="leader-stage waiting-card">
      <TeamAvatar
        emoji={team.avatar_emoji ?? "★"}
        image={team.avatar_image ?? ""}
        name={team.name}
        className="waiting-avatar"
      />
      <Gamepad2 size={40} />
      <h2>You are live</h2>
      <p>Stay ready. Votes, answers, and host prompts will land here.</p>
    </div>
  );
}
