import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Premium } from "./Premium";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { renderWithRouter } from "../test/renderWithRouter";
import { RouteTransitionTestProvider } from "../test/RouteTransitionTestProvider";

const mockUsePlayerUiMantine = vi.fn(() => false);

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureAnonymousUser: vi.fn(),
  waitForAuthStateReady: vi.fn(async () => undefined),
  getFirebaseAuth: () => ({
    currentUser: null,
    onAuthStateChanged: (callback: (user: null) => void) => {
      callback(null);
      return () => {};
    },
  }),
}));

vi.mock("@/hooks/billing/usePremiumEntitlements", () => ({
  usePremiumEntitlements: () => ({
    entitlements: null,
    loading: false,
    hydrated: true,
    refresh: vi.fn(),
    setEntitlements: vi.fn(),
  }),
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
});

describe("Premium gate", () => {
  it("renders Legacy title when flag is off", () => {
    renderWithRouter(<Premium />);
    expect(screen.getByRole("heading", { name: "Premium" })).toBeInTheDocument();
    expect(document.querySelector('[data-player-ux-world="mantine"]')).toBeNull();
  });

  it("renders Mantine shell when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionTestProvider>
            <Premium />
          </RouteTransitionTestProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByRole("heading", { name: "Premium" })).toBeInTheDocument();
    expect(
      document.querySelector('[data-player-ux-world="mantine"]'),
    ).toBeTruthy();
  });
});
