import { useCallback, useState } from "react";
import type { Feature, Polygon as GeoPolygon } from "geojson";
import { ZonePanel } from "../../components/tools/ZonePanel";
import type { LatLngTuple } from "../../domain/geometry";
import type { AnnotationRecord } from "../../domain/annotations";

interface UseZoneToolParams {
  active: boolean;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  finishPlacement: () => void;
}

export function useZoneTool({
  active,
  createAnnotation,
  finishPlacement,
}: UseZoneToolParams) {
  const [zoneVertices, setZoneVertices] = useState<LatLngTuple[]>([]);
  const [zoneLabel, setZoneLabel] = useState("");

  const resetDraft = useCallback(() => {
    setZoneVertices([]);
    setZoneLabel("");
  }, []);

  const handleMapClick = useCallback((point: LatLngTuple) => {
    setZoneVertices((vertices) => [...vertices, point]);
  }, []);

  const closeZone = useCallback(async () => {
    if (zoneVertices.length < 3) {
      return;
    }

    const ring = zoneVertices.map(([lat, lng]) => [lng, lat]);
    ring.push(ring[0]);
    const geometry: Feature<GeoPolygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    };

    await createAnnotation({
      type: "zone",
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        label: zoneLabel,
        color: "#a855f7",
      },
    });

    resetDraft();
    finishPlacement();
  }, [createAnnotation, finishPlacement, resetDraft, zoneLabel, zoneVertices]);

  const placementCrosshair = active;

  const panel = (
    <ZonePanel
      vertexCount={zoneVertices.length}
      label={zoneLabel}
      onLabelChange={setZoneLabel}
      onClosePolygon={() => void closeZone()}
      onReset={() => setZoneVertices([])}
    />
  );

  return {
    draft: { zoneVertices },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    panel,
  };
}
