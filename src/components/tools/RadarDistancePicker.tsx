import {
  RADAR_CHOOSE_LABEL,
  RADAR_DISTANCE_MILES,
  radarDistanceOptionLabel,
  radarQuestionPrompt,
  type RadarAnswer,
  type RadarDistanceOptionKey,
} from "../../domain/radarQuestions";
import {
  distanceUnitLabel,
  milesToMeters,
  parseDistanceInput,
  type DistanceUnit,
} from "../../domain/distance";

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
    <div className="space-y-2">
      {showPrompt ? (
        <p className="text-sm font-medium text-slate-100">
          {radarQuestionPrompt(resolvedRadius, distanceUnit)}
        </p>
      ) : null}
      <p className="text-sm text-slate-300">Distance</p>
      {availablePresetMiles.length === 0 && !chooseAvailable ? (
        <p className="text-sm text-amber-200">
          Every radar distance option has already been used this session.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {availablePresetMiles.map((miles) => {
            const presetMeters = milesToMeters(miles);
            const selected = !chooseCustom && radiusMeters === presetMeters;

            return (
              <button
                key={miles}
                type="button"
                onClick={() => onPresetSelect(presetMeters)}
                className={`min-h-12 rounded-xl px-3 text-sm ${
                  selected ? "bg-sky-500 text-slate-950" : "bg-slate-800"
                }`}
              >
                {radarDistanceOptionLabel(miles, distanceUnit)}
              </button>
            );
          })}
          {chooseAvailable ? (
            <button
              type="button"
              onClick={onChooseSelect}
              className={`min-h-12 rounded-xl px-3 text-sm ${
                chooseCustom ? "bg-sky-500 text-slate-950" : "bg-slate-800"
              }`}
            >
              {RADAR_CHOOSE_LABEL}
            </button>
          ) : null}
        </div>
      )}
      {chooseCustom && chooseAvailable ? (
        <label className="mt-3 block text-sm text-slate-300">
          Custom {distanceUnitLabel(distanceUnit)}
          <input
            value={customRadius}
            onChange={(event) => onCustomRadiusChange(event.target.value)}
            inputMode="decimal"
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
          />
        </label>
      ) : null}
    </div>
  );
}

interface RadarAnswerPickerProps {
  answer: RadarAnswer | null;
  onAnswerChange: (answer: RadarAnswer) => void;
}

export function RadarAnswerPicker({
  answer,
  onAnswerChange,
}: RadarAnswerPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-300">Answer</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onAnswerChange("yes")}
          className={`min-h-12 rounded-xl px-3 text-sm ${
            answer === "yes" ? "bg-emerald-500 text-slate-950" : "bg-slate-800"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onAnswerChange("no")}
          className={`min-h-12 rounded-xl px-3 text-sm ${
            answer === "no" ? "bg-rose-500 text-slate-50" : "bg-slate-800"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
