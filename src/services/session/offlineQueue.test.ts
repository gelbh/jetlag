import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "../../domain/map/annotations";
import {
  enqueueOfflineWrite,
  readOfflineQueue,
  readOfflineQueueForSession,
  recordOfflineWriteFailure,
  removeOfflineWrite,
  clearOfflineQueueForSession,
  shouldRetryOfflineWrite,
} from "./offlineQueue";

const annotation: AnnotationRecord = {
  id: "ann-offline",
  sessionId: "session-1",
  type: "pin",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [0, 0] },
  },
  metadata: { createdAt: "2026-01-01T00:00:00.000Z" },
};

describe("offlineQueue", () => {
  beforeEach(async () => {
    const existing = await readOfflineQueue();
    await Promise.all(existing.map((entry) => removeOfflineWrite(entry.id)));
  });

  it("queues and removes offline writes", async () => {
    await enqueueOfflineWrite("session-1", annotation);

    const queued = await readOfflineQueue();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.annotation.id).toBe("ann-offline");

    await removeOfflineWrite("ann-offline");
    expect(await readOfflineQueue()).toHaveLength(0);
  });

  it("dedupes writes by annotation id", async () => {
    await enqueueOfflineWrite("session-1", annotation);
    await enqueueOfflineWrite("session-1", {
      ...annotation,
      metadata: { ...annotation.metadata, label: "Updated" },
    });

    expect(await readOfflineQueueForSession("session-1")).toHaveLength(1);
  });

  it("applies exponential backoff before retrying failed writes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    expect(shouldRetryOfflineWrite({ kind: "annotation", id: "a", sessionId: "s", annotation, createdAt: "" })).toBe(true);

    const failed = {
      kind: "annotation" as const,
      id: "a",
      sessionId: "s",
      annotation,
      createdAt: "",
      failureCount: 1,
      lastFailedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(shouldRetryOfflineWrite(failed)).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:01.500Z"));
    expect(shouldRetryOfflineWrite(failed)).toBe(true);

    vi.useRealTimers();
  });

  it("records failures and stops retrying after the maximum count", async () => {
    await enqueueOfflineWrite("session-1", annotation);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await recordOfflineWriteFailure(annotation.id);
    }

    const entry = (await readOfflineQueueForSession("session-1"))[0];
    expect(entry?.failureCount).toBe(5);
    expect(shouldRetryOfflineWrite(entry!)).toBe(false);
  });

  it("clears all queued writes for a session", async () => {
    await enqueueOfflineWrite("session-1", annotation);
    await enqueueOfflineWrite("session-2", {
      ...annotation,
      id: "ann-other-session",
    });

    await clearOfflineQueueForSession("session-1");

    expect(await readOfflineQueueForSession("session-1")).toHaveLength(0);
    expect(await readOfflineQueueForSession("session-2")).toHaveLength(1);
  });
});
