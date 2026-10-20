import { describe, expect, it } from "vitest";
import { isCastleSiegeSession, sessionModeOf } from "./mode";

describe("sessionModeOf", () => {
  it("defaults missing mode to classic", () => {
    expect(sessionModeOf({})).toBe("classic");
    expect(sessionModeOf(null)).toBe("classic");
  });
  it("returns castleSiege when set", () => {
    expect(sessionModeOf({ mode: "castleSiege" })).toBe("castleSiege");
  });
});

describe("isCastleSiegeSession", () => {
  it("is true only for castleSiege", () => {
    expect(isCastleSiegeSession({ mode: "castleSiege" })).toBe(true);
    expect(isCastleSiegeSession({})).toBe(false);
  });
});
