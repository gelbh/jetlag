import { tentacleRadiusPresetMeters } from "../../map/distancePresets";

export const HIDING_PERIOD_MINUTES_MIN = 5;
export const HIDING_PERIOD_MINUTES_MAX = 360;
export const PHOTO_ANSWER_DEADLINE_MINUTES_MIN = 5;
export const PHOTO_ANSWER_DEADLINE_MINUTES_MAX = 60;
export const QUESTION_ANSWER_DEADLINE_MINUTES_MIN = 2;
export const QUESTION_ANSWER_DEADLINE_MINUTES_MAX = 30;
export const TENTACLE_RADIUS_METERS_MIN = 200;
export const TENTACLE_RADIUS_METERS_MAX = 50_000;

export const HIDING_PERIOD_PRESET_MINUTES = [15, 30, 60, 120, 180] as const;
export const PHOTO_ANSWER_DEADLINE_PRESET_MINUTES = [10, 15, 20, 30] as const;
export const QUESTION_ANSWER_DEADLINE_PRESET_MINUTES = [5] as const;
export const TENTACLE_RADIUS_PRESET_METERS = tentacleRadiusPresetMeters("imperial");
