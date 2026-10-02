import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEnsureSessionMembership } from "./useEnsureSessionMembership";

const ensureFreshAnonymousUser = vi.fn();
const healSessionMembership = vi.fn();
const sessionMembershipChanged = vi.fn(() => false);
const setSession = vi.fn();
const setLastSyncError = vi.fn();
const storeState = vi.hoisted(() => ({
  networkReachable: null as boolean | null,
}));

vi.mock("../../services/core/firebase/firebase", () => ({
  ensureFreshAnonymousUser: (...args: unknown[]) => ensureFreshAnonymousUser(...args),
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock("../../services/firestore/sessionMembershipHeal", () => ({
  healSessionMembership: (...args: unknown[]) => healSessionMembership(...args),
  sessionMembershipChanged: () => sessionMembershipChanged(),
}));

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: Object.assign(
    vi.fn(
      (
        selector: (state: {
          session: { id: string; code: string; memberUids: string[] };
          myUid: string;
          myRole: string;
          setSession: () => void;
          setLastSyncError: () => void;
        }) => unknown,
      ) =>
        selector({
          session: { id: "session-1", code: "ABCD", memberUids: ["uid-1"] },
          myUid: "uid-1",
          myRole: "hider",
          setSession,
          setLastSyncError,
        }),
    ),
    {
      getState: () => ({
        session: { id: "session-1", code: "ABCD", memberUids: ["uid-1"] },
        myUid: "uid-1",
        myRole: "hider",
        networkReachable: storeState.networkReachable,
      }),
    },
  ),
}));

describe("useEnsureSessionMembership", () => {
  beforeEach(() => {
    ensureFreshAnonymousUser.mockReset();
    healSessionMembership.mockReset();
    sessionMembershipChanged.mockReset();
    sessionMembershipChanged.mockReturnValue(false);
    setSession.mockClear();
    setLastSyncError.mockClear();
    storeState.networkReachable = null;
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });

  it("skips heal when enabled is false", () => {
    renderHook(() => useEnsureSessionMembership({ enabled: false }));

    expect(ensureFreshAnonymousUser).not.toHaveBeenCalled();
    expect(healSessionMembership).not.toHaveBeenCalled();
  });

  it("heals membership when enabled is true", async () => {
    const session = { id: "session-1", code: "ABCD", memberUids: ["uid-1"] };
    ensureFreshAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    healSessionMembership.mockResolvedValue(session);

    renderHook(() => useEnsureSessionMembership({ enabled: true }));

    await waitFor(() => {
      expect(ensureFreshAnonymousUser).toHaveBeenCalled();
      expect(healSessionMembership).toHaveBeenCalledWith(session, "uid-1", "hider", {
        returningMemberUid: "uid-1",
        persistedMyUid: "uid-1",
      });
    });
  });

  it("forces a token refresh while online", async () => {
    ensureFreshAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    healSessionMembership.mockResolvedValue({
      id: "session-1",
      code: "ABCD",
      memberUids: ["uid-1"],
    });

    renderHook(() => useEnsureSessionMembership({ enabled: true }));

    await waitFor(() => {
      expect(ensureFreshAnonymousUser).toHaveBeenCalledWith({
        forceRefresh: true,
      });
    });
  });

  it("skips the forced token refresh while effectively offline", async () => {
    storeState.networkReachable = false;
    ensureFreshAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    healSessionMembership.mockResolvedValue({
      id: "session-1",
      code: "ABCD",
      memberUids: ["uid-1"],
    });

    renderHook(() => useEnsureSessionMembership({ enabled: true }));

    await waitFor(() => {
      expect(ensureFreshAnonymousUser).toHaveBeenCalledWith({
        forceRefresh: false,
      });
    });
  });

  it("skips the forced token refresh while the browser is offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    ensureFreshAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    healSessionMembership.mockResolvedValue({
      id: "session-1",
      code: "ABCD",
      memberUids: ["uid-1"],
    });

    renderHook(() => useEnsureSessionMembership({ enabled: true }));

    await waitFor(() => {
      expect(ensureFreshAnonymousUser).toHaveBeenCalledWith({
        forceRefresh: false,
      });
    });
  });
});
