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
  myUid: "uid-1" as string | null,
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
  useSessionStore: (sel: (s: unknown) => unknown) =>
    sel({ session: store.session, myUid: store.myUid }),
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
    store.myUid = "uid-1";
    store.session = {
      id: "sess-remote",
      code: "ABCD",
      hostUid: "other-host",
      memberUids: ["other-host", "uid-1"],
      memberRoles: { "uid-1": "seeker" },
      roleGates: { version: 1, leaders: { seeker: "other-host" } },
    };
  });

  it("opens a member prompt without leaving until confirm", () => {
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    act(() => {
      result.current.requestLeaveAndUpdate();
    });

    expect(result.current.prompt).toEqual({
      title: appUpdateCopy.leaveAndUpdateConfirmTitle,
      body: appUpdateCopy.leaveAndUpdateConfirmMember,
    });
    expect(leaveRemoteSessionOnDevice).not.toHaveBeenCalled();
    expect(exitSession).not.toHaveBeenCalled();
  });

  it("opens a host-alone prompt when the current uid is the only member", () => {
    store.session = {
      id: "sess-host",
      code: "HOST",
      hostUid: "uid-1",
      memberUids: ["uid-1"],
      memberRoles: { "uid-1": "hider" },
    };
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    act(() => {
      result.current.requestLeaveAndUpdate();
    });

    expect(result.current.prompt?.body).toBe(appUpdateCopy.leaveAndUpdateConfirmHostAlone);
  });

  it("opens a host-promote prompt when other members remain", () => {
    store.session = {
      id: "sess-host",
      code: "HOST",
      hostUid: "uid-1",
      memberUids: ["uid-1", "uid-2"],
      memberRoles: { "uid-1": "seeker", "uid-2": "hider" },
    };
    const { result } = renderHook(() => useLeaveSessionAndUpdate());

    act(() => {
      result.current.requestLeaveAndUpdate();
    });

    expect(result.current.prompt?.body).toBe(appUpdateCopy.leaveAndUpdateConfirmHostPromote);
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
    act(() => {
      result.current.requestLeaveAndUpdate();
    });

    await act(async () => {
      await result.current.confirmLeaveAndUpdate();
    });

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

  it("throws when remote leave fails so the sheet can stay open", async () => {
    leaveRemoteSessionOnDevice.mockResolvedValueOnce("failed");
    const { result } = renderHook(() => useLeaveSessionAndUpdate());
    act(() => {
      result.current.requestLeaveAndUpdate();
    });

    await expect(
      act(async () => {
        await result.current.confirmLeaveAndUpdate();
      }),
    ).rejects.toThrow(/couldn't leave/i);

    expect(exitSession).not.toHaveBeenCalled();
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("throws when exitSession rejects", async () => {
    exitSession.mockRejectedValueOnce(new Error("exit failed"));
    const { result } = renderHook(() => useLeaveSessionAndUpdate());
    act(() => {
      result.current.requestLeaveAndUpdate();
    });

    await expect(
      act(async () => {
        await result.current.confirmLeaveAndUpdate();
      }),
    ).rejects.toThrow(/couldn't leave/i);

    expect(captureException).toHaveBeenCalled();
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("dismisses the prompt without leaving", () => {
    const { result } = renderHook(() => useLeaveSessionAndUpdate());
    act(() => {
      result.current.requestLeaveAndUpdate();
    });
    act(() => {
      result.current.dismissLeaveAndUpdatePrompt();
    });

    expect(result.current.prompt).toBeNull();
    expect(leaveRemoteSessionOnDevice).not.toHaveBeenCalled();
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("skips remote leave for local sessions but still exits and applies update", async () => {
    store.session = { id: LOCAL_SESSION_ID, code: "LOCAL" };
    const { result } = renderHook(() => useLeaveSessionAndUpdate());
    act(() => {
      result.current.requestLeaveAndUpdate();
    });
    expect(result.current.prompt?.body).toBe(appUpdateCopy.leaveAndUpdateConfirmMember);

    await act(async () => {
      await result.current.confirmLeaveAndUpdate();
    });

    expect(leaveRemoteSessionOnDevice).not.toHaveBeenCalled();
    expect(listPendingQuestions).not.toHaveBeenCalled();
    expect(exitSession).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "leave", sessionId: LOCAL_SESSION_ID }),
    );
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});
