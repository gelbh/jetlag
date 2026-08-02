import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "../../domain/map/annotations";

const getDoc = vi.hoisted(() => vi.fn());
const setDoc = vi.hoisted(() => vi.fn(async () => undefined));
const updateDoc = vi.hoisted(() => vi.fn(async () => undefined));
const deleteDoc = vi.hoisted(() => vi.fn(async () => undefined));
const initSessionRoleGates = vi.hoisted(() => vi.fn());
const clientEnvUsesFirebaseEmulator = vi.hoisted(() => vi.fn(() => false));

vi.mock("../../config/env", () => ({
  clientEnvUsesFirebaseEmulator,
}));

vi.mock("../core/firebase/firebase", () => ({
  getFirestoreDb: () => ({}),
}));

vi.mock("../session/rolePasscodeLifecycle", () => ({
  initSessionRoleGates,
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
  writeBatch: vi.fn(),
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
    expect(setDoc).toHaveBeenCalled();
  });

  it("stamps roleGates after successful init outside emulator", async () => {
    const session = await createRemoteSession(AREA, "host-1");

    expect(initSessionRoleGates).toHaveBeenCalledOnce();
    expect(session.roleGates).toEqual({
      version: 1,
      leaders: { seeker: "host-1" },
    });
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
