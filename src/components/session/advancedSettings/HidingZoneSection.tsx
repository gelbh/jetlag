import {
  clampHidingZoneRadiusMeters,
  formatHidingZoneRadiusLabel,
  HIDING_ZONE_RADIUS_BUS_PRESET_METERS,
  HIDING_ZONE_RADIUS_MAX_METERS,
  HIDING_ZONE_RADIUS_MIN_METERS,
  hidingZoneRadiusMeters,
} from "../../../domain/session/gameSize";
import { PresetButton } from "./shared";
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
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        Hiding zone
      </p>
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={value.customHidingZoneRadiusEnabled}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              customHidingZoneRadiusEnabled: event.target.checked,
            })
          }
          className="mt-1"
        />
        <span>
          <span className="block font-medium">Custom hiding zone radius</span>
          <span className="mt-0.5 block text-xs text-ink-muted">
            Default for {gameSize} games:{" "}
            {formatHidingZoneRadiusLabel(defaultRadius, "metric")} (
            {formatHidingZoneRadiusLabel(defaultRadius)}).
          </span>
        </span>
      </label>

      {value.customHidingZoneRadiusEnabled ? (
        <div className="space-y-2">
          <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
            Radius (meters)
            <input
              type="number"
              min={HIDING_ZONE_RADIUS_MIN_METERS}
              max={HIDING_ZONE_RADIUS_MAX_METERS}
              step={10}
              value={value.hidingZoneRadiusMeters}
              disabled={disabled}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(parsed)) {
                  return;
                }

                onChange({
                  ...value,
                  hidingZoneRadiusMeters: clampHidingZoneRadiusMeters(parsed),
                });
              }}
              className="field-input mt-2"
              autoComplete="off"
              inputMode="numeric"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <PresetButton
              label="250 m (bus stops)"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  hidingZoneRadiusMeters: HIDING_ZONE_RADIUS_BUS_PRESET_METERS,
                })
              }
            />
            <PresetButton
              label="Game size default"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  hidingZoneRadiusMeters: defaultRadius,
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
