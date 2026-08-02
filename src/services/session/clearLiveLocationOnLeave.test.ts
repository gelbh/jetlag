import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCancel = vi.hoisted(() => vi.fn(async () => undefined));
const mockDelete = vi.hoisted(() => vi.fn(async () => undefined));
const mockCapture = vi.hoisted(() => vi.fn());

vi.mock("../firestore/firestoreSessionExtras", () => ({
  cancelWalkingThermometersAndAnnounce: mockCancel,
  deletePlayerLocation: mockDelete,
}));

vi.mock("../core/analytics/sentry", () => ({
  captureException: mockCapture,
}));

vi.mock("../../domain/questions", () => ({
  listWalkingThermometerQuestionIds: () => ["pq-1"],
}));

import { clearLiveLocationOnLeave } from "./clearLiveLocationOnLeave";
import {
  arePlayerLocationPublishesBlocked,
  resetPlayerLocationPublishGateForTests,
} from "./playerLocationPublishGate";

describe("clearLiveLocationOnLeave", () => {
  beforeEach(() => {
    resetPlayerLocationPublishGateForTests();
    mockCancel.mockClear();
    mockDelete.mockClear();
    mockCapture.mockClear();
  });

  it("blocks publishes then cancels walks and deletes the pin", async () => {
    await clearLiveLocationOnLeave({
      sessionId: "session-1",
      uid: "uid-1",
      role: "seeker",
      pendingQuestions: [],
    });

    expect(arePlayerLocationPublishesBlocked()).toBe(true);
    expect(mockCancel).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith("session-1", "uid-1");
  });

  it("captures non-permission failures without throwing", async () => {
    mockDelete.mockRejectedValueOnce(new Error("network"));

    await expect(
      clearLiveLocationOnLeave({
        sessionId: "session-1",
        uid: "uid-1",
        role: "hider",
        pendingQuestions: [],
      }),
    ).resolves.toBeUndefined();

    expect(mockCapture).toHaveBeenCalled();
  });
});
