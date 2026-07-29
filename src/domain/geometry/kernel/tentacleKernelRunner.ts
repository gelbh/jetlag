import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import type { MaskKernelMode } from "./maskKernelMode";
import { bboxFromGameArea, maskTopologyMatches } from "./maskTopology";
import {
  buildTentacleEliminationRegion,
  buildTentaclePoiAnswerEliminationRegion,
  type TentacleSite,
} from "./tentacleRegions";
import type { GameAreaGeometry, LatLngTuple } from "./types";

export type TentacleEliminationParams = {
  anchor: LatLngTuple;
  radiusMeters: number;
  sites: readonly TentacleSite[];
  answeredSiteId: string;
  gameArea: GameAreaGeometry;
  voronoiCells: FeatureCollection;
};

type TentacleWasmApi = typeof import("./tentacleWasm");

let tentacleWasmModulePromise: Promise<TentacleWasmApi> | null = null;

function loadTentacleWasmModule(): Promise<TentacleWasmApi> {
  if (!tentacleWasmModulePromise) {
    tentacleWasmModulePromise = import("./tentacleWasm").catch((error) => {
      tentacleWasmModulePromise = null;
      throw error;
    });
  }
  return tentacleWasmModulePromise;
}

function tentacleTopologyMatches(
  wasm: Feature<Polygon | MultiPolygon> | null,
  ts: Feature<Polygon | MultiPolygon> | null,
  gameArea: GameAreaGeometry,
): boolean {
  return maskTopologyMatches(wasm, ts, bboxFromGameArea(gameArea));
}

/** Production tentacle elimination entrypoint (mode + KERNEL_WASM_READY). */
export async function runTentacleEliminationRegion(
  params: TentacleEliminationParams,
  mode: MaskKernelMode = "wasm",
): Promise<Feature<Polygon | MultiPolygon> | null> {
  return dispatchTentacleEliminationRegion(params, mode);
}

/** Production POI-answer tentacle elimination (mode + KERNEL_WASM_READY). */
export async function runTentaclePoiAnswerEliminationRegion(
  params: TentacleEliminationParams,
  mode: MaskKernelMode = "wasm",
): Promise<Feature<Polygon | MultiPolygon> | null> {
  return dispatchTentaclePoiAnswerEliminationRegion(params, mode);
}

/** Mode + KERNEL_WASM_READY dispatch for tentacle elimination. */
export async function dispatchTentacleEliminationRegion(
  params: TentacleEliminationParams,
  mode: MaskKernelMode = "wasm",
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const { anchor, radiusMeters, sites, answeredSiteId, gameArea, voronoiCells } =
    params;
  return dispatchKernel({
    mode,
    entrypoint: "tentacleEliminationRegion",
    label: "buildTentacleEliminationRegion",
    runTs: () =>
      buildTentacleEliminationRegion(
        anchor,
        radiusMeters,
        sites,
        answeredSiteId,
        gameArea,
        voronoiCells,
      ),
    runWasm: async () => {
      const wasm = await loadTentacleWasmModule();
      return wasm.wasmBuildTentacleEliminationRegion(
        anchor,
        radiusMeters,
        sites,
        answeredSiteId,
        gameArea,
        voronoiCells,
      );
    },
    matches: (wasmResult, tsResult) =>
      tentacleTopologyMatches(wasmResult, tsResult, gameArea),
  });
}

/** Mode + KERNEL_WASM_READY dispatch for POI-answer tentacle elimination. */
export async function dispatchTentaclePoiAnswerEliminationRegion(
  params: TentacleEliminationParams,
  mode: MaskKernelMode = "wasm",
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const { anchor, radiusMeters, sites, answeredSiteId, gameArea, voronoiCells } =
    params;
  return dispatchKernel({
    mode,
    entrypoint: "tentacleEliminationRegion",
    label: "buildTentaclePoiAnswerEliminationRegion",
    runTs: () =>
      buildTentaclePoiAnswerEliminationRegion(
        anchor,
        radiusMeters,
        sites,
        answeredSiteId,
        gameArea,
        voronoiCells,
      ),
    runWasm: async () => {
      const wasm = await loadTentacleWasmModule();
      return wasm.wasmBuildTentaclePoiAnswerEliminationRegion(
        anchor,
        radiusMeters,
        sites,
        answeredSiteId,
        gameArea,
        voronoiCells,
      );
    },
    matches: (wasmResult, tsResult) =>
      tentacleTopologyMatches(wasmResult, tsResult, gameArea),
  });
}
