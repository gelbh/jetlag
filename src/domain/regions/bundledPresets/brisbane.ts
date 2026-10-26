import { BRISBANE_REGION_PACK_ID } from "../brisbaneRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

export const BRISBANE_WARDS = [
  { id: "bracken-ridge", name: "Bracken Ridge" },
  { id: "calamvale", name: "Calamvale" },
  { id: "central", name: "Central" },
  { id: "chandler", name: "Chandler" },
  { id: "coorparoo", name: "Coorparoo" },
  { id: "deagon", name: "Deagon" },
  { id: "doboy", name: "Doboy" },
  { id: "enoggera", name: "Enoggera" },
  { id: "forest-lake", name: "Forest Lake" },
  { id: "hamilton", name: "Hamilton" },
  { id: "holland-park", name: "Holland Park" },
  { id: "jamboree", name: "Jamboree" },
  { id: "macgregor", name: "MacGregor" },
  { id: "marchant", name: "Marchant" },
  { id: "mcdowall", name: "McDowall" },
  { id: "moorooka", name: "Moorooka" },
  { id: "morningside", name: "Morningside" },
  { id: "northgate", name: "Northgate" },
  { id: "paddington", name: "Paddington" },
  { id: "pullenvale", name: "Pullenvale" },
  { id: "runcorn", name: "Runcorn" },
  { id: "tennyson", name: "Tennyson" },
  { id: "the-gabba", name: "The Gabba" },
  { id: "the-gap", name: "The Gap" },
  { id: "walter-taylor", name: "Walter Taylor" },
  { id: "wynnum-manly", name: "Wynnum Manly" },
] as const;

export function brisbanePresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-oceania", category: "Continent", name: "Oceania" },
    { id: "country-au", category: "Country", name: "Australia" },
    { id: "state-qld", category: "State/Territory", name: "Queensland" },
    { id: "metro-brisbane", category: "Metro", name: "Brisbane" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:brisbane",
      name: "Brisbane",
      description: "26 wards covering the City of Brisbane LGA.",
      placeLabel: "Brisbane, Queensland, Australia",
      regionPackId: BRISBANE_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    ...BRISBANE_WARDS.map((ward) =>
      attachPlayArea({
        id: `bundled:brisbane-${ward.id}`,
        name: ward.name,
        description: `${ward.name} ward.`,
        placeLabel: `${ward.name}, Brisbane, Queensland, Australia`,
        regionPackId: BRISBANE_REGION_PACK_ID,
        subregionId: ward.id,
        hierarchy: [...baseHierarchy, { id: `ward-${ward.id}`, category: "Ward", name: ward.name }],
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
      }),
    ),
  ];
}
