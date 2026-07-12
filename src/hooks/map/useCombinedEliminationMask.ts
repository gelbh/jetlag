import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import {
  buildCombinedEliminationMask,
  computeEliminationUnionInput,
} from "../../domain/geometry/combinedEliminationMask";
import {
  buildCombinedEliminationMaskAsync,
  isGeometryWorkerAvailable,
} from "../../domain/geometry/geometryWorkerClient";
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
  draftFeatures = [],
  endGameHidingZones = [],
  hidden = false,
}: UseCombinedEliminationMaskOptions) {
  const syncMask = useMemo(() => {
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

  const [asyncMask, setAsyncMask] = useState<typeof syncMask>(syncMask);
  const requestIdRef = useRef(0);

  const workerInputKey = useMemo(() => {
    if (hidden) {
      return "hidden";
    }

    const input = computeEliminationUnionInput(
      annotations,
      gameArea,
      draftFeatures,
    );
    const endGameKey = endGameHidingZones
      .map(
        (zone) =>
          `${zone.stationId}:${zone.center.lat}:${zone.center.lng}:${zone.radiusMeters}`,
      )
      .sort()
      .join("|");

    return JSON.stringify({
      polygons: input.polygons.map((feature) => feature.geometry),
      disks: input.disks,
      endGameKey,
    });
  }, [annotations, draftFeatures, endGameHidingZones, gameArea, hidden]);

  useEffect(() => {
    if (hidden) {
      setAsyncMask(null);
      return;
    }

    if (!isGeometryWorkerAvailable()) {
      setAsyncMask(syncMask);
      return;
    }

    const requestId = ++requestIdRef.current;
    setAsyncMask(syncMask);

    void buildCombinedEliminationMaskAsync(
      annotations,
      gameArea,
      draftFeatures,
      endGameHidingZones,
    ).then((mask) => {
      if (requestIdRef.current === requestId) {
        setAsyncMask(mask);
      }
    });
  }, [
    annotations,
    draftFeatures,
    endGameHidingZones,
    gameArea,
    hidden,
    syncMask,
    workerInputKey,
  ]);

  return hidden ? null : (asyncMask ?? syncMask);
}
