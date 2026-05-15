import type { GameArea } from "../domain/annotations";
import { gameAreaToBoundingBox } from "../domain/geometry";
import type {
  TransitRealtimeSnapshot,
  TransitRouteMode,
  TransitVehicle,
} from "../domain/transit";
import { getTransitMetro } from "./transitCatalog";

const TRANSITLAND_API_BASE = "https://transit.land/api/v2/rest";

function modeFromRouteType(routeType: string | undefined): TransitRouteMode {
  switch (routeType) {
    case "subway":
    case "metro":
      return "metro";
    case "tram":
    case "light_rail":
      return "tram";
    case "bus":
      return "bus";
    case "ferry":
      return "ferry";
    case "rail":
    case "train":
      return "rail";
    default:
      return "other";
  }
}

function isInsideBounds(
  lat: number,
  lng: number,
  bounds: ReturnType<typeof gameAreaToBoundingBox>,
): boolean {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

function normalizeProxyVehicles(payload: unknown): TransitVehicle[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const lat = Number(record.lat);
      const lng = Number(record.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      const vehicle: TransitVehicle = {
        id: String(record.id ?? `${lat},${lng}`),
        label: String(record.label ?? record.routeRef ?? "Vehicle"),
        lat,
        lng,
        bearing:
          typeof record.bearing === "number" ? record.bearing : undefined,
        routeRef:
          typeof record.routeRef === "string" ? record.routeRef : undefined,
        mode: modeFromRouteType(
          typeof record.mode === "string" ? record.mode : undefined,
        ),
        updatedAt:
          typeof record.updatedAt === "string"
            ? record.updatedAt
            : new Date().toISOString(),
      };

      return vehicle;
    })
    .filter((vehicle): vehicle is TransitVehicle => vehicle !== null);
}

function normalizeTransitlandVehicles(
  payload: {
    vehicle_positions?: Array<{
      id?: number;
      vehicle?: { label?: string };
      position?: { latitude?: number; longitude?: number; bearing?: number };
      trip?: { route_id?: string };
      feed_version?: { fetched_at?: string };
    }>;
  },
  bounds: ReturnType<typeof gameAreaToBoundingBox>,
): TransitVehicle[] {
  const vehicles: TransitVehicle[] = [];

  for (const entry of payload.vehicle_positions ?? []) {
    const lat = entry.position?.latitude;
    const lng = entry.position?.longitude;
    if (lat === undefined || lng === undefined) {
      continue;
    }

    if (!isInsideBounds(lat, lng, bounds)) {
      continue;
    }

    vehicles.push({
      id: String(entry.id ?? `${lat},${lng}`),
      label: entry.vehicle?.label ?? entry.trip?.route_id ?? "Vehicle",
      lat,
      lng,
      bearing: entry.position?.bearing,
      routeRef: entry.trip?.route_id,
      mode: "other",
      updatedAt: entry.feed_version?.fetched_at ?? new Date().toISOString(),
    });
  }

  return vehicles;
}

function normalizeGtfsRtVehicleEntities(
  payload: {
    entity?: Array<{
      id?: string;
      vehicle?: {
        vehicle?: { label?: string };
        trip?: { routeId?: string };
        position?: {
          latitude?: number;
          longitude?: number;
          bearing?: number;
        };
      };
    }>;
  },
  bounds: ReturnType<typeof gameAreaToBoundingBox>,
): TransitVehicle[] {
  const vehicles: TransitVehicle[] = [];

  for (const entry of payload.entity ?? []) {
    const lat = entry.vehicle?.position?.latitude;
    const lng = entry.vehicle?.position?.longitude;
    if (lat === undefined || lng === undefined) {
      continue;
    }

    if (!isInsideBounds(lat, lng, bounds)) {
      continue;
    }

    vehicles.push({
      id: String(entry.id ?? `${lat},${lng}`),
      label:
        entry.vehicle?.vehicle?.label ??
        entry.vehicle?.trip?.routeId ??
        "Vehicle",
      lat,
      lng,
      bearing: entry.vehicle?.position?.bearing,
      routeRef: entry.vehicle?.trip?.routeId,
      mode: "other",
      updatedAt: new Date().toISOString(),
    });
  }

  return vehicles;
}

