import type { Feature, Polygon as GeoPolygon, MultiPolygon } from "geojson";
import { memo } from "react";
import { EMPTY_GEOJSON_FEATURES } from "@/domain/geometry/masks/emptyFeatures";
import type { AnnotationRecord, GameArea, SessionRecord } from "@/domain/map/annotations";
import { isActive } from "@/domain/map/annotations";
import type { HidingZoneRecord } from "@/domain/session/hiding/hidingZone";
import { type LayerVisibility, useAnnotationStore, useMapStore } from "@/state/sessionStore";
import { renderAnnotationLayerItem } from "./annotationLayerRegistry";
import { CombinedEliminationLayer } from "./CombinedEliminationLayer";

interface AnnotationLayerProps {
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  hidden?: boolean;
  selectedAnnotationId?: string | null;
  layerVisibility?: LayerVisibility;
  draftEliminationFeatures?: readonly Feature<GeoPolygon | MultiPolygon>[];
  session?: Pick<SessionRecord, "endGameStartedAt"> | null;
  hidingZones?: readonly HidingZoneRecord[];
}

export const AnnotationLayer = memo(function AnnotationLayer({
  annotations,
  gameArea,
  hidden,
  selectedAnnotationId = null,
  layerVisibility,
  draftEliminationFeatures = EMPTY_GEOJSON_FEATURES,
  session = null,
  hidingZones = [],
}: AnnotationLayerProps) {
  const pulsingAnnotationIds = useAnnotationStore((state) => state.pulsingAnnotationIds);
  const setSelectedAnnotationId = useAnnotationStore((state) => state.setSelectedAnnotationId);
  const geometryEditAnnotationId = useAnnotationStore((state) => state.geometryEditAnnotationId);
  const activeTool = useMapStore((state) => state.activeTool);
  const selectionEnabled = activeTool === "none" && geometryEditAnnotationId === null;

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
        session={session}
        hidingZones={hidingZones}
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
});
