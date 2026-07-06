import {
  RADAR_CHOOSE_LABEL,
  radarDistanceOptionLabel,
  radarQuestionPrompt,
  type RadarDistanceOptionKey,
} from "../../domain/radarQuestions";
import {
  distanceUnitLabel,
  formatDistance,
  milesToMeters,
  parseDistanceInput,
  type DistanceUnit,
} from "../../domain/distance";
import { radarPresetMetersForUnit } from "../../domain/distancePresets";
import { OptionChip, OptionChipRow } from "./shared/OptionChip";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ToolSection } from "./shared/ToolSection";

interface RadarDistancePickerProps {
  radiusMeters: number;
  chooseCustom: boolean;
  customRadius: string;
  distanceUnit: DistanceUnit;
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
  usedDistanceOptions,
  onPresetSelect,
  onChooseSelect,
  onCustomRadiusChange,
  showPrompt = true,
}: RadarDistancePickerProps) {
  const resolvedRadius =
    parseDistanceInput(customRadius, distanceUnit) ?? radiusMeters;
  const presetMeters = radarPresetMetersForUnit(distanceUnit);
  const availablePresets = presetMeters.filter((preset) => {
    if (distanceUnit === "metric") {
      return !usedDistanceOptions.has(preset as RadarDistanceOptionKey);
    }
    const miles = preset / milesToMeters(1);
    return !usedDistanceOptions.has(miles as RadarDistanceOptionKey);
  });
  const chooseAvailable = !usedDistanceOptions.has("choose");

  return (
    <ToolSection title="Distance" first status="active">
      {showPrompt ? (
        <QuestionPromptBlock
          prompt={radarQuestionPrompt(resolvedRadius, distanceUnit)}
        />
      ) : null}
      {availablePresets.length === 0 && !chooseAvailable ? (
        <p className="text-sm text-status-warning">
          Every radar distance option has already been used this session.
        </p>
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
          Custom {distanceUnitLabel(distanceUnit)}
          <input
            value={customRadius}
            onChange={(event) => onCustomRadiusChange(event.target.value)}
            inputMode="decimal"
            autoCorrect="off"
            spellCheck={false}
            className="field-input"
          />
        </label>
      ) : null}
    </ToolSection>
  );
}
