import type { RegionPackId } from "../../regions/regionPack";

const EMPTY: ReadonlySet<string> = new Set();

const PACK_CATEGORY_DENYLIST: Record<RegionPackId, readonly string[]> = {
  dublin: ["high_speed_rail_line"],
  nyc: ["high_speed_rail_line"],
  london: ["high_speed_rail_line"],
  tokyo: [],
  osaka: [],
  zurich: ["high_speed_rail_line"],
  lucerne: ["high_speed_rail_line"],
  switzerland: [],
  "portland-maine": ["high_speed_rail_line", "international_border"],
  "prince-rupert": ["high_speed_rail_line", "international_border"],
  southampton: ["high_speed_rail_line"],
  australia: ["high_speed_rail_line"],
  sydney: ["high_speed_rail_line"],
};

export function packCategoryDenylist(regionPackId: RegionPackId): ReadonlySet<string> {
  const ids = PACK_CATEGORY_DENYLIST[regionPackId];
  if (ids.length === 0) {
    return EMPTY;
  }
  return new Set(ids);
}
