import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "../../domain/device/notifications";
import { mergeNotificationPreferences } from "./notifications";

describe("mergeNotificationPreferences", () => {
  it("fills defaults for partial preferences", () => {
    const merged = mergeNotificationPreferences({ enabled: true });
    expect(merged).toEqual({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      enabled: true,
    } satisfies NotificationPreferences);
  });
});
