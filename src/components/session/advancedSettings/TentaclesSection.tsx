import { formatHidingZoneRadiusLabel } from "../../../domain/session/gameSize";
import { milesToMeters } from "../../../domain/map/distance";
import { tentacleRadiusPresetMeters } from "../../../domain/map/distancePresets";
import { clampTentacleRadiusMeters } from "../../../domain/session/sessionRules";
import { PresetButton } from "./shared";
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
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={value.customTentacleMediumRadiusEnabled}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              customTentacleMediumRadiusEnabled: event.target.checked,
            })
          }
          className="mt-1"
        />
        <span>
          <span className="block font-medium">Custom medium tentacle radius</span>
          <span className="mt-0.5 block text-xs text-ink-muted">
            Museums, libraries, hospitals, etc.
          </span>
        </span>
      </label>

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
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={value.customTentacleLargeRadiusEnabled}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...value,
                  customTentacleLargeRadiusEnabled: event.target.checked,
                })
              }
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Custom large tentacle radius</span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                Metro lines, zoos, amusement parks, etc.
              </span>
            </span>
          </label>

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
