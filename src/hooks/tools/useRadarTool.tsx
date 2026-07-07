import { useCallback, useEffect, useMemo, useState } from "react";
import type { Feature, Point } from "geojson";
import { RadarPanel } from "../../components/tools/RadarPanel";
import type { LatLngTuple } from "../../domain/geometry";
import { isActive, type AnnotationRecord } from "../../domain/annotations";
import {
  parseDistanceInput,
  type DistanceUnit,
} from "../../domain/distance";
import { defaultRadarPresetMeters } from "../../domain/distancePresets";
import {
  firstAvailableRadarDistanceSelection,
  isRadarDistanceOptionAvailable,
  radarDistanceUseCount,
  radarDistanceUseCountFromPending,
  radarInsideFromAnswer,
  radarQuestionPrompt,
  usedRadarDistanceOptions,
  type RadarAnswer,
} from "../../domain/radarQuestions";
import { questionCostBreakdown } from "../../domain/questionRules";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import { yesNoAnswerOptions } from "../../components/tools/shared/binaryAnswerOptions";
import type { SubmitPendingQuestionInput } from "../../hooks/usePendingQuestionActions";
import { useSubmitLock } from "../useSubmitLock";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface UseRadarToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
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
  senderRole?: "seeker" | "hider";
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

export function useRadarTool({
  active,
  annotations,
  pendingQuestions = [],
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
}: UseRadarToolParams) {
  const { isSubmitting, runLocked } = useSubmitLock();
  const usedRadarOptions = useMemo(
    () => usedRadarDistanceOptions(annotations.filter(isActive), distanceUnit),
    [annotations, distanceUnit],
  );
  const defaultRadius = defaultRadarPresetMeters(distanceUnit);
  const [radarRadius, setRadarRadius] = useState(defaultRadius);
  const [radarCustomRadius, setRadarCustomRadius] = useState("");
  const [radarChooseCustom, setRadarChooseCustom] = useState(false);
  const [radarAnswer, setRadarAnswer] = useState<RadarAnswer | null>(null);
  const [radarCenter, setRadarCenter] = useState<LatLngTuple | null>(null);

  const resolvedRadarRadius = radarChooseCustom
    ? (parseDistanceInput(radarCustomRadius, distanceUnit) ?? radarRadius)
    : radarRadius;

  const radarUseCount = Math.max(
    radarDistanceUseCount(
      annotations.filter(isActive),
      radarChooseCustom,
      resolvedRadarRadius,
      distanceUnit,
    ),
    radarDistanceUseCountFromPending(
      pendingQuestions,
      radarChooseCustom,
      resolvedRadarRadius,
      distanceUnit,
    ),
  );
  const { label: costLabel, draw: cardDraw, keep: cardKeep } =
    questionCostBreakdown("D2P1", radarUseCount);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync default when unit changes */
    if (!active) {
      return;
    }

    setRadarRadius(defaultRadarPresetMeters(distanceUnit));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [active, distanceUnit]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- keep draft distance in sync with session usage */
    if (!active) {
      return;
    }

    if (isRadarDistanceOptionAvailable()) {
      return;
    }

    const nextSelection =
      firstAvailableRadarDistanceSelection(usedRadarOptions, distanceUnit);
    if (!nextSelection) {
      setRadarChooseCustom(false);
      setRadarCustomRadius("");
      return;
    }

    setRadarChooseCustom(nextSelection.chooseCustom);
    setRadarRadius(nextSelection.radiusMeters);
    setRadarCustomRadius("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [active, usedRadarOptions, radarChooseCustom, radarRadius, distanceUnit]);

  const resetDraft = useCallback(() => {
    setRadarRadius(defaultRadarPresetMeters(distanceUnit));
    setRadarCustomRadius("");
    setRadarChooseCustom(false);
    setRadarAnswer(null);
    setRadarCenter(null);
  }, [distanceUnit]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active) {
        return false;
      }

      setRadarCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
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

      setRadarCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
    } catch (error) {
      setMapError(
        error instanceof Error ? error.message : "GPS location unavailable.",
      );
    }
  };

  const commit = async () => {
    if (!radarCenter) {
      setMapError("Choose a center with GPS or a map tap.");
      return;
    }

    if (!isRadarDistanceOptionAvailable()) {
      setMapError("That radar distance was already used this session.");
      return;
    }

    const geometry: Feature<Point> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [radarCenter[1], radarCenter[0]],
      },
    };

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      await submitPendingQuestion({
        promptText: radarQuestionPrompt(resolvedRadarRadius, distanceUnit),
        replyOptions: yesNoAnswerOptions.map((option) => ({
          id: option.value,
          label: option.label,
        })),
        placement: {
          geometryJson: JSON.stringify(geometry),
          metadata: {
            radiusMeters: resolvedRadarRadius,
            radarChooseCustom,
          },
        },
        cardDraw,
        cardKeep,
      });

      setRadarCenter(null);
      setRadarAnswer(null);
      setRadarChooseCustom(false);
      setRadarCustomRadius("");
      setMapError(null);
      finishPlacement();
      return;
    }

    if (!radarAnswer) {
      setMapError("Record the answer before adding the radar question.");
      return;
    }

    await createAnnotation({
      type: "radar",
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        radiusMeters: resolvedRadarRadius,
        radarChooseCustom,
        inside: radarInsideFromAnswer(radarAnswer),
        color: MAP_ANNOTATION_COLORS.radar,
      },
    });

    setRadarCenter(null);
    setRadarAnswer(null);
    setRadarChooseCustom(false);
    setRadarCustomRadius("");
    setMapError(null);
    finishPlacement();
  };

  const placementCrosshair =
    active && (awaitingPlacement || radarCenter === null);

  const panel = (
    <RadarPanel
      radiusMeters={radarRadius}
      chooseCustom={radarChooseCustom}
      customRadius={radarCustomRadius}
      distanceUnit={distanceUnit}
      usedDistanceOptions={usedRadarOptions}
      answer={radarAnswer}
      onPresetSelect={(radiusMeters) => {
        setRadarChooseCustom(false);
        setRadarCustomRadius("");
        setRadarRadius(radiusMeters);
      }}
      onChooseSelect={() => setRadarChooseCustom(true)}
      onCustomRadiusChange={setRadarCustomRadius}
      onAnswerChange={setRadarAnswer}
      onUseGps={() => void handleUseGps()}
      onPlaceAtMapTap={armPlacement}
      awaitingPlacement={awaitingPlacement}
      hasCenter={radarCenter !== null}
      onCommit={() => void runLocked(commit)}
      gpsLoading={gpsLoading}
      error={mapError ?? gpsError}
      awaitHiderAnswer={awaitHiderAnswer}
      costLabel={costLabel}
      isSubmitting={isSubmitting}
    />
  );

  return {
    draft: {
      radarCenter,
      radarRadius: resolvedRadarRadius,
      radarChooseCustom,
      radarAnswer,
    },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    commit,
    panel,
  };
}
