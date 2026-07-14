import { useMemo } from "react";
import { CircleMarker } from "react-leaflet";
import { MapView } from "../../map/MapView";
import { GameAreaMask } from "../../map/GameAreaMask";
import { CombinedEliminationLayer } from "../../map/CombinedEliminationLayer";
import { MapDraftLayer } from "../../map/MapDraftLayer";
import { useTutorialMapViewport } from "../../../hooks/tutorial/TutorialMapViewportContext";
import { useTutorialInteractiveMapDraft } from "../../../hooks/tutorial/TutorialInteractiveMapDraftContext";
import { usePlacementMapFocus } from "../../../hooks/map-screen/usePlacementMapFocus";
import { placementCameraDraftFromOverlaySources } from "../../../domain/map/placementCamera";
import { ZERO_GAME_AREA } from "../../../domain/geometry/geometry";

interface TutorialMapContextPreviewProps {
  anchorLat?: number | null;
  anchorLng?: number | null;
  onMapClick?: (lat: number, lng: number) => void;
  mapKey?: string;
  /** When false, skip the default anchor dot (tool draft overlays include markers). */
  showAnchorMarker?: boolean;
}

const emptyDraft = placementCameraDraftFromOverlaySources({
  activeTool: "none",
  gameArea: ZERO_GAME_AREA,
  mapStyle: "standard",
  radar: { center: null, radiusMeters: 0, answer: null },
  pin: { point: null },
  tentacle: {
    center: null,
    searchRadiusMeters: 0,
    answerRadiusMeters: 0,
    pois: [],
    selectedPoiId: null,
    outOfReach: false,
    seekerResolving: false,
  },
  thermometer: {
    thermoA: null,
    thermoB: null,
    answer: null,
    targetDistanceMeters: 0,
    walkCurrentPoint: null,
    walkActive: false,
  },
  measuring: {
    seekerPoint: null,
    targetPoint: null,
    placePoints: [],
    siteRadiusMeters: null,
    boundaryPreview: null,
    eliminationPreview: null,
    seekerResolving: false,
  },
  matching: {
    seekerPoint: null,
    nearestFeaturePoint: null,
    boundaryPreview: null,
    eliminationPreview: null,
    seekerResolving: false,
  },
  zone: { vertices: [] },
});

export function TutorialMapContextPreview({
  anchorLat = null,
  anchorLng = null,
  onMapClick,
  mapKey = "tutorial-map-context",
  showAnchorMarker = true,
}: TutorialMapContextPreviewProps) {
  const { viewport, focusBounds, loading } = useTutorialMapViewport();
  const { activeTool, sources, overlays, eliminationFeatures } =
    useTutorialInteractiveMapDraft();

  const placementDraft = useMemo(
    () => (sources ? placementCameraDraftFromOverlaySources(sources) : emptyDraft),
    [sources],
  );

  const {
    effectiveFocusBounds,
    placementRecenterToken,
    focusPaddingBias,
    focusMinZoom,
    focusMaxZoom,
  } = usePlacementMapFocus({
    activeTool,
    draft: placementDraft,
    overlays,
    eliminationFeatures,
    gameArea: sources?.gameArea ?? viewport.gameArea,
    defaultFocusBounds: focusBounds,
    enabled: Boolean(onMapClick),
    panelMinimized: false,
    selectedPoiId: sources?.tentacle.selectedPoiId ?? null,
    walkActive: sources?.thermometer.walkActive ?? false,
  });
  const hasDraftMarkers = overlays.length > 0;

  return (
    <div className="tutorial-map-context-preview hud-panel relative z-0 h-[min(32dvh,12rem)] w-full shrink-0 overflow-hidden">
      <MapView
        className="h-full w-full"
        mapStyle="standard"
        interactive={Boolean(onMapClick)}
        showZoomControl={false}
        focusBounds={effectiveFocusBounds}
        focusMinZoom={focusMinZoom}
        focusMaxZoom={focusMaxZoom}
        fitBoundsMode="once"
        fitBoundsPadding={[20, 20]}
        recenterToken={placementRecenterToken}
        focusPaddingBias={focusPaddingBias}
        onMapClick={onMapClick}
        mapKey={`${mapKey}-${viewport.source}-${viewport.label}`}
      >
        <GameAreaMask gameArea={viewport.gameArea} />
        <CombinedEliminationLayer
          annotations={[]}
          gameArea={viewport.gameArea}
          draftFeatures={eliminationFeatures}
        />
        <MapDraftLayer overlays={overlays} />
        {showAnchorMarker &&
        !hasDraftMarkers &&
        anchorLat !== null &&
        anchorLng !== null ? (
          <CircleMarker
            center={[anchorLat, anchorLng]}
            radius={8}
            pathOptions={{
              color: "var(--color-highlight)",
              fillColor: "var(--color-highlight)",
              fillOpacity: 0.85,
              weight: 2,
            }}
          />
        ) : null}
      </MapView>
      {loading ? (
        <p className="sr-only">Loading map for your area…</p>
      ) : (
        <p className="sr-only">Map centered on {viewport.label}</p>
      )}
    </div>
  );
}
