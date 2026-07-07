import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../domain/annotations";
import { isRetriableSyncError } from "../domain/syncRetry";
import {
  countOfflineQueueForSession,
  enqueueOfflineWrite,
  readOfflineQueue,
  readOfflineQueueForSession,
  removeOfflineWrite,
} from "./offlineQueue";

const sampleAnnotation: AnnotationRecord = {
  id: "annotation-1",
  sessionId: "session-1",
  type: "pin",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [0, 0] },
  },
  metadata: { createdAt: "2026-01-01T00:00:00.000Z" },
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("offline queue on retriable sync failure", () => {
  beforeEach(async () => {
    const existing = await readOfflineQueue();
    await Promise.all(existing.map((entry) => removeOfflineWrite(entry.id)));
  });

  it("queues writes that should retry after transient failures", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });

    const error = new TypeError("Failed to fetch");
    expect(isRetriableSyncError(error)).toBe(true);

    await enqueueOfflineWrite("session-1", sampleAnnotation);
    expect(await countOfflineQueueForSession("session-1")).toBe(1);
    expect(await readOfflineQueueForSession("session-1")).toEqual([
      expect.objectContaining({ id: "annotation-1", sessionId: "session-1" }),
    ]);
  });

  it("does not treat permission-denied as retriable", () => {
    expect(
      isRetriableSyncError(
        new FirebaseError("permission-denied", "Missing permission."),
      ),
    ).toBe(false);
  });

  it("dedupes writes by annotation id", async () => {
    await enqueueOfflineWrite("session-1", sampleAnnotation);
    await enqueueOfflineWrite("session-1", {
      ...sampleAnnotation,
      updatedAt: "2026-01-01T00:00:01.000Z",
    });

    expect(await countOfflineQueueForSession("session-1")).toBe(1);
  });
});
