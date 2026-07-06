import { beforeEach, describe, expect, it } from "vitest";
import { useMapStore } from "./mapStore";
import { resetAllStores } from "../test/helpers/storeReset";

describe("mapStore", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("selects active tools", () => {
    useMapStore.getState().setActiveTool("pin");
    expect(useMapStore.getState().activeTool).toBe("pin");
  });

  it("toggles transit and basemap settings", () => {
    useMapStore.getState().setTransitEnabled(true);
    useMapStore.getState().setTransitLiveEnabled(true);
    useMapStore.getState().setMapStyle("satellite");

    expect(useMapStore.getState().transitEnabled).toBe(true);
    expect(useMapStore.getState().transitLiveEnabled).toBe(true);
    expect(useMapStore.getState().mapStyle).toBe("satellite");
  });

  it("updates individual layer visibility flags", () => {
    useMapStore.getState().setLayerVisibility("pin", false);
    expect(useMapStore.getState().layerVisibility.pin).toBe(false);
    expect(useMapStore.getState().layerVisibility.zone).toBe(true);
  });

  it("updates distance unit, screen wake lock, and low power preference", () => {
    useMapStore.getState().setDistanceUnit("metric");
    useMapStore.getState().setKeepScreenAwake(true);
    useMapStore.getState().setLowPowerMode(true);

    expect(useMapStore.getState().distanceUnit).toBe("metric");
    expect(useMapStore.getState().keepScreenAwake).toBe(true);
    expect(useMapStore.getState().lowPowerMode).toBe(true);
  });
});
