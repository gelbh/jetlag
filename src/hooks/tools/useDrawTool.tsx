import type { Feature, LineString } from "geojson";
import { useCallback, useRef, useState } from "react";
import { DrawPanel } from "../../components/tools/DrawPanel";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

const MIN_STROKE_POINTS = 2;
/** Skip samples closer than this (degrees ~ few meters). */
const MIN_SAMPLE_DELTA = 0.00004;

export function shouldAppendStrokePoint(
  points: readonly LatLngTuple[],
  next: LatLngTuple,
): boolean {
  const last = points[points.length - 1];
  if (!last) {
    return true;
  }
  const dLat = Math.abs(last[0] - next[0]);
  const dLng = Math.abs(last[1] - next[1]);
  return dLat >= MIN_SAMPLE_DELTA || dLng >= MIN_SAMPLE_DELTA;
}

export function strokePointsToLineString(
  points: readonly LatLngTuple[],
): Feature<LineString> | null {
  if (points.length < MIN_STROKE_POINTS) {
    return null;
  }
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: points.map(([lat, lng]) => [lng, lat]),
    },
  };
}

interface UseDrawToolParams {
  active: boolean;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  finishPlacement: () => void;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
}

export function useDrawTool({
  active,
  createAnnotation,
  finishPlacement,
  ensurePointInGameArea,
}: UseDrawToolParams) {
  const [strokePoints, setStrokePoints] = useState<LatLngTuple[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const strokeRef = useRef<LatLngTuple[]>([]);

  const resetDraft = useCallback(() => {
    strokeRef.current = [];
    setStrokePoints([]);
    setDrawing(false);
  }, []);

  const commitStroke = useCallback(
    async (points: readonly LatLngTuple[]) => {
      const geometry = strokePointsToLineString(points);
      if (!geometry || busy) {
        resetDraft();
        return;
      }
      setBusy(true);
      try {
        await createAnnotation({
          type: "draw",
          geometry,
          metadata: {
            createdAt: new Date().toISOString(),
            color: MAP_ANNOTATION_COLORS.draw,
          },
        });
        resetDraft();
        finishPlacement();
      } finally {
        setBusy(false);
      }
    },
    [busy, createAnnotation, finishPlacement, resetDraft],
  );

  const beginStroke = useCallback(
    (point: LatLngTuple) => {
      if (!active || busy || !ensurePointInGameArea(point)) {
        return;
      }
      strokeRef.current = [point];
      setStrokePoints([point]);
      setDrawing(true);
    },
    [active, busy, ensurePointInGameArea],
  );

  const extendStroke = useCallback(
    (point: LatLngTuple) => {
      if (!drawing || !ensurePointInGameArea(point)) {
        return;
      }
      const current = strokeRef.current;
      if (!shouldAppendStrokePoint(current, point)) {
        return;
      }
      const next = [...current, point];
      strokeRef.current = next;
      setStrokePoints(next);
    },
    [drawing, ensurePointInGameArea],
  );

  const endStroke = useCallback(() => {
    if (!drawing) {
      return;
    }
    setDrawing(false);
    const points = strokeRef.current;
    void commitStroke(points);
  }, [commitStroke, drawing]);

  const panel = (
    <DrawPanel
      pointCount={strokePoints.length}
      drawing={drawing}
      busy={busy}
      onClear={resetDraft}
    />
  );

  return {
    draft: { strokePoints },
    drawing,
    beginStroke,
    extendStroke,
    endStroke,
    resetDraft,
    panel,
  };
}
