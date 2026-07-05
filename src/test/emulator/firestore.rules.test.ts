import { deleteField } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { serializeGameAreaForFirestore } from "../../services/firestoreSerialization";
import { DUBLIN_CITY_GAME_AREA } from "../fixtures/dublinGameArea";

const PROJECT_ID = "demo-jetlag-rules";

function sessionPayload(hostUid: string, overrides: Record<string, unknown> = {}) {
  return {
    code: "ABCD",
    gameArea: serializeGameAreaForFirestore(DUBLIN_CITY_GAME_AREA),
    hostUid,
    createdAt: "2026-01-01T00:00:00.000Z",
    memberUids: [hostUid],
    tier: "free",
    status: "active",
    timerAccumulatedMs: 0,
    timerRunningSince: null,
    ...overrides,
  };
}

function annotationPayload() {
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

describe("firestore.rules", () => {
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
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("allows a signed-in host to create a free session", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .set(sessionPayload("host-1")),
    );
  });

  it("denies premium session creation without host access claim", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-premium")
        .set(sessionPayload("host-1", { tier: "premium" })),
    );
  });

  it("allows members to read and write annotations", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = testEnv.authenticatedContext("guest-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({ memberUids: ["host-1", "guest-1"] });

    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });

  it("denies annotation writes from non-members", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const outsider = testEnv.authenticatedContext("outsider-1");
    await assertFails(
      outsider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });

  it("allows the host to end a session", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        endedAt: "2026-01-02T00:00:00.000Z",
        status: "ended",
        code: deleteField(),
      }),
    );
  });

  it("allows the host to update timer fields", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        timerAccumulatedMs: 120_000,
        timerRunningSince: "2026-01-01T00:01:00.000Z",
      }),
    );
  });

  it("rejects invalid annotation types", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set({
          ...annotationPayload(),
          type: "invalid",
        }),
    );
  });

  it("requires sign-in for session reads", async () => {
    const unauthenticated = testEnv.unauthenticatedContext();
    await assertFails(
      unauthenticated
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .get(),
    );
  });

  it("stores session documents with expected host uid", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const snapshot = await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .get();

    expect(snapshot.data()?.hostUid).toBe("host-1");
  });
});
