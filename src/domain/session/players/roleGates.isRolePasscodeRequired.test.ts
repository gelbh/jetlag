import { describe, expect, it } from "vitest";
import { createTestRemoteSession } from "@/test/fixtures/sessions";
import { JOIN_PREVIEW_PLACEHOLDER_AREA } from "../join/joinPreviewGameArea";
import { isRolePasscodeRequired } from "./roleGates";

describe("isRolePasscodeRequired", () => {
  it("always requires a code for observers when a preview exists", () => {
    const preview = createTestRemoteSession({ memberRoles: {} });
    expect(isRolePasscodeRequired(preview, "observer", "u1")).toBe(true);
  });

  it("requires a code when the chosen side is known to be occupied", () => {
    const preview = createTestRemoteSession({ memberRoles: { leader: "seeker" } });
    expect(isRolePasscodeRequired(preview, "seeker", "u1")).toBe(true);
  });

  it("does not require a code when occupancy is unknown (permission-denied preview)", () => {
    const preview = createTestRemoteSession({
      gameArea: JOIN_PREVIEW_PLACEHOLDER_AREA,
      memberRoles: {},
    });
    expect(isRolePasscodeRequired(preview, "seeker", "u1")).toBe(false);
  });

  it("does not require a code for a returning member on the same side", () => {
    const preview = createTestRemoteSession({ memberRoles: { u1: "hider", leader: "hider" } });
    expect(isRolePasscodeRequired(preview, "hider", "u1")).toBe(false);
  });

  it("does not require a code without a preview", () => {
    expect(isRolePasscodeRequired(null, "observer", "u1")).toBe(false);
    expect(isRolePasscodeRequired(null, "seeker", "u1")).toBe(false);
  });
});
