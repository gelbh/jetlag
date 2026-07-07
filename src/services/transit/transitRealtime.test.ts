import { describe, expect, it } from "vitest";
import { normalizeProxyVehicles } from "./transitRealtime";

describe("transitRealtime normalization", () => {
  it("normalizes proxy vehicle payloads", () => {
    const vehicles = normalizeProxyVehicles([
      {
        id: "vehicle-1",
        label: "Train 1",
        lat: 53.35,
        lng: -6.25,
        bearing: 90,
        routeRef: "DART",
        mode: "rail",
      },
      {
        lat: Number.NaN,
        lng: -6.25,
      },
    ]);

    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]?.routeRef).toBe("DART");
    expect(vehicles[0]?.bearing).toBe(90);
    expect(vehicles[0]?.mode).toBe("rail");
  });
});
