import type { SessionRecord } from "../../map/annotations";
import type { ThermometerDistanceOptionMiles } from "../../questions/thermometerQuestions";
import type {
  CustomMatchingAreasByLevel,
  SessionCustomCategory,
  SessionCustomLocationPin,
} from "../sessionCustomContent";
import type { SessionCustomMeasureGeometry } from "../customMeasureGeometry";
import type { ConfigurableMapTool } from "../sessionRules";

export interface AdvancedSessionSettingsValue {
  customHidingZoneRadiusEnabled: boolean;
  hidingZoneRadiusMeters: number;
  customHidingPeriodEnabled: boolean;
  hidingPeriodMinutes: number;
  customPhotoAnswerDeadlineEnabled: boolean;
  photoAnswerDeadlineMinutes: number;
  customQuestionAnswerDeadlineEnabled: boolean;
  questionAnswerDeadlineMinutes: number;
  disabledTools: readonly ConfigurableMapTool[];
  tentaclesEnabledOverride: boolean;
  customThermometerPresetsEnabled: boolean;
  thermometerPresetMiles: readonly ThermometerDistanceOptionMiles[];
  thermometerPresetMeters: readonly number[];
  customTentacleMediumRadiusEnabled: boolean;
  tentacleMediumRadiusMeters: number;
  customTentacleLargeRadiusEnabled: boolean;
  tentacleLargeRadiusMeters: number;
  customMatchingAreas: CustomMatchingAreasByLevel;
  customCategories: readonly SessionCustomCategory[];
  customLocationPins: readonly SessionCustomLocationPin[];
  customMeasureGeometries: readonly SessionCustomMeasureGeometry[];
  expansionPackEnabled: boolean;
  customQuestionPackEnabled: boolean;
  previewQuestionBeforeSend: boolean;
}

export type SessionRulesPatch = Pick<
  SessionRecord,
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
  | "bundledGeoRevision"
  | "expansionPackEnabled"
  | "customQuestionPackEnabled"
  | "previewQuestionBeforeSend"
>;
