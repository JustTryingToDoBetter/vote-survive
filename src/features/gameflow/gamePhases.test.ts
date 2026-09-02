import { describe, expect, it } from "vitest";
import type { Room, RoundRecord, RoundStatus } from "../../lib/types";
import { getHostPhase, getProjectorState } from "./gamePhases";

function room(status = "active"): Room {
  return {
    id: "room-1",
    code: "ABC123",
    status,
  };
}

function round(status: RoundStatus): RoundRecord {
  return {
    id: "round-1",
    room_id: "room-1",
    round_type: "voting",
    title: "Round",
    prompt: "Prompt",
    challenge: "Challenge",
    scoring_guide: "Scoring",
    status,
    target_team_id: null,
    created_at: "2026-09-01T00:00:00.000Z",
  };
}

describe("gamePhases", () => {
  it("maps the full host lifecycle", () => {
    expect(getHostPhase(room(), null, false)).toBe("lobby");
    expect(getHostPhase(room(), round("reveal"), false)).toBe("round_reveal");
    expect(getHostPhase(room(), round("voting"), false)).toBe("voting");
    expect(getHostPhase(room(), round("live"), false)).toBe("voting");
    expect(getHostPhase(room(), round("locked"), false)).toBe("locked");
    expect(getHostPhase(room(), round("scoring"), false)).toBe("scoring");
    expect(getHostPhase(room(), round("complete"), false)).toBe("leaderboard");
  });

  it("lets room winner state override a completed round", () => {
    expect(getHostPhase(room("winner"), round("complete"), false)).toBe("final_reveal");
  });

  it("lets explicit winner reveal override room and round state", () => {
    expect(getHostPhase(room(), round("scoring"), true)).toBe("final_reveal");
  });

  it("maps projector states for reconnect-safe persisted statuses", () => {
    expect(getProjectorState(room(), null, false)).toBe("Waiting for host");
    expect(getProjectorState(room(), round("reveal"), false)).toBe("Round reveal");
    expect(getProjectorState(room(), round("voting"), false)).toBe("Voting open");
    expect(getProjectorState(room(), round("live"), false)).toBe("Task live");
    expect(getProjectorState(room(), round("locked"), false)).toBe("Votes locked");
    expect(getProjectorState(room(), round("scoring"), false)).toBe("Showdown live");
    expect(
      getProjectorState(
        room(),
        { ...round("scoring"), challenge_resolved_at: "2026-09-01T00:01:00.000Z" },
        false
      )
    ).toBe("Scoring");
    expect(getProjectorState(room(), round("complete"), false)).toBe("Leaderboard");
    expect(getProjectorState(room("winner"), round("complete"), false)).toBe(
      "Winner reveal"
    );
  });
});
