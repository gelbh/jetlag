import { RadarAnswerPicker, RadarDistancePicker } from "./RadarDistancePicker";
import { PlacementActions } from "./shared/PlacementActions";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import {
  isRadarDistanceOptionAvailable,
  type RadarAnswer,
  type RadarDistanceOptionKey,
} from "../../domain/radarQuestions";
import type { DistanceUnit } from "../../domain/distance";

interface RadarPanelProps {
  radiusMeters: number;
  chooseCustom: boolean;
  customRadius: string;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  distanceUnit: DistanceUnit;
  usedDistanceOptions: ReadonlySet<RadarDistanceOptionKey>;
  answer: RadarAnswer | null;
  onPresetSelect: (radiusMeters: number) => void;
  onChooseSelect: () => void;
  onCustomRadiusChange: (value: string) => void;
  onAnswerChange: (answer: RadarAnswer) => void;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  onCommit: () => void;
  gpsLoading: boolean;
  error?: string | null;
}

export function RadarPanel({
  radiusMeters,
  chooseCustom,
  customRadius,
  awaitingPlacement,
  hasCenter,
  distanceUnit,
  usedDistanceOptions,
  answer,
  onPresetSelect,
  onChooseSelect,
  onCustomRadiusChange,
  onAnswerChange,
  onUseGps,
  onPlaceAtMapTap,
  onCommit,
  gpsLoading,
  error,
}: RadarPanelProps) {
  const distanceSelectionAvailable = isRadarDistanceOptionAvailable(
    usedDistanceOptions,
    chooseCustom,
    radiusMeters,
  );
  const canCommit = hasCenter && answer !== null && distanceSelectionAvailable;

  return (
    <ToolPanelShell
      toolId="radar"
      helper="Pick a distance, pin your anchor, then record the answer."
    >
      <RadarDistancePicker
        radiusMeters={radiusMeters}
        chooseCustom={chooseCustom}
        customRadius={customRadius}
        distanceUnit={distanceUnit}
        usedDistanceOptions={usedDistanceOptions}
        onPresetSelect={onPresetSelect}
        onChooseSelect={onChooseSelect}
        onCustomRadiusChange={onCustomRadiusChange}
      />

      <PlacementActions
        awaitingPlacement={awaitingPlacement}
        hasCenter={hasCenter}
        gpsLoading={gpsLoading}
        onUseGps={onUseGps}
        onPlaceAtMapTap={onPlaceAtMapTap}
        centerHint="Center pinned on the map. Tap again to move it."
      />

      <RadarAnswerPicker answer={answer} onAnswerChange={onAnswerChange} />

      <button
        type="button"
        onClick={onCommit}
        disabled={!canCommit}
        className="min-h-12 w-full rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
      >
        Add radar question
      </button>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </ToolPanelShell>
  );
}
