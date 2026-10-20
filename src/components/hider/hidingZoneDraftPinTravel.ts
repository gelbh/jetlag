import type { Feature, Polygon } from "geojson";
import { MOTION_MAP_CAMERA_SNAP_MS } from "@/domain/device/motion/motionTokens";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { buildHidingZoneCircle } from "@/domain/session/hiding/hidingZone";

/** Shared with `HidingZoneStationFocus` camera ease so pin and camera land together. */
export const HIDING_ZONE_PIN_TRAVEL_MS = MOTION_MAP_CAMERA_SNAP_MS;

export const HIDING_ZONE_PIN_BASE_RADIUS = 8;
export const HIDING_ZONE_PIN_SNAPPING_RADIUS_BUMP = 2;
export const HIDING_ZONE_PIN_CHOSEN_RADIUS_BUMP = 4;

/** One-shot chrome / pin chosen emphasis after snap success. */
export const HIDING_ZONE_PIN_CHOSEN_MS = 600;

export type PinTravelFrame = {
  /** Display-only; Confirm always uses tool state center, not this. */
  displayCenter: LatLngTuple;
  traveling: boolean;
};

function clamp01(t: number): number {
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return t;
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

/** Linear lat/lng lerp is fine for ≤~200 m station snaps. */
export function lerpLatLng(from: LatLngTuple, to: LatLngTuple, t: number): LatLngTuple {
  const x = clamp01(t);
  return [from[0] + (to[0] - from[0]) * x, from[1] + (to[1] - from[1]) * x];
}

function sameCenter(a: LatLngTuple, b: LatLngTuple): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Pure travel frame for the draft-center pin.
 * Tool state / Confirm keep `to`; pin marker and preview ring both use `displayCenter`.
 */
export function resolvePinTravelDisplay(input: {
  from: LatLngTuple;
  to: LatLngTuple;
  elapsedMs: number;
  durationMs: number;
  animate: boolean;
}): PinTravelFrame {
  const { from, to, elapsedMs, durationMs, animate } = input;

  if (!animate || durationMs <= 0 || sameCenter(from, to)) {
    return { displayCenter: to, traveling: false };
  }

  const t = elapsedMs / durationMs;
  if (t >= 1) {
    return { displayCenter: to, traveling: false };
  }

  return {
    displayCenter: lerpLatLng(from, to, easeOutCubic(t)),
    traveling: true,
  };
}

/**
 * Display preview ring geometry. When the draft pin is traveling, rebuild at
 * `displayCenter` so the ring stays centered on the pin (S1/AC1). Confirm keeps
 * `toolPreviewCircle` / tool-state center.
 */
export function resolveHidingZoneDisplayPreviewCircle(input: {
  displayCenter: LatLngTuple | null;
  radiusMeters: number;
  toolPreviewCircle: Feature<Polygon> | null;
}): Feature<Polygon> | null {
  if (input.displayCenter) {
    return buildHidingZoneCircle(input.displayCenter, input.radiusMeters);
  }
  return input.toolPreviewCircle;
}

export function resolvePinCircleRadius(input: {
  snapping: boolean;
  chosenActive: boolean;
  baseRadius?: number;
}): number {
  const base = input.baseRadius ?? HIDING_ZONE_PIN_BASE_RADIUS;
  if (input.chosenActive) {
    return base + HIDING_ZONE_PIN_CHOSEN_RADIUS_BUMP;
  }
  if (input.snapping) {
    return base + HIDING_ZONE_PIN_SNAPPING_RADIUS_BUMP;
  }
  return base;
}
