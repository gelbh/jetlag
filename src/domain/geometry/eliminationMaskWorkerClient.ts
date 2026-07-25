import { wrap } from "comlink";
import type { Remote } from "comlink";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import type { HidingZoneRecord } from "../session/hidingZone";
import {
  annotationsToEndGameDisks,
  computeEliminationUnionInput,
} from "./adapter/eliminationMask";
import type {
  buildEndGameMaskFromDisks,
  buildMaskFromUnionInput,
} from "./kernel/buildMask";
import type { PolygonFeature } from "./kernel/types";

type EliminationMaskWorkerApi = {
  buildMaskFromUnionInput: typeof buildMaskFromUnionInput;
  buildEndGameMaskFromDisks: typeof buildEndGameMaskFromDisks;
};

const WORKER_FAILURE_MESSAGE = "Elimination mask worker failed";

let worker: Worker | null = null;
let workerApi: Remote<EliminationMaskWorkerApi> | null = null;
const pendingRejects = new Set<(error: Error) => void>();

function rejectPendingRequests(error: Error): void {
  for (const reject of pendingRejects) {
    reject(error);
  }
  pendingRejects.clear();
}

function disposeWorker(error?: Error): void {
  rejectPendingRequests(error ?? new Error(WORKER_FAILURE_MESSAGE));
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
): Promise<PolygonFeature | null> {
  const api = getWorkerApi();
  let releasePending: (() => void) | undefined;

  const pendingFailure = new Promise<never>((_, reject) => {
    const rejectPending = (error: Error) => {
      reject(error);
    };
    pendingRejects.add(rejectPending);
    releasePending = () => {
      pendingRejects.delete(rejectPending);
    };
  });

  try {
    if (endGameHidingZones.length > 0) {
      return await Promise.race([
        api.buildEndGameMaskFromDisks(
          gameArea,
          annotationsToEndGameDisks(endGameHidingZones),
        ),
        pendingFailure,
      ]);
    }

    const input = computeEliminationUnionInput(
      annotations,
      gameArea,
      draftFeatures,
    );
    return await Promise.race([
      api.buildMaskFromUnionInput(input, gameArea),
      pendingFailure,
    ]);
  } catch (error) {
    disposeWorker(
      error instanceof Error ? error : new Error(WORKER_FAILURE_MESSAGE),
    );
    throw error;
  } finally {
    releasePending?.();
  }
}

export function resetEliminationMaskWorkerForTests(): void {
  disposeWorker();
}
