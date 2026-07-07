import type { GameArea } from "../../domain/map/annotations";
import {
  dedupeTransitStations,
  type TransitStation,
} from "../../domain/session/hidingZone";
import type { BoundingBox } from "../../domain/geometry/gameAreaBounds";
import { isPointInGameArea } from "../../domain/geometry/geometry";

export const TRANSIT_STOP_OVERPASS_LIMIT = 250;

export type OverpassTransitStopElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function formatOverpassBbox(bbox: BoundingBox): string {
  return `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
}

export function buildTransitStopOverpassQuery(
  bbox: BoundingBox,
  limit = TRANSIT_STOP_OVERPASS_LIMIT,
  output: "center" | "body" = "center",
): string {
  const formatted = formatOverpassBbox(bbox);

  return `
    [out:json][timeout:25];
  (
    node["railway"="station"](${formatted});
    node["railway"="halt"](${formatted});
    node["railway"="stop"](${formatted});
    node["public_transport"="stop_position"](${formatted});
    node["public_transport"="platform"]["bus"="yes"](${formatted});
    node["highway"="bus_stop"](${formatted});
    node["railway"="tram_stop"](${formatted});
    node["station"="subway"](${formatted});
    node["station"="light_rail"](${formatted});
  );
  out ${output} ${limit};
  `;
}

export function transitStopDisplayName(
  tags: Record<string, string> | undefined,
): string {
  if (!tags) {
    return "Transit stop";
  }

  const ref = tags.ref?.trim();
  if (ref) {
    return ref;
  }

  const localRef = tags.local_ref?.trim();
  if (localRef) {
    return localRef;
  }

  const candidates = [
    tags.name,
    tags["name:en"],
    tags.official_name,
    tags["official_name:en"],
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "Transit stop";
}

function isActiveTransitStop(tags: Record<string, string> | undefined): boolean {
  if (!tags) {
    return false;
  }

  if (tags.disused === "yes" || tags.abandoned === "yes") {
    return false;
  }

  return true;
}

export function parseOverpassTransitStops(
  elements: readonly OverpassTransitStopElement[],
  gameArea: GameArea,
): TransitStation[] {
  const seen = new Set<string>();
  const stations: TransitStation[] = [];

  for (const element of elements) {
    if (!isActiveTransitStop(element.tags)) {
      continue;
    }

    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;

    if (lat === undefined || lng === undefined) {
      continue;
    }

    if (!isPointInGameArea([lat, lng], gameArea)) {
      continue;
    }

    const id = String(element.id);
    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    stations.push({
      id,
      name: transitStopDisplayName(element.tags),
      lat,
      lng,
    });
  }

  return dedupeTransitStations(stations);
}

export function overpassTransitStopsToMatchingFeatures(
  elements: readonly OverpassTransitStopElement[],
  gameArea: GameArea,
): Array<{ id: string; name: string; point: [number, number] }> {
  return parseOverpassTransitStops(elements, gameArea).map((station) => ({
    id: station.id,
    name: station.name,
    point: [station.lat, station.lng] as [number, number],
  }));
}
