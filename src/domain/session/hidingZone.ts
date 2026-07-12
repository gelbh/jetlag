import turfCircle from "@turf/circle";
import type { Feature, Polygon } from "geojson";
import type { GameArea } from "../map/annotations";
import type { LatLngTuple } from "../geometry/geometry";
import { isPointInGameArea } from "../geometry/geometry";
import { haversineMeters } from "../geometry/distance";

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

const STATION_DEDUPE_PROXIMITY_METERS = 120;

function normalizedStationName(name: string): string {
  return name.trim().toLowerCase();
}

export function dedupeTransitStations(
  stations: readonly TransitStation[],
  proximityMeters = STATION_DEDUPE_PROXIMITY_METERS,
): TransitStation[] {
  const buckets = new Map<string, TransitStation[]>();

  for (const station of stations) {
    const name = normalizedStationName(station.name);
    const bucket = buckets.get(name);
    if (bucket) {
      bucket.push(station);
    } else {
      buckets.set(name, [station]);
    }
  }

  const result: TransitStation[] = [];

  for (const bucket of buckets.values()) {
    const kept: TransitStation[] = [];

    for (const station of bucket) {
      const duplicate = kept.find(
        (existing) =>
          haversineMeters(
            [existing.lat, existing.lng],
            [station.lat, station.lng],
          ) <= proximityMeters,
      );

      if (!duplicate) {
        kept.push(station);
      }
    }

    result.push(...kept);
  }

  return result;
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

export const MANUAL_STATION_ID = "manual";

export { haversineMeters } from "../geometry/distance";

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
