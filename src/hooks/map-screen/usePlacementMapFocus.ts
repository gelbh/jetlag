import { useEffect, useRef, useState } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { MAP_PLACEMENT_FOCUS_BOTTOM_BIAS_PX } from "../../domain/device/motionTokens";
import type { MapDraftOverlay } from "../../domain/map/mapDraftOverlay";
import { draftOverlayBoundsToLeafletBounds } from "../../domain/questions/overlays/draftOverlayBounds";
import type { MapTool } from "../../state/sessionStore";

const WALK_REFRAME_INTERVAL_MS = 2000;
const WALK_FINGERPRINT_ROUND_METERS = 10;

function roundCoordForFingerprint(value: number): number {
  const degreesPerMeter = 1 / 111_320;
  const step = WALK_FINGERPRINT_ROUND_METERS * degreesPerMeter;
  return Math.round(value / step) * step;
}

function roundPointForFingerprint(point: LatLngTuple): LatLngTuple {
  return [
    roundCoordForFingerprint(point[0]),
    roundCoordForFingerprint(point[1]),
  ];
}

function polygonCoordCount(
  overlay: Extract<MapDraftOverlay, { kind: "polygon" }>,
): number {
  const { feature } = overlay;
  if (feature.geometry.type === "Polygon") {
    return feature.geometry.coordinates.reduce(
      (sum, ring) => sum + ring.length,
      0,
    );
  }

  return feature.geometry.coordinates.reduce(
    (sum, polygon) =>
      sum + polygon.reduce((ringSum, ring) => ringSum + ring.length, 0),
    0,
  );
}

function overlayFingerprintEntry(overlay: MapDraftOverlay): Record<string, unknown> {
  switch (overlay.kind) {
    case "marker":
      return { kind: overlay.kind, id: overlay.id, point: overlay.point };
    case "circle":
      return {
        kind: overlay.kind,
        id: overlay.id,
        radiusMeters: overlay.radiusMeters,
        point: overlay.center,
      };
    case "polyline": {
      const positions =
        overlay.id.includes("walk-remaining") && overlay.positions.length > 0
          ? [
              ...overlay.positions.slice(0, -1),
              roundPointForFingerprint(
                overlay.positions[overlay.positions.length - 1]!,
              ),
            ]
          : overlay.positions;

      return { kind: overlay.kind, id: overlay.id, positions };
    }
    case "polygon":
      return {
        kind: overlay.kind,
        id: overlay.id,
        polygonCoordCount: polygonCoordCount(overlay),
      };
    default: {
      const unreachable: never = overlay;
      return unreachable;
    }
  }
}

function overlayFingerprint(overlays: readonly MapDraftOverlay[]): string {
  return JSON.stringify(overlays.map(overlayFingerprintEntry));
}

export interface UsePlacementMapFocusOptions {
  activeTool: MapTool;
  overlays: readonly MapDraftOverlay[];
  defaultFocusBounds: LatLngBoundsExpression | null;
  enabled: boolean;
  walkActive?: boolean;
  walkLivePoint?: LatLngTuple | null;
}

export interface UsePlacementMapFocusResult {
  effectiveFocusBounds: LatLngBoundsExpression | null;
  placementRecenterToken: number;
  focusPaddingBias: number;
}

export function usePlacementMapFocus({
  activeTool,
  overlays,
  defaultFocusBounds,
  enabled,
  walkActive = false,
}: UsePlacementMapFocusOptions): UsePlacementMapFocusResult {
  const [placementFocusBounds, setPlacementFocusBounds] =
    useState<LatLngBoundsExpression | null>(null);
  const [placementRecenterToken, setPlacementRecenterToken] = useState(0);
  const fingerprintRef = useRef<string | null>(null);
  const lastWalkReframeAtRef = useRef(0);

  useEffect(() => {
    const fingerprint = overlayFingerprint(overlays);

    if (!enabled || activeTool === "none" || overlays.length === 0) {
      fingerprintRef.current = fingerprint;
      return;
    }

    if (fingerprintRef.current === fingerprint) {
      return;
    }

    fingerprintRef.current = fingerprint;

    const nextBounds = draftOverlayBoundsToLeafletBounds(overlays);
    if (!nextBounds) {
      return;
    }

    setPlacementFocusBounds(nextBounds);

    const now = Date.now();
    if (walkActive) {
      if (now - lastWalkReframeAtRef.current < WALK_REFRAME_INTERVAL_MS) {
        return;
      }
      lastWalkReframeAtRef.current = now;
    }

    setPlacementRecenterToken((token) => token + 1);
  }, [activeTool, enabled, overlays, walkActive]);

  return {
    effectiveFocusBounds: placementFocusBounds ?? defaultFocusBounds,
    placementRecenterToken,
    focusPaddingBias: MAP_PLACEMENT_FOCUS_BOTTOM_BIAS_PX,
  };
}
