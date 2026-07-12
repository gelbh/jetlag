import { formatPresetDistance } from "../../../domain/map/distance";
import { toggleThermometerPresetInSettings } from "../../../domain/session/advancedSessionSettings";
import { thermometerPresetsMetersForGameSize } from "../../../domain/session/gameSizeRules";
import { AdvancedSettingsToggle } from "./shared";
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
    <>
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
        <div className="flex flex-wrap gap-2">
          {availableThermoPresets.map((presetMeters) => {
            const selected = value.thermometerPresetMeters.some(
              (meters) => Math.abs(meters - presetMeters) < 5,
            );
            return (
              <button
                key={presetMeters}
                type="button"
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
                className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                  selected
                    ? "border-highlight bg-highlight-soft text-highlight"
                    : "border-border text-brand-blue"
                }`}
              >
                {formatPresetDistance(presetMeters, distanceUnit)}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
