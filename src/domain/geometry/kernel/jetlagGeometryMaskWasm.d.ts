declare module "*\/jetlag_geometry_mask.js" {
  export function build_mask_from_union_input_json(
    inputJson: string,
    gameAreaJson: string,
  ): unknown;
  export function build_end_game_mask_from_disks_json(
    gameAreaJson: string,
    disksJson: string,
  ): unknown;
}
