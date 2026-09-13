import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateMantine } from "./CreateMantine";
import { jetlagMantineTheme } from "@/theme/mantineTheme";

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => vi.fn(),
}));

vi.mock("@/components/map/chrome/MapView", () => ({
  MapView: () => <div data-testid="create-map" />,
}));

vi.mock("@/components/map/layers/GameAreaMask", () => ({
  GameAreaMask: () => null,
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureAnonymousUser: vi.fn(),
  getFirebaseAuth: () => ({ currentUser: null }),
}));

vi.mock("@/services/session/gameAreaPreload", () => ({
  preloadGameAreaCaches: vi.fn(),
  preloadCriticalGameAreaCaches: vi.fn(async () => undefined),
}));

vi.mock("@/services/geo/elevation/seaLevelProgressive", () => ({
  startSeaLevelBackgroundSampling: vi.fn(),
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
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

describe("CreateMantine", () => {
  it("renders Mantine Back control and Survey confirm footer", () => {
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <CreateMantine />
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(screen.getByRole("link", { name: /^back$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm game area/i }),
    ).toBeInTheDocument();
    const root = document.querySelector(
      '[data-player-ux-world="survey"].jl-create-session',
    );
    expect(root).toBeTruthy();
  });
});