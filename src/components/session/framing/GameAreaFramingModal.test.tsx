import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { GameAreaFramingModal } from "./GameAreaFramingModal";
import type { GameAreaFramingController } from "./GameAreaFramingModal";

vi.mock("@/components/map/chrome/MapView", () => ({
  MapView: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="framing-map">{children}</div>
  ),
}));

vi.mock("@/components/map/layers/FramingPreviewLayers", () => ({
  FramingPreviewLayers: () => null,
}));

vi.mock("@/components/map/layers/GameAreaMask", () => ({
  GameAreaMask: () => null,
}));

const framing: GameAreaFramingController = {
  framingMode: "rectangle",
  setFramingMode: vi.fn(),
  focusBounds: null,
  previewGameArea: null,
  circleCenter: null,
  circleRadiusMeters: null,
  polygonVertices: [],
  hasValidDraft: false,
  userFramed: false,
  handleBoundsChange: vi.fn(),
  handleUserViewportFramed: vi.fn(),
  handleMapClick: vi.fn(),
  closePolygon: vi.fn(() => false),
  resetPolygonVertices: vi.fn(),
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
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

describe("GameAreaFramingModal", () => {
  it("renders Mantine framing chrome when open", () => {
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <GameAreaFramingModal
          open
          mapStyle="standard"
          framing={framing}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(screen.getByTestId("game-area-framing-modal")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Frame area" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
    expect(
      screen.getByRole("radiogroup", { name: "Play area shape" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("framing-map")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <GameAreaFramingModal
          open={false}
          mapStyle="standard"
          framing={framing}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </MantineProvider>,
    );
    expect(screen.queryByTestId("game-area-framing-modal")).toBeNull();
  });
});
