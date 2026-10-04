import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import {
  GameAreaSection,
  type GameAreaSectionModel,
  type GameAreaSectionProps,
} from "./GameAreaSection";

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

const baseModel: GameAreaSectionModel = {
  bundledPresetSelectGroups: [],
  favouritePresetSelectOptions: [],
  userPresets: [],
  loading: false,
  verifyingAccess: false,
  searchLoading: false,
  importLoading: false,
  importFileInputRef: createRef<HTMLInputElement | null>(),
  locationQuery: "",
  searchResults: [],
  selectedPlaceId: null,
  selectedPlace: null,
  selectedAreas: [],
  previewGameArea: null,
  manualFramingActive: false,
  framing: {
    framingMode: "rectangle",
    polygonVertices: [],
    setFramingMode: vi.fn(),
    closePolygon: vi.fn(),
    resetPolygonVertices: vi.fn(),
  } as unknown as GameAreaSectionModel["framing"],
  transitMetroId: "",
  metros: [],
  onPresetSelect: vi.fn(),
  onSavePreset: vi.fn(),
  onOpenFramingModal: vi.fn(),
  onFramingModeChange: vi.fn(),
  onRemoveSelectedArea: vi.fn(),
  onLocationQueryChange: vi.fn(),
  onSearch: vi.fn(),
  onAddCurrentArea: vi.fn(),
  onBoundaryImport: vi.fn(),
  onApplyPlace: vi.fn(),
  onRequestLocationBias: vi.fn(),
  locationStatus: null,
  locationStatusTone: null,
  locationBusy: false,
  onTransitMetroChange: vi.fn(),
};

describe("GameAreaSection public props (AC #1)", () => {
  it("accepts a single model options object plus optional settingsSlot", () => {
    const props: GameAreaSectionProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof GameAreaSectionProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <GameAreaSection {...props} />
      </MantineProvider>,
    );

    expect(screen.getByRole("heading", { name: /frame the game area/i })).toBeInTheDocument();
  });
});
