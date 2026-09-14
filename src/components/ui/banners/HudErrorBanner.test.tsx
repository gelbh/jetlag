import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYER_UI_MANTINE_STORAGE_KEY } from "@/hooks/feature/usePlayerUiMantine";

const { show, showEphemeral } = vi.hoisted(() => ({
  show: vi.fn(),
  showEphemeral: vi.fn(),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show },
}));

vi.mock("../notifications/showEphemeralPlayerNotification", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../notifications/showEphemeralPlayerNotification")
    >();
  return {
    ...actual,
    showEphemeralPlayerNotification: (input: {
      title: string;
      message: string;
    }) => showEphemeral(input),
  };
});

import { HudErrorBanner } from "./HudErrorBanner";

describe("HudErrorBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    show.mockClear();
    showEphemeral.mockReset();
    showEphemeral.mockImplementation((input: { title: string; message: string }) => {
      if (localStorage.getItem(PLAYER_UI_MANTINE_STORAGE_KEY) !== "1") {
        return false;
      }
      show(input);
      return true;
    });
  });

  it("renders retry and return to join actions", () => {
    const onRetry = vi.fn();
    const onReturnToJoin = vi.fn();

    render(
      <HudErrorBanner
        error={{
          title: "Session gone",
          message: "That session no longer exists.",
          action: "retry",
          actionLabel: "Retry",
          secondaryAction: "rejoin",
          secondaryActionLabel: "Return to join",
        }}
        onAction={onRetry}
        onSecondaryAction={onReturnToJoin}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Return to join" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onReturnToJoin).toHaveBeenCalledTimes(1);
    expect(showEphemeral).not.toHaveBeenCalled();
  });

  it("keeps Survey banner when flag is on but actions are present", () => {
    localStorage.setItem(PLAYER_UI_MANTINE_STORAGE_KEY, "1");
    const onRetry = vi.fn();

    render(
      <HudErrorBanner
        error={{
          title: "Sync failed",
          message: "Could not sync with the session.",
          action: "retry",
          actionLabel: "Retry",
        }}
        onAction={onRetry}
      />,
    );

    expect(screen.getByText("Sync failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(showEphemeral).not.toHaveBeenCalled();
  });

  it("shows Mantine notification and skips Survey banner when flag on and no actions", () => {
    localStorage.setItem(PLAYER_UI_MANTINE_STORAGE_KEY, "1");

    const { container } = render(
      <HudErrorBanner
        error={{
          title: "Offline",
          message: "Changes will sync when you reconnect.",
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(showEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Offline",
        message: "Changes will sync when you reconnect.",
      }),
    );
  });

  it("keeps Survey banner when adapter returns false (fail open)", () => {
    localStorage.setItem(PLAYER_UI_MANTINE_STORAGE_KEY, "1");
    showEphemeral.mockReturnValue(false);

    render(
      <HudErrorBanner
        error={{
          title: "Offline",
          message: "Changes will sync when you reconnect.",
        }}
      />,
    );

    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(show).not.toHaveBeenCalled();
  });

  it("renders Survey banner when flag is off and no actions", () => {
    render(
      <HudErrorBanner
        error={{
          title: "Offline",
          message: "Changes will sync when you reconnect.",
        }}
      />,
    );

    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(showEphemeral).toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });
});
