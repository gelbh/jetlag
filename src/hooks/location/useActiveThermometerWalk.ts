import { useMemo } from "react";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "../../domain/session/sessionChat";
import {
  crowFliesDistanceMeters,
  isThermometerWalkActive,
  parseThermometerStartPoint,
} from "../../domain/questions";

interface UseActiveThermometerWalkParams {
  pendingQuestions: readonly PendingQuestionRecord[];
  seekerLocations: readonly PlayerLocationRecord[];
  myUid: string | null;
  localLivePoint: LatLngTuple | null;
}

export function useActiveThermometerWalk({
  pendingQuestions,
  seekerLocations,
  myUid,
  localLivePoint,
}: UseActiveThermometerWalkParams) {
  const walkingQuestion = useMemo(
    () => pendingQuestions.find(isThermometerWalkActive) ?? null,
    [pendingQuestions],
  );

  const start = useMemo(() => {
    if (!walkingQuestion) {
      return null;
    }

    return parseThermometerStartPoint(walkingQuestion.placement);
  }, [walkingQuestion]);

  const livePoint = useMemo((): LatLngTuple | null => {
    if (!walkingQuestion) {
      return null;
    }

    if (walkingQuestion.createdByUid === myUid && localLivePoint) {
      return localLivePoint;
    }

    const seekerLocation = seekerLocations.find(
      (location) => location.uid === walkingQuestion.createdByUid,
    );

    if (!seekerLocation) {
      return null;
    }

    return [seekerLocation.lat, seekerLocation.lng];
  }, [localLivePoint, myUid, seekerLocations, walkingQuestion]);

  const distanceTraveled = useMemo(() => {
    if (!start || !livePoint) {
      return null;
    }

    return crowFliesDistanceMeters(start, livePoint);
  }, [livePoint, start]);

  const targetDistanceMeters = useMemo(() => {
    const raw = walkingQuestion?.placement?.metadata?.thermometerDistanceMeters;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return raw;
    }

    return null;
  }, [walkingQuestion]);

  return {
    walkingQuestion,
    start,
    livePoint,
    distanceTraveled,
    targetDistanceMeters,
  };
}
