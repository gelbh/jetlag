import { act, renderHook } from "@testing-library/react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CreateSessionMapMountAbortedError,
  CreateSessionMapMountTimeoutError,
  useCreateSessionMapMount,
} from "./useCreateSessionMapMount";

const fakeMap = { id: "map" } as unknown as MapLibreMap;

afterEach(() => {
  vi.useRealTimers();
});

describe("useCreateSessionMapMount", () => {
  it("starts with the facade: map neither requested nor mounted", () => {
    const { result } = renderHook(() => useCreateSessionMapMount());

    expect(result.current.mapRequested).toBe(false);
    expect(result.current.mapMounted).toBe(false);
  });

  it("requestMap flips mapRequested without waiting for a mount", () => {
    const { result } = renderHook(() => useCreateSessionMapMount());

    act(() => result.current.requestMap());

    expect(result.current.mapRequested).toBe(true);
    expect(result.current.mapMounted).toBe(false);
  });

  it("ensureMapMounted requests the map and resolves once it mounts", async () => {
    const { result } = renderHook(() => useCreateSessionMapMount());
    let resolved: MapLibreMap | null = null;

    act(() => {
      void result.current.ensureMapMounted().then((map) => {
        resolved = map;
      });
    });

    expect(result.current.mapRequested).toBe(true);
    expect(resolved).toBeNull();

    await act(async () => {
      result.current.handleMapMounted(fakeMap);
    });

    expect(result.current.mapMounted).toBe(true);
    expect(resolved).toBe(fakeMap);
  });

  it("resolves waiters only after the mount commit, so they read fresh state", async () => {
    const { result } = renderHook(() => useCreateSessionMapMount());
    const seenMountedAtResolve: boolean[] = [];

    act(() => {
      void result.current.ensureMapMounted().then(() => {
        seenMountedAtResolve.push(result.current.mapMounted);
      });
    });

    await act(async () => {
      result.current.handleMapMounted(fakeMap);
    });

    expect(seenMountedAtResolve).toEqual([true]);
  });

  it("resolves immediately when the map is already mounted", async () => {
    const { result } = renderHook(() => useCreateSessionMapMount());

    await act(async () => {
      result.current.handleMapMounted(fakeMap);
    });

    await expect(result.current.ensureMapMounted()).resolves.toBe(fakeMap);
  });

  it("rejects with a timeout error when the map never loads", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCreateSessionMapMount({ timeoutMs: 1_000 }));
    let pending!: Promise<MapLibreMap>;

    act(() => {
      pending = result.current.ensureMapMounted();
    });
    const assertion = expect(pending).rejects.toBeInstanceOf(CreateSessionMapMountTimeoutError);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    await assertion;
  });

  it("waits again after the map unmounts", async () => {
    const { result } = renderHook(() => useCreateSessionMapMount());

    await act(async () => {
      result.current.handleMapMounted(fakeMap);
    });
    await act(async () => {
      result.current.handleMapMounted(null);
    });

    expect(result.current.mapMounted).toBe(false);

    let settled = false;
    act(() => {
      void result.current.ensureMapMounted().then(
        () => {
          settled = true;
        },
        () => undefined,
      );
    });
    await act(async () => {});

    expect(settled).toBe(false);
  });

  it("rejects pending waiters when the create screen unmounts", async () => {
    const { result, unmount } = renderHook(() => useCreateSessionMapMount());
    let pending!: Promise<MapLibreMap>;

    act(() => {
      pending = result.current.ensureMapMounted();
    });
    const assertion = expect(pending).rejects.toBeInstanceOf(CreateSessionMapMountAbortedError);
    unmount();

    await assertion;
  });
});
