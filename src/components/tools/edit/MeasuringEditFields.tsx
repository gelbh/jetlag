import { useCallback, useEffect, useState } from "react";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import {
  measuringQuestionFor,
  type MeasuringAnswer,
} from "../../../domain/questions";
import { BinaryAnswerPicker } from "../shared/BinaryAnswerPicker";
import { closerFurtherAnswerOptions } from "../shared/binaryAnswerOptions";
import { QuestionPromptBlock } from "../shared/QuestionPromptBlock";
import { ToolSection } from "../shared/ToolSection";
import type { EditSavePayload } from "./types";

export type MeasuringAnnotation = AnnotationRecord & { type: "measuring" };

interface MeasuringEditFieldsProps {
  annotation: MeasuringAnnotation;
  onSavePayloadChange: (payload: EditSavePayload) => void;
}

export function MeasuringEditFields({
  annotation,
  onSavePayloadChange,
}: MeasuringEditFieldsProps) {
  const [measuringAnswer, setMeasuringAnswer] =
    useState<MeasuringAnswer | null>(annotation.metadata.measuringAnswer ?? null);

  const canSave = measuringAnswer !== null;

  const save = useCallback(() => {
    if (!measuringAnswer) {
      return { type: "close" as const };
    }

    return {
      type: "save" as const,
      annotation: {
        ...annotation,
        metadata: {
          ...annotation.metadata,
          measuringAnswer,
        },
      },
    };
  }, [annotation, measuringAnswer]);

  useEffect(() => {
    onSavePayloadChange({ canSave, save });
  }, [canSave, onSavePayloadChange, save]);

  return (
    <>
      <ToolSection title="Question" first status="active">
        <QuestionPromptBlock
          prompt={
            measuringQuestionFor(
              annotation.metadata.measuringSubject ?? "location",
              annotation.metadata.measuringLocationCategory,
            ).prompt
          }
        />
      </ToolSection>
      <ToolSection
        title="Answer"
        status={measuringAnswer !== null ? "complete" : "active"}
      >
        <BinaryAnswerPicker
          value={measuringAnswer}
          onChange={setMeasuringAnswer}
          options={closerFurtherAnswerOptions}
          label=""
        />
      </ToolSection>
    </>
  );
}
