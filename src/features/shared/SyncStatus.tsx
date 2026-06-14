import { TimerReset } from "lucide-react";
import { formatSyncState, type SyncState } from "../gameflow/gamePhases";

type SyncStatusProps = {
  syncState: SyncState;
};

export function SyncStatus({ syncState }: SyncStatusProps) {
  return (
    <div className="sync-status">
      <TimerReset size={16} />
      <span>Sync {formatSyncState(syncState)}</span>
    </div>
  );
}
