import type { AnnotationRecord, GameArea, TentaclePoi } from "../../map/annotations";
import type { LatLngTuple } from "../../geometry/geometry";
import { DEFAULT_RADIUS_METERS } from "../../map/distance";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import { tentacleEliminationJsonForAnswer } from "../../geometry/tentacleGeometry";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { tentacleRadiusFromMetadata } from "../tentacleQuestions";

export function tentacleAnswerFromReplyId(replyId: string): string {
  return replyId;
}

export function resolveTentaclePendingQuestion(
  pending: PendingQuestionRecord,
  answerReplyId: string,
  gameArea: GameArea,
): Omit<AnnotationRecord, "id" | "sessionId" | "status"> | null {
  const metadata = pending.placement.metadata;
  const poisJson = metadata.poisJson;
  const centerJson = metadata.centerJson;

  if (typeof poisJson !== "string" || typeof centerJson !== "string") {
    return null;
  }

  const pois = JSON.parse(poisJson) as TentaclePoi[];
  const center = JSON.parse(centerJson) as { lat: number; lng: number };
  const anchor: LatLngTuple = [center.lat, center.lng];
  const geometry = JSON.parse(
    pending.placement.geometryJson,
  ) as AnnotationRecord["geometry"];
  const outOfReach = answerReplyId === "out-of-reach";
  const answerPoi = outOfReach
    ? undefined
    : pois.find((poi) => poi.id === answerReplyId);
  const radiusMeters = tentacleRadiusFromMetadata(metadata, DEFAULT_RADIUS_METERS);
  const eliminationJson = tentacleEliminationJsonForAnswer({
    anchor,
    radiusMeters,
    pois,
    answeredPoiId: answerPoi?.id,
    outOfReach,
    gameArea,
  });

  const resolvedMetadata: AnnotationRecord["metadata"] = {
    ...metadata,
    createdAt: new Date().toISOString(),
    radiusMeters,
    tentacleAnswerRadiusMeters: outOfReach ? undefined : radiusMeters,
    tentacleOutOfReach: outOfReach,
    highlightedPoiId: answerPoi?.id,
    tentacleAnswerPoiName: answerPoi?.name,
    poiIds: pois.map((poi) => poi.id),
    pois,
    color: MAP_ANNOTATION_COLORS.tentacle,
  };

  if (eliminationJson !== undefined) {
    resolvedMetadata.tentacleEliminationJson = eliminationJson;
  }

  return {
    type: "tentacle",
    geometry,
    metadata: resolvedMetadata,
  };
}
