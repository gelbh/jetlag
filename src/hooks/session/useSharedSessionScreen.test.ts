import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSharedSessionScreen } from "./useSharedSessionScreen";

const ensureAnonymousUser = vi.fn();
const waitForPermanentAuthReady = vi.fn();
const getFirebaseAuth = vi.fn();
const useSessionSyncMock = vi.fn();

vi.mock("../../services/core/firebase/firebase", () => ({
  ensureAnonymousUser: (...args: unknown[]) => ensureAnonymousUser(...args),
  getFirebaseAuth: () => getFirebaseAuth(),
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock("../../services/core/firebase/firebaseAuthReady", () => ({
  waitForPermanentAuthReady: (...args: unknown[]) =>
    waitForPermanentAuthReady(...args),
}));

let mockSession = { id: "session-1", code: "ABCD" };
let mockMyUid = "admin-uid";
const setMyUid = vi.fn((uid: string | null) => {
  mockMyUid = uid ?? "";
});
const setLastSyncError = vi.fn();

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: vi.fn(
    (
      selector: (state: {
        session: { id: string; code: string };
        myUid: string;
        setMyUid: (uid: string | null) => void;
        setLastSyncError: () => void;
      }) => unknown,
    ) =>
      selector({
        session: mockSession,
        myUid: mockMyUid,
        setMyUid,
        setLastSyncError,
      }),
  ),
}));

vi.mock("./useSessionSync", () => ({
  useSessionSync: (options: { syncEnabled?: boolean }) => {
    useSessionSyncMock(options);
  },
}));
vi.mock("./useChatUnread", () => ({
  useChatUnread: vi.fn(() => ({
    hasUnreadChat: false,
    unreadCount: 0,
    acknowledgeFingerprints: vi.fn(),
  })),
}));
vi.mock("./useSessionExtrasSync", () => ({
  usePendingQuestionsSync: vi.fn(() => []),
  useHidingZonesSync: vi.fn(() => []),
  useSeekerLocationsSync: vi.fn(() => []),
  useHiderLocationsSync: vi.fn(() => []),
  useSessionMessagesSync: vi.fn(() => []),
}));
vi.mock("./useRemoteSessionTimerSync", () => ({
  useRemoteSessionTimerSync: vi.fn(() => ({
    canControlTimer: false,
    remoteState: null,
    remoteSnapshot: null,
    timerSyncing: false,
    onControl: vi.fn(),
    isRemote: true,
  })),
}));
vi.mock("./useSessionTimer", () => ({
  useSessionTimer: vi.fn(() => ({
    timerState: "stopped",
    hasStarted: false,
  })),
}));
vi.mock("./useSessionEndedRedirect", () => ({
  useSessionEndedRedirect: vi.fn(),
}));
vi.mock("../sync/useSyncStatus", () => ({
  useSyncStatus: vi.fn(() => ({ status: "synced" })),
}));
vi.mock("../sync/useFirebaseAuthReady", () => ({
  useFirebaseAuthReady: vi.fn(() => true),
}));

const ensureSessionMembershipMock = vi.fn();
vi.mock("./useEnsureSessionMembership", () => ({
  useEnsureSessionMembership: (...args: unknown[]) =>
    ensureSessionMembershipMock(...args),
}));

describe("useSharedSessionScreen", () => {
  beforeEach(() => {
    mockSession = { id: "session-1", code: "ABCD" };
    mockMyUid = "admin-uid";
    setMyUid.mockClear();
    setLastSyncError.mockClear();
    ensureSessionMembershipMock.mockClear();
    ensureAnonymousUser.mockReset();
  });

  it("heals membership for hider-anonymous auth mode", () => {
    ensureAnonymousUser.mockResolvedValue({ uid: "hider-uid" });

    renderHook(() =>
      useSharedSessionScreen({
        isChatOpen: false,
        notificationRole: "hider",
        authMode: "hider-anonymous",
      }),
    );

    expect(ensureSessionMembershipMock).toHaveBeenCalledWith({
      enabled: true,
    });
  });

  it("does not apply stale hider setMyUid after membership remint", async () => {
    let resolveStaleAnon!: (user: { uid: string }) => void;
    let anonCalls = 0;
    ensureAnonymousUser.mockImplementation(() => {
      anonCalls += 1;
      if (anonCalls === 1) {
        return new Promise<{ uid: string }>((resolve) => {
          resolveStaleAnon = resolve;
        });
      }
      return Promise.resolve({ uid: "new-uid" });
    });

    mockMyUid = "old-uid";

    const { rerender } = renderHook(() =>
      useSharedSessionScreen({
        isChatOpen: false,
        notificationRole: "hider",
        authMode: "hider-anonymous",
      }),
    );

    // Membership heal remints and updates store myUid before the first
    // ensureAnonymousUser promise settles.
    mockMyUid = "new-uid";
    rerender();

    await waitFor(() => {
      expect(setMyUid).toHaveBeenCalledWith("new-uid");
    });

    resolveStaleAnon({ uid: "old-uid" });
    await Promise.resolve();

    expect(setMyUid).not.toHaveBeenCalledWith("old-uid");
    expect(setMyUid).toHaveBeenLastCalledWith("new-uid");
  });

  it("heals membership for seeker-remote auth mode", () => {
    ensureAnonymousUser.mockResolvedValue({ uid: "seeker-uid" });

    renderHook(() =>
      useSharedSessionScreen({
        isChatOpen: false,
        notificationRole: "seeker",
        authMode: "seeker-remote",
      }),
    );

    expect(ensureSessionMembershipMock).toHaveBeenCalledWith({
      enabled: true,
    });
  });

  it("does not mint anonymous users in admin-permanent auth mode", async () => {
    waitForPermanentAuthReady.mockResolvedValue(undefined);
    getFirebaseAuth.mockReturnValue({
      currentUser: { uid: "admin-uid" },
    });

    renderHook(() =>
      useSharedSessionScreen({
        isChatOpen: false,
        notificationRole: "observer",
        authMode: "admin-permanent",
        exitPath: "/admin",
      }),
    );

    await waitFor(() => {
      expect(waitForPermanentAuthReady).toHaveBeenCalled();
    });
    expect(ensureAnonymousUser).not.toHaveBeenCalled();
    expect(ensureSessionMembershipMock).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it("resets admin sync gating when monitored session changes", async () => {
    waitForPermanentAuthReady.mockResolvedValue(undefined);
    getFirebaseAuth.mockReturnValue({
      currentUser: { uid: "admin-uid" },
    });
    mockSession = { id: "session-1", code: "ABCD" };
    useSessionSyncMock.mockClear();

    const { rerender } = renderHook(() =>
      useSharedSessionScreen({
        isChatOpen: false,
        notificationRole: "observer",
        authMode: "admin-permanent",
        exitPath: "/admin",
      }),
    );

    await waitFor(() => {
      expect(useSessionSyncMock).toHaveBeenLastCalledWith({ syncEnabled: true });
    });

    mockSession = { id: "session-2", code: "EFGH" };
    rerender();

    expect(useSessionSyncMock).toHaveBeenLastCalledWith({ syncEnabled: false });
  });
});
