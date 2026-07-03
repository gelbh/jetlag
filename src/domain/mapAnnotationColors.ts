/**
 * Leaflet overlay stroke/fill colors. for map annotations, not HUD UI tokens.
 */
export const MAP_ANNOTATION_COLORS = {
  playArea: "#38bdf8",
  playAreaMask: "#020617",
  pin: "#38bdf8",
  pinAccent: "#0ea5e9",
  radar: "#ef4444",
  zone: "#a855f7",
  zoneDraft: "#a855f7",
  tentacle: "#22c55e",
  tentacleAccent: "#4ade80",
  elimination: "#ef4444",
  eliminationSoft: "#f87171",
  caution: "#fb923c",
  highlight: "#fef08a",
  measuring: "#c084fc",
  strokeLight: "#ffffff",
  userLocation: "#4285F4",
  transit: {
    rail: "#f8fafc",
    metro: "#38bdf8",
    tram: "#22c55e",
    bus: "#f59e0b",
    ferry: "#a78bfa",
    other: "#94a3b8",
  },
} as const;

export const MAP_ZONE_DRAFT_PATH = {
  color: MAP_ANNOTATION_COLORS.zoneDraft,
  dashArray: "6 6",
  fillOpacity: 0.15,
} as const;
