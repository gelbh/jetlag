import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JOIN_PREVIEW_PLACEHOLDER_AREA } from "@/domain/session/join/joinPreviewGameArea";
import type { JoinSessionFormValues } from "@/domain/session/join/joinSessionForm";
import { createTestRemoteSession } from "@/test/fixtures/sessions";

const navigate = vi.fn();
const setSession = vi.fn();
const mockIsFirebaseConfigured = vi.fn(() => true);
const mockEnsureFreshAnonymousUser = vi.fn(async () => ({ uid: "u1" }));
const mockJoinRemoteSessionByCode = vi.fn();
const mockRequestRoleJoin = vi.fn();
const mockCancelRoleJoinRequest = vi.fn();
const mockListenOwnJoinRequest = vi.fn(() => () => undefined);
const mockTrack = vi.fn();
const mockUseJoinSessionPreview = vi.fn(() => ({
  previewSession: null,
  previewPremium: false,
  lookupLoading: false,
  existingRole: null,
}));

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => navigate,
}));

vi.mock("@/state/sessionStore", () => ({
  useSessionStore: (sel: (s: unknown) => unknown) =>
    sel({
      session: null,
      myUid: null,
      setSession,
    }),
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => mockIsFirebaseConfigured(),
  ensureFreshAnonymousUser: (...args: unknown[]) => mockEnsureFreshAnonymousUser(...(args as [])),
}));

vi.mock("@/services/firestore/firestoreAnnotations", () => ({
  joinRemoteSessionByCode: (...args: unknown[]) => mockJoinRemoteSessionByCode(...(args as [])),
  waitForServerHiderRole: vi.fn(),
  getRemoteSessionByIdFromServer: vi.fn(),
  lookupRemoteSessionByCode: vi.fn(),
}));

vi.mock("@/hooks/session/useJoinSessionPreview", () => ({
  useJoinSessionPreview: (...args: unknown[]) => mockUseJoinSessionPreview(...(args as [])),
}));

vi.mock("@/services/session/rolePasscodeLifecycle", async () => {
  const actual = await vi.importActual<typeof import("@/services/session/rolePasscodeLifecycle")>(
    "@/services/session/rolePasscodeLifecycle",
  );
  return {
    ...actual,
    requestRoleJoin: (...args: unknown[]) => mockRequestRoleJoin(...(args as [])),
    cancelRoleJoinRequest: (...args: unknown[]) => mockCancelRoleJoinRequest(...(args as [])),
  };
});

vi.mock("@/services/session/joinRequestListen", () => ({
  listenOwnJoinRequest: (...args: unknown[]) => mockListenOwnJoinRequest(...(args as [])),
}));

const mockCopyToClipboard = vi.fn(async () => true);

vi.mock("@/platform/copyToClipboard", () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...(args as [])),
}));

