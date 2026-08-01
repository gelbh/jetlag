import { describe, expect, it } from "vitest";
import {
  buildMemberUidsAfterHeal,
  buildMembershipHealState,
  memberUidSetsEqual,
  resolveHostUidAfterHeal,
  sanitizeReturningMemberUid,
} from "./returningMember";

describe("returningMember", () => {
  it("only honors returning uid when it matches persisted myUid", () => {
    expect(sanitizeReturningMemberUid("uid-old", "uid-old")).toBe("uid-old");
    expect(sanitizeReturningMemberUid("uid-old", "uid-other")).toBeUndefined();
    expect(sanitizeReturningMemberUid(null, "uid-old")).toBeUndefined();
  });

  it("compares member uid sets without order sensitivity", () => {
    expect(memberUidSetsEqual(["b", "a"], ["a", "b"])).toBe(true);
    expect(memberUidSetsEqual(["a"], ["a", "b"])).toBe(false);
  });

  it("removes returning uid when healing membership", () => {
    expect(
      buildMemberUidsAfterHeal(["host", "uid-old"], "uid-new", "uid-old"),
    ).toEqual(["host", "uid-new"]);
  });
});

describe("resolveHostUidAfterHeal", () => {
  it("transfers host to first seeker when heal removes the host uid", () => {
    expect(
      resolveHostUidAfterHeal({
        currentHostUid: "host-old",
        memberUidsAfterHeal: ["uid-new", "s1", "h1"],
        memberRolesAfterHeal: {
          "uid-new": "seeker",
          s1: "seeker",
          h1: "hider",
        },
        removedUid: "host-old",
      }),
    ).toBe("s1");
  });

  it("leaves hostUid unchanged when a non-host uid is healed", () => {
    expect(
      resolveHostUidAfterHeal({
        currentHostUid: "host",
        memberUidsAfterHeal: ["host", "uid-new"],
        memberRolesAfterHeal: { host: "seeker", "uid-new": "hider" },
        removedUid: "uid-old",
      }),
    ).toBeNull();
  });

  it("leaves hostUid unchanged when heal does not remove anyone", () => {
    expect(
      resolveHostUidAfterHeal({
        currentHostUid: "host",
        memberUidsAfterHeal: ["host", "guest"],
        memberRolesAfterHeal: { host: "seeker", guest: "seeker" },
        removedUid: undefined,
      }),
    ).toBeNull();
  });

  it("returns null when host was removed but no promotee remains", () => {
    expect(
      resolveHostUidAfterHeal({
        currentHostUid: "host-old",
        memberUidsAfterHeal: [],
        memberRolesAfterHeal: {},
        removedUid: "host-old",
      }),
    ).toBeNull();
  });
});

describe("buildMembershipHealState", () => {
  it("includes hostUid transfer when heal removes the host", () => {
    const state = buildMembershipHealState({
      existingMemberUids: ["host-old", "s1"],
      existingRoles: { "host-old": "seeker", s1: "seeker" },
      existingAppVersions: { "host-old": "0.10.8", s1: "0.10.8" },
      uid: "uid-new",
      role: "seeker",
      clientVersion: "0.10.8",
      returningMemberUid: "host-old",
      currentHostUid: "host-old",
    });

    expect(state.memberUids).toEqual(["s1", "uid-new"]);
    expect(state.nextHostUid).toBe("s1");
    expect(state.hostUid).toBe("s1");
    expect(state.memberRoles["host-old"]).toBeUndefined();
  });

  it("does not transfer host when a non-host uid is healed", () => {
    const state = buildMembershipHealState({
      existingMemberUids: ["host", "uid-old"],
      existingRoles: { host: "seeker", "uid-old": "hider" },
      existingAppVersions: { host: "0.10.8", "uid-old": "0.10.8" },
      uid: "uid-new",
      role: "hider",
      clientVersion: "0.10.8",
      returningMemberUid: "uid-old",
      currentHostUid: "host",
    });

    expect(state.nextHostUid).toBeNull();
    expect(state.hostUid).toBe("host");
    expect(state.memberUids).toEqual(["host", "uid-new"]);
  });
});
