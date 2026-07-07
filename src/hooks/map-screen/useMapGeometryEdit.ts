import { useCallback, useMemo, useState } from "react";
import type {
  Feature,
  LineString,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { tentacleEliminationJsonForAnswer } from "../../domain/geometry/tentacleGeometry";
import {
  TENTACLE_ANSWER_RADIUS_METERS,
  TENTACLE_SEARCH_RADIUS_METERS,
} from "../../domain/questions/tentacleQuestions";
import { useAnnotationStore, useMapStore } from "../../state/sessionStore";

interface UseMapGeometryEditParams {
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
  setMapError: (message: string | null) => void;
  updateAnnotation: (annotation: AnnotationRecord) => Promise<void>;
}

export function useMapGeometryEdit({
  annotations,
  gameArea,
  ensurePointInGameArea,
  setMapError,
  updateAnnotation,
}: UseMapGeometryEditParams) {
  const setSelectedAnnotationId = useAnnotationStore(
    (state) => state.setSelectedAnnotationId,
  );
  const setActiveTool = useMapStore((state) => state.setActiveTool);
  const geometryEditAnnotationId = useAnnotationStore(
    (state) => state.geometryEditAnnotationId,
  );
  const setGeometryEditAnnotationId = useAnnotationStore(
    (state) => state.setGeometryEditAnnotationId,
  );
  const [geometryDraft, setGeometryDraft] = useState<Feature<
    Point | LineString | GeoPolygon | MultiPolygon
  > | null>(null);
  const [thermoEditStep, setThermoEditStep] = useState<"a" | "b">("a");

  const geometryEditAnnotation = useMemo(
    () =>
      annotations.find(
        (annotation) => annotation.id === geometryEditAnnotationId,
      ) ?? null,
    [annotations, geometryEditAnnotationId],
  );

  const startGeometryEdit = useCallback(
    (annotationId: string) => {
      const annotation = annotations.find((item) => item.id === annotationId);
      if (!annotation) {
        return;
      }

      setSelectedAnnotationId(null);
      setActiveTool("none");
      setGeometryEditAnnotationId(annotationId);
      setGeometryDraft(annotation.geometry);
      setThermoEditStep("a");
      setMapError(null);
    },
    [
      annotations,
      setActiveTool,
      setGeometryEditAnnotationId,
      setMapError,
      setSelectedAnnotationId,
    ],
  );

  const cancelGeometryEdit = useCallback(() => {
    setGeometryEditAnnotationId(null);
    setGeometryDraft(null);
    setThermoEditStep("a");
  }, [setGeometryEditAnnotationId]);

  const saveGeometryEdit = useCallback(async () => {
    if (!geometryEditAnnotation || !geometryDraft) {
      return;
    }

    let record: AnnotationRecord = {
      ...geometryEditAnnotation,
      geometry: geometryDraft,
    };

    if (geometryEditAnnotation.type === "tentacle") {
      const meta = { ...record.metadata };
      if (geometryDraft.geometry.type === "Point") {
        const [lng, lat] = geometryDraft.geometry.coordinates;
        const eliminationJson = tentacleEliminationJsonForAnswer({
          anchor: [lat, lng],
          radiusMeters:
            meta.tentacleAnswerRadiusMeters ?? TENTACLE_ANSWER_RADIUS_METERS,
          pois: meta.pois,
          answeredPoiId: meta.highlightedPoiId,
          outOfReach: Boolean(meta.tentacleOutOfReach),
          gameArea,
        });
        if (!meta.tentacleOutOfReach && meta.highlightedPoiId) {
          meta.tentacleAnswerRadiusMeters =
            meta.tentacleAnswerRadiusMeters ?? TENTACLE_ANSWER_RADIUS_METERS;
          meta.radiusMeters =
            meta.radiusMeters ?? TENTACLE_SEARCH_RADIUS_METERS;
        }
        if (eliminationJson !== undefined) {
          meta.tentacleEliminationJson = eliminationJson;
        } else {
          delete meta.tentacleEliminationJson;
        }
      }
      record = { ...record, metadata: meta };
    }

    await updateAnnotation(record);
    cancelGeometryEdit();
  }, [
    cancelGeometryEdit,
    gameArea,
    geometryDraft,
    geometryEditAnnotation,
    updateAnnotation,
  ]);

  const handleGeometryEditClick = useCallback(
    (point: LatLngTuple) => {
      if (!geometryEditAnnotation || !geometryDraft) {
        return false;
      }

      if (!ensurePointInGameArea(point)) {
        return true;
      }

      if (
        geometryEditAnnotation.type === "radar" ||
        geometryEditAnnotation.type === "tentacle" ||
        geometryEditAnnotation.type === "pin"
      ) {
        setGeometryDraft({
          ...geometryDraft,
          geometry: {
            type: "Point",
            coordinates: [point[1], point[0]],
          },
        });
        return true;
      }

      if (geometryEditAnnotation.type === "thermometer") {
        const line = geometryDraft.geometry as LineString;
        const next =
          thermoEditStep === "a" ? [point[1], point[0]] : line.coordinates[0];
        const end =
          thermoEditStep === "b"
            ? [point[1], point[0]]
            : line.coordinates[line.coordinates.length - 1];
        setGeometryDraft({
          ...geometryDraft,
          geometry: {
            type: "LineString",
            coordinates: [next, end],
          },
        });
        setThermoEditStep(thermoEditStep === "a" ? "b" : "a");
        return true;
      }

      if (geometryEditAnnotation.type === "zone") {
        const polygon = geometryDraft.geometry as GeoPolygon;
        const ring = polygon.coordinates[0]
          .slice(0, -1)
          .map(([lng, lat]) => [lng, lat] as [number, number]);
        ring.push([point[1], point[0]]);
        ring.push(ring[0]);
        setGeometryDraft({
          ...geometryDraft,
          geometry: {
            type: "Polygon",
            coordinates: [ring],
          },
        });
        return true;
      }

      return true;
    },
    [
      ensurePointInGameArea,
      geometryDraft,
      geometryEditAnnotation,
      thermoEditStep,
    ],
  );

  return {
    geometryEditAnnotation,
    geometryDraft,
    startGeometryEdit,
    cancelGeometryEdit,
    saveGeometryEdit,
    handleGeometryEditClick,
  };
}
