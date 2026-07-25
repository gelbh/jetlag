export {
  ELIMINATION_FILL_COLOR,
  annotationHasEliminationFeature,
  computeEliminationUnionInput,
  eliminationDiskForAnnotation,
  eliminationFeatureForAnnotation,
} from "./adapter/eliminationMask";

import {
  annotationsToEndGameDisks,
  computeEliminationUnionInput,
} from "./adapter/eliminationMask";
import {
  buildEndGameMaskFromDisks,
  buildMaskFromUnionInput,
} from "./kernel/buildMask";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import type { HidingZoneRecord } from "../session/hidingZone";
import type { PolygonFeature } from "./kernel/types";

export function buildCombinedEliminationMask(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly PolygonFeature[] = [],
  endGameHidingZones: readonly HidingZoneRecord[] = [],
): PolygonFeature | null {
  if (endGameHidingZones.length > 0) {
    return buildEndGameEliminationMask(gameArea, endGameHidingZones);
  }
  return buildMaskFromUnionInput(
    computeEliminationUnionInput(annotations, gameArea, draftFeatures),
    gameArea,
  );
}

export function buildEndGameEliminationMask(
  gameArea: GameArea,
  hidingZones: readonly HidingZoneRecord[],
): PolygonFeature | null {
  return buildEndGameMaskFromDisks(
    gameArea,
    annotationsToEndGameDisks(hidingZones),
  );
}
