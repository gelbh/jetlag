import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import {
  computePlacementCameraTarget,
  placementCameraFingerprint,
  resolvePlacementPhase,
  shouldReframeWithHysteresis,
  toLeafletBounds,
  WALK_REFRAME_INTERVAL_MS,
  type PlacementCameraDraftState,
  type PlacementViewportFrame,
} from "../../domain/map/placementCamera";
import { gameAreaToBoundingBox } from "../../domain/geometry/gameAreaBounds";
import type { GameArea } from "../../domain/map/annotations";
import type { MapDraftOverlay } from "../../domain/map/mapDraftOverlay";
import type { MapTool } from "../../state/sessionStore";
import {
  DEFAULT_PANEL_HEIGHT_PX,
  PANEL_PEEK_HEIGHT_PX,
} from "../../domain/device/motionTokens";

export interface UsePlacementMapFocusOptions {
  activeTool: MapTool;
  draft: PlacementCameraDraftState;
  overlays: readonly MapDraftOverlay[];
  eliminationFeatures: Feature<Polygon | MultiPolygon>[];
  gameArea: GameArea;
  defaultFocusBounds: LatLngBoundsExpression | null;
  enabled: boolean;
  panelMinimized: boolean;
  selectedPoiId?: string | null;
  walkActive?: boolean;
  viewportFrame?: PlacementViewportFrame | null;
}

export interface UsePlacementMapFocusResult {
  effectiveFocusBounds: LatLngBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  placementRecenterToken: number;
  focusPaddingBias?: number;
  /** True on forced reframes (phase transitions, Recenter) — tells `MapView`
   * to prefer the cinematic `flyTo` path even if the geometry delta is modest. */
  focusPreferFly: boolean;
  requestPlacementRecenter: () => void;
}

function resolvePanelPeekHeightPx(panelMinimized: boolean): number {
  return panelMinimized ? PANEL_PEEK_HEIGHT_PX : DEFAULT_PANEL_HEIGHT_PX;
}

function targetBoundsBox(
  bounds: LatLngBoundsExpression | null | undefined,
): ReturnType<typeof gameAreaToBoundingBox> | null {
  if (!bounds) {
    return null;
  }

  const leafletBounds = toLeafletBounds(bounds);
  const southWest = leafletBounds.getSouthWest();
  const northEast = leafletBounds.getNorthEast();

  return gameAreaToBoundingBox({
    type: "Polygon",
    coordinates: [
      [
        [southWest.lng, southWest.lat],
        [northEast.lng, southWest.lat],
        [northEast.lng, northEast.lat],
        [southWest.lng, northEast.lat],
        [southWest.lng, southWest.lat],
      ],
    ],
  });
}

export function usePlacementMapFocus({
  activeTool,
  draft,
  overlays,
  eliminationFeatures,
  gameArea,
  defaultFocusBounds,
  enabled,
  panelMinimized,
  selectedPoiId = null,
  walkActive = false,
  viewportFrame = null,
}: UsePlacementMapFocusOptions): UsePlacementMapFocusResult {
  const [placementRecenterToken, setPlacementRecenterToken] = useState(0);
  const [focusPreferFly, setFocusPreferFly] = useState(false);
  const fingerprintRef = useRef<string | null>(null);
  const lastWalkReframeAtRef = useRef(0);
  const previousPoiIdRef = useRef<string | null>(selectedPoiId);

  const panelPeekHeightPx = resolvePanelPeekHeightPx(panelMinimized);
  const phase = resolvePlacementPhase(activeTool, draft);
  const placementActive = enabled && activeTool !== "none";

  const cameraContext = useMemo(
    () => ({
      tool: activeTool,
      phase,
      draft,
      gameArea,
      overlays,
      eliminationFeatures,
      panelPeekHeightPx,
      selectedPoiId,
      walkActive,
      viewportFrame,
    }),
    [
      activeTool,
      draft,
      eliminationFeatures,
      gameArea,
      overlays,
      panelPeekHeightPx,
      phase,
      selectedPoiId,
      viewportFrame,
      walkActive,
    ],
  );

  const cameraTarget = useMemo(() => {
    if (!placementActive) {
      return null;
    }

    return computePlacementCameraTarget(cameraContext);
  }, [cameraContext, placementActive]);

  const fingerprint = useMemo(
    () =>
      placementCameraFingerprint({
        tool: activeTool,
        phase,
        overlays,
        eliminationFeatures,
        selectedPoiId,
        seekerResolving:
          draft.measuring.seekerResolving || draft.matching.seekerResolving,
        eliminationPreview:
          draft.measuring.eliminationPreview || draft.matching.eliminationPreview,
        walkActive,
        walkCurrentPoint: draft.thermometer.walkCurrentPoint,
      }),
    [
      activeTool,
      draft.matching.eliminationPreview,
      draft.matching.seekerResolving,
      draft.measuring.eliminationPreview,
      draft.measuring.seekerResolving,
      draft.thermometer.walkCurrentPoint,
      eliminationFeatures,
      overlays,
      phase,
      selectedPoiId,
      walkActive,
    ],
  );

  const requestPlacementRecenter = useCallback(() => {
    setFocusPreferFly(true);
    setPlacementRecenterToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!placementActive) {
      fingerprintRef.current = fingerprint;
      previousPoiIdRef.current = selectedPoiId;
      return;
    }

    const fingerprintChanged = fingerprintRef.current !== fingerprint;
    const poiSelectionChange =
      previousPoiIdRef.current !== selectedPoiId &&
      phase === "pick_poi";

    if (!fingerprintChanged) {
      return;
    }

    if (!cameraTarget) {
      fingerprintRef.current = fingerprint;
      previousPoiIdRef.current = selectedPoiId;
      return;
    }

    fingerprintRef.current = fingerprint;
    previousPoiIdRef.current = selectedPoiId;

    const now = Date.now();
    if (
      walkActive &&
      fingerprintChanged &&
      now - lastWalkReframeAtRef.current < WALK_REFRAME_INTERVAL_MS
    ) {
      return;
    }

    const targetBox = targetBoundsBox(cameraTarget.bounds ?? null);
    const shouldReframe = shouldReframeWithHysteresis({
      phase,
      walkActive,
      poiSelectionChange,
      forceReframe: cameraTarget.forceReframe ?? false,
      targetBounds: targetBox,
      viewportFrame,
    });

    if (!shouldReframe) {
      return;
    }

    if (walkActive) {
      lastWalkReframeAtRef.current = now;
    }

    setFocusPreferFly(cameraTarget.forceReframe ?? false);
    setPlacementRecenterToken((token) => token + 1);
  }, [
    cameraTarget,
    fingerprint,
    phase,
    placementActive,
    selectedPoiId,
    viewportFrame,
    walkActive,
  ]);

  return {
    effectiveFocusBounds: cameraTarget?.bounds ?? defaultFocusBounds,
    focusMinZoom: cameraTarget?.minZoom,
    focusMaxZoom: cameraTarget?.maxZoom,
    placementRecenterToken,
    focusPaddingBias: cameraTarget?.paddingBiasPx,
    focusPreferFly,
    requestPlacementRecenter,
  };
}
