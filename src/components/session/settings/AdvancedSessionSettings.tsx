import type { AdvancedSessionSettingsValue } from "@/domain/session/tools/advancedSessionSettings";
import type { DistanceUnit } from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import { sessionRulesSummary } from "@/domain/session/rules";
import type { GameArea } from "@/domain/map/annotations";
import { SessionCustomContentSettings } from "./SessionCustomContentSettings";
import { CustomMeasureGeometrySettings } from "./CustomMeasureGeometrySettings";
import { DeadlinesSection } from "../advancedSettings/DeadlinesSection";
import { ExpansionPackSection } from "../advancedSettings/ExpansionPackSection";
import { HidingZoneSection } from "../advancedSettings/HidingZoneSection";
import {
  AdvancedSettingsCategory,
  SectionSummary,
} from "../advancedSettings/shared";
import { TentaclesSection } from "../advancedSettings/TentaclesSection";
import { ThermometerSection } from "../advancedSettings/ThermometerSection";
import { ToolsSection } from "../advancedSettings/ToolsSection";

interface AdvancedSessionSettingsProps {
  gameSize: GameSize;
  distanceUnit?: DistanceUnit;
  gameArea?: GameArea | null;
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
  /** When false, hides the collapsible chrome (e.g. embedded in settings sheet). */
  collapsible?: boolean;
}

export function AdvancedSessionSettings({
  gameSize,
  distanceUnit = "imperial",
  gameArea = null,
  value,
  onChange,
  disabled,
  collapsible = true,
}: AdvancedSessionSettingsProps) {
  const embedded = !collapsible;

  const sectionProps = {
    gameSize,
    distanceUnit,
    value,
    onChange,
    disabled,
  };

  const effectiveSummary = sessionRulesSummary({
    gameSize,
    distanceUnit,
    hidingZoneRadiusMeters: value.customHidingZoneRadiusEnabled
      ? value.hidingZoneRadiusMeters
      : undefined,
    hidingPeriodMinutes: value.customHidingPeriodEnabled
      ? value.hidingPeriodMinutes
      : undefined,
    photoAnswerDeadlineMinutes: value.customPhotoAnswerDeadlineEnabled
      ? value.photoAnswerDeadlineMinutes
      : undefined,
    questionAnswerDeadlineMinutes: value.customQuestionAnswerDeadlineEnabled
      ? value.questionAnswerDeadlineMinutes
      : undefined,
    disabledTools: value.disabledTools,
    tentaclesEnabled: value.tentaclesEnabledOverride ? true : undefined,
    thermometerPresetMeters: value.customThermometerPresetsEnabled
      ? value.thermometerPresetMeters
      : undefined,
    tentacleMediumRadiusMeters: value.customTentacleMediumRadiusEnabled
      ? value.tentacleMediumRadiusMeters
      : undefined,
    tentacleLargeRadiusMeters: value.customTentacleLargeRadiusEnabled
      ? value.tentacleLargeRadiusMeters
      : undefined,
  });

  const body = (
    <div className="space-y-4">
      {!embedded ? (
        <SectionSummary
          text={`Effective: ${effectiveSummary.hidingPeriodLabel} · ${effectiveSummary.hidingZoneLabel} · ${effectiveSummary.tentacleLabel} · ${effectiveSummary.thermometerMaxLabel}`}
        />
      ) : null}

      <HidingZoneSection {...sectionProps} />
      <DeadlinesSection {...sectionProps} />
      <ToolsSection {...sectionProps} />

      <AdvancedSettingsCategory
        title="Thermometer and tentacles"
        defaultOpen={false}
      >
        <ThermometerSection {...sectionProps} />
        <TentaclesSection {...sectionProps} />
      </AdvancedSettingsCategory>

      <ExpansionPackSection {...sectionProps} />

      <AdvancedSettingsCategory
        title="Custom measuring geometry"
        defaultOpen={false}
      >
        <CustomMeasureGeometrySettings
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </AdvancedSettingsCategory>

      <AdvancedSettingsCategory title="Custom content" defaultOpen={false}>
        <SessionCustomContentSettings
          value={value}
          onChange={onChange}
          gameArea={gameArea}
          disabled={disabled}
        />
      </AdvancedSettingsCategory>
    </div>
  );

  if (!collapsible) {
    return body;
  }

  return (
    <AdvancedSettingsCategory title="Advanced" defaultOpen={false}>
      {body}
    </AdvancedSettingsCategory>
  );
}
