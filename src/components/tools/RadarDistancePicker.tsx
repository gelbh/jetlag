import {
  RADAR_CHOOSE_LABEL,
  RADAR_DISTANCE_MILES,
  radarDistanceOptionLabel,
  radarQuestionPrompt,
  type RadarDistanceOptionKey,
} from "../../domain/radarQuestions";
import {
  distanceUnitLabel,
  milesToMeters,
  parseDistanceInput,
  type DistanceUnit,
} from "../../domain/distance";
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
  const availablePresetMiles = RADAR_DISTANCE_MILES.filter(
    (miles) => !usedDistanceOptions.has(miles),
  );
  const chooseAvailable = !usedDistanceOptions.has("choose");

  return (
    <ToolSection title="Distance" first status="active">
      {showPrompt ? (
        <QuestionPromptBlock
          prompt={radarQuestionPrompt(resolvedRadius, distanceUnit)}
        />
      ) : null}
      {availablePresetMiles.length === 0 && !chooseAvailable ? (
        <p className="text-sm text-status-warning">
          Every radar distance option has already been used this session.
        </p>
      ) : (
        <OptionChipRow>
          {availablePresetMiles.map((miles) => {
            const presetMeters = milesToMeters(miles);
            const selected = !chooseCustom && radiusMeters === presetMeters;

            return (
              <OptionChip
                key={miles}
                selected={selected}
                onClick={() => onPresetSelect(presetMeters)}
              >
                {radarDistanceOptionLabel(miles, distanceUnit)}
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
            className="field-input"
          />
        </label>
      ) : null}
    </ToolSection>
  );
}
