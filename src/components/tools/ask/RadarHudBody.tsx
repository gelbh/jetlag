/**
 * Radar Ask HUD mode body — distance chip island + optional solo answer.
 * No WizardPanelFrame / PhaseRail / CONTINUE nav.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { RadarDistancePicker } from "@/components/tools/RadarDistancePicker";
import { yesNoAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import { BinaryAnswerPicker } from "@/components/tools/shared/answers/BinaryAnswerPicker";
import { PlacementActions } from "@/components/tools/shared/controls/PlacementActions";
import { ViewOnlyQuestionBanner } from "@/components/tools/shared/readout/ViewOnlyQuestionBanner";
import { parseDistanceInput, type DistanceUnit } from "@/domain/map/distance";
import {
  isRadarRadiusAllowedForGameSize,
  type RadarAnswer,
  type RadarDistanceOptionKey,
} from "@/domain/questions";
import type { GameSize } from "@/domain/session/size/gameSize";

export type RadarHudBodyProps = {
  radiusMeters: number | null;
  chooseCustom: boolean;
  customRadius: string;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  distanceUnit: DistanceUnit;
  gameSize: GameSize;
  usedDistanceOptions: ReadonlySet<RadarDistanceOptionKey>;
  answer: RadarAnswer | null;
  onPresetSelect: (radiusMeters: number) => void;
  onChooseSelect: () => void;
  onCustomRadiusChange: (value: string) => void;
  onAnswerChange: (answer: RadarAnswer) => void;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  gpsLoading: boolean;
  awaitHiderAnswer?: boolean;
  viewOnly?: boolean;
};

export function RadarHudBody({
  radiusMeters,
  chooseCustom,
  customRadius,
  awaitingPlacement,
  hasCenter,
  distanceUnit,
  gameSize,
  usedDistanceOptions,
  answer,
  onPresetSelect,
  onChooseSelect,
  onCustomRadiusChange,
  onAnswerChange,
  onUseGps,
  onPlaceAtMapTap,
  gpsLoading,
  awaitHiderAnswer = false,
  viewOnly = false,
}: RadarHudBodyProps) {
  const resolvedRadius = chooseCustom
    ? (parseDistanceInput(customRadius, distanceUnit) ?? radiusMeters)
    : radiusMeters;
  const distanceSelectionAvailable =
    resolvedRadius !== null &&
    isRadarRadiusAllowedForGameSize(
      gameSize,
      resolvedRadius,
      distanceUnit,
      chooseCustom,
    );

  return (
    <div
      data-testid="radar-hud-body"
      className="ask-hud-mode-body flex w-full flex-col gap-2"
    >
      {viewOnly ? <ViewOnlyQuestionBanner /> : null}

      <div className="pointer-events-auto hud-panel space-y-2 p-3">
        <PlacementActions
          awaitingPlacement={awaitingPlacement}
          hasCenter={hasCenter}
          gpsLoading={gpsLoading}
          onUseGps={onUseGps}
          onPlaceAtMapTap={onPlaceAtMapTap}
          centerHint="Center pinned on the map. Tap again to move it."
        />

        <RadarDistancePicker
          radiusMeters={radiusMeters ?? 0}
          chooseCustom={chooseCustom}
          customRadius={customRadius}
          distanceUnit={distanceUnit}
          gameSize={gameSize}
          usedDistanceOptions={usedDistanceOptions}
          onPresetSelect={onPresetSelect}
          onChooseSelect={onChooseSelect}
          onCustomRadiusChange={onCustomRadiusChange}
          showPrompt={hasCenter}
        />

        {!awaitHiderAnswer && !viewOnly && hasCenter && distanceSelectionAvailable ? (
          <BinaryAnswerPicker
            value={answer}
            onChange={onAnswerChange}
            options={yesNoAnswerOptions}
            label=""
          />
        ) : null}
      </div>
    </div>
  );
}
