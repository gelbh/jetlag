import type { GameArea } from "../domain/annotations";
import { gameAreaToBoundingBox } from "../domain/geometry";
import type {
  TransitRealtimeSnapshot,
  TransitRouteMode,
  TransitVehicle,
} from "../domain/transit";
import { getTransitMetro } from "./transitCatalog";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { buildPremiumProxyHeaders } from "./accessControl";
import { shouldUsePremiumProxies } from "./premiumApiContext";

const TRANSIT_FETCH_TIMEOUT_MS = 30_000;

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

function transitProxyUrl(): string | null {
  const proxyUrl = import.meta.env.VITE_TRANSIT_PROXY_URL?.trim();
  return proxyUrl && proxyUrl.length > 0 ? proxyUrl : null;
}

function transitlandProxyUrl(): string | null {
  const proxyUrl = import.meta.env.VITE_TRANSITLAND_PROXY_URL?.trim();
  return proxyUrl && proxyUrl.length > 0 ? proxyUrl : null;
}

async function fetchPremiumProxyJson(url: URL): Promise<Response> {
  const proxyHeaders = await buildPremiumProxyHeaders();
  return fetchWithTimeout(
    url.toString(),
    {
      cache: "no-store",
      headers: proxyHeaders,
    },
    TRANSIT_FETCH_TIMEOUT_MS,
  );
}

async function fetchLondonVehicles(
  bounds: ReturnType<typeof gameAreaToBoundingBox>,
  metroId: string | undefined,
): Promise<TransitRealtimeSnapshot> {
  const proxyBase = transitProxyUrl();
  if (!proxyBase) {
    return {
      vehicles: [],
      fetchedAt: new Date().toISOString(),
      source: "none",
      message: "London live vehicles need VITE_TRANSIT_PROXY_URL.",
    };
  }

  const url = new URL(proxyBase);
  url.searchParams.set("metro", metroId ?? "london");
  url.searchParams.set("south", String(bounds.south));
  url.searchParams.set("west", String(bounds.west));
  url.searchParams.set("north", String(bounds.north));
  url.searchParams.set("east", String(bounds.east));

  const response = await fetchPremiumProxyJson(url);
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Map data unavailable. Rejoin session or create a new Premium session.",
    );
  }

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

async function fetchTransitlandProxyVehicles(
  feed: string,
  bounds: ReturnType<typeof gameAreaToBoundingBox>,
): Promise<TransitRealtimeSnapshot> {
  const proxyBase = transitlandProxyUrl();
  if (!proxyBase) {
    return {
      vehicles: [],
      fetchedAt: new Date().toISOString(),
      source: "none",
      message: "Live vehicles need VITE_TRANSITLAND_PROXY_URL for this metro.",
    };
  }

  const url = new URL(proxyBase);
  url.searchParams.set("feed", feed);
  url.searchParams.set("south", String(bounds.south));
  url.searchParams.set("west", String(bounds.west));
  url.searchParams.set("north", String(bounds.north));
  url.searchParams.set("east", String(bounds.east));

  const response = await fetchPremiumProxyJson(url);
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Map data unavailable. Rejoin session or create a new Premium session.",
    );
  }

  if (!response.ok) {
    throw new Error("Transitland proxy request failed.");
  }

  const payload = (await response.json()) as unknown;
  return {
    vehicles: normalizeProxyVehicles(payload).filter((vehicle) =>
      isInsideBounds(vehicle.lat, vehicle.lng, bounds),
    ),
    fetchedAt: new Date().toISOString(),
    source: "transitland",
  };
}

export async function fetchLiveTransitVehicles(
  gameArea: GameArea,
  metroId: string | undefined,
): Promise<TransitRealtimeSnapshot> {
  const bounds = gameAreaToBoundingBox(gameArea);
  const metro = getTransitMetro(metroId);

  if (!shouldUsePremiumProxies()) {
    return {
      vehicles: [],
      fetchedAt: new Date().toISOString(),
      source: "none",
      message: "Live vehicles require a Premium session.",
    };
  }

  if (metro?.id === "london") {
    return fetchLondonVehicles(bounds, metro.id);
  }

  if (!metro?.transitlandRtFeed) {
    return {
      vehicles: [],
      fetchedAt: new Date().toISOString(),
      source: "none",
      message: metro
        ? `Live vehicles are not available for ${metro.label} yet. Static transit lines still work.`
        : "Choose a supported metro to load live vehicles.",
    };
  }

  return fetchTransitlandProxyVehicles(metro.transitlandRtFeed, bounds);
}

export {
  normalizeProxyVehicles,
};
