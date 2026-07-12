import { useCallback, useEffect, useState } from "react";
import type { AnnotationRecord, GameArea } from "../../../domain/map/annotations";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../../domain/geometry/matchingGeometry";
import {
  deserializeMatchingFeatures,
  serializeMatchingFeatures,
} from "../../../domain/geo/matchingAdapters";
import {
  matchingQuestionFor,
  type MatchingAnswer,
} from "../../../domain/questions";
import { BinaryAnswerPicker } from "../shared/BinaryAnswerPicker";
import { yesNoAnswerOptions } from "../shared/binaryAnswerOptions";
import { QuestionPromptBlock } from "../shared/QuestionPromptBlock";
import { ToolSection } from "../shared/ToolSection";
import type { EditSavePayload } from "./types";

export type MatchingAnnotation = AnnotationRecord & { type: "matching" };

interface MatchingEditFieldsProps {
  annotation: MatchingAnnotation;
  gameArea: GameArea;
  onSavePayloadChange: (payload: EditSavePayload) => void;
}

export function MatchingEditFields({
  annotation,
  gameArea,
  onSavePayloadChange,
}: MatchingEditFieldsProps) {
  const [matchingAnswer, setMatchingAnswer] = useState<MatchingAnswer | null>(
    annotation.metadata.matchingAnswer ?? null,
  );

  const save = useCallback(() => {
    if (
      annotation.metadata.matchingCategory &&
      matchingAnswer &&
      !annotation.metadata.matchingNullAnswer &&
      annotation.metadata.matchingNearestFeatureId
    ) {
      const features = deserializeMatchingFeatures(
        annotation.metadata.matchingFeaturesJson,
      );
      const boundaryRegion = buildSameNearestRegion(
        features,
        annotation.metadata.matchingNearestFeatureId,
        gameArea,
      );
      const eliminationRegion = buildMatchingEliminationRegion(
        features,
        annotation.metadata.matchingNearestFeatureId,
        gameArea,
        matchingAnswer,
      );

      if (!boundaryRegion || !eliminationRegion) {
        return { type: "close" as const };
      }

      return {
        type: "save" as const,
        annotation: {
          ...annotation,
          geometry: eliminationRegion,
          metadata: {
            ...annotation.metadata,
            matchingAnswer,
            matchingBoundaryJson: JSON.stringify(boundaryRegion),
            matchingFeaturesJson: serializeMatchingFeatures(features),
          },
        },
      };
    }

    if (matchingAnswer) {
      return {
        type: "save" as const,
        annotation: {
          ...annotation,
          metadata: {
            ...annotation.metadata,
            matchingAnswer,
          },
        },
      };
    }

    return { type: "close" as const };
  }, [annotation, gameArea, matchingAnswer]);

  useEffect(() => {
    onSavePayloadChange({ canSave: true, save });
  }, [onSavePayloadChange, save]);

  return (
    <>
      <ToolSection title="Question" first status="active">
        <QuestionPromptBlock
          prompt={
            matchingQuestionFor(
              annotation.metadata.matchingCategory ?? "commercial_airport",
            ).prompt
          }
        />
      </ToolSection>
      <ToolSection
        title="Answer"
        status={matchingAnswer !== null ? "complete" : "active"}
      >
        <BinaryAnswerPicker
          value={matchingAnswer}
          onChange={setMatchingAnswer}
          options={yesNoAnswerOptions}
          label=""
        />
      </ToolSection>
    </>
  );
}
