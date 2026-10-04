import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import {
  buildPendingQuestionDocument,
  deserializePendingQuestionFromFirestore,
} from "./serialization/serializePlayer";

const firestoreMocks = vi.hoisted(() => {
  const batchUpdate = vi.fn();
  const batchSet = vi.fn();
  const batchCommit = vi.fn(async () => undefined);
  return {
    setDoc: vi.fn(async () => undefined),
    updateDoc: vi.fn(async () => undefined),
    deleteDoc: vi.fn(async () => undefined),
    addDoc: vi.fn(async () => undefined),
    getDocFromCache: vi.fn(async () => {
      throw new Error("not cached");
    }),
    getDoc: vi.fn(async () => ({
      exists: () => true,
      data: () => ({ status: "walking" }),
    })),
    getDocs: vi.fn(
      async (): Promise<{
        docs: Array<{ id: string; data: () => Record<string, unknown> }>;
      }> => ({ docs: [] }),
    ),
    writeBatch: vi.fn(() => ({
      update: batchUpdate,
      set: batchSet,
      commit: batchCommit,
    })),
    batchUpdate,
    batchSet,
    batchCommit,
    doc: vi.fn((...segments: string[]) => ({ path: segments.join("/") })),
    collection: vi.fn((...segments: string[]) => ({
      path: segments.join("/"),
    })),
  };
});

const mockCaptureException = vi.hoisted(() => vi.fn());

vi.mock("firebase/firestore", () => ({
  addDoc: firestoreMocks.addDoc,
  collection: firestoreMocks.collection,
  deleteDoc: firestoreMocks.deleteDoc,
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  getDocFromCache: firestoreMocks.getDocFromCache,
  getDocs: firestoreMocks.getDocs,
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  setDoc: firestoreMocks.setDoc,
  updateDoc: firestoreMocks.updateDoc,
  writeBatch: firestoreMocks.writeBatch,
  where: vi.fn(),
}));

vi.mock("../core/firebase/firebase", () => ({
  getFirestoreDb: () => ({}),
}));

vi.mock("../core/analytics/sentry", () => ({
  captureException: mockCaptureException,
  reportFirestoreListenPermissionDenied: vi.fn(),
}));

import { onSnapshot } from "firebase/firestore";
import {
  appendPlayerTrailPoint,
  cancelWalkingThermometerQuestions,
  cancelWalkingThermometersAfterIdentityHeal,
  cancelWalkingThermometersAndAnnounce,
  deletePlayerLocation,
  subscribeToSessionMessages,
  updatePendingQuestion,
  writeAskedQuestionBatch,
  writePendingQuestionUpdateBatch,
  writePlayerLocation,
} from "./firestoreSessionExtras";

