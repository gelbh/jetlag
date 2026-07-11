import { formatPresetDistance } from "../../../domain/map/distance";
import { toggleThermometerPresetInSettings } from "../../../domain/session/advancedSessionSettings";
import { thermometerPresetsMetersForGameSize } from "../../../domain/session/gameSizeRules";
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
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={value.customThermometerPresetsEnabled}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              customThermometerPresetsEnabled: event.target.checked,
              thermometerPresetMeters: event.target.checked
                ? value.thermometerPresetMeters
                : thermometerPresetsMetersForGameSize(gameSize, distanceUnit),
            })
          }
          className="mt-1"
        />
        <span>
          <span className="block font-medium">Custom thermometer distances</span>
        </span>
      </label>

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
