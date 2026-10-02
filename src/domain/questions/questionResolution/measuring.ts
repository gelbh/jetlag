import type { Feature, Point } from "geojson";
import { parseGeometryJson } from "../../geometry/gameArea/geometryParsing";
import { persistSlimMeasuringGeometry } from "../../geometry/measuring/measuringGeometryBudgets";
import {
  buildMeasuringRegions,
  type MeasuringRegionInput,
} from "../../geometry/measuring/measuringRegions";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { seekerAnchorFromMetadata } from "../hiderTruth/shared";
import { measuringPlacesFromMetadata } from "../measuringPlacesFromMetadata";
import type { MeasuringAnswer } from "../measuringQuestions";

function deferredMeasuringPointGeometry(pending: PendingQuestionRecord): Feature<Point> | null {
  const parsed = parseGeometryJson(pending.placement.geometryJson);
  if (parsed?.geometry.type === "Point") {
    return parsed as Feature<Point>;
  }

  const anchor = seekerAnchorFromMetadata(pending.placement.metadata);
  if (!anchor) {
    return null;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [anchor[1], anchor[0]],
    },
  };
}

export function measuringAnswerFromReplyId(replyId: string): MeasuringAnswer | null {
  if (replyId === "closer" || replyId === "further") {
    return replyId;
  }

  return null;
}

export async function resolveMeasuringPendingQuestion(
  pending: PendingQuestionRecord,
  answer: MeasuringAnswer,
  gameArea: GameArea,
): Promise<Omit<AnnotationRecord, "id" | "sessionId" | "status"> | null> {
  const metadata = pending.placement.metadata;
  const measuringRegionInputJson = metadata.measuringRegionInputJson;

  if (typeof measuringRegionInputJson !== "string") {
    return null;
  }

  const regionInput = JSON.parse(measuringRegionInputJson) as Omit<
    MeasuringRegionInput,
    "measuringAnswer" | "gameArea"
  > & { gameArea?: GameArea };

  const measuringPlaces = measuringPlacesFromMetadata(metadata, regionInput.measuringPlaces);

  const regions = await buildMeasuringRegions({
    ...regionInput,
    measuringPlaces,
    measuringAnswer: answer,
    // Session play area wins; legacy embedded gameArea is ignored for size/safety.
    gameArea,
  });

  if (!regions) {
    return null;
  }

  const slimmedElim = persistSlimMeasuringGeometry(regions.elimination);
  if (slimmedElim.ok) {
    return {
      type: "measuring",
      geometry: slimmedElim.feature,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        measuringAnswer: answer,
        measuringRegionInputJson,
        color: MAP_ANNOTATION_COLORS.elimination,
      },
    };
  }

  // Persist ceiling (LMTS rail/airport closer): keep a Point + region JSON so
  // the map can rebuild shade instead of cancelling the answered question.
  const deferredPoint = deferredMeasuringPointGeometry(pending);
  if (!deferredPoint) {
    return null;
  }

  return {
    type: "measuring",
    geometry: deferredPoint,
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      measuringAnswer: answer,
      measuringRegionInputJson,
      color: MAP_ANNOTATION_COLORS.elimination,
    },
  };
}
