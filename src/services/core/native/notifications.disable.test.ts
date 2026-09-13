import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsertUserDevice, deleteUserDevice, isNativePlatform, getPlatform } =
  vi.hoisted(() => ({
    upsertUserDevice: vi.fn(async () => undefined),
    deleteUserDevice: vi.fn(async () => undefined),
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "ios"),
  }));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: (...args: unknown[]) => isNativePlatform(...args),
    getPlatform: (...args: unknown[]) => getPlatform(...args),
  },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    createChannel: vi.fn(),
    requestPermissions: vi.fn(async () => ({ display: "granted" })),
  },
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
    requestPermissions: vi.fn(async () => ({ receive: "granted" })),
    register: vi.fn(async () => undefined),
  },
}));

vi.mock("../../firestore/firestoreDevices", () => ({
  upsertSessionDevice: vi.fn(async () => undefined),
  upsertUserDevice: (...args: unknown[]) => upsertUserDevice(...args),
  deleteUserDevice: (...args: unknown[]) => deleteUserDevice(...args),
}));

vi.mock("./liveActivity", () => ({
  JetlagLiveActivity: {
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
  },
}));

import {
  getCurrentPushToken,
  syncUserDeviceRegistration,
} from "./notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/domain/device/chrome/notifications";

describe("syncUserDeviceRegistration disable", () => {
  beforeEach(() => {
    upsertUserDevice.mockClear();
    deleteUserDevice.mockClear();
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("ios");
  });

  it("deletes the user device when disabled and no push token is cached", async () => {
    expect(getCurrentPushToken()).toBeNull();

    await syncUserDeviceRegistration({
      uid: "u1",
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        enabled: false,
      },
    });

    expect(upsertUserDevice).not.toHaveBeenCalled();
    expect(deleteUserDevice).toHaveBeenCalledWith("u1", "ios");
  });
});
