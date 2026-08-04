import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import {
  bindRulesTestEnv,
  sessionPayload,
} from "./helpers";

describe("firestore.rules — game chat & questions", () => {
  const rules = bindRulesTestEnv();

  it("allows hiders to post game system messages", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = rules.testEnv.authenticatedContext("hider-1");
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


  it("allows seeker walking thermometer flow and hider answer after pending", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
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

    const hider = rules.testEnv.authenticatedContext("hider-1");
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

  it("allows walk creator to cancel own walking thermometer", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    const seeker = rules.testEnv.authenticatedContext("seeker-2");
    const questionRef = seeker
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("pendingQuestions")
      .doc("pq-own-walk");

    await assertSucceeds(
      questionRef.set({
        toolType: "thermometer",
        createdByUid: "seeker-2",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "walking",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [-6.26, 53.35] },
          }),
          metadata: {},
        },
        replyOptions: [],
        promptText: "Thermometer walk started",
      }),
    );

    await assertSucceeds(questionRef.update({ status: "cancelled" }));
  });

  it("allows seeker to cancel expired pending question", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-expired")
        .set({
          toolType: "radar",
          createdByUid: "seeker-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          deadlineExpiredAt: "2026-01-01T00:05:00.000Z",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: {},
          },
          replyOptions: [],
          promptText: "Are you within 1 mile?",
        });
    });

    const seeker = rules.testEnv.authenticatedContext("seeker-2");
    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-expired")
        .update({ status: "cancelled" }),
    );
  });

  it("denies seeker cancel of pending question without deadlineExpiredAt", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-open")
        .set({
          toolType: "radar",
          createdByUid: "seeker-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "pending",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: {},
          },
          replyOptions: [],
          promptText: "Are you within 1 mile?",
        });
    });

    const seeker = rules.testEnv.authenticatedContext("seeker-2");
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-open")
        .update({ status: "cancelled" }),
    );
  });

  it("allows seeker to cancel expired game question message", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-expired")
        .set({
          channel: "game",
          kind: "question",
          senderUid: "seeker-2",
          senderRole: "seeker",
          createdAt: "2026-01-01T00:00:00.000Z",
          pendingQuestionId: "pq-expired",
          promptText: "Are you within 1 mile?",
          status: "pending",
        });
    });

    const seeker = rules.testEnv.authenticatedContext("seeker-2");
    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("messages")
        .doc("msg-expired")
        .update({ status: "cancelled" }),
    );
  });

  it("allows seeker to cancel orphan walking thermometer", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker" },
        }),
      );

    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-orphan-walk")
        .set({
          toolType: "thermometer",
          createdByUid: "gone-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "walking",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: {},
          },
          replyOptions: [],
          promptText: "Thermometer walk started",
        });
    });

    const seeker = rules.testEnv.authenticatedContext("seeker-2");
    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-orphan-walk")
        .update({ status: "cancelled" }),
    );
  });

  it("denies non-host seeker cancelling another member's active walking thermometer", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2", "seeker-3"],
          memberRoles: {
            "host-1": "seeker",
            "seeker-2": "seeker",
            "seeker-3": "seeker",
          },
        }),
      );

    const walker = rules.testEnv.authenticatedContext("seeker-2");
    await assertSucceeds(
      walker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-member-walk")
        .set({
          toolType: "thermometer",
          createdByUid: "seeker-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "walking",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [-6.26, 53.35] },
            }),
            metadata: {},
          },
          replyOptions: [],
          promptText: "Thermometer walk started",
        }),
    );

    const otherSeeker = rules.testEnv.authenticatedContext("seeker-3");
    await assertFails(
      otherSeeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-member-walk")
        .update({ status: "cancelled" }),
    );
  });

  it("allows hider to answer a radar question in game chat", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
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

    const hider = rules.testEnv.authenticatedContext("hider-1");
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
    const host = rules.testEnv.authenticatedContext("host-1");
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
    const host = rules.testEnv.authenticatedContext("host-1");
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

    const hider = rules.testEnv.authenticatedContext("hider-1");
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
    const host = rules.testEnv.authenticatedContext("host-1");
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

    const hider = rules.testEnv.authenticatedContext("hider-1");
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

  it("allows hider to answer a photo question with sent externally", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
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
        .doc("pq-photo-ext")
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
            { id: "sent_externally", label: "Mark sent" },
            { id: "cannot_answer", label: "Cannot answer" },
          ],
          promptText: "Send a photo of a tree.",
        }),
    );

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-photo-ext")
        .update({
          answer: { kind: "sent_externally" },
          status: "answered",
        }),
    );
  });

  it("allows hider to answer a photo question late with answeredLate", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
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

    const hider = rules.testEnv.authenticatedContext("hider-1");
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
    const host = rules.testEnv.authenticatedContext("host-1");
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

    const hider = rules.testEnv.authenticatedContext("hider-1");
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

});
