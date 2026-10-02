import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeToSession } from "../../services/firestore/firestoreAnnotations";
import { useSessionStore } from "../../state/sessionStore";
import { SESSION_STALE_GRACE_MS, useSessionSync } from "./useSessionSync";

vi.mock("../../services/core/firebase/firebase", () => ({
  getFirestoreDb: vi.fn(),
  isFirebaseConfigured: vi.fn(() => true),
  isFirestorePersistenceUnavailable: vi.fn(() => false),
}));
vi.mock("@/services/firestore/commitWrite", () => ({
  trackRestoredWrites: vi.fn(),
}));
vi.mock("../../services/firestore/firestoreAnnotations", () => ({
  subscribeToSession: vi.fn(() => vi.fn()),
  subscribeToRemoteAnnotations: vi.fn(() => vi.fn()),
  subscribeToEndGameTruthAnchors: vi.fn(() => vi.fn()),
}));
vi.mock("../../services/session/flushOfflineQueue", () => ({
  flushOfflineQueue: vi.fn(async () => ({ flushed: 0, remaining: 0, lastError: null })),
}));
vi.mock("../../services/session/offlineQueue", () => ({
  readOfflineQueueForSession: vi.fn(async () => []),
}));
vi.mock("../../domain/device/pwa/pwaStorageBudget", () => ({
  reportStoragePressureIfHigh: vi.fn(async () => null),
}));

type OnMetadata = (metadata: { fromCache: boolean }) => void;

function captureOnMetadata(): OnMetadata {
  const call = vi.mocked(subscribeToSession).mock.calls.at(-1);
  return call?.[3] as OnMetadata;
}

describe("useSessionSync stale grace", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSessionStore.setState({
      session: { id: "remote-1", memberRoles: { u1: "seeker" } } as never,
      myUid: "u1",
      sessionFromCache: false,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("ignores a cache snapshot the server replaces within the grace", () => {
    renderHook(() => useSessionSync());
    const onMetadata = captureOnMetadata();
    act(() => onMetadata({ fromCache: true }));
    act(() => vi.advanceTimersByTime(SESSION_STALE_GRACE_MS - 1));
    act(() => onMetadata({ fromCache: false }));
    act(() => vi.advanceTimersByTime(SESSION_STALE_GRACE_MS));
    expect(useSessionStore.getState().sessionFromCache).toBe(false);
  });

  it("marks the session stale once the cache outlives the grace, and clears on unmount", () => {
    const { unmount } = renderHook(() => useSessionSync());
    const onMetadata = captureOnMetadata();
    act(() => onMetadata({ fromCache: true }));
    act(() => vi.advanceTimersByTime(SESSION_STALE_GRACE_MS));
    expect(useSessionStore.getState().sessionFromCache).toBe(true);
    unmount();
    expect(useSessionStore.getState().sessionFromCache).toBe(false);
  });
});
