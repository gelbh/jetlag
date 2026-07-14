import { wrap } from "comlink";
import type { Remote } from "comlink";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import type { HidingZoneRecord } from "../session/hidingZone";
import type { buildCombinedEliminationMask } from "./combinedEliminationMask";

type EliminationMaskWorkerApi = {
  buildCombinedEliminationMask: typeof buildCombinedEliminationMask;
};

let worker: Worker | null = null;
let workerApi: Remote<EliminationMaskWorkerApi> | null = null;

function disposeWorker(): void {
  worker?.terminate();
  worker = null;
  workerApi = null;
}

function getWorkerApi(): Remote<EliminationMaskWorkerApi> {
  if (!workerApi) {
    worker = new Worker(
      new URL("./eliminationMask.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onerror = () => {
      disposeWorker();
    };
    worker.onmessageerror = () => {
      disposeWorker();
    };
    workerApi = wrap<EliminationMaskWorkerApi>(worker);
  }

  return workerApi;
}

export async function requestCombinedEliminationMask(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly Feature<GeoPolygon | MultiPolygon>[],
  endGameHidingZones: readonly HidingZoneRecord[],
): Promise<ReturnType<typeof buildCombinedEliminationMask>> {
  const api = getWorkerApi();
  try {
    return await api.buildCombinedEliminationMask(
      annotations,
      gameArea,
      draftFeatures,
      endGameHidingZones,
    );
  } catch (error) {
    disposeWorker();
    throw error;
  }
}

export function resetEliminationMaskWorkerForTests(): void {
  disposeWorker();
}
