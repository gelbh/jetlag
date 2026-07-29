declare module "*/jetlag_geometry_kernel.js" {
  export function build_mask_from_union_input_json(
    inputJson: string,
    gameAreaJson: string,
  ): unknown;
  export function build_end_game_mask_from_disks_json(
    gameAreaJson: string,
    disksJson: string,
  ): unknown;
  export function build_half_plane_polygon_json(
    pointAJson: string,
    pointBJson: string,
    gameAreaJson: string,
    shadedSide: string,
    divisionAnchor: string,
  ): unknown;
  export function build_radar_shaded_region_json(
    centerJson: string,
    radiusMeters: number,
    gameAreaJson: string,
    shadedInside: boolean,
  ): unknown;
  export function   geodesic_line_buffer_json(
    coordinatesJson: string,
    distanceMeters: number,
    sampleSpacingMeters?: number | null,
  ): unknown;
  export function build_tentacle_elimination_region_json(
    anchorJson: string,
    radiusMeters: number,
    sitesJson: string,
    answeredSiteId: string,
    gameAreaJson: string,
    voronoiCellsJson: string,
  ): unknown;
  export function build_tentacle_poi_answer_elimination_region_json(
    anchorJson: string,
    radiusMeters: number,
    sitesJson: string,
    answeredSiteId: string,
    gameAreaJson: string,
    voronoiCellsJson: string,
  ): unknown;
}
