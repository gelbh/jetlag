import type { Feature, LineString, MultiPolygon, Point, Polygon } from "geojson";
import { closerFurtherAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import type { MeasuringPlace } from "@/domain/geo/types";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  type MeasuringLocationCategory,
  type MeasuringSubject,
  measuringQuestionFor,
} from "@/domain/questions";
import type { ToolPendingInput } from "../matching/matchingPendingInput";
import { buildStoredMeasuringRegionInput } from "./helpers";

export function buildMeasuringPendingInput(input: {
  seekerPoint: LatLngTuple;
  subject: MeasuringSubject;
  locationCategory: MeasuringLocationCategory;
  distanceMeters: number;
  targetPoint: LatLngTuple | null;
  targetName: string | null;
  places: MeasuringPlace[];
  coastSegments: Feature<LineString>[];
  seaLevelNearRegion: Feature<Polygon | MultiPolygon> | null;
  anchorElevationMeters: number | null;
  usesAllPlacesInArea: boolean;
  cardDraw: number | undefined;
  cardKeep: number | undefined;
}): ToolPendingInput {
  const { seekerPoint, subject, locationCategory, targetPoint, places, usesAllPlacesInArea } =
    input;
  const question = measuringQuestionFor(
    subject,
    subject === "location" ? locationCategory : undefined,
  );
  const regionInputWithoutAnswer = buildStoredMeasuringRegionInput({
    measuringSubject: subject,
    measuringLocationCategory: locationCategory,
    measuringDistanceMeters: input.distanceMeters,
    measuringTargetPoint: targetPoint,
    measuringPlaces: places,
    measuringCoastSegments: input.coastSegments,
    measuringSeaLevelNearRegion: input.seaLevelNearRegion,
    usesAllPlacesInArea,
  });

  const geometry: Feature<Point> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [seekerPoint[1], seekerPoint[0]],
    },
  };

  const metadata: Record<string, unknown> = {
    measuringSubject: subject,
    measuringLocationCategory: subject === "location" ? locationCategory : undefined,
    measuringDistanceMeters: input.distanceMeters,
    measuringAnchor: {
      lat: seekerPoint[0],
      lng: seekerPoint[1],
    },
    measuringAnchorAltitudeMeters:
      subject === "sea_level" ? (input.anchorElevationMeters ?? undefined) : undefined,
    measuringCoastPoint:
      subject === "sea_level"
        ? {
            lat: seekerPoint[0],
            lng: seekerPoint[1],
          }
        : targetPoint
          ? {
              lat: targetPoint[0],
              lng: targetPoint[1],
            }
          : undefined,
    measuringTargetName: subject === "sea_level" ? "Sea level" : (input.targetName ?? undefined),
    measuringRegionInputJson: JSON.stringify(regionInputWithoutAnswer),
  };

  if (usesAllPlacesInArea) {
    metadata.measuringPlacesJson = JSON.stringify(
      places.map((place) => ({
        id: place.id,
        name: place.name,
        lat: place.point[0],
        lng: place.point[1],
      })),
    );
  }

  return {
    promptText: question.prompt,
    replyOptions: closerFurtherAnswerOptions.map((option) => ({
      id: option.value,
      label: option.label,
    })),
    placement: {
      geometryJson: JSON.stringify(geometry),
      metadata,
    },
    cardDraw: input.cardDraw,
    cardKeep: input.cardKeep,
  };
}
