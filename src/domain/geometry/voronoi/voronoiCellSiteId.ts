export {
  resolveVoronoiCellPoiId,
  resolveVoronoiCellSiteId,
  voronoiCellSiteId,
  voronoiCellSiteIdByCoordinates,
  type VoronoiSiteRef,
} from "../kernel/voronoiCellSiteId";

/** @deprecated Use voronoiCellSiteIdByCoordinates */
export { voronoiCellSiteIdByCoordinates as voronoiCellPoiIdByCoordinates } from "../kernel/voronoiCellSiteId";
