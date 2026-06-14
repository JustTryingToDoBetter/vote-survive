import { motion } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import type React from "react";
import { scorePresets } from "../gameflow/gamePhases";
import { TeamAvatar } from "../shared/TeamAvatar";
import type { RoundRecord, ScoreEvent, Team } from "../../lib/types";

type HostScorePanelProps = {
  activeRound: RoundRecord;
  sortedTeams: Team[];
  latestScoreEvent: ScoreEvent | null;
  scoringTeamIds: Record<string, boolean>;
  customScoreInputs: Record<string, string>;
  setCustomScoreInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyScore: (teamId: string, delta: number, reason: string) => void;
  undoLastScore: () => void;
  completeRound: () => void;
};

export function HostScorePanel(props: HostScorePanelProps) {
  return (
    <section className="host-panel host-score-teams stage-block">
      <div className="score-panel-top">
        <div>
          <p className="section-kicker">Score Teams</p>
          <h2>Score every team fast</h2>
        </div>

        <button
          className="ghost-btn"
          onClick={props.undoLastScore}
          disabled={!props.latestScoreEvent}
        >
          <RotateCcw size={18} />
          Undo last
        </button>
      </div>

      <div className="score-grid">
        {props.sortedTeams.map((team, index) => (
          <ScoreLane
            key={team.id}
            team={team}
            rank={index + 1}
            isPending={Boolean(props.scoringTeamIds[team.id])}
            latestDelta={
              props.latestScoreEvent?.team_id === team.id
                ? props.latestScoreEvent.delta
                : null
            }
            customValue={props.customScoreInputs[team.id] ?? ""}
            onCustomChange={(value) =>
              props.setCustomScoreInputs((current) => ({
                ...current,
                [team.id]: value,
              }))
            }
            onApplyCustom={() => {
              const parsed = Number(props.customScoreInputs[team.id] ?? 0);
              if (Number.isNaN(parsed) || parsed === 0) return;
              void props.applyScore(team.id, parsed, "Custom score");
              props.setCustomScoreInputs((current) => ({
                ...current,
                [team.id]: "",
              }));
            }}
            onPreset={(delta, reason) => void props.applyScore(team.id, delta, reason)}
          />
        ))}
      </div>

      <div className="score-footer">
        <p className="muted-text">
          {props.activeRound.round_type === "final_double"
            ? "Final round scoring is doubled automatically. Every tap hits twice."
            : "Quick scoring keeps the host flow moving fast."}
        </p>
        {props.latestScoreEvent && (
          <div className="latest-score-strip">
            <strong>Latest score</strong>
            <span>
              {props.sortedTeams.find((team) => team.id === props.latestScoreEvent?.team_id)?.name ??
                "Team"}{" "}
              {props.latestScoreEvent.delta > 0 ? "+" : ""}
              {props.latestScoreEvent.delta} for {props.latestScoreEvent.reason}
            </span>
          </div>
        )}
        <button className="primary-btn" onClick={props.completeRound}>
          <Check size={18} />
          {props.activeRound.round_type === "final_double"
            ? "Finish final round"
            : "Complete round"}
        </button>
      </div>
    </section>
  );
}

function ScoreLane(props: {
  team: Team;
  rank: number;
  isPending: boolean;
  latestDelta: number | null;
  customValue: string;
  onCustomChange: (value: string) => void;
  onApplyCustom: () => void;
  onPreset: (delta: number, reason: string) => void;
}) {
  return (
    <div
      className="score-lane"
      style={{ "--team-color": props.team.color ?? "#14b8a6" } as React.CSSProperties}
    >
      <div className="score-lane-top">
        <div className="score-team-wrap">
          <TeamAvatar
            emoji={props.team.avatar_emoji ?? "⭐"}
            image={props.team.avatar_image ?? ""}
            name={props.team.name}
          />
          <div>
            <strong>{props.team.name}</strong>
            <span>
              #{props.rank} • {props.team.score} pts
            </span>
          </div>
        </div>
        {props.latestDelta !== null && (
          <motion.b
            className="score-delta-pop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {props.latestDelta > 0 ? "+" : ""}
            {props.latestDelta}
          </motion.b>
        )}
      </div>

      <div className="score-preset-grid">
        {scorePresets.map((preset) => (
          <button
            key={`${props.team.id}-${preset.label}`}
            className="score-action"
            disabled={props.isPending}
            onClick={() => props.onPreset(preset.delta, preset.reason)}
          >
            {props.isPending ? "Scoring..." : preset.label}
          </button>
        ))}
      </div>

      <div className="custom-score-row">
        <input
          placeholder="Custom"
          inputMode="numeric"
          value={props.customValue}
          onChange={(event) => props.onCustomChange(event.target.value)}
        />
        <button className="ghost-btn" onClick={props.onApplyCustom} disabled={props.isPending}>
          {props.isPending ? "Applying" : "Apply"}
        </button>
      </div>
    </div>
  );
}
