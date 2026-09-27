import { attachPlayArea } from "./attachPlayArea";
import { EXPANSION_OFF, type BundledGamePresetDefinition } from "./shared";
import { LONDON_REGION_PACK_ID } from "../londonRegionPack";

const LONDON_BOROUGHS = [
  { id: "camden", name: "Camden" },
  { id: "city-of-london", name: "City of London" },
  { id: "city-of-westminster", name: "City of Westminster" },
  { id: "greenwich", name: "Greenwich" },
  { id: "hackney", name: "Hackney" },
  { id: "hammersmith-and-fulham", name: "Hammersmith and Fulham" },
  { id: "islington", name: "Islington" },
  { id: "kensington-and-chelsea", name: "Kensington and Chelsea" },
  { id: "lambeth", name: "Lambeth" },
  { id: "lewisham", name: "Lewisham" },
  { id: "southwark", name: "Southwark" },
  { id: "tower-hamlets", name: "Tower Hamlets" },
  { id: "wandsworth", name: "Wandsworth" },
  { id: "barking-and-dagenham", name: "Barking and Dagenham" },
  { id: "barnet", name: "Barnet" },
  { id: "bexley", name: "Bexley" },
  { id: "brent", name: "Brent" },
  { id: "bromley", name: "Bromley" },
  { id: "croydon", name: "Croydon" },
  { id: "ealing", name: "Ealing" },
  { id: "enfield", name: "Enfield" },
  { id: "haringey", name: "Haringey" },
  { id: "harrow", name: "Harrow" },
  { id: "havering", name: "Havering" },
  { id: "hillingdon", name: "Hillingdon" },
  { id: "hounslow", name: "Hounslow" },
  { id: "kingston-upon-thames", name: "Kingston upon Thames" },
  { id: "merton", name: "Merton" },
  { id: "newham", name: "Newham" },
  { id: "redbridge", name: "Redbridge" },
  { id: "richmond-upon-thames", name: "Richmond upon Thames" },
  { id: "sutton", name: "Sutton" },
  { id: "waltham-forest", name: "Waltham Forest" },
] as const;

export function londonPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-uk", category: "Country", name: "United Kingdom" },
    {
      id: "region-england",
      category: "Constituent country",
      name: "England",
    },
    { id: "metro-london", category: "Region", name: "Greater London" },
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
      advancedSettingsPatch: EXPANSION_OFF,
      transitMetroId: "london",
    }),
    ...LONDON_BOROUGHS.map((borough) =>
      attachPlayArea({
        id: `bundled:london-${borough.id}`,
        name: borough.name,
        description: `${borough.name} borough with local area subdivisions.`,
        placeLabel: `${borough.name}, London, United Kingdom`,
        regionPackId: LONDON_REGION_PACK_ID,
        subregionId: borough.id,
        hierarchy: boroughHierarchy,
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
        transitMetroId: "london",
      }),
    ),
  ];
}
