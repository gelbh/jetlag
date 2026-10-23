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

export function bearingToCastleSiegeCompassCardinal(
  bearingDeg: number,
): CastleSiegeCompassCardinal {
  const normalized = ((bearingDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return CASTLE_SIEGE_COMPASS_CARDINALS[index]!;
}
