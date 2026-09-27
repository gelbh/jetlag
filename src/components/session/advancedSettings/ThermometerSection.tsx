import { formatPresetDistance } from "@/domain/map/distance";
import { toggleThermometerPresetInSettings } from "@/domain/session/tools/advancedSessionSettings";
import { thermometerPresetsMetersForGameSize } from "@/domain/session/size/gameSizeRules";
import { Button } from "@mantine/core";
import {
  AdvancedSettingsInset,
  AdvancedSettingsToggle,
} from "./shared";
import { filledStyles, grayStyles } from "@/components/ui/entry/entryChrome";
import type { AdvancedSettingsSectionProps } from "./types";

export function ThermometerSection({
  gameSize,
  distanceUnit,
  value,
  onChange,
  disabled,
}: AdvancedSettingsSectionProps) {
  const availableThermoPresets = thermometerPresetsMetersForGameSize(
    gameSize,
    distanceUnit,
  );

  return (
    <AdvancedSettingsInset>
      <AdvancedSettingsToggle
        checked={value.customThermometerPresetsEnabled}
        onChange={(customThermometerPresetsEnabled) =>
          onChange({
            ...value,
            customThermometerPresetsEnabled,
            thermometerPresetMeters: customThermometerPresetsEnabled
              ? value.thermometerPresetMeters
              : thermometerPresetsMetersForGameSize(gameSize, distanceUnit),
          })
        }
        disabled={disabled}
        label="Custom thermometer distances"
      />

      {value.customThermometerPresetsEnabled ? (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {availableThermoPresets.map((presetMeters) => {
            const selected = value.thermometerPresetMeters.some(
              (meters) => Math.abs(meters - presetMeters) < 5,
            );
            return (
              <Button
                key={presetMeters}
                type="button"
                size="compact-sm"
                disabled={disabled}
                onClick={() =>
                  onChange(
                    toggleThermometerPresetInSettings(
                      value,
                      presetMeters,
                      gameSize,
                      distanceUnit,
                    ),
                  )
                }
                styles={selected ? filledStyles : grayStyles}
              >
                {formatPresetDistance(presetMeters, distanceUnit)}
              </Button>
            );
          })}
        </div>
      ) : null}
    </AdvancedSettingsInset>
  );
}
