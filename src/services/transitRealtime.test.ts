import { describe, expect, it } from "vitest";
import {
  normalizeGtfsRtVehicleEntities,
  normalizeTransitlandVehicles,
} from "./transitRealtime";

describe("transitRealtime normalization", () => {
  const bounds = {
    south: 53.3,
    west: -6.3,
    north: 53.4,
    east: -6.2,
  };

  it("filters indexed vehicle positions to the game bounds", () => {
    const vehicles = normalizeTransitlandVehicles(
      {
        vehicle_positions: [
          {
            id: 1,
            vehicle: { label: "Bus 1" },
            position: { latitude: 53.35, longitude: -6.25 },
            trip: { route_id: "46A" },
          },
          {
            id: 2,
            vehicle: { label: "Bus 2" },
            position: { latitude: 52.0, longitude: -6.25 },
          },
        ],
      },
      bounds,
    );

    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]?.label).toBe("Bus 1");
  });

  it("filters GTFS-RT vehicle entities to the game bounds", () => {
    const vehicles = normalizeGtfsRtVehicleEntities(
      {
        entity: [
          {
            id: "vehicle-1",
            vehicle: {
              vehicle: { label: "Train 1" },
              trip: { routeId: "DART" },
              position: { latitude: 53.35, longitude: -6.25, bearing: 90 },
            },
          },
        ],
      },
      bounds,
    );

    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]?.routeRef).toBe("DART");
    expect(vehicles[0]?.bearing).toBe(90);
  });
});
