import { useId, useState } from "react";
import type { AdvancedSessionSettingsValue } from "../../domain/advancedSessionSettings";
import {
  toggleThermometerPresetInSettings,
  toggleToolInSettings,
} from "../../domain/advancedSessionSettings";
import type { GameSize } from "../../domain/gameSize";
import {
  clampHidingZoneRadiusMeters,
  formatHidingZoneRadiusLabel,
  HIDING_ZONE_RADIUS_BUS_PRESET_METERS,
  HIDING_ZONE_RADIUS_MAX_METERS,
  HIDING_ZONE_RADIUS_MIN_METERS,
  hidingZoneRadiusMeters,
} from "../../domain/gameSize";
import { thermometerPresetsMilesForGameSize } from "../../domain/gameSizeRules";
import { formatPresetDistance } from "../../domain/distance";
import { MAP_TOOL_DOCK_ENTRIES } from "../../domain/mapTools";
import {
  ALL_CONFIGURABLE_TOOLS,
  clampHidingPeriodMinutes,
  clampPhotoAnswerDeadlineMinutes,
  clampQuestionAnswerDeadlineMinutes,
  clampTentacleRadiusMeters,
  HIDING_PERIOD_MINUTES_MAX,
  HIDING_PERIOD_MINUTES_MIN,
  HIDING_PERIOD_PRESET_MINUTES,
  PHOTO_ANSWER_DEADLINE_MINUTES_MAX,
  PHOTO_ANSWER_DEADLINE_MINUTES_MIN,
  PHOTO_ANSWER_DEADLINE_PRESET_MINUTES,
  QUESTION_ANSWER_DEADLINE_MINUTES_MAX,
  QUESTION_ANSWER_DEADLINE_MINUTES_MIN,
  QUESTION_ANSWER_DEADLINE_PRESET_MINUTES,
  sessionRulesSummary,
  TENTACLE_RADIUS_PRESET_METERS,
  type ConfigurableMapTool,
} from "../../domain/sessionRules";
import type { ThermometerDistanceOptionMiles } from "../../domain/thermometerQuestions";

interface AdvancedSessionSettingsProps {
  gameSize: GameSize;
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
  /** When false, hides the collapsible chrome (e.g. embedded in settings sheet). */
  collapsible?: boolean;
}

function SectionSummary({ text }: { text: string }) {
  return <p className="text-xs text-ink-muted">{text}</p>;
}

function PresetButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand-blue disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function AdvancedSessionSettings({
  gameSize,
  value,
  onChange,
  disabled,
  collapsible = true,
}: AdvancedSessionSettingsProps) {
  const [open, setOpen] = useState(!collapsible);
  const panelId = useId();
  const defaultRadius = hidingZoneRadiusMeters(gameSize);
  const availableThermoPresets = thermometerPresetsMilesForGameSize(gameSize);
  const effectiveSummary = sessionRulesSummary({
    gameSize,
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
    thermometerPresetMiles: value.customThermometerPresetsEnabled
      ? value.thermometerPresetMiles
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

      <div className="space-y-3 border-t border-border pt-3">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Timers
        </p>

        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={value.customHidingPeriodEnabled}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                customHidingPeriodEnabled: event.target.checked,
              })
            }
            className="mt-1"
          />
          <span>
            <span className="block font-medium">Custom hiding period</span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              Minutes the hider has before seekers start ({HIDING_PERIOD_MINUTES_MIN}–
              {HIDING_PERIOD_MINUTES_MAX}).
            </span>
          </span>
        </label>

        {value.customHidingPeriodEnabled ? (
          <div className="space-y-2">
            <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
              Hiding period (minutes)
              <input
                type="number"
                min={HIDING_PERIOD_MINUTES_MIN}
                max={HIDING_PERIOD_MINUTES_MAX}
                value={value.hidingPeriodMinutes}
                disabled={disabled}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }
                  onChange({
                    ...value,
                    hidingPeriodMinutes: clampHidingPeriodMinutes(parsed),
                  });
                }}
                className="field-input mt-2"
                inputMode="numeric"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {HIDING_PERIOD_PRESET_MINUTES.map((minutes) => (
                <PresetButton
                  key={minutes}
                  label={`${minutes} min`}
                  disabled={disabled}
                  onClick={() =>
                    onChange({ ...value, hidingPeriodMinutes: minutes })
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={value.customPhotoAnswerDeadlineEnabled}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                customPhotoAnswerDeadlineEnabled: event.target.checked,
              })
            }
            className="mt-1"
          />
          <span>
            <span className="block font-medium">Custom photo answer deadline</span>
          </span>
        </label>

        {value.customPhotoAnswerDeadlineEnabled ? (
          <div className="space-y-2">
            <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
              Photo deadline (minutes)
              <input
                type="number"
                min={PHOTO_ANSWER_DEADLINE_MINUTES_MIN}
                max={PHOTO_ANSWER_DEADLINE_MINUTES_MAX}
                value={value.photoAnswerDeadlineMinutes}
                disabled={disabled}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }
                  onChange({
                    ...value,
                    photoAnswerDeadlineMinutes:
                      clampPhotoAnswerDeadlineMinutes(parsed),
                  });
                }}
                className="field-input mt-2"
                inputMode="numeric"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {PHOTO_ANSWER_DEADLINE_PRESET_MINUTES.map((minutes) => (
                <PresetButton
                  key={minutes}
                  label={`${minutes} min`}
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...value,
                      photoAnswerDeadlineMinutes: minutes,
                    })
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={value.customQuestionAnswerDeadlineEnabled}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                customQuestionAnswerDeadlineEnabled: event.target.checked,
              })
            }
            className="mt-1"
          />
          <span>
            <span className="block font-medium">Custom question answer deadline</span>
          </span>
        </label>

        {value.customQuestionAnswerDeadlineEnabled ? (
          <div className="space-y-2">
            <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
              Question deadline (minutes)
              <input
                type="number"
                min={QUESTION_ANSWER_DEADLINE_MINUTES_MIN}
                max={QUESTION_ANSWER_DEADLINE_MINUTES_MAX}
                value={value.questionAnswerDeadlineMinutes}
                disabled={disabled}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }
                  onChange({
                    ...value,
                    questionAnswerDeadlineMinutes:
                      clampQuestionAnswerDeadlineMinutes(parsed),
                  });
                }}
                className="field-input mt-2"
                inputMode="numeric"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_ANSWER_DEADLINE_PRESET_MINUTES.map((minutes) => (
                <PresetButton
                  key={minutes}
                  label={`${minutes} min`}
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...value,
                      questionAnswerDeadlineMinutes: minutes,
                    })
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Tools
        </p>

        {gameSize === "small" ? (
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={value.tentaclesEnabledOverride}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...value,
                  tentaclesEnabledOverride: event.target.checked,
                })
              }
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Enable tentacles on small games</span>
            </span>
          </label>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {ALL_CONFIGURABLE_TOOLS.map((toolId) => {
            const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolId);
            const enabled = !value.disabledTools.includes(toolId);

            return (
              <label
                key={toolId}
                className="flex items-center gap-2 text-sm text-ink"
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(
                      toggleToolInSettings(
                        value,
                        toolId as ConfigurableMapTool,
                        event.target.checked,
                      ),
                    )
                  }
                />
                <span>{entry?.name ?? toolId}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Thermometer and tentacles
        </p>

        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={value.customThermometerPresetsEnabled}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                customThermometerPresetsEnabled: event.target.checked,
                thermometerPresetMiles: event.target.checked
                  ? value.thermometerPresetMiles
                  : thermometerPresetsMilesForGameSize(gameSize),
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
            {availableThermoPresets.map((miles) => {
              const selected = value.thermometerPresetMiles.includes(miles);
              return (
                <button
                  key={miles}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange(
                      toggleThermometerPresetInSettings(
                        value,
                        miles as ThermometerDistanceOptionMiles,
                        gameSize,
                      ),
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                    selected
                      ? "border-highlight bg-highlight-soft text-highlight"
                      : "border-border text-brand-blue"
                  }`}
                >
                  {formatPresetDistance(miles, "imperial")}
                </button>
              );
            })}
          </div>
        ) : null}

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
              Medium radius (meters)
              <input
                type="number"
                min={200}
                max={50000}
                step={100}
                value={value.tentacleMediumRadiusMeters}
                disabled={disabled}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }
                  onChange({
                    ...value,
                    tentacleMediumRadiusMeters: clampTentacleRadiusMeters(parsed),
                  });
                }}
                className="field-input mt-2"
                inputMode="numeric"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {TENTACLE_RADIUS_PRESET_METERS.slice(0, 2).map((meters) => (
                <PresetButton
                  key={meters}
                  label={formatHidingZoneRadiusLabel(meters, "metric")}
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
                  Large radius (meters)
                  <input
                    type="number"
                    min={200}
                    max={50000}
                    step={100}
                    value={value.tentacleLargeRadiusMeters}
                    disabled={disabled}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (!Number.isFinite(parsed)) {
                        return;
                      }
                      onChange({
                        ...value,
                        tentacleLargeRadiusMeters:
                          clampTentacleRadiusMeters(parsed),
                      });
                    }}
                    className="field-input mt-2"
                    inputMode="numeric"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {TENTACLE_RADIUS_PRESET_METERS.map((meters) => (
                    <PresetButton
                      key={meters}
                      label={formatHidingZoneRadiusLabel(meters, "metric")}
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
      </div>
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
