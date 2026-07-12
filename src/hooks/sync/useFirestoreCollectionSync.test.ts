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
});
