import { useCallback, useEffect, useState } from "react";
import type { AnnotationRecord, GameArea } from "../../../domain/map/annotations";
import {
  DEFAULT_RADIUS_METERS,
  formatPresetDistance,
  type DistanceUnit,
} from "../../../domain/map/distance";
import { tentacleEliminationJsonForAnswer } from "../../../domain/geometry/tentacleGeometry";
import {
  tentacleCategoryIdForAnnotation,
  tentacleQuestionPrompt,
  type TentacleExtendedCategoryId,
} from "../../../domain/questions";
import { QuestionPromptBlock } from "../shared/QuestionPromptBlock";
import { TentacleAnswerPicker } from "../shared/TentacleAnswerPicker";
import { ToolSection } from "../shared/ToolSection";
import type { EditSavePayload } from "./types";

export type TentacleAnnotation = AnnotationRecord & { type: "tentacle" };

interface TentacleEditFieldsProps {
  annotation: TentacleAnnotation;
  gameArea: GameArea;
  distanceUnit: DistanceUnit;
  onSavePayloadChange: (payload: EditSavePayload) => void;
}

export function TentacleEditFields({
  annotation,
  gameArea,
  distanceUnit,
  onSavePayloadChange,
}: TentacleEditFieldsProps) {
  const [tentacleOutOfReach, setTentacleOutOfReach] = useState(
    Boolean(annotation.metadata.tentacleOutOfReach),
  );
  const [tentacleAnswerPoiId, setTentacleAnswerPoiId] = useState<string | null>(
    annotation.metadata.highlightedPoiId ?? null,
  );

  const save = useCallback(() => {
    const selectedPoi = annotation.metadata.pois?.find(
      (poi) => poi.id === tentacleAnswerPoiId,
    );

    const radiusMeters = annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const metaRest = { ...annotation.metadata };
    delete metaRest.tentacleEliminationJson;
    const metadata = {
      ...metaRest,
      radiusMeters,
      tentacleAnswerRadiusMeters: tentacleOutOfReach ? undefined : radiusMeters,
      tentacleChooseCustom: false,
      tentacleOutOfReach,
      highlightedPoiId: selectedPoi?.id,
      tentacleAnswerPoiName: selectedPoi?.name,
    };
    const geom = annotation.geometry.geometry;
    if (geom.type === "Point") {
      const [lng, lat] = geom.coordinates;
      const eliminationJson = tentacleEliminationJsonForAnswer({
        anchor: [lat, lng],
        radiusMeters,
        pois: annotation.metadata.pois,
        answeredPoiId: selectedPoi?.id,
        outOfReach: tentacleOutOfReach,
        gameArea,
      });
      if (eliminationJson !== undefined) {
        metadata.tentacleEliminationJson = eliminationJson;
      }
    }

    return {
      type: "save" as const,
      annotation: {
        ...annotation,
        metadata,
      },
    };
  }, [annotation, gameArea, tentacleAnswerPoiId, tentacleOutOfReach]);

  useEffect(() => {
    onSavePayloadChange({ canSave: true, save });
  }, [onSavePayloadChange, save]);

  return (
    <>
      <ToolSection title="Question" first status="active">
        <QuestionPromptBlock
          prompt={tentacleQuestionPrompt(
            tentacleCategoryIdForAnnotation(annotation) ?? "museum",
            distanceUnit,
            annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS,
          )}
          ruleSummary={`Tentacles always use a ${formatPresetDistance(
            annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS,
            distanceUnit,
          )} radius from the anchor.`}
        />
      </ToolSection>
      <TentacleAnswerPicker
        categoryId={
          (tentacleCategoryIdForAnnotation(annotation) ??
            "museum") as TentacleExtendedCategoryId
        }
        distanceUnit={distanceUnit}
        searchRadiusMeters={
          annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS
        }
        poiOptions={annotation.metadata.pois ?? []}
        selectedPoiId={tentacleAnswerPoiId}
        outOfReach={tentacleOutOfReach}
        onSelectPoi={(poiId) => {
          setTentacleOutOfReach(false);
          setTentacleAnswerPoiId(poiId);
        }}
        onOutOfReachChange={(value) => {
          setTentacleOutOfReach(value);
          if (value) {
            setTentacleAnswerPoiId(null);
          }
        }}
      />
    </>
  );
}
