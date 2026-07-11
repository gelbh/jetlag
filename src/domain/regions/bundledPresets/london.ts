import { attachPlayArea } from "./attachPlayArea";
import { EXPANSION_ON, titleCase, type BundledGamePresetDefinition } from "./shared";
import { LONDON_REGION_PACK_ID } from "../londonRegionPack";

const LONDON_BOROUGH_IDS = [
  "camden",
  "city-of-london",
  "city-of-westminster",
  "greenwich",
  "hackney",
  "hammersmith-and-fulham",
  "islington",
  "kensington-and-chelsea",
  "lambeth",
  "lewisham",
  "southwark",
  "tower-hamlets",
  "wandsworth",
  "barking-and-dagenham",
  "barnet",
  "bexley",
  "brent",
  "bromley",
  "croydon",
  "ealing",
  "enfield",
  "haringey",
  "harrow",
  "havering",
  "hillingdon",
  "hounslow",
  "kingston-upon-thames",
  "merton",
  "newham",
  "redbridge",
  "richmond-upon-thames",
  "sutton",
  "waltham-forest",
] as const;


export function londonPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-uk", category: "Country", name: "United Kingdom" },
    { id: "region-england", category: "Country", name: "England" },
    { id: "metro-london", category: "Metro", name: "London" },
  ] as const;
  const boroughHierarchy = [
    ...baseHierarchy,
    { id: "london-boroughs", category: "Boroughs", name: "Boroughs" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:london",
      name: "Greater London",
      description:
        "33 boroughs with local area subdivisions. Boundary data from compound-cities admin sources.",
      placeLabel: "London, United Kingdom",
      regionPackId: LONDON_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "london",
    }),
    ...LONDON_BOROUGH_IDS.map(
      (boroughId) => attachPlayArea({
        id: `bundled:london-${boroughId}`,
        name: titleCase(boroughId),
        description: `${titleCase(boroughId)} borough with local area subdivisions.`,
        placeLabel: `${titleCase(boroughId)}, London, United Kingdom`,
        regionPackId: LONDON_REGION_PACK_ID,
        subregionId: boroughId,
        hierarchy: boroughHierarchy,
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_ON,
        transitMetroId: "london",
       }),
    ),
  ];
}
