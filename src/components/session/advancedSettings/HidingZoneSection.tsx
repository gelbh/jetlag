import {
  clampHidingZoneRadiusMeters,
  formatHidingZoneRadiusLabel,
  HIDING_ZONE_RADIUS_BUS_PRESET_METERS,
  HIDING_ZONE_RADIUS_MAX_METERS,
  HIDING_ZONE_RADIUS_MIN_METERS,
  hidingZoneRadiusMeters,
} from "../../../domain/session/gameSize";
import {
  AdvancedSettingsSectionHeader,
  ToggleNumberWithPresets,
} from "./shared";
import type { AdvancedSettingsSectionProps } from "./types";

export function HidingZoneSection({
  gameSize,
  distanceUnit,
  value,
  onChange,
  disabled,
}: AdvancedSettingsSectionProps) {
  const defaultRadius = hidingZoneRadiusMeters(gameSize, distanceUnit);

  return (
    <div className="space-y-3">
      <AdvancedSettingsSectionHeader title="Hiding zone" />

      <ToggleNumberWithPresets
        enabled={value.customHidingZoneRadiusEnabled}
        onEnabledChange={(customHidingZoneRadiusEnabled) =>
          onChange({ ...value, customHidingZoneRadiusEnabled })
        }
        disabled={disabled}
        toggleLabel="Custom hiding zone radius"
        toggleDescription={
          <>
            Default for {gameSize} games:{" "}
            {formatHidingZoneRadiusLabel(defaultRadius, "metric")} (
            {formatHidingZoneRadiusLabel(defaultRadius)}).
          </>
        }
        numberLabel="Radius (meters)"
        numberValue={value.hidingZoneRadiusMeters}
        onNumberChange={(parsed) =>
          onChange({
            ...value,
            hidingZoneRadiusMeters: clampHidingZoneRadiusMeters(parsed),
          })
        }
        min={HIDING_ZONE_RADIUS_MIN_METERS}
        max={HIDING_ZONE_RADIUS_MAX_METERS}
        step={10}
        presets={[
          {
            label: "250 m (bus stops)",
            value: HIDING_ZONE_RADIUS_BUS_PRESET_METERS,
          },
          { label: "Game size default", value: defaultRadius },
        ]}
      />
    </div>
  );
}
