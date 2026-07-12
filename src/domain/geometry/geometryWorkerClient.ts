import { wrap, type Remote } from "comlink";
import {
  buildCombinedEliminationMask,
  computeEliminationUnionInput,
} from "./combinedEliminationMask";
import {
  unionEliminationParts,
  type EliminationUnionInput,
  type PolygonFeature,
} from "./unionPolygonFeatures";
import type { GeometryWorkerApi } from "./geometryWorker";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import type { HidingZoneRecord } from "../session/hidingZone";

let worker: Worker | null = null;
let workerApi: Remote<GeometryWorkerApi> | null = null;
let workerInitFailed = false;

export function isGeometryWorkerAvailable(): boolean {
  return typeof Worker !== "undefined" && !workerInitFailed;
}

function getGeometryWorkerApi(): Remote<GeometryWorkerApi> | null {
  if (workerInitFailed || typeof Worker === "undefined") {
    return null;
  }

  try {
    if (!worker) {
      worker = new Worker(new URL("./geometryWorker.ts", import.meta.url), {
        type: "module",
      });
    }

    if (!workerApi) {
      workerApi = wrap<GeometryWorkerApi>(worker);
    }

    return workerApi;
  } catch {
    workerInitFailed = true;
    worker?.terminate();
    worker = null;
    workerApi = null;
    return null;
  }
}

export function unionEliminationPartsAsync(
  input: EliminationUnionInput,
): Promise<PolygonFeature | null> {
  const api = getGeometryWorkerApi();
  if (!api) {
    return Promise.resolve(unionEliminationParts(input));
  }

  return api.unionEliminationParts(input);
}

export function buildCombinedEliminationMaskAsync(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly PolygonFeature[] = [],
  endGameHidingZones: readonly HidingZoneRecord[] = [],
): Promise<PolygonFeature | null> {
  const api = getGeometryWorkerApi();
  if (!api) {
    return Promise.resolve(
      buildCombinedEliminationMask(
        annotations,
        gameArea,
        draftFeatures,
        endGameHidingZones,
      ),
    );
  }

  return api.buildCombinedEliminationMask(
    [...annotations],
    gameArea,
    [...draftFeatures],
    [...endGameHidingZones],
  );
}

export function computeEliminationUnionInputAsync(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly PolygonFeature[] = [],
): Promise<EliminationUnionInput> {
  const api = getGeometryWorkerApi();
  if (!api) {
    return Promise.resolve(
      computeEliminationUnionInput(annotations, gameArea, draftFeatures),
    );
  }

  return api.computeEliminationUnionInput(
    [...annotations],
    gameArea,
    [...draftFeatures],
  );
}

export function terminateGeometryWorkerForTests(): void {
  worker?.terminate();
  worker = null;
  workerApi = null;
  workerInitFailed = false;
}
