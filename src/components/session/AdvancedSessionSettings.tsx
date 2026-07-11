import { useId, useState } from "react";
import type { AdvancedSessionSettingsValue } from "../../domain/session/advancedSessionSettings";
import type { DistanceUnit } from "../../domain/map/distance";
import type { GameSize } from "../../domain/session/gameSize";
import { sessionRulesSummary } from "../../domain/session/sessionRules";
import type { GameArea } from "../../domain/map/annotations";
import { SessionCustomContentSettings } from "./SessionCustomContentSettings";
import { CustomMeasureGeometrySettings } from "./CustomMeasureGeometrySettings";
import { DeadlinesSection } from "./advancedSettings/DeadlinesSection";
import { ExpansionPackSection } from "./advancedSettings/ExpansionPackSection";
import { HidingZoneSection } from "./advancedSettings/HidingZoneSection";
import { SectionSummary } from "./advancedSettings/shared";
import { TentaclesSection } from "./advancedSettings/TentaclesSection";
import { ThermometerSection } from "./advancedSettings/ThermometerSection";
import { ToolsSection } from "./advancedSettings/ToolsSection";

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
  const [open, setOpen] = useState(!collapsible);
  const panelId = useId();

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

  const panel = (
    <div
      id={panelId}
      hidden={collapsible ? !open : false}
      className="space-y-4 border-2 border-border bg-surface-deep p-3"
    >
      <SectionSummary
        text={`Effective: ${effectiveSummary.hidingPeriodLabel} · ${effectiveSummary.hidingZoneLabel} · ${effectiveSummary.tentacleLabel} · ${effectiveSummary.thermometerMaxLabel}`}
      />

      <HidingZoneSection {...sectionProps} />
      <DeadlinesSection {...sectionProps} />
      <ToolsSection {...sectionProps} />

      <div className="space-y-3 border-t border-border pt-3">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Thermometer and tentacles
        </p>
        <ThermometerSection {...sectionProps} />
        <TentaclesSection {...sectionProps} />
      </div>

      <ExpansionPackSection {...sectionProps} />

      <CustomMeasureGeometrySettings
        value={value}
        onChange={onChange}
        disabled={disabled}
      />

      <SessionCustomContentSettings
        value={value}
        onChange={onChange}
        gameArea={gameArea}
        disabled={disabled}
      />
    </div>
  );

  if (!collapsible) {
    return <div className="space-y-2">{panel}</div>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between border-2 border-border bg-surface-deep px-3 py-2 text-left disabled:opacity-50"
      >
        <span className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
          Advanced
        </span>
        <span className="text-xs text-ink-muted">{open ? "Hide" : "Show"}</span>
      </button>
      {panel}
    </div>
  );
}
