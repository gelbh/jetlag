import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolePicker } from "@/components/session/identity/RolePicker";
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
  step: CreateSheetStep = "where",
) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <GameAreaSection model={model} settingsSlot={settingsSlot} step={step} />
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
  it("Where shows search and GPS without Frame draw or Play more tools", () => {
    renderSection(baseModel, undefined, "where");
    expect(screen.getByRole("button", { name: "Find place" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use my location" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Draw on map" })).toBeNull();
    expect(screen.queryByText("More tools")).toBeNull();
  });

  it("Frame shows Draw on map and not Find place", () => {
    renderSection(baseModel, undefined, "frame");
    expect(screen.getByRole("button", { name: "Draw on map" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Find place" })).toBeNull();
  });

  it("opens the framing modal from Draw on map", () => {
    const onOpenFramingModal = vi.fn();
    renderSection({ ...baseModel, onOpenFramingModal }, undefined, "frame");
    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));
    expect(onOpenFramingModal).toHaveBeenCalledTimes(1);
  });

  it("hides rare tools until More tools is opened on Play", () => {
    renderSection(baseModel, undefined, "play");
    expect(screen.getByText("More tools")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save as preset" })).toBeNull();
    const disclosure = screen.getByText("More tools").closest("details") as HTMLDetailsElement;
    disclosure.open = true;
    fireEvent(disclosure, new Event("toggle"));
    expect(screen.getByRole("button", { name: "Save as preset" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import KML/KMZ" })).toBeInTheDocument();
  });

  it("Use my location has no trailing caret", () => {
    renderSection(baseModel, undefined, "where");
    const gps = screen.getByRole("button", { name: "Use my location" });
    expect(gps.querySelectorAll("svg").length).toBe(1);
  });

  it("inset search results sit outside the Where InsetGroup", () => {
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
    expect(row.closest(".jl-inset-group")).toBeNull();
  });

  it("skips the leading hairline before Where results outside the group", () => {
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

  it("Play settingsSlot uses more than one inset group", () => {
    renderSection(
      baseModel,
      <>
        <div className="jl-inset-group">side</div>
        <div className="jl-inset-group">size</div>
      </>,
      "play",
    );
    expect(document.querySelectorAll(".jl-inset-group").length).toBeGreaterThan(1);
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
          step="where"
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
    expect(status).toHaveClass("mt-2", "px-1");
  });

  it("uses inset groups and NativeSelect instead of field-input selects", () => {
    renderSection(baseModel, undefined, "where");
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

  it("Play settingsSlot renders compact role control inside the Play group", () => {
    renderSection(
      baseModel,
      <RolePicker value="seeker" onChange={() => undefined} compact />,
      "play",
    );

    expect(screen.getByRole("tablist", { name: "Your side" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Seeker" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Hider" })).toBeInTheDocument();
  });
});
