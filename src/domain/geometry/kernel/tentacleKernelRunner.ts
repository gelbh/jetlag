import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { dispatchKernelSync } from "./dispatchKernel";
import type { MaskKernelMode } from "./maskKernelMode";
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

/** Sync tentacle elimination region (mode + KERNEL_WASM_READY; TS-only until Phase E). */
export function runTentacleEliminationRegion(
  params: TentacleEliminationParams,
  mode: MaskKernelMode = "wasm",
): Feature<Polygon | MultiPolygon> | null {
  return dispatchKernelSync({
    mode,
    entrypoint: "tentacleEliminationRegion",
    runTs: () =>
      buildTentacleEliminationRegion(
        params.anchor,
        params.radiusMeters,
        params.sites,
        params.answeredSiteId,
        params.gameArea,
        params.voronoiCells,
      ),
  });
}

/** Sync POI-answer tentacle elimination (mode + KERNEL_WASM_READY). */
export function runTentaclePoiAnswerEliminationRegion(
  params: TentacleEliminationParams,
  mode: MaskKernelMode = "wasm",
): Feature<Polygon | MultiPolygon> | null {
  return dispatchKernelSync({
    mode,
    entrypoint: "tentacleEliminationRegion",
    runTs: () =>
      buildTentaclePoiAnswerEliminationRegion(
        params.anchor,
        params.radiusMeters,
        params.sites,
        params.answeredSiteId,
        params.gameArea,
        params.voronoiCells,
      ),
  });
}
