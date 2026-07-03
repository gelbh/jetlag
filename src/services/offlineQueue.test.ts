import { beforeEach, describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../domain/annotations";
import {
  enqueueOfflineWrite,
  readOfflineQueue,
  readOfflineQueueForSession,
  removeOfflineWrite,
  clearOfflineQueueForSession,
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
