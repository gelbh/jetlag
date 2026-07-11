import { attachPlayArea } from "./attachPlayArea";
import { EXPANSION_ON, type BundledGamePresetDefinition } from "./shared";
import { TOKYO_REGION_PACK_ID } from "../tokyoRegionPack";

const TOKYO_WARDS = [
  { id: "ward-13101", name: "Chiyoda" },
  { id: "ward-13102", name: "Chūō" },
  { id: "ward-13103", name: "Minato" },
  { id: "ward-13104", name: "Shinjuku" },
  { id: "ward-13105", name: "Bunkyō" },
  { id: "ward-13106", name: "Taitō" },
  { id: "ward-13107", name: "Sumida" },
  { id: "ward-13108", name: "Kōtō" },
  { id: "ward-13109", name: "Shinagawa" },
  { id: "ward-13110", name: "Meguro" },
  { id: "ward-13111", name: "Ōta" },
  { id: "ward-13112", name: "Setagaya" },
  { id: "ward-13113", name: "Shibuya" },
  { id: "ward-13114", name: "Nakano" },
  { id: "ward-13115", name: "Suginami" },
  { id: "ward-13116", name: "Toshima" },
  { id: "ward-13117", name: "Kita" },
  { id: "ward-13118", name: "Arakawa" },
  { id: "ward-13119", name: "Itabashi" },
  { id: "ward-13120", name: "Nerima" },
  { id: "ward-13121", name: "Adachi" },
  { id: "ward-13122", name: "Katsushika" },
  { id: "ward-13123", name: "Edogawa" },
] as const;


export function tokyoPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-asia", category: "Continent", name: "Asia" },
    { id: "country-japan", category: "Country", name: "Japan" },
    { id: "region-kanto", category: "Region", name: "Kantō" },
    { id: "metro-tokyo", category: "Metro", name: "Tokyo" },
  ] as const;
  const wardHierarchy = [
    ...baseHierarchy,
    { id: "tokyo-wards", category: "Wards", name: "Special wards" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:tokyo",
      name: "Tokyo 23 Wards",
      description:
        "23 special wards with local area subdivisions. Boundary data © MLIT via JapanCityGeoJson.",
      placeLabel: "Tokyo, Japan",
      regionPackId: TOKYO_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
    }),
    ...TOKYO_WARDS.map(
      (ward) => attachPlayArea({
        id: `bundled:tokyo-${ward.id}`,
        name: ward.name,
        description: `${ward.name} ward with local area subdivisions.`,
        placeLabel: `${ward.name}, Tokyo, Japan`,
        regionPackId: TOKYO_REGION_PACK_ID,
        subregionId: ward.id,
        hierarchy: wardHierarchy,
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_ON,
       }),
    ),
  ];
}
