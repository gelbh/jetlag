import { describe, expect, it } from "vitest";
import {
  filterTransitRoutesForViewport,
  filterTransitStopsForViewport,
  filterTransitVehiclesForViewport,
  type MapViewportBounds,
} from "./transitViewport";
import type {
  TransitRouteLine,
  TransitStop,
  TransitVehicle,
} from "./transit";

const viewport: MapViewportBounds = {
  south: 51.4,
  west: -0.2,
  north: 51.6,
  east: 0.1,
};

describe("transitViewport", () => {
  it("keeps stops inside the viewport at zoom 13", () => {
    const stops: TransitStop[] = [
      {
        id: "in",
        name: "Inside",
        lat: 51.5,
        lng: 0,
        mode: "metro",
      },
      {
        id: "out",
        name: "Outside",
        lat: 52,
        lng: 0,
        mode: "metro",
      },
    ];

    expect(filterTransitStopsForViewport(stops, viewport, 13)).toEqual([
      stops[0],
    ]);
  });

  it("hides stops below zoom 12", () => {
    const stops: TransitStop[] = [
      {
        id: "in",
        name: "Inside",
        lat: 51.5,
        lng: 0,
        mode: "metro",
      },
    ];

    expect(filterTransitStopsForViewport(stops, viewport, 11)).toEqual([]);
  });

  it("keeps routes that intersect the viewport", () => {
    const routes: TransitRouteLine[] = [
      {
        id: "crossing",
        name: "Crossing",
        mode: "rail",
        positions: [
          [51.3, -0.1],
          [51.5, 0],
        ],
      },
      {
        id: "far",
        name: "Far",
        mode: "rail",
        positions: [
          [50, -1],
          [50.1, -0.9],
        ],
      },
    ];

    expect(filterTransitRoutesForViewport(routes, viewport)).toEqual([
      routes[0],
    ]);
  });

  it("keeps live vehicles inside the viewport", () => {
    const vehicles: TransitVehicle[] = [
      {
        id: "in",
        label: "Bus 1",
        lat: 51.5,
        lng: 0,
        mode: "bus",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "out",
        label: "Bus 2",
        lat: 52,
        lng: 0,
        mode: "bus",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    expect(filterTransitVehiclesForViewport(vehicles, viewport)).toEqual([
      vehicles[0],
    ]);
  });
});
