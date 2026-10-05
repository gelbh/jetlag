import type { Feature, Point } from "geojson";
import type { LatLngTuple } from "../geometry/gameArea/geometry";
import { parseGeometryJson } from "../geometry/gameArea/geometryParsing";
import type { PendingQuestionRecord } from "../session/activity/sessionChat";
import { parseMatchingAnchor, seekerAnchorFromMetadata } from "./hiderTruth/shared";

export function seekerAnchorPointFeature(anchor: LatLngTuple): Feature<Point> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [anchor[1], anchor[0]],
    },
  };
}

/** Point from pending placement geometryJson, else measuring/matching metadata anchor. */
export function deferredPointFromPendingPlacement(
  pending: PendingQuestionRecord,
): Feature<Point> | null {
  const parsed = parseGeometryJson(pending.placement.geometryJson);
  if (parsed?.geometry.type === "Point") {
    return parsed as Feature<Point>;
  }

  const measuringAnchor = seekerAnchorFromMetadata(pending.placement.metadata);
  if (measuringAnchor) {
    return seekerAnchorPointFeature(measuringAnchor);
  }

  const matchingAnchor = parseMatchingAnchor(pending.placement.metadata);
  if (matchingAnchor) {
    return seekerAnchorPointFeature(matchingAnchor);
  }

  return null;
}
