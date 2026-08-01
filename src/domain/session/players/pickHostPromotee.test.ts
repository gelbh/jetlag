import { describe, expect, it } from "vitest";
import {
  pickHostPromotee,
  resolveHostUidAfterHeal,
} from "./pickHostPromotee";

describe("pickHostPromotee", () => {
  it("prefers seeker over hider", () => {
    expect(
      pickHostPromotee(
        ["host", "h1", "s1"],
        { host: "seeker", h1: "hider", s1: "seeker" },
        "host",
      ),
    ).toBe("s1");
  });

  it("returns null when alone", () => {
    expect(pickHostPromotee(["host"], { host: "seeker" }, "host")).toBeNull();
  });

  it("lexicographic tie-break among seekers", () => {
    expect(
      pickHostPromotee(
        ["host", "b", "a"],
        { host: "seeker", a: "seeker", b: "seeker" },
        "host",
      ),
    ).toBe("a");
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
