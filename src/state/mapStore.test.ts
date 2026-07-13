import { beforeEach, describe, expect, it } from "vitest";
import { useMapStore } from "./mapStore";
import { resetAllStores } from "../test/helpers/storeReset";

describe("mapStore", () => {
  beforeEach(() => {
    localStorage.clear();
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
    useMapStore.getState().setMapTilt("tilted");

    expect(useMapStore.getState().transitEnabled).toBe(true);
    expect(useMapStore.getState().transitLiveEnabled).toBe(true);
    expect(useMapStore.getState().mapStyle).toBe("satellite");
    expect(useMapStore.getState().mapTilt).toBe("tilted");
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

  it("updates spectator perspective for the current session view", () => {
    useMapStore.getState().setObserverPerspective("seeker");
    expect(useMapStore.getState().observerPerspective).toBe("seeker");

    useMapStore.getState().resetObserverPerspective();
    expect(useMapStore.getState().observerPerspective).toBe("both");
  });

  it("persists map tilt preference to storage", () => {
    localStorage.clear();
    useMapStore.getState().setMapTilt("tilted");

    const stored = JSON.parse(localStorage.getItem("jetlag-map") ?? "{}");
    expect(stored.state?.mapTilt).toBe("tilted");
  });

  it("rehydrates map tilt from storage and defaults to flat when absent", async () => {
    localStorage.setItem(
      "jetlag-map",
      JSON.stringify({
        state: { mapStyle: "standard", mapTilt: "tilted" },
        version: 0,
      }),
    );
    await useMapStore.persist.rehydrate();
    expect(useMapStore.getState().mapTilt).toBe("tilted");

    localStorage.setItem(
      "jetlag-map",
      JSON.stringify({ state: { mapStyle: "standard" }, version: 0 }),
    );
    resetAllStores();
    await useMapStore.persist.rehydrate();
    expect(useMapStore.getState().mapTilt).toBe("flat");
  });
});
