import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapSettingsSheet } from "./MapSettingsSheet";
import { renderWithRouter } from "../../test/renderWithRouter";

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
    mapTilt: "flat" as const,
    onMapTiltChange: vi.fn(),
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

  it("toggles map tilt and disables tilted option in low power mode", () => {
    const onMapTiltChange = vi.fn();

    const { rerender } = renderWithRouter(
      <MapSettingsSheet
        {...baseProps}
        general={{
          ...baseProps.general,
          onMapTiltChange,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tilted" }));
    expect(onMapTiltChange).toHaveBeenCalledWith("tilted");

    rerender(
      <MapSettingsSheet
        {...baseProps}
        general={{
          ...baseProps.general,
          lowPowerMode: true,
          onMapTiltChange,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Tilted" })).toBeDisabled();
  });
});
