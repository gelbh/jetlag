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
});
