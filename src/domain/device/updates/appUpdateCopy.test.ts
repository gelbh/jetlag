import { describe, expect, it } from "vitest";
import type { AppUpdateContextValue } from "@/components/ui/banners/appUpdateContext";
import { appUpdateCopy } from "./appUpdateCopy";

describe("appUpdateCopy", () => {
  it("uses player-safe deferred wording for map chunk deferral", () => {
    expect(appUpdateCopy.deferredTitle).toBe("Update waiting");
    expect(appUpdateCopy.chunkDeferredBody).toMatch(/game ends/i);
  });

  it("uses refresh wording only for safe reload", () => {
    expect(appUpdateCopy.readyAction).toBe("Refresh now");
    expect(appUpdateCopy.readyTitle).toBe("Update ready");
  });

  it("locks leave-and-update Home CTA copy", () => {
    expect(appUpdateCopy.leaveAndUpdateAction).toBe("Leave session & update");
    expect(appUpdateCopy.leaveAndUpdateConfirm).toBe(
      "Leave this session on this device? Other players can keep playing.",
    );
  });
});

describe("AppUpdateContextValue", () => {
  it("includes needsRefresh for Home leave-and-update gating", () => {
    const value: AppUpdateContextValue = {
      needsRefresh: true,
      safeToReload: false,
      showGlobalBanner: false,
      applyUpdate: () => {},
      hotfixGraceActive: false,
      hotfixGraceSecondsRemaining: null,
      hotfixRequiredMinAppVersion: null,
    };
    expect(value.needsRefresh).toBe(true);
  });
});
