import type { SessionRecord } from "../../map/annotations";
import { PRESET_MATCH_TOLERANCE_METERS } from "../../map/distancePresets";
import {
  effectiveHidingZoneRadiusMeters,
  hidingZoneRadiusMeters,
} from "../gameSize";
import { gameSizeRulesSummary, hidingPeriodMs } from "../gameSizeRules";
import { sessionDistanceUnit } from "../sessionDistanceUnit";
import { resolveHidingPeriodMinutes } from "./deadlines";
import { resolveTentaclesEnabledForSession } from "./tentacleRules";
import {
  DEFAULT_SESSION_RULES,
  sessionGameSize,
  type SessionRulesInput,
} from "./types";

export function sessionRulesFromRecord(
  session: SessionRecord | null | undefined,
): SessionRulesInput {
  if (!session) {
    return DEFAULT_SESSION_RULES;
  }

  return {
    gameSize: session.gameSize,
    distanceUnit: session.distanceUnit,
    hidingZoneRadiusMeters: session.hidingZoneRadiusMeters,
    hidingPeriodMinutes: session.hidingPeriodMinutes,
    photoAnswerDeadlineMinutes: session.photoAnswerDeadlineMinutes,
    questionAnswerDeadlineMinutes: session.questionAnswerDeadlineMinutes,
    disabledTools: session.disabledTools,
    tentaclesEnabled: session.tentaclesEnabled,
    thermometerPresetMiles: session.thermometerPresetMiles,
    thermometerPresetMeters: session.thermometerPresetMeters,
    tentacleMediumRadiusMeters: session.tentacleMediumRadiusMeters,
    tentacleLargeRadiusMeters: session.tentacleLargeRadiusMeters,
    customMatchingAreas: session.customMatchingAreas,
    customCategories: session.customCategories,
    customLocationPins: session.customLocationPins,
    customMeasureGeometries: session.customMeasureGeometries,
    regionPackId: session.regionPackId,
    regionPackSubregionId: session.regionPackSubregionId,
    expansionPackEnabled: session.expansionPackEnabled,
    customQuestionPackEnabled: session.customQuestionPackEnabled,
    previewQuestionBeforeSend: session.previewQuestionBeforeSend,
  };
}

export function sessionRulesSnapshot(
  session: SessionRecord | null | undefined,
): string {
  return JSON.stringify(sessionRulesFromRecord(session));
}

export function resolveHidingZoneRadiusMeters(
  session: SessionRulesInput,
): number {
  return effectiveHidingZoneRadiusMeters({
    gameSize: sessionGameSize(session),
    hidingZoneRadiusMeters: session.hidingZoneRadiusMeters,
    distanceUnit: sessionDistanceUnit(session),
  });
}

export function sessionRulesSummary(session: SessionRulesInput): {
  hidingPeriodLabel: string;
  hidingZoneLabel: string;
  tentacleLabel: string;
  thermometerMaxLabel: string;
} {
  const hidingMinutes = resolveHidingPeriodMinutes(session);
  const hidingHours = hidingMinutes / 60;
  const hidingPeriodLabel =
    hidingMinutes < 60
      ? `${hidingMinutes} min hiding period`
      : `${hidingHours} hr hiding period`;

  const base = gameSizeRulesSummary(
    sessionGameSize(session),
    sessionDistanceUnit(session),
  );

  const radiusMeters = resolveHidingZoneRadiusMeters(session);
  const defaultRadius = hidingZoneRadiusMeters(
    sessionGameSize(session),
    sessionDistanceUnit(session),
  );
  const hidingZoneLabel =
    Math.abs(radiusMeters - defaultRadius) < PRESET_MATCH_TOLERANCE_METERS
      ? base.hidingZoneLabel
      : `${Math.round(radiusMeters)} m hiding zones`;

  const tentacleEnabled = resolveTentaclesEnabledForSession(session);
  const tentacleLabel = tentacleEnabled ? base.tentacleLabel : "No tentacles";

  return {
    hidingPeriodLabel,
    hidingZoneLabel,
    tentacleLabel,
    thermometerMaxLabel: base.thermometerMaxLabel,
  };
}

export function timerNeverStarted(session: SessionRecord): boolean {
  return (
    (session.timerAccumulatedMs ?? 0) === 0 &&
    (session.timerRunningSince === null || session.timerRunningSince === undefined)
  );
}

/** Legacy helper for callers that only have gameSize */
export { hidingPeriodMs };
