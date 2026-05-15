import { useMemo, useState, type ReactNode } from "react";
import {
  annotationSummary,
  isActive,
  type AnnotationRecord,
  type GameArea,
} from "../../domain/annotations";
import {
  DEFAULT_RADIUS_METERS,
  formatPresetDistance,
  parseDistanceInput,
} from "../../domain/distance";
import { RadarAnswerPicker, RadarDistancePicker } from "./RadarDistancePicker";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import {
  closerFurtherAnswerOptions,
  hotterColderAnswerOptions,
  yesNoAnswerOptions,
} from "./shared/binaryAnswerOptions";
import {
  isRadarPresetRadius,
  radarAnswerFromInside,
  radarInsideFromAnswer,
  usedRadarDistanceOptions,
  type RadarAnswer,
} from "../../domain/radarQuestions";
import { useAnnotationStore, useMapStore } from "../../state/sessionStore";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../domain/matchingGeometry";
import {
  matchingQuestionFor,
  type MatchingAnswer,
} from "../../domain/matchingQuestions";
import {
  deserializeMatchingFeatures,
  serializeMatchingFeatures,
} from "../../services/matchingFeatures";
import {
  TENTACLE_ANSWER_RADIUS_METERS,
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  TENTACLE_SEARCH_RADIUS_METERS,
  tentacleCategoryIdForAnnotation,
  tentacleHiderAnswerClipboardText,
  tentacleQuestionPrompt,
  type TentacleLocationCategoryId,
} from "../../domain/tentacleQuestions";
import { tentacleEliminationJsonForAnswer } from "../../domain/tentacleGeometry";
import { copyToClipboard } from "../../platform/copyToClipboard";

