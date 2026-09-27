export type {
  DiskSpec,
  EliminationUnionInput,
  GameAreaGeometry,
  LatLngTuple,
  PolygonFeature,
} from "./types";
export {
  featureToGameAreaGeometry,
  gameAreaGeometryToFeature,
} from "./featureConvert";
export { clipMaskToGameArea } from "./clipMask";
export {
  unionDiskSpecs,
  unionEliminationParts,
  unionPolygonFeatures,
} from "./unionPolygonFeatures";
export { isPointInGameArea } from "./isPointInGameArea";
export type { SpatialVoronoiSite } from "./spatialVoronoi";
export {
  resolveVoronoiCellPoiId,
  resolveVoronoiCellSiteId,
  voronoiCellSiteId,
  type VoronoiSiteRef,
} from "./voronoiCellSiteId";
export type { TentacleSite } from "./tentacleRegions";
export {
  dispatchSpatialVoronoi,
  runSpatialVoronoi,
} from "./voronoiKernelRunner";
export {
  dispatchTentacleEliminationRegion,
  dispatchTentaclePoiAnswerEliminationRegion,
  runTentacleEliminationRegion,
  runTentaclePoiAnswerEliminationRegion,
  type TentacleEliminationParams,
} from "./tentacleKernelRunner";
export {
  wasmBuildHalfPlanePolygon,
  wasmBuildRadarShadedRegion,
} from "./halfPlaneWasm";
export { wasmGeodesicLineBuffer } from "./geodesicWasm";
export {
  dispatchHalfPlane,
  dispatchRadarShadedRegion,
  runHalfPlane,
  runRadarShadedRegion,
} from "./halfPlaneKernelRunner";
export {
  dispatchGeodesicLineBuffer,
  runGeodesicLineBuffer,
} from "./geodesicKernelRunner";
export {
  dispatchNearRegionBatch,
  runNearRegionBatch,
} from "./nearRegionKernelRunner";
export { wasmBuildNearRegion } from "./nearRegionWasm";
export type { MaskKernelMode } from "./maskKernelMode";
export { KERNEL_WASM_READY, shouldUseWasm } from "./kernelWasmReady";
