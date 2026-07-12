import { z } from "zod";

export const firestoreGameAreaSchema = z
  .object({
    south: z.number().finite(),
    west: z.number().finite(),
    north: z.number().finite(),
    east: z.number().finite(),
    geometryJson: z.string().optional(),
  })
  .passthrough();

export const sessionDocumentSchema = z
  .object({
    code: z.string().optional(),
    gameArea: z.unknown(),
    hostUid: z.string().optional(),
    createdAt: z.unknown(),
    memberUids: z.array(z.string()).optional(),
    memberRoles: z.record(z.string(), z.enum(["seeker", "hider", "observer"])).optional(),
    gameSize: z.enum(["small", "medium", "large"]).optional(),
    distanceUnit: z.enum(["imperial", "metric"]).optional(),
    hidingZoneRadiusMeters: z.number().finite().optional(),
    hidingPeriodMinutes: z.number().finite().optional(),
    photoAnswerDeadlineMinutes: z.number().finite().optional(),
    questionAnswerDeadlineMinutes: z.number().finite().optional(),
    disabledTools: z.array(z.string()).optional(),
    tentaclesEnabled: z.boolean().optional(),
    thermometerPresetMiles: z.array(z.number().finite()).optional(),
    thermometerPresetMeters: z.array(z.number().finite()).optional(),
    tentacleMediumRadiusMeters: z.number().finite().optional(),
    tentacleLargeRadiusMeters: z.number().finite().optional(),
    customMatchingAreas: z.record(z.string(), z.unknown()).optional(),
    customCategories: z.array(z.unknown()).optional(),
    customLocationPins: z.array(z.unknown()).optional(),
    customMeasureGeometries: z.array(z.unknown()).optional(),
    regionPackId: z.string().optional(),
    regionPackSubregionId: z.string().optional(),
    bundledGeoRevision: z.number().int().positive().optional(),
    expansionPackEnabled: z.boolean().optional(),
    customQuestionPackEnabled: z.boolean().optional(),
    previewQuestionBeforeSend: z.boolean().optional(),
    tier: z.enum(["free", "premium"]).optional(),
    transitMetroId: z.string().optional(),
    endedAt: z.string().optional(),
    status: z.enum(["active", "ended"]).optional(),
    timerAccumulatedMs: z.number().finite().optional(),
    timerRunningSince: z.union([z.string(), z.null()]).optional(),
    endGameStartedAt: z.string().optional(),
    endGameStartedByUid: z.string().optional(),
    endGameRequestedAt: z.string().optional(),
    endGameRequestedByUid: z.string().optional(),
    hostAppVersion: z.string().optional(),
    memberAppVersions: z.record(z.string(), z.string()).optional(),
  })
  .passthrough()
  .refine((value) => value.gameArea !== undefined && value.gameArea !== null, {
    message: "Session game area is missing or invalid.",
  });

export const annotationDocumentSchema = z
  .object({
    type: z.string().min(1),
    geometryJson: z.string().optional(),
    geometry: z.unknown().optional(),
    metadata: z.unknown().optional(),
    status: z.string().optional(),
    updatedAt: z.unknown().optional(),
  })
  .passthrough()
  .refine((value) => Boolean(value.geometryJson || value.geometry), {
    message: "Annotation geometry is missing.",
  });

export const pendingQuestionDocumentSchema = z
  .object({
    toolType: z.string().min(1),
    createdByUid: z.string().optional(),
    createdAt: z.unknown().optional(),
    status: z
      .enum(["walking", "pending", "answered", "resolved", "cancelled"])
      .optional(),
    placement: z
      .object({
        geometryJson: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
    replyOptions: z.array(z.unknown()).optional(),
    promptText: z.string().optional(),
    answer: z.unknown().optional(),
    answerableAt: z.string().optional(),
    deadlineExpiredAt: z.string().optional(),
    answeredLate: z.boolean().optional(),
    resolvedAnnotationId: z.string().optional(),
    cardDraw: z.number().finite().optional(),
    cardKeep: z.number().finite().optional(),
  })
  .passthrough();

export type SessionDocument = z.infer<typeof sessionDocumentSchema>;
export type AnnotationDocument = z.infer<typeof annotationDocumentSchema>;
export type PendingQuestionDocument = z.infer<typeof pendingQuestionDocumentSchema>;

export const userEntitlementsDocumentSchema = z
  .object({
    stripeCustomerId: z.string().optional(),
    premiumSessionCredits: z.number().finite().optional(),
    lifetimePremium: z.boolean().optional(),
    subscription: z
      .object({
        status: z.string().optional(),
        plan: z.enum(["monthly", "yearly"]).optional(),
        currentPeriodEnd: z.unknown().optional(),
        stripeSubscriptionId: z.string().optional(),
      })
      .optional(),
    trialUsedAt: z.unknown().optional(),
    trialEndsAt: z.unknown().optional(),
    updatedAt: z.unknown().optional(),
  })
  .passthrough();

export type UserEntitlementsDocument = z.infer<
  typeof userEntitlementsDocumentSchema
>;
