import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import {
  loadKernelWasm,
  parseWasmFeature,
  resetKernelWasmForTests,
} from "./kernelWasmPkg";
import type { GameAreaGeometry, LatLngTuple, PolygonFeature } from "./types";
import type { TentacleSite } from "./tentacleRegions";

/** Reset lazy WASM module (tests). */
export const resetTentacleWasmForTests = resetKernelWasmForTests;

export async function wasmBuildTentacleEliminationRegion(
  anchor: LatLngTuple,
  radiusMeters: number,
  sites: readonly TentacleSite[],
  answeredSiteId: string,
  gameArea: GameAreaGeometry,
  voronoiCells: FeatureCollection,
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const wasm = await loadKernelWasm();
  const result = wasm.build_tentacle_elimination_region_json(
    JSON.stringify(anchor),
    radiusMeters,
    JSON.stringify(sites),
    answeredSiteId,
    JSON.stringify(gameArea),
    JSON.stringify(voronoiCells),
  );
  return parseWasmFeature(result) as Feature<Polygon | MultiPolygon> | null;
}

export async function wasmBuildTentaclePoiAnswerEliminationRegion(
  anchor: LatLngTuple,
  radiusMeters: number,
  sites: readonly TentacleSite[],
  answeredSiteId: string,
  gameArea: GameAreaGeometry,
  voronoiCells: FeatureCollection,
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const wasm = await loadKernelWasm();
  const result = wasm.build_tentacle_poi_answer_elimination_region_json(
    JSON.stringify(anchor),
    radiusMeters,
    JSON.stringify(sites),
    answeredSiteId,
    JSON.stringify(gameArea),
    JSON.stringify(voronoiCells),
  );
  return parseWasmFeature(result) as Feature<Polygon | MultiPolygon> | null;
}

export type { PolygonFeature };
