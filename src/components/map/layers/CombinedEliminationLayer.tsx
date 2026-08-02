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

function useCombinedEliminationState({
  annotations,
  gameArea,
  draftFeatures = EMPTY_GEOJSON_FEATURES,
  pulsingAnnotationIds = [],
  hidden = false,
  session = null,
  hidingZones = [],
}: CombinedEliminationLayerProps) {
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

  return { overlayLayers, combinedMask, pulsing, hidden };
}

function CombinedEliminationLayerMapLibre(
  props: CombinedEliminationLayerProps,
) {
  const { overlayLayers, combinedMask, pulsing, hidden } =
    useCombinedEliminationState(props);

  if (hidden || !combinedMask) {
    return null;
  }

  return (
    <>
      {overlayLayers.map((layer, layerIndex) => {
        const paint = pathOptionsToMapLibrePaint(layer);
        return (
          <MapLibreGeoJsonOverlay
            key={`combined-elimination-ml-${layerIndex}`}
            id={`combined-elimination-${layerIndex}`}
            data={combinedMask}
            fill={paint.fill}
            line={paint.line}
          />
        );
      })}
      {/* Static highlight stub — Leaflet uses CSS annotation-pulse; full pulse in later polish */}
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

function CombinedEliminationLayerLeaflet(
  props: CombinedEliminationLayerProps,
) {
  const { overlayLayers, combinedMask, pulsing, hidden } =
    useCombinedEliminationState(props);

  if (hidden || !combinedMask) {
    return null;
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
}

export const CombinedEliminationLayer = memo(
  function CombinedEliminationLayer(props: CombinedEliminationLayerProps) {
    const engine = useMapEngine();
    if (engine === "maplibre") {
      return <CombinedEliminationLayerMapLibre {...props} />;
    }
    return <CombinedEliminationLayerLeaflet {...props} />;
  },
);
