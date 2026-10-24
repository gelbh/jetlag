/** Muster dials for Castle Siege setup (§9 / Skin-S3). */

export type CastleSiegeDials = {
  zoneRadiusMeters: number;
  turnLengthSeconds: number;
  maxRounds: number;
  beltWidthMeters: number;
  breachToleranceMeters: number;
  siegeLimitSeconds: number;
};

export const DEFAULT_CASTLE_SIEGE_DIALS: CastleSiegeDials = {
  zoneRadiusMeters: 500,
  turnLengthSeconds: 300,
  maxRounds: 12,
  beltWidthMeters: 200,
  breachToleranceMeters: 50,
  siegeLimitSeconds: 1800,
};

const RANGES = {
  zoneRadiusMeters: { min: 100, max: 5000 },
  turnLengthSeconds: { min: 60, max: 3600 },
  maxRounds: { min: 1, max: 50 },
  beltWidthMeters: { min: 10, max: 5000 },
  breachToleranceMeters: { min: 1, max: 500 },
  siegeLimitSeconds: { min: 60, max: 7200 },
} as const satisfies Record<keyof CastleSiegeDials, { min: number; max: number }>;

function clampDial(key: keyof CastleSiegeDials, value: number): number {
  const { min, max } = RANGES[key];
  if (!Number.isFinite(value)) {
    return DEFAULT_CASTLE_SIEGE_DIALS[key];
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Merge partial dials onto defaults and clamp into allowed ranges. */
export function normalizeCastleSiegeDials(
  partial: Partial<CastleSiegeDials> = {},
): CastleSiegeDials {
  return {
    zoneRadiusMeters: clampDial(
      "zoneRadiusMeters",
      partial.zoneRadiusMeters ?? DEFAULT_CASTLE_SIEGE_DIALS.zoneRadiusMeters,
    ),
    turnLengthSeconds: clampDial(
      "turnLengthSeconds",
      partial.turnLengthSeconds ?? DEFAULT_CASTLE_SIEGE_DIALS.turnLengthSeconds,
    ),
    maxRounds: clampDial("maxRounds", partial.maxRounds ?? DEFAULT_CASTLE_SIEGE_DIALS.maxRounds),
    beltWidthMeters: clampDial(
      "beltWidthMeters",
      partial.beltWidthMeters ?? DEFAULT_CASTLE_SIEGE_DIALS.beltWidthMeters,
    ),
    breachToleranceMeters: clampDial(
      "breachToleranceMeters",
      partial.breachToleranceMeters ?? DEFAULT_CASTLE_SIEGE_DIALS.breachToleranceMeters,
    ),
    siegeLimitSeconds: clampDial(
      "siegeLimitSeconds",
      partial.siegeLimitSeconds ?? DEFAULT_CASTLE_SIEGE_DIALS.siegeLimitSeconds,
    ),
  };
}

/** Parse a Firestore dials map; returns undefined when shape is unusable. */
export function parseCastleSiegeDials(value: unknown): CastleSiegeDials | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(DEFAULT_CASTLE_SIEGE_DIALS) as (keyof CastleSiegeDials)[];
  const hasAny = keys.some((key) => typeof record[key] === "number");
  if (!hasAny) {
    return undefined;
  }

  const partial: Partial<CastleSiegeDials> = {};
  for (const key of keys) {
    if (typeof record[key] === "number") {
      partial[key] = record[key] as number;
    }
  }
  return normalizeCastleSiegeDials(partial);
}
