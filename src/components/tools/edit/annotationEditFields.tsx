import type { ReactNode } from "react";
import type { AnnotationRecord, GameArea } from "../../../domain/map/annotations";
import type { DistanceUnit } from "../../../domain/map/distance";
import type {
  RadarDistanceOptionKey,
  ThermometerDistanceOptionMiles,
} from "../../../domain/questions";
import type { GameSize } from "../../../domain/session/gameSize";
import { MatchingEditFields, type MatchingAnnotation } from "./MatchingEditFields";
import { MeasuringEditFields, type MeasuringAnnotation } from "./MeasuringEditFields";
import { PinZoneEditFields, type PinZoneAnnotation } from "./PinZoneEditFields";
import { RadarEditFields, type RadarAnnotation } from "./RadarEditFields";
import { TentacleEditFields, type TentacleAnnotation } from "./TentacleEditFields";
import { ThermometerEditFields, type ThermometerAnnotation } from "./ThermometerEditFields";
import type { EditSavePayload } from "./types";

export interface AnnotationEditFieldsContext {
  gameArea: GameArea;
  distanceUnit: DistanceUnit;
  gameSize: GameSize;
  usedRadarOptions: ReadonlySet<RadarDistanceOptionKey>;
  usedThermometerOptions: ReadonlySet<ThermometerDistanceOptionMiles>;
  onSavePayloadChange: (payload: EditSavePayload) => void;
}

export function annotationEditFields(
  annotation: AnnotationRecord,
  context: AnnotationEditFieldsContext,
): ReactNode {
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
      return (
        <TentacleEditFields
          annotation={annotation as TentacleAnnotation}
          gameArea={context.gameArea}
          distanceUnit={context.distanceUnit}
          onSavePayloadChange={context.onSavePayloadChange}
        />
      );
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
    default: {
      const _exhaustive: never = annotation.type;
      return _exhaustive;
    }
  }
}
