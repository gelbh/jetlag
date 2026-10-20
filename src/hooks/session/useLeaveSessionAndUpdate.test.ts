import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { LOCAL_SESSION_ID } from "@/domain/map/annotations";

const applyUpdate = vi.fn();
const navigate = vi.fn();
const exitSession = vi.fn(async () => undefined);
const leaveRemoteSessionOnDevice = vi.fn(async (): Promise<"ok" | "failed"> => "ok");
const isAloneHost = vi.fn((session: { hostUid?: string; memberUids?: string[] }) => {
  const hostUid = session.hostUid ?? "";
  return !(session.memberUids ?? []).some((uid) => uid !== hostUid);
});
const listPendingQuestions = vi.fn(async (): Promise<unknown[]> => []);
const ensureAnonymousUser = vi.fn(async () => ({ uid: "uid-1" }));
const captureException = vi.fn();

const store = vi.hoisted(() => ({
  session: {
    id: "sess-remote",
    code: "ABCD",
    hostUid: "other-host",
    memberUids: ["other-host", "uid-1"],
    memberRoles: { "uid-1": "seeker" as const },
    roleGates: { version: 1 as const, leaders: { seeker: "other-host" } },
  } as {
    id: string;
    code: string;
    hostUid?: string;
    memberUids?: string[];
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

vi.mock("@/services/session/leaveRemoteSessionOnDevice", () => ({
  leaveRemoteSessionOnDevice,
  isAloneHost,
}));

vi.mock("@/services/firestore/firestoreSessionExtras", () => ({
  listPendingQuestions,
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  ensureAnonymousUser,
}));

vi.mock("@/services/core/analytics/clientErrors", () => ({
  captureException,
}));

import { useLeaveSessionAndUpdate } from "./useLeaveSessionAndUpdate";

describe("useLeaveSessionAndUpdate", () => {
  beforeEach(() => {
    applyUpdate.mockClear();
    navigate.mockClear();
    exitSession.mockClear();
    leaveRemoteSessionOnDevice.mockClear();
    leaveRemoteSessionOnDevice.mockResolvedValue("ok");
    isAloneHost.mockClear();
    isAloneHost.mockImplementation((session: { hostUid?: string; memberUids?: string[] }) => {
      const hostUid = session.hostUid ?? "";
      return !(session.memberUids ?? []).some((uid) => uid !== hostUid);
    });
    listPendingQuestions.mockClear();
    listPendingQuestions.mockResolvedValue([]);
    ensureAnonymousUser.mockClear();
    ensureAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    captureException.mockClear();
    store.session = {
      id: "sess-remote",
      code: "ABCD",
      hostUid: "other-host",
      memberUids: ["other-host", "uid-1"],
      memberRoles: { "uid-1": "seeker" },
      roleGates: { version: 1, leaders: { seeker: "other-host" } },
    };
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("confirms, leaves remote session, exits, then applies update", async () => {
    const pending = [
      {
        id: "pq-walk",
        sessionId: "sess-remote",
        toolType: "thermometer" as const,
        createdByUid: "uid-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "walking" as const,
        placement: { geometryJson: "{}", metadata: {} },
        replyOptions: [],
        promptText: "walk",
      },
    ];
    listPendingQuestions.mockResolvedValueOnce(pending);

    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(window.confirm).toHaveBeenCalledWith(appUpdateCopy.leaveAndUpdateConfirm);
    expect(listPendingQuestions).toHaveBeenCalledWith("sess-remote");
    expect(leaveRemoteSessionOnDevice).toHaveBeenCalledWith({
      session: store.session,
      uid: "uid-1",
      pendingQuestions: pending,
    });
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

  it("alone host confirms end-and-update, leaves via host path, then applies update", async () => {
    store.session = {
      id: "sess-host",
      code: "HOST",
      hostUid: "uid-1",
      memberUids: ["uid-1"],
      memberRoles: { "uid-1": "hider" },
    };
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/only player.*end this session.*update/i),
    );
    expect(leaveRemoteSessionOnDevice).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "uid-1", session: store.session }),
    );
    expect(exitSession).toHaveBeenCalled();
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it("host with others confirms promote-and-update before leave", async () => {
    store.session = {
      id: "sess-host",
      code: "HOST",
      hostUid: "uid-1",
      memberUids: ["uid-1", "uid-2"],
      memberRoles: { "uid-1": "seeker", "uid-2": "hider" },
    };
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/become host.*Leave and update/i),
    );
    expect(leaveRemoteSessionOnDevice).toHaveBeenCalled();
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not apply update when remote leave fails", async () => {
    leaveRemoteSessionOnDevice.mockResolvedValueOnce("failed");
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(exitSession).not.toHaveBeenCalled();
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("does not apply update when exitSession rejects", async () => {
    exitSession.mockRejectedValueOnce(new Error("exit failed"));
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(captureException).toHaveBeenCalled();
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("does nothing when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(leaveRemoteSessionOnDevice).not.toHaveBeenCalled();
    expect(exitSession).not.toHaveBeenCalled();
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("skips remote leave for local sessions but still exits and applies update", async () => {
    store.session = { id: LOCAL_SESSION_ID, code: "LOCAL" };
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    await act(async () => {
      await result.current.handleLeaveAndUpdate();
    });

    expect(leaveRemoteSessionOnDevice).not.toHaveBeenCalled();
    expect(listPendingQuestions).not.toHaveBeenCalled();
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "leave", sessionId: LOCAL_SESSION_ID }),
    );
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});
