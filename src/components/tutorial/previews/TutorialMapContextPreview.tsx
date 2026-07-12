import { CircleMarker } from "react-leaflet";
import { MapView } from "../../map/MapView";
import { GameAreaMask } from "../../map/GameAreaMask";
import { CombinedEliminationLayer } from "../../map/CombinedEliminationLayer";
import { MapDraftLayer } from "../../map/MapDraftLayer";
import { useTutorialMapViewport } from "../../../hooks/tutorial/TutorialMapViewportContext";
import { useTutorialInteractiveMapDraft } from "../../../hooks/tutorial/TutorialInteractiveMapDraftContext";

interface TutorialMapContextPreviewProps {
  anchorLat?: number | null;
  anchorLng?: number | null;
  onMapClick?: (lat: number, lng: number) => void;
  mapKey?: string;
  /** When false, skip the default anchor dot (tool draft overlays include markers). */
  showAnchorMarker?: boolean;
}

export function TutorialMapContextPreview({
  anchorLat = null,
  anchorLng = null,
  onMapClick,
  mapKey = "tutorial-map-context",
  showAnchorMarker = true,
}: TutorialMapContextPreviewProps) {
  const { viewport, focusBounds, loading } = useTutorialMapViewport();
  const { overlays, eliminationFeatures } = useTutorialInteractiveMapDraft();
  const hasDraftMarkers = overlays.length > 0;

  return (
    <div className="tutorial-map-context-preview hud-panel relative z-0 h-[min(32dvh,12rem)] w-full shrink-0 overflow-hidden">
      <MapView
        className="h-full w-full"
        mapStyle="standard"
        interactive={Boolean(onMapClick)}
        showZoomControl={false}
        focusBounds={focusBounds}
        fitBoundsMode="once"
        fitBoundsPadding={[20, 20]}
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
