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

function getWorkerApi(): Remote<EliminationMaskWorkerApi> {
  if (!workerApi) {
    worker = new Worker(
      new URL("./eliminationMask.worker.ts", import.meta.url),
      { type: "module" },
    );
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
  return api.buildCombinedEliminationMask(
    annotations,
    gameArea,
    draftFeatures,
    endGameHidingZones,
  );
}

export function resetEliminationMaskWorkerForTests(): void {
  worker?.terminate();
  worker = null;
  workerApi = null;
}
