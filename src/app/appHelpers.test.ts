import { describe, expect, it } from "vitest";
import { getRoomCodeFromLocation } from "./appHelpers";

describe("getRoomCodeFromLocation", () => {
  it("supports the existing room query parameter", () => {
    expect(getRoomCodeFromLocation("/game", "?room=n9vvd")).toBe("N9VVD");
  });

  it("supports direct public room links", () => {
    expect(getRoomCodeFromLocation("/game/N9VVD", "")).toBe("N9VVD");
    expect(getRoomCodeFromLocation("/audience/n9vvd", "")).toBe("N9VVD");
    expect(getRoomCodeFromLocation("/leaderboard/N9VVD", "")).toBe("N9VVD");
  });

  it("does not treat unrelated paths as room links", () => {
    expect(getRoomCodeFromLocation("/host/N9VVD", "")).toBe("");
  });
});
