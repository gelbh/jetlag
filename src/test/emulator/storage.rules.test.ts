import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { milesToMeters } from "../../domain/map/distance";
import { serializeGameAreaForFirestore } from "../../services/firestore/firestoreSerialization";
import { DUBLIN_CITY_GAME_AREA } from "../fixtures/dublinGameArea";

const PROJECT_ID = "demo-jetlag";

function sessionPayload(
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

async function seedSession(
  testEnv: RulesTestEnvironment,
  sessionId: string,
  payload: Record<string, unknown>,
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .collection("sessions")
      .doc(sessionId)
      .set(payload);
  });
}

describe("storage.rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(
          resolve(process.cwd(), "firestore.rules"),
          "utf8",
        ),
      },
      storage: {
        rules: readFileSync(resolve(process.cwd(), "storage.rules"), "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  async function clearEmulatorData() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await testEnv.clearFirestore();
        await testEnv.clearStorage();
        return;
      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
  }

  beforeEach(async () => {
    await clearEmulatorData();
  });

  it("allows hider members to upload photo answers", async () => {
    await seedSession(testEnv, "session-1", {
      ...sessionPayload("host-1"),
      memberUids: ["host-1", "hider-1"],
      memberRoles: { "host-1": "seeker", "hider-1": "hider" },
    });

    const hider = testEnv.authenticatedContext("hider-1");
    const ref = hider
      .storage()
      .ref("sessions/session-1/photoAnswers/q1/1700000000000.jpg");

    await assertSucceeds(
      ref.put(new Uint8Array([0xff, 0xd8, 0xff]), {
        contentType: "image/jpeg",
      }),
    );
  });

  it("denies seeker uploads for photo answers", async () => {
    await seedSession(testEnv, "session-1", {
      ...sessionPayload("host-1"),
      memberUids: ["host-1", "hider-1"],
      memberRoles: { "host-1": "seeker", "hider-1": "hider" },
    });

    const seeker = testEnv.authenticatedContext("host-1");
    const ref = seeker
      .storage()
      .ref("sessions/session-1/photoAnswers/q1/1700000000000.jpg");

    await assertFails(
      ref.put(new Uint8Array([0xff, 0xd8, 0xff]), {
        contentType: "image/jpeg",
      }),
    );
  });

  it("denies non-members from reading or writing photo answers", async () => {
    await seedSession(testEnv, "session-1", sessionPayload("host-1"));

    const outsider = testEnv.authenticatedContext("outsider-1");
    const ref = outsider
      .storage()
      .ref("sessions/session-1/photoAnswers/q1/1700000000000.jpg");

    await assertFails(ref.getMetadata());
    await assertFails(
      ref.put(new Uint8Array([0xff, 0xd8, 0xff]), {
        contentType: "image/jpeg",
      }),
    );
  });

  it("denies legacy sessions without memberRoles from hider uploads", async () => {
    await seedSession(testEnv, "session-legacy", {
      ...sessionPayload("host-1"),
      memberUids: ["host-1", "hider-1"],
      memberRoles: null,
    });

    const hider = testEnv.authenticatedContext("hider-1");
    const ref = hider
      .storage()
      .ref("sessions/session-legacy/photoAnswers/q1/1700000000000.jpg");

    await assertFails(
      ref.put(new Uint8Array([0xff, 0xd8, 0xff]), {
        contentType: "image/jpeg",
      }),
    );
  });

  it("denies hider uploads when memberRoles omits the uid", async () => {
    await seedSession(testEnv, "session-1", {
      ...sessionPayload("host-1"),
      memberUids: ["host-1", "hider-1"],
      memberRoles: { "host-1": "seeker" },
    });

    const hider = testEnv.authenticatedContext("hider-1");
    const ref = hider
      .storage()
      .ref("sessions/session-1/photoAnswers/q1/1700000000000.jpg");

    await assertFails(
      ref.put(new Uint8Array([0xff, 0xd8, 0xff]), {
        contentType: "image/jpeg",
      }),
    );
  });

  it("allows session members to read photo answers", async () => {
    await seedSession(testEnv, "session-1", {
      ...sessionPayload("host-1"),
      memberUids: ["host-1", "hider-1"],
      memberRoles: { "host-1": "seeker", "hider-1": "hider" },
    });

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .storage()
        .ref("sessions/session-1/photoAnswers/q1/1700000000000.jpg")
        .put(new Uint8Array([0xff, 0xd8, 0xff]), {
          contentType: "image/jpeg",
        });
    });

    const seeker = testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      seeker
        .storage()
        .ref("sessions/session-1/photoAnswers/q1/1700000000000.jpg")
        .getMetadata(),
    );
  });
});
