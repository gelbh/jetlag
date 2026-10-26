import { BERLIN_REGION_PACK_ID } from "../berlinRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

export const BERLIN_BEZIRKE = [
  { id: "mitte", name: "Mitte" },
  { id: "friedrichshain-kreuzberg", name: "Friedrichshain-Kreuzberg" },
  { id: "pankow", name: "Pankow" },
  { id: "charlottenburg-wilmersdorf", name: "Charlottenburg-Wilmersdorf" },
  { id: "spandau", name: "Spandau" },
  { id: "steglitz-zehlendorf", name: "Steglitz-Zehlendorf" },
  { id: "tempelhof-schoeneberg", name: "Tempelhof-Schöneberg" },
  { id: "neukoelln", name: "Neukölln" },
  { id: "treptow-koepenick", name: "Treptow-Köpenick" },
  { id: "marzahn-hellersdorf", name: "Marzahn-Hellersdorf" },
  { id: "lichtenberg", name: "Lichtenberg" },
  { id: "reinickendorf", name: "Reinickendorf" },
] as const;

export function berlinPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-germany", category: "Country", name: "Germany" },
    { id: "metro-berlin", category: "Metro", name: "Berlin" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:berlin",
      name: "Berlin",
      description: "12 Bezirke covering the Land Berlin play area.",
      placeLabel: "Berlin, Germany",
      regionPackId: BERLIN_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    ...BERLIN_BEZIRKE.map((bezirk) =>
      attachPlayArea({
        id: `bundled:berlin-${bezirk.id}`,
        name: bezirk.name,
        description: `${bezirk.name} Bezirk.`,
        placeLabel: `${bezirk.name}, Berlin, Germany`,
        regionPackId: BERLIN_REGION_PACK_ID,
        subregionId: bezirk.id,
        hierarchy: [...baseHierarchy, { id: bezirk.id, category: "Bezirk", name: bezirk.name }],
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
      }),
    ),
  ];
}
