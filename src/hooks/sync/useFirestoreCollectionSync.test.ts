import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { useFirestoreCollectionSync } from "./useFirestoreCollectionSync";

vi.mock("../../services/core/firebase", () => ({
  isFirebaseConfigured: vi.fn(() => true),
}));

describe("useFirestoreCollectionSync", () => {
  it("returns an empty list for local sessions", () => {
    const subscribe = vi.fn();
    const { result } = renderHook(() =>
      useFirestoreCollectionSync(LOCAL_SESSION_ID, subscribe),
    );

    expect(result.current).toEqual([]);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("subscribes for remote sessions and cleans up", async () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(
      (
        _sessionId: string,
        onData: (items: string[]) => void,
      ) => {
        onData(["alpha"]);
        return unsubscribe;
      },
    );

    const { result, unmount } = renderHook(() =>
      useFirestoreCollectionSync("remote-session", subscribe),
    );

    await waitFor(() => {
      expect(result.current).toEqual(["alpha"]);
    });
    expect(subscribe).toHaveBeenCalledWith(
      "remote-session",
      expect.any(Function),
      expect.any(Function),
    );

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("does not subscribe when enabled is false", () => {
    const subscribe = vi.fn();
    const { result } = renderHook(() =>
      useFirestoreCollectionSync("remote-session", subscribe, { enabled: false }),
    );

    expect(result.current).toEqual([]);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("re-subscribes when enabled flips to true", async () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(
      (
        _sessionId: string,
        onData: (items: string[]) => void,
      ) => {
        onData(["alpha"]);
        return unsubscribe;
      },
    );

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useFirestoreCollectionSync("remote-session", subscribe, { enabled }),
      { initialProps: { enabled: false } },
    );

    expect(subscribe).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current).toEqual(["alpha"]);
    });
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("calls onSyncError on subscription error", () => {
    const onSyncError = vi.fn();
    const subscribe = vi.fn(
      (
        _sessionId: string,
        _onData: (items: string[]) => void,
        onError: () => void,
      ) => {
        onError();
        return vi.fn();
      },
    );

    renderHook(() =>
      useFirestoreCollectionSync("remote-session", subscribe, { onSyncError }),
    );

    expect(onSyncError).toHaveBeenCalledOnce();
  });

  it("does not resubscribe when onSyncError callback identity changes", () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);

    const { rerender } = renderHook(
      ({ onSyncError }: { onSyncError: () => void }) =>
        useFirestoreCollectionSync("remote-session", subscribe, { onSyncError }),
      { initialProps: { onSyncError: () => undefined } },
    );

    expect(subscribe).toHaveBeenCalledTimes(1);

    rerender({ onSyncError: () => undefined });

    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("clears items on subscription error when no handler is provided", () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(
      (
        _sessionId: string,
        onData: (items: string[]) => void,
        onError: () => void,
      ) => {
        onData(["alpha"]);
        onError();
        return unsubscribe;
      },
    );

    const { result } = renderHook(() =>
      useFirestoreCollectionSync("remote-session", subscribe),
    );

    expect(result.current).toEqual([]);
  });
});
