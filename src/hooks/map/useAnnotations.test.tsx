import { act, renderHook } from "@testing-library/react";
import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { useAnnotationStore, useSessionStore } from "../../state/sessionStore";
import {
  createTestPinAnnotation,
  createTestRemoteSession,
  createTestSession,
} from "../../test/fixtures/sessions";
import { resetAllStores } from "../../test/helpers/storeReset";
import { useAnnotations } from "./useAnnotations";

const firebaseConfigured = vi.hoisted(() => ({ value: false }));
const getRemoteSessionByIdFromServer = vi.hoisted(() => vi.fn());
const writeRemoteAnnotation = vi.hoisted(() => vi.fn());
const writeRemoteAnnotationsBatch = vi.hoisted(() => vi.fn());

vi.mock("../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => firebaseConfigured.value,
  ensureAnonymousUser: vi.fn(async () => ({ uid: "user-host" })),
  getFirestoreDb: () => ({}),
}));

vi.mock("../../services/firestore/sessions/join", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/firestore/sessions/join")>()),
  getRemoteSessionByIdFromServer,
}));

// Stub writes only. Avoid importOriginal here: loading the real annotations
// barrel while mocking ./sessions/join breaks membership's live join binding.
vi.mock("../../services/firestore/firestoreAnnotations", () => ({
  writeRemoteAnnotation,
  writeRemoteAnnotationsBatch,
}));

vi.mock("./shouldQueueAnnotationOffline", () => ({
  shouldQueueAnnotationOffline: () => false,
}));

function permissionDenied(): FirebaseError {
  return new FirebaseError("permission-denied", "Missing or insufficient permissions.");
}

