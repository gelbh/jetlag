import type { ReactNode } from "react";
import {
  type AnnotationRecord,
  annotationSupportsPostAnswerEdit,
  type GameArea,
} from "@/domain/map/annotations";
import type { DistanceUnit } from "@/domain/map/distance";
import type { RadarDistanceOptionKey, ThermometerDistanceOptionKey } from "@/domain/questions";
import type { GameSize } from "@/domain/session/size/gameSize";
import { type MatchingAnnotation, MatchingEditFields } from "./MatchingEditFields";
import { type MeasuringAnnotation, MeasuringEditFields } from "./MeasuringEditFields";
import { type PinZoneAnnotation, PinZoneEditFields } from "./PinZoneEditFields";
import { type RadarAnnotation, RadarEditFields } from "./RadarEditFields";
import { type ThermometerAnnotation, ThermometerEditFields } from "./ThermometerEditFields";
import type { EditSavePayload } from "./types";

export interface AnnotationEditFieldsContext {
  gameArea: GameArea;
  distanceUnit: DistanceUnit;
  gameSize: GameSize;
  usedRadarOptions: ReadonlySet<RadarDistanceOptionKey>;
  usedThermometerOptions: ReadonlySet<ThermometerDistanceOptionKey>;
  onSavePayloadChange: (payload: EditSavePayload) => void;
}

export function annotationEditFields(
  annotation: AnnotationRecord,
  context: AnnotationEditFieldsContext,
): ReactNode {
  if (!annotationSupportsPostAnswerEdit(annotation)) {
    return null;
  }
  switch (annotation.type) {
    case "radar":
      return (
        <RadarEditFields
          annotation={annotation as RadarAnnotation}
          distanceUnit={context.distanceUnit}
          gameSize={context.gameSize}
          usedRadarOptions={context.usedRadarOptions}
          onSavePayloadChange={context.onSavePayloadChange}
        />
      );
    case "pin":
    case "zone":
      return (
        <PinZoneEditFields
          annotation={annotation as PinZoneAnnotation}
          onSavePayloadChange={context.onSavePayloadChange}
        />
      );
    case "tentacle":
      return null;
    case "matching":
      return (
        <MatchingEditFields
          annotation={annotation as MatchingAnnotation}
          gameArea={context.gameArea}
          onSavePayloadChange={context.onSavePayloadChange}
        />
      );
    case "measuring":
      return (
        <MeasuringEditFields
          annotation={annotation as MeasuringAnnotation}
          onSavePayloadChange={context.onSavePayloadChange}
        />
      );
    case "thermometer":
      return (
        <ThermometerEditFields
          annotation={annotation as ThermometerAnnotation}
          distanceUnit={context.distanceUnit}
          usedThermometerOptions={context.usedThermometerOptions}
          onSavePayloadChange={context.onSavePayloadChange}
        />
      );
    case "draw":
      return null;
    default: {
      const _exhaustive: never = annotation.type;
      return _exhaustive;
    }
  }
}
