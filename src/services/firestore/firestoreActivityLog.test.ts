import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirebaseError } from "firebase/app";
import type { SessionActivityEvent } from "../../domain/session/sessionActivityLog";
import { buildActivityLogDocument } from "./firestoreSerialization";

const firestoreMocks = vi.hoisted(() => ({
  setDoc: vi.fn(async () => undefined),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  onSnapshot: vi.fn(() => vi.fn()),
  orderBy: vi.fn((...args: unknown[]) => ({ orderBy: args })),
  query: vi.fn((...args: unknown[]) => ({ query: args })),
  doc: vi.fn((...segments: unknown[]) => ({
    path: segments
      .flatMap((segment) =>
        typeof segment === "string"
          ? [segment]
          : segment && typeof segment === "object" && "path" in segment
            ? [String((segment as { path: string }).path)]
            : [],
      )
      .join("/"),
  })),
  collection: vi.fn((...segments: unknown[]) => ({
    path: segments.filter((segment) => typeof segment === "string").join("/"),
  })),
}));

vi.mock("firebase/firestore", () => ({
  collection: firestoreMocks.collection,
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: firestoreMocks.orderBy,
  query: firestoreMocks.query,
  setDoc: firestoreMocks.setDoc,
}));

vi.mock("../core/firebase", () => ({
  getFirestoreDb: () => ({}),
}));

import {
  createActivityLogEventIfAbsent,
  subscribeActivityLog,
} from "./firestoreActivityLog";

function sessionStartedEvent(
  overrides: Partial<SessionActivityEvent> = {},
): SessionActivityEvent {
  return {
    id: "session_started",
    sessionId: "session-1",
    type: "session_started",
    createdAt: "2026-07-25T10:00:00.000Z",
    payload: {},
    ...overrides,
  };
}

describe("firestoreActivityLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => false });
  });

  it("creates activity log events with serialized documents", async () => {
    const event = sessionStartedEvent();

    await expect(
      createActivityLogEventIfAbsent("session-1", event),
    ).resolves.toEqual({ wrote: true });

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("activityLog"),
      }),
      buildActivityLogDocument(event),
    );
  });

  it("treats already-exists as a no-op write", async () => {
    firestoreMocks.setDoc.mockRejectedValueOnce(
      new FirebaseError("already-exists", "Document already exists"),
    );

    await expect(
      createActivityLogEventIfAbsent("session-1", sessionStartedEvent()),
    ).resolves.toEqual({ wrote: false });
  });

  it("treats append-only update denial as already written when doc exists", async () => {
    firestoreMocks.setDoc.mockRejectedValueOnce(
      new FirebaseError("permission-denied", "Missing or insufficient permissions."),
    );
    firestoreMocks.getDoc.mockResolvedValueOnce({ exists: () => true });

    await expect(
      createActivityLogEventIfAbsent("session-1", sessionStartedEvent()),
    ).resolves.toEqual({ wrote: false });
  });

  it("rethrows permission-denied when the document does not exist", async () => {
    const denied = new FirebaseError(
      "permission-denied",
      "Missing or insufficient permissions.",
    );
    firestoreMocks.setDoc.mockRejectedValueOnce(denied);
    firestoreMocks.getDoc.mockResolvedValueOnce({ exists: () => false });

    await expect(
      createActivityLogEventIfAbsent("session-1", sessionStartedEvent()),
    ).rejects.toBe(denied);
  });

  it("subscribes ordered by createdAt desc and sorts client-side", () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    subscribeActivityLog("session-1", onChange, onError);

    expect(firestoreMocks.orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(firestoreMocks.onSnapshot).toHaveBeenCalled();

    const snapshotHandler = firestoreMocks.onSnapshot.mock.calls[0]?.[1] as (
      snapshot: {
        docs: Array<{ id: string; data: () => Record<string, unknown> }>;
      },
    ) => void;

    snapshotHandler({
      docs: [
        {
          id: "older",
          data: () => ({
            type: "hiding_timer_started",
            createdAt: "2026-07-25T10:00:00.000Z",
            payload: {},
          }),
        },
        {
          id: "newer",
          data: () => ({
            type: "seeking_started",
            createdAt: "2026-07-25T11:00:00.000Z",
            payload: {},
          }),
        },
      ],
    });

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "newer", type: "seeking_started" }),
      expect.objectContaining({ id: "older", type: "hiding_timer_started" }),
    ]);
  });
});
