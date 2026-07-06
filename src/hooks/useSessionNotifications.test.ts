import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionNotifications } from "./useSessionNotifications";
import { resetAllStores } from "../test/helpers/storeReset";
import { useMapStore } from "../state/mapStore";

vi.mock("../services/notifications", () => ({
  initializeNativeNotifications: vi.fn(),
  isNativeNotificationsSupported: vi.fn(() => true),
  refreshActivityPushToken: vi.fn(),
  requestNotificationPermission: vi.fn(async () => true),
  syncSessionDeviceRegistration: vi.fn(),
}));

import {
  initializeNativeNotifications,
  refreshActivityPushToken,
  requestNotificationPermission,
  syncSessionDeviceRegistration,
} from "../services/notifications";

describe("useSessionNotifications", () => {
  beforeEach(() => {
    resetAllStores();
    vi.clearAllMocks();
  });

  it("initializes native notifications on mount", () => {
    renderHook(() =>
      useSessionNotifications({
        sessionId: "session-1",
        uid: "user-1",
        role: "hider",
      }),
    );

    expect(initializeNativeNotifications).toHaveBeenCalled();
  });

  it("syncs device registration when notifications are enabled", async () => {
    useMapStore.getState().setNotificationPreferences({
      enabled: true,
      newQuestions: true,
      timerChanges: true,
      chatMessages: false,
      liveActivities: true,
    });

    renderHook(() =>
      useSessionNotifications({
        sessionId: "session-1",
        uid: "user-1",
        role: "hider",
      }),
    );

    await waitFor(() => {
      expect(syncSessionDeviceRegistration).toHaveBeenCalledWith({
        sessionId: "session-1",
        uid: "user-1",
        role: "hider",
        preferences: expect.objectContaining({ enabled: true }),
      });
    });
  });

  it("requests permission and updates preferences when enabling notifications", async () => {
    const { result } = renderHook(() =>
      useSessionNotifications({
        sessionId: "session-1",
        uid: "user-1",
        role: "seeker",
      }),
    );

    const granted = await result.current.enableNotifications();

    expect(granted).toBe(true);
    expect(requestNotificationPermission).toHaveBeenCalled();
    expect(useMapStore.getState().notificationPreferences.enabled).toBe(true);
  });

  it("refreshes activity push token when live activities are enabled", async () => {
    useMapStore.getState().setNotificationPreferences({
      enabled: true,
      newQuestions: true,
      timerChanges: true,
      chatMessages: false,
      liveActivities: true,
    });

    renderHook(() =>
      useSessionNotifications({
        sessionId: "session-1",
        uid: "user-1",
        role: "hider",
      }),
    );

    await waitFor(() => {
      expect(refreshActivityPushToken).toHaveBeenCalled();
    });
  });
});
