import type { Remote } from "comlink";
import { wrap } from "comlink";
import type { Feature, Polygon as GeoPolygon, MultiPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import type { HidingZoneRecord } from "../../session/hiding/hidingZone";
import {
  annotationsToEndGameDisks,
  computeEliminationUnionInput,
} from "../adapter/eliminationMask";
import { gameAreaFingerprint } from "../core/gameAreaConvert";
import type { DiskSpec, EliminationUnionInput, PolygonFeature } from "../kernel/types";
import { eliminationAnnotationsContentKey, isAddOnly } from "./eliminationAnnotationKey";

/** Full draft geometry identity for mask cache (preview fingerprints are lossy). */
function draftFeaturesContentKey(features: readonly Feature<GeoPolygon | MultiPolygon>[]): string {
  return features
    .map((feature) => {
      const id =
        typeof feature.id === "string" || typeof feature.id === "number" ? String(feature.id) : "";
      return `${id}:${feature.geometry.type}:${JSON.stringify(feature.geometry.coordinates)}`;
    })
    .join("|");
}

type EliminationMaskWorkerApi = {
  buildMaskFromUnionInput: (
    input: EliminationUnionInput,
    gameArea: GameArea,
  ) => Promise<PolygonFeature | null>;
  buildEndGameMaskFromDisks: (
    gameArea: GameArea,
    disks: readonly DiskSpec[],
  ) => Promise<PolygonFeature | null>;
};

type MaskCache = {
  annotationKey: string;
  gameAreaKey: string;
  draftKey: string;
  endGameKey: string;
  mask: PolygonFeature | null;
};

const WORKER_FAILURE_MESSAGE = "Elimination mask worker failed";

let worker: Worker | null = null;
let workerApi: Remote<EliminationMaskWorkerApi> | null = null;
const pendingRejects = new Set<(error: Error) => void>();
let maskCache: MaskCache | null = null;

function endGameContentKey(zones: readonly HidingZoneRecord[]): string {
  if (zones.length === 0) {
    return "";
  }
  return zones
    .map(
      (zone) =>
        `${zone.hiderUid}:${zone.center.lat.toFixed(6)}:${zone.center.lng.toFixed(6)}:${zone.radiusMeters}`,
    )
    .sort()
    .join("|");
}

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

function clearMaskCache(): void {
  maskCache = null;
}

function storeMaskCache(entry: MaskCache): PolygonFeature | null {
  maskCache = entry;
  return entry.mask;
}

function getWorkerApi(): Remote<EliminationMaskWorkerApi> {
  if (!workerApi) {
    worker = new Worker(new URL("./eliminationMask.worker.ts", import.meta.url), {
      type: "module",
    });
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

async function buildFullMask(
  api: Remote<EliminationMaskWorkerApi>,
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly Feature<GeoPolygon | MultiPolygon>[],
  pendingFailure: Promise<never>,
): Promise<PolygonFeature | null> {
  const input = await computeEliminationUnionInput(annotations, gameArea, draftFeatures);
  return await Promise.race([api.buildMaskFromUnionInput(input, gameArea), pendingFailure]);
}

async function buildIncrementalMask(
  api: Remote<EliminationMaskWorkerApi>,
  priorMask: PolygonFeature,
  newAnnotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  pendingFailure: Promise<never>,
): Promise<PolygonFeature | null> {
  const newInput = await computeEliminationUnionInput(newAnnotations, gameArea, []);
  const input: EliminationUnionInput = {
    polygons: [priorMask, ...newInput.polygons],
    disks: newInput.disks,
  };
  return await Promise.race([api.buildMaskFromUnionInput(input, gameArea), pendingFailure]);
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

  const gameAreaKey = gameAreaFingerprint(gameArea);
  const draftKey = draftFeaturesContentKey(draftFeatures);
  const endGameKey = endGameContentKey(endGameHidingZones);
  const annotationKey = eliminationAnnotationsContentKey(annotations);

  try {
    if (
      maskCache &&
      maskCache.annotationKey === annotationKey &&
      maskCache.gameAreaKey === gameAreaKey &&
      maskCache.draftKey === draftKey &&
      maskCache.endGameKey === endGameKey
    ) {
      return maskCache.mask;
    }

    if (endGameHidingZones.length > 0) {
      const mask = await Promise.race([
        api.buildEndGameMaskFromDisks(gameArea, annotationsToEndGameDisks(endGameHidingZones)),
        pendingFailure,
      ]);
      return storeMaskCache({
        annotationKey,
        gameAreaKey,
        draftKey,
        endGameKey,
        mask,
      });
    }

    if (!annotationKey && !draftKey) {
      clearMaskCache();
      const mask = await buildFullMask(api, annotations, gameArea, draftFeatures, pendingFailure);
      return mask;
    }

    const addOnly =
      maskCache?.mask &&
      maskCache.gameAreaKey === gameAreaKey &&
      maskCache.draftKey === draftKey &&
      maskCache.endGameKey === ""
        ? isAddOnly(maskCache.annotationKey, annotations)
        : ({ addOnly: false } as const);

    if (addOnly.addOnly) {
      const newIdSet = new Set(addOnly.newIds);
      const newAnnotations = annotations.filter((annotation) => newIdSet.has(annotation.id));
      try {
        const mask = await buildIncrementalMask(
          api,
          maskCache!.mask!,
          newAnnotations,
          gameArea,
          pendingFailure,
        );
        // Incremental null → full rebuild once (below), same as throw.
        if (mask !== null) {
          return storeMaskCache({
            annotationKey,
            gameAreaKey,
            draftKey,
            endGameKey: "",
            mask,
          });
        }
      } catch {
        // Incremental throw → full rebuild once (below).
      }
    }

    const mask = await buildFullMask(api, annotations, gameArea, draftFeatures, pendingFailure);
    return storeMaskCache({
      annotationKey,
      gameAreaKey,
      draftKey,
      endGameKey: "",
      mask,
    });
  } catch (error) {
    clearMaskCache();
    disposeWorker(error instanceof Error ? error : new Error(WORKER_FAILURE_MESSAGE));
    throw error;
  } finally {
    releasePending?.();
  }
}

export function resetEliminationMaskWorkerForTests(): void {
  clearMaskCache();
  disposeWorker();
}
