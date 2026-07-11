import {
  HIDING_PERIOD_MINUTES_MAX,
  HIDING_PERIOD_MINUTES_MIN,
  PHOTO_ANSWER_DEADLINE_MINUTES_MAX,
  PHOTO_ANSWER_DEADLINE_MINUTES_MIN,
  QUESTION_ANSWER_DEADLINE_MINUTES_MAX,
  QUESTION_ANSWER_DEADLINE_MINUTES_MIN,
  TENTACLE_RADIUS_METERS_MAX,
  TENTACLE_RADIUS_METERS_MIN,
} from "./constants";

export function clampHidingPeriodMinutes(minutes: number): number {
  return Math.min(
    HIDING_PERIOD_MINUTES_MAX,
    Math.max(HIDING_PERIOD_MINUTES_MIN, Math.round(minutes)),
  );
}

export function clampPhotoAnswerDeadlineMinutes(minutes: number): number {
  return Math.min(
    PHOTO_ANSWER_DEADLINE_MINUTES_MAX,
    Math.max(PHOTO_ANSWER_DEADLINE_MINUTES_MIN, Math.round(minutes)),
  );
}

export function clampQuestionAnswerDeadlineMinutes(minutes: number): number {
  return Math.min(
    QUESTION_ANSWER_DEADLINE_MINUTES_MAX,
    Math.max(QUESTION_ANSWER_DEADLINE_MINUTES_MIN, Math.round(minutes)),
  );
}

export function clampTentacleRadiusMeters(radiusMeters: number): number {
  return Math.min(
    TENTACLE_RADIUS_METERS_MAX,
    Math.max(TENTACLE_RADIUS_METERS_MIN, Math.round(radiusMeters)),
  );
}
