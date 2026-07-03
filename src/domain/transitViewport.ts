import type { LatLngBounds } from "leaflet";
import type { LatLngTuple } from "./geometry";
import type {
  TransitRouteLine,
  TransitStop,
  TransitVehicle,
} from "./transit";

export interface MapViewportBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function latLngBoundsToViewport(bounds: LatLngBounds): MapViewportBounds {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  return {
    south: southWest.lat,
    west: southWest.lng,
    north: northEast.lat,
    east: northEast.lng,
  };
}

function pointInViewport(
  lat: number,
  lng: number,
  viewport: MapViewportBounds,
): boolean {
  return (
    lat >= viewport.south &&
    lat <= viewport.north &&
    lng >= viewport.west &&
    lng <= viewport.east
  );
}

function segmentIntersectsViewport(
  a: LatLngTuple,
  b: LatLngTuple,
  viewport: MapViewportBounds,
): boolean {
  if (pointInViewport(a[0], a[1], viewport)) {
    return true;
  }

  if (pointInViewport(b[0], b[1], viewport)) {
    return true;
  }

  const routeSouth = Math.min(a[0], b[0]);
  const routeNorth = Math.max(a[0], b[0]);
  const routeWest = Math.min(a[1], b[1]);
  const routeEast = Math.max(a[1], b[1]);

  return !(
    routeNorth < viewport.south ||
    routeSouth > viewport.north ||
    routeWest > viewport.east ||
    routeEast < viewport.west
  );
}

export function filterTransitStopsForViewport(
  stops: readonly TransitStop[],
  viewport: MapViewportBounds | null,
  zoom: number | null,
): TransitStop[] {
  if (!viewport) {
    return [...stops];
  }

  if (zoom !== null && zoom < 12) {
    return [];
  }

  return stops.filter((stop) => pointInViewport(stop.lat, stop.lng, viewport));
}

export function filterTransitRoutesForViewport(
  routes: readonly TransitRouteLine[],
  viewport: MapViewportBounds | null,
): TransitRouteLine[] {
  if (!viewport) {
    return [...routes];
  }

  return routes.filter((route) => {
    if (route.positions.length === 0) {
      return false;
    }

    for (let index = 1; index < route.positions.length; index += 1) {
      const previous = route.positions[index - 1]!;
      const current = route.positions[index]!;

      if (segmentIntersectsViewport(previous, current, viewport)) {
        return true;
      }
    }

    return pointInViewport(
      route.positions[0]![0],
      route.positions[0]![1],
      viewport,
    );
  });
}

export function filterTransitVehiclesForViewport(
  vehicles: readonly TransitVehicle[],
  viewport: MapViewportBounds | null,
): TransitVehicle[] {
  if (!viewport) {
    return [...vehicles];
  }

  return vehicles.filter((vehicle) =>
    pointInViewport(vehicle.lat, vehicle.lng, viewport),
  );
}
