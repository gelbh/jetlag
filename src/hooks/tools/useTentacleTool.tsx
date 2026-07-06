import { useCallback, useEffect, useMemo, useState } from "react";
import { useLatestRequest } from "../useLatestRequest";
import { useDebouncedValue } from "../useDebouncedValue";
import { TentaclePanel } from "../../components/tools/TentaclePanel";
import type { LatLngTuple } from "../../domain/geometry";
import {
  isActive,
  type AnnotationRecord,
  type GameArea,
  type TentaclePoi,
} from "../../domain/annotations";
import {
  buildTentacleEliminationRegion,
  tentacleEliminationJsonForAnswer,
} from "../../domain/tentacleGeometry";
import type { DistanceUnit } from "../../domain/distance";
import type { SessionRulesInput } from "../../domain/sessionRules";
import { sessionGameSize } from "../../domain/sessionRules";
import {
  defaultTentacleCategoryIdForSession,
  firstAvailableTentacleCategoryIdForSession,
  isTentacleCategoryAvailableInSession,
  tentacleSearchRadiusMetersForSession,
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  tentacleQuestionPrompt,
  usedTentacleCategoryIds,
  type TentacleExtendedCategoryId,
} from "../../domain/tentacleQuestions";
import type { SubmitPendingQuestionInput } from "../../hooks/usePendingQuestionActions";
import { fetchTentaclePois } from "../../services/tentacleOverpass";
import { overpassErrorMessage } from "../../services/overpassClient";
import { useToolSessionOptions } from "./useToolSessionOptions";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface UseTentacleToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
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
}

export function useTentacleTool({
  active,
  annotations,
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
}: UseTentacleToolParams) {
  const usedTentacleCategories = useMemo(
    () => usedTentacleCategoryIds(annotations.filter(isActive)),
    [annotations],
  );
  const [tentacleCenter, setTentacleCenter] = useState<LatLngTuple | null>(
    null,
  );
  const [tentacleCategoryId, setTentacleCategoryId] =
    useState<TentacleExtendedCategoryId>(
      defaultTentacleCategoryIdForSession(sessionRules),
    );
  const [tentaclePois, setTentaclePois] = useState<TentaclePoi[]>([]);
  const [tentacleOutOfReach, setTentacleOutOfReach] = useState(false);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [tentacleLoading, setTentacleLoading] = useState(false);
  const [tentacleError, setTentacleError] = useState<string | null>(null);

  const searchRadiusMeters = tentacleSearchRadiusMetersForSession(
    sessionRules,
    tentacleCategoryId,
  );

  useToolSessionOptions({
    active,
    usedOptions: usedTentacleCategories,
    currentOption: tentacleCategoryId,
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
    [beginRequest, isLatestRequest, searchRadiusMeters],
  );

  const debouncedTentacleCenter = useDebouncedValue(tentacleCenter, 400);

  useEffect(() => {
    if (!active || !debouncedTentacleCenter) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadPoisForCenter(debouncedTentacleCenter, tentacleCategoryId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [active, tentacleCategoryId, debouncedTentacleCenter, loadPoisForCenter]);

  const resetDraft = useCallback(() => {
    cancelRequests();
    setTentacleLoading(false);
    setTentacleCenter(null);
    setTentacleCategoryId(
      defaultTentacleCategoryIdForSession(sessionRules, usedTentacleCategories),
    );
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);
    setTentacleError(null);
  }, [cancelRequests, sessionRules, usedTentacleCategories]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active) {
        return false;
      }

      setTentacleCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
      setTentacleError(null);
      setTentacleLoading(true);
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
      setTentacleLoading(true);
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
      onCommit={() => void commit()}
      awaitHiderAnswer={awaitHiderAnswer}
      onRetry={
        tentacleCenter
          ? () => void loadPoisForCenter(tentacleCenter, tentacleCategoryId)
          : undefined
      }
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
