import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { OracleAskReceipt } from "../../components/session/castle-siege/OracleAskReceipt";
import { PhotoHudBody } from "../../components/tools/ask/photo/PhotoHudBody";
import { PhotoMapPlacementChrome } from "../../components/tools/ask/photo/PhotoMapPlacementChrome";
import { PhotoPanel } from "../../components/tools/PhotoPanel";
import type { AskHudReadiness } from "../../domain/ask/askHudModes";
import type { DistanceUnit } from "../../domain/map/distance";
import {
  firstAvailablePhotoCategoryId,
  hasOpenPendingQuestion,
  isPhotoCategoryAvailableForGameSize,
  type PhotoCategoryId,
  photoCategoryLabelForUnit,
  photoCategoryUseCount,
  photoQuestionPrompt,
  questionCostBreakdown,
  usedPhotoCategoryIds,
} from "../../domain/questions";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import type { SessionMode } from "../../domain/session/castleSiege/mode";
import type { CastleSiegeOracleReceipt } from "../../domain/session/castleSiege/oracleAskReceipt";
import type { CastleSiegePlayingTeam } from "../../domain/session/castleSiege/pregame";
import { resolveAskPath } from "../../domain/session/castleSiege/resolveAskPath";
import type { GameSize } from "../../domain/session/size/gameSize";
import type { AnswerCastleSiegeOracleAskFn } from "../../services/session/castleSiegeOracleAsk";
import type { AskToolHudBundle } from "../map-screen/heavyMapTools";
import type { SubmitPendingQuestionInput } from "../sync/usePendingQuestionActions";
import { useToolPreset } from "./framework/useToolPreset";
import { useToolSession } from "./framework/useToolSession";
import { commitPhoto } from "./photo/commitPhoto";

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
  sessionMode?: SessionMode | null;
  defenderTeamId?: CastleSiegePlayingTeam | null;
  callOracleAsk?: AnswerCastleSiegeOracleAskFn;
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
  sessionMode = null,
  defenderTeamId = null,
  callOracleAsk,
}: UsePhotoToolParams) {
  const finishPlacementRef = useRef(finishPlacement);
  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);

  const [oracleReceipt, setOracleReceipt] = useState<Extract<
    CastleSiegeOracleReceipt,
    { kind: "photo" }
  > | null>(null);
  const oraclePath = resolveAskPath(sessionMode) === "oracle";
  const effectiveAwaitHider = oraclePath ? false : awaitHiderAnswer;
  const photoAskActive = oraclePath || effectiveAwaitHider;

  useEffect(() => {
    if (!active) {
      setOracleReceipt(null);
    }
  }, [active]);

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
    createInitialConfig: () => ({ ready: true }),
    onSubmit: async () => {
      await commitPhoto({
        canSubmitQuestion,
        hasOpenQuestion,
        categoryId,
        usedCategories,
        awaitHiderAnswer: effectiveAwaitHider,
        submitPendingQuestion: oraclePath ? undefined : submitPendingQuestion,
        sessionId,
        senderUid,
        distanceUnit,
        cardDraw,
        cardKeep,
        setMapError,
        onSuccess: () => {
          setOracleReceipt(null);
          setCategoryChosen(false);
          finishPlacementRef.current();
        },
        sessionMode,
        defenderTeamId: defenderTeamId ?? undefined,
        callOracleAsk,
        oracleReceipt,
        onOracleReceipt: setOracleReceipt,
      });
    },
  });

  const commit = () => session.submit();

  const categoryReady =
    !usedCategories.has(categoryId) && isPhotoCategoryAvailableForGameSize(gameSize, categoryId);

  const mapFirstEligible = categoryChosen && categoryReady && photoAskActive;

  const handleCategoryChange = (id: PhotoCategoryId) => {
    setSelectedCategoryId(id);
    setCategoryChosen(true);
  };

  useToolPreset("photo", active && photoAskActive, (key) => {
    if (typeof key === "string") handleCategoryChange(key as PhotoCategoryId);
  });

  const reopenCategoryPicker = () => {
    setCategoryChosen(false);
    setOracleReceipt(null);
  };

  const readiness: AskHudReadiness = {
    surface: "photo",
    placementReady: true,
    configureReady: categoryReady,
    resolveReady: true,
    answerReady: true,
    awaitHiderAnswer: effectiveAwaitHider,
    isSubmitting: session.isBusy,
    viewOnly: !canSubmitQuestion,
  };

  const canCommitPhoto =
    categoryReady &&
    categoryChosen &&
    canSubmitQuestion &&
    !session.isBusy &&
    !hasOpenQuestion &&
    !(oraclePath && oracleReceipt);

  const mapPlacementActive = Boolean(mapFirstEligible) && !oracleReceipt;

  const oracleReceiptBody = oracleReceipt ? (
    <OracleAskReceipt
      receipt={oracleReceipt}
      busy={session.isBusy}
      onConfirmSend={() => void commit()}
      onCancel={() => setOracleReceipt(null)}
    />
  ) : null;

  const hud: AskToolHudBundle | null =
    active && photoAskActive
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
          modeBody:
            oracleReceiptBody ??
            (mapPlacementActive ? null : (
              <PhotoHudBody
                gameSize={gameSize}
                distanceUnit={distanceUnit}
                categoryId={categoryId}
                categoryChosen={categoryChosen}
                usedCategoryIds={usedCategories}
                onCategoryChange={handleCategoryChange}
                hasOpenQuestion={hasOpenQuestion}
                awaitHiderAnswer={effectiveAwaitHider}
                costLabel={costLabel}
                toolLabel="Photo"
              />
            )),
          sheets: null as ReactNode,
        }
      : null;

  const panel =
    active && photoAskActive ? (
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
