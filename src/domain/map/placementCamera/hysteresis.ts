import type { BoundingBox } from "../../geometry/gameAreaBounds";
import { normalizeBoundingBox } from "../../geometry/gameAreaBounds";
import { SAFE_RECT_FRACTION } from "./constants";
import type { PlacementPhase, PlacementViewportFrame } from "./types";

function isBoxContained(inner: BoundingBox, outer: BoundingBox): boolean {
  return (
    inner.south >= outer.south &&
    inner.west >= outer.west &&
    inner.north <= outer.north &&
    inner.east <= outer.east
  );
}

export function computeSafeRectBounds(
  frame: PlacementViewportFrame,
): BoundingBox {
  const { bounds, heightPx, bottomPaddingPx } = frame;
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;

  const marginFraction = (1 - SAFE_RECT_FRACTION) / 2;
  const latMargin = latSpan * marginFraction;
  const lngMargin = lngSpan * marginFraction;

  const bottomPaddingFraction =
    heightPx > 0 ? Math.min(0.45, bottomPaddingPx / heightPx) : 0;
  const extraSouth = latSpan * bottomPaddingFraction;

  return normalizeBoundingBox({
    south: bounds.south + latMargin + extraSouth,
    west: bounds.west + lngMargin,
    north: bounds.north - latMargin,
    east: bounds.east - lngMargin,
  });
}

export function isTargetInsideSafeRect(
  target: BoundingBox,
  frame: PlacementViewportFrame | null | undefined,
): boolean {
  if (!frame || frame.widthPx <= 0 || frame.heightPx <= 0) {
    return false;
  }

  const safeRect = computeSafeRectBounds(frame);
  return isBoxContained(normalizeBoundingBox(target), safeRect);
}

export interface HysteresisInput {
  phase: PlacementPhase;
  walkActive: boolean;
  poiSelectionChange: boolean;
  forceReframe: boolean;
  targetBounds: BoundingBox | null;
  viewportFrame: PlacementViewportFrame | null | undefined;
}

export function shouldApplyHysteresis(input: HysteresisInput): boolean {
  if (input.forceReframe) {
    return false;
  }

  if (input.walkActive) {
    return true;
  }

  if (input.poiSelectionChange && input.phase === "pick_poi") {
    return true;
  }

  return false;
}

export function shouldReframeWithHysteresis(input: HysteresisInput): boolean {
  if (input.forceReframe) {
    return true;
  }

  if (!shouldApplyHysteresis(input)) {
    return true;
  }

  if (!input.targetBounds) {
    return true;
  }

  return !isTargetInsideSafeRect(input.targetBounds, input.viewportFrame);
}
