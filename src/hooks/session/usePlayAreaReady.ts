import { useEffect, useState } from "react";
import type { SessionRecord } from "@/domain/map/annotations";
import {
  isPlayAreaReadySync,
  playAreaCacheKey,
  sessionUsesPackPlayArea,
} from "@/services/geo/matching/playAreaReadiness";

const loadResolveSessionMatchingAreas = () =>
  import("@/services/geo/matching/resolveSessionMatchingAreas");

/**
 * Play-area readiness only (route readiness on the App boot path). Unlike
 * `useResolvedSessionRules`, the turf-backed loader is dynamic-imported so the
 * App chunk stays free of geometry vendors.
 */
export function usePlayAreaReady(session: SessionRecord | null | undefined): boolean {
  const readySync = isPlayAreaReadySync(session);
  const packKey = sessionUsesPackPlayArea(session)
    ? playAreaCacheKey(session.regionPackId, session.regionPackSubregionId)
    : "";
  const [settledKey, setSettledKey] = useState<string | null>(null);

  useEffect(() => {
    if (!packKey || readySync || !session) {
      return;
    }

    let cancelled = false;
    const snapshot = session;
    void loadResolveSessionMatchingAreas()
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
  }, [packKey, readySync]);

  return readySync || (packKey !== "" && settledKey === packKey);
}
