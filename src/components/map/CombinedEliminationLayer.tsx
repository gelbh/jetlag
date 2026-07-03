import { memo, useMemo } from "react";
import { Polygon } from "react-leaflet";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/annotations";
import {
  buildCombinedEliminationMask,
  eliminationFeatureForAnnotation,
  ELIMINATION_FILL_COLOR,
} from "../../domain/combinedEliminationMask";
import { polygonFeatureToLeafletPolygonGroups } from "../../domain/geometry";

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
        <Polygon
          key={`combined-elimination-${index}`}
          positions={rings}
          interactive={false}
          pathOptions={{
            stroke: false,
            fillColor: ELIMINATION_FILL_COLOR,
            fillOpacity: 0.35,
            className: pulsing ? "annotation-pulse" : undefined,
          }}
        />
      ))}
    </>
  );
});
