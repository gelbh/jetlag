import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import { AUTH_FAILURE_MESSAGE } from "./sessions/shared";

const getDoc = vi.hoisted(() => vi.fn());
const setDoc = vi.hoisted(() => vi.fn(async () => undefined));
const updateDoc = vi.hoisted(() => vi.fn(async () => undefined));
const deleteDoc = vi.hoisted(() => vi.fn(async () => undefined));
const batchSet = vi.hoisted(() => vi.fn());
const batchCommit = vi.hoisted(() => vi.fn(async () => undefined));
const writeBatch = vi.hoisted(() =>
  vi.fn(() => ({
    set: batchSet,
    commit: batchCommit,
  })),
);
const initSessionRoleGates = vi.hoisted(() => vi.fn());
const clientEnvUsesFirebaseEmulator = vi.hoisted(() => vi.fn(() => false));
const forceRefreshIdToken = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../config/env", () => ({
  clientEnvUsesFirebaseEmulator,
}));

vi.mock("../core/firebase/firebase", () => ({
  getFirestoreDb: () => ({}),
  getFirebaseAuth: () => ({ currentUser: null }),
}));

vi.mock("../session/rolePasscodeLifecycle", () => ({
  initSessionRoleGates,
}));

vi.mock("../core/auth/forceRefreshIdToken", () => ({
  forceRefreshIdToken,
}));

vi.mock("firebase/firestore", () => ({
  arrayUnion: vi.fn((value: unknown) => value),
  collection: vi.fn((_db: unknown, ...segments: string[]) => ({
    path: segments.join("/"),
  })),
  deleteField: vi.fn(() => ({ __deleteField: true })),
  deleteDoc,
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({
    id: segments.at(-1) ?? "doc",
    path: segments.join("/"),
  })),
  getDoc,
  getDocFromServer: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
  setDoc,
  updateDoc,
  writeBatch,
}));

import { createRemoteSession } from "./firestoreSessions";

const AREA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.3, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.3, 53.4],
      [-6.3, 53.3],
    ],
  ],
};

describe("createRemoteSession role-gate bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientEnvUsesFirebaseEmulator.mockReturnValue(false);
    getDoc.mockResolvedValue({ exists: () => false });
    setDoc.mockResolvedValue(undefined);
    batchCommit.mockResolvedValue(undefined);
    forceRefreshIdToken.mockClear();
    initSessionRoleGates.mockResolvedValue({
      observerPasscode: "OBSV",
      rolePasscode: "ROLE",
    });
  });

  it("skips gate init on emulator and returns ungated session", async () => {
    clientEnvUsesFirebaseEmulator.mockReturnValue(true);

    const session = await createRemoteSession(AREA, "host-1");

    expect(initSessionRoleGates).not.toHaveBeenCalled();
    expect(session.roleGates).toBeUndefined();
    expect(batchCommit).toHaveBeenCalled();
  });

  it("stamps roleGates after successful init outside emulator", async () => {
    const session = await createRemoteSession(AREA, "host-1");

    expect(initSessionRoleGates).toHaveBeenCalledOnce();
    expect(session.roleGates).toEqual({
      version: 1,
      leaders: { seeker: "host-1" },
    });
  });

  it("refreshes auth and retries create writes after permission-denied", async () => {
    batchCommit
      .mockRejectedValueOnce(
        new FirebaseError("permission-denied", "Missing or insufficient permissions."),
      )
      .mockResolvedValue(undefined);

    await expect(createRemoteSession(AREA, "host-1")).resolves.toMatchObject({
      hostUid: "host-1",
    });

    expect(forceRefreshIdToken).toHaveBeenCalledOnce();
    expect(batchCommit).toHaveBeenCalledTimes(2);
  });

  it("throws auth failure when create writes stay permission-denied", async () => {
    batchCommit.mockRejectedValue(
      new FirebaseError("permission-denied", "Missing or insufficient permissions."),
    );

    await expect(createRemoteSession(AREA, "host-1")).rejects.toThrow(
      AUTH_FAILURE_MESSAGE,
    );
    expect(initSessionRoleGates).not.toHaveBeenCalled();
  });

  it("rolls back session docs when init fails outside emulator", async () => {
    initSessionRoleGates.mockRejectedValueOnce(new Error("functions down"));

    await expect(createRemoteSession(AREA, "host-1")).rejects.toThrow(
      /Couldn't set up role codes/,
    );

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "ended",
      }),
    );
    expect(deleteDoc).toHaveBeenCalled();
  });
});
