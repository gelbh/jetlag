/** Turf-free so session rules (boot path) avoid `gameSize`'s area math. */
import type { DistanceUnit } from "../../map/distance";
import {
  hidingZoneDefaultRadiusMeters,
  resolveDistanceUnit,
} from "../../map/distancePresets";
import type { GameSize } from "./gameSize";

export function hidingZoneRadiusMeters(
  gameSize: GameSize,
  unit: DistanceUnit = "imperial",
): number {
  return hidingZoneDefaultRadiusMeters(gameSize, resolveDistanceUnit(unit));
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
