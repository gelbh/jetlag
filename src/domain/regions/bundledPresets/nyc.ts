import { attachPlayArea } from "./attachPlayArea";
import { EXPANSION_ON, type BundledGamePresetDefinition } from "./shared";
import { NYC_REGION_PACK_ID } from "../nycRegionPack";

const NYC_BOROUGHS = [
  { id: "manhattan", name: "Manhattan" },
  { id: "bronx", name: "Bronx" },
  { id: "brooklyn", name: "Brooklyn" },
  { id: "queens", name: "Queens" },
  { id: "staten-island", name: "Staten Island" },
] as const;


export function nycPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-north-america", category: "Continent", name: "North America" },
    { id: "country-usa", category: "Country", name: "United States" },
    { id: "state-ny", category: "State", name: "New York" },
    { id: "metro-nyc", category: "Metro", name: "New York City" },
  ] as const;
  const boroughHierarchy = [
    ...baseHierarchy,
    { id: "nyc-boroughs", category: "Boroughs", name: "Boroughs" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:nyc",
      name: "New York City",
      description:
        "Five boroughs and 71 community districts. Boundary data © NYC Open Data and NYC Planning.",
      placeLabel: "New York City, USA",
      regionPackId: NYC_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "imperial",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "nyc",
    }),
    ...NYC_BOROUGHS.map(
      (borough) => attachPlayArea({
        id: `bundled:nyc-${borough.id}`,
        name: borough.name,
        description: `${borough.name} borough with community districts. Boundary data © NYC Open Data and NYC Planning.`,
        placeLabel: `${borough.name}, New York City, USA`,
        regionPackId: NYC_REGION_PACK_ID,
        subregionId: borough.id,
        hierarchy: boroughHierarchy,
        distanceUnit: "imperial",
        advancedSettingsPatch: EXPANSION_ON,
        transitMetroId: "nyc",
       }),
    ),
  ];
}
