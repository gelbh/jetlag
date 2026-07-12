import { useCallback, useEffect, useState } from "react";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import {
  formatPresetDistance,
  type DistanceUnit,
} from "../../../domain/map/distance";
import {
  availableThermometerDistancePresets,
  DEFAULT_THERMOMETER_DISTANCE_METERS,
  isThermometerDistanceOptionAvailable,
  thermometerQuestionPrompt,
  thermometerHotterTowards,
  type ThermometerAnswer,
  type ThermometerDistanceOptionMiles,
} from "../../../domain/questions";
import { BinaryAnswerPicker } from "../shared/BinaryAnswerPicker";
import { hotterColderAnswerOptions } from "../shared/binaryAnswerOptions";
import { OptionChip, OptionChipRow } from "../shared/OptionChip";
import { QuestionPromptBlock } from "../shared/QuestionPromptBlock";
import { ResolvedReadout } from "../shared/ResolvedReadout";
import { ToolSection } from "../shared/ToolSection";
import type { EditSavePayload } from "./types";

export type ThermometerAnnotation = AnnotationRecord & { type: "thermometer" };

interface ThermometerEditFieldsProps {
  annotation: ThermometerAnnotation;
  distanceUnit: DistanceUnit;
  usedThermometerOptions: ReadonlySet<ThermometerDistanceOptionMiles>;
  onSavePayloadChange: (payload: EditSavePayload) => void;
}

export function ThermometerEditFields({
  annotation,
  distanceUnit,
  usedThermometerOptions,
  onSavePayloadChange,
}: ThermometerEditFieldsProps) {
  const [thermometerDistanceMeters, setThermometerDistanceMeters] = useState(
    annotation.metadata.thermometerDistanceMeters ??
      DEFAULT_THERMOMETER_DISTANCE_METERS,
  );
  const [thermometerAnswer, setThermometerAnswer] =
    useState<ThermometerAnswer | null>(
      annotation.metadata.thermometerAnswer ?? null,
    );

  const canSave =
    thermometerAnswer !== null &&
    isThermometerDistanceOptionAvailable(
      usedThermometerOptions,
      thermometerDistanceMeters,
    );

  const availableThermometerPresets = availableThermometerDistancePresets(
    usedThermometerOptions,
  );

  const save = useCallback(() => {
    if (!canSave || !thermometerAnswer) {
      return { type: "close" as const };
    }

    return {
      type: "save" as const,
      annotation: {
        ...annotation,
        metadata: {
          ...annotation.metadata,
          thermometerDistanceMeters,
          thermometerAnswer,
          hotterTowards: thermometerHotterTowards(thermometerAnswer),
        },
      },
    };
  }, [annotation, canSave, thermometerAnswer, thermometerDistanceMeters]);

  useEffect(() => {
    onSavePayloadChange({ canSave, save });
  }, [canSave, onSavePayloadChange, save]);

  return (
    <>
      <ToolSection title="Question" first status="active">
        <QuestionPromptBlock
          prompt={thermometerQuestionPrompt(
            thermometerDistanceMeters,
            distanceUnit,
          )}
        />
      </ToolSection>
      <ToolSection title="Distance traveled" status="active">
        <OptionChipRow>
          {availableThermometerPresets.map((preset) => (
            <OptionChip
              key={preset}
              selected={thermometerDistanceMeters === preset}
              onClick={() => setThermometerDistanceMeters(preset)}
            >
              {formatPresetDistance(preset, distanceUnit)}
            </OptionChip>
          ))}
        </OptionChipRow>
      </ToolSection>
      <ToolSection
        title="Answer"
        status={thermometerAnswer !== null ? "complete" : "active"}
      >
        <BinaryAnswerPicker
          value={thermometerAnswer}
          onChange={setThermometerAnswer}
          options={hotterColderAnswerOptions}
          label=""
        />
      </ToolSection>
      <ResolvedReadout variant="dim">
        Move the thermometer endpoints on the map, then save your changes.
      </ResolvedReadout>
    </>
  );
}
