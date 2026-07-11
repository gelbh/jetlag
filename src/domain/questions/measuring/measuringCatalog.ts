export type MeasuringGroupId =
  | "transit"
  | "borders"
  | "natural"
  | "poi"
  | "public_utilities";

export type MeasuringSubject = "coastline" | "location" | "sea_level";

export type MeasuringTargetMode = "map" | "search" | "nearest";

export type MeasuringTargetKind =
  | "sea_level"
  | "coastline"
  | "linear"
  | "polygon"
  | "point";

export type MeasuringFromKind =
  | "commercial_airport"
  | "high_speed_rail_line"
  | "rail_station"
  | "international_border"
  | "admin1_border"
  | "admin2_border"
  | "admin3_border"
  | "admin4_border"
  | "sea_level"
  | "body_of_water"
  | "coastline"
  | "mountain"
  | "park"
  | "amusement_park"
  | "zoo"
  | "aquarium"
  | "golf_course"
  | "museum"
  | "movie_theater"
  | "hospital"
  | "library"
  | "foreign_consulate"
  | "custom_place"
  | `custom:${string}`
  | `pack:${string}`
  | `custom_geo:${string}`;

export type MeasuringLocationCategory = Exclude<
  MeasuringFromKind,
  "coastline" | "sea_level"
>;

export type MeasuringAnswer = "closer" | "further";

export interface MeasuringQuestionDefinition {
  subject: MeasuringSubject;
  prompt: string;
  ruleSummary: string;
}

export interface MeasuringCatalogOption {
  id: MeasuringFromKind;
  groupId: MeasuringGroupId;
  label: string;
  promptNoun: string;
  subject: MeasuringSubject;
  targetKind: MeasuringTargetKind;
  overpassSelectors: readonly string[];
  linearSelectors: readonly string[];
  supportsSearch: boolean;
  supportsNearest: boolean;
  supportsMapTarget: boolean;
}

export const MEASURING_GROUPS = [
  { id: "transit", label: "Transit" },
  { id: "borders", label: "Borders" },
  { id: "natural", label: "Natural" },
  { id: "poi", label: "Places of Interest (POI)" },
  { id: "public_utilities", label: "Public Utilities" },
] as const satisfies ReadonlyArray<{
  id: MeasuringGroupId;
  label: string;
}>;

