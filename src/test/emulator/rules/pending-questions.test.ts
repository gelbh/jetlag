import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp, Timestamp } from "firebase/firestore";
import { describe, it } from "vitest";
import { bindRulesTestEnv, sessionPayload } from "./helpers";

const ASKED_AT = "2026-01-01T00:00:00.000Z";

function questionPayload(overrides: Record<string, unknown> = {}) {
  return {
    toolType: "radar",
    createdByUid: "host-1",
    createdAt: ASKED_AT,
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
    answerableAt: ASKED_AT,
    ...overrides,
  };
}

const questionMessage = {
  channel: "game",
  senderUid: "host-1",
  senderRole: "seeker",
  createdAt: ASKED_AT,
  kind: "question",
  pendingQuestionId: "pq-1",
  toolType: "radar",
  promptText: "Are you within 1.0 mi of me?",
  replyOptions: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
  status: "pending",
};

describe("firestore.rules — batched question asks", () => {
  const rules = bindRulesTestEnv();

  async function seekerSession() {
    const host = rules.testEnv.authenticatedContext("host-1");
    const sessionRef = host.firestore().collection("sessions").doc("session-1");
    await sessionRef.set(
      sessionPayload("host-1", {
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      }),
    );
    return { db: host.firestore(), sessionRef };
  }

  it("allows the question + chat row batch with server-stamped receivedAt", async () => {
    const { db, sessionRef } = await seekerSession();
    const batch = db.batch();
    batch.set(
      sessionRef.collection("pendingQuestions").doc("pq-1"),
      questionPayload({ receivedAt: serverTimestamp() }),
    );
    batch.set(sessionRef.collection("messages").doc("msg-1"), questionMessage);

    await assertSucceeds(batch.commit());
  });

  it("denies a client-chosen receivedAt", async () => {
    const { sessionRef } = await seekerSession();

    await assertFails(
      sessionRef
        .collection("pendingQuestions")
        .doc("pq-1")
        .set(questionPayload({ receivedAt: Timestamp.fromMillis(0) })),
    );
  });

  it("rejects the whole batch when receivedAt is forged", async () => {
    const { db, sessionRef } = await seekerSession();
    const batch = db.batch();
    batch.set(
      sessionRef.collection("pendingQuestions").doc("pq-1"),
      questionPayload({ receivedAt: Timestamp.fromMillis(0) }),
    );
    batch.set(sessionRef.collection("messages").doc("msg-1"), questionMessage);

    await assertFails(batch.commit());
  });

  it("denies a non-string answerableAt on create", async () => {
    const { sessionRef } = await seekerSession();

    await assertFails(
      sessionRef
        .collection("pendingQuestions")
        .doc("pq-1")
        .set(questionPayload({ answerableAt: Timestamp.fromMillis(0) })),
    );
  });

  it("still allows walking asks without receivedAt or answerableAt", async () => {
    const { sessionRef } = await seekerSession();
    const { answerableAt: _omit, ...walking } = questionPayload({
      toolType: "thermometer",
      status: "walking",
      replyOptions: [],
    });

    await assertSucceeds(sessionRef.collection("pendingQuestions").doc("pq-walk").set(walking));
  });

  it("does not let a seeker rewrite receivedAt after create", async () => {
    const { sessionRef } = await seekerSession();
    const questionRef = sessionRef.collection("pendingQuestions").doc("pq-1");
    await assertSucceeds(questionRef.set(questionPayload({ receivedAt: serverTimestamp() })));

    await assertFails(questionRef.update({ receivedAt: Timestamp.fromMillis(0) }));
  });
});
