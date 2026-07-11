import { attachPlayArea } from "./attachPlayArea";
import { EXPANSION_ON, type BundledGamePresetDefinition } from "./shared";
import { DUBLIN_REGION_PACK_ID } from "../dublinRegionPack";

export function dublinPresets(): BundledGamePresetDefinition[] {
  const dublinHierarchy = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-ireland", category: "Country", name: "Ireland" },
    { id: "county-dublin", category: "County", name: "Dublin" },
  ] as const;
  const councilHierarchy = [
    ...dublinHierarchy,
    {
      id: "dublin-local-authorities",
      category: "Local authorities",
      name: "Local authorities",
    },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:dublin-county",
      name: "County Dublin",
      description:
        "Full county play area with four local authorities and 31 LEAs. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "County Dublin, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      hierarchy: dublinHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "dublin",
    }),
    attachPlayArea({
      id: "bundled:dublin-city",
      name: "Dublin City Council",
      description:
        "Dublin City with 11 local electoral areas. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "Dublin City, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      subregionId: "dcc",
      hierarchy: councilHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "dublin",
    }),
    attachPlayArea({
      id: "bundled:dublin-fingal",
      name: "Fingal County Council",
      description:
        "Fingal with seven local electoral areas. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "Fingal, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      subregionId: "fingal",
      hierarchy: councilHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "dublin",
    }),
    attachPlayArea({
      id: "bundled:dublin-south-dublin",
      name: "South Dublin County Council",
      description:
        "South Dublin with seven local electoral areas. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "South Dublin, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      subregionId: "sdcc",
      hierarchy: councilHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "dublin",
    }),
    attachPlayArea({
      id: "bundled:dublin-dlr",
      name: "Dún Laoghaire–Rathdown",
      description:
        "Dún Laoghaire–Rathdown with six local electoral areas. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "Dún Laoghaire–Rathdown, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      subregionId: "dlr",
      hierarchy: councilHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "dublin",
    }),
  ];
}
