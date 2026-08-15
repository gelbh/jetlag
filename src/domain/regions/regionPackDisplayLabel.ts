import type { RegionPackId } from "./regionPack";

const REGION_PACK_DISPLAY_LABELS: Record<RegionPackId, string> = {
  dublin: "Dublin",
  nyc: "New York City",
  london: "London",
  tokyo: "Tokyo",
  osaka: "Osaka",
  zurich: "Zurich",
  lucerne: "Lucerne",
  "portland-maine": "Portland, Maine",
  "prince-rupert": "Prince Rupert",
};

export function regionPackDisplayLabel(packId: RegionPackId): string {
  return REGION_PACK_DISPLAY_LABELS[packId];
}
