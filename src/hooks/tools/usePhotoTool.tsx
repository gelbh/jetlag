import { useCallback, useEffect, useMemo, useState } from "react";
import { PhotoPanel } from "../../components/tools/PhotoPanel";
import type { GameSize } from "../../domain/session/gameSize";
import {
  firstAvailablePhotoCategoryId,
  isPhotoCategoryAvailableForGameSize,
  PHOTO_REPLY_OPTIONS,
  photoCategoryUseCount,
  photoQuestionPrompt,
  usedPhotoCategoryIds,
  type PhotoCategoryId,
} from "../../domain/questions/photoQuestions";
import {
  hasOpenPendingQuestion,
  questionCostBreakdown,
} from "../../domain/questions/questionRules";
import type { SubmitPendingQuestionInput } from "../sync/usePendingQuestionActions";
import { useSubmitLock } from "../useSubmitLock";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";

interface UsePhotoToolParams {
  active: boolean;
  gameSize: GameSize;
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
  const { isSubmitting, runLocked } = useSubmitLock();
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
  const { label: costLabel, draw: cardDraw, keep: cardKeep } = questionCostBreakdown(
    "D1P1",
    useCount,
  );

  useEffect(() => {
    if (!hasOpenQuestion && mapError === "Finish the open question before starting another.") {
      setMapError(null);
    }
  }, [hasOpenQuestion, mapError, setMapError]);

  const commit = useCallback(async () => {
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
      promptText: photoQuestionPrompt(categoryId),
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
    finishPlacement();
  }, [
    awaitHiderAnswer,
    cardDraw,
    cardKeep,
    categoryId,
    finishPlacement,
    senderUid,
    sessionId,
    setMapError,
    submitPendingQuestion,
    usedCategories,
    canSubmitQuestion,
    hasOpenQuestion,
  ]);

  const panel =
    active && awaitHiderAnswer ? (
      <PhotoPanel
        gameSize={gameSize}
        categoryId={categoryId}
        usedCategoryIds={usedCategories}
        costLabel={costLabel}
        onCategoryChange={setSelectedCategoryId}
        onCommit={() => void runLocked(commit)}
        error={mapError}
        isSubmitting={isSubmitting}
        canSubmitQuestion={canSubmitQuestion}
        hasOpenQuestion={hasOpenQuestion}
      />
    ) : null;

  return {
    panel,
    handleMapClick: () => false,
  };
}
