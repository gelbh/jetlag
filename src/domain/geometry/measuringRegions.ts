import type { Feature, LineString, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { GameArea } from "../map/annotations";
import type { LatLngTuple } from "./geometry";
import {
  buildCoastlineEliminationRegion,
  buildCoastlineNearRegion,
  buildCoastlineNearRegionTs,
  buildLocationEliminationRegion,
  buildLocationNearRegion,
  buildMultiPlaceEliminationRegion,
  buildMultiPlaceNearRegion,
} from "./geometryMeasuring";
import { buildMeasuringEliminationRegion } from "./measuring/eliminationRegions";
import {
  isMeasuringLinearLocation,
  type MeasuringAnswer,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "../questions/measuringQuestions";
import { buildSeaLevelEliminationRegion } from "./seaLevel";
import type { MeasuringPlace } from "../geo/types";

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
    measuringPlaces,
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
    const elimination = buildMultiPlaceEliminationRegion(
      measuringPlaces.map((place) => place.point),
      measuringDistanceMeters,
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

/** Sync TS coastline path for pending-question overlays / tests. */
function buildMeasuringNearRegionTs(
  input: Omit<MeasuringRegionInput, "measuringAnswer">,
): Feature<GeoPolygon | MultiPolygon> | null {
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

    return buildCoastlineNearRegionTs(
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

export function buildMeasuringBoundaryPreviewTs(
  input: Omit<MeasuringRegionInput, "measuringAnswer">,
): Feature<GeoPolygon | MultiPolygon> | null {
  return buildMeasuringNearRegionTs(input);
}

export function buildMeasuringEliminationPreviewTs(
  input: MeasuringRegionInput,
): Feature<GeoPolygon | MultiPolygon> | null {
  const near = input.precomputedNearRegion ?? buildMeasuringNearRegionTs(input);
  if (!near || input.measuringDistanceMeters === null || !input.measuringAnswer) {
    return null;
  }

  if (
    input.measuringSubject === "coastline" ||
    isMeasuringLinearLocation(
      input.measuringSubject,
      input.measuringLocationCategory ?? undefined,
    )
  ) {
    return buildMeasuringEliminationRegion(
      near,
      input.gameArea,
      input.measuringAnswer,
    );
  }

  if (input.measuringSubject === "sea_level") {
    return buildSeaLevelEliminationRegion(
      near,
      input.gameArea,
      input.measuringAnswer,
    );
  }

  if (input.usesAllPlacesInArea) {
    return buildMultiPlaceEliminationRegion(
      input.measuringPlaces.map((place) => place.point),
      input.measuringDistanceMeters,
      input.gameArea,
      input.measuringAnswer,
    );
  }

  if (!input.measuringTargetPoint) {
    return null;
  }

  return buildLocationEliminationRegion(
    input.measuringTargetPoint,
    input.measuringDistanceMeters,
    input.gameArea,
    input.measuringAnswer,
  );
}
