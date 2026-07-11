import { attachPlayArea } from "./attachPlayArea";
import { EXPANSION_ON, type BundledGamePresetDefinition } from "./shared";
import { LUCERNE_REGION_PACK_ID } from "../lucerneRegionPack";
import { ZURICH_REGION_PACK_ID } from "../zurichRegionPack";

export function swissPresets(): BundledGamePresetDefinition[] {
  const europe = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-switzerland", category: "Country", name: "Switzerland" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:zurich-canton",
      name: "Canton of Zürich",
      description:
        "13 districts and city quarters. Boundary data © GADM (verify licensing for your use).",
      placeLabel: "Canton of Zürich, Switzerland",
      regionPackId: ZURICH_REGION_PACK_ID,
      hierarchy: [
        ...europe,
        { id: "canton-zurich", category: "Canton", name: "Zürich" },
      ],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
    }),
    attachPlayArea({
      id: "bundled:zurich-city",
      name: "Zürich City",
      description:
        "City of Zürich with quarter subdivisions. Boundary data © GADM.",
      placeLabel: "Zürich, Switzerland",
      regionPackId: ZURICH_REGION_PACK_ID,
      subregionId: "z-rich",
      hierarchy: [
        ...europe,
        { id: "canton-zurich", category: "Canton", name: "Zürich" },
        { id: "zurich-city", category: "City", name: "Zürich city" },
      ],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
    }),
    attachPlayArea({
      id: "bundled:lucerne-metro",
      name: "Lucerne Metro",
      description:
        "Lucerne district municipalities. Boundary data © GADM.",
      placeLabel: "Lucerne, Switzerland",
      regionPackId: LUCERNE_REGION_PACK_ID,
      hierarchy: [
        ...europe,
        { id: "canton-lucerne", category: "Canton", name: "Lucerne" },
        { id: "lucerne-metro", category: "Metro", name: "Lucerne" },
      ],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
    }),
  ];
}
