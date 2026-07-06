import { useId, useState } from "react";
import type { AdvancedSessionSettingsValue } from "../../domain/advancedSessionSettings";
import type { GameSize } from "../../domain/gameSize";
import {
  clampHidingZoneRadiusMeters,
  formatHidingZoneRadiusLabel,
  HIDING_ZONE_RADIUS_BUS_PRESET_METERS,
  HIDING_ZONE_RADIUS_MAX_METERS,
  HIDING_ZONE_RADIUS_MIN_METERS,
  hidingZoneRadiusMeters,
} from "../../domain/gameSize";

interface AdvancedSessionSettingsProps {
  gameSize: GameSize;
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
}

export function AdvancedSessionSettings({
  gameSize,
  value,
  onChange,
  disabled,
}: AdvancedSessionSettingsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const defaultRadius = hidingZoneRadiusMeters(gameSize);

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

      <div
        id={panelId}
        hidden={!open}
        className="space-y-3 border-2 border-border bg-surface-deep p-3"
      >
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
                autoCorrect="off"
                spellCheck={false}
                inputMode="numeric"
              />
            </label>
            <p className="text-xs text-ink-muted">
              {formatHidingZoneRadiusLabel(
                clampHidingZoneRadiusMeters(value.hidingZoneRadiusMeters),
                "metric",
              )}{" "}
              · {HIDING_ZONE_RADIUS_MIN_METERS}–{HIDING_ZONE_RADIUS_MAX_METERS}{" "}
              m allowed
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...value,
                    hidingZoneRadiusMeters: HIDING_ZONE_RADIUS_BUS_PRESET_METERS,
                  })
                }
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand-blue disabled:opacity-50"
              >
                250 m (bus stops)
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...value,
                    hidingZoneRadiusMeters: defaultRadius,
                  })
                }
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink-muted disabled:opacity-50"
              >
                Game size default
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
