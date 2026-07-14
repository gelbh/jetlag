import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSharedSessionScreen } from "./useSharedSessionScreen";

const ensureAnonymousUser = vi.fn();
const waitForPermanentAuthReady = vi.fn();
const getFirebaseAuth = vi.fn();
const useSessionSyncMock = vi.fn();

vi.mock("../../services/core/firebase", () => ({
  ensureAnonymousUser: (...args: unknown[]) => ensureAnonymousUser(...args),
  getFirebaseAuth: () => getFirebaseAuth(),
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock("../../services/core/firebaseAuthReady", () => ({
  waitForPermanentAuthReady: (...args: unknown[]) =>
    waitForPermanentAuthReady(...args),
}));

let mockSession = { id: "session-1", code: "ABCD" };

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: vi.fn(
    (
      selector: (state: {
        session: { id: string; code: string };
        myUid: string;
        setMyUid: () => void;
        setLastSyncError: () => void;
      }) => unknown,
    ) =>
      selector({
        session: mockSession,
        myUid: "admin-uid",
        setMyUid: vi.fn(),
        setLastSyncError: vi.fn(),
      }),
  ),
}));

vi.mock("./useSessionSync", () => ({
  useSessionSync: (options: { syncEnabled?: boolean }) => {
    useSessionSyncMock(options);
  },
}));
vi.mock("./useChatUnread", () => ({
  useChatUnread: vi.fn(() => ({ hasUnreadChat: false, unreadCount: 0 })),
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
vi.mock("./useSessionNotifications", () => ({
  useSessionNotifications: vi.fn(() => ({
    notificationPreferences: {},
    enableNotifications: vi.fn(),
    updateNotificationPreferences: vi.fn(),
  })),
}));
vi.mock("../sync/useLiveActivitySync", () => ({
  useLiveActivitySync: vi.fn(),
}));
vi.mock("../sync/useSyncStatus", () => ({
  useSyncStatus: vi.fn(() => ({ status: "synced" })),
}));
vi.mock("../sync/useFirebaseAuthReady", () => ({
  useFirebaseAuthReady: vi.fn(() => true),
}));

describe("useSharedSessionScreen", () => {
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
        liveActivityEnabled: false,
        exitPath: "/admin",
      }),
    );

    await waitFor(() => {
      expect(waitForPermanentAuthReady).toHaveBeenCalled();
    });
    expect(ensureAnonymousUser).not.toHaveBeenCalled();
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
        liveActivityEnabled: false,
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
