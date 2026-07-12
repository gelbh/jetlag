import { useMemo } from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import { buildCombinedEliminationMask } from "../../domain/geometry/combinedEliminationMask";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";

interface UseCombinedEliminationMaskOptions {
  annotations: readonly AnnotationRecord[];
  gameArea: GameArea;
  draftFeatures?: readonly Feature<GeoPolygon | MultiPolygon>[];
  endGameHidingZones?: readonly HidingZoneRecord[];
  hidden?: boolean;
}

export function useCombinedEliminationMask({
  annotations,
  gameArea,
  draftFeatures = [],
  endGameHidingZones = [],
  hidden = false,
}: UseCombinedEliminationMaskOptions) {
  return useMemo(() => {
    if (hidden) {
      return null;
    }

    return buildCombinedEliminationMask(
      annotations,
      gameArea,
      draftFeatures,
      endGameHidingZones,
    );
  }, [annotations, draftFeatures, endGameHidingZones, gameArea, hidden]);
}
