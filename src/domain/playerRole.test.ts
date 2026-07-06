import { describe, expect, it } from "vitest";
import {
  isHiderRole,
  isSeekerRole,
  playerRoleLabel,
  resolvePlayerRole,
  sessionHasHiders,
} from "./playerRole";

describe("playerRole", () => {
  it("defaults missing uid or roles to seeker", () => {
    expect(resolvePlayerRole(undefined, "u1")).toBe("seeker");
    expect(resolvePlayerRole(undefined, undefined)).toBe("seeker");
    expect(resolvePlayerRole({}, "u1")).toBe("seeker");
  });

  it("resolves explicit member roles", () => {
    const roles = { u1: "hider" as const, u2: "seeker" as const };
    expect(resolvePlayerRole(roles, "u1")).toBe("hider");
    expect(isHiderRole(roles, "u1")).toBe(true);
    expect(isSeekerRole(roles, "u2")).toBe(true);
    expect(sessionHasHiders(roles)).toBe(true);
    expect(playerRoleLabel("hider")).toBe("Hider");
  });
});
