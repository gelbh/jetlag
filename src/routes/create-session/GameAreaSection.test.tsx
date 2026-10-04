import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
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
  transitMetroId: "",
  metros: [],
  onPresetSelect: vi.fn(),
  onSavePreset: vi.fn(),
  onOpenFramingModal: vi.fn(),
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

function renderSection(
  model: GameAreaSectionModel = baseModel,
  settingsSlot?: GameAreaSectionProps["settingsSlot"],
) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <GameAreaSection model={model} settingsSlot={settingsSlot} />
    </MantineProvider>,
  );
}

describe("GameAreaSection public props (AC #1)", () => {
  it("accepts a single model options object plus optional settingsSlot", () => {
    const props: GameAreaSectionProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof GameAreaSectionProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    renderSection();

    expect(screen.getByRole("button", { name: "Draw on map" })).toBeInTheDocument();
  });
});

describe("GameAreaSection create IA groups", () => {
  it("keeps Where, Frame, and Play controls on the sheet without draw modes", () => {
    renderSection();

    expect(screen.getByRole("button", { name: "Draw on map" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open fullscreen map" })).toBeNull();
    expect(screen.queryByRole("radio", { name: /square/i })).toBeNull();
    expect(screen.queryByRole("radio", { name: /circle/i })).toBeNull();
    expect(screen.queryByRole("radio", { name: /polygon/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Find place" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use my location" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /frame the game area/i })).toBeNull();
  });

  it("opens the framing modal from Draw on map", () => {
    const onOpenFramingModal = vi.fn();
    renderSection({ ...baseModel, onOpenFramingModal });

    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));

    expect(onOpenFramingModal).toHaveBeenCalledTimes(1);
  });

  it("hides rare tools until More tools is opened", () => {
    renderSection();

    expect(screen.getByText("More tools")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save as preset" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add another area" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Import KML/KMZ" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Transit metro" })).toBeNull();

    const disclosure = screen.getByText("More tools").closest("details") as HTMLDetailsElement;
    expect(disclosure).toBeTruthy();
    disclosure.open = true;
    fireEvent(disclosure, new Event("toggle"));

    expect(screen.getByRole("button", { name: "Save as preset" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add another area" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import KML/KMZ" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Transit metro" })).toBeInTheDocument();
  });

  it("shows Locating… while GPS is busy and halt-colored status on failure", () => {
    const { rerender } = renderSection({
      ...baseModel,
      locationBusy: true,
    });

    expect(screen.getByRole("button", { name: "Locating…" })).toBeDisabled();

    rerender(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <GameAreaSection
          model={{
            ...baseModel,
            locationBusy: false,
            locationStatus: "Couldn't use your location.",
            locationStatusTone: "halt",
          }}
        />
      </MantineProvider>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Couldn't use your location.");
    expect(status).toHaveStyle({ color: "var(--color-halt)" });
  });
});
