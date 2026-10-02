import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Feature, LineString } from "geojson";
import type { GameArea } from "../../map/annotations";
import type { LatLngTuple } from "../gameArea/geometryCore";

export type XwxzRegionInputFixture = {
  sessionCode: string;
  gameArea: GameArea;
  measuringSubject: string;
  measuringLocationCategory: string;
  measuringDistanceMeters: number;
  measuringTargetPoint: LatLngTuple;
  measuringPlaces: LatLngTuple[];
  measuringCoastSegments: Feature<LineString>[];
  measuringSeaLevelNearRegion: unknown;
  usesAllPlacesInArea: boolean;
  zoneCenter: LatLngTuple;
  seekerAnchor: LatLngTuple;
  nearestCoastReference: LatLngTuple;
  storedAnswer: string;
};

let cachedFixture: XwxzRegionInputFixture | null = null;

export function loadXwxzRegionInputFixture(): XwxzRegionInputFixture {
  if (cachedFixture) {
    return cachedFixture;
  }

  const fixturePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../fixtures/nearRegion/xwxz-region-input.json",
  );
  cachedFixture = JSON.parse(readFileSync(fixturePath, "utf8")) as XwxzRegionInputFixture;
  return cachedFixture;
}
