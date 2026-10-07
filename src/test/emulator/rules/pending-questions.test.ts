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

  it("keeps receivedAt immutable once stamped (no update branch admits it)", async () => {
    const { sessionRef } = await seekerSession();
    const questionRef = sessionRef.collection("pendingQuestions").doc("pq-1");
    await assertSucceeds(questionRef.set(questionPayload({ receivedAt: serverTimestamp() })));

    await assertFails(questionRef.update({ receivedAt: Timestamp.fromMillis(0) }));
  });

  it("stamps server receipt when a walk completes, and rejects a forged one", async () => {
    const { db, sessionRef } = await seekerSession();
    const { answerableAt: _omit, ...walking } = questionPayload({
      toolType: "thermometer",
      status: "walking",
      replyOptions: [],
    });
    const questionRef = sessionRef.collection("pendingQuestions").doc("pq-walk");
    await assertSucceeds(questionRef.set(walking));

    const completion = {
      status: "pending",
      promptText: "Hotter or colder?",
      replyOptions: [{ id: "hotter", label: "Hotter" }],
      answerableAt: ASKED_AT,
    };
    await assertFails(questionRef.update({ ...completion, receivedAt: Timestamp.fromMillis(0) }));

    const batch = db.batch();
    batch.update(questionRef, { ...completion, receivedAt: serverTimestamp() });
    batch.set(sessionRef.collection("messages").doc("msg-walk"), {
      ...questionMessage,
      pendingQuestionId: "pq-walk",
      toolType: "thermometer",
      promptText: "Hotter or colder?",
      replyOptions: [{ id: "hotter", label: "Hotter" }],
    });
    await assertSucceeds(batch.commit());
  });

  it("allows the hider's late answer batch: question, chat row, and late notice", async () => {
    const { db, sessionRef } = await seekerSession();
    const seed = db.batch();
    seed.set(
      sessionRef.collection("pendingQuestions").doc("pq-1"),
      questionPayload({ receivedAt: serverTimestamp() }),
    );
    seed.set(sessionRef.collection("messages").doc("msg-1"), questionMessage);
    await assertSucceeds(seed.commit());

    const hiderRef = rules.testEnv
      .authenticatedContext("hider-1")
      .firestore()
      .collection("sessions")
      .doc("session-1");
    const answer = hiderRef.firestore.batch();
    answer.update(hiderRef.collection("pendingQuestions").doc("pq-1"), {
      answer: "yes",
      status: "answered",
      answeredLate: true,
    });
    answer.update(hiderRef.collection("messages").doc("msg-1"), {
      selectedReply: "yes",
      status: "answered",
    });
    answer.set(hiderRef.collection("messages").doc("msg-late"), {
      channel: "game",
      senderUid: "hider-1",
      senderRole: "hider",
      createdAt: ASKED_AT,
      kind: "system",
      text: "Answer received late. Hider forfeits card draw for this question.",
    });

    await assertSucceeds(answer.commit());
  });

  it("denies hider pending → answered with a veto answer map", async () => {
    const { db, sessionRef } = await seekerSession();
    const seed = db.batch();
    seed.set(sessionRef.collection("pendingQuestions").doc("pq-1"), questionPayload());
    seed.set(sessionRef.collection("messages").doc("msg-1"), questionMessage);
    await assertSucceeds(seed.commit());

    await assertFails(
      rules.testEnv
        .authenticatedContext("hider-1")
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-1")
        .update({ status: "answered", answer: { kind: "veto" } }),
    );
  });

  it("allows the hider's veto batch: sticky answer + selectedReply, post the card notice", async () => {
    const { db, sessionRef } = await seekerSession();
    const seed = db.batch();
    seed.set(sessionRef.collection("pendingQuestions").doc("pq-1"), questionPayload());
    seed.set(sessionRef.collection("messages").doc("msg-1"), questionMessage);
    await assertSucceeds(seed.commit());

    const hiderRef = rules.testEnv
      .authenticatedContext("hider-1")
      .firestore()
      .collection("sessions")
      .doc("session-1");
    const veto = hiderRef.firestore.batch();
    veto.update(hiderRef.collection("pendingQuestions").doc("pq-1"), {
      status: "cancelled",
      answer: { kind: "veto" },
    });
    veto.update(hiderRef.collection("messages").doc("msg-1"), {
      status: "cancelled",
      selectedReply: "veto",
    });
    veto.set(hiderRef.collection("messages").doc("msg-veto"), {
      channel: "game",
      senderUid: "hider-1",
      senderRole: "hider",
      createdAt: ASKED_AT,
      kind: "system",
      text: "Hider played Veto. No answer and no card draw for this question.",
    });

    await assertSucceeds(veto.commit());
  });

  it("allows the hider's randomize-style status-only cancel batch", async () => {
    const { db, sessionRef } = await seekerSession();
    const seed = db.batch();
    seed.set(sessionRef.collection("pendingQuestions").doc("pq-1"), questionPayload());
    seed.set(sessionRef.collection("messages").doc("msg-1"), questionMessage);
    await assertSucceeds(seed.commit());

    const hiderRef = rules.testEnv
      .authenticatedContext("hider-1")
      .firestore()
      .collection("sessions")
      .doc("session-1");
    const randomize = hiderRef.firestore.batch();
    randomize.update(hiderRef.collection("pendingQuestions").doc("pq-1"), {
      status: "cancelled",
    });
    randomize.update(hiderRef.collection("messages").doc("msg-1"), { status: "cancelled" });
    randomize.set(hiderRef.collection("messages").doc("msg-randomize"), {
      channel: "game",
      senderUid: "hider-1",
      senderRole: "hider",
      createdAt: ASKED_AT,
      kind: "system",
      text: "Hider played Randomize. Seekers may ask a different question.",
    });

    await assertSucceeds(randomize.commit());
  });

  it("denies a hider cancel on a walking question", async () => {
    const { sessionRef } = await seekerSession();
    const { answerableAt: _omit, ...walking } = questionPayload({
      toolType: "thermometer",
      status: "walking",
      replyOptions: [],
    });
    await assertSucceeds(sessionRef.collection("pendingQuestions").doc("pq-1").set(walking));

    await assertFails(
      rules.testEnv
        .authenticatedContext("hider-1")
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("pendingQuestions")
        .doc("pq-1")
        .update({ status: "cancelled" }),
    );
  });
});
