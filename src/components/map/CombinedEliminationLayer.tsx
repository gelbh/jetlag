import { Fragment, memo, useMemo } from "react";
import { Polygon } from "react-leaflet";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/annotations";
import {
  buildCombinedEliminationMask,
  eliminationFeatureForAnnotation,
} from "../../domain/combinedEliminationMask";
import { polygonFeatureToLeafletPolygonGroups } from "../../domain/geometry";
import { getEliminationOverlayLayers } from "../../domain/mapEliminationOverlayStyle";
import { useMapStore } from "../../state/sessionStore";

interface CombinedEliminationLayerProps {
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  draftFeatures?: readonly Feature<GeoPolygon | MultiPolygon>[];
  pulsingAnnotationIds?: readonly string[];
  hidden?: boolean;
}

export const CombinedEliminationLayer = memo(function CombinedEliminationLayer({
  annotations,
  gameArea,
  draftFeatures = [],
  pulsingAnnotationIds = [],
  hidden = false,
}: CombinedEliminationLayerProps) {
  const mapStyle = useMapStore((state) => state.mapStyle);
  const overlayLayers = useMemo(
    () => getEliminationOverlayLayers(mapStyle),
    [mapStyle],
  );

  const combinedMask = useMemo(() => {
    if (hidden) {
      return null;
    }

    return buildCombinedEliminationMask(
      annotations,
      gameArea,
      draftFeatures,
    );
  }, [annotations, draftFeatures, gameArea, hidden]);

  const pulsing = useMemo(
    () =>
      annotations.some(
        (annotation) =>
          pulsingAnnotationIds.includes(annotation.id) &&
          eliminationFeatureForAnnotation(annotation, gameArea) !== null,
      ),
    [annotations, gameArea, pulsingAnnotationIds],
  );

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
              <Polygon
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
