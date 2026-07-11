import type { AnnotationType } from "../../map/annotations";
import { answerDeadlineMs, hidingPeriodMinutes } from "../gameSizeRules";
import { clampHidingPeriodMinutes, clampPhotoAnswerDeadlineMinutes, clampQuestionAnswerDeadlineMinutes } from "./clamps";
import { sessionGameSize, type SessionRulesInput } from "./types";

export function resolveHidingPeriodMinutes(session: SessionRulesInput): number {
  if (typeof session.hidingPeriodMinutes === "number") {
    return clampHidingPeriodMinutes(session.hidingPeriodMinutes);
  }

  return hidingPeriodMinutes(sessionGameSize(session));
}

export function resolveHidingPeriodMs(session: SessionRulesInput): number {
  return resolveHidingPeriodMinutes(session) * 60 * 1000;
}

export function resolvePhotoAnswerDeadlineMinutes(
  session: SessionRulesInput,
): number {
  if (typeof session.photoAnswerDeadlineMinutes === "number") {
    return clampPhotoAnswerDeadlineMinutes(session.photoAnswerDeadlineMinutes);
  }

  return answerDeadlineMs("photo", sessionGameSize(session)) / (60 * 1000);
}

export function resolveQuestionAnswerDeadlineMinutes(
  session: SessionRulesInput,
): number {
  if (typeof session.questionAnswerDeadlineMinutes === "number") {
    return clampQuestionAnswerDeadlineMinutes(
      session.questionAnswerDeadlineMinutes,
    );
  }

  return answerDeadlineMs("matching", sessionGameSize(session)) / (60 * 1000);
}

export function resolveAnswerDeadlineMs(
  session: SessionRulesInput,
  toolType: AnnotationType | "photo",
): number {
  if (toolType === "photo") {
    return resolvePhotoAnswerDeadlineMinutes(session) * 60 * 1000;
  }

  return resolveQuestionAnswerDeadlineMinutes(session) * 60 * 1000;
}
