import type { GameSize } from "../session/gameSize";
import type { DublinCouncilFilter, RegionPackId } from "./regionPack";
import { DUBLIN_REGION_PACK_ID } from "./dublinRegionPack";
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
  councilFilter?: DublinCouncilFilter;
  gameSize: GameSize;
  hierarchy: readonly PresetHierarchySegment[];
}

export const BUNDLED_GAME_PRESET_DEFINITIONS: readonly BundledGamePresetDefinition[] =
  [
    {
      id: "bundled:dublin-county",
      name: "County Dublin",
      description:
        "Full county play area with four local authorities and 31 LEAs. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "County Dublin, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      gameSize: "large",
      hierarchy: [
        { id: "continent-europe", category: "Continent", name: "Europe" },
        { id: "country-ireland", category: "Country", name: "Ireland" },
        { id: "county-dublin", category: "County", name: "Dublin" },
      ],
    },
    {
      id: "bundled:dublin-city",
      name: "Dublin City Council",
      description:
        "Dublin City with 11 local electoral areas. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "Dublin City, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      councilFilter: "dcc",
      gameSize: "medium",
      hierarchy: [
        { id: "continent-europe", category: "Continent", name: "Europe" },
        { id: "country-ireland", category: "Country", name: "Ireland" },
        { id: "county-dublin", category: "County", name: "Dublin" },
        {
          id: "dublin-local-authorities",
          category: "Local authorities",
          name: "Local authorities",
        },
      ],
    },
    {
      id: "bundled:dublin-fingal",
      name: "Fingal County Council",
      description:
        "Fingal with seven local electoral areas. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "Fingal, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      councilFilter: "fingal",
      gameSize: "large",
      hierarchy: [
        { id: "continent-europe", category: "Continent", name: "Europe" },
        { id: "country-ireland", category: "Country", name: "Ireland" },
        { id: "county-dublin", category: "County", name: "Dublin" },
        {
          id: "dublin-local-authorities",
          category: "Local authorities",
          name: "Local authorities",
        },
      ],
    },
    {
      id: "bundled:dublin-south-dublin",
      name: "South Dublin County Council",
      description:
        "South Dublin with seven local electoral areas. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "South Dublin, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      councilFilter: "sdcc",
      gameSize: "medium",
      hierarchy: [
        { id: "continent-europe", category: "Continent", name: "Europe" },
        { id: "country-ireland", category: "Country", name: "Ireland" },
        { id: "county-dublin", category: "County", name: "Dublin" },
        {
          id: "dublin-local-authorities",
          category: "Local authorities",
          name: "Local authorities",
        },
      ],
    },
    {
      id: "bundled:dublin-dlr",
      name: "Dún Laoghaire–Rathdown",
      description:
        "Dún Laoghaire–Rathdown with six local electoral areas. Boundary data © Tailte Éireann (CC-BY 4.0).",
      placeLabel: "Dún Laoghaire–Rathdown, Ireland",
      regionPackId: DUBLIN_REGION_PACK_ID,
      councilFilter: "dlr",
      gameSize: "medium",
      hierarchy: [
        { id: "continent-europe", category: "Continent", name: "Europe" },
        { id: "country-ireland", category: "Country", name: "Ireland" },
        { id: "county-dublin", category: "County", name: "Dublin" },
        {
          id: "dublin-local-authorities",
          category: "Local authorities",
          name: "Local authorities",
        },
      ],
    },
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
  return BUNDLED_GAME_PRESET_DEFINITIONS.map((definition) => ({
    id: definition.id,
    name: definition.name,
    createdAt: now,
    updatedAt: now,
    schemaVersion: GAME_PRESET_SCHEMA_VERSION,
    gameSize: definition.gameSize,
    distanceUnit: "metric" as const,
    advancedSettings: defaultAdvancedSessionSettings(
      definition.gameSize,
      "metric",
    ),
    placeLabel: definition.placeLabel,
    regionPackId: definition.regionPackId,
    councilFilter: definition.councilFilter,
    bundled: true,
    migrationStatus: "ok" as const,
  }));
}

export function mergeBundledPresets(existing: GamePreset[]): GamePreset[] {
  const userPresets = existing.filter((preset) => !isBundledPresetId(preset.id));
  const bundledCreatedAt =
    existing.find((preset) => isBundledPresetId(preset.id))?.createdAt ??
    new Date().toISOString();
  const bundled = buildBundledGamePresets(bundledCreatedAt);
  return [...bundled, ...userPresets];
}
