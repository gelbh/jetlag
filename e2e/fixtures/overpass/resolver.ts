export type OverpassFixtureProfile = "default" | "empty";

const DUBLIN_STATIONS = [
  {
    id: 1001,
    tags: { railway: "station", name: "Dublin Central" },
    lat: 53.35,
    lon: -6.26,
  },
  {
    id: 1002,
    tags: { railway: "station", name: "North Station" },
    lat: 53.38,
    lon: -6.3,
  },
  {
    id: 1003,
    tags: { railway: "halt", name: "South Halt" },
    lat: 53.32,
    lon: -6.22,
  },
  {
    id: 1004,
    tags: { highway: "bus_stop", ref: "51" },
    lat: 53.345,
    lon: -6.255,
  },
] as const;

const DUBLIN_MUSEUMS = [
  {
    id: 2001,
    tags: { tourism: "museum", name: "National Museum" },
    lat: 53.34,
    lon: -6.25,
  },
  {
    id: 2002,
    tags: { amenity: "museum", name: "City Gallery" },
    lat: 53.36,
    lon: -6.28,
  },
] as const;

const DUBLIN_TENTACLE = [
  {
    id: 3001,
    tags: { tourism: "museum", name: "City Museum" },
    lat: 53.351,
    lon: -6.259,
  },
  {
    id: 3002,
    tags: { amenity: "museum", name: "Harbour Museum" },
    lat: 53.348,
    lon: -6.262,
  },
] as const;

function fixtureBody(elements: readonly unknown[]): string {
  return JSON.stringify({ elements });
}

export function resolveOverpassResponse(
  query: string,
  profile: OverpassFixtureProfile,
): string {
  if (profile === "empty") {
    return JSON.stringify({ elements: [] });
  }

  const normalized = query.toLowerCase();

  if (normalized.includes("around:")) {
    return fixtureBody(DUBLIN_TENTACLE);
  }

  if (
    normalized.includes("museum") ||
    normalized.includes("tourism") ||
    normalized.includes("amenity")
  ) {
    return fixtureBody(DUBLIN_MUSEUMS);
  }

  if (
    normalized.includes("railway") ||
    normalized.includes("public_transport") ||
    normalized.includes("station=") ||
    normalized.includes("bus_stop")
  ) {
    return fixtureBody(DUBLIN_STATIONS);
  }

  return fixtureBody([
    ...DUBLIN_STATIONS,
    ...DUBLIN_MUSEUMS,
    ...DUBLIN_TENTACLE,
  ]);
}
