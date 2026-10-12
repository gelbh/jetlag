import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "@/domain/map/annotations";

const navigate = vi.fn();
const exitSession = vi.fn();
const mocks = vi.hoisted(() => ({
  sessionId: "",
  firebaseConfigured: false,
  ensureFreshAnonymousUser: vi.fn(),
}));

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => navigate,
}));
vi.mock("@/hooks/session/useSessionExit", () => ({
  useSessionExit: () => exitSession,
}));
vi.mock("@/state/sessionStore", () => ({
  useSessionStore: (sel: (s: unknown) => unknown) =>
    sel({
      session: { id: mocks.sessionId, code: "ABCD" },
      myRole: "seeker",
      myUid: "u1",
      setSession: vi.fn(),
    }),
}));
vi.mock("@/services/core/firebase/authBootstrapState", () => ({
  isFirebaseConfigured: () => mocks.firebaseConfigured,
}));
vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => mocks.firebaseConfigured,
  ensureFreshAnonymousUser: mocks.ensureFreshAnonymousUser,
}));
vi.mock("@/services/firestore/firestoreAnnotations", () => ({
  isFirestorePermissionDenied: () => false,
}));
vi.mock("@/services/firestore/sessionMembershipHeal", () => ({
  getRemoteSessionById: vi.fn(),
  healSessionMembership: vi.fn(),
  lookupRemoteSessionByCode: vi.fn(),
}));

import { useContinueActiveSession } from "./useContinueActiveSession";

describe("useContinueActiveSession", () => {
  beforeEach(() => {
    navigate.mockClear();
    exitSession.mockClear();
    mocks.sessionId = LOCAL_SESSION_ID;
    mocks.firebaseConfigured = false;
    mocks.ensureFreshAnonymousUser.mockReset();
  });

  it("navigates to map for local / unconfigured firebase session", async () => {
    const { result } = renderHook(() => useContinueActiveSession());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(navigate).toHaveBeenCalledWith("/map");
    expect(result.current.continuing).toBe(false);
  });

  it("shows the error and clears continuing when remote verify fails", async () => {
    mocks.sessionId = "remote-1";
    mocks.firebaseConfigured = true;
    mocks.ensureFreshAnonymousUser.mockRejectedValue(new Error("Network down."));

    const { result } = renderHook(() => useContinueActiveSession());
    await act(async () => {
      await result.current.handleContinue();
    });

    expect(result.current.continueError).toBe("Network down.");
    expect(result.current.continuing).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
