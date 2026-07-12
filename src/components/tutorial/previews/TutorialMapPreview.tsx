import { useMemo } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import type { LineString, MultiPolygon, Point, Polygon } from "geojson";
import { MapView } from "../../map/MapView";
import { CombinedEliminationLayer } from "../../map/CombinedEliminationLayer";
import type { QuestionTutorialId } from "../../../domain/tutorial/tutorialQuestions";
import type { AnnotationRecord, GameArea } from "../../../domain/map/annotations";
import { tutorialMapFixtureForArea } from "../../../domain/wizard/tutorialMapFixtureForArea";
import { useTutorialMapViewport } from "../../../hooks/tutorial/TutorialMapViewportContext";
import { gameAreaToBoundingBox } from "../../../domain/geometry/gameAreaBounds";

interface TutorialMapPreviewProps {
  toolId: QuestionTutorialId;
  variant: "context" | "closeUp";
}

function pushCoord(coords: [number, number][], lng: number, lat: number) {
  coords.push([lat, lng]);
}

function pushGeometryCoords(
  coords: [number, number][],
  geometry: Point | LineString | Polygon | MultiPolygon,
) {
  switch (geometry.type) {
    case "Point":
      pushCoord(coords, geometry.coordinates[0]!, geometry.coordinates[1]!);
      break;
    case "LineString":
      for (const point of geometry.coordinates) {
        pushCoord(coords, point[0]!, point[1]!);
      }
      break;
    case "Polygon":
      for (const ring of geometry.coordinates) {
        for (const point of ring) {
          pushCoord(coords, point[0]!, point[1]!);
        }
      }
      break;
    case "MultiPolygon":
      for (const polygon of geometry.coordinates) {
        for (const ring of polygon) {
          for (const point of ring) {
            pushCoord(coords, point[0]!, point[1]!);
          }
        }
      }
      break;
    default: {
      const _exhaustive: never = geometry;
      return _exhaustive;
    }
  }
}

function boundsFromAnnotations(
  annotations: AnnotationRecord[],
): LatLngBoundsExpression | null {
  const coords: [number, number][] = [];

  for (const annotation of annotations) {
    pushGeometryCoords(coords, annotation.geometry.geometry);
  }

  if (coords.length === 0) {
    return null;
  }

  const lats = coords.map(([lat]) => lat);
  const lngs = coords.map(([, lng]) => lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

function boundsFromGameArea(gameArea: GameArea): LatLngBoundsExpression {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  return [
    [south, west],
    [north, east],
  ];
}

export function TutorialMapPreview({ toolId, variant }: TutorialMapPreviewProps) {
  const { viewport } = useTutorialMapViewport();
  const fixture = useMemo(
    () => tutorialMapFixtureForArea(toolId, viewport.gameArea),
    [toolId, viewport.gameArea],
  );

  if (toolId === "photo") {
    return null;
  }

  const focusBounds =
    variant === "closeUp"
      ? (boundsFromAnnotations(fixture.annotations) ??
        boundsFromGameArea(fixture.gameArea))
      : boundsFromGameArea(fixture.gameArea);

  const padding: [number, number] =
    variant === "closeUp" ? [36, 36] : [24, 24];

  return (
    <div className="tutorial-map-preview hud-panel h-[min(42dvh,16rem)] w-full shrink-0 overflow-hidden">
      <MapView
        className="h-full w-full"
        mapStyle="standard"
        interactive={false}
        showZoomControl={false}
        focusBounds={focusBounds}
        fitBoundsMode="once"
        fitBoundsPadding={padding}
        mapKey={`tutorial-map-${toolId}-${variant}-${viewport.source}`}
      >
        <CombinedEliminationLayer
          annotations={fixture.annotations}
          gameArea={fixture.gameArea}
        />
      </MapView>
    </div>
  );
}
