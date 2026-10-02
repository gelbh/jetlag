import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { Friends } from "./Friends";

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
}));

vi.mock("@/hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => ({
    user: null,
    isPermanent: false,
    authReady: true,
  }),
}));

vi.mock("../components/friends/FriendsBody", () => ({
  FriendsBody: () => <div data-testid="friends-body">Friends body</div>,
}));

vi.mock("../components/friends/FriendsBody", () => ({
  FriendsBody: () => <div data-testid="friends-body">Friends body</div>,
}));

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
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("Friends", () => {
  it("renders Mantine shell", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Friends />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByRole("heading", { name: "Friends" })).toBeInTheDocument();
    expect(screen.getByRole("banner", { name: "Screen header" })).toBeInTheDocument();
  });
});
