import area from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";
import type { GameArea } from "./annotations";
import { milesToMeters } from "./distance";
import { gameAreaToBoundingBox } from "./gameAreaBounds";

export type GameSize = "small" | "medium" | "large";

export const HIDING_ZONE_RADIUS_MIN_METERS = 100;
export const HIDING_ZONE_RADIUS_MAX_METERS = 800;
export const HIDING_ZONE_RADIUS_BUS_PRESET_METERS = 250;

const SQ_METERS_PER_SQ_MILE = 2_589_988.110336;

const GAME_SIZE_THRESHOLDS_SQ_MI = {
  medium: 100,
  large: 1_000,
} as const;

export const GAME_SIZE_OPTIONS: readonly GameSize[] = [
  "small",
  "medium",
  "large",
] as const;

export function gameAreaSquareMiles(gameArea: GameArea): number {
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
    return (latMeters * lngMeters) / SQ_METERS_PER_SQ_MILE;
  }

  const feature = turfPolygon(
    gameArea.type === "MultiPolygon"
      ? gameArea.coordinates[0]!
      : gameArea.coordinates,
  );

  return area(feature) / SQ_METERS_PER_SQ_MILE;
}

export function recommendGameSize(gameArea: GameArea): GameSize {
  const sqMi = gameAreaSquareMiles(gameArea);

  if (sqMi >= GAME_SIZE_THRESHOLDS_SQ_MI.large) {
    return "large";
  }

  if (sqMi >= GAME_SIZE_THRESHOLDS_SQ_MI.medium) {
    return "medium";
  }

  return "small";
}

export function hidingZoneRadiusMeters(gameSize: GameSize): number {
  return gameSize === "large" ? milesToMeters(0.5) : milesToMeters(0.25);
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
}): number {
  if (typeof session.hidingZoneRadiusMeters === "number") {
    return session.hidingZoneRadiusMeters;
  }

  return hidingZoneRadiusMeters(session.gameSize ?? "medium");
}

export function formatHidingZoneRadiusLabel(
  radiusMeters: number,
  unit: "metric" | "imperial" = "imperial",
): string {
  if (unit === "metric") {
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

export function gameSizeLabel(size: GameSize): {
  label: string;
  summary: string;
  hidingRadiusLabel: string;
} {
  switch (size) {
    case "small":
      return {
        label: "Small",
        summary: "Town or neighborhood — ¼ mi hiding zones",
        hidingRadiusLabel: "¼ mile",
      };
    case "medium":
      return {
        label: "Medium",
        summary: "City or metro area — ¼ mi hiding zones",
        hidingRadiusLabel: "¼ mile",
      };
    case "large":
      return {
        label: "Large",
        summary: "Region or country — ½ mi hiding zones",
        hidingRadiusLabel: "½ mile",
      };
    default: {
      const never: never = size;
      return never;
    }
  }
}

export function formatPlayAreaSummary(sqMi: number): string {
  if (sqMi < 1) {
    return `~${sqMi.toFixed(1)} sq mi play area`;
  }

  if (sqMi < 100) {
    return `~${Math.round(sqMi)} sq mi play area`;
  }

  return `~${Math.round(sqMi).toLocaleString()} sq mi play area`;
}
