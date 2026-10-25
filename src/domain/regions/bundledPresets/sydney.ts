import { SYDNEY_REGION_PACK_ID } from "../sydneyRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

/** ABS LGA codes + display names for Greater Sydney (1:1 with public/geo/sydney/lgas.geojson). */
export const SYDNEY_LGAS = [
  { id: "10500", name: "Bayside (NSW)" },
  { id: "10750", name: "Blacktown" },
  { id: "10900", name: "Blue Mountains" },
  { id: "11300", name: "Burwood" },
  { id: "11450", name: "Camden" },
  { id: "11500", name: "Campbelltown (NSW)" },
  { id: "11520", name: "Canada Bay" },
  { id: "11570", name: "Canterbury-Bankstown" },
  { id: "12380", name: "Cumberland" },
  { id: "12850", name: "Fairfield" },
  { id: "12930", name: "Georges River" },
  { id: "13800", name: "Hawkesbury" },
  { id: "14000", name: "Hornsby" },
  { id: "14100", name: "Hunters Hill" },
  { id: "14170", name: "Inner West" },
  { id: "14500", name: "Ku-ring-gai" },
  { id: "14700", name: "Lane Cove" },
  { id: "14900", name: "Liverpool" },
  { id: "15350", name: "Mosman" },
  { id: "15950", name: "North Sydney" },
  { id: "15990", name: "Northern Beaches" },
  { id: "16260", name: "Parramatta" },
  { id: "16350", name: "Penrith" },
  { id: "16550", name: "Randwick" },
  { id: "16700", name: "Ryde" },
  { id: "17100", name: "Strathfield" },
  { id: "17150", name: "Sutherland" },
  { id: "17200", name: "Sydney" },
  { id: "17420", name: "The Hills" },
  { id: "18050", name: "Waverley" },
  { id: "18250", name: "Willoughby" },
  { id: "18400", name: "Wollondilly" },
  { id: "18500", name: "Woollahra" },
] as const;

export function sydneyPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-oceania", category: "Continent", name: "Oceania" },
    { id: "country-au", category: "Country", name: "Australia" },
    { id: "state-nsw", category: "State/Territory", name: "New South Wales" },
    { id: "sydney-metro", category: "City", name: "Sydney" },
  ] as const;
  const lgaHierarchy = [
    ...baseHierarchy,
    { id: "sydney-lgas", category: "LGAs", name: "LGAs" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:sydney",
      name: "Sydney",
      description:
        "Greater Sydney LGAs (Strathfield, City of Sydney, and metro cluster). Boundary data © ABS (ASGS).",
      placeLabel: "Sydney, Australia",
      regionPackId: SYDNEY_REGION_PACK_ID,
      transitMetroId: "sydney",
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    ...SYDNEY_LGAS.map((lga) =>
      attachPlayArea({
        id: `bundled:sydney-lga-${lga.id}`,
        name: lga.name,
        description: `${lga.name} LGA in Greater Sydney. Boundary data © ABS (ASGS).`,
        placeLabel: `${lga.name}, Sydney, Australia`,
        regionPackId: SYDNEY_REGION_PACK_ID,
        subregionId: lga.id,
        transitMetroId: "sydney",
        hierarchy: lgaHierarchy,
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
      }),
    ),
  ];
}
