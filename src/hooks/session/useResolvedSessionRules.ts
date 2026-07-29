import { useEffect, useMemo, useState } from "react";
import type { GameArea, SessionRecord } from "../../domain/map/annotations";
import { BUNDLED_REGION_PACK_GEO_REVISION } from "../../domain/regions/regionPack";
import {
  sessionRulesFromRecord,
  sessionRulesSnapshot,
  type SessionRulesInput,
} from "../../domain/session/rules";
import { isKnownRegionPack } from "../../domain/regions/regionPackRegistry";
import {
  isPlayAreaReadySync,
  matchingAreasCacheKey,
  peekResolvedPlayArea,
  playAreaCacheKey,
  resolveSessionMatchingAreas,
  resolveSessionPlayArea,
} from "../../services/geo/resolveSessionMatchingAreas";

function sessionHasBundledMatchingLevels(
  session: SessionRecord | null | undefined,
): boolean {
  const areas = session?.customMatchingAreas;
  if (!areas) {
    return false;
  }

  return Boolean(areas[8] && areas[9]);
}

function sessionNeedsAsyncMatchingAreas(
  session: SessionRecord | null | undefined,
): boolean {
  if (!session) {
    return false;
  }

  if (
    sessionHasBundledMatchingLevels(session) &&
    session.bundledGeoRevision === BUNDLED_REGION_PACK_GEO_REVISION
  ) {
    return false;
  }

  return isKnownRegionPack(session.regionPackId);
}

function sessionNeedsAsyncPlayArea(
  session: SessionRecord | null | undefined,
): boolean {
  return Boolean(session && isKnownRegionPack(session.regionPackId));
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
    () => sessionRulesFromRecord(session),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionRulesKey tracks rule fields
    [sessionRulesKey],
  );

  const areasCacheKey = useMemo(
    () =>
      session
        ? matchingAreasCacheKey(
            session.regionPackId,
            session.regionPackSubregionId,
            Boolean(session.customMatchingAreas?.[8] && session.customMatchingAreas?.[9]),
          )
        : "",
    [
      session?.regionPackId,
      session?.regionPackSubregionId,
      session?.customMatchingAreas?.[8],
      session?.customMatchingAreas?.[9],
    ],
  );

  const playAreaCacheKeyValue = useMemo(
    () =>
      session
        ? playAreaCacheKey(session.regionPackId, session.regionPackSubregionId)
        : "",
    [session?.regionPackId, session?.regionPackSubregionId],
  );

  const needsAsyncResolve = sessionNeedsAsyncMatchingAreas(session);
  const needsPlayAreaResolve = sessionNeedsAsyncPlayArea(session);

  const [resolvedAreas, setResolvedAreas] = useState<
    SessionRulesInput["customMatchingAreas"]
  >(undefined);
  const [resolvedGameArea, setResolvedGameArea] = useState<GameArea | undefined>(
    () => peekResolvedPlayArea(session),
  );
  const [matchingAreasError, setMatchingAreasError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!needsAsyncResolve || !playAreaCacheKeyValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when resolve not needed
      setResolvedAreas(undefined);
      setMatchingAreasError(null);
      return;
    }

    let cancelled = false;
    const expectedKey = areasCacheKey;

    void (async () => {
      try {
        // Read session at start; discard if pack key churned away.
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
            Boolean(
              snapshot.customMatchingAreas?.[8] &&
                snapshot.customMatchingAreas?.[9],
            ),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pack-key only; session churn must not cancel
  }, [areasCacheKey, needsAsyncResolve]);

  useEffect(() => {
    if (!needsPlayAreaResolve || !playAreaCacheKeyValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when resolve not needed
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
          playAreaCacheKey(
            snapshot.regionPackId,
            snapshot.regionPackSubregionId,
          ) === expectedKey
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pack-key only; session churn must not cancel
  }, [needsPlayAreaResolve, playAreaCacheKeyValue]);

  const sessionRules = useMemo(
    () =>
      resolvedAreas
        ? { ...baseRules, customMatchingAreas: resolvedAreas }
        : baseRules,
    [baseRules, resolvedAreas],
  );

  const gameArea =
    resolvedGameArea ?? peekResolvedPlayArea(session) ?? session?.gameArea ?? null;

  const matchingAreasReady =
    !session ||
    !needsAsyncResolve ||
    resolvedAreas !== undefined ||
    matchingAreasError !== null;

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
