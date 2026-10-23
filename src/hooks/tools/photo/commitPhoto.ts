import type { DistanceUnit } from "../../../domain/map/distance";
import {
  PHOTO_REPLY_OPTIONS,
  type PhotoCategoryId,
  photoQuestionPrompt,
} from "../../../domain/questions";
import type { SessionMode } from "../../../domain/session/castleSiege/mode";
import type { CastleSiegeOracleReceipt } from "../../../domain/session/castleSiege/oracleAskReceipt";
import type { CastleSiegePlayingTeam } from "../../../domain/session/castleSiege/pregame";
import { resolveAskPath } from "../../../domain/session/castleSiege/resolveAskPath";
import type {
  AnswerCastleSiegeOracleAskFn,
  CastleSiegeOracleAskPayload,
} from "../../../services/session/castleSiegeOracleAsk";
import { resolveAskAnswer } from "../../../services/session/castleSiegeOracleAsk";
import { emitPhotoAnsweredActivity } from "../../../services/session/emitSessionActivity";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";

export interface CommitPhotoInput {
  canSubmitQuestion: boolean;
  hasOpenQuestion: boolean;
  categoryId: PhotoCategoryId;
  usedCategories: ReadonlySet<PhotoCategoryId>;
  awaitHiderAnswer: boolean;
  submitPendingQuestion?: (
    input: Omit<SubmitPendingQuestionInput, "sessionId" | "senderUid" | "senderRole" | "toolType">,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  distanceUnit: DistanceUnit;
  cardDraw: number;
  cardKeep: number;
  setMapError: (message: string | null) => void;
  onSuccess: () => void;
  sessionMode?: SessionMode | null;
  defenderTeamId?: CastleSiegePlayingTeam;
  callOracleAsk?: AnswerCastleSiegeOracleAskFn;
  oracleReceipt?: Extract<CastleSiegeOracleReceipt, { kind: "photo" }> | null;
  onOracleReceipt?: (receipt: Extract<CastleSiegeOracleReceipt, { kind: "photo" }>) => void;
}

export async function commitPhoto(input: CommitPhotoInput): Promise<void> {
  const {
    canSubmitQuestion,
    hasOpenQuestion,
    categoryId,
    usedCategories,
    awaitHiderAnswer,
    submitPendingQuestion,
    sessionId,
    senderUid,
    distanceUnit,
    cardDraw,
    cardKeep,
    setMapError,
    onSuccess,
    sessionMode,
    defenderTeamId,
    callOracleAsk,
    oracleReceipt,
    onOracleReceipt,
  } = input;

  setMapError(null);

  if (!canSubmitQuestion) {
    if (hasOpenQuestion) {
      setMapError("Finish the open question before starting another.");
    }
    return;
  }

  if (usedCategories.has(categoryId)) {
    setMapError("That photo question was already used this session.");
    return;
  }

  const askPath = resolveAskPath(sessionMode);

  if (askPath === "oracle") {
    const photoReceipt = oracleReceipt?.kind === "photo" ? oracleReceipt : null;

    if (!photoReceipt) {
      if (!sessionId || !defenderTeamId) {
        setMapError("Castle Siege ask needs a defender team seal.");
        return;
      }
      if (!onOracleReceipt) {
        setMapError("Confirm-send receipt handler missing.");
        return;
      }

      const ask: CastleSiegeOracleAskPayload = {
        kind: "photo",
        categoryId,
      };

      try {
        const resolved = await resolveAskAnswer({
          mode: sessionMode,
          honor: async () => null,
          oracle: {
            sessionId,
            defenderTeamId,
            ask,
            callOracle: callOracleAsk,
          },
        });

        if (resolved.path !== "oracle" || resolved.receipt.kind !== "photo") {
          setMapError("Could not get an oracle answer.");
          return;
        }

        onOracleReceipt(resolved.receipt);
      } catch (error) {
        setMapError(
          error instanceof Error && error.message.trim()
            ? error.message
            : "Could not get an oracle answer.",
        );
      }
      return;
    }

    if (sessionId) {
      emitPhotoAnsweredActivity({
        sessionId,
        promptText: photoQuestionPrompt(categoryId, distanceUnit),
        answerSummary: `Mirror · ${photoReceipt.mirror.categoryId}`,
        createdByUid: senderUid ?? undefined,
      });
    }

    onSuccess();
    return;
  }

  if (!awaitHiderAnswer || !submitPendingQuestion || !sessionId || !senderUid) {
    setMapError("Photo questions require a hider in the session.");
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

  onSuccess();
}
