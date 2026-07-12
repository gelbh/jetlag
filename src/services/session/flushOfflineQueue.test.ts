import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "../../domain/map/annotations";
import {
  enqueueOfflineWrite,
  readOfflineQueue,
  removeOfflineWrite,
} from "./offlineQueue";
import { flushOfflineQueue } from "./flushOfflineQueue";

vi.mock("../firestore/firestoreAnnotations", () => ({
  writeRemoteAnnotationsBatch: vi.fn(),
  writeRemoteAnnotation: vi.fn(),
}));

import {
  writeRemoteAnnotation,
  writeRemoteAnnotationsBatch,
} from "../firestore/firestoreAnnotations";

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

describe("flushOfflineQueue", () => {
  beforeEach(async () => {
    vi.mocked(writeRemoteAnnotationsBatch).mockReset();
    vi.mocked(writeRemoteAnnotation).mockReset();

    const existing = await readOfflineQueue();
    await Promise.all(existing.map((entry) => removeOfflineWrite(entry.id)));
  });

  it("returns empty when the queue is clear", async () => {
    await expect(flushOfflineQueue("session-1")).resolves.toEqual({
      remaining: 0,
      lastError: null,
    });
  });

  it("flushes retryable writes via batch and clears the queue", async () => {
    vi.mocked(writeRemoteAnnotationsBatch).mockResolvedValue(undefined);

    await enqueueOfflineWrite("session-1", sampleAnnotation);

    await expect(flushOfflineQueue("session-1")).resolves.toEqual({
      remaining: 0,
      lastError: null,
    });
    expect(writeRemoteAnnotationsBatch).toHaveBeenCalledWith("session-1", [
      sampleAnnotation,
    ]);
  });

  it("falls back to single writes when batch fails", async () => {
    vi.mocked(writeRemoteAnnotationsBatch).mockRejectedValue(
      new Error("batch failed"),
    );
    vi.mocked(writeRemoteAnnotation).mockResolvedValue(undefined);

    await enqueueOfflineWrite("session-1", sampleAnnotation);

    await expect(flushOfflineQueue("session-1")).resolves.toEqual({
      remaining: 0,
      lastError: null,
    });
    expect(writeRemoteAnnotation).toHaveBeenCalledWith(
      "session-1",
      sampleAnnotation,
    );
  });

  it("returns lastError when single writes fail", async () => {
    vi.mocked(writeRemoteAnnotationsBatch).mockRejectedValue(
      new Error("batch failed"),
    );
    vi.mocked(writeRemoteAnnotation).mockRejectedValue(
      new Error("network down"),
    );

    await enqueueOfflineWrite("session-1", sampleAnnotation);

    await expect(flushOfflineQueue("session-1")).resolves.toEqual({
      remaining: 1,
      lastError: "network down",
    });
  });
});
