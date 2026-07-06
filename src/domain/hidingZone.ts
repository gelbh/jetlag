import turfCircle from "@turf/circle";
import type { Feature, Polygon } from "geojson";
import type { GameArea } from "./annotations";
import type { LatLngTuple } from "./geometry";
import { isPointInGameArea } from "./geometry";

export interface TransitStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface HidingZoneStation {
  name: string;
  center: { lat: number; lng: number };
}

export interface HidingZoneRecord {
  hiderUid: string;
  sessionId: string;
  stationId: string;
  stationName: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  geometryJson: string;
  status: "confirmed";
  confirmedAt: string;
  originalStation?: HidingZoneStation;
  previousStations?: Array<HidingZoneStation & { movedAt: string }>;
  moveInProgress?: boolean;
}

export function buildHidingZoneCircle(
  center: LatLngTuple,
  radiusMeters: number,
): Feature<Polygon> {
  return turfCircle([center[1], center[0]], radiusMeters / 1000, {
    steps: 64,
    units: "kilometers",
  }) as Feature<Polygon>;
}

export function stationToLatLng(station: TransitStation): LatLngTuple {
  return [station.lat, station.lng];
}

export function isValidHidingStation(
  station: TransitStation,
  gameArea: GameArea,
): boolean {
  return isPointInGameArea([station.lat, station.lng], gameArea);
}

export function nearestStation(
  point: LatLngTuple,
  stations: readonly TransitStation[],
  maxDistanceMeters = 200,
): TransitStation | null {
  let best: TransitStation | null = null;
  let bestDistance = maxDistanceMeters;

  for (const station of stations) {
    const distance = haversineMeters(point, [station.lat, station.lng]);
    if (distance <= bestDistance) {
      best = station;
      bestDistance = distance;
    }
  }

  return best;
}

export function searchStations(
  query: string,
  stations: readonly TransitStation[],
  limit = 20,
): TransitStation[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...stations].slice(0, limit);
  }

  return stations
    .filter((station) => station.name.toLowerCase().includes(normalized))
    .slice(0, limit);
}

function haversineMeters(a: LatLngTuple, b: LatLngTuple): number {
  const earthRadius = 6_371_000;
  const latDelta = ((b[0] - a[0]) * Math.PI) / 180;
  const lngDelta = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

export function shortPlayerLabel(uid: string): string {
  return uid.slice(0, 4).toUpperCase();
}

export function hidingZonePreviewPositions(
  previewCircle: Feature<Polygon> | null,
): Array<[number, number]> {
  if (!previewCircle?.geometry.coordinates[0]) {
    return [];
  }

  return previewCircle.geometry.coordinates[0].map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );
}
