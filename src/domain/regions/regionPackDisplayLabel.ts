import type { RegionPackId } from "./regionPack";

const REGION_PACK_DISPLAY_LABELS: Record<RegionPackId, string> = {
  dublin: "Dublin",
  nyc: "New York City",
  london: "London",
  tokyo: "Tokyo",
  osaka: "Osaka",
  zurich: "Zurich",
  lucerne: "Lucerne",
  switzerland: "Switzerland",
  "portland-maine": "Portland, Maine",
  "prince-rupert": "Prince Rupert",
  southampton: "Southampton",
  australia: "Australia",
  sydney: "Sydney",
  brussels: "Brussels",
  brisbane: "Brisbane",
  berlin: "Berlin",
  singapore: "Singapore",
  utrecht: "Utrecht",
};

export function regionPackDisplayLabel(packId: RegionPackId): string {
  return REGION_PACK_DISPLAY_LABELS[packId];
}
