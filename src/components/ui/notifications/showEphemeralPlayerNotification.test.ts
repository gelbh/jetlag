import { beforeEach, describe, expect, it, vi } from "vitest";

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
    const shown = showEphemeralPlayerNotification({
      title: "Offline",
      message: "Changes will sync when you reconnect.",
    });

    expect(shown).toBe(true);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Offline",
        message: "Changes will sync when you reconnect.",
      }),
    );
  });
});
