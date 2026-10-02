import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import {
  MapSettingsGeneralTab,
  type MapSettingsGeneralTabModel,
  type MapSettingsGeneralTabProps,
} from "./GeneralTab";

const baseModel: MapSettingsGeneralTabModel = {
  showCurrentLocation: true,
  onShowCurrentLocationChange: vi.fn(),
  showAdminBoundaries: false,
  onShowAdminBoundariesChange: vi.fn(),
  lowPowerMode: false,
  distanceUnit: "imperial",
  onDistanceUnitChange: vi.fn(),
  mapStyle: "standard",
  onMapStyleChange: vi.fn(),
  streetBasemap: "light",
  onStreetBasemapChange: vi.fn(),
  transitEnabled: false,
  transitLiveEnabled: false,
  transitLiveSupported: false,
  transitRouteFilter: "all",
  metroLabel: null,
  loadingStatic: false,
  loadingLive: false,
  stopCount: 0,
  routeCount: 0,
  vehicleCount: 0,
  onToggleTransit: vi.fn(),
  onToggleLiveTransit: vi.fn(),
  onTransitRouteFilterChange: vi.fn(),
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
};

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

describe("MapSettingsGeneralTab public props (AC #1 / #4)", () => {
  it("accepts a single model options object", () => {
    const props: MapSettingsGeneralTabProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof MapSettingsGeneralTabProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapSettingsGeneralTab {...props} />
      </MantineProvider>,
    );

    expect(screen.getByText("Show my location")).toBeInTheDocument();
    expect(screen.getByText("Annotation layers")).toBeInTheDocument();
  });
});
