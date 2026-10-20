import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { LOCAL_SESSION_ID } from "@/domain/map/annotations";

const applyUpdate = vi.fn();
const navigate = vi.fn();
const exitSession = vi.fn(async () => undefined);
const leaveSessionMembership = vi.fn(async () => "left" as const);
const clearLiveLocationOnLeave = vi.fn(async () => undefined);
const ensureAnonymousUser = vi.fn(async () => ({ uid: "uid-1" }));
const captureException = vi.fn();
const trackSessionLeaveAlreadyLeft = vi.fn();

const store = vi.hoisted(() => ({
  session: {
    id: "sess-remote",
    code: "ABCD",
    hostUid: "other-host",
    memberRoles: { "uid-1": "seeker" as const },
    roleGates: { version: 1 as const, leaders: { seeker: "other-host" } },
  } as {
    id: string;
    code: string;
    hostUid?: string;
    memberRoles?: Record<string, "seeker" | "hider">;
    roleGates?: { version: 1; leaders: Record<string, string> };
  } | null,
}));

vi.mock("@/hooks/app/useAppUpdateState", () => ({
  useAppUpdateState: () => ({
    needsRefresh: true,
    applyUpdate,
    safeToReload: false,
    showGlobalBanner: false,
    hotfixGraceActive: false,
    hotfixGraceSecondsRemaining: null,
    hotfixRequiredMinAppVersion: null,
  }),
}));

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => navigate,
}));

vi.mock("@/state/sessionStore", () => ({
  useSessionStore: (sel: (s: unknown) => unknown) => sel({ session: store.session }),
}));

vi.mock("@/services/session/sessionExit", () => ({
  exitSession,
}));

vi.mock("@/services/session/rolePasscodeLifecycle", () => ({
  leaveSessionMembership,
}));

vi.mock("@/services/session/clearLiveLocationOnLeave", () => ({
  clearLiveLocationOnLeave,
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  ensureAnonymousUser,
}));

vi.mock("@/services/core/analytics/clientErrors", () => ({
  captureException,
}));

vi.mock("@/services/core/analytics/analytics", () => ({
  trackSessionLeaveAlreadyLeft,
}));

import { useLeaveSessionAndUpdate } from "./useLeaveSessionAndUpdate";

describe("useLeaveSessionAndUpdate", () => {
  beforeEach(() => {
    applyUpdate.mockClear();
    navigate.mockClear();
    exitSession.mockClear();
    leaveSessionMembership.mockClear();
    clearLiveLocationOnLeave.mockClear();
    ensureAnonymousUser.mockClear();
    captureException.mockClear();
    trackSessionLeaveAlreadyLeft.mockClear();
    store.session = {
      id: "sess-remote",
      code: "ABCD",
      hostUid: "other-host",
      memberRoles: { "uid-1": "seeker" },
      roleGates: { version: 1, leaders: { seeker: "other-host" } },
    };
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("confirms, leaves gated membership, clears live location, exits, then applies update", async () => {
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(window.confirm).toHaveBeenCalledWith(appUpdateCopy.leaveAndUpdateConfirm);
    expect(leaveSessionMembership).toHaveBeenCalledWith("sess-remote");
    expect(clearLiveLocationOnLeave).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "sess-remote", uid: "uid-1" }),
    );
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "leave",
        sessionId: "sess-remote",
        navigate,
      }),
    );
    expect(applyUpdate).toHaveBeenCalledTimes(1);
    expect(applyUpdate.mock.invocationCallOrder[0]).toBeGreaterThan(
      exitSession.mock.invocationCallOrder[0]!,
    );
  });

  it("does nothing when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(exitSession).not.toHaveBeenCalled();
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("skips membership leave for local sessions but still exits and applies update", async () => {
    store.session = { id: LOCAL_SESSION_ID, code: "LOCAL" };
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(leaveSessionMembership).not.toHaveBeenCalled();
    expect(clearLiveLocationOnLeave).not.toHaveBeenCalled();
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "leave", sessionId: LOCAL_SESSION_ID }),
    );
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});
