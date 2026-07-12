import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import { buildCombinedEliminationMask } from "../../domain/geometry/combinedEliminationMask";
import { EMPTY_GEOJSON_FEATURES } from "../../domain/geometry/emptyFeatures";
import { requestCombinedEliminationMask } from "../../domain/geometry/eliminationMaskWorkerClient";
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
  draftFeatures = EMPTY_GEOJSON_FEATURES,
  endGameHidingZones = [],
  hidden = false,
}: UseCombinedEliminationMaskOptions) {
  const [mask, setMask] = useState<ReturnType<
    typeof buildCombinedEliminationMask
  > | null>(null);
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
        const fallback = buildCombinedEliminationMask(
          annotations,
          gameArea,
          draftFeatures,
          endGameHidingZones,
        );
        if (generation === generationRef.current) {
          setMask(fallback);
        }
      });
  }, [annotations, draftFeatures, endGameHidingZones, gameArea, hidden]);

  const bootstrapMask = useMemo(() => {
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

  if (hidden) {
    return null;
  }

  return mask ?? bootstrapMask;
}
