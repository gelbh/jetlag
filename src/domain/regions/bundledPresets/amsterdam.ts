import { AMSTERDAM_REGION_PACK_ID } from "../amsterdamRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

export const AMSTERDAM_STADSDELEN = [
  { id: "centrum", name: "Centrum" },
  { id: "westpoort", name: "Westpoort" },
  { id: "west", name: "West" },
  { id: "nieuw-west", name: "Nieuw-West" },
  { id: "zuid", name: "Zuid" },
  { id: "oost", name: "Oost" },
  { id: "noord", name: "Noord" },
  { id: "zuidoost", name: "Zuidoost" },
  { id: "weesp", name: "Weesp" },
] as const;

export function amsterdamPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-netherlands", category: "Country", name: "Netherlands" },
    { id: "metro-amsterdam", category: "Metro", name: "Amsterdam" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:amsterdam",
      name: "Amsterdam",
      description: "9 stadsdelen covering Gemeente Amsterdam.",
      placeLabel: "Amsterdam, Netherlands",
      regionPackId: AMSTERDAM_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    ...AMSTERDAM_STADSDELEN.map((stadsdeel) =>
      attachPlayArea({
        id: `bundled:amsterdam-${stadsdeel.id}`,
        name: stadsdeel.name,
        description: `${stadsdeel.name} stadsdeel.`,
        placeLabel: `${stadsdeel.name}, Amsterdam, Netherlands`,
        regionPackId: AMSTERDAM_REGION_PACK_ID,
        subregionId: stadsdeel.id,
        hierarchy: [
          ...baseHierarchy,
          { id: stadsdeel.id, category: "Stadsdeel", name: stadsdeel.name },
        ],
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
      }),
    ),
  ];
}
