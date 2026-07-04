import type { GameArea } from "../domain/annotations";
import { gameAreaToBoundingBox } from "../domain/geometry";
import type {
  TransitRouteLine,
  TransitRouteMode,
  TransitStaticData,
  TransitStop,
} from "../domain/transit";
import { queryOverpass } from "./overpassClient";
import {
  getOrFetchCached,
  staticTransitCacheKey,
} from "./geographicFeatureCache";

const MAX_STOPS = 250;
const MAX_ROUTES = 80;

type TransitBounds = ReturnType<typeof gameAreaToBoundingBox>;

export function buildStaticTransitStopsQuery(bounds: TransitBounds): string {
  const { south, west, north, east } = bounds;

  return `
    [out:json][timeout:25];
    (
      node["railway"="station"](${south},${west},${north},${east});
      node["railway"="halt"](${south},${west},${north},${east});
      node["public_transport"="stop_position"](${south},${west},${north},${east});
      node["highway"="bus_stop"](${south},${west},${north},${east});
      node["railway"="tram_stop"](${south},${west},${north},${east});
    );
    out body ${MAX_STOPS};
  `;
}

export function buildStaticTransitRoutesQuery(bounds: TransitBounds): string {
  const { south, west, north, east } = bounds;

  return `
    [out:json][timeout:25];
    (
      way["railway"~"rail|subway|light_rail|tram"](${south},${west},${north},${east});
    );
    out body geom ${MAX_ROUTES};
  `;
}

function modeFromTags(
  tags: Record<string, string> | undefined,
): TransitRouteMode {
  const route = tags?.route ?? tags?.railway ?? tags?.public_transport ?? "";
  if (route.includes("subway") || route.includes("metro")) {
    return "metro";
  }
  if (route.includes("tram") || route.includes("light_rail")) {
    return "tram";
  }
  if (route.includes("bus")) {
    return "bus";
  }
  if (route.includes("ferry")) {
    return "ferry";
  }
  if (route.includes("rail") || route.includes("train") || tags?.railway) {
    return "rail";
  }

  return "other";
}

function parseStop(element: {
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}): TransitStop | null {
  if (element.lat === undefined || element.lon === undefined) {
    return null;
  }

  return {
    id: String(element.id),
    name: element.tags?.name ?? "Transit stop",
    lat: element.lat,
    lng: element.lon,
    mode: modeFromTags(element.tags),
  };
}

function parseRoute(element: {
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}): TransitRouteLine | null {
  if (!element.geometry || element.geometry.length < 2) {
    return null;
  }

  return {
    id: String(element.id),
    name: element.tags?.name ?? element.tags?.ref ?? "Transit route",
    mode: modeFromTags(element.tags),
    ref: element.tags?.ref,
    positions: element.geometry.map((point) => [point.lat, point.lon]),
  };
}

export async function fetchStaticTransit(
  gameArea: GameArea,
): Promise<TransitStaticData> {
  return getOrFetchCached(staticTransitCacheKey(gameArea), async () => {
    const bounds = gameAreaToBoundingBox(gameArea);
    const [stopsPayload, routesPayload] = await Promise.all([
      queryOverpass<{
        elements: Array<{
          id: number;
          type: "node" | "way";
          lat?: number;
          lon?: number;
          tags?: Record<string, string>;
          geometry?: Array<{ lat: number; lon: number }>;
        }>;
      }>(buildStaticTransitStopsQuery(bounds)),
      queryOverpass<{
        elements: Array<{
          id: number;
          type: "node" | "way";
          lat?: number;
          lon?: number;
          tags?: Record<string, string>;
          geometry?: Array<{ lat: number; lon: number }>;
        }>;
      }>(buildStaticTransitRoutesQuery(bounds)),
    ]);

    const stops: TransitStop[] = [];
    const routes: TransitRouteLine[] = [];

    for (const element of stopsPayload.elements) {
      if (element.type === "node" && stops.length < MAX_STOPS) {
        const stop = parseStop(element);
        if (stop) {
          stops.push(stop);
        }
      }
    }

    for (const element of routesPayload.elements) {
      if (element.type === "way" && routes.length < MAX_ROUTES) {
        const route = parseRoute(element);
        if (route) {
          routes.push(route);
        }
      }
    }

    return {
      stops,
      routes,
      fetchedAt: new Date().toISOString(),
    };
  });
}
