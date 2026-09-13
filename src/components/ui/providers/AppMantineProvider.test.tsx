import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@mantine/notifications", () => ({
  Notifications: () => <div data-testid="mantine-notifications" />,
  notifications: { show: vi.fn() },
}));

import { AppMantineProvider } from "./AppMantineProvider";

beforeEach(() => {
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

describe("AppMantineProvider", () => {
  it("mounts Notifications under MantineProvider", () => {
    render(
      <AppMantineProvider>
        <span>child</span>
      </AppMantineProvider>,
    );

    expect(screen.getByTestId("mantine-notifications")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
