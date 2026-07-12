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
  hostRole: z.enum(["seeker", "hider"]).default("seeker"),
  gameSize: z.enum(["small", "medium", "large"]).default("medium"),
  distanceUnit: z.enum(["imperial", "metric"]).default("imperial"),
  hostAppVersion: z.string().min(1).max(32),
  rulesPatch: rulesPatchSchema.default({}),
});

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
export function buildPremiumSessionFirestoreDocument(
  input,
  code,
  hostUid,
  createdAt,
) {
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

  const payload = {
    code,
    gameArea: gameAreaPayload,
    hostUid,
    createdAt,
    memberUids: [hostUid],
    memberRoles: { [hostUid]: input.hostRole },
    gameSize: input.gameSize,
    distanceUnit: input.distanceUnit,
    hidingZoneRadiusMeters: radiusMeters,
    tier: "premium",
    status: "active",
    timerAccumulatedMs: 0,
    timerRunningSince: null,
    hostAppVersion: input.hostAppVersion,
    ...input.rulesPatch,
  };

  if (input.transitMetroId) {
    payload.transitMetroId = input.transitMetroId;
  }

  return payload;
}

/**
 * @param {unknown} value
 */
export function parseCreatePremiumSessionInput(value) {
  return createPremiumSessionInputSchema.parse(value);
}
