import { z } from "zod";

const gameAreaSchema = z.object({
  south: z.number().finite(),
  west: z.number().finite(),
  north: z.number().finite(),
  east: z.number().finite(),
  geometryJson: z.string().optional(),
});

const rulesPatchSchema = z
  .object({
    hidingZoneRadiusMeters: z.number().finite().optional(),
    hidingPeriodMinutes: z.number().int().min(5).max(360).optional(),
    photoAnswerDeadlineMinutes: z.number().int().min(5).max(60).optional(),
    questionAnswerDeadlineMinutes: z.number().int().min(2).max(30).optional(),
    disabledTools: z.array(z.string()).max(8).optional(),
    tentaclesEnabled: z.boolean().optional(),
    thermometerPresetMiles: z.array(z.number().finite()).max(4).optional(),
    thermometerPresetMeters: z.array(z.number().finite()).max(4).optional(),
    tentacleMediumRadiusMeters: z.number().finite().optional(),
    tentacleLargeRadiusMeters: z.number().finite().optional(),
    expansionPackEnabled: z.boolean().optional(),
    customQuestionPackEnabled: z.boolean().optional(),
    previewQuestionBeforeSend: z.boolean().optional(),
    regionPackId: z.string().optional(),
  })
  .passthrough();

export const createPremiumSessionInputSchema = z.object({
  gameArea: gameAreaSchema,
  transitMetroId: z.string().min(1).optional(),
  transitStationFilter: z
    .union([
      z.literal("all"),
      z.enum(["rail", "metro", "tram", "bus", "ferry", "funicular", "other"]),
      // Recoverable: empty / unknown tokens → normalizeTransitStationFilter
      z.array(z.string()),
    ])
    .optional(),
  hostRole: z.enum(["seeker", "hider"]).default("seeker"),
  gameSize: z.enum(["small", "medium", "large"]).default("medium"),
  distanceUnit: z.enum(["imperial", "metric"]).default("imperial"),
  hostAppVersion: z.string().min(1).max(32),
  rulesPatch: rulesPatchSchema.default({}),
});

const TRANSIT_ROUTE_MODES = ["rail", "metro", "tram", "bus", "ferry", "funicular", "other"];
const TRANSIT_ROUTE_MODE_SET = new Set(TRANSIT_ROUTE_MODES);
const MODE_SORT_INDEX = new Map(TRANSIT_ROUTE_MODES.map((mode, index) => [mode, index]));

/**
 * Mirror of `normalizeTransitStationFilter` (src/domain/map/transit.ts).
 * @param {unknown} raw
 * @returns {"all" | string[]}
 */
function normalizeTransitStationFilter(raw) {
  if (raw === undefined || raw === null || raw === "all") {
    return "all";
  }
  if (typeof raw === "string") {
    return TRANSIT_ROUTE_MODE_SET.has(raw) ? [raw] : "all";
  }
  if (!Array.isArray(raw)) {
    return "all";
  }
  const unique = new Set();
  for (const entry of raw) {
    if (typeof entry === "string" && TRANSIT_ROUTE_MODE_SET.has(entry)) {
      unique.add(entry);
    }
  }
  if (unique.size === 0) {
    return "all";
  }
  return [...unique].sort((a, b) => (MODE_SORT_INDEX.get(a) ?? 0) - (MODE_SORT_INDEX.get(b) ?? 0));
}

const QUARTER_MILE_METERS = 402.336;
const HALF_MILE_METERS = 804.672;

/**
 * @param {'small' | 'medium' | 'large'} gameSize
 */
function defaultHidingZoneRadiusMeters(gameSize) {
  return gameSize === "large" ? HALF_MILE_METERS : QUARTER_MILE_METERS;
}

/**
 * @param {z.infer<typeof createPremiumSessionInputSchema>} input
 * @param {string} code
 * @param {string} hostUid
 * @param {string} createdAt
 */
export function buildPremiumSessionFirestoreDocument(input, code, hostUid, createdAt) {
  const radiusMeters =
    typeof input.rulesPatch.hidingZoneRadiusMeters === "number"
      ? input.rulesPatch.hidingZoneRadiusMeters
      : defaultHidingZoneRadiusMeters(input.gameSize);

  const gameAreaPayload = {
    south: input.gameArea.south,
    west: input.gameArea.west,
    north: input.gameArea.north,
    east: input.gameArea.east,
  };

  if (input.gameArea.geometryJson) {
    gameAreaPayload.geometryJson = input.gameArea.geometryJson;
  }

  // Pack matching GeoJSON is reloaded client-side; never embed it (AU STE >1MiB).
  const { customMatchingAreas: _omitPackMatching, ...rulesPatch } = input.rulesPatch;
  const remoteRulesPatch =
    typeof rulesPatch.regionPackId === "string" && rulesPatch.regionPackId.length > 0
      ? rulesPatch
      : input.rulesPatch;

  const payload = {
    code,
    gameArea: gameAreaPayload,
    hostUid,
    createdAt,
    memberUids: [hostUid],
    memberRoles: { [hostUid]: input.hostRole },
    roleGates: {
      version: 1,
      leaders: { [input.hostRole]: hostUid },
    },
    gameSize: input.gameSize,
    distanceUnit: input.distanceUnit,
    hidingZoneRadiusMeters: radiusMeters,
    tier: "premium",
    status: "active",
    timerAccumulatedMs: 0,
    timerRunningSince: null,
    hostAppVersion: input.hostAppVersion,
    ...remoteRulesPatch,
  };

  if (input.transitMetroId) {
    payload.transitMetroId = input.transitMetroId;
  }

  const transitStationFilter = normalizeTransitStationFilter(input.transitStationFilter);
  if (transitStationFilter !== "all") {
    // Dual-write: single mode as legacy string for older clients; multi as array.
    payload.transitStationFilter =
      transitStationFilter.length === 1 ? transitStationFilter[0] : transitStationFilter;
  }

  return payload;
}

/**
 * @param {unknown} value
 */
export function parseCreatePremiumSessionInput(value) {
  return createPremiumSessionInputSchema.parse(value);
}
