import type { Feature, LineString, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { GameArea } from "../../map/annotations";
import type { LatLngTuple } from "../gameArea/geometry";
import {
  buildCoastlineEliminationRegion,
  buildCoastlineNearRegion,
  buildLocationEliminationRegion,
  buildLocationNearRegion,
  buildMultiPlaceNearRegion,
} from "./geometryMeasuring";
import { buildMeasuringEliminationRegion } from "./eliminationRegions";
import {
  isMeasuringLinearLocation,
  type MeasuringAnswer,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "../../questions/measuringQuestions";
import { buildSeaLevelEliminationRegion } from "./seaLevel";
import type { MeasuringPlace } from "../../geo/types";

export interface MeasuringRegionInput {
  gameArea: GameArea;
  measuringSubject: MeasuringSubject;
  measuringLocationCategory: MeasuringLocationCategory | null;
  measuringDistanceMeters: number | null;
  measuringAnswer: MeasuringAnswer | null;
  measuringTargetPoint: LatLngTuple | null;
  measuringPlaces: MeasuringPlace[];
  measuringCoastSegments: Feature<LineString>[];
  measuringSeaLevelNearRegion: Feature<GeoPolygon | MultiPolygon> | null;
  usesAllPlacesInArea: boolean;
  precomputedNearRegion?: Feature<GeoPolygon | MultiPolygon> | null;
}

export interface MeasuringRegions {
  near: Feature<GeoPolygon | MultiPolygon>;
  elimination: Feature<GeoPolygon | MultiPolygon>;
}

async function buildMeasuringNearRegion(
  input: Omit<MeasuringRegionInput, "measuringAnswer">,
): Promise<Feature<GeoPolygon | MultiPolygon> | null> {
  const {
    gameArea,
    measuringSubject,
    measuringLocationCategory,
    measuringDistanceMeters,
    measuringTargetPoint,
    measuringPlaces,
    measuringCoastSegments,
    measuringSeaLevelNearRegion,
    usesAllPlacesInArea,
  } = input;

  if (measuringDistanceMeters === null) {
    return null;
  }

  if (
    measuringSubject === "coastline" ||
    isMeasuringLinearLocation(
      measuringSubject,
      measuringLocationCategory ?? undefined,
    )
  ) {
    if (measuringCoastSegments.length === 0) {
      return null;
    }

    return buildCoastlineNearRegion(
      measuringCoastSegments,
      measuringDistanceMeters,
      gameArea,
    );
  }

  if (measuringSubject === "sea_level") {
    return measuringSeaLevelNearRegion;
  }

  if (usesAllPlacesInArea) {
    if (measuringPlaces.length === 0) {
      return null;
    }

    return buildMultiPlaceNearRegion(
      measuringPlaces.map((place) => place.point),
      measuringDistanceMeters,
      gameArea,
    );
  }

  if (!measuringTargetPoint) {
    return null;
  }

  return buildLocationNearRegion(
    measuringTargetPoint,
    measuringDistanceMeters,
    gameArea,
  );
}

export async function buildMeasuringRegions(
  input: MeasuringRegionInput,
): Promise<MeasuringRegions | null> {
  const near =
    input.precomputedNearRegion ?? (await buildMeasuringNearRegion(input));
  if (!near || input.measuringDistanceMeters === null || !input.measuringAnswer) {
    return null;
  }

  const {
    gameArea,
    measuringSubject,
    measuringLocationCategory,
    measuringDistanceMeters,
    measuringAnswer,
    measuringTargetPoint,
    measuringCoastSegments,
    usesAllPlacesInArea,
  } = input;

  if (
    measuringSubject === "coastline" ||
    isMeasuringLinearLocation(
      measuringSubject,
      measuringLocationCategory ?? undefined,
    )
  ) {
    const elimination = await buildCoastlineEliminationRegion(
      measuringCoastSegments,
      measuringDistanceMeters,
      gameArea,
      measuringAnswer,
      near,
    );

    return elimination ? { near, elimination } : null;
  }

  if (measuringSubject === "sea_level") {
    const elimination = buildSeaLevelEliminationRegion(
      near,
      gameArea,
      measuringAnswer,
    );

    return elimination ? { near, elimination } : null;
  }

  if (usesAllPlacesInArea) {
    const elimination = buildMeasuringEliminationRegion(
      near,
      gameArea,
      measuringAnswer,
    );

    return elimination ? { near, elimination } : null;
  }

  if (!measuringTargetPoint) {
    return null;
  }

  const elimination = buildLocationEliminationRegion(
    measuringTargetPoint,
    measuringDistanceMeters,
    gameArea,
    measuringAnswer,
  );

  return elimination ? { near, elimination } : null;
}

export async function buildMeasuringBoundaryPreview(
  input: Omit<MeasuringRegionInput, "measuringAnswer">,
): Promise<Feature<GeoPolygon | MultiPolygon> | null> {
  return buildMeasuringNearRegion(input);
}

export async function buildMeasuringEliminationPreview(
  input: MeasuringRegionInput,
): Promise<Feature<GeoPolygon | MultiPolygon> | null> {
  return (await buildMeasuringRegions(input))?.elimination ?? null;
}
