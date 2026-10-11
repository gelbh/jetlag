import { useCallback, useState } from "react";
import { ZonePanel } from "../../components/tools/ZonePanel";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import { clipMaskToGameArea, type PolygonFeature } from "../../domain/geometry/kernel";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

export const ZONE_OUTSIDE_PLAY_AREA_MESSAGE = "That zone doesn't overlap the play area.";

/** Trims a zone to the play area; null when nothing overlaps. Unclipped without a play area. */
export function clipZoneToGameArea(
  zone: PolygonFeature,
  gameArea: GameArea | null,
): PolygonFeature | null {
  return gameArea ? clipMaskToGameArea(zone, gameArea) : zone;
}

interface UseZoneToolParams {
  active: boolean;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  finishPlacement: () => void;
  gameArea: GameArea | null;
  setMapError: (message: string | null) => void;
}

export function useZoneTool({
  active,
  createAnnotation,
  finishPlacement,
  gameArea,
  setMapError,
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
    const geometry = clipZoneToGameArea(
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      },
      gameArea,
    );
    if (!geometry) {
      setMapError(ZONE_OUTSIDE_PLAY_AREA_MESSAGE);
      return;
    }

    await createAnnotation({
      type: "zone",
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        label: zoneLabel,
        color: MAP_ANNOTATION_COLORS.zone,
      },
    });

    resetDraft();
    finishPlacement();
  }, [
    createAnnotation,
    finishPlacement,
    gameArea,
    resetDraft,
    setMapError,
    zoneLabel,
    zoneVertices,
  ]);

  const placementCrosshair = active && zoneVertices.length === 0;

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
