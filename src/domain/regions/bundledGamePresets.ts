import type { DistanceUnit } from "../map/distance";
import type { AdvancedSessionSettingsValue } from "../session/advancedSessionSettings";
import type { GameSize } from "../session/gameSize";
import type { RegionPackId } from "./regionPack";
import { DUBLIN_REGION_PACK_ID } from "./dublinRegionPack";
import { LONDON_REGION_PACK_ID } from "./londonRegionPack";
import { LUCERNE_REGION_PACK_ID } from "./lucerneRegionPack";
import { NYC_REGION_PACK_ID } from "./nycRegionPack";
import { OSAKA_REGION_PACK_ID } from "./osakaRegionPack";
import { PORTLAND_MAINE_REGION_PACK_ID } from "./portlandMaineRegionPack";
import { TOKYO_REGION_PACK_ID } from "./tokyoRegionPack";
import { ZURICH_REGION_PACK_ID } from "./zurichRegionPack";
import type { GamePreset } from "../session/gamePreset";
import { GAME_PRESET_SCHEMA_VERSION } from "../session/gamePreset";
import { defaultAdvancedSessionSettings } from "../session/advancedSessionSettings";
import type { PresetHierarchySegment } from "./bundledPresetHierarchy";

export interface BundledGamePresetDefinition {
  id: string;
  name: string;
  description: string;
  placeLabel: string;
  regionPackId: RegionPackId;
  subregionId?: string;
  hierarchy: readonly PresetHierarchySegment[];
  distanceUnit?: DistanceUnit;
  advancedSettingsPatch?: Partial<AdvancedSessionSettingsValue>;
  transitMetroId?: string;
}

const EXPANSION_ON: Partial<AdvancedSessionSettingsValue> = {
  expansionPackEnabled: true,
  customQuestionPackEnabled: false,
};

function titleCase(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dublinPresets(): BundledGamePresetDefinition[] {
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
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
  ];
}

const NYC_BOROUGHS = [
  { id: "manhattan", name: "Manhattan" },
  { id: "bronx", name: "Bronx" },
  { id: "brooklyn", name: "Brooklyn" },
  { id: "queens", name: "Queens" },
  { id: "staten-island", name: "Staten Island" },
] as const;

