import { describe, expect, it } from "vitest";
import type { CastleSiegeRoles } from "../castleSiege/teamRole";
import {
  buildRoleGatesForCastleSiegeHost,
  countCastleSiegeSeat,
  isCastleSiegeSeatFull,
  joinRequiresCastleSiegePasscode,
} from "./roleGates";

describe("countCastleSiegeSeat", () => {
  it("counts members on a seat", () => {
    const roles: CastleSiegeRoles = {
      u1: "teamA",
      u2: "teamA",
      u3: "teamB",
    };
    expect(countCastleSiegeSeat(roles, "teamA")).toBe(2);
    expect(countCastleSiegeSeat(roles, "teamB")).toBe(1);
    expect(countCastleSiegeSeat(roles, "referee")).toBe(0);
  });

  it("returns 0 when roles map is missing", () => {
    expect(countCastleSiegeSeat(undefined, "teamA")).toBe(0);
  });
});

describe("joinRequiresCastleSiegePasscode", () => {
  it("always requires a code for observer and referee unless returning", () => {
    expect(joinRequiresCastleSiegePasscode({}, "observer", "u1")).toBe(true);
    expect(joinRequiresCastleSiegePasscode(undefined, "referee", "u1")).toBe(true);
    expect(joinRequiresCastleSiegePasscode({ u1: "observer" }, "observer", "u1")).toBe(false);
    expect(joinRequiresCastleSiegePasscode({ u1: "referee" }, "referee", "u1")).toBe(false);
  });

  it("hides passcode for first teamA or teamB joiner when occupancy is known", () => {
    expect(joinRequiresCastleSiegePasscode({}, "teamA", "u1", true)).toBe(false);
    expect(joinRequiresCastleSiegePasscode({ u2: "teamB" }, "teamA", "u1", true)).toBe(false);
  });

  it("requires passcode when the team seat already has a member", () => {
    const roles: CastleSiegeRoles = { host: "teamA" };
    expect(joinRequiresCastleSiegePasscode(roles, "teamA", "u1", true)).toBe(true);
  });

  it("skips passcode when uid already holds that seat", () => {
    expect(joinRequiresCastleSiegePasscode({ u1: "teamA" }, "teamA", "u1", true)).toBe(false);
  });

  it("hides passcode for team seats when occupancy is unknown", () => {
    expect(joinRequiresCastleSiegePasscode({}, "teamA", "u1", false)).toBe(false);
    expect(joinRequiresCastleSiegePasscode({}, "teamB", "u1", false)).toBe(false);
  });

  it("still requires a code for observer and referee when occupancy is unknown", () => {
    expect(joinRequiresCastleSiegePasscode({}, "observer", "u1", false)).toBe(true);
    expect(joinRequiresCastleSiegePasscode({}, "referee", "u1", false)).toBe(true);
  });
});

describe("isCastleSiegeSeatFull", () => {
  const fourOnTeamA: CastleSiegeRoles = {
    a: "teamA",
    b: "teamA",
    c: "teamA",
    d: "teamA",
  };

  it("caps playing teams at four", () => {
    expect(isCastleSiegeSeatFull(fourOnTeamA, "teamA")).toBe(true);
    expect(isCastleSiegeSeatFull(fourOnTeamA, "teamB")).toBe(false);
    expect(isCastleSiegeSeatFull({ ...fourOnTeamA, e: "teamA" }, "teamA")).toBe(true);
  });

  it("allows at most one referee", () => {
    expect(isCastleSiegeSeatFull({ r1: "referee" }, "referee")).toBe(true);
    expect(isCastleSiegeSeatFull({}, "referee")).toBe(false);
  });

  it("never treats observer as full", () => {
    const manyObservers: CastleSiegeRoles = {
      o1: "observer",
      o2: "observer",
      o3: "observer",
    };
    expect(isCastleSiegeSeatFull(manyObservers, "observer")).toBe(false);
  });
});

describe("buildRoleGatesForCastleSiegeHost", () => {
  it("stamps the host as leader of their playing seat", () => {
    expect(buildRoleGatesForCastleSiegeHost("host-1", "teamA")).toEqual({
      version: 1,
      leaders: { teamA: "host-1" },
    });
    expect(buildRoleGatesForCastleSiegeHost("host-2", "teamB")).toEqual({
      version: 1,
      leaders: { teamB: "host-2" },
    });
  });
});
