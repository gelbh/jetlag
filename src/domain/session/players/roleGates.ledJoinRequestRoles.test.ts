import { describe, expect, it } from "vitest";
import { ledJoinRequestRoles } from "./roleGates";

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
