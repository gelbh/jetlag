import { describe, expect, it } from "vitest";
import {
  endgameAfterBreach,
  evaluateDeclare,
  normalizeNamedAnchor,
  scoreDuskGuesses,
} from "./declareSiege";

describe("evaluateDeclare", () => {
  it("breaches within tolerance when names match", () => {
    expect(
      evaluateDeclare({
        declaringTeam: "teamA",
        namedAnchor: "  Spire Hall ",
        sealedAnchorName: "Spire Hall",
        distanceMeters: 40,
        breachToleranceMeters: 50,
      }),
    ).toBe("breach");
    expect(
      evaluateDeclare({
        declaringTeam: "teamB",
        namedAnchor: "Spire Hall",
        sealedAnchorName: "Spire Hall",
        distanceMeters: 51,
        breachToleranceMeters: 50,
      }),
    ).toBe("misfire");
  });

  it("misfires on empty or mismatched name", () => {
    expect(
      evaluateDeclare({
        declaringTeam: "teamA",
        namedAnchor: "   ",
        sealedAnchorName: "Spire Hall",
        distanceMeters: 0,
        breachToleranceMeters: 50,
      }),
    ).toBe("misfire");
    expect(
      evaluateDeclare({
        declaringTeam: "teamA",
        namedAnchor: "x",
        sealedAnchorName: "Spire Hall",
        distanceMeters: 0,
        breachToleranceMeters: 50,
      }),
    ).toBe("misfire");
  });
});

describe("scoreDuskGuesses", () => {
  it("awards 15 min head start to the closer team", () => {
    expect(
      scoreDuskGuesses([
        { teamId: "teamA", distanceMeters: 120 },
        { teamId: "teamB", distanceMeters: 80 },
      ]),
    ).toEqual({ kind: "headStart", teamId: "teamB", headStartSeconds: 900 });
  });

  it("ties as Dual Siege", () => {
    expect(
      scoreDuskGuesses([
        { teamId: "teamA", distanceMeters: 50 },
        { teamId: "teamB", distanceMeters: 50 },
      ]),
    ).toEqual({ kind: "dualSiege" });
  });
});

describe("endgameAfterBreach", () => {
  it("arms Last Word on first breach; Dual when the other team also breaches", () => {
    expect(endgameAfterBreach({ alreadyBreachedBy: null, thisBreachBy: "teamA" })).toBe(
      "continueLastWord",
    );
    expect(endgameAfterBreach({ alreadyBreachedBy: "teamA", thisBreachBy: "teamB" })).toBe(
      "dualSiege",
    );
  });
});

describe("normalizeNamedAnchor", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeNamedAnchor("  Old  Bridge  ")).toBe("Old Bridge");
  });
});
