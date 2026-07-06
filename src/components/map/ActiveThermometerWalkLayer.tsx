import { Polyline } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import {
  isThermometerWalkActive,
  parseThermometerStartPoint,
} from "../../domain/thermometerWalk";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface ActiveThermometerWalkLayerProps {
  pendingQuestions: readonly PendingQuestionRecord[];
  seekerPosition: LatLngTuple | null;
}

export function ActiveThermometerWalkLayer({
  pendingQuestions,
  seekerPosition,
}: ActiveThermometerWalkLayerProps) {
  const walking = pendingQuestions.find(isThermometerWalkActive);
  if (!walking || !seekerPosition) {
    return null;
  }

  const start = parseThermometerStartPoint(walking.placement);
  if (!start) {
    return null;
  }

  return (
    <Polyline
      positions={[start, seekerPosition]}
      pathOptions={{
        color: MAP_ANNOTATION_COLORS.thermometerAxis,
        weight: 4,
        dashArray: "8 6",
        opacity: 0.9,
      }}
    />
  );
}
