import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LatLngTuple } from "../../domain/geometry";
import {
  buildThermometerStartPointGeometry,
  crowFliesDistanceMeters,
} from "../../domain/thermometerWalk";
import type { PendingQuestionPlacement } from "../../domain/sessionChat";
import { useLiveLocation } from "../useLiveLocation";

interface UseThermometerWalkParams {
  active: boolean;
  startPoint: LatLngTuple | null;
  targetDistanceMeters: number;
  onAutoStop: (endPoint: LatLngTuple) => void;
}

export function useThermometerWalk({
  active,
  startPoint,
  targetDistanceMeters,
  onAutoStop,
}: UseThermometerWalkParams) {
  const onAutoStopRef = useRef(onAutoStop);
  const completedRef = useRef(false);
  const [currentPoint, setCurrentPoint] = useState<LatLngTuple | null>(null);

  useEffect(() => {
    onAutoStopRef.current = onAutoStop;
  }, [onAutoStop]);

  useEffect(() => {
    if (!active) {
      completedRef.current = false;
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

  useEffect(() => {
    if (!active || !startPoint || !reading || completedRef.current) {
      return;
    }

    const point: LatLngTuple = [reading.lat, reading.lng];
    setCurrentPoint(point);

    const traveled = crowFliesDistanceMeters(startPoint, point);
    if (traveled >= targetDistanceMeters) {
      completedRef.current = true;
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(200);
      }
      onAutoStopRef.current(point);
    }
  }, [active, reading, startPoint, targetDistanceMeters]);

  const cancelWalk = useCallback(() => {
    completedRef.current = false;
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
