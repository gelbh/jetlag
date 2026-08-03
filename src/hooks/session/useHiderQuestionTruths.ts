import { useEffect, useMemo, useState } from "react";
import {
  computeHiderTruthReplyAsync,
  type HiderTruthResult,
} from "../../domain/questions/ui";
import {
  resolveHiderTruthReference,
  type HiderTruthReferenceMode,
} from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { GameArea, SessionRecord } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import {
  parseGeometryJson,
  pointFromGeometryFeature,
} from "../../domain/geometry/gameArea/geometryParsing";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { useLatestRequest } from "../forms/useLatestRequest";

const EMPTY_TRUTHS = new Map<string, HiderTruthResult>();

function askOriginFromQuestion(
  question: PendingQuestionRecord,
): LatLngTuple | null {
  // Photo pending questions use geometryJson "{}" — parse must return null, not throw.
  const feature = parseGeometryJson(question.placement.geometryJson);
  return feature ? pointFromGeometryFeature(feature) : null;
}

function openPendingQuestions(
  pendingQuestions: readonly PendingQuestionRecord[],
): PendingQuestionRecord[] {
  return pendingQuestions.filter((question) => question.status === "pending");
}

export interface HiderQuestionTruthContext {
  hiderUid: string;
  zoneCenter: LatLngTuple | null;
  hidingPlace: LatLngTuple | null;
  zoneRadiusMeters: number | null;
  session:
    | Pick<SessionRecord, "endGameStartedAt" | "endGameTruthAnchors">
    | null
    | undefined;
}

export function useHiderQuestionTruths(
  pendingQuestions: readonly PendingQuestionRecord[],
  truthContext: HiderQuestionTruthContext | null,
  gameArea?: GameArea,
  options?: {
    truthReferenceReady?: boolean;
  },
): {
  questionTruths: ReadonlyMap<string, HiderTruthResult>;
  loading: boolean;
  /** Mode for the chronologically first open question (chat label). */
  primaryTruthReferenceMode: HiderTruthReferenceMode;
} {
  const [questionTruths, setQuestionTruths] = useState<
    ReadonlyMap<string, HiderTruthResult>
  >(() => new Map());
  const [resolvedFetchKey, setResolvedFetchKey] = useState<string | null>(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const openQuestions = useMemo(
    () => openPendingQuestions(pendingQuestions),
    [pendingQuestions],
  );

  const contextKey = truthContext
    ? [
        truthContext.hiderUid,
        truthContext.zoneCenter?.join(",") ?? "none",
        truthContext.hidingPlace?.join(",") ?? "none",
        String(truthContext.zoneRadiusMeters ?? "none"),
        truthContext.session?.endGameStartedAt ?? "none",
      ].join("|")
    : "none";

  const openQuestionKey = useMemo(
    () =>
      openQuestions
        .map((question) => question.id)
        .sort()
        .join(","),
    [openQuestions],
  );

  const primaryTruthReference = useMemo(() => {
    if (!truthContext || openQuestions.length === 0) {
      return { point: null as LatLngTuple | null, mode: "unavailable" as const };
    }
    const first = openQuestions[0]!;
    return resolveHiderTruthReference({
      hiderUid: truthContext.hiderUid,
      zoneCenter: truthContext.zoneCenter,
      hidingPlace: truthContext.hidingPlace,
      askOrigin: askOriginFromQuestion(first),
      zoneRadiusMeters: truthContext.zoneRadiusMeters,
      session: truthContext.session,
    });
  }, [openQuestions, truthContext]);

  const fetchKey = `${openQuestionKey}|${contextKey}`;
  const truthReferenceReady = options?.truthReferenceReady ?? true;
  const loading =
    openQuestions.length > 0 &&
    (!truthReferenceReady || resolvedFetchKey !== fetchKey);

  useEffect(() => {
    if (openQuestions.length === 0 || !truthReferenceReady || !truthContext) {
      return;
    }

    const requestId = beginRequest();
    const context = truthContext;

    void (async () => {
      const entries = await Promise.all(
        openQuestions.map(async (question) => {
          const reference = resolveHiderTruthReference({
            hiderUid: context.hiderUid,
            zoneCenter: context.zoneCenter,
            hidingPlace: context.hidingPlace,
            askOrigin: askOriginFromQuestion(question),
            zoneRadiusMeters: context.zoneRadiusMeters,
            session: context.session,
          });
          const truth = await computeHiderTruthReplyAsync(
            question,
            reference.point,
            gameArea,
          );
          return [question.id, truth] as const;
        }),
      );

      if (!isLatestRequest(requestId)) {
        return;
      }

      const nextTruths = new Map<string, HiderTruthResult>();
      for (const [questionId, truth] of entries) {
        if (truth) {
          nextTruths.set(questionId, truth);
        }
      }

      setQuestionTruths(nextTruths);
      setResolvedFetchKey(fetchKey);
    })();
  }, [
    fetchKey,
    beginRequest,
    isLatestRequest,
    openQuestions,
    truthContext,
    gameArea,
    truthReferenceReady,
  ]);

  return {
    questionTruths: openQuestions.length === 0 ? EMPTY_TRUTHS : questionTruths,
    loading: openQuestions.length === 0 ? false : loading,
    primaryTruthReferenceMode: primaryTruthReference.mode,
  };
}
