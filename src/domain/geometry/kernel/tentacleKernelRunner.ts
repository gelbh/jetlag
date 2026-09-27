import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { dispatchKernel } from "./dispatchKernel";
import { createLazyWasmImport } from "./lazyWasmImport";
import type { MaskKernelMode } from "./maskKernelMode";
import type { TentacleSite } from "./tentacleTypes";
import type { GameAreaGeometry, LatLngTuple } from "./types";

export type { TentacleSite };

export type TentacleEliminationParams = {
  anchor: LatLngTuple;
  radiusMeters: number;
  sites: readonly TentacleSite[];
  answeredSiteId: string;
  gameArea: GameAreaGeometry;
  voronoiCells: FeatureCollection;
};

const tentacleWasm = createLazyWasmImport(() => import("./tentacleWasm"));

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
    runWasm: async () => {
      const wasm = await tentacleWasm.load();
      return wasm.wasmBuildTentacleEliminationRegion(
        anchor,
        radiusMeters,
        sites,
        answeredSiteId,
        gameArea,
        voronoiCells,
      );
    },
  });
}

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
    runWasm: async () => {
      const wasm = await tentacleWasm.load();
      return wasm.wasmBuildTentaclePoiAnswerEliminationRegion(
        anchor,
        radiusMeters,
        sites,
        answeredSiteId,
        gameArea,
        voronoiCells,
      );
    },
  });
}

/** Public alias; callers may import either name. */
export const runTentacleEliminationRegion = dispatchTentacleEliminationRegion;

/** Public alias; callers may import either name. */
export const runTentaclePoiAnswerEliminationRegion =
  dispatchTentaclePoiAnswerEliminationRegion;