import {
  measuringQuestionFor,
  type MeasuringAnswer,
} from "../../domain/measuringQuestions";
import {
  availableThermometerDistancePresets,
  DEFAULT_THERMOMETER_DISTANCE_METERS,
  isThermometerDistanceOptionAvailable,
  thermometerQuestionPrompt,
  thermometerHotterTowards,
  usedThermometerDistanceOptions,
  type ThermometerAnswer,
} from "../../domain/thermometerQuestions";

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
  const distanceUnit = useMapStore((state) => state.distanceUnit);
  const annotations = useAnnotationStore((state) => state.annotations);
  const usedRadarOptions = useMemo(
    () =>
      usedRadarDistanceOptions(
        annotations.filter(isActive),
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
  const [tentacleCopyStatus, setTentacleCopyStatus] = useState<
    "idle" | "copied" | "failed"
  >("idle");

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
          <RadarAnswerPicker
            answer={radarAnswer}
            onAnswerChange={setRadarAnswer}
          />
        </>
      ) : null}

      {annotation.type === "pin" || annotation.type === "zone" ? (
        <label className="block text-sm text-slate-300">
          Label
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
          />
        </label>
      ) : null}

      {annotation.type === "tentacle" ? (
        <>
          <p className="text-sm text-slate-300">
            {tentacleQuestionPrompt(
              tentacleCategoryIdForAnnotation(annotation) ?? "museum",
              distanceUnit,
              annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS,
            )}
          </p>
          <p className="text-sm text-slate-400">
            Tentacles always use a 1 mile radius from the anchor.
          </p>
          {(annotation.metadata.pois ?? []).length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-300">Answer</p>
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const cat = (tentacleCategoryIdForAnnotation(
                        annotation,
                      ) ?? "museum") as TentacleLocationCategoryId;
                      const text = tentacleHiderAnswerClipboardText(
                        cat,
                        distanceUnit,
                        annotation.metadata.pois ?? [],
                      );
                      const ok = await copyToClipboard(text);
                      setTentacleCopyStatus(ok ? "copied" : "failed");
                      setTimeout(
                        () => setTentacleCopyStatus("idle"),
                        ok ? 2000 : 3000,
                      );
                    })();
                  }}
                  className="min-h-9 rounded-lg bg-slate-700 px-3 text-xs font-medium text-slate-100"
                >
                  {tentacleCopyStatus === "copied"
                    ? "Copied"
                    : tentacleCopyStatus === "failed"
                      ? "Copy failed"
                      : "Copy list for hiders"}
                </button>
              </div>
              <div className="space-y-2">
                {(annotation.metadata.pois ?? []).map((poi) => (
                  <button
                    key={poi.id}
                    type="button"
                    onClick={() => {
                      setTentacleOutOfReach(false);
                      setTentacleAnswerPoiId(poi.id);
                    }}
                    className={`min-h-12 w-full rounded-xl px-3 text-left text-sm ${
                      tentacleAnswerPoiId === poi.id
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800"
                    }`}
                  >
                    {poi.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setTentacleOutOfReach(true);
                    setTentacleAnswerPoiId(null);
                  }}
                  className={`min-h-12 w-full rounded-xl px-3 text-sm ${
                    tentacleOutOfReach
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800"
                  }`}
                >
                  {TENTACLE_NOT_WITHIN_REACH_LABEL}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {annotation.type === "matching" ? (
        <>
          <p className="text-sm text-slate-300">
            {
              matchingQuestionFor(
                annotation.metadata.matchingCategory ?? "commercial_airport",
              ).prompt
            }
          </p>
          <BinaryAnswerPicker
            value={matchingAnswer}
            onChange={setMatchingAnswer}
            options={yesNoAnswerOptions}
          />
        </>
      ) : null}

      {annotation.type === "measuring" ? (
        <>
          <p className="text-sm text-slate-300">
            {
              measuringQuestionFor(
                annotation.metadata.measuringSubject ?? "location",
                annotation.metadata.measuringLocationCategory,
              ).prompt
            }
          </p>
          <BinaryAnswerPicker
            value={measuringAnswer}
            onChange={setMeasuringAnswer}
            options={closerFurtherAnswerOptions}
          />
        </>
      ) : null}

      {annotation.type === "thermometer" ? (
        <>
          <p className="text-sm font-medium text-slate-100">
            {thermometerQuestionPrompt(thermometerDistanceMeters, distanceUnit)}
          </p>
          <div>
            <p className="text-sm text-slate-300">Distance traveled</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableThermometerPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setThermometerDistanceMeters(preset)}
                  className={`min-h-12 rounded-xl px-3 text-sm ${
                    thermometerDistanceMeters === preset
                      ? "bg-sky-500 text-slate-950"
                      : "bg-slate-800"
                  }`}
                >
                  {formatPresetDistance(preset, distanceUnit)}
                </button>
              ))}
            </div>
          </div>
          <BinaryAnswerPicker
            value={thermometerAnswer}
            onChange={setThermometerAnswer}
            options={hotterColderAnswerOptions}
          />
          <p className="text-sm text-slate-400">
            Move the thermometer endpoints on the map, then save your changes.
          </p>
        </>
      ) : null}

      {onEditOnMap ? (
        <button
          type="button"
          onClick={onEditOnMap}
          className="min-h-12 w-full rounded-xl bg-slate-800 px-3 text-sm font-medium text-slate-100"
        >
          Edit on map
        </button>
      ) : null}
    </EditSheetFrame>
  );
}

function EditSheetFrame({
  title,
  onClose,
  onSave,
  onDelete,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave?: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(var(--dock-height)+env(safe-area-inset-bottom)+0.5rem)] z-[1001] px-3">
      <div className="mx-auto max-h-[min(42dvh,420px)] max-w-xl overflow-y-auto overscroll-contain rounded-3xl border border-slate-700 bg-slate-950/95 p-4 backdrop-blur">
        <EditSheetHeader title={title} onClose={onClose} />
        <div className="space-y-4">{children}</div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              className="min-h-12 rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950"
            >
              Save changes
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            className={`min-h-12 rounded-xl bg-rose-500/20 px-3 text-sm font-medium text-rose-200 ${
              onSave ? "" : "col-span-2"
            }`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSheetHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">Edit</p>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="min-h-12 rounded-xl bg-slate-800 px-4 text-sm font-medium"
      >
        Close
      </button>
    </div>
  );
}
