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
import { milesToMeters } from "../../domain/map/distance";
import { serializeGameAreaForFirestore } from "../../services/firestore/firestoreSerialization";
import { DUBLIN_CITY_GAME_AREA } from "../fixtures/dublinGameArea";

const PROJECT_ID = "demo-jetlag-rules";

function sessionPayload(hostUid: string, overrides: Record<string, unknown> = {}) {
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

function hidingZonePayload() {
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

function timeTrapPayload() {
  return {
    stationId: "station-1",
    stationName: "Test Station",
    center: { lat: 53.35, lng: -6.26 },
    bonusMinutes: 5,
    placedAt: "2026-01-01T00:00:00.000Z",
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

  it("allows signed-in users to look up sessions by code", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));
    await host
      .firestore()
      .collection("sessionCodes")
      .doc("ABCD")
      .set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = testEnv.authenticatedContext("guest-1");
    await assertSucceeds(
      guest.firestore().collection("sessionCodes").doc("ABCD").get(),
    );
    await assertSucceeds(
      guest.firestore().collection("sessions").doc("session-1").get(),
    );
  });

  it("allows a guest to join an active session as hider with memberAppVersions", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          hostAppVersion: "0.2.1",
        }),
      );
    await host
      .firestore()
      .collection("sessionCodes")
      .doc("ABCD")
      .set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = testEnv.authenticatedContext("guest-1");
    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "hider" },
          memberAppVersions: { "guest-1": "0.2.1" },
        }),
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

  it("allows seeker members to read and write annotations", async () => {
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
      .update({
        memberUids: ["host-1", "guest-1"],
        memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
      });

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

  it("denies annotation writes from hiders", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });

  it("allows hiders to write their own hiding zone", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("hider-1")
        .set(hidingZonePayload()),
    );
  });

  it("denies seekers from writing hiding zones", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = testEnv.authenticatedContext("seeker-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1"],
        memberRoles: { "host-1": "seeker", "seeker-1": "seeker" },
      });

    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("seeker-1")
        .set(hidingZonePayload()),
    );
  });

  it("denies hiders from writing another player's hiding zone doc", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("other-hider")
        .set(hidingZonePayload()),
    );
  });

  it("allows hiders to write their own time trap", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("timeTraps")
        .doc("hider-1")
        .set(timeTrapPayload()),
    );
  });

  it("denies seekers from writing time traps", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = testEnv.authenticatedContext("seeker-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1"],
        memberRoles: { "host-1": "seeker", "seeker-1": "seeker" },
      });

    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("timeTraps")
        .doc("seeker-1")
        .set(timeTrapPayload()),
    );
  });

  it("denies hiders from writing another player's time trap doc", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("timeTraps")
        .doc("other-hider")
        .set(timeTrapPayload()),
    );
  });

  it("allows hiders to post game system messages", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-1")
        .set({
          channel: "game",
          senderUid: "hider-1",
          senderRole: "hider",
          createdAt: "2026-01-01T00:00:00.000Z",
          kind: "system",
          text: "Hider confirmed zone at Dublin Central.",
        }),
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

  it("denies session collection listing for non-members", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const outsider = testEnv.authenticatedContext("outsider-1");
    await assertFails(
      outsider.firestore().collection("sessions").get(),
    );
  });

  it("allows seeker walking thermometer flow and hider answer after pending", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    const questionRef = host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("pendingQuestions")
      .doc("pq-walk");

    await assertSucceeds(
      questionRef.set({
        toolType: "thermometer",
        createdByUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "walking",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [-6.26, 53.35] },
          }),
          metadata: { thermometerDistanceMeters: 1609.344 },
        },
        replyOptions: [],
        promptText: "Thermometer walk started",
      }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-walk")
        .update({ answer: "hotter", status: "answered" }),
    );

    await assertSucceeds(
      questionRef.update({
        status: "pending",
        answerableAt: "2026-01-01T00:05:00.000Z",
        promptText: "After traveling 1 mile, am I hotter or colder?",
        replyOptions: [
          { id: "hotter", label: "Hotter" },
          { id: "colder", label: "Colder" },
        ],
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [-6.26, 53.35],
                [-6.25, 53.36],
              ],
            },
          }),
          metadata: { thermometerDistanceMeters: 1609.344 },
        },
      }),
    );

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-walk")
        .update({ answer: "hotter", status: "answered" }),
    );
  });

  it("allows hider to answer a radar question in game chat", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-radar")
        .set({
          toolType: "radar",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: { radiusMeters: 1609.344 },
          },
          replyOptions: [
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ],
          promptText: "Are you within 1.0 mi of me?",
          answerableAt: "2026-01-01T00:00:00.000Z",
        }),
    );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-radar")
        .set({
          channel: "game",
          senderUid: "host-1",
          senderRole: "seeker",
          createdAt: "2026-01-01T00:00:00.000Z",
          kind: "question",
          pendingQuestionId: "pq-radar",
          toolType: "radar",
          promptText: "Are you within 1.0 mi of me?",
          replyOptions: [
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ],
          status: "pending",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-radar")
        .update({ answer: "yes", status: "answered" }),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-radar")
        .update({ selectedReply: "yes", status: "answered" }),
    );
  });

  it("allows seeker to set answerableAt after creating a pending photo question", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    const questionRef = host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("pendingQuestions")
      .doc("pq-photo-timer");

    await assertSucceeds(
      questionRef.set({
        toolType: "photo",
        createdByUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "pending",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [-6.26, 53.35] },
          }),
        },
        replyOptions: [
          { id: "upload", label: "Upload photo" },
          { id: "cannot", label: "Cannot answer" },
        ],
        promptText: "Send a photo of a red door.",
      }),
    );

    await assertSucceeds(
      questionRef.update({
        answerableAt: "2026-01-01T00:00:00.000Z",
      }),
    );
  });

  it("allows hider to answer a photo question with an uploaded photo", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo")
        .set({
          toolType: "photo",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "FeatureCollection",
              features: [],
            }),
            metadata: { photoCategoryId: "tree" },
          },
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
          answerableAt: "2026-01-01T00:00:00.000Z",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo")
        .update({
          answer: {
            kind: "photo",
            storagePath: "sessions/session-1/pendingQuestions/pq-photo/photo.jpg",
          },
          status: "answered",
        }),
    );
  });

  it("allows hider to answer a photo question with cannot answer", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-na")
        .set({
          toolType: "photo",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "FeatureCollection",
              features: [],
            }),
            metadata: { photoCategoryId: "tree" },
          },
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
          answerableAt: "2026-01-01T00:00:00.000Z",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-na")
        .update({
          answer: { kind: "cannot_answer" },
          status: "answered",
        }),
    );
  });

  it("allows hider to answer a photo question late with answeredLate", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-late")
        .set({
          toolType: "photo",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "FeatureCollection",
              features: [],
            }),
            metadata: { photoCategoryId: "tree" },
          },
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
          answerableAt: "2026-01-01T00:00:00.000Z",
          deadlineExpiredAt: "2026-01-01T00:10:00.000Z",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-late")
        .update({
          answer: { kind: "cannot_answer" },
          status: "answered",
          answeredLate: true,
        }),
    );
  });

  it("allows hider to update game chat message after photo answer", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-msg")
        .set({
          toolType: "photo",
          createdByUid: "host-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "FeatureCollection",
              features: [],
            }),
            metadata: { photoCategoryId: "tree" },
          },
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
          answerableAt: "2026-01-01T00:00:00.000Z",
        }),
    );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-photo")
        .set({
          channel: "game",
          senderUid: "host-1",
          senderRole: "seeker",
          createdAt: "2026-01-01T00:00:00.000Z",
          kind: "question",
          pendingQuestionId: "pq-photo-msg",
          toolType: "photo",
          promptText: "Send a photo of a tree.",
          replyOptions: [
            { id: "photo", label: "Photo uploaded" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          status: "pending",
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-msg")
        .update({
          answer: { kind: "cannot_answer" },
          status: "answered",
        }),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-photo")
        .update({ selectedReply: "cannot_answer", status: "answered" }),
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

  it("allows session members to register their own device token", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("devices")
        .doc("host-1")
        .set({
          token: "seeker-device-token",
          platform: "ios",
          role: "seeker",
          updatedAt: "2026-01-01T00:00:00.000Z",
          preferences: {
            enabled: true,
            newQuestions: true,
            timerChanges: true,
            chatMessages: false,
            liveActivities: true,
          },
        }),
    );

    const hider = testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("devices")
        .doc("hider-1")
        .set({
          token: "hider-device-token",
          platform: "android",
          role: "hider",
          updatedAt: "2026-01-01T00:00:00.000Z",
          preferences: {
            enabled: true,
            newQuestions: true,
            timerChanges: true,
            chatMessages: false,
            liveActivities: true,
          },
        }),
    );

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("devices")
        .doc("host-1")
        .set({
          token: "stolen-token",
          platform: "android",
          role: "seeker",
          updatedAt: "2026-01-01T00:00:00.000Z",
          preferences: { enabled: true },
        }),
    );
  });

  it("allows host to update session rules before timer starts", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hidingPeriodMinutes: 45,
          hidingZoneRadiusMeters: milesToMeters(0.25),
        }),
    );
  });

  it("rejects session rules update after timer has started", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          timerAccumulatedMs: 1000,
          timerRunningSince: null,
        }),
      );

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hidingPeriodMinutes: 45,
          hidingZoneRadiusMeters: milesToMeters(0.25),
        }),
    );
  });

  it("rejects non-host session rules update", async () => {
    const host = testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hidingPeriodMinutes: 45,
          hidingZoneRadiusMeters: milesToMeters(0.25),
        }),
    );
  });
});
