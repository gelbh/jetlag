import { formatHidingZoneRadiusLabel } from "../../../domain/session/gameSize";
import { milesToMeters } from "../../../domain/map/distance";
import { tentacleRadiusPresetMeters } from "../../../domain/map/distancePresets";
import { clampTentacleRadiusMeters } from "../../../domain/session/sessionRules";
import { PresetButton, AdvancedSettingsToggle } from "./shared";
import type { AdvancedSettingsSectionProps } from "./types";

export function TentaclesSection({
  gameSize,
  distanceUnit,
  value,
  onChange,
  disabled,
}: AdvancedSettingsSectionProps) {
  const tentacleRadiusPresets = tentacleRadiusPresetMeters(distanceUnit);

  return (
    <>
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
        <div className="space-y-2">
          <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
            Medium radius ({distanceUnit === "metric" ? "meters" : "miles"})
            <input
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
              onChange={(event) => {
                const parsed = Number.parseFloat(event.target.value);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                const meters =
                  distanceUnit === "metric"
                    ? parsed
                    : parsed * milesToMeters(1);
                onChange({
                  ...value,
                  tentacleMediumRadiusMeters: clampTentacleRadiusMeters(meters),
                });
              }}
              className="field-input mt-2"
              inputMode="decimal"
            />
          </label>
          <div className="flex flex-wrap gap-2">
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

      {gameSize === "large" ? (
        <>
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
            <div className="space-y-2">
              <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
                Large radius ({distanceUnit === "metric" ? "meters" : "miles"})
                <input
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
                  onChange={(event) => {
                    const parsed = Number.parseFloat(event.target.value);
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
                  className="field-input mt-2"
                  inputMode="decimal"
                />
              </label>
              <div className="flex flex-wrap gap-2">
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
        </>
      ) : null}
    </>
  );
}
