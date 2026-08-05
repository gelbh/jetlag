import { describe, expect, it } from "vitest";
import { canOpenMapScreenRoleCodes } from "./canOpenMapScreenRoleCodes";

describe("canOpenMapScreenRoleCodes", () => {
  it("is false without uid", () => {
    expect(
      canOpenMapScreenRoleCodes({
        roleGates: { version: 1, leaders: {} },
        memberRoles: {},
        myUid: null,
        isHost: true,
      }),
    ).toBe(false);
  });

  it("is true when host can see observer codes", () => {
    expect(
      canOpenMapScreenRoleCodes({
        roleGates: { version: 1, leaders: { seeker: "host-1" } },
        memberRoles: { "host-1": "seeker" },
        myUid: "host-1",
        isHost: true,
      }),
    ).toBe(true);
  });

  it("is false when session is not role-gated", () => {
    expect(
      canOpenMapScreenRoleCodes({
        roleGates: null,
        memberRoles: { u1: "seeker" },
        myUid: "u1",
        isHost: false,
      }),
    ).toBe(false);
  });
});
