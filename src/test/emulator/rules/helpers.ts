import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { milesToMeters } from "../../../domain/map/distance";
import { serializeGameAreaForFirestore } from "../../../services/firestore/firestoreSerialization";
import { DUBLIN_CITY_GAME_AREA } from "../../fixtures/dublinGameArea";

export const PROJECT_ID = "demo-jetlag-rules";
export const ADMIN_EMAIL = "gelbharttomer@gmail.com";

export function adminContext(testEnv: RulesTestEnvironment, uid = "admin-1") {
  return testEnv.authenticatedContext(uid, {
    email: ADMIN_EMAIL,
    email_verified: true,
  });
}

export function sessionPayload(
  hostUid: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    code: "ABCD",
    gameArea: serializeGameAreaForFirestore(DUBLIN_CITY_GAME_AREA),
    hostUid,
    createdAt: "2026-01-01T00:00:00.000Z",
    memberUids: [hostUid],
    memberRoles: { [hostUid]: "seeker" },
    gameSize: "medium",
    hidingZoneRadiusMeters: milesToMeters(0.25),
    tier: "free",
    status: "active",
    timerAccumulatedMs: 0,
    timerRunningSince: null,
    ...overrides,
  };
}

export function annotationPayload() {
  return {
    type: "pin",
    geometryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-6.26, 53.35] },
    }),
    metadata: { createdAt: "2026-01-01T00:00:00.000Z", label: "Test" },
    status: "active",
  };
}

export function hidingZonePayload() {
  return {
    stationId: "station-1",
    stationName: "Test Station",
    center: { lat: 53.35, lng: -6.26 },
    radiusMeters: milesToMeters(0.25),
    geometryJson: JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [-6.26, 53.35],
          [-6.25, 53.35],
          [-6.25, 53.36],
          [-6.26, 53.35],
        ],
      ],
    }),
    status: "confirmed",
    confirmedAt: "2026-01-01T00:00:00.000Z",
  };
}

export function playerLocationPayload(role: "seeker" | "hider" = "seeker") {
  return {
    lat: 53.35,
    lng: -6.26,
    updatedAt: "2026-01-01T00:00:00.000Z",
    role,
  };
}

export function timeTrapPayload() {
  return {
    stationId: "station-1",
    stationName: "Test Station",
    center: { lat: 53.35, lng: -6.26 },
    bonusMinutes: 5,
    placedAt: "2026-01-01T00:00:00.000Z",
  };
}

export type RulesTestEnvBox = {
  /** Populated by beforeAll; safe to read from it()/beforeEach. */
  testEnv: RulesTestEnvironment;
};

/** Call inside a describe() to bind RulesTestEnvironment lifecycle hooks. */
export function bindRulesTestEnv(): RulesTestEnvBox {
  const box = {} as RulesTestEnvBox;

  beforeAll(async () => {
    box.testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      },
    });
  });

  afterAll(async () => {
    await box.testEnv.cleanup();
  });

  beforeEach(async () => {
    await box.testEnv.clearFirestore();
  });

  return box;
}
