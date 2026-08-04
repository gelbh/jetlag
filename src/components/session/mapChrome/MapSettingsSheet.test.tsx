import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapSettingsSheet } from "./MapSettingsSheet";
import { renderWithRouter } from "@/test/renderWithRouter";

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
  it("switches settings tabs and toggles basemap", () => {
    const onMapStyleChange = vi.fn();

    renderWithRouter(
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
    renderWithRouter(<MapSettingsSheet {...baseProps} />);

    expect(
      screen.getByText(/OpenStreetMap contributors \(openstreetmap\.org\/copyright\)/),
    ).toBeInTheDocument();

    renderWithRouter(
      <MapSettingsSheet
        {...baseProps}
        general={{ ...baseProps.general, mapStyle: "satellite" }}
      />,
    );

    expect(screen.getByText(/Tiles © Esri/)).toBeInTheDocument();
  });

  it("keeps session admin off the default map essentials tab", () => {
    renderWithRouter(<MapSettingsSheet {...baseProps} />);

    expect(screen.getByText("Show my location")).toBeInTheDocument();
    expect(screen.queryByText("Keep screen awake")).not.toBeInTheDocument();
    expect(screen.queryByText("Low power mode")).not.toBeInTheDocument();
    expect(screen.queryByText("Leave session")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Session" }));

    expect(screen.getByRole("button", { name: "Device & alerts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave session" })).toBeInTheDocument();
  });
});
