import { useMemo, useState } from "react";
import {
  annotationSummary,
  isActive,
  type AnnotationRecord,
  type GameArea,
} from "../../domain/map/annotations";
import {
  DEFAULT_RADIUS_METERS,
  formatPresetDistance,
  parseDistanceInput,
} from "../../domain/map/distance";
import { TextField } from "../ui/TextField";
import { RadarDistancePicker } from "./RadarDistancePicker";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import {
  closerFurtherAnswerOptions,
  hotterColderAnswerOptions,
  yesNoAnswerOptions,
} from "./shared/binaryAnswerOptions";
import { OptionChip, OptionChipRow } from "./shared/OptionChip";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/ResolvedReadout";
import { TentacleAnswerPicker } from "./shared/TentacleAnswerPicker";
import { ToolSection } from "./shared/ToolSection";
import { EditSheetFrame } from "./shared/EditSheetFrame";
import {
  isRadarPresetRadius,
  radarAnswerFromInside,
  radarInsideFromAnswer,
  usedRadarDistanceOptions,
  type RadarAnswer,
} from "../../domain/questions/radarQuestions";
import { useAnnotationStore } from "../../state/sessionStore";
import { useSessionDistanceUnit } from "../../hooks/session/useSessionDistanceUnit";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../domain/geometry/matchingGeometry";
import {
  matchingQuestionFor,
  type MatchingAnswer,
} from "../../domain/questions/matchingQuestions";
import {
  deserializeMatchingFeatures,
  serializeMatchingFeatures,
} from "../../services/geo/matchingFeatures";
import {
  TENTACLE_ANSWER_RADIUS_METERS,
  TENTACLE_SEARCH_RADIUS_METERS,
  tentacleCategoryIdForAnnotation,
  tentacleQuestionPrompt,
  type TentacleExtendedCategoryId,
} from "../../domain/questions/tentacleQuestions";
import { tentacleEliminationJsonForAnswer } from "../../domain/geometry/tentacleGeometry";
import {
  measuringQuestionFor,
  type MeasuringAnswer,
} from "../../domain/questions/measuringQuestions";
import {
  availableThermometerDistancePresets,
  DEFAULT_THERMOMETER_DISTANCE_METERS,
  isThermometerDistanceOptionAvailable,
  thermometerQuestionPrompt,
  thermometerHotterTowards,
  usedThermometerDistanceOptions,
  type ThermometerAnswer,
} from "../../domain/questions/thermometerQuestions";

interface AnnotationEditSheetProps {
  annotation: AnnotationRecord;
  gameArea: GameArea;
  onClose: () => void;
  onSave: (annotation: AnnotationRecord) => void;
  onDelete: (id: string) => void;
  onEditOnMap?: () => void;
}

export function AnnotationEditSheet({
  annotation,
  gameArea,
  onClose,
  onSave,
  onDelete,
  onEditOnMap,
}: AnnotationEditSheetProps) {
  return (
    <AnnotationEditSheetForm
      key={annotation.id}
      annotation={annotation}
      gameArea={gameArea}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      onEditOnMap={onEditOnMap}
    />
  );
}

