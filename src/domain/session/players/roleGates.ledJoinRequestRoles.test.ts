import { describe, expect, it } from "vitest";
import { ledJoinRequestRoles, visibleRoleCodeRoles } from "./roleGates";

describe("ledJoinRequestRoles", () => {
  it("returns led seeker/hider roles and observer for host", () => {
    expect(
      ledJoinRequestRoles({
        roleGates: { version: 1, leaders: { seeker: "u1", hider: "u2" } },
        myUid: "u1",
        isHost: true,
      }),
    ).toEqual(["seeker", "observer"]);

    expect(
      ledJoinRequestRoles({
        roleGates: { version: 1, leaders: { hider: "u2" } },
        myUid: "u2",
        isHost: false,
      }),
    ).toEqual(["hider"]);

    expect(
      ledJoinRequestRoles({
        roleGates: undefined,
        myUid: "u1",
        isHost: true,
      }),
    ).toEqual([]);
  });

  it("returns CS team leaders and host observer/referee when mode is castleSiege", () => {
    expect(
      ledJoinRequestRoles({
        mode: "castleSiege",
        roleGates: { version: 1, leaders: { teamA: "u1", teamB: "u2" } },
        myUid: "u1",
        isHost: false,
      }),
    ).toEqual(["teamA"]);

    expect(
      ledJoinRequestRoles({
        mode: "castleSiege",
        roleGates: { version: 1, leaders: { teamB: "u2" } },
        myUid: "u2",
        isHost: false,
      }),
    ).toEqual(["teamB"]);

    expect(
      ledJoinRequestRoles({
        mode: "castleSiege",
        roleGates: { version: 1, leaders: { teamA: "host" } },
        myUid: "host",
        isHost: true,
      }),
    ).toEqual(["teamA", "observer", "referee"]);
  });
});

describe("visibleRoleCodeRoles", () => {
  it("requires membership on the led side (unlike join-approval roles)", () => {
    expect(
      visibleRoleCodeRoles({
        roleGates: { version: 1, leaders: { seeker: "u1" } },
        memberRoles: { u1: "observer" },
        myUid: "u1",
        isHost: true,
      }),
    ).toEqual(["observer"]);

    expect(
      visibleRoleCodeRoles({
        roleGates: { version: 1, leaders: { seeker: "u1" } },
        memberRoles: { u1: "seeker" },
        myUid: "u1",
        isHost: false,
      }),
    ).toEqual(["seeker"]);

    expect(
      visibleRoleCodeRoles({
        roleGates: { version: 1, leaders: { seeker: "u1" } },
        memberRoles: {},
        myUid: "u1",
        isHost: false,
      }),
    ).toEqual([]);
  });

  it("shows CS seat codes for team leaders and host observer/referee", () => {
    expect(
      visibleRoleCodeRoles({
        mode: "castleSiege",
        roleGates: { version: 1, leaders: { teamA: "u1" } },
        castleSiegeRoles: { u1: "teamA" },
        myUid: "u1",
        isHost: false,
      }),
    ).toEqual(["teamA"]);

    expect(
      visibleRoleCodeRoles({
        mode: "castleSiege",
        roleGates: { version: 1, leaders: { teamA: "host" } },
        castleSiegeRoles: { host: "teamA" },
        myUid: "host",
        isHost: true,
      }),
    ).toEqual(["observer", "referee", "teamA"]);
  });
});
