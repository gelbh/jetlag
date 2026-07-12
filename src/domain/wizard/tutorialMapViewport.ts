import type { GameArea } from "../map/annotations";
import type { LatLngTuple } from "../geometry/geometry";
import { gameAreaToBoundingBox } from "../geometry/gameAreaBounds";
import type { GeocodedPlace } from "../../services/geo/geocoding";
import { reverseGeocodePoint } from "../../services/geo/geocoding";
import { getCurrentPosition } from "../../services/core/geolocation";
import { TUTORIAL_DUBLIN_GAME_AREA } from "./tutorialGameArea";

/** Nominatim zoom: 4 ≈ state/province/canton; 3 ≈ country. */
const REGION_ADMIN_LEVEL = 4;
const COUNTRY_ADMIN_LEVEL = 3;

export type TutorialMapViewportSource = "region" | "country" | "device" | "default";

export interface TutorialMapViewport {
  gameArea: GameArea;
  label: string;
  center: LatLngTuple;
  source: TutorialMapViewportSource;
}

function boundsToGameArea(bounds: GeocodedPlace["bounds"]): GameArea {
  const { south, west, north, east } = bounds;
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

function gameAreaFromPlace(place: GeocodedPlace): GameArea {
  return place.boundary ?? boundsToGameArea(place.bounds);
}

function centerFromGameArea(gameArea: GameArea): LatLngTuple {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  return [(south + north) / 2, (west + east) / 2];
}

export function defaultTutorialMapViewport(): TutorialMapViewport {
  return {
    gameArea: TUTORIAL_DUBLIN_GAME_AREA,
    label: "Dublin",
    center: centerFromGameArea(TUTORIAL_DUBLIN_GAME_AREA),
    source: "default",
  };
}

async function reverseGeocodeRegion(
  point: LatLngTuple,
): Promise<TutorialMapViewport | null> {
  const region = await reverseGeocodePoint(point, REGION_ADMIN_LEVEL);
  if (region) {
    return {
      gameArea: gameAreaFromPlace(region),
      label: region.displayName,
      center: point,
      source: "region",
    };
  }

  const country = await reverseGeocodePoint(point, COUNTRY_ADMIN_LEVEL);
  if (country) {
    return {
      gameArea: gameAreaFromPlace(country),
      label: country.displayName,
      center: point,
      source: "country",
    };
  }

  return null;
}

export async function resolveTutorialMapViewport(): Promise<TutorialMapViewport> {
  try {
    const reading = await getCurrentPosition({ highAccuracy: false });
    const point: LatLngTuple = [reading.lat, reading.lng];
    const resolved = await reverseGeocodeRegion(point);
    if (resolved) {
      return resolved;
    }

    const pad = 0.35;
    return {
      gameArea: {
        type: "Polygon",
        coordinates: [
          [
            [reading.lng - pad, reading.lat - pad],
            [reading.lng + pad, reading.lat - pad],
            [reading.lng + pad, reading.lat + pad],
            [reading.lng - pad, reading.lat + pad],
            [reading.lng - pad, reading.lat - pad],
          ],
        ],
      },
      label: "Your area",
      center: point,
      source: "device",
    };
  } catch {
    return defaultTutorialMapViewport();
  }
}
