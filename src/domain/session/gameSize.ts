import area from "@turf/area";
import { multiPolygon as turfMultiPolygon, polygon as turfPolygon } from "@turf/helpers";
import type { GameArea } from "../map/annotations";
import type { DistanceUnit } from "../map/distance";
import { milesToMeters } from "../map/distance";
import {
  GAME_SIZE_THRESHOLDS_SQ_KM,
  hidingZoneDefaultRadiusMeters,
  resolveDistanceUnit,
} from "../map/distancePresets";
import { gameAreaToBoundingBox } from "../geometry/gameAreaBounds";

export type GameSize = "small" | "medium" | "large";

export const HIDING_ZONE_RADIUS_MIN_METERS = 100;
export const HIDING_ZONE_RADIUS_MAX_METERS = 800;
export const HIDING_ZONE_RADIUS_BUS_PRESET_METERS = 250;

const SQ_METERS_PER_SQ_MILE = 2_589_988.110336;
const SQ_METERS_PER_SQ_KM = 1_000_000;

const GAME_SIZE_THRESHOLDS_SQ_MI = {
  medium: 100,
  large: 1_000,
} as const;

export const GAME_SIZE_OPTIONS: readonly GameSize[] = [
  "small",
  "medium",
  "large",
] as const;

function gameAreaSquareMeters(gameArea: GameArea): number {
  const positions =
    gameArea.type === "MultiPolygon"
      ? gameArea.coordinates.flatMap((poly) => poly[0] ?? [])
      : (gameArea.coordinates[0] ?? []);

  if (positions.length < 4) {
    const box = gameAreaToBoundingBox(gameArea);
    const latSpan = box.north - box.south;
    const lngSpan = box.east - box.west;
    const centerLat = (box.north + box.south) / 2;
    const latMeters = latSpan * 111_320;
    const lngMeters = lngSpan * 111_320 * Math.cos((centerLat * Math.PI) / 180);
    return latMeters * lngMeters;
  }

  if (gameArea.type === "MultiPolygon") {
    return area(turfMultiPolygon(gameArea.coordinates));
  }

  return area(turfPolygon(gameArea.coordinates));
}

export function gameAreaSquareMiles(gameArea: GameArea): number {
  return gameAreaSquareMeters(gameArea) / SQ_METERS_PER_SQ_MILE;
}

export function gameAreaSquareKilometers(gameArea: GameArea): number {
  return gameAreaSquareMeters(gameArea) / SQ_METERS_PER_SQ_KM;
}

export function recommendGameSize(
  gameArea: GameArea,
  unit: DistanceUnit = "imperial",
): GameSize {
  const resolved = resolveDistanceUnit(unit);

  if (resolved === "metric") {
    const sqKm = gameAreaSquareKilometers(gameArea);
    if (sqKm >= GAME_SIZE_THRESHOLDS_SQ_KM.large) {
      return "large";
    }
    if (sqKm >= GAME_SIZE_THRESHOLDS_SQ_KM.medium) {
      return "medium";
    }
    return "small";
  }

  const sqMi = gameAreaSquareMiles(gameArea);
  if (sqMi >= GAME_SIZE_THRESHOLDS_SQ_MI.large) {
    return "large";
  }
  if (sqMi >= GAME_SIZE_THRESHOLDS_SQ_MI.medium) {
    return "medium";
  }
  return "small";
}

export function hidingZoneRadiusMeters(
  gameSize: GameSize,
  unit: DistanceUnit = "imperial",
): number {
  return hidingZoneDefaultRadiusMeters(gameSize, resolveDistanceUnit(unit));
}

export function clampHidingZoneRadiusMeters(radiusMeters: number): number {
  return Math.min(
    HIDING_ZONE_RADIUS_MAX_METERS,
    Math.max(HIDING_ZONE_RADIUS_MIN_METERS, radiusMeters),
  );
}

export function effectiveHidingZoneRadiusMeters(session: {
  gameSize?: GameSize;
  hidingZoneRadiusMeters?: number;
  distanceUnit?: DistanceUnit;
}): number {
  if (typeof session.hidingZoneRadiusMeters === "number") {
    return session.hidingZoneRadiusMeters;
  }

  return hidingZoneRadiusMeters(
    session.gameSize ?? "medium",
    session.distanceUnit,
  );
}

export function formatHidingZoneRadiusLabel(
  radiusMeters: number,
  unit: DistanceUnit = "imperial",
): string {
  const resolved = resolveDistanceUnit(unit);

  if (resolved === "metric") {
    if (Math.abs(radiusMeters - 400) < 5) {
      return "400 m";
    }
    if (Math.abs(radiusMeters - 800) < 5) {
      return "800 m";
    }
    if (radiusMeters >= 1000) {
      return `${(radiusMeters / 1000).toFixed(1)} km`;
    }

    return `${Math.round(radiusMeters)} m`;
  }

  const miles = radiusMeters / milesToMeters(1);
  if (Math.abs(miles - 0.25) < 0.01) {
    return "¼ mile";
  }

  if (Math.abs(miles - 0.5) < 0.01) {
    return "½ mile";
  }

  return `${miles.toFixed(2)} mi`;
}

export function gameSizeLabel(
  size: GameSize,
  unit: DistanceUnit = "imperial",
): {
  label: string;
  summary: string;
  hidingRadiusLabel: string;
} {
  const resolved = resolveDistanceUnit(unit);
  const hidingRadiusLabel =
    resolved === "metric"
      ? size === "large"
        ? "800 m"
        : "400 m"
      : size === "large"
        ? "½ mile"
        : "¼ mile";

  switch (size) {
    case "small":
      return {
        label: "Small",
        summary:
          resolved === "metric"
            ? "Town or neighborhood, 400 m hiding zones"
            : "Town or neighborhood, ¼ mi hiding zones",
        hidingRadiusLabel,
      };
    case "medium":
      return {
        label: "Medium",
        summary:
          resolved === "metric"
            ? "City or metro area, 400 m hiding zones"
            : "City or metro area, ¼ mi hiding zones",
        hidingRadiusLabel,
      };
    case "large":
      return {
        label: "Large",
        summary:
          resolved === "metric"
            ? "Region or country, 800 m hiding zones"
            : "Region or country, ½ mi hiding zones",
        hidingRadiusLabel,
      };
    default: {
      const never: never = size;
      return never;
    }
  }
}

export function formatPlayAreaSummary(
  areaValue: number,
  unit: DistanceUnit = "imperial",
): string {
  const resolved = resolveDistanceUnit(unit);

  if (resolved === "metric") {
    if (areaValue < 1) {
      return `~${areaValue.toFixed(1)} km² play area`;
    }
    if (areaValue < 100) {
      return `~${Math.round(areaValue)} km² play area`;
    }
    return `~${Math.round(areaValue).toLocaleString()} km² play area`;
  }

  if (areaValue < 1) {
    return `~${areaValue.toFixed(1)} sq mi play area`;
  }
  if (areaValue < 100) {
    return `~${Math.round(areaValue)} sq mi play area`;
  }
  return `~${Math.round(areaValue).toLocaleString()} sq mi play area`;
}

export function playAreaValueForUnit(
  gameArea: GameArea,
  unit: DistanceUnit,
): number {
  return resolveDistanceUnit(unit) === "metric"
    ? gameAreaSquareKilometers(gameArea)
    : gameAreaSquareMiles(gameArea);
}
