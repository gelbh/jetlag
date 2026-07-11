import { useEffect, useMemo, useState } from "react";
import type { SessionRecord } from "../../domain/map/annotations";
import {
  sessionRulesFromRecord,
  sessionRulesSnapshot,
  type SessionRulesInput,
} from "../../domain/session/sessionRules";
import {
  matchingAreasCacheKey,
  resolveSessionMatchingAreas,
} from "../../services/geo/resolveSessionMatchingAreas";

export function useResolvedSessionRules(
  session: SessionRecord | null | undefined,
): SessionRulesInput {
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

  const [resolvedAreas, setResolvedAreas] = useState<
    SessionRulesInput["customMatchingAreas"]
  >(undefined);

  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when session clears
      setResolvedAreas(undefined);
      return;
    }

    let cancelled = false;

    void (async () => {
      const areas = await resolveSessionMatchingAreas(session);
      if (!cancelled) {
        setResolvedAreas(areas);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [areasCacheKey, session]);

  return useMemo(
    () =>
      resolvedAreas
        ? { ...baseRules, customMatchingAreas: resolvedAreas }
        : baseRules,
    [baseRules, resolvedAreas],
  );
}
