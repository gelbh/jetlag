import { describe, expect, it } from "vitest";
import type { AppUpdateContextValue } from "@/components/ui/banners/appUpdateContext";
import { appUpdateCopy, resolveLeaveAndUpdatePrompt } from "./appUpdateCopy";

describe("appUpdateCopy", () => {
  it("uses player-safe deferred wording for map chunk deferral", () => {
    expect(appUpdateCopy.deferredTitle).toBe("Update waiting");
    expect(appUpdateCopy.chunkDeferredBody).toMatch(/game ends/i);
  });

  it("uses refresh wording only for safe reload", () => {
    expect(appUpdateCopy.readyAction).toBe("Refresh now");
    expect(appUpdateCopy.readyTitle).toBe("Update ready");
  });

  it("locks leave-and-refresh Home card copy", () => {
    expect(appUpdateCopy.leaveAndUpdateAction).toBe("Leave & refresh");
    expect(appUpdateCopy.leaveAndUpdateBody).toMatch(/install the new build/i);
    expect(appUpdateCopy.leaveAndUpdateConfirmMember).toMatch(/other players can keep playing/i);
  });
});

describe("resolveLeaveAndUpdatePrompt", () => {
  it("uses member copy for local and non-host remotes", () => {
    expect(
      resolveLeaveAndUpdatePrompt({ isLocalSession: true, isRemoteHost: false, aloneHost: false })
        .body,
    ).toBe(appUpdateCopy.leaveAndUpdateConfirmMember);
    expect(
      resolveLeaveAndUpdatePrompt({ isLocalSession: false, isRemoteHost: false, aloneHost: false })
        .body,
    ).toBe(appUpdateCopy.leaveAndUpdateConfirmMember);
  });

  it("uses alone vs promote copy for hosts", () => {
    expect(
      resolveLeaveAndUpdatePrompt({ isLocalSession: false, isRemoteHost: true, aloneHost: true })
        .body,
    ).toBe(appUpdateCopy.leaveAndUpdateConfirmHostAlone);
    expect(
      resolveLeaveAndUpdatePrompt({ isLocalSession: false, isRemoteHost: true, aloneHost: false })
        .body,
    ).toBe(appUpdateCopy.leaveAndUpdateConfirmHostPromote);
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
