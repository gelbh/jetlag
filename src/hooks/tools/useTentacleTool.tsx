import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLatestRequest } from "../useLatestRequest";
import { useDebouncedValue } from "../useDebouncedValue";
import { TentaclePanel } from "../../components/tools/TentaclePanel";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  isActive,
  type AnnotationRecord,
  type GameArea,
  type TentaclePoi,
} from "../../domain/map/annotations";
import {
  buildTentacleEliminationRegion,
  tentacleEliminationJsonForAnswer,
} from "../../domain/geometry/tentacleGeometry";
import type { DistanceUnit } from "../../domain/map/distance";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import { sessionGameSize } from "../../domain/session/sessionRules";
import {
  firstAvailableTentacleCategoryIdForSession,
  isTentacleCategoryAvailableInSession,
  tentacleSearchRadiusMetersForSession,
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  tentacleCategoryUseCount,
  tentacleCategoryUseCountFromPending,
  tentacleQuestionPrompt,
  usedTentacleCategoryIds,
  type TentacleExtendedCategoryId,
} from "../../domain/questions/tentacleQuestions";
import { questionCostBreakdown } from "../../domain/questions/questionRules";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { useSubmitLock } from "../useSubmitLock";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";
import { fetchTentaclePois } from "../../services/geo/tentacleOverpass";
import { overpassErrorMessage } from "../../services/core/overpassClient";
import { useToolSessionOptions } from "./useToolSessionOptions";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

interface UseTentacleToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  sessionRules: SessionRulesInput;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  awaitHiderAnswer?: boolean;
  submitPendingQuestion?: (
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  setMapError: (message: string | null) => void;
  mapError: string | null;
  gpsLoading: boolean;
  gpsError?: string | null;
  awaitingPlacement: boolean;
  setAwaitingPlacement: (awaiting: boolean) => void;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
  armPlacement: () => void;
  canSubmitQuestion?: boolean;
}

