import type { GameArea } from "../../domain/map/annotations";
import { gameAreaCenter } from "../../domain/geometry/geometry";
import type { TransitMetro } from "../../domain/map/transit";

const EARTH_RADIUS_KM = 6_371;

function distanceKm(
  a: [number, number],
  b: [number, number],
): number {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const TRANSIT_METROS: TransitMetro[] = [
  {
    id: "london",
    label: "London",
    center: [51.5074, -0.1278],
    radiusKm: 45,
    transitlandFeed: "f-transport~for~london",
    transitlandRtFeed: "f-dpwh-londontransit~rt",
    gtfsRtVehicleUrl:
      "https://api.tfl.gov.uk/vehicle/vehiclepositions",
  },
  {
    id: "dublin",
    label: "Dublin",
    center: [53.3498, -6.2603],
    radiusKm: 35,
    transitlandFeed: "f-small~operators~ie",
    transitlandRtFeed: "f-national~transport~authority~ie~rt",
  },
  {
    id: "nyc",
    label: "New York City",
    center: [40.7128, -74.006],
    radiusKm: 40,
    transitlandFeed: "f-dr5r-nyctsubway",
    transitlandRtFeed: "f-mta~nyc~rt~bustime",
  },
  {
    id: "sf",
    label: "San Francisco",
    center: [37.7749, -122.4194],
    radiusKm: 35,
    transitlandFeed: "f-9q8y-sfmta",
    transitlandRtFeed: "f-sf~bay~area~rg~rt",
  },
  {
    id: "chicago",
    label: "Chicago",
    center: [41.8781, -87.6298],
    radiusKm: 35,
    transitlandFeed: "f-dp3-cta",
    // No Transitland GTFS-RT feed; CTA Bus Tracker needs a separate API key.
  },
];

export function getTransitMetro(metroId: string | undefined): TransitMetro | null {
  if (!metroId) {
    return null;
  }

  return TRANSIT_METROS.find((metro) => metro.id === metroId) ?? null;
}

export function inferTransitMetroId(gameArea: GameArea): string | null {
  const center = gameAreaCenter(gameArea);
  let best: { id: string; distance: number } | null = null;

  for (const metro of TRANSIT_METROS) {
    const distance = distanceKm(center, metro.center);
    if (distance > metro.radiusKm) {
      continue;
    }

    if (!best || distance < best.distance) {
      best = { id: metro.id, distance };
    }
  }

  return best?.id ?? null;
}

export function listTransitMetros(): TransitMetro[] {
  return TRANSIT_METROS;
}

export function metroSupportsLiveVehicles(metro: TransitMetro | null): boolean {
  return Boolean(metro?.transitlandRtFeed || metro?.gtfsRtVehicleUrl);
}
