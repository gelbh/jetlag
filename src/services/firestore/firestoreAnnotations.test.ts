import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isPlaceholderGameArea,
  JOIN_PREVIEW_PLACEHOLDER_AREA,
  joinRemoteSessionByCode,
} from "./firestoreAnnotations";
import { ZERO_GAME_AREA } from "../../domain/geometry/geometry";

const getDoc = vi.hoisted(() => vi.fn());
const updateDoc = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../core/firebase", () => ({
  getFirestoreDb: () => ({}),
}));

vi.mock("firebase/firestore", () => ({
  arrayRemove: vi.fn((value: unknown) => value),
  arrayUnion: vi.fn((value: unknown) => value),
  collection: vi.fn((_db: unknown, ...segments: string[]) => ({
    path: segments.join("/"),
  })),
  deleteField: vi.fn(() => ({})),
  doc: vi.fn((first: { path?: string } | unknown, ...rest: string[]) => {
    if (
      first &&
      typeof first === "object" &&
      "path" in first &&
      typeof (first as { path: string }).path === "string" &&
      rest.length > 0
    ) {
      return { path: `${(first as { path: string }).path}/${rest.join("/")}` };
    }
    return { path: rest.join("/") };
  }),
  getDoc,
  getDocFromServer: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  setDoc: vi.fn(),
  updateDoc,
  writeBatch: vi.fn(),
}));

describe("isPlaceholderGameArea", () => {
  it("detects join-preview and zero fallback areas", () => {
    expect(isPlaceholderGameArea(JOIN_PREVIEW_PLACEHOLDER_AREA)).toBe(true);
    expect(isPlaceholderGameArea(ZERO_GAME_AREA)).toBe(true);
    expect(
      isPlaceholderGameArea({
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
      }),
    ).toBe(false);
  });
});

describe("joinRemoteSessionByCode without initial read", () => {
  beforeEach(() => {
    getDoc.mockReset();
    updateDoc.mockClear();
  });

  it("re-reads the session after membership update and returns real gameArea", async () => {
    const realGameArea = {
      south: 53.3,
      west: -6.3,
      north: 53.4,
      east: -6.2,
    };

    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          sessionId: "session-1",
          hostUid: "host-1",
          hostAppVersion: "0.8.2",
          tier: "free",
          status: "active",
          createdAt: "2026-05-14T00:00:00.000Z",
        }),
      })
      .mockRejectedValueOnce(
        new FirebaseError("permission-denied", "Missing or insufficient permissions."),
      )
      .mockResolvedValueOnce({
        exists: () => true,
        id: "session-1",
        data: () => ({
          code: "ABCD",
          gameArea: realGameArea,
          hostUid: "host-1",
          createdAt: "2026-05-14T00:00:00.000Z",
          memberUids: ["host-1", "admin-1"],
          memberRoles: { "host-1": "hider", "admin-1": "admin" },
          status: "active",
        }),
      });

    const result = await joinRemoteSessionByCode(
      "ABCD",
      "admin-1",
      "admin",
      "0.8.2",
    );

    expect(result.status).toBe("joined");
    if (result.status !== "joined") {
      return;
    }

    expect(updateDoc).toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalledTimes(3);
    expect(isPlaceholderGameArea(result.session.gameArea)).toBe(false);
    expect(result.session.gameArea).toMatchObject({
      type: "Polygon",
    });
    const ring = result.session.gameArea.coordinates[0];
    expect(ring).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([-6.3, 53.3]),
        expect.arrayContaining([-6.2, 53.4]),
      ]),
    );
  });

  it("falls back to join preview when post-membership re-read fails", async () => {
    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          sessionId: "session-1",
          hostUid: "host-1",
          hostAppVersion: "0.8.2",
          tier: "free",
          status: "active",
          createdAt: "2026-05-14T00:00:00.000Z",
        }),
      })
      .mockRejectedValueOnce(
        new FirebaseError("permission-denied", "Missing or insufficient permissions."),
      )
      .mockRejectedValueOnce(new Error("re-read failed"));

    const result = await joinRemoteSessionByCode(
      "ABCD",
      "admin-1",
      "admin",
      "0.8.2",
    );

    expect(result.status).toBe("joined");
    if (result.status !== "joined") {
      return;
    }

    expect(isPlaceholderGameArea(result.session.gameArea)).toBe(true);
  });
});
