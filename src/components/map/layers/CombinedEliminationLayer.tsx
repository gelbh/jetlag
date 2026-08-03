import { memo, useMemo } from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type {
  AnnotationRecord,
  GameArea,
  SessionRecord,
} from "../../../domain/map/annotations";
import { isEndGameActive } from "../../../domain/map/annotations";
import type { HidingZoneRecord } from "../../../domain/session/hiding/hidingZone";
import { annotationHasEliminationFeature } from "../../../domain/geometry/masks/combinedEliminationMask";
import { EMPTY_GEOJSON_FEATURES } from "../../../domain/geometry/masks/emptyFeatures";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { getEliminationOverlayLayers } from "../../../domain/map/mapEliminationOverlayStyle";
import { useCombinedEliminationMask } from "../../../hooks/map/useCombinedEliminationMask";
import { useMapStore } from "../../../state/sessionStore";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { pathOptionsToMapLibrePaint } from "../helpers/pathOptionsToMapLibrePaint";

interface CombinedEliminationLayerProps {
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  draftFeatures?: readonly Feature<GeoPolygon | MultiPolygon>[];
  pulsingAnnotationIds?: readonly string[];
  hidden?: boolean;
  session?: Pick<SessionRecord, "endGameStartedAt"> | null;
  hidingZones?: readonly HidingZoneRecord[];
}

export const CombinedEliminationLayer = memo(function CombinedEliminationLayer({
  annotations,
  gameArea,
  draftFeatures = EMPTY_GEOJSON_FEATURES,
  pulsingAnnotationIds = [],
  hidden = false,
  session = null,
  hidingZones = [],
}: CombinedEliminationLayerProps) {
  const mapStyle = useMapStore((state) => state.mapStyle);
  const streetBasemap = useMapStore((state) => state.streetBasemap);
  const overlayLayers = useMemo(
    () => getEliminationOverlayLayers(mapStyle, streetBasemap),
    [mapStyle, streetBasemap],
  );

  const endGameActive = isEndGameActive(session);
  const endGameZones = useMemo(
    () => (endGameActive ? hidingZones : []),
    [endGameActive, hidingZones],
  );

  const combinedMask = useCombinedEliminationMask({
    annotations,
    gameArea,
    draftFeatures,
    endGameHidingZones: endGameZones,
    hidden,
  });

  const pulsingIds = useMemo(
    () => new Set(pulsingAnnotationIds),
    [pulsingAnnotationIds],
  );

  const pulsing = useMemo(
    () =>
      annotations.some((annotation) =>
        annotationHasEliminationFeature(annotation, gameArea, pulsingIds),
      ),
    [annotations, gameArea, pulsingIds],
  );

  if (hidden || !combinedMask) {
    return null;
  }

  return (
    <MapLibreGeoJsonOverlay
      id="combined-elimination"
      data={combinedMask}
      layers={[
        ...overlayLayers.map((layer, layerIndex) => {
          const paint = pathOptionsToMapLibrePaint(layer);
          return {
            id: `combined-elimination-${layerIndex}`,
            fill: paint.fill,
            line: paint.line,
          };
        }),
        ...(pulsing
          ? [
              {
                id: "combined-elimination-pulse",
                line: {
                  color: MAP_ANNOTATION_COLORS.strokeLight,
                  width: 2,
                  opacity: 0.8,
                },
              },
            ]
          : []),
      ]}
    />
  );
});
