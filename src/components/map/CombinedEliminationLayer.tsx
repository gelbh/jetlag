import { Polygon } from "react-leaflet";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/annotations";
import {
  buildCombinedEliminationMask,
  ELIMINATION_FILL_COLOR,
} from "../../domain/combinedEliminationMask";
import { polygonFeatureToLeafletPolygonGroups } from "../../domain/geometry";

interface CombinedEliminationLayerProps {
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  draftFeatures?: readonly Feature<GeoPolygon | MultiPolygon>[];
  hidden?: boolean;
}

export function CombinedEliminationLayer({
  annotations,
  gameArea,
  draftFeatures = [],
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
          }}
        />
      ))}
    </>
  );
}
