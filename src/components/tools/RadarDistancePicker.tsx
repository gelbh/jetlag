import { Text, UnstyledButton } from "@mantine/core";
import {
  RADAR_CHOOSE_LABEL,
  maxRadarCustomRadiusMeters,
  radarDistanceOptionLabel,
  radarDistancePresetsForGameSize,
  radarOptionKeyForPresetMeters,
  radarQuestionPrompt,
  type RadarDistanceOptionKey,
} from "@/domain/questions";
import {
  distanceUnitLabel,
  formatDistance,
  milesToMeters,
  parseDistanceInput,
  type DistanceUnit,
} from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import { CatalogExhaustedMessage } from "./shared/readout/CatalogExhaustedMessage";
import { OptionChip, OptionChipRow } from "./shared/controls/OptionChip";
import { QuestionPromptBlock } from "./shared/controls/QuestionPromptBlock";
import { ToolSection } from "./shared/panels/ToolSection";
import { choiceChipStyles } from "@/components/ui/entry/entryChrome";
interface RadarDistancePickerProps {
  radiusMeters: number;
  chooseCustom: boolean;
  customRadius: string;
  distanceUnit: DistanceUnit;
  gameSize: GameSize;
  usedDistanceOptions: ReadonlySet<RadarDistanceOptionKey>;
  onPresetSelect: (radiusMeters: number) => void;
  onChooseSelect: () => void;
  onCustomRadiusChange: (value: string) => void;
  /** Finish custom distance (sheet catalog). Mid-map may omit. */
  onCustomDistanceCommit?: () => void;
  showPrompt?: boolean;
  /** Compact chip strip for map-first mid chrome (Mantine). */
  compact?: boolean;
}


function sanitizeCompactRadarInput(raw: string): string {
  let out = "";
  let seenDot = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if ((ch === "." || ch === ",") && !seenDot) {
      out += ".";
      seenDot = true;
    }
  }
  return out;
}

function compactUnitShort(unit: DistanceUnit): string {
  return unit === "imperial" ? "mi" : "m";
}

function presetLabel(preset: number, distanceUnit: DistanceUnit): string {
  return distanceUnit === "metric"
    ? formatDistance(preset, distanceUnit)
    : radarDistanceOptionLabel(preset / milesToMeters(1), distanceUnit);
}

