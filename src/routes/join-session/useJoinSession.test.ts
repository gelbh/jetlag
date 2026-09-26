import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  ensureFreshAnonymousUser: (...args: unknown[]) =>
    mockEnsureFreshAnonymousUser(...args),
}));

vi.mock("@/services/firestore/firestoreAnnotations", () => ({
  joinRemoteSessionByCode: (...args: unknown[]) =>
    mockJoinRemoteSessionByCode(...args),
  waitForServerHiderRole: vi.fn(),
  getRemoteSessionByIdFromServer: vi.fn(),
  lookupRemoteSessionByCode: vi.fn(),
}));

vi.mock("@/hooks/session/useJoinSessionPreview", () => ({
  useJoinSessionPreview: (...args: unknown[]) =>
    mockUseJoinSessionPreview(...args),
}));

vi.mock("@/services/session/rolePasscodeLifecycle", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/session/rolePasscodeLifecycle")
  >("@/services/session/rolePasscodeLifecycle");
  return {
    ...actual,
    requestRoleJoin: (...args: unknown[]) => mockRequestRoleJoin(...args),
    cancelRoleJoinRequest: (...args: unknown[]) =>
      mockCancelRoleJoinRequest(...args),
  };
});

vi.mock("@/services/session/joinRequestListen", () => ({
  listenOwnJoinRequest: (...args: unknown[]) =>
    mockListenOwnJoinRequest(...args),
}));

vi.mock("@/platform/copyToClipboard", () => ({
  copyToClipboard: vi.fn(async () => true),
}));

vi.mock("@/services/core/analytics/analytics", () => ({
  ANALYTICS_EVENTS: { session_joined: "session_joined" },
  track: vi.fn(),
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
    });
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
});
