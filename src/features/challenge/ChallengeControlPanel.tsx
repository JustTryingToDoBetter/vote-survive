import { ShieldCheck, Swords } from "lucide-react";
import type { RoundRecord, Team } from "../../lib/types";
import {
  describeChallengeScoring,
  getChallengeConfig,
  getEligibleRivals,
  requiresRival,
} from "./challengeEngine";

type ChallengeControlPanelProps = {
  round: RoundRecord;
  teams: Team[];
  targetTeam: Team | null;
  rivalTeam: Team | null;
  pendingAction: string | null;
  setRivalTeam: (teamId: string) => void;
  resolveChallenge: (winnerTeamId: string) => void;
};

export function ChallengeControlPanel(props: ChallengeControlPanelProps) {
  const config = getChallengeConfig(props.round);
  if (!requiresRival(config) || !props.targetTeam) return null;

  const eligibleRivals = getEligibleRivals(props.teams, props.targetTeam.id);
  const resolvedWinner = props.round.challenge_winner_team_id
    ? props.teams.find((team) => team.id === props.round.challenge_winner_team_id) ?? null
    : null;
  const resolved = Boolean(props.round.challenge_resolved_at);
  const canEditRival = !resolved && (props.round.status === "locked" || props.round.status === "scoring");
  const canResolve =
    props.round.status === "scoring" &&
    !resolved &&
    Boolean(props.rivalTeam) &&
    !props.pendingAction;

  return (
    <div className="stage-block">
      <div className="score-panel-top">
        <div>
          <p className="section-kicker">Structured matchup</p>
          <h3>
            {props.targetTeam.name}
            {props.rivalTeam ? ` vs ${props.rivalTeam.name}` : " needs a rival"}
          </h3>
          <p className="muted-text">{config.winCondition}</p>
          <p className="muted-text">
            {config.durationSeconds ? `${config.durationSeconds}s · ` : ""}
            {describeChallengeScoring(config)}
          </p>
        </div>
      </div>

      <label className="admin-editor-row">
        <span>Assigned rival</span>
        <select
          value={props.rivalTeam?.id ?? ""}
          onChange={(event) => props.setRivalTeam(event.target.value)}
          disabled={!canEditRival || Boolean(props.pendingAction)}
        >
          <option value="" disabled>
            Choose rival
          </option>
          {eligibleRivals.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} ({team.score} pts)
            </option>
          ))}
        </select>
      </label>

      {resolved ? (
        <div className="latest-score-strip">
          <strong>
            <ShieldCheck size={16} /> Resolved
          </strong>
          <span>{resolvedWinner?.name ?? "Winner"} recorded as the challenge winner.</span>
        </div>
      ) : props.round.status === "scoring" && props.rivalTeam ? (
        <div className="quiz-command-row">
          <button
            className="primary-btn"
            onClick={() => props.resolveChallenge(props.targetTeam!.id)}
            disabled={!canResolve}
          >
            <Swords size={18} />
            {config.scoringMode === "steal"
              ? `${props.targetTeam.name} wins — execute steal`
              : `${props.targetTeam.name} wins`}
          </button>
          <button
            className="ghost-btn"
            onClick={() => props.resolveChallenge(props.rivalTeam!.id)}
            disabled={!canResolve}
          >
            <ShieldCheck size={18} />
            {config.scoringMode === "steal"
              ? `${props.rivalTeam.name} defends`
              : `${props.rivalTeam.name} wins`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
