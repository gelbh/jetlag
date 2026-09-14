import { describe, expect, it } from "vitest";
import { joinRequiresRolePasscode } from "./roleGates";

describe("joinRequiresRolePasscode", () => {
  it("always requires a code for observers", () => {
    expect(joinRequiresRolePasscode({}, "observer", "u1")).toBe(true);
    expect(joinRequiresRolePasscode(undefined, "observer", "u1")).toBe(true);
  });

  it("hides the field when the chosen side is empty and occupancy is known", () => {
    expect(
      joinRequiresRolePasscode({ "host-1": "hider" }, "seeker", "u1", true),
    ).toBe(false);
  });

  it("shows the field when the chosen side already has a member", () => {
    expect(
      joinRequiresRolePasscode({ "host-1": "hider" }, "hider", "u1", true),
    ).toBe(true);
  });

  it("skips the field when the uid already holds that role", () => {
    expect(
      joinRequiresRolePasscode({ u1: "hider" }, "hider", "u1", true),
    ).toBe(false);
  });

  it("keeps collecting when occupancy is unknown (permission-denied preview)", () => {
    expect(joinRequiresRolePasscode({}, "seeker", "u1", false)).toBe(true);
  });
});