function nycPresets(): BundledGamePresetDefinition[] {
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
    {
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
    },
    ...NYC_BOROUGHS.map(
      (borough): BundledGamePresetDefinition => ({
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

function londonPresets(): BundledGamePresetDefinition[] {
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
    {
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
    },
    ...LONDON_BOROUGH_IDS.map(
      (boroughId): BundledGamePresetDefinition => ({
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

const TOKYO_WARDS = [
  { id: "ward-13101", name: "Chiyoda" },
  { id: "ward-13102", name: "Chūō" },
  { id: "ward-13103", name: "Minato" },
  { id: "ward-13104", name: "Shinjuku" },
  { id: "ward-13105", name: "Bunkyō" },
  { id: "ward-13106", name: "Taitō" },
  { id: "ward-13107", name: "Sumida" },
  { id: "ward-13108", name: "Kōtō" },
  { id: "ward-13109", name: "Shinagawa" },
  { id: "ward-13110", name: "Meguro" },
  { id: "ward-13111", name: "Ōta" },
  { id: "ward-13112", name: "Setagaya" },
  { id: "ward-13113", name: "Shibuya" },
  { id: "ward-13114", name: "Nakano" },
  { id: "ward-13115", name: "Suginami" },
  { id: "ward-13116", name: "Toshima" },
  { id: "ward-13117", name: "Kita" },
  { id: "ward-13118", name: "Arakawa" },
  { id: "ward-13119", name: "Itabashi" },
  { id: "ward-13120", name: "Nerima" },
  { id: "ward-13121", name: "Adachi" },
  { id: "ward-13122", name: "Katsushika" },
  { id: "ward-13123", name: "Edogawa" },
] as const;

function tokyoPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-asia", category: "Continent", name: "Asia" },
    { id: "country-japan", category: "Country", name: "Japan" },
    { id: "region-kanto", category: "Region", name: "Kantō" },
    { id: "metro-tokyo", category: "Metro", name: "Tokyo" },
  ] as const;
  const wardHierarchy = [
    ...baseHierarchy,
    { id: "tokyo-wards", category: "Wards", name: "Special wards" },
  ] as const;

  return [
    {
      id: "bundled:tokyo",
      name: "Tokyo 23 Wards",
      description:
        "23 special wards with local area subdivisions. Boundary data © MLIT via JapanCityGeoJson.",
      placeLabel: "Tokyo, Japan",
      regionPackId: TOKYO_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
    },
    ...TOKYO_WARDS.map(
      (ward): BundledGamePresetDefinition => ({
        id: `bundled:tokyo-${ward.id}`,
        name: ward.name,
        description: `${ward.name} ward with local area subdivisions.`,
        placeLabel: `${ward.name}, Tokyo, Japan`,
        regionPackId: TOKYO_REGION_PACK_ID,
        subregionId: ward.id,
        hierarchy: wardHierarchy,
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_ON,
      }),
    ),
  ];
}

const OSAKA_WARDS = [
  { id: "ward-27102", name: "Miyakojima" },
  { id: "ward-27103", name: "Fukushima" },
  { id: "ward-27104", name: "Konohana" },
  { id: "ward-27106", name: "Nishi" },
  { id: "ward-27107", name: "Minato" },
  { id: "ward-27108", name: "Taishō" },
  { id: "ward-27109", name: "Tennōji" },
  { id: "ward-27111", name: "Naniwa" },
  { id: "ward-27113", name: "Nishiyodogawa" },
  { id: "ward-27114", name: "Higashiyodogawa" },
  { id: "ward-27115", name: "Higashinari" },
  { id: "ward-27116", name: "Ikuno" },
  { id: "ward-27117", name: "Asahi" },
  { id: "ward-27118", name: "Jōtō" },
  { id: "ward-27119", name: "Abeno" },
  { id: "ward-27120", name: "Sumiyoshi" },
  { id: "ward-27121", name: "Higashisumiyoshi" },
  { id: "ward-27122", name: "Nishinari" },
  { id: "ward-27123", name: "Yodogawa" },
  { id: "ward-27124", name: "Tsurumi" },
  { id: "ward-27125", name: "Suminoe" },
  { id: "ward-27126", name: "Hirano" },
  { id: "ward-27127", name: "Kita" },
  { id: "ward-27128", name: "Chūō" },
] as const;

function osakaPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-asia", category: "Continent", name: "Asia" },
    { id: "country-japan", category: "Country", name: "Japan" },
    { id: "region-kansai", category: "Region", name: "Kansai" },
    { id: "metro-osaka", category: "Metro", name: "Osaka" },
  ] as const;
  const wardHierarchy = [
    ...baseHierarchy,
    { id: "osaka-wards", category: "Wards", name: "Wards" },
  ] as const;

  return [
    {
      id: "bundled:osaka",
      name: "Osaka City",
      description:
        "24 wards with local area subdivisions. Boundary data © MLIT via JapanCityGeoJson.",
      placeLabel: "Osaka, Japan",
      regionPackId: OSAKA_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
    },
    ...OSAKA_WARDS.map(
      (ward): BundledGamePresetDefinition => ({
        id: `bundled:osaka-${ward.id}`,
        name: ward.name,
        description: `${ward.name} ward with local area subdivisions.`,
        placeLabel: `${ward.name}, Osaka, Japan`,
        regionPackId: OSAKA_REGION_PACK_ID,
        subregionId: ward.id,
        hierarchy: wardHierarchy,
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_ON,
      }),
    ),
  ];
}

function swissPresets(): BundledGamePresetDefinition[] {
  const europe = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-switzerland", category: "Country", name: "Switzerland" },
  ] as const;

  return [
    {
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
    },
    {
      id: "bundled:zurich-city",
      name: "Zürich City",
      description:
        "City of Zürich with quarter subdivisions. Boundary data © GADM.",
      placeLabel: "Zürich, Switzerland",
      regionPackId: ZURICH_REGION_PACK_ID,
      subregionId: "zurich",
      hierarchy: [
        ...europe,
        { id: "canton-zurich", category: "Canton", name: "Zürich" },
        { id: "zurich-city", category: "City", name: "Zürich city" },
      ],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
    },
    {
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
    },
  ];
}

const PORTLAND_MAINE_DISTRICTS = [
  { id: "district-1", name: "District 1" },
  { id: "district-2", name: "District 2" },
  { id: "district-3", name: "District 3" },
  { id: "district-4", name: "District 4" },
  { id: "district-5", name: "District 5" },
] as const;

function portlandMainePresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-north-america", category: "Continent", name: "North America" },
    { id: "country-usa", category: "Country", name: "United States" },
    { id: "state-me", category: "State", name: "Maine" },
    { id: "metro-portland-maine", category: "Metro", name: "Portland" },
  ] as const;
  const districtHierarchy = [
    ...baseHierarchy,
    { id: "portland-maine-districts", category: "Districts", name: "Districts" },
  ] as const;

  return [
    {
      id: "bundled:portland-maine",
      name: "Portland",
      description:
        "Greater Portland metro with five council districts and 18 neighborhoods. Municipal boundaries © U.S. Census TIGER/Line; council districts © City of Portland, Maine GIS.",
      placeLabel: "Portland, Maine, USA",
      regionPackId: PORTLAND_MAINE_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "imperial",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "portland-maine",
    },
    ...PORTLAND_MAINE_DISTRICTS.map(
      (district): BundledGamePresetDefinition => ({
        id: `bundled:portland-maine-${district.id}`,
        name: district.name,
        description: `${district.name} with neighborhoods. Council district boundaries © City of Portland, Maine GIS.`,
        placeLabel: `${district.name}, Portland, Maine, USA`,
        regionPackId: PORTLAND_MAINE_REGION_PACK_ID,
        subregionId: district.id,
        hierarchy: districtHierarchy,
        distanceUnit: "imperial",
        advancedSettingsPatch: EXPANSION_ON,
        transitMetroId: "portland-maine",
      }),
    ),
  ];
}

export const BUNDLED_GAME_PRESET_DEFINITIONS: readonly BundledGamePresetDefinition[] =
  [
    ...dublinPresets(),
    ...nycPresets(),
    ...portlandMainePresets(),
    ...londonPresets(),
    ...tokyoPresets(),
    ...osakaPresets(),
    ...swissPresets(),
  ];

export function isBundledPresetId(id: string): boolean {
  return id.startsWith("bundled:");
}

export function bundledPresetDefinition(
  id: string,
): BundledGamePresetDefinition | undefined {
  return BUNDLED_GAME_PRESET_DEFINITIONS.find((preset) => preset.id === id);
}

export function buildBundledGamePresets(now = new Date().toISOString()): GamePreset[] {
  return BUNDLED_GAME_PRESET_DEFINITIONS.map((definition) => {
    const distanceUnit = definition.distanceUnit ?? "metric";
    const gameSize: GameSize = "medium";
    const defaults = defaultAdvancedSessionSettings(gameSize, distanceUnit);
    return {
      id: definition.id,
      name: definition.name,
      createdAt: now,
      updatedAt: now,
      schemaVersion: GAME_PRESET_SCHEMA_VERSION,
      gameSize,
      distanceUnit,
      advancedSettings: {
        ...defaults,
        ...definition.advancedSettingsPatch,
      },
      placeLabel: definition.placeLabel,
      regionPackId: definition.regionPackId,
      subregionId: definition.subregionId,
      transitMetroId: definition.transitMetroId,
      bundled: true,
      migrationStatus: "ok" as const,
    };
  });
}

export function mergeBundledPresets(existing: GamePreset[]): GamePreset[] {
  const userPresets = existing.filter((preset) => !isBundledPresetId(preset.id));
  const bundledCreatedAt =
    existing.find((preset) => isBundledPresetId(preset.id))?.createdAt ??
    new Date().toISOString();
  const bundled = buildBundledGamePresets(bundledCreatedAt);
  return [...bundled, ...userPresets];
}
