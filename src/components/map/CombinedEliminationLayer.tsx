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

export function CombinedEliminationLayer({
  annotations,
  gameArea,
  draftFeatures = [],
  pulsingAnnotationIds = [],
  hidden = false,
}: CombinedEliminationLayerProps) {
  if (hidden) {
    return null;
  }

  const combinedMask = buildCombinedEliminationMask(
    annotations,
    gameArea,
    draftFeatures,
  );

  if (!combinedMask) {
    return null;
  }

  const pulsing = annotations.some(
    (annotation) =>
      pulsingAnnotationIds.includes(annotation.id) &&
      eliminationFeatureForAnnotation(annotation, gameArea) !== null,
  );

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
}
