import type { LatLngTuple } from "../geometry/core/types";

/**
 * London fallback map center when no session play-area exists yet.
 * Callers must prefer `gameAreaCenter(gameArea)` once a real (non-placeholder)
 * play area is available — do not invent per-screen demo coords.
 */
export const DEFAULT_MAP_CENTER: LatLngTuple = [51.505, -0.09];

/** MapLibre `LngLatLike` form of {@link DEFAULT_MAP_CENTER}. */
export const DEFAULT_MAP_LNGLAT: [number, number] = [
  DEFAULT_MAP_CENTER[1],
  DEFAULT_MAP_CENTER[0],
];
