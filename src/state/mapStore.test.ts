import { beforeEach, describe, expect, it } from "vitest";
import { resetAllStores } from "../test/helpers/storeReset";
import { useMapStore } from "./mapStore";

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

  it("opens a tool preset without changing the active tool", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);

    expect(useMapStore.getState().toolPreset).toEqual({ tool: "radar", optionKey: 1609.344 });
    expect(useMapStore.getState().activeTool).toBe("none");
  });

  it("keeps a preset when another tool consumes", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);

    expect(useMapStore.getState().consumeToolPreset("photo")).toBeNull();
    expect(useMapStore.getState().toolPreset).toEqual({ tool: "radar", optionKey: 1609.344 });
  });

  it("consumes a preset once for its tool", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);

    expect(useMapStore.getState().consumeToolPreset("radar")).toBe(1609.344);
    expect(useMapStore.getState().toolPreset).toBeNull();
    expect(useMapStore.getState().consumeToolPreset("radar")).toBeNull();
  });

  it("defaults streetBasemap to light and persists dark", () => {
    expect(useMapStore.getState().streetBasemap).toBe("light");
    useMapStore.getState().setStreetBasemap("dark");
    expect(useMapStore.getState().streetBasemap).toBe("dark");
  });
});