export const MEASURING_CATALOG = [
  {
    id: "commercial_airport",
    groupId: "transit",
    label: "Commercial airport",
    promptNoun: "a commercial airport",
    subject: "location",
    targetKind: "point",
    overpassSelectors: [
      "[aeroway=aerodrome][iata]",
      "[aeroway=aerodrome][icao]",
    ],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "high_speed_rail_line",
    groupId: "transit",
    label: "High speed train line",
    promptNoun: "a high speed train line",
    subject: "location",
    targetKind: "linear",
    overpassSelectors: [],
    linearSelectors: ['["railway"="rail"]["highspeed"="yes"]'],
    supportsSearch: false,
    supportsNearest: false,
    supportsMapTarget: false,
  },
  {
    id: "rail_station",
    groupId: "transit",
    label: "Rail station",
    promptNoun: "a rail station",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["railway"="station"]', '["railway"="halt"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "international_border",
    groupId: "borders",
    label: "International border",
    promptNoun: "an international border",
    subject: "location",
    targetKind: "linear",
    overpassSelectors: [],
    linearSelectors: ['["boundary"="administrative"]["admin_level"="2"]'],
    supportsSearch: false,
    supportsNearest: false,
    supportsMapTarget: false,
  },
  {
    id: "admin1_border",
    groupId: "borders",
    label: "1st admin. div. border",
    promptNoun: "a first-level administrative division border",
    subject: "location",
    targetKind: "linear",
    overpassSelectors: [],
    linearSelectors: ['["boundary"="administrative"]["admin_level"="4"]'],
    supportsSearch: false,
    supportsNearest: false,
    supportsMapTarget: false,
  },
  {
    id: "admin2_border",
    groupId: "borders",
    label: "2nd admin. div. border",
    promptNoun: "a second-level administrative division border",
    subject: "location",
    targetKind: "linear",
    overpassSelectors: [],
    linearSelectors: ['["boundary"="administrative"]["admin_level"="6"]'],
    supportsSearch: false,
    supportsNearest: false,
    supportsMapTarget: false,
  },
  {
    id: "admin3_border",
    groupId: "borders",
    label: "3rd admin. div. border",
    promptNoun: "a third-level administrative division border",
    subject: "location",
    targetKind: "linear",
    overpassSelectors: [],
    linearSelectors: ['["boundary"="administrative"]["admin_level"="8"]'],
    supportsSearch: false,
    supportsNearest: false,
    supportsMapTarget: false,
  },
  {
    id: "admin4_border",
    groupId: "borders",
    label: "4th admin. div. border",
    promptNoun: "a fourth-level administrative division border",
    subject: "location",
    targetKind: "linear",
    overpassSelectors: [],
    linearSelectors: ['["boundary"="administrative"]["admin_level"="9"]'],
    supportsSearch: false,
    supportsNearest: false,
    supportsMapTarget: false,
  },
  {
    id: "sea_level",
    groupId: "natural",
    label: "Sea level",
    promptNoun: "sea level",
    subject: "sea_level",
    targetKind: "sea_level",
    overpassSelectors: [],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: false,
    supportsMapTarget: false,
  },
  {
    id: "body_of_water",
    groupId: "natural",
    label: "Body of water",
    promptNoun: "a body of water",
    subject: "location",
    targetKind: "point",
    overpassSelectors: [
      '["natural"="water"]',
      '["water"="lake"]',
      '["water"="reservoir"]',
      '["water"="pond"]',
      '["landuse"="reservoir"]',
      '["natural"="bay"]',
    ],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "coastline",
    groupId: "natural",
    label: "Coastline",
    promptNoun: "a coastline",
    subject: "coastline",
    targetKind: "coastline",
    overpassSelectors: [],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: false,
    supportsMapTarget: false,
  },
  {
    id: "mountain",
    groupId: "natural",
    label: "Mountain",
    promptNoun: "a mountain",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["natural"="peak"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "park",
    groupId: "natural",
    label: "Park",
    promptNoun: "a park",
    subject: "location",
    targetKind: "point",
    overpassSelectors: [
      '["leisure"="park"]',
      '["boundary"="national_park"]',
      '["boundary"="protected_area"]["protect_class"]',
    ],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "amusement_park",
    groupId: "poi",
    label: "Amusement park",
    promptNoun: "an amusement park",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["tourism"="theme_park"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "zoo",
    groupId: "poi",
    label: "Zoo",
    promptNoun: "a zoo",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["tourism"="zoo"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "aquarium",
    groupId: "poi",
    label: "Aquarium",
    promptNoun: "an aquarium",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["tourism"="aquarium"]', '["amenity"="aquarium"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "golf_course",
    groupId: "poi",
    label: "Golf course",
    promptNoun: "a golf course",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["leisure"="golf_course"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "museum",
    groupId: "poi",
    label: "Museum",
    promptNoun: "a museum",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["tourism"="museum"]', '["amenity"="museum"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "movie_theater",
    groupId: "poi",
    label: "Movie theater",
    promptNoun: "a movie theater",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["amenity"="cinema"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "custom_place",
    groupId: "poi",
    label: "Custom place",
    promptNoun: "this place",
    subject: "location",
    targetKind: "point",
    overpassSelectors: [],
    linearSelectors: [],
    supportsSearch: true,
    supportsNearest: false,
    supportsMapTarget: true,
  },
  {
    id: "hospital",
    groupId: "public_utilities",
    label: "Hospital",
    promptNoun: "a hospital",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["amenity"="hospital"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "library",
    groupId: "public_utilities",
    label: "Library",
    promptNoun: "a library",
    subject: "location",
    targetKind: "point",
    overpassSelectors: ['["amenity"="library"]'],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
  {
    id: "foreign_consulate",
    groupId: "public_utilities",
    label: "Foreign consulate",
    promptNoun: "a foreign consulate",
    subject: "location",
    targetKind: "point",
    overpassSelectors: [
      '["office"="diplomatic"]["diplomatic"="consulate"]',
      '["amenity"="consulate"]',
    ],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  },
] as const satisfies ReadonlyArray<MeasuringCatalogOption>;

export const DEFAULT_MEASURING_FROM_KIND: MeasuringLocationCategory = "zoo";

export const MEASURE_RULE_SUMMARY =
  "Set your anchor, then pick what you're measuring from. The shade uses your distance to that target.";

export const COASTLINE_DEFINITION =
  "A coastline is where land meets the ocean, a great lake, or a body of water that flows into the ocean or a great lake. That waterway must stay at least one mile wide along its whole route.";

export const COASTLINE_MEASURING_QUESTION: MeasuringQuestionDefinition = {
  subject: "coastline",
  prompt: "Compared to me, are you closer to or further from a coastline?",
  ruleSummary: COASTLINE_DEFINITION,
};

export const SEA_LEVEL_DEFINITION =
  "Sea level is your altitude above or below 0 m. Closer to sea level means lower altitude; further means higher. Use your phone compass altitude as the official measure.";

export const SEA_LEVEL_MEASURING_QUESTION: MeasuringQuestionDefinition = {
  subject: "sea_level",
  prompt: "Compared to me, are you closer to or further from sea level?",
  ruleSummary: SEA_LEVEL_DEFINITION,
};

export const BODY_OF_WATER_DEFINITION =
  "Any named body of water on your mapping app counts, except pools. Measure to the map label at its center, same as parks and other POI measuring questions.";

export const BODY_OF_WATER_MEASURING_QUESTION: MeasuringQuestionDefinition = {
  subject: "location",
  prompt: "Compared to me, are you closer to or further from a body of water?",
  ruleSummary: BODY_OF_WATER_DEFINITION,
};