export function useTentacleTool({
  active,
  annotations,
  pendingQuestions = [],
  gameArea,
  sessionRules,
  createAnnotation,
  awaitHiderAnswer = false,
  submitPendingQuestion,
  sessionId,
  senderUid,
  distanceUnit,
  finishPlacement,
  setMapError,
  mapError,
  gpsLoading,
  gpsError,
  awaitingPlacement,
  setAwaitingPlacement,
  refreshGps,
  ensurePointInGameArea,
  armPlacement,
  canSubmitQuestion = true,
}: UseTentacleToolParams) {
  const { isSubmitting, runLocked } = useSubmitLock();
  const wizardStepRef = useRef("anchor");
  const usedTentacleCategories = useMemo(
    () => usedTentacleCategoryIds(annotations.filter(isActive)),
    [annotations],
  );
  const [tentacleCenter, setTentacleCenter] = useState<LatLngTuple | null>(
    null,
  );
  const [tentacleCategoryId, setTentacleCategoryId] =
    useState<TentacleExtendedCategoryId | null>(null);
  const [tentacleCategoryChosen, setTentacleCategoryChosen] = useState(false);
  const tentacleUseCount = tentacleCategoryId
    ? Math.max(
        tentacleCategoryUseCount(
          annotations.filter(isActive),
          tentacleCategoryId,
        ),
        tentacleCategoryUseCountFromPending(
          pendingQuestions,
          tentacleCategoryId,
        ),
      )
    : 0;
  const { label: costLabel, draw: cardDraw, keep: cardKeep } =
    questionCostBreakdown("D4P2", tentacleUseCount);
  const [tentaclePois, setTentaclePois] = useState<TentaclePoi[]>([]);
  const [tentacleOutOfReach, setTentacleOutOfReach] = useState(false);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [tentacleLoading, setTentacleLoading] = useState(false);
  const [tentacleError, setTentacleError] = useState<string | null>(null);

  const searchRadiusMeters = tentacleCategoryId
    ? tentacleSearchRadiusMetersForSession(sessionRules, tentacleCategoryId)
    : 0;

  useToolSessionOptions({
    active: active && tentacleCategoryChosen && tentacleCategoryId !== null,
    usedOptions: usedTentacleCategories,
    currentOption: tentacleCategoryId ?? "museum",
    isAvailable: (_usedOptions, currentOption) =>
      isTentacleCategoryAvailableInSession(sessionRules, currentOption),
    pickNext: (usedOptions) =>
      firstAvailableTentacleCategoryIdForSession(sessionRules, usedOptions) ??
      "museum",
    onUnavailable: useCallback(
      (nextCategory: TentacleExtendedCategoryId) => {
        setTentacleCategoryId(nextCategory);
        setTentaclePois([]);
        setTentacleOutOfReach(false);
        setSelectedPoiId(null);
        setTentacleError(null);
      },
      [],
    ),
  });

  const { beginRequest, cancelRequests, isLatestRequest } = useLatestRequest();

  const loadPoisForCenter = useCallback(
    async (center: LatLngTuple, categoryId: TentacleExtendedCategoryId) => {
      const requestId = beginRequest();
      setTentacleLoading(true);
      setTentacleError(null);
      setTentaclePois([]);
      setTentacleOutOfReach(false);
      setSelectedPoiId(null);

      try {
        const pois = await fetchTentaclePois(
          center,
          searchRadiusMeters,
          categoryId,
          {
            customCategories: sessionRules.customCategories,
            customLocationPins: sessionRules.customLocationPins,
          },
        );

        if (!isLatestRequest(requestId)) {
          return;
        }

        setTentaclePois(pois);
        if (pois.length === 0) {
          setTentacleError(
            `No named locations were found within ${searchRadiusMeters < 5000 ? "1 mile" : "15 miles"}.`,
          );
        }
      } catch (error) {
        if (!isLatestRequest(requestId)) {
          return;
        }

        setTentacleError(
          overpassErrorMessage(error, "Locations didn't load."),
        );
      } finally {
        if (isLatestRequest(requestId)) {
          setTentacleLoading(false);
        }
      }
    },
    [beginRequest, isLatestRequest, searchRadiusMeters, sessionRules],
  );

  const debouncedTentacleCenter = useDebouncedValue(tentacleCenter, 400);

  useEffect(() => {
    if (!active || !debouncedTentacleCenter || !tentacleCategoryChosen || !tentacleCategoryId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadPoisForCenter(debouncedTentacleCenter, tentacleCategoryId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    active,
    tentacleCategoryChosen,
    tentacleCategoryId,
    debouncedTentacleCenter,
    loadPoisForCenter,
  ]);

  const resetDraft = useCallback(() => {
    cancelRequests();
    setTentacleLoading(false);
    setTentacleCenter(null);
    setTentacleCategoryId(null);
    setTentacleCategoryChosen(false);
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);
    setTentacleError(null);
  }, [cancelRequests]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active) {
        return false;
      }

      if (wizardStepRef.current !== "anchor") {
        return false;
      }

      setTentacleCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
      setTentacleError(null);
      return true;
    },
    [active, setAwaitingPlacement, setMapError],
  );

  const handleUseGps = async () => {
    try {
      const reading = await refreshGps();
      const point: LatLngTuple = [reading.lat, reading.lng];
      if (!ensurePointInGameArea(point)) {
        return;
      }

      setTentacleCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
      setTentacleError(null);
    } catch (error) {
      setMapError(
        error instanceof Error ? error.message : "GPS location unavailable.",
      );
    }
  };

  const tentacleEliminationPreview = useMemo(() => {
    if (
      !tentacleCenter ||
      tentacleOutOfReach ||
      !selectedPoiId ||
      tentaclePois.length < 2
    ) {
      return null;
    }

    return buildTentacleEliminationRegion(
      tentacleCenter,
      searchRadiusMeters,
      tentaclePois,
      selectedPoiId,
      gameArea,
    );
  }, [
    gameArea,
    selectedPoiId,
    tentacleCenter,
    searchRadiusMeters,
    tentacleOutOfReach,
    tentaclePois,
  ]);

  const commit = async () => {
    if (!canSubmitQuestion) {
      setMapError("Finish the open question before starting another.");
      return;
    }

    if (!tentacleCategoryChosen || !tentacleCategoryId) {
      setMapError("Choose a category before sending this question.");
      return;
    }

    if (!tentacleCenter) {
      setMapError("Choose a center with GPS or a map tap.");
      return;
    }

    if (tentaclePois.length === 0) {
      setMapError("No locations found near this anchor.");
      return;
    }

    if (!isTentacleCategoryAvailableInSession(sessionRules, tentacleCategoryId)) {
      setMapError("That location type is not available for this game size.");
      return;
    }

    const geometry = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Point" as const,
        coordinates: [tentacleCenter[1], tentacleCenter[0]],
      },
    };

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      await submitPendingQuestion({
        promptText: tentacleQuestionPrompt(
          tentacleCategoryId,
          distanceUnit,
          searchRadiusMeters,
        ),
        replyOptions: [
          ...tentaclePois.map((poi) => ({
            id: poi.id,
            label: poi.name,
          })),
          {
            id: "out-of-reach",
            label: TENTACLE_NOT_WITHIN_REACH_LABEL,
          },
        ],
        placement: {
          geometryJson: JSON.stringify(geometry),
          metadata: {
            tentacleCategoryId,
            centerJson: JSON.stringify({
              lat: tentacleCenter[0],
              lng: tentacleCenter[1],
            }),
            poisJson: JSON.stringify(tentaclePois),
          },
        },
        cardDraw,
        cardKeep,
      });

      setTentacleCenter(null);
      setTentaclePois([]);
      setTentacleOutOfReach(false);
      setSelectedPoiId(null);
      setMapError(null);
      finishPlacement();
      return;
    }

    if (!tentacleOutOfReach && !selectedPoiId) {
      setMapError("Record the answer before adding the tentacle question.");
      return;
    }

    const selectedPoi = tentaclePois.find((poi) => poi.id === selectedPoiId);
    const eliminationJson = tentacleEliminationJsonForAnswer({
      anchor: tentacleCenter,
      radiusMeters: searchRadiusMeters,
      pois: tentaclePois,
      answeredPoiId: selectedPoi?.id,
      outOfReach: tentacleOutOfReach,
      gameArea,
    });

    const metadata: AnnotationRecord["metadata"] = {
      createdAt: new Date().toISOString(),
      radiusMeters: searchRadiusMeters,
      tentacleCategoryId,
      tentacleOutOfReach,
      highlightedPoiId: selectedPoi?.id,
      tentacleAnswerPoiName: selectedPoi?.name,
      poiIds: tentaclePois.map((poi) => poi.id),
      pois: tentaclePois,
      color: MAP_ANNOTATION_COLORS.tentacle,
    };
    if (eliminationJson !== undefined) {
      metadata.tentacleEliminationJson = eliminationJson;
    }

    await createAnnotation({
      type: "tentacle",
      geometry: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [tentacleCenter[1], tentacleCenter[0]],
        },
      },
      metadata,
    });

    setTentacleCenter(null);
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);
    setMapError(null);
    finishPlacement();
  };

  const placementCrosshair =
    active && (awaitingPlacement || tentacleCenter === null);

  const panel = (
    <TentaclePanel
      gameSize={sessionGameSize(sessionRules)}
      categoryId={tentacleCategoryId}
      categoryChosen={tentacleCategoryChosen}
      searchRadiusMeters={searchRadiusMeters}
      usedCategoryIds={usedTentacleCategories}
      distanceUnit={distanceUnit}
      poiOptions={tentaclePois}
      selectedPoiId={selectedPoiId}
      outOfReach={tentacleOutOfReach}
      loading={tentacleLoading}
      awaitingPlacement={awaitingPlacement}
      hasCenter={tentacleCenter !== null}
      gpsLoading={gpsLoading}
      error={tentacleError ?? mapError ?? gpsError}
      onCategoryChange={(nextCategory) => {
        setTentacleCategoryId(nextCategory);
        setTentacleCategoryChosen(true);
        setTentaclePois([]);
        setTentacleOutOfReach(false);
        setSelectedPoiId(null);
        setTentacleError(null);
      }}
      onUseGps={() => void handleUseGps()}
      onPlaceAtMapTap={armPlacement}
      onSelectPoi={(poiId) => {
        setTentacleOutOfReach(false);
        setSelectedPoiId(poiId);
      }}
      onOutOfReachChange={(nextOutOfReach) => {
        setTentacleOutOfReach(nextOutOfReach);
        if (nextOutOfReach) {
          setSelectedPoiId(null);
        }
      }}
      onCommit={() => void runLocked(commit)}
      awaitHiderAnswer={awaitHiderAnswer}
      costLabel={costLabel}
      isSubmitting={isSubmitting}
      onRetry={
        tentacleCenter && tentacleCategoryId
          ? () => void loadPoisForCenter(tentacleCenter, tentacleCategoryId)
          : undefined
      }
      wizardStepRef={wizardStepRef}
    />
  );

  return {
    draft: {
      tentacleCenter,
      tentacleSearchRadiusMeters: searchRadiusMeters,
      tentacleAnswerRadiusMeters: searchRadiusMeters,
      tentaclePois,
      tentacleSelectedPoiId: selectedPoiId,
      tentacleOutOfReach,
      tentacleEliminationPreview,
      seekerResolving: tentacleLoading && tentacleCenter !== null,
    },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    commit,
    panel,
  };
}
