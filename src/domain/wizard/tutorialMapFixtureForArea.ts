import type { Feature, LineString, Polygon } from "geojson";
import type { AnnotationRecord, AnnotationType, GameArea } from "../map/annotations";
import type { QuestionTutorialId } from "../tutorial/tutorialQuestions";
import { gameAreaToBoundingBox } from "../geometry/gameAreaBounds";
import { milesToMeters } from "../map/distance";

function insetPolygon(gameArea: GameArea, insetRatio: number): Polygon {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latSpan = (north - south) * insetRatio;
  const lngSpan = (east - west) * insetRatio;
  const midLat = (south + north) / 2;
  const midLng = (west + east) / 2;

  return {
    type: "Polygon",
    coordinates: [
      [
        [midLng - lngSpan / 2, midLat - latSpan / 2],
        [midLng + lngSpan / 2, midLat - latSpan / 2],
        [midLng + lngSpan / 2, midLat + latSpan / 2],
        [midLng - lngSpan / 2, midLat + latSpan / 2],
        [midLng - lngSpan / 2, midLat - latSpan / 2],
      ],
    ],
  };
}

function lineAcrossArea(gameArea: GameArea): LineString {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const midLat = (south + north) / 2;
  return {
    type: "LineString",
    coordinates: [
      [west + (east - west) * 0.28, midLat - (north - south) * 0.04],
      [west + (east - west) * 0.72, midLat + (north - south) * 0.04],
    ],
  };
}

function baseAnnotation(
  type: AnnotationType,
  geometry: Feature<Polygon | LineString>["geometry"],
): AnnotationRecord {
  return {
    id: `tutorial-${type}-preview`,
    sessionId: "tutorial",
    type,
    status: "active",
    geometry: {
      type: "Feature",
      properties: {},
      geometry,
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

export function tutorialMapFixtureForArea(
  toolId: QuestionTutorialId,
  gameArea: GameArea,
): {
  gameArea: GameArea;
  annotations: AnnotationRecord[];
} {
  const polygon = insetPolygon(gameArea, 0.55);
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const anchor = { lat: (south + north) / 2, lng: (west + east) / 2 };

  switch (toolId) {
    case "matching":
      return {
        gameArea,
        annotations: [
          {
            ...baseAnnotation("matching", polygon),
            metadata: {
              createdAt: "2026-01-01T00:00:00.000Z",
              matchingCategory: "park",
              matchingAnswer: "yes",
              matchingAnchor: anchor,
            },
          },
        ],
      };
    case "measuring":
      return {
        gameArea,
        annotations: [
          {
            ...baseAnnotation("measuring", polygon),
            metadata: {
              createdAt: "2026-01-01T00:00:00.000Z",
              measuringSubject: "location",
              measuringLocationCategory: "park",
              measuringAnswer: "closer",
              measuringTargetName: "Nearby park",
              measuringAnchor: anchor,
              measuringDistanceMeters: 2400,
            },
          },
        ],
      };
    case "radar":
      return {
        gameArea,
        annotations: [
          {
            id: "tutorial-radar-preview",
            sessionId: "tutorial",
            type: "radar",
            status: "active",
            geometry: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [anchor.lng, anchor.lat],
              },
            },
            metadata: {
              createdAt: "2026-01-01T00:00:00.000Z",
              radiusMeters: milesToMeters(1),
              inside: true,
            },
          },
        ],
      };
    case "tentacle":
      return {
        gameArea,
        annotations: [
          {
            ...baseAnnotation("tentacle", polygon),
            metadata: {
              createdAt: "2026-01-01T00:00:00.000Z",
              tentacleCategoryId: "museum",
              highlightedPoiId: "tutorial-poi-1",
              pois: [
                {
                  id: "tutorial-poi-1",
                  name: "Nearby museum",
                  lat: anchor.lat + 0.02,
                  lng: anchor.lng + 0.02,
                  category: "museum",
                },
              ],
            },
          },
        ],
      };
    case "thermometer":
      return {
        gameArea,
        annotations: [
          {
            ...baseAnnotation("thermometer", lineAcrossArea(gameArea)),
            metadata: {
              createdAt: "2026-01-01T00:00:00.000Z",
              thermometerDistanceMeters: milesToMeters(3),
              thermometerAnswer: "hotter",
              hotterTowards: "b",
            },
          },
        ],
      };
    case "photo":
      return { gameArea, annotations: [] };
    default: {
      const _exhaustive: never = toolId;
      return _exhaustive;
    }
  }
}
