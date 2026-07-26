import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAdminSessionListCacheForTests } from "../../services/admin/adminSessionListCache";
import { useAdminSessionList } from "./useAdminSessionList";

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
      sessions: typeof sampleSession[];
      nextPageToken: string | null;
    }) => void;
    fetchAdminSessionsPage.mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      }),
    );

    const { result, rerender } = renderHook(
      ({ enabled }) => useAdminSessionList(enabled),
      { initialProps: { enabled: false } },
    );

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

    const { result, rerender } = renderHook(
      ({ enabled }) => useAdminSessionList(enabled),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.sessions).toEqual([sampleSession]);

    let resolveSecond!: (value: {
      sessions: typeof sampleSession[];
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
      sessions: typeof sampleSession[];
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
      (value: {
        sessions: typeof sampleSession[];
        nextPageToken: string | null;
      }) => void
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
    fetchAdminSessionsPage
      .mockRejectedValueOnce(new Error("boom"))
      .mockImplementation(
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
});
