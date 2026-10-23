import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDoc, httpsCallable } = vi.hoisted(() => ({
  getDoc: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/firestore")>()),
  getDoc,
  updateDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
}));

vi.mock("firebase/functions", () => ({ httpsCallable }));

vi.mock("@/services/core/firebase/firebase", () => ({
  getFirestoreDb: () => ({}),
  isFirebaseConfigured: () => true,
  getFirebaseFunctions: async () => ({}),
}));

import { JOIN_ERROR_HEAL_ROLE_MISMATCH } from "@/services/session/rolePasscodeLifecycle";
import { joinRemoteSessionByCode } from "./join";

const healOptions = { returningMemberUid: "old-uid", persistedMyUid: "old-uid" };

describe("joinRemoteSessionByCode heal with raw callable errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        sessionId: "session-1",
        hostUid: "host-1",
        hostAppVersion: "0.1.0",
        status: "active",
      }),
    });
  });

  it.each([
    ["not-found", "Session not found.", { status: "missing" }],
    ["failed-precondition", "Session already ended.", { status: "ended" }],
    [
      "failed-precondition",
      "App version incompatible.",
      { status: "incompatible", hostVersion: "0.1.0" },
    ],
  ])("maps functions/%s %j to a join status", async (code, message, expected) => {
    httpsCallable.mockReturnValue(async () => {
      throw new FirebaseError(`functions/${code}`, message);
    });

    const result = await joinRemoteSessionByCode("ABCD", "new-uid", "seeker", "0.2.0", healOptions);

    expect(result).toEqual(expected);
  });

  it("surfaces a heal role mismatch as player copy", async () => {
    httpsCallable.mockReturnValue(async () => {
      throw new FirebaseError("functions/failed-precondition", "Rejoin in your previous role.");
    });

    await expect(
      joinRemoteSessionByCode("ABCD", "new-uid", "seeker", "0.2.0", healOptions),
    ).rejects.toThrow(JOIN_ERROR_HEAL_ROLE_MISMATCH);
  });
});
