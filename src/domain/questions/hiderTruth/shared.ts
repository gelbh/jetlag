import type { LatLngTuple } from "../../geometry/geometry";
import { distanceBetweenPoints } from "../../geometry/geometryMeasuring";
import type { PendingQuestionRecord } from "../../session/sessionChat";

export interface HiderTruthResult {
  replyId: string;
  label: string;
  unavailable?: boolean;
  unavailableReason?: string;
}

export const UNAVAILABLE_NO_ZONE =
  "Truth unavailable. Set your hiding zone first.";
export const UNAVAILABLE_GENERIC = "Truth unavailable. Cannot compute.";

export function truthUnavailable(
  reason = UNAVAILABLE_GENERIC,
): HiderTruthResult {
  return {
    replyId: "",
    label: reason,
    unavailable: true,
    unavailableReason: reason,
  };
}

export function resultFromReplyId(
  pending: PendingQuestionRecord,
  replyId: string,
): HiderTruthResult {
  const option = pending.replyOptions.find((item) => item.id === replyId);
  return {
    replyId,
    label: option?.label ?? replyId,
  };
}

export function parseMatchingAnchor(
  metadata: Record<string, unknown>,
): LatLngTuple | null {
  const anchor = metadata.matchingAnchor;
  if (
    typeof anchor !== "object" ||
    anchor === null ||
    !("lat" in anchor) ||
    !("lng" in anchor)
  ) {
    return null;
  }

  const { lat, lng } = anchor as { lat: unknown; lng: unknown };
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  return [lat, lng];
}

export function seekerAnchorFromMetadata(
  metadata: Record<string, unknown>,
): LatLngTuple | null {
  const anchor = metadata.measuringAnchor;
  if (
    anchor &&
    typeof anchor === "object" &&
    "lat" in anchor &&
    "lng" in anchor &&
    typeof anchor.lat === "number" &&
    typeof anchor.lng === "number"
  ) {
    return [anchor.lat, anchor.lng];
  }

  return null;
}

export function minDistanceToPlaces(
  point: LatLngTuple,
  places: Array<{ point: LatLngTuple }>,
): number | null {
  if (places.length === 0) {
    return null;
  }

  return Math.min(
    ...places.map((place) => distanceBetweenPoints(point, place.point)),
  );
}