async function readTransitlandError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    if (typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
  } catch {
    // Fall through to status-based messaging.
  }

  return `HTTP ${response.status}`;
}

async function fetchTransitlandJson(
  url: URL,
  apiKey: string,
): Promise<unknown> {
  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      apikey: apiKey,
    },
  });

  if (!response.ok) {
    const detail = await readTransitlandError(response);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Transitland rejected the API key (${detail}). Create or copy a key from app.interline.io, set VITE_TRANSITLAND_API_KEY in .env.local, then restart the dev server or rebuild.`,
      );
    }

    throw new Error(`Transitland vehicle request failed (${detail}).`);
  }

  return response.json();
}

async function fetchTransitlandRtVehicles(
  feed: string,
  apiKey: string,
  bounds: ReturnType<typeof gameAreaToBoundingBox>,
): Promise<TransitVehicle[]> {
  const url = new URL(
    `${TRANSITLAND_API_BASE}/feeds/${encodeURIComponent(feed)}/download_latest_rt/vehicle_positions.json`,
  );
  url.searchParams.set("apikey", apiKey);

  const payload = (await fetchTransitlandJson(url, apiKey)) as Parameters<
    typeof normalizeGtfsRtVehicleEntities
  >[0];

  return normalizeGtfsRtVehicleEntities(payload, bounds);
}

async function fetchTransitlandIndexedVehicles(
  feed: string,
  apiKey: string,
  bounds: ReturnType<typeof gameAreaToBoundingBox>,
): Promise<TransitVehicle[]> {
  const url = new URL(`${TRANSITLAND_API_BASE}/vehicle_positions`);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("feed", feed);
  url.searchParams.set(
    "search",
    `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`,
  );
  url.searchParams.set("limit", "200");

  const payload = (await fetchTransitlandJson(url, apiKey)) as Parameters<
    typeof normalizeTransitlandVehicles
  >[0];

  return normalizeTransitlandVehicles(payload, bounds);
}

export async function fetchLiveTransitVehicles(
  gameArea: GameArea,
  metroId: string | undefined,
): Promise<TransitRealtimeSnapshot> {
  const bounds = gameAreaToBoundingBox(gameArea);
  const metro = getTransitMetro(metroId);
  const proxyBase = import.meta.env.VITE_TRANSIT_PROXY_URL?.trim();

  if (proxyBase) {
    const url = new URL("vehicles", proxyBase.endsWith("/") ? proxyBase : `${proxyBase}/`);
    url.searchParams.set("metro", metro?.id ?? "auto");
    url.searchParams.set("south", String(bounds.south));
    url.searchParams.set("west", String(bounds.west));
    url.searchParams.set("north", String(bounds.north));
    url.searchParams.set("east", String(bounds.east));

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Transit proxy request failed.");
    }

    const payload = (await response.json()) as unknown;
    return {
      vehicles: normalizeProxyVehicles(payload).filter((vehicle) =>
        isInsideBounds(vehicle.lat, vehicle.lng, bounds),
      ),
      fetchedAt: new Date().toISOString(),
      source: "proxy",
    };
  }

  const apiKey = import.meta.env.VITE_TRANSITLAND_API_KEY?.trim();
  if (!apiKey) {
    return {
      vehicles: [],
      fetchedAt: new Date().toISOString(),
      source: "none",
      message:
        "Live vehicles need VITE_TRANSIT_PROXY_URL or VITE_TRANSITLAND_API_KEY for this metro.",
    };
  }

  if (!metro?.transitlandRtFeed) {
    return {
      vehicles: [],
      fetchedAt: new Date().toISOString(),
      source: "none",
      message: metro
        ? `Live vehicles are not available for ${metro.label} through Transitland yet. Static transit lines still work.`
        : "Choose a supported metro to load live vehicles.",
    };
  }

  const vehicles = metro.transitlandRtFeed.includes("~rt")
    ? await fetchTransitlandRtVehicles(metro.transitlandRtFeed, apiKey, bounds)
    : await fetchTransitlandIndexedVehicles(
        metro.transitlandRtFeed,
        apiKey,
        bounds,
      );

  return {
    vehicles,
    fetchedAt: new Date().toISOString(),
    source: "transitland",
  };
}

export {
  normalizeGtfsRtVehicleEntities,
  normalizeTransitlandVehicles,
};
