// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "../../state/sessionStore";
import { useSessionSync } from "./useSessionSync";

const flushOfflineQueueMock = vi.fn(async () => ({
  remaining: 0,
  lastError: null as string | null,
}));

vi.mock("../../services/core/firebase/firebase", () => ({
  getFirestoreDb: vi.fn(),
  isFirebaseConfigured: vi.fn(() => true),
  isFirestorePersistenceUnavailable: vi.fn(() => false),
}));

vi.mock("../../services/firestore/firestoreAnnotations", () => ({
  subscribeToSession: vi.fn(() => vi.fn()),
  subscribeToRemoteAnnotations: vi.fn(() => vi.fn()),
  subscribeToEndGameTruthAnchors: vi.fn(() => vi.fn()),
}));

vi.mock("../../services/session/flushOfflineQueue", () => ({
  flushOfflineQueue: (sessionId: string) => flushOfflineQueueMock(sessionId),
}));

vi.mock("../../services/session/offlineQueue", () => ({
  readOfflineQueueForSession: vi.fn(async () => [{ id: "pending-1" }]),
}));

vi.mock("../../domain/device/pwa/pwaStorageBudget", () => ({
  reportStoragePressureIfHigh: vi.fn(async () => null),
}));

const remoteSession = {
  id: "remote-session-1",
  memberRoles: { "uid-1": "hider" as const },
};

describe("useSessionSync visibility flush", () => {
  beforeEach(() => {
    flushOfflineQueueMock.mockClear();
    useSessionStore.setState({
      session: remoteSession as never,
      myUid: "uid-1",
      pendingWrites: 0,
      lastSyncError: null,
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("flushes the offline queue when the document becomes visible", async () => {
    renderHook(() => useSessionSync());

    await waitFor(() => {
      expect(flushOfflineQueueMock).toHaveBeenCalled();
    });

    flushOfflineQueueMock.mockClear();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(flushOfflineQueueMock).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(flushOfflineQueueMock).toHaveBeenCalledWith("remote-session-1");
    });
  });

  it("does not bind resume flush when sync is disabled", async () => {
    renderHook(() => useSessionSync({ syncEnabled: false }));

    flushOfflineQueueMock.mockClear();

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(flushOfflineQueueMock).not.toHaveBeenCalled();
  });
});
