import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationsMock = vi.fn(
  ({ portalProps }: { portalProps?: { target?: HTMLElement } }) => (
    <div
      data-testid="mantine-notifications"
      data-portal-target={portalProps?.target ? "shell" : "none"}
    />
  ),
);

vi.mock("@mantine/notifications", () => ({
  Notifications: (props: { portalProps?: { target?: HTMLElement } }) =>
    notificationsMock(props),
  notifications: { show: vi.fn() },
}));

import { AppUiProvider } from "./AppUiProvider";
import { setPlayerPhoneShellPortalHost } from "@/components/ui/layout/playerPhoneShellPortalHost";

beforeEach(() => {
  setPlayerPhoneShellPortalHost(null);
  notificationsMock.mockClear();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
});

describe("AppUiProvider", () => {
  it("mounts Notifications under MantineProvider with theme bridge", () => {
    render(
      <AppUiProvider>
        <span>child</span>
      </AppUiProvider>,
    );

    expect(screen.getByTestId("mantine-notifications")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.getByTestId("mantine-notifications")).toHaveAttribute(
      "data-portal-target",
      "none",
    );
  });

  it("portals Notifications into the player phone shell when registered", () => {
    const shell = document.createElement("div");
    shell.setAttribute("data-player-phone-shell", "");
    setPlayerPhoneShellPortalHost(shell);

    render(
      <AppUiProvider>
        <span>child</span>
      </AppUiProvider>,
    );

    expect(screen.getByTestId("mantine-notifications")).toHaveAttribute(
      "data-portal-target",
      "shell",
    );
  });
});
