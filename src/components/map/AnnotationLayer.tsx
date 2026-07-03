import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/annotations";
import { isActive } from "../../domain/annotations";
import {
  useAnnotationStore,
  useMapStore,
  type LayerVisibility,
} from "../../state/sessionStore";
import { CombinedEliminationLayer } from "./CombinedEliminationLayer";
import { renderAnnotationLayerItem } from "./annotationLayerRegistry";

interface AnnotationLayerProps {
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  hidden?: boolean;
  selectedAnnotationId?: string | null;
  layerVisibility?: LayerVisibility;
  draftEliminationFeatures?: readonly Feature<GeoPolygon | MultiPolygon>[];
}

export function AnnotationLayer({
  annotations,
  gameArea,
  hidden,
  selectedAnnotationId = null,
  layerVisibility,
  draftEliminationFeatures = [],
}: AnnotationLayerProps) {
  const pulsingAnnotationIds = useAnnotationStore(
    (state) => state.pulsingAnnotationIds,
  );
  const setSelectedAnnotationId = useAnnotationStore(
    (state) => state.setSelectedAnnotationId,
  );
  const geometryEditAnnotationId = useAnnotationStore(
    (state) => state.geometryEditAnnotationId,
  );
  const activeTool = useMapStore((state) => state.activeTool);
  const selectionEnabled =
    activeTool === "none" && geometryEditAnnotationId === null;

  if (hidden) {
    return null;
  }

  return (
    <>
      <CombinedEliminationLayer
        annotations={annotations}
        gameArea={gameArea}
        draftFeatures={draftEliminationFeatures}
        pulsingAnnotationIds={pulsingAnnotationIds}
      />
      {annotations.filter(isActive).map((annotation) =>
        renderAnnotationLayerItem({
          annotation,
          gameArea,
          layerVisibility,
          selectedAnnotationId,
          selectionEnabled,
          selectAnnotation: () => setSelectedAnnotationId(annotation.id),
        }),
      )}
    </>
  );
}
