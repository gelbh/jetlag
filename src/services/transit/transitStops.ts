import type { BoundingBox } from "../../domain/geometry/gameArea/gameAreaBounds";
import { isPointInGameArea } from "../../domain/geometry/gameArea/geometry";
import type { GameArea } from "../../domain/map/annotations";
import { dedupeTransitStations, type TransitStation } from "../../domain/session/hiding/hidingZone";
import { matchingFeatureName } from "../geo/matching/parse";

export const TRANSIT_STOP_OVERPASS_LIMIT = 250;
export const HIDING_ZONE_BUS_STOP_OVERPASS_CAP = 150;
export const HIDING_ZONE_RAIL_STOP_OVERPASS_CAP = 100;

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

export function buildHidingZoneTransitStopOverpassQuery(
  bbox: BoundingBox,
  caps?: { bus?: number; rail?: number },
  output: "center" | "body" = "center",
): string {
  const formatted = formatOverpassBbox(bbox);
  const busCap = caps?.bus ?? HIDING_ZONE_BUS_STOP_OVERPASS_CAP;
  const railCap = caps?.rail ?? HIDING_ZONE_RAIL_STOP_OVERPASS_CAP;

  return `
    [out:json][timeout:25];
  (
    node["highway"="bus_stop"](${formatted});
    node["public_transport"="platform"]["bus"="yes"](${formatted});
  )->.bus;
  (
    node["railway"="station"](${formatted});
    node["railway"="halt"](${formatted});
    node["railway"="stop"](${formatted});
    node["railway"="tram_stop"](${formatted});
    node["station"="subway"](${formatted});
    node["station"="light_rail"](${formatted});
  )->.rail;
  .rail out ${output} ${railCap};
  .bus out ${output} ${busCap};
  `;
}

export function transitStopDisplayName(tags: Record<string, string> | undefined): string {
  if (!tags) {
    return "Transit stop";
  }

  return matchingFeatureName(tags) || tags.ref?.trim() || tags.local_ref?.trim() || "Transit stop";
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
