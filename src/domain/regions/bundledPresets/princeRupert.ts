import { attachPlayArea } from "./attachPlayArea";
import { EXPANSION_ON, type BundledGamePresetDefinition } from "./shared";
import { PRINCE_RUPERT_REGION_PACK_ID } from "../princeRupertRegionPack";

export function princeRupertPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-north-america", category: "Continent", name: "North America" },
    { id: "country-canada", category: "Country", name: "Canada" },
    { id: "province-bc", category: "Province", name: "British Columbia" },
    { id: "metro-prince-rupert", category: "City", name: "Prince Rupert" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:prince-rupert",
      name: "Prince Rupert",
      description:
        "City of Prince Rupert on Kaien Island with neighbourhood and area boundaries. Municipal boundary © BC Geographic Data Warehouse; neighbourhoods © OpenStreetMap contributors (ODbL) and curated place seeds.",
      placeLabel: "Prince Rupert, BC, Canada",
      regionPackId: PRINCE_RUPERT_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "prince-rupert",
    }),
  ];
}
