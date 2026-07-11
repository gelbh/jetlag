import { useEffect, useMemo, useState } from "react";
import type { SessionRecord } from "../../domain/map/annotations";
import {
  sessionRulesFromRecord,
  sessionRulesSnapshot,
  type SessionRulesInput,
} from "../../domain/session/sessionRules";
import { isKnownRegionPack } from "../../domain/regions/regionPackRegistry";
import {
  matchingAreasCacheKey,
  resolveSessionMatchingAreas,
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

  if (sessionHasBundledMatchingLevels(session)) {
    return false;
  }

  return isKnownRegionPack(session.regionPackId);
}

export interface ResolvedSessionRulesState {
  sessionRules: SessionRulesInput;
  matchingAreasReady: boolean;
  matchingAreasError: string | null;
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

  const needsAsyncResolve = sessionNeedsAsyncMatchingAreas(session);

  const [resolvedAreas, setResolvedAreas] = useState<
    SessionRulesInput["customMatchingAreas"]
  >(undefined);
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

  const sessionRules = useMemo(
    () =>
      resolvedAreas
        ? { ...baseRules, customMatchingAreas: resolvedAreas }
        : baseRules,
    [baseRules, resolvedAreas],
  );

  const matchingAreasReady =
    !session || !needsAsyncResolve || resolvedAreas !== undefined || matchingAreasError !== null;

  return {
    sessionRules,
    matchingAreasReady,
    matchingAreasError,
  };
}
