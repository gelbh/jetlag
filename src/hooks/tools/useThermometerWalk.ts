import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  THERMOMETER_WALK_MAX_DURATION_MS,
  buildThermometerStartPointGeometry,
  crowFliesDistanceMeters,
} from "../../domain/questions";
import type { PendingQuestionPlacement } from "../../domain/session/sessionChat";
import { useLiveLocation } from "../location/useLiveLocation";

interface UseThermometerWalkParams {
  active: boolean;
  startPoint: LatLngTuple | null;
  targetDistanceMeters: number;
  onAutoStop: (endPoint: LatLngTuple) => void | Promise<void>;
  onError?: (message: string) => void;
  maxDurationMs?: number;
}

export function useThermometerWalk({
  active,
  startPoint,
  targetDistanceMeters,
  onAutoStop,
  onError,
  maxDurationMs = THERMOMETER_WALK_MAX_DURATION_MS,
}: UseThermometerWalkParams) {
  const onAutoStopRef = useRef(onAutoStop);
  const onErrorRef = useRef(onError);
  const completedRef = useRef(false);
  const stoppingRef = useRef(false);
  const [currentPoint, setCurrentPoint] = useState<LatLngTuple | null>(null);

  useEffect(() => {
    onAutoStopRef.current = onAutoStop;
  }, [onAutoStop]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!active) {
      completedRef.current = false;
      stoppingRef.current = false;
    }
  }, [active]);

  const { reading, error } = useLiveLocation(active && startPoint !== null, {
    highAccuracy: true,
    minIntervalMs: 750,
    minDistanceMeters: 3,
  });

  const distanceTraveledMeters = useMemo(() => {
    if (!startPoint || !currentPoint) {
      return null;
    }

    return crowFliesDistanceMeters(startPoint, currentPoint);
  }, [currentPoint, startPoint]);

  const finishWalk = useCallback(async (point: LatLngTuple) => {
    if (completedRef.current || stoppingRef.current) {
      return;
    }

    stoppingRef.current = true;
    try {
      await onAutoStopRef.current(point);
      completedRef.current = true;
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(200);
      }
    } catch (error) {
      completedRef.current = false;
      onErrorRef.current?.(
        error instanceof Error
          ? error.message
          : "Thermometer walk could not finish. Try again.",
      );
    } finally {
      stoppingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active || !startPoint || !reading || completedRef.current) {
      return;
    }

    const point: LatLngTuple = [reading.lat, reading.lng];
    setCurrentPoint(point);

    const traveled = crowFliesDistanceMeters(startPoint, point);
    if (traveled >= targetDistanceMeters) {
      void finishWalk(point);
    }
  }, [active, finishWalk, reading, startPoint, targetDistanceMeters]);

  useEffect(() => {
    if (!active || !startPoint || maxDurationMs <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (completedRef.current || stoppingRef.current) {
        return;
      }

      const fallbackPoint = currentPoint ?? startPoint;
      void finishWalk(fallbackPoint);
    }, maxDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [active, currentPoint, finishWalk, maxDurationMs, startPoint]);

  const cancelWalk = useCallback(() => {
    completedRef.current = false;
    stoppingRef.current = false;
    setCurrentPoint(null);
  }, []);

  return {
    currentPoint: active ? currentPoint : null,
    distanceTraveledMeters,
    gpsError: error,
    cancelWalk,
  };
}

export function thermometerWalkStartPlacement(
  startPoint: LatLngTuple,
  distanceMeters: number,
): PendingQuestionPlacement {
  return {
    geometryJson: JSON.stringify(buildThermometerStartPointGeometry(startPoint)),
    metadata: {
      thermometerDistanceMeters: distanceMeters,
      walkStartJson: JSON.stringify({ lat: startPoint[0], lng: startPoint[1] }),
    },
  };
}
