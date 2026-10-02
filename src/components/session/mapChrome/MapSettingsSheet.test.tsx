import { MantineProvider } from "@mantine/core";
import { fireEvent, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "@/test/renderWithRouter";
import { jetlagTheme } from "@/theme/theme";
import { MapSettingsSheet } from "./MapSettingsSheet";

function renderSettings(ui: ReactElement) {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

const baseProps = {
  open: true,
  onClose: vi.fn(),
  pendingWrites: 0,
  general: {
    showCurrentLocation: true,
    onShowCurrentLocationChange: vi.fn(),
    showAdminBoundaries: false,
    onShowAdminBoundariesChange: vi.fn(),
    keepScreenAwake: false,
    onKeepScreenAwakeChange: vi.fn(),
    lowPowerMode: false,
    onLowPowerModeChange: vi.fn(),
    distanceUnit: "imperial" as const,
    onDistanceUnitChange: vi.fn(),
    mapStyle: "standard" as const,
    onMapStyleChange: vi.fn(),
    streetBasemap: "light" as const,
    onStreetBasemapChange: vi.fn(),
    transitEnabled: false,
    transitLiveEnabled: false,
    transitLiveSupported: false,
    transitRouteFilter: "all" as const,
    metroLabel: null,
    loadingStatic: false,
    loadingLive: false,
    stopCount: 0,
    routeCount: 0,
    vehicleCount: 0,
    onToggleTransit: vi.fn(),
    onToggleLiveTransit: vi.fn(),
    onTransitRouteFilterChange: vi.fn(),
  },
  layers: {
    layerVisibility: {
      radar: true,
      thermometer: true,
      measuring: true,
      matching: true,
      zone: true,
      pin: true,
      draw: true,
      tentacle: true,
      transit: true,
    },
    onLayerVisibilityChange: vi.fn(),
  },
  session: {
    sessionCode: "ABCD",
    remoteSession: false,
    onClearMap: vi.fn(),
    onLeaveSession: vi.fn(),
  },
};

describe("MapSettingsSheet", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });
  it("switches settings tabs and toggles basemap", () => {
    const onMapStyleChange = vi.fn();

    renderSettings(
      <MapSettingsSheet
        {...baseProps}
        general={{
          ...baseProps.general,
          onMapStyleChange,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Satellite" }));

    expect(onMapStyleChange).toHaveBeenCalledWith("satellite");
  });

  it("shows OpenFreeMap attribution for street basemap and Esri for satellite", () => {
    renderSettings(<MapSettingsSheet {...baseProps} />);

    expect(
      screen.getByText(/OpenStreetMap contributors \(openstreetmap\.org\/copyright\)/),
    ).toBeInTheDocument();

    renderSettings(
      <MapSettingsSheet {...baseProps} general={{ ...baseProps.general, mapStyle: "satellite" }} />,
    );

    expect(screen.getByText(/Tiles © Esri/)).toBeInTheDocument();
  });

  it("merges layers into Map and keeps session admin off the default tab", () => {
    renderSettings(<MapSettingsSheet {...baseProps} />);

    expect(screen.getByText("Show my location")).toBeInTheDocument();
    expect(screen.getByText("Annotation layers")).toBeInTheDocument();
    expect(screen.getByText("Freehand")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Layers" })).not.toBeInTheDocument();
    expect(screen.queryByText("Keep screen awake")).not.toBeInTheDocument();
    expect(screen.queryByText("Leave session")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Session" }));

    expect(screen.getByText("Keep screen awake")).toBeInTheDocument();
    expect(screen.getByText("Low power mode")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave session" })).toBeInTheDocument();
  });

  it("puts join code under Game", () => {
    renderSettings(<MapSettingsSheet {...baseProps} />);

    expect(screen.queryByText("ABCD")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Game" }));

    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText("Game rules")).toBeInTheDocument();
  });
});
