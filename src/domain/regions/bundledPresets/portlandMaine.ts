import { attachPlayArea } from "./attachPlayArea";
import { EXPANSION_ON, type BundledGamePresetDefinition } from "./shared";
import { PORTLAND_MAINE_REGION_PACK_ID } from "../portlandMaineRegionPack";

const PORTLAND_MAINE_DISTRICTS = [
  { id: "district-1", name: "District 1" },
  { id: "district-2", name: "District 2" },
  { id: "district-3", name: "District 3" },
  { id: "district-4", name: "District 4" },
  { id: "district-5", name: "District 5" },
] as const;


export function portlandMainePresets(): BundledGamePresetDefinition[] {
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
    attachPlayArea({
      id: "bundled:portland-maine",
      name: "Portland",
      description:
        "Greater Portland metro with five council districts and 18 neighborhoods across eight GP Metro towns. Municipal boundaries © U.S. Census TIGER/Line; council districts © City of Portland, Maine GIS.",
      placeLabel: "Portland, Maine, USA",
      regionPackId: PORTLAND_MAINE_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "imperial",
      advancedSettingsPatch: EXPANSION_ON,
      transitMetroId: "portland-maine",
    }),
    ...PORTLAND_MAINE_DISTRICTS.map(
      (district) => attachPlayArea({
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