function samplePendingQuestion(
  overrides: Partial<PendingQuestionRecord> = {},
): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "seeker-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    placement: {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-0.15, 51.45] },
      }),
      metadata: { radiusMeters: 1609 },
    },
    replyOptions: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    promptText: "Are you within 1 mi of me?",
    answerableAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("firestoreSessionExtras writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches pending question fields without undefined values", async () => {
    await updatePendingQuestion("session-1", "pq-1", {
      status: "answered",
      answer: { kind: "reply", replyId: "yes" },
      deadlineExpiredAt: "2026-01-01T00:10:00.000Z",
    });

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("pq-1") }),
      {
        status: "answered",
        answer: { kind: "reply", replyId: "yes" },
        deadlineExpiredAt: "2026-01-01T00:10:00.000Z",
      },
    );
  });

  it("ignores already-exists when appending trail points", async () => {
    firestoreMocks.addDoc.mockRejectedValueOnce(
      new FirebaseError(
        "already-exists",
        "Document already exists: sessions/s/playerTrailPoints/u/points/p1",
      ),
    );

    await expect(
      appendPlayerTrailPoint("session-1", {
        uid: "seeker-1",
        sessionId: "session-1",
        lat: 51.5,
        lng: -0.12,
        role: "seeker",
        recordedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined();

    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("playerTrailPoints"),
      }),
      {
        lat: 51.5,
        lng: -0.12,
        accuracyMeters: null,
        role: "seeker",
        recordedAt: "2026-01-01T00:00:00.000Z",
      },
    );
  });

  it("ignores firestore/already-exists and message-matched errors", async () => {
    firestoreMocks.addDoc.mockRejectedValueOnce(
      new FirebaseError("firestore/already-exists", "conflict"),
    );
    await expect(
      appendPlayerTrailPoint("session-1", {
        uid: "seeker-1",
        sessionId: "session-1",
        lat: 1,
        lng: 2,
        role: "hider",
        recordedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined();

    firestoreMocks.addDoc.mockRejectedValueOnce(
      new FirebaseError("unknown", "Document already exists: points/x"),
    );
    await expect(
      appendPlayerTrailPoint("session-1", {
        uid: "seeker-1",
        sessionId: "session-1",
        lat: 1,
        lng: 2,
        role: "hider",
        recordedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined();
  });

  it("rethrows unrelated trail-point write failures", async () => {
    const permission = new FirebaseError(
      "permission-denied",
      "Missing or insufficient permissions.",
    );
    firestoreMocks.addDoc.mockRejectedValueOnce(permission);
    await expect(
      appendPlayerTrailPoint("session-1", {
        uid: "seeker-1",
        sessionId: "session-1",
        lat: 1,
        lng: 2,
        role: "seeker",
        recordedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).rejects.toBe(permission);

    firestoreMocks.addDoc.mockRejectedValueOnce(new Error("network down"));
    await expect(
      appendPlayerTrailPoint("session-1", {
        uid: "seeker-1",
        sessionId: "session-1",
        lat: 1,
        lng: 2,
        role: "seeker",
        recordedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow("network down");
  });

  it("round-trips pending question documents through serialization", () => {
    const question = samplePendingQuestion({
      cardDraw: 2,
      cardKeep: 1,
      deadlineExpiredAt: "2026-01-01T00:10:00.000Z",
    });
    const document = buildPendingQuestionDocument(question);
    const restored = deserializePendingQuestionFromFirestore(
      question.id,
      question.sessionId,
      document,
    );

    expect(restored.toolType).toBe("radar");
    expect(restored.promptText).toBe(question.promptText);
    expect(restored.cardDraw).toBe(2);
    expect(restored.deadlineExpiredAt).toBe("2026-01-01T00:10:00.000Z");
  });

  it("asks atomically: question stamped with server receipt + chat row in one batch", async () => {
    const question = samplePendingQuestion();
    const message = {
      id: "msg-1",
      sessionId: "session-1",
      channel: "game" as const,
      senderUid: "seeker-1",
      senderRole: "seeker" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      kind: "question" as const,
      pendingQuestionId: "pq-1",
      status: "pending" as const,
    };

    await writeAskedQuestionBatch("session-1", question, message);

    expect(firestoreMocks.batchSet).toHaveBeenCalledTimes(2);
    expect(firestoreMocks.batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("pq-1") }),
      { ...buildPendingQuestionDocument(question), receivedAt: "SERVER_TIMESTAMP" },
    );
    expect(firestoreMocks.batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("msg-1") }),
      expect.objectContaining({ kind: "question", pendingQuestionId: "pq-1" }),
    );
    expect(firestoreMocks.batchCommit).toHaveBeenCalledTimes(1);
  });

  it("does not stamp receivedAt on walking asks", async () => {
    const question = samplePendingQuestion({ status: "walking", answerableAt: undefined });

    await writeAskedQuestionBatch("session-1", question, {
      id: "msg-1",
      sessionId: "session-1",
      channel: "game",
      senderUid: "seeker-1",
      senderRole: "seeker",
      createdAt: "2026-01-01T00:00:00.000Z",
      kind: "system",
      text: "Thermometer walk started",
    });

    const [, questionDoc] = firestoreMocks.batchSet.mock.calls[0] as unknown as [
      unknown,
      Record<string, unknown>,
    ];
    expect(questionDoc).not.toHaveProperty("receivedAt");
  });

  it("applies a question transition and its chat writes in one batch", async () => {
    await writePendingQuestionUpdateBatch("session-1", {
      questionId: "pq-1",
      questionPatch: { status: "cancelled", answer: undefined },
      gameMessage: { id: "msg-1", patch: { status: "cancelled" } },
      newMessage: {
        id: "msg-2",
        sessionId: "session-1",
        channel: "game",
        senderUid: "seeker-1",
        senderRole: "seeker",
        createdAt: "2026-01-01T00:00:00.000Z",
        kind: "system",
        text: "Expired question dismissed. You can ask again.",
      },
    });

    expect(firestoreMocks.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("pq-1") }),
      { status: "cancelled" },
    );
    expect(firestoreMocks.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("msg-1") }),
      { status: "cancelled" },
    );
    expect(firestoreMocks.batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("msg-2") }),
      expect.objectContaining({ kind: "system" }),
    );
    expect(firestoreMocks.batchCommit).toHaveBeenCalledTimes(1);
  });

  it("reads server receipt as ISO and treats the unacked null placeholder as absent", () => {
    const document = buildPendingQuestionDocument(samplePendingQuestion());
    const stamped = deserializePendingQuestionFromFirestore("pq-1", "session-1", {
      ...document,
      receivedAt: { toDate: () => new Date("2026-01-01T00:12:00.000Z") },
    });
    const unacked = deserializePendingQuestionFromFirestore("pq-1", "session-1", {
      ...document,
      receivedAt: null,
    });

    expect(stamped.receivedAt).toBe("2026-01-01T00:12:00.000Z");
    expect(unacked.receivedAt).toBeUndefined();
    expect(buildPendingQuestionDocument(stamped)).not.toHaveProperty("receivedAt");
  });

  it("appends player trail points under the session subcollection", async () => {
    await appendPlayerTrailPoint("session-1", {
      uid: "seeker-1",
      sessionId: "session-1",
      lat: 53.35,
      lng: -6.26,
      role: "seeker",
      recordedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("playerTrailPoints/seeker-1/points"),
      }),
      expect.objectContaining({
        lat: 53.35,
        lng: -6.26,
        role: "seeker",
      }),
    );
  });

  it("writes player locations by uid", async () => {
    await writePlayerLocation("session-1", {
      uid: "hider-1",
      sessionId: "session-1",
      lat: 53.34,
      lng: -6.25,
      updatedAt: "2026-01-01T00:00:00.000Z",
      role: "hider",
    });

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("hider-1") }),
      expect.objectContaining({
        lat: 53.34,
        lng: -6.25,
        role: "hider",
      }),
    );
  });

  it("deletes player locations by uid", async () => {
    await deletePlayerLocation("session-1", "hider-1");

    expect(firestoreMocks.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("hider-1") }),
    );
  });

  it("cancels walking thermometer questions by id with a status-only batch", async () => {
    await cancelWalkingThermometerQuestions("session-1", ["pq-walk-1", "pq-walk-2"]);

    expect(firestoreMocks.writeBatch).toHaveBeenCalled();
    expect(firestoreMocks.batchUpdate).toHaveBeenCalledTimes(2);
    expect(firestoreMocks.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("pq-walk-1") }),
      { status: "cancelled" },
    );
    expect(firestoreMocks.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("pq-walk-2") }),
      { status: "cancelled" },
    );
    expect(firestoreMocks.batchCommit).toHaveBeenCalled();
  });

  it("no-ops cancelWalkingThermometerQuestions for an empty id list", async () => {
    await cancelWalkingThermometerQuestions("session-1", []);
    expect(firestoreMocks.writeBatch).not.toHaveBeenCalled();
  });

  it("cancels walking thermometers and announces once for still-walking ids", async () => {
    await cancelWalkingThermometersAndAnnounce(
      "session-1",
      ["pq-walk-1"],
      "seeker-1",
      "seeker",
      "left",
    );

    expect(firestoreMocks.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("pq-walk-1") }),
      { status: "cancelled" },
    );
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        kind: "system",
        text: "Thermometer walk cancelled — seeker left.",
      }),
    );
  });

  it("skips cancelWalkingThermometersAndAnnounce when already cancelled", async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ status: "cancelled" }),
    });

    await cancelWalkingThermometersAndAnnounce(
      "session-1",
      ["pq-walk-1"],
      "seeker-1",
      "seeker",
      "left",
    );

    expect(firestoreMocks.writeBatch).not.toHaveBeenCalled();
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
  });

  it("cancels walking thermometers after identity heal", async () => {
    const walk = samplePendingQuestion({
      id: "pq-walk",
      toolType: "thermometer",
      createdByUid: "old-uid",
      status: "walking",
      promptText: "Thermometer walk started",
    });
    firestoreMocks.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: walk.id,
          data: () => buildPendingQuestionDocument(walk),
        },
      ],
    });

    await cancelWalkingThermometersAfterIdentityHeal("session-1", "old-uid", "new-uid", "seeker");

    expect(firestoreMocks.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("pq-walk") }),
      { status: "cancelled" },
    );
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        kind: "system",
        text: "Thermometer walk cancelled — seeker left the session.",
      }),
    );
  });

  it("captures exceptions from identity-heal cancel", async () => {
    firestoreMocks.getDocs.mockRejectedValueOnce(new Error("boom"));

    await cancelWalkingThermometersAfterIdentityHeal("session-1", "old-uid", "new-uid", "seeker");

    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("subscribeToSessionMessages metadata", () => {
  type FakeSnapshot = {
    docs: Array<{
      id: string;
      data: () => Record<string, unknown>;
      metadata: { hasPendingWrites: boolean };
    }>;
    docChanges: () => unknown[];
  };

  function fakeSnapshot(hasPendingWrites: boolean, changes: number): FakeSnapshot {
    return {
      docs: [
        {
          id: "m1",
          data: () => ({
            channel: "social",
            senderUid: "u1",
            senderRole: "seeker",
            createdAt: "2026-01-01T00:00:00.000Z",
            text: "hi",
          }),
          metadata: { hasPendingWrites },
        },
      ],
      docChanges: () => Array.from({ length: changes }),
    };
  }

  function subscribeAndCapture() {
    const onChange = vi.fn();
    vi.mocked(onSnapshot).mockClear();
    subscribeToSessionMessages("s1", onChange, vi.fn());
    const call = vi.mocked(onSnapshot).mock.calls[0] as unknown[];
    expect(call[1]).toEqual({ includeMetadataChanges: true });
    return { onChange, emit: call[2] as (snap: FakeSnapshot) => void };
  }

  it("maps hasPendingWrites to pendingSync and clears it on ack", () => {
    const { onChange, emit } = subscribeAndCapture();
    emit(fakeSnapshot(true, 1));
    expect(onChange.mock.calls[0]?.[0][0]).toMatchObject({ pendingSync: true });
    emit(fakeSnapshot(false, 1));
    expect(onChange.mock.calls[1]?.[0][0]).not.toHaveProperty("pendingSync");
  });

  it("skips metadata-only snapshots with no doc changes after the first emit", () => {
    const { onChange, emit } = subscribeAndCapture();
    emit(fakeSnapshot(false, 0));
    emit(fakeSnapshot(false, 0));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
