import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getDoc,
  updateDoc,
  joinGatedRemoteSessionByCode,
  cancelWalkingThermometers,
  ensureMemberProof,
} = vi.hoisted(() => ({
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  joinGatedRemoteSessionByCode: vi.fn(),
  cancelWalkingThermometers: vi.fn(),
  ensureMemberProof: vi.fn(async () => undefined),
}));

vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/firestore")>()),
  getDoc,
  updateDoc,
  doc: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  getFirestoreDb: () => ({}),
}));

vi.mock("../joinGatedRemoteSession", () => ({ joinGatedRemoteSessionByCode }));

vi.mock("../memberProofs", () => ({ ensureMemberProof }));

vi.mock("../firestoreSessionExtras", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../firestoreSessionExtras")>()),
  cancelWalkingThermometersAfterIdentityHeal: cancelWalkingThermometers,
}));

import {
  JOIN_ERROR_APP_VERSION_INCOMPATIBLE,
  JOIN_ERROR_LEGACY_JOIN,
  JOIN_ERROR_SESSION_ENDED,
  JOIN_ERROR_SESSION_NOT_FOUND,
} from "@/services/session/rolePasscodeLifecycle";
import { joinRemoteSessionByCode } from "./join";

const healOptions = { returningMemberUid: "old-uid", persistedMyUid: "old-uid" };

describe("joinRemoteSessionByCode returning-member heal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDoc.mockReset();
    // First read is the session-code doc; a session-doc read (old client heal
    // path) is denied so the no-read branch would write membership via updateDoc.
    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          sessionId: "session-1",
          hostUid: "host-1",
          hostAppVersion: "0.1.0",
          status: "active",
        }),
      })
      .mockRejectedValue(new FirebaseError("permission-denied", "denied"));
    joinGatedRemoteSessionByCode.mockResolvedValue({
      status: "joined",
      session: { id: "session-1", code: "ABCD" },
    });
  });

  it("routes the heal to the callable instead of a client write", async () => {
    const result = await joinRemoteSessionByCode("ABCD", "new-uid", "seeker", "0.2.0", healOptions);

    expect(result.status).toBe("joined");
    expect(joinGatedRemoteSessionByCode).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "ABCD",
        role: "seeker",
        returningMemberUid: "old-uid",
        persistedMyUid: "old-uid",
      }),
    );
    expect(updateDoc).not.toHaveBeenCalled();
    expect(cancelWalkingThermometers).toHaveBeenCalledWith(
      "session-1",
      "old-uid",
      "new-uid",
      "seeker",
    );
  });

  it("maps a missing-session callable error to the missing status", async () => {
    joinGatedRemoteSessionByCode.mockRejectedValue(new Error(JOIN_ERROR_SESSION_NOT_FOUND));

    const result = await joinRemoteSessionByCode("ABCD", "new-uid", "seeker", "0.2.0", healOptions);

    expect(result).toEqual({ status: "missing" });
    expect(updateDoc).not.toHaveBeenCalled();
    expect(cancelWalkingThermometers).not.toHaveBeenCalled();
    expect(ensureMemberProof).not.toHaveBeenCalled();
  });

  it("maps an ended-session callable error to the ended status", async () => {
    joinGatedRemoteSessionByCode.mockRejectedValue(new Error(JOIN_ERROR_SESSION_ENDED));

    const result = await joinRemoteSessionByCode("ABCD", "new-uid", "seeker", "0.2.0", healOptions);

    expect(result).toEqual({ status: "ended" });
    expect(updateDoc).not.toHaveBeenCalled();
    expect(cancelWalkingThermometers).not.toHaveBeenCalled();
  });

  it("maps an incompatible-version callable error to the incompatible status", async () => {
    joinGatedRemoteSessionByCode.mockRejectedValue(new Error(JOIN_ERROR_APP_VERSION_INCOMPATIBLE));

    const result = await joinRemoteSessionByCode("ABCD", "new-uid", "seeker", "0.2.0", healOptions);

    expect(result).toEqual({ status: "incompatible", hostVersion: "0.1.0" });
    expect(updateDoc).not.toHaveBeenCalled();
    expect(cancelWalkingThermometers).not.toHaveBeenCalled();
  });

  it("joins as a new member when the callable says the old uid is not a member", async () => {
    joinGatedRemoteSessionByCode.mockRejectedValueOnce(new Error(JOIN_ERROR_LEGACY_JOIN));

    const result = await joinRemoteSessionByCode("ABCD", "new-uid", "seeker", "0.2.0", healOptions);

    expect(result.status).toBe("joined");
    expect(joinGatedRemoteSessionByCode).toHaveBeenCalledTimes(1);
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ "memberRoles.new-uid": "seeker" }),
    );
    expect(cancelWalkingThermometers).not.toHaveBeenCalled();
    expect(ensureMemberProof).toHaveBeenCalledWith("session-1", "new-uid");
  });

  it("rethrows other callable errors", async () => {
    joinGatedRemoteSessionByCode.mockRejectedValue(new Error("Couldn't join the session."));

    await expect(
      joinRemoteSessionByCode("ABCD", "new-uid", "seeker", "0.2.0", healOptions),
    ).rejects.toThrow("Couldn't join the session.");
    expect(cancelWalkingThermometers).not.toHaveBeenCalled();
  });
});
