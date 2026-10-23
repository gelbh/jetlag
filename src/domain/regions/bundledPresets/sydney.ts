import { SYDNEY_REGION_PACK_ID } from "../sydneyRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

export function sydneyPresets(): BundledGamePresetDefinition[] {
  return [
    attachPlayArea({
      id: "bundled:sydney",
      name: "Sydney",
      description:
        "Greater Sydney LGAs (Strathfield, City of Sydney, and metro cluster). Boundary data © ABS (ASGS).",
      placeLabel: "Sydney, Australia",
      regionPackId: SYDNEY_REGION_PACK_ID,
      hierarchy: [
        { id: "continent-oceania", category: "Continent", name: "Oceania" },
        { id: "country-au", category: "Country", name: "Australia" },
        { id: "sydney-metro", category: "City", name: "Sydney" },
      ],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
  ];
}
