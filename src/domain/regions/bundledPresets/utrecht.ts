import { UTRECHT_REGION_PACK_ID } from "../utrechtRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

export const UTRECHT_WIJKEN = [
  { id: "west", name: "West" },
  { id: "noordwest", name: "Noordwest" },
  { id: "overvecht", name: "Overvecht" },
  { id: "noordoost", name: "Noordoost" },
  { id: "oost", name: "Oost" },
  { id: "binnenstad", name: "Binnenstad" },
  { id: "zuid", name: "Zuid" },
  { id: "zuidwest", name: "Zuidwest" },
  { id: "leidsche-rijn", name: "Leidsche Rijn" },
  { id: "vleuten-de-meern", name: "Vleuten-De Meern" },
] as const;

export function utrechtPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-netherlands", category: "Country", name: "Netherlands" },
    { id: "metro-utrecht", category: "Metro", name: "Utrecht" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:utrecht",
      name: "Utrecht",
      description: "10 wijken covering Gemeente Utrecht.",
      placeLabel: "Utrecht, Netherlands",
      regionPackId: UTRECHT_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    ...UTRECHT_WIJKEN.map((wijk) =>
      attachPlayArea({
        id: `bundled:utrecht-${wijk.id}`,
        name: wijk.name,
        description: `${wijk.name} wijk.`,
        placeLabel: `${wijk.name}, Utrecht, Netherlands`,
        regionPackId: UTRECHT_REGION_PACK_ID,
        subregionId: wijk.id,
        hierarchy: [...baseHierarchy, { id: wijk.id, category: "Wijk", name: wijk.name }],
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
      }),
    ),
  ];
}
