import { describe, expect, it } from "vitest";
import { isCastleSiegePlayingRole, resolveCastleSiegeRole } from "./teamRole";

describe("resolveCastleSiegeRole", () => {
  it("returns null when missing", () => {
    expect(resolveCastleSiegeRole(undefined, "u1")).toBeNull();
  });
  it("returns mapped role", () => {
    expect(resolveCastleSiegeRole({ u1: "teamA" }, "u1")).toBe("teamA");
  });
});

describe("isCastleSiegePlayingRole", () => {
  it("teamA/teamB play; referee/observer do not", () => {
    expect(isCastleSiegePlayingRole("teamA")).toBe(true);
    expect(isCastleSiegePlayingRole("referee")).toBe(false);
    expect(isCastleSiegePlayingRole(null)).toBe(false);
  });
});
