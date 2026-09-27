import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatUserError } from "@/domain/device/feedback/userErrors";

const { show } = vi.hoisted(() => ({
  show: vi.fn(),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show },
}));

import { showEphemeralPlayerNotification } from "./showEphemeralPlayerNotification";

describe("showEphemeralPlayerNotification", () => {
  beforeEach(() => {
    show.mockClear();
  });

  it("calls notifications.show", () => {
    showEphemeralPlayerNotification({
      title: "Offline",
      message: "Changes will sync when you reconnect.",
    });

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Offline",
        message: "Changes will sync when you reconnect.",
      }),
    );
  });

  it("maps UserErrorDisplay title/message (not raw exception as title)", () => {
    const display = formatUserError(
      "unknown",
      "FirebaseError: Missing or insufficient permissions.",
    );

    showEphemeralPlayerNotification(display);

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Something went wrong",
        message: "FirebaseError: Missing or insufficient permissions.",
      }),
    );
    expect(show.mock.calls[0]?.[0]?.title).not.toMatch(/FirebaseError|insufficient permissions/i);
  });

  it("uses a stable id from title and message by default", () => {
    showEphemeralPlayerNotification({
      title: "Offline",
      message: "Changes will sync when you reconnect.",
    });
    showEphemeralPlayerNotification({
      title: "Offline",
      message: "Changes will sync when you reconnect.",
    });

    const firstId = show.mock.calls[0]?.[0]?.id;
    const secondId = show.mock.calls[1]?.[0]?.id;
    expect(firstId).toBe("ephemeral:Offline:Changes will sync when you reconnect.");
    expect(secondId).toBe(firstId);
  });

  it("defaults color to halt/red brand error", () => {
    showEphemeralPlayerNotification({
      title: "Offline",
      message: "Changes will sync when you reconnect.",
    });

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "halt",
      }),
    );
  });

  it("allows color override", () => {
    showEphemeralPlayerNotification({
      title: "Offline",
      message: "Changes will sync when you reconnect.",
      color: "flag",
    });

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "flag",
      }),
    );
  });
});
