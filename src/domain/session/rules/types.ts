import type { SessionRecord } from "../../map/annotations";
import type { MapTool } from "../../map/mapToolTypes";
import type { GameSize } from "../gameSize";

export const ALL_CONFIGURABLE_TOOLS = [
  "matching",
  "measuring",
  "thermometer",
  "radar",
  "tentacle",
  "photo",
  "zone",
  "pin",
] as const satisfies readonly Exclude<MapTool, "none">[];

export type ConfigurableMapTool = (typeof ALL_CONFIGURABLE_TOOLS)[number];

export type SessionRulesInput = Pick<
  SessionRecord,
  | "gameSize"
  | "distanceUnit"
  | "hidingZoneRadiusMeters"
  | "hidingPeriodMinutes"
  | "photoAnswerDeadlineMinutes"
  | "questionAnswerDeadlineMinutes"
  | "disabledTools"
  | "tentaclesEnabled"
  | "thermometerPresetMiles"
  | "thermometerPresetMeters"
  | "tentacleMediumRadiusMeters"
  | "tentacleLargeRadiusMeters"
  | "customMatchingAreas"
  | "customCategories"
  | "customLocationPins"
  | "customMeasureGeometries"
  | "regionPackId"
  | "regionPackSubregionId"
  | "expansionPackEnabled"
  | "customQuestionPackEnabled"
  | "previewQuestionBeforeSend"
>;

export const DEFAULT_SESSION_RULES: SessionRulesInput = { gameSize: "medium" };

export function sessionGameSize(session: SessionRulesInput): GameSize {
  return session.gameSize ?? "medium";
}
