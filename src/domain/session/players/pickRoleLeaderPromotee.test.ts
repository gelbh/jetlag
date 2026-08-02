import { describe, expect, it } from "vitest";
import { pickRoleLeaderPromotee } from "./pickRoleLeaderPromotee";

describe("pickRoleLeaderPromotee", () => {
  it("returns lexicographically first same-role member", () => {
    expect(
      pickRoleLeaderPromotee(
        ["leader", "b", "a"],
        { leader: "seeker", a: "seeker", b: "seeker" },
        "seeker",
        "leader",
      ),
    ).toBe("a");
  });

  it("returns null when no candidates remain", () => {
    expect(
      pickRoleLeaderPromotee(["solo"], { solo: "hider" }, "hider", "solo"),
    ).toBeNull();
  });

  it("excludes the leaving leader uid", () => {
    expect(
      pickRoleLeaderPromotee(
        ["leader", "other"],
        { leader: "hider", other: "seeker" },
        "hider",
        "leader",
      ),
    ).toBeNull();
  });
});
