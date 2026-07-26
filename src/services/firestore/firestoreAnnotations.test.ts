import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isPlaceholderGameArea,
  JOIN_PREVIEW_PLACEHOLDER_AREA,
} from "../../domain/session/joinPreviewGameArea";
import type { GameArea } from "../../domain/map/annotations";
import {
  JOIN_AUTH_FAILURE_MESSAGE,
  joinRemoteSessionByCode,
} from "./firestoreAnnotations";

const zeroFallback: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  ],
};

const getDoc = vi.hoisted(() => vi.fn());
const getDocFromServer = vi.hoisted(() => vi.fn());
const updateDoc = vi.hoisted(() => vi.fn(async () => undefined));
const getIdToken = vi.hoisted(() => vi.fn(async () => "token"));
const reportJoinPermissionDenied = vi.hoisted(() => vi.fn());
const forceRefreshIdToken = vi.hoisted(() =>
  vi.fn(async () => {
    await getIdToken(true);
  }),
);

vi.mock("../core/firebase", () => ({
  getFirestoreDb: () => ({}),
  getFirebaseAuth: () => ({
    currentUser: { uid: "admin-1", getIdToken },
  }),
  ensureAnonymousUser: vi.fn(async () => ({
    uid: "admin-1",
    getIdToken,
  })),
}));

vi.mock("../core/auth/forceRefreshIdToken", () => ({
  forceRefreshIdToken,
}));

vi.mock("../core/sentry", () => ({
  reportJoinPermissionDenied,
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
  getDocFromServer,
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
    expect(isPlaceholderGameArea(zeroFallback)).toBe(true);
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
    getDocFromServer.mockReset();
    updateDoc.mockReset();
    updateDoc.mockResolvedValue(undefined);
    getIdToken.mockReset();
    getIdToken.mockResolvedValue("token");
    reportJoinPermissionDenied.mockReset();
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
      );
    getDocFromServer.mockResolvedValueOnce({
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
    expect(getDoc).toHaveBeenCalledTimes(2);
    expect(getDocFromServer).toHaveBeenCalledTimes(1);
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
      );
    getDocFromServer.mockRejectedValueOnce(new Error("re-read failed"));

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

  it("retries once after forced token refresh on permission-denied", async () => {
    const codeDoc = {
      exists: () => true,
      data: () => ({
        sessionId: "session-1",
        hostUid: "host-1",
        hostAppVersion: "0.8.2",
        tier: "free",
        status: "active",
        createdAt: "2026-05-14T00:00:00.000Z",
      }),
    };
    const sessionPermissionDenied = new FirebaseError(
      "permission-denied",
      "Missing or insufficient permissions.",
    );

    getDoc
      .mockResolvedValueOnce(codeDoc)
      .mockRejectedValueOnce(sessionPermissionDenied)
      .mockRejectedValueOnce(sessionPermissionDenied);

    updateDoc
      .mockRejectedValueOnce(sessionPermissionDenied)
      .mockResolvedValueOnce(undefined);

    getDocFromServer.mockResolvedValueOnce({
      exists: () => true,
      id: "session-1",
      data: () => ({
        code: "ABCD",
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
    expect(getIdToken).toHaveBeenCalledWith(true);
    expect(reportJoinPermissionDenied).toHaveBeenCalledWith("initial");
    expect(updateDoc.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("maps repeated permission-denied to a player-facing auth message", async () => {
    const codeDoc = {
      exists: () => true,
      data: () => ({
        sessionId: "session-1",
        hostUid: "host-1",
        hostAppVersion: "0.8.2",
        tier: "free",
        status: "active",
        createdAt: "2026-05-14T00:00:00.000Z",
      }),
    };
    const sessionPermissionDenied = new FirebaseError(
      "permission-denied",
      "Missing or insufficient permissions.",
    );

    getDoc
      .mockResolvedValueOnce(codeDoc)
      .mockRejectedValueOnce(sessionPermissionDenied)
      .mockRejectedValueOnce(sessionPermissionDenied);

    updateDoc.mockRejectedValue(sessionPermissionDenied);

    await expect(
      joinRemoteSessionByCode("ABCD", "admin-1", "admin", "0.8.2"),
    ).rejects.toThrow(JOIN_AUTH_FAILURE_MESSAGE);

    expect(getIdToken).toHaveBeenCalledWith(true);
    expect(reportJoinPermissionDenied).toHaveBeenCalledWith("initial");
    expect(reportJoinPermissionDenied).toHaveBeenCalledWith("retry");
    expect(updateDoc).toHaveBeenCalledTimes(2);
  });
});
