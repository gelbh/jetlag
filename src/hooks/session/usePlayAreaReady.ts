import { useEffect, useState } from "react";
import type { SessionRecord } from "@/domain/map/annotations";
import { isKnownRegionPack } from "@/domain/regions/regionPackRegistry";
import {
  isPlayAreaReadySync,
  playAreaCacheKey,
} from "@/services/geo/matching/playAreaReadiness";

/**
 * Play-area readiness only (route readiness on the App boot path). Unlike
 * `useResolvedSessionRules`, the turf-backed loader is dynamic-imported so the
 * App chunk stays free of geometry vendors.
 */
export function usePlayAreaReady(
  session: SessionRecord | null | undefined,
): boolean {
  const readySync = isPlayAreaReadySync(session);
  const packKey =
    session && isKnownRegionPack(session.regionPackId)
      ? playAreaCacheKey(session.regionPackId, session.regionPackSubregionId)
      : "";
  const [settledKey, setSettledKey] = useState<string | null>(null);

  useEffect(() => {
    if (!packKey || readySync || !session) {
      return;
    }

    let cancelled = false;
    const snapshot = session;
    void import("@/services/geo/matching/resolveSessionMatchingAreas")
      .then(({ resolveSessionPlayArea }) => resolveSessionPlayArea(snapshot))
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) {
          setSettledKey(packKey);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pack-key only; session churn must not cancel
  }, [packKey, readySync]);

  return readySync || (packKey !== "" && settledKey === packKey);
}
