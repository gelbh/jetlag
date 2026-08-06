import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PhotoHudBody } from "../../components/tools/ask/PhotoHudBody";
import { PhotoPanel } from "../../components/tools/PhotoPanel";
import type { AskHudReadiness } from "../../domain/ask/askHudModes";
import type { AskToolHudBundle } from "../map-screen/heavyMapTools";
import type { DistanceUnit } from "../../domain/map/distance";
import type { GameSize } from "../../domain/session/size/gameSize";
import {
  firstAvailablePhotoCategoryId,
  isPhotoCategoryAvailableForGameSize,
  PHOTO_REPLY_OPTIONS,
  photoCategoryUseCount,
  photoQuestionPrompt,
  usedPhotoCategoryIds,
  type PhotoCategoryId,
} from "../../domain/questions";
import {
  hasOpenPendingQuestion,
  questionCostBreakdown,
} from "../../domain/questions";
import type { SubmitPendingQuestionInput } from "../sync/usePendingQuestionActions";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
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
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
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

  const usedCategories = useMemo(
    () => usedPhotoCategoryIds(pendingQuestions),
    [pendingQuestions],
  );
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<PhotoCategoryId>("tree");
  const categoryId = useMemo(() => {
    if (
      !usedCategories.has(selectedCategoryId) &&
      isPhotoCategoryAvailableForGameSize(gameSize, selectedCategoryId)
    ) {
      return selectedCategoryId;
    }

    return (
      firstAvailablePhotoCategoryId(gameSize, usedCategories) ??
      selectedCategoryId
    );
  }, [gameSize, selectedCategoryId, usedCategories]);

  const useCount = photoCategoryUseCount(pendingQuestions, categoryId);
  const hasOpenQuestion = hasOpenPendingQuestion(pendingQuestions);
  const { label: costLabel, draw: cardDraw, keep: cardKeep } =
    questionCostBreakdown("D1P1", useCount);

  useEffect(() => {
    if (
      !hasOpenQuestion &&
      mapError === "Finish the open question before starting another."
    ) {
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

      if (
        !awaitHiderAnswer ||
        !submitPendingQuestion ||
        !sessionId ||
        !senderUid
      ) {
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
      finishPlacementRef.current();
    },
  });

  const commit = () => session.submit();

  const categoryReady =
    !usedCategories.has(categoryId) &&
    isPhotoCategoryAvailableForGameSize(gameSize, categoryId);

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

  const hud: AskToolHudBundle | null =
    active && awaitHiderAnswer
      ? {
          readiness,
          costLabel,
          error: mapError,
          onCommit: () => void commit(),
          modeBody: (
            <PhotoHudBody
              gameSize={gameSize}
              distanceUnit={distanceUnit}
              categoryId={categoryId}
              usedCategoryIds={usedCategories}
              onCategoryChange={setSelectedCategoryId}
              hasOpenQuestion={hasOpenQuestion}
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
        onCategoryChange={setSelectedCategoryId}
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
