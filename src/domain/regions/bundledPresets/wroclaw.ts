import { WROCLAW_REGION_PACK_ID } from "../wroclawRegionPack";
import { attachPlayArea } from "./attachPlayArea";
import { type BundledGamePresetDefinition, EXPANSION_OFF } from "./shared";

export const WROCLAW_DZIELNICE = [
  { id: "stare-miasto", name: "Stare Miasto" },
  { id: "przedmiescie-swidnickie", name: "Przedmieście Świdnickie" },
  { id: "szczepin", name: "Szczepin" },
  { id: "nadodrze", name: "Nadodrze" },
  { id: "kleczkow", name: "Kleczków" },
  { id: "olbin", name: "Ołbin" },
  { id: "plac-grunwaldzki", name: "Plac Grunwaldzki" },
  { id: "zacisze-zalesie-szczytniki", name: "Zacisze - Zalesie - Szczytniki" },
  { id: "biskupin-sepolno-dabie-bartoszowice", name: "Biskupin - Sępolno - Dąbie - Bartoszowice" },
  { id: "przedmiescie-olawskie", name: "Przedmieście Oławskie" },
  { id: "tarnogaj", name: "Tarnogaj" },
  { id: "huby", name: "Huby" },
  { id: "powstancow-slaskich", name: "Powstańców Śląskich" },
  { id: "gaj", name: "Gaj" },
  { id: "borek", name: "Borek" },
  { id: "ksieze", name: "Księże" },
  { id: "brochow", name: "Brochów" },
  { id: "bienkowice", name: "Bieńkowice" },
  { id: "jagodno", name: "Jagodno" },
  { id: "otaszyn", name: "Ołtaszyn" },
  { id: "krzyki-partynice", name: "Krzyki - Partynice" },
  { id: "klecina", name: "Klecina" },
  { id: "pilczyce-kozanow-popowice-pn", name: "Pilczyce - Kozanów - Popowice Płn." },
  { id: "gadow-popowice-pld", name: "Gądów - Popowice Płd." },
  { id: "muchobor-maly", name: "Muchobór Mały" },
  { id: "gajowice", name: "Gajowice" },
  { id: "grabiszyn-grabiszynek", name: "Grabiszyn - Grabiszynek" },
  { id: "oporow", name: "Oporów" },
  { id: "muchobor-wielki", name: "Muchobór Wielki" },
  { id: "nowy-dwor", name: "Nowy Dwór" },
  { id: "kuzniki", name: "Kuźniki" },
  { id: "zerniki", name: "Żerniki" },
  {
    id: "jerzmanowo-jarnoltow-strachowice-osiniec",
    name: "Jerzmanowo - Jarnołtów - Strachowice - Osiniec",
  },
  { id: "lesnica", name: "Leśnica" },
  { id: "maslice", name: "Maślice" },
  { id: "pracze-odrzanskie", name: "Pracze Odrzańskie" },
  { id: "karowice-rozanka", name: "Karłowice - Różanka" },
  { id: "kowale", name: "Kowale" },
  { id: "strachocin-swojczyce-wojnow", name: "Strachocin - Swojczyce - Wojnów" },
  { id: "psie-pole-zawidawie", name: "Psie Pole - Zawidawie" },
  { id: "pawlowice", name: "Pawłowice" },
  { id: "soltysowice", name: "Sołtysowice" },
  { id: "polanowice-poswietne-ligota", name: "Polanowice - Poświętne - Ligota" },
  { id: "widawa", name: "Widawa" },
  { id: "lipa-piotrowska", name: "Lipa Piotrowska" },
  { id: "swiniary", name: "Świniary" },
  { id: "osobowice-redzin", name: "Osobowice - Rędzin" },
  { id: "wojszyce", name: "Wojszyce" },
] as const;

export function wroclawPresets(): BundledGamePresetDefinition[] {
  const baseHierarchy = [
    { id: "continent-europe", category: "Continent", name: "Europe" },
    { id: "country-poland", category: "Country", name: "Poland" },
    { id: "metro-wroclaw", category: "Metro", name: "Wrocław" },
  ] as const;

  return [
    attachPlayArea({
      id: "bundled:wroclaw",
      name: "Wrocław",
      description: "48 dzielnice covering Miasto Wrocław.",
      placeLabel: "Wrocław, Poland",
      regionPackId: WROCLAW_REGION_PACK_ID,
      hierarchy: baseHierarchy,
      distanceUnit: "metric",
      advancedSettingsPatch: EXPANSION_OFF,
    }),
    ...WROCLAW_DZIELNICE.map((dzielnica) =>
      attachPlayArea({
        id: `bundled:wroclaw-${dzielnica.id}`,
        name: dzielnica.name,
        description: `${dzielnica.name} dzielnica.`,
        placeLabel: `${dzielnica.name}, Wrocław, Poland`,
        regionPackId: WROCLAW_REGION_PACK_ID,
        subregionId: dzielnica.id,
        hierarchy: [
          ...baseHierarchy,
          { id: dzielnica.id, category: "Dzielnica", name: dzielnica.name },
        ],
        distanceUnit: "metric",
        advancedSettingsPatch: EXPANSION_OFF,
      }),
    ),
  ];
}
