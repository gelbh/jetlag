import { LUCERNE_REGION_PACK_ID } from "../lucerneRegionPack";
import { SWITZERLAND_REGION_PACK_ID } from "../switzerlandRegionPack";
import { ZURICH_REGION_PACK_ID } from "../zurichRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

/** Canton slug + display name; ids match `cantonId` on switzerland pack geo. */
export const SWISS_CANTONS = [
  { id: "zurich", name: "Zürich" },
  { id: "bern", name: "Bern" },
  { id: "lucerne", name: "Lucerne" },
  { id: "uri", name: "Uri" },
  { id: "schwyz", name: "Schwyz" },
  { id: "obwalden", name: "Obwalden" },
  { id: "nidwalden", name: "Nidwalden" },
  { id: "glarus", name: "Glarus" },
  { id: "zug", name: "Zug" },
  { id: "fribourg", name: "Fribourg" },
  { id: "solothurn", name: "Solothurn" },
  { id: "basel-stadt", name: "Basel-Stadt" },
  { id: "basel-landschaft", name: "Basel-Landschaft" },
  { id: "schaffhausen", name: "Schaffhausen" },
  { id: "appenzell-ausserrhoden", name: "Appenzell Ausserrhoden" },
  { id: "appenzell-innerrhoden", name: "Appenzell Innerrhoden" },
  { id: "st-gallen", name: "St. Gallen" },
  { id: "graubunden", name: "Graubünden" },
  { id: "aargau", name: "Aargau" },
  { id: "thurgau", name: "Thurgau" },
  { id: "ticino", name: "Ticino" },
  { id: "vaud", name: "Vaud" },
  { id: "valais", name: "Valais" },
  { id: "neuchatel", name: "Neuchâtel" },
  { id: "geneva", name: "Geneva" },
  { id: "jura", name: "Jura" },
] as const;

/** Stable cantonId list for presets/tests (same order as SWISS_CANTONS). */
export const SWISS_CANTON_IDS = SWISS_CANTONS.map((canton) => canton.id);

export function swissPresets(): BundledGamePresetDefinition[] {
  const europe = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-switzerland", category: "Country", name: "Switzerland" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:zurich-canton",
      name: "Canton of Zürich",
      description:
        "13 districts and city quarters. Boundary data © GADM (verify licensing for your use).",
      placeLabel: "Canton of Zürich, Switzerland",
      regionPackId: ZURICH_REGION_PACK_ID,
      hierarchy: [...europe, { id: "canton-zurich", category: "Canton", name: "Zürich" }],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    attachPlayArea({
      id: "bundled:zurich-city",
      name: "Zürich City",
      description: "City of Zürich with quarter subdivisions. Boundary data © GADM.",
      placeLabel: "Zürich, Switzerland",
      regionPackId: ZURICH_REGION_PACK_ID,
      subregionId: "z-rich",
      hierarchy: [
        ...europe,
        { id: "canton-zurich", category: "Canton", name: "Zürich" },
        { id: "zurich-city", category: "City", name: "Zürich" },
      ],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    attachPlayArea({
      id: "bundled:lucerne-metro",
      name: "Lucerne Metro",
      description: "Lucerne district municipalities. Boundary data © GADM.",
      placeLabel: "Lucerne, Switzerland",
      regionPackId: LUCERNE_REGION_PACK_ID,
      hierarchy: [
        ...europe,
        { id: "canton-lucerne", category: "Canton", name: "Lucerne" },
        { id: "lucerne-metro", category: "City", name: "Lucerne" },
      ],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    attachPlayArea({
      id: "bundled:switzerland",
      name: "Switzerland",
      description:
        "26 cantons with municipality subdivisions. Boundary data © swisstopo (swissBOUNDARIES3D).",
      placeLabel: "Switzerland",
      regionPackId: SWITZERLAND_REGION_PACK_ID,
      hierarchy: [...europe],
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    ...SWISS_CANTONS.map((canton) => {
      // Specialty Zürich/Lucerne presets keep "Canton of …" / metro names; disambiguate depth.
      const hasSpecialtyDepth = canton.id === "zurich" || canton.id === "lucerne";
      const name = hasSpecialtyDepth
        ? `Canton of ${canton.name} (municipalities)`
        : `Canton of ${canton.name}`;
      return attachPlayArea({
        id: `bundled:switzerland-${canton.id}`,
        name,
        description: `${canton.name} municipalities. Boundary data © swisstopo (swissBOUNDARIES3D).`,
        placeLabel: `${canton.name}, Switzerland`,
        regionPackId: SWITZERLAND_REGION_PACK_ID,
        subregionId: canton.id,
        hierarchy: [
          ...europe,
          { id: `canton-${canton.id}`, category: "Canton", name: canton.name },
        ],
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
      });
    }),
  ];
}
