import { TextInput } from "@mantine/core";
import { formatHidingZoneRadiusLabel } from "@/domain/session/size/gameSize";
import { milesToMeters } from "@/domain/map/distance";
import { tentacleRadiusPresetMeters } from "@/domain/map/distancePresets";
import { clampTentacleRadiusMeters } from "@/domain/session/rules";
import { iosInsetTextInputStyles } from "@/components/ui/apple/iosEntryChrome";
import {
  AdvancedSettingsInset,
  AdvancedSettingsToggle,
  PresetButton,
} from "./shared";
import type { AdvancedSettingsSectionProps } from "./types";

export function TentaclesSection({
  gameSize,
  distanceUnit,
  value,
  onChange,
  disabled,
}: AdvancedSettingsSectionProps) {
  const tentacleRadiusPresets = tentacleRadiusPresetMeters(distanceUnit);
  const unitLabel = distanceUnit === "metric" ? "meters" : "miles";

  return (
    <div className="space-y-3">
      <AdvancedSettingsInset>
        <AdvancedSettingsToggle
          checked={value.customTentacleMediumRadiusEnabled}
          onChange={(customTentacleMediumRadiusEnabled) =>
            onChange({ ...value, customTentacleMediumRadiusEnabled })
          }
          disabled={disabled}
          label="Custom medium tentacle radius"
          description="Museums, libraries, hospitals, etc."
        />
        {value.customTentacleMediumRadiusEnabled ? (
          <div className="space-y-2 pb-3">
            <TextInput
              label={`Medium radius (${unitLabel})`}
              type="number"
              min={distanceUnit === "metric" ? 200 : 0.1}
              max={distanceUnit === "metric" ? 50000 : 30}
              step={distanceUnit === "metric" ? 100 : 0.1}
              value={
                distanceUnit === "metric"
                  ? value.tentacleMediumRadiusMeters
                  : Number(
                      (
                        value.tentacleMediumRadiusMeters / milesToMeters(1)
                      ).toFixed(2),
                    )
              }
              disabled={disabled}
              inputMode="decimal"
              onChange={(event) => {
                const parsed = Number.parseFloat(event.currentTarget.value);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                const meters =
                  distanceUnit === "metric"
                    ? parsed
                    : parsed * milesToMeters(1);
                onChange({
                  ...value,
                  tentacleMediumRadiusMeters:
                    clampTentacleRadiusMeters(meters),
                });
              }}
              styles={iosInsetTextInputStyles}
            />
            <div className="flex flex-wrap gap-2 px-4">
              {tentacleRadiusPresets.slice(0, 2).map((meters) => (
                <PresetButton
                  key={meters}
                  label={formatHidingZoneRadiusLabel(meters, distanceUnit)}
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...value,
                      tentacleMediumRadiusMeters: meters,
                    })
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
      </AdvancedSettingsInset>

      {gameSize === "large" ? (
        <AdvancedSettingsInset>
          <AdvancedSettingsToggle
            checked={value.customTentacleLargeRadiusEnabled}
            onChange={(customTentacleLargeRadiusEnabled) =>
              onChange({ ...value, customTentacleLargeRadiusEnabled })
            }
            disabled={disabled}
            label="Custom large tentacle radius"
            description="Metro lines, zoos, amusement parks, etc."
          />
          {value.customTentacleLargeRadiusEnabled ? (
            <div className="space-y-2 pb-3">
              <TextInput
                label={`Large radius (${unitLabel})`}
                type="number"
                min={distanceUnit === "metric" ? 200 : 0.1}
                max={distanceUnit === "metric" ? 50000 : 30}
                step={distanceUnit === "metric" ? 100 : 0.1}
                value={
                  distanceUnit === "metric"
                    ? value.tentacleLargeRadiusMeters
                    : Number(
                        (
                          value.tentacleLargeRadiusMeters / milesToMeters(1)
                        ).toFixed(2),
                      )
                }
                disabled={disabled}
                inputMode="decimal"
                onChange={(event) => {
                  const parsed = Number.parseFloat(event.currentTarget.value);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }
                  const meters =
                    distanceUnit === "metric"
                      ? parsed
                      : parsed * milesToMeters(1);
                  onChange({
                    ...value,
                    tentacleLargeRadiusMeters:
                      clampTentacleRadiusMeters(meters),
                  });
                }}
                styles={iosInsetTextInputStyles}
              />
              <div className="flex flex-wrap gap-2 px-4">
                {tentacleRadiusPresets.map((meters) => (
                  <PresetButton
                    key={meters}
                    label={formatHidingZoneRadiusLabel(meters, distanceUnit)}
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        ...value,
                        tentacleLargeRadiusMeters: meters,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </AdvancedSettingsInset>
      ) : null}
    </div>
  );
}
