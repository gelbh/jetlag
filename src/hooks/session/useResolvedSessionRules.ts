import { useEffect, useMemo, useState } from "react";
import type { GameArea, SessionRecord } from "../../domain/map/annotations";
import { BUNDLED_REGION_PACK_GEO_REVISION } from "../../domain/regions/regionPack";
import {
  sessionRulesFromRecord,
  sessionRulesSnapshot,
  type SessionRulesInput,
} from "../../domain/session/sessionRules";
import { isKnownRegionPack } from "../../domain/regions/regionPackRegistry";
import {
  matchingAreasCacheKey,
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
    [session],
  );

  const playAreaCacheKeyValue = useMemo(
    () =>
      session
        ? playAreaCacheKey(session.regionPackId, session.regionPackSubregionId)
        : "",
    [session],
  );

  const needsAsyncResolve = sessionNeedsAsyncMatchingAreas(session);
  const needsPlayAreaResolve = sessionNeedsAsyncPlayArea(session);

  const [resolvedAreas, setResolvedAreas] = useState<
    SessionRulesInput["customMatchingAreas"]
  >(undefined);
  const [resolvedGameArea, setResolvedGameArea] = useState<GameArea | undefined>(
    undefined,
  );
  const [matchingAreasError, setMatchingAreasError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when session clears
      setResolvedAreas(undefined);
      setMatchingAreasError(null);
      return;
    }

    if (!needsAsyncResolve) {
      setResolvedAreas(undefined);
      setMatchingAreasError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const areas = await resolveSessionMatchingAreas(session);
        if (!cancelled) {
          setResolvedAreas(areas);
          setMatchingAreasError(null);
        }
      } catch {
        if (!cancelled) {
          setResolvedAreas(session.customMatchingAreas);
          setMatchingAreasError(
            "Bundled admin categories could not load. Matching may be limited until you retry.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [areasCacheKey, needsAsyncResolve, session]);

  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when session clears
      setResolvedGameArea(undefined);
      return;
    }

    if (!needsPlayAreaResolve) {
      setResolvedGameArea(undefined);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const playArea = await resolveSessionPlayArea(session);
        if (!cancelled) {
          setResolvedGameArea(playArea);
        }
      } catch {
        if (!cancelled) {
          setResolvedGameArea(session.gameArea);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsPlayAreaResolve, playAreaCacheKeyValue, session]);

  const sessionRules = useMemo(
    () =>
      resolvedAreas
        ? { ...baseRules, customMatchingAreas: resolvedAreas }
        : baseRules,
    [baseRules, resolvedAreas],
  );

  const gameArea = resolvedGameArea ?? session?.gameArea ?? null;

  const matchingAreasReady =
    !session ||
    !needsAsyncResolve ||
    resolvedAreas !== undefined ||
    matchingAreasError !== null;

  const playAreaReady =
    !session ||
    !needsPlayAreaResolve ||
    resolvedGameArea !== undefined;

  return {
    sessionRules,
    gameArea,
    matchingAreasReady,
    matchingAreasError,
    playAreaReady,
  };
}
