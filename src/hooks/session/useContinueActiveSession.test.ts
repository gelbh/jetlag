import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "@/domain/map/annotations";

const navigate = vi.fn();
const exitSession = vi.fn();

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => navigate,
}));
vi.mock("@/hooks/session/useSessionExit", () => ({
  useSessionExit: () => exitSession,
}));
vi.mock("@/state/sessionStore", () => ({
  useSessionStore: (sel: (s: unknown) => unknown) =>
    sel({
      session: { id: LOCAL_SESSION_ID, code: "ABCD" },
      myRole: "seeker",
      myUid: "u1",
      setSession: vi.fn(),
    }),
}));
vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureFreshAnonymousUser: vi.fn(),
}));

import { useContinueActiveSession } from "./useContinueActiveSession";

describe("useContinueActiveSession", () => {
  beforeEach(() => {
    navigate.mockClear();
    exitSession.mockClear();
  });

  it("navigates to map for local / unconfigured firebase session", async () => {
    const { result } = renderHook(() => useContinueActiveSession());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(navigate).toHaveBeenCalledWith("/map");
  });
});