describe("useAnnotations", () => {
  beforeEach(() => {
    resetAllStores();
    useSessionStore.getState().setNetworkReachable(null);
    firebaseConfigured.value = false;
    getRemoteSessionByIdFromServer.mockReset();
    writeRemoteAnnotation.mockReset().mockResolvedValue(undefined);
    writeRemoteAnnotationsBatch.mockReset().mockResolvedValue(undefined);
    useSessionStore.getState().setSession(createTestSession());
  });

  it("adds local annotations and increments pending writes for remote sessions", async () => {
    useSessionStore.getState().setSession(createTestSession({ id: "remote-1", code: "ABCD" }));

    const { result } = renderHook(() => useAnnotations());

    await act(async () => {
      await result.current.createAnnotation({
        type: "pin",
        geometry: createTestPinAnnotation().geometry,
        metadata: createTestPinAnnotation().metadata,
      });
    });

    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
  });

  it("supports undo for the active local session", async () => {
    const { result } = renderHook(() => useAnnotations());

    await act(async () => {
      await result.current.createAnnotation({
        type: "pin",
        geometry: createTestPinAnnotation().geometry,
        metadata: createTestPinAnnotation().metadata,
      });
    });

    act(() => {
      result.current.undoLastAnnotation();
    });

    expect(
      useAnnotationStore
        .getState()
        .annotations.every((annotation) => annotation.status === "deleted"),
    ).toBe(true);
  });

  it("skips remote persistence for local-only sessions", async () => {
    useSessionStore.getState().setSession(createTestSession({ id: LOCAL_SESSION_ID }));

    const { result } = renderHook(() => useAnnotations());

    await act(async () => {
      await result.current.createAnnotation({
        type: "pin",
        geometry: createTestPinAnnotation().geometry,
        metadata: createTestPinAnnotation().metadata,
      });
    });

    expect(useSessionStore.getState().pendingWrites).toBe(0);
  });

  describe("remote writes", () => {
    const pin = () => ({
      type: "pin" as const,
      geometry: createTestPinAnnotation().geometry,
      metadata: createTestPinAnnotation().metadata,
    });

    beforeEach(() => {
      firebaseConfigured.value = true;
    });

    it("skips the server membership read when the cached session lists the uid", async () => {
      useSessionStore
        .getState()
        .setSession(createTestRemoteSession({ memberUids: ["user-host"] }), "user-host");

      const { result } = renderHook(() => useAnnotations());

      await act(async () => {
        await result.current.createAnnotation(pin());
      });

      expect(getRemoteSessionByIdFromServer).not.toHaveBeenCalled();
      expect(writeRemoteAnnotation).toHaveBeenCalledTimes(1);
      expect(writeRemoteAnnotation.mock.calls[0]?.[0]).toBe("remote-session-1");
    });

    it("heals membership once and retries after permission-denied", async () => {
      const session = createTestRemoteSession({ memberUids: ["user-host"] });
      useSessionStore.getState().setSession(session, "user-host");
      writeRemoteAnnotation
        .mockRejectedValueOnce(permissionDenied())
        .mockResolvedValueOnce(undefined);
      getRemoteSessionByIdFromServer.mockResolvedValue(session);

      const { result } = renderHook(() => useAnnotations());

      await act(async () => {
        await result.current.createAnnotation(pin());
      });

      expect(getRemoteSessionByIdFromServer).toHaveBeenCalledTimes(1);
      expect(writeRemoteAnnotation).toHaveBeenCalledTimes(2);
      expect(useSessionStore.getState().lastSyncError).toBeNull();
    });

    it("heals from the server after permission-denied even when flagged unreachable", async () => {
      const session = createTestRemoteSession({ memberUids: ["user-host"] });
      useSessionStore.getState().setSession(session, "user-host");
      useSessionStore.getState().setNetworkReachable(false);
      writeRemoteAnnotation
        .mockRejectedValueOnce(permissionDenied())
        .mockResolvedValueOnce(undefined);
      getRemoteSessionByIdFromServer.mockResolvedValue(session);

      const { result } = renderHook(() => useAnnotations());

      await act(async () => {
        await result.current.createAnnotation(pin());
      });

      expect(getRemoteSessionByIdFromServer).toHaveBeenCalledTimes(1);
      expect(writeRemoteAnnotation).toHaveBeenCalledTimes(2);
    });

    it("surfaces a second permission-denied instead of looping", async () => {
      const session = createTestRemoteSession({ memberUids: ["user-host"] });
      useSessionStore.getState().setSession(session, "user-host");
      writeRemoteAnnotation.mockRejectedValue(permissionDenied());
      getRemoteSessionByIdFromServer.mockResolvedValue(session);

      const { result } = renderHook(() => useAnnotations());

      await act(async () => {
        await expect(result.current.createAnnotation(pin())).rejects.toThrow();
      });

      expect(getRemoteSessionByIdFromServer).toHaveBeenCalledTimes(1);
      expect(writeRemoteAnnotation).toHaveBeenCalledTimes(2);
    });

    it("verifies membership on the server when the cached session lacks the uid", async () => {
      useSessionStore
        .getState()
        .setSession(createTestRemoteSession({ memberUids: ["someone-else"] }), "user-host");
      getRemoteSessionByIdFromServer.mockResolvedValue(
        createTestRemoteSession({ memberUids: ["someone-else", "user-host"] }),
      );

      const { result } = renderHook(() => useAnnotations());

      await act(async () => {
        await result.current.createAnnotation(pin());
      });

      expect(getRemoteSessionByIdFromServer).toHaveBeenCalledTimes(1);
      expect(writeRemoteAnnotation).toHaveBeenCalledTimes(1);
      expect(useSessionStore.getState().session?.memberUids).toContain("user-host");
    });

    it("skips the server membership read for clear-all when cached as a member", async () => {
      useSessionStore
        .getState()
        .setSession(createTestRemoteSession({ memberUids: ["user-host"] }), "user-host");

      const { result } = renderHook(() => useAnnotations());

      await act(async () => {
        await result.current.createAnnotation(pin());
      });
      await act(async () => {
        await result.current.clearAllAnnotations();
      });

      expect(getRemoteSessionByIdFromServer).not.toHaveBeenCalled();
      expect(writeRemoteAnnotationsBatch).toHaveBeenCalledTimes(1);
    });
  });
});