function AnnotationEditSheetForm({
  annotation,
  gameArea,
  onClose,
  onSave,
  onDelete,
  onEditOnMap,
}: AnnotationEditSheetProps) {
  const distanceUnit = useSessionDistanceUnit();
  const annotations = useAnnotationStore((state) => state.annotations);
  const usedRadarOptions = useMemo(
    () =>
      usedRadarDistanceOptions(
        annotations.filter(isActive),
        distanceUnit,
        annotation.type === "radar" ? annotation.id : undefined,
      ),
    [annotations, annotation],
  );
  const usedThermometerOptions = useMemo(
    () =>
      usedThermometerDistanceOptions(
        annotations.filter(isActive),
        annotation.type === "thermometer" ? annotation.id : undefined,
      ),
    [annotations, annotation],
  );
  const [radiusMeters, setRadiusMeters] = useState(
    annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS,
  );
  const [customRadius, setCustomRadius] = useState("");
  const [chooseCustom, setChooseCustom] = useState(
    annotation.type === "radar" &&
      (annotation.metadata.radarChooseCustom ??
        !isRadarPresetRadius(
          annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS,
        )),
  );
  const [radarAnswer, setRadarAnswer] = useState<RadarAnswer | null>(
    annotation.type === "radar" && annotation.metadata.inside !== undefined
      ? radarAnswerFromInside(annotation.metadata.inside)
      : null,
  );
  const [label, setLabel] = useState(annotation.metadata.label ?? "");
  const [measuringAnswer, setMeasuringAnswer] =
    useState<MeasuringAnswer | null>(
      annotation.metadata.measuringAnswer ?? null,
    );
  const [matchingAnswer, setMatchingAnswer] = useState<MatchingAnswer | null>(
    annotation.metadata.matchingAnswer ?? null,
  );
  const [thermometerDistanceMeters, setThermometerDistanceMeters] = useState(
    annotation.metadata.thermometerDistanceMeters ??
      DEFAULT_THERMOMETER_DISTANCE_METERS,
  );
  const [thermometerAnswer, setThermometerAnswer] =
    useState<ThermometerAnswer | null>(
      annotation.metadata.thermometerAnswer ?? null,
    );
  const [tentacleOutOfReach, setTentacleOutOfReach] = useState(
    annotation.type === "tentacle"
      ? Boolean(annotation.metadata.tentacleOutOfReach)
      : false,
  );
  const [tentacleAnswerPoiId, setTentacleAnswerPoiId] = useState<string | null>(
    annotation.type === "tentacle"
      ? (annotation.metadata.highlightedPoiId ?? null)
      : null,
  );

  const resolvedRadius = chooseCustom
    ? (parseDistanceInput(customRadius, distanceUnit) ?? radiusMeters)
    : radiusMeters;

  const handleSave = () => {
    if (annotation.type === "radar") {
      onSave({
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
      });
      return;
    }

    if (annotation.type === "pin" || annotation.type === "zone") {
      onSave({
        ...annotation,
        metadata: {
          ...annotation.metadata,
          label: label.trim(),
        },
      });
      return;
    }

    if (annotation.type === "tentacle") {
      const selectedPoi = annotation.metadata.pois?.find(
        (poi) => poi.id === tentacleAnswerPoiId,
      );

      const metaRest = { ...annotation.metadata };
      delete metaRest.tentacleEliminationJson;
      const metadata = {
        ...metaRest,
        radiusMeters: TENTACLE_SEARCH_RADIUS_METERS,
        tentacleAnswerRadiusMeters: tentacleOutOfReach
          ? undefined
          : TENTACLE_ANSWER_RADIUS_METERS,
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
          radiusMeters: TENTACLE_ANSWER_RADIUS_METERS,
          pois: annotation.metadata.pois,
          answeredPoiId: selectedPoi?.id,
          outOfReach: tentacleOutOfReach,
          gameArea,
        });
        if (eliminationJson !== undefined) {
          metadata.tentacleEliminationJson = eliminationJson;
        }
      }

      onSave({
        ...annotation,
        metadata,
      });
      return;
    }

    if (annotation.type === "measuring" && measuringAnswer) {
      onSave({
        ...annotation,
        metadata: {
          ...annotation.metadata,
          measuringAnswer,
        },
      });
      return;
    }

    if (
      annotation.type === "thermometer" &&
      thermometerAnswer &&
      isThermometerDistanceOptionAvailable(
        usedThermometerOptions,
        thermometerDistanceMeters,
      )
    ) {
      onSave({
        ...annotation,
        metadata: {
          ...annotation.metadata,
          thermometerDistanceMeters,
          thermometerAnswer,
          hotterTowards: thermometerHotterTowards(thermometerAnswer),
        },
      });
      return;
    }

    if (
      annotation.type === "matching" &&
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
        onClose();
        return;
      }

      onSave({
        ...annotation,
        geometry: eliminationRegion,
        metadata: {
          ...annotation.metadata,
          matchingAnswer,
          matchingBoundaryJson: JSON.stringify(boundaryRegion),
          matchingFeaturesJson: serializeMatchingFeatures(features),
        },
      });
      return;
    }

    if (annotation.type === "matching" && matchingAnswer) {
      onSave({
        ...annotation,
        metadata: {
          ...annotation.metadata,
          matchingAnswer,
        },
      });
      return;
    }

    onClose();
  };

  const canSaveMeasuring =
    annotation.type === "measuring" && measuringAnswer !== null;
  const canSaveClassicThermometer =
    annotation.type === "thermometer" &&
    thermometerAnswer !== null &&
    isThermometerDistanceOptionAvailable(
      usedThermometerOptions,
      thermometerDistanceMeters,
    );
  const availableThermometerPresets = availableThermometerDistancePresets(
    usedThermometerOptions,
  );

  return (
    <EditSheetFrame
      title={annotationSummary(annotation, distanceUnit)}
      onClose={onClose}
      onSave={
        annotation.type === "thermometer" && !canSaveClassicThermometer
          ? undefined
          : annotation.type === "measuring" && !canSaveMeasuring
            ? undefined
            : handleSave
      }
      onDelete={() => onDelete(annotation.id)}
    >
      {annotation.type === "radar" ? (
        <>
          <RadarDistancePicker
            radiusMeters={radiusMeters}
            chooseCustom={chooseCustom}
            customRadius={customRadius}
            distanceUnit={distanceUnit}
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
      ) : null}

      {annotation.type === "pin" || annotation.type === "zone" ? (
        <TextField
          label="Label"
          labelClassName="block text-sm text-ink-muted"
          inputClassName="mt-1 min-h-12 w-full rounded-xl border border-border bg-surface-base px-3"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      ) : null}

      {annotation.type === "tentacle" ? (
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
      ) : null}

      {annotation.type === "matching" ? (
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
      ) : null}

      {annotation.type === "measuring" ? (
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
      ) : null}

      {annotation.type === "thermometer" ? (
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
      ) : null}

      {onEditOnMap ? (
        <button type="button" onClick={onEditOnMap} className="btn-secondary w-full">
          Edit on map
        </button>
      ) : null}
    </EditSheetFrame>
  );
}
