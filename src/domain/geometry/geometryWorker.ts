import { expose } from "comlink";
import {
  buildCombinedEliminationMask,
  computeEliminationUnionInput,
} from "./combinedEliminationMask";
import {
  unionEliminationParts,
  type DiskSpec,
  type EliminationUnionInput,
  type PolygonFeature,
} from "./unionPolygonFeatures";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import type { HidingZoneRecord } from "../session/hidingZone";

export interface GeometryWorkerApi {
  unionEliminationParts(
    input: EliminationUnionInput,
  ): PolygonFeature | null;
  buildCombinedEliminationMask(
    annotations: AnnotationRecord[],
    gameArea: GameArea,
    draftFeatures: PolygonFeature[],
    endGameHidingZones: HidingZoneRecord[],
  ): PolygonFeature | null;
  computeEliminationUnionInput(
    annotations: AnnotationRecord[],
    gameArea: GameArea,
    draftFeatures: PolygonFeature[],
  ): EliminationUnionInput;
}

const api: GeometryWorkerApi = {
  unionEliminationParts(input) {
    return unionEliminationParts(input);
  },
  buildCombinedEliminationMask(
    annotations,
    gameArea,
    draftFeatures,
    endGameHidingZones,
  ) {
    return buildCombinedEliminationMask(
      annotations,
      gameArea,
      draftFeatures,
      endGameHidingZones,
    );
  },
  computeEliminationUnionInput(annotations, gameArea, draftFeatures) {
    return computeEliminationUnionInput(annotations, gameArea, draftFeatures);
  },
};

expose(api);

export type { DiskSpec, EliminationUnionInput, PolygonFeature };
