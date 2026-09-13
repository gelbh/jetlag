import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GamePresetEditor, GamePresetList } from "./GamePresets";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { renderWithRouter } from "../test/renderWithRouter";
import { RouteTransitionTestProvider } from "../test/RouteTransitionTestProvider";
import { useGamePresetStore } from "../state/gamePresetStore";
import { mergeBundledPresets } from "../domain/regions/bundledGamePresets";

const mockUsePlayerUiMantine = vi.fn(() => false);

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

vi.mock("../components/map/chrome/MapView", () => ({
  MapView: () => <div data-testid="framing-map" />,
}));

vi.mock("../components/map/layers/GameAreaMask", () => ({
  GameAreaMask: () => null,
}));

vi.mock("../components/map/layers/FramingPreviewLayers", () => ({
  FramingPreviewLayers: () => null,
}));

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
  useGamePresetStore.setState({ presets: mergeBundledPresets([]) });
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

describe("GamePresetList gate", () => {
  it("renders Legacy title when flag is off", () => {
    renderWithRouter(<GamePresetList />, { resetStores: false });
    expect(
      screen.getByRole("heading", { name: "Custom games" }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-player-ux-world="mantine"]')).toBeNull();
    expect(
      document.querySelector('[data-player-ux-world="survey"].home-poster'),
    ).toBeTruthy();
  });

  it("renders Mantine shell when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionTestProvider>
            <GamePresetList />
          </RouteTransitionTestProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Custom games" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-player-ux-world="mantine"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-player-ux-world="survey"]'),
    ).toBeTruthy();
  });
});

describe("GamePresetEditor gate", () => {
  it("renders Legacy framing control when flag is off", () => {
    renderWithRouter(<GamePresetEditor />, {
      route: "/presets/new",
      resetStores: false,
    });
    expect(
      screen.getByRole("button", { name: "Open fullscreen map" }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-player-ux-world="mantine"]')).toBeNull();
    expect(
      document.querySelector('[data-player-ux-world="survey"].home-poster'),
    ).toBeTruthy();
  });

  it("renders Mantine shell with framing control when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter initialEntries={["/presets/new"]}>
          <RouteTransitionTestProvider>
            <GamePresetEditor />
          </RouteTransitionTestProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "New preset" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open fullscreen map" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-player-ux-world="mantine"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-player-ux-world="survey"]'),
    ).toBeTruthy();
  });
});
