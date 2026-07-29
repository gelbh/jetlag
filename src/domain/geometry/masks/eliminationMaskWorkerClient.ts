import { wrap } from "comlink";
import type { Remote } from "comlink";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import type { HidingZoneRecord } from "../../session/hiding/hidingZone";
import {
  annotationsToEndGameDisks,
  computeEliminationUnionInput,
} from "../adapter/eliminationMask";
import type {
  DiskSpec,
  EliminationUnionInput,
  PolygonFeature,
} from "../kernel/types";
import type { MaskKernelMode } from "../kernel/maskKernelMode";
import { resolveClientMaskKernelMode } from "../kernel/resolveClientMaskKernelMode";

type EliminationMaskWorkerApi = {
  buildMaskFromUnionInput: (
    input: EliminationUnionInput,
    gameArea: GameArea,
    mode?: MaskKernelMode,
  ) => Promise<PolygonFeature | null>;
  buildEndGameMaskFromDisks: (
    gameArea: GameArea,
    disks: readonly DiskSpec[],
    mode?: MaskKernelMode,
  ) => Promise<PolygonFeature | null>;
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
  const mode = resolveClientMaskKernelMode();
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
          mode,
        ),
        pendingFailure,
      ]);
    }

    const input = await computeEliminationUnionInput(
      annotations,
      gameArea,
      draftFeatures,
    );
    return await Promise.race([
      api.buildMaskFromUnionInput(input, gameArea, mode),
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
