import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MEMBERSHIP_HEAL_FAIL_OPEN_MS,
  useEnsureSessionMembership,
} from "./useEnsureSessionMembership";

const ensureFreshAnonymousUser = vi.fn();
const healSessionMembership = vi.fn();
const sessionMembershipChanged = vi.fn(() => false);
const setSession = vi.fn();
const setLastSyncError = vi.fn();
const storeState = vi.hoisted(() => ({
  networkReachable: null as boolean | null,
  session: { id: "session-1", code: "ABCD", memberUids: ["uid-1"] } as {
    id: string;
    code: string;
    memberUids: string[];
  },
  myUid: "uid-1" as string,
  myRole: "hider" as string,
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
          session: storeState.session,
          myUid: storeState.myUid,
          myRole: storeState.myRole,
          setSession,
          setLastSyncError,
        }),
    ),
    {
      getState: () => ({
        session: storeState.session,
        myUid: storeState.myUid,
        myRole: storeState.myRole,
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
    storeState.session = { id: "session-1", code: "ABCD", memberUids: ["uid-1"] };
    storeState.myUid = "uid-1";
    storeState.myRole = "hider";
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.useRealTimers();
  });

  it("skips heal when enabled is false", () => {
    const { result } = renderHook(() => useEnsureSessionMembership({ enabled: false }));

    expect(ensureFreshAnonymousUser).not.toHaveBeenCalled();
    expect(healSessionMembership).not.toHaveBeenCalled();
    expect(result.current.membershipSettled).toBe(true);
  });

  it("heals membership when enabled is true", async () => {
    const session = { id: "session-1", code: "ABCD", memberUids: ["uid-1"] };
    ensureFreshAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    healSessionMembership.mockResolvedValue(session);

    const { result } = renderHook(() => useEnsureSessionMembership({ enabled: true }));

    expect(result.current.membershipSettled).toBe(false);

    await waitFor(() => {
      expect(ensureFreshAnonymousUser).toHaveBeenCalled();
      expect(healSessionMembership).toHaveBeenCalledWith(session, "uid-1", "hider", {
        returningMemberUid: "uid-1",
        persistedMyUid: "uid-1",
      });
    });

    await waitFor(() => {
      expect(result.current.membershipSettled).toBe(true);
    });
  });

  it("marks membershipSettled after heal failure so extras can settle", async () => {
    ensureFreshAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    healSessionMembership.mockRejectedValue(new Error("No access to this session."));

    const { result } = renderHook(() => useEnsureSessionMembership({ enabled: true }));

    expect(result.current.membershipSettled).toBe(false);

    await waitFor(() => {
      expect(result.current.membershipSettled).toBe(true);
    });
    expect(setLastSyncError).toHaveBeenCalled();
  });

  it("keeps membershipSettled true after post-heal myUid echo", async () => {
    ensureFreshAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    healSessionMembership.mockResolvedValue({
      id: "session-1",
      code: "ABCD",
      memberUids: ["uid-1"],
    });
    sessionMembershipChanged.mockReturnValue(true);

    const { result, rerender } = renderHook(() => useEnsureSessionMembership({ enabled: true }));

    await waitFor(() => {
      expect(result.current.membershipSettled).toBe(true);
    });
    expect(setSession).toHaveBeenCalled();

    storeState.myUid = "uid-1-new";
    healSessionMembership.mockClear();
    healSessionMembership.mockResolvedValue({
      id: "session-1",
      code: "ABCD",
      memberUids: ["uid-1-new"],
    });
    rerender();

    expect(result.current.membershipSettled).toBe(true);
    await waitFor(() => {
      expect(healSessionMembership).toHaveBeenCalled();
    });
    expect(result.current.membershipSettled).toBe(true);
  });

  it("treats a new session id as unsettled until heal settles", async () => {
    ensureFreshAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    healSessionMembership.mockResolvedValue({
      id: "session-1",
      code: "ABCD",
      memberUids: ["uid-1"],
    });

    const { result, rerender } = renderHook(() => useEnsureSessionMembership({ enabled: true }));

    await waitFor(() => {
      expect(result.current.membershipSettled).toBe(true);
    });

    storeState.session = { id: "session-2", code: "EFGH", memberUids: ["uid-1"] };
    healSessionMembership.mockImplementation(
      () =>
        new Promise(() => {
          /* hang until fail-open or later resolve */
        }),
    );
    rerender();

    expect(result.current.membershipSettled).toBe(false);
  });

  it("fail-opens membershipSettled when heal hangs past the timeout", async () => {
    vi.useFakeTimers();
    ensureFreshAnonymousUser.mockResolvedValue({ uid: "uid-1" });
    healSessionMembership.mockImplementation(
      () =>
        new Promise(() => {
          /* never settles */
        }),
    );

    const { result } = renderHook(() => useEnsureSessionMembership({ enabled: true }));

    expect(result.current.membershipSettled).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MEMBERSHIP_HEAL_FAIL_OPEN_MS);
    });

    expect(result.current.membershipSettled).toBe(true);
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
