import { useEffect, useMemo, useState } from "react";
import type { GameArea, SessionRecord } from "../../domain/map/annotations";
import { BUNDLED_REGION_PACK_GEO_REVISION } from "../../domain/regions/regionPack";
import { isKnownRegionPack } from "../../domain/regions/regionPackRegistry";
import { type SessionRulesInput, sessionRulesSnapshot } from "../../domain/session/rules";
import {
  hasBundledMatchingLevels,
  isPlayAreaReadySync,
  matchingAreasCacheKey,
  peekResolvedPlayArea,
  playAreaCacheKey,
  resolveSessionMatchingAreas,
  resolveSessionPlayArea,
  sessionUsesPackPlayArea,
} from "../../services/geo/matching/resolveSessionMatchingAreas";

function sessionNeedsAsyncMatchingAreas(session: SessionRecord | null | undefined): boolean {
  if (!session) {
    return false;
  }

  if (
    hasBundledMatchingLevels(session.customMatchingAreas, session.regionPackId) &&
    session.bundledGeoRevision === BUNDLED_REGION_PACK_GEO_REVISION
  ) {
    return false;
  }

  return isKnownRegionPack(session.regionPackId);
}

export interface ResolvedSessionRulesState {
  sessionRules: SessionRulesInput;
  gameArea: GameArea | null;
  matchingAreasReady: boolean;
  matchingAreasError: string | null;
  playAreaReady: boolean;
}

export function useResolvedSessionRules(
  session: SessionRecord | null | undefined,
): ResolvedSessionRulesState {
  const sessionRulesKey = sessionRulesSnapshot(session);
  const baseRules = useMemo(
    () => JSON.parse(sessionRulesKey) as SessionRulesInput,
    [sessionRulesKey],
  );

  const regionPackId = session?.regionPackId;
  const regionPackSubregionId = session?.regionPackSubregionId;
  const hasCompleteSessionMatching = hasBundledMatchingLevels(
    session?.customMatchingAreas,
    regionPackId,
  );
  const hasSession = session != null;

  const areasCacheKey = useMemo(
    () =>
      hasSession
        ? matchingAreasCacheKey(regionPackId, regionPackSubregionId, hasCompleteSessionMatching)
        : "",
    [hasSession, regionPackId, regionPackSubregionId, hasCompleteSessionMatching],
  );

  const playAreaCacheKeyValue = useMemo(
    () => (hasSession ? playAreaCacheKey(regionPackId, regionPackSubregionId) : ""),
    [hasSession, regionPackId, regionPackSubregionId],
  );

  const needsAsyncResolve = sessionNeedsAsyncMatchingAreas(session);
  const needsPlayAreaResolve = sessionUsesPackPlayArea(session);

  const [resolvedAreas, setResolvedAreas] =
    useState<SessionRulesInput["customMatchingAreas"]>(undefined);
  const [resolvedGameArea, setResolvedGameArea] = useState<GameArea | undefined>(() =>
    peekResolvedPlayArea(session),
  );
  const [matchingAreasError, setMatchingAreasError] = useState<string | null>(null);

  useEffect(() => {
    if (!needsAsyncResolve || !playAreaCacheKeyValue) {
      setResolvedAreas(undefined);
      setMatchingAreasError(null);
      return;
    }

    let cancelled = false;
    const expectedKey = areasCacheKey;

    void (async () => {
      try {
        const snapshot = session;
        if (!snapshot) {
          return;
        }
        const areas = await resolveSessionMatchingAreas(snapshot);
        if (
          !cancelled &&
          matchingAreasCacheKey(
            snapshot.regionPackId,
            snapshot.regionPackSubregionId,
            hasBundledMatchingLevels(snapshot.customMatchingAreas, snapshot.regionPackId),
          ) === expectedKey
        ) {
          setResolvedAreas(areas);
          setMatchingAreasError(null);
        }
      } catch {
        if (!cancelled) {
          setResolvedAreas(session?.customMatchingAreas);
          setMatchingAreasError(
            "Bundled admin categories could not load. Matching may be limited until you retry.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [areasCacheKey, needsAsyncResolve]);

  useEffect(() => {
    if (!needsPlayAreaResolve || !playAreaCacheKeyValue) {
      setResolvedGameArea(undefined);
      return;
    }

    const peeked = peekResolvedPlayArea(session);
    if (peeked) {
      setResolvedGameArea(peeked);
      return;
    }

    let cancelled = false;
    const expectedKey = playAreaCacheKeyValue;
    const snapshot = session;

    void (async () => {
      if (!snapshot) {
        return;
      }
      try {
        const playArea = await resolveSessionPlayArea(snapshot);
        if (
          !cancelled &&
          playAreaCacheKey(snapshot.regionPackId, snapshot.regionPackSubregionId) === expectedKey
        ) {
          setResolvedGameArea(playArea);
        }
      } catch {
        if (!cancelled) {
          setResolvedGameArea(snapshot.gameArea);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsPlayAreaResolve, playAreaCacheKeyValue]);

  const sessionRules = useMemo(
    () => (resolvedAreas ? { ...baseRules, customMatchingAreas: resolvedAreas } : baseRules),
    [baseRules, resolvedAreas],
  );

  const gameArea =
    (needsPlayAreaResolve ? (resolvedGameArea ?? peekResolvedPlayArea(session)) : undefined) ??
    session?.gameArea ??
    null;

  const matchingAreasReady =
    !session || !needsAsyncResolve || resolvedAreas !== undefined || matchingAreasError !== null;

  const playAreaReady =
    !session ||
    !needsPlayAreaResolve ||
    resolvedGameArea !== undefined ||
    isPlayAreaReadySync(session);

  return {
    sessionRules,
    gameArea,
    matchingAreasReady,
    matchingAreasError,
    playAreaReady,
  };
}
