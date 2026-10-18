import type { Feature, Polygon as GeoPolygon, MultiPolygon } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PolygonFeature } from "../../domain/geometry/kernel/types";
import { requestCombinedEliminationMask } from "../../domain/geometry/masks/eliminationMaskWorkerClient";
import { EMPTY_GEOJSON_FEATURES } from "../../domain/geometry/masks/emptyFeatures";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { sizeBucket } from "../../domain/progress/stagePriors";
import { previewEliminationFeaturesFingerprint } from "../../domain/questions/overlays/previewEliminationFeaturesFingerprint";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import {
  createLoadTask,
  getNamedLoadTask,
  setNamedLoadTask,
} from "../../services/core/progress/loadTask";
import { createYieldBudget } from "../../services/core/progress/yieldToMain";

interface UseCombinedEliminationMaskOptions {
  annotations: readonly AnnotationRecord[];
  gameArea: GameArea;
  draftFeatures?: readonly Feature<GeoPolygon | MultiPolygon>[];
  endGameHidingZones?: readonly HidingZoneRecord[];
  hidden?: boolean;
}

/** Name of the published mask-rebuild task, read by the map refine chip. */
export const ELIMINATION_MASK_TASK = "elimination-mask";
const MASK_PROGRESS_DELAY_MS = 400;
const MASK_PREPARE_STAGE = {
  kind: "compute",
  label: "Preparing clues",
  historyKey: "mask:prepare",
} as const;
const MASK_UNION_STAGE = {
  kind: "compute",
  label: "Combining shaded areas",
  historyKey: "mask:union",
} as const;

export function useCombinedEliminationMask({
  annotations,
  gameArea,
  draftFeatures = EMPTY_GEOJSON_FEATURES,
  endGameHidingZones = [],
  hidden = false,
}: UseCombinedEliminationMaskOptions) {
  const [mask, setMask] = useState<PolygonFeature | null>(null);
  const generationRef = useRef(0);
  const draftFeaturesRef = useRef(draftFeatures);

  useEffect(() => {
    draftFeaturesRef.current = draftFeatures;
  }, [draftFeatures]);

  const draftFingerprint = useMemo(
    () => previewEliminationFeaturesFingerprint(draftFeatures),
    [draftFeatures],
  );

  useEffect(() => {
    if (hidden) {
      generationRef.current += 1;
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;

    const task = createLoadTask({
      label: "Updating shaded area",
      priority: "background",
      cancellable: false,
    });
    const bucket = sizeBucket(annotations.length);
    const prepare = task.stage({ ...MASK_PREPARE_STAGE, sizeBucket: bucket });
    const union = task.stage({ ...MASK_UNION_STAGE, sizeBucket: bucket });
    const yieldBudget = createYieldBudget();
    // Most rebuilds are cache hits or instant; only surface ones the user would notice.
    const publishTimer = window.setTimeout(() => {
      setNamedLoadTask(ELIMINATION_MASK_TASK, task);
    }, MASK_PROGRESS_DELAY_MS);

    void requestCombinedEliminationMask(
      annotations,
      gameArea,
      draftFeaturesRef.current,
      endGameHidingZones,
      {
        onPrepare: async (done, total) => {
          prepare.setCount(done, total);
          await yieldBudget();
        },
        onUnion: () => {
          prepare.finish();
          union.start();
        },
      },
    )
      .finally(() => {
        window.clearTimeout(publishTimer);
        task.complete();
        if (getNamedLoadTask(ELIMINATION_MASK_TASK) === task) {
          setNamedLoadTask(ELIMINATION_MASK_TASK, null);
        }
      })
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
  }, [annotations, draftFingerprint, endGameHidingZones, gameArea, hidden]);

  if (hidden) {
    return null;
  }

  return mask;
}