export function RadarDistancePicker({
  radiusMeters,
  chooseCustom,
  customRadius,
  distanceUnit,
  gameSize,
  usedDistanceOptions,
  onPresetSelect,
  onChooseSelect,
  onCustomRadiusChange,
  onCustomDistanceCommit,
  showPrompt = true,
  compact = false,
}: RadarDistancePickerProps) {
  const resolvedRadius =
    parseDistanceInput(customRadius, distanceUnit) ?? radiusMeters;
  const allPresets = radarDistancePresetsForGameSize(gameSize, distanceUnit);
  const chooseDisabled = usedDistanceOptions.has("choose");
  const maxCustomRadiusMeters = maxRadarCustomRadiusMeters(gameSize, distanceUnit);
  const parsedCustomRadius = parseDistanceInput(customRadius, distanceUnit);
  const customRadiusOverLimit =
    chooseCustom &&
    parsedCustomRadius !== null &&
    parsedCustomRadius > maxCustomRadiusMeters;
  const exhausted =
    allPresets.every((preset) =>
      usedDistanceOptions.has(
        radarOptionKeyForPresetMeters(preset, distanceUnit),
      ),
    ) && chooseDisabled;

  if (compact) {
    const unitShort = compactUnitShort(distanceUnit);
    const tileRoot = (selected: boolean, disabled = false) => ({
      ...choiceChipStyles(selected).root,
      width: "100%",
      minHeight: "2.5rem",
      height: "100%",
      paddingInline: "0.35rem",
      paddingBlock: "0.35rem",
      fontSize: "0.75rem",
      fontWeight: 650,
      borderRadius: 11,
      justifyContent: "center",
      letterSpacing: "-0.01em",
      ...(disabled ? { opacity: 0.4 } : null),
    });

    return (
      <div data-testid="radar-distance-picker">
        {exhausted ? (
          <CatalogExhaustedMessage message="Every radar distance option has already been used this session." />
        ) : null}
        <div
          className="grid grid-cols-4 gap-1.5"
          role="list"
          aria-label="Radar distances"
        >
          {allPresets.map((preset) => {
            const selected = !chooseCustom && radiusMeters === preset;
            const disabled = usedDistanceOptions.has(
              radarOptionKeyForPresetMeters(preset, distanceUnit),
            );
            return (
              <div key={preset} role="listitem" className="min-w-0">
                <UnstyledButton
                  type="button"
                  aria-pressed={selected}
                  aria-disabled={disabled || undefined}
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) onPresetSelect(preset);
                  }}
                  styles={{ root: tileRoot(selected, disabled) }}
                >
                  {presetLabel(preset, distanceUnit)}
                </UnstyledButton>
              </div>
            );
          })}
          <div role="listitem" className="min-w-0">
            {chooseCustom && !chooseDisabled ? (
              <div
                role="button"
                aria-pressed
                aria-label={`Custom distance in ${distanceUnitLabel(distanceUnit)}`}
                style={tileRoot(true)}
                className="inline-flex items-center justify-center gap-0.5"
              >
                <input
                  data-testid="radar-compact-choose-input"
                  value={customRadius}
                  onChange={(event) => {
                    onCustomRadiusChange(
                      sanitizeCompactRadarInput(event.currentTarget.value),
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }
                    event.preventDefault();
                    if (!customRadiusOverLimit && customRadius.trim()) {
                      onCustomDistanceCommit?.();
                    }
                  }}
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="0"
                  aria-invalid={customRadiusOverLimit || undefined}
                  style={{
                    width: "100%",
                    minWidth: 0,
                    border: "none",
                    background: "transparent",
                    textAlign: "right",
                    font: "inherit",
                    fontWeight: 650,
                    color: customRadiusOverLimit
                      ? "var(--color-halt)"
                      : "inherit",
                    outline: "none",
                    padding: 0,
                    caretColor: "var(--color-flag-ink)",
                  }}
                />
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    fontSize: "0.625rem",
                    fontWeight: 650,
                    opacity: 0.85,
                  }}
                >
                  {unitShort}
                </span>
              </div>
            ) : (
              <UnstyledButton
                type="button"
                aria-pressed={false}
                aria-disabled={chooseDisabled || undefined}
                disabled={chooseDisabled}
                onClick={() => {
                  if (!chooseDisabled) onChooseSelect();
                }}
                styles={{ root: tileRoot(false, chooseDisabled) }}
              >
                Choose
              </UnstyledButton>
            )}
          </div>
        </div>
        {chooseCustom && customRadiusOverLimit ? (
          <Text
            size="xs"
            mt={6}
            style={{ color: "var(--color-halt)", paddingInline: 2 }}
          >
            Max {formatDistance(maxCustomRadiusMeters, distanceUnit)} for this
            game size.
          </Text>
        ) : null}
      </div>
    );
  }


  return (
    <ToolSection title="Distance" first status="active">
      {showPrompt ? (
        <QuestionPromptBlock
          prompt={radarQuestionPrompt(resolvedRadius, distanceUnit)}
        />
      ) : null}
      {exhausted ? (
        <CatalogExhaustedMessage message="Every radar distance option has already been used this session." />
      ) : null}
      <OptionChipRow>
        {allPresets.map((preset) => {
          const selected = !chooseCustom && radiusMeters === preset;
          const disabled = usedDistanceOptions.has(
            radarOptionKeyForPresetMeters(preset, distanceUnit),
          );

          return (
            <OptionChip
              key={preset}
              selected={selected}
              disabled={disabled}
              onClick={() => onPresetSelect(preset)}
            >
              {presetLabel(preset, distanceUnit)}
            </OptionChip>
          );
        })}
        <OptionChip
          selected={chooseCustom}
          disabled={chooseDisabled}
          onClick={onChooseSelect}
        >
          {RADAR_CHOOSE_LABEL}
        </OptionChip>
      </OptionChipRow>
      {chooseCustom && !chooseDisabled ? (
        <label className="field-label">
          Custom {distanceUnitLabel(distanceUnit)} (max{" "}
          {formatDistance(maxCustomRadiusMeters, distanceUnit)})
          <input
            value={customRadius}
            onChange={(event) => onCustomRadiusChange(event.target.value)}
            inputMode="decimal"
            autoCorrect="off"
            spellCheck={false}
            className="field-input"
            aria-invalid={customRadiusOverLimit}
          />
          {customRadiusOverLimit ? (
            <span className="text-xs text-highlight">
              Max {formatDistance(maxCustomRadiusMeters, distanceUnit)} for this
              game size.
            </span>
          ) : null}
        </label>
      ) : null}
    </ToolSection>
  );
}
