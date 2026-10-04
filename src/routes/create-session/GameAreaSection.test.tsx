import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolePicker } from "@/components/session/identity/RolePicker";
import { defaultAdvancedSessionSettings } from "@/domain/session/tools/advancedSessionSettings";
import { jetlagTheme } from "@/theme/theme";
import {
  type CreateSheetStep,
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
  loadedPreset: null,
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
  onTransitMetroChange: vi.fn(),
};

function renderSection(
  model: GameAreaSectionModel = baseModel,
  settingsSlot?: GameAreaSectionProps["settingsSlot"],
  step: CreateSheetStep = "where",
  playSlot?: GameAreaSectionProps["playSlot"],
  advancedSlot?: GameAreaSectionProps["advancedSlot"],
) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <GameAreaSection
        model={model}
        settingsSlot={settingsSlot}
        playSlot={playSlot}
        advancedSlot={advancedSlot}
        step={step}
      />
    </MantineProvider>,
  );
}

describe("GameAreaSection public props (AC #1)", () => {
  it("accepts model, optional settingsSlot, and required step", () => {
    const props: GameAreaSectionProps = {
      model: baseModel,
      step: "where",
    };
    const keys = Object.keys(props) as Array<keyof GameAreaSectionProps>;
    expect(keys.sort()).toEqual(["model", "step"].sort());
    expect(keys.length).toBeLessThanOrEqual(10);
    renderSection();
    expect(screen.getByRole("button", { name: "Find place" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Draw on map" })).toBeNull();
  });
});

describe("GameAreaSection create wizard steps", () => {
  it("Where shows search without GPS or Frame draw or Play more tools", () => {
    renderSection(baseModel, undefined, "where");
    expect(screen.getByRole("button", { name: "Find place" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /game preset/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Use my location" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Draw on map" })).toBeNull();
    expect(screen.queryByText("More tools")).toBeNull();
  });

  it("Preset source shows the preset picker and hides search", () => {
    renderSection(baseModel, undefined, "where");
    fireEvent.click(screen.getByRole("button", { name: "Preset" }));
    expect(screen.getByRole("combobox", { name: /game preset/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Find place" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: /city, county, state, or country/i })).toBeNull();
  });

  it("switches to Preset when a loaded preset id appears after Search", () => {
    const { rerender } = renderSection(baseModel, undefined, "where");
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("aria-pressed", "true");

    rerender(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <GameAreaSection
          model={{
            ...baseModel,
            loadedPreset: {
              id: "preset-dublin",
              name: "Dublin medium",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              schemaVersion: 1,
              gameSize: "medium",
              distanceUnit: "metric",
              advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
              placeLabel: "Dublin, Ireland",
              migrationStatus: "ok",
            },
          }}
          step="where"
        />
      </MantineProvider>,
    );

    expect(screen.getByRole("button", { name: "Preset" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows loaded preset details on the Preset source", () => {
    renderSection(
      {
        ...baseModel,
        loadedPreset: {
          id: "preset-dublin",
          name: "Dublin medium",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          schemaVersion: 1,
          gameSize: "medium",
          distanceUnit: "metric",
          advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
          placeLabel: "Dublin, Ireland",
          migrationStatus: "ok",
        },
      },
      undefined,
      "where",
    );
    expect(screen.getByRole("button", { name: "Preset" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/medium · metric · Dublin, Ireland/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /game preset/i })).toHaveValue("preset-dublin");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows the bundled preset flag next to loaded details", () => {
    renderSection(
      {
        ...baseModel,
        loadedPreset: {
          id: "bundled:dublin-city",
          name: "Dublin City",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          schemaVersion: 1,
          gameSize: "medium",
          distanceUnit: "metric",
          advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
          placeLabel: "Dublin, Ireland",
          migrationStatus: "ok",
        },
      },
      undefined,
      "where",
    );
    const flag = screen.getByRole("img", { name: "Dublin City Council" });
    expect(flag).toHaveAttribute("src", "/region-flags/dcc.png");
  });

  it("double-clicking the place search field selects the whole query", () => {
    renderSection(
      { ...baseModel, locationQuery: "Amsterdam, North Holland, Netherlands" },
      undefined,
      "where",
    );
    const input = screen.getByRole("textbox", { name: /city, county, state, or country/i });
    fireEvent.doubleClick(input);
    expect(input).toHaveProperty("selectionStart", 0);
    expect(input).toHaveProperty("selectionEnd", "Amsterdam, North Holland, Netherlands".length);
  });

  it("shows stacked area chips on Search, not only Draw", () => {
    renderSection(
      {
        ...baseModel,
        selectedAreas: [
          {
            type: "Polygon",
            coordinates: [
              [
                [-6.3, 53.3],
                [-6.2, 53.3],
                [-6.2, 53.4],
                [-6.3, 53.4],
                [-6.3, 53.3],
              ],
            ],
          },
        ],
      },
      undefined,
      "where",
    );
    expect(screen.getByRole("button", { name: /Area 1 · Remove/ })).toBeInTheDocument();
  });

  it("Draw source shows Draw on map and not Find place", () => {
    renderSection(baseModel, undefined, "where");
    fireEvent.click(screen.getByRole("button", { name: /^Draw$/ }));
    expect(screen.getByRole("button", { name: "Draw on map" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Find place" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /game preset/i })).toBeNull();
  });

  it("opens the framing modal from Draw on map", () => {
    const onOpenFramingModal = vi.fn();
    renderSection({ ...baseModel, onOpenFramingModal }, undefined, "where");
    fireEvent.click(screen.getByRole("button", { name: /^Draw$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));
    expect(onOpenFramingModal).toHaveBeenCalledTimes(1);
  });

  it("owns the place recap as Playing in on Rules", () => {
    renderSection(
      {
        ...baseModel,
        selectedPlace: {
          id: "1",
          displayName: "Dublin, Ireland",
          center: [53.35, -6.26],
          bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
          placeCategory: "city",
          approximateAreaSqMi: 45,
        },
      },
      undefined,
      "rules",
    );
    expect(screen.getByText("Playing in Dublin, Ireland")).toBeInTheDocument();
  });

  it("hides rare tools and advanced until More tools is opened on Rules", () => {
    renderSection(baseModel, undefined, "rules", undefined, <p>Hiding zone dump</p>);
    expect(screen.getByText("More tools")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save as preset" })).toBeNull();
    expect(screen.getByText("Hiding zone dump")).not.toBeVisible();
    const disclosure = screen.getByText("More tools").closest("details") as HTMLDetailsElement;
    disclosure.open = true;
    fireEvent(disclosure, new Event("toggle"));
    expect(screen.getByRole("button", { name: "Save as preset" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import KML/KMZ" })).toBeInTheDocument();
    expect(screen.getByText("Hiding zone dump")).toBeInTheDocument();
  });

  it("puts search results in a separate inset list under Where", () => {
    const dublin = {
      id: "1",
      displayName: "Dublin, Ireland",
      center: [53.35, -6.26] as [number, number],
      bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
      placeCategory: "city" as const,
      approximateAreaSqMi: 45,
    };
    renderSection({ ...baseModel, searchResults: [dublin] }, undefined, "where");
    const row = screen.getByRole("button", { name: /Dublin, Ireland/ });
    const resultsGroup = row.closest(".jl-inset-group");
    const whereGroup = screen
      .getByRole("textbox", { name: /city, county, state, or country/i })
      .closest(".jl-inset-group");
    expect(resultsGroup).toBeTruthy();
    expect(resultsGroup).not.toBe(whereGroup);
  });

  it("separates Where result rows with inset hairlines", () => {
    const dublin = {
      id: "1",
      displayName: "Dublin, Ireland",
      center: [53.35, -6.26] as [number, number],
      bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
      placeCategory: "city" as const,
      approximateAreaSqMi: 45,
    };
    const cork = {
      id: "2",
      displayName: "Cork, Ireland",
      center: [51.9, -8.47] as [number, number],
      bounds: { south: 51.8, west: -8.6, north: 52.0, east: -8.3 },
      placeCategory: "city" as const,
      approximateAreaSqMi: 30,
    };
    renderSection({ ...baseModel, searchResults: [dublin, cork] }, undefined, "where");
    const first = screen.getByRole("button", { name: /Dublin, Ireland/ });
    expect(first.previousElementSibling?.getAttribute("aria-hidden")).not.toBe("true");
    const second = screen.getByRole("button", { name: /Cork, Ireland/ });
    expect(second.previousElementSibling?.getAttribute("aria-hidden")).toBe("true");
  });

  it("Rules keeps settings out of the More tools dump", () => {
    renderSection(baseModel, <p>Game size tiles</p>, "rules");
    expect(screen.getByText("Game size tiles")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save as preset" })).toBeNull();
  });

  it("uses inset groups and NativeSelect instead of field-input selects", () => {
    renderSection(baseModel, undefined, "where");
    fireEvent.click(screen.getByRole("button", { name: "Preset" }));
    expect(document.querySelector(".jl-inset-group")).toBeTruthy();
    expect(document.querySelector("select.field-input")).toBeNull();
    expect(screen.getByRole("combobox", { name: /game preset/i })).toBeInTheDocument();
  });

  it("does not double-pad the groups wrapper when NestedSplitLayout already pads", () => {
    renderSection(baseModel, undefined, "where");
    const groupsWrapper = document.querySelector(".jl-inset-group")?.closest(".mt-4");
    expect(groupsWrapper).toBeTruthy();
    expect(groupsWrapper).toHaveClass("space-y-5");
    expect(groupsWrapper).not.toHaveClass("px-4");
  });

  it("Play playSlot renders role radio cards", () => {
    renderSection(
      baseModel,
      undefined,
      "play",
      <RolePicker value="seeker" onChange={() => undefined} />,
    );

    expect(screen.getByRole("radiogroup", { name: "Player side" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Seeker/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Hider/ })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Your side" })).toBeNull();
  });
});
