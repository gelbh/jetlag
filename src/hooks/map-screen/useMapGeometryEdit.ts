import type { Feature, Polygon as GeoPolygon, LineString, MultiPolygon, Point } from "geojson";
import { useCallback, useMemo, useState } from "react";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { PolygonFeature } from "../../domain/geometry/kernel";
import { tentacleEliminationJsonForAnswer } from "../../domain/geometry/tentacle/tentacleGeometry";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { DEFAULT_RADIUS_METERS } from "../../domain/map/distance";
import { useAnnotationStore, useMapStore } from "../../state/sessionStore";
import { clipZoneToGameArea, ZONE_OUTSIDE_PLAY_AREA_MESSAGE } from "../tools/useZoneTool";

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
  const setSelectedAnnotationId = useAnnotationStore((state) => state.setSelectedAnnotationId);
  const setActiveTool = useMapStore((state) => state.setActiveTool);
  const geometryEditAnnotationId = useAnnotationStore((state) => state.geometryEditAnnotationId);
  const setGeometryEditAnnotationId = useAnnotationStore(
    (state) => state.setGeometryEditAnnotationId,
  );
  const [geometryDraft, setGeometryDraft] = useState<Feature<
    Point | LineString | GeoPolygon | MultiPolygon
  > | null>(null);
  const [thermoEditStep, setThermoEditStep] = useState<"a" | "b">("a");

  const geometryEditAnnotation = useMemo(
    () => annotations.find((annotation) => annotation.id === geometryEditAnnotationId) ?? null,
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
    [annotations, setActiveTool, setGeometryEditAnnotationId, setMapError, setSelectedAnnotationId],
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
        const radiusMeters = meta.radiusMeters ?? DEFAULT_RADIUS_METERS;
        const eliminationJson = await tentacleEliminationJsonForAnswer({
          anchor: [lat, lng],
          radiusMeters,
          pois: meta.pois,
          answeredPoiId: meta.highlightedPoiId,
          outOfReach: Boolean(meta.tentacleOutOfReach),
          gameArea,
        });
        if (!meta.tentacleOutOfReach && meta.highlightedPoiId) {
          meta.tentacleAnswerRadiusMeters = radiusMeters;
          meta.radiusMeters = radiusMeters;
        }
        if (eliminationJson !== undefined) {
          meta.tentacleEliminationJson = eliminationJson;
        } else {
          delete meta.tentacleEliminationJson;
        }
      }
      record = { ...record, metadata: meta };
    }

    if (geometryEditAnnotation.type === "zone") {
      const clipped = clipZoneToGameArea(geometryDraft as PolygonFeature, gameArea);
      if (!clipped) {
        setMapError(ZONE_OUTSIDE_PLAY_AREA_MESSAGE);
        return;
      }
      record = { ...record, geometry: clipped };
    }

    await updateAnnotation(record);
    cancelGeometryEdit();
  }, [
    cancelGeometryEdit,
    gameArea,
    geometryDraft,
    geometryEditAnnotation,
    setMapError,
    updateAnnotation,
  ]);

  const handleGeometryEditClick = useCallback(
    (point: LatLngTuple) => {
      if (!geometryEditAnnotation || !geometryDraft) {
        return false;
      }

      if (geometryEditAnnotation.type !== "zone" && !ensurePointInGameArea(point)) {
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
        const next = thermoEditStep === "a" ? [point[1], point[0]] : line.coordinates[0];
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
        const shape = geometryDraft.geometry as GeoPolygon | MultiPolygon;
        // ponytail: multi-part zones only grow their first part; per-part editing needs a part picker.
        const [first, ...rest] =
          shape.type === "MultiPolygon" ? shape.coordinates : [shape.coordinates];
        const ring = first[0].slice(0, -1);
        ring.push([point[1], point[0]]);
        ring.push(ring[0]);
        setGeometryDraft({
          ...geometryDraft,
          geometry:
            rest.length > 0
              ? { type: "MultiPolygon", coordinates: [[ring], ...rest] }
              : { type: "Polygon", coordinates: [ring] },
        });
        return true;
      }

      return true;
    },
    [ensurePointInGameArea, geometryDraft, geometryEditAnnotation, thermoEditStep],
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
