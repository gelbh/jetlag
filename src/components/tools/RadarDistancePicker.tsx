import {
  RADAR_CHOOSE_LABEL,
  availableRadarDistancePresets,
  maxRadarCustomRadiusMeters,
  radarDistanceOptionLabel,
  radarQuestionPrompt,
  type RadarDistanceOptionKey,
} from "../../domain/questions/radarQuestions";
import {
  distanceUnitLabel,
  formatDistance,
  milesToMeters,
  parseDistanceInput,
  type DistanceUnit,
} from "../../domain/map/distance";
import type { GameSize } from "../../domain/session/gameSize";
import { CatalogExhaustedMessage } from "./shared/CatalogExhaustedMessage";
import { OptionChip, OptionChipRow } from "./shared/OptionChip";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ToolSection } from "./shared/ToolSection";

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
  showPrompt?: boolean;
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
  showPrompt = true,
}: RadarDistancePickerProps) {
  const resolvedRadius =
    parseDistanceInput(customRadius, distanceUnit) ?? radiusMeters;
  const availablePresets = availableRadarDistancePresets(
    gameSize,
    distanceUnit,
    usedDistanceOptions,
  );
  const chooseAvailable = !usedDistanceOptions.has("choose");
  const maxCustomRadiusMeters = maxRadarCustomRadiusMeters(gameSize, distanceUnit);
  const parsedCustomRadius = parseDistanceInput(customRadius, distanceUnit);
  const customRadiusOverLimit =
    chooseCustom &&
    parsedCustomRadius !== null &&
    parsedCustomRadius > maxCustomRadiusMeters;

  return (
    <ToolSection title="Distance" first status="active">
      {showPrompt ? (
        <QuestionPromptBlock
          prompt={radarQuestionPrompt(resolvedRadius, distanceUnit)}
        />
      ) : null}
      {availablePresets.length === 0 && !chooseAvailable ? (
        <CatalogExhaustedMessage message="Every radar distance option has already been used this session." />
      ) : (
        <OptionChipRow>
          {availablePresets.map((preset) => {
            const selected = !chooseCustom && radiusMeters === preset;

            return (
              <OptionChip
                key={preset}
                selected={selected}
                onClick={() => onPresetSelect(preset)}
              >
                {distanceUnit === "metric"
                  ? formatDistance(preset, distanceUnit)
                  : radarDistanceOptionLabel(
                      preset / milesToMeters(1),
                      distanceUnit,
                    )}
              </OptionChip>
            );
          })}
          {chooseAvailable ? (
            <OptionChip selected={chooseCustom} onClick={onChooseSelect}>
              {RADAR_CHOOSE_LABEL}
            </OptionChip>
          ) : null}
        </OptionChipRow>
      )}
      {chooseCustom && chooseAvailable ? (
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
