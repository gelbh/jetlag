import { AUSTRALIA_REGION_PACK_ID } from "../australiaRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

export const AUSTRALIA_STATE_PRESETS = [
  { id: "nsw", name: "New South Wales" },
  { id: "vic", name: "Victoria" },
  { id: "qld", name: "Queensland" },
  { id: "sa", name: "South Australia" },
  { id: "wa", name: "Western Australia" },
  { id: "tas", name: "Tasmania" },
  { id: "nt", name: "Northern Territory" },
  { id: "act", name: "Australian Capital Territory" },
] as const;

export function australiaPresets(): BundledGamePresetDefinition[] {
  const oceania = [
    { id: "continent-oceania", category: "Continent", name: "Oceania" },
    { id: "country-au", category: "Country", name: "Australia" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:australia",
      name: "Australia",
      description:
        "Eight states and territories with LGA subdivisions. Boundary data © ABS (ASGS).",
      placeLabel: "Australia",
      regionPackId: AUSTRALIA_REGION_PACK_ID,
      hierarchy: [...oceania],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    ...AUSTRALIA_STATE_PRESETS.map((state) =>
      attachPlayArea({
        id: `bundled:australia-${state.id}`,
        name: state.name,
        description: `${state.name} LGAs. Boundary data © ABS (ASGS).`,
        placeLabel: `${state.name}, Australia`,
        regionPackId: AUSTRALIA_REGION_PACK_ID,
        subregionId: state.id,
        hierarchy: [
          ...oceania,
          { id: `state-${state.id}`, category: "State/Territory", name: state.name },
        ],
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
      }),
    ),
  ];
}
