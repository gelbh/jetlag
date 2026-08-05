import type {
  Feature,
  LineString,
  Polygon as GeoPolygon,
  MultiPolygon,
} from "geojson";
import type { GameArea } from "../../domain/map/annotations";
import {
  nearestPointToCoastlines,
  type LatLngTuple,
} from "../../domain/geometry/gameArea/geometry";
import type { SeaLevelEdgeCase } from "../../domain/geometry/measuring/seaLevel";
import {
  isMeasuringLinearLocation,
  measuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "../../domain/questions";
import { loadCoastlineContext } from "../../services/geo/overpass/coastline";
import {
  findNearestMeasuringPlace,
  measuringPlaceNotFoundMessage,
  MEASURING_MAP_SNAP_RADIUS_METERS,
} from "../../services/geo/overpass/measuringPlaces";
import {
  loadMeasuringLinearContext,
  measuringLinearNotFoundMessage,
} from "../../services/geo/overpass/measuringLinearFeatures";
import { loadCustomMeasureGeometryContext } from "../../services/geo/overpass/customMeasureGeometryFeatures";
import { isCustomMeasureGeometryId } from "../../domain/session/catalog/customMeasureGeometry";
import type { SessionCustomMeasureGeometry } from "../../domain/session/catalog/customMeasureGeometry";
import type { CustomMatchingAreasByLevel } from "../../domain/session/catalog/sessionCustomContent";
import type { RegionPackId } from "../../domain/regions/regionPack";
import {
  loadSeaLevelContext,
  type SeaLevelContext,
} from "../../services/geo/elevation/seaLevel";

const SEA_LEVEL_LOWEST_MESSAGE =
  'You\'re at the lowest elevation in this play area. A "closer" answer may be impossible.';

const SEA_LEVEL_HIGHEST_NOTE =
  'You\'re at the highest elevation in this play area. A "further" answer may be impossible.';

export type MeasuringSeaLevelOk = {
  ok: true;
  seekerElevationMeters: number;
  distanceFromSeaLevelMeters: number;
  nearRegion: SeaLevelContext["nearRegion"];
  edgeCase: SeaLevelEdgeCase | null;
  note: string | null;
};

export type MeasuringSeaLevelResult =
  | MeasuringSeaLevelOk
  | { ok: false; message: string };

function toMeasuringSeaLevelResult(
  result: SeaLevelContext,
): MeasuringSeaLevelOk {
  return {
    ok: true,
    seekerElevationMeters: result.seekerElevationMeters,
    distanceFromSeaLevelMeters: result.distanceFromSeaLevelMeters,
    nearRegion: result.nearRegion,
    edgeCase: result.edgeCase,
    note: result.edgeCase === "highest" ? SEA_LEVEL_HIGHEST_NOTE : null,
  };
}

export async function fetchMeasuringSeaLevelContext(
  seekerPoint: LatLngTuple,
  gameArea: GameArea,
  options?: {
    regionPackId?: RegionPackId;
    onEnrich?: (result: MeasuringSeaLevelOk) => void;
  },
): Promise<MeasuringSeaLevelResult> {
  const result = await loadSeaLevelContext(seekerPoint, gameArea, {
    regionPackId: options?.regionPackId,
    onEnrich: options?.onEnrich
      ? (context) => {
          options.onEnrich?.(toMeasuringSeaLevelResult(context));
        }
      : undefined,
  });

  if (!result) {
    return {
      ok: false,
      message:
        "Couldn't read elevation at your anchor. Try a nearby point or retry.",
    };
  }

  if ("reason" in result) {
    return {
      ok: false,
      message:
        result.reason === "lowest"
          ? SEA_LEVEL_LOWEST_MESSAGE
          : "Couldn't build a sea level region for this play area.",
    };
  }

  return toMeasuringSeaLevelResult(result);
}

export type MeasuringSeaLevelEdgeCase = SeaLevelEdgeCase;

export async function fetchMeasuringCoastlineContext(
  seekerPoint: LatLngTuple,
  gameArea: GameArea,
  options?: {
    regionPackId?: RegionPackId;
    onEnrich?: (result: {
      coastPoint: LatLngTuple;
      distanceMeters: number;
    }) => void;
  },
) {
  const result = await loadCoastlineContext(seekerPoint, gameArea, {
    regionPackId: options?.regionPackId,
    onEnrich: options?.onEnrich
      ? (prepared) => {
          const nearest = nearestPointToCoastlines(
            seekerPoint,
            prepared.segments,
            prepared,
          );
          if (!nearest) {
            return;
          }
          options.onEnrich?.({
            coastPoint: nearest.point,
            distanceMeters: nearest.distanceMeters,
          });
        }
      : undefined,
  });

  if (!result) {
    return {
      ok: false as const,
      message:
        "No coastline in this play area under the game definition. Per Jet Lag rules, this is a null answer.",
    };
  }

  return {
    ok: true as const,
    coastPoint: result.coastPoint,
    distanceMeters: result.distanceMeters,
  };
}

export async function fetchMeasuringLinearContext(
  seekerPoint: LatLngTuple,
  gameArea: GameArea,
  subject: MeasuringSubject,
  locationCategory: MeasuringLocationCategory,
  customMeasureGeometries: readonly SessionCustomMeasureGeometry[] = [],
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
) {
  const kind = measuringFromKind(subject, locationCategory);
  if (!isMeasuringLinearLocation(subject, locationCategory)) {
    return {
      ok: false as const,
      message: measuringLinearNotFoundMessage(kind),
    };
  }

  if (isCustomMeasureGeometryId(kind)) {
    const geometry = customMeasureGeometries.find((item) => item.id === kind);
    if (!geometry) {
      return {
        ok: false as const,
        message: "Custom measuring geometry is not configured for this session.",
      };
    }

    const result = await loadCustomMeasureGeometryContext(
      seekerPoint,
      gameArea,
      geometry,
    );
    if (!result) {
      return {
        ok: false as const,
        message: `No ${geometry.label} intersects the play area near your anchor.`,
      };
    }

    return {
      ok: true as const,
      point: result.point,
      distanceMeters: result.distanceMeters,
      segments: result.segments,
    };
  }

  const result = await loadMeasuringLinearContext(
    seekerPoint,
    gameArea,
    kind,
    customMatchingAreas,
    regionPackId,
  );
  if (!result) {
    return {
      ok: false as const,
      message: measuringLinearNotFoundMessage(kind),
    };
  }

  return {
    ok: true as const,
    point: result.point,
    distanceMeters: result.distanceMeters,
    segments: result.segments,
  };
}

export async function fetchMeasuringMapTarget(
  point: LatLngTuple,
  gameArea: GameArea,
  locationCategory: MeasuringLocationCategory,
) {
  const nearest = await findNearestMeasuringPlace(
    point,
    gameArea,
    locationCategory,
    { maxDistanceMeters: MEASURING_MAP_SNAP_RADIUS_METERS },
  );

  if (!nearest) {
    return {
      ok: false as const,
      message: measuringPlaceNotFoundMessage(locationCategory, true),
    };
  }

  return {
    ok: true as const,
    point: nearest.point,
    name: nearest.name,
  };
}

export async function fetchNearestMeasuringPlace(
  seekerPoint: LatLngTuple,
  gameArea: GameArea,
  locationCategory: MeasuringLocationCategory,
) {
  const nearest = await findNearestMeasuringPlace(
    seekerPoint,
    gameArea,
    locationCategory,
  );

  if (!nearest) {
    return {
      ok: false as const,
      message: measuringPlaceNotFoundMessage(locationCategory),
    };
  }

  return {
    ok: true as const,
    point: nearest.point,
    name: nearest.name,
    distanceMeters: nearest.distanceMeters,
  };
}

export type MeasuringCoastSegments = Feature<LineString>[];
export type MeasuringNearRegion = Feature<GeoPolygon | MultiPolygon> | null;
