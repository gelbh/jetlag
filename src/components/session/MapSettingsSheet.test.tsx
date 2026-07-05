import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapSettingsSheet } from "./MapSettingsSheet";
import { renderWithRouter } from "../../test/renderWithRouter";

const baseProps = {
  open: true,
  onClose: vi.fn(),
  pendingWrites: 0,
  showCurrentLocation: true,
  onShowCurrentLocationChange: vi.fn(),
  keepScreenAwake: false,
  onKeepScreenAwakeChange: vi.fn(),
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
  distanceUnit: "imperial" as const,
  onDistanceUnitChange: vi.fn(),
  mapStyle: "standard" as const,
  onMapStyleChange: vi.fn(),
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
  onClearMap: vi.fn(),
  sessionCode: "ABCD",
  remoteSession: false,
};

describe("MapSettingsSheet", () => {
  it("switches settings tabs and toggles basemap", () => {
    const onMapStyleChange = vi.fn();

    renderWithRouter(
      <MapSettingsSheet
        {...baseProps}
        onMapStyleChange={onMapStyleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Satellite" }));

    expect(onMapStyleChange).toHaveBeenCalledWith("satellite");
  });
});
