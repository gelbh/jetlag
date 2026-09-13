import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYER_UI_MANTINE_STORAGE_KEY } from "@/hooks/feature/usePlayerUiMantine";

const { show } = vi.hoisted(() => ({
  show: vi.fn(),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show },
}));

import { showEphemeralPlayerNotification } from "./showEphemeralPlayerNotification";

describe("showEphemeralPlayerNotification", () => {
  beforeEach(() => {
    localStorage.clear();
    show.mockClear();
  });

  it("does not call notifications.show when mantine flag is off", () => {
    const shown = showEphemeralPlayerNotification({
      title: "Offline",
      message: "Changes will sync when you reconnect.",
    });

    expect(shown).toBe(false);
    expect(show).not.toHaveBeenCalled();
  });

  it("calls notifications.show when mantine flag is on", () => {
    localStorage.setItem(PLAYER_UI_MANTINE_STORAGE_KEY, "1");

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
