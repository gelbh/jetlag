import { attachPlayArea } from "./attachPlayArea";
import { EXPANSION_ON, type BundledGamePresetDefinition } from "./shared";
import { OSAKA_REGION_PACK_ID } from "../osakaRegionPack";

const OSAKA_WARDS = [
  { id: "ward-27102", name: "Miyakojima" },
  { id: "ward-27103", name: "Fukushima" },
  { id: "ward-27104", name: "Konohana" },
  { id: "ward-27106", name: "Nishi" },
  { id: "ward-27107", name: "Minato" },
  { id: "ward-27108", name: "Taishō" },
  { id: "ward-27109", name: "Tennōji" },
  { id: "ward-27111", name: "Naniwa" },
  { id: "ward-27113", name: "Nishiyodogawa" },
  { id: "ward-27114", name: "Higashiyodogawa" },
  { id: "ward-27115", name: "Higashinari" },
  { id: "ward-27116", name: "Ikuno" },
  { id: "ward-27117", name: "Asahi" },
  { id: "ward-27118", name: "Jōtō" },
  { id: "ward-27119", name: "Abeno" },
  { id: "ward-27120", name: "Sumiyoshi" },
  { id: "ward-27121", name: "Higashisumiyoshi" },
  { id: "ward-27122", name: "Nishinari" },
  { id: "ward-27123", name: "Yodogawa" },
  { id: "ward-27124", name: "Tsurumi" },
  { id: "ward-27125", name: "Suminoe" },
  { id: "ward-27126", name: "Hirano" },
  { id: "ward-27127", name: "Kita" },
  { id: "ward-27128", name: "Chūō" },
] as const;


export function osakaPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-asia", category: "Continent", name: "Asia" },
    { id: "country-japan", category: "Country", name: "Japan" },
    { id: "region-kansai", category: "Region", name: "Kansai" },
    { id: "metro-osaka", category: "Metro", name: "Osaka" },
  ] as const;
  const wardHierarchy = [
    ...baseHierarchy,
    { id: "osaka-wards", category: "Wards", name: "Wards" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:osaka",
      name: "Osaka City",
      description:
        "24 wards with local area subdivisions. Boundary data © MLIT via JapanCityGeoJson.",
      placeLabel: "Osaka, Japan",
      regionPackId: OSAKA_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_ON,
    }),
    ...OSAKA_WARDS.map(
      (ward) => attachPlayArea({
        id: `bundled:osaka-${ward.id}`,
        name: ward.name,
        description: `${ward.name} ward with local area subdivisions.`,
        placeLabel: `${ward.name}, Osaka, Japan`,
        regionPackId: OSAKA_REGION_PACK_ID,
        subregionId: ward.id,
        hierarchy: wardHierarchy,
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_ON,
       }),
    ),
  ];
}
