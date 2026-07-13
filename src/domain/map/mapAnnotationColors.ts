/**
 * Leaflet overlay stroke/fill colors for map annotations, not HUD UI tokens.
 * Palette aligned with Jet Lag show broadcast maps and Hide+Seek product art.
 */
export const MAP_ANNOTATION_COLORS = {
  playArea: "#4378B1",
  playAreaMask: "#1D2835",
  pin: "#4378B1",
  pinAccent: "#588CBC",
  radar: "#E4B352",
  radarDraft: "#E4B352",
  zone: "#26599B",
  zoneDraft: "#4378B1",
  tentacle: "#22c55e",
  tentacleAccent: "#4ade80",
  elimination: "#1D2835",
  eliminationSoft: "#C55B40",
  caution: "#C55B40",
  highlight: "#E4B352",
  measuring: "#588CBC",
  thermometerA: "#C55B40",
  thermometerB: "#E4B352",
  thermometerAxis: "#C55B40",
  thermometerQuietRadar: "#588CBC",
  thermometerWalkRemaining: "#4378B1",
  boundary: "#4378B1",
  strokeLight: "#ffffff",
  userLocation: "#26599B",
  seekerLive: "#E4B352",
  hidingZone: "#22c55e",
  hidingZoneOwn: "#4ade80",
  transit: {
    rail: "#1D2835",
    metro: "#4378B1",
    tram: "#22c55e",
    bus: "#E4B352",
    ferry: "#588CBC",
    other: "#A8B0B8",
  },
} as const;

export const MAP_ZONE_DRAFT_PATH = {
  color: MAP_ANNOTATION_COLORS.zoneDraft,
  dashArray: "6 6",
  fillOpacity: 0.15,
} as const;
