import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { PhotoHudBody } from "../../components/tools/ask/photo/PhotoHudBody";
import { PhotoMapPlacementChrome } from "../../components/tools/ask/photo/PhotoMapPlacementChrome";
import { PhotoPanel } from "../../components/tools/PhotoPanel";
import type { AskHudReadiness } from "../../domain/ask/askHudModes";
import type { DistanceUnit } from "../../domain/map/distance";
import {
  firstAvailablePhotoCategoryId,
  hasOpenPendingQuestion,
  isPhotoCategoryAvailableForGameSize,
  PHOTO_REPLY_OPTIONS,
  type PhotoCategoryId,
  photoCategoryLabelForUnit,
  photoCategoryUseCount,
  photoQuestionPrompt,
  questionCostBreakdown,
  usedPhotoCategoryIds,
} from "../../domain/questions";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import type { GameSize } from "../../domain/session/size/gameSize";
import type { AskToolHudBundle } from "../map-screen/heavyMapTools";
import type { SubmitPendingQuestionInput } from "../sync/usePendingQuestionActions";
import { useToolSession } from "./framework/useToolSession";

interface PhotoSessionConfig {
  ready: true;
}

interface UsePhotoToolParams {
  active: boolean;
  gameSize: GameSize;
  distanceUnit?: DistanceUnit;
  pendingQuestions: readonly PendingQuestionRecord[];
  awaitHiderAnswer?: boolean;
  submitPendingQuestion?: (
    input: Omit<SubmitPendingQuestionInput, "sessionId" | "senderUid" | "senderRole" | "toolType">,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  finishPlacement: () => void;
  setMapError: (message: string | null) => void;
  mapError: string | null;
  canSubmitQuestion?: boolean;
}

export function usePhotoTool({
  active,
  gameSize,
  distanceUnit = "imperial",
  pendingQuestions,
  awaitHiderAnswer = false,
  submitPendingQuestion,
  sessionId,
  senderUid,
  finishPlacement,
  setMapError,
  mapError,
  canSubmitQuestion = true,
}: UsePhotoToolParams) {
  const finishPlacementRef = useRef(finishPlacement);
  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);

  const usedCategories = useMemo(() => usedPhotoCategoryIds(pendingQuestions), [pendingQuestions]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<PhotoCategoryId>("tree");
  const [categoryChosen, setCategoryChosen] = useState(false);
  const categoryId = useMemo(() => {
    if (
      !usedCategories.has(selectedCategoryId) &&
      isPhotoCategoryAvailableForGameSize(gameSize, selectedCategoryId)
    ) {
      return selectedCategoryId;
    }

    return firstAvailablePhotoCategoryId(gameSize, usedCategories) ?? selectedCategoryId;
  }, [gameSize, selectedCategoryId, usedCategories]);

  const useCount = photoCategoryUseCount(pendingQuestions, categoryId);
  const hasOpenQuestion = hasOpenPendingQuestion(pendingQuestions);
  const {
    label: costLabel,
    draw: cardDraw,
    keep: cardKeep,
  } = questionCostBreakdown("D1P1", useCount);

  useEffect(() => {
    if (!hasOpenQuestion && mapError === "Finish the open question before starting another.") {
      setMapError(null);
    }
  }, [hasOpenQuestion, mapError, setMapError]);

  const session = useToolSession<PhotoSessionConfig>({
    toolId: "photo",
    active: active && awaitHiderAnswer,
    createInitialConfig: () => ({ ready: true }),
    onSubmit: async () => {
      setMapError(null);

      if (!canSubmitQuestion) {
        if (hasOpenQuestion) {
          setMapError("Finish the open question before starting another.");
        }
        return;
      }

      if (!awaitHiderAnswer || !submitPendingQuestion || !sessionId || !senderUid) {
        setMapError("Photo questions require a hider in the session.");
        return;
      }

      if (usedCategories.has(categoryId)) {
        setMapError("That photo question was already used this session.");
        return;
      }

      await submitPendingQuestion({
        promptText: photoQuestionPrompt(categoryId, distanceUnit),
        replyOptions: [...PHOTO_REPLY_OPTIONS],
        placement: {
          geometryJson: JSON.stringify({
            type: "FeatureCollection",
            features: [],
          }),
          metadata: {
            photoCategoryId: categoryId,
          },
        },
        cardDraw,
        cardKeep,
      });

      setMapError(null);
      setCategoryChosen(false);
      finishPlacementRef.current();
    },
  });

  const commit = () => session.submit();

  const categoryReady =
    !usedCategories.has(categoryId) && isPhotoCategoryAvailableForGameSize(gameSize, categoryId);

  const mapFirstEligible = categoryChosen && categoryReady && awaitHiderAnswer;

  const handleCategoryChange = (id: PhotoCategoryId) => {
    setSelectedCategoryId(id);
    setCategoryChosen(true);
  };

  const reopenCategoryPicker = () => {
    setCategoryChosen(false);
  };

  const readiness: AskHudReadiness = {
    surface: "photo",
    placementReady: true,
    configureReady: categoryReady,
    resolveReady: true,
    answerReady: true,
    awaitHiderAnswer,
    isSubmitting: session.isBusy,
    viewOnly: !canSubmitQuestion,
  };

  const canCommitPhoto =
    categoryReady && categoryChosen && canSubmitQuestion && !session.isBusy && !hasOpenQuestion;

  const mapPlacementActive = Boolean(mapFirstEligible);

  const hud: AskToolHudBundle | null =
    active && awaitHiderAnswer
      ? {
          readiness,
          costLabel,
          error: mapPlacementActive ? null : mapError,
          onCommit: () => void commit(),
          suppressSheet: mapPlacementActive,
          mapOverlay: mapPlacementActive ? (
            <PhotoMapPlacementChrome
              categoryLabel={photoCategoryLabelForUnit(categoryId, distanceUnit)}
              questionPrompt={photoQuestionPrompt(categoryId, distanceUnit)}
              costLabel={costLabel}
              error={mapError}
              canCommit={canCommitPhoto}
              isSubmitting={session.isBusy}
              onCommit={() => void commit()}
              onChangeCategory={reopenCategoryPicker}
            />
          ) : null,
          modeBody: mapPlacementActive ? null : (
            <PhotoHudBody
              gameSize={gameSize}
              distanceUnit={distanceUnit}
              categoryId={categoryId}
              categoryChosen={categoryChosen}
              usedCategoryIds={usedCategories}
              onCategoryChange={handleCategoryChange}
              hasOpenQuestion={hasOpenQuestion}
              awaitHiderAnswer={awaitHiderAnswer}
              costLabel={costLabel}
              toolLabel="Photo"
            />
          ),
          sheets: null as ReactNode,
        }
      : null;

  const panel =
    active && awaitHiderAnswer ? (
      <PhotoPanel
        gameSize={gameSize}
        distanceUnit={distanceUnit}
        categoryId={categoryId}
        usedCategoryIds={usedCategories}
        costLabel={costLabel}
        onCategoryChange={handleCategoryChange}
        onCommit={() => void commit()}
        error={mapError}
        isSubmitting={session.isBusy}
        canSubmitQuestion={canSubmitQuestion}
        hasOpenQuestion={hasOpenQuestion}
      />
    ) : null;

  return {
    panel,
    hud,
    handleMapClick: () => false,
  };
}
