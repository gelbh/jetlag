import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { useFirestoreCollectionSync } from "./useFirestoreCollectionSync";

const setLastSyncError = vi.fn();

vi.mock("../../services/core/firebase", () => ({
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: vi.fn(
    (selector: (state: { setLastSyncError: typeof setLastSyncError }) => unknown) =>
      selector({ setLastSyncError }),
  ),
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

  it("calls setLastSyncError on subscription error", () => {
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
      useFirestoreCollectionSync("remote-session", subscribe),
    );

    expect(setLastSyncError).toHaveBeenCalledWith("Live location sync failed.");
  });
});
