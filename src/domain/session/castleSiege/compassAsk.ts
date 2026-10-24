/**
 * Thin Castle Siege Compass ask answer shape (S6).
 * Full map chrome lands in Task 5; Functions oracle returns these ids only.
 */

export const CASTLE_SIEGE_COMPASS_CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export type CastleSiegeCompassCardinal = (typeof CASTLE_SIEGE_COMPASS_CARDINALS)[number];

export type CastleSiegeCompassAsk = {
  kind: "compass";
  point: { lat: number; lng: number };
};

export type CastleSiegeCompassOracleReceipt = {
  kind: "compass";
  answer: CastleSiegeCompassCardinal;
};

/** Map bearing degrees [0, 360) to an 8-point cardinal (same rule as Functions). */
export function bearingToCastleSiegeCompassCardinal(
  bearingDeg: number,
): CastleSiegeCompassCardinal {
  const normalized = ((bearingDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return CASTLE_SIEGE_COMPASS_CARDINALS[index]!;
}
