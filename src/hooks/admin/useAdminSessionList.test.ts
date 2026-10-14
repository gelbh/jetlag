import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAdminSessionListCacheForTests } from "../../services/admin/adminSessionListCache";
import { ADMIN_SESSION_POLL_MS, useAdminSessionList } from "./useAdminSessionList";

const { fetchAdminSessionsPage } = vi.hoisted(() => ({
  fetchAdminSessionsPage: vi.fn(),
}));

vi.mock("../../services/admin/adminSessions", () => ({
  fetchAdminSessionsPage,
}));

const sampleSession = {
  sessionId: "s1",
  code: "ABCD",
  status: "active",
  createdAt: "2026-07-24T00:00:00.000Z",
  lastActiveAt: "2026-07-24T00:00:00.000Z",
  memberCount: 1,
  hostUid: "u1",
};

const otherSession = {
  ...sampleSession,
  sessionId: "s2",
  code: "EFGH",
};

describe("useAdminSessionList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAdminSessionListCacheForTests();
  });

  it("shows loading when enabled flips true before the first fetch settles", async () => {
    let resolvePage!: (value: {
      sessions: (typeof sampleSession)[];
      nextPageToken: string | null;
    }) => void;
    fetchAdminSessionsPage.mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      }),
    );

    const { result, rerender } = renderHook(({ enabled }) => useAdminSessionList(enabled), {
      initialProps: { enabled: false },
    });

    expect(result.current.loading).toBe(false);

    rerender({ enabled: true });
    expect(result.current.loading).toBe(true);
    expect(result.current.sessions).toEqual([]);

    await act(async () => {
      resolvePage({ sessions: [sampleSession], nextPageToken: null });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.sessions).toEqual([sampleSession]);
  });

  it("keeps cached sessions when re-enabled and background-refreshes", async () => {
    fetchAdminSessionsPage.mockResolvedValue({
      sessions: [sampleSession],
      nextPageToken: null,
    });

    const { result, rerender } = renderHook(({ enabled }) => useAdminSessionList(enabled), {
      initialProps: { enabled: true },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.sessions).toEqual([sampleSession]);

    let resolveSecond!: (value: {
      sessions: (typeof sampleSession)[];
      nextPageToken: string | null;
    }) => void;
    fetchAdminSessionsPage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );

    rerender({ enabled: false });
    expect(result.current.loading).toBe(false);

    rerender({ enabled: true });
    expect(result.current.loading).toBe(false);
    expect(result.current.sessions).toEqual([sampleSession]);

    await waitFor(() => {
      expect(result.current.refreshing).toBe(true);
    });

    await act(async () => {
      resolveSecond({ sessions: [otherSession], nextPageToken: null });
    });

    await waitFor(() => {
      expect(result.current.sessions).toEqual([otherSession]);
    });
    expect(result.current.refreshing).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("paints cached sessions on remount and background-refreshes", async () => {
    fetchAdminSessionsPage.mockResolvedValue({
      sessions: [sampleSession],
      nextPageToken: null,
    });

    const first = renderHook(() => useAdminSessionList(true));
    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
    });
    first.unmount();

    let resolveSecond!: (value: {
      sessions: (typeof sampleSession)[];
      nextPageToken: string | null;
    }) => void;
    fetchAdminSessionsPage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );

    const second = renderHook(() => useAdminSessionList(true));
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.sessions).toEqual([sampleSession]);
    await waitFor(() => {
      expect(second.result.current.refreshing).toBe(true);
    });

    await act(async () => {
      resolveSecond({ sessions: [otherSession], nextPageToken: null });
    });
    await waitFor(() => {
      expect(second.result.current.sessions).toEqual([otherSession]);
    });
    expect(second.result.current.refreshing).toBe(false);
  });

  it("keeps hydrated sessions when background refresh fails after remount", async () => {
    fetchAdminSessionsPage.mockResolvedValue({
      sessions: [sampleSession],
      nextPageToken: null,
    });

    const first = renderHook(() => useAdminSessionList(true));
    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
    });
    first.unmount();

    fetchAdminSessionsPage.mockRejectedValue(new Error("offline"));

    const second = renderHook(() => useAdminSessionList(true));
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.sessions).toEqual([sampleSession]);

    await waitFor(() => {
      expect(second.result.current.error).toBe("offline");
    });
    expect(second.result.current.sessions).toEqual([sampleSession]);
    expect(second.result.current.loading).toBe(false);
  });

  it("queues a trailing refresh when refresh is called while one is in flight", async () => {
    const resolvers: Array<
      (value: { sessions: (typeof sampleSession)[]; nextPageToken: string | null }) => void
    > = [];
    fetchAdminSessionsPage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const { result } = renderHook(() => useAdminSessionList(true));

    await waitFor(() => {
      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(1);
    });

    const first = result.current.refresh();
    const second = result.current.refresh({ background: true });

    expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvers[0]!({ sessions: [sampleSession], nextPageToken: null });
    });

    await waitFor(() => {
      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      resolvers[1]!({ sessions: [otherSession], nextPageToken: null });
      await Promise.all([first, second]);
    });

    expect(result.current.sessions).toEqual([otherSession]);
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(false);
  });

  it("keeps background retry after error from flipping into full-page loading only via refreshing", async () => {
    fetchAdminSessionsPage.mockRejectedValueOnce(new Error("boom")).mockImplementation(
      () =>
        new Promise(() => {
          /* leave hanging */
        }),
    );

    const { result } = renderHook(() => useAdminSessionList(true));

    await waitFor(() => {
      expect(result.current.error).toBe("boom");
    });
    expect(result.current.loading).toBe(false);

    void result.current.refresh({ background: true });

    await waitFor(() => {
      expect(result.current.refreshing).toBe(true);
    });
    expect(result.current.loading).toBe(false);
  });

  it("drops a loadMore page that a newer refresh made stale", async () => {
    fetchAdminSessionsPage.mockResolvedValueOnce({
      sessions: [sampleSession],
      nextPageToken: "page-2",
    });

    const { result } = renderHook(() => useAdminSessionList(true));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let resolveMore!: (value: {
      sessions: (typeof sampleSession)[];
      nextPageToken: string | null;
    }) => void;
    fetchAdminSessionsPage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMore = resolve;
      }),
    );
    let loadMore!: Promise<void>;
    act(() => {
      loadMore = result.current.loadMore();
    });
    expect(result.current.loadingMore).toBe(true);

    fetchAdminSessionsPage.mockResolvedValueOnce({ sessions: [otherSession], nextPageToken: null });
    await act(async () => {
      await result.current.refresh();
    });

    await act(async () => {
      resolveMore({ sessions: [sampleSession, otherSession], nextPageToken: "page-3" });
      await loadMore;
    });

    expect(result.current.sessions).toEqual([otherSession]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("stops loading after a successful empty page", async () => {
    fetchAdminSessionsPage.mockResolvedValue({
      sessions: [],
      nextPageToken: null,
    });

    const { result } = renderHook(() => useAdminSessionList(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessions).toEqual([]);
    expect(result.current.lastFetchedAt).not.toBeNull();
  });

  describe("background poll", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      fetchAdminSessionsPage.mockResolvedValue({ sessions: [sampleSession], nextPageToken: null });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    async function settle() {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    }

    it("background-refreshes every ADMIN_SESSION_POLL_MS while visible", async () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      const { result } = renderHook(() => useAdminSessionList(true));
      await settle();
      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(1);

      fetchAdminSessionsPage.mockImplementation(
        () =>
          new Promise(() => {
            /* leave hanging */
          }),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ADMIN_SESSION_POLL_MS);
      });

      expect(ADMIN_SESSION_POLL_MS).toBe(30_000);
      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(2);
      expect(fetchAdminSessionsPage).toHaveBeenLastCalledWith(null);
      expect(result.current.refreshing).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it("skips the poll while the tab is hidden", async () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      renderHook(() => useAdminSessionList(true));
      await settle();
      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(ADMIN_SESSION_POLL_MS);
      });

      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(1);
    });

    it("skips the poll once a later page is loaded", async () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      fetchAdminSessionsPage.mockResolvedValueOnce({
        sessions: [sampleSession],
        nextPageToken: "p2",
      });
      const { result } = renderHook(() => useAdminSessionList(true));
      await settle();

      fetchAdminSessionsPage.mockResolvedValueOnce({
        sessions: [otherSession],
        nextPageToken: null,
      });
      await act(async () => {
        await result.current.loadMore();
      });
      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(ADMIN_SESSION_POLL_MS);
      });

      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(2);
      expect(result.current.sessions).toEqual([sampleSession, otherSession]);
    });

    it("skips the poll while load more is in flight", async () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      fetchAdminSessionsPage.mockResolvedValueOnce({
        sessions: [sampleSession],
        nextPageToken: "p2",
      });
      const { result } = renderHook(() => useAdminSessionList(true));
      await settle();

      fetchAdminSessionsPage.mockImplementation(
        () =>
          new Promise(() => {
            /* leave hanging */
          }),
      );
      act(() => {
        void result.current.loadMore();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ADMIN_SESSION_POLL_MS);
      });

      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(2);
      expect(fetchAdminSessionsPage).not.toHaveBeenLastCalledWith(null);
    });

    it("resumes polling after a manual refresh following load more", async () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      fetchAdminSessionsPage.mockResolvedValueOnce({
        sessions: [sampleSession],
        nextPageToken: "p2",
      });
      const { result } = renderHook(() => useAdminSessionList(true));
      await settle();

      fetchAdminSessionsPage.mockResolvedValueOnce({
        sessions: [otherSession],
        nextPageToken: null,
      });
      await act(async () => {
        await result.current.loadMore();
      });
      await act(async () => {
        await result.current.refresh();
      });
      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(3);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(ADMIN_SESSION_POLL_MS);
      });

      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(4);
      expect(fetchAdminSessionsPage).toHaveBeenLastCalledWith(null);
    });

    it("keeps a failed load more off the sync error and keeps polling", async () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      fetchAdminSessionsPage.mockResolvedValueOnce({
        sessions: [sampleSession],
        nextPageToken: "p2",
      });
      const { result } = renderHook(() => useAdminSessionList(true));
      await settle();

      fetchAdminSessionsPage.mockRejectedValueOnce(new Error("page 2 down"));
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.loadMoreError).toBe("page 2 down");
      expect(result.current.sessions).toEqual([sampleSession]);
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(ADMIN_SESSION_POLL_MS);
      });

      expect(fetchAdminSessionsPage).toHaveBeenCalledTimes(3);
      expect(fetchAdminSessionsPage).toHaveBeenLastCalledWith(null);
      expect(result.current.loadMoreError).toBeNull();
    });

    it("clears the load more error on the next successful load more", async () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      fetchAdminSessionsPage.mockResolvedValueOnce({
        sessions: [sampleSession],
        nextPageToken: "p2",
      });
      const { result } = renderHook(() => useAdminSessionList(true));
      await settle();

      fetchAdminSessionsPage.mockRejectedValueOnce(new Error("page 2 down"));
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.loadMoreError).toBe("page 2 down");

      fetchAdminSessionsPage.mockResolvedValueOnce({
        sessions: [otherSession],
        nextPageToken: null,
      });
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.loadMoreError).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.sessions).toEqual([sampleSession, otherSession]);
    });

    it("never polls when disabled", async () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      renderHook(() => useAdminSessionList(false));
      await settle();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(ADMIN_SESSION_POLL_MS * 2);
      });

      expect(fetchAdminSessionsPage).not.toHaveBeenCalled();
    });
  });
});
