import { BRUSSELS_REGION_PACK_ID } from "../brusselsRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

export const BRUSSELS_COMMUNES = [
  { id: "anderlecht", name: "Anderlecht" },
  { id: "auderghem", name: "Auderghem" },
  { id: "berchem-sainte-agathe", name: "Berchem-Sainte-Agathe" },
  { id: "bruxelles", name: "City of Brussels" },
  { id: "etterbeek", name: "Etterbeek" },
  { id: "evere", name: "Evere" },
  { id: "forest", name: "Forest" },
  { id: "ganshoren", name: "Ganshoren" },
  { id: "ixelles", name: "Ixelles" },
  { id: "jette", name: "Jette" },
  { id: "koekelberg", name: "Koekelberg" },
  { id: "molenbeek-saint-jean", name: "Molenbeek-Saint-Jean" },
  { id: "saint-gilles", name: "Saint-Gilles" },
  { id: "saint-josse-ten-noode", name: "Saint-Josse-ten-Noode" },
  { id: "schaerbeek", name: "Schaerbeek" },
  { id: "uccle", name: "Uccle" },
  { id: "watermael-boitsfort", name: "Watermael-Boitsfort" },
  { id: "woluwe-saint-lambert", name: "Woluwe-Saint-Lambert" },
  { id: "woluwe-saint-pierre", name: "Woluwe-Saint-Pierre" },
] as const;

export function brusselsPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-belgium", category: "Country", name: "Belgium" },
    { id: "metro-brussels", category: "Metro", name: "Brussels" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:brussels",
      name: "Brussels",
      description: "19 communes covering the Brussels-Capital Region.",
      placeLabel: "Brussels, Belgium",
      regionPackId: BRUSSELS_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    ...BRUSSELS_COMMUNES.map((commune) =>
      attachPlayArea({
        id: `bundled:brussels-${commune.id}`,
        name: commune.name,
        description: `${commune.name} commune.`,
        placeLabel: `${commune.name}, Brussels, Belgium`,
        regionPackId: BRUSSELS_REGION_PACK_ID,
        subregionId: commune.id,
        hierarchy: [
          ...baseHierarchy,
          { id: `commune-${commune.id}`, category: "Commune", name: commune.name },
        ],
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
      }),
    ),
  ];
}
