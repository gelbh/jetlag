import { SOUTHAMPTON_REGION_PACK_ID } from "../southamptonRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

export const SOUTHAMPTON_WARDS = [
  { id: "banister-and-polygon", name: "Banister & Polygon" },
  { id: "bargate", name: "Bargate" },
  { id: "bassett", name: "Bassett" },
  { id: "bevois", name: "Bevois" },
  { id: "bitterne-park", name: "Bitterne Park" },
  { id: "coxford", name: "Coxford" },
  { id: "freemantle", name: "Freemantle" },
  { id: "harefield", name: "Harefield" },
  { id: "millbrook", name: "Millbrook" },
  { id: "peartree", name: "Peartree" },
  { id: "portswood", name: "Portswood" },
  { id: "redbridge", name: "Redbridge" },
  { id: "shirley", name: "Shirley" },
  { id: "sholing", name: "Sholing" },
  { id: "swaythling", name: "Swaythling" },
  { id: "thornhill", name: "Thornhill" },
  { id: "woolston", name: "Woolston" },
] as const;

export function southamptonPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-uk", category: "Country", name: "United Kingdom" },
    { id: "region-england", category: "Constituent country", name: "England" },
    { id: "county-hampshire", category: "County", name: "Hampshire" },
    { id: "metro-southampton", category: "City", name: "Southampton" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:southampton",
      name: "Southampton",
      description: "17 wards covering the Southampton unitary authority.",
      placeLabel: "Southampton, United Kingdom",
      regionPackId: SOUTHAMPTON_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
      transitMetroId: "southampton",
    }),
    ...SOUTHAMPTON_WARDS.map((ward) =>
      attachPlayArea({
        id: `bundled:southampton-${ward.id}`,
        name: ward.name,
        description: `${ward.name} ward.`,
        placeLabel: `${ward.name}, Southampton, United Kingdom`,
        regionPackId: SOUTHAMPTON_REGION_PACK_ID,
        subregionId: ward.id,
        hierarchy: [...baseHierarchy, { id: `ward-${ward.id}`, category: "Ward", name: ward.name }],
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
        transitMetroId: "southampton",
      }),
    ),
  ];
}
