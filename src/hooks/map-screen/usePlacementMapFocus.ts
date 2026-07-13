import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { MAP_PLACEMENT_FOCUS_BOTTOM_BIAS_PX } from "../../domain/device/motionTokens";
import type { MapDraftOverlay } from "../../domain/map/mapDraftOverlay";
import {
  boundingBoxFromPositions,
  draftOverlayBoundsToLeafletBounds,
} from "../../domain/questions/overlays/draftOverlayBounds";
import type { MapTool } from "../../state/sessionStore";

const WALK_REFRAME_INTERVAL_MS = 2000;

function isVolatileWalkOverlay(overlay: MapDraftOverlay): boolean {
  return overlay.id.includes("walk-");
}

function polygonFingerprint(
  overlay: Extract<MapDraftOverlay, { kind: "polygon" }>,
): Record<string, unknown> {
  const positions: LatLngTuple[] = [];

  if (overlay.feature.geometry.type === "Polygon") {
    for (const ring of overlay.feature.geometry.coordinates) {
      for (const [lng, lat] of ring) {
        positions.push([lat, lng]);
      }
    }
  } else {
    for (const polygon of overlay.feature.geometry.coordinates) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          positions.push([lat, lng]);
        }
      }
    }
  }

  const box = boundingBoxFromPositions(positions);

  return {
    kind: overlay.kind,
    id: overlay.id,
    south: box?.south,
    west: box?.west,
    north: box?.north,
    east: box?.east,
  };
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
    case "polyline":
      return { kind: overlay.kind, id: overlay.id, positions: overlay.positions };
    case "polygon":
      return polygonFingerprint(overlay);
    default: {
      const unreachable: never = overlay;
      return unreachable;
    }
  }
}

function overlayFingerprint(overlays: readonly MapDraftOverlay[]): string {
  const structural = overlays.filter((overlay) => !isVolatileWalkOverlay(overlay));
  return JSON.stringify(structural.map(overlayFingerprintEntry));
}

export interface UsePlacementMapFocusOptions {
  activeTool: MapTool;
  overlays: readonly MapDraftOverlay[];
  defaultFocusBounds: LatLngBoundsExpression | null;
  enabled: boolean;
  walkActive?: boolean;
}

export interface UsePlacementMapFocusResult {
  effectiveFocusBounds: LatLngBoundsExpression | null;
  placementRecenterToken: number;
  focusPaddingBias?: number;
}

export function usePlacementMapFocus({
  activeTool,
  overlays,
  defaultFocusBounds,
  enabled,
  walkActive = false,
}: UsePlacementMapFocusOptions): UsePlacementMapFocusResult {
  const [placementRecenterToken, setPlacementRecenterToken] = useState(0);
  const fingerprintRef = useRef<string | null>(null);
  const lastWalkReframeAtRef = useRef(0);

  const placementActive =
    enabled && activeTool !== "none" && overlays.length > 0;

  const placementFocusBounds = useMemo(() => {
    if (!placementActive) {
      return null;
    }

    return draftOverlayBoundsToLeafletBounds(overlays);
  }, [overlays, placementActive]);

  useEffect(() => {
    const fingerprint = overlayFingerprint(overlays);

    if (!placementActive) {
      fingerprintRef.current = fingerprint;
      return;
    }

    if (fingerprintRef.current === fingerprint) {
      return;
    }

    fingerprintRef.current = fingerprint;

    const now = Date.now();
    if (
      walkActive &&
      now - lastWalkReframeAtRef.current < WALK_REFRAME_INTERVAL_MS
    ) {
      return;
    }

    if (walkActive) {
      lastWalkReframeAtRef.current = now;
    }

    setPlacementRecenterToken((token) => token + 1);
  }, [overlays, placementActive, walkActive]);

  return {
    effectiveFocusBounds: placementFocusBounds ?? defaultFocusBounds,
    placementRecenterToken,
    focusPaddingBias:
      placementFocusBounds !== null
        ? MAP_PLACEMENT_FOCUS_BOTTOM_BIAS_PX
        : undefined,
  };
}
