import { useEffect, useRef, useState } from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import { EMPTY_GEOJSON_FEATURES } from "../../domain/geometry/masks/emptyFeatures";
import { requestCombinedEliminationMask } from "../../domain/geometry/masks/eliminationMaskWorkerClient";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import type { PolygonFeature } from "../../domain/geometry/kernel/types";

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
  draftFeatures = EMPTY_GEOJSON_FEATURES,
  endGameHidingZones = [],
  hidden = false,
}: UseCombinedEliminationMaskOptions) {
  const [mask, setMask] = useState<PolygonFeature | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (hidden) {
      generationRef.current += 1;
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;

    void requestCombinedEliminationMask(
      annotations,
      gameArea,
      draftFeatures,
      endGameHidingZones,
    )
      .then((result) => {
        if (generation === generationRef.current) {
          setMask(result);
        }
      })
      .catch(() => {
        if (generation === generationRef.current) {
          setMask(null);
        }
      });
  }, [annotations, draftFeatures, endGameHidingZones, gameArea, hidden]);

  if (hidden) {
    return null;
  }

  return mask;
}
