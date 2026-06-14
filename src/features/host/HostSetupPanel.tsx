import { useState } from "react";
import type React from "react";
import { Crown, RotateCcw, Trophy } from "lucide-react";
import { TEAM_COLOR_OPTIONS } from "../../data/teamPresets";
import { AnimatedLeaderboard } from "../shared/AnimatedLeaderboard";
import { TeamAvatar } from "../shared/TeamAvatar";
import type { RoundRecord, Team } from "../../lib/types";

type HostSetupPanelProps = {
  roomCode: string;
  teams: Team[];
  sortedTeams: Team[];
  leaderboardUrl: string;
  revealWinner: () => void;
  resetGame: () => void;
  updateTeamContent: (
    teamId: string,
    patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>
  ) => void;
  activeRound: RoundRecord | null;
  updateRoundContent: (
    roundId: string,
    patch: Partial<
      Pick<
        RoundRecord,
        "title" | "prompt" | "challenge" | "instructions" | "scoring_guide" | "twist"
      >
    >
  ) => void;
};

export function HostSetupPanel(props: HostSetupPanelProps) {
  const maxScore = Math.max(1, ...props.sortedTeams.map((team) => team.score));

  return (
    <aside className="host-panel host-setup-edit">
      <div className="stage-block">
        <div className="panel-topline">
          <div>
            <p className="section-kicker">Setup/Edit</p>
            <h3>Room code</h3>
          </div>
        </div>

        <div className="room-code-panel">
          <strong>{props.roomCode}</strong>
          <p className="muted-text">Leaders can enter mid-game with this room code and their team code.</p>
        </div>

        <div className="team-code-list">
          {props.teams.map((team, index) => (
            <TeamCodeRow key={team.id} team={team} index={index} />
          ))}
        </div>
      </div>

      <div className="stage-block">
        <p className="section-kicker">Show controls</p>
        <div className="mini-leaderboard">
          <AnimatedLeaderboard teams={props.sortedTeams} maxScore={maxScore} compact />
        </div>
        <a className="ghost-btn wide-btn" href={props.leaderboardUrl} target="_blank" rel="noreferrer">
          <Trophy size={18} />
          Show leaderboard
        </a>
        <button className="ghost-btn wide-btn" onClick={props.revealWinner}>
          <Crown size={18} />
          Final reveal
        </button>
        <button className="danger-btn wide-btn" onClick={props.resetGame}>
          <RotateCcw size={18} />
          Reset game
        </button>
      </div>

      <AdminContentEditor
        teams={props.teams}
        activeRound={props.activeRound}
        updateTeamContent={props.updateTeamContent}
        updateRoundContent={props.updateRoundContent}
      />
    </aside>
  );
}

function TeamCodeRow(props: { team: Team; index: number }) {
  return (
    <div
      className="team-code-card"
      style={{ "--team-color": props.team.color ?? TEAM_COLOR_OPTIONS[props.index] } as React.CSSProperties}
    >
      <TeamAvatar
        emoji={props.team.avatar_emoji ?? "⭐"}
        image={props.team.avatar_image ?? ""}
        name={props.team.name}
      />
      <div>
        <strong>{props.team.name}</strong>
        <span>{props.team.leader_code}</span>
      </div>
    </div>
  );
}

function AdminContentEditor(props: {
  teams: Team[];
  activeRound: RoundRecord | null;
  updateTeamContent: (
    teamId: string,
    patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>
  ) => void;
  updateRoundContent: (
    roundId: string,
    patch: Partial<
      Pick<
        RoundRecord,
        "title" | "prompt" | "challenge" | "instructions" | "scoring_guide" | "twist"
      >
    >
  ) => void;
}) {
  return (
    <div className="stage-block admin-editor">
      <div>
        <p className="section-kicker">Content editor</p>
        <h3>Live content</h3>
        <p className="muted-text">
          Edit the active round and team labels without touching code.
        </p>
      </div>

      {props.activeRound ? (
        <AdminRoundEditorRow
          key={props.activeRound.id}
          round={props.activeRound}
          updateRoundContent={props.updateRoundContent}
        />
      ) : (
        <div className="admin-empty-round">
          <strong>No active round yet</strong>
          <span>Start a round, then edit its title, prompt, and challenge here.</span>
        </div>
      )}

      <div className="admin-editor-stack">
        {props.teams.map((team) => (
          <AdminTeamEditorRow
            key={`${team.id}-${team.name}-${team.animal ?? ""}`}
            team={team}
            updateTeamContent={props.updateTeamContent}
          />
        ))}
      </div>
    </div>
  );
}

function AdminTeamEditorRow(props: {
  team: Team;
  updateTeamContent: (
    teamId: string,
    patch: Partial<Pick<Team, "name" | "animal" | "avatar_emoji" | "avatar_image">>
  ) => void;
}) {
  const [name, setName] = useState(props.team.name);
  const [animal, setAnimal] = useState(props.team.animal ?? "");

  return (
    <div className="admin-editor-row">
      <TeamAvatar
        emoji={props.team.avatar_emoji ?? "★"}
        image={props.team.avatar_image ?? ""}
        name={props.team.name}
      />
      <input
        aria-label={`${props.team.name} name`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== props.team.name) {
            props.updateTeamContent(props.team.id, { name: trimmed });
          }
        }}
      />
      <input
        aria-label={`${props.team.name} animal`}
        value={animal}
        onChange={(event) => setAnimal(event.target.value)}
        onBlur={() => {
          const trimmed = animal.trim();
          if (trimmed !== (props.team.animal ?? "")) {
            props.updateTeamContent(props.team.id, { animal: trimmed });
          }
        }}
      />
    </div>
  );
}

function AdminRoundEditorRow(props: {
  round: RoundRecord;
  updateRoundContent: (
    roundId: string,
    patch: Partial<
      Pick<
        RoundRecord,
        "title" | "prompt" | "challenge" | "instructions" | "scoring_guide" | "twist"
      >
    >
  ) => void;
}) {
  const [title, setTitle] = useState(props.round.title);
  const [prompt, setPrompt] = useState(props.round.prompt);
  const [challenge, setChallenge] = useState(props.round.challenge);

  return (
    <div className="admin-round-editor">
      <input
        aria-label="Round title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <textarea
        aria-label="Round prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <textarea
        aria-label="Round challenge"
        value={challenge}
        onChange={(event) => setChallenge(event.target.value)}
      />
      <button
        className="ghost-btn"
        onClick={() =>
          props.updateRoundContent(props.round.id, {
            title: title.trim() || props.round.title,
            prompt: prompt.trim() || props.round.prompt,
            challenge: challenge.trim() || props.round.challenge,
          })
        }
      >
        Save round content
      </button>
    </div>
  );
}
