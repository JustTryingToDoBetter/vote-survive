import {
  ArrowDown,
  ArrowUp,
  Eye,
  ListChecks,
  Play,
  Plus,
  SkipForward,
} from "lucide-react";
import { roundTypeLabels } from "../../data/gameContent";
import type { PlannedRound, RoundType } from "../../lib/types";

type HostShowModePanelProps = {
  plannedRounds: PlannedRound[];
  pendingShowAction: string | null;
  canStartPlannedRound: boolean;
  selectedRoundType: RoundType;
  setSelectedRoundType: (value: RoundType) => void;
  addPlannedRound: (roundType: RoundType) => void;
  skipPlannedRound: (itemId?: string) => void;
  movePlannedRound: (itemId: string, direction: -1 | 1) => void;
  startNextPlannedRound: () => void;
};

export function HostShowModePanel(props: HostShowModePanelProps) {
  const nextRound = props.plannedRounds[0] ?? null;
  const isPending = Boolean(props.pendingShowAction);

  return (
    <div className="stage-block host-show-mode">
      <div className="round-toolbar">
        <div>
          <p className="section-kicker">Host Show Mode</p>
          <h2>Plan the run of show</h2>
        </div>

        <div className="round-controls">
          <select
            value={props.selectedRoundType}
            onChange={(event) =>
              props.setSelectedRoundType(event.target.value as RoundType)
            }
          >
            {Object.entries(roundTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            className="ghost-btn"
            onClick={() => props.addPlannedRound(props.selectedRoundType)}
            disabled={isPending}
          >
            <Plus size={18} />
            Add to show
          </button>
        </div>
      </div>

      <div className="show-mode-preview">
        <div className="show-preview-copy">
          <div className="live-signal">
            <Eye size={16} />
            Preview next round
          </div>
          {nextRound ? (
            <>
              <p className="section-kicker">{roundTypeLabels[nextRound.type]}</p>
              <h3>{nextRound.title}</h3>
              <strong>{nextRound.prompt}</strong>
              <span>{nextRound.challenge}</span>
            </>
          ) : (
            <>
              <h3>No planned rounds yet</h3>
              <span>Add a round type to build a simple event queue.</span>
            </>
          )}
        </div>

        <div className="show-mode-actions">
          <button
            className="primary-btn"
            onClick={props.startNextPlannedRound}
            disabled={!props.canStartPlannedRound || isPending}
          >
            <Play size={18} />
            Start next planned round
          </button>
          <button
            className="ghost-btn"
            onClick={() => props.skipPlannedRound()}
            disabled={!nextRound || isPending}
          >
            <SkipForward size={18} />
            Skip next
          </button>
        </div>
      </div>

      <div className="show-queue-list">
        {props.plannedRounds.length === 0 && (
          <div className="show-queue-empty">
            <ListChecks size={20} />
            Queue is empty. Build a planned flow or keep launching rounds manually.
          </div>
        )}

        {props.plannedRounds.map((round, index) => (
          <div className="show-queue-row" key={round.id}>
            <span className="show-queue-number">{index + 1}</span>
            <div>
              <strong>{round.title}</strong>
              <span>{roundTypeLabels[round.type]}</span>
            </div>
            <div className="show-queue-row-actions">
              <button
                className="ghost-btn icon-btn"
                onClick={() => props.movePlannedRound(round.id, -1)}
                disabled={index === 0 || isPending}
                aria-label={`Move ${round.title} up`}
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="ghost-btn icon-btn"
                onClick={() => props.movePlannedRound(round.id, 1)}
                disabled={index === props.plannedRounds.length - 1 || isPending}
                aria-label={`Move ${round.title} down`}
              >
                <ArrowDown size={16} />
              </button>
              <button
                className="ghost-btn"
                onClick={() => props.skipPlannedRound(round.id)}
                disabled={isPending}
              >
                Skip
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
