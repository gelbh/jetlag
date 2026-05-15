import {
  formatDistance,
  formatPresetDistance,
  type DistanceUnit,
} from "../../domain/distance";
import {
  availableThermometerDistancePresets,
  isThermometerDistanceOptionAvailable,
  thermometerQuestionPrompt,
  type ThermometerAnswer,
  type ThermometerDistanceOptionMiles,
} from "../../domain/thermometerQuestions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { ToolPanelShell } from "./shared/ToolPanelShell";

interface ThermometerPanelProps {
  distanceUnit: DistanceUnit;
  distanceMeters: number;
  travelMeters: number | null;
  answer: ThermometerAnswer | null;
  step: "a" | "b" | "ready";
  usedDistanceOptions: ReadonlySet<ThermometerDistanceOptionMiles>;
  onDistanceChange: (distanceMeters: number) => void;
  onAnswerChange: (answer: ThermometerAnswer) => void;
  onReset: () => void;
  onCommit: () => void;
}

export function ThermometerPanel({
  distanceUnit,
  distanceMeters,
  travelMeters,
  answer,
  step,
  usedDistanceOptions,
  onDistanceChange,
  onAnswerChange,
  onReset,
  onCommit,
}: ThermometerPanelProps) {
  const travelTooShort =
    travelMeters !== null && travelMeters + 1 < distanceMeters;
  const availableDistancePresets =
    availableThermometerDistancePresets(usedDistanceOptions);
  const distanceAvailable = isThermometerDistanceOptionAvailable(
    usedDistanceOptions,
    distanceMeters,
  );
  const canCommit = step === "ready" && answer !== null && distanceAvailable;

  return (
    <ToolPanelShell
      toolId="thermometer"
      prompt={thermometerQuestionPrompt(distanceMeters, distanceUnit)}
      helper="Tap the map for the start of movement, then the end. The shaded half follows your answer."
    >
      <div>
        <p className="text-sm text-slate-300">Distance traveled</p>
        {availableDistancePresets.length === 0 ? (
          <p className="mt-2 text-sm text-amber-200">
            Every thermometer distance option has already been used this
            session.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {availableDistancePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onDistanceChange(preset)}
                className={`min-h-12 rounded-xl px-3 text-sm ${
                  distanceMeters === preset
                    ? "bg-sky-500 text-slate-950"
                    : "bg-slate-800"
                }`}
              >
                {formatPresetDistance(preset, distanceUnit)}
              </button>
            ))}
          </div>
        )}
      </div>

      <BinaryAnswerPicker
        value={answer}
        onChange={onAnswerChange}
        options={[
          {
            value: "hotter",
            label: "Hotter",
            activeClassName: "bg-emerald-500 text-slate-950",
          },
          {
            value: "colder",
            label: "Colder",
            activeClassName: "bg-rose-500 text-slate-50",
          },
        ]}
      />

      <p className="text-sm text-slate-400">
        {step === "a" && "Waiting for start pin"}
        {step === "b" && "Waiting for end pin"}
        {step === "ready" && answer === null && "Choose hotter or colder"}
        {step === "ready" && answer !== null && "Ready to add thermometer"}
      </p>

      {travelMeters !== null ? (
        <p className="text-sm text-slate-300">
          Movement on map: {formatDistance(travelMeters, distanceUnit)}
        </p>
      ) : null}

      {travelTooShort ? (
        <p className="text-sm text-amber-200">
          Movement is shorter than the selected distance. Confirm before adding.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onReset}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={!canCommit}
          className="min-h-12 rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
        >
          Add thermometer
        </button>
      </div>
    </ToolPanelShell>
  );
}
