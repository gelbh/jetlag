import difference from "@turf/difference";
import { featureCollection } from "@turf/helpers";
import { clipMaskToGameArea } from "./clipMask";
import { unionDiskSpecs, unionEliminationParts } from "./unionPolygonFeatures";
import type {
  DiskSpec,
  EliminationUnionInput,
  GameAreaGeometry,
  PolygonFeature,
} from "./types";

export function buildMaskFromUnionInput(
  input: EliminationUnionInput,
  gameArea: GameAreaGeometry,
): PolygonFeature | null {
  try {
    const unioned = unionEliminationParts(input);
    if (!unioned) {
      return null;
    }
    return clipMaskToGameArea(unioned, gameArea);
  } catch {
    return null;
  }
}

export function buildEndGameMaskFromDisks(
  gameArea: GameAreaGeometry,
  disks: readonly DiskSpec[],
): PolygonFeature | null {
  try {
    const playArea: PolygonFeature = {
      type: "Feature",
      properties: {},
      geometry: gameArea,
    };

    const revealedZones = unionDiskSpecs(disks);
    if (!revealedZones) {
      return playArea;
    }

    const eliminated = difference(featureCollection([playArea, revealedZones]));
    if (eliminated === null) {
      // revealedZones fully covers the game area: nothing remains eliminated.
      return null;
    }
    if (
      eliminated.geometry.type === "Polygon" ||
      eliminated.geometry.type === "MultiPolygon"
    ) {
      return eliminated as PolygonFeature;
    }

    return playArea;
  } catch {
    return null;
  }
}
