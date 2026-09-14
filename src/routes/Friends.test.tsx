import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Friends } from "./Friends";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { renderWithRouter } from "../test/renderWithRouter";

const mockUsePlayerUiMantine = vi.fn(() => false);

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

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

vi.mock("../components/friends/FriendsPanel", () => ({
  FriendsPanel: () => <div data-testid="friends-panel">Friends panel</div>,
}));

vi.mock("../components/friends/FriendsIosBody", () => ({
  FriendsIosBody: () => <div data-testid="friends-ios-body">Friends iOS body</div>,
}));

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
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

describe("Friends gate", () => {
  it("renders Legacy title when flag is off", () => {
    renderWithRouter(<Friends />);
    expect(screen.getByRole("heading", { name: "Friends" })).toBeInTheDocument();
    expect(document.querySelector('[data-player-ux-world="mantine"]')).toBeNull();
  });

  it("renders Mantine shell when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Friends />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByRole("heading", { name: "Friends" })).toBeInTheDocument();
    expect(screen.getByRole("banner", { name: "Screen header" })).toBeInTheDocument();
    expect(
      document.querySelector('[data-player-ux-world="mantine"]'),
    ).toBeTruthy();
  });
});
