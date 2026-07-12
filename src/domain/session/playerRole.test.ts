import { describe, expect, it } from "vitest";
import {
  isAdminRole,
  isHiderRole,
  isObserverRole,
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

  it("resolves observer role", () => {
    const roles = { u1: "observer" as const };
    expect(resolvePlayerRole(roles, "u1")).toBe("observer");
    expect(isObserverRole(roles, "u1")).toBe(true);
    expect(isSeekerRole(roles, "u1")).toBe(false);
    expect(sessionHasHiders(roles)).toBe(false);
    expect(playerRoleLabel("observer")).toBe("Observer");
  });

  it("resolves admin role", () => {
    const roles = { u1: "admin" as const };
    expect(resolvePlayerRole(roles, "u1")).toBe("admin");
    expect(isAdminRole(roles, "u1")).toBe(true);
    expect(isObserverRole(roles, "u1")).toBe(false);
    expect(playerRoleLabel("admin")).toBe("Admin");
  });
});
