import { yesNoAnswerOptions } from "../../components/tools/shared/answers/binaryAnswerOptions";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import {
  isRadarDistanceOptionUsed,
  type MatchingCategoryId,
  PHOTO_REPLY_OPTIONS,
  type PhotoCategoryId,
  photoQuestionPrompt,
  radarQuestionPrompt,
  type TentacleExtendedCategoryId,
  usedPhotoCategoryIds,
  usedRadarDistanceOptionsForSession,
} from "../../domain/questions";
import { deferredPointFromPendingPlacement } from "../../domain/questions/deferredSeekerPoint";
import {
  questionOptionsForTool,
  usedQuestionOptionLabelsForTool,
} from "../../domain/questions/randomizeQuestion";
import type {
  PendingQuestionRecord,
  PendingQuestionToolType,
  RandomizedTo,
} from "../../domain/session/activity/sessionChat";
import { isPlaceholderGameArea } from "../../domain/session/join/joinPreviewGameArea";
import { sessionDistanceUnit } from "../../domain/session/meta/sessionDistanceUnit";
import type { SessionRulesInput } from "../../domain/session/rules";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";

export type RandomizedQuestionInput = Omit<
  SubmitPendingQuestionInput,
  "sessionId" | "senderUid" | "senderRole" | "toolType"
>;

export type BuiltRandomizedQuestion =
  | { kind: "submit"; toolType: PendingQuestionToolType; input: RandomizedQuestionInput }
  | { kind: "manual"; label: string; presetKey?: string | number };

export interface BuildRandomizedQuestionContext {
  session: SessionRulesInput;
  annotations: readonly AnnotationRecord[];
  pendingQuestions: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  distanceUnit: DistanceUnit;
}

/** Rebuilds the hider's Randomize roll from the seeker's own catalog; never trusts `roll.label` for the prompt. */
export async function buildRandomizedQuestion(
  original: PendingQuestionRecord,
  roll: RandomizedTo,
  ctx: BuildRandomizedQuestionContext,
): Promise<BuiltRandomizedQuestion> {
  const option = questionOptionsForTool(original.toolType, ctx.session).find(
    (candidate) => candidate.optionKey === roll.optionKey,
  );
  if (!option) {
    return { kind: "manual", label: roll.label };
  }

  const unit = sessionDistanceUnit(ctx.session);
  const manual: BuiltRandomizedQuestion = { kind: "manual", label: option.label };

  if (original.toolType === "radar" && typeof option.optionKey === "number") {
    const meters = option.optionKey;
    const used = usedRadarDistanceOptionsForSession(ctx.annotations, ctx.pendingQuestions, unit);
    if (isRadarDistanceOptionUsed(used, false, meters, unit)) {
      return manual;
    }
    return {
      kind: "submit",
      toolType: "radar",
      input: {
        promptText: radarQuestionPrompt(meters, unit),
        replyOptions: yesNoAnswerOptions.map((answer) => ({
          id: answer.value,
          label: answer.label,
        })),
        placement: {
          geometryJson: original.placement.geometryJson,
          metadata: { radiusMeters: meters, radarChooseCustom: false, randomizedFrom: original.id },
        },
        cardDraw: original.cardDraw,
        cardKeep: original.cardKeep,
        pendingQuestionId: `${original.id}~rnd`,
      },
    };
  }

  if (original.toolType === "photo" && typeof option.optionKey === "string") {
    const categoryId = option.optionKey as PhotoCategoryId;
    if (usedPhotoCategoryIds(ctx.pendingQuestions).has(categoryId)) {
      return manual;
    }
    return {
      kind: "submit",
      toolType: "photo",
      input: {
        promptText: photoQuestionPrompt(categoryId, unit),
        replyOptions: [...PHOTO_REPLY_OPTIONS],
        placement: {
          geometryJson: JSON.stringify({ type: "FeatureCollection", features: [] }),
          metadata: { photoCategoryId: categoryId, randomizedFrom: original.id },
        },
        cardDraw: original.cardDraw,
        cardKeep: original.cardKeep,
        pendingQuestionId: `${original.id}~rnd`,
      },
    };
  }

  const used = usedQuestionOptionLabelsForTool(
    original.toolType,
    ctx.session,
    ctx.annotations,
    ctx.pendingQuestions,
  );
  if (used.has(option.label)) {
    return manual;
  }
  const preset: BuiltRandomizedQuestion = { ...manual, presetKey: option.optionKey };

  if (
    (original.toolType === "matching" || original.toolType === "tentacle") &&
    typeof option.optionKey === "string"
  ) {
    const point = deferredPointFromPendingPlacement(original);
    if (isPlaceholderGameArea(ctx.gameArea) || !point) {
      return preset;
    }
    const [lng, lat] = point.geometry.coordinates;
    const cards = { cardDraw: original.cardDraw, cardKeep: original.cardKeep };
    const heavy = await import("./resolveRandomizedHeavyQuestion");
    const payload =
      original.toolType === "matching"
        ? await heavy.resolveRandomizedMatching(
            [lat, lng],
            option.optionKey as MatchingCategoryId,
            cards,
            ctx,
          )
        : await heavy.resolveRandomizedTentacle(
            [lat, lng],
            option.optionKey as TentacleExtendedCategoryId,
            cards,
            ctx,
          );
    if (!payload) {
      return preset;
    }
    return {
      kind: "submit",
      toolType: original.toolType,
      input: {
        ...payload,
        placement: {
          ...payload.placement,
          metadata: { ...payload.placement.metadata, randomizedFrom: original.id },
        },
        pendingQuestionId: `${original.id}~rnd`,
      },
    };
  }

  return preset;
}
