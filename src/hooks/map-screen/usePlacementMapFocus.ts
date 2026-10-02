import type { Feature, MultiPolygon, Polygon } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PANEL_HEIGHT_PX,
  PANEL_PEEK_HEIGHT_PX,
} from "../../domain/device/motion/motionTokens";
import { gameAreaToBoundingBox } from "../../domain/geometry/gameArea/gameAreaBounds";
import type { GameArea } from "../../domain/map/annotations";
import type { MapBoundsExpression } from "../../domain/map/mapBounds";
import type { MapDraftOverlay } from "../../domain/map/mapDraftOverlay";
import {
  computePlacementCameraTarget,
  type PlacementCameraDraftState,
  type PlacementViewportFrame,
  placementCameraFingerprint,
  resolvePlacementPhase,
  shouldReframeWithHysteresis,
  toMapBounds,
  WALK_REFRAME_INTERVAL_MS,
} from "../../domain/map/placementCamera";
import type { MapTool } from "../../state/sessionStore";

export interface UsePlacementMapFocusOptions {
  activeTool: MapTool;
  draft: PlacementCameraDraftState;
  overlays: readonly MapDraftOverlay[];
  eliminationFeatures: Feature<Polygon | MultiPolygon>[];
  gameArea: GameArea;
  defaultFocusBounds: MapBoundsExpression | null;
  enabled: boolean;
  panelMinimized: boolean;
  /** When set (Ask HUD), overrides floating-panel peek height for padding. */
  hudBottomPaddingPx?: number | null;
  /** Top chrome height for asymmetric fitBounds (map-first Matching banner). */
  hudTopPaddingPx?: number | null;
  selectedPoiId?: string | null;
  walkActive?: boolean;
  viewportFrame?: PlacementViewportFrame | null;
}

export interface UsePlacementMapFocusResult {
  effectiveFocusBounds: MapBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  placementRecenterToken: number;
  focusPaddingBias?: number;
  focusPaddingTopBias?: number;
  /** True on forced reframes (phase transitions, Recenter) — tells `MapView`
   * to prefer the cinematic `flyTo` path even if the geometry delta is modest. */
  focusPreferFly: boolean;
  requestPlacementRecenter: () => void;
}

function resolvePanelPeekHeightPx(panelMinimized: boolean): number {
  return panelMinimized ? PANEL_PEEK_HEIGHT_PX : DEFAULT_PANEL_HEIGHT_PX;
}

function targetBoundsBox(
  bounds: MapBoundsExpression | null | undefined,
): ReturnType<typeof gameAreaToBoundingBox> | null {
  if (!bounds) {
    return null;
  }

  const mapBounds = toMapBounds(bounds);
  const southWest = mapBounds.getSouthWest();
  const northEast = mapBounds.getNorthEast();

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
  hudBottomPaddingPx = null,
  hudTopPaddingPx = null,
  selectedPoiId = null,
  walkActive = false,
  viewportFrame = null,
}: UsePlacementMapFocusOptions): UsePlacementMapFocusResult {
  const [placementRecenterToken, setPlacementRecenterToken] = useState(0);
  const [focusPreferFly, setFocusPreferFly] = useState(false);
  const fingerprintRef = useRef<string | null>(null);
  const lastWalkReframeAtRef = useRef(0);
  const previousPoiIdRef = useRef<string | null>(selectedPoiId);

  const panelPeekHeightPx =
    hudBottomPaddingPx != null && hudBottomPaddingPx > 0
      ? hudBottomPaddingPx
      : resolvePanelPeekHeightPx(panelMinimized);
  const panelTopPaddingPx = hudTopPaddingPx != null && hudTopPaddingPx > 0 ? hudTopPaddingPx : 0;
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
      panelTopPaddingPx,
      selectedPoiId,
      walkActive,
      // viewportFrame intentionally omitted — hysteresis only
    }),
    [
      activeTool,
      draft,
      eliminationFeatures,
      gameArea,
      overlays,
      panelPeekHeightPx,
      panelTopPaddingPx,
      phase,
      selectedPoiId,
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
        seekerResolving: draft.measuring.seekerResolving || draft.matching.seekerResolving,
        eliminationPreview: draft.measuring.eliminationPreview || draft.matching.eliminationPreview,
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
      setFocusPreferFly(false);
      return;
    }

    const fingerprintChanged = fingerprintRef.current !== fingerprint;
    const poiSelectionChange = previousPoiIdRef.current !== selectedPoiId && phase === "pick_poi";

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
  }, [cameraTarget, fingerprint, phase, placementActive, selectedPoiId, viewportFrame, walkActive]);

  // `focusPreferFly` is a one-shot signal for the reframe that just fired
  // (`placementRecenterToken` bump above). `MapView` only re-fits on token
  // changes (`fitBoundsMode="once"`), so clearing the flag here on the next
  // commit doesn't trigger a second reframe — it just stops the flag from
  // lingering into later ordinary reframes.
  useEffect(() => {
    setFocusPreferFly(false);
  }, []);

  return {
    effectiveFocusBounds: cameraTarget?.bounds ?? defaultFocusBounds,
    focusMinZoom: cameraTarget?.minZoom,
    focusMaxZoom: cameraTarget?.maxZoom,
    placementRecenterToken,
    focusPaddingBias: cameraTarget?.paddingBiasPx,
    focusPaddingTopBias: cameraTarget?.paddingTopBiasPx,
    focusPreferFly,
    requestPlacementRecenter,
  };
}
