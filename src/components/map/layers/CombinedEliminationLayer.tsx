import { Fragment, memo, useMemo } from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type {
  AnnotationRecord,
  GameArea,
  SessionRecord,
} from "../../../domain/map/annotations";
import { isEndGameActive } from "../../../domain/map/annotations";
import type { HidingZoneRecord } from "../../../domain/session/hiding/hidingZone";
import {
  annotationHasEliminationFeature,
} from "../../../domain/geometry/masks/combinedEliminationMask";
import { EMPTY_GEOJSON_FEATURES } from "../../../domain/geometry/masks/emptyFeatures";
import { polygonFeatureToLeafletPolygonGroups } from "../../../domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { getEliminationOverlayLayers } from "../../../domain/map/mapEliminationOverlayStyle";
import { useCombinedEliminationMask } from "../../../hooks/map/useCombinedEliminationMask";
import { useMapStore } from "../../../state/sessionStore";
import { useMapEngine } from "../chrome/mapEngineContext";
import { CompensatedPolygon } from "../helpers/CompensatedPolygon";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";

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
  const engine = useMapEngine();
  const mapStyle = useMapStore((state) => state.mapStyle);
  const overlayLayers = useMemo(
    () => getEliminationOverlayLayers(mapStyle),
    [mapStyle],
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

  if (engine === "maplibre") {
    return (
      <>
        {overlayLayers.map((layer, layerIndex) => (
          <MapLibreGeoJsonOverlay
            key={`combined-elimination-ml-${layerIndex}`}
            id={`combined-elimination-${layerIndex}`}
            data={combinedMask}
            fill={
              layer.fillColor
                ? {
                    fillColor: layer.fillColor,
                    fillOpacity: layer.fillOpacity ?? 0.35,
                  }
                : null
            }
            line={
              layer.stroke === false
                ? null
                : {
                    color:
                      layer.color ??
                      layer.fillColor ??
                      MAP_ANNOTATION_COLORS.elimination,
                    width: layer.weight ?? 1,
                    opacity: layer.opacity ?? 0.6,
                  }
            }
          />
        ))}
        {pulsing ? (
          <MapLibreGeoJsonOverlay
            id="combined-elimination-pulse"
            data={combinedMask}
            line={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              width: 2,
              opacity: 0.8,
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      {polygonFeatureToLeafletPolygonGroups(combinedMask).map((rings, index) => (
        <Fragment key={`combined-elimination-${index}`}>
          {overlayLayers.map((layer, layerIndex) => {
            const isTopLayer = layerIndex === overlayLayers.length - 1;

            return (
              <CompensatedPolygon
                key={`combined-elimination-${index}-${layerIndex}`}
                positions={rings}
                interactive={false}
                pathOptions={{
                  ...layer,
                  className:
                    pulsing && isTopLayer
                      ? "annotation-pulse"
                      : layer.className,
                }}
              />
            );
          })}
        </Fragment>
      ))}
    </>
  );
});
