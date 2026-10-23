import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import { distanceBetweenPoints } from "../../geometry/measuring/geometryMeasuring";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";

export interface HiderTruthResult {
  replyId: string;
  label: string;
  unavailable?: boolean;
  unavailableReason?: string;
}

export const UNAVAILABLE_NO_ZONE = "Truth unavailable. Set your hiding zone first.";
export const UNAVAILABLE_NO_ANCHOR = "Truth unavailable. No end-game location was frozen for you.";
export const UNAVAILABLE_GENERIC = "Truth unavailable. Cannot compute.";
export const UNAVAILABLE_RADAR_EDGE_GAP =
  "Too close to the radar edge to auto-answer. Pick Yes or No.";
export const UNAVAILABLE_THERMOMETER_EDGE_GAP =
  "Too close to the thermometer flip to auto-answer. Pick Hotter or Colder.";
export const UNAVAILABLE_MEASURING_EDGE_GAP =
  "Too close to the measuring flip to auto-answer. Pick Closer or Further.";

export function truthUnavailable(reason = UNAVAILABLE_GENERIC): HiderTruthResult {
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

export function parseMatchingAnchor(metadata: Record<string, unknown>): LatLngTuple | null {
  const anchor = metadata.matchingAnchor;
  if (typeof anchor !== "object" || anchor === null || !("lat" in anchor) || !("lng" in anchor)) {
    return null;
  }

  const { lat, lng } = anchor as { lat: unknown; lng: unknown };
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  return [lat, lng];
}

/** Accepts annotation metadata or loose pending-placement metadata. */
export function seekerAnchorFromMetadata(
  metadata: { measuringAnchor?: unknown } | Record<string, unknown>,
): LatLngTuple | null {
  const anchor = metadata.measuringAnchor;
  if (
    anchor &&
    typeof anchor === "object" &&
    "lat" in anchor &&
    "lng" in anchor &&
    typeof (anchor as { lat: unknown }).lat === "number" &&
    typeof (anchor as { lng: unknown }).lng === "number"
  ) {
    const { lat, lng } = anchor as { lat: number; lng: number };
    return [lat, lng];
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

  return Math.min(...places.map((place) => distanceBetweenPoints(point, place.point)));
}