vi.mock("@/services/core/analytics/analytics", () => ({
  ANALYTICS_EVENTS: { session_joined: "session_joined", join_failed: "join_failed" },
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock("@/services/core/auth/premiumApiContext", () => ({
  setPremiumApiContext: vi.fn(),
}));

vi.mock("@/services/session/gameAreaPreload", () => ({
  preloadCriticalGameAreaCaches: vi.fn(),
}));

vi.mock("@/services/geo/matching/resolveSessionMatchingAreas", () => ({
  resolveSessionMatchingAreas: vi.fn(async () => []),
}));

import { useJoinSession } from "./useJoinSession";

const joinValues: JoinSessionFormValues = {
  code: "ABCD",
  playerRole: "seeker",
  rolePasscode: "",
};

describe("useJoinSession", () => {
  beforeEach(() => {
    navigate.mockClear();
    setSession.mockClear();
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockEnsureFreshAnonymousUser.mockResolvedValue({ uid: "u1" });
    mockJoinRemoteSessionByCode.mockReset();
    mockRequestRoleJoin.mockReset();
    mockCancelRoleJoinRequest.mockReset();
    mockTrack.mockClear();
    mockListenOwnJoinRequest.mockClear();
    mockListenOwnJoinRequest.mockReturnValue(() => undefined);
    mockUseJoinSessionPreview.mockReturnValue({
      previewSession: null,
      previewPremium: false,
      lookupLoading: false,
      existingRole: null,
    });
  });

  it("joins a remote session and navigates to map", async () => {
    const session = createTestRemoteSession({ code: "ABCD" });
    mockJoinRemoteSessionByCode.mockResolvedValue({
      status: "joined",
      session,
    });

    const { result } = renderHook(() =>
      useJoinSession({
        code: "ABCD",
        playerRole: "seeker",
        rolePasscode: "",
      }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(setSession).toHaveBeenCalledWith(session, "u1");
      expect(navigate).toHaveBeenCalledWith("/map");
    });
    expect(result.current.error).toBeNull();
  });

  it("sets error when firebase is not configured", async () => {
    mockIsFirebaseConfigured.mockReturnValue(false);

    const { result } = renderHook(() =>
      useJoinSession({
        code: "ABCD",
        playerRole: "seeker",
        rolePasscode: "",
      }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(result.current.error).toMatch(/firebase is not configured/i);
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("join_failed", {
      role: "seeker",
      reason: "other",
    });
  });

  it("does not track join_failed on a successful join", async () => {
    mockJoinRemoteSessionByCode.mockResolvedValue({
      status: "joined",
      session: createTestRemoteSession({ code: "ABCD" }),
    });

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/map");
    });
    expect(mockTrack).not.toHaveBeenCalledWith("join_failed", expect.anything());
  });

  describe("when verification outlives the client timeout", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("emits one join_failed with reason timeout and ignores the late missing result", async () => {
      vi.useFakeTimers();
      let resolveJoin!: (value: { status: "missing" }) => void;
      mockJoinRemoteSessionByCode.mockReturnValue(
        new Promise<{ status: "missing" }>((resolve) => {
          resolveJoin = resolve;
        }),
      );

      const { result } = renderHook(() =>
        useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
      );

      await act(async () => {
        result.current.runJoin(joinValues);
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(result.current.error).toBe(
        "Couldn't verify the session. Check your connection and try again.",
      );
      expect(mockTrack).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith("join_failed", {
        role: "seeker",
        reason: "timeout",
      });

      await act(async () => {
        resolveJoin({ status: "missing" });
        await vi.advanceTimersByTimeAsync(0);
      });

      // The late failure's specific copy replaces the timeout copy; tracking stays at one event.
      expect(mockTrack).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBe("No session found for that code.");
      expect(navigate).not.toHaveBeenCalled();
    });

    it("ignores a late success from a superseded attempt when a newer submit has settled", async () => {
      vi.useFakeTimers();
      const session = createTestRemoteSession({ code: "ABCD" });
      let resolveFirst!: (value: { status: "joined"; session: typeof session }) => void;
      mockJoinRemoteSessionByCode
        .mockReturnValueOnce(
          new Promise<{ status: "joined"; session: typeof session }>((resolve) => {
            resolveFirst = resolve;
          }),
        )
        .mockResolvedValueOnce({ status: "missing" });

      const { result } = renderHook(() =>
        useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
      );

      await act(async () => {
        result.current.runJoin(joinValues);
        await vi.advanceTimersByTimeAsync(15_000);
      });

      await act(async () => {
        result.current.runJoin(joinValues);
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.error).toBe("No session found for that code.");

      await act(async () => {
        resolveFirst({ status: "joined", session });
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(setSession).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(result.current.error).toBe("No session found for that code.");
      expect(mockTrack.mock.calls.filter(([event]) => event === "join_failed")).toEqual([
        ["join_failed", { role: "seeker", reason: "timeout" }],
        ["join_failed", { role: "seeker", reason: "session_missing" }],
      ]);
    });

    it("does not show the timeout copy when the timer fires during enterJoinedSession", async () => {
      vi.useFakeTimers();
      const session = createTestRemoteSession({ code: "ABCD" });
      mockJoinRemoteSessionByCode.mockResolvedValue({
        status: "joined",
        session,
        rolePasscode: "9999",
      });
      let resolveCopy!: (value: boolean) => void;
      mockCopyToClipboard.mockReturnValueOnce(
        new Promise<boolean>((resolve) => {
          resolveCopy = resolve;
        }),
      );
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

      const { result } = renderHook(() =>
        useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
      );

      await act(async () => {
        result.current.runJoin(joinValues);
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(result.current.error).toBeNull();
      expect(mockTrack.mock.calls.filter(([event]) => event === "join_failed")).toEqual([]);

      await act(async () => {
        resolveCopy(true);
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(setSession).toHaveBeenCalledWith(session, "u1");
      expect(navigate).toHaveBeenCalledWith("/map");
      expect(result.current.error).toBeNull();
      expect(mockTrack.mock.calls.filter(([event]) => event === "join_failed")).toEqual([]);
      alertSpy.mockRestore();
    });

    it("enters the joined session when the late join succeeds, clearing the timeout error", async () => {
      vi.useFakeTimers();
      const session = createTestRemoteSession({ code: "ABCD" });
      let resolveJoin!: (value: { status: "joined"; session: typeof session }) => void;
      mockJoinRemoteSessionByCode.mockReturnValue(
        new Promise<{ status: "joined"; session: typeof session }>((resolve) => {
          resolveJoin = resolve;
        }),
      );

      const { result } = renderHook(() =>
        useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
      );

      await act(async () => {
        result.current.runJoin(joinValues);
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(result.current.error).toBe(
        "Couldn't verify the session. Check your connection and try again.",
      );

      await act(async () => {
        resolveJoin({ status: "joined", session });
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(setSession).toHaveBeenCalledWith(session, "u1");
      expect(navigate).toHaveBeenCalledWith("/map");
      expect(result.current.error).toBeNull();
      expect(mockTrack.mock.calls.filter(([event]) => event === "join_failed")).toEqual([
        ["join_failed", { role: "seeker", reason: "timeout" }],
      ]);
    });
  });

  it("shows an error thrown after a successful join is claimed, without tracking join_failed", async () => {
    mockJoinRemoteSessionByCode.mockResolvedValue({
      status: "joined",
      session: createTestRemoteSession({ code: "ABCD" }),
    });
    setSession.mockImplementationOnce(() => {
      throw new Error("Couldn't save the session locally.");
    });

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Couldn't save the session locally.");
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalledWith("join_failed", expect.anything());
  });

  it("tracks join_failed with reason other when the hider role is not confirmed", async () => {
    mockJoinRemoteSessionByCode.mockResolvedValue({
      status: "joined",
      session: createTestRemoteSession({ code: "ABCD" }),
    });

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "hider", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin({ ...joinValues, playerRole: "hider" });
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        "Couldn't confirm your hider role. Wait a moment and try again.",
      );
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("join_failed", {
      role: "hider",
      reason: "other",
    });
  });

  it("requests access then cancels pending request", async () => {
    const session = createTestRemoteSession({
      code: "ABCD",
      id: "sess-1",
      memberRoles: { leader: "seeker" },
    });
    mockUseJoinSessionPreview.mockReturnValue({
      previewSession: session,
      previewPremium: false,
      lookupLoading: false,
      existingRole: null,
    } as never);
    mockRequestRoleJoin.mockResolvedValue({
      requestId: "req-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    mockCancelRoleJoinRequest.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useJoinSession({
        code: "ABCD",
        playerRole: "seeker",
        rolePasscode: "",
      }),
    );

    expect(result.current.canRequestAccess).toBe(true);

    await act(async () => {
      result.current.handleRequestAccess();
    });

    await waitFor(() => {
      expect(result.current.pendingRequest).toEqual(
        expect.objectContaining({
          requestId: "req-1",
          sessionId: "sess-1",
          role: "seeker",
        }),
      );
    });

    await act(async () => {
      result.current.handleCancelRequest();
    });

    await waitFor(() => {
      expect(mockCancelRoleJoinRequest).toHaveBeenCalledWith("sess-1", "req-1");
      expect(result.current.pendingRequest).toBeNull();
      expect(result.current.error).toBe("Join request cancelled.");
    });
  });

  it("blocks a blank role code when the chosen side is occupied", async () => {
    mockUseJoinSessionPreview.mockReturnValue({
      previewSession: createTestRemoteSession({
        code: "ABCD",
        id: "sess-1",
        memberRoles: { leader: "seeker" },
      }),
      previewPremium: false,
      lookupLoading: false,
      existingRole: null,
    } as never);
    mockJoinRemoteSessionByCode.mockResolvedValue({
      status: "joined",
      session: createTestRemoteSession({ code: "ABCD" }),
    });

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Enter the role code for that side.");
    });
    expect(mockJoinRemoteSessionByCode).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("lets a blank role code through when occupancy is unknown", async () => {
    const session = createTestRemoteSession({ code: "ABCD" });
    mockUseJoinSessionPreview.mockReturnValue({
      previewSession: createTestRemoteSession({
        code: "ABCD",
        gameArea: JOIN_PREVIEW_PLACEHOLDER_AREA,
        memberRoles: {},
      }),
      previewPremium: false,
      lookupLoading: false,
      existingRole: null,
    } as never);
    mockJoinRemoteSessionByCode.mockResolvedValue({ status: "joined", session });

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    expect(result.current.rolePasscodeOccupancyKnown).toBe(false);

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/map");
    });
    expect(mockJoinRemoteSessionByCode).toHaveBeenCalledOnce();
  });

  it("lets a returning member on the same side through without a code", async () => {
    const session = createTestRemoteSession({ code: "ABCD" });
    mockUseJoinSessionPreview.mockReturnValue({
      previewSession: createTestRemoteSession({
        code: "ABCD",
        memberRoles: { leader: "seeker", u1: "seeker" },
      }),
      previewPremium: false,
      lookupLoading: false,
      existingRole: "seeker",
    } as never);
    mockJoinRemoteSessionByCode.mockResolvedValue({ status: "joined", session });

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/map");
    });
  });

  it("tracks join_failed with role_code_required when the server rejects a blank code", async () => {
    mockJoinRemoteSessionByCode.mockRejectedValue(
      new Error("Enter the role code for that side.", {
        cause: Object.assign(new Error("Role code is required."), {
          code: "functions/invalid-argument",
        }),
      }),
    );

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Enter the role code for that side.");
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("join_failed", {
      role: "seeker",
      reason: "role_code_required",
    });
  });

  it("tracks join_failed once when the client blocks a blank code", async () => {
    mockUseJoinSessionPreview.mockReturnValue({
      previewSession: createTestRemoteSession({ code: "ABCD", memberRoles: { leader: "seeker" } }),
      previewPremium: false,
      lookupLoading: false,
      existingRole: null,
    } as never);

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Enter the role code for that side.");
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("join_failed", {
      role: "seeker",
      reason: "role_code_required",
    });
  });

  it("tracks session_missing for a missing session", async () => {
    mockJoinRemoteSessionByCode.mockResolvedValue({ status: "missing" });

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("No session found for that code.");
    });
    expect(mockTrack).toHaveBeenCalledWith("join_failed", {
      role: "seeker",
      reason: "session_missing",
    });
  });

  it("tracks session_ended once when the join reports an ended session", async () => {
    mockJoinRemoteSessionByCode.mockResolvedValue({ status: "ended" });

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("That session has ended. Ask the host for a new code.");
    });
    expect(mockTrack.mock.calls.filter(([event]) => event === "join_failed")).toEqual([
      ["join_failed", { role: "seeker", reason: "session_ended" }],
    ]);
  });

  it("tracks version_mismatch once when the host runs an incompatible version", async () => {
    mockJoinRemoteSessionByCode.mockResolvedValue({ status: "incompatible", hostVersion: "9.9.9" });

    const { result } = renderHook(() =>
      useJoinSession({ code: "ABCD", playerRole: "seeker", rolePasscode: "" }),
    );

    await act(async () => {
      result.current.runJoin(joinValues);
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(expect.stringContaining("9.9.9"));
    });
    expect(mockTrack.mock.calls.filter(([event]) => event === "join_failed")).toEqual([
      ["join_failed", { role: "seeker", reason: "version_mismatch" }],
    ]);
  });
});
