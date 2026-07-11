import type { TentaclePoi } from "../../map/annotations";
import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/geometry";
import { DEFAULT_RADIUS_METERS } from "../../map/distance";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { tentacleRadiusFromMetadata } from "../tentacleQuestions";
import {
  resultFromReplyId,
  truthUnavailable,
  type HiderTruthResult,
} from "./shared";

export function truthTentacle(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): HiderTruthResult | null {
  const metadata = pending.placement.metadata;
  const poisJson = metadata.poisJson;
  const centerJson = metadata.centerJson;

  if (typeof poisJson !== "string" || typeof centerJson !== "string") {
    return truthUnavailable();
  }

  let anchor: LatLngTuple;
  let pois: TentaclePoi[];
  try {
    const center = JSON.parse(centerJson) as { lat: number; lng: number };
    anchor = [center.lat, center.lng];
    pois = JSON.parse(poisJson) as TentaclePoi[];
  } catch {
    return truthUnavailable();
  }

  const radiusMeters = tentacleRadiusFromMetadata(metadata, DEFAULT_RADIUS_METERS);
  const distanceToAnchor = distanceBetweenPoints(stationCenter, anchor);
  if (distanceToAnchor > radiusMeters) {
    return resultFromReplyId(pending, "out-of-reach");
  }

  if (pois.length === 0) {
    return truthUnavailable();
  }

  let nearest: TentaclePoi | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const poi of pois) {
    const distanceMeters = distanceBetweenPoints(stationCenter, [
      poi.lat,
      poi.lng,
    ]);
    if (distanceMeters < nearestDistance) {
      nearestDistance = distanceMeters;
      nearest = poi;
    }
  }

  if (!nearest) {
    return truthUnavailable();
  }

  return resultFromReplyId(pending, nearest.id);
}
