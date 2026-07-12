import { useCallback, useEffect, useState } from "react";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import {
  DEFAULT_RADIUS_METERS,
  parseDistanceInput,
  type DistanceUnit,
} from "../../../domain/map/distance";
import {
  isRadarDistanceOptionUsed,
  isRadarPresetRadius,
  isRadarRadiusAllowedForGameSize,
  radarAnswerFromInside,
  radarInsideFromAnswer,
  type RadarAnswer,
  type RadarDistanceOptionKey,
} from "../../../domain/questions";
import type { GameSize } from "../../../domain/session/gameSize";
import { RadarDistancePicker } from "../RadarDistancePicker";
import { BinaryAnswerPicker } from "../shared/BinaryAnswerPicker";
import { yesNoAnswerOptions } from "../shared/binaryAnswerOptions";
import { ToolSection } from "../shared/ToolSection";
import type { EditSavePayload } from "./types";

export type RadarAnnotation = AnnotationRecord & { type: "radar" };

interface RadarEditFieldsProps {
  annotation: RadarAnnotation;
  distanceUnit: DistanceUnit;
  gameSize: GameSize;
  usedRadarOptions: ReadonlySet<RadarDistanceOptionKey>;
  onSavePayloadChange: (payload: EditSavePayload) => void;
}

export function RadarEditFields({
  annotation,
  distanceUnit,
  gameSize,
  usedRadarOptions,
  onSavePayloadChange,
}: RadarEditFieldsProps) {
  const [radiusMeters, setRadiusMeters] = useState(
    annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS,
  );
  const [customRadius, setCustomRadius] = useState("");
  const [chooseCustom, setChooseCustom] = useState(
    annotation.metadata.radarChooseCustom ??
      !isRadarPresetRadius(
        annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS,
      ),
  );
  const [radarAnswer, setRadarAnswer] = useState<RadarAnswer | null>(
    annotation.metadata.inside !== undefined
      ? radarAnswerFromInside(annotation.metadata.inside)
      : null,
  );

  const resolvedRadius = chooseCustom
    ? (parseDistanceInput(customRadius, distanceUnit) ?? radiusMeters)
    : radiusMeters;

  const canSave =
    isRadarRadiusAllowedForGameSize(
      gameSize,
      resolvedRadius,
      distanceUnit,
      chooseCustom,
    ) &&
    !isRadarDistanceOptionUsed(
      usedRadarOptions,
      chooseCustom,
      resolvedRadius,
      distanceUnit,
    );

  const save = useCallback(() => {
    if (!canSave) {
      return { type: "close" as const };
    }

    return {
      type: "save" as const,
      annotation: {
        ...annotation,
        metadata: {
          ...annotation.metadata,
          radiusMeters: resolvedRadius,
          radarChooseCustom: chooseCustom,
          inside:
            radarAnswer === null
              ? annotation.metadata.inside
              : radarInsideFromAnswer(radarAnswer),
        },
      },
    };
  }, [annotation, canSave, chooseCustom, radarAnswer, resolvedRadius]);

  useEffect(() => {
    onSavePayloadChange({ canSave, save });
  }, [canSave, onSavePayloadChange, save]);

  return (
    <>
      <RadarDistancePicker
        radiusMeters={radiusMeters}
        chooseCustom={chooseCustom}
        customRadius={customRadius}
        distanceUnit={distanceUnit}
        gameSize={gameSize}
        usedDistanceOptions={usedRadarOptions}
        onPresetSelect={(nextRadius) => {
          setChooseCustom(false);
          setCustomRadius("");
          setRadiusMeters(nextRadius);
        }}
        onChooseSelect={() => setChooseCustom(true)}
        onCustomRadiusChange={setCustomRadius}
      />
      <ToolSection
        title="Answer"
        status={radarAnswer !== null ? "complete" : "active"}
      >
        <BinaryAnswerPicker
          value={radarAnswer}
          onChange={setRadarAnswer}
          options={yesNoAnswerOptions}
          label=""
        />
      </ToolSection>
    </>
  );
}
